# Task: TASK-037-update-vendor-model
Priority: medium
Status: pending

## User Acceptance Criteria
- [ ] User model updated with flourioPartnerId field
- [ ] Field properly typed as optional string
- [ ] Sync status fields added for tracking
- [ ] Database migration script created
- [ ] All existing tests passing with model changes
- [ ] TypeScript compilation successful

## Test Plan
### Unit Tests
- [ ] Test User model with flourioPartnerId field
- [ ] Test validation accepts valid Partner ID format
- [ ] Test field remains optional during creation
- [ ] Test sync status fields work correctly
- [ ] Co-located test file: User.test.ts

### Integration Tests  
- [ ] Test database operations with new fields
- [ ] Test migration script doesn't break existing data
- [ ] Test API endpoints accept new fields

### Manual Testing
- [ ] Verify existing vendors load correctly
- [ ] Test creating new vendor with Flourio fields
- [ ] Verify sync status tracking works

## Implementation Details
Update User model to include Flourio BusinessPartner tracking:

### Model Changes
```typescript
// server/src/models/User.ts
interface IUser {
  // existing fields...
  
  // Flourio BusinessPartner Integration
  flourioPartnerId?: string;  // Reference to Flourio BusinessPartner
  flourioSyncStatus?: 'pending' | 'synced' | 'error';
  flourioLastSyncAt?: Date;
  flourioLastError?: string;
  
  // Additional vendor-specific fields for mapping
  businessRegistrationNumber?: string;  // for BusinessPartner creation
  vatNumber?: string;                   // for tax handling
  preferredPaymentTerms?: string;       // for invoice management
}
```

### Schema Updates
```javascript
// Add to existing User schema
flourioPartnerId: {
  type: String,
  required: false,
  index: true  // for efficient lookups
},
flourioSyncStatus: {
  type: String,
  enum: ['pending', 'synced', 'error'],
  required: false,
  default: 'pending'
},
flourioLastSyncAt: {
  type: Date,
  required: false
},
flourioLastError: {
  type: String,
  required: false
}
```

### Database Migration
Create migration script to add new fields to existing vendor records

### Validation Updates
- flourioPartnerId accepts string format
- Sync status limited to valid enum values
- Date fields properly validated

## Dependencies
- TASK-035-create-businesspartner-service (service integration)

## Definition of Done
- [ ] User model updated with Flourio fields
- [ ] Database migration script created and tested
- [ ] Index created for flourioPartnerId field
- [ ] All unit tests updated and passing
- [ ] Integration tests verify database operations
- [ ] Validation rules working correctly
- [ ] TypeScript compilation successful
- [ ] Code review completed (if applicable)