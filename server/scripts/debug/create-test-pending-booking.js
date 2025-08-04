const mongoose = require('mongoose');

async function createTestPendingBooking() {
  try {
    // Verbinde mit MongoDB auf Windows Host
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/housnkuh', {
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ MongoDB verbunden');
    
    // Definiere das User Schema
    const UserSchema = new mongoose.Schema({
      username: String,
      password: String,
      isFullAccount: Boolean,
      isVendor: Boolean,
      isAdmin: Boolean,
      registrationStatus: String,
      registrationDate: Date,
      trialStartDate: Date,
      trialEndDate: Date,
      isPubliclyVisible: Boolean,
      kontakt: {
        name: String,
        email: String,
        telefon: String,
        newsletterConfirmed: Boolean,
        confirmationToken: String,
        tokenExpires: Date,
        status: String
      },
      adressen: [{
        adresstyp: String,
        strasse: String,
        hausnummer: String,
        plz: String,
        ort: String,
        telefon: String,
        email: String,
        name1: String,
        name2: String
      }],
      vendorProfile: {
        unternehmen: String,
        beschreibung: String,
        profilBild: String,
        kategorien: [String],
        slogan: String,
        website: String,
        verifyStatus: String
      },
      pendingBooking: {
        packageData: mongoose.Schema.Types.Mixed,
        createdAt: Date,
        status: String
      }
    }, { timestamps: true });
    
    const User = mongoose.model('User', UserSchema);
    
    // Erstelle Test-Vendor mit pendingBooking
    const testEmail = `test-pending-${Date.now()}@example.com`;
    const testVendor = new User({
      username: testEmail,
      password: '$2b$10$test.hashed.password',
      isFullAccount: true,
      isVendor: true,
      isAdmin: false,
      registrationStatus: 'trial_active',
      registrationDate: new Date(),
      trialStartDate: new Date(),
      trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isPubliclyVisible: false,
      kontakt: {
        name: 'Test Pending Vendor',
        email: testEmail,
        telefon: '0123456789',
        newsletterConfirmed: true,
        status: 'aktiv'
      },
      adressen: [{
        adresstyp: 'Hauptadresse',
        strasse: 'Teststraße',
        hausnummer: '123',
        plz: '12345',
        ort: 'Teststadt',
        name1: 'Test Pending Vendor'
      }],
      vendorProfile: {
        unternehmen: 'Test Bauernhof mit Pending Booking',
        verifyStatus: 'unverified'
      },
      pendingBooking: {
        packageData: {
          name: 'Test Premium Package',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          priceMonthly: 149,
          setupFee: 299,
          selectedOptions: {
            logoEintrag: true,
            seoOptimierung: true,
            premiumPlatzierung: true
          },
          additionalMietfaecher: 5,
          totalMonthly: 149,
          totalSetup: 299
        },
        createdAt: new Date(),
        status: 'pending'  // WICHTIG: Status muss 'pending' sein!
      }
    });
    
    const savedVendor = await testVendor.save();
    console.log('\n✅ Test-Vendor mit pendingBooking erstellt!');
    console.log('ID:', savedVendor._id);
    console.log('Email:', savedVendor.kontakt.email);
    console.log('PendingBooking Status:', savedVendor.pendingBooking.status);
    console.log('Package:', savedVendor.pendingBooking.packageData.name);
    console.log('Preis:', savedVendor.pendingBooking.packageData.priceMonthly, '€/Monat');
    
    // Prüfe ob es in der Query erscheint
    const check = await User.findOne({
      isVendor: true,
      'pendingBooking.status': 'pending'
    });
    
    if (check) {
      console.log('\n✅ Vendor kann mit pendingBooking.status = "pending" gefunden werden!');
    } else {
      console.log('\n❌ Vendor kann NICHT gefunden werden!');
    }
    
  } catch (error) {
    console.error('❌ Fehler:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Verbindung geschlossen');
  }
}

createTestPendingBooking();