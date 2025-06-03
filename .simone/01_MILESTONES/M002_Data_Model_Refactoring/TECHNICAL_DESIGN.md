# Technical Design: Data Model Refactoring

## Overview
This document outlines the technical design for refactoring the monolithic User model into three separate, focused models: BaseUser, Vendor, and NewsletterSubscriber.

## Current Architecture Problems

### 1. Single Responsibility Violation
```typescript
// Current User model handles too many concerns:
- Authentication (username, password)
- Authorization (isAdmin, isVendor)
- Contact Information (kontakt)
- Newsletter Subscription (newsletterConfirmed, tokens)
- Vendor Business Data (vendorProfile)
- Trial Management (registrationStatus, trialDates)
- Booking Management (pendingBooking)
```

### 2. Performance Issues
- Every user query loads 30+ fields
- Newsletter subscribers forced to have user accounts
- Vendor queries load unnecessary auth data
- No targeted indexing possible

### 3. Maintenance Complexity
- Changes to vendor logic risk breaking auth
- Newsletter features coupled to user management
- Difficult to reason about data flow

## Proposed Architecture

### Model Relationships
```
BaseUser (1) ←──── (1) Vendor
    ↑
    └──── (0..1) NewsletterSubscriber
```

### 1. BaseUser Model (Authentication Core)
```typescript
interface IBaseUser extends Document {
  // Identity
  _id: Types.ObjectId;
  username: string;
  password: string;
  
  // Contact
  email: string;
  
  // Authorization
  isAdmin: boolean;
  
  // Status
  isActive: boolean;
  lastLogin?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateAuthToken(): string;
  
  // Virtuals
  isVendor: boolean; // Computed from Vendor collection
  profile: IVendor | null; // Lazy loaded
}
```

### 2. Vendor Model (Business Logic)
```typescript
interface IVendor extends Document {
  // Relationship
  _id: Types.ObjectId;
  userId: Types.ObjectId; // FK to BaseUser
  
  // Business Info
  unternehmen: string;
  beschreibung: string;
  slogan?: string;
  kategorien: string[];
  
  // Contact (Business-specific)
  businessEmail: string;
  businessPhone: string;
  addresses: IAddress[];
  
  // Profile
  profilBild?: string;
  oeffnungszeiten: IOpeningHours;
  website?: string;
  socialMedia: {
    facebook?: string;
    instagram?: string;
  };
  
  // Status & Trial
  registrationStatus: 'preregistered' | 'trial_active' | 'trial_expired' | 'active' | 'cancelled';
  registrationDate: Date;
  trialStartDate?: Date;
  trialEndDate?: Date;
  
  // Visibility
  isPubliclyVisible: boolean;
  verifyStatus: 'unverified' | 'pending' | 'verified';
  
  // Bookings
  pendingBooking?: IPendingBooking;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  activateTrial(): Promise<void>;
  cancelSubscription(): Promise<void>;
  
  // Virtuals
  user: IBaseUser; // Parent user reference
}
```

### 3. NewsletterSubscriber Model (Marketing)
```typescript
interface INewsletterSubscriber extends Document {
  // Identity
  _id: Types.ObjectId;
  email: string;
  name: string;
  
  // Relationship (optional)
  userId?: Types.ObjectId; // Optional FK to BaseUser
  
  // Subscription
  type: 'customer' | 'vendor' | 'general';
  isSubscribed: boolean;
  confirmedAt?: Date;
  unsubscribedAt?: Date;
  
  // Confirmation
  confirmationToken?: string;
  tokenExpires?: Date;
  
  // Preferences
  preferences: {
    frequency: 'weekly' | 'monthly';
    categories: string[];
    language: string;
  };
  
  // Analytics
  source: string; // signup source
  ipAddress?: string;
  tags: string[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  generateConfirmationToken(): string;
  confirm(): Promise<void>;
  unsubscribe(reason?: string): Promise<void>;
}
```

## Migration Strategy

### Phase 1: Parallel Implementation (Week 1-2)
1. Create new models alongside existing
2. Implement write-through pattern
3. Add compatibility layer
4. Deploy without breaking changes

