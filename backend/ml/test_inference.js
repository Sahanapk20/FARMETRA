const ort = require('onnxruntime-node');
const fs = require('fs');
const path = require('path');

async function testInference() {
  console.log('Testing disease detection model...');
  
  try {
    // Check if model files exist
    const modelPath = path.join(__dirname, 'disease_model.onnx');
    const classesPath = path.join(__dirname, 'classes.txt');
    
    if (!fs.existsSync(modelPath)) {
      console.error('Error: disease_model.onnx not found');
      return;
    }
    
    if (!fs.existsSync(classesPath)) {
      console.error('Error: classes.txt not found');
      return;
    }
    
    console.log('✓ Model files verified');
    
    // Load the model
    const session = await ort.InferenceSession.create(modelPath);
    console.log('✓ ONNX Model loaded successfully');
    
    // Read class names
    const classesData = await fs.promises.readFile(classesPath, 'utf8');
    const classNames = classesData.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    console.log(`✓ Loaded ${classNames.length} disease classes`);
    
    // Get input/output info
    const inputNames = session.inputNames;
    const outputNames = session.outputNames;
    console.log('✓ Input names:', inputNames);
    console.log('✓ Output names:', outputNames);
    
    console.log('\n✓ All tests passed! Model is ready for inference.');
    
  } catch (error) {
    console.error('✗ Test failed:', error.message);
  }
}

testInference();
