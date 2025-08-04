# Technical Documentation - Development Best Practices

## Performance Optimization Guide

### Database Optimization

#### N+1 Pattern Elimination
Our application has been optimized to avoid N+1 query patterns through proper aggregation pipeline usage:

```typescript
// ✅ Good: Using aggregation pipeline
const results = await Model.aggregate([
  { $match: { status: 'active' } },
  { $lookup: { 
    from: 'related_collection',
    localField: '_id',
    foreignField: 'parentId',
    as: 'related_data'
  }}
]);

// ❌ Avoid: N+1 pattern
const parents = await Model.find({ status: 'active' });
for (const parent of parents) {
  parent.related = await RelatedModel.find({ parentId: parent._id });
}
```

#### Aggregation Pipeline Usage
Key patterns implemented in our revenue calculation system:

```typescript
// Monthly revenue aggregation
const pipeline = [
  { $match: { 
    startdatum: { $gte: startDate, $lte: endDate },
    status: 'active'
  }},
  { $group: {
    _id: { $month: '$startdatum' },
    totalRevenue: { $sum: '$preis' },
    contractCount: { $sum: 1 }
  }},
  { $sort: { '_id': 1 }}
];
```

#### Index Strategy
Current indexes implemented:

```typescript
// MonthlyRevenue schema indexes
monat: { type: Date, index: true }  // Time-based queries
slug: { type: String, index: true }  // Lookup operations

// Remove duplicate indexes warning by checking schema definitions
```

#### Query Caching
Implement caching for expensive operations:

```typescript
// Example caching pattern
const cacheKey = `revenue_${year}_${month}`;
let result = await cache.get(cacheKey);
if (!result) {
  result = await calculateMonthlyRevenue(year, month);
  await cache.set(cacheKey, result, 3600); // 1 hour cache
}
```

### React Performance

#### Context Splitting Patterns
Split large contexts to minimize re-renders:

```typescript
// ✅ Good: Separate contexts by concern
const AuthStateContext = createContext(authState);
const AuthActionsContext = createContext(authActions);

// ❌ Avoid: Large monolithic context
const AppContext = createContext({ 
  auth, users, products, settings, notifications 
});
```

#### Memoization Strategies
Strategic use of React.memo and useMemo:

```typescript
// Component memoization
const BookingCard = React.memo(({ booking, onSelect }) => {
  return <div onClick={() => onSelect(booking.id)}>...</div>;
});

// Expensive computation memoization
const expensiveValue = useMemo(() => {
  return complexCalculation(data);
}, [data]);

// Callback memoization
const handleClick = useCallback((id) => {
  onSelect(id);
}, [onSelect]);
```

#### Component Optimization
Best practices implemented:

```typescript
// ✅ Good: Avoid inline object creation
const styles = { color: 'blue' }; // Outside component or memoized
<Component style={styles} />

// ❌ Avoid: Creates new object on each render
<Component style={{ color: 'blue' }} />
```

#### Render Profiling
Use React DevTools Profiler to identify performance bottlenecks:

1. Install React Developer Tools
2. Use Profiler tab
3. Record renders during user interactions
4. Identify slow components and unnecessary re-renders

### Monitoring

#### Performance Metrics
Key metrics to track:

```typescript
// Request timing
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    performanceMonitor.recordRequest({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: duration
    });
  });
  next();
});
```

#### Query Analysis
Monitor database performance:

```typescript
// Database operation tracking
mongoose.set('debug', (collection, method, query, doc) => {
  const start = Date.now();
  // Log query performance
  performanceMonitor.recordDatabaseOperation({
    collection,
    operation: method,
    duration: Date.now() - start,
    success: true
  });
});
```

#### React DevTools Usage
Performance monitoring in development:

1. **Component Profiler**: Identify slow renders
2. **Memory Usage**: Track component mount/unmount
3. **State Changes**: Monitor context updates
4. **Network Requests**: Track API call patterns

## Development Best Practices

### Database Queries

#### Always Use Aggregation for Complex Queries
```typescript
// ✅ Recommended: Aggregation pipeline
const revenueData = await Vertrag.aggregate([
  { $match: { status: 'active' } },
  { $group: { _id: '$userId', total: { $sum: '$preis' } } },
  { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } }
]);

// ❌ Avoid: Multiple separate queries
const contracts = await Vertrag.find({ status: 'active' });
const revenues = {};
for (const contract of contracts) {
  const user = await User.findById(contract.userId);
  // Process...
}
```

#### Avoid N+1 Patterns
```typescript
// ✅ Good: Single query with population
const usersWithContracts = await User.find().populate('contracts');

// ❌ Bad: N+1 queries
const users = await User.find();
for (const user of users) {
  user.contracts = await Contract.find({ userId: user._id });
}
```

#### Add Appropriate Indexes
```typescript
// Define indexes in schema
const schema = new Schema({
  email: { type: String, unique: true, index: true },
  createdAt: { type: Date, index: true },
  status: { type: String, index: true }
});

// Compound indexes for complex queries
schema.index({ status: 1, createdAt: -1 });
```

#### Monitor Query Performance
```typescript
// Enable query logging in development
if (process.env.NODE_ENV === 'development') {
  mongoose.set('debug', true);
}

// Custom performance monitoring
const queryStart = Date.now();
const result = await Model.find(query);
const queryTime = Date.now() - queryStart;
if (queryTime > 100) {
  console.warn(`Slow query detected: ${queryTime}ms`);
}
```

### React Components

#### Split Contexts by Concern
```typescript
// Authentication context
export const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {}
});

// Separate UI state context
export const UIContext = createContext({
  sidebarOpen: false,
  theme: 'light',
  toggleSidebar: () => {},
  setTheme: () => {}
});
```

