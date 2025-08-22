/**
 * @file newsletter-import.ts
 * @purpose Migration script to import newsletter subscribers from CSV
 * @created 2025-08-22
 */

import fs from 'fs';
import { parse } from 'csv-parse';
import mongoose from 'mongoose';
import User from '../../src/models/User';

// Database connection
const connectDB = async () => {
  try {
    // WSL to Windows MongoDB connection
    const mongoURI = process.env.MONGODB_URI || 'mongodb://host.docker.internal:27017/housnkuh';
    await mongoose.connect(mongoURI);
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.error('💡 Trying alternative Windows host connection...');
    try {
      // WSL to Windows connection using resolv.conf nameserver
      const alternativeURI = 'mongodb://10.255.255.254:27017/housnkuh';
      await mongoose.connect(alternativeURI);
      console.log('✅ Database connected successfully (alternative host)');
    } catch (altError) {
      console.error('💡 Trying gateway IP connection...');
      try {
        // WSL default gateway connection
        const gatewayURI = 'mongodb://172.23.192.1:27017/housnkuh';
        await mongoose.connect(gatewayURI);
        console.log('✅ Database connected successfully (gateway IP)');
      } catch (gatewayError) {
        console.error('❌ All connection attempts failed');
        console.error('💡 Make sure MongoDB is running on Windows and accessible from WSL');
        console.error('Original error:', error);
        console.error('Nameserver error:', altError);
        console.error('Gateway error:', gatewayError);
        process.exit(1);
      }
    }
  }
};

// CSV row interface based on newsletter.csv structure
interface NewsletterCSVRow {
  id: string;
  email: string;
  type: 'customer' | 'vendor';
  subscribedAt: string;
  active: string; // '1' or '0'
  confirmed: string; // '1' or '0'
  confirmation_token: string;
  confirmation_date: string | null;
  last_email_sent: string | null;
  open_count: string;
  click_count: string;
}

// Parse CSV data
const parseCSV = (filePath: string): Promise<NewsletterCSVRow[]> => {
  return new Promise((resolve, reject) => {
    const results: NewsletterCSVRow[] = [];
    
    fs.createReadStream(filePath)
      .pipe(parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
        quote: '"',
        escape: '"'
      }))
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
};

// Create User entry for newsletter subscriber
const createNewsletterUser = async (row: NewsletterCSVRow) => {
  try {
    // Check if user with this email already exists
    const existingUser = await User.findOne({ 'kontakt.email': row.email });
    if (existingUser) {
      // Update existing user to enable newsletter
      existingUser.kontakt.mailNewsletter = row.active === '1';
      existingUser.kontakt.newsletterConfirmed = true; // Imported newsletter subscribers are pre-confirmed
      existingUser.kontakt.newslettertype = row.type;
      if (row.confirmation_token && !existingUser.kontakt.confirmationToken) {
        existingUser.kontakt.confirmationToken = row.confirmation_token;
      }
      await existingUser.save();
      console.log(`✅ Updated existing user: ${row.email} (${row.type})`);
      return existingUser;
    }

    // Create new newsletter-only user
    const user = new User({
      username: row.email, // Use email as username for newsletter users
      isFullAccount: false, // Newsletter-only user
      isVendor: row.type === 'vendor',
      email: row.email, // Top-level email for compatibility
      kontakt: {
        name: row.email.split('@')[0], // Use email prefix as name
        email: row.email,
        newslettertype: row.type,
        mailNewsletter: row.active === '1',
        newsletterConfirmed: true, // Imported newsletter subscribers are pre-confirmed
        confirmationToken: row.confirmation_token || null,
        status: row.active === '1' ? 'aktiv' : 'inaktiv'
      },
      registrationDate: new Date(row.subscribedAt),
      registrationStatus: 'active' // Newsletter subscribers are active
    });
    
    await user.save();
    console.log(`✅ Created newsletter user: ${user.kontakt.email} (${row.type})`);
    return user;
  } catch (error) {
    console.error(`❌ Failed to create newsletter user for ${row.email}:`, error);
    throw error;
  }
};

// Main migration function
const runMigration = async (csvFilePath: string) => {
  try {
    console.log('🚀 Starting newsletter migration...');
    
    // Connect to database
    await connectDB();
    
    // Check if file exists
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`CSV file not found: ${csvFilePath}`);
    }
    
    // Parse CSV
    console.log('📄 Parsing CSV file...');
    const rows = await parseCSV(csvFilePath);
    console.log(`📊 Found ${rows.length} newsletter subscribers to process`);
    
    let createdCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    let customerCount = 0;
    let vendorCount = 0;
    
    // Process each row
    for (const row of rows) {
      try {
        console.log(`Processing: ${row.email} (${row.type})`);
        
        // Check if user already exists
        const existingUser = await User.findOne({ 'kontakt.email': row.email });
        
        await createNewsletterUser(row);
        
        if (existingUser) {
          updatedCount++;
        } else {
          createdCount++;
        }
        
        if (row.type === 'customer') {
          customerCount++;
        } else if (row.type === 'vendor') {
          vendorCount++;
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error processing row for ${row.email}:`, error);
      }
    }
    
    // Summary
    console.log('\n📊 Newsletter Migration Summary:');
    console.log(`✅ Users created: ${createdCount}`);
    console.log(`✅ Users updated: ${updatedCount}`);
    console.log(`📧 Customer subscribers: ${customerCount}`);
    console.log(`🏪 Vendor subscribers: ${vendorCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📊 Total processed: ${rows.length}`);
    
  } catch (error) {
    console.error('❌ Newsletter migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// CLI interface
if (require.main === module) {
  const csvFilePath = process.argv[2];
  
  if (!csvFilePath) {
    console.error('❌ Usage: npx tsx server/scripts/migrations/newsletter-import.ts <path-to-csv-file>');
    console.error('❌ Example: npx tsx server/scripts/migrations/newsletter-import.ts /path/to/newsletter.csv');
    process.exit(1);
  }
  
  runMigration(csvFilePath)
    .then(() => {
      console.log('✅ Newsletter migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Newsletter migration failed:', error);
      process.exit(1);
    });
}

export { runMigration };