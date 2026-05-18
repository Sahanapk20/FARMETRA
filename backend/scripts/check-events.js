/**
 * Check event locations
 */
const prisma = require('../src/db');

async function checkEvents() {
    const events = await prisma.event.findMany({
        select: {
            id: true,
            batchId: true,
            eventType: true,
            location: true,
            timestamp: true
        },
        orderBy: { id: 'asc' }
    });

    console.log('Event Locations:');
    for (const e of events) {
        console.log(`  ID: ${e.id}, Batch: ${e.batchId}, Type: ${e.eventType}, Location: "${e.location}", Time: ${e.timestamp}`);
    }

    await prisma.$disconnect();
}

checkEvents();
