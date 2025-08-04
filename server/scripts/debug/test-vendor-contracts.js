const axios = require('axios');

async function testVendorContracts() {
  try {
    console.log('\n=== Testing Vendor Login and Contracts ===');
    
    // 1. Login as vendor
    const loginResponse = await axios.post('http://localhost:4000/api/vendor-auth/login', {
      email: 'info@hof-mueller.de',
      password: 'password123'
    });
    
    console.log('Login Response:', loginResponse.data);
    
    if (loginResponse.data.success) {
      const token = loginResponse.data.token;
      const userId = loginResponse.data.user.id;
      console.log('Token received:', token.substring(0, 50) + '...');
      console.log('User ID:', userId);
      
      // 2. Test contracts endpoint
      try {
        const contractsResponse = await axios.get(`http://localhost:4000/api/vendor-auth/contracts/${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('Contracts Response:', JSON.stringify(contractsResponse.data, null, 2));
      } catch (contractsError) {
        console.error('Contracts Error:', contractsError.response?.data || contractsError.message);
      }
    }
    
  } catch (error) {
    console.error('Login Error:', error.response?.data || error.message);
  }
}

testVendorContracts();