# Task: TASK-048-write-integration-tests
Priority: high
Status: pending

## User Acceptance Criteria
- [ ] Integration tests created for all Flourio API endpoints
- [ ] Tests cover both mock and real API scenarios
- [ ] End-to-end workflow tests implemented
- [ ] Error handling and edge cases tested
- [ ] Test data setup and teardown working
- [ ] All tests passing in CI/CD pipeline

## Test Plan
### Unit Tests
- [ ] Test individual API client methods
- [ ] Test request/response transformation
- [ ] Test error handling for different response codes
- [ ] Test authentication and rate limiting
- [ ] Co-located test file: flourioApiIntegration.test.ts

### Integration Tests  
- [ ] Test complete sync workflows end-to-end
- [ ] Test database persistence after sync operations
- [ ] Test mock server integration

### Manual Testing
- [ ] Run integration tests against mock server
- [ ] Run integration tests against Flourio sandbox (if available)
- [ ] Verify test coverage metrics

## Implementation Details
Create comprehensive integration test suite:

### Main Integration Test Suite
```typescript
// server/src/tests/integration/flourioApiIntegration.test.ts
import { describe, beforeAll, afterAll, beforeEach, afterEach, it, expect } from '@jest/globals';
import { FlourioMockServer } from '../../mock/flourioMockServer';
import { ArticleService } from '../../services/flourio/articleService';
import { StockService } from '../../services/flourio/stockService';
import { BusinessPartnerService } from '../../services/flourio/businessPartnerService';
import { DocumentSyncService } from '../../services/flourio/documentSyncService';
import { connectTestDatabase, disconnectTestDatabase } from '../helpers/testDatabase';

describe('Flourio API Integration Tests', () => {
  let mockServer: FlourioMockServer;
  let articleService: ArticleService;
  let stockService: StockService;
  let businessPartnerService: BusinessPartnerService;
  let documentSyncService: DocumentSyncService;

  beforeAll(async () => {
    // Start mock server
    mockServer = new FlourioMockServer(3002);
    await mockServer.start();

    // Set environment for mock server
    process.env.FLOURIO_USE_MOCK = 'true';
    process.env.FLOURIO_MOCK_SERVER_URL = 'http://localhost:3002/api/v2';
    process.env.FLOURIO_API_KEY = 'mock-api-key';

    // Connect to test database
    await connectTestDatabase();

    // Initialize services
    articleService = new ArticleService();
    stockService = new StockService();
    businessPartnerService = new BusinessPartnerService();
    documentSyncService = new DocumentSyncService();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
    // Mock server cleanup happens automatically
  });

  describe('Article Service Integration', () => {
    it('should create, read, update, and delete articles', async () => {
      // Create article
      const articleData = {
        name: 'Test Product',
        description: 'Test Description',
        category: 'Gemüse',
        pricing: {
          basePrice: 5.99,
          currency: 'EUR',
          vatRate: 7.0
        }
      };

      const createdArticle = await articleService.createArticle(articleData);
      expect(createdArticle.id).toBeDefined();
      expect(createdArticle.name).toBe(articleData.name);

      // Read article
      const fetchedArticle = await articleService.getArticle(createdArticle.id);
      expect(fetchedArticle.id).toBe(createdArticle.id);

      // Update article
      const updateData = { name: 'Updated Test Product' };
      const updatedArticle = await articleService.updateArticle(createdArticle.id, updateData);
      expect(updatedArticle.name).toBe(updateData.name);

      // Delete article
      await articleService.deleteArticle(createdArticle.id);

      // Verify deletion
      await expect(articleService.getArticle(createdArticle.id))
        .rejects.toThrow('Article not found');
    });

    it('should list articles with pagination', async () => {
      const articles = await articleService.listArticles({
        page: 1,
        limit: 10,
        category: 'Gemüse'
      });

      expect(articles).toBeDefined();
      expect(articles.data).toBeInstanceOf(Array);
      expect(articles.pagination).toBeDefined();
      expect(articles.pagination.page).toBe(1);
      expect(articles.pagination.limit).toBe(10);
    });

    it('should handle validation errors gracefully', async () => {
      const invalidArticleData = {
        // Missing required fields
        description: 'Test Description'
      };

      await expect(articleService.createArticle(invalidArticleData))
        .rejects.toThrow(/validation/i);
    });

    it('should sync stock levels correctly', async () => {
      const article = await articleService.createArticle({
        name: 'Stock Test Product',
        category: 'Gemüse',
        pricing: { basePrice: 3.99, currency: 'EUR', vatRate: 7.0 }
      });

      const stockData = await articleService.syncStockLevels(article.id);
      expect(stockData.articleId).toBe(article.id);
      expect(stockData.currentStock).toBeDefined();
      expect(stockData.availableStock).toBeDefined();
    });
  });

  describe('Stock Service Integration', () => {
    it('should create and manage stock locations', async () => {
      const stockData = {
        displayName: 'Test Lagerplatz 001',
        location: 'München',
        capacity: 500,
        type: 'dry',
        active: true
      };

      const createdStock = await stockService.createStock(stockData);
      expect(createdStock.id).toBeDefined();
      expect(createdStock.displayName).toBe(stockData.displayName);

      // Test stock movements
      const movementData = {
        type: 'increase',
        quantity: 50,
        reason: 'Initial stock'
      };

      const movement = await stockService.createStockMovement(createdStock.id, movementData);
      expect(movement.stockId).toBe(createdStock.id);
      expect(movement.quantity).toBe(movementData.quantity);
    });

    it('should sync with Mietfach data correctly', async () => {
      // Create test Mietfach
      const testMietfach = await createTestMietfach();
      
      const syncResult = await stockService.syncMietfachToStock(testMietfach._id);
      expect(syncResult.stockId).toBeDefined();
      expect(syncResult.status).toBe('synced');

      // Verify Mietfach was updated with stock ID
      const updatedMietfach = await getMietfach(testMietfach._id);
      expect(updatedMietfach.flourioStockId).toBe(syncResult.stockId);
    });
  });

  describe('BusinessPartner Service Integration', () => {
    it('should create business partners from vendor data', async () => {
      const testVendor = await createTestVendor();

      const businessPartner = await businessPartnerService.createBusinessPartnerFromVendor(testVendor._id);
      expect(businessPartner.id).toBeDefined();
      expect(businessPartner.companyName).toBe(testVendor.businessName);
      expect(businessPartner.email).toBe(testVendor.email);

      // Verify vendor was updated
      const updatedVendor = await getUser(testVendor._id);
      expect(updatedVendor.flourioPartnerId).toBe(businessPartner.id);
    });

    it('should handle duplicate business partner creation', async () => {
      const testVendor = await createTestVendor();
      
      // Create first business partner
      await businessPartnerService.createBusinessPartnerFromVendor(testVendor._id);
      
      // Attempt to create duplicate should update existing
      const result = await businessPartnerService.createBusinessPartnerFromVendor(testVendor._id);
      expect(result.action).toBe('updated');
    });
  });

  describe('Document Sync Service Integration', () => {
    it('should sync documents and create invoices', async () => {
      const syncResult = await documentSyncService.syncDocuments();
      
      expect(syncResult.synced).toBeGreaterThanOrEqual(0);
      expect(syncResult.failed).toBeGreaterThanOrEqual(0);
      expect(syncResult.errors).toBeInstanceOf(Array);
    });

    it('should handle document mapping errors gracefully', async () => {
      // This test would verify that malformed documents don't crash the sync
      const mockMalformedDocument = {
        id: 'malformed_doc',
        // Missing required fields
      };

      // The sync service should log errors but continue processing
      await expect(documentSyncService.processDocument(mockMalformedDocument))
        .rejects.toThrow();
    });

    it('should track sync status correctly', async () => {
      const syncStatus = await documentSyncService.getSyncStatus();
      expect(syncStatus).toBeDefined();
      expect(syncStatus.lastSyncAt).toBeDefined();
    });
  });

  describe('End-to-End Workflows', () => {
    it('should complete full vendor onboarding workflow', async () => {
      // 1. Create vendor
      const vendor = await createTestVendor();
      
      // 2. Create business partner
      const businessPartner = await businessPartnerService.createBusinessPartnerFromVendor(vendor._id);
      
      // 3. Create articles for vendor
      const article = await articleService.createArticle({
        name: 'Vendor Product',
        category: 'Gemüse',
        pricing: { basePrice: 2.99, currency: 'EUR', vatRate: 7.0 },
        metadata: {
          vendorId: vendor._id.toString()
        }
      });

      // 4. Verify complete setup
      expect(businessPartner.id).toBeDefined();
      expect(article.id).toBeDefined();
      
      const updatedVendor = await getUser(vendor._id);
      expect(updatedVendor.flourioPartnerId).toBe(businessPartner.id);
    });

    it('should complete full Mietfach sync workflow', async () => {
      // 1. Create Mietfach
      const mietfach = await createTestMietfach();
      
      // 2. Sync to stock
      const syncResult = await stockService.syncMietfachToStock(mietfach._id);
      
      // 3. Verify stock was created
      const stock = await stockService.getStock(syncResult.stockId);
      expect(stock.displayName).toContain(mietfach.nummer);
      
      // 4. Verify Mietfach tracking
      const updatedMietfach = await getMietfach(mietfach._id);
      expect(updatedMietfach.flourioStockId).toBe(syncResult.stockId);
      expect(updatedMietfach.flourioSyncStatus).toBe('synced');
    });
  });

  describe('Error Handling', () => {
    it('should handle API rate limiting', async () => {
      // Enable rate limiting in mock server
      process.env.FLOURIO_MOCK_RATE_LIMITING = 'true';
      
      // Make rapid requests to trigger rate limiting
      const promises = Array.from({ length: 10 }, () => 
        articleService.listArticles({ limit: 1 })
      );
      
      const results = await Promise.allSettled(promises);
      const rejectedRequests = results.filter(r => r.status === 'rejected');
      
      // Some requests should be rate limited
      expect(rejectedRequests.length).toBeGreaterThan(0);
      
      process.env.FLOURIO_MOCK_RATE_LIMITING = 'false';
    });

    it('should retry failed requests with exponential backoff', async () => {
      // This would test the error recovery service integration
      const startTime = Date.now();
      
      try {
        await articleService.createArticle({
          name: 'Trigger Error',
          // This should trigger a mock error
          shouldFail: true
        });
      } catch (error) {
        // Should have attempted retries
        const duration = Date.now() - startTime;
        expect(duration).toBeGreaterThan(1000); // At least one retry with delay
      }
    });
  });
});
```

