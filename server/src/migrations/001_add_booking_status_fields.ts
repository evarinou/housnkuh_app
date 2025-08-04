import mongoose from 'mongoose';

/**
 * Migration: Add booking status fields to existing data
 * 
 * This migration:
 * 1. Adds status field to existing pendingBooking objects
 * 2. Sets requestedAt timestamp for existing bookings
 * 3. Updates status to 'confirmed' for users with contracts
 * 4. Adds scheduling fields to existing contracts
 */

export const up = async () => {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not established');
  }
  
  console.log('Starting migration: Add booking status fields...');
  
  try {
    // Step 1: Add status and requestedAt to existing bookings
    const usersWithBookings = await db.collection('users').updateMany(
      { 'pendingBooking': { $exists: true } },
      { 
        $set: { 
          'pendingBooking.status': 'pending',
          'pendingBooking.requestedAt': new Date()
        }
      }
    );
    
    console.log(`Updated ${usersWithBookings.modifiedCount} users with pending bookings`);
    
    // Step 2: Find users with contracts and update their booking status to 'confirmed'
    const contracts = await db.collection('vertraege').find({}).toArray();
    const userIdsWithContracts = [...new Set(contracts.map(c => c.user))];
    
    const confirmedBookings = await db.collection('users').updateMany(
      { 
        _id: { $in: userIdsWithContracts },
        'pendingBooking': { $exists: true }
      },
      { 
        $set: { 
          'pendingBooking.status': 'confirmed',
          'pendingBooking.confirmedAt': new Date()
        }
      }
    );
    
    console.log(`Updated ${confirmedBookings.modifiedCount} users with confirmed bookings`);
    
    // Step 3: Add scheduling fields to existing contracts
    const contractUpdates = await db.collection('vertraege').updateMany(
      {},
      {
        $set: {
          scheduledStartDate: new Date(), // Set to current date for existing contracts
          status: 'active', // Existing contracts are assumed to be active
          totalMonthlyPrice: 0, // Will need to be calculated based on services
          contractDuration: 1, // Default to 1 month
          discount: 0
        }
      }
    );
    
    console.log(`Updated ${contractUpdates.modifiedCount} contracts with scheduling fields`);
    
    // Step 4: Calculate and update availability impact for all contracts
    const allContracts = await db.collection('vertraege').find({}).toArray();
    
    for (const contract of allContracts) {
      const startDate = contract.scheduledStartDate || new Date();
      const duration = contract.contractDuration || 1;
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + duration);
      
      await db.collection('vertraege').updateOne(
        { _id: contract._id },
        {
          $set: {
            'availabilityImpact.from': startDate,
            'availabilityImpact.to': endDate
          }
        }
      );
    }
    
    console.log('Updated availability impact for all contracts');
    
    // Step 5: Link contracts to bookings where possible
    for (const contract of contracts) {
      const user = await db.collection('users').findOne({ _id: contract.user });
      if (user && user.pendingBooking) {
        await db.collection('users').updateOne(
          { _id: user._id },
          {
            $set: {
              'pendingBooking.contractId': contract._id,
              'pendingBooking.mietfachId': contract.services?.[0]?.mietfach
            }
          }
        );
      }
    }
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

export const down = async () => {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not established');
  }
  
  console.log('Rolling back migration: Remove booking status fields...');
  
  try {
    // Remove new fields from users
    await db.collection('users').updateMany(
      {},
      {
        $unset: {
          'pendingBooking.status': '',
          'pendingBooking.requestedAt': '',
          'pendingBooking.confirmedAt': '',
          'pendingBooking.scheduledStartDate': '',
          'pendingBooking.actualStartDate': '',
          'pendingBooking.mietfachId': '',
          'pendingBooking.contractId': ''
        }
      }
    );
    
    // Remove new fields from contracts
    await db.collection('vertraege').updateMany(
      {},
      {
        $unset: {
          'scheduledStartDate': '',
          'actualStartDate': '',
          'availabilityImpact': '',
          'status': '',
          'totalMonthlyPrice': '',
          'contractDuration': '',
          'discount': '',
          'packageConfiguration': ''
        }
      }
    );
    
    console.log('Rollback completed successfully!');
    
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  }
};

// Export migration info
export default {
  version: 1,
  name: 'add-booking-status-fields',
  up,
  down
};