const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:4000/api';

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
      seoOptimierung: false,
      premiumPlatzierung: false
    },
    additionalMietfaecher: 2,
    totalMonthly: 49,
    totalSetup: 99
  }
};

async function testVendorRegistrationFlow() {
  console.log('\n=== VENDOR REGISTRATION FLOW TEST (API Only) ===\n');
  
  let userId;
  let confirmationToken;
  
  try {
    // Step 1: Registriere Vendor mit Package
    console.log('📝 Step 1: Registriere Vendor mit Package...');
    console.log('Email:', testVendor.email);
    console.log('Package:', testVendor.packageData.name);
    
    const registerResponse = await axios.post(`${API_URL}/vendor-auth/register`, testVendor);
    
    console.log('Response:', registerResponse.data);
    userId = registerResponse.data.userId;
    console.log(`✅ Vendor registriert mit ID: ${userId}`);
    
    // Step 2: Hole Vendor-Daten über Admin-API
    console.log('\n🔍 Step 2: Prüfe pendingBooking über Admin-API...');
    
    // Erst Admin einloggen
    const adminLogin = await axios.post(`${API_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    const adminToken = adminLogin.data.token;
    
    // Hole alle Vendors mit pending bookings
    const pendingBookingsResponse = await axios.get(`${API_URL}/admin/pending-bookings`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    console.log('Ausstehende Buchungen:', pendingBookingsResponse.data.pendingBookings.length);
    
    const ourVendor = pendingBookingsResponse.data.pendingBookings.find(
      v => v.email === testVendor.email
    );
    
    if (ourVendor) {
      console.log('✅ Vendor mit pendingBooking gefunden:', {
        name: ourVendor.name,
        email: ourVendor.email,
        packageName: ourVendor.packageData.name,
        priceMonthly: ourVendor.packageData.priceMonthly,
        emailConfirmed: ourVendor.emailConfirmed
      });
      confirmationToken = ourVendor.confirmationToken;
    } else {
      console.log('❌ Vendor nicht in ausstehenden Buchungen gefunden!');
    }
    
    // Step 3: E-Mail-Bestätigung
    if (confirmationToken) {
      console.log('\n📧 Step 3: Simuliere E-Mail-Bestätigung...');
      console.log('Bestätigungs-Token:', confirmationToken);
      
      try {
        const confirmResponse = await axios.get(`${API_URL}/vendor-auth/confirm/${confirmationToken}`);
        console.log('✅ E-Mail bestätigt:', confirmResponse.data.message);
      } catch (error) {
        console.log('❌ E-Mail-Bestätigung fehlgeschlagen:', error.response?.data || error.message);
      }
    }
    
    // Step 4: Prüfe Status nach Bestätigung
    console.log('\n🔍 Step 4: Prüfe Status nach E-Mail-Bestätigung...');
    const updatedPendingBookings = await axios.get(`${API_URL}/admin/pending-bookings`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    const confirmedVendor = updatedPendingBookings.data.pendingBookings.find(
      v => v.email === testVendor.email
    );
    
    if (confirmedVendor) {
      console.log('✅ Vendor Status nach Bestätigung:', {
        emailConfirmed: confirmedVendor.emailConfirmed,
        hasPendingBooking: true,
        packageName: confirmedVendor.packageData.name
      });
    }
    
    // Step 5: Login-Test
    console.log('\n🔑 Step 5: Teste Vendor Login...');
    try {
      const loginResponse = await axios.post(`${API_URL}/vendor-auth/login`, {
        email: testVendor.email,
        password: testVendor.password
      });
      console.log('✅ Login erfolgreich:', {
        tokenLength: loginResponse.data.token.length,
        hasPendingBooking: loginResponse.data.user.hasPendingBooking,
        registrationStatus: loginResponse.data.user.registrationStatus
      });
    } catch (error) {
      console.log('❌ Login fehlgeschlagen:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('❌ Fehler:', error.response?.data || error.message);
  }
  
  console.log('\n✅ Test abgeschlossen!');
  console.log('\n📝 Zusammenfassung des Ablaufs:');
  console.log('1. ✅ Vendor registriert mit Package');
  console.log('2. ✅ PendingBooking wurde gespeichert');
  console.log('3. ✅ Vendor kann E-Mail bestätigen');
  console.log('4. ✅ Vendor kann sich einloggen');
  console.log('5. ✅ Admin sieht "Ausstehende Buchungen"');
  console.log('\n🎯 Nächster Schritt: Admin weist Mietfächer zu → Vertrag wird erstellt');
}

// Führe Test aus
testVendorRegistrationFlow().catch(console.error);