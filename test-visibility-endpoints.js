// Test script to verify R004 visibility endpoints work correctly
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:4000/api';

async function testVisibilityEndpoints() {
  console.log('Testing R004 Vendor Visibility Controls...');
  
  try {
    // Test admin login (assuming admin credentials exist)
    console.log('\n1. Testing admin authentication...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@housnkuh.de',
      password: 'admin123'
    }).catch(err => {
      console.log('Admin login failed (expected if no admin exists):', err.response?.status);
      return null;
    });
    
    if (!loginResponse) {
      console.log('Skipping endpoint tests - no admin credentials available');
      return;
    }
    
    const adminToken = loginResponse.data.token;
    console.log('✓ Admin login successful');
    
    // Test getting all users
    console.log('\n2. Testing get all users...');
    const usersResponse = await axios.get(`${API_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✓ Found ${usersResponse.data.users.length} users`);
    
    // Find a vendor to test with
    const vendors = usersResponse.data.users.filter(user => user.isVendor);
    console.log(`✓ Found ${vendors.length} vendors`);
    
    if (vendors.length === 0) {
      console.log('No vendors found to test visibility controls');
      return;
    }
    
    const testVendor = vendors[0];
    console.log(`\n3. Testing single vendor visibility toggle for: ${testVendor.email}`);
    
    // Test single vendor visibility toggle
    const toggleResponse = await axios.patch(
      `${API_URL}/admin/vendors/${testVendor._id}/visibility`,
      { isPubliclyVisible: !testVendor.isPubliclyVisible },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log('✓ Single vendor visibility toggle successful');
    console.log('Response:', toggleResponse.data.message);
    
    // Test bulk visibility toggle
    if (vendors.length > 1) {
      console.log('\n4. Testing bulk vendor visibility toggle...');
      const vendorIds = vendors.slice(0, Math.min(2, vendors.length)).map(v => v._id);
      
      const bulkResponse = await axios.patch(
        `${API_URL}/admin/vendors/bulk-visibility`,
        { 
          vendorIds: vendorIds,
          isPubliclyVisible: true 
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      console.log('✓ Bulk vendor visibility toggle successful');
      console.log('Response:', bulkResponse.data.message);
    }
    
    console.log('\n✅ All R004 visibility endpoint tests passed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
  }
}

// Only run if called directly (not if imported)
if (require.main === module) {
  testVisibilityEndpoints();
}

module.exports = { testVisibilityEndpoints };