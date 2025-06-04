const User = require('./dist/models/User').default;
const mongoose = require('mongoose');

async function checkUsers() {
  try {
    await mongoose.connect('mongodb://localhost:27017/housnkuh');
    
    console.log('=== ALL VENDOR USERS ===');
    const vendors = await User.find({ isVendor: true }).lean();
    console.log('Total vendors:', vendors.length);
    
    vendors.forEach((vendor, index) => {
      console.log('\nVendor ' + (index + 1) + ':');
      console.log('Email:', vendor.kontakt?.email);
      console.log('Name:', vendor.kontakt?.name);
      console.log('Registration Status:', vendor.registrationStatus);
      console.log('Has pending booking:', !!vendor.pendingBooking);
      if (vendor.pendingBooking) {
        console.log('Pending booking status:', vendor.pendingBooking.status);
        console.log('Package data exists:', !!vendor.pendingBooking.packageData);
        if (vendor.pendingBooking.packageData) {
          console.log('Package selected provision:', vendor.pendingBooking.packageData.selectedProvisionType);
          console.log('Package rental duration:', vendor.pendingBooking.packageData.rentalDuration);
          console.log('Package total cost:', JSON.stringify(vendor.pendingBooking.packageData.totalCost));
        }
      }
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUsers();