const axios = require('axios');

async function testVendorContestSubmission() {
  try {
    console.log('Testing vendor contest submission...');
    
    const testData = {
      name: 'Test Teilnehmer',
      email: 'test@example.com',
      phone: '0123456789',
      guessedVendors: ['Bäckerei Müller', 'Hofladen Schmidt', 'Metzgerei Weber']
    };
    
    const response = await axios.post('http://localhost:4000/api/vendor-contest/submit', testData);
    
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
    
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

testVendorContestSubmission();