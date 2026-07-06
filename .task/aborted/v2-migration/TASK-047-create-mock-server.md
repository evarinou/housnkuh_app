# Task: TASK-047-create-mock-server
Priority: medium
Status: pending

## User Acceptance Criteria
- [ ] Mock server implemented for local development
- [ ] All Flourio API endpoints mocked with realistic responses
- [ ] Mock data generation for testing different scenarios
- [ ] Toggle between mock and real API via environment variable
- [ ] Mock server supports rate limiting simulation
- [ ] All mock endpoints properly tested

## Test Plan
### Unit Tests
- [ ] Test mock server starts and responds correctly
- [ ] Test all mocked endpoints return expected data format
- [ ] Test rate limiting simulation works
- [ ] Test error scenario simulation
- [ ] Co-located test file: mockServer.test.ts

### Integration Tests  
- [ ] Test switching between mock and real API
- [ ] Test all sync services work with mock server
- [ ] Test mock data consistency across related endpoints

### Manual Testing
- [ ] Start mock server and verify all endpoints work
- [ ] Test development workflow with mock server
- [ ] Verify mock data appears realistic in UI

## Implementation Details
Create comprehensive mock server for local development:

### Mock Server Implementation
```typescript
// server/src/mock/flourioMockServer.ts
import express from 'express';
import cors from 'cors';
import { MockDataGenerator } from './mockDataGenerator';
import { MockRateLimiter } from './mockRateLimiter';

export class FlourioMockServer {
  private app: express.Application;
  private dataGenerator: MockDataGenerator;
  private rateLimiter: MockRateLimiter;
  private port: number;

  constructor(port: number = 3001) {
    this.app = express();
    this.port = port;
    this.dataGenerator = new MockDataGenerator();
    this.rateLimiter = new MockRateLimiter();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    
    // Mock rate limiting
    this.app.use((req, res, next) => {
      if (process.env.FLOURIO_MOCK_RATE_LIMITING === 'true') {
        const allowed = this.rateLimiter.isAllowed(req.ip);
        if (!allowed) {
          return res.status(429).json({
            error: 'Rate limit exceeded',
            retryAfter: 60
          });
        }
      }
      next();
    });

    // Mock authentication
    this.app.use('/api/v2', (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization header' });
      }
      next();
    });

    // Response delay simulation
    this.app.use((req, res, next) => {
      const delay = parseInt(process.env.FLOURIO_MOCK_DELAY || '100');
      setTimeout(next, delay);
    });
  }

  private setupRoutes() {
    const router = express.Router();

    // Articles endpoints
    router.get('/articles', this.handleGetArticles.bind(this));
    router.post('/articles', this.handleCreateArticle.bind(this));
    router.get('/articles/:id', this.handleGetArticle.bind(this));
    router.put('/articles/:id', this.handleUpdateArticle.bind(this));
    router.delete('/articles/:id', this.handleDeleteArticle.bind(this));
    
    // Stock endpoints
    router.get('/stocks', this.handleGetStocks.bind(this));
    router.post('/stocks', this.handleCreateStock.bind(this));
    router.get('/stocks/:id', this.handleGetStock.bind(this));
    router.put('/stocks/:id', this.handleUpdateStock.bind(this));
    router.delete('/stocks/:id', this.handleDeleteStock.bind(this));
    
    // BusinessPartners endpoints
    router.get('/business-partners', this.handleGetBusinessPartners.bind(this));
    router.post('/business-partners', this.handleCreateBusinessPartner.bind(this));
    router.get('/business-partners/:id', this.handleGetBusinessPartner.bind(this));
    router.put('/business-partners/:id', this.handleUpdateBusinessPartner.bind(this));
    router.delete('/business-partners/:id', this.handleDeleteBusinessPartner.bind(this));
    
    // Documents endpoints
    router.get('/documents', this.handleGetDocuments.bind(this));
    router.get('/documents/:id', this.handleGetDocument.bind(this));
    
    // Stock movements
    router.get('/stocks/:id/movements', this.handleGetStockMovements.bind(this));
    router.post('/stocks/:id/movements', this.handleCreateStockMovement.bind(this));

    this.app.use('/api/v2', router);

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        mock: true,
        timestamp: new Date().toISOString()
      });
    });
  }

  // Article endpoints
  private async handleGetArticles(req: express.Request, res: express.Response) {
    const { page = 1, limit = 50, category, name } = req.query;
    const articles = this.dataGenerator.generateArticles(parseInt(limit as string));
    
    res.json({
      data: articles,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: articles.length,
        totalPages: 1
      }
    });
  }

  private async handleCreateArticle(req: express.Request, res: express.Response) {
    // Simulate validation errors occasionally
    if (Math.random() < 0.1) {
      return res.status(400).json({
        error: 'Validation error',
        details: ['Name is required', 'Price must be positive']
      });
    }

    const article = this.dataGenerator.generateArticle(req.body);
    res.status(201).json({ data: article });
  }

  private async handleGetArticle(req: express.Request, res: express.Response) {
    const { id } = req.params;
    
    // Simulate not found occasionally
    if (Math.random() < 0.05) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const article = this.dataGenerator.generateArticle({ id });
    res.json({ data: article });
  }

  private async handleUpdateArticle(req: express.Request, res: express.Response) {
    const { id } = req.params;
    const article = this.dataGenerator.generateArticle({ id, ...req.body });
    res.json({ data: article });
  }

  private async handleDeleteArticle(req: express.Request, res: express.Response) {
    res.status(204).send();
  }

  // Stock endpoints
  private async handleGetStocks(req: express.Request, res: express.Response) {
    const { page = 1, limit = 50 } = req.query;
    const stocks = this.dataGenerator.generateStocks(parseInt(limit as string));
    
    res.json({
      data: stocks,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: stocks.length,
        totalPages: 1
      }
    });
  }

  private async handleCreateStock(req: express.Request, res: express.Response) {
    const stock = this.dataGenerator.generateStock(req.body);
    res.status(201).json({ data: stock });
  }

  private async handleGetStock(req: express.Request, res: express.Response) {
    const { id } = req.params;
    const stock = this.dataGenerator.generateStock({ id });
    res.json({ data: stock });
  }

  private async handleUpdateStock(req: express.Request, res: express.Response) {
    const { id } = req.params;
    const stock = this.dataGenerator.generateStock({ id, ...req.body });
    res.json({ data: stock });
  }

  private async handleDeleteStock(req: express.Request, res: express.Response) {
    res.status(204).send();
  }

  // BusinessPartner endpoints
  private async handleGetBusinessPartners(req: express.Request, res: express.Response) {
    const { page = 1, limit = 50 } = req.query;
    const partners = this.dataGenerator.generateBusinessPartners(parseInt(limit as string));
    
    res.json({
      data: partners,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: partners.length,
        totalPages: 1
      }
    });
  }

  private async handleCreateBusinessPartner(req: express.Request, res: express.Response) {
    const partner = this.dataGenerator.generateBusinessPartner(req.body);
    res.status(201).json({ data: partner });
  }

  private async handleGetBusinessPartner(req: express.Request, res: express.Response) {
    const { id } = req.params;
    const partner = this.dataGenerator.generateBusinessPartner({ id });
    res.json({ data: partner });
  }

  private async handleUpdateBusinessPartner(req: express.Request, res: express.Response) {
    const { id } = req.params;
    const partner = this.dataGenerator.generateBusinessPartner({ id, ...req.body });
    res.json({ data: partner });
  }

  private async handleDeleteBusinessPartner(req: express.Request, res: express.Response) {
    res.status(204).send();
  }

  // Document endpoints
  private async handleGetDocuments(req: express.Request, res: express.Response) {
    const { since, type, limit = 50 } = req.query;
    const documents = this.dataGenerator.generateDocuments(parseInt(limit as string), {
      since: since as string,
      type: type as string
    });
    
    res.json({ documents });
  }

  private async handleGetDocument(req: express.Request, res: express.Response) {
    const { id } = req.params;
    const document = this.dataGenerator.generateDocument({ id });
    res.json({ data: document });
  }

  // Stock movement endpoints
  private async handleGetStockMovements(req: express.Request, res: express.Response) {
    const { id } = req.params;
    const movements = this.dataGenerator.generateStockMovements(10, id);
    res.json({ data: movements });
  }

  private async handleCreateStockMovement(req: express.Request, res: express.Response) {
    const { id } = req.params;
    const movement = this.dataGenerator.generateStockMovement({ stockId: id, ...req.body });
    res.status(201).json({ data: movement });
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        console.log(`🚀 Flourio Mock Server running on port ${this.port}`);
        console.log(`📍 Health check: http://localhost:${this.port}/health`);
        resolve();
      });
    });
  }
}
```

### Mock Data Generator
```typescript
// server/src/mock/mockDataGenerator.ts
export class MockDataGenerator {
  private articleCounter = 1;
  private stockCounter = 1;
  private partnerCounter = 1;
  private documentCounter = 1;

