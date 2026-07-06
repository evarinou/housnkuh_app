# Task: TASK-050-implement-webhook-listener
Priority: low
Status: pending

## User Acceptance Criteria
- [ ] Webhook endpoint implemented to receive Flourio updates
- [ ] Webhook signature verification for security
- [ ] Real-time processing of Flourio events
- [ ] WebSocket broadcasts to admin dashboard
- [ ] Event filtering and processing logic
- [ ] All webhook handling properly tested

## Test Plan
### Unit Tests
- [ ] Test webhook signature verification
- [ ] Test event processing for different event types
- [ ] Test error handling for malformed webhooks
- [ ] Test WebSocket broadcasting
- [ ] Co-located test file: webhookListener.test.ts

### Integration Tests  
- [ ] Test webhook with real Flourio events (if available)
- [ ] Test end-to-end webhook to dashboard updates
- [ ] Test webhook security and validation

### Manual Testing
- [ ] Send test webhooks and verify processing
- [ ] Test dashboard receives real-time updates
- [ ] Verify security measures prevent unauthorized access

## Implementation Details
Implement webhook listener for real-time Flourio updates:

### Main Webhook Listener
```typescript
// server/src/controllers/webhookController.ts
import crypto from 'crypto';
import { Request, Response } from 'express';
import { WebhookEventProcessor } from '../services/webhookEventProcessor';
import { logger } from '../utils/logger';

export class WebhookController {
  private eventProcessor: WebhookEventProcessor;
  private webhookSecret: string;

  constructor() {
    this.eventProcessor = new WebhookEventProcessor();
    this.webhookSecret = process.env.FLOURIO_WEBHOOK_SECRET || '';
    
    if (!this.webhookSecret) {
      logger.warn('FLOURIO_WEBHOOK_SECRET not set - webhook signature verification disabled');
    }
  }

  async handleFlourioWebhook(req: Request, res: Response) {
    try {
      // Verify webhook signature
      if (this.webhookSecret && !this.verifySignature(req)) {
        logger.warn('Invalid webhook signature received', {
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        return res.status(401).json({ error: 'Invalid signature' });
      }

      const event = req.body;
      
      // Log webhook received
      logger.info('Flourio webhook received', {
        eventType: event.type,
        eventId: event.id,
        timestamp: event.timestamp
      });

      // Process the webhook event
      await this.eventProcessor.processEvent(event);

      // Send success response quickly
      res.status(200).json({ 
        received: true, 
        eventId: event.id,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Webhook processing failed', {
        error: error.message,
        stack: error.stack,
        body: req.body
      });

      // Still return 200 to prevent Flourio from retrying
      // Log the error for manual investigation
      res.status(200).json({ 
        received: true, 
        error: 'Processing failed - logged for investigation'
      });
    }
  }

  private verifySignature(req: Request): boolean {
    const signature = req.get('X-Flourio-Signature');
    if (!signature) return false;

    const body = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(body)
      .digest('hex');

    const providedSignature = signature.replace('sha256=', '');
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex')
    );
  }

  async getWebhookStatus(req: Request, res: Response) {
    try {
      const stats = await this.eventProcessor.getProcessingStats();
      res.json({
        enabled: process.env.FLOURIO_WEBHOOK_ENABLED === 'true',
        signatureVerification: !!this.webhookSecret,
        stats
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}
```

