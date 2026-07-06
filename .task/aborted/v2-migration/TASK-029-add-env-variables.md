# Task: TASK-029-add-env-variables
Priority: high
Status: pending

## User Acceptance Criteria
- [ ] Flourio API credentials added to server/.env.example
- [ ] Environment variables documented with descriptions
- [ ] Development/sandbox configuration provided
- [ ] Production configuration template provided
- [ ] Environment validation implemented
- [ ] TypeScript compilation successful
- [ ] All tests passing

## Test Plan
### Unit Tests
- [ ] Test environment variable validation function
- [ ] Test missing required variables throw errors
- [ ] Test optional variables have defaults
- [ ] Co-located test file: config/flourioConfig.test.ts

### Integration Tests  
- [ ] Test API client uses environment variables correctly
- [ ] Test mock mode toggle via environment

### Manual Testing
- [ ] Verify all environment variables load correctly
- [ ] Test with missing variables shows proper error
- [ ] Test development and production configurations

## Implementation Details
Add the following environment variables:

### server/.env.example
```env
# Flourio API Configuration
FLOURIO_API_URL=https://api.flour.cloud/api/v2
FLOURIO_API_KEY=your_api_key_here
FLOURIO_CLIENT_ID=your_client_id_here

# Development Configuration
FLOURIO_USE_MOCK=true
FLOURIO_MOCK_DELAY=500

# Sync Configuration
FLOURIO_SYNC_INTERVAL=300000
FLOURIO_RETRY_ATTEMPTS=3
FLOURIO_CACHE_TTL=60
FLOURIO_REQUEST_TIMEOUT=30000

# Webhook Configuration
FLOURIO_WEBHOOK_SECRET=your_webhook_secret_here
FLOURIO_WEBHOOK_ENABLED=false
```

Create config validation in server/src/config/flourioConfig.ts

## Dependencies
- TASK-027-create-flourio-service-structure (folder structure must exist)

## Definition of Done
- [ ] All environment variables added to .env.example
- [ ] Configuration validation implemented
- [ ] Error handling for missing variables
- [ ] Documentation for each variable
- [ ] Development and production examples provided
- [ ] Unit tests for config validation passing
- [ ] TypeScript compilation successful
- [ ] Code review completed (if applicable)