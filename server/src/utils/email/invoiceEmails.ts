/**
 * @file Invoice emails for housnkuh marketplace
 * @description Rechnungsbenachrichtigung mit PDF-Anhang auf Basis des
 * Handlebars-Templates templates/invoice-email.hbs.
 */

import * as fs from 'fs';
import * as path from 'path';
import logger from '../logger';
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
    throw error; // Re-throw for queue retry mechanism
  }
};
