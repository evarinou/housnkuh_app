---
sprint_id: M004_S005
milestone_id: M004
title: Admin Interface Enhancements
status: planned
priority: high
estimated_effort: 8-10 hours
sprint_duration: 3 days
dependencies: [M004_S002, M004_S004]
---

# Sprint M004_S005: Admin Interface Enhancements

## Sprint Goal
Enhance the admin interface to display booking comments and provide pricing adjustment capabilities during Mietfach assignment.

## Sprint Backlog

### PendingBookingsPage Updates
1. **Display Booking Comments**
   - Add comments section to booking details
   - Show truncated comments with "read more" functionality
   - Handle bookings without comments gracefully
   - Add visual indicator when comments are present

2. **Enhanced Booking Information**
   ```tsx
   <div className="booking-details">
     {/* ... existing package details */}
     {booking.comments && (
       <div className="booking-comments">
         <h4>Anmerkungen des Direktvermarkters:</h4>
         <div className="comments-content">
           {booking.comments}
         </div>
       </div>
     )}
   </div>
   ```

### MietfachAssignmentModal Enhancements
1. **Comments Display**
   - Show vendor comments prominently at top of modal
   - Highlight important information from comments
   - Allow admin to reference comments while assigning spaces

2. **Individual Price Adjustment**
   - Add price input field for each assigned Mietfach
   - Display original package price as reference
   - Show calculated total with adjustments
   - Validate price inputs (positive numbers, reasonable ranges)

3. **Pricing Interface**
   ```tsx
   <div className="mietfach-assignment">
     <div className="original-price">
       Originalpreis: {originalPrice}€/Monat
     </div>
     <div className="price-adjustment">
       <label>Angepasster Preis:</label>
       <input
         type="number"
         value={adjustedPrice}
         onChange={handlePriceChange}
         min="0"
         step="0.01"
       />
       <span className="currency">€/Monat</span>
     </div>
     {adjustedPrice !== originalPrice && (
       <div className="price-change-indicator">
         Preisanpassung: {getPriceChangeText()}
       </div>
     )}
   </div>
   ```

### Enhanced Assignment Logic
1. **Price Adjustment Handling**
   - Store individual price adjustments per Mietfach
   - Apply discounts to adjusted prices (not original)
   - Validate price changes before confirmation
   - Log price adjustments for audit purposes

2. **Assignment Validation**
   - Ensure all assigned Mietfächer have valid prices
   - Check price adjustment reasonableness
   - Confirm assignment with price summary

3. **Confirmation Process**
   ```typescript
   interface MietfachAssignment {
     mietfachId: string;
     originalPrice: number;
     adjustedPrice: number;
     priceChangeReason?: string;
   }
   ```

### UI/UX Improvements
1. **Visual Design**
   - Clear separation between comments and assignment sections
   - Highlighted price changes with color coding
   - Responsive design for different screen sizes
   - Loading states during assignment process

2. **User Experience**
   - Confirmation dialog showing price changes summary
   - Undo functionality for price adjustments
   - Clear error messages for invalid inputs
   - Keyboard navigation support

## Acceptance Criteria
- [ ] Booking comments displayed clearly to admins
- [ ] Price adjustment interface intuitive and functional
- [ ] Original vs adjusted prices clearly shown
- [ ] Price validation prevents invalid entries
- [ ] Assignment process works with price adjustments
- [ ] Comments help admins make better assignment decisions
- [ ] Audit trail maintained for price changes

## Definition of Done
- [ ] Admin interface updated and tested
- [ ] Comments display implemented
- [ ] Price adjustment functionality working
- [ ] Input validation in place
- [ ] UI/UX reviewed and approved
- [ ] Assignment process handles pricing correctly
- [ ] Error handling comprehensive