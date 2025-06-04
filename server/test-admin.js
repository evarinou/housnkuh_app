const jwt = require('jsonwebtoken');
const config = require('./dist/config/config').default;

// Admin JWT Token erstellen (für Test)
const testAdminToken = jwt.sign(
  { 
    id: 'test-admin-id', 
    isAdmin: true,
    email: 'admin@housnkuh.de' 
  },
  config.jwtSecret,
  { expiresIn: '1h' }
);

console.log('Test Admin Token:', testAdminToken);

// Test pending bookings API
const axios = require('axios');

const testPendingBookings = async () => {
  try {
    console.log('\nTesting pending bookings API...');
    
    const response = await axios.get('http://localhost:4000/api/admin/pending-bookings', {
      headers: { 
        Authorization: `Bearer ${testAdminToken}` 
      }
    });
    
    console.log('Pending bookings response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('Pending bookings error:', error.response?.data || error.message);
  }
};

testPendingBookings();