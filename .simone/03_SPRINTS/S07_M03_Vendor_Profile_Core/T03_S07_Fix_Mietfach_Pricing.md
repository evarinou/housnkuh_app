# T03 - Fix Mietfach Pricing Model (R009)

## Task Overview
**Sprint**: S07 - Vendor Profile Core  
**Requirement**: R009 - Mietfach Pricing Model Correction  
**Priority**: Medium  
**Estimated Effort**: 3 hours

## Description
Correct the pricing data model by removing price storage from Mietfach and ensuring prices are only stored in Vertrag (contracts) where they belong logically.

## Acceptance Criteria
- [ ] Remove price-related fields from Mietfach model
- [ ] Ensure prices are only in Vertrag model
- [ ] Update any UI that incorrectly shows Mietfach prices
- [ ] Create database migration if needed
- [ ] Update API endpoints that return pricing data
- [ ] Fix any broken functionality due to model changes

## Technical Tasks
1. **Update Data Models**
   - Remove price fields from Mietfach model
   - Verify Vertrag model has proper pricing fields
   - Check related models for dependencies

2. **Database Changes**
   - Create migration script if needed
   - Remove price data from existing Mietfach records
   - Verify data integrity

3. **Update Controllers/Routes**
   - Fix any controllers that reference Mietfach prices
   - Update API responses
   - Ensure proper data relationships

4. **Frontend Updates**
   - Remove any UI showing Mietfach prices
   - Update components to get pricing from contracts
   - Fix any broken displays

## Files to Check/Modify
- `server/src/models/Mietfach.ts`
- `server/src/models/Vertrag.ts`
- `server/src/controllers/mietfachController.ts`
- `server/src/controllers/vertragController.ts`
- Frontend components displaying pricing

## Definition of Done
- No price fields in Mietfach model
- Pricing logic only uses Vertrag data
- No broken functionality
- Database is consistent
- UI correctly displays contract-based pricing