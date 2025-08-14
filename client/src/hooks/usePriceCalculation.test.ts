/**
 * @file usePriceCalculation.test.ts
 * @purpose Unit tests for usePriceCalculation hook
 * @created 2025-08-05
 * @modified 2025-08-05
 */

import { renderHook, act } from '@testing-library/react';
import { usePriceCalculation } from './usePriceCalculation';

// Mock data matching the expected interfaces
const mockPackageData = {
  totalCost: {
    monthly: 150.50,
    packageCosts: 125.0,
    zusatzleistungenCosts: 25.50
  },
  packageCounts: {
    'pkg-1': 2,
    'pkg-2': 1
  },
  packageOptions: [
    { id: 'pkg-1', name: 'Small Package', price: 50 },
    { id: 'pkg-2', name: 'Large Package', price: 75 }
  ],
  zusatzleistungen: {
    lagerservice: true,
    versandservice: false
  },
  rentalDuration: 12,
  selectedProvisionType: 'premium' as const
};

describe('usePriceCalculation', () => {
  it('should return expected functions and initial state', () => {
    const { result } = renderHook(() => usePriceCalculation());

    expect(result.current.calculateMonthlyPrice).toBeInstanceOf(Function);
    expect(result.current.createPackageSummary).toBeInstanceOf(Function);
    expect(result.current.processUserData).toBeInstanceOf(Function);
    expect(result.current.isCalculating).toBe(false);
    expect(result.current.calculationError).toBe(null);
  });

  describe('calculateMonthlyPrice', () => {
    it('should calculate monthly price from package data', () => {
      const { result } = renderHook(() => usePriceCalculation());
      
      const price = result.current.calculateMonthlyPrice(mockPackageData);
      
      expect(price).toBe(150.50);
    });

    it('should return 0 when totalCost is missing', () => {
      const { result } = renderHook(() => usePriceCalculation());
      
      const price = result.current.calculateMonthlyPrice({
        totalCost: { monthly: 0, packageCosts: 0, zusatzleistungenCosts: 0 },
        packageCounts: {},
        packageOptions: [],
        zusatzleistungen: { lagerservice: false, versandservice: false },
        rentalDuration: 12,
        selectedProvisionType: 'basic'
      });
      
      expect(price).toBe(0);
    });

    it('should handle error gracefully', () => {
      const { result } = renderHook(() => usePriceCalculation());
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Pass null to trigger error
      const price = result.current.calculateMonthlyPrice(null as any);
      
      expect(price).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith('Error calculating monthly price:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('createPackageSummary', () => {
    it('should create package summary from package data', () => {
      const { result } = renderHook(() => usePriceCalculation());
      
      const summary = result.current.createPackageSummary(mockPackageData);
      
      expect(summary).toEqual({
        mietfaecher: [
          { name: 'Small Package', price: 100 }, // 50 * 2
          { name: 'Large Package', price: 75 }   // 75 * 1
        ],
        zusatzleistungen: {
          lagerservice: true,
          versandservice: false
        }
      });
    });

    it('should return empty structure when data is missing', () => {
      const { result } = renderHook(() => usePriceCalculation());
      
      const summary = result.current.createPackageSummary({
        totalCost: { monthly: 0, packageCosts: 0, zusatzleistungenCosts: 0 },
        packageCounts: {},
        packageOptions: [],
        zusatzleistungen: { lagerservice: false, versandservice: false },
        rentalDuration: 12,
        selectedProvisionType: 'basic'
      });
      
      expect(summary).toEqual({
        mietfaecher: [],
        zusatzleistungen: {
          lagerservice: false,
          versandservice: false
        }
      });
    });

    it('should handle error gracefully', () => {
      const { result } = renderHook(() => usePriceCalculation());
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Pass null to trigger error
      const summary = result.current.createPackageSummary(null as any);
      
      expect(summary).toEqual({
        mietfaecher: [],
        zusatzleistungen: {
          lagerservice: false,
          versandservice: false
        }
      });
      expect(consoleSpy).toHaveBeenCalledWith('Error creating package summary:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('processUserData', () => {
    it('should process user data with pricing calculations', async () => {
      const { result } = renderHook(() => usePriceCalculation());
      
      const userData = {
        id: 'user-1',
        name: 'Test User',
        pendingBooking: {
          packageData: mockPackageData
        }
      };

      let processedUser: any;
      await act(async () => {
        processedUser = result.current.processUserData(userData);
      });

      expect(processedUser).toEqual({
        ...userData,
        calculatedMonthlyPrice: 150.50,
        packageSummary: {
          mietfaecher: [
            { name: 'Small Package', price: 100 },
            { name: 'Large Package', price: 75 }
          ],
          zusatzleistungen: {
            lagerservice: true,
            versandservice: false
          }
        }
      });
    });

    it('should handle user data without pending booking', async () => {
      const { result } = renderHook(() => usePriceCalculation());
      
      const userData = {
        id: 'user-1',
        name: 'Test User'
      };

      let processedUser: any;
      await act(async () => {
        processedUser = result.current.processUserData(userData);
      });

      expect(processedUser).toEqual(userData);
    });

    it('should set calculating state during processing', async () => {
      const { result } = renderHook(() => usePriceCalculation());
      
      const userData = { pendingBooking: { packageData: mockPackageData } };

      await act(async () => {
        result.current.processUserData(userData);
      });

      // After processing, isCalculating should be false
      expect(result.current.isCalculating).toBe(false);
      expect(result.current.calculationError).toBe(null);
    });

    it('should handle user data gracefully', async () => {
      const { result } = renderHook(() => usePriceCalculation());
      
      // Test with partially invalid data - should still work gracefully
      const userData = {
        id: 'user-1',
        pendingBooking: {
          packageData: {
            // No totalCost - should default to 0
            totalCost: {
              monthly: 0,
              packageCosts: 0,
              zusatzleistungenCosts: 0
            },
            packageCounts: { 'pkg-1': 1 },
            packageOptions: [{ id: 'pkg-1', name: 'Test', price: 50 }],
            zusatzleistungen: {
              lagerservice: false,
              versandservice: false
            },
            rentalDuration: 12,
            selectedProvisionType: 'basic' as const
          }
        }
      };

      let processedUser: any;
      await act(async () => {
        processedUser = result.current.processUserData(userData);
      });

      expect(result.current.isCalculating).toBe(false);
      expect(result.current.calculationError).toBe(null);
      expect(processedUser.calculatedMonthlyPrice).toBe(0); // No totalCost
      expect(processedUser.packageSummary.mietfaecher).toHaveLength(1);
    });
  });
});