import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { getTranslation } from '../../locales/translations';
import {
  Sprout, Upload, CloudSun, Bug, Leaf, AlertTriangle, RotateCcw, Activity,
  Loader2, AlertCircle, Lightbulb, ShieldAlert, CheckCircle2, SlidersHorizontal,
  Image as ImageIcon, Layers, FlaskConical, Info, Thermometer, Droplets,
  CloudRain, CheckCircle, XCircle, MapPin, Wind
} from 'lucide-react';
import PaymentSection from '../../components/payment/PaymentSection';
import { analyzeCrop, fetchWeather, fetchCropRecommendation, detectSoil, detectDisease } from '../../api/apiClient';
import './SmartCropGrowthPage.css';


interface AnalysisResult {
  soilType: string;
  weather: {
    temperature: number;
    humidity: number;
    rainfall: number;
    condition: string;
    windSpeed: number;
    location: string;
  };
  disease: string;
  diseaseConfidence: number;
  recommendedCrops: string[];
  suggestions: string[];
  warnings: string[];
}

const SmartCropGrowthPage = () => {
  const { currentLanguage } = useLanguage();
  const t = (section: string, key: string) => getTranslation(section, key, currentLanguage);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'soil' | 'disease' | 'weather'>('soil');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  // Soil suitability result
  interface SoilResult {
    suitable: boolean;
    confidence: number;
    details: { texture: string; waterRetention: string; ph: string; moisture: string; };
    explanation: string;
    recommendation: string;
    recommendedCrops: string[];
    avoidCrops: string[];
  }
  const [soilResult, setSoilResult] = useState<SoilResult | null>(null);
  const [soilLoading, setSoilLoading] = useState(false);
  const [soilErrors, setSoilErrors] = useState<{ [key: string]: string }>({});
  const [soilAnalysisError, setSoilAnalysisError] = useState<string | null>(null);

  // Step 1: Soil
  const [soilImage, setSoilImage] = useState<File | null>(null);
  const [soilPreview, setSoilPreview] = useState<string>('');
  const [nitrogen, setNitrogen] = useState('');
  const [phosphorous, setPhosphorous] = useState('');
  const [potassium, setPotassium] = useState('');
  const [temperature, setTemperature] = useState('');
  const [humidity, setHumidity] = useState('');
  const [soilColor, setSoilColor] = useState('');
  const [soilPh, setSoilPh] = useState('');
  const [rainfall, setRainfall] = useState('');
  const [soilInputMode, setSoilInputMode] = useState<'manual' | 'upload'>('manual');
  const [dragging, setDragging] = useState(false);
  const soilInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Disease
  const [leafImage, setLeafImage] = useState<File | null>(null);
  const [leafPreview, setLeafPreview] = useState<string>('');
  const leafInputRef = useRef<HTMLInputElement>(null);
  const [diseaseResult, setDiseaseResult] = useState<{ disease: string; confidence: number; explanation: string; recommendation: string; preventionTips: string; severity: string; } | null>(null);
  const [diseaseLoading, setDiseaseLoading] = useState(false);
  const [diseaseError, setDiseaseError] = useState<string | null>(null);

  // Step 3: Weather
  const [location, setLocation] = useState('');
  const [weatherData, setWeatherData] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  const handleSoilFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) { alert(t('smartCropGrowth', 'fileTooLarge')); return; }
    setSoilImage(file);
    const reader = new FileReader();
    reader.onload = () => setSoilPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleSoilImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleSoilFile(file);
  };

  const onSoilDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleSoilFile(file);
  };

  const removeSoilImage = () => {
    setSoilImage(null);
    setSoilPreview('');
    setSoilErrors(prev => ({ ...prev, image: '' }));
    if (soilInputRef.current) soilInputRef.current.value = '';
  };

  const handleResetSoil = () => {
    setSoilImage(null);
    setSoilPreview('');
    setNitrogen('');
    setPhosphorous('');
    setPotassium('');
    setTemperature('');
    setHumidity('');
    setSoilPh('');
    setRainfall('');
    setSoilResult(null);
    setSoilErrors({});
    setSoilAnalysisError(null);
    if (soilInputRef.current) soilInputRef.current.value = '';
  };

  /* ---- Soil suitability scoring ---- */
  const validateSoil = () => {
    const errors: { [key: string]: string } = {};
    if (soilInputMode === 'upload') {
      if (!soilImage) errors.image = t('smartCropGrowth', 'pleaseUploadSoilImage');
    } else {
      if (!nitrogen) errors.nitrogen = t('smartCropGrowth', 'pleaseEnterNitrogen');
      if (!phosphorous) errors.phosphorous = t('smartCropGrowth', 'pleaseEnterPhosphorous');
      if (!potassium) errors.potassium = t('smartCropGrowth', 'pleaseEnterPotassium');
      if (!temperature) errors.temperature = t('smartCropGrowth', 'pleaseEnterTemperature');
      if (!humidity) errors.humidity = t('smartCropGrowth', 'pleaseEnterHumidity');
      if (!rainfall) errors.rainfall = t('smartCropGrowth', 'pleaseEnterRainfall');
      if (!soilPh) {
        errors.ph = t('smartCropGrowth', 'pleaseEnterSoilPh');
      } else {
        const phVal = parseFloat(soilPh);
        if (isNaN(phVal) || phVal < 0 || phVal > 14) {
          errors.ph = t('smartCropGrowth', 'validPhRange');
        }
      }
    }
    setSoilErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSoilSubmit = async () => {
    if (!validateSoil()) return;
    setSoilResult(null);
    setSoilAnalysisError(null);
    setSoilLoading(true);

    try {
      if (soilInputMode === 'upload' && soilImage) {
        // 1. Get soil type from image using ML model
        const soilRes = await detectSoil({ soilImage });
        const soilType = soilRes.soilType;

        if (!soilType || soilType === 'Not_Soil' || soilType === 'Unknown') {
          setSoilAnalysisError(t('smartCropGrowth', 'notValidSoilImage'));
          setSoilLoading(false);
          return;
        }

        // 2. Extract dataset-backed parameters based on the soil type
        const params = soilRes.estimatedParams || { n: 60, p: 45, k: 40, temperature: 25, humidity: 60, ph: 6.5, rainfall: 100 };
        const n = String(params.n || params.N);
        const p = String(params.p || params.P);
        const k = String(params.k || params.K);
        const temp = String(params.temperature);
        const hum = String(params.humidity);
        const ph = String(params.ph);
        const rain = String(params.rainfall);

        // 3. Fetch from dataset API
        const data = await fetchCropRecommendation({
          n, p, k, temperature: temp, humidity: hum, ph, rainfall: rain
        });

        setSoilResult({
          suitable: data.confidence >= 60,
          confidence: data.confidence,
          details: { n, p, k, temperature: temp + '°C', humidity: hum + '%', ph, rainfall: rain + 'mm' } as any,
          explanation: `Image analyzed as ${soilType} soil. Analyzed estimated parameters against dataset. The most suitable match is ${data.recommendedCrop}.`,
          recommendation: `Planting ${data.recommendedCrop} is highly recommended based on historical data for ${soilType} soil.`,
          recommendedCrops: data.recommendedCrops || [data.recommendedCrop],
          avoidCrops: data.avoidCrops || []
        });
        setSoilLoading(false);
      } else {
        // Fetch from dataset API
        const data = await fetchCropRecommendation({
          n: nitrogen,
          p: phosphorous,
          k: potassium,
          temperature,
          humidity,
          ph: soilPh,
          rainfall
        });

        setSoilResult({
          suitable: data.confidence >= 60,
          confidence: data.confidence,
          details: {
            n: nitrogen || '—',
            p: phosphorous || '—',
            k: potassium || '—',
            temperature: temperature ? `${temperature}°C` : '—',
            humidity: humidity ? `${humidity}%` : '—',
            ph: soilPh || '—',
            rainfall: rainfall ? `${rainfall}mm` : '—',
          } as any,
          explanation: `Analyzed parameters against dataset. The most suitable match is ${data.recommendedCrop}.`,
          recommendation: `Planting ${data.recommendedCrop} is highly recommended based on historical data.`,
          recommendedCrops: data.recommendedCrops || [data.recommendedCrop],
          avoidCrops: data.avoidCrops || []
        });
        setSoilLoading(false);
      }
    } catch (error: any) {
      console.error('Recommendation error:', error);
      setSoilLoading(false);

      const errorMessage = error.response?.data?.error || error.message || 'An error occurred during analysis.';
      setSoilAnalysisError(errorMessage);
    }
  };


  const handleDetectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation(`${pos.coords.latitude.toFixed(4)},${pos.coords.longitude.toFixed(4)}`);
          setWeatherData(null);
        },
        () => {
          setLocation('Mumbai, India');
          setWeatherData(null);
        }
      );
    } else {
      setLocation('Mumbai, India');
      setWeatherData(null);
    }
  };

  const handleFetchWeather = async () => {
    if (!location) return;
    setWeatherLoading(true);
    try {
      const data = await fetchWeather(location);
      setWeatherData(data);
    } catch {
      setWeatherData({
        temperature: 28, humidity: 65, rainfall: 12,
        condition: 'Clear', windSpeed: 10, location
      });
    }
    setWeatherLoading(false);
  };

  const handleLeafImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLeafImage(file);
      const reader = new FileReader();
      reader.onload = () => setLeafPreview(reader.result as string);
      reader.readAsDataURL(file);
      setDiseaseResult(null);
      setDiseaseError(null);
    }
  };

  const handleDiseaseSubmit = async () => {
    if (!leafImage) return;
    setDiseaseLoading(true);
    setDiseaseError(null);
    setDiseaseResult(null);
    try {
      const data = await detectDisease(leafImage);
      setDiseaseResult({
        disease: data.disease,
        confidence: data.confidence,
        explanation: data.explanation || 'Analyzed successfully.',
        recommendation: data.recommendation || 'No specific recommendations provided.',
        preventionTips: data.preventionTips || 'Regular monitoring recommended.',
        severity: data.severity || 'Unknown'
      });
    } catch (err: any) {
      console.error('Disease detection error:', err);
      setDiseaseError(err.message || 'Failed to detect disease');
    }
    setDiseaseLoading(false);
  };

  const handleResetDisease = () => {
    setLeafImage(null);
    setLeafPreview('');
    setDiseaseResult(null);
    setDiseaseError(null);
    if (leafInputRef.current) leafInputRef.current.value = '';
  };

  const handleFullAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const data = await analyzeCrop({
        location,
        texture: soilColor,
        waterRetention: soilResult?.details?.waterRetention || '',
        color: soilColor,
        soilImage: soilImage || undefined,
        leafImage: leafImage || undefined
      });
      setResult(data);
    } catch (err: any) {
      console.error('Analysis error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'An error occurred during analysis.';
      alert(errorMessage);
    }
    setIsAnalyzing(false);
  };

  const resetAnalysis = () => {
    setResult(null);
    setSoilImage(null);
    setSoilPreview('');
    setLeafImage(null);
    setLeafPreview('');
    setNitrogen('');
    setPhosphorous('');
    setPotassium('');
    setTemperature('');
    setHumidity('');
    setSoilColor('');
    setSoilPh('');
    setRainfall('');
    setSoilResult(null);
    setSoilLoading(false);
    setWeatherData(null);
    setLocation('');
  };

  return (
    <div className="crop-growth-page">
      <header className="page-header">
        <h1><Sprout size={32} color="#22c55e" /> {t('smartCropGrowth', 'title')}</h1>
        <p className="page-subtitle">AI-powered analysis and lifecycle tracking for expert-level farming</p>
      </header>

      <nav className="growth-tabs">
        <button
          className={`tab-btn ${activeTab === 'soil' ? 'active' : ''}`}
          onClick={() => setActiveTab('soil')}
        >
          <Leaf size={18} /> {t('smartCropGrowth', 'soilAnalysis')}
        </button>
        <button
          className={`tab-btn ${activeTab === 'weather' ? 'active' : ''}`}
          onClick={() => setActiveTab('weather')}
        >
          <CloudSun size={18} /> {t('smartCropGrowth', 'weather')}
        </button>
        <button
          className={`tab-btn ${activeTab === 'disease' ? 'active' : ''}`}
          onClick={() => setActiveTab('disease')}
        >
          <Bug size={18} /> {t('smartCropGrowth', 'diseaseCheck')}
        </button>
      </nav>

      {/* ============ MODULAR WIZARD STEPS ============ */}
      <div className="wizard-card">
        {/* STEP 0: Soil */}
        {activeTab === 'soil' && (
          <div className="soil-analysis-container">
            <h2><Leaf size={24} /> {t('smartCropGrowth', 'soilAnalysis')}</h2>
            <p className="step-description">{t('smartCropGrowth', 'soilAnalysisDescription')}</p>

            {/* Toggle: Manual Input / Upload Image */}
            <div className="soil-input-toggle">
              <button
                className={`soil-toggle-btn ${soilInputMode === 'manual' ? 'active' : ''}`}
                onClick={() => setSoilInputMode('manual')}
              >
                <SlidersHorizontal size={16} /> {t('smartCropGrowth', 'manualInput')}
              </button>
              <button
                className={`soil-toggle-btn ${soilInputMode === 'upload' ? 'active' : ''}`}
                onClick={() => setSoilInputMode('upload')}
              >
                <ImageIcon size={16} /> {t('smartCropGrowth', 'uploadImage')}
              </button>
            </div>

            {/* === UPLOAD MODE === */}
            {soilInputMode === 'upload' && (
              <div
                className={`soil-upload-zone ${dragging ? 'dragging' : ''} ${soilPreview ? 'has-preview' : ''}`}
                onClick={() => !soilPreview && soilInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onSoilDrop}
              >
                <input ref={soilInputRef} type="file" accept="image/jpeg,image/png" hidden onChange={handleSoilImageChange} />
                {soilPreview ? (
                  <div className="soil-preview-wrap">
                    <img src={soilPreview} alt="Soil" className="soil-preview-img" />
                    <div className="soil-file-info">
                      <span className="file-name">{soilImage?.name}</span>
                    </div>
                    <button className="soil-preview-remove" onClick={(e) => { e.stopPropagation(); removeSoilImage(); }} title="Remove image">✕</button>
                  </div>
                ) : (
                  <>
                    <div className={`soil-upload-icon ${soilErrors.image ? 'has-error' : ''}`}><Upload size={26} /></div>
                    <h3>{t('smartCropGrowth', 'dragDrop')} {t('smartCropGrowth', 'or')} <span className="browse-link">{t('smartCropGrowth', 'browse')}</span></h3>
                    <p className="soil-upload-hint">JPG / PNG — max 10 MB</p>
                    {soilErrors.image && <p className="soil-input-error"><AlertCircle size={12} /> {soilErrors.image}</p>}
                  </>
                )}
              </div>
            )}

            {/* === MANUAL MODE === */}
            {soilInputMode === 'manual' && (
              <div className="soil-manual-form">
                <div className="soil-form-row">
                  <div className={`soil-form-field ${soilErrors.nitrogen ? 'has-error' : ''}`}>
                    <label htmlFor="soil-nitrogen">
                      <span className="soil-field-icon icon-texture"><Layers size={14} /></span>
                      {t('smartCropGrowth', 'nitrogen')}
                    </label>
                    <input
                      id="soil-nitrogen"
                      type="number"
                      placeholder="e.g. 90"
                      value={nitrogen}
                      onChange={(e) => { setNitrogen(e.target.value); setSoilErrors(prev => ({ ...prev, nitrogen: '' })); }}
                    />
                    {soilErrors.nitrogen && <p className="soil-input-error"><AlertCircle size={12} /> {soilErrors.nitrogen}</p>}
                  </div>

                  <div className={`soil-form-field ${soilErrors.phosphorous ? 'has-error' : ''}`}>
                    <label htmlFor="soil-phosphorous">
                      <span className="soil-field-icon icon-texture"><Layers size={14} /></span>
                      {t('smartCropGrowth', 'phosphorous')}
                    </label>
                    <input
                      id="soil-phosphorous"
                      type="number"
                      placeholder="e.g. 42"
                      value={phosphorous}
                      onChange={(e) => { setPhosphorous(e.target.value); setSoilErrors(prev => ({ ...prev, phosphorous: '' })); }}
                    />
                    {soilErrors.phosphorous && <p className="soil-input-error"><AlertCircle size={12} /> {soilErrors.phosphorous}</p>}
                  </div>
                </div>

                <div className="soil-form-row">
                  <div className={`soil-form-field ${soilErrors.potassium ? 'has-error' : ''}`}>
                    <label htmlFor="soil-potassium">
                      <span className="soil-field-icon icon-texture"><Layers size={14} /></span>
                      {t('smartCropGrowth', 'potassium')}
                    </label>
                    <input
                      id="soil-potassium"
                      type="number"
                      placeholder="e.g. 43"
                      value={potassium}
                      onChange={(e) => { setPotassium(e.target.value); setSoilErrors(prev => ({ ...prev, potassium: '' })); }}
                    />
                    {soilErrors.potassium && <p className="soil-input-error"><AlertCircle size={12} /> {soilErrors.potassium}</p>}
                  </div>

                  <div className={`soil-form-field ${soilErrors.ph ? 'has-error' : ''}`}>
                    <label htmlFor="soil-ph">
                      <span className="soil-field-icon icon-ph"><FlaskConical size={14} /></span>
                      {t('smartCropGrowth', 'soilPh')}
                    </label>
                    <input
                      id="soil-ph"
                      type="number"
                      step="0.1"
                      min="0"
                      max="14"
                      placeholder="e.g. 6.5"
                      value={soilPh}
                      onChange={(e) => { setSoilPh(e.target.value); setSoilErrors(prev => ({ ...prev, ph: '' })); }}
                    />
                    <span className="soil-helper-text"><Info size={12} /> Ideal range: 6.0 – 7.5</span>
                    {soilErrors.ph && <p className="soil-input-error"><AlertCircle size={12} /> {soilErrors.ph}</p>}
                  </div>
                </div>

                <div className="soil-form-row">
                  <div className={`soil-form-field ${soilErrors.temperature ? 'has-error' : ''}`}>
                    <label htmlFor="soil-temperature">
                      <span className="soil-field-icon icon-ph"><Thermometer size={14} /></span>
                      {t('smartCropGrowth', 'temperature')}
                    </label>
                    <input
                      id="soil-temperature"
                      type="number"
                      step="0.1"
                      placeholder="e.g. 20.8"
                      value={temperature}
                      onChange={(e) => { setTemperature(e.target.value); setSoilErrors(prev => ({ ...prev, temperature: '' })); }}
                    />
                    {soilErrors.temperature && <p className="soil-input-error"><AlertCircle size={12} /> {soilErrors.temperature}</p>}
                  </div>

                  <div className={`soil-form-field ${soilErrors.humidity ? 'has-error' : ''}`}>
                    <label htmlFor="soil-humidity">
                      <span className="soil-field-icon icon-moisture"><Droplets size={14} /></span>
                      {t('smartCropGrowth', 'humidity')}
                    </label>
                    <input
                      id="soil-humidity"
                      type="number"
                      step="0.1"
                      placeholder="e.g. 82.0"
                      value={humidity}
                      onChange={(e) => { setHumidity(e.target.value); setSoilErrors(prev => ({ ...prev, humidity: '' })); }}
                    />
                    {soilErrors.humidity && <p className="soil-input-error"><AlertCircle size={12} /> {soilErrors.humidity}</p>}
                  </div>
                </div>

                <div className={`soil-form-field ${soilErrors.rainfall ? 'has-error' : ''}`}>
                  <label htmlFor="soil-rainfall">
                    <span className="soil-field-icon icon-water"><CloudRain size={14} /></span>
                    {t('smartCropGrowth', 'rainfall')}
                  </label>
                  <input
                    id="soil-rainfall"
                    type="number"
                    step="0.1"
                    placeholder="e.g. 202.9"
                    value={rainfall}
                    onChange={(e) => { setRainfall(e.target.value); setSoilErrors(prev => ({ ...prev, rainfall: '' })); }}
                  />
                  {soilErrors.rainfall && <p className="soil-input-error"><AlertCircle size={12} /> {soilErrors.rainfall}</p>}
                </div>
              </div>
            )}

            {/* Actions inside container to show results below */}
            {!soilResult && (
              <div className="soil-action-buttons">
                <button
                  className="soil-btn-submit"
                  disabled={soilLoading}
                  onClick={handleSoilSubmit}
                >
                  {soilLoading ? (
                    <><Loader2 size={18} className="animate-spin" /> {t('smartCropGrowth', 'analyzing')}</>
                  ) : (
                    <><CheckCircle size={18} /> {t('smartCropGrowth', 'analyze')}</>
                  )}
                </button>
                <button
                  className="soil-btn-reset"
                  onClick={handleResetSoil}
                  disabled={soilLoading}
                >
                  <RotateCcw size={16} /> {t('smartCropGrowth', 'startOver')}
                </button>
              </div>
            )}

            {/* === SOIL LOADING === */}
            {soilLoading && (
              <div className="soil-loading-box">
                <div className="soil-spinner" />
                <p>{t('smartCropGrowth', 'analyzing')}</p>
              </div>
            )}

            {/* === SOIL ERROR === */}
            {soilAnalysisError && !soilLoading && (
              <div className="soil-result-section">
                <div className="soil-result-card not-suitable">
                  <div className="soil-result-badge-container">
                    <div className="soil-status-badge not-suitable">
                      <XCircle size={20} />
                      <span>Invalid Image</span>
                    </div>
                  </div>
                  <div className="soil-result-block analysis">
                    <div className="block-header">
                      <AlertTriangle size={18} />
                      <h4>Error</h4>
                    </div>
                    <div className="block-body">
                      <p>{soilAnalysisError}</p>
                    </div>
                  </div>
                  <div className="soil-result-footer-actions">
                    <button className="soil-btn-recheck" onClick={handleResetSoil}>
                      <RotateCcw size={16} /> {t('smartCropGrowth', 'startOver')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* === SOIL RESULT === */}
            {soilResult && !soilLoading && (
              <div className="soil-result-section">
                <div className={`soil-result-card ${soilResult.suitable ? 'suitable' : 'not-suitable'}`}>
                  {/* 1. Suitability Status Badge */}
                  <div className="soil-result-badge-container">
                    <div className={`soil-status-badge ${soilResult.suitable ? 'suitable' : 'not-suitable'}`}>
                      {soilResult.suitable ? <CheckCircle size={20} /> : <XCircle size={20} />}
                      <span>{soilResult.suitable ? t('smartCropGrowth', 'suitable') : t('smartCropGrowth', 'notSuitable')}</span>
                    </div>
                    <div className="soil-confidence-tag">
                      {t('smartCropGrowth', 'confidence')}: {soilResult.confidence}%
                    </div>
                  </div>

                  {/* 2. Soil Analysis Message */}
                  <div className="soil-result-block analysis">
                    <div className="block-header">
                      <Activity size={18} />
                      <h4>{t('smartCropGrowth', 'soilAnalysis')}</h4>
                    </div>
                    <div className="block-body">
                      <p>{soilResult.explanation}</p>
                    </div>
                  </div>

                  {/* 3. Recommended Action with Impact */}
                  <div className="soil-result-block action">
                    <div className="block-header">
                      <Lightbulb size={18} />
                      <h4>{t('smartCropGrowth', 'recommendation')}</h4>
                    </div>
                    <div className="block-body">
                      <p>{soilResult.recommendation}</p>
                    </div>
                  </div>

                  {/* 4. Recommended Crops */}
                  <div className="soil-result-block crops-recommended">
                    <div className="block-header">
                      <Sprout size={18} />
                      <h4>🌾 {t('smartCropGrowth', 'recommendedCrops')}</h4>
                    </div>
                    <div className="block-body tags">
                      {soilResult.recommendedCrops.map(crop => (
                        <span key={crop} className="crop-tag recommended">{crop}</span>
                      ))}
                      {soilResult.recommendedCrops.length === 0 && <span className="no-tags">No specifics detected</span>}
                    </div>
                  </div>

                  {/* 5. Crops to Avoid */}
                  <div className="soil-result-block crops-avoid">
                    <div className="block-header">
                      <ShieldAlert size={18} />
                      <h4>⚠️ {t('smartCropGrowth', 'avoidCrops')}</h4>
                    </div>
                    <div className="block-body tags">
                      {soilResult.avoidCrops.map(crop => (
                        <span key={crop} className="crop-tag avoid">{crop}</span>
                      ))}
                      {soilResult.avoidCrops.length === 0 && <span className="no-tags">None specifically restricted</span>}
                    </div>
                  </div>

                  {/* 6. Input Summary (Details) */}
                  <div className="soil-result-details-compact">
                    <div className="detail-pill"><span>pH:</span> {soilResult.details.ph}</div>
                    <div className="detail-pill"><span>Texture:</span> {soilResult.details.texture}</div>
                    <div className="detail-pill"><span>Moisture:</span> {soilResult.details.moisture}</div>
                    <div className="detail-pill"><span>Retention:</span> {soilResult.details.waterRetention}</div>
                  </div>

                  <div className="soil-result-footer-actions">
                    <button className="soil-btn-recheck" onClick={handleResetSoil}>
                      <RotateCcw size={16} /> {t('smartCropGrowth', 'startOver')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 1: Disease - REORGANIZED */}
        {activeTab === 'disease' && (
          <div className="disease-check-container">
            <div className="main-check">
              <h2><Bug size={24} /> {t('smartCropGrowth', 'diseaseCheck')}</h2>
              <p className="step-description">{t('smartCropGrowth', 'diseaseCheckDescription')}</p>

              <div
                className={`upload-area ${leafImage ? 'has-file' : ''}`}
                onClick={() => leafInputRef.current?.click()}
              >
                <input type="file" ref={leafInputRef} hidden onChange={handleLeafImageChange} />
                {leafPreview ? (
                  <div style={{ textAlign: 'center' }}>
                    <img src={leafPreview} alt="Leaf" style={{ maxWidth: '250px', borderRadius: '12px', marginBottom: '1rem' }} />
                    {diseaseLoading && (
                      <div className="confidence-label">
                        <strong>Scanning Progress</strong>
                        <div className="confidence-meter"><div className="confidence-fill" style={{ width: '100%' }} /></div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="upload-placeholder-icon"><Bug size={32} /></div>
                    <p><strong>{t('smartCropGrowth', 'pleaseUploadLeafImage')}</strong></p>
                  </>
                )}
              </div>

              {!diseaseResult && !diseaseError && leafPreview && (
                <div className="soil-action-buttons" style={{ marginTop: '1.5rem', justifyContent: 'center' }}>
                  <button
                    className="soil-btn-submit"
                    disabled={diseaseLoading}
                    onClick={handleDiseaseSubmit}
                  >
                    {diseaseLoading ? (
                      <><Loader2 size={18} className="animate-spin" /> Scanning...</>
                    ) : (
                      <><Bug size={18} /> {t('smartCropGrowth', 'analyze')}</>
                    )}
                  </button>
                  <button
                    className="soil-btn-reset"
                    onClick={handleResetDisease}
                    disabled={diseaseLoading}
                  >
                    <RotateCcw size={16} /> {t('smartCropGrowth', 'startOver')}
                  </button>
                </div>
              )}

              {/* === DISEASE ERROR === */}
              {diseaseError && !diseaseLoading && (
                <div className="soil-result-section" style={{ marginTop: '2rem' }}>
                  <div className="soil-result-card not-suitable">
                    <div className="soil-result-badge-container">
                      <div className="soil-status-badge not-suitable">
                        <XCircle size={20} />
                        <span>Invalid Image</span>
                      </div>
                    </div>
                    <div className="soil-result-block analysis">
                      <div className="block-header">
                        <AlertTriangle size={18} />
                        <h4>Error</h4>
                      </div>
                      <div className="block-body">
                        <p>{diseaseError}</p>
                      </div>
                    </div>
                    <div className="soil-result-footer-actions">
                      <button className="soil-btn-recheck" onClick={handleResetDisease}>
                        <RotateCcw size={16} /> {t('smartCropGrowth', 'startOver')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {diseaseResult && !diseaseLoading && (
                <div className="soil-result-section" style={{ marginTop: '2rem' }}>
                  <div className={`soil-result-card ${diseaseResult.disease === 'Healthy' ? 'suitable' : 'not-suitable'}`}>
                    <div className="soil-result-badge-container">
                      <div className={`soil-status-badge ${diseaseResult.disease === 'Healthy' ? 'suitable' : 'not-suitable'}`}>
                        {diseaseResult.disease === 'Healthy' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                        <span>{diseaseResult.disease === 'Healthy' ? t('smartCropGrowth', 'healthy') : t('smartCropGrowth', 'diseaseDetected')}</span>
                      </div>
                      <div className="soil-confidence-tag">
                        {t('smartCropGrowth', 'confidence')}: {diseaseResult.confidence}%
                      </div>
                      <div className="soil-severity-tag">
                        Severity: {diseaseResult.severity}
                      </div>
                    </div>

                    <div className="soil-result-block analysis">
                      <div className="block-header">
                        <Activity size={18} />
                        <h4>{t('smartCropGrowth', 'diseaseExplanation')}</h4>
                      </div>
                      <div className="block-body">
                        <p>{diseaseResult.explanation}</p>
                      </div>
                    </div>

                    <div className="soil-result-block action">
                      <div className="block-header">
                        <Lightbulb size={18} />
                        <h4>{t('smartCropGrowth', 'diseaseRecommendation')}</h4>
                      </div>
                      <div className="block-body">
                        <p>{diseaseResult.recommendation}</p>
                      </div>
                    </div>

                    <div className="soil-result-block action">
                      <div className="block-header">
                        <ShieldAlert size={18} />
                        <h4>Prevention Tips</h4>
                      </div>
                      <div className="block-body">
                        <p>{diseaseResult.preventionTips}</p>
                      </div>
                    </div>

                    <div className="soil-result-footer-actions">
                      <button className="soil-btn-recheck" onClick={handleResetDisease}>
                        <RotateCcw size={16} /> {t('smartCropGrowth', 'startOver')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="disease-info-panel">
              <h3>Tips for better detection</h3>
              <div className="info-item">
                <div className="info-item-icon"><Info size={16} /></div>
                <div className="info-item-content">
                  <h4>Good Lighting</h4>
                  <p>Avoid direct sunlight or harsh shadows. Overcast light is best.</p>
                </div>
              </div>
              <div className="info-item">
                <div className="info-item-icon"><Info size={16} /></div>
                <div className="info-item-content">
                  <h4>Close Up</h4>
                  <p>Focus clearly on the spots or areas of concern.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Weather - REORGANIZED */}
        {activeTab === 'weather' && (
          <div className="weather-config">
            <h2><CloudSun size={24} /> {t('smartCropGrowth', 'weather')}</h2>
            <p className="step-description">{t('smartCropGrowth', 'weatherDescription')}</p>

            <div className="location-box">
              <MapPin size={24} color="#3b82f6" />
              <input
                type="text"
                placeholder={t('smartCropGrowth', 'enterLocation')}
                value={location}
                onChange={e => {
                  setLocation(e.target.value);
                  setWeatherData(null);
                }}
              />
              <button className="btn-locate" onClick={handleDetectLocation}>
                <Activity size={16} /> {t('smartCropGrowth', 'autoDetect')}
              </button>
              {location && !weatherData && (
                <button className="btn-primary" onClick={handleFetchWeather} disabled={weatherLoading}>
                  {weatherLoading ? t('smartCropGrowth', 'analyzing') : t('smartCropGrowth', 'getWeather')}
                </button>
              )}
            </div>

            {weatherData && (
              <>
                <div className="weather-grid-compact">
                  <div className="weather-card-new">
                    <div className="weather-icon-box" style={{ background: '#fee2e2', color: '#ef4444' }}><Thermometer /></div>
                    <div className="weather-details-box">
                      <span className="val">{weatherData.temperature}°C</span>
                      <span className="lbl">{t('smartCropGrowth', 'temperature')}</span>
                    </div>
                  </div>
                  <div className="weather-card-new">
                    <div className="weather-icon-box" style={{ background: '#dbeafe', color: '#3b82f6' }}><Droplets /></div>
                    <div className="weather-details-box">
                      <span className="val">{weatherData.humidity}%</span>
                      <span className="lbl">{t('smartCropGrowth', 'humidity')}</span>
                    </div>
                  </div>
                  <div className="weather-card-new">
                    <div className="weather-icon-box" style={{ background: '#e0e7ff', color: '#6366f1' }}><CloudRain /></div>
                    <div className="weather-details-box">
                      <span className="val">{weatherData.rainfall}mm</span>
                      <span className="lbl">{t('smartCropGrowth', 'rainfall')}</span>
                    </div>
                  </div>
                  <div className="weather-card-new">
                    <div className="weather-icon-box" style={{ background: '#ccfbf1', color: '#14b8a6' }}><Wind /></div>
                    <div className="weather-details-box">
                      <span className="val">{weatherData.windSpeed}km/h</span>
                      <span className="lbl">{t('smartCropGrowth', 'wind')}</span>
                    </div>
                  </div>
                </div>

                {/* Farming Insights Based on Weather */}
                <div className="soil-result-section" style={{ marginTop: '2rem' }}>
                  <div className="soil-result-card suitable">
                    <div className="soil-result-badge-container">
                      <div className="soil-status-badge suitable">
                        <CheckCircle size={20} />
                        <span>{t('smartCropGrowth', 'weatherFavorable')}</span>
                      </div>
                    </div>
                    <div className="soil-result-block analysis">
                      <div className="block-header">
                        <Lightbulb size={18} />
                        <h4>{t('smartCropGrowth', 'weatherInsights')}</h4>
                      </div>
                      <div className="block-body">
                        <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                          {weatherData.temperature > 35 && <li>🌡️ {t('smartCropGrowth', 'temperatureHigh')}</li>}
                          {weatherData.temperature < 15 && <li>❄️ {t('smartCropGrowth', 'temperatureLow')}</li>}
                          {weatherData.humidity > 80 && <li>💧 {t('smartCropGrowth', 'humidityHigh')}</li>}
                          {weatherData.humidity < 40 && <li>🏜️ {t('smartCropGrowth', 'humidityLow')}</li>}
                          {weatherData.rainfall > 50 && <li>🌧️ {t('smartCropGrowth', 'rainfallHigh')}</li>}
                          {weatherData.rainfall < 10 && <li>☀️ {t('smartCropGrowth', 'rainfallLow')}</li>}
                          {weatherData.windSpeed > 20 && <li>💨 {t('smartCropGrowth', 'windStrong')}</li>}
                          {!(weatherData.temperature > 35 || weatherData.temperature < 15 || weatherData.humidity > 80 || weatherData.humidity < 40 || weatherData.rainfall > 50 || weatherData.rainfall < 10 || weatherData.windSpeed > 20) &&
                            <li>✅ {t('smartCropGrowth', 'weatherFavorable')}</li>}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {weatherData && weatherData.forecast && weatherData.forecast.length > 0 && (
              <div className="weather-forecast-section" style={{ marginTop: '2.5rem' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', color: '#1e293b' }}>{t('smartCropGrowth', 'forecast')}</h3>
                <div className="forecast-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                  {weatherData.forecast.map((day: any) => (
                    <div key={day.date} className="forecast-day-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#475569' }}>{new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                        <img src={day.icon} alt={day.condition} style={{ width: '40px', height: '40px' }} />
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>
                        {day.maxTemp}°C <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 600 }}>/ {day.minTemp}°C</span>
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>{day.condition}</div>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: '#3b82f6' }}>
                          <Droplets size={14} /> {day.avgHumidity}%
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: '#6366f1' }}>
                          <CloudRain size={14} /> {day.totalPrecip}mm
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {weatherData && (
              <div className="soil-result-footer-actions" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-start' }}>
                <button className="soil-btn-recheck" onClick={() => {
                  setLocation('');
                  setWeatherData(null);
                }}>
                  <RotateCcw size={16} /> {t('smartCropGrowth', 'startOver')}
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Full Analysis Results */}
      {result && (
        <>
          <div className="wizard-card" style={{ marginTop: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem', color: '#1e293b' }}><Sprout size={24} /> Complete Analysis Results</h2>

            <div className="soil-result-section">
              <div className={`soil-result-card ${result.soilType ? 'suitable' : 'not-suitable'}`}>
                {/* Soil Type */}
                <div className="soil-result-badge-container">
                  <div className="soil-status-badge suitable">
                    <Leaf size={20} />
                    <span>Soil Type: {result.soilType || 'Unknown'}</span>
                  </div>
                </div>

                {/* Recommended Crops */}
                <div className="soil-result-block crops-recommended">
                  <div className="block-header">
                    <Sprout size={18} />
                    <h4>🌾 Recommended Crops</h4>
                  </div>
                  <div className="block-body tags">
                    {result.recommendedCrops && result.recommendedCrops.length > 0 ? (
                      result.recommendedCrops.map(crop => (
                        <span key={crop} className="crop-tag recommended">{crop}</span>
                      ))
                    ) : (
                      <span className="no-tags">No recommendations available</span>
                    )}
                  </div>
                </div>

                {/* Crops to Avoid */}
                <div className="soil-result-block crops-avoid">
                  <div className="block-header">
                    <ShieldAlert size={18} />
                    <h4>⚠️ Crops to Avoid</h4>
                  </div>
                  <div className="block-body tags">
                    {result.warnings && result.warnings.length > 0 ? (
                      result.warnings.map((warning, index) => (
                        <span key={index} className="crop-tag avoid">{warning}</span>
                      ))
                    ) : (
                      <span className="no-tags">No specific restrictions</span>
                    )}
                  </div>
                </div>

                {/* Disease Status */}
                <div className="soil-result-block analysis">
                  <div className="block-header">
                    <Bug size={18} />
                    <h4>Plant Health Status</h4>
                  </div>
                  <div className="block-body">
                    <p><strong>Disease:</strong> {result.disease || 'Not analyzed'} (Confidence: {result.diseaseConfidence || 0}%)</p>
                  </div>
                </div>

                {/* Actionable Suggestions */}
                {result.suggestions && result.suggestions.length > 0 && (
                  <div className="soil-result-block action">
                    <div className="block-header">
                      <Lightbulb size={18} />
                      <h4>Farming Suggestions</h4>
                    </div>
                    <div className="block-body">
                      <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                        {result.suggestions.map((suggestion, index) => (
                          <li key={index}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {result.warnings && result.warnings.length > 0 && (
                  <div className="soil-result-block analysis" style={{ borderLeft: '4px solid #ef4444' }}>
                    <div className="block-header">
                      <AlertTriangle size={18} style={{ color: '#ef4444' }} />
                      <h4 style={{ color: '#ef4444' }}>Important Warnings</h4>
                    </div>
                    <div className="block-body">
                      <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                        {result.warnings.map((warning, index) => (
                          <li key={index} style={{ color: '#ef4444' }}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payment Section */}
          <PaymentSection
            analysisData={result}
            onPaymentComplete={(transactionId) => {
              console.log('Payment completed:', transactionId);
              // You can add post-payment logic here
            }}
          />
        </>
      )}
    </div>
  );
};

export default SmartCropGrowthPage;
