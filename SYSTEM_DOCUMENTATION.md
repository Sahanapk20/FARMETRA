# AgriTrace - How It Works

## What is AgriTrace?

AgriTrace is a supply chain tracking system for agricultural products. It allows consumers to scan a QR code on any product and see its complete journey from farm to store, with blockchain verification for authenticity.

---

## The Supply Chain Actors

| Role | What They Do |
|------|-------------|
| **Farmer** | Grows and harvests crops, creates the first batch record |
| **Processor** | Receives from farmer, processes/packages products |
| **Distributor** | Transports products from processor to retailers |
| **Retailer** | Sells products to consumers |
| **Consumer** | Scans QR code to verify product origin |

---

## How It Works - Step by Step

### 1. Farmer Creates a Batch

When a farmer harvests crops, they create a "batch" in the system with details like:
- Product name (e.g., "Organic Tomatoes")
- Weight (e.g., 100 kg)
- Farm name and location
- Harvest date
- Certifications (Organic, Non-GMO, etc.)

The system automatically:
- Generates a unique blockchain hash for the batch
- Uploads the data to IPFS (decentralized storage)
- Creates a QR code for tracking

---

### 2. Handoff to Processor

The farmer hands off the batch to a processor. The system records:
- Who handed it off
- Who received it
- When the transfer happened
- The location of transfer

This creates an unbreakable chain of custody.

---

### 3. Batch Splitting

The processor may split a large batch into smaller ones for distribution. For example:
- Original: 100 kg tomatoes
- Split into: 25 kg × 4 batches

Each split batch gets its own QR code but keeps a link to the parent batch.

---

### 4. Distribution Chain

The batches move through the supply chain:

```
Farmer → Processor → Distributor → Retailer
```

At each step, the system records:
- The actor's name and organization
- Their location
- The timestamp
- A blockchain hash for verification

---

### 5. Consumer Verification

When a consumer sees a product in a store:

1. They scan the QR code on the packaging
2. A verification page opens showing:
   - **Product Details**: Name, type, weight
   - **Origin**: Farm name and location
   - **Journey Timeline**: Every handoff from farm to store
   - **Blockchain Verification**: IPFS hash proving authenticity

---

## What Makes It Trustworthy?

### Blockchain Verification
Every batch and handoff is recorded with a cryptographic hash. This hash is stored on IPFS (InterPlanetary File System), making the data:
- **Immutable** - Cannot be changed after creation
- **Decentralized** - Not controlled by any single party
- **Verifiable** - Anyone can verify the data is authentic

### Complete Journey Tracking
The system shows every person who handled the product, when they received it, and where. Nothing is hidden.

### QR Code Access
Consumers don't need to create an account. Just scan and verify instantly.

---

## Example Journey

**Product**: Organic Basmati Rice (50 kg)

| Step | Actor | Location | Time |
|------|-------|----------|------|
| Created | Ramesh Farms | Punjab | Jan 15, 10:00 AM |
| Received | Punjab Agro Processing | Ludhiana | Jan 16, 2:00 PM |
| Received | North India Distributors | Delhi | Jan 18, 9:00 AM |
| Received | Fresh Mart Retail | Mumbai | Jan 20, 11:00 AM |

When a customer at Fresh Mart scans the rice package, they see this complete journey with blockchain verification.

---

## Benefits

| For Consumers | For Businesses |
|---------------|----------------|
| Know exactly where food comes from | Build trust with customers |
| Verify organic/quality claims | Track inventory movements |
| Make informed choices | Reduce fraud and counterfeiting |
| Trust food safety | Meet compliance requirements |

---

## Summary

AgriTrace creates transparency in the food supply chain by:

1. **Recording** every batch at the farm level
2. **Tracking** every handoff between actors
3. **Storing** data on blockchain for immutability
4. **Generating** QR codes for easy consumer access
5. **Displaying** complete journey with verification

The result: Consumers can trust what they eat, and businesses can prove their authenticity.

---

*AgriTrace - From Farm to Fork, Verified.*
