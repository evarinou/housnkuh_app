/**
 * @file invoiceController.ts
 * @purpose Invoice management REST API endpoints with authentication and authorization
 * @created 2025-09-05
 * @modified 2025-09-05
 */

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import Invoice from '../models/Invoice';
import { AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';
import { invoiceGenerationService } from '../services/invoiceGenerationService';
import { invoicePdfService } from '../services/pdf/invoicePdfService';
import path from 'path';
import fs from 'fs';

/**
 * GET /api/invoices
 * List all invoices with pagination and filtering
 * Admin: sees all invoices
 * Vendor: sees only their own invoices
 */
export const getInvoices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, status, vendor, month, year } = req.query;
    const userId = req.userId;
    const isAdmin = req.user?.isAdmin;
    const isVendor = req.user?.isVendor;

    // Build query based on user role
    let query: any = {};
    
    // Vendors can only see their own invoices
    if (isVendor && !isAdmin) {
      query.vendor = userId;
    }
    
    // Admin can filter by vendor
    if (isAdmin && vendor) {
      query.vendor = vendor;
    }
    
    // Filter by status
    if (status && typeof status === 'string') {
      query.status = status;
    }
    
    // Filter by period
    if (month && year) {
      query['period.month'] = parseInt(month as string);
      query['period.year'] = parseInt(year as string);
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Execute query with population
    const invoices = await Invoice.find(query)
      .populate('vendor', 'kontakt.name kontakt.email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Invoice.countDocuments(query);

    res.json({
      success: true,
      data: {
        invoices,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (err) {
    logger.error('Error fetching invoices:', err);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Abrufen der Rechnungen'
    });
  }
};

/**
 * GET /api/invoices/:id
 * Get single invoice by ID
 * Authorization: Admin can see all, vendors only their own
 */
export const getInvoiceById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.user?.isAdmin;
    const isVendor = req.user?.isVendor;

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Ungültige Rechnungs-ID'
      });
      return;
    }

    const invoice = await Invoice.findById(id)
      .populate('vendor', 'kontakt.name kontakt.email kontakt.telefon adressen');

    if (!invoice) {
      res.status(404).json({
        success: false,
        message: 'Rechnung nicht gefunden'
      });
      return;
    }

    // Authorization check: vendors can only access their own invoices
    if (isVendor && !isAdmin && invoice.vendor._id.toString() !== userId) {
      res.status(403).json({
        success: false,
        message: 'Zugriff verweigert'
      });
      return;
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (err) {
    logger.error('Error fetching invoice:', err);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Abrufen der Rechnung'
    });
  }
};

/**
 * PUT /api/invoices/:id/status
 * Update invoice status
 * Admin: can update all invoices
 * Vendor: can mark their own invoices as paid
 */
export const updateInvoiceStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.userId;
    const isAdmin = req.user?.isAdmin;
    const isVendor = req.user?.isVendor;

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Ungültige Rechnungs-ID'
      });
      return;
    }

    // Validate status
    const validStatuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: 'Ungültiger Status. Erlaubte Werte: ' + validStatuses.join(', ')
      });
      return;
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      res.status(404).json({
        success: false,
        message: 'Rechnung nicht gefunden'
      });
      return;
    }

    // Authorization check
    if (isVendor && !isAdmin) {
      // Vendors can only access their own invoices
      if (invoice.vendor.toString() !== userId) {
        res.status(403).json({
          success: false,
          message: 'Zugriff verweigert'
        });
        return;
      }
      // Vendors can only mark invoices as paid
      if (status !== 'paid') {
        res.status(403).json({
          success: false,
          message: 'Vendors können nur Rechnungen als bezahlt markieren'
        });
        return;
      }
    }

    // Update status using model method for 'paid' status
    if (status === 'paid') {
      await invoice.markAsPaid();
    } else {
      invoice.status = status;
      await invoice.save();
    }

    res.json({
      success: true,
      data: invoice,
      message: `Rechnungsstatus erfolgreich auf "${status}" aktualisiert`
    });
  } catch (err) {
    logger.error('Error updating invoice status:', err);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Aktualisieren des Status'
    });
  }
};

