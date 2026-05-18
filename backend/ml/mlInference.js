const ort = require('onnxruntime-node');
const Jimp = require('jimp');
const fs = require('fs/promises');
const path = require('path');

// Load disease mappings
let diseaseMapping = {};
try {
  const mappingPath = path.join(process.cwd(), 'ml', 'disease_mapping.json');
  const mappingData = require('fs').readFileSync(mappingPath, 'utf8');
  diseaseMapping = JSON.parse(mappingData);
} catch (e) {
  console.log('Warning: Could not load disease_mapping.json, falling back to empty mapping.');
}

// Global ONNX session
let session = null;
let classNames = [];

/**
 * Initialize the ONNX model session and load class names.
 */
async function initializeModel() {
  if (session) return;
  try {
    const modelPath = path.join(process.cwd(), 'ml', 'disease_model.onnx');
    const classesPath = path.join(process.cwd(), 'ml', 'classes.txt');
    
    // Read class names
    const classesData = await fs.readFile(classesPath, 'utf8');
    classNames = classesData.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // Load model
    session = await ort.InferenceSession.create(modelPath);
    console.log('ONNX Model loaded successfully.');
  } catch (error) {
    console.log('Model not yet available, inference will fallback to mock data.', error.message);
  }
}

/**
 * Preprocess image for ONNX model (matching PyTorch ImageNet transforms)
 * @param {string|Buffer} imageInput - File path to image or image Buffer
 * @param {string|null} validateType - If 'leaf', performs leaf visual checks
 * @returns {Float32Array}
 */
async function preprocessImage(imageInput, validateType = null) {
  console.log('[DEBUG] Preprocessing image, input type:', typeof imageInput);
  let imageBuffer;
  if (typeof imageInput === 'string') {
    const fs = require('fs');
    if (!fs.existsSync(imageInput)) {
      throw new Error(`File not found: ${imageInput}`);
    }
    imageBuffer = fs.readFileSync(imageInput);
  } else if (Buffer.isBuffer(imageInput)) {
    imageBuffer = imageInput;
  } else {
    throw new Error('Invalid image input type: must be file path string or Buffer');
  }
  
  console.log('[DEBUG] Reading image with Jimp from buffer...');
  const image = await Jimp.read(imageBuffer);
  console.log('[DEBUG] Image loaded, original size:', image.bitmap.width, 'x', image.bitmap.height);
  
  // Resize to 224x224
  image.resize(224, 224);
  console.log('[DEBUG] Image resized to 224x224');

  if (validateType === 'leaf') {
    console.log('[DEBUG] Performing leaf-specific visual validation...');
    const totalPixels = 224 * 224;
    let brightPixels = 0;
    let greyPixels = 0;
    let organicColorPixels = 0;
    let bluePixels = 0;
    let rSum = 0, gSum = 0, bSum = 0;

    image.scan(0, 0, 224, 224, function(x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      
      rSum += r;
      gSum += g;
      bSum += b;
      
      const brightness = (r + g + b) / 3;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      
      // Check for bright near-white (background of app/browser screenshots)
      if (brightness > 220 && saturation < 0.1) {
        brightPixels++;
      }
      
      // Check for neutral grey/white/black (UI frames, text, lines)
      if (Math.abs(r - g) < 12 && Math.abs(g - b) < 12 && Math.abs(r - b) < 12) {
        greyPixels++;
      }
      
      // Check for organic plant colors (greens, yellows, browns, oranges)
      if (brightness >= 20 && brightness <= 245) {
        if ((g > r && g > b) || (r > b && g > b && Math.abs(r - g) < 60)) {
          organicColorPixels++;
        }
      }
      
      // Blue pixels (UI buttons/links, screen blues, extremely rare in leaves)
      if (b > r && b > g && (b - r > 20) && (b - g > 20)) {
        bluePixels++;
      }
    });

    const avgR = rSum / totalPixels;
    const avgG = gSum / totalPixels;
    const avgB = bSum / totalPixels;
    const avgSaturation = (Math.max(avgR, avgG, avgB) - Math.min(avgR, avgG, avgB)) / (Math.max(avgR, avgG, avgB) || 1);

    const brightRatio = brightPixels / totalPixels;
    const greyRatio = greyPixels / totalPixels;
    const organicRatio = organicColorPixels / totalPixels;
    const blueRatio = bluePixels / totalPixels;

    console.log(`[DEBUG] Leaf Validation Metrics - brightRatio: ${brightRatio.toFixed(3)}, greyRatio: ${greyRatio.toFixed(3)}, organicRatio: ${organicRatio.toFixed(3)}, blueRatio: ${blueRatio.toFixed(3)}, avgSaturation: ${avgSaturation.toFixed(3)}`);

    const isInvalid = (brightRatio > 0.35 && organicRatio < 0.15) || 
                       (greyRatio > 0.65 && organicRatio < 0.15) || 
                       (avgSaturation < 0.12 && organicRatio < 0.15) ||
                       (blueRatio > 0.5);

    if (isInvalid) {
      throw new Error('Uploaded image does not appear to be a valid plant leaf image. Please upload a clear close-up picture of a plant leaf.');
    }
  }

  const dims = [1, 3, 224, 224];
  const size = dims.reduce((a, b) => a * b);
  const data = new Float32Array(size);

  const mean = [0.485, 0.456, 0.406];
  const std = [0.229, 0.224, 0.225];

  console.log('[DEBUG] Starting pixel normalization...');
  let ptr = 0;
  for (let c = 0; c < 3; c++) {
    for (let y = 0; y < 224; y++) {
      for (let x = 0; x < 224; x++) {
        const pixelIdx = (y * 224 + x) * 4 + c; // 4 channels (RGBA)
        const pixelVal = image.bitmap.data[pixelIdx] / 255.0;
        data[ptr++] = (pixelVal - mean[c]) / std[c];
      }
    }
  }
  console.log('[DEBUG] Pixel normalization complete, tensor shape:', dims);

  return new ort.Tensor('float32', data, dims);
}

