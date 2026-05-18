# AgriTrace Frontend

React/TypeScript frontend for agricultural supply chain tracking.

## Prerequisites

- Node.js 18+
- Backend running at `http://localhost:5000`

## Setup

### 1. Clone the repo
```bash
git clone https://github.com/securedapp-github/farm_ui.git
cd farm_ui
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment (optional)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` to set the backend URL:
```env
VITE_API_URL=http://localhost:5000
```

### 4. Run the app
```bash
npm run dev
```

App runs at `http://localhost:5173`

## Features

- 🔐 User authentication (Farmer, Processor, Distributor, Retailer)
- 📦 Batch creation and management
- ✂️ Batch splitting with weight distribution
- 🤝 Handoff tracking between actors
- 📱 QR code generation for batch verification
- ✅ Public verification page with journey timeline
- 🔗 IPFS/Pinata blockchain verification

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login` | User login |
| `/register` | User registration |
| `/dashboard` | Main dashboard |
| `/verify?id=X` | Public batch verification |

## Build for Production

```bash
npm run build
```

Output in `dist/` folder.
