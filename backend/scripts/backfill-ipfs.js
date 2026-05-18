/**
 * Migration script to backfill IPFS hashes for existing batches
 * Run with: node scripts/backfill-ipfs.js
 */

const prisma = require('../src/db');
const { uploadJSONToPinata } = require('../src/pinata');

async function backfillIPFS() {
    console.log('Starting IPFS backfill for existing batches...\n');

    // Get all batches without IPFS hash
    const batches = await prisma.batch.findMany({
        where: {
            ipfsHash: null
        },
        include: {
            user: true
        }
    });

    console.log(`Found ${batches.length} batches without IPFS hash\n`);

    let successCount = 0;
    let failCount = 0;

    for (const batch of batches) {
        try {
            // Build metadata for IPFS
            const meta = {
                batchId: batch.id,
                productName: batch.productName,
                productType: batch.productType,
                weight: batch.weight,
                weightUnit: batch.weightUnit,
                farmName: batch.farmName,
                location: batch.location,
                harvestDate: batch.harvestDate,
                description: batch.description,
                createdBy: batch.user?.name || 'Unknown',
                createdAt: batch.createdAt.toISOString(),
                batchHash: batch.batchHash
            };

            console.log(`Uploading batch ${batch.id} (${batch.productName})...`);

            // Upload to Pinata
            const result = await uploadJSONToPinata(meta);

            // Update database
            await prisma.batch.update({
                where: { id: batch.id },
                data: { ipfsHash: result.ipfsHash }
            });

            console.log(`  ✓ Success! IPFS Hash: ${result.ipfsHash}`);
            successCount++;
        } catch (err) {
            console.log(`  ✗ Failed: ${err.message}`);
            failCount++;
        }
    }

    console.log(`\n========================================`);
    console.log(`Backfill complete!`);
    console.log(`  Success: ${successCount}`);
    console.log(`  Failed: ${failCount}`);
    console.log(`========================================\n`);

    await prisma.$disconnect();
}

backfillIPFS().catch(err => {
    console.error('Backfill failed:', err);
    process.exit(1);
});
