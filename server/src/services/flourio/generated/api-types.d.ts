/**
 * @file api-types.d.ts
 * @purpose Manually crafted TypeScript types for Flourio API v3
 * @created 2025-10-16
 * @updated 2026-03-31 — Stock corrected to Warehouse, added StockItemEntry
 * @note Generated from https://flour.host/api/v3-json (OpenAPI schema has broken refs)
 */

// ============================================================================
// Core Entity Types
// ============================================================================

export interface ArticleTag {
  _id: string;
  name: string;
  section?: string;
}

export interface Article {
  id: string;
  name: string;
  description?: string;
  price: number;
  unit?: string;
  tags?: string[] | ArticleTag[]; // Can be string[] or populated ArticleTag objects
  sku?: string;
  barcode?: string;
  taxRate?: number;
  stock?: number;
  minStock?: number;
  maxStock?: number;
  supplier?: string;
  images?: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Warehouse (Lager) — mapped from /v3/stocks endpoints.
 * In Flourio, "Stock" = Warehouse/Lager, NOT an inventory entry.
 * Each Mietfach in housnkuh maps to one Warehouse in Flourio.
 */
export interface Warehouse {
  id: string;
  name: string;
  address?: WarehouseAddress;
  useBins?: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Address format for Warehouses (from Flourio Swagger Address schema).
 * Note: differs from BusinessPartner Address — Flourio uses different
 * field names (streetNumber vs houseNumber, zipCode vs postalCode).
 */
export interface WarehouseAddress {
  prefix?: string;
  salutation?: string;
  company1?: string;
  company2?: string;
  company3?: string;
  firstName?: string;
  lastName?: string;
  street?: string;
  streetNumber?: string;
  zipCode?: string;
  city?: string;
  country?: string;
  vatId?: string;
}

/**
 * StockItemEntry — the actual inventory record.
 * Links an Article (item) to a Warehouse (stock) with an amount.
 * Mapped from /v3/stockitementries endpoints.
 */
export interface StockItemEntry {
  id: string;
  item: string;            // Flourio Article ID
  stock: string;           // Flourio Warehouse ID
  amount: number;
  type: string;            // "I" = Inbound
  bin?: string;
  serialNumber?: string;
  bestBeforeDate?: string;
  batchNumber?: string;
  description?: string;
  date?: string;
  order?: boolean;
  orderId?: string;
  orderItemId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * StockTransfer — movement of items between warehouses.
 * Mapped from /v3/stocktransfers endpoints.
 */
export interface StockTransfer {
  id: string;
  name: string;
  mode?: string;
  out?: StockTransferSide;
  in?: StockTransferSide;
  createdAt: string;
  updatedAt: string;
}

export interface StockTransferSide {
  date?: string;
  items?: StockTransferItem[];
  stock?: string;          // Warehouse ID
}

export interface StockTransferItem {
  item?: string;           // Article ID
  amount?: number;
}

export interface BusinessPartner {
  id: string;
  type: 'customer' | 'supplier' | 'both';
  companyName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  taxId?: string;
  address?: Address;
  paymentTerms?: string;
  creditLimit?: number;
  balance?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Address format for BusinessPartners.
 * Note: This uses simplified field names (houseNumber, postalCode).
 * Flourio's Swagger uses a shared Address schema with different names
 * (streetNumber, zipCode) — the BusinessPartnerMapping handles translation.
 */
export interface Address {
  street?: string;
  houseNumber?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  additionalInfo?: string;
}

export interface Document {
  id: string;
  type: 'invoice' | 'order' | 'delivery' | 'quote';
  number: string;
  date: string;
  dueDate?: string;
  businessPartnerId: string;
  items: DocumentItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentItem {
  articleId: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount?: number;
  total: number;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateArticleDto {
  name: string;
  description?: string;
  price: number;
  unit?: string;
  tags?: string[];
  sku?: string;
  barcode?: string;
  taxRate?: number;
  stock?: number;
  minStock?: number;
  maxStock?: number;
  supplier?: string;
  images?: string[];
}

export interface UpdateArticleDto extends Partial<CreateArticleDto> {
  id: string;
}

// --- Warehouse (Lager) DTOs --- mapped to /v3/stocks ---

export interface CreateWarehouseDto {
  name: string;
  address?: WarehouseAddress;
  useBins?: boolean;
}

export interface UpdateWarehouseDto {
  name?: string;
  address?: WarehouseAddress;
  useBins?: boolean;
}

export interface SearchWarehouseDto {
  query?: string;
  filters?: Record<string, any>;
  pagination?: { page?: number; pageSize?: number };
}

// --- StockItemEntry DTOs --- mapped to /v3/stockitementries ---

export interface CreateStockItemEntryDto {
  item: string;            // Article ID (REQUIRED)
  amount: number;          // Quantity (REQUIRED)
  type: string;            // "I" = Inbound (REQUIRED)
  stock: string;           // Warehouse ID (REQUIRED)
}

export interface UpdateStockItemEntryDto {
  stock?: string;
  bin?: string;
  item?: string;
  amount?: number;
  date?: string;
  type?: string;
  serialNumber?: string;
  bestBeforeDate?: string;
  batchNumber?: string;
  description?: string;
  order?: boolean;
  orderId?: string;
  orderItemId?: string;
}

// --- Article Stock Availability ---

export interface SetStockAvailabilityDto {
  amount: number;
  type: string;
  stock: string;           // Warehouse ID
  description: string;
}

export interface GetArticleStockItemEntryDto {
  from?: string;
  to?: string;
  stocks?: string;         // Warehouse ID filter
}

// --- StockTransfer DTOs ---

export interface CreateStockTransferDto {
  name: string;
  mode?: string;
  out?: StockTransferSide;
  in?: StockTransferSide;
}

export interface UpdateStockTransferDto {
  name?: string;
  mode?: string;
  out?: StockTransferSide;
  in?: StockTransferSide;
}

// --- BusinessPartner DTOs ---

export interface CreateBusinessPartnerDto {
  type: 'customer' | 'supplier' | 'both';
  companyName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  taxId?: string;
  address?: Address;
  paymentTerms?: string;
  creditLimit?: number;
}

export interface UpdateBusinessPartnerDto extends Partial<CreateBusinessPartnerDto> {
  id: string;
}

// --- Document DTOs ---

export interface CreateDocumentDto {
  type: 'invoice' | 'order' | 'delivery' | 'quote';
  date: string;
  dueDate?: string;
  businessPartnerId: string;
  items: DocumentItem[];
  currency?: string;
  notes?: string;
}

// ============================================================================
// API Response Wrappers
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// ============================================================================
// Query Parameters
// ============================================================================

export interface ArticleQueryParams {
  page?: number;
  pageSize?: number;
  tags?: string[];
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sortBy?: 'name' | 'price' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface WarehouseQueryParams {
  page?: number;
  pageSize?: number;
}

export interface StockItemEntryQueryParams {
  page?: number;
  pageSize?: number;
}

export interface BusinessPartnerQueryParams {
  type?: 'customer' | 'supplier' | 'both';
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface DocumentQueryParams {
  type?: 'invoice' | 'order' | 'delivery' | 'quote';
  status?: 'draft' | 'sent' | 'paid' | 'cancelled';
  businessPartnerId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

// ============================================================================
// Affiliate Types (from OpenAPI spec)
// ============================================================================

export interface Affiliate {
  id: string;
  url: string;
  iban?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAffiliateDto {
  url: string;
  iban?: string;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isArticle(obj: any): obj is Article {
  return obj && typeof obj.id === 'string' && typeof obj.name === 'string' && typeof obj.price === 'number';
}

export function isWarehouse(obj: any): obj is Warehouse {
  return obj && typeof obj.id === 'string' && typeof obj.name === 'string';
}

export function isStockItemEntry(obj: any): obj is StockItemEntry {
  return obj && typeof obj.id === 'string' && typeof obj.item === 'string' && typeof obj.stock === 'string';
}

export function isBusinessPartner(obj: any): obj is BusinessPartner {
  return obj && typeof obj.id === 'string' && ['customer', 'supplier', 'both'].includes(obj.type);
}

export function isDocument(obj: any): obj is Document {
  return obj && typeof obj.id === 'string' && ['invoice', 'order', 'delivery', 'quote'].includes(obj.type);
}
