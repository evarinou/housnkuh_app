const mongoose = require('mongoose');

async function debugVendors() {
  try {
    // Verbinde mit MongoDB auf Windows Host
    await mongoose.connect('mongodb://172.23.192.1:27017/housnkuh', {
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ MongoDB verbunden');
    
    // Definiere das User Schema direkt
    const UserSchema = new mongoose.Schema({
      username: String,
      password: String,
      isFullAccount: Boolean,
      isVendor: Boolean,
      registrationStatus: String,
      kontakt: {
        name: String,
        email: String,
        telefon: String,
        newsletterConfirmed: Boolean,
        confirmationToken: String,
        status: String
      },
      vendorProfile: {
        unternehmen: String
      },
      pendingBooking: {
        packageData: mongoose.Schema.Types.Mixed,
        createdAt: Date,
        status: String
      }
    }, { timestamps: true });
    
    const User = mongoose.model('User', UserSchema);
    
    // Hole die letzten 5 Vendors
    const recentVendors = await User.find({ isVendor: true })
      .sort({ createdAt: -1 })
      .limit(5);
    
    console.log(`\n📊 Die 5 neuesten Vendors:`);
    
    recentVendors.forEach((vendor, index) => {
      console.log(`\n${index + 1}. ${vendor.kontakt.name} (${vendor.kontakt.email})`);
      console.log(`   Erstellt: ${vendor.createdAt}`);
      console.log(`   Status: ${vendor.registrationStatus}`);
      console.log(`   E-Mail Status: ${vendor.kontakt.status}`);
      console.log(`   E-Mail bestätigt: ${vendor.kontakt.newsletterConfirmed}`);
      console.log(`   Hat Token: ${!!vendor.kontakt.confirmationToken}`);
      
      if (vendor.pendingBooking) {
        console.log(`   📦 PendingBooking:`);
        console.log(`      Status: ${vendor.pendingBooking.status || 'KEIN STATUS!'}`);
        console.log(`      Erstellt: ${vendor.pendingBooking.createdAt}`);
        if (vendor.pendingBooking.packageData) {
          console.log(`      Package: ${vendor.pendingBooking.packageData.name || 'Kein Name'}`);
          console.log(`      Preis: ${vendor.pendingBooking.packageData.priceMonthly}€/Monat`);
        } else {
          console.log(`      ⚠️ Keine packageData!`);
        }
      } else {
        console.log(`   ❌ Kein pendingBooking!`);
      }
    });
    
    // Suche explizit nach einem mit pending Status
    const pendingQuery = { 
      isVendor: true, 
      'pendingBooking.status': 'pending'
    };
    const countPending = await User.countDocuments(pendingQuery);
    console.log(`\n🔍 Vendors mit pendingBooking.status = 'pending': ${countPending}`);
    
    // Suche nach Vendors ohne Status
    const noStatusVendors = await User.find({ 
      isVendor: true,
      pendingBooking: { $exists: true },
      'pendingBooking.status': { $exists: false }
    }).limit(3);
    
    console.log(`\n⚠️ Vendors mit pendingBooking aber ohne Status: ${noStatusVendors.length}`);
    noStatusVendors.forEach(v => {
      console.log(`   - ${v.kontakt.email}`);
    });
    
  } catch (error) {
    console.error('❌ Fehler:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Verbindung geschlossen');
  }
}

debugVendors();