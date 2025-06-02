const axios = require('axios');

async function debugAdminAuth() {
  try {
    console.log('\n=== Testing Admin Auth Flow ===\n');
    
    // 1. Login
    console.log('1. Attempting login...');
    const loginResponse = await axios.post('http://localhost:4000/api/auth/login', {
      username: 'admin',
      password: 'password123'
    });
    
    console.log('Login successful:', {
      success: loginResponse.data.success,
      user: loginResponse.data.user,
      tokenLength: loginResponse.data.token?.length
    });
    
    const token = loginResponse.data.token;
    
    // 2. Test with x-auth-token header
    console.log('\n2. Testing /api/auth/check with x-auth-token header...');
    try {
      const checkResponse1 = await axios.get('http://localhost:4000/api/auth/check', {
        headers: {
          'x-auth-token': token
        }
      });
      console.log('Success with x-auth-token:', checkResponse1.data);
    } catch (error) {
      console.log('Failed with x-auth-token:', error.response?.data || error.message);
    }
    
    // 3. Test with Authorization Bearer header
    console.log('\n3. Testing /api/auth/check with Authorization Bearer header...');
    try {
      const checkResponse2 = await axios.get('http://localhost:4000/api/auth/check', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('Success with Authorization Bearer:', checkResponse2.data);
    } catch (error) {
      console.log('Failed with Authorization Bearer:', error.response?.data || error.message);
    }
    
    // 4. Test without any header
    console.log('\n4. Testing /api/auth/check without header...');
    try {
      const checkResponse3 = await axios.get('http://localhost:4000/api/auth/check');
      console.log('Success without header:', checkResponse3.data);
    } catch (error) {
      console.log('Failed without header (expected):', error.response?.data || error.message);
    }
    
    // 5. Decode the token to see what's inside
    console.log('\n5. Token payload:');
    const [, payload] = token.split('.');
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
    console.log(decoded);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

debugAdminAuth();