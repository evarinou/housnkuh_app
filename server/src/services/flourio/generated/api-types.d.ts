/**
 * @file api-types.d.ts
 * @purpose Manually crafted TypeScript types for Flourio API v3
 * @created 2025-10-16
 * @note Generated from https://flour.host/api/v3-json (OpenAPI schema has broken refs)
 */

// ============================================================================
// Core Entity Types
// ============================================================================

export interface Article {
  id: string;
  name: string;
  description?: string;
  price: number;
  unit?: string;
  category?: string;
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

export interface Stock {
  id: string;
  articleId: string;
  locationId: string;
  quantity: number;
  reserved?: number;
  available?: number;
  unit?: string;
  lastUpdated: string;
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
  category?: string;
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

export interface CreateStockDto {
  articleId: string;
  locationId: string;
  quantity: number;
  unit?: string;
}

export interface UpdateStockDto {
  quantity?: number;
  reserved?: number;
}

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
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sortBy?: 'name' | 'price' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface StockQueryParams {
  articleId?: string;
  locationId?: string;
  minQuantity?: number;
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

export function isStock(obj: any): obj is Stock {
  return obj && typeof obj.id === 'string' && typeof obj.articleId === 'string' && typeof obj.quantity === 'number';
}

export function isBusinessPartner(obj: any): obj is BusinessPartner {
  return obj && typeof obj.id === 'string' && ['customer', 'supplier', 'both'].includes(obj.type);
}

export function isDocument(obj: any): obj is Document {
  return obj && typeof obj.id === 'string' && ['invoice', 'order', 'delivery', 'quote'].includes(obj.type);
}
