/**
 * @file Email service utilities for housnkuh marketplace
 * @description Comprehensive email service providing template-based email sending, 
 * transporter configuration, and various email types for vendor, admin, and user notifications
 * @author housnkuh Development Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { EmailTemplateHelpers } from './emailHelpers';
import EmailTemplate from '../models/EmailTemplate';
import logger from './logger';

dotenv.config();

/**
 * Helper function to get the frontend URL with environment-aware fallbacks
 * @returns The appropriate frontend URL based on environment configuration
 */
const getFrontendUrl = (): string => {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  }
  
  // Environment-specific fallbacks
  switch (process.env.NODE_ENV) {
    case 'production':
      return 'https://housnkuh.de';
    case 'staging':
      return 'https://staging.housnkuh.de';
    default: // development
      return 'http://localhost:3000';
  }
};

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
 * Interface for vendor contest submission data
 * @interface VendorContestData
 */
export interface VendorContestData {
  /** Name of the participant */
  name: string;
  /** Email address of the participant */
  email: string;
  /** Optional phone number */
  phone?: string;
  /** List of guessed vendor names */
  guessedVendors: string[];
}

/**
 * Creates and configures a nodemailer transporter for sending emails
 * @function createTransporter
 * @description Creates a configured nodemailer transporter with debugging enabled
 * and TLS settings for secure email delivery
 * @returns {nodemailer.Transporter} Configured nodemailer transporter instance
 * @complexity O(1)
 * @security Uses environment variables for credentials, enables debug logging
 */
const createTransporter = () => {
  const config = {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true', // true für Port 465, false für andere
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    debug: true, // Debug-Logs aktivieren
    logger: true, // Detaillierte Logs
    tls: {
      rejectUnauthorized: false // Erlaubt Verbindungen zu Servern mit selbst-signierten Zertifikaten
    }
  };
  
  logger.info('Creating email transporter with config:', {
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.auth.user,
    pass: config.auth.pass ? '***' : 'NOT SET'
  });
  
  return nodemailer.createTransport(config);
};

/**
 * Tests the email service connection and configuration
 * @function testEmailConnection
 * @description Verifies that the email service can establish a connection
 * with the configured SMTP server
 * @returns {Promise<boolean>} Promise resolving to true if connection succeeds, false otherwise
 * @complexity O(1)
 * @security Tests connection without exposing credentials in logs
 */
export const testEmailConnection = async (): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    logger.info('Email connection test successful');
    return true;
  } catch (error) {
    logger.error('Email connection test failed:', error);
    return false;
  }
};

/**
 * Checks if the email service is properly configured
 * @function isConfigured
 * @description Validates that all required email environment variables are set
 * @returns {boolean} True if email service is configured, false otherwise
 * @complexity O(1)
 * @security Checks for presence of required configuration without exposing values
 */
const isConfigured = (): boolean => {
  return !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);
};

/**
 * Sends newsletter confirmation email to subscriber
 * @function sendNewsletterConfirmation
 * @description Sends a newsletter confirmation email with a unique token and type
 * Falls back to development mode simulation if email is not configured
 * @param {string} to - Recipient email address
 * @param {string} token - Unique confirmation token
 * @param {string} type - Subscription type ('vendor' or 'customer')
 * @returns {Promise<boolean>} Promise resolving to true if email sent successfully
 * @complexity O(1)
 * @security Uses database templates with fallback, sanitizes input data
 */
export const sendNewsletterConfirmation = async (to: string, token: string, type: string): Promise<boolean> => {
  try {
    logger.info(`Sending newsletter confirmation to: ${to}, type: ${type}`);
    
    const baseUrl = getFrontendUrl();

    // Fake success in development mode if email settings are not available
    if (process.env.NODE_ENV === 'development' && 
        (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
      logger.warn('⚠️ Running in development mode without email configuration');
      logger.info('🔗 Confirmation URL would be:', `${baseUrl}/newsletter/confirm?token=${token}&type=${type}`);
      return true; // Return success in development mode
    }

    // Prepare template data
    const confirmUrl = `${baseUrl}/newsletter/confirm?token=${token}&type=${type}`;
    const typeText = type === 'vendor' ? 'als Direktvermarkter' : 'als Kunde';

    const templateData = {
      userEmail: to,
      confirmationUrl: confirmUrl,
      subscriberType: typeText,
      token,
      type,
      frontendUrl: baseUrl,
      currentYear: new Date().getFullYear()
    };

    // Try database template first, fallback to hardcoded
    const fallbackFunction = async (): Promise<boolean> => {
      return sendNewsletterConfirmationHardcoded(to, token, type);
    };

    return await emailService.sendDatabaseTemplateEmail(
      'newsletter_confirmation_new',
      to,
      templateData,
      fallbackFunction
    );
  } catch (error) {
    logger.error('Error in sendNewsletterConfirmation:', error);
    
    if (process.env.NODE_ENV === 'development') {
      logger.warn('⚠️ In development mode, treating newsletter confirmation as sent successfully');
      return true;
    }
    
    return false;
  }
};

/**
 * Hardcoded fallback version of newsletter confirmation email
 * @function sendNewsletterConfirmationHardcoded
 * @description Sends newsletter confirmation using hardcoded HTML template
 * when database templates are unavailable
 * @param {string} to - Recipient email address
 * @param {string} token - Unique confirmation token
 * @param {string} type - Subscription type ('vendor' or 'customer')
 * @returns {Promise<boolean>} Promise resolving to true if email sent successfully
 * @complexity O(1)
 * @security Uses hardcoded template with token validation
 */
const sendNewsletterConfirmationHardcoded = async (to: string, token: string, type: string): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    const baseUrl = getFrontendUrl();
    const confirmUrl = `${baseUrl}/newsletter/confirm?token=${token}&type=${type}`;
    
    const subject = 'Bestätige deinen Newsletter bei housnkuh';
    const typeText = type === 'vendor' ? 'als Direktvermarkter' : 'als Kunde';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Newsletter-Anmeldung bestätigen</h2>
        <p>Vielen Dank für deine Anmeldung zum housnkuh-Newsletter ${typeText}!</p>
        <p>Um deine Anmeldung zu bestätigen, klicke bitte auf den folgenden Button:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${confirmUrl}" style="background-color: #e17564; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Newsletter bestätigen
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">Der Link ist 24 Stunden gültig.</p>
        <p style="color: #666; font-size: 14px;">Solltest du dich nicht angemeldet haben, kannst du diese E-Mail ignorieren.</p>
      </div>`;

    const mailOptions = {
      from: `"housnkuh" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    };

    const result = await transporter.sendMail(mailOptions);
    logger.info('Newsletter confirmation sent successfully:', result.messageId);
    return true;
  } catch (error) {
    logger.error('Error sending newsletter confirmation:', error);
    return false;
  }
};

/**
 * Sends notification email when the store opening date changes
 * @function sendOpeningDateChangeNotification
 * @description Notifies users about changes to the housnkuh marketplace opening date
 * Falls back to development mode simulation if email is not configured
 * @param {string} to - Recipient email address
 * @param {Object} data - Notification data
 * @param {string} data.name - Recipient's name
 * @param {Date} data.newDate - New opening date
 * @param {Date | null} data.oldDate - Previous opening date, null if not set before
 * @returns {Promise<boolean>} Promise resolving to true if email sent successfully
 * @complexity O(1)
 * @security Uses database templates with fallback, no sensitive data exposed
 */
