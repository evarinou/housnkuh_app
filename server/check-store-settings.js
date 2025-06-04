const Settings = require('./dist/models/Settings').default;
const mongoose = require('mongoose');

async function checkStoreSettings() {
  try {
    await mongoose.connect('mongodb://localhost:27017/housnkuh');
    
    console.log('Getting current store settings...');
    const settings = await Settings.getSettings();
    
    console.log('Store Opening Settings:');
    console.log('- Enabled:', settings.storeOpening.enabled);
    console.log('- Opening Date:', settings.storeOpening.openingDate);
    console.log('- Is Store Open:', settings.isStoreOpen());
    console.log('- Reminder Days:', settings.storeOpening.reminderDays);
    console.log('- Last Modified:', settings.storeOpening.lastModified);
    console.log('- Modified By:', settings.storeOpening.modifiedBy);
    
    // Store als geöffnet markieren
    console.log('\nUpdating store to be open...');
    await settings.updateStoreOpening(
      null, // kein Opening Date (sofort geöffnet)
      false, // store opening deaktiviert
      'debug-script'
    );
    
    console.log('Store updated! Checking new status...');
    const updatedSettings = await Settings.getSettings();
    console.log('- New Is Store Open:', updatedSettings.isStoreOpen());
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkStoreSettings();