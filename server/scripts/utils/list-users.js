const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// MongoDB URI
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/housnkuh';

// User Schema (simplified)
const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
  isAdmin: Boolean,
  isVendor: Boolean,
  emailVerified: Boolean,
  isFullAccount: Boolean,
  kontakt: {
    name: String,
    email: String,
    status: String
  }
});

const User = mongoose.model('User', UserSchema);

async function listUsers() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    const users = await User.find({}).select('username isAdmin isVendor emailVerified isFullAccount kontakt.name kontakt.email kontakt.status');
    
    console.log('\n=== Users in Database ===');
    console.log('Total users:', users.length);
    
    users.forEach(user => {
      console.log('\n---');
      console.log('Username:', user.username);
      console.log('Name:', user.kontakt?.name || 'N/A');
      console.log('Email:', user.kontakt?.email || 'N/A');
      console.log('Status:', user.kontakt?.status || 'N/A');
      console.log('Is Admin:', user.isAdmin || false);
      console.log('Is Vendor:', user.isVendor || false);
      console.log('Is Full Account:', user.isFullAccount || false);
      console.log('Email Verified:', user.emailVerified || false);
    });
    
    // Test password for one user
    console.log('\n=== Testing password for admin user ===');
    const adminUser = await User.findOne({ username: 'admin' });
    if (adminUser) {
      const testPassword = 'password123';
      const isValid = await bcrypt.compare(testPassword, adminUser.password);
      console.log('Password "password123" is valid:', isValid);
      
      // Show password hash info
      console.log('Password hash:', adminUser.password.substring(0, 20) + '...');
    } else {
      console.log('Admin user not found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

listUsers();