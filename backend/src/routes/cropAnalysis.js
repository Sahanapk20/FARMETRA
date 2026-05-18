const express = require('express');
const router = express.Router();
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const { CropAnalysis } = require('../models');
const { predictDisease, predictSoil } = require('../../ml/mlInference');
const { predictCropFromDataset, initializeDataset, getRandomParamsForSoil } = require('../../ml/datasetInference');
const fsPromise = require('fs/promises');

// Initialize dataset early
initializeDataset().catch(err => console.error('Error initializing dataset:', err));

// Multer config for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ============ MOCK ML LOGIC ============

// Mock soil classification based on manual inputs or random from image
function classifySoil(manualData, hasImage) {
  if (hasImage) {
    return 'Unknown';
  }

  if (manualData) {
    const texture = (manualData.texture || '').toLowerCase();
    const waterRetention = (manualData.waterRetention || '').toLowerCase();

    if (texture.includes('gritty') || texture.includes('sandy')) return 'Sandy';
    if (texture.includes('sticky') || texture.includes('clay')) return 'Clay';
    if (texture.includes('smooth') || texture.includes('silt')) return 'Silty';
    if (texture.includes('spongy') || texture.includes('peat')) return 'Peaty';
    if (waterRetention.includes('high') || waterRetention.includes('medium')) return 'Loamy';
    if (waterRetention.includes('low')) return 'Sandy';
    return 'Loamy';
  }

  return 'Unknown';
}

// Mock disease detection from leaf image
function detectDisease(hasImage) {
  if (!hasImage) return { disease: 'No Image Provided', confidence: 0 };

  const diseases = [
    { name: 'Healthy', weight: 0.35 },
    { name: 'Leaf Spot', weight: 0.2 },
    { name: 'Blight', weight: 0.15 },
    { name: 'Powdery Mildew', weight: 0.12 },
    { name: 'Rust', weight: 0.1 },
    { name: 'Bacterial Wilt', weight: 0.08 }
  ];

  const r = Math.random();
  let cum = 0;
  for (const d of diseases) {
    cum += d.weight;
    if (r <= cum) {
      return {
        disease: d.name,
        confidence: Math.round((0.7 + Math.random() * 0.25) * 100)
      };
    }
  }
  return { disease: 'Healthy', confidence: 92 };
}

// Crop recommendations based on soil + weather + disease
function getRecommendations(soilType, weather, disease) {
  const cropMap = {
    'Sandy': ['Carrots', 'Potatoes', 'Peanuts', 'Watermelon', 'Millet'],
    'Clay': ['Rice', 'Wheat', 'Lettuce', 'Broccoli', 'Cabbage'],
    'Loamy': ['Wheat', 'Sugarcane', 'Tomatoes', 'Corn', 'Soybeans'],
    'Silty': ['Rice', 'Wheat', 'Fruits', 'Vegetables', 'Grasses'],
    'Peaty': ['Potatoes', 'Celery', 'Onions', 'Spinach', 'Beets']
  };

  const crops = cropMap[soilType] || cropMap['Loamy'];
  let recommendations = [...crops];
  const suggestions = [];
  const warnings = [];

  // Weather-based adjustments
  if (weather) {
    if (weather.temperature > 35) {
      warnings.push('⚠️ High temperature detected. Consider heat-resistant crop varieties.');
      suggestions.push('Use mulching to retain soil moisture');
      suggestions.push('Irrigate during early morning or late evening');
    }
    if (weather.temperature < 10) {
      warnings.push('⚠️ Low temperature detected. Consider cold-tolerant varieties.');
      suggestions.push('Use row covers or greenhouses for protection');
    }
    if (weather.humidity > 80) {
      warnings.push('⚠️ High humidity increases fungal disease risk.');
      suggestions.push('Ensure proper spacing between plants for air circulation');
      suggestions.push('Apply preventive fungicide');
    }
    if (weather.rainfall > 100) {
      suggestions.push('Ensure good drainage to prevent waterlogging');
      recommendations = recommendations.filter(c => !['Potatoes', 'Peanuts'].includes(c));
    }
    if (weather.rainfall < 20) {
      suggestions.push('Consider drip irrigation for water conservation');
    }
  }

  // Disease-based adjustments
  if (disease && disease !== 'Healthy') {
    warnings.push(`⚠️ ${disease} detected. Treat before planting.`);

    switch (disease) {
      case 'Leaf Spot':
        suggestions.push('Apply copper-based fungicide');
        suggestions.push('Remove and destroy infected plant debris');
        break;
      case 'Blight':
        suggestions.push('Use blight-resistant varieties');
        suggestions.push('Apply mancozeb or chlorothalonil fungicide');
        break;
      case 'Powdery Mildew':
        suggestions.push('Apply neem oil or sulfur-based fungicide');
        suggestions.push('Avoid overhead watering');
        break;
      case 'Rust':
        suggestions.push('Apply propiconazole fungicide');
        suggestions.push('Ensure adequate nitrogen fertilization');
        break;
      case 'Bacterial Wilt':
        suggestions.push('Practice crop rotation (3-4 year cycle)');
        suggestions.push('Use disease-free seeds and transplants');
        break;
    }
  }

  if (suggestions.length === 0) {
    suggestions.push('Soil conditions are favorable for planting');
    suggestions.push('Maintain regular watering schedule');
    suggestions.push('Apply organic compost for better yield');
  }

  return { recommendedCrops: recommendations.slice(0, 5), suggestions, warnings };
}

