/**
 * Database Index Creation Script
 * Creates strategic indexes for query optimization
 * Run with: node scripts/create-indexes.js
 */

const mongoose = require('mongoose');

const INDEXES = [
  // Vertrag collection indexes
  {
    collection: 'vertraege',
    indexes: [
      // Most common query patterns for contracts
      { key: { user: 1, status: 1, createdAt: -1 }, name: 'user_status_created' },
      { key: { 'services.mietfach': 1, status: 1 }, name: 'service_mietfach_status' },
      { key: { status: 1, istProbemonatBuchung: 1, scheduledStartDate: 1 }, name: 'status_trial_start' },
      { key: { scheduledStartDate: 1, 'availabilityImpact.to': 1 }, name: 'schedule_availability' },
      
      // Revenue calculation queries
      { key: { status: 1, istProbemonatBuchung: 1, zahlungspflichtigAb: 1 }, name: 'revenue_filtering' },
      { key: { 'availabilityImpact.from': 1, 'availabilityImpact.to': 1 }, name: 'availability_range' },
      
      // OPTIMIZATION: Critical compound index for availability queries
      { 
        key: { 
          'services.mietfach': 1, 
          status: 1, 
          'availabilityImpact.from': 1, 
          'availabilityImpact.to': 1 
        }, 
        name: 'availability_query_optimized' 
      },
      
      // OPTIMIZATION: Status filtering optimization
      { key: { status: 1, 'services.mietfach': 1 }, name: 'status_mietfach_filter' }
    ]
  },
  
  // User collection indexes
  {
    collection: 'users',
    indexes: [
      // Email lookup (unique already exists)
      { key: { email: 1 }, name: 'email_unique', unique: true },
      
      // Vendor queries
      { key: { isVendor: 1, registrationStatus: 1 }, name: 'vendor_registration' },
      { key: { isVendor: 1, 'vendorProfile.verified': 1 }, name: 'vendor_verified' },
      
      // Search functionality
      { 
        key: { 
          'vendorProfile.firmenname': 'text', 
          'vendorProfile.beschreibung': 'text',
          'kontakt.name': 'text'
        }, 
        name: 'vendor_text_search' 
      }
    ]
  },
  
  // Mietfach collection indexes
  {
    collection: 'mietfaecher',
    indexes: [
      { key: { typ: 1, verfuegbar: 1 }, name: 'typ_available' },
      { key: { verfuegbar: 1, nummer: 1 }, name: 'available_number' },
      { key: { 'standort.bereich': 1, typ: 1 }, name: 'location_type' },
      
      // OPTIMIZATION: Compound index for availability queries
      { key: { verfuegbar: 1, _id: 1 }, name: 'available_id_compound' },
      
      // OPTIMIZATION: Standort-based availability queries
      { key: { standort: 1, verfuegbar: 1 }, name: 'standort_available' }
    ]
  },
  
  // MonthlyRevenue collection indexes
  {
    collection: 'monthlyrevenues',
    indexes: [
      { key: { monat: 1 }, name: 'month_unique', unique: true },
      { key: { monat: -1, gesamteinnahmen: -1 }, name: 'month_revenue_desc' }
    ]
  },
  
  // Additional performance indexes
  {
    collection: 'users',
    indexes: [
      { key: { 'pendingBooking.status': 1, createdAt: -1 }, name: 'pending_booking_status' }
    ]
  }
];

async function createIndexes() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    
    // Connect to MongoDB (use environment variable or default)
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/housnkuh';
    await mongoose.connect(mongoUri);
    
    console.log('✅ Connected to MongoDB');
    console.log('🚀 Creating database indexes...');
    
    const db = mongoose.connection.db;
    
    for (const collectionConfig of INDEXES) {
      const collection = db.collection(collectionConfig.collection);
      
      console.log(`\n📁 Processing collection: ${collectionConfig.collection}`);
      
      for (const indexConfig of collectionConfig.indexes) {
        try {
          const options = { 
            name: indexConfig.name,
            background: true // Create index in background to avoid blocking
          };
          
          if (indexConfig.unique) {
            options.unique = true;
          }
          
          console.log(`  Creating index: ${indexConfig.name}`);
          
          // Check if index already exists
          const existingIndexes = await collection.indexes();
          const indexExists = existingIndexes.some(idx => idx.name === indexConfig.name);
          
          if (indexExists) {
            console.log(`  ⚠️  Index ${indexConfig.name} already exists, skipping`);
            continue;
          }
          
          await collection.createIndex(indexConfig.key, options);
          console.log(`  ✅ Created index: ${indexConfig.name}`);
          
        } catch (error) {
          if (error.code === 85) { // IndexOptionsConflict
            console.log(`  ⚠️  Index ${indexConfig.name} already exists with different options`);
          } else {
            console.error(`  ❌ Failed to create index ${indexConfig.name}:`, error.message);
          }
        }
      }
    }
    
    console.log('\n📊 Index creation summary:');
    
    for (const collectionConfig of INDEXES) {
      const collection = db.collection(collectionConfig.collection);
      const indexes = await collection.indexes();
      console.log(`${collectionConfig.collection}: ${indexes.length} indexes`);
    }
    
    console.log('\n🎉 Database optimization complete!');
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the script
if (require.main === module) {
  createIndexes();
}

module.exports = { createIndexes, INDEXES };