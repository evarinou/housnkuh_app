const mongoose = require('mongoose');

async function checkPendingBookings() {
  try {
    // Verbinde mit MongoDB auf Windows Host
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/housnkuh', {
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
        newsletterConfirmed: Boolean
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
    
    // Finde alle Vendors mit pendingBooking
    const vendorsWithPendingBookings = await User.find({
      isVendor: true,
      'pendingBooking.status': 'pending'
    }).select('kontakt vendorProfile pendingBooking registrationStatus');
    
    console.log(`\n📊 Gefundene Vendors mit ausstehenden Buchungen: ${vendorsWithPendingBookings.length}`);
    
    vendorsWithPendingBookings.forEach((vendor, index) => {
      console.log(`\n${index + 1}. ${vendor.kontakt.name} (${vendor.kontakt.email})`);
      console.log(`   Status: ${vendor.registrationStatus}`);
      console.log(`   E-Mail bestätigt: ${vendor.kontakt.newsletterConfirmed}`);
      if (vendor.pendingBooking) {
        console.log(`   Package: ${vendor.pendingBooking.packageData.name}`);
        console.log(`   Preis: ${vendor.pendingBooking.packageData.priceMonthly}€/Monat`);
        console.log(`   Setup: ${vendor.pendingBooking.packageData.setupFee}€`);
        console.log(`   Erstellt: ${vendor.pendingBooking.createdAt}`);
      }
    });
    
    // Zeige auch alle Vendors (zur Übersicht)
    const allVendors = await User.find({ isVendor: true }).select('kontakt registrationStatus pendingBooking');
    console.log(`\n📋 Alle Vendors insgesamt: ${allVendors.length}`);
    
    const stats = {
      total: allVendors.length,
      withPendingBooking: allVendors.filter(v => v.pendingBooking).length,
      pendingStatus: allVendors.filter(v => v.pendingBooking?.status === 'pending').length,
      emailConfirmed: allVendors.filter(v => v.kontakt.newsletterConfirmed).length
    };
    
    console.log('\n📈 Statistiken:');
    console.log(`   Total Vendors: ${stats.total}`);
    console.log(`   Mit Booking: ${stats.withPendingBooking}`);
    console.log(`   Pending Status: ${stats.pendingStatus}`);
    console.log(`   E-Mail bestätigt: ${stats.emailConfirmed}`);
    
  } catch (error) {
    console.error('❌ Fehler:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Verbindung geschlossen');
  }
}

checkPendingBookings();