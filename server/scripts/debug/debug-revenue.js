// Debug script to test revenue API
const fetch = require('node-fetch');

async function testRevenueAPI() {
  try {
    // First, let's try to login (need to use username instead of email)
    console.log('Testing revenue API...');
    
    // Test the revenue overview endpoint directly (without auth for now)
    const apiUrl = 'http://localhost:4000/api';
    
    console.log('Attempting to fetch revenue overview...');
    const response = await fetch(`${apiUrl}/admin/revenue/overview`);
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.raw());
    
    if (response.status === 401) {
      console.log('Need authentication. Let me try to get a token first...');
      
      // Try to setup admin if needed
      try {
        const setupResponse = await fetch(`${apiUrl}/admin/setup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'admin',
            password: 'admin123',
            name: 'Admin User',
            email: 'admin@housnkuh.de',
            setupKey: process.env.ADMIN_SETUP_KEY || (() => {
              if (!process.env.ADMIN_SETUP_KEY) {
                throw new Error('ADMIN_SETUP_KEY environment variable is required');
              }
              return process.env.ADMIN_SETUP_KEY;
            })()
          })
        });
        
        const setupResult = await setupResponse.json();
        console.log('Setup result:', setupResult);
      } catch (setupErr) {
        console.log('Setup probably already done:', setupErr.message);
      }
      
      // Try to login
      const loginResponse = await fetch(`${apiUrl}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'admin',
          password: 'admin123'
        })
      });
      
      const loginResult = await loginResponse.json();
      console.log('Login result:', loginResult);
      
      if (loginResult.success && loginResult.token) {
        console.log('Login successful, testing revenue API with token...');
        
        const authedResponse = await fetch(`${apiUrl}/admin/revenue/overview`, {
          headers: {
            'Authorization': `Bearer ${loginResult.token}`
          }
        });
        
        const revenueResult = await authedResponse.json();
        console.log('Revenue API Response:', JSON.stringify(revenueResult, null, 2));
      }
    } else {
      const result = await response.json();
      console.log('Revenue API Response:', JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.error('Error testing revenue API:', error);
  }
}

testRevenueAPI();