const mongoose = require('mongoose');
require('dotenv').config();

async function testDB() {
  try {
    console.log('Verbinde mit MongoDB...');
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/housnkuh';
    console.log('Verwende URI:', mongoURI);
    
    await mongoose.connect(mongoURI);
    console.log('Verbindung hergestellt!');
    
    // Teste, ob wir Daten schreiben können
    const TestSchema = new mongoose.Schema({
      name: String,
      timestamp: { type: Date, default: Date.now }
    });
    
    const Test = mongoose.model('Test', TestSchema);
    
    // Lösche vorherige Test-Einträge
    console.log('Lösche alte Test-Einträge...');
    await Test.deleteMany({});
    
    // Erstelle einen neuen Eintrag
    console.log('Erstelle neuen Testeintrag...');
    const testEntry = new Test({ name: 'Test ' + Date.now() });
    await testEntry.save();
    
    // Überprüfe, ob der Eintrag existiert
    const count = await Test.countDocuments();
    console.log(`Anzahl der Einträge in 'tests': ${count}`);
    
    // Zeige alle Einträge an
    const entries = await Test.find();
    console.log('Test-Einträge:', entries);
    
    await mongoose.connection.close();
    console.log('Verbindung geschlossen');
  } catch (error) {
    console.error('Fehler beim Testen der Datenbank:', error);
  }
}

testDB();