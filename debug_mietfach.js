const mongoose = require('mongoose');
require('dotenv').config();

async function checkMietfach() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/housnkuh');
    const Mietfach = require('./src/models/Mietfach').default;
    
    const allMietfach = await Mietfach.find({}).select('bezeichnung typ preis verfuegbar');
    console.log('Total Mietfach found:', allMietfach.length);
    
    allMietfach.forEach(m => {
      console.log({
        id: m._id.toString(),
        bezeichnung: m.bezeichnung,
        typ: m.typ,
        preis: m.preis,
        verfuegbar: m.verfuegbar,
        hasPrice: m.preis !== undefined && m.preis !== null
      });
    });
    
    const withoutPrice = allMietfach.filter(m => m.preis === undefined || m.preis === null);
    console.log('\nMietfach without price:', withoutPrice.length);
    withoutPrice.forEach(m => console.log(' -', m.bezeichnung, m.typ));
    
    const sonstigeType = allMietfach.filter(m => m.typ === 'sonstiges');
    console.log('\nSonstige Flaeche entries:', sonstigeType.length);
    sonstigeType.forEach(m => console.log(' -', m.bezeichnung, 'price:', m.preis));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkMietfach();