# Task: TASK-046-implement-error-recovery
Priority: medium
Status: pending

## User Acceptance Criteria
- [ ] Automatic retry logic for failed sync operations
- [ ] Error recovery strategies for different failure types
- [ ] Dead letter queue for persistently failing items
- [ ] Circuit breaker pattern for API failures
- [ ] Recovery monitoring and alerting
- [ ] All recovery mechanisms properly tested

## Test Plan
### Unit Tests
- [ ] Test retry logic with exponential backoff
- [ ] Test circuit breaker opens and closes correctly
- [ ] Test dead letter queue processing
- [ ] Test different recovery strategies by error type
- [ ] Co-located test file: errorRecoveryService.test.ts

### Integration Tests  
- [ ] Test recovery during actual sync failures
- [ ] Test circuit breaker with real API failures
- [ ] Test end-to-end recovery workflow

### Manual Testing
- [ ] Simulate network failures and verify recovery
- [ ] Test API rate limiting recovery
- [ ] Verify dead letter queue processing

## Implementation Details
Implement comprehensive error recovery and retry mechanisms:

### Error Recovery Service
```typescript
// server/src/services/errorRecoveryService.ts
export interface RecoveryStrategy {
  canRecover(error: Error, retryCount: number): boolean;
  getRetryDelay(retryCount: number): number;
  shouldUseCircuitBreaker(): boolean;
}

export class ErrorRecoveryService {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private recoveryStrategies: Map<string, RecoveryStrategy> = new Map();
  
  constructor(private syncTracker: SyncTrackingService) {
    this.initializeStrategies();
    this.initializeCircuitBreakers();
  }

  async executeWithRecovery<T>(
    operation: () => Promise<T>,
    context: {
      type: string;
      entityId?: string;
      maxRetries?: number;
    }
  ): Promise<T> {
    const maxRetries = context.maxRetries || 3;
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Check circuit breaker
        const circuitBreaker = this.circuitBreakers.get(context.type);
        if (circuitBreaker && circuitBreaker.isOpen()) {
          throw new Error(`Circuit breaker open for ${context.type}`);
        }

        const result = await operation();
        
        // Reset circuit breaker on success
        if (circuitBreaker) {
          circuitBreaker.onSuccess();
        }
        
        return result;
        
      } catch (error) {
        lastError = error;
        
        // Record failure in circuit breaker
        const circuitBreaker = this.circuitBreakers.get(context.type);
        if (circuitBreaker) {
          circuitBreaker.onFailure();
        }

        // Log error
        await this.syncTracker.logError(context.type, error, {
          entityId: context.entityId,
          canRetry: attempt < maxRetries
        });

        // Check if we should retry
        const strategy = this.recoveryStrategies.get(context.type);
        if (!strategy || !strategy.canRecover(error, attempt)) {
          break;
        }

        if (attempt < maxRetries) {
          const delay = strategy.getRetryDelay(attempt);
          logger.info(`Retrying ${context.type} after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await this.delay(delay);
        }
      }
    }

    // Move to dead letter queue if all retries failed
    await this.moveToDeadLetterQueue(context.type, context.entityId, lastError);
    throw lastError;
  }

  async processDeadLetterQueue(type: string): Promise<void> {
    const deadLetterItems = await DeadLetterQueue.find({ 
      type, 
      processed: false,
      retryAfter: { $lte: new Date() }
    }).limit(10);

    for (const item of deadLetterItems) {
      try {
        logger.info(`Attempting to recover dead letter item: ${item._id}`);
        
        // Try to reprocess the item
        await this.reprocessDeadLetterItem(item);
        
        // Mark as processed if successful
        item.processed = true;
        item.processedAt = new Date();
        await item.save();
        
      } catch (error) {
        // Increase failure count and schedule next retry
        item.failureCount += 1;
        item.lastError = error.message;
        
        if (item.failureCount >= 5) {
          // Mark as permanently failed after 5 attempts
          item.permanentlyFailed = true;
          logger.error(`Dead letter item permanently failed: ${item._id}`);
        } else {
          // Schedule next retry with exponential backoff
          const delay = Math.pow(2, item.failureCount) * 60 * 60 * 1000; // hours
          item.retryAfter = new Date(Date.now() + delay);
        }
        
        await item.save();
      }
    }
  }

  private initializeStrategies() {
    // Network error recovery strategy
    this.recoveryStrategies.set('network', {
      canRecover: (error: Error, retryCount: number) => {
        return retryCount < 3 && (
          error.message.includes('timeout') ||
          error.message.includes('network') ||
          error.message.includes('ECONNRESET') ||
          error.message.includes('503') ||
          error.message.includes('502')
        );
      },
      getRetryDelay: (retryCount: number) => Math.min(1000 * Math.pow(2, retryCount), 30000),
      shouldUseCircuitBreaker: () => true
    });

    // Rate limiting recovery strategy
    this.recoveryStrategies.set('rate_limit', {
      canRecover: (error: Error, retryCount: number) => {
        return retryCount < 5 && error.message.includes('429');
      },
      getRetryDelay: (retryCount: number) => 60000 * Math.pow(2, retryCount), // exponential minutes
      shouldUseCircuitBreaker: () => false
    });

    // Validation error strategy (usually not recoverable)
    this.recoveryStrategies.set('validation', {
      canRecover: () => false,
      getRetryDelay: () => 0,
      shouldUseCircuitBreaker: () => false
    });

    // System error recovery strategy
    this.recoveryStrategies.set('system', {
      canRecover: (error: Error, retryCount: number) => {
        return retryCount < 2 && (
          error.message.includes('database') ||
          error.message.includes('connection')
        );
      },
      getRetryDelay: (retryCount: number) => 5000 * (retryCount + 1),
      shouldUseCircuitBreaker: () => true
    });
  }

  private initializeCircuitBreakers() {
    const circuitBreakerConfig = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      monitoringPeriod: 300000 // 5 minutes
    };

    ['document_sync', 'stock_sync', 'business_partner_sync', 'article_sync'].forEach(type => {
      this.circuitBreakers.set(type, new CircuitBreaker(circuitBreakerConfig));
    });
  }

  private async moveToDeadLetterQueue(type: string, entityId: string, error: Error) {
    const deadLetterItem = new DeadLetterQueue({
      type,
      entityId,
      error: error.message,
      errorStack: error.stack,
      createdAt: new Date(),
      retryAfter: new Date(Date.now() + 24 * 60 * 60 * 1000), // Retry after 24 hours
      failureCount: 0,
      processed: false,
      permanentlyFailed: false
    });

    await deadLetterItem.save();
    logger.error(`Moved to dead letter queue: ${type}/${entityId} - ${error.message}`);
  }

  private async reprocessDeadLetterItem(item: any) {
    // This would dispatch to the appropriate sync service based on type
    switch (item.type) {
      case 'document_sync':
        return this.reprocessDocumentSync(item.entityId);
      case 'stock_sync':
        return this.reprocessStockSync(item.entityId);
      case 'business_partner_sync':
        return this.reprocessBusinessPartnerSync(item.entityId);
      case 'article_sync':
        return this.reprocessArticleSync(item.entityId);
      default:
        throw new Error(`Unknown dead letter item type: ${item.type}`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Circuit Breaker Implementation
```typescript
// server/src/utils/circuitBreaker.ts
export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failures: number = 0;
  private nextAttempt: number = 0;
  private requests: number = 0;
  private monitoringStartTime: number = Date.now();

  constructor(private config: CircuitBreakerConfig) {}

  isOpen(): boolean {
    return this.state === CircuitBreakerState.OPEN;
  }

  onSuccess(): void {
    this.resetCounts();
    
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.CLOSED;
      logger.info('Circuit breaker closed - service recovered');
    }
  }

  onFailure(): void {
    this.failures++;
    this.requests++;
    
    // Check if monitoring period has passed
    if (Date.now() - this.monitoringStartTime > this.config.monitoringPeriod) {
      this.resetCounts();
      return;
    }

    if (this.state === CircuitBreakerState.CLOSED) {
      if (this.failures >= this.config.failureThreshold) {
        this.state = CircuitBreakerState.OPEN;
        this.nextAttempt = Date.now() + this.config.recoveryTimeout;
        logger.warn(`Circuit breaker opened - too many failures (${this.failures})`);
      }
    } else if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.OPEN;
      this.nextAttempt = Date.now() + this.config.recoveryTimeout;
      logger.warn('Circuit breaker re-opened - recovery attempt failed');
    }
  }

  canAttempt(): boolean {
    if (this.state === CircuitBreakerState.CLOSED) {
      return true;
    }
    
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() >= this.nextAttempt) {
        this.state = CircuitBreakerState.HALF_OPEN;
        logger.info('Circuit breaker half-open - attempting recovery');
        return true;
      }
      return false;
    }
    
    // HALF_OPEN - allow one attempt
    return true;
  }

  private resetCounts(): void {
    this.failures = 0;
    this.requests = 0;
    this.monitoringStartTime = Date.now();
  }

  getStatus() {
    return {
      state: this.state,
      failures: this.failures,
      requests: this.requests,
      nextAttempt: this.nextAttempt ? new Date(this.nextAttempt) : null
    };
  }
}
```

### Dead Letter Queue Model
```typescript
// server/src/models/DeadLetterQueue.ts
export interface IDeadLetterQueue extends Document {
  type: string;
  entityId?: string;
  error: string;
  errorStack?: string;
  originalData?: any;
  
  retryAfter: Date;
  failureCount: number;
  processed: boolean;
  processedAt?: Date;
  permanentlyFailed: boolean;
}

const deadLetterQueueSchema = new Schema<IDeadLetterQueue>({
  type: { type: String, required: true, index: true },
  entityId: { type: String, index: true },
  error: { type: String, required: true },
  errorStack: String,
  originalData: Schema.Types.Mixed,
  
  retryAfter: { type: Date, required: true, index: true },
  failureCount: { type: Number, default: 0 },
  processed: { type: Boolean, default: false, index: true },
  processedAt: Date,
  permanentlyFailed: { type: Boolean, default: false, index: true }
}, {
  timestamps: true
});

export const DeadLetterQueue = model<IDeadLetterQueue>('DeadLetterQueue', deadLetterQueueSchema);
```

### Recovery Job
```typescript
// server/src/jobs/recoveryJob.ts
export class RecoveryJob {
  constructor(private errorRecoveryService: ErrorRecoveryService) {}

  start() {
    // Process dead letter queue every hour
    cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Starting dead letter queue processing');
        
        const types = ['document_sync', 'stock_sync', 'business_partner_sync', 'article_sync'];
        for (const type of types) {
          await this.errorRecoveryService.processDeadLetterQueue(type);
        }
        
        logger.info('Dead letter queue processing completed');
      } catch (error) {
        logger.error('Dead letter queue processing failed:', error);
      }
    });

    logger.info('Recovery job scheduled to run every hour');
  }
}
```

## Dependencies
- TASK-045-add-sync-status-tracking (sync tracking service needed)
- All sync services will use this for error recovery

## Definition of Done
- [ ] Error recovery service handles different error types
- [ ] Circuit breaker pattern implemented and tested
- [ ] Dead letter queue processes failed items
- [ ] Retry logic with exponential backoff working
- [ ] Recovery job processes dead letter queue hourly
- [ ] All error recovery strategies properly tested
- [ ] Circuit breaker opens and closes correctly
- [ ] Monitoring shows recovery success rates
- [ ] Integration with all sync services complete
- [ ] Code review completed (if applicable)