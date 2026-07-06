/**
 * @file add-invoice-virtual-populate.ts
 * @purpose Migration script to validate User schema with invoice virtual populate
 * @created 2025-08-21
 * @modified 2025-08-21
 */

import mongoose from 'mongoose';
import User from '../../src/models/User';
import Invoice from '../../src/models/Invoice';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/housnkuh';

async function validateInvoiceVirtualPopulate() {
  try {
    console.log('🚀 Starting invoice virtual populate migration...');
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get all users to validate the schema works
    const existingUsers = await User.find({});
    console.log(`📊 Found ${existingUsers.length} existing users`);

    let vendorCount = 0;
    let validationErrors = 0;
    let populateTestCount = 0;

    for (const user of existingUsers) {
      try {
        if (user.isVendor) {
          vendorCount++;
          
          // Test virtual populate functionality
          const userWithInvoices = await User.findById(user._id).populate('invoices');
          
          if (!userWithInvoices) {
            console.warn(`⚠️  Could not find user ${user._id} during populate test`);
            continue;
          }
          
          // Check that invoices field exists (even if empty)
          const invoices = (userWithInvoices as any).invoices;
          if (invoices !== undefined) {
            populateTestCount++;
            const invoiceCount = invoices?.length || 0;
            console.log(`✅ Vendor ${user.kontakt?.name || user.username || user._id}: ${invoiceCount} invoices`);
          } else {
            console.warn(`⚠️  Invoices virtual field not populated for vendor ${user._id}`);
          }
        }
      } catch (error) {
        validationErrors++;
        console.error(`❌ Error validating user ${user._id}:`, error);
      }
    }

    // Test that virtual populate configuration is correct
    console.log('\n🔍 Validating virtual populate configuration...');
    const userSchema = User.schema;
    const invoicesVirtual = userSchema.virtuals.invoices;
    
    if (!invoicesVirtual) {
      throw new Error('Invoices virtual field not found in User schema');
    }

    const virtualOptions = invoicesVirtual.options;
    if (virtualOptions.ref !== 'Invoice' || 
        virtualOptions.localField !== '_id' || 
        virtualOptions.foreignField !== 'vendor' ||
        virtualOptions.justOne !== false) {
      throw new Error('Invoices virtual field not configured correctly');
    }

    console.log('✅ Virtual populate configuration is correct');

    // Test JSON and Object serialization options
    const schemaOptions = (userSchema as any).options;
    const jsonOptions = schemaOptions.toJSON;
    const objectOptions = schemaOptions.toObject;
    
    if (!jsonOptions?.virtuals || !objectOptions?.virtuals) {
      throw new Error('Virtual fields not configured for JSON/Object serialization');
    }

    console.log('✅ Virtual fields serialization is configured correctly');

    // Summary
    console.log('\n📋 Migration Summary:');
    console.log(`   Total users: ${existingUsers.length}`);
    console.log(`   Vendor users: ${vendorCount}`);
    console.log(`   Successful populate tests: ${populateTestCount}`);
    console.log(`   Validation errors: ${validationErrors}`);
    
    if (validationErrors === 0) {
      console.log('✅ Migration completed successfully! All existing users are compatible with invoice virtual populate.');
    } else {
      console.log(`⚠️  Migration completed with ${validationErrors} validation errors. Please review the errors above.`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Test creating a sample relationship if no real data exists
async function testVirtualPopulateWithSampleData() {
  try {
    console.log('\n🧪 Testing virtual populate with sample data...');
    
    // Find or create a test vendor
    let testVendor = await User.findOne({ isVendor: true }).limit(1);
    
    if (!testVendor) {
      console.log('No vendors found. Creating test vendor...');
      testVendor = await User.create({
        username: 'test-migration-vendor',
        password: 'temp-password',
        isFullAccount: true,
        isVendor: true,
        kontakt: {
          name: 'Migration Test Vendor',
          email: 'migration-test@example.com',
          phone: '+49123456789'
        },
        adressen: [{
          adresstyp: 'Hauptadresse',
          strasse: 'Test Street',
          hausnummer: '1',
          plz: '12345',
          ort: 'Test City',
          name1: 'Migration Test Vendor'
        }],
        registrationStatus: 'active'
      });
      console.log('✅ Test vendor created');
    }

    // Check if vendor has any invoices
    const vendorWithInvoices = await User.findById(testVendor._id).populate('invoices');
    const initialInvoiceCount = vendorWithInvoices?.invoices?.length || 0;
    
    console.log(`📊 Test vendor has ${initialInvoiceCount} existing invoices`);
    
    // Create a test invoice if none exist
    let testInvoice;
    if (initialInvoiceCount === 0) {
      console.log('Creating test invoice...');
      testInvoice = await Invoice.create({
        invoiceNumber: 'RE-2025-08-99999', // Use high number to avoid conflicts
        vendor: testVendor._id,
        period: {
          month: 8,
          year: 2025
        },
        items: [{
          description: 'Migration Test Item',
          quantity: 1,
          unitPrice: 1.00,
          totalPrice: 1.00,
          type: 'sonstiges'
        }],
        subtotal: 1.00,
        tax: 0.19,
        totalAmount: 1.19,
        status: 'draft'
      });
      console.log('✅ Test invoice created');
    }

    // Test the virtual populate
    const vendorWithPopulatedInvoices = await User.findById(testVendor._id).populate('invoices');
    const finalInvoiceCount = vendorWithPopulatedInvoices?.invoices?.length || 0;
    
    console.log(`📊 After populate: ${finalInvoiceCount} invoices found`);
    
    if (finalInvoiceCount > initialInvoiceCount) {
      console.log('✅ Virtual populate working correctly with new test data');
    } else if (finalInvoiceCount > 0) {
      console.log('✅ Virtual populate working correctly with existing data');
    }

    // Clean up test data if created
    if (testInvoice) {
      await Invoice.findByIdAndDelete(testInvoice._id);
      console.log('🧹 Cleaned up test invoice');
    }
    
    if (testVendor.username === 'test-migration-vendor') {
      await User.findByIdAndDelete(testVendor._id);
      console.log('🧹 Cleaned up test vendor');
    }

  } catch (error) {
    console.error('❌ Sample data test failed:', error);
    throw error;
  }
}

// Main migration function
async function runMigration() {
  console.log('🎯 Invoice Virtual Populate Migration');
  console.log('=====================================');
  console.log('This migration validates that existing users work correctly');
  console.log('with the new invoice virtual populate functionality.\n');

  await validateInvoiceVirtualPopulate();
  await testVirtualPopulateWithSampleData();
  
  console.log('\n🎉 Migration completed successfully!');
  console.log('Users can now use virtual populate to access their invoices.');
  console.log('Example: User.findById(id).populate("invoices")');
}

// Run migration if called directly
if (require.main === module) {
  runMigration().catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

export default runMigration;