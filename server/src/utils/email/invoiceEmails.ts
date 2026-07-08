/**
 * @file Invoice emails for housnkuh marketplace
 * @description Rechnungsbenachrichtigung mit PDF-Anhang auf Basis des
 * Handlebars-Templates templates/invoice-email.hbs. Enthält zusätzlich den
 * Direktversand (sendInvoiceNotificationDirect), der die frühere
 * Bull/Redis-E-Mail-Queue ersetzt (AUDIT OP8).
 */

import * as fs from 'fs';
import * as path from 'path';
import logger from '../logger';
import Invoice from '../../models/Invoice';
import { getFrontendUrl, createTransporter, emailService } from './core';

/**
 * Sends invoice notification email with PDF attachment
 */
export const sendInvoiceNotification = async (
  invoiceData: {
    invoice: any;
    vendor: any;
    pdfBuffer: Buffer;
    companyInfo: any;
  }
): Promise<boolean> => {
  try {
    const { invoice, vendor, pdfBuffer, companyInfo } = invoiceData;
    
    // Prepare template data
    const templateData = {
      vendor,
      invoiceNumber: invoice.invoiceNumber,
      period: invoice.period,
      subtotal: invoice.subtotal,
      totalAmount: invoice.totalAmount,
      tax: invoice.tax,
      status: invoice.status,
      createdAt: invoice.createdAt,
      dueDate: invoice.dueDate,
      paidDate: invoice.paidDate,
      companyInfo,
      portalUrl: `${getFrontendUrl()}/vendor/invoices`,
      
      // Helper functions for template
      formatDate: (date: Date, format: string) => {
        if (!date) return '';
        const d = new Date(date);
        if (format === 'DD.MM.YYYY') {
          return d.toLocaleDateString('de-DE');
        }
        return d.toLocaleDateString('de-DE');
      },
      formatMonth: (month: number) => {
        const months = [
          'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
          'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
        ];
        return months[month - 1] || month.toString();
      },
      formatPrice: (amount: number) => {
        return new Intl.NumberFormat('de-DE', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(amount);
      }
    };

    // Load and compile email template
    const templatePath = path.join(__dirname, '../../templates/invoice-email.hbs');
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    const compiledHtml = emailService.compileTemplate(templateContent, templateData);

    // Create subject line
    const subject = `📄 Ihre Rechnung ${invoice.invoiceNumber} - housnkuh`;

    // Create transporter
    const transporter = createTransporter();
    
    // Email options with PDF attachment
    const mailOptions = {
      from: `"housnkuh" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: vendor.email,
      subject: subject,
      html: compiledHtml,
      attachments: [
        {
          filename: `Rechnung_${invoice.invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    // Send email
    const result = await transporter.sendMail(mailOptions);
    logger.info(`Invoice notification sent successfully: ${result.messageId} to ${vendor.email}`);
    
    return true;
    
  } catch (error) {
    logger.error('Error sending invoice notification:', error);
    throw error; // Re-throw – Aufrufer (Direktversand) entscheidet über Fehlerbehandlung
  }
};

/**
 * Aktualisiert den E-Mail-Versandstatus einer Rechnung in der Datenbank.
 * Übernommen aus der früheren emailQueue (updateInvoiceEmailStatus).
 */
const updateInvoiceEmailStatus = async (
  invoiceId: string,
  status: 'pending' | 'sent' | 'failed' | 'retrying',
  timestamp: Date
): Promise<void> => {
  try {
    const updateData: any = {
      emailStatus: status,
      lastEmailAttempt: timestamp
    };

    if (status === 'sent') {
      updateData.emailSentAt = timestamp;
    }

    // Increment attempt counter
    await Invoice.updateOne(
      { _id: invoiceId },
      {
        $set: updateData,
        $inc: { emailAttempts: 1 }
      }
    );

    logger.info('Invoice email status updated', { invoiceId, status });
  } catch (error) {
    logger.error('Failed to update invoice email status', { error });
  }
};

/**
 * Alarmiert den Admin bei endgültig fehlgeschlagenem E-Mail-Versand.
 * Lazy require: ein statischer Import würde einen Zyklus
 * invoiceEmails → alertingService → healthCheckService → emailService schließen.
 */
const alertAdminOfEmailFailure = (
  details: { userId?: string; email?: string; emailType: string },
  error: Error
): void => {
  logger.error('ADMIN ALERT: Email delivery failed permanently', {
    userId: details.userId,
    email: details.email,
    type: details.emailType,
    error: error.message
  });

  try {
    const AlertingService = require('../../services/alertingService').default;
    AlertingService.alertEmailDeliveryFailure({
      userId: details.userId,
      email: details.email,
      emailType: details.emailType,
      errorMessage: error.message
    }).catch((alertError: unknown) => {
      logger.error('Failed to dispatch admin alert for email failure', { alertError });
    });
  } catch (alertError) {
    logger.error('Failed to dispatch admin alert for email failure', { alertError });
  }
};

/**
 * Versendet die Rechnungsbenachrichtigung direkt (ohne Queue) – Ersatz für die
 * frühere Bull/Redis-E-Mail-Queue: Invoice + Vendor laden, PDF erzeugen,
 * E-Mail senden und den E-Mail-Status der Rechnung pflegen.
 *
 * Erfolg: emailStatus 'sent'. Fehler: emailStatus 'failed', Admin-Alert via
 * AlertingService.alertEmailDeliveryFailure, anschließend wird der Fehler
 * geworfen – der Aufrufer entscheidet über die weitere Behandlung.
 */
export const sendInvoiceNotificationDirect = async (invoiceId: string): Promise<void> => {
  let vendorEmail: string | undefined;
  let vendorId: string | undefined;

  try {
    // Get invoice and vendor details
    const invoice = await Invoice.findById(invoiceId).populate('vendor');
    if (!invoice) {
      throw new Error(`Invoice not found: ${invoiceId}`);
    }

    const vendor = invoice.vendor as any;
    if (!vendor) {
      throw new Error(`Vendor not found for invoice: ${invoiceId}`);
    }

    vendorEmail = vendor.email;
    vendorId = vendor._id?.toString();

    // PDF erzeugen – dynamischer Import, damit puppeteer nicht bei jedem
    // emailService-Import geladen wird
    const { invoicePdfService } = await import('../../services/pdf/invoicePdfService');
    const pdfBuffer = (await invoicePdfService.generatePdfBuffer(invoiceId)) as Buffer;

    // Company info for template
    const companyInfo = {
      name: process.env.COMPANY_NAME || 'housnkuh',
      address: process.env.COMPANY_ADDRESS || 'Musterstraße 1, 12345 Musterstadt',
      email: process.env.COMPANY_EMAIL || process.env.EMAIL_FROM,
      phone: process.env.COMPANY_PHONE,
      website: process.env.COMPANY_WEBSITE,
      taxId: process.env.COMPANY_TAX_ID
    };

    // Send invoice notification
    await sendInvoiceNotification({
      invoice: invoice.toObject(),
      vendor: vendor.toObject(),
      pdfBuffer,
      companyInfo
    });

    await updateInvoiceEmailStatus(invoiceId, 'sent', new Date());

    logger.info('Invoice notification email sent (direct)', {
      email: vendor.email,
      invoiceNumber: invoice.invoiceNumber
    });
  } catch (error) {
    logger.error('Invoice notification email failed (direct)', { invoiceId, email: vendorEmail, error });

    await updateInvoiceEmailStatus(invoiceId, 'failed', new Date());

    alertAdminOfEmailFailure(
      { userId: vendorId, email: vendorEmail, emailType: 'invoiceNotification' },
      error instanceof Error ? error : new Error(String(error))
    );

    throw error;
  }
};
