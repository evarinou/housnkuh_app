// Migration script to add zusatzleistungen fields to existing Vertrag documents
const mongoose = require('mongoose');

const migrationName = 'add-zusatzleistungen-to-vertrag';

async function up() {
  console.log(`Running migration: ${migrationName}`);
  
  try {
    const db = mongoose.connection.db;
    
    // Update existing contracts that don't have zusatzleistungen fields
    const result = await db.collection('vertrags').updateMany(
      { 
        $or: [
          { zusatzleistungen: { $exists: false } },
          { zusatzleistungen_kosten: { $exists: false } }
        ]
      },
      { 
        $set: { 
          'zusatzleistungen.lagerservice': false,
          'zusatzleistungen.versandservice': false,
          'zusatzleistungen.lagerservice_bestätigt': null,
          'zusatzleistungen.versandservice_aktiv': false,
          'zusatzleistungen_kosten.lagerservice_monatlich': 20,
          'zusatzleistungen_kosten.versandservice_monatlich': 5
        }
      }
    );
    
    console.log(`Migration completed successfully. Updated ${result.modifiedCount} documents.`);
    
    // Remove old zusatzleistungenTracking field if it exists
    const cleanupResult = await db.collection('vertrags').updateMany(
      { zusatzleistungenTracking: { $exists: true } },
      { $unset: { zusatzleistungenTracking: "" } }
    );
    
    console.log(`Cleanup completed. Removed old tracking fields from ${cleanupResult.modifiedCount} documents.`);
    
    return { success: true, documentsUpdated: result.modifiedCount };
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

async function down() {
  console.log(`Rolling back migration: ${migrationName}`);
  
  try {
    const db = mongoose.connection.db;
    
    // Remove the fields we added
    const result = await db.collection('vertrags').updateMany(
      {},
      { 
        $unset: { 
          'zusatzleistungen.lagerservice_bestätigt': "",
          'zusatzleistungen.versandservice_aktiv': "",
          'zusatzleistungen_kosten': ""
        }
      }
    );
    
    console.log(`Rollback completed. Updated ${result.modifiedCount} documents.`);
    return { success: true, documentsUpdated: result.modifiedCount };
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  }
}

module.exports = { up, down, migrationName };