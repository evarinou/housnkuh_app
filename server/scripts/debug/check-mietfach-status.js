const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/housnkuh');

async function checkMietfachStatus() {
  try {
    const contractId = '6852b5f997a4d68337d55cfa';
    
    // Find the contract
    const contract = await mongoose.connection.collection('vertrags').findOne(
      { _id: new mongoose.Types.ObjectId(contractId) }
    );
    
    if (!contract) {
      console.log('Contract not found');
      return;
    }
    
    console.log('Contract details:');
    console.log('- ID:', contract._id);
    console.log('- availabilityImpact.from:', contract.availabilityImpact.from);
    console.log('- availabilityImpact.to:', contract.availabilityImpact.to);
    console.log('- services:', contract.services.length);
    
    // Check each service/mietfach
    for (const service of contract.services) {
      console.log('\nService details:');
      console.log('- mietfach ID:', service.mietfach);
      console.log('- mietbeginn:', service.mietbeginn);
      console.log('- mietende:', service.mietende);
      
      // Find the mietfach
      const mietfach = await mongoose.connection.collection('mietfaches').findOne(
        { _id: service.mietfach }
      );
      
      if (mietfach) {
        console.log('- Mietfach bezeichnung:', mietfach.bezeichnung);
        console.log('- verfuegbar:', mietfach.verfuegbar);
        console.log('- aktuellerVertrag:', mietfach.aktuellerVertrag);
      }
    }
    
    // Test availability for different dates
    console.log('\nAvailability check:');
    
    const testDates = [
      new Date('2026-09-30T12:00:00.000Z'), // End of September 2026
      new Date('2026-10-31T12:00:00.000Z'), // End of October 2026  
      new Date('2026-11-01T12:00:00.000Z')  // Start of November 2026
    ];
    
    for (const testDate of testDates) {
      const overlapping = await mongoose.connection.collection('vertrags').find({
        'services.mietfach': contract.services[0].mietfach,
        status: { $in: ['active', 'scheduled', 'pending'] },
        'availabilityImpact.from': { $lte: testDate },
        'availabilityImpact.to': { $gt: testDate }
      }).toArray();
      
      console.log(`- ${testDate.toISOString()}: ${overlapping.length > 0 ? 'BELEGT' : 'VERFÜGBAR'}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

checkMietfachStatus();