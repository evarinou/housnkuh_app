# T02_S09A: Seamless Authenticated Vendor Booking

## Task Overview
**Sprint**: S09A - Navigation & Authentication Enhancement  
**Story Points**: 4 SP  
**Priority**: High  
**Type**: Feature Enhancement  

## User Story
**As a** logged-in vendor  
**I want** to book additional rental spaces without going through login again  
**So that** I can quickly expand my presence without authentication friction

## Acceptance Criteria

### AC1: Authenticated Vendor Detection
- **Given** I am logged in as a vendor
- **When** I click "Paket buchen" on the PackageBuilder
- **Then** the system should detect my authentication status

### AC2: Skip Registration Modal
- **Given** I am an authenticated vendor booking additional space
- **When** the booking process starts
- **Then** I should skip the VendorRegistrationModal entirely

### AC3: Direct Booking Confirmation
- **Given** I am an authenticated vendor
- **When** I proceed with booking
- **Then** I should see a booking confirmation interface directly

### AC4: Maintain Existing Flow for New Users
- **Given** I am not logged in
- **When** I attempt to book space
- **Then** I should see the existing registration/login modal

## Technical Implementation

### Files to Modify
1. `client/src/components/PackageBuilder.tsx` (lines 544-558)
2. `client/src/components/VendorRegistrationModal.tsx`

### PackageBuilder Enhancement

#### Add Authentication Context
```typescript
// At the top of PackageBuilder.tsx
import { useVendorAuth } from '../contexts/VendorAuthContext';

// Inside PackageBuilder component
const { isAuthenticated: isVendorAuthenticated, user: vendorUser } = useVendorAuth();
```

#### Modify Booking Button Logic
```typescript
// Replace the existing button onClick handler around line 545
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
```

#### Add Authenticated Booking Handler
```typescript
// Add new state for booking confirmation
const [showBookingConfirmation, setShowBookingConfirmation] = useState(false);
const [bookingInProgress, setBookingInProgress] = useState(false);

// Add authenticated booking handler
const handleAuthenticatedBooking = async () => {
  if (!isVendorAuthenticated || !vendorUser) {
    console.error('User not authenticated');
    return;
  }

  setShowBookingConfirmation(true);
};

// Add booking submission handler
const handleSubmitAuthenticatedBooking = async () => {
  setBookingInProgress(true);
  
  try {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
    const token = localStorage.getItem('vendorToken');
    
    const bookingData = {
      userId: vendorUser.id,
      packageData: getPackageData(),
      // Include all package configuration
    };

    const response = await axios.post(`${apiUrl}/vendor-auth/additional-booking`, bookingData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      // Booking successful
      alert('Zusätzliche Buchung erfolgreich eingereicht!');
      setShowBookingConfirmation(false);
      // Optionally redirect to dashboard
      window.location.href = '/vendor/dashboard';
    } else {
      throw new Error(response.data.message || 'Booking failed');
    }
  } catch (error) {
    console.error('Booking error:', error);
    alert('Fehler bei der Buchung. Bitte versuchen Sie es später erneut.');
  } finally {
    setBookingInProgress(false);
  }
};
```

#### Add Booking Confirmation Modal
```typescript
// Add after the existing VendorRegistrationModal
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
            <div className="flex justify-between">
              <span>Monatliche Kosten:</span>
              <span className="font-bold">{totalCost.monthly.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between">
              <span>Laufzeit:</span>
              <span>{rentalDuration} Monate</span>
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
```

### Backend API Enhancement (if needed)

#### Add Additional Booking Endpoint
```typescript
// In server/src/controllers/vendorAuthController.ts
export const additionalBooking = async (req: Request, res: Response) => {
  try {
    const { userId, packageData } = req.body;
    
    // Verify user is authenticated and matches token
    if (req.user?.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized booking attempt'
      });
    }

    // Process additional booking
    // Similar to existing booking logic but for additional spaces
    
    res.json({
      success: true,
      message: 'Additional booking submitted successfully',
      bookingId: newBookingId
    });
  } catch (error) {
    console.error('Additional booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process additional booking'
    });
  }
};
```

#### Add Route
```typescript
// In server/src/routes/vendorAuthRoutes.ts
router.post('/additional-booking', authMiddleware, additionalBooking);
```

## Testing Requirements

### Unit Tests
- Test PackageBuilder with authenticated vs non-authenticated users
- Test booking confirmation modal rendering
- Test booking submission with valid/invalid data

### Integration Tests
- Test complete authenticated booking flow
- Test fallback to registration modal for non-authenticated users
- Test API integration for additional bookings

### Manual Testing Checklist
- [ ] Login as vendor → attempt booking → verify skips registration modal
- [ ] Not logged in → attempt booking → verify shows registration modal
- [ ] Complete authenticated booking → verify success flow
- [ ] Test booking confirmation modal → verify all data displayed correctly
- [ ] Test booking submission → verify API call and response handling
- [ ] Test error scenarios → verify proper error handling

## Dependencies
- Existing `VendorAuthContext` for authentication state
- Current `PackageBuilder` component structure
- Existing booking API endpoints (may need enhancement)
- `VendorRegistrationModal` component (minimal changes)

## Definition of Done
- [ ] Authenticated vendors skip registration modal
- [ ] Booking confirmation modal displays correctly
- [ ] Booking submission works end-to-end
- [ ] Non-authenticated users still see registration modal
- [ ] Error handling works for all scenarios
- [ ] Code reviewed and approved
- [ ] Integration testing completed
- [ ] No regression in existing booking flow

## Notes
- Maintain backward compatibility with existing booking flow
- Consider adding booking history to vendor dashboard
- Ensure proper error handling for API failures
- Add loading states for better user experience