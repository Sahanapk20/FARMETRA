import pickle
import numpy as np
import os

# Load the saved model and label encoder
model_path = 'models/crop_model.pkl'
encoder_path = 'models/label_encoder.pkl'

if not os.path.exists(model_path) or not os.path.exists(encoder_path):
    print("Error: Model files not found. Please run train_model.py first.")
    exit()

with open(model_path, 'rb') as f:
    model = pickle.load(f)

with open(encoder_path, 'rb') as f:
    le = pickle.load(f)

# Sample test data: 
# Features order: N, P, K, temperature, humidity, ph, rainfall
# We will use values from the first row of Crop_recommendation.csv (Rice)
# 90,42,43,20.87974371,82.00274423,6.502985292000001,202.9355362
test_input = np.array([[90, 42, 43, 20.8, 82, 6.5, 202]])

print(f"Testing with input: {test_input}")

# Get numerical prediction
prediction = model.predict(test_input)

# Convert number back to crop name
crop_name = le.inverse_transform(prediction)

print(f"--- PREDICTION RESULT ---")
print(f"Predicted Crop: {crop_name[0].upper()}")
print(f"-------------------------")
