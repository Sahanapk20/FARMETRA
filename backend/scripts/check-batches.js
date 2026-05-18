/**
 * Check batch locations
 */
const prisma = require('../src/db');

async function checkBatches() {
    const batches = await prisma.batch.findMany({
        select: {
            id: true,
            productName: true,
            location: true,
            parentBatchId: true
        }
    });

    console.log('Batch Locations:');
    for (const b of batches) {
        console.log(`  ID: ${b.id}, Location: "${b.location}", Parent: ${b.parentBatchId || 'none'}`);
    }

    await prisma.$disconnect();
}

checkBatches();
