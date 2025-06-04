const axios = require('axios');

const testEmailConfirmation = async () => {
  try {
    // Verwende den confirmation token von einem der Test-Users
    const confirmationToken = '87622f165e86f567adb8740b22c355db630af7302c7979ce99c70faa60c0847a';
    
    console.log('Testing email confirmation...');
    console.log('Token:', confirmationToken);
    
    const response = await axios.get(`http://localhost:4000/api/vendor-auth/confirm/${confirmationToken}`);
    
    console.log('Email confirmation response:', response.data);
    
    // Nach der Bestätigung sollte ein Vertrag erstellt worden sein
    console.log('\nChecking pending bookings after email confirmation...');
    
    // Test admin token
    const jwt = require('jsonwebtoken');
    const config = require('./dist/config/config').default;
    
    const testAdminToken = jwt.sign(
      { 
        id: 'test-admin-id', 
        isAdmin: true,
        email: 'admin@housnkuh.de' 
      },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
    
    const pendingResponse = await axios.get('http://localhost:4000/api/admin/pending-bookings', {
      headers: { 
        Authorization: `Bearer ${testAdminToken}` 
      }
    });
    
    console.log('Pending bookings after confirmation:', JSON.stringify(pendingResponse.data, null, 2));
    
  } catch (error) {
    console.error('Email confirmation error:', error.response?.data || error.message);
  }
};

testEmailConfirmation();