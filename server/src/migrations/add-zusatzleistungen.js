const mongoose = require('mongoose');

/**
 * Migration to add zusatzleistungen field to existing Vertrag documents
 * This migration adds lager- and versandservice options to all existing contracts
 */
module.exports = {
  /**
   * Apply the migration - add zusatzleistungen to existing contracts
   */
  async up() {
    try {
      const Vertrag = mongoose.model('Vertrag');
      
      console.log('Starting migration: Adding zusatzleistungen to existing contracts...');
      
      // Add zusatzleistungen to all existing contracts that don't have it
      const result = await Vertrag.updateMany(
        { zusatzleistungen: { $exists: false } },
        { 
          $set: { 
            zusatzleistungen: {
              lagerservice: false,
              versandservice: false
            }
          }
        }
      );
      
      console.log(`Migration completed: Updated ${result.modifiedCount} contracts with zusatzleistungen fields`);
      return result;
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  },

  /**
   * Rollback the migration - remove zusatzleistungen field
   */
  async down() {
    try {
      const Vertrag = mongoose.model('Vertrag');
      
      console.log('Starting rollback: Removing zusatzleistungen from contracts...');
      
      // Remove zusatzleistungen field from all contracts
      const result = await Vertrag.updateMany(
        {},
        { $unset: { zusatzleistungen: "" } }
      );
      
      console.log(`Rollback completed: Removed zusatzleistungen from ${result.modifiedCount} contracts`);
      return result;
    } catch (error) {
      console.error('Rollback failed:', error);
      throw error;
    }
  }
};