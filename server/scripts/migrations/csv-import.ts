/**
 * @file csv-import.ts
 * @purpose Migration script to import form submissions from old website CSV
 * @created 2025-08-22
 */

import fs from 'fs';
import { parse } from 'csv-parse';
import mongoose from 'mongoose';
import Contact from '../../src/models/Contact';
import VendorContest from '../../src/models/VendorContest';

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
        console.error('💡 Try: netsh interface portproxy add v4tov4 listenport=27017 listenaddress=0.0.0.0 connectport=27017 connectaddress=127.0.0.1');
        console.error('Original error:', error);
        console.error('Nameserver error:', altError);
        console.error('Gateway error:', gatewayError);
        process.exit(1);
      }
    }
  }
};

// CSV row interface based on your structure
interface CSVRow {
  id: string;
  form_type: 'vendor-contest' | 'contact' | 'rental';
  name: string;
  email: string;
  summary: string;
  full_data: string; // JSON string
  ip_address: string;
  created_at: string;
}

// Parse CSV data
const parseCSV = (filePath: string): Promise<CSVRow[]> => {
  return new Promise((resolve, reject) => {
    const results: CSVRow[] = [];
    
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

// Create Contact entry from contact or rental form
const createContact = async (row: CSVRow) => {
  try {
    const fullData = JSON.parse(row.full_data);
    
    // Handle different contact types
    let subject = 'Imported from old website';
    let message = 'No message provided';
    
    if (row.form_type === 'contact') {
      subject = fullData.subject || 'Allgemeine Anfrage';
      message = fullData.message || 'No message provided';
    } else if (row.form_type === 'rental') {
      subject = 'Verkaufsfläche mieten';
      message = `Geschäftsname: ${fullData.businessName || 'N/A'}\n` +
                `Kontaktperson: ${fullData.contactPerson || 'N/A'}\n` +
                `Produkttyp: ${fullData.productType || 'N/A'}\n` +
                `Regal-Typ: ${fullData.spaceType || 'N/A'}\n` +
                `Nachricht: ${fullData.message || 'Keine Nachricht'}`;
    }
    
    const contact = new Contact({
      name: row.name,
      email: row.email,
      phone: fullData.phone || undefined,
      subject,
      message,
      isRead: false,
      isResolved: false,
      createdAt: new Date(row.created_at),
      updatedAt: new Date()
    });
    
    await contact.save();
    console.log(`✅ Created contact: ${contact.name} (${row.form_type})`);
    return contact;
  } catch (error) {
    console.error(`❌ Failed to create contact for ${row.email}:`, error);
    throw error;
  }
};

// Create VendorContest entry
const createVendorContest = async (row: CSVRow) => {
  try {
    const fullData = JSON.parse(row.full_data);
    
    // Parse guessed vendors from JSON string
    let guessedVendors: string[] = [];
    if (fullData.guessedVendors) {
      try {
        guessedVendors = JSON.parse(fullData.guessedVendors);
      } catch {
        // Fallback: use individual vendor fields
        guessedVendors = [
          fullData.vendor1,
          fullData.vendor2,
          fullData.vendor3
        ].filter(Boolean);
      }
    }
    
    const vendorContest = new VendorContest({
      name: row.name,
      email: row.email,
      phone: fullData.phone || undefined,
      guessedVendors,
      isRead: false,
      createdAt: new Date(row.created_at),
      updatedAt: new Date()
    });
    
    await vendorContest.save();
    console.log(`✅ Created vendor contest: ${vendorContest.name} (${guessedVendors.length} vendors)`);
    return vendorContest;
  } catch (error) {
    console.error(`❌ Failed to create vendor contest for ${row.email}:`, error);
    throw error;
  }
};

// Main migration function
const runMigration = async (csvFilePath: string) => {
  try {
    console.log('🚀 Starting CSV migration...');
    
    // Connect to database
    await connectDB();
    
    // Check if file exists
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`CSV file not found: ${csvFilePath}`);
    }
    
    // Parse CSV
    console.log('📄 Parsing CSV file...');
    const rows = await parseCSV(csvFilePath);
    console.log(`📊 Found ${rows.length} rows to process`);
    
    let contactCount = 0;
    let vendorContestCount = 0;
    let errorCount = 0;
    
    // Process each row
    for (const row of rows) {
      try {
        console.log(`Processing: ${row.name} (${row.form_type})`);
        
        if (row.form_type === 'vendor-contest') {
          await createVendorContest(row);
          vendorContestCount++;
        } else if (row.form_type === 'contact' || row.form_type === 'rental') {
          await createContact(row);
          contactCount++;
        } else {
          console.warn(`⚠️  Unknown form type: ${row.form_type} for ${row.email}`);
          errorCount++;
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error processing row for ${row.email}:`, error);
      }
    }
    
    // Summary
    console.log('\n📊 Migration Summary:');
    console.log(`✅ Contacts created: ${contactCount}`);
    console.log(`✅ Vendor contests created: ${vendorContestCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📊 Total processed: ${rows.length}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
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
    console.error('❌ Usage: npx tsx server/scripts/migrations/csv-import.ts <path-to-csv-file>');
    console.error('❌ Example: npx tsx server/scripts/migrations/csv-import.ts /path/to/form_submissions.csv');
    process.exit(1);
  }
  
  runMigration(csvFilePath)
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

export { runMigration };