import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms, models
import os

# --- 1. CONFIGURATION ---
DATA_DIR = './dataset/disease/plantvillage dataset/color' # Path to your PlantVillage dataset
MODEL_SAVE_PATH = 'disease_model.onnx'
NUM_CLASSES = 38 # Depends on your specific dataset
BATCH_SIZE = 32
EPOCHS = 10
LEARNING_RATE = 0.001

# --- 2. DATA AUGMENTATION & LOADING ---
data_transforms = {
    'train': transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(20),
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
    def __init__(self, subset, transform=None):
        self.subset = subset
        self.transform = transform
        
    def __getitem__(self, index):
        x, y = self.subset[index]
        if self.transform:
            x = self.transform(x)
        return x, y
        
    def __len__(self):
        return len(self.subset)

def train_model():
    print("Loading data...")
    try:
        full_dataset = datasets.ImageFolder(DATA_DIR)
        class_names = full_dataset.classes
        print(f"Classes found: {len(class_names)}")
        
        # Split dataset
        train_size = int(0.8 * len(full_dataset))
        val_size = len(full_dataset) - train_size
        train_subset, val_subset = torch.utils.data.random_split(full_dataset, [train_size, val_size])
        
        # Apply transforms
        image_datasets = {
            'train': TransformSubset(train_subset, data_transforms['train']),
            'val': TransformSubset(val_subset, data_transforms['val'])
        }
        
        dataloaders = {
            'train': torch.utils.data.DataLoader(image_datasets['train'], batch_size=BATCH_SIZE, shuffle=True, num_workers=0),
            'val': torch.utils.data.DataLoader(image_datasets['val'], batch_size=BATCH_SIZE, shuffle=False, num_workers=0)
        }
        
        # Save class names for Node.js backend
        with open('classes.txt', 'w') as f:
            for cls in class_names:
                f.write(f"{cls}\n")
    except Exception as e:
        print(f"Error loading dataset: {e}")
        print(f"Please ensure your dataset is located at '{DATA_DIR}'.")
        return

    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    # --- 3. MODEL SETUP (MobileNetV2 Transfer Learning) ---
    print("Initializing MobileNetV2...")
    model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.DEFAULT)
    
    # Freeze base layers
    for param in model.parameters():
        param.requires_grad = False

    # Replace classifier head
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
            batch_count = 0

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
                batch_count += 1
                
                # Print progress every 50 batches
                if batch_count % 50 == 0:
                    print(f'  {phase.capitalize()} - Batch {batch_count}/{len(dataloaders[phase])}')

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
    print("You can now move 'plant_disease_model.onnx' and 'classes.txt' to your Node.js backend!")

if __name__ == '__main__':
    train_model()