/**
 * GET /api/invoices/:id/pdf
 * Download invoice PDF
 * Authorization: Admin can download all, vendors only their own
 */
export const downloadInvoicePdf = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.user?.isAdmin;
    const isVendor = req.user?.isVendor;

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Ungültige Rechnungs-ID'
      });
      return;
    }

    const invoice = await Invoice.findById(id)
      .populate('vendor', 'kontakt.name kontakt.email');

    if (!invoice) {
      res.status(404).json({
        success: false,
        message: 'Rechnung nicht gefunden'
      });
      return;
    }

    // Authorization check
    if (isVendor && !isAdmin && invoice.vendor._id.toString() !== userId) {
      res.status(403).json({
        success: false,
        message: 'Zugriff verweigert'
      });
      return;
    }

    // Generate PDF file path in storage directory (where PDFs are actually stored)
    const invoiceDate = new Date(invoice.createdAt);
    const year = invoiceDate.getFullYear();
    const month = String(invoiceDate.getMonth() + 1).padStart(2, '0');
    const pdfPath = path.join(process.cwd(), 'storage', 'invoices', year.toString(), month, `${invoice.invoiceNumber}.pdf`);

    // Debug logging
    logger.debug('PDF download request', {
      invoiceId: id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceCreated: invoice.createdAt,
      calculatedYear: year,
      calculatedMonth: month,
      generatedPath: pdfPath,
      pathExists: fs.existsSync(pdfPath)
    });

    // Check if PDF exists
    if (!fs.existsSync(pdfPath)) {
      res.status(404).json({
        success: false,
        message: 'PDF-Datei nicht gefunden'
      });
      return;
    }

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);

    // Stream the file
    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);

  } catch (err) {
    logger.error('Error downloading invoice PDF:', err);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Herunterladen der PDF'
    });
  }
};

/**
 * POST /api/invoices/generate
 * Manually trigger invoice generation
 * Admin only
 */
export const generateInvoices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const isAdmin = req.user?.isAdmin;

    if (!isAdmin) {
      res.status(403).json({
        success: false,
        message: 'Nur Administratoren können Rechnungen manuell generieren'
      });
      return;
    }

    const { vendorId, month, year } = req.body;

    // Validate required fields
    if (!month || !year) {
      res.status(400).json({
        success: false,
        message: 'Monat und Jahr sind erforderlich'
      });
      return;
    }

    // Validate month and year
    if (month < 1 || month > 12 || year < 2020 || year > 2030) {
      res.status(400).json({
        success: false,
        message: 'Ungültiger Monat oder Jahr'
      });
      return;
    }

    // Generate invoices for specific vendor or all vendors
    let result;
    if (vendorId) {
      // Validate vendorId format
      if (!Types.ObjectId.isValid(vendorId)) {
        res.status(400).json({
          success: false,
          message: 'Ungültige Vendor-ID'
        });
        return;
      }
      
      result = await invoiceGenerationService.generateMonthlyInvoice(vendorId, year, month);
    } else {
      result = await invoiceGenerationService.generateInvoicesForAllVendors({ month, year });
    }

    res.json({
      success: true,
      data: result,
      message: 'Rechnungsgenerierung erfolgreich gestartet'
    });
  } catch (err) {
    logger.error('Error generating invoices:', err);
    res.status(500).json({
      success: false,
      message: 'Serverfehler bei der Rechnungsgenerierung'
    });
  }
};

/**
 * GET /api/admin/invoices/stats
 * Get invoice statistics for admin dashboard
 * Admin only
 */
