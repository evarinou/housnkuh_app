import React, { useState, useEffect, useCallback, useMemo } from 'react'; // Added useMemo
import { Package, Check, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

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
  // State für gewählte Optionen
  const [selectedProvisionType, setSelectedProvisionType] = useState('basic');
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [rentalDuration, setRentalDuration] = useState(3); // Monate
  const [showSummary, setShowSummary] = useState(false);
  const [totalCost, setTotalCost] = useState<TotalCost>({
    monthly: 0,
    oneTime: 0,
    provision: 0,
  });

  // Daten für die verschiedenen Optionen
  // Memoized with useMemo to ensure stable references across renders
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
  ], []); // Empty dependency array means it's created once

  const packageOptions: PackageOption[] = useMemo(() => [
    {
      id: 'block-a',
      name: 'Verkaufsblock Lage A',
      price: 35,
      description: 'Regal auf Augenhöhe, 80x39x67cm (2 Ebenen)',
      image: '/api/placeholder/200/150', // Placeholder, replace with actual image path or logic
      detail: 'Optimale Sichtbarkeit, beste Platzierung'
    },
    {
      id: 'block-b',
      name: 'Verkaufsblock Lage B',
      price: 15,
      description: 'Standard Regalfläche, 80x39x33,5cm (1 Ebene)',
      image: '/api/placeholder/200/150', // Placeholder
      detail: 'Kostengünstige Option für Einsteiger'
    },
    {
      id: 'block-cold',
      name: 'Verkaufsblock gekühlt',
      price: 50,
      description: 'Gekühlter Bereich für temperaturempfindliche Produkte',
      image: '/api/placeholder/200/150', // Placeholder
      detail: 'Für Frischeprodukte, konstante Kühlung'
    },
    {
      id: 'block-table',
      name: 'Verkaufsblock Tisch',
      price: 40,
      description: 'Präsentationstisch für besondere Produkte',
      image: '/api/placeholder/200/150', // Placeholder
      detail: 'Ideale Präsentationsfläche für Spezialprodukte'
    }
  ], []); // Empty dependency array

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
  ], []); // Empty dependency array

  // Rabatte basierend auf Mietdauer
  // Memoized with useCallback as it's a dependency of useEffect
  const getDiscountRate = useCallback(() => {
    if (rentalDuration >= 12) return 0.1; // 10% Rabatt
    if (rentalDuration >= 6) return 0.05; // 5% Rabatt
    return 0;
  }, [rentalDuration]); // Dependency: rentalDuration

  // Berechnet die monatlichen Kosten
  // useEffect on line 180 (approximately, after useMemo additions)
  useEffect(() => {
    const discount = getDiscountRate();
    const packageCosts = selectedPackages.reduce((sum, pkgId) => {
      const option = packageOptions.find(p => p.id === pkgId);
      return sum + (option ? option.price : 0);
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
      provision: currentProvisionType ? currentProvisionType.rate : 4 // Default to 4 if not found
    });
  }, [
    selectedProvisionType,
    selectedPackages,
    selectedAddons,
    rentalDuration,
    addonOptions,      // Now a stable reference from useMemo
    getDiscountRate,   // Stable reference from useCallback
    packageOptions,    // Now a stable reference from useMemo
    provisionTypes     // Now a stable reference from useMemo
  ]);

  // Paket hinzufügen/entfernen
  const togglePackage = (packageId: string) => {
    setSelectedPackages(prevSelectedPackages =>
      prevSelectedPackages.includes(packageId)
        ? prevSelectedPackages.filter(id => id !== packageId)
        : [...prevSelectedPackages, packageId]
    );
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

  // Zusammenfassung anzeigen und Anfrage absenden
  const handleSubmitRequest = () => {
    setShowSummary(true);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6 mb-16">
      {!showSummary ? (
        <>
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
                  onClick={() => togglePackage(pkg.id)}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                    selectedPackages.includes(pkg.id)
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
                  {/* Image placeholder for package option */}
                  {/* <img src={pkg.image} alt={pkg.name} className="w-full h-32 object-cover rounded-md my-2"/> */}
                  <div className="flex justify-end mt-3">
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      selectedPackages.includes(pkg.id)
                        ? 'bg-[#e17564] text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}>
                      {selectedPackages.includes(pkg.id) ? 'Ausgewählt' : 'Auswählen'}
                    </span>
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
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-600">Ausgewählte Flächen:</span>
              <span className="font-medium">
                {selectedPackages.length > 0
                  ? selectedPackages.length
                  : 'Keine ausgewählt'}
              </span>
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
              onClick={handleSubmitRequest}
              disabled={selectedPackages.length === 0}
              className={`bg-[#e17564] text-white px-6 py-3 rounded-lg font-medium
                transition-all duration-200 flex items-center gap-2
                ${selectedPackages.length === 0
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-[#e17564]/90 transform hover:scale-105'
                }`}
            >
              <Package className="w-5 h-5" />
              <span>Paket anfragen</span>
            </button>
          </div>
        </>
      ) : (
        <div className="text-center">
          <div className="mb-6 inline-block bg-green-100 p-3 rounded-full">
            <Check className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#09122c] mb-3">Deine Mietanfrage</h2>
          <p className="text-gray-600 mb-6">
            Vielen Dank für dein Interesse an housnkuh! Wir melden uns schnellstmöglich bei dir.
          </p>
          <div className="bg-gray-50 p-6 rounded-lg mb-6 max-w-md mx-auto text-left">
            <h3 className="text-xl font-semibold mb-4 text-center">Dein ausgewähltes Paket:</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Provisionsmodell:</span>
                <span className="font-semibold">
                  {provisionTypes.find(p => p.id === selectedProvisionType)?.name} ({totalCost.provision}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Verkaufsflächen:</span>
                <span className="font-semibold">
                  {selectedPackages.map(id => packageOptions.find(p => p.id === id)?.name).join(', ') || 'Keine'}
                </span>
              </div>
              {selectedAddons.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Zusatzoptionen:</span>
                  <span className="font-semibold">
                    {selectedAddons.map(id => addonOptions.find(a => a.id === id)?.name).join(', ')}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Mietdauer:</span>
                <span className="font-semibold">{rentalDuration} Monate</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-gray-300 text-lg font-bold">
                <span>Monatliche Kosten:</span>
                <span>{totalCost.monthly.toFixed(2)}€</span>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setShowSummary(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Zurück zum Konfigurator
            </button>
            <Link
              to="/kontakt"
              className="bg-[#e17564] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#e17564]/90 transition-colors inline-flex items-center justify-center"
            >
              Zum Kontaktformular
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackageBuilder;
