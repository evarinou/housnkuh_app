/**
 * @file invoiceGenerationService.ts
 * @purpose Service for generating invoice documents with atomic numbering and validation
 * @created 2025-01-15
 * @modified 2025-01-15
 */

import mongoose from 'mongoose';
import Invoice from '../models/Invoice';
import { invoicePdfService, PdfResult } from './pdf/invoicePdfService';
import logger from '../utils/logger';
import AppError from '../utils/AppError';

// Define the interface locally since it's not exported from Invoice model
interface IInvoiceDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  invoiceNumber: string;
  vendor: mongoose.Types.ObjectId;
  period: {
    month: number;
    year: number;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    type: 'mietfach' | 'zusatzleistung' | 'sonstiges' | 'provision';
    referenceId?: mongoose.Types.ObjectId;
    period?: {
      from?: Date;
      to?: Date;
    };
  }>;
  subtotal: number;
  tax: number;
  totalAmount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate: Date;
  paidDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  markAsPaid(): Promise<IInvoiceDocument>;
  isOverdue(): boolean;
}

interface InvoiceGenerationData {
  vendorId: mongoose.Types.ObjectId;
  period: {
    month: number;
    year: number;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    type: 'mietfach' | 'zusatzleistung' | 'sonstiges' | 'provision';
    referenceId?: mongoose.Types.ObjectId;
    period?: {
      from?: Date;
      to?: Date;
    };
  }>;
}

// ================================
// BATCH PROCESSING INTERFACES
// ================================

interface BatchProgress {
  current: number;
  total: number;
  vendorId: string;
  status: 'processing' | 'completed' | 'failed' | 'skipped';
  invoiceNumber?: string;
  error?: string;
}

interface BatchSuccess {
  vendorId: string;
  invoiceId: mongoose.Types.ObjectId;
  invoiceNumber: string;
  totalAmount: number;
}

interface BatchFailure {
  vendorId: string;
  error: string;
  timestamp: Date;
}

interface BatchSkipped {
  vendorId: string;
  reason: string;
  existingInvoice?: mongoose.Types.ObjectId;
}

interface BatchProcessingResult {
  totalVendors: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  successes: BatchSuccess[];
  failures: BatchFailure[];
  skipped: BatchSkipped[];
  processingTime: number;
  memoryUsage: {
    start: NodeJS.MemoryUsage;
    end: NodeJS.MemoryUsage;
  };
}

interface ChunkProgress {
  chunkIndex: number;
  totalChunks: number;
  chunkSize: number;
  chunkStartIndex: number;
  chunkEndIndex: number;
  status: 'starting' | 'completed' | 'failed';
  processingTime?: number;
  result?: BatchProcessingResult;
  error?: string;
}

interface OverallProgress {
  current: number;
  total: number;
  currentChunk: number;
  totalChunks: number;
  chunkProgress?: BatchProgress;
  status: 'processing' | 'completed';
}

interface ChunkResult extends BatchProcessingResult {
  chunkIndex: number;
  chunkSize: number;
  error?: string;
}

interface ChunkedProcessingResult {
  totalVendors: number;
  totalChunks: number;
  processedChunks: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  chunkResults: ChunkResult[];
  overallProcessingTime: number;
  averageChunkTime: number;
  memoryUsage: {
    start: NodeJS.MemoryUsage;
    peak: NodeJS.MemoryUsage;
    end: NodeJS.MemoryUsage;
  };
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  failureRate: number; // 0-1
  resetTimeout: number; // milliseconds
  monitoringWindow: number; // milliseconds
}

interface RetryableError extends BatchFailure {
  errorType: string;
  retryCount: number;
  nextRetryAt: Date;
}

interface PermanentError extends BatchFailure {
  errorType: string;
  requiresManualIntervention: boolean;
}

interface ErrorRecommendation {
  type: 'configuration' | 'infrastructure' | 'resource' | 'data' | 'business_logic' | 'investigation' | 'circuit_breaker';
  message: string;
  action: string;
}

interface BatchErrorHandlingResult {
  circuitBreakerTriggered: boolean;
  retryableErrors: RetryableError[];
  permanentErrors: PermanentError[];
  recommendations: ErrorRecommendation[];
  circuitBreakerStatus: 'open' | 'closed' | 'half-open';
}

