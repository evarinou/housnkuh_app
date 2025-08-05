/**
 * @file usePackageBuilder.ts
 * @purpose Package selection and booking builder with price calculation and vendor registration flow
 * @created 2025-01-15
 * @modified 2025-08-05
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zusatzleistungen, PriceCalculation } from '../types';
import { createNavigationHelper } from '../utils/navigation';
import axios from 'axios';

/**
 * Commission/provision type configuration
 * @interface ProvisionType
 */
interface ProvisionType {
  id: string;
  name: string;
  rate: number;
  description: string;
  benefits: string[];
}

interface PackageOption {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  detail: string;
  category: 'standard' | 'cooled' | 'premium' | 'visibility';
  priceDisplay?: string;
}

interface TotalCost {
  monthly: number;
  oneTime: number;
  provision: number;
}

/**
 * Custom hook for package selection and booking builder with price calculation
 * 
 * @description Comprehensive package builder hook that manages:
 * - Provision type selection (Basic 4% / Premium 7%)
 * - Package selection with quantities
 * - Real-time price calculations with discounts
 * - Premium services (Lagerservice/Versandservice)
 * - Vendor registration and booking flow
 * - Navigation and modal states
 * 
 * @returns {object} Complete package builder state and actions
 * 
 * @hook
 * @dependencies useState, useEffect, useCallback, useMemo, useNavigate
 * @complexity High - Central business logic for package selection flow
 */