### Webhook Event Processor
```typescript
// server/src/services/webhookEventProcessor.ts
import { WebSocketManager } from './webSocketManager';
import { DocumentSyncService } from './flourio/documentSyncService';
import { StockService } from './flourio/stockService';
import { BusinessPartnerService } from './flourio/businessPartnerService';
import { ArticleService } from './flourio/articleService';

export interface FlourioWebhookEvent {
  id: string;
  type: string;
  timestamp: string;
  data: {
    object: string;
    action: 'created' | 'updated' | 'deleted';
    id: string;
    changes?: string[];
  };
}

export class WebhookEventProcessor {
  private wsManager: WebSocketManager;
  private documentSync: DocumentSyncService;
  private stockService: StockService;
  private businessPartnerService: BusinessPartnerService;
  private articleService: ArticleService;
  private processedEvents: Set<string> = new Set();

  constructor() {
    this.wsManager = WebSocketManager.getInstance();
    this.documentSync = new DocumentSyncService();
    this.stockService = new StockService();
    this.businessPartnerService = new BusinessPartnerService();
    this.articleService = new ArticleService();
  }

  async processEvent(event: FlourioWebhookEvent): Promise<void> {
    // Prevent duplicate processing
    if (this.processedEvents.has(event.id)) {
      logger.info(`Event ${event.id} already processed, skipping`);
      return;
    }

    try {
      // Mark as processed immediately
      this.processedEvents.add(event.id);

      // Clean up old event IDs (keep last 1000)
      if (this.processedEvents.size > 1000) {
        const oldestEvents = Array.from(this.processedEvents).slice(0, -1000);
        oldestEvents.forEach(id => this.processedEvents.delete(id));
      }

      // Process based on event type
      await this.routeEvent(event);

      // Broadcast update to admin dashboard
      this.wsManager.broadcastToAdmins('webhook-event', {
        eventId: event.id,
        type: event.type,
        object: event.data.object,
        action: event.data.action,
        timestamp: event.timestamp,
        processed: true
      });

      logger.info(`Successfully processed webhook event ${event.id}`);

    } catch (error) {
      logger.error(`Failed to process webhook event ${event.id}:`, error);
      
      // Remove from processed set so it can be retried
      this.processedEvents.delete(event.id);
      
      // Broadcast error to admin dashboard
      this.wsManager.broadcastToAdmins('webhook-error', {
        eventId: event.id,
        type: event.type,
        error: error.message,
        timestamp: event.timestamp
      });
      
      throw error;
    }
  }

  private async routeEvent(event: FlourioWebhookEvent): Promise<void> {
    const { object, action, id } = event.data;

    switch (object) {
      case 'document':
        await this.handleDocumentEvent(action, id, event.data.changes);
        break;
        
      case 'stock':
        await this.handleStockEvent(action, id, event.data.changes);
        break;
        
      case 'business_partner':
        await this.handleBusinessPartnerEvent(action, id, event.data.changes);
        break;
        
      case 'article':
        await this.handleArticleEvent(action, id, event.data.changes);
        break;
        
      default:
        logger.info(`Unhandled webhook object type: ${object}`);
    }
  }

  private async handleDocumentEvent(action: string, documentId: string, changes?: string[]) {
    switch (action) {
      case 'created':
      case 'updated':
        // Fetch and sync the specific document
        try {
          await this.documentSync.syncSpecificDocument(documentId);
          logger.info(`Synced document ${documentId} via webhook`);
        } catch (error) {
          logger.error(`Failed to sync document ${documentId}:`, error);
        }
        break;
        
      case 'deleted':
        // Handle document deletion
        await this.handleDocumentDeletion(documentId);
        break;
    }
  }

  private async handleStockEvent(action: string, stockId: string, changes?: string[]) {
    switch (action) {
      case 'created':
      case 'updated':
        // Find associated Mietfach and update
        try {
          const mietfach = await Mietfach.findOne({ flourioStockId: stockId });
          if (mietfach) {
            await this.stockService.syncStockToMietfach(stockId, mietfach._id);
            logger.info(`Synced stock ${stockId} to Mietfach ${mietfach._id} via webhook`);
          }
        } catch (error) {
          logger.error(`Failed to sync stock ${stockId}:`, error);
        }
        break;
        
      case 'deleted':
        await this.handleStockDeletion(stockId);
        break;
    }
  }

  private async handleBusinessPartnerEvent(action: string, partnerId: string, changes?: string[]) {
    switch (action) {
      case 'created':
      case 'updated':
        // Find associated vendor and update
        try {
          const vendor = await User.findOne({ flourioPartnerId: partnerId, role: 'vendor' });
          if (vendor) {
            await this.businessPartnerService.syncPartnerToVendor(partnerId, vendor._id);
            logger.info(`Synced partner ${partnerId} to vendor ${vendor._id} via webhook`);
          }
        } catch (error) {
          logger.error(`Failed to sync business partner ${partnerId}:`, error);
        }
        break;
        
      case 'deleted':
        await this.handleBusinessPartnerDeletion(partnerId);
        break;
    }
  }

  private async handleArticleEvent(action: string, articleId: string, changes?: string[]) {
    switch (action) {
      case 'created':
      case 'updated':
        // Find associated product and update
        try {
          const product = await Product.findOne({ flourioArticleId: articleId });
          if (product) {
            await this.articleService.syncArticleToProduct(articleId, product._id);
            logger.info(`Synced article ${articleId} to product ${product._id} via webhook`);
          }
        } catch (error) {
          logger.error(`Failed to sync article ${articleId}:`, error);
        }
        break;
        
      case 'deleted':
        await this.handleArticleDeletion(articleId);
        break;
    }
  }

  private async handleDocumentDeletion(documentId: string) {
    // Mark local invoice as deleted or remove it
    try {
      await Invoice.findOneAndUpdate(
        { flourioDocumentId: documentId },
        { 
          status: 'deleted',
          flourioSyncStatus: 'deleted',
          deletedAt: new Date()
        }
      );
      logger.info(`Marked invoice as deleted for Flourio document ${documentId}`);
    } catch (error) {
      logger.error(`Failed to handle document deletion ${documentId}:`, error);
    }
  }

  private async handleStockDeletion(stockId: string) {
    // Clear Flourio stock ID from Mietfach
    try {
      await Mietfach.findOneAndUpdate(
        { flourioStockId: stockId },
        { 
          $unset: { flourioStockId: 1 },
          flourioSyncStatus: 'deleted'
        }
      );
      logger.info(`Cleared Flourio stock reference ${stockId} from Mietfach`);
    } catch (error) {
      logger.error(`Failed to handle stock deletion ${stockId}:`, error);
    }
  }

  private async handleBusinessPartnerDeletion(partnerId: string) {
    // Clear Flourio partner ID from vendor
    try {
      await User.findOneAndUpdate(
        { flourioPartnerId: partnerId, role: 'vendor' },
        { 
          $unset: { flourioPartnerId: 1 },
          flourioSyncStatus: 'deleted'
        }
      );
      logger.info(`Cleared Flourio partner reference ${partnerId} from vendor`);
    } catch (error) {
      logger.error(`Failed to handle business partner deletion ${partnerId}:`, error);
    }
  }

  private async handleArticleDeletion(articleId: string) {
    // Clear Flourio article ID from product
    try {
      await Product.findOneAndUpdate(
        { flourioArticleId: articleId },
        { 
          $unset: { flourioArticleId: 1 },
          flourioSyncStatus: 'deleted'
        }
      );
      logger.info(`Cleared Flourio article reference ${articleId} from product`);
    } catch (error) {
      logger.error(`Failed to handle article deletion ${articleId}:`, error);
    }
  }

  async getProcessingStats() {
    const stats = await WebhookEvent.aggregate([
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
          successful: { 
            $sum: { $cond: [{ $eq: ['$processed', true] }, 1, 0] } 
          },
          failed: { 
            $sum: { $cond: [{ $eq: ['$processed', false] }, 1, 0] } 
          }
        }
      }
    ]);

    return {
      totalEvents: this.processedEvents.size,
      eventTypes: stats,
      lastProcessed: new Date().toISOString()
    };
  }
}
```

