import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms, models
import os

# --- 1. CONFIGURATION ---
DATA_DIR = './soil_dataset' # Path to your soil dataset (e.g. ./soil_dataset/train, ./soil_dataset/val)
MODEL_SAVE_PATH = 'soil_model.onnx'
BATCH_SIZE = 32
EPOCHS = 10
LEARNING_RATE = 0.001

# --- 2. DATA AUGMENTATION & LOADING ---
data_transforms = {
    'train': transforms.Compose([
        transforms.RandomResizedCrop(224),
        transforms.RandomHorizontalFlip(),
        transforms.RandomVerticalFlip(),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ]),
    'val': transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ]),
}

def train_soil_model():
    print("Loading soil dataset...")
    try:
        image_datasets = {x: datasets.ImageFolder(os.path.join(DATA_DIR, x), data_transforms[x]) for x in ['train', 'val']}
        dataloaders = {x: torch.utils.data.DataLoader(image_datasets[x], batch_size=BATCH_SIZE, shuffle=True, num_workers=4) for x in ['train', 'val']}
        class_names = image_datasets['train'].classes
        print(f"Classes found: {len(class_names)} ({class_names})")
        
        # Save class names for Node.js backend
        with open('soil_classes.txt', 'w') as f:
            for cls in class_names:
                f.write(f"{cls}\n")
    except Exception as e:
        print(f"Error loading dataset: {e}")
        print("Please ensure your dataset is located at './soil_dataset' with 'train' and 'val' subfolders.")
        print("Subfolders inside 'train' and 'val' should be named: Sandy, Clay, Loamy, Silty, Peaty, Not_Soil")
        return

    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    # --- 3. MODEL SETUP (MobileNetV2 Transfer Learning) ---
    print("Initializing MobileNetV2...")
    model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.DEFAULT)
    
    # Freeze base layers
    for param in model.parameters():
        param.requires_grad = False

    # Replace classifier head to match number of soil classes
    num_ftrs = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(num_ftrs, len(class_names))
    model = model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.classifier.parameters(), lr=LEARNING_RATE)

    # --- 4. TRAINING LOOP ---
    print("Starting training...")
    for epoch in range(EPOCHS):
        print(f'Epoch {epoch+1}/{EPOCHS}')
        print('-' * 10)

        for phase in ['train', 'val']:
            if phase == 'train':
                model.train()
            else:
                model.eval()

            running_loss = 0.0
            running_corrects = 0

            for inputs, labels in dataloaders[phase]:
                inputs = inputs.to(device)
                labels = labels.to(device)

                optimizer.zero_grad()

                with torch.set_grad_enabled(phase == 'train'):
                    outputs = model(inputs)
                    _, preds = torch.max(outputs, 1)
                    loss = criterion(outputs, labels)

                    if phase == 'train':
                        loss.backward()
                        optimizer.step()

                running_loss += loss.item() * inputs.size(0)
                running_corrects += torch.sum(preds == labels.data)

            epoch_loss = running_loss / len(image_datasets[phase])
            epoch_acc = running_corrects.double() / len(image_datasets[phase])

            print(f'{phase.capitalize()} Loss: {epoch_loss:.4f} Acc: {epoch_acc:.4f}')

    # --- 5. EXPORT TO ONNX ---
    print("Training complete. Exporting to ONNX...")
    model.eval()
    dummy_input = torch.randn(1, 3, 224, 224).to(device)
    
    torch.onnx.export(
        model, 
        dummy_input, 
        MODEL_SAVE_PATH, 
        export_params=True, 
        opset_version=11, 
        do_constant_folding=True, 
        input_names=['input'], 
        output_names=['output'], 
        dynamic_axes={'input': {0: 'batch_size'}, 'output': {0: 'batch_size'}}
    )
    
    print(f"Model successfully saved to {MODEL_SAVE_PATH}")
    print("You can now use 'soil_model.onnx' and 'soil_classes.txt' in your Node.js backend!")

if __name__ == '__main__':
    train_soil_model()
