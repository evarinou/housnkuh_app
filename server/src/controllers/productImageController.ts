/**
 * @file productImageController.ts
 * @purpose Product image upload endpoint (replaces base64-in-MongoDB storage)
 * @created 2026-06-10
 *
 * Bilder landen als Dateien unter uploads/product-images/ und werden über
 * den bestehenden statischen /uploads-Handler ausgeliefert. Produkte
 * speichern nur noch die URL (/uploads/product-images/...).
 */

import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import logger from '../utils/logger';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_MB = 2;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/product-images');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(file.originalname).toLowerCase();
    cb(null, `product-${uniqueSuffix}${fileExtension}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Nur JPG, PNG oder WebP sind erlaubt'));
    }
  }
});

/**
 * POST /api/vendor-auth/products/upload-image (vendorAuth)
 * POST /api/admin/products/upload-image (adminAuth)
 * Multipart field name: "image". Response: { success, imageUrl }
 */
export const uploadProductImage = (req: Request, res: Response): void => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({
          success: false,
          message: `Datei ist zu groß. Maximum ${MAX_FILE_SIZE_MB}MB erlaubt.`
        });
        return;
      }
      res.status(400).json({
        success: false,
        message: err.message || 'Fehler beim Upload'
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'Keine Datei hochgeladen'
      });
      return;
    }

    const imageUrl = `/uploads/product-images/${req.file.filename}`;
    logger.info('[ProductImage] Image uploaded', { imageUrl });

    res.json({
      success: true,
      imageUrl,
      message: 'Bild erfolgreich hochgeladen'
    });
  });
};
