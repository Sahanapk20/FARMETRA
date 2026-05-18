/**
 * Reset database - clears all data
 */
const prisma = require('../src/db');

async function resetDatabase() {
    console.log('Clearing all database data...\n');

    try {
        // Delete in correct order due to foreign key constraints
        await prisma.event.deleteMany({});
        console.log('✓ Cleared events');

        await prisma.batchHandoff.deleteMany({});
        console.log('✓ Cleared handoffs');

        await prisma.qRCode.deleteMany({});
        console.log('✓ Cleared QR codes');

        // Clear child batch references first
        await prisma.batch.updateMany({
            data: { parentBatchId: null }
        });
        console.log('✓ Cleared parent-child relationships');

        await prisma.batch.deleteMany({});
        console.log('✓ Cleared batches');

        await prisma.user.deleteMany({});
        console.log('✓ Cleared users');

        console.log('\n========================================');
        console.log('Database reset complete!');
        console.log('========================================\n');
    } catch (err) {
        console.error('Error:', err.message);
    }

    await prisma.$disconnect();
}

resetDatabase();