export const getInvoiceStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const isAdmin = req.user?.isAdmin;

    if (!isAdmin) {
      res.status(403).json({
        success: false,
        message: 'Nur Administratoren können Statistiken einsehen'
      });
      return;
    }

    // Get total counts by status
    const statusCounts = await Invoice.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Get monthly statistics for current year
    const currentYear = new Date().getFullYear();
    const monthlyStats = await Invoice.aggregate([
      {
        $match: {
          'period.year': currentYear
        }
      },
      {
        $group: {
          _id: '$period.month',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          avgAmount: { $avg: '$totalAmount' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Get overdue invoices count
    const overdueCount = await Invoice.countDocuments({
      status: { $in: ['sent', 'overdue'] },
      dueDate: { $lt: new Date() }
    });

    // Get recent invoices
    const recentInvoices = await Invoice.find()
      .populate('vendor', 'kontakt.name kontakt.email')
      .sort({ createdAt: -1 })
      .limit(10)
      .select('invoiceNumber vendor status totalAmount createdAt dueDate');

    // Calculate totals
    const totalInvoices = await Invoice.countDocuments();
    const totalRevenue = statusCounts.reduce((sum, item) => sum + item.totalAmount, 0);
    const paidRevenue = statusCounts.find(item => item._id === 'paid')?.totalAmount || 0;
    const pendingRevenue = totalRevenue - paidRevenue;

    res.json({
      success: true,
      data: {
        summary: {
          totalInvoices,
          totalRevenue,
          paidRevenue,
          pendingRevenue,
          overdueCount
        },
        statusBreakdown: statusCounts,
        monthlyStats,
        recentInvoices
      }
    });
  } catch (err) {
    logger.error('Error fetching invoice statistics:', err);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Abrufen der Statistiken'
    });
  }
};

/**
 * POST /api/admin/invoices/bulk-generate
 * Generate invoices for multiple vendors at once
 * Admin only
 */
export const bulkGenerateInvoices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const isAdmin = req.user?.isAdmin;

    if (!isAdmin) {
      res.status(403).json({
        success: false,
        message: 'Nur Administratoren können Bulk-Generierung durchführen'
      });
      return;
    }

    const { vendorIds, month, year } = req.body;

    // Validate required fields
    if (!month || !year) {
      res.status(400).json({
        success: false,
        message: 'Monat und Jahr sind erforderlich'
      });
      return;
    }

    // Validate month and year
    if (month < 1 || month > 12 || year < 2020 || year > 2030) {
      res.status(400).json({
        success: false,
        message: 'Ungültiger Monat oder Jahr'
      });
      return;
    }

    // Validate vendorIds if provided
    if (vendorIds && (!Array.isArray(vendorIds) || vendorIds.length === 0)) {
      res.status(400).json({
        success: false,
        message: 'VendorIds muss ein Array mit mindestens einem Element sein'
      });
      return;
    }

    // Validate all vendorIds format
    if (vendorIds) {
      const invalidIds = vendorIds.filter((id: string) => !Types.ObjectId.isValid(id));
      if (invalidIds.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Ungültige Vendor-IDs: ' + invalidIds.join(', ')
        });
        return;
      }
    }

    let results = [];
    let successCount = 0;
    let errorCount = 0;

    if (vendorIds) {
      // Generate for specific vendors
      for (const vendorId of vendorIds) {
        try {
          const result = await invoiceGenerationService.generateMonthlyInvoice(vendorId, year, month);
          results.push({
            vendorId,
            success: true,
            result
          });
          successCount++;
        } catch (error) {
          logger.error(`Error generating invoice for vendor ${vendorId}:`, error);
          results.push({
            vendorId,
            success: false,
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
          });
          errorCount++;
        }
      }
    } else {
      // Generate for all vendors
      try {
        const result = await invoiceGenerationService.generateInvoicesForAllVendors({ month, year });
        results.push({
          success: true,
          result
        });
        successCount++;
      } catch (error) {
        logger.error('Error generating invoices for all vendors:', error);
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
        errorCount++;
      }
    }

    res.json({
      success: true,
      data: {
        summary: {
          totalProcessed: results.length,
          successCount,
          errorCount
        },
        results
      },
      message: `Bulk-Generierung abgeschlossen: ${successCount} erfolgreich, ${errorCount} Fehler`
    });
  } catch (err) {
    logger.error('Error in bulk invoice generation:', err);
    res.status(500).json({
      success: false,
      message: 'Serverfehler bei der Bulk-Rechnungsgenerierung'
    });
  }
};

