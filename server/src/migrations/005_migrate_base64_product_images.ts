import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';

/**
 * Migration: Base64-Produktbilder aus MongoDB in Dateien auslagern
 *
 * Bisher wurden Produktbilder als data:-URLs direkt im Dokument gespeichert
 * (bis zu 10 MB pro Produkt). Diese Migration dekodiert sie nach
 * uploads/product-images/ und ersetzt die Array-Einträge durch /uploads/-Pfade.
 * Nicht-Base64-Einträge (URLs) bleiben unverändert.
 */

const UPLOAD_DIR = path.join(__dirname, '../../uploads/product-images');

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

function decodeDataUrlToFile(dataUrl: string, baseName: string): string | null {
  const match = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  if (!match) {
    return null;
  }
  const [, mime, b64] = match;
  const ext = EXT_BY_MIME[mime.toLowerCase()] || '.bin';
  const filename = `${baseName}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), Buffer.from(b64, 'base64'));
  return `/uploads/product-images/${filename}`;
}

export default {
  version: 5,
  name: 'migrate_base64_product_images',

  up: async () => {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    const cursor = db.collection('products').find(
      { images: { $elemMatch: { $regex: '^data:image/' } } },
      { projection: { _id: 1, images: 1 } }
    );

    let migratedProducts = 0;
    let migratedImages = 0;
    let skippedImages = 0;

    for await (const doc of cursor) {
      const images: string[] = doc.images || [];
      const newImages = images.map((img, idx) => {
        if (!img.startsWith('data:')) {
          return img;
        }
        const filePath = decodeDataUrlToFile(img, `${doc._id}-${idx}`);
        if (filePath) {
          migratedImages++;
          return filePath;
        }
        // Unlesbare data:-URL — entfernen statt weiter Speicher zu fressen
        skippedImages++;
        return null;
      }).filter((img): img is string => img !== null);

      await db.collection('products').updateOne(
        { _id: doc._id },
        { $set: { images: newImages } }
      );
      migratedProducts++;
    }

    console.log(
      `Migrated ${migratedImages} images across ${migratedProducts} products` +
      (skippedImages ? ` (${skippedImages} unreadable entries dropped)` : '')
    );
  },

  down: async () => {
    // Best-effort: Dateien bleiben liegen, Rückumwandlung zu Base64 ist nicht sinnvoll
    console.log('005 down: no-op (files in uploads/product-images are kept)');
  }
};