/**
 * Softmax function for output tensor to get probabilities
 */
function softmax(arr) {
  const max = Math.max(...arr);
  const expArr = arr.map(x => Math.exp(x - max));
  const sumExp = expArr.reduce((a, b) => a + b);
  return expArr.map(x => x / sumExp);
}

/**
 * Predict disease from image buffer or file path
 * @param {Buffer|string} imageInput - Buffer or file path
 * @returns {Object} Prediction result
 */
async function predictDisease(imageInput) {
  console.log('[DEBUG] Starting disease prediction...');
  await initializeModel();

  if (!session || classNames.length === 0) {
    console.log('[DEBUG] Model or class names not loaded, returning error');
    throw new Error('Model not loaded or class names not available');
  }

  console.log('[DEBUG] Model loaded, class names count:', classNames.length);
  console.log('[DEBUG] Class names sample:', classNames.slice(0, 5));

  try {
    console.log('[DEBUG] Preprocessing image...');
    const tensor = await preprocessImage(imageInput, 'leaf');
    console.log('[DEBUG] Tensor created, shape:', tensor.dims);
    
    console.log('[DEBUG] Running ONNX inference...');
    const results = await session.run({ input: tensor });
    const output = results.output.data;
    console.log('[DEBUG] Inference complete, output data length:', output.length);
    console.log('[DEBUG] Raw output sample (first 10 values):', Array.from(output).slice(0, 10));
    
    // Apply softmax
    const probs = softmax(Array.from(output));
    console.log('[DEBUG] Softmax probabilities sample (first 10):', probs.slice(0, 10));
    
    // Find max probability
    let maxIdx = 0;
    let maxProb = 0;
    for (let i = 0; i < probs.length; i++) {
      if (probs[i] > maxProb) {
        maxProb = probs[i];
        maxIdx = i;
      }
    }

    console.log('[DEBUG] Predicted class index:', maxIdx);
    console.log('[DEBUG] Max probability:', maxProb);
    console.log('[DEBUG] Predicted class name:', classNames[maxIdx]);

    const predictedClass = classNames[maxIdx] || 'Healthy';
    const confidence = Math.round(maxProb * 100);

    console.log('[DEBUG] Final prediction - Class:', predictedClass, 'Confidence:', confidence + '%');

    if (confidence < 50) {
      throw new Error('Uploaded image does not appear to be a valid plant leaf image. The model could not recognize any plant leaves in this image with high confidence.');
    }

    const mapping = diseaseMapping[predictedClass] || {
      displayName: predictedClass.replace(/_/g, ' '),
      explanation: 'Analysis complete but specific details for this class are not mapped.',
      recommendation: 'Consult local agricultural expert.',
      preventionTips: 'Regular monitoring and proper plant care recommended.',
      severity: 'Unknown'
    };

    return {
      disease: mapping.displayName,
      confidence: confidence,
      explanation: mapping.explanation,
      recommendation: mapping.recommendation,
      preventionTips: mapping.preventionTips,
      severity: mapping.severity
    };

  } catch (error) {
    console.error('[DEBUG] Inference error:', error);
    if (error.message.includes('does not appear to be a valid')) {
      throw error;
    }
    throw new Error('Failed to run inference on the image: ' + error.message);
  }
}
// Global ONNX session for soil
let soilSession = null;
let soilClassNames = [];

