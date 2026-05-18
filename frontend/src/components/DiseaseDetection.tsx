import React, { useState } from 'react';
import { detectDisease } from '../api/apiClient';

export default function DiseaseDetection() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError('');
      setResult(null);
    }
  };

  const handleDetect = async () => {
    if (!selectedFile) {
      setError('Please select an image first');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await detectDisease(selectedFile);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Detection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Plant Disease Detection</h2>
      
      <div className="mb-4">
        <label className="block mb-2 text-sm font-medium text-gray-700">
          Upload Leaf Image
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {selectedFile && (
        <div className="mb-4">
          <p className="text-sm text-gray-600">Selected: {selectedFile.name}</p>
        </div>
      )}

      <button
        onClick={handleDetect}
        disabled={!selectedFile || loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {loading ? 'Detecting...' : 'Detect Disease'}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-green-50 rounded-lg">
          <h3 className="font-bold text-lg text-green-800">Detection Result</h3>
          <p className="mt-2"><strong>Disease:</strong> {result.disease}</p>
          <p className="mt-1"><strong>Confidence:</strong> {result.confidence}%</p>
          {result.explanation && (
            <p className="mt-2 text-sm text-gray-600">{result.explanation}</p>
          )}
          {result.recommendation && (
            <p className="mt-2 text-sm text-gray-600"><strong>Recommendation:</strong> {result.recommendation}</p>
          )}
        </div>
      )}
    </div>
  );
}
