/**
 * Update user locations so custody chain shows different locations for each actor
 */
const prisma = require('../src/db');

async function updateUserLocations() {
    console.log('Updating user locations...\n');

    const users = await prisma.user.findMany();

    // Assign locations based on role
    const roleLocations = {
        'FARMER': 'Bangalore, Karnataka',
        'PROCESSOR': 'Mysore, Karnataka',
        'DISTRIBUTOR': 'Chennai, Tamil Nadu',
        'RETAILER': 'Mumbai, Maharashtra'
    };

    for (const user of users) {
        const location = roleLocations[user.role] || 'India';
        await prisma.user.update({
            where: { id: user.id },
            data: { location }
        });
        console.log(`✓ ${user.name} (${user.role}) -> ${location}`);
    }

    console.log('\n========================================');
    console.log('User locations updated!');
    console.log('========================================\n');

    await prisma.$disconnect();
}

updateUserLocations().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
