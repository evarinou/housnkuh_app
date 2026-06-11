import mongoose from 'mongoose';
import { generateProductEan } from '../utils/ean';

/**
 * Migration: Backfill internal EAN-13 for existing products
 *
 * Bestehende Produkte bekommen eine eindeutige interne EAN-13 ("22"-Präfix),
 * neue Produkte erhalten sie automatisch im pre-save Hook. Direkte updateOne-
 * Aufrufe statt .save(), damit der Flourio-Auto-Sync-Hook während der
 * Migration NICHT feuert — der Re-Sync läuft danach gezielt über den
 * Bulk-Sync-Endpoint (/api/admin/flourio/products/sync-bulk).
 */
export default {
  version: 4,
  name: 'backfill_product_ean',

  up: async () => {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const cursor = db.collection('products').find(
      { ean: { $exists: false } },
      { projection: { _id: 1 } }
    );

    let count = 0;
    for await (const doc of cursor) {
      const ean = await generateProductEan();
      await db.collection('products').updateOne({ _id: doc._id }, { $set: { ean } });
      count++;
    }

    console.log(`Backfilled EAN for ${count} products`);
    console.log('NEXT STEP: trigger Flourio bulk sync so the EANs reach flour.io');
  },

  down: async () => {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const result = await db.collection('products').updateMany({}, { $unset: { ean: 1 } });
    await db.collection<{ _id: string; seq: number }>('counters').deleteOne({ _id: 'productEan' });
    console.log(`Removed EAN from ${result.modifiedCount} products and reset counter`);
  }
};
