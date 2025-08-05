/**
 * @file usePriceCalculation.ts
 * @purpose Custom hook for vendor pricing calculations and package data processing
 * @created 2025-01-15
 * @modified 2025-08-05
 */

import { useCallback, useState } from 'react';

// Types for pricing calculation
interface PackageData {
  totalCost: {
    monthly: number;
    packageCosts: number;
    zusatzleistungenCosts: number;
  };
  packageCounts: Record<string, number>;
  packageOptions: Array<{
    id: string;
    name: string;
    price: number;
  }>;
  zusatzleistungen: {
    lagerservice: boolean;
    versandservice: boolean;
  };
  rentalDuration: number;
  selectedProvisionType: 'basic' | 'premium';
}

interface PackageSummary {
  mietfaecher: Array<{
    name: string;
    price: number;
  }>;
  zusatzleistungen: {
    lagerservice: boolean;
    versandservice: boolean;
  };
}

interface PriceCalculationResult {
  calculatedMonthlyPrice: number;
  packageSummary: PackageSummary;
}

interface UsePriceCalculationReturn {
  calculateMonthlyPrice: (packageData: PackageData) => number;
  createPackageSummary: (packageData: PackageData) => PackageSummary;
  processUserData: (userData: any) => any;
  isCalculating: boolean;
  calculationError: string | null;
}

/**
 * Custom hook for vendor price calculations and package data processing
 * @description Provides utilities for calculating monthly prices, creating package summaries,
 * and processing user data with pricing information
 * @hook usePriceCalculation
 * @dependencies useCallback, useState
 * @returns Price calculation utilities, processing functions, and state
 */
export const usePriceCalculation = (): UsePriceCalculationReturn => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);

  /**
   * Calculate monthly price from package data
   * @description Extracts monthly cost from package data with error handling
   * @param packageData - Package data containing cost information
   * @returns Monthly price
   */
  const calculateMonthlyPrice = useCallback((packageData: PackageData): number => {
    try {
      return packageData.totalCost?.monthly || 0;
    } catch (error) {
      console.error('Error calculating monthly price:', error);
      return 0;
    }
  }, []);

  /**
   * Create package summary from package data
   * @description Builds structured package summary with Mietfächer and Zusatzleistungen
   * @param packageData - Package data containing package information
   * @returns Package summary object
   */
  const createPackageSummary = useCallback((packageData: PackageData): PackageSummary => {
    try {
      const mietfaecher: Array<{ name: string; price: number }> = [];
      
      if (packageData.packageCounts && packageData.packageOptions) {
        Object.entries(packageData.packageCounts).forEach(([packageId, count]: [string, any]) => {
          if (count > 0) {
            const option = packageData.packageOptions.find((p: any) => p.id === packageId);
            if (option) {
              mietfaecher.push({
                name: option.name,
                price: option.price * count
              });
            }
          }
        });
      }

      return {
        mietfaecher,
        zusatzleistungen: packageData.zusatzleistungen || {
          lagerservice: false,
          versandservice: false
        }
      };
    } catch (error) {
      console.error('Error creating package summary:', error);
      return {
        mietfaecher: [],
        zusatzleistungen: {
          lagerservice: false,
          versandservice: false
        }
      };
    }
  }, []);

  /**
   * Process user data with pricing calculations
   * @description Enhances user data with calculated pricing and package summary from booking data
   * @param userData - Raw user data
   * @returns Processed user data with pricing information
   */
  const processUserData = useCallback((userData: any): any => {
    setIsCalculating(true);
    setCalculationError(null);
    
    try {
      let processedUser = { ...userData };

      // Calculate monthly price and package summary from pending booking
      if (userData.pendingBooking?.packageData) {
        const packageData = userData.pendingBooking.packageData;
        
        // Set calculated monthly price from totalCost
        processedUser.calculatedMonthlyPrice = calculateMonthlyPrice(packageData);

        // Create package summary from package data
        processedUser.packageSummary = createPackageSummary(packageData);
      }

      return processedUser;
    } catch (error) {
      console.error('Error processing user data:', error);
      setCalculationError('Failed to process user data');
      return userData;
    } finally {
      setIsCalculating(false);
    }
  }, [calculateMonthlyPrice, createPackageSummary]);

  return {
    calculateMonthlyPrice,
    createPackageSummary,
    processUserData,
    isCalculating,
    calculationError
  };
};