import { useState, useRef, useCallback } from 'react';
import {
  Leaf, Upload, Layers, Droplets, FlaskConical, CloudRain,
  RotateCcw, CheckCircle, XCircle, Info, Image as ImageIcon,
  SlidersHorizontal, Thermometer
} from 'lucide-react';
import './SoilSuitabilityPage.css';
import { fetchCropRecommendation, detectSoil } from '../../api/apiClient';

type InputMode = 'manual' | 'upload';

interface SuitabilityResult {
  recommendedCrop: string;
  confidence: number;
  details: {
    n: string;
    p: string;
    k: string;
    temperature: string;
    humidity: string;
    ph: string;
    rainfall: string;
  };
}

const SoilSuitabilityPage = () => {
  const [mode, setMode] = useState<InputMode>('manual');

  // Upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual input state
  const [nitrogen, setNitrogen] = useState('');
  const [phosphorous, setPhosphorous] = useState('');
  const [potassium, setPotassium] = useState('');
  const [temperature, setTemperature] = useState('');
  const [humidity, setHumidity] = useState('');
  const [soilPh, setSoilPh] = useState('');
  const [rainfall, setRainfall] = useState('');

  // Result state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SuitabilityResult | null>(null);

  /* ---- File handling ---- */
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be under 10 MB.');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const canSubmit =
    mode === 'upload'
      ? !!imageFile
      : !!(nitrogen && phosphorous && potassium && temperature && humidity && soilPh && rainfall);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setResult(null);
    setLoading(true);

    try {
      if (mode === 'upload' && imageFile) {
        // 1. Get soil type from image
        const soilRes = await detectSoil({ soilImage: imageFile });
        const soilType = soilRes.soilType;

        if (!soilType || soilType === 'Not_Soil' || soilType === 'Unknown') {
          throw new Error('Could not identify a valid soil type from the image.');
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

        // 3. Fetch from dataset
        const data = await fetchCropRecommendation({
          n, p, k, temperature: temp, humidity: hum, ph, rainfall: rain
        });

        setResult({
          recommendedCrop: data.recommendedCrop,
          confidence: data.confidence,
          details: {
            n, p, k, temperature: temp + '°C', humidity: hum + '%', ph, rainfall: rain + 'mm'
          },
        });
        setLoading(false);
      } else {
        const data = await fetchCropRecommendation({
          n: nitrogen,
          p: phosphorous,
          k: potassium,
          temperature,
          humidity,
          ph: soilPh,
          rainfall
        });

        setResult({
          recommendedCrop: data.recommendedCrop,
          confidence: data.confidence,
          details: {
            n: nitrogen || '—',
            p: phosphorous || '—',
            k: potassium || '—',
            temperature: temperature ? `${temperature}°C` : '—',
            humidity: humidity ? `${humidity}%` : '—',
            ph: soilPh || '—',
            rainfall: rainfall ? `${rainfall}mm` : '—',
          },
        });
        setLoading(false);
      }
    } catch (error: any) {
      console.error('Error fetching crop recommendation:', error);
      setLoading(false);

      const errorMessage = error.response?.data?.error || error.message || 'An error occurred during analysis.';
      alert(errorMessage);
    }
  };

  const handleReset = () => {
    setNitrogen('');
    setPhosphorous('');
    setPotassium('');
    setTemperature('');
    setHumidity('');
    setSoilPh('');
    setRainfall('');
    removeImage();
    setResult(null);
  };

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className="soil-suitability-page">
      {/* ---- Header ---- */}
      <header className="soil-header">
        <div className="soil-header-icon">
          <Leaf size={30} color="#fff" />
        </div>
        <h1>Crop Recommendation</h1>
        <p>Determine the best crop to grow based on soil parameters</p>
      </header>

      {/* ---- Card ---- */}
      <div className="soil-card">
        {/* Toggle */}
        <div className="input-toggle">
          <button
            className={`toggle-btn ${mode === 'manual' ? 'active' : ''}`}
            onClick={() => { setMode('manual'); setResult(null); }}
            id="toggle-manual"
          >
            <SlidersHorizontal size={16} /> Manual Input
          </button>
          <button
            className={`toggle-btn ${mode === 'upload' ? 'active' : ''}`}
            onClick={() => { setMode('upload'); setResult(null); }}
            id="toggle-upload"
          >
            <ImageIcon size={16} /> Upload Image
          </button>
        </div>

        {/* ====== UPLOAD MODE ====== */}
        {mode === 'upload' && (
          <div
            className={`upload-zone ${dragging ? 'dragging' : ''} ${imagePreview ? 'has-preview' : ''}`}
            onClick={() => !imagePreview && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            id="upload-zone"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              hidden
              onChange={onFileInputChange}
            />

            {imagePreview ? (
              <div className="soil-preview-container">
                <img src={imagePreview} alt="Soil preview" className="soil-preview-img" />
                <button
                  className="preview-remove-btn"
                  onClick={(e) => { e.stopPropagation(); removeImage(); }}
                  title="Remove image"
                >
                  ✕
                </button>
              </div>
            ) : (
              <>
                <div className="upload-icon-wrapper">
                  <Upload size={26} />
                </div>
                <h3>
                  Drag & drop your soil image or{' '}
                  <span className="upload-browse">browse</span>
                </h3>
                <p className="upload-hint">JPG / PNG — max 10 MB</p>
              </>
            )}
          </div>
        )}

        {/* ====== MANUAL MODE ====== */}
        {mode === 'manual' && (
          <div className="manual-form">
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="nitrogen">
                  <span className="field-icon icon-texture"><Layers size={14} /></span>
                  Nitrogen (N)
                </label>
                <input
                  id="nitrogen"
                  type="number"
                  placeholder="e.g. 90"
                  value={nitrogen}
                  onChange={(e) => setNitrogen(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label htmlFor="phosphorous">
                  <span className="field-icon icon-texture"><Layers size={14} /></span>
                  Phosphorous (P)
                </label>
                <input
                  id="phosphorous"
                  type="number"
                  placeholder="e.g. 42"
                  value={phosphorous}
                  onChange={(e) => setPhosphorous(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="potassium">
                  <span className="field-icon icon-texture"><Layers size={14} /></span>
                  Potassium (K)
                </label>
                <input
                  id="potassium"
                  type="number"
                  placeholder="e.g. 43"
                  value={potassium}
                  onChange={(e) => setPotassium(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label htmlFor="soil-ph">
                  <span className="field-icon icon-ph"><FlaskConical size={14} /></span>
                  Soil pH
                </label>
                <input
                  id="soil-ph"
                  type="number"
                  step="0.1"
                  min="0"
                  max="14"
                  placeholder="e.g. 6.5"
                  value={soilPh}
                  onChange={(e) => setSoilPh(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="temperature">
                  <span className="field-icon icon-ph"><Thermometer size={14} /></span>
                  Temperature (°C)
                </label>
                <input
                  id="temperature"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 20.8"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label htmlFor="humidity">
                  <span className="field-icon icon-moisture"><Droplets size={14} /></span>
                  Humidity (%)
                </label>
                <input
                  id="humidity"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 82.0"
                  value={humidity}
                  onChange={(e) => setHumidity(e.target.value)}
                />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="rainfall">
                <span className="field-icon icon-water"><CloudRain size={14} /></span>
                Rainfall (mm)
              </label>
              <input
                id="rainfall"
                type="number"
                step="0.1"
                placeholder="e.g. 202.9"
                value={rainfall}
                onChange={(e) => setRainfall(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* ---- Actions ---- */}
        {!loading && !result && (
          <div className="soil-actions">
            <button
              className="btn-check"
              disabled={!canSubmit}
              onClick={handleSubmit}
              id="btn-check-suitability"
            >
              <CheckCircle size={20} />
              Check Suitability
            </button>
            <button className="btn-reset" onClick={handleReset} id="btn-reset">
              <RotateCcw size={16} /> Reset
            </button>
          </div>
        )}

        {/* ---- Loading ---- */}
        {loading && (
          <div className="soil-loading">
            <div className="soil-spinner" />
            <p>Analyzing soil parameters…</p>
          </div>
        )}

        {/* ---- Result ---- */}
        {result && (
          <div className="result-section">
            <div className="result-card suitable">
              <div className="result-emoji">
                🌱
              </div>
              <h2 className="result-title">
                Recommended Crop: {result.recommendedCrop}
              </h2>

              {/* Confidence */}
              <div className="confidence-section">
                <div className="confidence-label-row">
                  <span>Confidence</span>
                  <span className="confidence-value">{result.confidence}%</span>
                </div>
                <div className="confidence-track">
                  <div
                    className="confidence-bar"
                    style={{ width: `${result.confidence}%` }}
                  />
                </div>
              </div>

              {/* Details */}
              <div className="result-details">
                <div className="result-detail-item">
                  <span className="result-detail-label">Nitrogen (N)</span>
                  <span className="result-detail-value">{result.details.n}</span>
                </div>
                <div className="result-detail-item">
                  <span className="result-detail-label">Phosphorous (P)</span>
                  <span className="result-detail-value">{result.details.p}</span>
                </div>
                <div className="result-detail-item">
                  <span className="result-detail-label">Potassium (K)</span>
                  <span className="result-detail-value">{result.details.k}</span>
                </div>
                <div className="result-detail-item">
                  <span className="result-detail-label">pH Level</span>
                  <span className="result-detail-value">{result.details.ph}</span>
                </div>
                <div className="result-detail-item">
                  <span className="result-detail-label">Temperature</span>
                  <span className="result-detail-value">{result.details.temperature}</span>
                </div>
                <div className="result-detail-item">
                  <span className="result-detail-label">Humidity</span>
                  <span className="result-detail-value">{result.details.humidity}</span>
                </div>
                <div className="result-detail-item">
                  <span className="result-detail-label">Rainfall</span>
                  <span className="result-detail-value">{result.details.rainfall}</span>
                </div>
              </div>

              <button
                className="btn-new-check"
                onClick={handleReset}
                id="btn-new-check"
              >
                <RotateCcw size={16} /> Run New Check
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SoilSuitabilityPage;
