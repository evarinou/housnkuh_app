import React from 'react';
import { Package } from 'lucide-react';
import VendorRegistrationModal from './VendorRegistrationModal';
import ZusatzleistungenSelector from './ZusatzleistungenSelector';
import ProvisionSelector from './booking/ProvisionSelector';
import PackageSelector from './booking/PackageSelector';
import PriceSummary from './booking/PriceSummary';
import BookingConfirmation from './booking/BookingConfirmation';
import { useVendorAuth } from '../contexts/VendorAuthContext';
import { usePackageBuilder } from '../hooks/usePackageBuilder';

// Safe hook wrapper that handles missing context
const useSafeVendorAuth = () => {
  try {
    return useVendorAuth();
  } catch {
    return { isAuthenticated: false, user: null };
  }
};

const PackageBuilder: React.FC = () => {
  const { isAuthenticated: isVendorAuthenticated, user: vendorUser } = useSafeVendorAuth();
  
  const {
    selectedProvisionType,
    packageCounts,
    rentalDuration,
    totalCost,
    zusatzleistungen,
    showRegistrationModal,
    showBookingConfirmation,
    bookingInProgress,
    provisionTypes,
    packageOptions,
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
  } = usePackageBuilder();

  const handleBookingClick = () => {
    if (isVendorAuthenticated) {
      handleAuthenticatedBooking(vendorUser);
    } else {
      setShowRegistrationModal(true);
    }
  };

  const handleBookingSubmit = () => {
    handleSubmitAuthenticatedBooking(vendorUser);
  };

  const handleBookingClose = () => {
    setShowBookingConfirmation(false);
  };

  const isBookingDisabled = Object.values(packageCounts).reduce((sum, count) => sum + count, 0) === 0;

  return (
    <>
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6 mb-16">
        <h2 className="text-2xl font-bold text-[#09122c] mb-6 text-center">
          Stelle dein individuelles Mietpaket zusammen
        </h2>

        {/* Step 1: Provision Type Selection */}
        <ProvisionSelector
          provisionTypes={provisionTypes}
          selectedProvisionType={selectedProvisionType}
          onProvisionTypeChange={setSelectedProvisionType}
        />

        {/* Zusatzleistungen */}
        <div className="mb-10">
          <ZusatzleistungenSelector
            zusatzleistungen={zusatzleistungen}
            onChange={setZusatzleistungen}
            disabled={selectedProvisionType !== 'premium'}
          />
        </div>

        {/* Steps 2-3: Package Selection */}
        <PackageSelector
          packageOptions={packageOptions}
          packageCounts={packageCounts}
          onTogglePackage={togglePackage}
        />

        {/* Step 4: Price Summary */}
        <PriceSummary
          provisionTypes={provisionTypes}
          packageOptions={packageOptions}
          selectedProvisionType={selectedProvisionType}
          packageCounts={packageCounts}
          rentalDuration={rentalDuration}
          totalCost={totalCost}
          zusatzleistungen={zusatzleistungen}
          discountRate={getDiscountRate()}
          onRentalDurationChange={setRentalDuration}
        />

        {/* Booking Button */}
        <div className="flex justify-center">
          <button
            onClick={handleBookingClick}
            disabled={isBookingDisabled}
            className={`bg-[#e17564] text-white px-6 py-3 rounded-lg font-medium
              transition-all duration-200 flex items-center gap-2
              ${isBookingDisabled
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

      {/* Booking Confirmation Modal */}
      <BookingConfirmation
        showBookingConfirmation={showBookingConfirmation}
        bookingInProgress={bookingInProgress}
        vendorUser={vendorUser}
        provisionTypes={provisionTypes}
        packageOptions={packageOptions}
        selectedProvisionType={selectedProvisionType}
        packageCounts={packageCounts}
        rentalDuration={rentalDuration}
        totalCost={totalCost}
        zusatzleistungen={zusatzleistungen}
        onClose={handleBookingClose}
        onSubmit={handleBookingSubmit}
      />
    </>
  );
};

export default PackageBuilder;