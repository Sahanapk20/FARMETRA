require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('../src/config/db');
const { User } = require('../src/models');

async function createAdmin() {
    await connectDB();
    
    const hash = await bcrypt.hash('admin123', 10);
    
    const existingAdmin = await User.findOne({ email: 'admin@agritrace.com' });
    if (existingAdmin) {
        existingAdmin.role = 'ADMIN';
        existingAdmin.password = hash;
        await existingAdmin.save();
    } else {
        await User.create({
            name: 'Admin',
            email: 'admin@agritrace.com',
            password: hash,
            role: 'ADMIN',
            organization: 'AgriTrace'
        });
    }
    
    console.log('Admin user created!');
    console.log('Email: admin@agritrace.com');
    console.log('Password: admin123');
    process.exit(0);
}

createAdmin().catch((err) => {
    console.error(err);
    process.exit(1);
});
