from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import pickle
import numpy as np
import os

app = Flask(__name__)
CORS(app)

# Load model and encoder on startup
MODEL_PATH = 'models/crop_model.pkl'
ENCODER_PATH = 'models/label_encoder.pkl'

# Global variables to store model and label encoder
model = None
le = None

def load_ml_components():
    global model, le
    if os.path.exists(MODEL_PATH) and os.path.exists(ENCODER_PATH):
        try:
            with open(MODEL_PATH, 'rb') as f:
                model = pickle.load(f)
            with open(ENCODER_PATH, 'rb') as f:
                le = pickle.load(f)
            print("--- ML Model and Label Encoder loaded successfully ---")
        except Exception as e:
            print(f"Error loading model files: {e}")
    else:
        print("WARNING: Model files not found! Please run 'python train_model.py' first.")

# Root route - serves the prediction form UI
@app.route('/')
def index():
    return render_template('index.html')

# POST request to handle prediction
@app.route('/predict', methods=['POST'])
def predict():
    if model is None or le is None:
        return jsonify({'success': False, 'error': 'Machine Learning model is not loaded. Please contact the administrator.'}), 500
        
    try:
        # Get data from JSON request
        data = request.get_json()
        
        # Verify all fields are present
        required_fields = ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'error': f'Missing field: {field}'}), 400
        
        # Convert inputs to float and prepare for prediction
        # The model expects a 2D array: [[N, P, K, temp, hum, ph, rain]]
        features = [
            float(data['N']),
            float(data['P']),
            float(data['K']),
            float(data['temperature']),
            float(data['humidity']),
            float(data['ph']),
            float(data['rainfall'])
        ]
        
        input_data = np.array([features])
        
        # Predict numerical class
        prediction_idx = model.predict(input_data)
        
        # Inverse transform to get the actual crop name (e.g., 'rice')
        crop_name = le.inverse_transform(prediction_idx)[0]
        
        return jsonify({
            'success': True,
            'prediction': crop_name.capitalize(),
            'inputs': data
        })
        
    except ValueError as val_err:
        return jsonify({'success': False, 'error': f'Invalid input format: {str(val_err)}'}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    load_ml_components()
    print("\n-------------------------------------------")
    print(" CROP PREDICTION SERVER IS RUNNING")
    print(" URL: http://127.0.0.1:5005")
    print("-------------------------------------------\n")
    app.run(host='0.0.0.0', port=5005, debug=False) # Changed port to 5005
