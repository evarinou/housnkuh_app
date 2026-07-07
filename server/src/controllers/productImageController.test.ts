/**
 * @file productImageController.test.ts
 * @purpose Tests for the product image upload endpoint (multipart, size/mime limits)
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { createTestApp } from '../../tests/testApp';
import config from '../config/config';

const app = createTestApp();
const vendorToken = jwt.sign(
  { id: new mongoose.Types.ObjectId().toString(), isVendor: true },
  config.jwtSecret
);

// Minimal valid PNG (1×1 px)
const PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

const uploadedFiles: string[] = [];

afterAll(() => {
  // Test-Uploads wieder aufräumen
  for (const url of uploadedFiles) {
    const filePath = path.join(__dirname, '../../uploads', url.replace('/uploads/', ''));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});

describe('POST /api/vendor-auth/products/upload-image', () => {
  it('uploads a PNG and returns the /uploads URL', async () => {
    const res = await request(app)
      .post('/api/vendor-auth/products/upload-image')
      .set('Authorization', `Bearer ${vendorToken}`)
      .attach('image', PNG_BUFFER, { filename: 'test.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.imageUrl).toMatch(/^\/uploads\/product-images\/product-.*\.png$/);
    uploadedFiles.push(res.body.imageUrl);
  });

  it('rejects disallowed mime types', async () => {
    const res = await request(app)
      .post('/api/vendor-auth/products/upload-image')
      .set('Authorization', `Bearer ${vendorToken}`)
      .attach('image', Buffer.from('GIF89a'), { filename: 'test.gif', contentType: 'image/gif' });

    expect(res.status).toBe(400);
  });

  it('rejects requests without a file', async () => {
    const res = await request(app)
      .post('/api/vendor-auth/products/upload-image')
      .set('Authorization', `Bearer ${vendorToken}`);

    expect(res.status).toBe(400);
  });

  it('requires authentication', async () => {
    const res = await request(app)
      .post('/api/vendor-auth/products/upload-image')
      .attach('image', PNG_BUFFER, { filename: 'test.png', contentType: 'image/png' });

    expect(res.status).toBe(401);
  });
});
