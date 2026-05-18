/**
 * Check child batches data
 */
const prisma = require('../src/db');

async function checkChildBatches() {
    const batches = await prisma.batch.findMany({
        where: { parentBatchId: { not: null } },
        select: {
            id: true,
            productName: true,
            weight: true,
            weightUnit: true,
            location: true,
            parentBatchId: true
        }
    });

    console.log('Child Batches:');
    for (const b of batches) {
        console.log(`  ID: ${b.id}, Weight: ${b.weight} ${b.weightUnit}, Location: "${b.location}", Parent: ${b.parentBatchId}`);
    }

    await prisma.$disconnect();
}

checkChildBatches();
