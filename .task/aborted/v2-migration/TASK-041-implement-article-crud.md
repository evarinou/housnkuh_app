# Task: TASK-041-implement-article-crud
Priority: high
Status: pending

## User Acceptance Criteria
- [ ] CRUD endpoints implemented for article operations
- [ ] Stock adjustment endpoints working
- [ ] Image upload and management endpoints
- [ ] Category management endpoints
- [ ] Proper authentication and authorization
- [ ] All endpoints properly tested

## Test Plan
### Unit Tests
- [ ] Test article creation endpoint with validation
- [ ] Test article update endpoint with partial updates
- [ ] Test article deletion with cascade handling
- [ ] Test stock adjustment endpoint
- [ ] Co-located test file: articleController.test.ts

### Integration Tests  
- [ ] Test complete article lifecycle (CRUD operations)
- [ ] Test stock adjustments persist correctly
- [ ] Test image upload workflow

### Manual Testing
- [ ] Test all endpoints with Postman/Thunder Client
- [ ] Verify proper error responses
- [ ] Test authorization works correctly

## Implementation Details
Implement comprehensive CRUD endpoints for article management:

### Article Controller
```typescript
// server/src/controllers/articleController.ts
export class ArticleController {
  
  // GET /api/vendor/articles
  async getArticles(req: AuthRequest, res: Response) {
    try {
      const vendorId = req.user._id;
      const { category, sortBy, limit, offset } = req.query;
      
      const articles = await Article.find({ vendorId })
        .populate('category')
        .sort(sortBy ? { [sortBy as string]: 1 } : { createdAt: -1 })
        .limit(parseInt(limit as string) || 50)
        .skip(parseInt(offset as string) || 0);

      res.json({
        success: true,
        data: articles,
        pagination: {
          total: await Article.countDocuments({ vendorId }),
          limit: parseInt(limit as string) || 50,
          offset: parseInt(offset as string) || 0
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST /api/vendor/articles
  async createArticle(req: AuthRequest, res: Response) {
    try {
      const vendorId = req.user._id;
      const articleData = {
        ...req.body,
        vendorId,
        sku: req.body.sku || generateSKU(req.body.name, vendorId)
      };

      // Validate article data
      const validationResult = validateArticleData(articleData);
      if (!validationResult.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validationResult.errors
        });
      }

      // Create article in database
      const article = new Article(articleData);
      await article.save();

      // Sync with Flourio if enabled
      try {
        const flourioArticle = await articleService.createArticle(article);
        article.flourioArticleId = flourioArticle.id;
        article.flourioSyncStatus = 'synced';
        await article.save();
      } catch (flourioError) {
        console.error('Flourio sync failed:', flourioError);
        article.flourioSyncStatus = 'error';
        article.flourioLastError = flourioError.message;
        await article.save();
      }

      res.status(201).json({
        success: true,
        data: article
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // PUT /api/vendor/articles/:id
  async updateArticle(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const vendorId = req.user._id;
      
      const article = await Article.findOne({ _id: id, vendorId });
      if (!article) {
        return res.status(404).json({
          success: false,
          message: 'Article not found'
        });
      }

      // Update article
      Object.assign(article, req.body);
      await article.save();

      // Sync with Flourio
      if (article.flourioArticleId) {
        try {
          await articleService.updateArticle(article.flourioArticleId, req.body);
          article.flourioSyncStatus = 'synced';
          article.flourioLastSyncAt = new Date();
        } catch (flourioError) {
          article.flourioSyncStatus = 'error';
          article.flourioLastError = flourioError.message;
        }
        await article.save();
      }

      res.json({
        success: true,
        data: article
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // DELETE /api/vendor/articles/:id
  async deleteArticle(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const vendorId = req.user._id;
      
      const article = await Article.findOne({ _id: id, vendorId });
      if (!article) {
        return res.status(404).json({
          success: false,
          message: 'Article not found'
        });
      }

      // Delete from Flourio first
      if (article.flourioArticleId) {
        try {
          await articleService.deleteArticle(article.flourioArticleId);
        } catch (flourioError) {
          console.error('Flourio deletion failed:', flourioError);
          // Continue with local deletion
        }
      }

      await article.deleteOne();

      res.json({
        success: true,
        message: 'Article deleted successfully'
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST /api/vendor/articles/:id/stock/adjust
  async adjustStock(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { adjustment, reason } = req.body;
      const vendorId = req.user._id;
      
      const article = await Article.findOne({ _id: id, vendorId });
      if (!article) {
        return res.status(404).json({
          success: false,
          message: 'Article not found'
        });
      }

      const oldStock = article.stockQuantity;
      article.stockQuantity += adjustment;
      
      // Prevent negative stock
      if (article.stockQuantity < 0) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient stock for this adjustment'
        });
      }

      await article.save();

      // Log stock movement
      const stockMovement = new StockMovement({
        articleId: id,
        type: adjustment > 0 ? 'increase' : 'decrease',
        quantity: Math.abs(adjustment),
        oldQuantity: oldStock,
        newQuantity: article.stockQuantity,
        reason,
        createdBy: vendorId
      });
      await stockMovement.save();

      // Sync with Flourio
      if (article.flourioArticleId) {
        try {
          await articleService.syncStockLevels(article.flourioArticleId);
        } catch (flourioError) {
          console.error('Flourio stock sync failed:', flourioError);
        }
      }

      res.json({
        success: true,
        data: {
          article,
          stockMovement
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
```

### Routes Configuration
```typescript
// server/src/routes/articleRoutes.ts
const router = express.Router();
const articleController = new ArticleController();

// Apply vendor authentication middleware
router.use(authenticateVendor);

router.get('/articles', articleController.getArticles);
router.post('/articles', articleController.createArticle);
router.put('/articles/:id', articleController.updateArticle);
router.delete('/articles/:id', articleController.deleteArticle);
router.post('/articles/:id/stock/adjust', articleController.adjustStock);
router.get('/articles/:id/stock/movements', articleController.getStockMovements);

// Image upload routes
router.post('/articles/:id/images', upload.array('images', 5), articleController.uploadImages);
router.delete('/articles/:id/images/:imageId', articleController.deleteImage);

export default router;
```

### Validation Functions
```typescript
// server/src/utils/articleValidation.ts
interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateArticleData(data: any): ValidationResult {
  const errors: string[] = [];

  if (!data.name || data.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }

  if (!data.price || data.price <= 0) {
    errors.push('Price must be greater than 0');
  }

  if (data.stockQuantity < 0) {
    errors.push('Stock quantity cannot be negative');
  }

  if (!data.category) {
    errors.push('Category is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function generateSKU(name: string, vendorId: string): string {
  const namePrefix = name.substring(0, 3).toUpperCase();
  const vendorPrefix = vendorId.toString().slice(-3);
  const timestamp = Date.now().toString().slice(-6);
  
  return `${namePrefix}-${vendorPrefix}-${timestamp}`;
}
```

## Dependencies
- TASK-039-create-article-service (service layer needed)
- TASK-042-add-article-validation (validation logic needed)

## Definition of Done
- [ ] All CRUD endpoints implemented and working
- [ ] Stock adjustment functionality implemented
- [ ] Image upload endpoints working
- [ ] Proper authentication and authorization
- [ ] Validation and error handling implemented
- [ ] All unit tests implemented and passing
- [ ] Integration tests verify endpoints work
- [ ] API documentation updated
- [ ] TypeScript compilation successful
- [ ] Code review completed (if applicable)