const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function fixVendorContest() {
  try {
    console.log('🔧 Fixing Vendor Contest Setup\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/housnkuh');
    console.log('✅ Connected to MongoDB');
    
    // Check if vendorcontests collection exists
    const collections = await mongoose.connection.db.listCollections().toArray();
    const vendorContestExists = collections.some(col => col.name === 'vendorcontests');
    
    if (!vendorContestExists) {
      console.log('⚠️  VendorContest collection does not exist, creating...');
      await mongoose.connection.db.createCollection('vendorcontests');
      console.log('✅ VendorContest collection created');
    } else {
      console.log('✅ VendorContest collection exists');
    }
    
    // Check indexes
    const VendorContest = require('../dist/models/VendorContest').default;
    await VendorContest.createIndexes();
    console.log('✅ Indexes created/updated');
    
    // Get count
    const count = await VendorContest.countDocuments();
    console.log(`\n📊 Current entries: ${count}`);
    
    console.log('\n✅ Vendor Contest setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixVendorContest();