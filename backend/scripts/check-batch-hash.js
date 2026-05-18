/**
 * Check specific batch by hash
 */
const prisma = require('../src/db');

async function checkBatch() {
    const batch = await prisma.batch.findFirst({
        where: {
            batchHash: { startsWith: 'bb867d653703d31b' }
        },
        include: {
            childBatches: true,
            parentBatch: true,
            handoffs: { include: { toUser: true, fromUser: true } }
        }
    });

    if (batch) {
        console.log('Batch found:');
        console.log(`  ID: ${batch.id}`);
        console.log(`  Hash: ${batch.batchHash}`);
        console.log(`  Weight: ${batch.weight} ${batch.weightUnit}`);
        console.log(`  Location: ${batch.location}`);
        console.log(`  Parent: ${batch.parentBatchId || 'none'}`);
        console.log(`  Child batches: ${batch.childBatches?.length || 0}`);
        console.log(`  Handoffs: ${batch.handoffs?.length || 0}`);

        if (batch.childBatches?.length > 0) {
            console.log('\n  Children:');
            batch.childBatches.forEach(c => {
                console.log(`    - ID: ${c.id}, Weight: ${c.weight} ${c.weightUnit}, Location: ${c.location}`);
            });
        }
    } else {
        console.log('Batch not found');
    }

    await prisma.$disconnect();
}

checkBatch();