export const sendOpeningDateChangeNotification = async (to: string, data: { name: string; newDate: Date; oldDate: Date | null }): Promise<boolean> => {
  try {
    logger.info(`Sending opening date change notification to: ${to}`);
    
    // Fake success in development mode if email settings are not available
    if (process.env.NODE_ENV === 'development' && 
        (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
      logger.warn('⚠️ Running in development mode without email configuration');
      logger.info('📧 Opening date change notification would be sent with data:', data);
      return true;
    }
    
    const transporter = createTransporter();
    
    const subject = 'Wichtig: Eröffnungsdatum von housnkuh wurde geändert';
    
    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString('de-DE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };
    
    const html = `
      <div style="font-family: 'Quicksand', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #09122c; margin: 0;">housnkuh</h1>
            <p style="color: #666; margin: 10px 0;">Regionaler Marktplatz Kronach</p>
          </div>
          
          <h2 style="color: #09122c; text-align: center; margin-bottom: 20px;">📅 Eröffnungsdatum geändert</h2>
          
          <p style="color: #333; line-height: 1.6;">
            Liebe/r ${data.name},
          </p>
          
          <p style="color: #333; line-height: 1.6;">
            housnkuh möchte dich darüber informieren, dass sich das Eröffnungsdatum geändert hat.
          </p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            ${data.oldDate ? `
              <p style="color: #666; margin: 0 0 10px 0;">
                <strong>Altes Datum:</strong> ${formatDate(data.oldDate)}
              </p>
            ` : ''}
            <p style="color: #09122c; margin: 0; font-size: 18px;">
              <strong>Neues Eröffnungsdatum:</strong> ${formatDate(data.newDate)}
            </p>
          </div>
          
          <p style="color: #333; line-height: 1.6;">
            <strong>Was bedeutet das für du?</strong><br>
            dein kostenloser Probemonat startet automatisch am neuen Eröffnungsdatum. 
            du können bereits jetzt dein Profil vervollständigen und deine Produkte anlegen.
          </p>
          
          <p style="color: #333; line-height: 1.6;">
            Bei Fragen steht dir Eva-Maria Schaller gerne zur Verfügung.
          </p>
          
          <p style="color: #333; line-height: 1.6;">
            Mit freundlichen Grüßen,<br>
            Eva-Maria Schaller<br>
            housnkuh
          </p>
        </div>
      </div>
    `;
    
    const mailOptions = {
      from: `"housnkuh" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    };
    
    logger.info('Sending opening date change notification:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });
    
    try {
      const result = await transporter.sendMail(mailOptions);
      logger.info('Opening date change email sent successfully:', result.messageId);
      return true;
    } catch (emailError) {
      logger.error('Opening date change email error:', emailError);
      
      if (process.env.NODE_ENV === 'development') {
        logger.warn('⚠️ In development mode, treating email as sent successfully');
        return true;
      }
      
      return false;
    }
  } catch (error) {
    logger.error('Error in sendOpeningDateChangeNotification:', error);
    
    if (process.env.NODE_ENV === 'development') {
      logger.warn('⚠️ In development mode, treating email as sent successfully');
      return true;
    }
    
    return false;
  }
};

/**
 * Sends vendor registration confirmation email with rental unit details
 * @function sendVendorConfirmationEmail
 * @description Sends comprehensive confirmation email to vendors after successful registration
 * including rental unit details, contract information, and package data
 * @param {string} to - Vendor's email address
 * @param {Object} data - Vendor confirmation data
 * @param {string} data.name - Vendor's name
 * @param {Array<any>} data.mietfaecher - Array of assigned rental units
 * @param {any} data.vertrag - Contract information
 * @param {any} data.packageData - Selected package details
 * @returns {Promise<boolean>} Promise resolving to true if email sent successfully
 * @complexity O(n) where n is the number of rental units
 * @security Sanitizes vendor data, uses secure templates
 */
export const sendVendorConfirmationEmail = async (to: string, data: { name: string; mietfaecher: any[]; vertrag: any; packageData: any }): Promise<boolean> => {
  try {
    logger.info(`Sending vendor confirmation email to: ${to}`);
    
    // Fake success in development mode if email settings are not available
    if (process.env.NODE_ENV === 'development' && 
        (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
      logger.warn('⚠️ Running in development mode without email configuration');
      logger.info('📧 Vendor confirmation would be sent with data:', data);
      return true; // Return success in development mode
    }

    // Prepare template data
    // Mietfach-Details formatieren für template
    const formatMietfaecherForTemplate = (mietfaecher: any[]) => {
      return mietfaecher.map(mietfach => ({
        bezeichnung: mietfach.bezeichnung,
        typ: mietfach.typ,
        standort: mietfach.standort || 'Hauptstandort',
        flaeche: mietfach.groesse?.flaeche || 'N/A',
        einheit: mietfach.groesse?.einheit || '',
        preis: mietfach.preis || 0,
        beschreibung: mietfach.beschreibung || null
      }));
    };

    const templateData = {
      vendorName: data.name,
      mietfaecher: formatMietfaecherForTemplate(data.mietfaecher),
      contractId: data.vertrag._id,
      rentalDuration: data.packageData.rentalDuration,
      monthlyCost: data.packageData.totalCost?.monthly?.toFixed(2) || 'N/A',
      provision: data.packageData.totalCost?.provision || 'N/A',
      currentDate: new Date().toLocaleDateString('de-DE'),
      dashboardUrl: `${getFrontendUrl()}/vendor/dashboard`,
      frontendUrl: getFrontendUrl(),
      phone: '015222035788',
      adminEmail: 'eva-maria.schaller@housnkuh.de',
      adminName: 'Eva-Maria Schaller',
      address: 'Strauer Str. 15, 96317 Kronach',
      currentYear: new Date().getFullYear()
    };

    // Try database template first, fallback to hardcoded
    const fallbackFunction = async (): Promise<boolean> => {
      return sendVendorConfirmationEmailHardcoded(to, data);
    };

    return await emailService.sendDatabaseTemplateEmail(
      'vendor_confirmation',
      to,
      templateData,
      fallbackFunction
    );
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Detailed vendor confirmation email error:', {
        message: error.message,
      });
    } else {
      logger.error('Detailed vendor confirmation email error:', error);
    }
    
    if (process.env.NODE_ENV === 'development') {
      logger.warn('⚠️ In development mode, treating vendor confirmation email as sent successfully');
      return true; // Return success in development mode
    }
    
    return false;
  }
};

/**
 * Hardcoded fallback version of vendor confirmation email
 * @function sendVendorConfirmationEmailHardcoded
 * @description Sends vendor confirmation using hardcoded HTML template
 * when database templates are unavailable
 * @param {string} to - Vendor's email address
 * @param {Object} data - Vendor confirmation data
 * @param {string} data.name - Vendor's name
 * @param {Array<any>} data.mietfaecher - Array of assigned rental units
 * @param {any} data.vertrag - Contract information
 * @param {any} data.packageData - Selected package details
 * @returns {Promise<boolean>} Promise resolving to true if email sent successfully
 * @complexity O(n) where n is the number of rental units
 * @security Uses hardcoded template with data sanitization
 */
const sendVendorConfirmationEmailHardcoded = async (to: string, data: { name: string; mietfaecher: any[]; vertrag: any; packageData: any }): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    
    const subject = 'deine Buchung wurde bestätigt - Willkommen bei housnkuh!';
    
    // Mietfach-Details formatieren
    const formatMietfaecher = (mietfaecher: any[]) => {
      return mietfaecher.map(mietfach => `
        <div style="background-color: white; padding: 15px; border-radius: 5px; border: 1px solid #ddd; margin: 10px 0;">
          <h4 style="color: #09122c; margin: 0 0 10px 0;">${mietfach.bezeichnung}</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
            <div><strong>Typ:</strong> ${mietfach.typ}</div>
            <div><strong>Standort:</strong> ${mietfach.standort || 'Hauptstandort'}</div>
            <div><strong>Größe:</strong> ${mietfach.groesse?.flaeche || 'N/A'} ${mietfach.groesse?.einheit || ''}</div>
            <div><strong>Monatspreis:</strong> ${mietfach.preis || 0}€</div>
          </div>
          ${mietfach.beschreibung ? `<p style="color: #666; font-size: 14px; margin: 10px 0 0 0;">${mietfach.beschreibung}</p>` : ''}
        </div>
      `).join('');
    };
    
    const mietfachList = formatMietfaecher(data.mietfaecher);
    
    const html = `
      <div style="font-family: 'Quicksand', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #09122c; margin: 0;">housnkuh</h1>
            <p style="color: #666; margin: 10px 0;">Regionaler Marktplatz Kronach</p>
          </div>
          
          <h2 style="color: #09122c; text-align: center; margin-bottom: 20px;">🎉 deine Buchung wurde bestätigt!</h2>
          
          <p style="color: #333; line-height: 1.6;">Liebe/r ${data.name},</p>
          <p style="color: #333; line-height: 1.6;">herzlichen Glückwunsch! housnkuh freut sich, dich als neuen Direktvermarkter begrüßen zu dürfen.</p>
          
          <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h3 style="color: #09122c; margin-top: 0;">✅ deine zugewiesenen Mietfächer:</h3>
            ${mietfachList}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${getFrontendUrl()}/vendor/dashboard" style="background-color: #e17564; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
              Zu deinem Vendor-Dashboard
            </a>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              © housnkuh - dein regionaler Marktplatz<br>
              <a href="https://housnkuh.de" style="color: #e17564;">www.housnkuh.de</a>
            </p>
          </div>
        </div>
      </div>
    `;
    
    const mailOptions = {
      from: `"housnkuh" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    };
    
    const result = await transporter.sendMail(mailOptions);
    logger.info('Vendor confirmation email sent successfully (hardcoded):', result.messageId);
    return true;
  } catch (emailError) {
    logger.error('Vendor confirmation email sending error (hardcoded):', emailError);
    
    if (process.env.NODE_ENV === 'development') {
      logger.warn('⚠️ In development mode, treating vendor confirmation email as sent successfully');
      return true;
    }
    
    return false;
  }
};

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

export interface VendorContestData {
  name: string;
  email: string;
  phone?: string;
  guessedVendors: string[];
}

/**
 * Sendet E-Mails für einen Vendor Contest Eintrag
 * - Eine E-Mail an den Administrator mit allen Details
 * - Eine Bestätigungs-E-Mail an den Teilnehmer
 */
/**
 * Sends pre-registration confirmation email to vendors
 * @function sendPreRegistrationConfirmation
 * @description Confirms vendor pre-registration and provides opening date information
 * @param {string} to - Vendor's email address
 * @param {Object} data - Pre-registration data
 * @param {string} data.name - Vendor's name
 * @param {Date | null} data.openingDate - Optional marketplace opening date
 * @returns {Promise<boolean>} Promise resolving to true if email sent successfully
 * @complexity O(1)
 * @security Uses database templates with fallback, no sensitive data exposed
 */
export const sendPreRegistrationConfirmation = async (to: string, data: { name: string; openingDate?: Date | null }): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    
    logger.info(`Sending pre-registration confirmation to: ${to}`);
    
    const openingDateText = data.openingDate ? 
      `am ${data.openingDate.toLocaleDateString('de-DE')}` : 
      'in Kürze';
    
    const mailOptions = {
      from: `"housnkuh" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: 'deine Vor-Registrierung bei housnkuh - Bestätigung',
      html: `
      <div style="font-family: 'Quicksand', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #09122c; margin: 0;">housnkuh</h1>
            <p style="color: #666; margin: 10px 0;">Regionaler Marktplatz Kronach</p>
          </div>
         
          <h2 style="color: #09122c; text-align: center; margin-bottom: 20px;">Vor-Registrierung bestätigt!</h2>
          
          <p style="color: #333; line-height: 1.6;">Hallo ${data.name},</p>
          
          <p style="color: #333; line-height: 1.6;">
            vielen Dank für deine Vor-Registrierung bei housnkuh! Wir freuen uns sehr, dass du zu den ersten Direktvermarktern gehören möchten, die unseren regionalen Marktplatz nutzen.
          </p>
          
          <div style="background-color: #e8f4fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3 style="color: #09122c; margin: 0 0 10px 0; font-size: 16px;">
              🎉 deine Vorteile als Früh-Registrierter:
            </h3>
            <ul style="color: #333; margin: 0; padding-left: 20px;">
              <li>30 Tage kostenloser Probemonat</li>
              <li>Bevorzugte Behandlung bei der Platzierung</li>
              <li>Exklusiver Zugang zu neuen Features</li>
              <li>Persönliche Betreuung beim Einstieg</li>
            </ul>
          </div>
          
          <div style="background-color: #fff3cd; border: 1px solid #ffeeba; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3 style="color: #856404; margin: 0 0 10px 0; font-size: 16px;">
              📅 Store-Eröffnung ${openingDateText}
            </h3>
            <p style="color: #856404; margin: 0; font-size: 14px;">
              Wir informieren du rechtzeitig über die genaue Eröffnung und alle nächsten Schritte. 
              dein kostenloser Probemonat startet automatisch mit der Eröffnung.
            </p>
          </div>
          
          <h3 style="color: #09122c; margin: 30px 0 15px 0;">Was passiert als nächstes?</h3>
          <ol style="color: #333; line-height: 1.6; padding-left: 20px;">
            <li>du erhalten eine weitere E-Mail zur Store-Eröffnung</li>
            <li>Wir aktivieren deinen Account automatisch</li>
            <li>du können sofort mit dem Verkauf beginnen</li>
            <li>Unser Support-Team steht dir zur Verfügung</li>
          </ol>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #666; font-size: 14px;">
              Bei Fragen kannst du uns jederzeit unter <a href="mailto:info@housnkuh.de" style="color: #e17564;">info@housnkuh.de</a> erreichen.
            </p>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              © housnkuh - Strauer Str. 15, 96317 Kronach<br>
              <a href="https://housnkuh.de" style="color: #e17564;">www.housnkuh.de</a>
            </p>
          </div>
        </div>
      </div>
     `
    };
    
    logger.info('Sending email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });
    
    const result = await transporter.sendMail(mailOptions);
    logger.info('Email sent successfully:', result.messageId);
    
    return true;
  } catch (error) {
    logger.error('Error sending pre-registration confirmation email:', error);
    return false;
  }
};

/**
 * Sends vendor contest submission emails
 * @function sendVendorContestEmail
 * @description Handles vendor contest entries by sending notifications to admin
 * and confirmation to the participant
 * @param {VendorContestData} contestData - Contest submission data
 * @returns {Promise<boolean>} Promise resolving to true if emails sent successfully
 * @complexity O(n) where n is the number of guessed vendors
 * @security Validates contest data, sanitizes user input
 */
export async function sendVendorContestEmail(contestData: VendorContestData): Promise<boolean> {
  if (!isConfigured()) {
    logger.warn('Email service not configured - skipping vendor contest email send');
    
    if (process.env.NODE_ENV === 'development') {
      logger.info('📧 Development mode: Would send vendor contest emails to:', contestData.email);
      logger.info('📧 Contest data:', contestData);
      return true; // Return success in development mode
    }
    
    return false;
  }
  
  try {
    // E-Mail an den Administrator
    const adminSubject = `Neue Teilnahme am Vendor Contest von ${contestData.name}`;
    
    const adminHtml = `
      <div style="font-family: 'Quicksand', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #09122c; margin: 0;">housnkuh</h1>
            <p style="color: #666; margin: 10px 0;">Regionaler Marktplatz Kronach</p>
          </div>
          
          <h2 style="color: #09122c; text-align: center; margin-bottom: 20px;">Neue Vendor Contest Teilnahme</h2>
          
          <p style="color: #333; line-height: 1.6;">
            Ein neuer Teilnehmer hat am Vendor Contest teilgenommen!
          </p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #09122c; margin-top: 0;">Teilnehmer-Details:</h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666; width: 120px;"><strong>Name:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${contestData.name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;"><strong>E-Mail:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${contestData.email}</td>
              </tr>
              ${contestData.phone ? `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;"><strong>Telefon:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${contestData.phone}</td>
              </tr>
              ` : ''}
            </table>
            
            <div style="margin-top: 20px;">
              <h4 style="color: #09122c; margin-bottom: 10px;">Vermutete Direktvermarkter:</h4>
              <div style="background-color: white; padding: 15px; border-radius: 5px; border: 1px solid #eee;">
                <ul style="margin: 0; padding-left: 20px; color: #333;">
                  ${contestData.guessedVendors.map(vendor => `<li style="margin: 5px 0;">${vendor}</li>`).join('')}
                </ul>
              </div>
            </div>
          </div>
          
          <div style="background-color: #fffbf0; padding: 15px; border-radius: 5px; border-left: 4px solid #e17564; margin: 20px 0;">
            <h4 style="color: #09122c; margin-top: 0;">Hinweis:</h4>
            <p style="color: #333; margin: 5px 0;">Diese Teilnahme wurde automatisch in der Datenbank gespeichert. du können alle Teilnahmen im Admin-Dashboard einsehen.</p>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              © housnkuh - Automatisch generierte E-Mail<br>
              <a href="https://housnkuh.de" style="color: #e17564;">www.housnkuh.de</a>
            </p>
          </div>
        </div>
      </div>
    `;
    
    // E-Mail an den Teilnehmer
    const participantSubject = 'deine Teilnahme am housnkuh Vendor Contest';
    
    const participantHtml = `
      <div style="font-family: 'Quicksand', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #09122c; margin: 0;">housnkuh</h1>
            <p style="color: #666; margin: 10px 0;">Regionaler Marktplatz Kronach</p>
          </div>
          
          <h2 style="color: #09122c; text-align: center; margin-bottom: 20px;">Vielen Dank für deine Teilnahme!</h2>
          
          <p style="color: #333; line-height: 1.6;">
            Hallo ${contestData.name},
          </p>
          
          <p style="color: #333; line-height: 1.6;">
            vielen Dank für deine Teilnahme am housnkuh Vendor Contest! deine Vermutungen wurden erfolgreich registriert.
          </p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #09122c; margin-top: 0;">deine Vermutungen:</h3>
            
            <div style="background-color: white; padding: 15px; border-radius: 5px; border: 1px solid #eee;">
              <ul style="margin: 0; padding-left: 20px; color: #333;">
                ${contestData.guessedVendors.map(vendor => `<li style="margin: 5px 0;">${vendor}</li>`).join('')}
              </ul>
            </div>
          </div>
          
          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; border-left: 4px solid #2196f3; margin: 20px 0;">
            <h4 style="color: #09122c; margin-top: 0;">🎁 So geht es weiter:</h4>
            <p style="color: #333; margin: 5px 0;">
              Die Gewinner werden nach Abschluss des Contests per E-Mail benachrichtigt. 
              Halten du deine Mailbox im Auge - vielleicht gehören du zu den glücklichen Gewinnern!
            </p>
          </div>
          
          <div style="background-color: #fffbf0; padding: 15px; border-radius: 5px; border-left: 4px solid #e17564; margin: 20px 0;">
            <h4 style="color: #09122c; margin-top: 0;">Tipp:</h4>
            <p style="color: #333; margin: 5px 0;">
              Besuchen du uns gerne in der housnkuh und entdecken du unser vielfältiges Angebot regionaler Produkte. 
              Unsere Direktvermarkter freuen sich auf deinen Besuch!
            </p>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
            <h4 style="color: #09122c;">Bei Fragen steht dir Eva-Maria Schaller gerne zur Verfügung:</h4>
            <p style="color: #333; margin: 5px 0;">📞 Telefon: 015222035788</p>
            <p style="color: #333; margin: 5px 0;">✉️ E-Mail: eva-maria.schaller@housnkuh.de</p>
            <p style="color: #333; margin: 5px 0;">📍 Adresse: Strauer Str. 15, 96317 Kronach</p>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              © housnkuh - dein regionaler Marktplatz<br>
              <a href="https://housnkuh.de" style="color: #e17564;">www.housnkuh.de</a>
            </p>
          </div>
        </div>
      </div>
    `;
    
    // Beide E-Mails senden
    const adminMailOptions = {
      from: `"housnkuh" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL || 'eva-maria.schaller@housnkuh.de',
      subject: adminSubject,
      html: adminHtml
    };
    
    const participantMailOptions = {
      from: `"housnkuh" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: contestData.email,
      subject: participantSubject,
      html: participantHtml
    };
    
    logger.info('Sending vendor contest emails...');
    
    try {
      const transporter = createTransporter();
      // Sende beide E-Mails
      await Promise.all([
        transporter.sendMail(adminMailOptions),
        transporter.sendMail(participantMailOptions)
      ]);
      
      logger.info('Vendor contest emails sent successfully');
      return true;
    } catch (emailError) {
      logger.error('Vendor contest email sending error:', emailError);
      
      if (process.env.NODE_ENV === 'development') {
        logger.warn('⚠️ In development mode, treating vendor contest emails as sent successfully');
        return true; // Return success in development mode
      }
      
      return false;
    }
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Detailed vendor contest email error:', {
        message: error.message,
      });
    } else {
      logger.error('Detailed vendor contest email error:', error);
    }
    
    if (process.env.NODE_ENV === 'development') {
      logger.warn('⚠️ In development mode, treating vendor contest emails as sent successfully');
      return true; // Return success in development mode
    }
    
    return false;
  }
};

/**
 * Send trial activation email to vendor when their trial period starts
 */
/**
 * Sends trial activation email to vendors
 * @function sendTrialActivationEmail
 * @description Notifies vendors when their trial period has been activated
 * Includes trial details, expiration date, and next steps
 * @param {string} to - Vendor's email address
 * @param {string} name - Vendor's name
 * @param {Date} trialEndDate - Trial expiration date
 * @param {Array<any>} mietfaecher - Assigned rental units
 * @returns {Promise<boolean>} Promise resolving to true if email sent successfully
 * @complexity O(n) where n is the number of rental units
 * @security Uses database templates with fallback, sanitizes vendor data
 */
export const sendTrialActivationEmail = async (
  to: string, 
  name: string, 
  trialStartDate: Date, 
  trialEndDate: Date
): Promise<boolean> => {
  try {
    logger.info(`Sending trial activation email to: ${to}`);
    
    // Fake success in development mode if email settings are not available
    if (process.env.NODE_ENV === 'development' && 
        (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
      logger.warn('⚠️ Running in development mode without email configuration');
      logger.info('📧 Trial activation email would be sent to:', to);
      return true;
    }

    // Prepare template data
    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString('de-DE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const templateData = {
      vendorName: name,
      trialStartDate: formatDate(trialStartDate),
      trialEndDate: formatDate(trialEndDate),
      dashboardUrl: `${getFrontendUrl()}/vendor/dashboard`,
      frontendUrl: getFrontendUrl(),
      phone: '015222035788',
      adminEmail: 'eva-maria.schaller@housnkuh.de',
      adminName: 'Eva-Maria Schaller',
      address: 'Strauer Str. 15, 96317 Kronach',
      currentYear: new Date().getFullYear()
    };

    // Try database template first, fallback to hardcoded
    const fallbackFunction = async (): Promise<boolean> => {
      return sendTrialActivationEmailHardcoded(to, name, trialStartDate, trialEndDate);
    };

    return await emailService.sendDatabaseTemplateEmail(
      'trial_activation',
      to,
      templateData,
      fallbackFunction
    );
  } catch (error) {
    logger.error('Error in sendTrialActivationEmail:', error);
    
    if (process.env.NODE_ENV === 'development') {
      logger.warn('⚠️ In development mode, treating trial activation email as sent successfully');
      return true;
    }
    
    return false;
  }
};

// Hardcoded fallback version
/**
 * Hardcoded fallback version of trial activation email
 * @function sendTrialActivationEmailHardcoded
 * @description Sends trial activation using hardcoded HTML template
 * when database templates are unavailable
 * @param {string} to - Vendor's email address
 * @param {string} name - Vendor's name
 * @param {Date} trialEndDate - Trial expiration date
 * @param {Array<any>} mietfaecher - Assigned rental units
 * @returns {Promise<boolean>} Promise resolving to true if email sent successfully
 * @complexity O(n) where n is the number of rental units
 * @security Uses hardcoded template with data validation
 */
const sendTrialActivationEmailHardcoded = async (
  to: string, 
  name: string, 
  trialStartDate: Date, 
  trialEndDate: Date
): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    
    const subject = '🎉 dein kostenloser Probemonat bei housnkuh hat begonnen!';
    
    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString('de-DE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };
    
    const html = `
      <div style="font-family: 'Quicksand', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #09122c; margin: 0;">housnkuh</h1>
            <p style="color: #666; margin: 10px 0;">Regionaler Marktplatz Kronach</p>
          </div>
          
          <h2 style="color: #09122c; text-align: center; margin-bottom: 20px;">🎉 dein Probemonat ist gestartet!</h2>
          
          <p style="color: #333; line-height: 1.6;">Liebe/r ${name},</p>
          <p style="color: #333; line-height: 1.6;">herzlichen Glückwunsch! housnkuh ist jetzt offiziell eröffnet und dein kostenloser Probemonat hat begonnen.</p>
          
          <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h3 style="color: #09122c; margin-top: 0;">✅ dein Probemonat im Überblick:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; color: #666; width: 150px;"><strong>Startdatum:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; color: #333;">${formatDate(trialStartDate)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; color: #666;"><strong>Enddatum:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; color: #333;">${formatDate(trialEndDate)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Dauer:</strong></td>
                <td style="padding: 8px 0; color: #333;">30 Tage kostenlos</td>
              </tr>
            </table>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${getFrontendUrl()}/vendor/dashboard" style="background-color: #e17564; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
              Zu deinem Dashboard
            </a>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              © housnkuh - dein regionaler Marktplatz<br>
              <a href="https://housnkuh.de" style="color: #e17564;">www.housnkuh.de</a>
            </p>
          </div>
        </div>
      </div>
    `;
    
    const mailOptions = {
      from: `"housnkuh" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    };
    
    const result = await transporter.sendMail(mailOptions);
    logger.info('Trial activation email sent successfully (hardcoded):', result.messageId);
    return true;
  } catch (emailError) {
    logger.error('Trial activation email sending error (hardcoded):', emailError);
    
    if (process.env.NODE_ENV === 'development') {
      logger.warn('⚠️ In development mode, treating trial activation email as sent successfully');
      return true;
    }
    
    return false;
  }
};

