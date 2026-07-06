# Task: TASK-042-add-article-validation
Priority: medium
Status: pending

## User Acceptance Criteria
- [ ] Comprehensive validation for article operations
- [ ] Input sanitization and security checks
- [ ] Business rule validation implemented
- [ ] Clear error messages for validation failures
- [ ] Client-side validation matches server-side
- [ ] All validation rules properly tested

## Test Plan
### Unit Tests
- [ ] Test all validation rules with valid and invalid inputs
- [ ] Test edge cases and boundary conditions
- [ ] Test sanitization functions work correctly
- [ ] Test error message formatting
- [ ] Co-located test file: articleValidation.test.ts

### Integration Tests  
- [ ] Test validation in API endpoints
- [ ] Test client-side validation prevents invalid submissions
- [ ] Test validation error handling in UI

### Manual Testing
- [ ] Try to create articles with invalid data
- [ ] Verify error messages are clear and helpful
- [ ] Test validation prevents malicious inputs

## Implementation Details
Implement comprehensive validation and security checks:

### Server-Side Validation
```typescript
// server/src/validators/articleValidator.ts
import { body, validationResult } from 'express-validator';
import DOMPurify from 'isomorphic-dompurify';

export const createArticleValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-ZäöüÄÖÜß0-9\s\-&.,()]+$/)
    .withMessage('Name contains invalid characters')
    .customSanitizer(value => DOMPurify.sanitize(value)),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters')
    .customSanitizer(value => DOMPurify.sanitize(value)),

  body('price')
    .isFloat({ min: 0.01, max: 10000 })
    .withMessage('Price must be between 0.01 and 10,000 EUR')
    .custom((value) => {
      // Check for reasonable precision (max 2 decimal places)
      if (!/^\d+(\.\d{1,2})?$/.test(value.toString())) {
        throw new Error('Price can have maximum 2 decimal places');
      }
      return true;
    }),

  body('stockQuantity')
    .isInt({ min: 0, max: 100000 })
    .withMessage('Stock quantity must be between 0 and 100,000'),

  body('minimumStock')
    .optional()
    .isInt({ min: 0, max: 10000 })
    .withMessage('Minimum stock must be between 0 and 10,000'),

  body('category')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Category is required and cannot exceed 50 characters')
    .isIn(['Gemüse', 'Obst', 'Fleisch', 'Milchprodukte', 'Backwaren', 'Getränke', 'Sonstiges'])
    .withMessage('Invalid category selected'),

  body('sku')
    .optional()
    .trim()
    .matches(/^[A-Z0-9\-]{3,20}$/)
    .withMessage('SKU must be 3-20 characters (letters, numbers, hyphens only)')
    .custom(async (value, { req }) => {
      if (value) {
        const existingArticle = await Article.findOne({ 
          sku: value, 
          vendorId: req.user._id,
          _id: { $ne: req.params.id } // Exclude current article when updating
        });
        if (existingArticle) {
          throw new Error('SKU already exists');
        }
      }
      return true;
    }),

  body('images')
    .optional()
    .isArray({ max: 5 })
    .withMessage('Maximum 5 images allowed'),

  // Business rule validations
  body('price').custom(async (value, { req }) => {
    // Check if price is reasonable for category
    const categoryPriceLimits = {
      'Gemüse': { min: 0.10, max: 50.00 },
      'Obst': { min: 0.20, max: 100.00 },
      'Fleisch': { min: 5.00, max: 500.00 },
      'Milchprodukte': { min: 0.50, max: 50.00 },
      'Backwaren': { min: 0.50, max: 20.00 },
      'Getränke': { min: 0.50, max: 100.00 },
      'Sonstiges': { min: 0.01, max: 1000.00 }
    };

    const limits = categoryPriceLimits[req.body.category];
    if (limits && (value < limits.min || value > limits.max)) {
      throw new Error(`Price for ${req.body.category} should be between €${limits.min} and €${limits.max}`);
    }
    return true;
  })
];

export const updateArticleValidation = [
  // Similar validations but with optional fields
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('price').optional().isFloat({ min: 0.01, max: 10000 }),
  body('stockQuantity').optional().isInt({ min: 0, max: 100000 }),
  // ... other optional validations
];
```

### Validation Middleware
```typescript
// server/src/middleware/validationMiddleware.ts
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors
    });
  }
  
  next();
};
```

### Client-Side Validation
```typescript
// client/src/utils/articleValidation.ts
export interface ArticleValidationError {
  field: string;
  message: string;
}

export function validateArticleForm(data: ArticleFormData): ArticleValidationError[] {
  const errors: ArticleValidationError[] = [];

  // Name validation
  if (!data.name || data.name.trim().length < 2) {
    errors.push({ field: 'name', message: 'Name muss mindestens 2 Zeichen lang sein' });
  }

  if (data.name && data.name.length > 100) {
    errors.push({ field: 'name', message: 'Name darf nicht länger als 100 Zeichen sein' });
  }

  // Price validation
  if (!data.price || data.price <= 0) {
    errors.push({ field: 'price', message: 'Preis muss größer als 0 sein' });
  }

  if (data.price > 10000) {
    errors.push({ field: 'price', message: 'Preis darf nicht höher als €10.000 sein' });
  }

  // Stock validation
  if (data.stockQuantity < 0) {
    errors.push({ field: 'stockQuantity', message: 'Lagerbestand kann nicht negativ sein' });
  }

  if (data.stockQuantity > 100000) {
    errors.push({ field: 'stockQuantity', message: 'Lagerbestand darf nicht höher als 100.000 sein' });
  }

  // Category validation
  const validCategories = ['Gemüse', 'Obst', 'Fleisch', 'Milchprodukte', 'Backwaren', 'Getränke', 'Sonstiges'];
  if (!data.category || !validCategories.includes(data.category)) {
    errors.push({ field: 'category', message: 'Bitte wählen Sie eine gültige Kategorie' });
  }

  // Business rule validation
  if (data.minimumStock && data.minimumStock > data.stockQuantity) {
    errors.push({ 
      field: 'minimumStock', 
      message: 'Mindestbestand kann nicht höher als der aktuelle Bestand sein' 
    });
  }

  return errors;
}

export function sanitizeArticleInput(data: ArticleFormData): ArticleFormData {
  return {
    ...data,
    name: data.name?.trim(),
    description: data.description?.trim(),
    category: data.category?.trim()
  };
}
```

### Security Enhancements
```typescript
// server/src/security/articleSecurity.ts
export function checkArticleOwnership(req: AuthRequest, res: Response, next: NextFunction) {
  // Ensure vendor can only access their own articles
  const originalFind = Article.find;
  Article.find = function(query: any = {}) {
    return originalFind.call(this, { ...query, vendorId: req.user._id });
  };
  
  next();
}

export function rateLimitArticleCreation() {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit each vendor to 10 article creations per minute
    message: 'Too many articles created, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });
}
```

## Dependencies
- TASK-041-implement-article-crud (endpoints must exist)

## Definition of Done
- [ ] All validation rules implemented and tested
- [ ] Input sanitization prevents XSS and injection
- [ ] Business rule validation implemented
- [ ] Client-side validation matches server-side
- [ ] Clear, helpful error messages in German
- [ ] Security middleware protects against abuse
- [ ] All validation tests passing
- [ ] Performance impact minimized
- [ ] Code review completed (if applicable)