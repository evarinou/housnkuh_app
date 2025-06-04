const axios = require('axios');

const testRegistration = async () => {
  try {
    console.log('Testing vendor registration with package data...');
    
    const testData = {
      // Persönliche Daten
      email: 'test2@example.com',
      password: 'test123456',
      name: 'Test Vendor',
      telefon: '01234567890',
      
      // Adressdaten
      strasse: 'Teststraße',
      hausnummer: '123',
      plz: '12345',
      ort: 'Teststadt',
      
      // Unternehmensdaten
      unternehmen: 'Test Unternehmen',
      
      // Package-Daten
      packageData: {
        selectedProvisionType: 'premium',
        packageCounts: {
          'block-a': 2,
          'block-b': 1
        },
        packageOptions: [
          { id: 'block-a', name: 'Verkaufsblock Lage A', price: 35 },
          { id: 'block-b', name: 'Verkaufsblock Lage B', price: 15 }
        ],
        selectedAddons: ['digital-marketing'],
        rentalDuration: 6,
        totalCost: {
          monthly: 85.00,
          provision: 7
        }
      }
    };

    console.log('Sending registration request...');
    const response = await axios.post('http://localhost:4000/api/vendor-auth/register', testData);
    
    console.log('Registration successful:', response.data);
    
    // Jetzt schauen wir nach pending bookings
    console.log('\nChecking for pending bookings...');
    
    // Diese Route braucht eigentlich Admin auth, aber wir schauen was passiert
    try {
      const pendingResponse = await axios.get('http://localhost:4000/api/admin/pending-bookings', {
        headers: { Authorization: 'Bearer test' }
      });
      console.log('Pending bookings response:', pendingResponse.data);
    } catch (pendingError) {
      console.log('Pending bookings error (expected):', pendingError.response?.data || pendingError.message);
    }
    
  } catch (error) {
    console.error('Registration error:', error.response?.data || error.message);
  }
};

testRegistration();