### WebSocket Manager for Real-time Updates
```typescript
// server/src/services/webSocketManager.ts
import { Server as SocketIOServer } from 'socket.io';
import { Server } from 'http';
import jwt from 'jsonwebtoken';

export class WebSocketManager {
  private static instance: WebSocketManager;
  private io: SocketIOServer | null = null;
  private adminSockets: Set<any> = new Set();

  private constructor() {}

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  initialize(server: Server) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      },
      path: '/admin/sync-updates'
    });

    this.io.use((socket, next) => {
      // Authenticate admin users
      const token = socket.handshake.auth.token;
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        if (decoded.role !== 'admin') {
          return next(new Error('Unauthorized - Admin access required'));
        }
        
        socket.userId = decoded.userId;
        socket.userRole = decoded.role;
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', (socket) => {
      console.log(`Admin user connected: ${socket.userId}`);
      
      // Add to admin sockets
      this.adminSockets.add(socket);
      
      // Send current sync status
      this.sendCurrentStatus(socket);
      
      socket.on('disconnect', () => {
        console.log(`Admin user disconnected: ${socket.userId}`);
        this.adminSockets.delete(socket);
      });
      
      // Handle manual sync requests
      socket.on('trigger-sync', async (data) => {
        try {
          // Broadcast that sync is starting
          this.broadcastToAdmins('sync-started', {
            type: data.syncType,
            triggeredBy: socket.userId,
            timestamp: new Date().toISOString()
          });
          
          // Trigger the actual sync (would call appropriate service)
          // await this.triggerSync(data.syncType);
          
        } catch (error) {
          socket.emit('sync-error', {
            error: error.message,
            syncType: data.syncType
          });
        }
      });
    });

    console.log('WebSocket server initialized for admin sync updates');
  }

  broadcastToAdmins(event: string, data: any) {
    if (!this.io) return;
    
    this.adminSockets.forEach(socket => {
      socket.emit(event, data);
    });
  }

  private async sendCurrentStatus(socket: any) {
    try {
      // Get current sync status
      const syncStatus = await this.getCurrentSyncStatus();
      socket.emit('sync-status-update', syncStatus);
    } catch (error) {
      console.error('Failed to send current status:', error);
    }
  }

  private async getCurrentSyncStatus() {
    // This would get actual sync status from the sync tracking service
    return {
      document_sync: { status: 'synced', lastSyncAt: new Date() },
      stock_sync: { status: 'synced', lastSyncAt: new Date() },
      business_partner_sync: { status: 'synced', lastSyncAt: new Date() },
      article_sync: { status: 'synced', lastSyncAt: new Date() }
    };
  }
}
```

