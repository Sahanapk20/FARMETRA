/**
 * Update batch and event locations for the supply chain demo
 * Run with: node scripts/update-locations.js
 */

const prisma = require('../src/db');

// Define locations for the supply chain journey
const locationUpdates = {
    // Batch ID -> New Location
    4: 'Bangalore, Karnataka',      // Parent batch - Farmer
    5: 'Mysore, Karnataka',         // Split - Processor  
    6: 'Chennai, Tamil Nadu',       // Handoff to Distributor
    7: 'Mumbai, Maharashtra',       // Handoff to Retailer
    8: 'Pune, Maharashtra',
    9: 'Hyderabad, Telangana',
    10: 'Kochi, Kerala'
};

async function updateLocations() {
    console.log('Updating batch and event locations...\n');

    for (const [batchId, location] of Object.entries(locationUpdates)) {
        try {
            // Update batch location
            await prisma.batch.update({
                where: { id: Number(batchId) },
                data: { location }
            });
            console.log(`✓ Batch ${batchId} -> ${location}`);

            // Update all events for this batch
            await prisma.event.updateMany({
                where: { batchId: Number(batchId) },
                data: { location }
            });
            console.log(`  ✓ Events for batch ${batchId} updated`);
        } catch (e) {
            console.log(`  ⊘ Batch ${batchId} not found or error: ${e.message}`);
        }
    }

    console.log('\n========================================');
    console.log('Locations updated! Refresh the verify page.');
    console.log('========================================\n');

    await prisma.$disconnect();
}

updateLocations().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