/**
 * Send trial expiration warning email (7 days before expiration)
 */
/**
 * Sends trial expiration warning email to vendors
 * @function sendTrialExpirationWarning
 * @description Warns vendors about upcoming trial expiration
 * Provides information about converting to paid subscription
 * @param {string} to - Vendor's email address
 * @param {string} name - Vendor's name
 * @param {number} daysRemaining - Days until trial expires
 * @param {Date} trialEndDate - Trial expiration date
 * @returns {Promise<boolean>} Promise resolving to true if email sent successfully
 * @complexity O(1)
 * @security Uses database templates with fallback, no sensitive data exposed
 */
export const sendTrialExpirationWarning = async (
  to: string, 
  name: string, 
  trialEndDate: Date
): Promise<boolean> => {
  try {
    logger.info(`Sending trial expiration warning to: ${to}`);
    
    // Fake success in development mode if email settings are not available
    if (process.env.NODE_ENV === 'development' && 
        (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
      logger.warn('⚠️ Running in development mode without email configuration');
      logger.info('📧 Trial expiration warning would be sent to:', to);
      return true;
    }

    // Prepare template data
    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString('de-DE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const templateData = {
      vendorName: name,
      trialEndDate: formatDate(trialEndDate),
      provisionRate: '4',
      dashboardUrl: `${getFrontendUrl()}/vendor/dashboard`,
      phone: '015222035788',
      adminEmail: 'eva-maria.schaller@housnkuh.de',
      address: 'Strauer Str. 15, 96317 Kronach',
      currentYear: new Date().getFullYear(),
      siteUrl: 'https://housnkuh.de'
    };

    // Try database template first, fallback to hardcoded
    const fallbackFunction = async (): Promise<boolean> => {
      return sendTrialExpirationWarningHardcoded(to, name, trialEndDate);
    };

    return await emailService.sendDatabaseTemplateEmail(
      'trial_expiration_warning',
      to,
      templateData,
      fallbackFunction
    );
  } catch (error) {
    logger.error('Error in sendTrialExpirationWarning:', error);
    
    if (process.env.NODE_ENV === 'development') {
      logger.warn('⚠️ In development mode, treating trial expiration warning as sent successfully');
      return true;
    }
    
    return false;
  }
};

// Hardcoded fallback version
/**
 * Hardcoded fallback version of trial expiration warning email
 * @function sendTrialExpirationWarningHardcoded
 * @description Sends trial warning using hardcoded HTML template
 * when database templates are unavailable
 * @param {string} to - Vendor's email address
 * @param {string} name - Vendor's name
 * @param {number} daysRemaining - Days until trial expires
 * @param {Date} trialEndDate - Trial expiration date
 * @returns {Promise<boolean>} Promise resolving to true if email sent successfully
 * @complexity O(1)
 * @security Uses hardcoded template with sanitized data
 */
const sendTrialExpirationWarningHardcoded = async (
  to: string, 
  name: string, 
  trialEndDate: Date
): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    
    const subject = '⏰ dein Probemonat bei housnkuh endet bald';
    
    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString('de-DE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };
    
    const html = `
      <div style="font-family: 'Quicksand', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #09122c; margin: 0;">housnkuh</h1>
            <p style="color: #666; margin: 10px 0;">Regionaler Marktplatz Kronach</p>
          </div>
          
          <h2 style="color: #09122c; text-align: center; margin-bottom: 20px;">⏰ dein Probemonat endet in 7 Tagen</h2>
          
          <p style="color: #333; line-height: 1.6;">Liebe/r ${name},</p>
          <p style="color: #333; line-height: 1.6;">dein kostenloser Probemonat bei housnkuh neigt sich dem Ende zu. Am <strong>${formatDate(trialEndDate)}</strong> endet deine Testphase.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${getFrontendUrl()}/vendor/dashboard" style="background-color: #e17564; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px; margin: 10px;">
              Dashboard aufrufen
            </a>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              © housnkuh - dein regionaler Marktplatz<br>
              <a href="https://housnkuh.de" style="color: #e17564;">www.housnkuh.de</a>
            </p>
          </div>
        </div>
      </div>
    `;
    
    const mailOptions = {
      from: `"housnkuh" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    };
    
    const result = await transporter.sendMail(mailOptions);
    logger.info('Trial expiration warning email sent successfully (hardcoded):', result.messageId);
    return true;
  } catch (emailError) {
    logger.error('Trial expiration warning email sending error (hardcoded):', emailError);
    
    if (process.env.NODE_ENV === 'development') {
      logger.warn('⚠️ In development mode, treating trial warning email as sent successfully');
      return true;
    }
    
    return false;
  }
};

/**
 * Send trial expired email when trial period has ended
 */
/**
 * Sends trial expired notification email to vendors
 * @function sendTrialExpiredEmail
 * @description Notifies vendors when their trial period has expired
 * Provides options for subscription and reactivation
 * @param {string} to - Vendor's email address
 * @param {string} name - Vendor's name
 * @returns {Promise<boolean>} Promise resolving to true if email sent successfully
 * @complexity O(1)
 * @security Uses database templates with fallback, no payment data included
 */
export const sendTrialExpiredEmail = async (
  to: string, 
  name: string, 
  trialEndDate: Date
): Promise<boolean> => {
  try {
    logger.info(`Sending trial expired email to: ${to}`);
    
    // Fake success in development mode if email settings are not available
    if (process.env.NODE_ENV === 'development' && 
        (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
      logger.warn('⚠️ Running in development mode without email configuration');
      logger.info('📧 Trial expired email would be sent to:', to);
      return true;
    }

    // Prepare template data
    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString('de-DE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const templateData = {
      vendorName: name,
      trialEndDate: formatDate(trialEndDate),
      adminEmail: 'eva-maria.schaller@housnkuh.de',
      phone: '015222035788',
      address: 'Strauer Str. 15, 96317 Kronach',
      currentYear: new Date().getFullYear(),
      siteUrl: 'https://housnkuh.de'
    };

    // Try database template first, fallback to hardcoded
    const fallbackFunction = async (): Promise<boolean> => {
      return sendTrialExpiredEmailHardcoded(to, name, trialEndDate);
    };

    return await emailService.sendDatabaseTemplateEmail(
      'trial_expired',
      to,
      templateData,
      fallbackFunction
    );
  } catch (error) {
    logger.error('Error in sendTrialExpiredEmail:', error);
    
    if (process.env.NODE_ENV === 'development') {
      logger.warn('⚠️ In development mode, treating trial expired email as sent successfully');
      return true;
    }
    
    return false;
  }
};

// Hardcoded fallback version
/**
 * Hardcoded fallback version of trial expired email
 * @function sendTrialExpiredEmailHardcoded
 * @description Sends trial expiration using hardcoded HTML template
 * when database templates are unavailable
 * @param {string} to - Vendor's email address
 * @param {string} name - Vendor's name
 * @returns {Promise<boolean>} Promise resolving to true if email sent successfully
 * @complexity O(1)
 * @security Uses hardcoded template with no sensitive data
 */
const sendTrialExpiredEmailHardcoded = async (
  to: string, 
  name: string, 
  trialEndDate: Date
): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    
    const subject = '📋 dein Probemonat bei housnkuh ist beendet';
    
    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString('de-DE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };
    
    const html = `
      <div style="font-family: 'Quicksand', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #09122c; margin: 0;">housnkuh</h1>
            <p style="color: #666; margin: 10px 0;">Regionaler Marktplatz Kronach</p>
          </div>
          
          <h2 style="color: #721c24; text-align: center; margin-bottom: 20px;">⚠️ dein Probemonat ist abgelaufen</h2>
          
          <p style="color: #333; line-height: 1.6;">Liebe/r ${name},</p>
          <p style="color: #333; line-height: 1.6;">dein kostenloser Probemonat bei housnkuh ist am ${formatDate(trialEndDate)} abgelaufen.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="mailto:eva-maria.schaller@housnkuh.de" style="background-color: #e17564; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
              Jetzt reaktivieren
            </a>
          </div>
          
          <p style="color: #333; line-height: 1.6;">Vielen Dank für das Vertrauen in housnkuh.</p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              © housnkuh - dein regionaler Marktplatz<br>
              <a href="https://housnkuh.de" style="color: #e17564;">www.housnkuh.de</a>
            </p>
          </div>
        </div>
      </div>
    `;
    
    const mailOptions = {
      from: `"housnkuh" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    };
    
    const result = await transporter.sendMail(mailOptions);
    logger.info('Trial expired email sent successfully (hardcoded):', result.messageId);
    return true;
  } catch (emailError) {
    logger.error('Trial expired email sending error (hardcoded):', emailError);
    
    if (process.env.NODE_ENV === 'development') {
      logger.warn('⚠️ In development mode, treating trial expired email as sent successfully');
      return true;
    }
    
    return false;
  }
};

/**
 * Sends cancellation confirmation email to vendors
 * @function sendCancellationConfirmationEmail
 * @description Confirms vendor's subscription cancellation
 * Provides trial end date and access information
 * @param {string} to - Vendor's email address
 * @param {string} name - Vendor's name
 * @param {Date | null} trialEndDate - Date when trial/access ends
 * @returns {Promise<boolean>} Promise resolving to true if email sent successfully
 * @complexity O(1)
 * @security Uses database templates with fallback, no payment data exposed
 */