#### Memoize Expensive Computations
```typescript
const ExpensiveComponent = ({ data }) => {
  // ✅ Memoize expensive calculations
  const processedData = useMemo(() => {
    return data.map(item => complexTransformation(item));
  }, [data]);

  // ✅ Memoize event handlers
  const handleClick = useCallback((id) => {
    onItemClick(id);
  }, [onItemClick]);

  return <div>...</div>;
};
```

#### Use React.memo for Pure Components
```typescript
// ✅ Memoize components that don't need frequent updates
const UserCard = React.memo(({ user, onEdit }) => {
  return (
    <div className="user-card">
      <h3>{user.name}</h3>
      <button onClick={() => onEdit(user.id)}>Edit</button>
    </div>
  );
});

// Custom comparison for complex props
const ComplexComponent = React.memo(({ data, settings }) => {
  // Component logic
}, (prevProps, nextProps) => {
  return prevProps.data.id === nextProps.data.id &&
         JSON.stringify(prevProps.settings) === JSON.stringify(nextProps.settings);
});
```

#### Profile Render Performance
```typescript
// Development-only performance monitoring
if (process.env.NODE_ENV === 'development') {
  const ProfiledComponent = ({ children }) => {
    const renderStart = performance.now();
    
    useEffect(() => {
      const renderTime = performance.now() - renderStart;
      if (renderTime > 16) { // More than one frame
        console.warn(`Slow render: ${renderTime}ms`);
      }
    });

    return children;
  };
}
```

### Security

#### Never Hardcode Credentials
```typescript
// ✅ Good: Use environment variables
const jwtSecret = process.env.JWT_SECRET;
const dbUrl = process.env.MONGO_URI;

// ❌ Never do this
const jwtSecret = "hardcoded-secret-key";
```

#### Use Environment Variables
```typescript
// Server configuration
const config = {
  port: process.env.PORT || 4000,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/housnkuh',
  jwtSecret: process.env.JWT_SECRET,
  emailConfig: {
    host: process.env.EMAIL_HOST,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
};

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'MONGO_URI'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Required environment variable ${envVar} is missing`);
  }
}
```

#### Regular Security Scans
```bash
# npm audit for vulnerabilities
npm audit

# Check for outdated packages
npm outdated

# Use security-focused linting
npm install --save-dev eslint-plugin-security
```

#### Follow Principle of Least Privilege
```typescript
// ✅ Role-based access control
const requireAdmin = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// ✅ Validate and sanitize inputs
const validateInput = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};
```

### Testing

#### Write Tests for All New Features
```typescript
// Component tests
describe('BookingCard', () => {
  it('should render booking information correctly', () => {
    const booking = { id: '1', title: 'Test Booking', status: 'active' };
    render(<BookingCard booking={booking} />);
    expect(screen.getByText('Test Booking')).toBeInTheDocument();
  });

  it('should handle click events', () => {
    const onSelect = jest.fn();
    const booking = { id: '1', title: 'Test Booking' };
    render(<BookingCard booking={booking} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith('1');
  });
});

// API tests
describe('Revenue API', () => {
  it('should calculate monthly revenue correctly', async () => {
    const result = await request(app)
      .get('/api/admin/revenue/monthly/2024/06')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    
    expect(result.body.totalRevenue).toBeGreaterThan(0);
    expect(result.body.contractCount).toBeDefined();
  });
});
```

#### Maintain Test Coverage Above 80%
```typescript
// Configure Jest coverage thresholds
module.exports = {
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx'
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

#### Use Proper Mocking Strategies
```typescript
// Mock external dependencies
jest.mock('../../services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
  sendTrialReminder: jest.fn().mockResolvedValue(true)
}));

// Mock database operations
jest.mock('../../models/User', () => ({
  find: jest.fn(),
  findById: jest.fn(),
  create: jest.fn()
}));
```

#### Test Performance Optimizations
```typescript
// Performance testing
describe('Performance Tests', () => {
  it('should render large lists efficiently', async () => {
    const largeDataSet = Array(1000).fill().map((_, i) => ({ id: i, name: `Item ${i}` }));
    
    const start = performance.now();
    render(<ItemList items={largeDataSet} />);
    const renderTime = performance.now() - start;
    
    expect(renderTime).toBeLessThan(100); // Should render in less than 100ms
  });
});
```

## Code Quality Standards

### TypeScript Best Practices
- Use strict mode: `"strict": true`
- Define proper interfaces for all data structures
- Avoid `any` type - use proper typing
- Use union types for controlled values
- Implement proper error handling with typed errors

### ESLint Configuration
Key rules for code quality:
- No unused variables
- Consistent code formatting
- Proper import ordering
- Security-focused linting

### Git Workflow
- Feature branches for all changes
- Descriptive commit messages
- Code review requirements
- Automated testing on PR

### Documentation Requirements
- JSDoc comments for public APIs
- README files for major components
- Architecture decision records (ADRs)
- Performance optimization notes

## Development Environment Setup

### Required Tools
- Node.js 16+
- MongoDB 4.4+
- Git
- VS Code with recommended extensions

### Recommended Extensions
- TypeScript and JavaScript Language Features
- ESLint
- Prettier
- MongoDB for VS Code
- React Developer Tools

### Environment Configuration
```bash
# Development environment
NODE_ENV=development
PORT=4000
MONGO_URI=mongodb://localhost:27017/housnkuh_dev
JWT_SECRET=development-secret-key

# Frontend configuration
REACT_APP_API_URL=http://localhost:4000/api
```

This documentation should be reviewed and updated regularly as the application evolves.