const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import the model
const VendorContest = require('../dist/models/VendorContest').default;

async function createTestEntry() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/housnkuh', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    // Create a test entry
    const testEntry = new VendorContest({
      name: 'Test Teilnehmer',
      email: 'test@example.com',
      phone: '0123456789',
      guessedVendors: ['Bäckerei Müller', 'Hofladen Schmidt', 'Metzgerei Weber'],
      isRead: false
    });
    
    const saved = await testEntry.save();
    console.log('Test entry created:', saved);
    
    // Count entries
    const count = await VendorContest.countDocuments();
    console.log('Total entries in collection:', count);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createTestEntry();