// ============ ROUTES ============

// POST /crop-analysis/soil-detect — Soil classification
router.post('/soil-detect', upload.single('soilImage'), async (req, res) => {
  try {
    const { texture, waterRetention, color } = req.body;
    const hasImage = !!req.file;
    let soilType = 'Loamy';

    if (hasImage) {
      try {
        const imageBuffer = await fsPromise.readFile(req.file.path);
        const soilResult = await predictSoil(imageBuffer);
        
        if (soilResult.soilType === 'Not_Soil') {
          return res.status(400).json({ 
            success: false, 
            error: 'Uploaded image does not appear to be a valid soil image. Please upload a clear picture of soil.' 
          });
        }
        
        soilType = soilResult.soilType;
      } catch (e) {
        console.error('Soil ML Inference failed:', e.message);
        return res.status(400).json({ 
          success: false, 
          error: 'Soil analysis failed. Please ensure the image is clear and contains soil.' 
        });
      }
    } else {
      soilType = classifySoil({ texture, waterRetention, color }, hasImage);
    }

    if (soilType === 'Unknown' || soilType === 'Not_Soil') {
      return res.status(400).json({ 
        success: false, 
        error: 'Uploaded image does not appear to be a valid soil image. Please upload a clear picture of soil.' 
      });
    }

    const estimatedParams = getRandomParamsForSoil(soilType);

    res.json({
      success: true,
      soilType,
      estimatedParams,
      inputMethod: hasImage ? 'image' : 'manual',
      soilImage: req.file ? req.file.filename : null
    });
  } catch (err) {
    console.error('Soil detection error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /crop-analysis/disease-detect — Disease detection from leaf image
router.post('/disease-detect', upload.single('leafImage'), async (req, res) => {
  try {
    const hasImage = !!req.file;
    let result = { disease: 'Healthy', confidence: 92 };
    
    if (hasImage) {
      console.log('[DEBUG] Uploaded file path:', req.file.path);
      console.log('[DEBUG] Uploaded file size:', req.file.size);
      console.log('[DEBUG] Uploaded file originalname:', req.file.originalname);
      console.log('[DEBUG] Uploaded file mimetype:', req.file.mimetype);
      
      // Reject invalid images (too small or corrupted)
      if (req.file.size < 100) {
        console.log('[DEBUG] File too small, rejecting as invalid image');
        return res.status(400).json({
          success: false,
          error: 'Invalid image: File too small or corrupted'
        });
      }
      
      result = await predictDisease(req.file.path);
    } else {
      result = detectDisease(hasImage);
    }

    res.json({
      success: true,
      disease: result.disease,
      confidence: result.confidence,
      explanation: result.explanation,
      recommendation: result.recommendation,
      preventionTips: result.preventionTips,
      severity: result.severity,
      diseaseImage: req.file ? req.file.filename : null
    });
    } catch (err) {
      console.error('Disease detection error:', err);
      const status = err.message.includes('does not appear to be a valid') ? 400 : 500;
      res.status(status).json({ success: false, error: err.message });
    }
});

// GET /crop-analysis/weather/:location — Real-time weather
router.get('/weather/:location', async (req, res) => {
  try {
    const location = req.params.location;
    const apiKey = process.env.WEATHERAPI_KEY;

    if (!apiKey) {
      // Return mock weather if no API key
      return res.json({
        success: true,
        weather: {
          temperature: 25 + Math.round(Math.random() * 15),
          humidity: 50 + Math.round(Math.random() * 40),
          rainfall: Math.round(Math.random() * 80),
          condition: 'Partly Cloudy',
          windSpeed: 5 + Math.round(Math.random() * 20),
          location: location
        }
      });
    }

    const response = await axios.get(
      `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${encodeURIComponent(location)}&aqi=no`
    );

    const data = response.data;
    res.json({
      success: true,
      weather: {
        temperature: data.current.temp_c,
        humidity: data.current.humidity,
        rainfall: data.current.precip_mm,
        condition: data.current.condition.text,
        windSpeed: data.current.wind_kph,
        location: data.location.name + ', ' + data.location.region
      }
    });
  } catch (err) {
    console.error('Weather API error:', err.message);
    // Fallback to mock data
    res.json({
      success: true,
      weather: {
        temperature: 28,
        humidity: 65,
        rainfall: 12,
        condition: 'Clear',
        windSpeed: 10,
        location: req.params.location
      }
    });
  }
});

// POST /crop-analysis/analyze — Full combined analysis
router.post('/analyze', upload.fields([
  { name: 'soilImage', maxCount: 1 },
  { name: 'leafImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const { location, texture, waterRetention, color } = req.body;
    const userId = req.user.id;

    // 1. Soil classification
    const hasSoilImage = !!(req.files && req.files.soilImage);
    let soilType = 'Loamy';
    
    if (hasSoilImage) {
      try {
        const soilFile = req.files.soilImage[0];
        const imageBuffer = await fsPromise.readFile(soilFile.path);
        const soilResult = await predictSoil(imageBuffer);
        
        if (soilResult.soilType === 'Not_Soil') {
          return res.status(400).json({ 
            success: false, 
            error: 'Uploaded image does not appear to be a valid soil image. Please upload a clear picture of soil.' 
          });
        }
        
        soilType = soilResult.soilType;
      } catch (e) {
        console.error('Soil ML Inference failed:', e.message);
        return res.status(400).json({ 
          success: false, 
          error: 'Soil analysis failed. Please ensure the image is clear and contains soil.' 
        });
      }
    } else {
      soilType = classifySoil({ texture, waterRetention, color }, hasSoilImage);
    }

    if (soilType === 'Unknown' || soilType === 'Not_Soil') {
      return res.status(400).json({ 
        success: false, 
        error: 'Uploaded image does not appear to be a valid soil image. Please upload a clear picture of soil.' 
      });
    }

    // 2. Disease detection
    const hasLeafImage = !!(req.files && req.files.leafImage);
    let diseaseResult = { disease: 'Healthy', confidence: 92, explanation: '', recommendation: '' };
    
    if (hasLeafImage) {
      try {
        const leafFile = req.files.leafImage[0];
        const imageBuffer = await fsPromise.readFile(leafFile.path);
        diseaseResult = await predictDisease(imageBuffer);
      } catch (e) {
        if (e.message.includes('does not appear to be a valid')) {
          return res.status(400).json({ success: false, error: e.message });
        }
        console.error('ML Inference failed, using fallback:', e.message);
        diseaseResult = detectDisease(hasLeafImage);
      }
    } else {
      diseaseResult = detectDisease(hasLeafImage);
    }

    // 3. Weather
    let weather = { temperature: 28, humidity: 65, rainfall: 12, condition: 'Clear', windSpeed: 10, location, forecast: [] };
    try {
      const apiKey = process.env.WEATHERAPI_KEY;
      if (apiKey && location) {
        // Fetch 3-day forecast
        const weatherRes = await axios.get(
          `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(location)}&days=3&aqi=no&alerts=no`
        );
        const wd = weatherRes.data;
        weather = {
          temperature: wd.current.temp_c,
          humidity: wd.current.humidity,
          rainfall: wd.current.precip_mm,
          condition: wd.current.condition.text,
          windSpeed: wd.current.wind_kph,
          location: wd.location.name + ', ' + wd.location.region,
          forecast: wd.forecast.forecastday.map(day => ({
            date: day.date,
            maxTemp: day.day.maxtemp_c,
            minTemp: day.day.mintemp_c,
            condition: day.day.condition.text,
            icon: day.day.condition.icon,
            avgHumidity: day.day.avghumidity,
            totalPrecip: day.day.totalprecip_mm
          }))
        };
      }
    } catch (weatherErr) {
      console.warn('Weather fetch failed, using defaults:', weatherErr.message);
    }

    // 4. Recommendations
    const { recommendedCrops, suggestions, warnings } = getRecommendations(
      soilType, weather, diseaseResult.disease
    );

    // 5. Save analysis
    const analysis = new CropAnalysis({
      farmerId: userId,
      location: location || 'Unknown',
      soilType,
      soilInputMethod: hasSoilImage ? 'image' : 'manual',
      soilManualData: { texture, waterRetention, color },
      soilImage: req.files?.soilImage?.[0]?.filename || null,
      weather,
      diseaseDetected: diseaseResult.disease,
      diseaseConfidence: diseaseResult.confidence,
      diseaseImage: req.files?.leafImage?.[0]?.filename || null,
      recommendedCrops,
      suggestions,
      warnings
    });

    await analysis.save();

    res.json({
      success: true,
      analysisId: analysis._id,
      result: {
        soilType,
        weather,
        disease: diseaseResult.disease,
        diseaseConfidence: diseaseResult.confidence,
        recommendedCrops,
        suggestions,
        warnings
      }
    });
  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /crop-analysis/history — Farmer's past analyses
// GET /crop-analysis/history — Farmer's past analyses
router.get('/history', async (req, res) => {
  try {
    const userId = req.user.id;
    const analyses = await CropAnalysis.find({ farmerId: userId })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ success: true, analyses });
  } catch (err) {
    console.error('History fetch error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /crop-analysis/weather/:location — Dedicated weather forecast
router.get('/weather/:location', async (req, res) => {
  try {
    const { location } = req.params;
    const apiKey = process.env.WEATHERAPI_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'Weather API key not configured' });
    }

    const weatherRes = await axios.get(
      `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(location)}&days=3&aqi=no&alerts=no`
    );
    
    const wd = weatherRes.data;
    const weather = {
      temperature: wd.current.temp_c,
      humidity: wd.current.humidity,
      rainfall: wd.current.precip_mm,
      condition: wd.current.condition.text,
      windSpeed: wd.current.wind_kph,
      location: wd.location.name + ', ' + wd.location.region,
      forecast: wd.forecast.forecastday.map(day => ({
        date: day.date,
        maxTemp: day.day.maxtemp_c,
        minTemp: day.day.mintemp_c,
        condition: day.day.condition.text,
        icon: day.day.condition.icon,
        avgHumidity: day.day.avghumidity,
        totalPrecip: day.day.totalprecip_mm
      }))
    };

    res.json({ success: true, weather });
  } catch (err) {
    console.error('Weather API error:', err.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch weather data. Please check the location name.' 
    });
  }
});

// POST /crop-analysis/recommend-dataset — Crop Recommendation based on Dataset KNN
router.post('/recommend-dataset', async (req, res) => {
  try {
    const { n, p, k, temperature, humidity, ph, rainfall } = req.body;
    
    const result = await predictCropFromDataset(n, p, k, temperature, humidity, ph, rainfall);
    
    res.json({
      success: true,
      result: {
        recommendedCrop: result.recommendedCrop,
        recommendedCrops: result.recommendedCrops || [result.recommendedCrop],
        avoidCrops: result.avoidCrops || [],
        confidence: result.confidence,
        details: { n, p, k, temperature, humidity, ph, rainfall }
      }
    });
  } catch (err) {
    console.error('Dataset recommendation error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