  generateArticles(count: number): any[] {
    return Array.from({ length: count }, () => this.generateArticle());
  }

  generateArticle(override: any = {}): any {
    const id = override.id || `article_${this.articleCounter++}`;
    
    return {
      id,
      name: override.name || this.generateProductName(),
      description: override.description || 'Mock product description',
      sku: override.sku || `SKU-${Math.random().toString(36).substr(2, 9)}`,
      category: override.category || this.randomChoice(['Gemüse', 'Obst', 'Fleisch', 'Milchprodukte']),
      pricing: {
        basePrice: override.price || this.randomPrice(1, 50),
        currency: 'EUR',
        vatRate: 7.0
      },
      inventory: {
        trackStock: true,
        currentStock: Math.floor(Math.random() * 100),
        minimumStock: 5
      },
      metadata: {
        housnkuhProductId: `prod_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  generateStocks(count: number): any[] {
    return Array.from({ length: count }, () => this.generateStock());
  }

  generateStock(override: any = {}): any {
    const id = override.id || `stock_${this.stockCounter++}`;
    
    return {
      id,
      displayName: override.displayName || `Lagerplatz ${Math.floor(Math.random() * 999) + 1}`,
      location: override.location || this.randomChoice(['München', 'Hamburg', 'Berlin', 'Köln']),
      capacity: override.capacity || Math.floor(Math.random() * 1000) + 100,
      type: override.type || this.randomChoice(['refrigerated', 'dry', 'frozen']),
      active: override.active !== undefined ? override.active : true,
      metadata: {
        housnkuhMietfachId: `mietfach_${Math.random().toString(36).substr(2, 9)}`,
        nummer: `M${Math.floor(Math.random() * 999) + 1}`,
        preis: this.randomPrice(50, 500)
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  generateBusinessPartners(count: number): any[] {
    return Array.from({ length: count }, () => this.generateBusinessPartner());
  }

  generateBusinessPartner(override: any = {}): any {
    const id = override.id || `partner_${this.partnerCounter++}`;
    const companyName = override.companyName || this.generateCompanyName();
    
    return {
      id,
      companyName,
      contactPerson: override.contactPerson || this.generatePersonName(),
      email: override.email || `info@${companyName.toLowerCase().replace(/\s+/g, '')}.de`,
      phone: override.phone || this.generatePhoneNumber(),
      address: {
        street: `${this.randomChoice(['Hauptstraße', 'Gartenstraße', 'Dorfstraße'])} ${Math.floor(Math.random() * 200) + 1}`,
        city: this.randomChoice(['München', 'Hamburg', 'Berlin', 'Köln', 'Stuttgart']),
        postalCode: Math.floor(Math.random() * 90000) + 10000,
        country: 'DE'
      },
      metadata: {
        housnkuhVendorId: `vendor_${Math.random().toString(36).substr(2, 9)}`,
        registrationDate: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  generateDocuments(count: number, filters?: { since?: string; type?: string }): any[] {
    return Array.from({ length: count }, () => this.generateDocument(filters));
  }

  generateDocument(override: any = {}): any {
    const id = override.id || `doc_${this.documentCounter++}`;
    const type = override.type || this.randomChoice(['invoice', 'receipt', 'credit_note']);
    
    return {
      id,
      documentNumber: `${type.toUpperCase()}-${Math.floor(Math.random() * 10000) + 1000}`,
      type,
      status: this.randomChoice(['draft', 'sent', 'paid', 'overdue']),
      businessPartner: this.generateBusinessPartner(),
      customer: {
        name: this.generatePersonName(),
        email: `customer${Math.floor(Math.random() * 1000)}@example.com`,
        address: {
          street: `Kundenstraße ${Math.floor(Math.random() * 100) + 1}`,
          city: 'München',
          postalCode: '80331',
          country: 'DE'
        }
      },
      items: this.generateDocumentItems(),
      totals: {
        subtotal: this.randomPrice(10, 200),
        taxAmount: this.randomPrice(1, 20),
        total: this.randomPrice(11, 220)
      },
      currency: 'EUR',
      issueDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      paymentStatus: this.randomChoice(['pending', 'paid', 'partial', 'overdue']),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  private generateDocumentItems(): any[] {
    const itemCount = Math.floor(Math.random() * 5) + 1;
    return Array.from({ length: itemCount }, () => ({
      id: `item_${Math.random().toString(36).substr(2, 9)}`,
      articleId: `article_${Math.floor(Math.random() * 100) + 1}`,
      name: this.generateProductName(),
      quantity: Math.floor(Math.random() * 10) + 1,
      unit: 'pcs',
      unitPrice: this.randomPrice(1, 20),
      totalPrice: this.randomPrice(1, 200),
      taxRate: 7.0,
      taxAmount: this.randomPrice(0.1, 14)
    }));
  }

  private generateProductName(): string {
    const products = [
      'Bio Tomaten', 'Frische Gurken', 'Karotten', 'Paprika Mix',
      'Äpfel Elstar', 'Bananen', 'Orangen', 'Erdbeeren',
      'Vollmilch', 'Gouda Käse', 'Butter', 'Joghurt Natur',
      'Bauernbrot', 'Dinkelbrötchen', 'Croissants'
    ];
    return this.randomChoice(products);
  }

  private generateCompanyName(): string {
    const prefixes = ['Bio', 'Öko', 'Frische', 'Regional', 'Bauern'];
    const suffixes = ['Hof', 'Garten', 'Markt', 'Laden', 'Vertrieb'];
    return `${this.randomChoice(prefixes)} ${this.randomChoice(suffixes)}`;
  }

  private generatePersonName(): string {
    const firstNames = ['Hans', 'Maria', 'Klaus', 'Anna', 'Peter', 'Ingrid'];
    const lastNames = ['Müller', 'Schmidt', 'Weber', 'Meyer', 'Wagner'];
    return `${this.randomChoice(firstNames)} ${this.randomChoice(lastNames)}`;
  }

  private generatePhoneNumber(): string {
    return `+49 ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 900000) + 100000}`;
  }

  private randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private randomPrice(min: number, max: number): number {
    return Math.round((Math.random() * (max - min) + min) * 100) / 100;
  }
}
```

### Mock Integration
```typescript
// server/src/services/flourio/apiClientFactory.ts
export class ApiClientFactory {
  static createClient(): FlourioApiClient {
    if (process.env.FLOURIO_USE_MOCK === 'true') {
      return new MockFlourioApiClient();
    } else {
      return new RealFlourioApiClient();
    }
  }
}

class MockFlourioApiClient implements FlourioApiClient {
  private baseURL: string;
  
  constructor() {
    this.baseURL = process.env.FLOURIO_MOCK_SERVER_URL || 'http://localhost:3001/api/v2';
  }

  async request(config: RequestConfig): Promise<any> {
    const url = `${this.baseURL}${config.url}`;
    const response = await fetch(url, {
      method: config.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer mock-token`,
        ...config.headers
      },
      body: config.data ? JSON.stringify(config.data) : undefined
    });

    if (!response.ok) {
      throw new Error(`Mock API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}
```

## Dependencies
- TASK-028-implement-api-client (API client structure needed)
- TASK-030-create-typescript-types (type definitions needed)

## Definition of Done
- [ ] Mock server implements all required Flourio API endpoints
- [ ] Realistic mock data generated for all entity types
- [ ] Environment variable controls mock vs real API
- [ ] Rate limiting and error simulation working
- [ ] Mock server starts automatically in development
- [ ] All sync services work with mock server
- [ ] Comprehensive mock data covers test scenarios
- [ ] Mock server performance suitable for development
- [ ] Integration tests pass with mock server
- [ ] Code review completed (if applicable)