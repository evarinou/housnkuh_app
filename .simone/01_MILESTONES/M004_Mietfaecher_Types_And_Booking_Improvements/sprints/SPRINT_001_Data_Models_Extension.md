---
sprint_id: M004_S001
milestone_id: M004
title: Data Models and Type System Extension
status: planned
priority: high
estimated_effort: 8-10 hours
sprint_duration: 3 days
dependencies: []
---

# Sprint M004_S001: Data Models and Type System Extension

## Sprint Goal
Update all data models, TypeScript interfaces, and type definitions to support the new Mietfächer types and booking comments functionality.

## Sprint Backlog

### Backend Tasks
1. **Update Mietfach Model Schema**
   - Extend `typ` enum with new types: `gefrierregal`, `verkaufstisch`, `sonstiges`, `schaufenster`
   - Update validation rules
   - Add migration script for existing data

2. **Extend User Model for Comments**
   - Add optional `comments` field to `pendingBooking` structure
   - Update TypeScript interfaces
   - Ensure backward compatibility

3. **Update Package Type Mappings**
   - Extend `packageTypeMapping` object in booking logic
   - Update validation for new package types
   - Document mapping relationships

### TypeScript Interface Updates
1. **Update IMietfach Interface**
   ```typescript
   interface IMietfach {
     typ: 'regal' | 'regal-b' | 'kuehlregal' | 'gefrierregal' | 'verkaufstisch' | 'sonstiges' | 'schaufenster'
   }
   ```

2. **Update IUser Interface**
   ```typescript
   interface IUser {
     pendingBooking?: {
       packageData: any,
       comments?: string, // NEW
       createdAt: Date,
       status: string
     }
   }
   ```

### Database Migration
1. **Create Migration Script**
   - Handle existing Mietfächer with old type names
   - Ensure data integrity during type updates
   - Rollback strategy

## Acceptance Criteria
- [ ] All 7 Mietfächer types properly defined in schema
- [ ] Comments field added to User model without breaking existing functionality
- [ ] Package type mapping updated and validated
- [ ] TypeScript compilation successful with no type errors
- [ ] Migration script tested and ready
- [ ] Backward compatibility maintained

## Definition of Done
- [ ] Code changes committed and tested
- [ ] Migration script tested on development data
- [ ] TypeScript interfaces updated and validated
- [ ] No breaking changes to existing functionality
- [ ] Documentation updated for new types