// test-filtering-endpoints.js
// Quick test script to verify the new filtering API endpoint
const axios = require('axios');

const API_BASE = 'http://localhost:4000/api';

async function testFilteringEndpoint() {
  try {
    console.log('Testing vendor filtering endpoint...\n');

    // Test 1: Basic request without filters
    console.log('1. Testing basic request (no filters):');
    const response1 = await axios.get(`${API_BASE}/vendor-auth/public/profiles`);
    console.log(`   Status: ${response1.status}`);
    console.log(`   Success: ${response1.data.success}`);
    console.log(`   Vendors returned: ${response1.data.vendors?.length || 0}`);
    console.log(`   Available filters: ${JSON.stringify(response1.data.availableFilters || {}, null, 2)}`);
    console.log(`   Pagination: ${JSON.stringify(response1.data.pagination || {}, null, 2)}`);

    // Test 2: Search filter
    console.log('\n2. Testing search filter:');
    const response2 = await axios.get(`${API_BASE}/vendor-auth/public/profiles?search=test`);
    console.log(`   Status: ${response2.status}`);
    console.log(`   Success: ${response2.data.success}`);
    console.log(`   Vendors returned: ${response2.data.vendors?.length || 0}`);

    // Test 3: Sorting
    console.log('\n3. Testing sorting:');
    const response3 = await axios.get(`${API_BASE}/vendor-auth/public/profiles?sortBy=registrationDate&sortOrder=desc`);
    console.log(`   Status: ${response3.status}`);
    console.log(`   Success: ${response3.data.success}`);
    console.log(`   Vendors returned: ${response3.data.vendors?.length || 0}`);

    // Test 4: Pagination
    console.log('\n4. Testing pagination:');
    const response4 = await axios.get(`${API_BASE}/vendor-auth/public/profiles?page=1&limit=5`);
    console.log(`   Status: ${response4.status}`);
    console.log(`   Success: ${response4.data.success}`);
    console.log(`   Vendors returned: ${response4.data.vendors?.length || 0}`);
    if (response4.data.pagination) {
      console.log(`   Page: ${response4.data.pagination.currentPage} of ${response4.data.pagination.totalPages}`);
      console.log(`   Total count: ${response4.data.pagination.totalCount}`);
    }

    // Test 5: Verify status filtering
    console.log('\n5. Testing status filtering:');
    const response5 = await axios.get(`${API_BASE}/vendor-auth/public/profiles?verifyStatus=verified`);
    console.log(`   Status: ${response5.status}`);
    console.log(`   Success: ${response5.data.success}`);
    console.log(`   Vendors returned: ${response5.data.vendors?.length || 0}`);

    console.log('\nAll filtering endpoint tests completed successfully! ✅');

  } catch (error) {
    if (error.response) {
      console.error(`HTTP Error ${error.response.status}: ${error.response.data?.message || error.response.statusText}`);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused. Is the server running on port 4000?');
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

testFilteringEndpoint();