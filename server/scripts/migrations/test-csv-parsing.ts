/**
 * @file test-csv-parsing.ts
 * @purpose Test CSV parsing logic without database connection
 * @created 2025-08-22
 */

import fs from 'fs';
import { parse } from 'csv-parse';

// CSV row interface
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

// Test data structure creation
const testDataStructures = (rows: CSVRow[]) => {
  console.log(`\n📊 Testing data structures for ${rows.length} rows...\n`);
  
  let contactCount = 0;
  let vendorContestCount = 0;
  let errorCount = 0;
  
  rows.slice(0, 5).forEach((row, index) => {
    try {
      console.log(`--- Row ${index + 1}: ${row.name} (${row.form_type}) ---`);
      const fullData = JSON.parse(row.full_data);
      
      if (row.form_type === 'vendor-contest') {
        // Parse vendor contest data
        let guessedVendors: string[] = [];
        if (fullData.guessedVendors) {
          try {
            guessedVendors = JSON.parse(fullData.guessedVendors);
          } catch {
            guessedVendors = [
              fullData.vendor1,
              fullData.vendor2,
              fullData.vendor3
            ].filter(Boolean);
          }
        }
        
        console.log(`📝 VendorContest Data:`);
        console.log(`   Name: ${row.name}`);
        console.log(`   Email: ${row.email}`);
        console.log(`   Phone: ${fullData.phone || 'N/A'}`);
        console.log(`   Guessed Vendors: ${guessedVendors.join(', ')}`);
        console.log(`   Created: ${row.created_at}`);
        vendorContestCount++;
        
      } else if (row.form_type === 'contact' || row.form_type === 'rental') {
        // Parse contact data
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
        
        console.log(`📧 Contact Data:`);
        console.log(`   Name: ${row.name}`);
        console.log(`   Email: ${row.email}`);
        console.log(`   Phone: ${fullData.phone || 'N/A'}`);
        console.log(`   Subject: ${subject}`);
        console.log(`   Message: ${message.substring(0, 100)}...`);
        console.log(`   Created: ${row.created_at}`);
        contactCount++;
      }
      
      console.log('');
      
    } catch (error) {
      console.error(`❌ Error processing row ${index + 1}:`, error);
      errorCount++;
    }
  });
  
  console.log(`\n📊 Test Summary (first 5 rows):`);
  console.log(`✅ Contacts: ${contactCount}`);
  console.log(`✅ Vendor contests: ${vendorContestCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  
  console.log(`\n📈 Full CSV Summary:`);
  const formTypeCounts = rows.reduce((acc, row) => {
    acc[row.form_type] = (acc[row.form_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  Object.entries(formTypeCounts).forEach(([type, count]) => {
    console.log(`   ${type}: ${count} entries`);
  });
  console.log(`   Total: ${rows.length} entries`);
};

// Main test function
const testCSVParsing = async (csvFilePath: string) => {
  try {
    console.log('🧪 Testing CSV parsing logic...');
    
    // Check if file exists
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`CSV file not found: ${csvFilePath}`);
    }
    
    // Parse CSV
    console.log('📄 Parsing CSV file...');
    const rows = await parseCSV(csvFilePath);
    
    // Test data structures
    testDataStructures(rows);
    
  } catch (error) {
    console.error('❌ CSV parsing test failed:', error);
    process.exit(1);
  }
};

// CLI interface
if (require.main === module) {
  const csvFilePath = process.argv[2];
  
  if (!csvFilePath) {
    console.error('❌ Usage: npx tsx server/scripts/migrations/test-csv-parsing.ts <path-to-csv-file>');
    console.error('❌ Example: npx tsx server/scripts/migrations/test-csv-parsing.ts /path/to/form_submissions.csv');
    process.exit(1);
  }
  
  testCSVParsing(csvFilePath)
    .then(() => {
      console.log('✅ CSV parsing test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ CSV parsing test failed:', error);
      process.exit(1);
    });
}

export { testCSVParsing };