interface InvoiceCounter {
  _id: string;
  year: number;
  month: number;
  sequence: number;
}

const InvoiceCounterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Format: "YYYY-MM"
  year: { type: Number, required: true },
  month: { type: Number, required: true },
  sequence: { type: Number, required: true, default: 0 }
});

const InvoiceCounterModel = mongoose.model<InvoiceCounter>('InvoiceCounter', InvoiceCounterSchema);

class InvoiceGenerationService {
  /**
   * Generate a complete invoice for a vendor
   * @param vendorId - Vendor ObjectId
   * @param period - Invoice period {month, year}
   * @param items - Invoice line items
   * @returns Promise<IInvoiceDocument>
   */
  async generateInvoice(
    vendorId: mongoose.Types.ObjectId,
    period: { month: number; year: number },
    items: InvoiceGenerationData['items']
  ): Promise<IInvoiceDocument> {
    // Validate input data
    this.validateInvoiceData({ vendorId, period, items });

    // Calculate totals using existing calculation service
    const calculatedItems = items.map(item => ({
      ...item,
      totalPrice: item.quantity * item.unitPrice
    }));

    const subtotal = calculatedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    // tax ist der absolute USt-Betrag (BUG-INV-TAX-Semantik), nicht der Satz
    const tax = Math.round(subtotal * 0.19 * 100) / 100;
    const totalAmount = Math.round((subtotal + tax) * 100) / 100;

    // Generate unique invoice number
    const invoiceNumber = await this.getNextInvoiceNumber(period.year, period.month);

    // Create invoice document
    const invoiceData = {
      invoiceNumber,
      vendor: vendorId,
      period,
      items: calculatedItems,
      subtotal,
      tax,
      totalAmount,
      status: 'draft' as const,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    };

    return await this.createInvoiceDocument(invoiceData);
  }