### Phase 2: Gradual Migration (Week 3-4)
1. Migrate read operations incrementally
2. Update controllers one by one
3. Monitor performance and errors
4. Maintain backward compatibility

### Phase 3: Cutover (Week 5)
1. Stop writes to old model
2. Final data sync
3. Switch all operations to new models
4. Keep old model as backup

### Phase 4: Cleanup (Week 6)
1. Remove compatibility layer
2. Delete old model code
3. Optimize queries
4. Update documentation

## API Compatibility Strategy

### Compatibility Service
```typescript
class UserCompatibilityService {
  static async getCompatibleUser(userId: string): Promise<IUserLegacy> {
    const [user, vendor, subscriber] = await Promise.all([
      BaseUser.findById(userId).lean(),
      Vendor.findOne({ userId }).lean(),
      NewsletterSubscriber.findOne({ userId }).lean()
    ]);
    
    return this.mapToLegacyFormat(user, vendor, subscriber);
  }
  
  static mapToLegacyFormat(
    user: IBaseUser, 
    vendor?: IVendor, 
    subscriber?: INewsletterSubscriber
  ): IUserLegacy {
    return {
      _id: user._id,
      username: user.username,
      password: user.password,
      isAdmin: user.isAdmin,
      isVendor: !!vendor,
      kontakt: {
        email: user.email,
        name: vendor?.unternehmen || subscriber?.name || '',
        telefon: vendor?.businessPhone,
        mailNewsletter: subscriber?.isSubscribed || false,
        newsletterConfirmed: !!subscriber?.confirmedAt,
        status: user.isActive ? 'aktiv' : 'inaktiv'
      },
      vendorProfile: vendor ? {
        unternehmen: vendor.unternehmen,
        beschreibung: vendor.beschreibung,
        // ... map other fields
      } : undefined,
      registrationStatus: vendor?.registrationStatus,
      // ... map remaining fields
    };
  }
}
```

## Performance Optimizations

### 1. Targeted Queries
```typescript
// Before: Load entire user document
const user = await User.findById(id);

// After: Load only needed data
const authData = await BaseUser.findById(id).select('username email isAdmin');
const vendorData = await Vendor.findOne({ userId: id }).select('unternehmen isPubliclyVisible');
```

### 2. Optimized Indexes
```typescript
// BaseUser
baseUserSchema.index({ email: 1 }, { unique: true });
baseUserSchema.index({ username: 1 }, { unique: true });

// Vendor
vendorSchema.index({ userId: 1 }, { unique: true });
vendorSchema.index({ isPubliclyVisible: 1, registrationStatus: 1 });
vendorSchema.index({ 'kategorien': 1 });
vendorSchema.index({ 'addresses.ort': 1 });

// NewsletterSubscriber  
subscriberSchema.index({ email: 1 }, { unique: true });
subscriberSchema.index({ userId: 1 });
subscriberSchema.index({ isSubscribed: 1, type: 1 });
```

### 3. Caching Strategy
- Cache public vendor listings (5 min TTL)
- Cache user auth data (1 hour TTL)
- Invalidate on updates

## Testing Strategy

### 1. Unit Tests
- Model validation and methods
- Compatibility layer mapping
- Migration scripts

### 2. Integration Tests
- Auth flows with new models
- Vendor operations
- Newsletter subscriptions

### 3. Performance Tests
- Query execution times
- Memory usage
- Concurrent operations

### 4. Migration Tests
- Data integrity verification
- Rollback procedures
- Edge cases

## Rollback Plan

### Immediate Rollback (< 1 hour)
1. Stop application servers
2. Restore database from backup
3. Deploy previous code version
4. Restart servers

### Gradual Rollback (1-24 hours)
1. Re-enable writes to old model
2. Sync data from new to old models
3. Switch reads back to old model
4. Monitor and fix issues

## Success Metrics
- 80% reduction in auth query time
- 75% reduction in vendor list query time  
- Zero data loss during migration
- No increase in error rates
- Improved developer productivity