export const usePackageBuilder = () => {
  const navigate = useNavigate();
  const navigationHelper = createNavigationHelper(navigate);
  const [selectedProvisionType, setSelectedProvisionType] = useState('basic');
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [packageCounts, setPackageCounts] = useState<Record<string, number>>({});
  const [rentalDuration, setRentalDuration] = useState(3);
  const [totalCost, setTotalCost] = useState<TotalCost>({
    monthly: 0,
    oneTime: 0,
    provision: 0,
  });
  const [zusatzleistungen, setZusatzleistungen] = useState<Zusatzleistungen>({
    lagerservice: false,
    versandservice: false
  });
  const [priceDetails, setPriceDetails] = useState<PriceCalculation | null>(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showBookingConfirmation, setShowBookingConfirmation] = useState(false);
  const [bookingInProgress, setBookingInProgress] = useState(false);

  const provisionTypes: ProvisionType[] = useMemo(() => [
    {
      id: 'basic',
      name: 'Basismodell',
      rate: 4,
      description: 'Verkauf deiner Produkte ohne Diebstahlschutz (Du trägst das Warenrisiko)',
      benefits: [
        'Verkauf über das Housnkuh-Kassensystem',
        'Tägliche Verkaufsübersicht',
        'Kartenzahlungsgebühren inklusive'
      ]
    },
    {
      id: 'premium',
      name: 'Premium-Modell',
      rate: 7,
      description: 'Umfassendes Paket mit Diebstahlschutz und zusätzlichen Marketing-Vorteilen',
      benefits: [
        'Verkauf über das Housnkuh-Kassensystem',
        'Tägliche Verkaufsübersicht',
        'Diebstahlschutz (Risiko wird von housnkuh getragen)',
        'Automatisierte Bestandsführung',
        'Priorität bei Marketing-Aktionen',
        'Kartenzahlungsgebühren inklusive'
      ]
    }
  ], []);

  const packageOptions: PackageOption[] = useMemo(() => [
    {
      id: 'block-a',
      name: 'Verkaufsblock Lage A',
      price: 35,
      description: 'Regal auf Augenhöhe, 80x39x67cm (2 Ebenen)',
      image: '/api/placeholder/200/150',
      detail: 'Optimale Sichtbarkeit, beste Platzierung',
      category: 'standard'
    },
    {
      id: 'block-b',
      name: 'Verkaufsblock Lage B',
      price: 15,
      description: 'Standard Regalfläche, 80x39x33,5cm (1 Ebene)',
      image: '/api/placeholder/200/150',
      detail: 'Kostengünstige Option für Einsteiger',
      category: 'standard'
    },
    {
      id: 'block-cold',
      name: 'Verkaufsblock gekühlt',
      price: 50,
      description: 'Gekühlter Bereich für temperaturempfindliche Produkte',
      image: '/api/placeholder/200/150',
      detail: 'Für Frischeprodukte, konstante Kühlung',
      category: 'cooled'
    },
    {
      id: 'block-frozen',
      name: 'Verkaufsblock gefroren',
      price: 60,
      description: 'Gefrierbereich für Tiefkühlprodukte',
      image: '/api/placeholder/200/150',
      detail: 'Perfekt für Fleisch, Fisch und Tiefkühlprodukte',
      category: 'cooled'
    },
    {
      id: 'block-table',
      name: 'Verkaufstisch',
      price: 40,
      description: 'Präsentationstisch für besondere Produkte',
      image: '/api/placeholder/200/150',
      detail: 'Ideale Präsentationsfläche für Spezialprodukte',
      category: 'premium'
    },
    {
      id: 'block-other',
      name: 'Flexibler Bereich',
      price: 0,
      description: 'Anpassbarer Bereich für spezielle Anforderungen',
      image: '/api/placeholder/200/150',
      detail: 'Flexible Nutzung je nach Produktart',
      category: 'standard',
      priceDisplay: 'auf Anfrage'
    },
    {
      id: 'window-small',
      name: 'Schaufenster klein',
      price: 30,
      description: 'Zusätzliche Außenwirkung, mehr Sichtbarkeit',
      image: '/api/placeholder/200/150',
      detail: 'Zusätzliche Sichtbarkeit für deine Produkte',
      category: 'visibility'
    },
    {
      id: 'window-large',
      name: 'Schaufenster groß',
      price: 60,
      description: 'Maximale Außenwirkung, Premium-Platzierung',
      image: '/api/placeholder/200/150',
      detail: 'Maximale Sichtbarkeit für deine Produkte',
      category: 'visibility'
    },
  ], []);

  const getDiscountRate = useCallback(() => {
    if (rentalDuration >= 12) return 0.1;
    if (rentalDuration >= 6) return 0.05;
    return 0;
  }, [rentalDuration]);

  // Reset zusatzleistungen when provision type changes
  useEffect(() => {
    if (selectedProvisionType !== 'premium') {
      setZusatzleistungen({
        lagerservice: false,
        versandservice: false
      });
    }
  }, [selectedProvisionType]);

  // Calculate price using new price calculation service
  useEffect(() => {
    const calculatePrice = async () => {
      if (Object.values(packageCounts).reduce((sum, count) => sum + count, 0) === 0) {
        setPriceDetails(null);
        return;
      }

      try {
        const PriceCalculationService = (await import('../services/priceCalculationService')).default;
        
        const currentProvisionType = provisionTypes.find(p => p.id === selectedProvisionType);
        const provisionRate = currentProvisionType ? currentProvisionType.rate : 4;

        const calculationInput = PriceCalculationService.fromPackageBuilderData(
          packageCounts,
          [],
          packageOptions,
          [],
          zusatzleistungen,
          rentalDuration,
          provisionRate
        );

        const breakdown = PriceCalculationService.calculatePrice(calculationInput);
        const formatted = PriceCalculationService.formatPriceBreakdown(breakdown);

        setPriceDetails({
          grundpreis: formatted.packageCosts + formatted.addonCosts,
          zusatzleistungen: {
            lagerservice: zusatzleistungen.lagerservice && selectedProvisionType === 'premium' ? 20 : 0,
            versandservice: zusatzleistungen.versandservice && selectedProvisionType === 'premium' ? 5 : 0
          },
          monatlicheKosten: formatted.monthlyTotal,
          laufzeitMonate: rentalDuration,
          zwischensumme: formatted.totalForDuration,
          rabatt: formatted.discount,
          rabattBetrag: formatted.discountAmount,
          gesamtpreis: formatted.totalForDuration
        });

        setTotalCost({
          monthly: formatted.monthlyTotal,
          oneTime: 0,
          provision: provisionRate
        });
      } catch (error) {
        console.error('Price calculation error:', error);
        // Fallback calculation
        const discount = getDiscountRate();
        
        const packageCosts = Object.entries(packageCounts).reduce((sum, [pkgId, count]) => {
          if (count <= 0) return sum;
          const option = packageOptions.find(p => p.id === pkgId);
          if (option && option.priceDisplay === 'auf Anfrage') return sum;
          return sum + (option ? option.price * count : 0);
        }, 0);

        const zusatzleistungenCosts = selectedProvisionType === 'premium' ? 
          (zusatzleistungen.lagerservice ? 20 : 0) + (zusatzleistungen.versandservice ? 5 : 0) : 0;

        const monatlicheKosten = packageCosts + zusatzleistungenCosts;
        const zwischensumme = monatlicheKosten * rentalDuration;
        const rabattBetrag = zwischensumme * discount;
        const gesamtpreis = zwischensumme - rabattBetrag;

        setPriceDetails({
          grundpreis: packageCosts,
          zusatzleistungen: {
            lagerservice: zusatzleistungen.lagerservice && selectedProvisionType === 'premium' ? 20 : 0,
            versandservice: zusatzleistungen.versandservice && selectedProvisionType === 'premium' ? 5 : 0
          },
          monatlicheKosten,
          laufzeitMonate: rentalDuration,
          zwischensumme,
          rabatt: discount * 100,
          rabattBetrag,
          gesamtpreis
        });

        const currentProvisionType = provisionTypes.find(p => p.id === selectedProvisionType);
        setTotalCost({
          monthly: monatlicheKosten * (1 - discount),
          oneTime: 0,
          provision: currentProvisionType ? currentProvisionType.rate : 4
        });
      }
    };

    calculatePrice();
  }, [
    selectedProvisionType,
    selectedPackages,
    packageCounts,
    rentalDuration,
    getDiscountRate,
    packageOptions,
    provisionTypes,
    zusatzleistungen
  ]);

  const togglePackage = (packageId: string, isIncrementing: boolean = true) => {
    if (isIncrementing) {
      setSelectedPackages(prev => [...prev, packageId]);
      setPackageCounts(prev => ({
        ...prev,
        [packageId]: (prev[packageId] || 0) + 1
      }));
    } else {
      if (packageCounts[packageId] > 0) {
        const index = [...selectedPackages].reverse().findIndex(id => id === packageId);
        if (index !== -1) {
          const newPackages = [...selectedPackages];
          newPackages.splice(selectedPackages.length - 1 - index, 1);
          setSelectedPackages(newPackages);
        }
        
        setPackageCounts(prev => ({
          ...prev,
          [packageId]: prev[packageId] - 1
        }));
      }
    }
  };

  const getPackageData = () => ({
    selectedProvisionType,
    selectedPackages,
    packageCounts,
    packageOptions,
    rentalDuration,
    totalCost,
    discount: getDiscountRate(),
    zusatzleistungen: selectedProvisionType === 'premium' ? zusatzleistungen : { lagerservice: false, versandservice: false }
  });

  const handleAuthenticatedBooking = async (vendorUser: any) => {
    if (!vendorUser) {
      console.error('User not authenticated');
      return;
    }
    setShowBookingConfirmation(true);
  };

  const handleSubmitAuthenticatedBooking = async (vendorUser: any) => {
    setBookingInProgress(true);
    
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('vendorToken');
      
      const bookingData = {
        userId: vendorUser?.id,
        packageData: getPackageData(),
      };

      const response = await axios.post(`${apiUrl}/vendor-auth/additional-booking`, bookingData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        alert('Zusätzliche Buchung erfolgreich eingereicht!');
        setShowBookingConfirmation(false);
        navigationHelper.goToVendorDashboard();
      } else {
        throw new Error(response.data.message || 'Booking failed');
      }
    } catch (error) {
      console.error('Booking error:', error);
      
      let errorMessage = 'Fehler bei der Buchung. Bitte versuche es später erneut.';
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          errorMessage = 'Authentifizierung fehlgeschlagen. Bitte logge dich erneut ein.';
        } else if (error.response?.status === 404) {
          errorMessage = 'Vendor-Account nicht gefunden. Bitte kontaktiere den Support.';
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
      }
      
      alert(errorMessage);
    } finally {
      setBookingInProgress(false);
    }
  };

  const handleRegistrationSuccess = () => {
    console.log('Registrierung erfolgreich, Package-Daten:', getPackageData());
  };

  return {
    // State
    selectedProvisionType,
    selectedPackages,
    packageCounts,
    rentalDuration,
    totalCost,
    zusatzleistungen,
    priceDetails,
    showRegistrationModal,
    showBookingConfirmation,
    bookingInProgress,
    
    // Data
    provisionTypes,
    packageOptions,
    
    // Actions
    setSelectedProvisionType,
    setRentalDuration,
    setZusatzleistungen,
    setShowRegistrationModal,
    setShowBookingConfirmation,
    togglePackage,
    getDiscountRate,
    getPackageData,
    handleAuthenticatedBooking,
    handleSubmitAuthenticatedBooking,
    handleRegistrationSuccess,
  };
};