// server/tests/vendorAuth.test.ts
import request from 'supertest';
import { Express } from 'express';
import User from '../src/models/User';
import Settings from '../src/models/Settings';
import Vertrag from '../src/models/Vertrag';
import { createTestApp } from './testApp';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import config from '../src/config/config';
import * as emailService from '../src/utils/emailService';

// Mock email service to prevent actual emails being sent
jest.mock('../src/utils/emailService', () => ({
  sendVendorWelcomeEmail: jest.fn().mockResolvedValue(true),
  sendNewsletterConfirmation: jest.fn().mockResolvedValue(true),
  sendWelcomeEmail: jest.fn().mockResolvedValue(true),
  sendContactFormEmail: jest.fn().mockResolvedValue(true)
}));

describe('Vendor Authentication & Registration', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Settings.deleteMany({});
    await Vertrag.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/vendor-auth/pre-register', () => {
    const validPreRegistrationData = {
      email: 'test@vendor.com',
      password: 'SecurePass123!',
      name: 'Test Vendor',
      telefon: '+49123456789',
      strasse: 'Teststraße',
      hausnummer: '123',
      plz: '12345',
      ort: 'Teststadt',
      unternehmen: 'Test GmbH',
      beschreibung: 'Test description'
    };

    beforeEach(async () => {
      // Ensure store is closed for pre-registration
      await Settings.create({
        storeOpening: {
          enabled: true,
          openingDate: new Date(Date.now() + 86400000) // Tomorrow
        }
      });
    });

    test('should successfully pre-register a vendor when store is closed', async () => {
      const res = await request(app)
        .post('/api/vendor-auth/preregister')
        .send(validPreRegistrationData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('erfolgreich');
      expect(res.body.userId).toBeDefined();
      expect(res.body.status).toBe('preregistered');

      // Verify user was created correctly
      const createdUser = await User.findOne({ 'kontakt.email': validPreRegistrationData.email });
      expect(createdUser).toBeDefined();
      expect(createdUser?.isVendor).toBe(true);
      expect(createdUser?.registrationStatus).toBe('preregistered');
      expect(createdUser?.isPubliclyVisible).toBe(false);
      expect(createdUser?.isFullAccount).toBe(true);
    });

    test('should fail if required fields are missing', async () => {
      const incompleteData = {
        email: 'test@vendor.com',
        password: 'SecurePass123!'
        // Missing other required fields
      };

      const res = await request(app)
        .post('/api/vendor-auth/preregister')
        .send(incompleteData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Pflichtfelder');
    });

    test('should fail if email format is invalid', async () => {
      const invalidEmailData = {
        ...validPreRegistrationData,
        email: 'invalid-email'
      };

      const res = await request(app)
        .post('/api/vendor-auth/preregister')
        .send(invalidEmailData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('gültige E-Mail-Adresse');
    });

    test('should fail if email already exists', async () => {
      // Create existing user
      await User.create({
        username: validPreRegistrationData.email,
        password: 'hashedpassword',
        isFullAccount: true,
        kontakt: {
          email: validPreRegistrationData.email,
          name: 'Existing User'
        }
      });

      const res = await request(app)
        .post('/api/vendor-auth/preregister')
        .send(validPreRegistrationData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('existiert bereits');
    });

    test('should fail if store is already open', async () => {
      // Update settings to mark store as open
      await Settings.deleteMany({});
      await Settings.create({
        storeOpening: {
          enabled: true,
          openingDate: new Date(Date.now() - 86400000) // Yesterday
        }
      });

      const res = await request(app)
        .post('/api/vendor-auth/preregister')
        .send(validPreRegistrationData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Store ist bereits eröffnet');
    });

    test('should hash password correctly', async () => {
      const res = await request(app)
        .post('/api/vendor-auth/preregister')
        .send(validPreRegistrationData);

      expect(res.status).toBe(201);

      const user = await User.findOne({ 'kontakt.email': validPreRegistrationData.email });
      expect(user).toBeDefined();
      
      // Verify password was hashed
      const isPasswordValid = await bcrypt.compare(validPreRegistrationData.password, user!.password!);
      expect(isPasswordValid).toBe(true);
    });

    test('should set correct default values', async () => {
      const res = await request(app)
        .post('/api/vendor-auth/preregister')
        .send(validPreRegistrationData);

      expect(res.status).toBe(201);

      const user = await User.findOne({ 'kontakt.email': validPreRegistrationData.email });
      expect(user).toBeDefined();
      expect(user?.kontakt.newslettertype).toBe('vendor');
      expect(user?.kontakt.mailNewsletter).toBe(true);
      expect(user?.kontakt.status).toBe('aktiv');
      expect(user?.registrationStatus).toBe('preregistered');
      expect(user?.isPubliclyVisible).toBe(false);
    });
  });

  describe('POST /api/vendor-auth/vendor-login', () => {
    let vendorUser: any;
    const vendorPassword = 'VendorPass123!';

    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash(vendorPassword, 10);
      vendorUser = await User.create({
        username: 'vendor@test.com',
        password: hashedPassword,
        isVendor: true,
        isFullAccount: true,
        registrationStatus: 'active',
        kontakt: {
          email: 'vendor@test.com',
          name: 'Test Vendor'
        }
      });
    });

    test('should successfully login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/vendor-auth/login')
        .send({
          email: 'vendor@test.com',
          password: vendorPassword
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('vendor@test.com');

      // Verify token is valid
      const decoded = jwt.verify(res.body.token, config.jwtSecret) as any;
      expect(decoded.id).toBe(vendorUser._id.toString());
      expect(decoded.isVendor).toBe(true);
    });

    test('should fail with invalid password', async () => {
      const res = await request(app)
        .post('/api/vendor-auth/login')
        .send({
          email: 'vendor@test.com',
          password: 'WrongPassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Ungültige Anmeldedaten');
    });

    test('should fail with non-existent email', async () => {
      const res = await request(app)
        .post('/api/vendor-auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: vendorPassword
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Ungültige Anmeldedaten');
    });

    test('should fail if user is not a vendor', async () => {
      // Create non-vendor user
      const hashedPassword = await bcrypt.hash('AdminPass123!', 10);
      await User.create({
        username: 'admin@test.com',
        password: hashedPassword,
        isAdmin: true,
        isVendor: false,
        isFullAccount: true,
        kontakt: {
          email: 'admin@test.com',
          name: 'Admin User'
        }
      });

      const res = await request(app)
        .post('/api/vendor-auth/login')
        .send({
          email: 'admin@test.com',
          password: 'AdminPass123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Ungültige Anmeldedaten');
    });

    test('should fail if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/vendor-auth/login')
        .send({
          email: 'vendor@test.com'
          // Missing password
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('E-Mail und Passwort sind erforderlich');
    });
  });

  describe('Registration Status Transitions', () => {
    test('should transition from preregistered to active when activated', async () => {
      // Create pre-registered vendor
      const vendor = await User.create({
        username: 'preregistered@test.com',
        password: 'hashedpassword',
        isVendor: true,
        isFullAccount: true,
        registrationStatus: 'preregistered',
        isPubliclyVisible: false,
        kontakt: {
          email: 'preregistered@test.com',
          name: 'Pre-registered Vendor'
        }
      });

      // Simulate admin activation
      vendor.registrationStatus = 'active';
      vendor.isPubliclyVisible = true;
      await vendor.save();

      const updatedVendor = await User.findById(vendor._id);
      expect(updatedVendor?.registrationStatus).toBe('active');
      expect(updatedVendor?.isPubliclyVisible).toBe(true);
    });

    test('should handle registration with booking request', async () => {
      // Setup store as open
      await Settings.create({
        storeOpening: {
          enabled: true,
          openingDate: new Date(Date.now() - 86400000) // Yesterday
        }
      });

      const registrationData = {
        email: 'booking@vendor.com',
        password: 'BookingPass123!',
        name: 'Booking Vendor',
        telefon: '+49123456789',
        strasse: 'Bookingstraße',
        hausnummer: '456',
        plz: '54321',
        ort: 'Bookingstadt',
        unternehmen: 'Booking GmbH',
        beschreibung: 'Booking vendor',
        packageData: {
          mietfachGroesse: '10qm',
          menge: 2,
          startDatum: new Date(Date.now() + 86400000).toISOString()
        }
      };

      const res = await request(app)
        .post('/api/vendor-auth/register')
        .send(registrationData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const vendor = await User.findOne({ 'kontakt.email': registrationData.email });
      expect(vendor).toBeDefined();
      expect(vendor?.registrationStatus).toBe('preregistered'); // Default status for vendors
      expect(vendor?.isPubliclyVisible).toBe(false);
      // Verify pending booking was created
      expect(vendor?.pendingBooking).toBeDefined();
      expect(vendor?.pendingBooking?.packageData).toEqual(registrationData.packageData);
      expect(vendor?.pendingBooking?.status).toBe('pending');
    }, 10000);
  });

  describe('Protected Routes', () => {
    let vendorToken: string;
    let vendorUser: any;

    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash('VendorPass123!', 10);
      vendorUser = await User.create({
        username: 'protected@vendor.com',
        password: hashedPassword,
        isVendor: true,
        isFullAccount: true,
        registrationStatus: 'active',
        kontakt: {
          email: 'protected@vendor.com',
          name: 'Protected Vendor'
        }
      });

      vendorToken = jwt.sign(
        { id: vendorUser._id, isVendor: true },
        config.jwtSecret,
        { expiresIn: '7d' }
      );
    });

    test('should access vendor profile with valid token', async () => {
      const res = await request(app)
        .get('/api/vendor-auth/profile/' + vendorUser._id)
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.profile).toBeDefined();
      expect(res.body.profile.email).toBe('protected@vendor.com');
    });

    test('should fail to access profile without token', async () => {
      const res = await request(app)
        .get('/api/vendor-auth/profile/' + vendorUser._id);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Kein Token');
    });

    test('should fail to access profile with invalid token', async () => {
      const res = await request(app)
        .get('/api/vendor-auth/profile/' + vendorUser._id)
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('ungültig');
    });

    test('should update vendor profile with valid data', async () => {
      const updateData = {
        beschreibung: 'Updated description',
        telefon: '+49987654321'
      };

      const res = await request(app)
        .put('/api/vendor-auth/profile/' + vendorUser._id)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updatedVendor = await User.findById(vendorUser._id);
      expect(updatedVendor?.vendorProfile?.beschreibung).toBe('Updated description');
      expect(updatedVendor?.kontakt.telefon).toBe('+49987654321');
    });
  });
});