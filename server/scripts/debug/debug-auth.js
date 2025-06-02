const axios = require('axios');

async function testAdminLogin() {
  try {
    console.log('\n=== Testing Admin Login ===');
    
    // 1. Login
    const loginResponse = await axios.post('http://localhost:4000/api/auth/login', {
      username: 'admin',
      password: 'password123'
    });
    
    console.log('Login Response:', loginResponse.data);
    
    if (loginResponse.data.success) {
      const token = loginResponse.data.token;
      console.log('Token received:', token.substring(0, 50) + '...');
      
      // 2. Test auth check
      try {
        const checkResponse = await axios.get('http://localhost:4000/api/auth/check', {
          headers: {
            'x-auth-token': token
          }
        });
        console.log('Auth Check Response:', checkResponse.data);
      } catch (checkError) {
        console.error('Auth Check Error:', checkError.response?.data || checkError.message);
      }
    }
    
  } catch (error) {
    console.error('Login Error:', error.response?.data || error.message);
  }
}

testAdminLogin();