/**
 * PUT /api/admin/invoices/:id
 * Edit invoice with restricted fields
 * Admin only - can only edit notes, dueDate, and limited fields
 */
export const editInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const isAdmin = req.user?.isAdmin;

    if (!isAdmin) {
      res.status(403).json({
        success: false,
        message: 'Nur Administratoren können Rechnungen bearbeiten'
      });
      return;
    }

    const { id } = req.params;
    const { notes, dueDate, status } = req.body;

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Ungültige Rechnungs-ID'
      });
      return;
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      res.status(404).json({
        success: false,
        message: 'Rechnung nicht gefunden'
      });
      return;
    }

    // Prevent editing of paid or cancelled invoices
    if (invoice.status === 'paid') {
      res.status(400).json({
        success: false,
        message: 'Bezahlte Rechnungen können nicht bearbeitet werden'
      });
      return;
    }

    if (invoice.status === 'cancelled') {
      res.status(400).json({
        success: false,
        message: 'Stornierte Rechnungen können nicht bearbeitet werden'
      });
      return;
    }

    // Create audit trail entry
    const auditEntry = {
      adminId: req.userId,
      adminEmail: req.user?.email,
      action: 'invoice_edit',
      invoiceId: id,
      invoiceNumber: invoice.invoiceNumber,
      changes: {} as any,
      timestamp: new Date()
    };

    // Track changes and update allowed fields only
    if (notes !== undefined && notes !== invoice.notes) {
      auditEntry.changes.notes = { from: invoice.notes, to: notes };
      invoice.notes = notes;
    }

    if (dueDate !== undefined) {
      const newDueDate = new Date(dueDate);
      if (isNaN(newDueDate.getTime())) {
        res.status(400).json({
          success: false,
          message: 'Ungültiges Fälligkeitsdatum'
        });
        return;
      }
      
      if (newDueDate.getTime() !== invoice.dueDate.getTime()) {
        auditEntry.changes.dueDate = { 
          from: invoice.dueDate.toISOString(), 
          to: newDueDate.toISOString() 
        };
        invoice.dueDate = newDueDate;
      }
    }

    // Allow limited status changes
    if (status !== undefined) {
      const allowedStatusChanges = ['draft', 'sent', 'overdue'];
      if (!allowedStatusChanges.includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Ungültiger Status. Erlaubte Werte für Bearbeitung: ' + allowedStatusChanges.join(', ')
        });
        return;
      }

      if (status !== invoice.status) {
        auditEntry.changes.status = { from: invoice.status, to: status };
        invoice.status = status;
      }
    }

    // Only save if there are actual changes
    if (Object.keys(auditEntry.changes).length === 0) {
      res.json({
        success: true,
        data: invoice,
        message: 'Keine Änderungen vorgenommen'
      });
      return;
    }

    await invoice.save();

    // Log audit trail
    logger.info('Invoice edited by admin:', auditEntry);

    res.json({
      success: true,
      data: invoice,
      message: 'Rechnung erfolgreich bearbeitet',
      auditTrail: auditEntry
    });
  } catch (err) {
    logger.error('Error editing invoice:', err);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Bearbeiten der Rechnung'
    });
  }
};

/**
 * POST /api/admin/invoices/:id/resend
 * Resend invoice email notification
 * Admin only
 */
