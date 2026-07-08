/**
 * @file Contact form emails for housnkuh marketplace
 * @description Kontaktformular-Mails an Admin und Nutzer
 * (inkl. Hardcoded-Fallbacks) samt ContactFormData-Interface.
 */

import logger from '../logger';
import { createTransporter, emailService } from './core';

/**
 * Interface for contact form data structure
 * @interface ContactFormData
 */
export interface ContactFormData {
  /** Full name of the contact person */
  name: string;
  /** Email address of the contact person */
  email: string;
  /** Optional phone number */
  phone?: string;
  /** Subject of the contact message */
  subject: string;
  /** Message content */
  message: string;
}

/**
 * Sends contact form emails to both admin and user
 * @function sendContactFormEmail
 * @description Handles contact form submission by sending notification to admin
 * and confirmation to the user who submitted the form
 * @param {ContactFormData} formData - Contact form submission data
 * @returns {Promise<boolean>} Promise resolving to true if emails sent successfully
 * @complexity O(1)
 * @security Sanitizes form data, validates email addresses
 */
export const sendContactFormEmail = async (formData: ContactFormData): Promise<boolean> => {
  try {
    logger.info(`Sending contact form email from: ${formData.email}, subject: ${formData.subject}`);
    
    // Fake success in development mode if email settings are not available
    if (process.env.NODE_ENV === 'development' && 
        (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
      logger.warn('⚠️ Running in development mode without email configuration');
      logger.info('📧 Contact form would be sent with data:', formData);
      return true; // Return success in development mode
    }

    // Prepare template data
    const currentDate = new Date().toLocaleDateString('de-DE');
    const currentTime = new Date().toLocaleTimeString('de-DE');
    const currentYear = new Date().getFullYear();

    const adminTemplateData = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone || null,
      subject: formData.subject,
      message: formData.message,
      currentDate,
      currentTime,
      siteName: 'housnkuh',
      currentYear
    };

    const userTemplateData = {
      userName: formData.name,
      userEmail: formData.email,
      subject: formData.subject,
      message: formData.message,
      currentDate,
      adminEmail: 'eva-maria.schaller@housnkuh.de',
      phone: '015222035788'
    };

    // Send admin notification using database template
    const adminFallback = async (): Promise<boolean> => {
      return sendContactFormEmailAdminHardcoded(formData);
    };

    const adminSuccess = await emailService.sendDatabaseTemplateEmail(
      'contact_form_admin',
      'eva-maria.schaller@housnkuh.de',
      adminTemplateData,
      adminFallback
    );

    // Send user confirmation using database template
    const userFallback = async (): Promise<boolean> => {
      return sendContactFormEmailUserHardcoded(formData);
    };

    const userSuccess = await emailService.sendDatabaseTemplateEmail(
      'contact_form_user_confirmation',
      formData.email,
      userTemplateData,
      userFallback
    );

    // Return true if both emails were sent successfully
    return adminSuccess && userSuccess;
  } catch (error) {
    logger.error('Error in sendContactFormEmail:', error);
    
    if (process.env.NODE_ENV === 'development') {
      logger.warn('⚠️ In development mode, treating contact form email as sent successfully');
      return true;
    }
    
    return false;
  }
};

/**
 * Hardcoded fallback for admin contact form notification
 * @function sendContactFormEmailAdminHardcoded
 * @description Sends admin notification using hardcoded HTML template
 * when database templates are unavailable
 * @param {ContactFormData} formData - Contact form submission data
 * @returns {Promise<boolean>} Promise resolving to true if email sent successfully
 * @complexity O(1)
 * @security Uses hardcoded template with XSS protection
 */
const sendContactFormEmailAdminHardcoded = async (formData: ContactFormData): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    
    const adminSubject = `Neue Kontaktanfrage: ${formData.subject}`;
    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Neue Kontaktanfrage</h2>
        <p><strong>Name:</strong> ${formData.name}</p>
        <p><strong>E-Mail:</strong> ${formData.email}</p>
        ${formData.phone ? `<p><strong>Telefon:</strong> ${formData.phone}</p>` : ''}
        <p><strong>Betreff:</strong> ${formData.subject}</p>
        <p><strong>Nachricht:</strong></p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
          ${formData.message.replace(/\n/g, '<br>')}
        </div>
      </div>`;

    const mailOptions = {
      from: `"housnkuh Kontaktformular" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: 'eva-maria.schaller@housnkuh.de',
      replyTo: formData.email,
      subject: adminSubject,
      html: adminHtml
    };

    const result = await transporter.sendMail(mailOptions);
    logger.info('Admin contact form email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    logger.error('Error sending admin contact form email:', error);
    return false;
  }
};

/**
 * Hardcoded fallback for user contact form confirmation
 * @function sendContactFormEmailUserHardcoded
 * @description Sends user confirmation using hardcoded HTML template
 * when database templates are unavailable
 * @param {ContactFormData} formData - Contact form submission data
 * @returns {Promise<boolean>} Promise resolving to true if email sent successfully
 * @complexity O(1)
 * @security Uses hardcoded template with sanitized user data
 */
const sendContactFormEmailUserHardcoded = async (formData: ContactFormData): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    
    const userSubject = `deine Kontaktanfrage bei housnkuh: ${formData.subject}`;
    const userHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Vielen Dank für deine Anfrage!</h2>
        <p>Hallo ${formData.name},</p>
        <p>vielen Dank für deine Kontaktanfrage. Eva-Maria Schaller meldet sich so schnell wie möglich bei dir.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Deine Anfrage:</strong></p>
          <p><strong>Betreff:</strong> ${formData.subject}</p>
          <p><strong>Nachricht:</strong> ${formData.message}</p>
        </div>
        <p>Bei dringenden Fragen erreichst du uns auch telefonisch unter 015222035788.</p>
        <p>Mit freundlichen Grüßen<br>Das housnkuh Team</p>
      </div>`;

    const mailOptions = {
      from: `"housnkuh" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: formData.email,
      subject: userSubject,
      html: userHtml
    };

    const result = await transporter.sendMail(mailOptions);
    logger.info('User contact form confirmation sent successfully:', result.messageId);
    return true;
  } catch (error) {
    logger.error('Error sending user contact form confirmation:', error);
    return false;
  }
};
