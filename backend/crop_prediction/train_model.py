import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import pickle
import os

# 1. Load Dataset
# Adjust path to point to the CSV file in the backend root
dataset_path = '../Crop_recommendation.csv'

if not os.path.exists(dataset_path):
    print(f"Error: Dataset not found at {dataset_path}")
    exit()

print("Loading dataset...")
df = pd.read_csv(dataset_path)

# 2. Features and Target
X = df.drop('label', axis=1)
y = df['label']

# 3. Encoding labels (converting crop names to numbers)
le = LabelEncoder()
y_encoded = le.fit_transform(y)

# 4. Split data into training (80%) and testing (20%) sets
X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2, random_state=42)

# 5. Train Model (Random Forest is excellent for this type of tabular data)
print("Training model...")
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# 6. Evaluate
accuracy = model.score(X_test, y_test)
print(f"Model Accuracy: {accuracy * 100:.2f}%")

# 7. Save Model and Encoder using pickle
os.makedirs('models', exist_ok=True)

with open('models/crop_model.pkl', 'wb') as f:
    pickle.dump(model, f)

with open('models/label_encoder.pkl', 'wb') as f:
    pickle.dump(le, f)

print("Success: Model and Encoder saved to 'models/' directory.")
