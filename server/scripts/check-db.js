// check-db.js
const mongoose = require('mongoose');

async function checkDb() {
  try {
    console.log('Verbinde mit MongoDB...');
    await mongoose.connect('mongodb://192.168.178.99:27017/housnkuh');
    console.log('Verbunden mit MongoDB!');

    // Collections auflisten
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\nVorhandene Collections:');
    if (collections.length === 0) {
      console.log('Keine Collections gefunden');
    } else {
      collections.forEach(c => console.log(` - ${c.name}`));
    }

    // Prüfen, ob bestimmte Daten vorhanden sind
    console.log('\nPrüfe vorhandene Dokumente:');
    
    // Direktvermarkter prüfen (in Users mit role vendorUser)
    const userCollection = mongoose.connection.db.collection('users');
    const vendorUsers = await userCollection.find({ 'role.vendorUser': true }).toArray();
    console.log(`Direktvermarkter (Vendor Users): ${vendorUsers.length}`);
    if (vendorUsers.length > 0) {
      console.log('Beispiel Direktvermarkter:', vendorUsers[0].name, vendorUsers[0].email);
    }
    
    // Kontaktanfragen (falls als separate Collection vorhanden)
    try {
      const contactCollection = mongoose.connection.db.collection('contacts');
      const contacts = await contactCollection.find({}).toArray();
      console.log(`Kontaktanfragen: ${contacts.length}`);
    } catch (err) {
      console.log('Keine Kontakt-Collection gefunden');
    }
    
    // Prüfe, ob temporäre Kontaktformular-Daten in einer anderen Collection gespeichert wurden
    const allCollections = collections.map(c => c.name);
    for (const collName of allCollections) {
      if (collName !== 'users') {
        const coll = mongoose.connection.db.collection(collName);
        const docs = await coll.find({}).toArray();
        console.log(`Collection ${collName}: ${docs.length} Dokumente`);
        
        // Prüfen, ob in dieser Collection Kontaktdaten sein könnten
        for (const doc of docs) {
          if (doc.email && doc.message) {
            console.log(`Mögliche Kontaktanfrage in ${collName}:`, {
              email: doc.email,
              message: doc.message.substring(0, 50) + '...'
            });
          }
        }
      }
    }

  } catch (error) {
    console.error('Fehler bei der Datenbankabfrage:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nVerbindung geschlossen');
  }
}

checkDb();