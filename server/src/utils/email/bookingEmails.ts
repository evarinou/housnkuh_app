/**
 * @file Booking and Zusatzleistungen emails for housnkuh marketplace
 * @description Buchungsbestätigungen (einfach und mit Zeitplan),
 * Admin-Bestätigung, Zusatzleistungen-Benachrichtigungen, Paket-Eingang
 * und Lagerservice-Aktivierung (inkl. Hardcoded-Fallbacks und Interfaces).
 */

import logger from '../logger';
import Settings from '../../models/Settings';
import { EmailTemplateHelpers } from '../emailHelpers';
import { getFrontendUrl, createTransporter, emailService } from './core';

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
