const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/housnkuh');

// Import the updated Vertrag model
const Vertrag = require('./dist/models/Vertrag').default;

async function fixContractDates() {
  try {
    // Find the specific contract
    const contract = await Vertrag.findById('6852b5f997a4d68337d55cfa');
    
    if (!contract) {
      console.log('Contract not found');
      return;
    }
    
    console.log('Current contract data:');
    console.log('- scheduledStartDate:', contract.scheduledStartDate);
    console.log('- contractDuration:', contract.contractDuration);
    console.log('- istProbemonatBuchung:', contract.istProbemonatBuchung);
    console.log('- availabilityImpact.from:', contract.availabilityImpact?.from);
    console.log('- availabilityImpact.to:', contract.availabilityImpact?.to);
    
    // Trigger the pre-save hook by making a small change and saving
    contract.markModified('availabilityImpact');
    await contract.save();
    
    // Reload to see updated data
    const updatedContract = await Vertrag.findById('6852b5f997a4d68337d55cfa');
    
    console.log('\nUpdated contract data:');
    console.log('- availabilityImpact.from:', updatedContract.availabilityImpact?.from);
    console.log('- availabilityImpact.to:', updatedContract.availabilityImpact?.to);
    
    console.log('\nContract dates fixed successfully!');
    
  } catch (error) {
    console.error('Error fixing contract dates:', error);
  } finally {
    mongoose.disconnect();
  }
}

fixContractDates();