  /**
   * Get next sequential invoice number for given year/month
   * Uses atomic operation to prevent race conditions
   * @param year - Invoice year
   * @param month - Invoice month (1-12)
   * @returns Promise<string> - Format: RE-YYYY-MM-00001
   */
  async getNextInvoiceNumber(year: number, month: number): Promise<string> {
    const counterId = `${year}-${String(month).padStart(2, '0')}`;
    
    // Retry logic for handling concurrent requests
    let retries = 3;
    while (retries > 0) {
      try {
        const counter = await InvoiceCounterModel.findOneAndUpdate(
          { _id: counterId },
          { 
            $inc: { sequence: 1 },
            $setOnInsert: { year, month }
          },
          { 
            upsert: true, 
            new: true,
            setDefaultsOnInsert: true
          }
        );

        if (!counter) {
          throw new Error('Failed to generate invoice counter');
        }

        const sequenceStr = String(counter.sequence).padStart(5, '0');
        return `RE-${year}-${String(month).padStart(2, '0')}-${sequenceStr}`;
        
      } catch (error) {
        retries--;
        if (retries === 0) {
          throw new Error(`Failed to generate invoice number after retries: ${error}`);
        }
        // Wait a short time before retrying
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    throw new Error('Failed to generate invoice number');
  }

  /**
   * Create and persist invoice document
   * @param invoiceData - Complete invoice data
   * @returns Promise<IInvoiceDocument>
   */
  async createInvoiceDocument(invoiceData: any): Promise<IInvoiceDocument> {
    // Check if we're in a replica set environment (production)
    const isReplicaSet = mongoose.connection.db && await mongoose.connection.db.admin().replSetGetStatus().catch(() => false);
    
    if (isReplicaSet) {
      // Use transactions in production (replica set)
      const session = await mongoose.startSession();
      
      try {
        session.startTransaction();
        
        const invoice = new Invoice(invoiceData);
        const savedInvoice = await invoice.save({ session });
        
        await session.commitTransaction();
        return savedInvoice as IInvoiceDocument;
        
      } catch (error) {
        await session.abortTransaction();
        throw new Error(`Failed to create invoice document: ${error}`);
      } finally {
        session.endSession();
      }
    } else {
      // Direct save for single-node MongoDB (development/testing)
      try {
        const invoice = new Invoice(invoiceData);
        return await invoice.save() as IInvoiceDocument;
      } catch (error) {
        throw new Error(`Failed to create invoice document: ${error}`);
      }
    }
  }

  /**
   * Validate invoice generation data
   * @param data - Invoice generation data to validate
   * @throws Error if validation fails
   */
  validateInvoiceData(data: InvoiceGenerationData): void {
    const { vendorId, period, items } = data;

    if (!vendorId || !mongoose.Types.ObjectId.isValid(vendorId)) {
      throw new Error('Valid vendorId is required');
    }

    if (!period || !period.year || !period.month) {
      throw new Error('Valid period with year and month is required');
    }

    if (period.year < 2000 || period.year > 2100) {
      throw new Error('Year must be between 2000 and 2100');
    }

    if (period.month < 1 || period.month > 12) {
      throw new Error('Month must be between 1 and 12');
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('At least one invoice item is required');
    }

    items.forEach((item, index) => {
      if (!item.description || item.description.trim().length === 0) {
        throw new Error(`Item ${index + 1}: Description is required`);
      }

      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        throw new Error(`Item ${index + 1}: Quantity must be a positive number`);
      }

      if (typeof item.unitPrice !== 'number' || item.unitPrice < 0) {
        throw new Error(`Item ${index + 1}: Unit price must be a non-negative number`);
      }

      const validTypes = ['mietfach', 'zusatzleistung', 'sonstiges', 'provision'];
      if (!validTypes.includes(item.type)) {
        throw new Error(`Item ${index + 1}: Type must be one of ${validTypes.join(', ')}`);
      }

      if (item.referenceId && !mongoose.Types.ObjectId.isValid(item.referenceId)) {
        throw new Error(`Item ${index + 1}: Invalid referenceId format`);
      }
    });
  }

  /**
   * Get current sequence number for a given period (for testing/monitoring)
   * @param year - Year
   * @param month - Month
   * @returns Promise<number> - Current sequence number
   */
  async getCurrentSequence(year: number, month: number): Promise<number> {
    const counterId = `${year}-${String(month).padStart(2, '0')}`;
    const counter = await InvoiceCounterModel.findById(counterId);
    return counter?.sequence || 0;
  }

  /**
   * Reset sequence for testing purposes (USE WITH CAUTION)
   * @param year - Year
   * @param month - Month
   * @returns Promise<void>
   */
  async resetSequence(year: number, month: number): Promise<void> {
    const counterId = `${year}-${String(month).padStart(2, '0')}`;
    await InvoiceCounterModel.findByIdAndUpdate(
      counterId,
      { sequence: 0 },
      { upsert: true }
    );
  }

  /**
   * Generate invoice with PDF
   * @param vendorId - Vendor ObjectId
   * @param period - Invoice period {month, year}
   * @param items - Invoice line items
   * @param generatePdf - Whether to generate PDF automatically
   * @returns Promise<{ invoice: IInvoiceDocument; pdf?: PdfResult }>
   */
  async generateInvoiceWithPdf(
    vendorId: mongoose.Types.ObjectId,
    period: { month: number; year: number },
    items: InvoiceGenerationData['items'],
    generatePdf: boolean = true
  ): Promise<{ invoice: IInvoiceDocument; pdf?: PdfResult }> {
    // Generate the invoice first
    const invoice = await this.generateInvoice(vendorId, period, items);
    
    let pdf: PdfResult | undefined;
    
    if (generatePdf) {
      try {
        pdf = await invoicePdfService.generateInvoicePdf(invoice._id);
      } catch (error) {
        logger.error('Failed to generate PDF for invoice', { invoiceNumber: invoice.invoiceNumber, error });
        // PDF generation failure should not fail invoice creation
      }
    }
    
    return { invoice, pdf };
  }

  /**
   * Generate PDF for existing invoice
   * @param invoiceId - Invoice ID
   * @returns Promise<PdfResult>
   */
  async generatePdfForInvoice(invoiceId: string | mongoose.Types.ObjectId): Promise<PdfResult> {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice not found: ${invoiceId}`);
    }
    
    return await invoicePdfService.generateInvoicePdf(invoiceId);
  }

  /**
   * Generate PDF buffer for existing invoice
   * @param invoiceId - Invoice ID
   * @returns Promise<Buffer>
   */
  async generatePdfBufferForInvoice(invoiceId: string | mongoose.Types.ObjectId): Promise<Buffer> {
    return await invoicePdfService.generatePdfBuffer(invoiceId);
  }

  /**
   * Generate PDF as base64 for existing invoice
   * @param invoiceId - Invoice ID
   * @returns Promise<string>
   */
  async generatePdfBase64ForInvoice(invoiceId: string | mongoose.Types.ObjectId): Promise<string> {
    return await invoicePdfService.generatePdfBase64(invoiceId);
  }

  /**
   * Clean up PDF service resources
   * @returns Promise<void>
   */
  async cleanup(): Promise<void> {
    await invoicePdfService.cleanup();
  }

  /**
   * Find existing invoice for a specific vendor and period
   */
  async findExistingInvoice(vendorId: string, year: number, month: number): Promise<any> {
    try {
      const Invoice = (await import('../models/Invoice')).default;
      
      const existingInvoice = await Invoice.findOne({
        vendor: vendorId,
        'period.year': year,
        'period.month': month
      });
      
      return existingInvoice;
    } catch (error) {
      logger.error('Error finding existing invoice', { error });
      throw error;
    }
  }

  /**
   * Generate monthly invoice for a specific vendor
   */
  async generateMonthlyInvoice(vendorId: string, year: number, month: number): Promise<any> {
    try {
      const [Invoice, User, { invoiceCalculationService }] = await Promise.all([
        import('../models/Invoice').then(m => m.default),
        import('../models/User').then(m => m.default),
        import('./invoiceCalculationService')
      ]);
      
      // Get vendor details
      const vendor = await User.findById(vendorId);
      if (!vendor) {
        throw new Error(`Vendor not found: ${vendorId}`);
      }

      // Check if invoice already exists (Vorab-Check für die schöne Meldung;
      // atomar abgesichert durch den Unique-Index vendor+period, s. u.)
      const existingInvoice = await this.findExistingInvoice(vendorId, year, month);
      if (existingInvoice) {
        throw new AppError(`Invoice already exists for vendor ${vendor.kontakt?.name} for ${month}/${year}`, 400);
      }

      // Calculate invoice data for the period
      const invoiceData = await invoiceCalculationService.calculateInvoiceForPeriod(
        vendorId,
        year,
        month
      );

      // Validate that there's something to invoice. Empty = Probemonat oder kein
      // aktiver Vertrag → keine Rechnung UND keine Provision (Trial ist ganz frei).
      if (!invoiceData.items || invoiceData.items.length === 0) {
        logger.info('No billable items found for vendor', { vendorName: vendor.kontakt?.name, month, year });
        return null;
      }

      const mongoose = await import('mongoose');
      const { ProvisionService } = await import('./provisionService');

      // Rechnungs-_id vorab allozieren → dient als eindeutiger Provisions-Claim-Marker.
      const invoiceId = new mongoose.Types.ObjectId();
      const period = `${year}-${String(month).padStart(2, '0')}`;
      const provisionssatz = (vendor as any).vendorProfile?.provisionssatz
        ?? (vendor as any).provisionssatz ?? 4;

      // F2c: offene Verkäufe des Vendors für diese Rechnung reservieren (claim-first).
      const { base: provisionBase } = await ProvisionService.claimForInvoice(vendorId, invoiceId, period);

      try {
        // Provisionsposition (Netto-Umsatz × Satz) ergänzen. tax ist ein absoluter
        // USt-Betrag (19 % auf die neue Zwischensumme, housnkuh-Umsatz).
        if (provisionBase > 0) {
          const provisionAmount = Math.round(provisionBase * provisionssatz) / 100;
          invoiceData.items.push({
            description: `Provision ${provisionssatz}% auf Netto-Umsatz (${provisionBase.toFixed(2)} €)`,
            quantity: 1,
            unitPrice: provisionAmount,
            totalPrice: provisionAmount,
            type: 'provision'
          } as any);
          invoiceData.subtotal = Math.round((invoiceData.subtotal + provisionAmount) * 100) / 100;
          invoiceData.tax = Math.round(invoiceData.subtotal * 0.19 * 100) / 100;
          invoiceData.totalAmount = Math.round((invoiceData.subtotal + invoiceData.tax) * 100) / 100;
        }

        // Generate invoice number
        const invoiceNumber = await this.getNextInvoiceNumber(year, month);

        const validationData = {
          vendorId: new mongoose.Types.ObjectId(vendorId),
          period: { month, year },
          items: invoiceData.items,
          subtotal: invoiceData.subtotal,
          tax: invoiceData.tax,
          totalAmount: invoiceData.totalAmount
        };
        this.validateInvoiceData(validationData);

        const invoiceDoc = {
          _id: invoiceId,
          invoiceNumber,
          vendor: vendorId,
          period: { month, year },
          items: invoiceData.items,
          subtotal: invoiceData.subtotal,
          tax: invoiceData.tax,
          totalAmount: invoiceData.totalAmount,
          status: 'draft' as const,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        };

        const invoice = new Invoice(invoiceDoc);
        await invoice.save();

        logger.info('Invoice created successfully', {
          invoiceNumber, vendorName: vendor.kontakt?.name,
          provisionBase, provisionCharged: provisionBase > 0
        });

        return invoice;
      } catch (innerError) {
        // Rollback: Provisions-Reservierung lösen, damit die Verkäufe im nächsten
        // Lauf erneut drankommen.
        await ProvisionService.releaseClaim(invoiceId);
        // Race verloren (paralleler Lauf hat zuerst gespeichert): Unique-Index
        // vendor+period schlägt mit E11000 zu → gleiche Fach-Meldung wie der Vorab-Check
        if ((innerError as any)?.code === 11000) {
          throw new AppError(`Invoice already exists for vendor ${vendor.kontakt?.name} for ${month}/${year}`, 400);
        }
        throw innerError;
      }
    } catch (error) {
      logger.error('Error generating monthly invoice for vendor', { vendorId, error });
      throw error;
    }
  }

  // ================================
  // BATCH PROCESSING METHODS
  // ================================

  /**
   * Process a batch of vendors for invoice generation
   * @param vendorIds - Array of vendor ObjectIds
   * @param period - Invoice period {month, year}
   * @param onProgress - Progress callback function
   * @returns Promise<BatchProcessingResult>
   */
  async processVendorBatch(
    vendorIds: string[],
    period: { month: number; year: number },
    onProgress?: (progress: BatchProgress) => void
  ): Promise<BatchProcessingResult> {
    const startTime = Date.now();
    const results: BatchProcessingResult = {
      totalVendors: vendorIds.length,
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
      successes: [],
      failures: [],
      skipped: [],
      processingTime: 0,
      memoryUsage: {
        start: process.memoryUsage(),
        end: process.memoryUsage()
      }
    };

    // Process vendors in parallel with error isolation
    const promises = vendorIds.map(async (vendorId, index) => {
      try {
        // Report progress
        if (onProgress) {
          onProgress({
            current: index + 1,
            total: vendorIds.length,
            vendorId,
            status: 'processing'
          });
        }

        // Check if invoice already exists
        const existingInvoice = await this.findExistingInvoice(vendorId, period.year, period.month);
        if (existingInvoice) {
          results.skippedCount++;
          results.skipped.push({
            vendorId,
            reason: 'Invoice already exists',
            existingInvoice: existingInvoice._id
          });

          if (onProgress) {
            onProgress({
              current: index + 1,
              total: vendorIds.length,
              vendorId,
              status: 'skipped'
            });
          }
          return { status: 'skipped', vendorId };
        }

        // Generate invoice
        const invoice = await this.generateMonthlyInvoice(vendorId, period.year, period.month);
        
        if (invoice) {
          results.successCount++;
          results.successes.push({
            vendorId,
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            totalAmount: invoice.totalAmount
          });

          if (onProgress) {
            onProgress({
              current: index + 1,
              total: vendorIds.length,
              vendorId,
              status: 'completed',
              invoiceNumber: invoice.invoiceNumber
            });
          }
          return { status: 'success', vendorId, invoice };
        } else {
          results.skippedCount++;
          results.skipped.push({
            vendorId,
            reason: 'No billable items found'
          });

          if (onProgress) {
            onProgress({
              current: index + 1,
              total: vendorIds.length,
              vendorId,
              status: 'skipped'
            });
          }
          return { status: 'skipped', vendorId };
        }

      } catch (error) {
        results.failureCount++;
        results.failures.push({
          vendorId,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date()
        });

        if (onProgress) {
          onProgress({
            current: index + 1,
            total: vendorIds.length,
            vendorId,
            status: 'failed',
            error: error instanceof Error ? error.message : String(error)
          });
        }
        return { status: 'failed', vendorId, error };
      }
    });

    // Wait for all promises to settle (error isolation)
    await Promise.allSettled(promises);

    results.processingTime = Date.now() - startTime;
    results.memoryUsage.end = process.memoryUsage();

    return results;
  }

  /**
   * Process all vendors in memory-efficient chunks
   * @param allVendorIds - Array of all vendor IDs to process
   * @param period - Invoice period {month, year}
   * @param chunkSize - Number of vendors per chunk (default: 10)
   * @param onChunkProgress - Progress callback for chunk processing
   * @param onOverallProgress - Progress callback for overall processing
   * @returns Promise<ChunkedProcessingResult>
   */
  async chunkedProcessing(
    allVendorIds: string[],
    period: { month: number; year: number },
    chunkSize: number = 10,
    onChunkProgress?: (chunkProgress: ChunkProgress) => void,
    onOverallProgress?: (overallProgress: OverallProgress) => void
  ): Promise<ChunkedProcessingResult> {
    const startTime = Date.now();
    const totalVendors = allVendorIds.length;
    const totalChunks = Math.ceil(totalVendors / chunkSize);
    
    const overallResult: ChunkedProcessingResult = {
      totalVendors,
      totalChunks,
      processedChunks: 0,
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
      chunkResults: [],
      overallProcessingTime: 0,
      averageChunkTime: 0,
      memoryUsage: {
        start: process.memoryUsage(),
        peak: process.memoryUsage(),
        end: process.memoryUsage()
      }
    };

    // Process chunks sequentially to manage memory usage
    for (let i = 0; i < totalChunks; i++) {
      const chunkStartIndex = i * chunkSize;
      const chunkEndIndex = Math.min(chunkStartIndex + chunkSize, totalVendors);
      const chunk = allVendorIds.slice(chunkStartIndex, chunkEndIndex);
      
      const chunkStartTime = Date.now();
      
      if (onChunkProgress) {
        onChunkProgress({
          chunkIndex: i,
          totalChunks,
          chunkSize: chunk.length,
          chunkStartIndex,
          chunkEndIndex,
          status: 'starting'
        });
      }

      try {
        // Process chunk with error isolation
        const chunkResult = await this.processVendorBatch(
          chunk,
          period,
          (progress) => {
            if (onOverallProgress) {
              const overallCurrent = chunkStartIndex + progress.current;
              onOverallProgress({
                current: overallCurrent,
                total: totalVendors,
                currentChunk: i + 1,
                totalChunks,
                chunkProgress: progress,
                status: 'processing'
              });
            }
          }
        );

        // Aggregate results
        overallResult.successCount += chunkResult.successCount;
        overallResult.failureCount += chunkResult.failureCount;
        overallResult.skippedCount += chunkResult.skippedCount;
        overallResult.processedChunks++;
        
        const chunkTime = Date.now() - chunkStartTime;
        overallResult.chunkResults.push({
          ...chunkResult,
          chunkIndex: i,
          chunkSize: chunk.length,
          processingTime: chunkTime
        });

        // Update peak memory usage
        const currentMemory = process.memoryUsage();
        if (currentMemory.heapUsed > overallResult.memoryUsage.peak.heapUsed) {
          overallResult.memoryUsage.peak = currentMemory;
        }

        if (onChunkProgress) {
          onChunkProgress({
            chunkIndex: i,
            totalChunks,
            chunkSize: chunk.length,
            chunkStartIndex,
            chunkEndIndex,
            status: 'completed',
            processingTime: chunkTime,
            result: chunkResult
          });
        }

        // Force garbage collection between chunks if available
        if (global.gc) {
          global.gc();
        }

        // Small delay between chunks to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        const chunkError = error instanceof Error ? error.message : String(error);
        
        overallResult.chunkResults.push({
          chunkIndex: i,
          chunkSize: chunk.length,
          processingTime: Date.now() - chunkStartTime,
          error: chunkError,
          totalVendors: chunk.length,
          successCount: 0,
          failureCount: chunk.length,
          skippedCount: 0,
          successes: [],
          failures: chunk.map(vendorId => ({
            vendorId,
            error: chunkError,
            timestamp: new Date()
          })),
          skipped: [],
          memoryUsage: {
            start: process.memoryUsage(),
            end: process.memoryUsage()
          }
        });

        overallResult.failureCount += chunk.length;

        if (onChunkProgress) {
          onChunkProgress({
            chunkIndex: i,
            totalChunks,
            chunkSize: chunk.length,
            chunkStartIndex,
            chunkEndIndex,
            status: 'failed',
            error: chunkError
          });
        }
      }
    }

    overallResult.overallProcessingTime = Date.now() - startTime;
    overallResult.averageChunkTime = overallResult.overallProcessingTime / totalChunks;
    overallResult.memoryUsage.end = process.memoryUsage();

    if (onOverallProgress) {
      onOverallProgress({
        current: totalVendors,
        total: totalVendors,
        currentChunk: totalChunks,
        totalChunks,
        status: 'completed'
      });
    }

    return overallResult;
  }

  /**
   * Handle batch processing errors with circuit breaker logic
   * @param errors - Array of processing errors
   * @param batch - Current batch information
   * @param circuitBreakerConfig - Circuit breaker configuration
   * @returns Promise<BatchErrorHandlingResult>
   */
  async handleBatchErrors(
    errors: BatchFailure[],
    batch: { vendorIds: string[], period: { month: number; year: number } },
    circuitBreakerConfig?: CircuitBreakerConfig
  ): Promise<BatchErrorHandlingResult> {
    const config: CircuitBreakerConfig = {
      failureThreshold: 5,
      failureRate: 0.5, // 50%
      resetTimeout: 60000, // 1 minute
      monitoringWindow: 300000, // 5 minutes
      ...circuitBreakerConfig
    };

    const result: BatchErrorHandlingResult = {
      circuitBreakerTriggered: false,
      retryableErrors: [],
      permanentErrors: [],
      recommendations: [],
      circuitBreakerStatus: 'closed'
    };

    // Analyze error patterns
    const errorsByType = new Map<string, BatchFailure[]>();
    errors.forEach(error => {
      const errorType = this.categorizeError(error.error);
      if (!errorsByType.has(errorType)) {
        errorsByType.set(errorType, []);
      }
      errorsByType.get(errorType)!.push(error);
    });

    // Check circuit breaker conditions
    const totalErrors = errors.length;
    const totalVendors = batch.vendorIds.length;
    const failureRate = totalErrors / totalVendors;

    if (totalErrors >= config.failureThreshold || failureRate >= config.failureRate) {
      result.circuitBreakerTriggered = true;
      result.circuitBreakerStatus = 'open';
      result.recommendations.push({
        type: 'circuit_breaker',
        message: `Circuit breaker triggered: ${totalErrors} failures (${(failureRate * 100).toFixed(1)}% failure rate)`,
        action: `Wait ${config.resetTimeout}ms before retrying`
      });
    }

    // Categorize errors for retry logic
    errors.forEach(error => {
      const errorType = this.categorizeError(error.error);
      
      if (this.isRetryableError(errorType)) {
        result.retryableErrors.push({
          ...error,
          errorType,
          retryCount: 0,
          nextRetryAt: new Date(Date.now() + this.calculateRetryDelay(0))
        });
      } else {
        result.permanentErrors.push({
          ...error,
          errorType,
          requiresManualIntervention: true
        });
      }
    });

    // Generate recommendations
    this.generateErrorRecommendations(errorsByType, result);

    return result;
  }

  /**
   * Categorize error types for better handling
   * @private
   */
  private categorizeError(errorMessage: string): string {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('timeout') || message.includes('etimedout')) {
      return 'timeout';
    }
    if (message.includes('connection') || message.includes('econnrefused')) {
      return 'connection';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation';
    }
    if (message.includes('duplicate') || message.includes('already exists')) {
      return 'duplicate';
    }
    if (message.includes('not found')) {
      return 'not_found';
    }
    if (message.includes('memory') || message.includes('out of memory')) {
      return 'memory';
    }
    
    return 'unknown';
  }

  /**
   * Determine if error type is retryable
   * @private
   */
  private isRetryableError(errorType: string): boolean {
    const retryableTypes = ['timeout', 'connection', 'memory'];
    return retryableTypes.includes(errorType);
  }

  /**
   * Calculate retry delay with exponential backoff
   * @private
   */
  private calculateRetryDelay(retryCount: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return delay + jitter;
  }

  /**
   * Generate actionable recommendations based on error patterns
   * @private
   */
  private generateErrorRecommendations(
    errorsByType: Map<string, BatchFailure[]>,
    result: BatchErrorHandlingResult
  ): void {
    errorsByType.forEach((errors, errorType) => {
      const count = errors.length;
      
      switch (errorType) {
        case 'timeout':
          result.recommendations.push({
            type: 'configuration',
            message: `${count} timeout errors detected`,
            action: 'Consider increasing timeout values or reducing chunk size'
          });
          break;
          
        case 'connection':
          result.recommendations.push({
            type: 'infrastructure',
            message: `${count} connection errors detected`,
            action: 'Check database connectivity and connection pool settings'
          });
          break;
          
        case 'memory':
          result.recommendations.push({
            type: 'resource',
            message: `${count} memory errors detected`,
            action: 'Reduce chunk size or increase available memory'
          });
          break;
          
        case 'validation':
          result.recommendations.push({
            type: 'data',
            message: `${count} validation errors detected`,
            action: 'Review vendor data quality and validation rules'
          });
          break;
          
        case 'duplicate':
          result.recommendations.push({
            type: 'business_logic',
            message: `${count} duplicate invoice errors detected`,
            action: 'Implement better duplicate detection before processing'
          });
          break;
          
        default:
          if (count > 3) {
            result.recommendations.push({
              type: 'investigation',
              message: `${count} unknown errors detected`,
              action: 'Manual investigation required to identify root cause'
            });
          }
      }
    });
  }

  /**
   * Get all active vendor IDs for batch processing
   * @returns Promise<string[]>
   */
  async getAllActiveVendorIds(): Promise<string[]> {
    try {
      const User = (await import('../models/User')).default;
      
      // Query for active verified vendors using correct schema fields
      const activeVendors = await User.find({
        isVendor: true,
        registrationStatus: { $in: ['active', 'trial_active'] }, // Active or in trial
        'vendorProfile.verifyStatus': 'verified' // Use verifyStatus instead of approved
      }).select('_id').lean();

      return activeVendors.map(vendor => (vendor._id as any).toString());
    } catch (error) {
      logger.error('Error fetching active vendor IDs', { error });
      throw new Error(`Failed to fetch active vendor IDs: ${error}`);
    }
  }

  /**
   * Generate invoices for all active vendors with batch processing
   * @param period - Invoice period {month, year}
   * @param options - Processing options
   * @returns Promise<ChunkedProcessingResult>
   */
  async generateInvoicesForAllVendors(
    period: { month: number; year: number },
    options?: {
      chunkSize?: number;
      onProgress?: (progress: OverallProgress) => void;
      onChunkProgress?: (chunkProgress: ChunkProgress) => void;
    }
  ): Promise<ChunkedProcessingResult> {
    const { chunkSize = 10, onProgress, onChunkProgress } = options || {};
    
    try {
      logger.info('Starting batch invoice generation', { month: period.month, year: period.year });
      
      // Get all active vendor IDs
      const vendorIds = await this.getAllActiveVendorIds();
      logger.info('Found active vendors to process', { count: vendorIds.length });
      
      if (vendorIds.length === 0) {
        return {
          totalVendors: 0,
          totalChunks: 0,
          processedChunks: 0,
          successCount: 0,
          failureCount: 0,
          skippedCount: 0,
          chunkResults: [],
          overallProcessingTime: 0,
          averageChunkTime: 0,
          memoryUsage: {
            start: process.memoryUsage(),
            peak: process.memoryUsage(),
            end: process.memoryUsage()
          }
        };
      }
      
      // Process in chunks
      const result = await this.chunkedProcessing(
        vendorIds,
        period,
        chunkSize,
        onChunkProgress,
        onProgress
      );
      
      logger.info('Batch processing completed', {
        totalVendors: result.totalVendors,
        successes: result.successCount,
        failures: result.failureCount,
        skipped: result.skippedCount,
        processingTime: `${(result.overallProcessingTime / 1000).toFixed(2)}s`
      });
      
      return result;
      
    } catch (error) {
      logger.error('Error in batch invoice generation', { error });
      throw error;
    }
  }

// Removed generateInvoicesForVendors export function - implemented inline in adminController
}

export const invoiceGenerationService = new InvoiceGenerationService();
export default invoiceGenerationService;