/**
 * @file User.integration.test.ts
 * @purpose Integration tests for User model invoice virtual populate functionality
 * @created 2025-08-21
 * @modified 2025-08-21
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../User';
import Invoice from '../Invoice';

describe('User Model Integration - Invoice Virtual Populate', () => {
  let mongoServer: MongoMemoryServer;
  let testUserId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    // Disconnect from any existing connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    
    // Start in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clean up collections
    await User.deleteMany({});
    await Invoice.deleteMany({});
    
    testUserId = new mongoose.Types.ObjectId();
  });

  const createTestUser = async () => {
    const userData = {
      _id: testUserId,
      username: 'testvendor',
      password: 'hashedpassword',
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

    return await User.create(userData);
  };

  const createTestInvoice = async (invoiceNumber: string, status: string = 'draft', month: number = 8) => {
    const invoiceData = {
      invoiceNumber,
      vendor: testUserId,
      // Unique-Index (BUG-INV-DUP): je Vendor+Periode nur eine Rechnung
      period: {
        month,
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
      status
    };

    return await Invoice.create(invoiceData);
  };

  describe('Virtual Populate Functionality', () => {
    it('should populate user with no invoices', async () => {
      const user = await createTestUser();
      const userWithInvoices = await User.findById(testUserId).populate('invoices');
      
      expect(userWithInvoices).toBeTruthy();
      expect(userWithInvoices!.invoices).toBeDefined();
      expect(userWithInvoices!.invoices).toHaveLength(0);
    });

    it('should populate user with single invoice', async () => {
      const user = await createTestUser();
      const invoice = await createTestInvoice('RE-2025-08-00001');
      
      const userWithInvoices = await User.findById(testUserId).populate('invoices');
      
      expect(userWithInvoices).toBeTruthy();
      expect(userWithInvoices!.invoices).toBeDefined();
      expect(userWithInvoices!.invoices).toHaveLength(1);
      
      if (userWithInvoices!.invoices && userWithInvoices!.invoices.length > 0) {
        expect(userWithInvoices!.invoices[0].invoiceNumber).toBe('RE-2025-08-00001');
        expect(userWithInvoices!.invoices[0].vendor.toString()).toBe(testUserId.toString());
      }
    });

    it('should populate user with multiple invoices', async () => {
      const user = await createTestUser();
      await createTestInvoice('RE-2025-08-00001', 'sent', 6);
      await createTestInvoice('RE-2025-08-00002', 'paid', 7);
      await createTestInvoice('RE-2025-08-00003', 'draft', 8);
      
      const userWithInvoices = await User.findById(testUserId).populate('invoices');
      
      expect(userWithInvoices).toBeTruthy();
      expect(userWithInvoices!.invoices).toBeDefined();
      expect(userWithInvoices!.invoices).toHaveLength(3);
      
      if (userWithInvoices!.invoices && userWithInvoices!.invoices.length === 3) {
        const invoiceNumbers = userWithInvoices!.invoices.map(inv => inv.invoiceNumber).sort();
        expect(invoiceNumbers).toEqual(['RE-2025-08-00001', 'RE-2025-08-00002', 'RE-2025-08-00003']);
      }
    });

    it('should only populate invoices for correct vendor', async () => {
      // Create two users
      const user1 = await createTestUser();
      
      const otherUserId = new mongoose.Types.ObjectId();
      const userData2 = {
        _id: otherUserId,
        username: 'othervendor',
        password: 'hashedpassword',
        isFullAccount: true,
        isVendor: true,
        kontakt: {
          name: 'Other Vendor',
          email: 'other@test.com',
          phone: '+49987654321'
        },
        adressen: [
          {
            adresstyp: 'Hauptadresse',
            strasse: 'Otherstraße',
            hausnummer: '456',
            plz: '54321',
            ort: 'Otherstadt',
            name1: 'Other Vendor'
          }
        ],
        registrationStatus: 'active'
      };
      const user2 = await User.create(userData2);
      
      // Create invoices for both users
      await createTestInvoice('RE-2025-08-00001'); // for user1
      
      const otherInvoiceData = {
        invoiceNumber: 'RE-2025-08-00002',
        vendor: otherUserId,
        period: { month: 8, year: 2025 },
        items: [{ description: 'Test', quantity: 1, unitPrice: 30, totalPrice: 30, type: 'mietfach' }],
        subtotal: 30.00,
        tax: 0.19,
        totalAmount: 35.70,
        status: 'draft'
      };
      await Invoice.create(otherInvoiceData);
      
      // Test population
      const user1WithInvoices = await User.findById(testUserId).populate('invoices');
      const user2WithInvoices = await User.findById(otherUserId).populate('invoices');
      
      expect(user1WithInvoices!.invoices).toBeDefined();
      expect(user1WithInvoices!.invoices).toHaveLength(1);
      
      if (user1WithInvoices!.invoices && user1WithInvoices!.invoices.length > 0) {
        expect(user1WithInvoices!.invoices[0].invoiceNumber).toBe('RE-2025-08-00001');
      }
      
      expect(user2WithInvoices!.invoices).toBeDefined();
      expect(user2WithInvoices!.invoices).toHaveLength(1);
      
      if (user2WithInvoices!.invoices && user2WithInvoices!.invoices.length > 0) {
        expect(user2WithInvoices!.invoices[0].invoiceNumber).toBe('RE-2025-08-00002');
      }
    });

    it('should work with lean queries', async () => {
      const user = await createTestUser();
      await createTestInvoice('RE-2025-08-00001');
      
      const userWithInvoices = await User.findById(testUserId).populate('invoices').lean();
      
      expect(userWithInvoices).toBeTruthy();
      if (userWithInvoices && userWithInvoices.invoices) {
        expect(userWithInvoices.invoices).toHaveLength(1);
        expect(userWithInvoices.invoices[0].invoiceNumber).toBe('RE-2025-08-00001');
      }
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle user without invoices efficiently', async () => {
      const user = await createTestUser();
      
      const startTime = Date.now();
      const userWithInvoices = await User.findById(testUserId).populate('invoices');
      const endTime = Date.now();
      
      expect(userWithInvoices!.invoices).toHaveLength(0);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });

    it('should handle deleted invoices gracefully', async () => {
      const user = await createTestUser();
      const invoice = await createTestInvoice('RE-2025-08-00001');
      
      // Verify invoice exists
      let userWithInvoices = await User.findById(testUserId).populate('invoices');
      expect(userWithInvoices!.invoices).toHaveLength(1);
      
      // Delete invoice
      await Invoice.findByIdAndDelete(invoice._id);
      
      // Verify virtual populate updates
      userWithInvoices = await User.findById(testUserId).populate('invoices');
      expect(userWithInvoices!.invoices).toHaveLength(0);
    });
  });
});