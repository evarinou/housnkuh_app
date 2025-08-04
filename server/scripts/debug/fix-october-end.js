const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/housnkuh');

async function fixOctoberEnd() {
  try {
    const contractId = '6852b5f997a4d68337d55cfa';
    
    // End of October 2026 (same time as start but in October 2026)
    const endDate = new Date('2026-10-31T12:47:28.000Z');
    
    console.log('Setting end date to:', endDate);
    
    // Update the contract
    const result = await mongoose.connection.collection('vertrags').updateOne(
      { _id: new mongoose.Types.ObjectId(contractId) },
      {
        $set: {
          'availabilityImpact.to': endDate
        }
      }
    );
    
    console.log('Update result:', result);
    
    // Verify the update
    const contract = await mongoose.connection.collection('vertrags').findOne(
      { _id: new mongoose.Types.ObjectId(contractId) }
    );
    
    console.log('Updated contract:');
    console.log('- availabilityImpact.from:', contract.availabilityImpact.from);
    console.log('- availabilityImpact.to:', contract.availabilityImpact.to);
    
    console.log('\nContract timeline:');
    console.log('Sep 2025: Trial month (free)');
    console.log('Oct 2025 - Oct 2026: Paid months (12 months à 31.50€)');
    console.log('Nov 2026: Contract ends, Mietfach becomes available');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

fixOctoberEnd();