const mongoose = require('mongoose');

async function checkPendingBookings() {
  try {
    // Direct connection string
    await mongoose.connect('mongodb://localhost:27017/housnkuh');
    console.log('Connected to MongoDB');
    
    const User = require('./dist/models/User').default;
    
    // Alle Vendor Users mit pendingBooking finden
    const vendorsWithBooking = await User.find({
      isVendor: true,
      pendingBooking: { $exists: true }
    }).select('kontakt.email pendingBooking registrationStatus createdAt');
    
    console.log('\n=== Vendors with pendingBooking ===');
    console.log('Found:', vendorsWithBooking.length);
    
    vendorsWithBooking.forEach(vendor => {
      console.log('\nVendor:', vendor.kontakt.email);
      console.log('Registration Status:', vendor.registrationStatus);
      console.log('Pending Booking Status:', vendor.pendingBooking?.status);
      console.log('Package Data exists:', Boolean(vendor.pendingBooking?.packageData));
      console.log('Created:', vendor.pendingBooking?.createdAt);
    });
    
    // Alle Vendor Users anzeigen
    const allVendors = await User.find({
      isVendor: true
    }).select('kontakt.email pendingBooking registrationStatus createdAt');
    
    console.log('\n\n=== ALL Vendors ===');
    console.log('Total vendors:', allVendors.length);
    
    allVendors.forEach(vendor => {
      console.log('\nVendor:', vendor.kontakt.email);
      console.log('Has pendingBooking:', Boolean(vendor.pendingBooking));
      console.log('Registration Status:', vendor.registrationStatus);
      console.log('Created:', vendor.createdAt);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkPendingBookings();