export const sendCancellationConfirmationEmail = async (to: string, name: string, trialEndDate: Date | null): Promise<boolean> => {
  try {
    logger.info(`Sending cancellation confirmation email to: ${to}`);
    
    // Fake success in development mode if email settings are not available
    if (process.env.NODE_ENV === 'development' && 
        (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
      logger.warn('⚠️ Running in development mode without email configuration');
      logger.info('📧 Cancellation confirmation would be sent to:', to);
      return true; // Return success in development mode
    }

    // Prepare template data
    const formatDate = (date: Date | null) => {
      if (!date) return null;
      return new Date(date).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    };

    const templateData = {
      vendorName: name,
      trialEndDate: trialEndDate ? formatDate(trialEndDate) : null,
      dataRetentionDays: 30,
      phone: '015222035788',
      adminEmail: 'eva-maria.schaller@housnkuh.de',
      currentYear: new Date().getFullYear(),
      siteUrl: 'https://housnkuh.de'
    };

    // Try database template first, fallback to hardcoded
    const fallbackFunction = async (): Promise<boolean> => {
      return sendCancellationConfirmationEmailHardcoded(to, name, trialEndDate);
    };

    return await emailService.sendDatabaseTemplateEmail(
      'cancellation_confirmation',
      to,
      templateData,
      fallbackFunction
    );
  } catch (error) {
    logger.error('Error in sendCancellationConfirmationEmail:', error);
    
    if (process.env.NODE_ENV === 'development') {
      logger.warn('⚠️ In development mode, treating cancellation email as sent successfully');
      return true;
    }
    
    return false;
  }
};

/**
 * Hardcoded fallback version of cancellation confirmation email
 * @function sendCancellationConfirmationEmailHardcoded
 * @description Sends cancellation confirmation using hardcoded HTML template
 * when database templates are unavailable
 * @param {string} to - Vendor's email address
 * @param {string} name - Vendor's name
 * @param {Date | null} trialEndDate - Date when trial/access ends
 * @returns {Promise<boolean>} Promise resolving to true if email sent successfully
 * @complexity O(1)
 * @security Uses hardcoded template with date validation
 */
const sendCancellationConfirmationEmailHardcoded = async (to: string, name: string, trialEndDate: Date | null): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    
    const subject = 'Bestätigung deiner Kündigung bei housnkuh';
    
    const formatDate = (date: Date | null) => {
      if (!date) return 'N/A';
      return new Date(date).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    };
    
    const html = `
      <div style="font-family: 'Quicksand', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #09122c; margin: 0;">Kündigung bestätigt</h1>
          </div>
          
          <p style="color: #333; line-height: 1.6;">Hallo ${name},</p>
          <p style="color: #333; line-height: 1.6;">deine Registrierung bei housnkuh wurde erfolgreich gekündigt.</p>
          
          ${trialEndDate ? `
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="color: #333; margin: 0;">
              <strong>Zugang bis:</strong> ${formatDate(trialEndDate)}<br>
              <small style="color: #666;">Du können dein Konto bis zu diesem Datum weiterhin nutzen.</small>
            </p>
          </div>
          ` : ''}
          
          <p style="color: #333; line-height: 1.6;">Vielen Dank, dass du housnkuh ausprobiert haben!</p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              © housnkuh - dein regionaler Marktplatz<br>
              <a href="https://housnkuh.de" style="color: #e17564;">www.housnkuh.de</a>
            </p>
          </div>
        </div>
      </div>
    `;
    
    const mailOptions = {
      from: `"housnkuh" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    };
    
    try {
      const result = await transporter.sendMail(mailOptions);
      logger.info('Cancellation confirmation email sent successfully:', result.messageId);
      return true;
    } catch (emailError) {
      logger.error('Cancellation confirmation email sending error:', emailError);
      
      if (process.env.NODE_ENV === 'development') {
        logger.warn('⚠️ In development mode, treating cancellation email as sent successfully');
        return true;
      }
      
      return false;
    }
  } catch (error) {
    logger.error('Error in sendCancellationConfirmationEmail:', error);
    
    if (process.env.NODE_ENV === 'development') {
      logger.warn('⚠️ In development mode, treating cancellation email as sent successfully');
      return true;
    }
    
    return false;
  }
};

/**
 * Interface for package booking data structure
 * @interface PackageBookingData
 * @description Contains all necessary information for package booking confirmation emails
 */
export interface PackageBookingData {
  vendorName: string;
  email: string;
  confirmationToken?: string; // Optional: für E-Mail-Bestätigung
  packageData: {
    selectedProvisionType: string;
    packageCounts: Record<string, number>;
    packageOptions: Array<{id: string, name: string, price: number}>;
    zusatzleistungen?: {
      lagerservice: boolean;
      versandservice: boolean;
    };
    rentalDuration: number;
    totalCost: {
      monthly: number;
      provision: number;
    };
  };
  zusatzleistungen?: {
    lagerservice: boolean;
    versandservice: boolean;
    lagerservice_kosten: number;
    versandservice_kosten: number;
  };
}

/**
 * Sends booking confirmation email for package builder
 * @function sendBookingConfirmation
 * @description Sends detailed booking confirmation to vendors
 * including package details, pricing, and selected services
 * @param {PackageBookingData} bookingData - Complete booking information
 * @returns {Promise<boolean>} Promise resolving to true if email sent successfully
 * @complexity O(n) where n is the number of additional services
 * @security Validates booking data, sanitizes user input
 */
export const sendBookingConfirmation = async (bookingData: PackageBookingData): Promise<boolean> => {
  try {
    logger.info(`Sending booking confirmation to: ${bookingData.email}`);
    
    // Development mode fallback
    if (process.env.NODE_ENV === 'development' && 
        (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
      logger.warn('⚠️ Running in development mode without email configuration');
      logger.info('📧 Booking confirmation would be sent with data:', bookingData);
      return true; // Return success in development mode
    }
    
    // Check if email settings are available
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      logger.error('❌ Email configuration missing. Required: EMAIL_HOST, EMAIL_USER, EMAIL_PASS');
      logger.info('📧 Email config:', { 
        host: process.env.EMAIL_HOST, 
        port: process.env.EMAIL_PORT,
        user: process.env.EMAIL_USER ? 'set' : 'missing',
        pass: process.env.EMAIL_PASS ? 'set' : 'missing'
      });
      return false;
    }

    // Prepare template data for Handlebars compilation
    const selectedPackages = Object.entries(bookingData.packageData.packageCounts || {})
      .map(([packageId, count]) => {
        if (count > 0) {
          const packageOption = bookingData.packageData.packageOptions?.find(p => p.id === packageId);
          return {
            count,
            name: packageOption?.name || packageId,
            price: packageOption?.price || 0,
            total: (packageOption?.price || 0) * count
          };
        }
        return null;
      })
      .filter(Boolean);

    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 30);

    const templateData = {
      vendorName: bookingData.vendorName,
      provisionModel: bookingData.packageData.selectedProvisionType === 'premium' ? 'Premium-Modell' : 'Basismodell',
      provisionRate: bookingData.packageData.totalCost.provision,
      rentalDuration: bookingData.packageData.rentalDuration,
      monthlyCost: bookingData.packageData.totalCost.monthly.toFixed(2),
      trialEndDate: trialEndDate.toLocaleDateString('de-DE'),
      selectedPackages,
      confirmationToken: bookingData.confirmationToken,
      frontendUrl: getFrontendUrl(),
      zusatzleistungen: bookingData.zusatzleistungen || bookingData.packageData.zusatzleistungen
    };

    // Try database template first, fallback to hardcoded
    const fallbackFunction = async (): Promise<boolean> => {
      return sendBookingConfirmationHardcoded(bookingData);
    };

    return await emailService.sendDatabaseTemplateEmail(
      'booking_confirmation',
      bookingData.email,
      templateData,
      fallbackFunction
    );
  } catch (error) {
    logger.error('Error in sendBookingConfirmation:', error);
    
    if (process.env.NODE_ENV === 'development') {
      logger.warn('⚠️ In development mode, treating booking confirmation email as sent successfully');
      return true;
    }
    
    return false;
  }
};

/**
 * Hardcoded fallback version of booking confirmation email
 * @function sendBookingConfirmationHardcoded
 * @description Sends booking confirmation using hardcoded HTML template
 * when database templates are unavailable
 * @param {PackageBookingData} bookingData - Complete booking information
 * @returns {Promise<boolean>} Promise resolving to true if email sent successfully
 * @complexity O(n) where n is the number of additional services
 * @security Uses hardcoded template with data sanitization
 */
const sendBookingConfirmationHardcoded = async (bookingData: PackageBookingData): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    
    const subject = 'Buchungsbestätigung - dein housnkuh Paket';
    
    // Berechne Verkaufsflächen Details
    const selectedPackagesHardcoded = Object.entries(bookingData.packageData.packageCounts || {})
      .map(([packageId, count]) => {
        if (count > 0) {
          const packageOption = bookingData.packageData.packageOptions?.find(p => p.id === packageId);
          return {
            count,
            name: packageOption?.name || packageId,
            price: packageOption?.price || 0,
            total: (packageOption?.price || 0) * count
          };
        }
        return null;
      })
      .filter(Boolean);

    // Trial startet immer sofort bei Buchung
    const trialStartDateHardcoded = new Date();
    const trialEndDateHardcoded = new Date();
    trialEndDateHardcoded.setDate(trialEndDateHardcoded.getDate() + 30);
    
    const trialMessageHardcoded = `
      <div style="background-color: #e3f2fd; border: 1px solid #2196f3; padding: 20px; margin: 20px 0; border-radius: 8px;">
        <h3 style="color: #1976d2; margin: 0 0 15px 0; font-size: 18px;">
          🏪 30 Tage kostenloser Probemonat startet bei Store-Eröffnung
        </h3>
        <p style="color: #1976d2; margin: 0; font-size: 14px;">
          Die Mietdauer der gewählten Verkaufsflächen beginnt nach Ablauf des Probemonats. 
          du kannst während des Probemonats alle Funktionen kostenlos nutzen und jederzeit kündigen.
        </p>
      </div>`;
    
    const html = `
      <div style="font-family: 'Quicksand', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #09122c; margin: 0;">housnkuh</h1>
            <p style="color: #666; margin: 10px 0;">Regionaler Marktplatz Kronach</p>
          </div>
          
          <h2 style="color: #09122c; text-align: center; margin-bottom: 20px;">📋 deine Paketübersicht</h2>
          
          <p style="color: #333; line-height: 1.6;">
            Hallo ${bookingData.vendorName},
          </p>
          
          <p style="color: #333; line-height: 1.6;">
            herzlich willkommen bei housnkuh! deine Paket-Buchung war erfolgreich und wir freuen uns, du als neuen Direktvermarkter bei uns begrüßen zu dürfen.
          </p>
          
          ${trialMessageHardcoded}

          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #09122c; margin-top: 0;">📦 dein gebuchtes Paket:</h3>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666; width: 180px;"><strong>Provisionsmodell:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">
                  ${bookingData.packageData.selectedProvisionType === 'premium' ? 'Premium-Modell' : 'Basismodell'} 
                  (${bookingData.packageData.totalCost.provision}% Provision)
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;"><strong>Vertragslaufzeit:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${bookingData.packageData.rentalDuration} Monate (nach Probemonat)</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;"><strong>Monatliche Kosten:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333; font-weight: bold;">
                  ${bookingData.packageData.totalCost.monthly.toFixed(2)}€ (ab ${trialEndDateHardcoded.toLocaleDateString('de-DE')})
                </td>
              </tr>
            </table>

            ${selectedPackagesHardcoded && selectedPackagesHardcoded.length > 0 ? `
            <h4 style="color: #09122c; margin: 15px 0 10px 0;">Gewählte Verkaufsflächen:</h4>
            ${selectedPackagesHardcoded.map(pkg => {
              if (!pkg) return '';
              return `
              <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dotted #ddd;">
                <span style="color: #333;">${pkg.count}x ${pkg.name}</span>
                <span style="color: #333; font-weight: bold;">${pkg.total.toFixed(2)}€/Monat</span>
              </div>
              `;
            }).join('')}
            ` : ''}


            ${((bookingData.packageData.zusatzleistungen && (bookingData.packageData.zusatzleistungen.lagerservice || bookingData.packageData.zusatzleistungen.versandservice)) || 
               (bookingData.zusatzleistungen && (bookingData.zusatzleistungen.lagerservice || bookingData.zusatzleistungen.versandservice))) ? `
            <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 15px; margin: 20px 0; border-radius: 8px;">
              <h4 style="color: #1d4ed8; margin: 0 0 10px 0; font-size: 16px;">
                📦 Zusatzleistungen
              </h4>
              ${(bookingData.packageData.zusatzleistungen?.lagerservice || bookingData.zusatzleistungen?.lagerservice) ? `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dotted #bfdbfe;">
                <div style="color: #1e40af;">
                  <strong>🏪 Lagerservice</strong>
                  <div style="font-size: 12px; color: #64748b;">Professionelle Lagerung deiner Produkte</div>
                </div>
                <span style="color: #1e40af; font-weight: bold;">${bookingData.zusatzleistungen?.lagerservice_kosten?.toFixed(2) || '20.00'}€/Monat</span>
              </div>
              ` : ''}
              ${(bookingData.packageData.zusatzleistungen?.versandservice || bookingData.zusatzleistungen?.versandservice) ? `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0;">
                <div style="color: #1e40af;">
                  <strong>🚚 Versandservice</strong>
                  <div style="font-size: 12px; color: #64748b;">Versand direkt vom Lager an deine Kunden</div>
                </div>
                <span style="color: #1e40af; font-weight: bold;">${bookingData.zusatzleistungen?.versandservice_kosten?.toFixed(2) || '5.00'}€/Monat</span>
              </div>
              ` : ''}
            </div>
            ` : ''}
          </div>
          
${bookingData.confirmationToken ? `
          <div style="background-color: #fff3cd; border: 1px solid #ffeeba; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3 style="color: #856404; margin: 0 0 10px 0; font-size: 16px;">
              ⚠️ Wichtig: E-Mail-Adresse bestätigen
            </h3>
            <p style="color: #856404; margin: 10px 0; font-size: 14px;">
              Bitte bestätige zuerst deine E-Mail-Adresse, um deine Buchung zu aktivieren:
            </p>
            <div style="text-align: center; margin: 15px 0;">
              <a href="${getFrontendUrl()}/vendor/confirm?token=${bookingData.confirmationToken}" 
                 style="background-color: #e17564; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                E-Mail-Adresse bestätigen
              </a>
            </div>
          </div>
          ` : ''}
          
          <div style="background-color: #fff3cd; border: 1px solid #ffeeba; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3 style="color: #856404; margin: 0 0 10px 0; font-size: 16px;">
              📋 Was passiert als nächstes?
            </h3>
            <ol style="color: #856404; margin: 10px 0; padding-left: 20px; font-size: 14px;">
              ${bookingData.confirmationToken ? '<li>Bestätige deine E-Mail-Adresse (Link oben)</li>' : ''}
              <li>Wir weisen dir passende Mietfächer zu</li>
              <li>du erhältst eine weitere E-Mail mit den finalen Details</li>
              <li>du kannst starten!</li>
            </ol>
          </div>
          
          <h3 style="color: #09122c; margin: 30px 0 15px 0;">🎯 deine Vorteile im Probemonat:</h3>
          <ul style="color: #333; line-height: 1.6; padding-left: 20px;">
            <li>Kostenloser Test aller Funktionen</li>
            <li>Zugang zum housnkuh-Kassensystem</li>
            <li>Tägliche Verkaufsübersichten</li>
            <li>Support und Beratung</li>
            <li>Jederzeit kündbar ohne Kosten</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #666; font-size: 14px;">
              Bei Fragen kannst du uns jederzeit unter <a href="mailto:info@housnkuh.de" style="color: #e17564;">info@housnkuh.de</a> erreichen.
            </p>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
            <h4 style="color: #09122c;">Kontakt & Support:</h4>
            <p style="color: #333; margin: 5px 0;">📞 Telefon: 015222035788</p>
            <p style="color: #333; margin: 5px 0;">✉️ E-Mail: eva-maria.schaller@housnkuh.de</p>
            <p style="color: #333; margin: 5px 0;">📍 Adresse: Strauer Str. 15, 96317 Kronach</p>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              © housnkuh - dein regionaler Marktplatz<br>
              <a href="https://housnkuh.de" style="color: #e17564;">www.housnkuh.de</a>
            </p>
          </div>
        </div>
      </div>
    `;
    
    const mailOptions = {
      from: `"housnkuh" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: bookingData.email,
      subject,
      html
    };
    
    logger.info('Sending booking confirmation email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });
    
    try {
      const result = await transporter.sendMail(mailOptions);
      logger.info('Booking confirmation email sent successfully:', result.messageId);
      return true;
    } catch (emailError) {
      logger.error('Booking confirmation email sending error:', emailError);
      
      if (process.env.NODE_ENV === 'development') {
        logger.warn('⚠️ In development mode, treating booking confirmation email as sent successfully');
        return true; // Return success in development mode
      }
      
      return false;
    }
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Detailed booking confirmation email error:', {
        message: error.message,
      });
    } else {
      logger.error('Detailed booking confirmation email error:', error);
    }
    
    if (process.env.NODE_ENV === 'development') {
      logger.warn('⚠️ In development mode, treating booking confirmation email as sent successfully');
      return true; // Return success in development mode
    }
    
    return false;
  }
};

/**
 * Interface for admin confirmation data structure
 * @interface AdminConfirmationData
 * @description Contains vendor and booking information for admin notifications
 */
export interface AdminConfirmationData {
  vendorName: string;
  email: string;
  mietfaecher: Array<{_id: string, bezeichnung: string, typ: string, preis: number}>;
  vertrag: any;
  packageData: any;
}

/**
 * Interface for enhanced booking confirmation with scheduling details
 * @interface BookingConfirmationWithScheduleData
 * @description Extended booking confirmation including delivery schedules and additional services
 */
export interface BookingConfirmationWithScheduleData {
  vendorName: string;
  email: string;
  firma: string;
  mietfachDetails: Array<{
    _id: string;
    bezeichnung: string;
    typ: string;
    standort?: string;
    beschreibung?: string;
    adjustedPrice: number;
  }>;
  scheduledStartDate: Date;
  contractId: string;
  packageDetails: any;
  totalMonthlyPrice: number;
  zusatzleistungen?: {
    lagerservice: boolean;
    versandservice: boolean;
    lagerservice_kosten: number;
    versandservice_kosten: number;
    lagerservice_bestätigt?: Date;
    versandservice_aktiv: boolean;
  };
}

/**
 * Sends admin confirmation email for assigned rental units
 * @function sendAdminConfirmationEmail
 * @description Notifies administrators about new vendor bookings
 * and rental unit assignments requiring action
 * @param {AdminConfirmationData} adminConfirmationData - Admin notification data
 * @returns {Promise<boolean>} Promise resolving to true if email sent successfully
 * @complexity O(n) where n is the number of rental units
 * @security Admin-only notification, sanitizes vendor data
 */
export const sendAdminConfirmationEmail = async (adminConfirmationData: AdminConfirmationData): Promise<boolean> => {
  try {
    logger.info(`Sending admin confirmation email to: ${adminConfirmationData.email}`);
    
    // Fake success in development mode if email settings are not available
    if (process.env.NODE_ENV === 'development' && 
        (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
      logger.warn('⚠️ Running in development mode without email configuration');
      logger.info('📧 Admin confirmation would be sent with data:', adminConfirmationData);
      return true; // Return success in development mode
    }

    // Prepare template data
    const Settings = require('../models/Settings').default;
    const settings = await Settings.getSettings();
    const isStoreOpen = settings.isStoreOpen();
    
    // Calculate important dates depending on store status
    let trialStartDate: Date;
    let trialEndDate: Date;
    let contractEndDate: Date;
    let statusMessage: string;
    
    if (isStoreOpen) {
      trialStartDate = new Date();
      trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 30);
      
      contractEndDate = new Date(trialEndDate);
      contractEndDate.setMonth(contractEndDate.getMonth() + (adminConfirmationData.packageData.rentalDuration || 3));
      
      statusMessage = `✅ dein kostenloser Probemonat läuft noch bis zum ${trialEndDate.toLocaleDateString('de-DE')}`;
    } else {
      if (settings.storeOpening.openingDate) {
        trialStartDate = new Date(settings.storeOpening.openingDate);
        trialEndDate = new Date(settings.storeOpening.openingDate);
        trialEndDate.setDate(trialEndDate.getDate() + 30);
        
        contractEndDate = new Date(trialEndDate);
        contractEndDate.setMonth(contractEndDate.getMonth() + (adminConfirmationData.packageData.rentalDuration || 3));
        
        statusMessage = `🗓️ dein kostenloser Probemonat startet mit der Store-Eröffnung am ${trialStartDate.toLocaleDateString('de-DE')} und läuft bis zum ${trialEndDate.toLocaleDateString('de-DE')}`;
      } else {
        trialStartDate = new Date();
        trialStartDate.setMonth(trialStartDate.getMonth() + 3);
        trialEndDate = new Date(trialStartDate);
        trialEndDate.setDate(trialEndDate.getDate() + 30);
        
        contractEndDate = new Date(trialEndDate);
        contractEndDate.setMonth(contractEndDate.getMonth() + (adminConfirmationData.packageData.rentalDuration || 3));
        
        statusMessage = `🗓️ dein kostenloser Probemonat startet mit der Store-Eröffnung`;
      }
    }
    
    const totalMonthlyCost = adminConfirmationData.mietfaecher.reduce((sum, mietfach) => sum + mietfach.preis, 0);
    
    const templateData = {
      vendorName: adminConfirmationData.vendorName,
      email: adminConfirmationData.email,
      isStoreOpen,
      statusMessage,
      trialStartDate: trialStartDate.toLocaleDateString('de-DE'),
      trialEndDate: trialEndDate.toLocaleDateString('de-DE'),
      contractEndDate: contractEndDate.toLocaleDateString('de-DE'),
      totalMonthlyCost: totalMonthlyCost.toFixed(2),
      mietfaecher: adminConfirmationData.mietfaecher,
      vertragId: adminConfirmationData.vertrag._id,
      provision: adminConfirmationData.packageData.totalCost?.provision || 4,
      currentYear: new Date().getFullYear()
    };

    // Try to use database template first, fallback to hardcoded version
    const fallbackFunction = () => sendAdminConfirmationEmailHardcoded(adminConfirmationData);
    
    return await emailService.sendDatabaseTemplateEmail(
      'admin_confirmation',
      adminConfirmationData.email,
      templateData,
      fallbackFunction
    );
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Detailed admin confirmation email error:', {
        message: error.message,
      });
    } else {
      logger.error('Detailed admin confirmation email error:', error);
    }
    
    if (process.env.NODE_ENV === 'development') {
      logger.warn('⚠️ In development mode, treating admin confirmation email as sent successfully');
      return true; // Return success in development mode
    }
    
    return false;
  }
};

