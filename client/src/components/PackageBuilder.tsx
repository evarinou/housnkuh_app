// client/src/components/PackageBuilder.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Package, Check, AlertTriangle } from 'lucide-react';
import VendorRegistrationModal from './VendorRegistrationModal';
import { useVendorAuth } from '../contexts/VendorAuthContext';
import axios from 'axios';

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
}

interface AddonOption {
  id: string;
  name: string;
  price: number;
  description: string;
  requiresPremium: boolean;
  isWeekly?: boolean;
}

interface TotalCost {
  monthly: number;
  oneTime: number;
  provision: number;
}

const PackageBuilder: React.FC = () => {
  // Vendor Authentication
  const { isAuthenticated: isVendorAuthenticated, user: vendorUser } = useVendorAuth();
  
  // State für gewählte Optionen
  const [selectedProvisionType, setSelectedProvisionType] = useState('basic');
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  // State für das Tracking der Anzahl jeder Verkaufsfläche
  const [packageCounts, setPackageCounts] = useState<Record<string, number>>({});
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [rentalDuration, setRentalDuration] = useState(3); // Monate
  const [totalCost, setTotalCost] = useState<TotalCost>({
    monthly: 0,
    oneTime: 0,
    provision: 0,
  });
  
  // Neue States für Modal und Booking
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showBookingConfirmation, setShowBookingConfirmation] = useState(false);
  const [bookingInProgress, setBookingInProgress] = useState(false);

  // Provisionsmodelle
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
      detail: 'Optimale Sichtbarkeit, beste Platzierung'
    },
    {
      id: 'block-b',
      name: 'Verkaufsblock Lage B',
      price: 15,
      description: 'Standard Regalfläche, 80x39x33,5cm (1 Ebene)',
      image: '/api/placeholder/200/150',
      detail: 'Kostengünstige Option für Einsteiger'
    },
    {
      id: 'block-cold',
      name: 'Verkaufsblock gekühlt',
      price: 50,
      description: 'Gekühlter Bereich für temperaturempfindliche Produkte',
      image: '/api/placeholder/200/150',
      detail: 'Für Frischeprodukte, konstante Kühlung'
    },
    {
      id: 'block-table',
      name: 'Verkaufsblock Tisch',
      price: 40,
      description: 'Präsentationstisch für besondere Produkte',
      image: '/api/placeholder/200/150',
      detail: 'Ideale Präsentationsfläche für Spezialprodukte'
    }
  ], []);

  const addonOptions: AddonOption[] = useMemo(() => [
    {
      id: 'storage',
      name: 'Lagerservice',
      price: 20,
      description: 'Lagerplatz und automatisches Auffüllen bei Bedarf',
      requiresPremium: true
    },
    {
      id: 'window-small',
      name: 'Schaufenster klein',
      price: 30,
      description: 'Zusätzliche Außenwirkung, mehr Sichtbarkeit',
      requiresPremium: false
    },
    {
      id: 'window-large',
      name: 'Schaufenster groß',
      price: 60,
      description: 'Maximale Außenwirkung, Premium-Platzierung',
      requiresPremium: false
    },
    {
      id: 'social-media',
      name: 'Social Media Spotlight',
      price: 20,
      isWeekly: true,
      description: 'Hervorhebung deiner Produkte auf Instagram/Facebook für 1 Woche',
      requiresPremium: false
    }
  ], []);

  // Rabatte basierend auf Mietdauer
  const getDiscountRate = useCallback(() => {
    if (rentalDuration >= 12) return 0.1; // 10% Rabatt
    if (rentalDuration >= 6) return 0.05; // 5% Rabatt
    return 0;
  }, [rentalDuration]);

  // Berechnet die monatlichen Kosten
  useEffect(() => {
    const discount = getDiscountRate();
    
    // Berechnung der Kosten basierend auf den Zählern
    const packageCosts = Object.entries(packageCounts).reduce((sum, [pkgId, count]) => {
      if (count <= 0) return sum;
      const option = packageOptions.find(p => p.id === pkgId);
      return sum + (option ? option.price * count : 0);
    }, 0);

    const addonCosts = selectedAddons.reduce((sum, addonId) => {
      const option = addonOptions.find(a => a.id === addonId);
      if (!option) return sum;

      if (option.isWeekly) return sum + (option.price * 4);
      return sum + option.price;
    }, 0);

    const monthlyCost = (packageCosts + addonCosts) * (1 - discount);
    const currentProvisionType = provisionTypes.find(p => p.id === selectedProvisionType);

    setTotalCost({
      monthly: monthlyCost,
      oneTime: 0,
      provision: currentProvisionType ? currentProvisionType.rate : 4
    });
  }, [
    selectedProvisionType,
    selectedPackages,
    packageCounts, // Wichtig: packageCounts als Abhängigkeit hinzufügen
    selectedAddons,
    rentalDuration,
    addonOptions,
    getDiscountRate,
    packageOptions,
    provisionTypes
  ]);

  // Paket hinzufügen (mit Counter)
  const togglePackage = (packageId: string, isIncrementing: boolean = true) => {
    if (isIncrementing) {
      // Paket hinzufügen
      setSelectedPackages(prev => [...prev, packageId]);
      setPackageCounts(prev => ({
        ...prev,
        [packageId]: (prev[packageId] || 0) + 1
      }));
    } else {
      // Paket entfernen (nur eines der gleichen Art)
      if (packageCounts[packageId] > 0) {
        // Nur das letzte Vorkommen des packageId entfernen
        const index = [...selectedPackages].reverse().findIndex(id => id === packageId);
        if (index !== -1) {
          const newPackages = [...selectedPackages];
          newPackages.splice(selectedPackages.length - 1 - index, 1);
          setSelectedPackages(newPackages);
        }
        
        // Counter reduzieren
        setPackageCounts(prev => ({
          ...prev,
          [packageId]: prev[packageId] - 1
        }));
      }
    }
  };

  // Addon hinzufügen/entfernen
  const toggleAddon = (addonId: string) => {
    setSelectedAddons(prevSelectedAddons =>
      prevSelectedAddons.includes(addonId)
        ? prevSelectedAddons.filter(id => id !== addonId)
        : [...prevSelectedAddons, addonId]
    );
  };

  // Prüft, ob ein Addon verfügbar ist (Premium-Check)
  const isAddonAvailable = (addon: AddonOption) => {
    if (addon.requiresPremium && selectedProvisionType !== 'premium') {
      return false;
    }
    return true;
  };

  // Zusammenstellung der Package-Daten für die Registrierung
  const getPackageData = () => ({
    selectedProvisionType,
    selectedPackages,
    packageCounts, // Zähler für die Verkaufsflächen hinzufügen
    packageOptions, // Füge die kompletten Paketkonfigurationen hinzu
    selectedAddons,
    rentalDuration,
    totalCost,
    discount: getDiscountRate()
  });

  // Authentifizierte Buchung starten
  const handleAuthenticatedBooking = async () => {
    if (!isVendorAuthenticated || !vendorUser) {
      console.error('User not authenticated');
      return;
    }
    setShowBookingConfirmation(true);
  };

  // Authentifizierte Buchung einreichen
  const handleSubmitAuthenticatedBooking = async () => {
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
        // Zur Dashboard weiterleiten
        window.location.href = '/vendor/dashboard';
      } else {
        throw new Error(response.data.message || 'Booking failed');
      }
    } catch (error) {
      console.error('Booking error:', error);
      
      let errorMessage = 'Fehler bei der Buchung. Bitte versuchen Sie es später erneut.';
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          errorMessage = 'Authentifizierung fehlgeschlagen. Bitte loggen Sie sich erneut ein.';
        } else if (error.response?.status === 404) {
          errorMessage = 'Vendor-Account nicht gefunden. Bitte kontaktieren Sie den Support.';
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
      }
      
      alert(errorMessage);
    } finally {
      setBookingInProgress(false);
    }
  };

  // Registrierung/Login erfolgreich - weiterleiten zur Buchungsbestätigung
  const handleRegistrationSuccess = () => {
    // Hier können Sie zur Buchungsbestätigungsseite weiterleiten
    // oder weitere Schritte implementieren
    console.log('Registrierung erfolgreich, Package-Daten:', getPackageData());
  };

  return (
    <>
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6 mb-16">
        <h2 className="text-2xl font-bold text-[#09122c] mb-6 text-center">
          Stelle dein individuelles Mietpaket zusammen
        </h2>

        {/* Schritt 1: Provisionsmodell wählen */}
        <div className="mb-10">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <span className="bg-[#e17564] text-white rounded-full w-8 h-8 inline-flex items-center justify-center mr-2">1</span>
            Provisionsmodell wählen
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {provisionTypes.map((type) => (
              <div
                key={type.id}
                onClick={() => setSelectedProvisionType(type.id)}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                  selectedProvisionType === type.id
                    ? 'border-[#e17564] bg-[#e17564]/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-lg font-medium text-[#09122c]">{type.name}</h4>
                  <span className="bg-[#09122c] text-white px-2 py-1 rounded text-sm font-bold">
                    {type.rate}% Provision
                  </span>
                </div>
                <p className="text-gray-600 mb-4">{type.description}</p>
                <ul className="space-y-2">
                  {type.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="text-[#e17564] w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Schritt 2: Verkaufsfläche wählen */}
        <div className="mb-10">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <span className="bg-[#e17564] text-white rounded-full w-8 h-8 inline-flex items-center justify-center mr-2">2</span>
            Verkaufsflächen auswählen
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {packageOptions.map((pkg) => (
              <div
                key={pkg.id}
                className={`border-2 rounded-lg p-4 transition-all duration-200 ${
                  (packageCounts[pkg.id] || 0) > 0
                    ? 'border-[#e17564] bg-[#e17564]/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-lg font-medium text-[#09122c]">{pkg.name}</h4>
                  <span className="text-[#e17564] font-bold">{pkg.price}€/Monat</span>
                </div>
                <p className="text-gray-600 mb-2">{pkg.description}</p>
                <p className="text-sm text-gray-500 italic">{pkg.detail}</p>
                
                <div className="flex justify-between items-center mt-4">
                  {/* Anzahl und Steuerelemente */}
                  <div className="flex items-center">
                    {(packageCounts[pkg.id] || 0) > 0 && (
                      <div className="flex items-center bg-[#e17564]/10 text-[#e17564] px-3 py-1 rounded-full font-medium">
                        <span>Anzahl: {packageCounts[pkg.id] || 0}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Steuerelemente zum Hinzufügen/Entfernen */}
                  <div className="flex items-center space-x-2">
                    {(packageCounts[pkg.id] || 0) > 0 && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePackage(pkg.id, false);
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 hover:bg-gray-100"
                      >
                        <span className="text-gray-700 font-bold">-</span>
                      </button>
                    )}
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePackage(pkg.id, true);
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-[#e17564] text-white hover:bg-[#e17564]/90"
                    >
                      <span className="font-bold">+</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Schritt 3: Zusatzoptionen wählen */}
        <div className="mb-10">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <span className="bg-[#e17564] text-white rounded-full w-8 h-8 inline-flex items-center justify-center mr-2">3</span>
            Zusatzoptionen wählen
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addonOptions.map((addon) => {
              const isAvailable = isAddonAvailable(addon);
              return (
                <div
                  key={addon.id}
                  onClick={() => isAvailable && toggleAddon(addon.id)}
                  className={`border-2 rounded-lg p-4 transition-all duration-200 ${
                    !isAvailable
                      ? 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                      : selectedAddons.includes(addon.id)
                        ? 'border-[#e17564] bg-[#e17564]/5 cursor-pointer'
                        : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-lg font-medium text-[#09122c]">{addon.name}</h4>
                    <span className="text-[#e17564] font-bold">
                      {addon.price}€/{addon.isWeekly ? 'Woche' : 'Monat'}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2">{addon.description}</p>
                  {addon.requiresPremium && (
                    <div className={`flex items-center text-sm ${
                      isAvailable ? 'text-green-600' : 'text-amber-600'
                    }`}>
                      {isAvailable ? (
                        <Check className="w-4 h-4 mr-1" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 mr-1" />
                      )}
                      <span>
                        {isAvailable
                          ? 'Premium-Funktion (verfügbar)'
                          : 'Nur mit Premium-Modell verfügbar'}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-end mt-3">
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      !isAvailable
                        ? 'bg-gray-200 text-gray-500'
                        : selectedAddons.includes(addon.id)
                          ? 'bg-[#e17564] text-white'
                          : 'bg-gray-200 text-gray-700'
                    }`}>
                      {!isAvailable
                        ? 'Nicht verfügbar'
                        : selectedAddons.includes(addon.id)
                          ? 'Ausgewählt'
                          : 'Auswählen'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Schritt 4: Mietdauer wählen */}
        <div className="mb-10">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <span className="bg-[#e17564] text-white rounded-full w-8 h-8 inline-flex items-center justify-center mr-2">4</span>
            Mietdauer wählen
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setRentalDuration(3)}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    rentalDuration === 3
                      ? 'bg-[#09122c] text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  3 Monate
                </button>
                <button
                  onClick={() => setRentalDuration(6)}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    rentalDuration === 6
                      ? 'bg-[#09122c] text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  6 Monate
                  <span className="ml-1 text-xs font-bold text-[#e17564]">-5%</span>
                </button>
                <button
                  onClick={() => setRentalDuration(12)}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    rentalDuration === 12
                      ? 'bg-[#09122c] text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  12 Monate
                  <span className="ml-1 text-xs font-bold text-[#e17564]">-10%</span>
                </button>
              </div>
              {getDiscountRate() > 0 && (
                <div className="bg-[#e17564]/10 text-[#e17564] px-3 py-1 rounded-full text-sm font-medium">
                  {getDiscountRate() * 100}% Rabatt bei {rentalDuration} Monaten Laufzeit
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Zusammenfassung und Total */}
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <h3 className="text-xl font-semibold mb-4">Zusammenfassung</h3>
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-600">Provisionsmodell:</span>
            <span className="font-medium">
              {provisionTypes.find(p => p.id === selectedProvisionType)?.name || 'Basismodell'}
              ({totalCost.provision}%)
            </span>
          </div>
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-gray-600">Ausgewählte Flächen:</span>
              <span className="font-medium">
                {Object.values(packageCounts).reduce((sum, count) => sum + count, 0) > 0
                  ? `${Object.values(packageCounts).reduce((sum, count) => sum + count, 0)} Fläche(n)`
                  : 'Keine ausgewählt'}
              </span>
            </div>
            {Object.values(packageCounts).reduce((sum, count) => sum + count, 0) > 0 && (
              <div className="text-sm text-gray-500 mt-1">
                {Object.entries(packageCounts).map(([id, count]) => {
                  if (count <= 0) return null;
                  const pkg = packageOptions.find(p => p.id === id);
                  return pkg ? (
                    <div key={id} className="flex justify-between">
                      <span>{count}x {pkg.name}</span>
                      <span className="font-medium">{(pkg.price * count).toFixed(2)}€</span>
                    </div>
                  ) : null;
                }).filter(Boolean)}
              </div>
            )}
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-600">Zusatzoptionen:</span>
            <span className="font-medium">
              {selectedAddons.length > 0
                ? selectedAddons.length
                : 'Keine ausgewählt'}
            </span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-600">Mietdauer:</span>
            <span className="font-medium">{rentalDuration} Monate</span>
          </div>
          {getDiscountRate() > 0 && (
            <div className="flex justify-between items-center mb-3 text-[#e17564]">
              <span>Rabatt:</span>
              <span className="font-medium">-{getDiscountRate() * 100}%</span>
            </div>
          )}
          <div className="border-t border-gray-300 my-4"></div>
          <div className="flex justify-between items-center text-xl font-bold">
            <span>Monatliche Kosten:</span>
            <span>{totalCost.monthly.toFixed(2)}€</span>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => {
              if (isVendorAuthenticated) {
                // Direct booking for authenticated vendors
                handleAuthenticatedBooking();
              } else {
                // Show registration modal for new users
                setShowRegistrationModal(true);
              }
            }}
            disabled={Object.values(packageCounts).reduce((sum, count) => sum + count, 0) === 0}
            className={`bg-[#e17564] text-white px-6 py-3 rounded-lg font-medium
              transition-all duration-200 flex items-center gap-2
              ${Object.values(packageCounts).reduce((sum, count) => sum + count, 0) === 0
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-[#e17564]/90 transform hover:scale-105'
              }`}
          >
            <Package className="w-5 h-5" />
            <span>{isVendorAuthenticated ? 'Zusätzliche Fläche buchen' : 'Paket buchen'}</span>
          </button>
        </div>
      </div>

      {/* Vendor Registration Modal */}
      <VendorRegistrationModal
        isOpen={showRegistrationModal}
        onClose={() => setShowRegistrationModal(false)}
        packageData={getPackageData()}
        onSuccess={handleRegistrationSuccess}
      />

      {/* Booking Confirmation Modal for Authenticated Vendors */}
      {showBookingConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-90vh overflow-y-auto">
            <h3 className="text-2xl font-bold text-[#09122c] mb-4">
              Zusätzliche Buchung bestätigen
            </h3>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Hallo {vendorUser?.name}, Sie möchten zusätzliche Verkaufsfläche buchen:
              </p>
              
              {/* Package Summary */}
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h4 className="font-semibold mb-2">Buchungsübersicht:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Provisionsmodell:</span>
                    <span>{provisionTypes.find(p => p.id === selectedProvisionType)?.name}</span>
                  </div>
                  {Object.entries(packageCounts).map(([id, count]) => {
                    if (count <= 0) return null;
                    const pkg = packageOptions.find(p => p.id === id);
                    return pkg ? (
                      <div key={id} className="flex justify-between">
                        <span>{count}x {pkg.name}</span>
                        <span>{(pkg.price * count).toFixed(2)}€/Monat</span>
                      </div>
                    ) : null;
                  }).filter(Boolean)}
                  <div className="flex justify-between">
                    <span>Laufzeit:</span>
                    <span>{rentalDuration} Monate</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Monatliche Kosten:</span>
                    <span>{totalCost.monthly.toFixed(2)}€</span>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-gray-600">
                Diese Buchung wird zu Ihren bestehenden Verkaufsflächen hinzugefügt.
              </p>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowBookingConfirmation(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={bookingInProgress}
              >
                Abbrechen
              </button>
              <button
                onClick={handleSubmitAuthenticatedBooking}
                className="px-6 py-2 bg-[#e17564] text-white rounded-lg hover:bg-[#e17564]/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                disabled={bookingInProgress}
              >
                {bookingInProgress ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Wird verarbeitet...
                  </>
                ) : (
                  <>
                    <Package className="w-4 h-4" />
                    Buchung bestätigen
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PackageBuilder;