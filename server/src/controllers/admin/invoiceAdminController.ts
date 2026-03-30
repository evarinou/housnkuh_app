/**
 * @file invoiceAdminController.ts
 * @purpose Admin invoice management — stats, bulk generation, editing, resending, cancellation
 * @created 2026-03-29
 */

import { Request, Response } from 'express';
import logger from '../../utils/logger';

/**
 * Get comprehensive invoice statistics for admin dashboard
 */
export const getInvoiceStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const Invoice = (await import('../../models/Invoice')).default;

    // Basic statistics
    const totalInvoices = await Invoice.countDocuments();
    const paidInvoices = await Invoice.countDocuments({ status: 'paid' });
    const overdueInvoices = await Invoice.countDocuments({ status: 'overdue' });
    const cancelledInvoices = await Invoice.countDocuments({ status: 'cancelled' });
    const draftInvoices = await Invoice.countDocuments({ status: 'draft' });
    const sentInvoices = await Invoice.countDocuments({ status: 'sent' });

    // Revenue statistics
    const totalRevenue = await Invoice.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    const monthlyStats = await Invoice.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            status: '$status',
          },
          count: { $sum: 1 },
          revenue: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$totalAmount', 0] } },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 },
    ]);

    // Email statistics
    const emailStats = await Invoice.aggregate([
      {
        $group: {
          _id: '$emailStatus',
          count: { $sum: 1 },
        },
      },
    ]);

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentActivity = await Invoice.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    const stats = {
      overview: {
        total: totalInvoices,
        paid: paidInvoices,
        overdue: overdueInvoices,
        cancelled: cancelledInvoices,
        draft: draftInvoices,
        sent: sentInvoices,
      },
      revenue: {
        total: totalRevenue[0]?.total || 0,
        monthly: monthlyStats,
      },
      email: emailStats.reduce((acc: any, stat: any) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      recentActivity,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Fehler beim Abrufen der Invoice-Statistiken:', error);
    res.status(500).json({
      success: false,
      error: 'Interner Serverfehler beim Abrufen der Invoice-Statistiken',
    });
  }
};

/**
 * Generate invoices for multiple vendors (bulk operation)
 */
export const bulkGenerateInvoices = async (req: Request, res: Response): Promise<void> => {
  try {
    const { vendorIds, period } = req.body;

    if (!vendorIds || !Array.isArray(vendorIds) || vendorIds.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Vendor IDs sind erforderlich',
      });
      return;
    }

    if (!period || !period.month || !period.year) {
      res.status(400).json({
        success: false,
        error: 'Period (month/year) ist erforderlich',
      });
      return;
    }

    // Use inline bulk generation instead of external function
    const results: Array<{
      vendorId: string;
      success: boolean;
      error?: string;
      invoiceId?: string;
    }> = [];

    const invoiceGenerationService = (await import('../../services/invoiceGenerationService'))
      .default;

    // Process each vendor individually for better error tracking
    for (const vendorId of vendorIds) {
      try {
        const result = await invoiceGenerationService.generateMonthlyInvoice(
          vendorId,
          period.month,
          period.year,
        );
        results.push({
          vendorId,
          success: true,
          invoiceId: result.invoiceId,
        });
      } catch (error: any) {
        results.push({
          vendorId,
          success: false,
          error: error.message || 'Unknown error occurred',
        });
      }
    }

    await invoiceGenerationService.cleanup();

    // Log bulk generation for audit trail
    const auditEntry = {
      action: 'bulk_invoice_generation',
      adminId: (req as any).user?.id,
      vendorIds,
      period,
      results,
      timestamp: new Date(),
    };

    // TODO: Save to audit log model when implemented
    logger.info('Bulk invoice generation completed:', auditEntry);

    res.json({
      success: true,
      data: {
        processed: results.length,
        successful: results.filter((r: any) => r.success).length,
        failed: results.filter((r: any) => !r.success).length,
        results,
      },
    });
  } catch (error) {
    logger.error('Fehler bei der Bulk-Invoice-Generierung:', error);
    res.status(500).json({
      success: false,
      error: 'Interner Serverfehler bei der Bulk-Invoice-Generierung',
    });
  }
};

/**
 * Edit invoice (limited fields for admin)
 */
