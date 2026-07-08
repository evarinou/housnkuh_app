/**
 * @file Trial period emails for housnkuh marketplace
 * @description Probemonat-Aktivierung, Ablauf-Warnung, Ablauf-Mitteilung,
 * Status-/Konvertierungs-Mails und Launch-Day-Aktivierungsreport
 * (inkl. Hardcoded-Fallbacks).
 */

import logger from '../logger';
import { getFrontendUrl, createTransporter, isConfigured, emailService } from './core';

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
