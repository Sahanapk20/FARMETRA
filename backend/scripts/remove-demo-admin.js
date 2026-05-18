const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function removeDemoAdmin() {
    const result = await prisma.user.deleteMany({
        where: { email: 'admin@agritrace.com' }
    });
    console.log('Deleted demo admin:', result.count, 'user(s)');
    await prisma.$disconnect();
}

removeDemoAdmin().catch(console.error);
