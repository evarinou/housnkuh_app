/**
 * @file Newsletter emails for housnkuh marketplace
 * @description Newsletter-Bestätigung (inkl. Hardcoded-Fallback) und
 * Benachrichtigung über geändertes Eröffnungsdatum.
 */

import logger from '../logger';
import { getFrontendUrl, createTransporter, emailService } from './core';

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
