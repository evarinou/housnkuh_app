/**
 * @file seed-db.js
 * @purpose Seeds the database with FAQs, Tags, and Email Templates
 * @created 2025-01-15
 * @modified 2025-01-15
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import seed functions from individual modules
const { seedFAQs } = require('./seed-faqs-complete');
const { seedTags } = require('./seed-tags');
const { seedEmailTemplates } = require('./seed-email-templates');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/housnkuh';

/**
 * Main seed function that orchestrates all seeding operations
 */
async function seedDatabase() {
  let connection;
  
  try {
    console.log('🚀 Starting database seeding process...\n');
    
    // Connect to MongoDB
    connection = await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    console.log(`📍 Database: ${connection.connection.name}\n`);
    
    // Seed Tags
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🏷️  SEEDING TAGS...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await seedTags();
    console.log('');
    
    // Seed FAQs
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❓ SEEDING FAQS...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await seedFAQs();
    console.log('');
    
    // Seed Email Templates
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 SEEDING EMAIL TEMPLATES...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await seedEmailTemplates();
    console.log('');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📊 Summary:');
    console.log('   ✓ Tags seeded');
    console.log('   ✓ FAQs seeded');
    console.log('   ✓ Email Templates seeded');
    console.log('\n💡 Note: This seed script does NOT create users, mietfächer, or contracts.');
    console.log('   Those must be created manually via the admin interface.');
    
  } catch (error) {
    console.error('\n❌ Error during database seeding:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    // Disconnect from MongoDB
    if (connection) {
      await mongoose.disconnect();
      console.log('\n📦 Disconnected from MongoDB');
    }
  }
}

// Execute seeding if run directly
if (require.main === module) {
  seedDatabase().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { seedDatabase };