### Test Helpers
```typescript
// server/src/tests/helpers/testDatabase.ts
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

export async function connectTestDatabase() {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri);
}

export async function disconnectTestDatabase() {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
}
```

### Test Data Factories
```typescript
// server/src/tests/helpers/testDataFactory.ts
import { User } from '../../models/User';
import { Mietfach } from '../../models/Mietfach';

export async function createTestVendor() {
  const vendor = new User({
    email: `vendor${Date.now()}@example.com`,
    firstName: 'Test',
    lastName: 'Vendor',
    role: 'vendor',
    businessName: 'Test Business',
    phone: '+49 123 456789',
    address: {
      street: 'Teststraße 1',
      city: 'München',
      postalCode: '80331',
      country: 'DE'
    }
  });
  
  return await vendor.save();
}

export async function createTestMietfach() {
  const mietfach = new Mietfach({
    nummer: `M${Date.now()}`,
    groesse: 'klein',
    typ: 'kühlend',
    standort: 'München',
    beschreibung: 'Test Mietfach',
    verfuegbar: true,
    preis: 50.00
  });
  
  return await mietfach.save();
}

export async function getUser(id: string) {
  return await User.findById(id);
}

export async function getMietfach(id: string) {
  return await Mietfach.findById(id);
}
```

### Test Configuration
```typescript
// server/src/tests/jest.config.integration.js
module.exports = {
  displayName: 'Integration Tests',
  testMatch: ['**/tests/integration/**/*.test.ts'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup/integration.setup.ts'],
  globalSetup: '<rootDir>/tests/setup/global.setup.ts',
  globalTeardown: '<rootDir>/tests/setup/global.teardown.ts',
  collectCoverageFrom: [
    'src/services/flourio/**/*.ts',
    '!src/services/flourio/**/*.test.ts',
    '!src/services/flourio/**/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### CI/CD Integration
```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:5.0
        ports:
          - 27017:27017
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Start mock server
        run: npm run mock:server &
        
      - name: Wait for services
        run: sleep 5
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          FLOURIO_USE_MOCK: true
          FLOURIO_MOCK_SERVER_URL: http://localhost:3001/api/v2
          NODE_ENV: test
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: integration-test-results
          path: coverage/
```

## Dependencies
- TASK-047-create-mock-server (mock server needed for tests)
- All Flourio service implementations (to test)

## Definition of Done
- [ ] Integration tests cover all major API endpoints
- [ ] Tests work with both mock and real API
- [ ] End-to-end workflow tests implemented
- [ ] Error handling scenarios thoroughly tested
- [ ] Test data setup and cleanup working
- [ ] Tests pass in CI/CD pipeline
- [ ] Test coverage meets requirements (>80%)
- [ ] Performance tests for sync operations
- [ ] Documentation for running integration tests
- [ ] Code review completed (if applicable)