export const resendInvoiceEmail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const isAdmin = req.user?.isAdmin;

    if (!isAdmin) {
      res.status(403).json({
        success: false,
        message: 'Nur Administratoren können E-Mails erneut versenden'
      });
      return;
    }

    const { id } = req.params;

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Ungültige Rechnungs-ID'
      });
      return;
    }

    const invoice = await Invoice.findById(id)
      .populate('vendor', 'kontakt.name kontakt.email isActive');

    if (!invoice) {
      res.status(404).json({
        success: false,
        message: 'Rechnung nicht gefunden'
      });
      return;
    }

    // Check if invoice can be resent
    if (invoice.status === 'cancelled') {
      res.status(400).json({
        success: false,
        message: 'Stornierte Rechnungen können nicht erneut versendet werden'
      });
      return;
    }

    // Type assertion for populated vendor data
    const vendorData = invoice.vendor as any;
    
    // Check if vendor is still active
    if (!vendorData.isActive) {
      res.status(400).json({
        success: false,
        message: 'Rechnung kann nicht versendet werden - Vendor ist nicht aktiv'
      });
      return;
    }

    // Check rate limiting - prevent spam
    const lastAttempt = invoice.lastEmailAttempt;
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    if (lastAttempt && lastAttempt > oneHourAgo) {
      res.status(429).json({
        success: false,
        message: 'E-Mail kann erst nach einer Stunde erneut versendet werden'
      });
      return;
    }

    try {
      // Import services dynamically to avoid circular dependencies
      const { sendCustomEmail } = await import('../utils/emailService');
      const recipientEmail = vendorData.kontakt?.email;
      
      if (!recipientEmail) {
        throw new Error('Vendor email address not found');
      }
      
      // Simple HTML for invoice resend notification
      const htmlContent = `
        <h2>Rechnung ${invoice.invoiceNumber} - Erneut versendet</h2>
        <p>Hallo ${vendorData.kontakt?.name || 'Lieber Vendor'},</p>
        <p>Ihre Rechnung wurde erneut versendet:</p>
        <ul>
          <li>Rechnungsnummer: ${invoice.invoiceNumber}</li>
          <li>Gesamtbetrag: ${invoice.totalAmount}€</li>
          <li>Fällig am: ${invoice.dueDate.toLocaleDateString('de-DE')}</li>
        </ul>
        <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
        <p>Ihr housnkuh Team</p>
      `;
      
      // Send invoice notification
      await sendCustomEmail({
        to: recipientEmail,
        subject: `📄 Rechnung ${invoice.invoiceNumber} - Erneut versendet`,
        html: htmlContent,
        text: `Rechnung ${invoice.invoiceNumber} erneut versendet. Gesamtbetrag: ${invoice.totalAmount}€, Fällig am: ${invoice.dueDate.toLocaleDateString('de-DE')}`
      });

      // Update email tracking
      invoice.emailStatus = 'sent';
      invoice.emailSentAt = now;
      invoice.emailAttempts = (invoice.emailAttempts || 0) + 1;
      invoice.lastEmailAttempt = now;
      await invoice.save();

      // Create audit trail entry
      const auditEntry = {
        adminId: req.userId,
        adminEmail: req.user?.email,
        action: 'invoice_email_resend',
        invoiceId: id,
        invoiceNumber: invoice.invoiceNumber,
        recipientEmail: recipientEmail,
        attempt: invoice.emailAttempts,
        timestamp: now
      };

      logger.info('Invoice email resent by admin:', auditEntry);

      res.json({
        success: true,
        data: {
          invoiceNumber: invoice.invoiceNumber,
          recipientEmail: recipientEmail,
          sentAt: now,
          attempts: invoice.emailAttempts
        },
        message: 'E-Mail erfolgreich erneut versendet',
        auditTrail: auditEntry
      });

    } catch (emailError) {
      // Update failed email status
      invoice.emailStatus = 'failed';
      invoice.emailAttempts = (invoice.emailAttempts || 0) + 1;
      invoice.lastEmailAttempt = now;
      await invoice.save();

      logger.error('Failed to resend invoice email:', emailError);

      res.status(500).json({
        success: false,
        message: 'E-Mail konnte nicht versendet werden: ' + (emailError instanceof Error ? emailError.message : 'Unbekannter Fehler')
      });
    }

  } catch (err) {
    logger.error('Error resending invoice email:', err);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Erneut-Versenden der E-Mail'
    });
  }
};
/**
 * Export invoices to CSV format
 */
