/**
 * @file vendorProductController.test.ts
 * @purpose Integration tests for vendor product create/update incl. validation and slug/EAN generation
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { createTestApp } from '../../../tests/testApp';
import { Product } from '../../models/Product';
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

const vendorId = new mongoose.Types.ObjectId().toString();
const vendorToken = jwt.sign({ id: vendorId, isVendor: true }, config.jwtSecret);

const validPayload = {
  name: 'Bio-Äpfel Elstar',
  description: 'Knackige Äpfel vom Hof, ungespritzt.',
  price: 4.5,
  priceUnit: 'kg'
};

const postProduct = (payload: object) =>
  request(app)
    .post('/api/vendor-auth/products')
    .set('Authorization', `Bearer ${vendorToken}`)
    .send(payload);

describe('POST /api/vendor-auth/products', () => {
  it('creates a product with slug and EAN generated', async () => {
    const res = await postProduct(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.slug).toBe('bio-aepfel-elstar');
    expect(res.body.data.ean).toMatch(/^22\d{11}$/);
    expect(res.body.data.vendorId).toBe(vendorId);
  });

  it('rejects a missing price', async () => {
    const { price, ...rest } = validPayload;
    const res = await postProduct(rest);
    expect(res.status).toBe(400);
  });

  it('rejects a non-numeric price', async () => {
    const res = await postProduct({ ...validPayload, price: 'abc' });
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'price')).toBe(true);
  });

  it('rejects a negative price', async () => {
    const res = await postProduct({ ...validPayload, price: -1 });
    expect(res.status).toBe(400);
  });

  it('rejects a price with more than 2 decimals', async () => {
    const res = await postProduct({ ...validPayload, price: 9.999 });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid priceUnit and availability', async () => {
    expect((await postProduct({ ...validPayload, priceUnit: 'tons' })).status).toBe(400);
    expect((await postProduct({ ...validPayload, availability: 'limited' })).status).toBe(400);
  });

  it('rejects non-ObjectId tags', async () => {
    const res = await postProduct({ ...validPayload, tags: ['nicht-mongo'] });
    expect(res.status).toBe(400);
  });

  it('appends a suffix instead of failing on duplicate names (slug collision)', async () => {
    const first = await postProduct(validPayload);
    const second = await postProduct(validPayload);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.data.slug).toBe('bio-aepfel-elstar');
    expect(second.body.data.slug).toBe('bio-aepfel-elstar-2');
  });

  it('assigns unique EANs to consecutive products', async () => {
    const a = await postProduct(validPayload);
    const b = await postProduct({ ...validPayload, name: 'Birnen' });
    expect(a.body.data.ean).not.toBe(b.body.data.ean);
  });

  it('requires a vendor token', async () => {
    const res = await request(app).post('/api/vendor-auth/products').send(validPayload);
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/vendor-auth/products/:id', () => {
  it('updates fields but never the EAN', async () => {
    const created = await postProduct(validPayload);
    const id = created.body.data._id;
    const originalEan = created.body.data.ean;

    const res = await request(app)
      .put(`/api/vendor-auth/products/${id}`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ price: 5.0, name: 'Bio-Äpfel Boskoop' });

    expect(res.status).toBe(200);
    expect(res.body.data.price).toBe(5.0);
    expect(res.body.data.slug).toBe('bio-aepfel-boskoop');
    expect(res.body.data.ean).toBe(originalEan);

    const inDb = await Product.findById(id).lean();
    expect(inDb!.ean).toBe(originalEan);
  });

  it('rejects an invalid price on update', async () => {
    const created = await postProduct(validPayload);
    const res = await request(app)
      .put(`/api/vendor-auth/products/${created.body.data._id}`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ price: Number.NaN });

    expect(res.status).toBe(400);
  });

  it('returns 404 for a foreign vendor product', async () => {
    const created = await postProduct(validPayload);
    const otherToken = jwt.sign(
      { id: new mongoose.Types.ObjectId().toString(), isVendor: true },
      config.jwtSecret
    );

    const res = await request(app)
      .put(`/api/vendor-auth/products/${created.body.data._id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ price: 1 });

    expect(res.status).toBe(404);
  });
});