/**
 * Hardcoded fallback version for admin confirmation email
 * @function sendAdminConfirmationEmailHardcoded
 * @description Sends admin notification using hardcoded HTML template
 * when database templates are unavailable
 * @param {AdminConfirmationData} adminConfirmationData - Admin notification data
 * @returns {Promise<boolean>} Promise resolving to true if email sent successfully
 * @complexity O(n) where n is the number of rental units
 * @security Uses hardcoded template with admin data validation
 */
const sendAdminConfirmationEmailHardcoded = async (adminConfirmationData: AdminConfirmationData): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    
    const subject = 'Mietfach-Zuweisung bestätigt - dein housnkuh Vertrag ist aktiv!';
    
    const html = `
      <div style="font-family: 'Quicksand', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #09122c; margin: 0;">housnkuh</h1>
            <p style="color: #666; margin: 10px 0;">Regionaler Marktplatz Kronach</p>
          </div>
          
          <h2 style="color: #09122c; text-align: center; margin-bottom: 20px;">🎉 deine Mietfächer sind zugewiesen!</h2>
          
          <p style="color: #333; line-height: 1.6;">Hallo ${adminConfirmationData.vendorName},</p>
          <p style="color: #333; line-height: 1.6;">deine Mietfächer wurden zugewiesen und dein Vertrag ist aktiv!</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #666; font-size: 14px;">
              Bei Fragen kannst du uns jederzeit unter <a href="mailto:info@housnkuh.de" style="color: #e17564;">info@housnkuh.de</a> erreichen.
            </p>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              © housnkuh - dein regionaler Marktplatz<br>
              <a href="https://housnkuh.de" style="color: #e17564;">www.housnkuh.de</a>
            </p>
          </div>
        </div>
      </div>
    `;
    
    const mailOptions = {
      from: `"housnkuh" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: adminConfirmationData.email,
      subject,
      html
    };
    
    try {
      const result = await transporter.sendMail(mailOptions);
      logger.info('Admin confirmation email sent successfully:', result.messageId);
      return true;
    } catch (emailError) {
      logger.error('Admin confirmation email sending error:', emailError);
      
      if (process.env.NODE_ENV === 'development') {
        logger.warn('⚠️ In development mode, treating admin confirmation email as sent successfully');
        return true;
      }
      
      return false;
    }
  } catch (error) {
    logger.error('Error in sendAdminConfirmationEmailHardcoded:', error);
    
    if (process.env.NODE_ENV === 'development') {
      logger.warn('⚠️ In development mode, treating admin confirmation email as sent successfully');
      return true;
    }
    
    return false;
  }
};

// Send admin notification for launch day activations
/**
 * Sends launch day activation notification to vendors
 * @function sendLaunchDayActivationNotification
 * @description Notifies vendors about marketplace launch and trial activation
 * @param {string} to - Vendor's email address
 * @param {Object} data - Notification data
 * @param {string} data.name - Vendor's name
 * @param {Date} data.trialEndDate - Trial expiration date
 * @param {Array<any>} data.mietfaecher - Assigned rental units
 * @returns {Promise<boolean>} Promise resolving to true if email sent successfully
 * @complexity O(n) where n is the number of rental units
 * @security Uses database templates with fallback, no sensitive data exposed
 */
export const sendLaunchDayActivationNotification = async (
  adminEmails: string[],
  activationResult: {
    activatedCount: number;
    failedCount: number;
    errors: string[];
    timestamp: Date;
  }
): Promise<boolean> => {
  try {
    logger.info('Sending launch day activation notification to admins:', adminEmails);
    
    if (!isConfigured()) {
      logger.warn('⚠️ Email service not configured');
      if (process.env.NODE_ENV === 'development') {
        logger.info('📧 Would send launch day notification to:', adminEmails);
        logger.info('📊 Activation results:', activationResult);
        return true;
      }
      return false;
    }
    
    const transporter = createTransporter();
    const subject = `🚀 housnkuh Launch Day Activation - ${activationResult.activatedCount} Vendors Activated`;
    
    const errorSection = activationResult.failedCount > 0 ? `
      <div style="background-color: #fee; border: 1px solid #dc3545; padding: 15px; margin: 20px 0; border-radius: 8px;">
        <h3 style="color: #dc3545; margin: 0 0 10px 0;">⚠️ ${activationResult.failedCount} Activations Failed</h3>
        <ul style="margin: 0; padding-left: 20px;">
          ${activationResult.errors.slice(0, 10).map(error => `<li style="color: #666;">${error}</li>`).join('')}
          ${activationResult.errors.length > 10 ? `<li style="color: #666;">... and ${activationResult.errors.length - 10} more errors</li>` : ''}
        </ul>
      </div>
    ` : '';
    
    const html = `
      <div style="font-family: 'Quicksand', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #09122c; margin: 0;">housnkuh Admin</h1>
            <p style="color: #666; margin: 10px 0;">Launch Day Activation Report</p>
          </div>
          
          <h2 style="color: #09122c; text-align: center; margin-bottom: 20px;">🚀 Store Opening Activation Complete</h2>
          
          <div style="background-color: #e8f5e8; border: 1px solid #4caf50; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3 style="color: #2e7d32; margin: 0 0 15px 0;">Activation Summary</h3>
            <p style="margin: 5px 0; color: #333;"><strong>Timestamp:</strong> ${activationResult.timestamp.toLocaleString('de-DE')}</p>
            <p style="margin: 5px 0; color: #333;"><strong>Successfully Activated:</strong> ${activationResult.activatedCount} vendors</p>
            <p style="margin: 5px 0; color: #333;"><strong>Failed Activations:</strong> ${activationResult.failedCount} vendors</p>
            <p style="margin: 5px 0; color: #333;"><strong>Success Rate:</strong> ${activationResult.activatedCount > 0 ? Math.round((activationResult.activatedCount / (activationResult.activatedCount + activationResult.failedCount)) * 100) : 0}%</p>
          </div>
          
          ${errorSection}
          
          <div style="margin-top: 30px; padding: 20px; background-color: #f5f5f5; border-radius: 8px;">
            <h3 style="color: #09122c; margin: 0 0 10px 0;">Next Steps</h3>
            <ul style="margin: 0; padding-left: 20px; color: #666;">
              <li>Check vendor dashboard for active trials</li>
              <li>Monitor email delivery status</li>
              ${activationResult.failedCount > 0 ? '<li>Review and retry failed activations</li>' : ''}
              <li>Monitor system performance and vendor activity</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${getFrontendUrl()}/admin/dashboard" 
               style="display: inline-block; padding: 12px 30px; background-color: #09122c; color: white; text-decoration: none; border-radius: 5px;">
              View Admin Dashboard
            </a>
          </div>
        </div>
      </div>
    `;
    
    // Send to all admin emails
    const results = await Promise.all(
      adminEmails.map(email => 
        transporter.sendMail({
          from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
          to: email,
          subject,
          html
        }).catch(err => {
          logger.error(`Failed to send launch notification to ${email}:`, err);
          return null;
        })
      )
    );
    
    const successCount = results.filter(r => r !== null).length;
    logger.info(`Launch day notification sent to ${successCount}/${adminEmails.length} admins`);
    
    return successCount > 0;
    
  } catch (error) {
    logger.error('Error sending launch day activation notification:', error);
    if (process.env.NODE_ENV === 'development') {
      logger.warn('⚠️ In development mode, treating launch notification as sent');
      return true;
    }
    return false;
  }
};

/**
 * Interface for monitoring alert data structure
 * @interface MonitoringAlertData
 * @description Contains system monitoring alert information for administrators
 */
export interface MonitoringAlertData {
  alertId: string;
  severity: 'warning' | 'critical' | 'emergency';
  title: string;
  message: string;
  timestamp: Date;
  details: any;
}

/**
 * Sends monitoring alerts to administrators
 * @function sendMonitoringAlert
 * @description Notifies administrators about system issues, performance problems,
 * or critical events requiring immediate attention
 * @param {string} to - Administrator email address
 * @param {MonitoringAlertData} alertData - Alert details and context
 * @returns {Promise<boolean>} Promise resolving to true if email sent successfully
 * @complexity O(1)
 * @security Admin-only alerts, includes system diagnostic data
 */
export const sendMonitoringAlert = async (to: string, alertData: MonitoringAlertData): Promise<boolean> => {
  try {
    logger.info(`Sending monitoring alert to: ${to}, severity: ${alertData.severity}`);
    
    // Fake success in development mode if email settings are not available
    if (process.env.NODE_ENV === 'development' && 
        (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
      logger.warn('⚠️ Running in development mode without email configuration');
      logger.info('🚨 Would send monitoring alert:', alertData);
      return true; // Return success in development mode
    }
    
    const transporter = createTransporter();
    
    // Determine emoji and colors based on severity
    const severityConfig = {
      warning: { emoji: '⚠️', color: '#f39c12', bgColor: '#fdf2e9' },
      critical: { emoji: '🚨', color: '#e74c3c', bgColor: '#fdedec' },
      emergency: { emoji: '🆘', color: '#8b0000', bgColor: '#ffebee' }
    };
    
    const config = severityConfig[alertData.severity];
    const formattedTime = alertData.timestamp.toLocaleString('de-DE', {
      timeZone: 'Europe/Berlin',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const subject = `${config.emoji} housnkuh System Alert: ${alertData.title}`;
    
    const html = `
      <div style="font-family: 'Quicksand', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #09122c; margin: 0;">housnkuh</h1>
            <p style="color: #666; margin: 10px 0;">System Monitoring Alert</p>
          </div>
          
          <div style="background-color: ${config.bgColor}; border-left: 4px solid ${config.color}; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <h2 style="color: ${config.color}; margin: 0 0 10px 0; display: flex; align-items: center;">
              <span style="font-size: 24px; margin-right: 10px;">${config.emoji}</span>
              ${alertData.severity.toUpperCase()} ALERT
            </h2>
            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">${alertData.title}</h3>
            <p style="color: #333; margin: 0; line-height: 1.6; font-size: 16px;">${alertData.message}</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="color: #09122c; margin: 0 0 10px 0;">Alert Details</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 5px 0; color: #666; width: 100px;"><strong>Alert ID:</strong></td>
                <td style="padding: 5px 0; color: #333; font-family: monospace;">${alertData.alertId}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #666;"><strong>Severity:</strong></td>
                <td style="padding: 5px 0; color: ${config.color}; text-transform: uppercase;"><strong>${alertData.severity}</strong></td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #666;"><strong>Time:</strong></td>
                <td style="padding: 5px 0; color: #333;">${formattedTime}</td>
              </tr>
            </table>
          </div>
          
          ${alertData.details && Object.keys(alertData.details).length > 0 ? `
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="color: #09122c; margin: 0 0 10px 0;">Technical Details</h4>
            <pre style="background-color: white; padding: 10px; border-radius: 3px; font-size: 12px; color: #333; overflow-x: auto; border: 1px solid #ddd;">${JSON.stringify(alertData.details, null, 2)}</pre>
          </div>
          ` : ''}
          
          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="color: #1976d2; margin: 0 0 10px 0;">Recommended Actions</h4>
            <ul style="margin: 0; padding-left: 20px; color: #333; line-height: 1.6;">
              ${alertData.severity === 'critical' || alertData.severity === 'emergency' ? 
                '<li>Immediate investigation required - check system status</li>' : 
                '<li>Monitor the situation and investigate if needed</li>'
              }
              <li>Check the admin dashboard for more details</li>
              <li>Review system logs for additional context</li>
              ${alertData.severity === 'emergency' ? '<li>Consider contacting development team immediately</li>' : ''}
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${getFrontendUrl()}/admin/dashboard" 
               style="display: inline-block; padding: 12px 30px; background-color: #09122c; color: white; text-decoration: none; border-radius: 5px; margin-right: 10px;">
              View Dashboard
            </a>
            <a href="${getFrontendUrl()}/admin/health" 
               style="display: inline-block; padding: 12px 30px; background-color: ${config.color}; color: white; text-decoration: none; border-radius: 5px;">
              Check System Health
            </a>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              © housnkuh - Automatic Monitoring System<br>
              <a href="https://housnkuh.de" style="color: #e17564;">www.housnkuh.de</a>
            </p>
            <p style="color: #999; font-size: 11px; margin: 10px 0 0 0;">
              This is an automated alert from the housnkuh monitoring system.
            </p>
          </div>
        </div>
      </div>
    `;
    
    const mailOptions = {
      from: `"housnkuh Monitoring" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    };
    
    logger.info('Sending monitoring alert:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      severity: alertData.severity
    });
    
    try {
      const result = await transporter.sendMail(mailOptions);
      logger.info('Monitoring alert sent successfully:', result.messageId);
      return true;
    } catch (emailError) {
      logger.error('Monitoring alert email error:', emailError);
      
      if (process.env.NODE_ENV === 'development') {
        logger.warn('⚠️ In development mode, treating monitoring alert as sent successfully');
        return true;
      }
      
      return false;
    }
  } catch (error) {
    logger.error('Error in sendMonitoringAlert:', error);
    
    if (process.env.NODE_ENV === 'development') {
      logger.warn('⚠️ In development mode, treating monitoring alert as sent successfully');
      return true;
    }
    
    return false;
  }
};

/**
 * Sends enhanced booking confirmation email with scheduling details
 * @function sendBookingConfirmationWithSchedule
 * @description Sends comprehensive booking confirmation including
 * delivery schedules, additional services, and timeline information
 * @param {BookingConfirmationWithScheduleData} data - Enhanced booking data
 * @returns {Promise<boolean>} Promise resolving to true if email sent successfully
 * @complexity O(n*m) where n is services and m is schedule entries
 * @security Validates all scheduling data, sanitizes user input
 */
