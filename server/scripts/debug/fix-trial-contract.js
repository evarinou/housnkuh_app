const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/housnkuh');

async function fixTrialContract() {
  try {
    const contractId = '6852b5f997a4d68337d55cfa';
    
    // Calculate correct end date
    const startDate = new Date('2025-09-01T12:47:28.000Z');
    const endDate = new Date(startDate);
    
    // Add 12 months (contract duration)
    endDate.setMonth(endDate.getMonth() + 12);
    
    // Add 30 days for trial period  
    endDate.setDate(endDate.getDate() + 30);
    
    console.log('Start date:', startDate);
    console.log('Calculated end date:', endDate);
    console.log('Should be 2026-10-01T12:47:28.000Z');
    
    // Update the contract directly in MongoDB
    const result = await mongoose.connection.collection('vertrags').updateOne(
      { _id: new mongoose.Types.ObjectId(contractId) },
      {
        $set: {
          istProbemonatBuchung: true,
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
    console.log('- istProbemonatBuchung:', contract.istProbemonatBuchung);
    console.log('- availabilityImpact.to:', contract.availabilityImpact.to);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

fixTrialContract();