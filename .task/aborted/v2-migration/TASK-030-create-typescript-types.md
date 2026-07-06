# Task: TASK-030-create-typescript-types
Priority: high
Status: pending

## User Acceptance Criteria
- [ ] TypeScript interfaces created for all major Flourio API responses
- [ ] Article, Stock, BusinessPartner, and Document types defined
- [ ] Common utility types and enums created
- [ ] Request/response types for all endpoints defined
- [ ] Type exports properly organized in index files
- [ ] TypeScript compilation successful with strict mode
- [ ] All imports resolve correctly

## Test Plan
### Unit Tests
- [ ] Test that all types can be imported correctly
- [ ] Test type compatibility with API responses
- [ ] Test that all required fields are properly typed
- [ ] Co-located test files for complex types

### Integration Tests  
- [ ] Test types work with actual API responses
- [ ] Test type guards and validators work correctly

### Manual Testing
- [ ] Verify TypeScript IntelliSense works with all types
- [ ] Test that API responses match type definitions
- [ ] Verify no TypeScript compilation errors

## Implementation Details
Create comprehensive TypeScript types based on Flourio API documentation:

### types/common.types.ts
- Base response interfaces
- Error response types
- Pagination types
- Common enums (Status, Currency, etc.)

### types/articles.types.ts
- Article interface
- ArticleCreateRequest
- ArticleUpdateRequest
- ArticleListResponse

### types/stocks.types.ts
- Stock interface
- StockCreateRequest
- StockMovement types

### types/businessPartners.types.ts
- BusinessPartner interface
- Address types
- Contact information types

### types/documents.types.ts
- Document interface
- Invoice types
- Receipt types

## Dependencies
- TASK-027-create-flourio-service-structure (folder structure must exist)
- Flourio API documentation (already available)

## Definition of Done
- [ ] All major API response types implemented
- [ ] Request types for all CRUD operations
- [ ] Type exports properly organized
- [ ] TypeScript strict mode compatibility
- [ ] Type guards implemented where needed
- [ ] IntelliSense working in IDE
- [ ] TypeScript compilation successful
- [ ] Code review completed (if applicable)