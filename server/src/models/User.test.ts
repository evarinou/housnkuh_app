/**
 * @file User.test.ts
 * @purpose Unit tests for User model validation, virtual populate, and invoice references
 * @created 2025-08-21
 * @modified 2025-08-21
 */

import mongoose from 'mongoose';
import User from './User';
import Invoice from './Invoice';

// Mock MongoDB connection for testing
jest.mock('mongoose', () => ({
  ...jest.requireActual('mongoose'),
  connect: jest.fn(),
  connection: {
    readyState: 1
  }
}));

describe('User Model', () => {
  let mockUserId: string;
  let validUserData: any;
  let validInvoiceData: any;

  beforeAll(() => {
    mockUserId = new mongoose.Types.ObjectId().toString();
  });

  beforeEach(() => {
    validUserData = {
      username: 'testvendor',
      password: 'hashedpassword123',
      isFullAccount: true,
      isVendor: true,
      kontakt: {
        name: 'Test Vendor',
        email: 'vendor@test.com',
        phone: '+49123456789'
      },
      adressen: [
        {
          adresstyp: 'Hauptadresse',
          strasse: 'Teststraße',
          hausnummer: '123',
          plz: '12345',
          ort: 'Teststadt',
          name1: 'Test Vendor'
        }
      ],
      registrationStatus: 'active'
    };

    validInvoiceData = {
      invoiceNumber: 'RE-2025-08-00001',
      vendor: mockUserId,
      period: {
        month: 8,
        year: 2025
      },
      items: [
        {
          description: 'Mietfach Service - August 2025',
          quantity: 1,
          unitPrice: 50.00,
          totalPrice: 50.00,
          type: 'mietfach'
        }
      ],
      subtotal: 50.00,
      tax: 0.19,
      totalAmount: 59.50,
      status: 'draft'
    };
  });

  describe('Invoice Virtual Populate', () => {
    it('should have invoices virtual field defined', () => {
      const user = new User(validUserData);
      const virtuals = (user.schema as any).virtuals;
      expect(virtuals.invoices).toBeDefined();
    });

    it('should configure virtual populate correctly', () => {
      const user = new User(validUserData);
      const virtuals = (user.schema as any).virtuals;
      const virtualOptions = virtuals.invoices.options;
      
      expect(virtualOptions.ref).toBe('Invoice');
      expect(virtualOptions.localField).toBe('_id');
      expect(virtualOptions.foreignField).toBe('vendor');
      expect(virtualOptions.justOne).toBe(false);
    });

    it('should include virtual fields in JSON output', () => {
      const user = new User(validUserData);
      const schemaOptions = (user.schema as any).options;
      const jsonOptions = schemaOptions.toJSON;
      
      expect(jsonOptions.virtuals).toBe(true);
    });

    it('should include virtual fields in Object output', () => {
      const user = new User(validUserData);
      const schemaOptions = (user.schema as any).options;
      const objectOptions = schemaOptions.toObject;
      
      expect(objectOptions.virtuals).toBe(true);
    });

    it('should have populate method available', () => {
      const user = new User(validUserData);
      
      // Test that populate method exists
      expect(typeof user.populate).toBe('function');
    });
  });

  describe('User Model Validation', () => {
    it('should create a valid vendor user', () => {
      const user = new User(validUserData);
      const validationError = user.validateSync();
      
      expect(validationError).toBeUndefined();
      expect(user.isVendor).toBe(true);
      expect(user.kontakt.name).toBe('Test Vendor');
    });

    it('should set default registrationDate', () => {
      const user = new User(validUserData);
      
      expect(user.registrationDate).toBeDefined();
      expect(user.registrationDate).toBeInstanceOf(Date);
    });

    it('should maintain existing functionality with invoice reference', () => {
      const user = new User(validUserData);
      
      // Check that all existing properties still work
      expect(user.isFullAccount).toBe(true);
      expect(user.isVendor).toBe(true);
      expect(user.registrationStatus).toBe('active');
      expect(user.adressen).toHaveLength(1);
    });
  });

  describe('Migration Compatibility', () => {
    it('should work with existing users without breaking', () => {
      const existingUserData = {
        ...validUserData,
        // Simulate existing user without invoice references
        _id: new mongoose.Types.ObjectId(mockUserId)
      };

      const user = new User(existingUserData);
      const validationError = user.validateSync();
      
      expect(validationError).toBeUndefined();
      expect(user.invoices).toBeUndefined(); // Virtual field not populated yet
    });

    it('should not require invoices field for validation', () => {
      const userWithoutInvoices = new User(validUserData);
      const validationError = userWithoutInvoices.validateSync();
      
      expect(validationError).toBeUndefined();
    });
  });
});