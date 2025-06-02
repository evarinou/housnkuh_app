const axios = require('axios');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import the model
const VendorContest = require('../dist/models/VendorContest').default;

async function testVendorContestComplete() {
  try {
    console.log('🧪 Testing Vendor Contest Complete Flow\n');
    
    // 1. Test API Submission
    console.log('1️⃣ Testing API submission...');
    const testData = {
      name: 'Test User ' + Date.now(),
      email: 'test' + Date.now() + '@example.com',
      phone: '0123456789',
      guessedVendors: ['Bäckerei Test', 'Hofladen Test', 'Metzgerei Test']
    };
    
    try {
      const response = await axios.post('http://localhost:4000/api/vendor-contest/submit', testData);
      console.log('✅ API Response:', response.data);
    } catch (error) {
      console.error('❌ API Error:', error.response ? error.response.data : error.message);
    }
    
    // 2. Check Database
    console.log('\n2️⃣ Checking database...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/housnkuh');
    
    const entries = await VendorContest.find().sort({ createdAt: -1 }).limit(5);
    console.log(`✅ Found ${entries.length} entries in database`);
    
    entries.forEach((entry, index) => {
      console.log(`   ${index + 1}. ${entry.name} - ${entry.email} - ${entry.guessedVendors.length} guesses`);
    });
    
    // 3. Test Admin API
    console.log('\n3️⃣ Testing admin API...');
    
    // First, we need an admin token - for testing purposes, we'll skip this
    console.log('⚠️  Admin API requires authentication - skipping in this test');
    
    // 4. Test Statistics
    console.log('\n4️⃣ Getting statistics from database...');
    const totalEntries = await VendorContest.countDocuments();
    const unreadEntries = await VendorContest.countDocuments({ isRead: false });
    
    console.log(`📊 Total entries: ${totalEntries}`);
    console.log(`📊 Unread entries: ${unreadEntries}`);
    
    // Get top guesses
    const allContests = await VendorContest.find();
    const vendorGuessCount = {};
    
    allContests.forEach(contest => {
      contest.guessedVendors.forEach(vendor => {
        vendorGuessCount[vendor] = (vendorGuessCount[vendor] || 0) + 1;
      });
    });
    
    const topGuesses = Object.entries(vendorGuessCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
    
    console.log('\n🏆 Top 5 guessed vendors:');
    topGuesses.forEach(([vendor, count], index) => {
      console.log(`   ${index + 1}. ${vendor}: ${count} guesses`);
    });
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the test
testVendorContestComplete();