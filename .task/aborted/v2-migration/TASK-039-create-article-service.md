# Task: TASK-039-create-article-service
Priority: high
Status: pending

## User Acceptance Criteria
- [ ] Article API service implemented for product management
- [ ] CRUD operations working with Flourio API
- [ ] Product-to-Article mapping implemented
- [ ] Category and pricing management integrated
- [ ] Stock level synchronization working
- [ ] All unit tests passing

## Test Plan
### Unit Tests
- [ ] Test article creation from product data
- [ ] Test article update operations
- [ ] Test stock level synchronization
- [ ] Test category mapping and validation
- [ ] Co-located test file: articleService.test.ts

### Integration Tests  
- [ ] Test actual API calls to Flourio Article endpoints
- [ ] Test sync with stock movements
- [ ] Test recovery from failed sync operations

### Manual Testing
- [ ] Verify articles are created in Flourio dashboard
- [ ] Test stock levels update correctly
- [ ] Verify category mapping works as expected

## Implementation Details
Implement ArticleService for product management in Flourio:

### Core Methods
```typescript
// server/src/services/flourio/articleService.ts
export class ArticleService {
  async createArticle(productData: any): Promise<Article>
  async updateArticle(articleId: string, data: Partial<Article>): Promise<Article>
  async deleteArticle(articleId: string): Promise<void>
  async getArticle(articleId: string): Promise<Article>
  async listArticles(filters?: ArticleFilters): Promise<Article[]>
  async syncStockLevels(articleId: string): Promise<StockLevel[]>
  async updatePricing(articleId: string, pricing: PricingData): Promise<Article>
}
```

### Product to Article Mapping
```typescript
interface ProductToArticleMapping {
  name: string;                    // product.name
  description?: string;            // product.description
  sku: string;                    // product.sku or auto-generated
  category: {
    name: string;                 // product.category
    parentCategory?: string;      // mapped from categories
  };
  pricing: {
    basePrice: number;            // product.price
    currency: string;             // EUR
    vatRate: number;              // based on product type
    discountable: boolean;        // product.allowDiscounts
  };
  inventory: {
    trackStock: boolean;          // always true
    minimumStock: number;         // product.minimumStock || 0
    maximumStock?: number;        // product.maximumStock
  };
  metadata: {
    housnkuhProductId: string;
    vendorId: string;
    createdAt: Date;
    productType: string;
  }
}
```

### Stock Level Synchronization
```typescript
interface StockSyncResult {
  articleId: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  lastMovements: StockMovement[];
  syncedAt: Date;
}

async syncStockLevels(articleId: string): Promise<StockSyncResult> {
  const stockData = await this.flourioClient.get(`/articles/${articleId}/stock`);
  
  // Update local product stock levels
  await Product.findOneAndUpdate(
    { flourioArticleId: articleId },
    {
      stockQuantity: stockData.availableStock,
      lastStockUpdate: new Date()
    }
  );
  
  return stockData;
}
```

### Category Management
```typescript
interface CategoryMapping {
  housnkuhCategory: string;
  flourioCategory: string;
  parentCategory?: string;
  vatRate: number;
}

const CATEGORY_MAPPINGS: CategoryMapping[] = [
  {
    housnkuhCategory: 'Gemüse',
    flourioCategory: 'Vegetables',
    vatRate: 7.0  // German reduced VAT for food
  },
  {
    housnkuhCategory: 'Obst',
    flourioCategory: 'Fruits',
    vatRate: 7.0
  },
  // ... more mappings
];
```

## Dependencies
- TASK-027-create-flourio-service-structure (folder structure)
- TASK-028-implement-api-client (HTTP client)
- TASK-030-create-typescript-types (type definitions)

## Definition of Done
- [ ] ArticleService class fully implemented
- [ ] All CRUD operations working with Flourio API
- [ ] Product mapping implemented and tested
- [ ] Stock level synchronization working
- [ ] Category mapping and validation implemented
- [ ] Pricing management integrated
- [ ] All unit tests implemented and passing
- [ ] Integration tests with real API passing
- [ ] TypeScript compilation successful
- [ ] Code review completed (if applicable)