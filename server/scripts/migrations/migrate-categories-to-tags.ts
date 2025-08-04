import mongoose from 'mongoose';
import User from '../src/models/User';
import { Tag } from '../src/models/Tag';

// Migration script to convert vendor kategorien to tag system
export const migrateCategoriestoTags = async (): Promise<void> => {
  try {
    console.log('🔄 Starting migration from kategorien to tags...');
    
    // 1. Find all vendors with kategorien (legacy field)
    const vendorsWithKategorien = await User.find({
      isVendor: true,
      'vendorProfile.kategorien': { $exists: true, $ne: [] }
    }).select('vendorProfile.kategorien vendorProfile.tags kontakt.name');
    
    console.log(`   Found ${vendorsWithKategorien.length} vendors with kategorien`);
    
    if (vendorsWithKategorien.length === 0) {
      console.log('✅ No vendors with kategorien found - migration not needed');
      return;
    }
    
    // 2. Collect all unique kategorien
    const allKategorien = new Set<string>();
    vendorsWithKategorien.forEach(vendor => {
      if (vendor.vendorProfile?.kategorien) {
        vendor.vendorProfile.kategorien.forEach(kategorie => {
          if (kategorie && kategorie.trim()) {
            allKategorien.add(kategorie.trim());
          }
        });
      }
    });
    
    console.log(`   Found ${allKategorien.size} unique kategorien:`, Array.from(allKategorien));
    
    // 3. Create or find tags for each kategorie
    const kategorieToTagMap = new Map<string, string>();
    
    for (const kategorieName of allKategorien) {
      // Try to find existing tag
      let tag = await Tag.findOne({ 
        name: kategorieName,
        category: 'product'
      });
      
      // Create tag if it doesn't exist
      if (!tag) {
        tag = new Tag({
          name: kategorieName,
          category: 'product',
          description: `Automatisch migriert von Kategorie: ${kategorieName}`,
          isActive: true
        });
        await tag.save();
        console.log(`   Created tag: ${kategorieName} (${tag._id})`);
      } else {
        console.log(`   Found existing tag: ${kategorieName} (${tag._id})`);
      }
      
      kategorieToTagMap.set(kategorieName, tag._id.toString());
    }
    
    // 4. Update each vendor
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const vendor of vendorsWithKategorien) {
      try {
        // Skip if vendor already has tags
        if (vendor.vendorProfile?.tags && vendor.vendorProfile.tags.length > 0) {
          console.log(`   Skipping ${vendor.kontakt.name} - already has tags`);
          skippedCount++;
          continue;
        }
        
        // Convert kategorien to tag IDs
        const tagIds: mongoose.Types.ObjectId[] = [];
        
        if (vendor.vendorProfile?.kategorien) {
          vendor.vendorProfile.kategorien.forEach(kategorie => {
            const tagId = kategorieToTagMap.get(kategorie.trim());
            if (tagId) {
              tagIds.push(new mongoose.Types.ObjectId(tagId));
            }
          });
        }
        
        // Update vendor with tags
        if (tagIds.length > 0) {
          await User.findByIdAndUpdate(vendor._id, {
            'vendorProfile.tags': tagIds
          });
          
          console.log(`   Migrated ${vendor.kontakt.name}: ${vendor.vendorProfile?.kategorien?.join(', ')} -> ${tagIds.length} tags`);
          migratedCount++;
        }
        
      } catch (vendorError) {
        console.error(`   Error migrating vendor ${vendor.kontakt.name}:`, vendorError);
      }
    }
    
    // 5. Summary
    console.log('\n📊 Migration Summary:');
    console.log(`   Total vendors with kategorien: ${vendorsWithKategorien.length}`);
    console.log(`   Successfully migrated: ${migratedCount}`);
    console.log(`   Skipped (already had tags): ${skippedCount}`);
    console.log(`   Created/Found tags: ${kategorieToTagMap.size}`);
    
    // 6. Verify migration
    const vendorsWithTags = await User.countDocuments({
      isVendor: true,
      'vendorProfile.tags': { $exists: true, $ne: [] }
    });
    
    console.log(`   Vendors now with tags: ${vendorsWithTags}`);
    
    console.log('✅ Migration completed successfully');
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  }
};

// Rollback function to revert migration (if needed)
export const rollbackTagMigration = async (): Promise<void> => {
  try {
    console.log('🔄 Rolling back tag migration...');
    
    // Clear all vendor tags
    const result = await User.updateMany(
      { isVendor: true },
      { $unset: { 'vendorProfile.tags': '' } }
    );
    
    console.log(`   Cleared tags from ${result.modifiedCount} vendors`);
    
    // Optionally delete migrated tags (be careful!)
    // const deleteResult = await Tag.deleteMany({ 
    //   description: { $regex: /Automatisch migriert von Kategorie/ }
    // });
    // console.log(`   Deleted ${deleteResult.deletedCount} migrated tags`);
    
    console.log('✅ Rollback completed');
    
  } catch (error) {
    console.error('❌ Error during rollback:', error);
    throw error;
  }
};

// Run directly if called from command line
if (require.main === module) {
  (async () => {
    try {
      // Connect to MongoDB
      const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/housnkuh';
      await mongoose.connect(mongoUri);
      console.log('📦 Connected to MongoDB');
      
      // Check command line arguments
      const action = process.argv[2];
      
      if (action === 'rollback') {
        await rollbackTagMigration();
      } else {
        await migrateCategoriestoTags();
      }
      
      await mongoose.disconnect();
      console.log('📦 Disconnected from MongoDB');
      console.log('🎉 Migration script completed successfully');
    } catch (error) {
      console.error('💥 Error in migration script:', error);
      process.exit(1);
    }
  })();
}