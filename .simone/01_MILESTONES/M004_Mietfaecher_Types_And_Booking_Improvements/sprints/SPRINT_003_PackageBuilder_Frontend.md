---
sprint_id: M004_S003
milestone_id: M004
title: PackageBuilder Frontend Extension
status: planned
priority: medium
estimated_effort: 5-7 hours
sprint_duration: 2 days
dependencies: [M004_S001]
---

# Sprint M004_S003: PackageBuilder Frontend Extension

## Sprint Goal
Extend the PackageBuilder component to include new Mietfächer types and maintain intuitive user experience.

## Sprint Backlog

### PackageBuilder Component Updates
1. **Add New Package Options**
   - `block-freezer` (Gefrierregal) - pricing to be determined
   - `block-table` (Verkaufstisch) - update from existing vitrine
   - `block-other` (Sonstiges) - new flexible option
   - `block-window` (Schaufenster) - premium display option

2. **Update Package Configuration**
   ```typescript
   const packageOptions = {
     'block-a': { name: 'Regal Standard', price: 35, type: 'regal' },
     'block-b': { name: 'Regal Klein', price: 15, type: 'regal-b' },
     'block-cold': { name: 'Kühlregal', price: 50, type: 'kuehlregal' },
     'block-freezer': { name: 'Gefrierregal', price: 60, type: 'gefrierregal' },
     'block-table': { name: 'Verkaufstisch', price: 40, type: 'verkaufstisch' },
     'block-other': { name: 'Sonstiges', price: 25, type: 'sonstiges' },
     'block-window': { name: 'Schaufenster', price: 80, type: 'schaufenster' }
   };
   ```

3. **UI/UX Improvements**
   - Group related package types visually
   - Add icons or visual indicators for different space types
   - Maintain responsive design with additional options
   - Update pricing display and calculations

### Component Structure Updates
1. **Package Selection Interface**
   - Organize packages by category (Standard, Kühl/Gefrier, Premium)
   - Add tooltips explaining different space types
   - Ensure clear quantity selection for each type

2. **Pricing Display**
   - Update total calculations to include new types
   - Show package breakdown clearly
   - Maintain discount calculation accuracy

### State Management Updates
1. **Package State Structure**
   ```typescript
   interface PackageState {
     packages: {
       [key: string]: {
         quantity: number,
         price: number,
         type: MietfachTyp
       }
     },
     // ... existing fields
   }
   ```

2. **Validation Logic**
   - Ensure at least one package selected
   - Validate quantity limits per package type
   - Check package combinations for business rules

## Acceptance Criteria
- [ ] All 7 package types available for selection
- [ ] UI remains intuitive with additional options
- [ ] Pricing calculations work correctly for all types
- [ ] Package selection properly validates
- [ ] Responsive design maintained
- [ ] Existing functionality unaffected

## Definition of Done
- [ ] PackageBuilder component updated and tested
- [ ] All new package types selectable
- [ ] Pricing calculations accurate
- [ ] UI/UX reviewed and approved
- [ ] Component tests updated
- [ ] Cross-browser compatibility verified