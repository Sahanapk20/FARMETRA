const mongoose = require('mongoose');
const Product = require('./src/models/Product');

async function checkAndFixProducts() {
  try {
    await mongoose.connect('mongodb://localhost:27017/farmetra');
    console.log('Connected to MongoDB');
    
    // Find all products
    const products = await Product.find({});
    console.log('All products in database:');
    products.forEach(p => {
      console.log(`ID: ${p._id}, Name: ${p.name}, Category: ${p.category}, Price: ${p.price}`);
    });
    
    // Look for any product with 'meat' in the name
    const meatProducts = await Product.find({ name: { $regex: /meat/i } });
    console.log('\nProducts with meat in name:');
    if (meatProducts.length === 0) {
      console.log('No products found with meat in name');
    } else {
      for (const p of meatProducts) {
        console.log(`ID: ${p._id}, Name: ${p.name}`);
        
        // Update the product name from organic meat to mango
        console.log('Updating product name to Mango...');
        p.name = 'Mango';
        p.description = 'Fresh, sweet mangoes from local farms';
        p.category = 'Fruits';
        await p.save();
        console.log('Product updated successfully');
      }
    }
    
    // Look for mango products to confirm
    const mangoProducts = await Product.find({ name: { $regex: /mango/i } });
    console.log('\nMango products after update:');
    mangoProducts.forEach(p => {
      console.log(`ID: ${p._id}, Name: ${p.name}, Category: ${p.category}`);
    });
    
    console.log('\nProduct check and fix completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAndFixProducts();
