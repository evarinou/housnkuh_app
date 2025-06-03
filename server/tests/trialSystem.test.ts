// server/tests/trialSystem.test.ts
import mongoose from 'mongoose';
import User from '../src/models/User';
import Settings from '../src/models/Settings';
import TrialService from '../src/services/trialService';
import { sendTrialActivationEmail } from '../src/utils/emailService';

// Mock email service
jest.mock('../src/utils/emailService');
const mockSendTrialActivationEmail = sendTrialActivationEmail as jest.MockedFunction<typeof sendTrialActivationEmail>;

describe('Trial System', () => {
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/housnkuh_test');
  });

  beforeEach(async () => {
    // Clear test data
    await User.deleteMany({});
    await Settings.deleteMany({});
    
    // Reset email mock
    mockSendTrialActivationEmail.mockReset();
    mockSendTrialActivationEmail.mockResolvedValue(true);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  describe('Trial Activation Logic (R003)', () => {
    it('should activate trials when store opens', async () => {
      // Create a store opening date in the past (store is open)
      const openingDate = new Date();
      openingDate.setDate(openingDate.getDate() - 1); // Yesterday
      
      const settings = await Settings.create({
        storeOpening: {
          enabled: true,
          openingDate: openingDate,
          reminderDays: [7, 3, 1],
          lastModified: new Date()
        }
      });

      // Create pre-registered vendors
      const vendor1 = await User.create({
        isVendor: true,
        registrationStatus: 'preregistered',
        isPubliclyVisible: false,
        kontakt: {
          name: 'Test Vendor 1',
          email: 'vendor1@test.com'
        },
        adressen: [{
          adresstyp: 'Hauptadresse',
          strasse: 'Test Str.',
          hausnummer: '1',
          plz: '12345',
          ort: 'Test Stadt',
          name1: 'Test Vendor 1'
        }]
      });

      const vendor2 = await User.create({
        isVendor: true,
        registrationStatus: 'preregistered',
        isPubliclyVisible: false,
        kontakt: {
          name: 'Test Vendor 2',
          email: 'vendor2@test.com'
        },
        adressen: [{
          adresstyp: 'Hauptadresse',
          strasse: 'Test Str.',
          hausnummer: '2',
          plz: '12345',
          ort: 'Test Stadt',
          name1: 'Test Vendor 2'
        }]
      });

      // Activate trials
      const result = await TrialService.activateTrialsOnStoreOpening();

      expect(result.success).toBe(true);
      expect(result.activatedCount).toBe(2);
      expect(result.failedCount).toBe(0);

      // Check vendors are activated
      const updatedVendor1 = await User.findById(vendor1._id);
      const updatedVendor2 = await User.findById(vendor2._id);

      expect(updatedVendor1?.registrationStatus).toBe('trial_active');
      expect(updatedVendor1?.trialStartDate).toBeTruthy();
      expect(updatedVendor1?.trialEndDate).toBeTruthy();

      expect(updatedVendor2?.registrationStatus).toBe('trial_active');
      expect(updatedVendor2?.trialStartDate).toBeTruthy();
      expect(updatedVendor2?.trialEndDate).toBeTruthy();

      // Check trial duration is 30 days
      const trialDuration = updatedVendor1!.trialEndDate!.getTime() - updatedVendor1!.trialStartDate!.getTime();
      const expectedDuration = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
      expect(trialDuration).toBe(expectedDuration);

      // Check emails were sent
      expect(mockSendTrialActivationEmail).toHaveBeenCalledTimes(2);
    });

    it('should not activate trials when store is not open', async () => {
      // Create store opening date in the future (store not open)
      const openingDate = new Date();
      openingDate.setDate(openingDate.getDate() + 7); // Next week
      
      await Settings.create({
        storeOpening: {
          enabled: true,
          openingDate: openingDate,
          reminderDays: [7, 3, 1],
          lastModified: new Date()
        }
      });

      // Create pre-registered vendor
      await User.create({
        isVendor: true,
        registrationStatus: 'preregistered',
        kontakt: {
          name: 'Test Vendor',
          email: 'vendor@test.com'
        },
        adressen: [{
          adresstyp: 'Hauptadresse',
          strasse: 'Test Str.',
          hausnummer: '1',
          plz: '12345',
          ort: 'Test Stadt',
          name1: 'Test Vendor'
        }]
      });

      // Try to activate trials
      const result = await TrialService.activateTrialsOnStoreOpening();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Store is not yet open - cannot activate trials');
    });

    it('should manually activate single vendor trial', async () => {
      const vendor = await User.create({
        isVendor: true,
        registrationStatus: 'preregistered',
        kontakt: {
          name: 'Test Vendor',
          email: 'vendor@test.com'
        },
        adressen: [{
          adresstyp: 'Hauptadresse',
          strasse: 'Test Str.',
          hausnummer: '1',
          plz: '12345',
          ort: 'Test Stadt',
          name1: 'Test Vendor'
        }]
      });

      await TrialService.manuallyActivateVendorTrial(vendor._id as string);

      const updatedVendor = await User.findById(vendor._id);
      expect(updatedVendor?.registrationStatus).toBe('trial_active');
      expect(updatedVendor?.trialStartDate).toBeTruthy();
      expect(updatedVendor?.trialEndDate).toBeTruthy();
    });
  });

  describe('Trial Status Tracking (R008)', () => {
    it('should update trial statuses and expire trials', async () => {
      // Create vendor with expired trial
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1); // Yesterday
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 31); // 31 days ago
      
      const vendor = await User.create({
        isVendor: true,
        registrationStatus: 'trial_active',
        trialStartDate: startDate,
        trialEndDate: expiredDate,
        kontakt: {
          name: 'Test Vendor',
          email: 'vendor@test.com'
        },
        adressen: [{
          adresstyp: 'Hauptadresse',
          strasse: 'Test Str.',
          hausnummer: '1',
          plz: '12345',
          ort: 'Test Stadt',
          name1: 'Test Vendor'
        }]
      });

      const result = await TrialService.updateTrialStatuses();

      expect(result.success).toBe(true);
      expect(result.expiredCount).toBe(1);

      const updatedVendor = await User.findById(vendor._id);
      expect(updatedVendor?.registrationStatus).toBe('trial_expired');
    });

    it('should get trial statistics', async () => {
      // Create vendors with different statuses
      await User.create({
        isVendor: true,
        registrationStatus: 'preregistered',
        kontakt: { name: 'Pre Vendor', email: 'pre@test.com' },
        adressen: [{ adresstyp: 'Hauptadresse', strasse: 'Test', hausnummer: '1', plz: '12345', ort: 'Test', name1: 'Pre' }]
      });

      await User.create({
        isVendor: true,
        registrationStatus: 'trial_active',
        kontakt: { name: 'Active Vendor', email: 'active@test.com' },
        adressen: [{ adresstyp: 'Hauptadresse', strasse: 'Test', hausnummer: '2', plz: '12345', ort: 'Test', name1: 'Active' }]
      });

      await User.create({
        isVendor: true,
        registrationStatus: 'trial_expired',
        kontakt: { name: 'Expired Vendor', email: 'expired@test.com' },
        adressen: [{ adresstyp: 'Hauptadresse', strasse: 'Test', hausnummer: '3', plz: '12345', ort: 'Test', name1: 'Expired' }]
      });

      const stats = await TrialService.getTrialStatistics();

      expect(stats.preregistered).toBe(1);
      expect(stats.active).toBe(1);
      expect(stats.expired).toBe(1);
      expect(stats.total).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle email failures gracefully', async () => {
      // Mock email failure
      mockSendTrialActivationEmail.mockRejectedValue(new Error('Email failed'));

      const openingDate = new Date();
      openingDate.setDate(openingDate.getDate() - 1);
      
      await Settings.create({
        storeOpening: {
          enabled: true,
          openingDate: openingDate,
          reminderDays: [7, 3, 1],
          lastModified: new Date()
        }
      });

      const vendor = await User.create({
        isVendor: true,
        registrationStatus: 'preregistered',
        kontakt: {
          name: 'Test Vendor',
          email: 'vendor@test.com'
        },
        adressen: [{
          adresstyp: 'Hauptadresse',
          strasse: 'Test Str.',
          hausnummer: '1',
          plz: '12345',
          ort: 'Test Stadt',
          name1: 'Test Vendor'
        }]
      });

      // Should still activate trial even if email fails
      const result = await TrialService.activateTrialsOnStoreOpening();
      
      expect(result.success).toBe(true);
      expect(result.activatedCount).toBe(1);
      
      const updatedVendor = await User.findById(vendor._id);
      expect(updatedVendor?.registrationStatus).toBe('trial_active');
    });

    it('should handle invalid vendor ID for manual activation', async () => {
      await expect(
        TrialService.manuallyActivateVendorTrial('invalid-id')
      ).rejects.toThrow();
    });

    it('should not activate trial for non-vendor users', async () => {
      const normalUser = await User.create({
        isVendor: false,
        registrationStatus: 'active',
        kontakt: {
          name: 'Normal User',
          email: 'user@test.com'
        },
        adressen: [{
          adresstyp: 'Hauptadresse',
          strasse: 'Test Str.',
          hausnummer: '1',
          plz: '12345',
          ort: 'Test Stadt',
          name1: 'Normal User'
        }]
      });

      await expect(
        TrialService.manuallyActivateVendorTrial(normalUser._id as string)
      ).rejects.toThrow('User is not a vendor');
    });
  });
});