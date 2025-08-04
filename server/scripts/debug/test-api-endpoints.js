// Test script for updated API endpoints with new functionality
const axios = require('axios');
const mongoose = require('mongoose');

const API_BASE = process.env.API_URL || 'http://localhost:4000/api';

// Test data for vendor registration with comments
const testVendorData = {
  email: 'test-vendor-m004@example.com',
  password: 'TestPassword123!',
  name: 'Test Vendor M004',
  telefon: '01234567890',
  strasse: 'Teststraße',
  hausnummer: '123',
  plz: '12345',
  ort: 'Teststadt',
  unternehmen: 'Test Company M004',
  comments: 'Ich hätte gerne ein Mietfach mit guter Sichtbarkeit für meine Bio-Produkte. Besonders wichtig ist mir die Kühlmöglichkeit.',
  packageData: {
    selectedProvisionType: 'percentage',
    selectedPackages: ['block-cold', 'block-frozen'],
    packageCounts: {
      'block-cold': 1,
      'block-frozen': 1
    },
    packageOptions: [
      {
        id: 'block-cold',
        name: 'Verkaufsblock gekühlt',
        price: 50,
        description: 'Gekühlter Bereich für temperaturempfindliche Produkte'
      },
      {
        id: 'block-frozen',
        name: 'Verkaufsblock gefroren',
        price: 60,
        description: 'Gefrorener Bereich für Tiefkühlprodukte'
      }
    ],
    selectedAddons: [],
    rentalDuration: 6,
    totalCost: {
      monthly: 110,
      oneTime: 50,
      provision: 15
    }
  }
};

// Test data for price adjustments
const testPriceAdjustments = {
  // Will be filled with actual Mietfach IDs during testing
};

async function testVendorRegistrationWithComments() {
  console.log('\\n=== Testing Vendor Registration with Comments ===');
  
  try {
    const response = await axios.post(`${API_BASE}/vendor-auth/register`, testVendorData);
    
    console.log('✅ Registration successful');
    console.log('Response status:', response.status);
    console.log('User ID:', response.data.user?.id);
    console.log('Comments stored:', !!response.data.user?.pendingBooking?.comments);
    
    if (response.data.user?.pendingBooking?.comments) {
      console.log('Stored comment:', response.data.user.pendingBooking.comments);
    }
    
    return response.data.user;
  } catch (error) {
    console.log('❌ Registration failed');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Message:', error.response.data.message);
    } else {
      console.log('Error:', error.message);
    }
    return null;
  }
}

async function testCommentValidation() {
  console.log('\\n=== Testing Comment Validation ===');
  
  // Test with very long comment
  const longCommentData = {
    ...testVendorData,
    email: 'test-long-comment@example.com',
    comments: 'A'.repeat(501) // 501 characters - should fail
  };
  
  try {
    await axios.post(`${API_BASE}/vendor-auth/register`, longCommentData);
    console.log('❌ Long comment validation failed - should have been rejected');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Long comment correctly rejected');
      console.log('Message:', error.response.data.message);
    } else {
      console.log('❌ Unexpected error:', error.response?.data || error.message);
    }
  }
  
  // Test with malicious content
  const maliciousCommentData = {
    ...testVendorData,
    email: 'test-malicious-comment@example.com',
    comments: '<script>alert("xss")</script>Malicious content'
  };
  
  try {
    await axios.post(`${API_BASE}/vendor-auth/register`, maliciousCommentData);
    console.log('❌ Malicious comment validation failed - should have been rejected');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Malicious comment correctly rejected');
      console.log('Message:', error.response.data.message);
    } else {
      console.log('❌ Unexpected error:', error.response?.data || error.message);
    }
  }
}

