# Task: TASK-031-map-mietfach-to-stock
Priority: high
Status: pending

## User Acceptance Criteria
- [ ] Mapping schema defined between Mietfach and Flourio Stock
- [ ] Transformation functions implemented for both directions
- [ ] Field mapping documented with examples
- [ ] Validation rules implemented for mapping
- [ ] Unit tests cover all mapping scenarios
- [ ] TypeScript compilation successful

## Test Plan
### Unit Tests
- [ ] Test Mietfach to Stock transformation
- [ ] Test Stock to Mietfach transformation
- [ ] Test edge cases and validation failures
- [ ] Test mapping with missing optional fields
- [ ] Co-located test file: stockMapping.test.ts

### Integration Tests  
- [ ] Test mapping with real Mietfach data
- [ ] Test bidirectional mapping consistency

### Manual Testing
- [ ] Verify mapping logic with sample data
- [ ] Test validation rules work correctly
- [ ] Verify error messages are clear

## Implementation Details
Create mapping service with the following transformations:

### Mietfach → Flourio Stock
```typescript
interface MietfachToStockMapping {
  displayName: string;        // `Lagerplatz ${nummer}`
  location: string;           // standort
  capacity?: number;          // groesse 
  type: string;              // typ
  description?: string;       // beschreibung
  active: boolean;           // verfuegbar
  metadata: {
    housnkuhMietfachId: string;
    nummer: string;
    groesse: string;
    preis: number;
  }
}
```

### Validation Rules
- All required fields must be present
- Location must not be empty
- Capacity must be positive number
- Type must be valid enum value

## Dependencies
- TASK-027-create-flourio-service-structure (folder structure)
- TASK-030-create-typescript-types (type definitions)

## Definition of Done
- [ ] Mapping schema fully documented
- [ ] Bidirectional transformation functions implemented
- [ ] Field validation implemented
- [ ] All edge cases handled
- [ ] Unit tests implemented and passing
- [ ] Integration tests passing
- [ ] TypeScript compilation successful
- [ ] Code review completed (if applicable)