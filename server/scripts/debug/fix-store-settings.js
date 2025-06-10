const axios = require('axios');
const jwt = require('jsonwebtoken');
const config = require('./dist/config/config').default;

async function fixStoreSettings() {
  try {
    // Admin JWT Token erstellen
    const testAdminToken = jwt.sign(
      { 
        id: 'test-admin-id', 
        isAdmin: true,
        email: 'admin@housnkuh.de' 
      },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    console.log('Getting current store settings...');
    
    // Aktuelle Settings abrufen
    const currentResponse = await axios.get('http://localhost:4000/api/admin/settings/store-opening', {
      headers: { Authorization: `Bearer ${testAdminToken}` }
    });
    
    console.log('Current store settings:', JSON.stringify(currentResponse.data, null, 2));
    
    // Store auf zukünftiges Öffnungsdatum setzen um das Pre-Opening Verhalten zu testen
    console.log('\nSetting store to open on future date (August 10, 2025)...');
    
    const updateResponse = await axios.put('http://localhost:4000/api/admin/settings/store-opening', {
      enabled: true, // Aktiviert Store Opening Feature = Store öffnet an bestimmtem Datum
      openingDate: "2025-08-10T00:00:00.000Z" // Store öffnet am 10. August 2025
    }, {
      headers: { 
        Authorization: `Bearer ${testAdminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Store update response:', JSON.stringify(updateResponse.data, null, 2));
    
    // Verify the change
    const verifyResponse = await axios.get('http://localhost:4000/api/admin/settings/store-opening', {
      headers: { Authorization: `Bearer ${testAdminToken}` }
    });
    
    console.log('Verified store settings:', JSON.stringify(verifyResponse.data, null, 2));
    
    if (verifyResponse.data.settings.isStoreOpen) {
      console.log('❌ Store is unexpectedly OPEN!');
    } else {
      console.log('✅ Store is now CLOSED with future opening date! Package registration will work with deferred trial start.');
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

fixStoreSettings();