### Webhook Routes
```typescript
// server/src/routes/webhookRoutes.ts
import express from 'express';
import { WebhookController } from '../controllers/webhookController';
import { authenticateAdmin } from '../middleware/auth';

const router = express.Router();
const webhookController = new WebhookController();

// Public webhook endpoint (no auth - verified by signature)
router.post('/flourio', webhookController.handleFlourioWebhook.bind(webhookController));

// Admin endpoints
router.get('/status', authenticateAdmin, webhookController.getWebhookStatus.bind(webhookController));

export default router;
```

### Webhook Event Model
```typescript
// server/src/models/WebhookEvent.ts
export interface IWebhookEvent extends Document {
  eventId: string;
  eventType: string;
  objectType: string;
  objectId: string;
  action: string;
  processed: boolean;
  processingError?: string;
  receivedAt: Date;
  processedAt?: Date;
}

const webhookEventSchema = new Schema<IWebhookEvent>({
  eventId: { type: String, required: true, unique: true },
  eventType: { type: String, required: true, index: true },
  objectType: { type: String, required: true, index: true },
  objectId: { type: String, required: true },
  action: { type: String, required: true },
  processed: { type: Boolean, default: false, index: true },
  processingError: String,
  receivedAt: { type: Date, default: Date.now },
  processedAt: Date
}, {
  timestamps: true
});

export const WebhookEvent = model<IWebhookEvent>('WebhookEvent', webhookEventSchema);
```

### App Integration
```typescript
// server/src/app.ts - Add webhook setup
import webhookRoutes from './routes/webhookRoutes';
import { WebSocketManager } from './services/webSocketManager';

// Initialize WebSocket manager
const wsManager = WebSocketManager.getInstance();
wsManager.initialize(server);

// Webhook routes
app.use('/webhooks', webhookRoutes);
```

## Dependencies
- TASK-049-add-monitoring-dashboard (WebSocket integration)
- All sync services for event processing

## Definition of Done
- [ ] Webhook endpoint receives and processes Flourio events
- [ ] Webhook signature verification implemented
- [ ] Real-time event processing working
- [ ] WebSocket broadcasts updates to admin dashboard
- [ ] Event deduplication prevents duplicate processing
- [ ] Error handling for malformed webhooks
- [ ] Webhook event logging and statistics
- [ ] Security measures prevent unauthorized access
- [ ] All webhook processing properly tested
- [ ] Integration with admin monitoring dashboard
- [ ] Code review completed (if applicable)