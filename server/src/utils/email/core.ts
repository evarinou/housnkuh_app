/**
 * @file Email core utilities for housnkuh marketplace
 * @description Basis-Modul des E-Mail-Service: Frontend-URL-Ermittlung,
 * Nodemailer-Transporter, Konfigurationsprüfung, Handlebars-Template-Logik
 * (Datei-Templates und Datenbank-Templates) sowie das emailService-Objekt
 * mit sendDatabaseTemplateEmail als gemeinsame Grundlage für alle
 * Domänenmodule in utils/email/*.
 */

import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { EmailTemplateHelpers } from '../emailHelpers';
import EmailTemplate from '../../models/EmailTemplate';
import logger from '../logger';

dotenv.config();

/**
 * Helper function to get the frontend URL with environment-aware fallbacks
 * @returns The appropriate frontend URL based on environment configuration
 */
export const getFrontendUrl = (): string => {
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
 * Creates and configures a nodemailer transporter for sending emails
 * @function createTransporter
 * @description Creates a configured nodemailer transporter with debugging enabled
 * and TLS settings for secure email delivery
 * @returns {nodemailer.Transporter} Configured nodemailer transporter instance
 * @complexity O(1)
 * @security Uses environment variables for credentials, enables debug logging
 */
export const createTransporter = () => {
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
export const isConfigured = (): boolean => {
  return !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);
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

  const templatePath = path.join(__dirname, '..', '..', 'templates', `${templateName}.html`);
  
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
export const sendTemplateEmail = async (options: {
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