export const editInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { dueDate, status, notes } = req.body;

    const Invoice = (await import('../../models/Invoice')).default;

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      res.status(404).json({
        success: false,
        error: 'Invoice nicht gefunden',
      });
      return;
    }

    // Only allow editing certain fields
    const allowedUpdates: any = {};
    if (dueDate) allowedUpdates.dueDate = new Date(dueDate);
    if (status && ['draft', 'sent', 'paid', 'overdue', 'cancelled'].includes(status)) {
      allowedUpdates.status = status;
    }
    if (notes) allowedUpdates.notes = notes;

    // Set paid date if status changes to paid
    if (status === 'paid' && invoice.status !== 'paid') {
      allowedUpdates.paidDate = new Date();
    }

    const updatedInvoice = await Invoice.findByIdAndUpdate(id, allowedUpdates, {
      new: true,
      runValidators: true,
    });

    // Log edit for audit trail
    const auditEntry = {
      action: 'invoice_edit',
      adminId: (req as any).user?.id,
      invoiceId: id,
      changes: allowedUpdates,
      timestamp: new Date(),
    };

    logger.info('Invoice edited by admin:', auditEntry);

    res.json({
      success: true,
      data: updatedInvoice,
    });
  } catch (error) {
    logger.error('Fehler beim Bearbeiten der Invoice:', error);
    res.status(500).json({
      success: false,
      error: 'Interner Serverfehler beim Bearbeiten der Invoice',
    });
  }
};

/**
 * Resend invoice email
 */
export const resendInvoiceEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const Invoice = (await import('../../models/Invoice')).default;

    const invoice = await Invoice.findById(id).populate('vendor');
    if (!invoice) {
      res.status(404).json({
        success: false,
        error: 'Invoice nicht gefunden',
      });
      return;
    }

    // Reset email status to retry
    await Invoice.findByIdAndUpdate(id, {
      emailStatus: 'pending',
      emailAttempts: invoice.emailAttempts + 1,
      lastEmailAttempt: new Date(),
    });

    // Queue email for sending
    const { emailQueue } = await import('../../utils/emailQueue');
    await emailQueue.addInvoiceNotificationEmail({
      userId: (invoice.vendor._id as any).toString(),
      invoiceId: (invoice._id as any).toString(),
      email: (invoice.vendor as any).email,
      vendorId: (invoice.vendor._id as any).toString(),
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: invoice.totalAmount,
      dueDate: invoice.dueDate,
    });

    // Log resend for audit trail
    const auditEntry = {
      action: 'invoice_email_resend',
      adminId: (req as any).user?.id,
      invoiceId: id,
      attempt: invoice.emailAttempts + 1,
      timestamp: new Date(),
    };

    logger.info('Invoice email resent by admin:', auditEntry);

    res.json({
      success: true,
      message: 'Email erfolgreich zur Warteschlange hinzugefügt',
    });
  } catch (error) {
    logger.error('Fehler beim Erneuten Senden der Invoice-Email:', error);
    res.status(500).json({
      success: false,
      error: 'Interner Serverfehler beim Erneuten Senden der Invoice-Email',
    });
  }
};

/**
 * Cancel invoice (soft delete)
 */
export const cancelInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const Invoice = (await import('../../models/Invoice')).default;

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      res.status(404).json({
        success: false,
        error: 'Invoice nicht gefunden',
      });
      return;
    }

    if (invoice.status === 'paid') {
      res.status(400).json({
        success: false,
        error: 'Bezahlte Invoices können nicht storniert werden',
      });
      return;
    }

    // Soft delete by setting status to cancelled
    const updatedInvoice = await Invoice.findByIdAndUpdate(
      id,
      {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: reason || 'Storniert durch Admin',
      },
      { new: true },
    );

    // Log cancellation for audit trail
    const auditEntry = {
      action: 'invoice_cancellation',
      adminId: (req as any).user?.id,
      invoiceId: id,
      reason: reason || 'Storniert durch Admin',
      timestamp: new Date(),
    };

    logger.info('Invoice cancelled by admin:', auditEntry);

    res.json({
      success: true,
      data: updatedInvoice,
    });
  } catch (error) {
    logger.error('Fehler beim Stornieren der Invoice:', error);
    res.status(500).json({
      success: false,
      error: 'Interner Serverfehler beim Stornieren der Invoice',
    });
  }
};
