# Task: TASK-028-implement-api-client
Priority: high
Status: pending

## User Acceptance Criteria
- [ ] HTTP client class implemented using axios
- [ ] Authentication with Bearer token working
- [ ] Request/response interceptors implemented
- [ ] Error handling and retry logic implemented
- [ ] Mock mode support for development
- [ ] TypeScript compilation successful
- [ ] All unit tests passing

## Test Plan
### Unit Tests
- [ ] Test client initialization with valid config
- [ ] Test authentication header injection
- [ ] Test request interceptor functionality
- [ ] Test response interceptor and error handling
- [ ] Test mock mode toggle
- [ ] Co-located test file: client.test.ts

### Integration Tests  
- [ ] Test actual API call to Flourio (with test credentials)
- [ ] Test timeout and retry behavior
- [ ] Test authentication failure handling

### Manual Testing
- [ ] Verify client connects to Flourio API
- [ ] Verify mock mode works in development
- [ ] Test error scenarios manually

## Implementation Details
Implement FlourioApiClient class with:
- Axios-based HTTP client
- Automatic Bearer token authentication
- Request/response logging
- Rate limiting respect (100 req/min)
- Retry logic for 429/503 errors
- Mock mode for local development

## Dependencies
- TASK-027-create-flourio-service-structure (folder structure must exist)
- TASK-029-add-env-variables (API credentials needed)

## Definition of Done
- [ ] FlourioApiClient class fully implemented
- [ ] Authentication working with real API
- [ ] Mock mode functional for development
- [ ] All error scenarios handled gracefully
- [ ] Unit tests implemented and passing
- [ ] Integration tests implemented and passing
- [ ] TypeScript compilation successful
- [ ] Code review completed (if applicable)