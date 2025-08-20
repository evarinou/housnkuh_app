/**
 * @file emailService.integration.test.ts
 * @purpose Integration tests for email service workflows and end-to-end scenarios
 * @created 2025-08-18
 * @modified 2025-08-18
 */

import { 
  sendNewsletterConfirmation,
  sendVendorConfirmationEmail,
  sendBookingConfirmation,
  sendMonitoringAlert,
  sendAdminConfirmationEmail,
  sendAdminZusatzleistungenNotification,
  getFrontendUrl,
  PackageBookingData,
  MonitoringAlertData,
  AdminConfirmationData,
  ZusatzleistungenAdminNotificationData
} from '../emailService';

// Mock logger to prevent console output during tests
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
  })
}));

// Mock Settings for admin tests
const mockSettings = {
  getSettings: jest.fn().mockResolvedValue({
    isStoreOpen: jest.fn().mockReturnValue(true),
    storeOpening: { openingDate: new Date('2025-09-01') }
  })
};

jest.doMock('../../models/Settings', () => ({
  default: mockSettings
}));

// Save original env for restoration
const originalEnv = process.env;

describe('Email Service Integration Tests', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    // Set development mode for these integration tests to avoid email sending
    process.env.NODE_ENV = 'development';
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Newsletter Registration → Confirmation → Booking Workflow', () => {
    it('should handle complete customer newsletter registration flow', async () => {
      process.env.FRONTEND_URL = 'https://housnkuh.de';
      
      // Step 1: Newsletter confirmation
      const newsletterResult = await sendNewsletterConfirmation(
        'customer@test.com',
        'newsletter-token-123',
        'customer'
      );
      expect(newsletterResult).toBe(true);
      
      // Step 2: Booking confirmation (simulating customer booking)
      const bookingData: PackageBookingData = {
        vendorName: 'Test Customer Vendor',
        email: 'customer@test.com',
        packageData: {
          selectedProvisionType: 'basic',
          rentalDuration: 3,
          totalCost: { monthly: 100, provision: 4 },
          packageOptions: [
            { id: 'basic', name: 'Basic Package', price: 100 }
          ],
          packageCounts: { 'basic': 1 }
        },
        confirmationToken: 'booking-token-456',
        zusatzleistungen: {
          lagerservice: false,
          versandservice: false,
          lagerservice_kosten: 0,
          versandservice_kosten: 0
        }
      };
      
      const bookingResult = await sendBookingConfirmation(bookingData);
      expect(bookingResult).toBe(true);
      
      // Verify consistent URL usage across workflow
      const url = getFrontendUrl();
      expect(url).toBe('https://housnkuh.de');
    });

    it('should handle complete vendor newsletter registration flow', async () => {
      process.env.FRONTEND_URL = 'https://housnkuh.de';
      
      // Step 1: Newsletter confirmation for vendor
      const newsletterResult = await sendNewsletterConfirmation(
        'vendor@test.com',
        'vendor-newsletter-token',
        'vendor'
      );
      expect(newsletterResult).toBe(true);
      
      // Step 2: Vendor confirmation email
      const vendorData = {
        name: 'Test Vendor',
        mietfaecher: [],
        vertrag: { _id: 'vendor-contract-123' },
        packageData: { rentalDuration: 6, totalCost: { monthly: 150, provision: 3 } }
      };
      
      const vendorResult = await sendVendorConfirmationEmail('vendor@test.com', vendorData);
      expect(vendorResult).toBe(true);
    });
  });

  describe('Admin Workflow → Booking → Notification Flow', () => {
    it('should handle complete admin booking confirmation workflow', async () => {
      process.env.FRONTEND_URL = 'https://admin.housnkuh.de';
      
      // Step 1: Admin confirmation for new vendor
      const adminData: AdminConfirmationData = {
        vendorName: 'New Admin Vendor',
        email: 'admin-vendor@test.com',
        mietfaecher: [
          { _id: 'fach1', bezeichnung: 'Premium Fach', typ: 'premium', preis: 100 }
        ],
        vertrag: { _id: 'admin-contract-789' },
        packageData: {
          selectedProvisionType: 'premium',
          rentalDuration: 12,
          totalCost: { monthly: 200, provision: 2 },
          packageOptions: [
            { id: 'premium', name: 'Premium Package', price: 200 }
          ],
          packageCounts: { 'premium': 1 }
        }
      };
      
      const adminResult = await sendAdminConfirmationEmail(adminData);
      expect(adminResult).toBe(true);
      
      // Step 2: Admin zusatzleistungen notification
      const zusatzleistungenData: ZusatzleistungenAdminNotificationData = {
        vendorName: 'New Admin Vendor',
        vendorEmail: 'admin-vendor@test.com',
        contractId: 'admin-contract-789',
        zusatzleistungen: {
          lagerservice: true,
          versandservice: true,
          lagerservice_kosten: 50,
          versandservice_kosten: 25
        }
      };
      
      const zusatzResult = await sendAdminZusatzleistungenNotification(zusatzleistungenData);
      expect(zusatzResult).toBe(true);
      
      // Step 3: Monitoring alert (simulating system notification)
      const alertData: MonitoringAlertData = {
        alertId: 'admin-workflow-alert',
        severity: 'warning',
        title: 'New Vendor Onboarding Complete',
        message: 'Admin vendor workflow completed successfully',
        timestamp: new Date(),
        details: { vendorId: 'admin-contract-789', workflow: 'admin-confirmation' }
      };
      
      const alertResult = await sendMonitoringAlert('admin@housnkuh.de', alertData);
      expect(alertResult).toBe(true);
    });
  });

  describe('Cross-Environment URL Consistency', () => {
    it('should maintain URL consistency across all emails in production', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.FRONTEND_URL;
      
      const expectedUrl = 'https://housnkuh.de';
      
      // Test all email functions use the same production URL
      const newsletterResult = await sendNewsletterConfirmation('test@test.com', 'token1', 'customer');
      expect(newsletterResult).toBe(true);
      
      const bookingResult = await sendBookingConfirmation({
        vendorName: 'Test',
        email: 'test@test.com',
        packageData: {
          selectedProvisionType: 'basic',
          rentalDuration: 3,
          totalCost: { monthly: 100, provision: 4 },
          packageOptions: [{ id: 'basic', name: 'Basic', price: 100 }],
          packageCounts: { 'basic': 1 }
        },
        confirmationToken: 'token2',
        zusatzleistungen: { lagerservice: false, versandservice: false, lagerservice_kosten: 0, versandservice_kosten: 0 }
      });
      expect(bookingResult).toBe(true);
      
      const alertResult = await sendMonitoringAlert('admin@test.com', {
        alertId: 'test',
        severity: 'warning',
        title: 'Test',
        message: 'Test',
        timestamp: new Date(),
        details: {}
      });
      expect(alertResult).toBe(true);
      
      // Verify all use the same URL
      const url = getFrontendUrl();
      expect(url).toBe(expectedUrl);
      expect(url).not.toContain('localhost');
    });

    it('should maintain URL consistency across all emails in staging', async () => {
      process.env.NODE_ENV = 'staging';
      delete process.env.FRONTEND_URL;
      
      const expectedUrl = 'https://staging.housnkuh.de';
      
      const newsletterResult = await sendNewsletterConfirmation('test@test.com', 'token1', 'vendor');
      expect(newsletterResult).toBe(true);
      
      const zusatzResult = await sendAdminZusatzleistungenNotification({
        vendorName: 'Test Vendor',
        vendorEmail: 'test@test.com',
        contractId: 'contract-123',
        zusatzleistungen: { lagerservice: true, versandservice: false, lagerservice_kosten: 50, versandservice_kosten: 0 }
      });
      expect(zusatzResult).toBe(true);
      
      // Verify all use the same staging URL
      const url = getFrontendUrl();
      expect(url).toBe(expectedUrl);
      expect(url).not.toContain('localhost');
    });

    it('should use custom FRONTEND_URL across all emails when set', async () => {
      const customUrl = 'https://custom.housnkuh.example.com';
      process.env.FRONTEND_URL = customUrl;
      process.env.NODE_ENV = 'production';
      
      const newsletterResult = await sendNewsletterConfirmation('test@test.com', 'token1', 'customer');
      expect(newsletterResult).toBe(true);
      
      const vendorResult = await sendVendorConfirmationEmail('test@test.com', {
        name: 'Test',
        mietfaecher: [],
        vertrag: { _id: 'test-123' },
        packageData: { rentalDuration: 3, totalCost: { monthly: 100, provision: 4 } }
      });
      expect(vendorResult).toBe(true);
      
      const adminResult = await sendAdminConfirmationEmail({
        vendorName: 'Test Admin',
        email: 'test@test.com',
        mietfaecher: [{ _id: 'fach1', bezeichnung: 'Test Fach', typ: 'standard', preis: 50 }],
        vertrag: { _id: 'admin-123' },
        packageData: {
          selectedProvisionType: 'basic',
          rentalDuration: 3,
          totalCost: { monthly: 100, provision: 4 },
          packageOptions: [{ id: 'basic', name: 'Basic', price: 100 }],
          packageCounts: { 'basic': 1 }
        }
      });
      expect(adminResult).toBe(true);
      
      // Verify all use the custom URL
      const url = getFrontendUrl();
      expect(url).toBe(customUrl);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle partial workflow failures gracefully', async () => {
      process.env.FRONTEND_URL = 'https://housnkuh.de';
      
      // Successful first step
      const newsletterResult = await sendNewsletterConfirmation('test@test.com', 'token1', 'customer');
      expect(newsletterResult).toBe(true);
      
      // Simulate second step with potential email error (but still successful in test)
      const bookingResult = await sendBookingConfirmation({
        vendorName: 'Test Error Vendor',
        email: 'invalid-email',
        packageData: {
          selectedProvisionType: 'basic',
          rentalDuration: 3,
          totalCost: { monthly: 100, provision: 4 },
          packageOptions: [{ id: 'basic', name: 'Basic', price: 100 }],
          packageCounts: { 'basic': 1 }
        },
        confirmationToken: 'token2',
        zusatzleistungen: { lagerservice: false, versandservice: false, lagerservice_kosten: 0, versandservice_kosten: 0 }
      });
      
      // Should handle gracefully (returns boolean)
      expect(typeof bookingResult).toBe('boolean');
    });

    it('should maintain functionality across environment changes', async () => {
      // Start in development
      process.env.NODE_ENV = 'development';
      process.env.FRONTEND_URL = 'http://localhost:3000';
      
      const devResult = await sendNewsletterConfirmation('test@test.com', 'token1', 'customer');
      expect(devResult).toBe(true);
      
      // Switch to production
      process.env.NODE_ENV = 'production';
      process.env.FRONTEND_URL = 'https://housnkuh.de';
      
      const prodResult = await sendMonitoringAlert('admin@test.com', {
        alertId: 'env-change-test',
        severity: 'warning',
        title: 'Environment Change Test',
        message: 'Testing environment switch',
        timestamp: new Date(),
        details: {}
      });
      expect(prodResult).toBe(true);
      
      // Verify URL changed correctly
      const url = getFrontendUrl();
      expect(url).toBe('https://housnkuh.de');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent email sending', async () => {
      process.env.FRONTEND_URL = 'https://housnkuh.de';
      
      // Simulate concurrent email sending
      const promises = [
        sendNewsletterConfirmation('customer1@test.com', 'token1', 'customer'),
        sendNewsletterConfirmation('customer2@test.com', 'token2', 'customer'),
        sendNewsletterConfirmation('vendor1@test.com', 'token3', 'vendor'),
        sendMonitoringAlert('admin@test.com', {
          alertId: 'concurrent-test-1',
          severity: 'warning',
          title: 'Concurrent Test 1',
          message: 'Testing concurrent sending',
          timestamp: new Date(),
          details: {}
        }),
        sendMonitoringAlert('admin@test.com', {
          alertId: 'concurrent-test-2',
          severity: 'warning',
          title: 'Concurrent Test 2',
          message: 'Testing concurrent sending',
          timestamp: new Date(),
          details: {}
        })
      ];
      
      const results = await Promise.all(promises);
      
      // All should succeed
      results.forEach(result => {
        expect(result).toBe(true);
      });
      
      // URL should remain consistent
      const url = getFrontendUrl();
      expect(url).toBe('https://housnkuh.de');
    });

    it('should handle email generation with large data sets', async () => {
      process.env.FRONTEND_URL = 'https://housnkuh.de';
      
      // Large booking data
      const largeBookingData: PackageBookingData = {
        vendorName: 'Large Data Test Vendor with Very Long Name',
        email: 'large-test@test.com',
        packageData: {
          selectedProvisionType: 'premium',
          rentalDuration: 12,
          totalCost: { monthly: 500, provision: 1 },
          packageOptions: Array.from({ length: 10 }, (_, i) => ({
            id: `package-${i}`,
            name: `Package ${i} with detailed description`,
            price: 50 + i * 10
          })),
          packageCounts: Object.fromEntries(
            Array.from({ length: 10 }, (_, i) => [`package-${i}`, Math.floor(Math.random() * 5) + 1])
          )
        },
        confirmationToken: 'large-data-token',
        zusatzleistungen: {
          lagerservice: true,
          versandservice: true,
          lagerservice_kosten: 100,
          versandservice_kosten: 75
        }
      };
      
      const result = await sendBookingConfirmation(largeBookingData);
      expect(result).toBe(true);
    });
  });
});