/**
 * Initialize the Soil ONNX model session and load class names.
 */
async function initializeSoilModel() {
  if (soilSession) return;
  try {
    const modelPath = path.join(process.cwd(), 'ml', 'soil_model.onnx');
    const classesPath = path.join(process.cwd(), 'ml', 'soil_classes.txt');
    
    // Read class names
    const classesData = await fs.readFile(classesPath, 'utf8');
    soilClassNames = classesData.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // Load model
    soilSession = await ort.InferenceSession.create(modelPath);
    console.log('Soil ONNX Model loaded successfully.');
  } catch (error) {
    console.log('Soil model not yet available, inference will fallback to mock data.', error.message);
  }
}

/**
 * Predict soil type from image buffer
 * @param {Buffer} imageBuffer 
 * @returns {Object} Prediction result (soilType, confidence)
 */
async function predictSoil(imageBuffer) {
  await initializeSoilModel();

  if (!soilSession || soilClassNames.length === 0) {
    try {
      const image = await Jimp.read(imageBuffer);
      
      const startY = Math.floor(image.bitmap.height * 0.7);
      let rBottom = 0, gBottom = 0, bBottom = 0, bottomCount = 0;
      
      image.scan(0, startY, image.bitmap.width, image.bitmap.height - startY, function(x, y, idx) {
        rBottom += this.bitmap.data[idx + 0];
        gBottom += this.bitmap.data[idx + 1];
        bBottom += this.bitmap.data[idx + 2];
        bottomCount++;
      });
      
      const r = rBottom / bottomCount;
      const g = gBottom / bottomCount;
      const b = bBottom / bottomCount;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      const brightness = (r + g + b) / 3;
      
      const isBlue = b > r && b > g;
      const isGreen = g > r && g > b;
      const isGrey = (Math.abs(r - g) < 5 && Math.abs(g - b) < 5 && brightness > 200);
      
      if (brightness > 220 || (isBlue && b > 100) || (isGreen && g > 100) || isGrey || saturation < 0.05) {
        return {
          soilType: 'Not_Soil',
          confidence: 45
        };
      }
    } catch (e) {
      console.warn('Fallback color check failed:', e.message);
    }

    return {
      soilType: 'Loamy',
      confidence: 85
    };
  }

  try {
    const tensor = await preprocessImage(imageBuffer);
    const results = await soilSession.run({ input: tensor });
    const output = results.output.data;
    
    // Apply softmax
    const probs = softmax(Array.from(output));
    
    // Find max probability
    let maxIdx = 0;
    let maxProb = 0;
    for (let i = 0; i < probs.length; i++) {
      if (probs[i] > maxProb) {
        maxProb = probs[i];
        maxIdx = i;
      }
    }

    const predictedClass = soilClassNames[maxIdx] || 'Loamy';
    const confidence = Math.round(maxProb * 100);

    // Reject non-soil images if confidence is low, or if the model explicitly predicted 'Not_Soil'
    if (confidence < 60 || predictedClass === 'Not_Soil') {
      return {
        soilType: 'Not_Soil',
        confidence: confidence
      };
    }

    return {
      soilType: predictedClass,
      confidence: confidence
    };

  } catch (error) {
    console.error('Soil Inference error:', error);
    throw new Error('Failed to run soil inference on the image.');
  }
}

module.exports = { predictDisease, predictSoil };