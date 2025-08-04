const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import the model
const VendorContest = require('../dist/models/VendorContest').default;

async function testAdminFunctions() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/housnkuh', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    // Get all entries
    const entries = await VendorContest.find().sort({ createdAt: -1 });
    console.log('\nAll entries:', entries.length);
    entries.forEach(entry => {
      console.log(`- ${entry.name} (${entry.email}) - ${entry.guessedVendors.length} guesses - Read: ${entry.isRead}`);
    });
    
    // Get statistics
    const totalEntries = await VendorContest.countDocuments();
    const unreadEntries = await VendorContest.countDocuments({ isRead: false });
    
    console.log('\nStatistics:');
    console.log('Total entries:', totalEntries);
    console.log('Unread entries:', unreadEntries);
    
    // Count vendor guesses
    const allContests = await VendorContest.find();
    const vendorGuessCount = {};
    
    allContests.forEach(contest => {
      contest.guessedVendors.forEach(vendor => {
        vendorGuessCount[vendor] = (vendorGuessCount[vendor] || 0) + 1;
      });
    });
    
    const topGuesses = Object.entries(vendorGuessCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([vendor, count]) => ({ vendor, count }));
    
    console.log('\nTop guessed vendors:');
    topGuesses.forEach((guess, index) => {
      console.log(`${index + 1}. ${guess.vendor}: ${guess.count} guesses`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testAdminFunctions();