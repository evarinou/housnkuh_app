import mongoose from 'mongoose';
import config from './config';

async function connectDB(): Promise<void> {
  try {
    // Enhanced connection options for performance
    await mongoose.connect(config.mongoURI, {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    });
    
    console.log('MongoDB verbunden mit optimierten Einstellungen');
    
    // Create performance indexes after connection
    await createPerformanceIndexes();
    
  } catch (error) {
    console.error('Fehler bei der Verbindung zur MongoDB:', error);
    process.exit(1);
  }
}

async function createPerformanceIndexes(): Promise<void> {
  try {
    const User = mongoose.model('User');
    
    // Compound indexes for common query patterns
    await User.collection.createIndex(
      { 'kontakt.email': 1, 'isVendor': 1, 'isFullAccount': 1 },
      { background: true, name: 'email_vendor_account_idx' }
    );
    
    await User.collection.createIndex(
      { 'registrationStatus': 1, 'isVendor': 1 },
      { background: true, name: 'registration_vendor_idx' }
    );
    
    await User.collection.createIndex(
      { 'trialStartDate': 1, 'trialEndDate': 1 },
      { background: true, name: 'trial_dates_idx' }
    );
    
    await User.collection.createIndex(
      { 'isPubliclyVisible': 1, 'kontakt.status': 1, 'kontakt.newsletterConfirmed': 1 },
      { background: true, name: 'public_visibility_idx' }
    );
    
    // Partial index for active vendors only
    await User.collection.createIndex(
      { 'isVendor': 1, 'registrationStatus': 1, 'createdAt': -1 },
      { 
        background: true,
        partialFilterExpression: { 'isVendor': true },
        name: 'active_vendors_idx'
      }
    );
    
    // Text index for vendor search
    await User.collection.createIndex(
      { 
        'vendorProfile.unternehmen': 'text',
        'vendorProfile.beschreibung': 'text',
        'kontakt.name': 'text'
      },
      { background: true, name: 'vendor_search_text_idx' }
    );
    
    console.log('Performance-Indizes erfolgreich erstellt');
  } catch (error) {
    console.warn('Warnung beim Erstellen der Performance-Indizes:', error);
  }
}

// Enable mongoose query performance monitoring
if (process.env.NODE_ENV === 'development') {
  mongoose.set('debug', (collectionName: string, method: string, query: any) => {
    console.log(`MongoDB Query: ${collectionName}.${method}`, JSON.stringify(query, null, 2));
  });
}

export default connectDB;