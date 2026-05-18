# AgriTrace Backend

Node.js/Express backend for agricultural supply chain tracking with blockchain verification.

## Prerequisites

- Node.js 18+
- MySQL database
- Pinata account (for IPFS)

## Setup

### 1. Clone the repo
```bash
git clone https://github.com/securedapp-github/farm_be.git
cd farm_be
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
Create `.env` file:
```env
DATABASE_URL="mysql://user:password@localhost:3306/agritrace"
JWT_SECRET="your-secret-key"
PINATA_JWT="your-pinata-jwt-token"
PORT=5000
BASE_URL="http://localhost:5173"
```

### 4. Setup database
```bash
npx prisma db push
npx prisma generate
```

### 5. Run the server
```bash
npm run dev
```

Server runs at `http://localhost:5000`

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/register` | POST | Register user |
| `/auth/login` | POST | Login user |
| `/batch` | POST | Create batch |
| `/batch/:id/split` | POST | Split batch |
| `/handoff` | POST | Handoff batch |
| `/verify/:id` | GET | Verify batch |

## Scripts

```bash
npm run dev          # Start dev server
node scripts/reset-db.js    # Reset database
```
