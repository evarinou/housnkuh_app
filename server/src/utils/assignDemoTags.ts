import User from '../models/User';
import { Tag } from '../models/Tag';

export const assignDemoTags = async (): Promise<void> => {
  try {
    console.log('🏷️  Assigning demo tags to test vendor...');
    
    // Find the test vendor
    const vendor = await User.findOne({ 'kontakt.email': 'yoj84229@toaik.com' });
    if (!vendor) {
      console.log('   Test vendor not found');
      return;
    }

    console.log(`   Found vendor: ${vendor.kontakt.name} (${vendor.vendorProfile?.unternehmen})`);

    // Get some product tags
    const productTags = await Tag.find({ 
      category: 'product',
      isActive: true 
    }).limit(5);

    console.log(`   Found ${productTags.length} product tags`);

    // Assign tags to vendor
    if (!vendor.vendorProfile) {
      vendor.vendorProfile = {};
    }

    vendor.vendorProfile.tags = productTags.map(tag => tag._id.toString());
    
    // Save vendor
    await vendor.save();
    
    console.log(`   Assigned ${productTags.length} tags to vendor:`);
    productTags.forEach(tag => {
      console.log(`     - ${tag.name} (${tag.slug})`);
    });

    console.log('✅ Demo tags assigned successfully');

  } catch (error) {
    console.error('❌ Error assigning demo tags:', error);
    throw error;
  }
};