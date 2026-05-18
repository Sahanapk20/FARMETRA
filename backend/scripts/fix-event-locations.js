/**
 * Fix event locations using batch locations (not user locations)
 * Run with: node scripts/fix-event-locations.js
 * 
 * This uses:
 * - For split events: the child batch's location (which is the split destination)
 * - For handoff events: the batch's current location
 * - For other events: the batch's location
 */

const prisma = require('../src/db');

async function fixEventLocations() {
    console.log('Fixing event locations using batch locations...\n');

    // Get all events with their batch
    const events = await prisma.event.findMany({
        include: {
            batch: true
        }
    });

    let updated = 0;
    let skipped = 0;

    for (const event of events) {
        if (event.batch?.location) {
            // Use the batch's location for the event
            await prisma.event.update({
                where: { id: event.id },
                data: { location: event.batch.location }
            });
            console.log(`✓ Event ${event.id}: "${event.eventType}" -> ${event.batch.location}`);
            updated++;
        } else {
            console.log(`⊘ Event ${event.id}: "${event.eventType}" - No batch location found`);
            skipped++;
        }
    }

    console.log('\n========================================');
    console.log(`Updated: ${updated}, Skipped: ${skipped}`);
    console.log('========================================\n');

    await prisma.$disconnect();
}

fixEventLocations().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
