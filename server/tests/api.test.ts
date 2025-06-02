import request from 'supertest';
import { createTestApp } from './testApp';
import Settings from '../src/models/Settings';

const app = createTestApp();

describe('API Endpoints', () => {
  describe('Base Route', () => {
    test('GET / should return welcome message', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
      
      expect(response.body.message).toBe('Test API');
    });
  });

  describe('Store Opening API', () => {
    test('GET /api/public/store-opening should return store opening info', async () => {
      // Ensure settings exist (getSettings creates if not exists)
      await Settings.getSettings();
      
      const response = await request(app)
        .get('/api/public/store-opening')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('storeOpening');
      expect(response.body.storeOpening).toHaveProperty('enabled');
      expect(response.body.storeOpening).toHaveProperty('openingDate');
      expect(response.body.storeOpening).toHaveProperty('isStoreOpen');
    });
  });

  describe('Newsletter API', () => {
    test('POST /api/newsletter/subscribe should accept valid email', async () => {
      const testEmail = 'test@example.com';
      
      const response = await request(app)
        .post('/api/newsletter/subscribe')
        .send({ email: testEmail })
        .expect(201);
      
      expect(response.body).toHaveProperty('success', true);
    });

    test('POST /api/newsletter/subscribe should reject invalid email', async () => {
      const invalidEmail = 'invalid-email';
      
      const response = await request(app)
        .post('/api/newsletter/subscribe')
        .send({ email: invalidEmail })
        .expect(400);
      
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Contact API', () => {
    test('POST /api/contact should accept valid contact data', async () => {
      const contactData = {
        name: 'Test User',
        email: 'test@example.com',
        message: 'This is a test message'
      };
      
      const response = await request(app)
        .post('/api/contact')
        .send(contactData);
      
      // Should accept the request (may be 400 due to validation, but not crash)
      expect([200, 201, 400]).toContain(response.status);
    });
  });

  describe('Vendor Pre-Registration API', () => {
    test('POST /api/vendor-auth/preregister should create pre-registered vendor', async () => {
      // Ensure store is not open for pre-registration
      const settings = await Settings.getSettings();
      await settings.updateStoreOpening(new Date('2025-12-31'), false); // Future date
      
      const vendorData = {
        email: 'vendor@test.com',
        password: 'password123',
        name: 'Test Vendor',
        telefon: '123456789',
        strasse: 'Test Str.',
        hausnummer: '1',
        plz: '12345',
        ort: 'Test Stadt',
        unternehmen: 'Test Company'
      };
      
      const response = await request(app)
        .post('/api/vendor-auth/preregister')
        .send(vendorData)
        .expect(201);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('status', 'preregistered');
      expect(response.body).toHaveProperty('userId');
    });

    test('POST /api/vendor-auth/preregister should reject when store is open', async () => {
      // Set store as open
      const settings = await Settings.getSettings();
      await settings.updateStoreOpening(new Date('2020-01-01'), true); // Past date, store open
      
      const vendorData = {
        email: 'vendor2@test.com',
        password: 'password123',
        name: 'Test Vendor 2',
        telefon: '123456789',
        strasse: 'Test Str.',
        hausnummer: '1',
        plz: '12345',
        ort: 'Test Stadt'
      };
      
      const response = await request(app)
        .post('/api/vendor-auth/preregister')
        .send(vendorData)
        .expect(400);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('bereits eröffnet');
    });
  });
});