const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Mietfach = require('../../dist/models/Mietfach').default;

async function checkMietfachTypes() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/housnkuh', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');

    const mietfaecher = await Mietfach.find({});
    console.log(`\nTotal Mietfächer: ${mietfaecher.length}\n`);

    // Group by type
    const typeGroups = {};
    mietfaecher.forEach(mf => {
      const typ = mf.typ || 'undefined';
      if (!typeGroups[typ]) {
        typeGroups[typ] = [];
      }
      typeGroups[typ].push({
        id: mf._id,
        bezeichnung: mf.bezeichnung,
        verfuegbar: mf.verfuegbar,
        zugewiesenAn: mf.zugewiesenAn
      });
    });

    console.log('Mietfach Types in Database:');
    console.log('===========================');
    
    for (const [typ, items] of Object.entries(typeGroups)) {
      console.log(`\nType: "${typ}" (${items.length} items)`);
      items.forEach(item => {
        console.log(`  - ${item.bezeichnung} (ID: ${item.id}, Verfügbar: ${item.verfuegbar}, Zugewiesen: ${item.zugewiesenAn ? 'Ja' : 'Nein'})`);
      });
    }

    // Check for specific types we're looking for
    console.log('\n\nChecking for specific types:');
    console.log('============================');
    const searchTypes = ['Kühlregal', 'Gefrierregal', 'Regal', 'kuehlregal', 'gefrierregal', 'regal'];
    
    for (const searchType of searchTypes) {
      const found = await Mietfach.find({ typ: searchType });
      console.log(`Type "${searchType}": ${found.length} found`);
      
      // Also try case-insensitive
      const foundCI = await Mietfach.find({ typ: new RegExp(`^${searchType}$`, 'i') });
      console.log(`Type "${searchType}" (case-insensitive): ${foundCI.length} found`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
  }
}

checkMietfachTypes();