export const exportInvoices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const isAdmin = req.user?.isAdmin;

    if (!isAdmin) {
      res.status(403).json({
        success: false,
        message: 'Nur Administratoren können Rechnungen exportieren'
      });
      return;
    }

    const { status, vendor, month, year, search } = req.query;

    // Build query based on filters
    let query: any = {};
    
    if (status && typeof status === 'string') {
      query.status = status;
    }
    
    if (vendor && typeof vendor === 'string') {
      query.vendor = vendor;
    }
    
    if (month && year) {
      query['period.month'] = parseInt(month as string);
      query['period.year'] = parseInt(year as string);
    }

    // Search in invoice number or vendor name
    if (search && typeof search === 'string') {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // Fetch invoices with vendor details
    const invoices = await Invoice.find(query)
      .populate('vendor', 'kontakt.name kontakt.email kontakt.telefon')
      .sort({ createdAt: -1 });

    // Convert to CSV format
    const csvHeaders = [
      'Rechnungsnummer',
      'Verkäufer Name',
      'Verkäufer E-Mail',
      'Status',
      'Betrag (EUR)',
      'Erstellt am',
      'Fälligkeitsdatum',
      'Zeitraum Monat',
      'Zeitraum Jahr'
    ].join(',');

    const csvRows = invoices.map(invoice => [
      invoice.invoiceNumber,
      (invoice.vendor as any)?.kontakt?.name || 'N/A',
      (invoice.vendor as any)?.kontakt?.email || 'N/A',
      invoice.status,
      invoice.totalAmount.toFixed(2),
      new Date(invoice.createdAt).toLocaleDateString('de-DE'),
      new Date(invoice.dueDate).toLocaleDateString('de-DE'),
      invoice.period?.month || 'N/A',
      invoice.period?.year || 'N/A'
    ].map(field => `"${field}"`).join(','));

    const csvContent = [csvHeaders, ...csvRows].join('\n');

    // Set CSV response headers
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="rechnungen.csv"');
    res.setHeader('Cache-Control', 'no-cache');

    // Add UTF-8 BOM for proper Excel compatibility
    res.write('\ufeff');
    res.write(csvContent);
    res.end();

  } catch (err) {
    logger.error('Error exporting invoices:', err);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Export der Rechnungen'
    });
  }
};

/**
 * DELETE /api/admin/invoices/:id
 * Soft delete (cancel) invoice
 * Admin only
 */
export const cancelInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const isAdmin = req.user?.isAdmin;

    if (!isAdmin) {
      res.status(403).json({
        success: false,
        message: 'Nur Administratoren können Rechnungen stornieren'
      });
      return;
    }

    const { id } = req.params;
    const { reason } = req.body;

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Ungültige Rechnungs-ID'
      });
      return;
    }

    // Require cancellation reason
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Stornierungsgrund ist erforderlich'
      });
      return;
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      res.status(404).json({
        success: false,
        message: 'Rechnung nicht gefunden'
      });
      return;
    }

    // Check if invoice is already cancelled
    if (invoice.status === 'cancelled') {
      res.status(400).json({
        success: false,
        message: 'Rechnung ist bereits storniert'
      });
      return;
    }

    // Prevent cancelling paid invoices
    if (invoice.status === 'paid') {
      res.status(400).json({
        success: false,
        message: 'Bezahlte Rechnungen können nicht storniert werden. Bitte verwenden Sie eine Gutschrift.'
      });
      return;
    }

    // Store original status for audit trail
    const originalStatus = invoice.status;

    // Perform soft delete (cancel)
    invoice.status = 'cancelled';
    invoice.cancelledAt = new Date();
    invoice.cancellationReason = reason.trim();
    
    await invoice.save();

    // Create audit trail entry
    const auditEntry = {
      adminId: req.userId,
      adminEmail: req.user?.email,
      action: 'invoice_cancel',
      invoiceId: id,
      invoiceNumber: invoice.invoiceNumber,
      originalStatus,
      cancellationReason: reason.trim(),
      cancelledAt: invoice.cancelledAt,
      timestamp: new Date()
    };

    logger.info('Invoice cancelled by admin:', auditEntry);

    res.json({
      success: true,
      data: {
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        cancelledAt: invoice.cancelledAt,
        cancellationReason: invoice.cancellationReason,
        originalStatus
      },
      message: 'Rechnung erfolgreich storniert',
      auditTrail: auditEntry
    });

  } catch (err) {
    logger.error('Error cancelling invoice:', err);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Stornieren der Rechnung'
    });
  }
};