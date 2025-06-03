---
requirement_id: R003
milestone_id: M002
title: Create Newsletter Subscriber Model
priority: high
status: pending
estimated_effort: 8-10 hours
dependencies: [R001]
---

# R003: Create Newsletter Subscriber Model

## Description
Extract newsletter subscription functionality into a dedicated NewsletterSubscriber model that can exist independently of user accounts.

## Current State
Newsletter data is embedded in User model:
- kontakt.email, kontakt.name
- kontakt.newslettertype
- kontakt.mailNewsletter
- kontakt.newsletterConfirmed
- kontakt.confirmationToken
- kontakt.tokenExpires

This forces newsletter subscribers to have user accounts even if they never register.

## Target State
A standalone NewsletterSubscriber model:
```typescript
interface INewsletterSubscriber {
  _id: ObjectId;
  
  // Core Subscription Data
  email: string;
  name: string;
  type: 'customer' | 'vendor' | 'general';
  
  // Subscription Status
  isSubscribed: boolean;
  confirmedAt?: Date;
  unsubscribedAt?: Date;
  
  // Confirmation
  confirmationToken?: string;
  tokenExpires?: Date;
  
  // Optional User Link
  userId?: ObjectId; // Optional reference to BaseUser
  
  // Preferences
  preferences: {
    frequency: 'weekly' | 'monthly';
    categories: string[];
  };
  
  // Tracking
  source: string; // Where they subscribed from
  ipAddress?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

## Implementation Steps
1. Create NewsletterSubscriber schema
2. Implement subscription methods (confirm, unsubscribe)
3. Update newsletter controller to use new model
4. Create migration for existing subscribers
5. Update email service to work with new model
6. Implement subscriber merge when user registers

## Acceptance Criteria
- [ ] Newsletter subscriptions work without user accounts
- [ ] Existing subscribers migrated successfully
- [ ] Confirmation flow works with new model
- [ ] Can link subscriber to user when they register
- [ ] Unsubscribe functionality maintained
- [ ] Admin can manage all subscribers

## Testing Requirements
- Unit tests for NewsletterSubscriber model
- Integration tests for subscription flow
- Tests for confirmation process
- Migration verification tests
- Tests for subscriber-user linking

## Benefits
- Newsletter subscribers don't need user accounts
- Cleaner data model
- Easier GDPR compliance (separate consent)
- Better analytics on subscription sources
- Reduced User model complexity

## API Changes
- `/api/newsletter/subscribe` works without authentication
- New admin endpoints for subscriber management
- Existing endpoints maintain compatibility

## Notes
- Consider implementing double opt-in best practices
- Plan for bounce handling in future
- Think about segmentation capabilities