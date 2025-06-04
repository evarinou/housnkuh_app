const axios = require('axios');

// Test-Daten für neue Registrierung
const testVendor = {
  email: `vendor-test-${Date.now()}@example.com`,
  password: 'Test123!',
  name: 'Test Vendor mit Package',
  telefon: '0123456789',
  strasse: 'Teststraße',
  hausnummer: '123',
  plz: '12345',
  ort: 'Teststadt',
  unternehmen: 'Test Bauernhof GmbH',
  packageData: {
    name: 'Premium Package',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    priceMonthly: 99,
    setupFee: 199,
    selectedOptions: {
      logoEintrag: true,
      socialMediaPaket: true,
      seoOptimierung: true,
      premiumPlatzierung: false
    },
    additionalMietfaecher: 3,
    totalMonthly: 99,
    totalSetup: 199
  }
};

async function testRegistration() {
  console.log('\n=== TEST: Vendor Registration mit Package ===\n');
  
  try {
    console.log('📝 Registriere Vendor...');
    console.log('Email:', testVendor.email);
    console.log('Package:', testVendor.packageData.name);
    console.log('Preis:', testVendor.packageData.priceMonthly, '€/Monat');
    
    const response = await axios.post('http://localhost:4000/api/vendor-auth/register', testVendor);
    
    console.log('\n✅ Registrierung erfolgreich!');
    console.log('Response:', response.data);
    console.log('\n🎯 Nächste Schritte:');
    console.log('1. E-Mail bestätigen (Token in DB oder E-Mail)');
    console.log('2. Als Admin einloggen');
    console.log('3. "Ausstehende Buchungen" prüfen');
    console.log('4. Mietfächer zuweisen');
    
    return response.data.userId;
  } catch (error) {
    console.error('\n❌ Fehler:', error.response?.data || error.message);
    if (error.response?.status === 404) {
      console.log('\n⚠️  Hinweis: Stelle sicher, dass der Server auf Port 4000 läuft!');
    }
  }
}

// Führe Test aus
testRegistration()
  .then(userId => {
    if (userId) {
      console.log('\n📌 Vendor ID:', userId);
      console.log('🔗 Admin Dashboard: http://localhost:3000/admin/pending-bookings');
    }
  })
  .catch(console.error);