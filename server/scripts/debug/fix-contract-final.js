const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/housnkuh');

async function fixContractFinal() {
  try {
    const contractId = '6852b5f997a4d68337d55cfa';
    
    // Calculate correct end date: Start + 13 Monate (12 Monate bezahlt + 1 Monat Probemonat)
    const startDate = new Date('2025-09-01T12:47:28.000Z');
    const endDate = new Date(startDate);
    
    // Add 13 months total (1 trial month + 12 paid months)
    endDate.setMonth(endDate.getMonth() + 13);
    
    // Set to end of October 2026 (not beginning of November)
    endDate.setDate(endDate.getDate() - 1);
    
    console.log('Start date:', startDate);
    console.log('Calculated end date:', endDate);
    console.log('Should be end of October 2026 (31.10.2026)');
    
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
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

fixContractFinal();