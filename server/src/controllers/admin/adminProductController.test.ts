/**
 * @file adminProductController.test.ts
 * @purpose Integration tests for admin product creation/editing on behalf of vendors
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { createTestApp } from '../../../tests/testApp';
import User from '../../models/User';
import config from '../../config/config';

// Silence the Flourio auto-sync triggered by the Product post-save hook
jest.mock('../../services/flourio/services/ArticleService', () => ({
  ArticleService: jest.fn().mockImplementation(() => ({
    syncProduct: jest.fn().mockResolvedValue({ article: { id: 'mock' }, created: true })
  }))
}));
jest.mock('../../services/flourio/client/FlourioClient', () => ({
  FlourioClient: jest.fn()
}));
jest.mock('../../services/flourio/client/config', () => ({
  flourioConfig: {},
  flourioTenantConfig: {}
}));

const app = createTestApp();

const adminToken = jwt.sign(
  { id: new mongoose.Types.ObjectId().toString(), isAdmin: true },
  config.jwtSecret
);

async function createVendorUser() {
  const user = await User.create({
    username: `vendor-${new mongoose.Types.ObjectId().toString()}`,
    password: 'hashedpassword123',
    isFullAccount: true,
    isVendor: true,
    kontakt: {
      name: 'Test Vendor',
      email: `vendor-${Date.now()}-${Math.random()}@test.de`
    },
    registrationStatus: 'active'
  });
  return user;
}

const basePayload = {
  name: 'Hofkäse',
  description: 'Würziger Schnittkäse aus Rohmilch.',
  price: 6.9,
  priceUnit: 'piece'
};

describe('POST /api/admin/products', () => {
  it('creates a product for an existing vendor', async () => {
    const vendor = await createVendorUser();

    const res = await request(app)
      .post('/api/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...basePayload, vendorId: String(vendor._id) });

    expect(res.status).toBe(201);
    expect(res.body.data.vendorId).toBe(String(vendor._id));
    expect(res.body.data.ean).toMatch(/^22\d{11}$/);
  });

  it('rejects a missing or unknown vendorId', async () => {
    const noVendor = await request(app)
      .post('/api/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(basePayload);
    expect(noVendor.status).toBe(400);

    const unknownVendor = await request(app)
      .post('/api/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...basePayload, vendorId: new mongoose.Types.ObjectId().toString() });
    expect(unknownVendor.status).toBe(400);
  });

  it('rejects non-admin tokens', async () => {
    const vendorToken = jwt.sign(
      { id: new mongoose.Types.ObjectId().toString(), isVendor: true },
      config.jwtSecret
    );

    const res = await request(app)
      .post('/api/admin/products')
      .set('Authorization', `Bearer ${vendorToken}`)
      .send(basePayload);

    expect(res.status).toBe(403);
  });
});

describe('PUT /api/admin/products/:id', () => {
  it('updates any vendor product without ownership restriction', async () => {
    const vendor = await createVendorUser();
    const created = await request(app)
      .post('/api/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...basePayload, vendorId: String(vendor._id) });

    const res = await request(app)
      .put(`/api/admin/products/${created.body.data._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ price: 7.5 });

    expect(res.status).toBe(200);
    expect(res.body.data.price).toBe(7.5);
  });

  it('returns 404 for unknown products', async () => {
    const res = await request(app)
      .put(`/api/admin/products/${new mongoose.Types.ObjectId().toString()}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ price: 1 });

    expect(res.status).toBe(404);
  });
});
