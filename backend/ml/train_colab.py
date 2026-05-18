# ============================================================
# FARMETRA - Plant Disease Detection Model Training
# Google Colab Notebook (Run on FREE T4 GPU)
# ============================================================
# HOW TO USE:
# 1. Go to https://colab.research.google.com
# 2. Click "New Notebook"
# 3. Go to Runtime > Change runtime type > Select "T4 GPU"
# 4. Copy each cell below and paste it into Colab cells
# 5. Run them one by one (Shift+Enter)
# ============================================================


# ============================================================
# CELL 1: Mount Google Drive (your dataset lives here)
# ============================================================
from google.colab import drive
drive.mount('/content/drive')


# ============================================================
# CELL 2: Verify dataset path
# Run this to confirm your dataset is accessible.
# IMPORTANT: Upload your dataset folder to Google Drive first.
# Expected path: My Drive > plantvillage dataset > color
# (containing 38 subdirectories, one per disease class)
# ============================================================
import os

DATASET_PATH = '/content/drive/MyDrive/plantvillage dataset/color'
if os.path.exists(DATASET_PATH):
    classes = os.listdir(DATASET_PATH)
    print(f"✅ Dataset found! {len(classes)} classes detected.")
    print("Classes:", classes[:5], "...")
else:
    print("❌ Dataset NOT found at:", DATASET_PATH)
    print("Please upload your dataset to Google Drive and update the path above.")


# ============================================================
# CELL 3: Install required packages (already in Colab mostly)
# ============================================================
# torch and torchvision are pre-installed in Colab
# just verify GPU is available
import torch
print("PyTorch version:", torch.__version__)
print("CUDA available:", torch.cuda.is_available())
print("GPU:", torch.cuda.get_device_name(0) if torch.cuda.is_available() else "No GPU")


# ============================================================
# CELL 4: TRAINING SCRIPT - Run this cell to train the model
# ============================================================
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms, models
from torch.utils.data import random_split, DataLoader, Subset
import os

# --- Configuration ---
DATA_DIR = '/content/drive/MyDrive/plantvillage dataset/color'
MODEL_SAVE_PATH = '/content/disease_model.onnx'
CLASSES_SAVE_PATH = '/content/classes.txt'
NUM_CLASSES = 38
BATCH_SIZE = 64       # Larger batch = faster on GPU
EPOCHS = 10
LEARNING_RATE = 0.001

# --- Data transforms ---
data_transforms = {
    'train': transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(20),
        transforms.ColorJitter(brightness=0.2, contrast=0.2),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ]),
    'val': transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ]),
}

class TransformSubset(torch.utils.data.Dataset):
    def __init__(self, subset, transform):
        self.subset = subset
        self.transform = transform
    def __getitem__(self, index):
        x, y = self.subset[index]
        if self.transform:
            x = self.transform(x)
        return x, y
    def __len__(self):
        return len(self.subset)

# --- Load dataset ---
print("Loading data...")
base_transform = transforms.Compose([transforms.Resize((224, 224)), transforms.ToTensor()])
full_dataset = datasets.ImageFolder(DATA_DIR, transform=base_transform)
class_names = full_dataset.classes
print(f"Classes found: {len(class_names)}")

# Save classes.txt
with open(CLASSES_SAVE_PATH, 'w') as f:
    for cls in class_names:
        f.write(f"{cls}\n")
print(f"Saved {len(class_names)} classes to {CLASSES_SAVE_PATH}")

# Split 80/20 train/val
train_size = int(0.8 * len(full_dataset))
val_size = len(full_dataset) - train_size
train_subset, val_subset = random_split(full_dataset, [train_size, val_size])

train_dataset = TransformSubset(train_subset, data_transforms['train'])
val_dataset   = TransformSubset(val_subset,   data_transforms['val'])

train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True,  num_workers=2)
val_loader   = DataLoader(val_dataset,   batch_size=BATCH_SIZE, shuffle=False, num_workers=2)

print(f"Train: {len(train_dataset)} | Val: {len(val_dataset)}")

# --- Model setup ---
device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.IMAGENET1K_V1)
model.classifier[1] = nn.Linear(model.last_channel, NUM_CLASSES)
model = model.to(device)

criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE)
scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=3, gamma=0.5)

# --- Training loop ---
print("Starting training...")
best_val_acc = 0.0

for epoch in range(EPOCHS):
    # Train
    model.train()
    running_loss, correct, total = 0.0, 0, 0
    for inputs, labels in train_loader:
        inputs, labels = inputs.to(device), labels.to(device)
        optimizer.zero_grad()
        outputs = model(inputs)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()
        running_loss += loss.item()
        _, predicted = outputs.max(1)
        total += labels.size(0)
        correct += predicted.eq(labels).sum().item()

    train_acc = 100. * correct / total
    scheduler.step()

    # Validate
    model.eval()
    val_correct, val_total = 0, 0
    with torch.no_grad():
        for inputs, labels in val_loader:
            inputs, labels = inputs.to(device), labels.to(device)
            outputs = model(inputs)
            _, predicted = outputs.max(1)
            val_total += labels.size(0)
            val_correct += predicted.eq(labels).sum().item()

    val_acc = 100. * val_correct / val_total
    print(f"Epoch [{epoch+1}/{EPOCHS}] Loss: {running_loss/len(train_loader):.3f} | Train Acc: {train_acc:.1f}% | Val Acc: {val_acc:.1f}%")

    if val_acc > best_val_acc:
        best_val_acc = val_acc
        torch.save(model.state_dict(), '/content/best_model.pth')
        print(f"  -> New best model saved! (Val Acc: {val_acc:.1f}%)")

# Load best model for export
model.load_state_dict(torch.load('/content/best_model.pth'))
model.eval()

print("\nTraining complete! Exporting to ONNX...")
dummy_input = torch.randn(1, 3, 224, 224).to(device)
torch.onnx.export(
    model.cpu(),
    dummy_input.cpu(),
    MODEL_SAVE_PATH,
    export_params=True,
    opset_version=11,
    input_names=['input'],
    output_names=['output'],
    dynamic_axes={'input': {0: 'batch_size'}, 'output': {0: 'batch_size'}}
)
print(f"Model saved to: {MODEL_SAVE_PATH}")


# ============================================================
# CELL 5: Download the trained model files to your computer
# ============================================================
from google.colab import files

print("Downloading disease_model.onnx...")
files.download('/content/disease_model.onnx')

print("Downloading classes.txt...")
files.download('/content/classes.txt')

print("\n✅ DONE! Place both files in: backend/ml/ in your FARMETRA project.")