async function testNewPackageTypes() {
  console.log('\\n=== Testing New Package Types ===');
  
  const newPackageTypesData = {
    ...testVendorData,
    email: 'test-new-packages@example.com',
    packageData: {
      ...testVendorData.packageData,
      selectedPackages: ['block-frozen', 'block-other', 'block-display'],
      packageCounts: {
        'block-frozen': 1,
        'block-other': 1,
        'block-display': 1
      },
      packageOptions: [
        {
          id: 'block-frozen',
          name: 'Verkaufsblock gefroren',
          price: 60,
          description: 'Gefrorener Bereich'
        },
        {
          id: 'block-other',
          name: 'Sonstiges Mietfach',
          price: 25,
          description: 'Flexibler Bereich für spezielle Anforderungen'
        },
        {
          id: 'block-display',
          name: 'Schaufenster',
          price: 80,
          description: 'Prominente Präsentationsfläche'
        }
      ],
      totalCost: {
        monthly: 165,
        oneTime: 75,
        provision: 20
      }
    }
  };
  
  try {
    const response = await axios.post(`${API_BASE}/vendor-auth/register`, newPackageTypesData);
    console.log('✅ New package types registration successful');
    console.log('Package types stored:', response.data.user?.pendingBooking?.packageData?.selectedPackages);
    return response.data.user;
  } catch (error) {
    console.log('❌ New package types registration failed');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Message:', error.response.data.message);
    }
    return null;
  }
}

async function testInvalidPackageTypes() {
  console.log('\\n=== Testing Invalid Package Types ===');
  
  const invalidPackageData = {
    ...testVendorData,
    email: 'test-invalid-package@example.com',
    packageData: {
      ...testVendorData.packageData,
      packageOptions: [
        {
          id: 'invalid-package-type',
          name: 'Invalid Package',
          price: 50,
          description: 'This should be rejected'
        }
      ]
    }
  };
  
  try {
    await axios.post(`${API_BASE}/vendor-auth/register`, invalidPackageData);
    console.log('❌ Invalid package type validation failed - should have been rejected');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Invalid package type correctly rejected');
      console.log('Message:', error.response.data.message);
    } else {
      console.log('❌ Unexpected error:', error.response?.data || error.message);
    }
  }
}

async function testPendingBookingsRetrieval() {
  console.log('\\n=== Testing Pending Bookings Retrieval ===');
  
  try {
    // Note: This would require admin authentication in real scenario
    const response = await axios.get(`${API_BASE}/admin/pending-bookings`);
    console.log('✅ Pending bookings retrieved successfully');
    console.log('Number of pending bookings:', response.data.pendingBookings?.length || 0);
    
    // Check if comments are included in response
    const bookingsWithComments = response.data.pendingBookings?.filter(booking => 
      booking.pendingBooking?.comments
    ) || [];
    console.log('Bookings with comments:', bookingsWithComments.length);
    
    return response.data.pendingBookings;
  } catch (error) {
    console.log('⚠️ Pending bookings retrieval failed (expected without admin auth)');
    if (error.response) {
      console.log('Status:', error.response.status);
    }
    return [];
  }
}

async function runAllTests() {
  console.log('🚀 Starting API Endpoint Tests for M004_S002');
  console.log('Testing backend API updates for Mietfächer types and booking comments');
  
  try {
    // Test 1: Basic vendor registration with comments
    const user1 = await testVendorRegistrationWithComments();
    
    // Test 2: Comment validation
    await testCommentValidation();
    
    // Test 3: New package types
    const user2 = await testNewPackageTypes();
    
    // Test 4: Invalid package types
    await testInvalidPackageTypes();
    
    // Test 5: Pending bookings retrieval
    await testPendingBookingsRetrieval();
    
    console.log('\\n=== Test Summary ===');
    console.log('✅ Comments field integration tested');
    console.log('✅ Input validation tested');
    console.log('✅ New package types tested');
    console.log('✅ Package validation tested');
    console.log('⚠️ Price adjustments testing requires admin authentication');
    
    console.log('\\n📝 Note: To test price adjustments functionality:');
    console.log('1. Authenticate as admin');
    console.log('2. Retrieve pending bookings');
    console.log('3. Test confirmPendingBooking with priceAdjustments parameter');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }
}

// Run tests if script is executed directly
if (require.main === module) {
  runAllTests().then(() => {
    console.log('\\n🏁 Tests completed');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Test suite crashed:', error);
    process.exit(1);
  });
}

module.exports = {
  testVendorRegistrationWithComments,
  testCommentValidation,
  testNewPackageTypes,
  testInvalidPackageTypes,
  testPendingBookingsRetrieval,
  runAllTests
};