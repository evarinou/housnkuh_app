const mongoose = require('mongoose');

async function addFutureContracts() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/housnkuh');
    console.log('✅ Verbindung zur Datenbank hergestellt');
    
    const User = require('../dist/models/User.js').default;
    const Mietfach = require('../dist/models/Mietfach.js').default;
    const Vertrag = require('../dist/models/Vertrag.js').default;
    
    console.log('🔮 Erstelle zukünftige Verträge für Projektionen...');
    
    // Hole verfügbare Mietfächer und Benutzer
    const availableMietfaecher = await Mietfach.find({ verfuegbar: true });
    const vendors = await User.find({ isVendor: true, registrationStatus: 'active' }).limit(10);
    
    console.log(`Verfügbare Mietfächer: ${availableMietfaecher.length}`);
    console.log(`Aktive Vendors: ${vendors.length}`);
    
    if (availableMietfaecher.length === 0 || vendors.length === 0) {
      console.log('⚠️ Nicht genügend verfügbare Mietfächer oder Vendors für zukünftige Verträge');
      return;
    }
    
    const futureContracts = [];
    const preise = [120, 180, 250];
    
    // Erstelle 8 zukünftige Verträge über die nächsten 6 Monate verteilt
    for (let i = 0; i < Math.min(8, availableMietfaecher.length, vendors.length); i++) {
      const vendor = vendors[i % vendors.length];
      const mietfach = availableMietfaecher[i];
      
      // Zufälliges Startdatum in den nächsten 6 Monaten
      const monthsFromNow = Math.floor(Math.random() * 6) + 1; // 1-6 Monate
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() + monthsFromNow);
      startDate.setDate(Math.floor(Math.random() * 28) + 1); // Zufälliger Tag im Monat
      
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 12); // 12 Monate Vertragslaufzeit
      
      const typeIndex = i % 3;
      const preis = preise[typeIndex];
      
      const vertrag = new Vertrag({
        user: vendor._id,
        datum: new Date(),
        services: [{
          mietfach: mietfach._id,
          mietbeginn: startDate,
          monatspreis: preis
        }],
        totalMonthlyPrice: preis,
        contractDuration: 12,
        status: 'scheduled', // Geplanter Vertrag
        scheduledStartDate: startDate,
        availabilityImpact: {
          from: startDate,
          to: endDate
        },
        istProbemonatBuchung: false, // Reguläre zukünftige Verträge
        zahlungspflichtigAb: startDate,
        gekuendigtInProbemonat: false
      });
      
      await vertrag.save();
      futureContracts.push(vertrag);
      console.log(`✅ Zukünftiger Vertrag erstellt: ${vendor.kontakt.name} - ${mietfach.bezeichnung} ab ${startDate.toLocaleDateString()}`);
    }
    
    // Erstelle auch einige Trial-Verträge, die in der Zukunft zu bezahlten Verträgen werden
    const trialUsers = await User.find({ registrationStatus: 'trial_active' });
    console.log(`\n🆓 Erweitere Trial-Benutzer für zukünftige Konvertierungen...`);
    
    for (let i = 0; i < Math.min(3, trialUsers.length); i++) {
      const trialUser = trialUsers[i];
      
      // Verlängere Trial-Enddatum um einige Wochen in die Zukunft
      const newTrialEndDate = new Date();
      newTrialEndDate.setDate(newTrialEndDate.getDate() + (i + 1) * 14); // 2, 4, 6 Wochen
      
      await User.findByIdAndUpdate(trialUser._id, {
        trialEndDate: newTrialEndDate
      });
      
      console.log(`✅ Trial-Ende verlängert für ${trialUser.kontakt.name}: ${newTrialEndDate.toLocaleDateString()}`);
    }
    
    console.log(`\n🎉 ${futureContracts.length} zukünftige Verträge erstellt!`);
    console.log('📈 Sie können jetzt Zukunftsprojektionen im Admin-Dashboard sehen!');
    
  } catch (error) {
    console.error('❌ Fehler beim Erstellen zukünftiger Verträge:', error);
  } finally {
    mongoose.disconnect();
  }
}

addFutureContracts();