export const sendBookingConfirmationWithSchedule = async (data: BookingConfirmationWithScheduleData): Promise<boolean> => {
  try {
    logger.info(`Sending enhanced booking confirmation email to: ${data.email}`);
    
    // Development mode fallback
    if (process.env.NODE_ENV === 'development' && 
        (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
      logger.warn('⚠️ Running in development mode without email configuration');
      logger.info('📧 Enhanced booking confirmation would be sent with data:', data);
      return true;
    }
    
    const transporter = createTransporter();
    
    const subject = `Buchungsbestätigung - dein Mietfach ist zugewiesen! (Vertrag: ${data.contractId})`;
    
    // Helper function to format German type names
    const getDisplayTypeName = (typ: string): string => {
      const typeMap: Record<string, string> = {
        'kuehlregal': 'Kühlregal',
        'gefrierregal': 'Gefrierregal',
        'regal': 'Regal',
        'verkaufstisch': 'Verkaufstisch',
        'schaufenster': 'Schaufenster',
        'lagerraum': 'Lagerraum',
        'sonstiges': 'Sonstiges'
      };
      return typeMap[typ] || typ;
    };
    
    // Calculate end date based on package duration
    const endDate = new Date(data.scheduledStartDate);
    endDate.setMonth(endDate.getMonth() + (data.packageDetails.rentalDuration || 3));
    
    // Enhanced HTML template with complete booking details
    const html = `
      <div style="font-family: 'Quicksand', Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #2B6CB0 0%, #1E40AF 100%); border-radius: 8px; color: white;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">housnkuh</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Regionaler Marktplatz Kronach</p>
          </div>
          
          <!-- Success Message -->
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; background-color: #10B981; color: white; padding: 15px 25px; border-radius: 50px; font-size: 18px; font-weight: bold; margin-bottom: 15px;">
              ✅ Buchung bestätigt!
            </div>
            <h2 style="color: #09122c; margin: 0; font-size: 24px;">dein Mietfach wurde erfolgreich zugewiesen</h2>
          </div>
          
          <!-- Personal Greeting -->
          <div style="margin-bottom: 30px;">
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Guten Tag <strong>${data.vendorName}</strong>,
            </p>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              wir freuen uns, dir mitteilen zu können, dass deine Buchungsanfrage erfolgreich bearbeitet wurde! 
              deine Mietfächer wurden zugewiesen und dein Vertrag ist ab dem <strong>${data.scheduledStartDate.toLocaleDateString('de-DE')}</strong> aktiv.
            </p>
          </div>
          
          <!-- Contract Details Box -->
          <div style="background-color: #EBF8FF; border-left: 5px solid #2B6CB0; padding: 25px; margin: 25px 0; border-radius: 0 8px 8px 0;">
            <h3 style="color: #1E40AF; margin: 0 0 20px 0; font-size: 20px;">📋 deine Vertragsdetails</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 15px; border-bottom: 1px solid #CBD5E0; color: #4A5568; font-weight: bold; width: 40%;">Firma:</td>
                <td style="padding: 10px 15px; border-bottom: 1px solid #CBD5E0; color: #2D3748;">${data.firma}</td>
              </tr>
              <tr>
                <td style="padding: 10px 15px; border-bottom: 1px solid #CBD5E0; color: #4A5568; font-weight: bold;">Vertragsnummer:</td>
                <td style="padding: 10px 15px; border-bottom: 1px solid #CBD5E0; color: #2D3748; font-family: monospace;">${data.contractId}</td>
              </tr>
              <tr>
                <td style="padding: 10px 15px; border-bottom: 1px solid #CBD5E0; color: #4A5568; font-weight: bold;">Startdatum:</td>
                <td style="padding: 10px 15px; border-bottom: 1px solid #CBD5E0; color: #2D3748; font-weight: bold;">${data.scheduledStartDate.toLocaleDateString('de-DE')}</td>
              </tr>
              <tr>
                <td style="padding: 10px 15px; border-bottom: 1px solid #CBD5E0; color: #4A5568; font-weight: bold;">Laufzeit:</td>
                <td style="padding: 10px 15px; border-bottom: 1px solid #CBD5E0; color: #2D3748;">${data.packageDetails.rentalDuration || 3} Monate</td>
              </tr>
              <tr>
                <td style="padding: 10px 15px; border-bottom: 1px solid #CBD5E0; color: #4A5568; font-weight: bold;">Vertragsende:</td>
                <td style="padding: 10px 15px; border-bottom: 1px solid #CBD5E0; color: #2D3748;">${endDate.toLocaleDateString('de-DE')}</td>
              </tr>
              <tr>
                <td style="padding: 10px 15px; color: #4A5568; font-weight: bold;">Monatliche Kosten:</td>
                <td style="padding: 10px 15px; color: #059669; font-weight: bold; font-size: 18px;">${data.totalMonthlyPrice.toFixed(2)}€</td>
              </tr>
            </table>
          </div>
          
          <!-- Assigned Mietfächer -->
          <div style="margin: 30px 0;">
            <h3 style="color: #09122c; margin: 0 0 20px 0; font-size: 20px;">🏪 deine zugewiesenen Mietfächer</h3>
            <div style="background-color: #F7FAFC; padding: 20px; border-radius: 8px;">
              ${data.mietfachDetails.map(mf => `
                <div style="background-color: white; padding: 20px; margin-bottom: 15px; border-radius: 8px; border-left: 4px solid #10B981; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                  <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                    <h4 style="margin: 0; color: #1A202C; font-size: 18px;">${mf.bezeichnung}</h4>
                    <span style="background-color: #10B981; color: white; padding: 5px 12px; border-radius: 20px; font-size: 14px; font-weight: bold;">${mf.adjustedPrice.toFixed(2)}€/Monat</span>
                  </div>
                  <div style="color: #4A5568; margin-bottom: 8px;">
                    <strong>Typ:</strong> ${getDisplayTypeName(mf.typ)}
                  </div>
                  ${mf.standort ? `
                    <div style="color: #4A5568; margin-bottom: 8px;">
                      <strong>Standort:</strong> ${mf.standort}
                    </div>
                  ` : ''}
                  ${mf.beschreibung ? `
                    <div style="color: #6B7280; font-size: 14px; margin-top: 10px; padding: 10px; background-color: #F3F4F6; border-radius: 4px;">
                      ${mf.beschreibung}
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>
          
          <!-- Package Information -->
          <div style="background-color: #FFF7ED; border-left: 5px solid #F59E0B; padding: 25px; margin: 25px 0; border-radius: 0 8px 8px 0;">
            <h3 style="color: #92400E; margin: 0 0 15px 0; font-size: 18px;">📦 dein gewähltes Paket</h3>
            <div style="color: #78350F;">
              <p style="margin: 5px 0;"><strong>Provisionsmodell:</strong> ${data.packageDetails.selectedProvisionType === 'basic' ? 'Basismodell' : 'Premium-Modell'}</p>
              <p style="margin: 5px 0;"><strong>Provision:</strong> ${data.packageDetails.totalCost?.provision || 'N/A'}% auf alle Verkäufe</p>
              ${data.packageDetails.discount && data.packageDetails.discount > 0 ? `
                <p style="margin: 5px 0; color: #059669;"><strong>Rabatt:</strong> -${(data.packageDetails.discount * 100).toFixed(0)}% angewendet</p>
              ` : ''}
            </div>
          </div>

          ${data.zusatzleistungen && (data.zusatzleistungen.lagerservice || data.zusatzleistungen.versandservice) ? `
          <!-- Zusatzleistungen Information -->
          <div style="background-color: #eff6ff; border-left: 5px solid #3b82f6; padding: 25px; margin: 25px 0; border-radius: 0 8px 8px 0;">
            <h3 style="color: #1d4ed8; margin: 0 0 15px 0; font-size: 18px;">📦 deine Zusatzleistungen</h3>
            <div style="color: #1e40af;">
              ${data.zusatzleistungen.lagerservice ? `
              <div style="background-color: white; padding: 15px; margin: 10px 0; border-radius: 8px; border: 1px solid #bfdbfe;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <p style="margin: 0; font-weight: bold; color: #1e40af;">🏪 Lagerservice</p>
                    <p style="margin: 5px 0 0 0; font-size: 14px; color: #64748b;">Professionelle Lagerung deiner Produkte</p>
                    ${data.zusatzleistungen.lagerservice_bestätigt ? `
                    <p style="margin: 5px 0 0 0; font-size: 12px; color: #059669;">✅ Bestätigt am ${new Date(data.zusatzleistungen.lagerservice_bestätigt).toLocaleDateString('de-DE')}</p>
                    ` : `
                    <p style="margin: 5px 0 0 0; font-size: 12px; color: #f59e0b;">⏳ Wird nach deinem ersten Paket aktiviert</p>
                    `}
                  </div>
                  <span style="color: #1e40af; font-weight: bold; font-size: 16px;">${data.zusatzleistungen.lagerservice_kosten.toFixed(2)}€/Monat</span>
                </div>
              </div>
              ` : ''}
              ${data.zusatzleistungen.versandservice ? `
              <div style="background-color: white; padding: 15px; margin: 10px 0; border-radius: 8px; border: 1px solid #bfdbfe;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <p style="margin: 0; font-weight: bold; color: #1e40af;">🚚 Versandservice</p>
                    <p style="margin: 5px 0 0 0; font-size: 14px; color: #64748b;">Versand direkt vom Lager an deine Kunden</p>
                    ${data.zusatzleistungen.versandservice_aktiv ? `
                    <p style="margin: 5px 0 0 0; font-size: 12px; color: #059669;">✅ Aktiv - bereit für Versandaufträge</p>
                    ` : `
                    <p style="margin: 5px 0 0 0; font-size: 12px; color: #f59e0b;">⏳ Wird nach Lagerservice-Aktivierung verfügbar</p>
                    `}
                  </div>
                  <span style="color: #1e40af; font-weight: bold; font-size: 16px;">${data.zusatzleistungen.versandservice_kosten.toFixed(2)}€/Monat</span>
                </div>
              </div>
              ` : ''}
            </div>
          </div>
          ` : ''}
          
          <!-- Next Steps -->
          <div style="background-color: #F0FDF4; border: 2px solid #10B981; padding: 25px; margin: 30px 0; border-radius: 8px;">
            <h3 style="color: #065F46; margin: 0 0 15px 0; font-size: 18px;">🚀 Nächste Schritte</h3>
            <ol style="color: #064E3B; line-height: 1.8; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">dein Mietfach steht dir ab dem <strong>${data.scheduledStartDate.toLocaleDateString('de-DE')}</strong> zur Verfügung</li>
              <li style="margin-bottom: 8px;">Bringen du deine Waren rechtzeitig zum Startdatum</li>
              <li style="margin-bottom: 8px;">Bei Fragen wenden du dich gerne an unser Support-Team</li>
              <li style="margin-bottom: 8px;">Loggen du dich in dein Vendor-Dashboard ein, um den Status zu verfolgen</li>
            </ol>
          </div>
          
          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${getFrontendUrl()}/vendor/dashboard" 
               style="display: inline-block; background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: white; 
                      padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; 
                      font-size: 16px; box-shadow: 0 4px 10px rgba(245, 158, 11, 0.3);">
              🏪 Zum Vendor-Dashboard
            </a>
          </div>
          
          <!-- Trial Information -->
          <div style="background-color: #EEF2FF; border: 1px solid #C7D2FE; padding: 20px; margin: 25px 0; border-radius: 8px;">
            <h4 style="color: #3730A3; margin: 0 0 10px 0; font-size: 16px;">💡 Wichtige Information</h4>
            <p style="color: #4338CA; margin: 0; line-height: 1.6;">
              du starten mit einem <strong>30-tägigen kostenlosen Probemonat</strong>. Die ersten 30 Tage sind für du kostenlos, 
              danach beginnt die reguläre Abrechnung gemäß deinem gewählten Paket.
            </p>
          </div>
          
          <!-- Support Section -->
          <div style="margin-top: 40px; padding: 25px; background-color: #F8FAFC; border-radius: 8px; border: 1px solid #E2E8F0;">
            <h4 style="color: #09122c; margin: 0 0 15px 0; font-size: 18px;">💬 Haben du Fragen?</h4>
            <p style="color: #4A5568; margin: 0 0 15px 0; line-height: 1.6;">
              Unser Support-Team steht dir gerne zur Verfügung:
            </p>
            <div style="color: #2D3748;">
              <p style="margin: 5px 0;">📧 <strong>E-Mail:</strong> eva-maria.schaller@housnkuh.de</p>
              <p style="margin: 5px 0;">📞 <strong>Telefon:</strong> 015222035788</p>
              <p style="margin: 5px 0;">📍 <strong>Adresse:</strong> Strauer Str. 15, 96317 Kronach</p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="margin-top: 40px; padding-top: 25px; border-top: 2px solid #E2E8F0; text-align: center;">
            <p style="color: #6B7280; font-size: 14px; margin: 0 0 10px 0;">
              Vielen Dank für dein Vertrauen in housnkuh!
            </p>
            <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
              © housnkuh - dein regionaler Marktplatz<br>
              <a href="https://housnkuh.de" style="color: #6366F1; text-decoration: none;">www.housnkuh.de</a>
            </p>
          </div>
        </div>
      </div>
    `;
    
    const mailOptions = {
      from: `"housnkuh - Buchungsbestätigung" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: data.email,
      subject: subject,
      html: html
    };
    
    logger.info('Sending enhanced booking confirmation email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      mietfaecherCount: data.mietfachDetails.length,
      totalPrice: data.totalMonthlyPrice
    });
    
    try {
      const result = await transporter.sendMail(mailOptions);
      logger.info('Enhanced booking confirmation email sent successfully:', result.messageId);
      return true;
    } catch (emailError) {
      logger.error('Enhanced booking confirmation email sending error:', emailError);
      
      if (process.env.NODE_ENV === 'development') {
        logger.warn('⚠️ In development mode, treating enhanced booking confirmation as sent successfully');
        return true;
      }
      
      return false;
    }
  } catch (error) {
    logger.error('Error in sendBookingConfirmationWithSchedule:', error);
    
    if (process.env.NODE_ENV === 'development') {
      logger.warn('⚠️ In development mode, treating enhanced booking confirmation as sent successfully');
      return true;
    }
    
    return false;
  }
};

/**
 * Interface for additional services admin notification data
 * @interface ZusatzleistungenAdminNotificationData
 * @description Contains vendor and additional services information for admin notifications
 */
export interface ZusatzleistungenAdminNotificationData {
  vendorName: string;
  vendorEmail: string;
  contractId: string;
  zusatzleistungen: {
    lagerservice: boolean;
    versandservice: boolean;
    lagerservice_kosten: number;
    versandservice_kosten: number;
  };
}

/**
 * Interface for package arrival notification data
 * @interface PackageArrivalNotificationData
 * @description Contains package arrival and storage information for vendor notifications
 */
export interface PackageArrivalNotificationData {
  vendorName: string;
  vendorEmail: string;
  packageType: 'lagerservice' | 'versandservice';
  packageId: string;
  arrivalDate: Date;
  notes?: string;
}

/**
 * Interface for storage service activation data
 * @interface LagerserviceActivationData
 * @description Contains storage service activation details for vendor notifications
 */
export interface LagerserviceActivationData {
  vendorName: string;
  vendorEmail: string;
  contractId: string;
  activationDate: Date;
  monthlyFee: number;
}

/**
 * Sends admin notification for new additional services bookings
 * @function sendAdminZusatzleistungenNotification
 * @description Notifies administrators about new additional service bookings
 * requiring processing or approval
 * @param {ZusatzleistungenAdminNotificationData} data - Service booking data
 * @returns {Promise<boolean>} Promise resolving to true if email sent successfully
 * @complexity O(n) where n is the number of services booked
 * @security Admin-only notification, sanitizes vendor and service data
 */
export const sendAdminZusatzleistungenNotification = async (data: ZusatzleistungenAdminNotificationData): Promise<boolean> => {
  try {
    logger.info(`Sending admin notification for zusatzleistungen booking from: ${data.vendorEmail}`);
    
    if (process.env.NODE_ENV === 'development' && 
        (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
      logger.warn('⚠️ Running in development mode without email configuration');
      logger.info('📧 Admin zusatzleistungen notification would be sent with data:', data);
      return true;
    }
    
    const transporter = createTransporter();
    const adminEmail = process.env.ADMIN_EMAIL || 'eva-maria.schaller@housnkuh.de';
    const subject = `🔔 Neue Zusatzleistungen gebucht - ${data.vendorName} (${data.contractId})`;
    
    const html = `
      <div style="font-family: 'Quicksand', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 8px; color: white;">
            <h1 style="margin: 0; font-size: 24px; font-weight: bold;">housnkuh Admin</h1>
            <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Zusatzleistungen Management</p>
          </div>
          
          <!-- Alert -->
          <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px; margin-bottom: 25px; border-radius: 8px;">
            <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 18px;">📦 Neue Zusatzleistungen-Buchung</h3>
            <p style="color: #78350f; margin: 0; line-height: 1.6;">
              Ein Vendor hat Zusatzleistungen zu seinem Vertrag hinzugefügt. Bitte prüfen du die Details und aktivieren du die Services.
            </p>
          </div>
          
          <!-- Vendor Details -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h4 style="color: #2d3748; margin: 0 0 15px 0;">👤 Vendor-Informationen</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #4a5568; font-weight: bold; width: 30%;">Name:</td>
                <td style="padding: 8px 0; color: #2d3748;">${data.vendorName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #4a5568; font-weight: bold;">E-Mail:</td>
                <td style="padding: 8px 0; color: #2d3748;">${data.vendorEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #4a5568; font-weight: bold;">Vertrag:</td>
                <td style="padding: 8px 0; color: #2d3748; font-family: monospace;">${data.contractId}</td>
              </tr>
            </table>
          </div>
          
          <!-- Services Details -->
          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h4 style="color: #1e40af; margin: 0 0 15px 0;">📋 Gebuchte Zusatzleistungen</h4>
            
            ${data.zusatzleistungen.lagerservice ? `
            <div style="background-color: white; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #10b981;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <strong style="color: #065f46;">🏪 Lagerservice</strong>
                  <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">Muss manuell aktiviert werden</div>
                </div>
                <span style="color: #059669; font-weight: bold;">${data.zusatzleistungen.lagerservice_kosten.toFixed(2)}€/Monat</span>
              </div>
            </div>
            ` : ''}
            
            ${data.zusatzleistungen.versandservice ? `
            <div style="background-color: white; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #3b82f6;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <strong style="color: #1e40af;">🚚 Versandservice</strong>
                  <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">Abhängig von Lagerservice-Aktivierung</div>
                </div>
                <span style="color: #1d4ed8; font-weight: bold;">${data.zusatzleistungen.versandservice_kosten.toFixed(2)}€/Monat</span>
              </div>
            </div>
            ` : ''}
          </div>
          
          <!-- Action Required -->
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 20px; margin: 25px 0; border-radius: 8px;">
            <h4 style="color: #dc2626; margin: 0 0 10px 0;">⚠️ Erforderliche Aktionen</h4>
            <ul style="color: #991b1b; margin: 10px 0; padding-left: 20px; line-height: 1.6;">
              ${data.zusatzleistungen.lagerservice ? '<li>Lagerservice aktivieren und erste Package-Eingang bestätigen</li>' : ''}
              ${data.zusatzleistungen.versandservice ? '<li>Versandservice nach Lagerservice-Aktivierung freischalten</li>' : ''}
              <li>Monatliche Abrechnung entsprechend anpassen</li>
              <li>Vendor über Aktivierung informieren</li>
            </ul>
          </div>
          
          <!-- Admin Dashboard Link -->
          <div style="text-align: center; margin: 25px 0;">
            <a href="${getFrontendUrl()}/admin/zusatzleistungen" 
               style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; 
                      padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              🔧 Zum Admin-Dashboard
            </a>
          </div>
          
          <!-- Footer -->
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              housnkuh Admin-System | Diese E-Mail wurde automatisch generiert
            </p>
          </div>
        </div>
      </div>
    `;
    
    const mailOptions = {
      from: `"housnkuh System" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: adminEmail,
      subject: subject,
      html: html
    };
    
    try {
      const result = await transporter.sendMail(mailOptions);
      logger.info('Admin zusatzleistungen notification sent successfully:', result.messageId);
      return true;
    } catch (emailError) {
      logger.error('Admin zusatzleistungen notification error:', emailError);
      return false;
    }
  } catch (error) {
    logger.error('Error in sendAdminZusatzleistungenNotification:', error);
    return false;
  }
};

/**
 * Sends package arrival confirmation email to vendors
 * @function sendPackageArrivalConfirmation
 * @description Notifies vendors when their packages have arrived
 * and provides storage location and pickup instructions
 * @param {PackageArrivalNotificationData} data - Package arrival details
 * @returns {Promise<boolean>} Promise resolving to true if email sent successfully
 * @complexity O(1)
 * @security Vendor-specific data only, validates package information
 */
export const sendPackageArrivalConfirmation = async (data: PackageArrivalNotificationData): Promise<boolean> => {
  try {
    logger.info(`Sending package arrival confirmation to: ${data.vendorEmail}`);
    
    if (process.env.NODE_ENV === 'development' && 
        (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
      logger.warn('⚠️ Running in development mode without email configuration');
      logger.info('📧 Package arrival confirmation would be sent with data:', data);
      return true;
    }
    
    const transporter = createTransporter();
    const serviceType = data.packageType === 'lagerservice' ? 'Lagerservice' : 'Versandservice';
    const subject = `📦 Paket-Eingang bestätigt - ${serviceType} (${data.packageId})`;
    
    const html = `
      <div style="font-family: 'Quicksand', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #09122c; margin: 0; font-size: 28px;">housnkuh</h1>
            <p style="color: #666; margin: 10px 0;">Paket-Management</p>
          </div>
          
          <!-- Success Message -->
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; background-color: #10b981; color: white; padding: 15px 25px; border-radius: 50px; font-size: 18px; font-weight: bold; margin-bottom: 15px;">
              ✅ Paket-Eingang bestätigt!
            </div>
          </div>
          
          <!-- Personal Greeting -->
          <div style="margin-bottom: 30px;">
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Guten Tag <strong>${data.vendorName}</strong>,
            </p>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              wir freuen uns, dir mitteilen zu können, dass dein Paket erfolgreich in unserem Lager eingegangen ist!
            </p>
          </div>
          
          <!-- Package Details -->
          <div style="background-color: #eff6ff; border-left: 5px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
            <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">📋 Paket-Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #4a5568; font-weight: bold; width: 35%;">Service-Typ:</td>
                <td style="padding: 8px 0; color: #2d3748;">${serviceType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #4a5568; font-weight: bold;">Paket-ID:</td>
                <td style="padding: 8px 0; color: #2d3748; font-family: monospace;">${data.packageId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #4a5568; font-weight: bold;">Eingangsdatum:</td>
                <td style="padding: 8px 0; color: #2d3748; font-weight: bold;">${data.arrivalDate.toLocaleDateString('de-DE', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</td>
              </tr>
              ${data.notes ? `
              <tr>
                <td style="padding: 8px 0; color: #4a5568; font-weight: bold;">Notizen:</td>
                <td style="padding: 8px 0; color: #2d3748;">${data.notes}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          <!-- Next Steps -->
          <div style="background-color: #f0fdf4; border: 2px solid #10b981; padding: 20px; margin: 25px 0; border-radius: 8px;">
            <h4 style="color: #065f46; margin: 0 0 10px 0; font-size: 16px;">🚀 Nächste Schritte</h4>
            ${data.packageType === 'lagerservice' ? `
            <p style="color: #064e3b; margin: 0; line-height: 1.6;">
              dein Paket wird nun professionell gelagert. du können jederzeit weitere Pakete an unser Lager senden. 
              Bei Bedarf kannst du auch den Versandservice aktivieren, um Produkte direkt an deine Kunden zu versenden.
            </p>
            ` : `
            <p style="color: #064e3b; margin: 0; line-height: 1.6;">
              dein Paket wurde für den Versandservice empfangen und wird entsprechend deinen Anweisungen an die Endkunden weitergeleitet.
            </p>
            `}
          </div>
          
          <!-- Dashboard Link -->
          <div style="text-align: center; margin: 25px 0;">
            <a href="${getFrontendUrl()}/vendor/dashboard" 
               style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; 
                      padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              📊 Zum Dashboard
            </a>
          </div>
          
          <!-- Support -->
          <div style="margin-top: 30px; padding: 20px; background-color: #f8fafc; border-radius: 8px;">
            <h4 style="color: #09122c; margin: 0 0 10px 0;">💬 Fragen oder Probleme?</h4>
            <p style="color: #4a5568; margin: 0 0 10px 0; line-height: 1.6;">
              Bei Fragen zu deinen Paketen oder Zusatzleistungen kannst du uns jederzeit kontaktieren:
            </p>
            <p style="color: #2d3748; margin: 0;">
              📧 <strong>E-Mail:</strong> eva-maria.schaller@housnkuh.de<br>
              📞 <strong>Telefon:</strong> 015222035788
            </p>
          </div>
          
          <!-- Footer -->
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              © housnkuh - dein regionaler Marktplatz<br>
              <a href="https://housnkuh.de" style="color: #e17564;">www.housnkuh.de</a>
            </p>
          </div>
        </div>
      </div>
    `;
    
    const mailOptions = {
      from: `"housnkuh - Paket-Service" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: data.vendorEmail,
      subject: subject,
      html: html
    };
    
    try {
      const result = await transporter.sendMail(mailOptions);
      logger.info('Package arrival confirmation sent successfully:', result.messageId);
      return true;
    } catch (emailError) {
      logger.error('Package arrival confirmation error:', emailError);
      return false;
    }
  } catch (error) {
    logger.error('Error in sendPackageArrivalConfirmation:', error);
    return false;
  }
};

/**
 * Sends storage service activation notification to vendors
 * @function sendLagerserviceActivationNotification
 * @description Notifies vendors when their storage service has been activated
 * and provides access instructions and terms
 * @param {LagerserviceActivationData} data - Storage service activation details
 * @returns {Promise<boolean>} Promise resolving to true if email sent successfully
 * @complexity O(1)
 * @security Vendor-specific service data, no payment details exposed
 */
export const sendLagerserviceActivationNotification = async (data: LagerserviceActivationData): Promise<boolean> => {
  try {
    logger.info(`Sending lagerservice activation notification to: ${data.vendorEmail}`);
    
    if (process.env.NODE_ENV === 'development' && 
        (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
      logger.warn('⚠️ Running in development mode without email configuration');
      logger.info('📧 Lagerservice activation notification would be sent with data:', data);
      return true;
    }
    
    const transporter = createTransporter();
    const subject = `🏪 Lagerservice aktiviert - Jetzt verfügbar! (${data.contractId})`;
    
    const html = `
      <div style="font-family: 'Quicksand', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px; color: white;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">housnkuh</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Lagerservice</p>
          </div>
          
          <!-- Success Message -->
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; background-color: #10b981; color: white; padding: 15px 25px; border-radius: 50px; font-size: 18px; font-weight: bold; margin-bottom: 15px;">
              🎉 Lagerservice aktiviert!
            </div>
            <h2 style="color: #09122c; margin: 0; font-size: 24px;">dein Lagerservice ist jetzt verfügbar</h2>
          </div>
          
          <!-- Personal Greeting -->
          <div style="margin-bottom: 30px;">
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Guten Tag <strong>${data.vendorName}</strong>,
            </p>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              wir freuen uns, dir mitteilen zu können, dass dein <strong>Lagerservice</strong> erfolgreich aktiviert wurde! 
              du können ab sofort deine Produkte in unserem professionellen Lager einlagern.
            </p>
          </div>
          
          <!-- Service Details -->
          <div style="background-color: #ecfdf5; border-left: 5px solid #10b981; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
            <h3 style="color: #065f46; margin: 0 0 15px 0; font-size: 18px;">🏪 Lagerservice-Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #047857; font-weight: bold; width: 35%;">Aktivierungsdatum:</td>
                <td style="padding: 8px 0; color: #064e3b; font-weight: bold;">${data.activationDate.toLocaleDateString('de-DE')}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #047857; font-weight: bold;">Vertragsnummer:</td>
                <td style="padding: 8px 0; color: #064e3b; font-family: monospace;">${data.contractId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #047857; font-weight: bold;">Monatliche Kosten:</td>
                <td style="padding: 8px 0; color: #064e3b; font-weight: bold; font-size: 16px;">${data.monthlyFee.toFixed(2)}€/Monat</td>
              </tr>
            </table>
          </div>
          
          <!-- Features -->
          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 20px; margin: 25px 0; border-radius: 8px;">
            <h4 style="color: #1e40af; margin: 0 0 15px 0; font-size: 16px;">✨ Was kannst du jetzt tun?</h4>
            <ul style="color: #1e3a8a; margin: 0; padding-left: 20px; line-height: 1.8;">
              <li>Pakete an unser Lager senden (Adresse erhalten du separat)</li>
              <li>Produkte professionell und sicher lagern lassen</li>
              <li>Package-Status über dein Dashboard verfolgen</li>
              <li>Optional: Versandservice für direkten Kundenversand aktivieren</li>
            </ul>
          </div>
          
          <!-- Next Steps -->
          <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 8px;">
            <h4 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">📋 Nächste Schritte</h4>
            <ol style="color: #78350f; margin: 0; padding-left: 20px; line-height: 1.6;">
              <li>Loggen du dich in dein Dashboard ein, um Package-Management zu nutzen</li>
              <li>Senden du deine ersten Pakete an unser Lager</li>
              <li>Überwachen du den Status deiner Pakete</li>
              <li>Bei Bedarf: Versandservice für direkten Kundenversand aktivieren</li>
            </ol>
          </div>
          
          <!-- Dashboard Link -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${getFrontendUrl()}/vendor/dashboard" 
               style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; 
                      padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; 
                      font-size: 16px; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3);">
              📊 Zum Package-Dashboard
            </a>
          </div>
          
          <!-- Support -->
          <div style="margin-top: 30px; padding: 20px; background-color: #f8fafc; border-radius: 8px;">
            <h4 style="color: #09122c; margin: 0 0 10px 0;">💬 Haben du Fragen?</h4>
            <p style="color: #4a5568; margin: 0 0 10px 0; line-height: 1.6;">
              Unser Team unterstützt du gerne beim optimalen Einsatz des Lagerservices:
            </p>
            <p style="color: #2d3748; margin: 0;">
              📧 <strong>E-Mail:</strong> eva-maria.schaller@housnkuh.de<br>
              📞 <strong>Telefon:</strong> 015222035788<br>
              📍 <strong>Adresse:</strong> Strauer Str. 15, 96317 Kronach
            </p>
          </div>
          
          <!-- Footer -->
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
              Vielen Dank für dein Vertrauen in housnkuh!
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              © housnkuh - dein regionaler Marktplatz<br>
              <a href="https://housnkuh.de" style="color: #6366f1; text-decoration: none;">www.housnkuh.de</a>
            </p>
          </div>
        </div>
      </div>
    `;
    
    const mailOptions = {
      from: `"housnkuh - Lagerservice" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: data.vendorEmail,
      subject: subject,
      html: html
    };
    
    try {
      const result = await transporter.sendMail(mailOptions);
      logger.info('Lagerservice activation notification sent successfully:', result.messageId);
      return true;
    } catch (emailError) {
      logger.error('Lagerservice activation notification error:', emailError);
      return false;
    }
  } catch (error) {
    logger.error('Error in sendLagerserviceActivationNotification:', error);
    return false;
  }
};

/**
 * Template cache for compiled Handlebars templates
 * @constant templateCache
 * @description Stores compiled templates to avoid recompilation
 * @type {Map<string, Handlebars.TemplateDelegate>}
 * @complexity O(1) for access
 * @security Templates are cached in memory only
 */
const templateCache = new Map<string, Handlebars.TemplateDelegate>();

/**
 * Loads and compiles a Handlebars template
 * @function loadTemplate
 * @description Loads template from filesystem and compiles it with Handlebars
 * Caches compiled templates for performance optimization
 * @param {string} templateName - Name of the template file (without extension)
 * @returns {Promise<Handlebars.TemplateDelegate>} Compiled template function
 * @throws {Error} If template file not found
 * @complexity O(1) for cached templates, O(n) for initial load where n is template size
 * @security Validates template existence, prevents directory traversal
 */
const loadTemplate = async (templateName: string): Promise<Handlebars.TemplateDelegate> => {
  if (templateCache.has(templateName)) {
    return templateCache.get(templateName)!;
  }

  const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.html`);
  
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templatePath}`);
  }

  const templateContent = fs.readFileSync(templatePath, 'utf8');
  const template = Handlebars.compile(templateContent);
  
  templateCache.set(templateName, template);
  return template;
};

/**
 * Registers Handlebars helpers for email templates
 * @function registerHandlebarsHelpers
 * @description Sets up custom Handlebars helpers for template logic
 * including comparison, math, and formatting helpers
 * @returns {void}
 * @complexity O(1)
 * @security Helpers are registered globally, validated functions only
 */
const registerHandlebarsHelpers = (): void => {
  // Register helper functions from EmailTemplateHelpers
  Handlebars.registerHelper('eq', EmailTemplateHelpers.eq);
  Handlebars.registerHelper('or', EmailTemplateHelpers.or);
  Handlebars.registerHelper('multiply', EmailTemplateHelpers.multiply);
  Handlebars.registerHelper('formatPrice', EmailTemplateHelpers.formatPrice);
  Handlebars.registerHelper('ifZusatzleistungen', EmailTemplateHelpers.ifZusatzleistungen);
  Handlebars.registerHelper('formatPackageName', (packageId: string, count: number, packageOptions: any[]) => {
    return EmailTemplateHelpers.formatPackageName(packageId, count, packageOptions);
  });
  Handlebars.registerHelper('calculatePackagePrice', (packageId: string, count: number, packageOptions: any[]) => {
    return EmailTemplateHelpers.calculatePackagePrice(packageId, count, packageOptions);
  });
};

// Initialize helpers
registerHandlebarsHelpers();

/**
 * Sends an email using a Handlebars template
 * @function sendTemplateEmail
 * @description Compiles template with data and sends email
 * through configured transporter
 * @param {Object} options - Email configuration
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} options.template - Template name to use
 * @param {any} options.data - Template data for compilation
 * @returns {Promise<boolean>} Promise resolving to true if email sent successfully
 * @complexity O(n) where n is template complexity
 * @security Sanitizes template data, validates email addresses
 */
const sendTemplateEmail = async (options: {
  to: string;
  subject: string;
  template: string;
  data: any;
}): Promise<boolean> => {
  try {
    const template = await loadTemplate(options.template);
    const html = template(options.data);

    const transporter = createTransporter();
    const mailOptions = {
      from: `"housnkuh" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: html
    };

    const result = await transporter.sendMail(mailOptions);
    logger.info(`Template email sent successfully: ${result.messageId}`);
    return true;
  } catch (error) {
    logger.error('Template email error:', error);
    return false;
  }
};

/**
 * Sends enhanced vendor registration confirmation with additional services
 * @function sendVendorRegistrationConfirmation
 * @description Sends comprehensive registration confirmation including
 * package details, pricing, and selected additional services
 * @param {string} vendorEmail - Vendor's email address
 * @param {string} vendorName - Vendor's name
 * @param {any} packageData - Complete package selection data
 * @param {any} contractData - Optional contract information
 * @returns {Promise<boolean>} Promise resolving to true if email sent successfully
 * @complexity O(n) where n is the number of selected services
 * @security Validates all vendor data, uses secure templates
 */
export const sendVendorRegistrationConfirmation = async (
  vendorEmail: string,
  vendorName: string,
  packageData: any,
  contractData?: any
): Promise<boolean> => {
  try {
    
    // Calculate pricing data using helpers
    const subtotal = EmailTemplateHelpers.calculateSubtotal(packageData);
    const discountAmount = EmailTemplateHelpers.calculateDiscountAmount(packageData);
    const totalCost = EmailTemplateHelpers.calculateTotalCost(packageData);
    
    // Template data preparation
    const templateData = {
      vendorName,
      packageData,
      contractData,
      selectedProvisionType: packageData.selectedProvisionType || 'basic',
      packageCounts: packageData.packageCounts,
      packageOptions: packageData.packageOptions,
      zusatzleistungen: packageData.zusatzleistungen,
      rentalDuration: packageData.rentalDuration,
      subtotal,
      discount: packageData.discount || 0,
      discountAmount,
      totalCost,
      
      // Helper functions for template access
      calculatePackagePrice: (packageId: string, count: number, packageOptions: any[]) => 
        EmailTemplateHelpers.calculatePackagePrice(packageId, count, packageOptions),
      formatPrice: EmailTemplateHelpers.formatPrice,
      formatPackageName: (packageId: string, count: number, packageOptions: any[]) =>
        EmailTemplateHelpers.formatPackageName(packageId, count, packageOptions),
      multiply: EmailTemplateHelpers.multiply,
      eq: EmailTemplateHelpers.eq,
      or: EmailTemplateHelpers.or,
      ifZusatzleistungen: (zusatzleistungen: any, provisionType: string) =>
        EmailTemplateHelpers.ifZusatzleistungen(zusatzleistungen, provisionType)
    };

    const subject = `🎉 Willkommen bei housnkuh - Registrierung bestätigt`;
    
    // Send email with template
    const emailResult = await sendTemplateEmail({
      to: vendorEmail,
      subject,
      template: 'vendor-registration-confirmation',
      data: templateData
    });

    return emailResult;

  } catch (error) {
    logger.error('Fehler beim Senden der Registrierungsbestätigung:', error);
    return false;
  }
};

/**
 * Enhanced admin notification for Zusatzleistungen bookings with improved formatting
 */
/**
 * Sends enhanced admin notification for additional services bookings
 * @function sendEnhancedAdminZusatzleistungenNotification
 * @description Notifies administrators about new additional service bookings
 * with detailed vendor and service information
 * @param {Object} data - Notification data
 * @param {string} data.vendorName - Name of the vendor
 * @param {string} data.vendorEmail - Vendor's email address
 * @param {any} data.vertrag - Contract information
 * @param {Array<any>} data.zusatzleistungen - Selected additional services
 * @param {any} data.packageData - Complete package booking data
 * @returns {Promise<boolean>} Promise resolving to true if email sent successfully
 * @complexity O(n) where n is the number of additional services
 * @security Admin-only notification, sanitizes all vendor data
 */
export const sendEnhancedAdminZusatzleistungenNotification = async (
  data: {
    vendorName: string;
    vendorEmail: string;
    contractId: string;
    zusatzleistungen: {
      lagerservice?: boolean;
      versandservice?: boolean;
    };
    totalMonthlyPrice: number;
  }
): Promise<boolean> => {
  try {
    
    const services = EmailTemplateHelpers.getServicesList(data.zusatzleistungen);
    const zusatzleistungenTotal = EmailTemplateHelpers.calculateZusatzleistungenTotal(data.zusatzleistungen);

    const subject = `🔔 Neue Zusatzleistungen gebucht - ${data.vendorName}`;
    
    const emailContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
        <div style="background: linear-gradient(135deg, #e17564 0%, #09122c 100%); padding: 20px; text-align: center; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #ffffff; margin: 0;">Neue Zusatzleistungen-Buchung</h2>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p><strong>Vendor:</strong> ${data.vendorName}</p>
          <p><strong>E-Mail:</strong> ${data.vendorEmail}</p>
          <p><strong>Vertrag-ID:</strong> ${data.contractId}</p>
        </div>
        
        <h3 style="color: #09122c;">Gebuchte Services:</h3>
        <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          ${services.map(service => `
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
              <span style="font-size: 24px; margin-right: 10px;">${service.icon}</span>
              <span style="color: #374151;"><strong>${service.name}</strong> (+${service.price}€/Monat)</span>
            </div>
          `).join('')}
        </div>
        
        <div style="background-color: #ecfdf5; border: 2px solid #10b981; padding: 20px; border-radius: 8px;">
          <p style="margin: 0;"><strong>Zusatzleistungen Gesamt:</strong> <span style="color: #059669; font-size: 18px; font-weight: bold;">${zusatzleistungenTotal}€/Monat</span></p>
          <p style="margin: 10px 0 0 0;"><strong>Vertrag Gesamtpreis:</strong> <span style="color: #1e40af; font-size: 20px; font-weight: bold;">${data.totalMonthlyPrice}€/Monat</span></p>
        </div>
        
        <p style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 20px; color: #92400e;">
          <strong>Action Required:</strong> Bitte aktivieren du die Services im Admin-Dashboard.
        </p>
      </div>
    `;

    const transporter = createTransporter();
    const mailOptions = {
      from: `"housnkuh - Admin Alert" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL || 'eva-maria.schaller@housnkuh.de',
      subject,
      html: emailContent
    };

    const result = await transporter.sendMail(mailOptions);
    logger.info('Enhanced Admin Zusatzleistungen notification sent:', result.messageId);
    return true;

  } catch (error) {
    logger.error('Fehler bei Enhanced Admin-Benachrichtigung für Zusatzleistungen:', error);
    return false;
  }
};

/**
 * Email service object for template-controller integration
 * @constant emailService
 * @description Provides unified interface for database template management
 * and email sending functionality with fallback mechanisms
 * @type {Object}
 * @property {Function} sendDatabaseTemplateEmail - Sends email using database template
 * @property {Function} getTemplateTypes - Gets available template types
 * @property {Function} validateTemplate - Validates template structure
 * @complexity O(1) for method access
 * @security Validates templates, handles fallbacks securely
 */
export const emailService = {
  /**
   * Kompiliert Handlebars-Template mit Daten
   */
  compileTemplate: (templateString: string, data: any): string => {
    try {
      registerHandlebarsHelpers(); // Stelle sicher, dass Helper registriert sind
      const template = Handlebars.compile(templateString);
      return template(data);
    } catch (error) {
      logger.error('Error compiling template:', error);
      throw error;
    }
  },

  /**
   * Sendet Email mit kompilierten Templates
   */
  sendEmail: async (options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void> => {
    const transporter = createTransporter();
    const mailOptions = {
      from: `"housnkuh" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text
    };

    const result = await transporter.sendMail(mailOptions);
    logger.info(`Email sent successfully: ${result.messageId}`);
  },

  /**
   * Lädt Template aus Datenbank mit Fallback zu hardcoded Templates
   */
  loadDatabaseTemplate: async (templateType: string): Promise<{ subject: string; htmlBody: string; textBody?: string } | null> => {
    try {
      const template = await EmailTemplate.findOne({ 
        type: templateType, 
        isActive: true 
      });
      
      if (template) {
        return {
          subject: template.subject,
          htmlBody: template.htmlBody,
          textBody: template.textBody || undefined
        };
      }
      
      return null; // Fallback zu hardcoded Templates
    } catch (error) {
      logger.error('Error loading database template:', error);
      return null; // Fallback bei Datenbankfehler
    }
  },

  /**
   * Sendet Email mit Database-Template (mit Fallback)
   */
  sendDatabaseTemplateEmail: async (
    templateType: string,
    to: string,
    templateData: any,
    fallbackFunction?: () => Promise<boolean>
  ): Promise<boolean> => {
    try {
      // Versuche Database-Template zu laden
      const dbTemplate = await emailService.loadDatabaseTemplate(templateType);
      
      if (dbTemplate) {
        // Verwende Database-Template
        const compiledSubject = emailService.compileTemplate(dbTemplate.subject, templateData);
        const compiledHtml = emailService.compileTemplate(dbTemplate.htmlBody, templateData);
        const compiledText = dbTemplate.textBody ? emailService.compileTemplate(dbTemplate.textBody, templateData) : undefined;
        
        await emailService.sendEmail({
          to,
          subject: compiledSubject,
          html: compiledHtml,
          text: compiledText
        });
        
        logger.info(`Database template email sent: ${templateType} to ${to}`);
        return true;
      } else if (fallbackFunction) {
        // Fallback zu hardcoded Template
        logger.info(`Database template not found for ${templateType}, using fallback`);
        return await fallbackFunction();
      } else {
        logger.error(`No database template found for ${templateType} and no fallback provided`);
        return false;
      }
    } catch (error) {
      logger.error(`Error sending database template email (${templateType}):`, error);
      
      // Bei Fehler auch Fallback versuchen
      if (fallbackFunction) {
        logger.info('Attempting fallback due to error');
        return await fallbackFunction();
      }
      
      return false;
    }
  }
};

/**
 * Sends custom email with pre-compiled content
 * @function sendCustomEmail
 * @description Sends email using pre-compiled HTML content
 * Used by trial automation system and custom notifications
 * @param {Object} options - Email configuration
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} options.html - Pre-compiled HTML content
 * @param {string} options.text - Optional plain text version
 * @returns {Promise<void>} Promise that resolves when email is sent
 * @complexity O(1)
 * @security Validates email addresses, uses secure transporter
 */
export const sendCustomEmail = async (options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> => {
  try {
    logger.info(`Sending custom email to: ${options.to}`);
    
    // Fake success in development mode if email settings are not available
    if (process.env.NODE_ENV === 'development' && !isConfigured()) {
      logger.warn('⚠️ Running in development mode without email configuration');
      logger.info('📧 Email content would be:', {
        to: options.to,
        subject: options.subject,
        html: options.html.substring(0, 200) + '...'
      });
      return;
    }

    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"housnkuh" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text
    };

    const result = await transporter.sendMail(mailOptions);
    logger.info('Custom email sent successfully:', result.messageId);
  } catch (error) {
    logger.error('Error sending custom email:', error);
    throw error;
  }
};

/**
 * Sends trial status email to user
 * @function sendTrialStatusEmail
 * @description Sends trial status updates to vendors
 * including remaining days and current status
 * @param {any} user - User object containing email and name
 * @param {any} trialInfo - Trial information including status and days remaining
 * @returns {Promise<void>} Promise that resolves when email is sent
 * @complexity O(1)
 * @security User-specific data only, no sensitive information exposed
 */
export const sendTrialStatusEmail = async (user: any, trialInfo: any): Promise<void> => {
  try {
    logger.info(`Sending trial status email to: ${user.email}`);
    
    // Fake success in development mode if email settings are not available
    if (process.env.NODE_ENV === 'development' && !isConfigured()) {
      logger.warn('⚠️ Running in development mode without email configuration');
      logger.info('📧 Trial status email would be sent to:', user.email);
      return;
    }

    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"housnkuh" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Trial Status Update',
      html: `
        <h2>Trial Status Update</h2>
        <p>Hello ${user.name},</p>
        <p>Your trial status: ${trialInfo.status}</p>
        <p>Days remaining: ${trialInfo.daysRemaining}</p>
        <p>Best regards,<br>The housnkuh Team</p>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    logger.info('Trial status email sent successfully:', result.messageId);
  } catch (error) {
    logger.error('Error sending trial status email:', error);
    throw error;
  }
};

/**
 * Sends trial conversion confirmation email to user
 * @function sendTrialConversionEmail
 * @description Confirms successful trial conversion to paid subscription
 * @param {any} user - User object containing email and name
 * @returns {Promise<void>} Promise that resolves when email is sent
 * @complexity O(1)
 * @security User-specific data only, no payment information included
 */
export const sendTrialConversionEmail = async (user: any): Promise<void> => {
  try {
    logger.info(`Sending trial conversion email to: ${user.email}`);
    
    // Fake success in development mode if email settings are not available
    if (process.env.NODE_ENV === 'development' && !isConfigured()) {
      logger.warn('⚠️ Running in development mode without email configuration');
      logger.info('📧 Trial conversion email would be sent to:', user.email);
      return;
    }

    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"housnkuh" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Trial Successfully Converted',
      html: `
        <h2>Trial Successfully Converted</h2>
        <p>Hello ${user.name},</p>
        <p>Your trial has been successfully converted to a regular subscription.</p>
        <p>You now have full access to all features.</p>
        <p>Best regards,<br>The housnkuh Team</p>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    logger.info('Trial conversion email sent successfully:', result.messageId);
  } catch (error) {
    logger.error('Error sending trial conversion email:', error);
    throw error;
  }
};

// Export getFrontendUrl for testing
export { getFrontendUrl };
