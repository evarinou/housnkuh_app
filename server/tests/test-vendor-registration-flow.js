const axios = require('axios');

const API_URL = 'http://localhost:4000/api';

// Test-Daten
const testVendor = {
  email: `test-vendor-${Date.now()}@example.com`,
  password: 'Test123!',
  name: 'Test Direktvermarkter',
  telefon: '0123456789',
  strasse: 'Teststraße',
  hausnummer: '123',
  plz: '12345',
  ort: 'Teststadt',
  unternehmen: 'Test Bauernhof GmbH',
  packageData: {
    name: 'Starter Package',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    priceMonthly: 49,
    setupFee: 99,
    selectedOptions: {
      logoEintrag: true,
      socialMediaPaket: false,
      seoOptimierung: false,
      premiumPlatzierung: false
    },
    additionalMietfaecher: 2,
    totalMonthly: 49,
    totalSetup: 99
  }
};

async function connectDB() {
  try {
    await mongoose.connect('mongodb://localhost:27017/housnkuh', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB verbunden');
  } catch (error) {
    console.error('❌ MongoDB Verbindung fehlgeschlagen:', error);
    process.exit(1);
  }
}

async function testVendorRegistrationFlow() {
  // Lade User Model hier nach DB-Verbindung
  const User = mongoose.model('User');
  console.log('\n=== VENDOR REGISTRATION FLOW TEST ===\n');
  
  try {
    // Step 1: Registriere Vendor mit Package
    console.log('📝 Step 1: Registriere Vendor mit Package...');
    const registerResponse = await axios.post(`${API_URL}/vendorAuth/register-with-booking`, testVendor);
    
    console.log('Response:', registerResponse.data);
    const userId = registerResponse.data.userId;
    console.log(`✅ Vendor registriert mit ID: ${userId}`);
    
    // Step 2: Prüfe Datenbank auf pendingBooking
    console.log('\n🔍 Step 2: Prüfe Datenbank auf pendingBooking...');
    const user = await User.findById(userId);
    
    console.log('User gefunden:', {
      id: user._id,
      email: user.kontakt.email,
      isVendor: user.isVendor,
      hasPendingBooking: !!user.pendingBooking,
      pendingBookingStatus: user.pendingBooking?.status,
      packageDataExists: !!user.pendingBooking?.packageData
    });
    
    if (user.pendingBooking) {
      console.log('✅ PendingBooking Details:', {
        status: user.pendingBooking.status,
        createdAt: user.pendingBooking.createdAt,
        packageName: user.pendingBooking.packageData.name,
        priceMonthly: user.pendingBooking.packageData.priceMonthly,
        setupFee: user.pendingBooking.packageData.setupFee
      });
    } else {
      console.log('❌ Keine pendingBooking gefunden!');
    }
    
    // Step 3: E-Mail Token anzeigen (für manuellen Test)
    if (user.kontakt.confirmationToken) {
      console.log('\n📧 E-Mail Bestätigungs-Token:', user.kontakt.confirmationToken);
      console.log('Token läuft ab:', user.kontakt.tokenExpires);
      console.log(`\nBestätigungs-URL: http://localhost:3000/vendor-confirm/${user.kontakt.confirmationToken}`);
    }
    
    // Step 4: Simuliere E-Mail-Bestätigung
    console.log('\n📧 Step 3: Simuliere E-Mail-Bestätigung...');
    try {
      const confirmResponse = await axios.get(`${API_URL}/vendorAuth/confirm-email/${user.kontakt.confirmationToken}`);
      console.log('✅ E-Mail bestätigt:', confirmResponse.data.message);
    } catch (error) {
      console.log('❌ E-Mail-Bestätigung fehlgeschlagen:', error.response?.data || error.message);
    }
    
    // Step 5: Prüfe User nach Bestätigung
    console.log('\n🔍 Step 4: Prüfe User nach Bestätigung...');
    const confirmedUser = await User.findById(userId);
    console.log('User nach Bestätigung:', {
      emailConfirmed: confirmedUser.kontakt.newsletterConfirmed,
      status: confirmedUser.kontakt.status,
      hasPendingBooking: !!confirmedUser.pendingBooking,
      pendingBookingStatus: confirmedUser.pendingBooking?.status
    });
    
    // Step 6: Login-Test
    console.log('\n🔑 Step 5: Teste Vendor Login...');
    try {
      const loginResponse = await axios.post(`${API_URL}/vendorAuth/login`, {
        email: testVendor.email,
        password: testVendor.password
      });
      console.log('✅ Login erfolgreich:', {
        token: loginResponse.data.token.substring(0, 20) + '...',
        hasPendingBooking: loginResponse.data.user.hasPendingBooking
      });
    } catch (error) {
      console.log('❌ Login fehlgeschlagen:', error.response?.data || error.message);
    }
    
    // Step 7: Prüfe Admin-Dashboard Daten
    console.log('\n📊 Step 6: Prüfe Daten für Admin-Dashboard...');
    const vendorsWithPendingBookings = await User.find({
      isVendor: true,
      'pendingBooking.status': 'pending'
    }).select('kontakt vendorProfile pendingBooking');
    
    console.log(`\nGefundene Vendors mit ausstehenden Buchungen: ${vendorsWithPendingBookings.length}`);
    vendorsWithPendingBookings.forEach(vendor => {
      console.log(`- ${vendor.kontakt.name} (${vendor.kontakt.email})`);
      console.log(`  Package: ${vendor.pendingBooking.packageData.name}`);
      console.log(`  Preis: ${vendor.pendingBooking.packageData.priceMonthly}€/Monat`);
    });
    
  } catch (error) {
    console.error('❌ Fehler:', error.response?.data || error.message);
  }
}

async function main() {
  await connectDB();
  
  // Import models nach DB-Verbindung
  require('./src/models');
  await testVendorRegistrationFlow();
  
  console.log('\n✅ Test abgeschlossen!');
  console.log('\n📝 Nächste Schritte:');
  console.log('1. Admin kann sich einloggen und "Ausstehende Buchungen" sehen');
  console.log('2. Admin kann Mietfächer zuweisen');
  console.log('3. Vertrag wird erst dann erstellt');
  console.log('4. Vendor erhält Admin-Bestätigungs-E-Mail');
  
  await mongoose.connection.close();
  process.exit(0);
}

main().catch(console.error);