import React from 'react';

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

interface PackageSelectorProps {
  packageOptions: PackageOption[];
  packageCounts: Record<string, number>;
  onTogglePackage: (packageId: string, isIncrementing: boolean) => void;
}

const PackageSelector: React.FC<PackageSelectorProps> = ({
  packageOptions,
  packageCounts,
  onTogglePackage,
}) => {
  const categoryTitles = {
    standard: 'Standard Regale',
    cooled: 'Kühl- & Gefrierflächen',
    premium: 'Verkaufstische',
    visibility: 'Sichtbarkeit'
  };

  const categoryIcons = {
    standard: '📦',
    cooled: '❄️',
    premium: '⭐',
    visibility: '👁️'
  };


  const renderPackageCard = (pkg: PackageOption) => (
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
        <span className="text-[#e17564] font-bold">
          {pkg.priceDisplay || `${pkg.price}€/Monat`}
        </span>
      </div>
      <p className="text-gray-600 mb-2">{pkg.description}</p>
      <p className="text-sm text-gray-500 italic">{pkg.detail}</p>
      
      <div className="flex justify-between items-center mt-4">
        <div className="flex items-center">
          {(packageCounts[pkg.id] || 0) > 0 && (
            <div className="flex items-center bg-[#e17564]/10 text-[#e17564] px-3 py-1 rounded-full font-medium">
              <span>Anzahl: {packageCounts[pkg.id] || 0}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {(packageCounts[pkg.id] || 0) > 0 && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onTogglePackage(pkg.id, false);
              }}
              className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 hover:bg-gray-100"
            >
              <span className="text-gray-700 font-bold">-</span>
            </button>
          )}
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onTogglePackage(pkg.id, true);
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#e17564] text-white hover:bg-[#e17564]/90"
          >
            <span className="font-bold">+</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Step 2: Verkaufsfläche wählen */}
      <div className="mb-10">
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <span className="bg-[#e17564] text-white rounded-full w-8 h-8 inline-flex items-center justify-center mr-2">2</span>
          Verkaufsflächen auswählen
        </h3>
        
        {/* Package Categories */}
        {['standard', 'cooled', 'premium'].map((category) => {
          const categoryPackages = packageOptions.filter(pkg => pkg.category === category);
          
          return (
            <div key={category} className="mb-6">
              <h4 className="text-lg font-medium mb-3 flex items-center text-[#09122c]">
                <span className="mr-2 text-xl">{categoryIcons[category as keyof typeof categoryIcons]}</span>
                {categoryTitles[category as keyof typeof categoryTitles]}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categoryPackages.map(renderPackageCard)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 3: Sichtbarkeit */}
      <div className="mb-10">
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <span className="bg-[#e17564] text-white rounded-full w-8 h-8 inline-flex items-center justify-center mr-2">3</span>
          Sichtbarkeit
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {packageOptions.filter(pkg => pkg.category === 'visibility').map(renderPackageCard)}
        </div>
      </div>
    </>
  );
};

export default PackageSelector;