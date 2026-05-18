/**
 * Check specific batch and its events
 */
const prisma = require('../src/db');

async function checkBatch5() {
    const batch = await prisma.batch.findUnique({
        where: { id: 5 },
        include: {
            events: true,
            handoffs: {
                include: { fromUser: true, toUser: true }
            },
            parentBatch: true
        }
    });

    console.log('=== Batch 5 ===');
    console.log('Location:', batch?.location);
    console.log('Parent ID:', batch?.parentBatchId);
    console.log('');

    console.log('=== Events for Batch 5 ===');
    for (const e of (batch?.events || [])) {
        console.log(`  ID: ${e.id}, Type: ${e.eventType}, Location: "${e.location}", Time: ${e.timestamp}`);
    }

    console.log('');
    console.log('=== Handoffs for Batch 5 ===');
    for (const h of (batch?.handoffs || [])) {
        console.log(`  From: ${h.fromUser?.name} -> To: ${h.toUser?.name}, Type: ${h.handoffType}`);
    }

    await prisma.$disconnect();
}

checkBatch5();
