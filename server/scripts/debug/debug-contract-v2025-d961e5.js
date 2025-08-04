const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/housnkuh');

// Define schemas (simplified for search)
const VertragSchema = new mongoose.Schema({}, { collection: 'vertrags', strict: false });
const UserSchema = new mongoose.Schema({}, { collection: 'users', strict: false });
const MietfachSchema = new mongoose.Schema({}, { collection: 'mietfaches', strict: false });

const Vertrag = mongoose.model('Vertrag', VertragSchema);
const User = mongoose.model('User', UserSchema);
const Mietfach = mongoose.model('Mietfach', MietfachSchema);

async function findContract() {
  try {
    console.log('Searching for contract V2025-d961e5...\n');
    
    // Search for user by email first
    console.log('Searching by user email...');
      
    // Search for user by email (corrected email address)
    const user = await User.findOne({ 'kontakt.email': 'wogeri1576@fenexy.com' });
    
    
    if (user) {
        console.log('Found user:', {
          id: user._id,
          email: user.kontakt.email,
          name: user.kontakt.name,
          isVendor: user.isVendor,
          registrationStatus: user.registrationStatus
        });
        
        // Find contracts for this user
        const contracts = await Vertrag.find({ user: user._id });
        console.log(`\nFound ${contracts.length} contracts for this user:`);
        
        contracts.forEach((contract, index) => {
          console.log(`\n--- Contract ${index + 1} ---`);
          console.log('ID:', contract._id);
          console.log('Status:', contract.status);
          console.log('Total Monthly Price:', contract.totalMonthlyPrice);
          console.log('Contract Duration:', contract.contractDuration);
          console.log('Discount:', contract.discount);
          console.log('Scheduled Start Date:', contract.scheduledStartDate);
          console.log('Is Trial:', contract.istProbemonatBuchung);
          console.log('Services:', contract.services);
          console.log('Package Configuration:', contract.packageConfiguration);
          console.log('Zusatzleistungen:', contract.zusatzleistungen);
          console.log('Gesamtpreis (calculated):', contract.totalMonthlyPrice * contract.contractDuration);
          
          if (contract.discount > 0) {
            console.log('Discounted Price:', contract.totalMonthlyPrice * contract.contractDuration * (1 - contract.discount));
          }
          
          // Check if this matches the expected contract
          if (contract._id.toString().includes('d961e5')) {
            console.log('*** THIS IS THE CONTRACT FROM THE SCREENSHOT ***');
          }
        });
    } else {
      console.log('User not found');
    }
    
    // Also search for Mietfach named "Tisch 3"
    console.log('\n--- Searching for Mietfach "Tisch 3" ---');
    const mietfach = await Mietfach.findOne({ 
      $or: [
        { name: /Tisch 3/i },
        { bezeichnung: /Tisch 3/i }
      ]
    });
    
    if (mietfach) {
      console.log('Found Mietfach:', {
        id: mietfach._id,
        name: mietfach.name || mietfach.bezeichnung,
        preis: mietfach.preis,
        typ: mietfach.typ
      });
    } else {
      console.log('Mietfach "Tisch 3" not found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

findContract();