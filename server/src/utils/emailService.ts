// server/src/utils/emailService.ts
import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

dotenv.config();

// Interface für Kontaktformulardaten
export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

// Interface für Vendor Contest Daten
export interface VendorContestData {
  name: string;
  email: string;
  phone?: string;
  guessedVendors: string[];
}

// Erweiterte E-Mail-Service-Konfiguration mit Debugging und Verbindungstests
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
  
  console.log('Creating email transporter with config:', {
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.auth.user,
    pass: config.auth.pass ? '***' : 'NOT SET'
  });
  
  return nodemailer.createTransport(config);
};

// Test-Funktion für E-Mail-Verbindung
export const testEmailConnection = async (): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('Email connection test successful');
    return true;
  } catch (error) {
    console.error('Email connection test failed:', error);
    return false;
  }
};

// Check if email service is configured
const isConfigured = (): boolean => {
  return !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);
};

// Funktion zum Senden einer Newsletter-Bestätigungsmail
export const sendNewsletterConfirmation = async (to: string, token: string, type: string): Promise<boolean> => {
  try {
    console.log(`Sending newsletter confirmation to: ${to}, type: ${type}`);
    
    // Fake success in development mode if email settings are not available
    if (process.env.NODE_ENV === 'development' && 
        (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
      console.warn('⚠️ Running in development mode without email configuration');
      console.log('🔗 Confirmation URL would be:', `${process.env.FRONTEND_URL || 'http://localhost:3000'}/newsletter/confirm?token=${token}&type=${type}`);
      return true; // Return success in development mode
    }
    
    const transporter = createTransporter();
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const confirmUrl = `${baseUrl}/newsletter/confirm?token=${token}&type=${type}`;
    
    const subject = 'Bestätigen Sie Ihren Newsletter bei housnkuh';
    
    let typeText = type === 'vendor' ? 'als Direktvermarkter' : 'als Kunde';
    
    const html = `
      <div style="font-family: 'Quicksand', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #09122c; margin: 0;">housnkuh</h1>
            <p style="color: #666; margin: 10px 0;">Regionaler Marktplatz Kronach</p>
          </div>
          
          <h2 style="color: #09122c; text-align: center; margin-bottom: 20px;">Newsletter-Anmeldung bestätigen</h2>
          <p style="color: #333; line-height: 1.6;">Vielen Dank für Ihre Anmeldung zum housnkuh-Newsletter ${typeText}!</p>
          <p style="color: #333; line-height: 1.6;">Um Ihre Anmeldung zu bestätigen, klicken Sie bitte auf den folgenden Button:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${confirmUrl}" style="background-color: #e17564; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Newsletter bestätigen
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">Alternativ können Sie auch diesen Link in Ihren Browser kopieren:</p>
          <p style="color: #e17564; word-break: break-all; font-size: 14px;">${confirmUrl}</p>
          <p style="color: #666; font-size: 14px;">Der Link ist 24 Stunden gültig.</p>
          <p style="color: #666; font-size: 14px;">Sollten Sie sich nicht für unseren Newsletter angemeldet haben, können Sie diese E-Mail ignorieren.</p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              © housnkuh - Strauer Str. 15, 96317 Kronach<br>
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
    
    console.log('Sending email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });
    
    try {
      const result = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return true;
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ In development mode, treating email as sent successfully');
        console.log('🔗 Confirmation URL would be:', confirmUrl);
        return true; // Return success in development mode
      }
      
      return false;
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('Detailed email error:', {
        message: error.message,
      });
    } else {
      console.error('Detailed email error:', error);
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ In development mode, treating email as sent successfully');
      return true; // Return success in development mode
    }
    
    return false;
  }
};

// Funktion zum Senden einer Vendor-Willkommens-E-Mail mit Buchungsbestätigung
export const sendVendorWelcomeEmail = async (to: string, token: string, packageData: any): Promise<boolean> => {
  try {
    console.log(`Sending vendor welcome email to: ${to}`);
    console.log('Token:', token);
    console.log('Package data:', JSON.stringify(packageData, null, 2));
    
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const confirmUrl = `${baseUrl}/vendor/confirm?token=${token}`;
    console.log('🔗 Vendor confirmation URL:', confirmUrl);
    
    // Fake success in development mode if email settings are not available
    if (process.env.NODE_ENV === 'development' && 
        (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
      console.warn('⚠️ Running in development mode without email configuration');
      console.log('📧 Email would be sent to:', to);
      console.log('🔗 Click here to confirm: ', confirmUrl);
      return true; // Return success in development mode
    }
    
    const transporter = createTransporter();
    
    const subject = 'Willkommen bei housnkuh - Bestätigen Sie Ihre Registrierung';
    
    // Package-Daten für die E-Mail formatieren
    const formatPackageData = (data: any) => {
      const packages = data.selectedPackages || [];
      const addons = data.selectedAddons || [];
      const duration = data.rentalDuration || 3;
      const totalCost = data.totalCost || { monthly: 0, provision: 4 };
      
      let packageList = packages.length > 0 
        ? packages.map((pkg: string) => `<li style="margin: 5px 0;">${pkg}</li>`).join('')
        : '<li style="margin: 5px 0;">Keine Verkaufsflächen ausgewählt</li>';
      
      let addonList = addons.length > 0
        ? addons.map((addon: string) => `<li style="margin: 5px 0;">${addon}</li>`).join('')
        : '<li style="margin: 5px 0;">Keine Zusatzoptionen ausgewählt</li>';
      
      return {
        packageList,
        addonList,
        duration,
        monthlyCost: totalCost.monthly,
        provision: totalCost.provision
      };
    };
    
    const packageInfo = formatPackageData(packageData);
    
    const html = `
      <div style="font-family: 'Quicksand', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #09122c; margin: 0;">housnkuh</h1>
            <p style="color: #666; margin: 10px 0;">Regionaler Marktplatz Kronach</p>
          </div>
          
          <h2 style="color: #09122c; text-align: center; margin-bottom: 20px;">Willkommen als Direktvermarkter!</h2>
          
          <p style="color: #333; line-height: 1.6;">
            Vielen Dank für Ihr Interesse, Teil der housnkuh-Gemeinschaft zu werden!
          </p>
          
          <p style="color: #333; line-height: 1.6;">
            Sie haben erfolgreich eine Buchungsanfrage für unsere Verkaufsflächen gestellt. 
            Um den Prozess abzuschließen, bestätigen Sie bitte zunächst Ihre E-Mail-Adresse.
          </p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #09122c; margin-top: 0;">Ihre Buchungsanfrage im Überblick:</h3>
            
            <div style="margin: 15px 0;">
              <strong style="color: #09122c;">Verkaufsflächen:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                ${packageInfo.packageList}
              </ul>
            </div>
            
            <div style="margin: 15px 0;">
              <strong style="color: #09122c;">Zusatzoptionen:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                ${packageInfo.addonList}
              </ul>
            </div>
            
            <div style="margin: 15px 0;">
              <strong style="color: #09122c;">Mietdauer:</strong> ${packageInfo.duration} Monate
            </div>
            
            <div style="margin: 15px 0; padding: 15px; background-color: #e17564; color: white; border-radius: 5px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 16px;"><strong>Monatliche Kosten:</strong></span>
                <span style="font-size: 18px; font-weight: bold;">${packageInfo.monthlyCost.toFixed(2)}€</span>
              </div>
              <div style="margin-top: 5px; font-size: 14px; opacity: 0.9;">
                + ${packageInfo.provision}% Provision auf Verkäufe
              </div>
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${confirmUrl}" style="background-color: #e17564; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
              E-Mail bestätigen und Anfrage abschließen
            </a>
          </div>
          
          <div style="background-color: #fffbf0; padding: 15px; border-radius: 5px; border-left: 4px solid #e17564; margin: 20px 0;">
            <h4 style="color: #09122c; margin-top: 0;">Was passiert als nächstes?</h4>
            <ol style="color: #333; padding-left: 20px;">
              <li>Bestätigen Sie Ihre E-Mail-Adresse über den Button oben</li>
              <li>Wir nehmen innerhalb von 2 Werktagen Kontakt mit Ihnen auf</li>
              <li>Gemeinsam besprechen wir die Details Ihrer Buchung</li>
              <li>Nach der finalen Abstimmung erstellen wir Ihren Mietvertrag</li>
            </ol>
          </div>
          
          <p style="color: #666; font-size: 14px;">Alternativ können Sie auch diesen Link in Ihren Browser kopieren:</p>
          <p style="color: #e17564; word-break: break-all; font-size: 14px;">${confirmUrl}</p>
          <p style="color: #666; font-size: 14px;">Der Bestätigungslink ist 24 Stunden gültig.</p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
            <h4 style="color: #09122c;">Bei Fragen stehen wir Ihnen gerne zur Verfügung:</h4>
            <p style="color: #333; margin: 5px 0;">📞 Telefon: 0157 35711257</p>
            <p style="color: #333; margin: 5px 0;">✉️ E-Mail: eva-maria.schaller@housnkuh.de</p>
            <p style="color: #333; margin: 5px 0;">📍 Adresse: Strauer Str. 15, 96317 Kronach</p>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              © housnkuh - Ihr regionaler Marktplatz<br>
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
    
    console.log('Sending vendor welcome email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });
    
    try {
      const result = await transporter.sendMail(mailOptions);
      console.log('Vendor welcome email sent successfully:', result.messageId);
      return true;
    } catch (emailError) {
      console.error('Vendor email sending error:', emailError);
      
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ In development mode, treating vendor email as sent successfully');
        console.log('🔗 Vendor confirmation URL would be:', confirmUrl);
        return true; // Return success in development mode
      }
      
      return false;
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('Detailed vendor email error:', {
        message: error.message,
      });
    } else {
      console.error('Detailed vendor email error:', error);
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ In development mode, treating vendor email as sent successfully');
      return true; // Return success in development mode
    }
    
    return false;
  }
};

// Funktion zum Senden einer E-Mail bei Änderung des Eröffnungsdatums
export const sendOpeningDateChangeNotification = async (to: string, data: { name: string; newDate: Date; oldDate: Date | null }): Promise<boolean> => {
  try {
    console.log(`Sending opening date change notification to: ${to}`);
    
    // Fake success in development mode if email settings are not available
    if (process.env.NODE_ENV === 'development' && 
        (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
      console.warn('⚠️ Running in development mode without email configuration');
      console.log('📧 Opening date change notification would be sent with data:', data);
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
            wir möchten Sie darüber informieren, dass sich das Eröffnungsdatum von housnkuh geändert hat.
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
            <strong>Was bedeutet das für Sie?</strong><br>
            Ihr kostenloser Probemonat startet automatisch am neuen Eröffnungsdatum. 
            Sie können bereits jetzt Ihr Profil vervollständigen und Ihre Produkte anlegen.
          </p>
          
          <p style="color: #333; line-height: 1.6;">
            Bei Fragen stehen wir Ihnen gerne zur Verfügung.
          </p>
          
          <p style="color: #333; line-height: 1.6;">
            Mit freundlichen Grüßen,<br>
            Ihr housnkuh Team
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
    
    console.log('Sending opening date change notification:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });
    
    try {
      const result = await transporter.sendMail(mailOptions);
      console.log('Opening date change email sent successfully:', result.messageId);
      return true;
    } catch (emailError) {
      console.error('Opening date change email error:', emailError);
      
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ In development mode, treating email as sent successfully');
        return true;
      }
      
      return false;
    }
  } catch (error) {
    console.error('Error in sendOpeningDateChangeNotification:', error);
    
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ In development mode, treating email as sent successfully');
      return true;
    }
    
    return false;
  }
};

// Funktion zum Senden einer Vendor-Bestätigungs-E-Mail mit Mietfach-Details
export const sendVendorConfirmationEmail = async (to: string, data: { name: string; mietfaecher: any[]; vertrag: any; packageData: any }): Promise<boolean> => {
  try {
    console.log(`Sending vendor confirmation email to: ${to}`);
    
    // Fake success in development mode if email settings are not available
    if (process.env.NODE_ENV === 'development' && 
        (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
      console.warn('⚠️ Running in development mode without email configuration');
      console.log('📧 Vendor confirmation would be sent with data:', data);
      return true; // Return success in development mode
    }
    
    const transporter = createTransporter();
    
    const subject = 'Ihre Buchung wurde bestätigt - Willkommen bei housnkuh!';
    
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
          
          <h2 style="color: #09122c; text-align: center; margin-bottom: 20px;">🎉 Ihre Buchung wurde bestätigt!</h2>
          
          <p style="color: #333; line-height: 1.6;">
            Liebe/r ${data.name},
          </p>
          
          <p style="color: #333; line-height: 1.6;">
            herzlichen Glückwunsch! Wir freuen uns, Sie als neuen Direktvermarkter bei housnkuh begrüßen zu dürfen. 
            Ihre Buchungsanfrage wurde erfolgreich bestätigt und wir haben Ihnen die folgenden Verkaufsflächen zugewiesen.
          </p>
          
          <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h3 style="color: #09122c; margin-top: 0;">✅ Ihre zugewiesenen Mietfächer:</h3>
            ${mietfachList}
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #09122c; margin-top: 0;">📋 Vertragsdetails:</h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666; width: 150px;"><strong>Vertragsnummer:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${data.vertrag._id}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;"><strong>Laufzeit:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${data.packageData.rentalDuration} Monate</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;"><strong>Monatliche Kosten:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${data.packageData.totalCost?.monthly?.toFixed(2) || 'N/A'}€</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;"><strong>Provision:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${data.packageData.totalCost?.provision || 'N/A'}% auf Verkäufe</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;"><strong>Mietbeginn:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${new Date().toLocaleDateString('de-DE')}</td>
              </tr>
            </table>
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <h4 style="color: #09122c; margin-top: 0;">📞 Nächste Schritte:</h4>
            <ol style="color: #333; padding-left: 20px; margin: 10px 0;">
              <li style="margin: 5px 0;">Wir werden Sie in den nächsten 2 Werktagen kontaktieren</li>
              <li style="margin: 5px 0;">Gemeinsame Besichtigung der zugewiesenen Verkaufsflächen</li>
              <li style="margin: 5px 0;">Einweisung in das housnkuh-Kassensystem</li>
              <li style="margin: 5px 0;">Übergabe Ihres persönlichen Zugangs und der Schlüssel</li>
              <li style="margin: 5px 0;">Sie können mit dem Verkauf Ihrer Produkte beginnen!</li>
            </ol>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/vendor/dashboard" style="background-color: #e17564; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
              Zu Ihrem Vendor-Dashboard
            </a>
          </div>
          
          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; border-left: 4px solid #2196f3; margin: 20px 0;">
            <h4 style="color: #09122c; margin-top: 0;">💡 Wichtige Informationen:</h4>
            <ul style="color: #333; padding-left: 20px; margin: 10px 0;">
              <li style="margin: 5px 0;">Ihre Verkaufsflächen sind ab sofort für Sie reserviert</li>
              <li style="margin: 5px 0;">Der offizielle Mietvertrag wird bei unserem Termin unterzeichnet</li>
              <li style="margin: 5px 0;">Sie erhalten eine separate E-Mail mit Ihren Zugangsdaten</li>
              <li style="margin: 5px 0;">Bei Fragen stehen wir Ihnen jederzeit zur Verfügung</li>
            </ul>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
            <h4 style="color: #09122c;">Bei Fragen stehen wir Ihnen gerne zur Verfügung:</h4>
            <p style="color: #333; margin: 5px 0;">📞 Telefon: 0157 35711257</p>
            <p style="color: #333; margin: 5px 0;">✉️ E-Mail: eva-maria.schaller@housnkuh.de</p>
            <p style="color: #333; margin: 5px 0;">📍 Adresse: Strauer Str. 15, 96317 Kronach</p>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              © housnkuh - Ihr regionaler Marktplatz<br>
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
    
    console.log('Sending vendor confirmation email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });
    
    try {
      const result = await transporter.sendMail(mailOptions);
      console.log('Vendor confirmation email sent successfully:', result.messageId);
      return true;
    } catch (emailError) {
      console.error('Vendor confirmation email sending error:', emailError);
      
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ In development mode, treating vendor confirmation email as sent successfully');
        return true; // Return success in development mode
      }
      
      return false;
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('Detailed vendor confirmation email error:', {
        message: error.message,
      });
    } else {
      console.error('Detailed vendor confirmation email error:', error);
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ In development mode, treating vendor confirmation email as sent successfully');
      return true; // Return success in development mode
    }
    
    return false;
  }
};

// Funktion zum Senden einer Kontaktformular-E-Mail
export const sendContactFormEmail = async (formData: ContactFormData): Promise<boolean> => {
  try {
    console.log(`Sending contact form email from: ${formData.email}, subject: ${formData.subject}`);
    
    // Fake success in development mode if email settings are not available
    if (process.env.NODE_ENV === 'development' && 
        (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
      console.warn('⚠️ Running in development mode without email configuration');
      console.log('📧 Contact form would be sent with data:', formData);
      return true; // Return success in development mode
    }
    
    const transporter = createTransporter();
    
    // Die E-Mail an housnkuh-Admin vorbereiten
    const adminSubject = `Neue Kontaktanfrage: ${formData.subject}`;
    
    const adminHtml = `
      <div style="font-family: 'Quicksand', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #09122c; margin: 0;">housnkuh</h1>
            <p style="color: #666; margin: 10px 0;">Kontaktformular-Anfrage</p>
          </div>
          
          <h2 style="color: #09122c; margin-bottom: 20px;">Neue Kontaktanfrage</h2>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #09122c; margin-top: 0;">Kontaktdetails:</h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666; width: 120px;"><strong>Name:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${formData.name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;"><strong>E-Mail:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${formData.email}</td>
              </tr>
              ${formData.phone ? `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;"><strong>Telefon:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${formData.phone}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;"><strong>Betreff:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${formData.subject}</td>
              </tr>
            </table>
            
            <div style="margin-top: 20px;">
              <h4 style="color: #09122c; margin-bottom: 10px;">Nachricht:</h4>
              <div style="background-color: white; padding: 15px; border-radius: 5px; border: 1px solid #eee; color: #333; line-height: 1.6;">
                ${formData.message.replace(/\n/g, '<br>')}
              </div>
            </div>
          </div>
          
          <div style="background-color: #fffbf0; padding: 15px; border-radius: 5px; border-left: 4px solid #e17564; margin: 20px 0;">
            <h4 style="color: #09122c; margin-top: 0;">Hinweis:</h4>
            <p style="color: #333; margin: 5px 0;">Diese Anfrage wurde über das Kontaktformular auf der Website gesendet. Bitte antworten Sie dem Kunden so schnell wie möglich.</p>
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
    
    // Eine Bestätigungs-E-Mail für den Absender
    const userSubject = `Ihre Kontaktanfrage bei housnkuh: ${formData.subject}`;
    
    const userHtml = `
      <div style="font-family: 'Quicksand', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #09122c; margin: 0;">housnkuh</h1>
            <p style="color: #666; margin: 10px 0;">Regionaler Marktplatz Kronach</p>
          </div>
          
          <h2 style="color: #09122c; text-align: center; margin-bottom: 20px;">Vielen Dank für Ihre Anfrage!</h2>
          
          <p style="color: #333; line-height: 1.6;">
            Hallo ${formData.name},
          </p>
          
          <p style="color: #333; line-height: 1.6;">
            vielen Dank für Ihre Kontaktanfrage. Wir haben Ihre Nachricht erhalten und werden uns so schnell wie möglich bei Ihnen melden.
          </p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #09122c; margin-top: 0;">Ihre Anfrage im Überblick:</h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666; width: 120px;"><strong>Betreff:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${formData.subject}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;"><strong>Datum:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${new Date().toLocaleString('de-DE')}</td>
              </tr>
            </table>
            
            <div style="margin-top: 20px;">
              <h4 style="color: #09122c; margin-bottom: 10px;">Ihre Nachricht:</h4>
              <div style="background-color: white; padding: 15px; border-radius: 5px; border: 1px solid #eee; color: #333; line-height: 1.6;">
                ${formData.message.replace(/\n/g, '<br>')}
              </div>
            </div>
          </div>
          
          <div style="background-color: #fffbf0; padding: 15px; border-radius: 5px; border-left: 4px solid #e17564; margin: 20px 0;">
            <h4 style="color: #09122c; margin-top: 0;">Nächste Schritte:</h4>
            <p style="color: #333; margin: 5px 0;">Unser Team wird Ihre Anfrage prüfen und sich innerhalb von 1-2 Werktagen bei Ihnen melden. Bei dringenden Anfragen können Sie uns auch telefonisch erreichen.</p>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
            <h4 style="color: #09122c;">Bei weiteren Fragen stehen wir Ihnen gerne zur Verfügung:</h4>
            <p style="color: #333; margin: 5px 0;">📞 Telefon: 0157 35711257</p>
            <p style="color: #333; margin: 5px 0;">✉️ E-Mail: eva-maria.schaller@housnkuh.de</p>
            <p style="color: #333; margin: 5px 0;">📍 Adresse: Strauer Str. 15, 96317 Kronach</p>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              © housnkuh - Ihr regionaler Marktplatz<br>
              <a href="https://housnkuh.de" style="color: #e17564;">www.housnkuh.de</a>
            </p>
          </div>
        </div>
      </div>
    `;
    
    // E-Mail an den Admin senden
    const adminMailOptions = {
      from: `"housnkuh Kontaktformular" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      replyTo: formData.email, // Reply-To auf die E-Mail des Kunden setzen
      subject: adminSubject,
      html: adminHtml
    };
    
    // Bestätigungs-E-Mail an den Kunden senden
    const userMailOptions = {
      from: `"housnkuh" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: formData.email,
      subject: userSubject,
      html: userHtml
    };
    
    console.log('Sending contact form emails with options:', {
      adminTo: adminMailOptions.to,
      userTo: userMailOptions.to,
      subject: formData.subject
    });
    
    try {
      const transporter = createTransporter();
      
      // Beide E-Mails senden
      const [adminResult, userResult] = await Promise.all([
        transporter.sendMail(adminMailOptions),
        transporter.sendMail(userMailOptions)
      ]);
      
      console.log('Contact form emails sent successfully:', {
        adminMessageId: adminResult.messageId,
        userMessageId: userResult.messageId
      });
      
      return true;
    } catch (emailError) {
      console.error('Contact form email sending error:', emailError);
      
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ In development mode, treating contact form emails as sent successfully');
        return true; // Return success in development mode
      }
      
      return false;
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('Detailed contact form email error:', {
        message: error.message,
      });
    } else {
      console.error('Detailed contact form email error:', error);
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ In development mode, treating contact form emails as sent successfully');
      return true; // Return success in development mode
    }
    
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
// Pre-Registration E-Mail für Vendors
export const sendPreRegistrationConfirmation = async (to: string, data: { name: string; openingDate?: Date | null }): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    
    console.log(`Sending pre-registration confirmation to: ${to}`);
    
    const openingDateText = data.openingDate ? 
      `am ${data.openingDate.toLocaleDateString('de-DE')}` : 
      'in Kürze';
    
    const mailOptions = {
      from: `"housnkuh" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: 'Ihre Vor-Registrierung bei housnkuh - Bestätigung',
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
            vielen Dank für Ihre Vor-Registrierung bei housnkuh! Wir freuen uns sehr, dass Sie zu den ersten Direktvermarktern gehören möchten, die unseren regionalen Marktplatz nutzen.
          </p>
          
          <div style="background-color: #e8f4fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3 style="color: #09122c; margin: 0 0 10px 0; font-size: 16px;">
              🎉 Ihre Vorteile als Früh-Registrierter:
            </h3>
            <ul style="color: #333; margin: 0; padding-left: 20px;">
              <li>Kostenloser Probemonat ab Store-Eröffnung</li>
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
              Wir informieren Sie rechtzeitig über die genaue Eröffnung und alle nächsten Schritte. 
              Ihr kostenloser Probemonat startet automatisch mit der Eröffnung.
            </p>
          </div>
          
          <h3 style="color: #09122c; margin: 30px 0 15px 0;">Was passiert als nächstes?</h3>
          <ol style="color: #333; line-height: 1.6; padding-left: 20px;">
            <li>Sie erhalten eine weitere E-Mail zur Store-Eröffnung</li>
            <li>Wir aktivieren Ihren Account automatisch</li>
            <li>Sie können sofort mit dem Verkauf beginnen</li>
            <li>Unser Support-Team steht Ihnen zur Verfügung</li>
          </ol>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #666; font-size: 14px;">
              Bei Fragen können Sie uns jederzeit unter <a href="mailto:info@housnkuh.de" style="color: #e17564;">info@housnkuh.de</a> erreichen.
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
    
    console.log('Sending email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });
    
    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    
    return true;
  } catch (error) {
    console.error('Error sending pre-registration confirmation email:', error);
    return false;
  }
};

export async function sendVendorContestEmail(contestData: VendorContestData): Promise<boolean> {
  if (!isConfigured()) {
    console.warn('Email service not configured - skipping vendor contest email send');
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 Development mode: Would send vendor contest emails to:', contestData.email);
      console.log('📧 Contest data:', contestData);
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
            <p style="color: #333; margin: 5px 0;">Diese Teilnahme wurde automatisch in der Datenbank gespeichert. Sie können alle Teilnahmen im Admin-Dashboard einsehen.</p>
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
    const participantSubject = 'Ihre Teilnahme am housnkuh Vendor Contest';
    
    const participantHtml = `
      <div style="font-family: 'Quicksand', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #09122c; margin: 0;">housnkuh</h1>
            <p style="color: #666; margin: 10px 0;">Regionaler Marktplatz Kronach</p>
          </div>
          
          <h2 style="color: #09122c; text-align: center; margin-bottom: 20px;">Vielen Dank für Ihre Teilnahme!</h2>
          
          <p style="color: #333; line-height: 1.6;">
            Hallo ${contestData.name},
          </p>
          
          <p style="color: #333; line-height: 1.6;">
            vielen Dank für Ihre Teilnahme am housnkuh Vendor Contest! Ihre Vermutungen wurden erfolgreich registriert.
          </p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #09122c; margin-top: 0;">Ihre Vermutungen:</h3>
            
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
              Halten Sie Ihre Mailbox im Auge - vielleicht gehören Sie zu den glücklichen Gewinnern!
            </p>
          </div>
          
          <div style="background-color: #fffbf0; padding: 15px; border-radius: 5px; border-left: 4px solid #e17564; margin: 20px 0;">
            <h4 style="color: #09122c; margin-top: 0;">Tipp:</h4>
            <p style="color: #333; margin: 5px 0;">
              Besuchen Sie uns gerne in der housnkuh und entdecken Sie unser vielfältiges Angebot regionaler Produkte. 
              Unsere Direktvermarkter freuen sich auf Ihren Besuch!
            </p>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
            <h4 style="color: #09122c;">Bei Fragen stehen wir Ihnen gerne zur Verfügung:</h4>
            <p style="color: #333; margin: 5px 0;">📞 Telefon: 0157 35711257</p>
            <p style="color: #333; margin: 5px 0;">✉️ E-Mail: eva-maria.schaller@housnkuh.de</p>
            <p style="color: #333; margin: 5px 0;">📍 Adresse: Strauer Str. 15, 96317 Kronach</p>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              © housnkuh - Ihr regionaler Marktplatz<br>
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
    
    console.log('Sending vendor contest emails...');
    
    try {
      const transporter = createTransporter();
      // Sende beide E-Mails
      await Promise.all([
        transporter.sendMail(adminMailOptions),
        transporter.sendMail(participantMailOptions)
      ]);
      
      console.log('Vendor contest emails sent successfully');
      return true;
    } catch (emailError) {
      console.error('Vendor contest email sending error:', emailError);
      
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ In development mode, treating vendor contest emails as sent successfully');
        return true; // Return success in development mode
      }
      
      return false;
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('Detailed vendor contest email error:', {
        message: error.message,
      });
    } else {
      console.error('Detailed vendor contest email error:', error);
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ In development mode, treating vendor contest emails as sent successfully');
      return true; // Return success in development mode
    }
    
    return false;
  }
};

/**
 * Send trial activation email to vendor when their trial period starts
 */
export const sendTrialActivationEmail = async (
  to: string, 
  name: string, 
  trialStartDate: Date, 
  trialEndDate: Date
): Promise<boolean> => {
  try {
    console.log(`Sending trial activation email to: ${to}`);
    
    // Fake success in development mode if email settings are not available
    if (process.env.NODE_ENV === 'development' && 
        (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
      console.warn('⚠️ Running in development mode without email configuration');
      console.log('📧 Trial activation email would be sent to:', to);
      return true;
    }
    
    const transporter = createTransporter();
    
    const subject = '🎉 Ihr kostenloser Probemonat bei housnkuh hat begonnen!';
    
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
          
          <h2 style="color: #09122c; text-align: center; margin-bottom: 20px;">🎉 Ihr Probemonat ist gestartet!</h2>
          
          <p style="color: #333; line-height: 1.6;">
            Liebe/r ${name},
          </p>
          
          <p style="color: #333; line-height: 1.6;">
            herzlichen Glückwunsch! housnkuh ist jetzt offiziell eröffnet und Ihr kostenloser Probemonat hat begonnen.
          </p>
          
          <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h3 style="color: #09122c; margin-top: 0;">✅ Ihr Probemonat im Überblick:</h3>
            
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
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <h4 style="color: #09122c; margin-top: 0;">🚀 Was Sie jetzt tun können:</h4>
            <ul style="color: #333; padding-left: 20px; margin: 10px 0;">
              <li style="margin: 5px 0;">Loggen Sie sich in Ihr Vendor-Dashboard ein</li>
              <li style="margin: 5px 0;">Vervollständigen Sie Ihr Profil</li>
              <li style="margin: 5px 0;">Laden Sie Produktbilder hoch</li>
              <li style="margin: 5px 0;">Starten Sie mit dem Verkauf Ihrer Produkte</li>
              <li style="margin: 5px 0;">Nutzen Sie alle Features kostenfrei</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/vendor/dashboard" style="background-color: #e17564; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
              Zu Ihrem Dashboard
            </a>
          </div>
          
          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; border-left: 4px solid #2196f3; margin: 20px 0;">
            <h4 style="color: #09122c; margin-top: 0;">💡 Wichtige Informationen:</h4>
            <ul style="color: #333; padding-left: 20px; margin: 10px 0;">
              <li style="margin: 5px 0;">Der Probemonat ist völlig kostenfrei</li>
              <li style="margin: 5px 0;">Sie können jederzeit kündigen</li>
              <li style="margin: 5px 0;">Wir erinnern Sie rechtzeitig vor dem Ende</li>
              <li style="margin: 5px 0;">Unser Support-Team steht Ihnen zur Verfügung</li>
            </ul>
          </div>
          
          <p style="color: #333; line-height: 1.6;">
            Wir freuen uns darauf, Sie auf Ihrem Weg als Direktvermarkter bei housnkuh zu begleiten!
          </p>
          
          <p style="color: #333; line-height: 1.6;">
            Mit freundlichen Grüßen,<br>
            Ihr housnkuh Team
          </p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
            <h4 style="color: #09122c;">Bei Fragen stehen wir Ihnen gerne zur Verfügung:</h4>
            <p style="color: #333; margin: 5px 0;">📞 Telefon: 0157 35711257</p>
            <p style="color: #333; margin: 5px 0;">✉️ E-Mail: eva-maria.schaller@housnkuh.de</p>
            <p style="color: #333; margin: 5px 0;">📍 Adresse: Strauer Str. 15, 96317 Kronach</p>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              © housnkuh - Ihr regionaler Marktplatz<br>
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
      console.log('Trial activation email sent successfully:', result.messageId);
      return true;
    } catch (emailError) {
      console.error('Trial activation email sending error:', emailError);
      
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ In development mode, treating trial activation email as sent successfully');
        return true;
      }
      
      return false;
    }
  } catch (error) {
    console.error('Error in sendTrialActivationEmail:', error);
    
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ In development mode, treating trial activation email as sent successfully');
      return true;
    }
    
    return false;
  }
};

/**
 * Send trial expiration warning email (7 days before expiration)
 */
export const sendTrialExpirationWarning = async (
  to: string, 
  name: string, 
  trialEndDate: Date
): Promise<boolean> => {
  try {
    console.log(`Sending trial expiration warning to: ${to}`);
    
    // Fake success in development mode if email settings are not available
    if (process.env.NODE_ENV === 'development' && 
        (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
      console.warn('⚠️ Running in development mode without email configuration');
      console.log('📧 Trial expiration warning would be sent to:', to);
      return true;
    }
    
    const transporter = createTransporter();
    
    const subject = '⏰ Ihr Probemonat bei housnkuh endet bald';
    
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
          
          <h2 style="color: #09122c; text-align: center; margin-bottom: 20px;">⏰ Ihr Probemonat endet in 7 Tagen</h2>
          
          <p style="color: #333; line-height: 1.6;">
            Liebe/r ${name},
          </p>
          
          <p style="color: #333; line-height: 1.6;">
            Ihr kostenloser Probemonat bei housnkuh neigt sich dem Ende zu. 
            Am <strong>${formatDate(trialEndDate)}</strong> endet Ihre Testphase.
          </p>
          
          <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h3 style="color: #09122c; margin-top: 0;">🤔 Wie geht es weiter?</h3>
            <p style="color: #333; margin: 10px 0;">
              Sie haben die Wahl: Setzen Sie Ihre erfolgreiche Verkaufstätigkeit bei housnkuh fort oder kündigen Sie rechtzeitig.
            </p>
          </div>
          
          <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h3 style="color: #09122c; margin-top: 0;">✅ Weitermachen lohnt sich:</h3>
            <ul style="color: #333; padding-left: 20px; margin: 10px 0;">
              <li style="margin: 5px 0;">Etablierte Kundenbeziehungen weiter ausbauen</li>
              <li style="margin: 5px 0;">Kontinuierliche Verkäufe ohne Unterbrechung</li>
              <li style="margin: 5px 0;">Zugang zu allen Premium-Features</li>
              <li style="margin: 5px 0;">Persönlicher Support und Beratung</li>
              <li style="margin: 5px 0;">Faire Konditionen und transparente Preise</li>
            </ul>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #09122c; margin-top: 0;">💰 Unsere Konditionen:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666; width: 150px;"><strong>Monatliche Gebühr:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">Je nach gewähltem Paket</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;"><strong>Provision:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">4% auf Verkäufe</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Kündigungsfrist:</strong></td>
                <td style="padding: 8px 0; color: #333;">1 Monat zum Monatsende</td>
              </tr>
            </table>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/vendor/dashboard" style="background-color: #e17564; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px; margin: 10px;">
              Dashboard aufrufen
            </a>
            <br>
            <a href="mailto:eva-maria.schaller@housnkuh.de?subject=Fragen%20zu%20meinem%20Probemonat" style="background-color: #09122c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px; margin: 10px;">
              Fragen stellen
            </a>
          </div>
          
          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; border-left: 4px solid #2196f3; margin: 20px 0;">
            <h4 style="color: #09122c; margin-top: 0;">ℹ️ Was passiert wenn Sie nichts tun?</h4>
            <p style="color: #333; margin: 5px 0;">
              Ihr Account wird nach Ablauf des Probemonats automatisch deaktiviert. 
              Sie können aber jederzeit wieder aktivieren, wenn Sie sich doch für eine Fortsetzung entscheiden.
            </p>
          </div>
          
          <p style="color: #333; line-height: 1.6;">
            Bei Fragen stehen wir Ihnen gerne zur Verfügung. Rufen Sie uns an oder schreiben Sie uns eine E-Mail!
          </p>
          
          <p style="color: #333; line-height: 1.6;">
            Mit freundlichen Grüßen,<br>
            Ihr housnkuh Team
          </p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
            <h4 style="color: #09122c;">Kontakt:</h4>
            <p style="color: #333; margin: 5px 0;">📞 Telefon: 0157 35711257</p>
            <p style="color: #333; margin: 5px 0;">✉️ E-Mail: eva-maria.schaller@housnkuh.de</p>
            <p style="color: #333; margin: 5px 0;">📍 Adresse: Strauer Str. 15, 96317 Kronach</p>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              © housnkuh - Ihr regionaler Marktplatz<br>
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
      console.log('Trial expiration warning email sent successfully:', result.messageId);
      return true;
    } catch (emailError) {
      console.error('Trial expiration warning email sending error:', emailError);
      
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ In development mode, treating trial warning email as sent successfully');
        return true;
      }
      
      return false;
    }
  } catch (error) {
    console.error('Error in sendTrialExpirationWarning:', error);
    
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ In development mode, treating trial warning email as sent successfully');
      return true;
    }
    
    return false;
  }
};

/**
 * Send trial expired email when trial period has ended
 */
export const sendTrialExpiredEmail = async (
  to: string, 
  name: string, 
  trialEndDate: Date
): Promise<boolean> => {
  try {
    console.log(`Sending trial expired email to: ${to}`);
    
    // Fake success in development mode if email settings are not available
    if (process.env.NODE_ENV === 'development' && 
        (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
      console.warn('⚠️ Running in development mode without email configuration');
      console.log('📧 Trial expired email would be sent to:', to);
      return true;
    }
    
    const transporter = createTransporter();
    
    const subject = '📋 Ihr Probemonat bei housnkuh ist beendet';
    
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
          
          <h2 style="color: #09122c; text-align: center; margin-bottom: 20px;">📋 Ihr Probemonat ist beendet</h2>
          
          <p style="color: #333; line-height: 1.6;">
            Liebe/r ${name},
          </p>
          
          <p style="color: #333; line-height: 1.6;">
            Ihr kostenloser Probemonat bei housnkuh ist am ${formatDate(trialEndDate)} beendet. 
            Vielen Dank, dass Sie housnkuh ausprobiert haben!
          </p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #09122c; margin-top: 0;">📊 Was passiert jetzt?</h3>
            <ul style="color: #333; padding-left: 20px; margin: 10px 0;">
              <li style="margin: 5px 0;">Ihr Account wurde temporär deaktiviert</li>
              <li style="margin: 5px 0;">Ihre Produktdaten bleiben gespeichert</li>
              <li style="margin: 5px 0;">Sie können jederzeit reaktivieren</li>
              <li style="margin: 5px 0;">Keine automatischen Abbuchungen</li>
            </ul>
          </div>
          
          <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h3 style="color: #09122c; margin-top: 0;">🔄 Wieder einsteigen?</h3>
            <p style="color: #333; margin: 10px 0;">
              Falls Sie sich doch für eine Fortsetzung entscheiden möchten, kontaktieren Sie uns einfach. 
              Wir reaktivieren Ihren Account gerne und alle Ihre Daten sind sofort wieder verfügbar.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="mailto:eva-maria.schaller@housnkuh.de?subject=Account%20reaktivieren" style="background-color: #e17564; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px; margin: 10px;">
              Account reaktivieren
            </a>
            <br>
            <a href="tel:015735711257" style="background-color: #09122c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px; margin: 10px;">
              Anrufen
            </a>
          </div>
          
          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; border-left: 4px solid #2196f3; margin: 20px 0;">
            <h4 style="color: #09122c; margin-top: 0;">💬 Ihr Feedback ist wertvoll!</h4>
            <p style="color: #333; margin: 5px 0;">
              Wir würden uns sehr über Ihr Feedback freuen. Was hat Ihnen gefallen? 
              Was können wir verbessern? Ihre Meinung hilft uns, housnkuh noch besser zu machen.
            </p>
          </div>
          
          <div style="background-color: #fffbf0; padding: 15px; border-radius: 5px; border-left: 4px solid #e17564; margin: 20px 0;">
            <h4 style="color: #09122c; margin-top: 0;">🛍️ Als Kunde bleiben Sie willkommen!</h4>
            <p style="color: #333; margin: 5px 0;">
              Auch wenn Sie nicht als Direktvermarkter weitermachen möchten, sind Sie als Kunde 
              jederzeit herzlich willkommen. Besuchen Sie uns gerne in der housnkuh!
            </p>
          </div>
          
          <p style="color: #333; line-height: 1.6;">
            Vielen Dank für Ihr Vertrauen und die Zeit, die Sie mit housnkuh verbracht haben.
          </p>
          
          <p style="color: #333; line-height: 1.6;">
            Mit freundlichen Grüßen,<br>
            Ihr housnkuh Team
          </p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
            <h4 style="color: #09122c;">Kontakt:</h4>
            <p style="color: #333; margin: 5px 0;">📞 Telefon: 0157 35711257</p>
            <p style="color: #333; margin: 5px 0;">✉️ E-Mail: eva-maria.schaller@housnkuh.de</p>
            <p style="color: #333; margin: 5px 0;">📍 Adresse: Strauer Str. 15, 96317 Kronach</p>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              © housnkuh - Ihr regionaler Marktplatz<br>
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
      console.log('Trial expired email sent successfully:', result.messageId);
      return true;
    } catch (emailError) {
      console.error('Trial expired email sending error:', emailError);
      
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ In development mode, treating trial expired email as sent successfully');
        return true;
      }
      
      return false;
    }
  } catch (error) {
    console.error('Error in sendTrialExpiredEmail:', error);
    
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ In development mode, treating trial expired email as sent successfully');
      return true;
    }
    
    return false;
  }
};

// Send cancellation confirmation email
export const sendCancellationConfirmationEmail = async (to: string, name: string, trialEndDate: Date | null): Promise<boolean> => {
  try {
    console.log(`Sending cancellation confirmation email to: ${to}`);
    
    // Fake success in development mode if email settings are not available
    if (process.env.NODE_ENV === 'development' && 
        (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
      console.warn('⚠️ Running in development mode without email configuration');
      console.log('📧 Cancellation confirmation would be sent to:', to);
      return true; // Return success in development mode
    }
    
    const transporter = createTransporter();
    
    const subject = 'Bestätigung Ihrer Kündigung bei housnkuh';
    
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
          
          <p style="color: #333; line-height: 1.6;">
            Hallo ${name},
          </p>
          
          <p style="color: #333; line-height: 1.6;">
            Ihre Registrierung bei housnkuh wurde erfolgreich gekündigt.
          </p>
          
          ${trialEndDate ? `
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="color: #333; margin: 0;">
              <strong>Zugang bis:</strong> ${formatDate(trialEndDate)}<br>
              <small style="color: #666;">Sie können Ihr Konto bis zu diesem Datum weiterhin nutzen.</small>
            </p>
          </div>
          ` : ''}
          
          <p style="color: #333; line-height: 1.6;">
            Wir bedauern, dass Sie sich entschieden haben, housnkuh zu verlassen. 
            Falls Sie Ihre Meinung ändern, können Sie sich jederzeit wieder anmelden.
          </p>
          
          <p style="color: #333; line-height: 1.6;">
            Vielen Dank, dass Sie housnkuh ausprobiert haben!
          </p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
            <h4 style="color: #09122c;">Bei Fragen kontaktieren Sie uns:</h4>
            <p style="color: #333; margin: 5px 0;">📞 Telefon: 0157 35711257</p>
            <p style="color: #333; margin: 5px 0;">✉️ E-Mail: info@housnkuh.de</p>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              © housnkuh - Ihr regionaler Marktplatz<br>
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
      console.log('Cancellation confirmation email sent successfully:', result.messageId);
      return true;
    } catch (emailError) {
      console.error('Cancellation confirmation email sending error:', emailError);
      
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ In development mode, treating cancellation email as sent successfully');
        return true;
      }
      
      return false;
    }
  } catch (error) {
    console.error('Error in sendCancellationConfirmationEmail:', error);
    
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ In development mode, treating cancellation email as sent successfully');
      return true;
    }
    
    return false;
  }
};

// Interface für Package Booking Daten
export interface PackageBookingData {
  vendorName: string;
  email: string;
  confirmationToken?: string; // Optional: für E-Mail-Bestätigung
  packageData: {
    selectedProvisionType: string;
    packageCounts: Record<string, number>;
    packageOptions: Array<{id: string, name: string, price: number}>;
    selectedAddons: string[];
    rentalDuration: number;
    totalCost: {
      monthly: number;
      provision: number;
    };
  };
}

// Funktion zum Senden einer Buchungsbestätigung für Package Builder
export const sendBookingConfirmation = async (bookingData: PackageBookingData): Promise<boolean> => {
  try {
    console.log(`Sending booking confirmation to: ${bookingData.email}`);
    
    // Fake success in development mode if email settings are not available
    if (process.env.NODE_ENV === 'development' && 
        (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
      console.warn('⚠️ Running in development mode without email configuration');
      console.log('📧 Booking confirmation would be sent with data:', bookingData);
      return true; // Return success in development mode
    }
    
    const transporter = createTransporter();
    
    const subject = 'Buchungsbestätigung - Ihr housnkuh Paket';
    
    // Berechne Verkaufsflächen Details
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

    // Store Status prüfen für korrekte Trial-Nachrichten
    const Settings = require('../models/Settings').default;
    const settings = await Settings.getSettings();
    const isStoreOpen = settings.isStoreOpen();
    
    let trialStartDate = new Date();
    let trialEndDate = new Date();
    let trialMessage = '';
    
    if (isStoreOpen) {
      // Store ist offen - Trial startet sofort
      trialEndDate.setDate(trialEndDate.getDate() + 30);
      trialMessage = `
        <div style="background-color: #e8f5e8; border: 1px solid #4caf50; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <h3 style="color: #2e7d32; margin: 0 0 15px 0; font-size: 18px;">
            ✅ 30 Tage kostenloser Probemonat startet jetzt!
          </h3>
          <p style="color: #2e7d32; margin: 0; font-size: 14px;">
            Ihr Probemonat läuft bis zum <strong>${trialEndDate.toLocaleDateString('de-DE')}</strong>. 
            Sie können in dieser Zeit alle Funktionen kostenlos nutzen und jederzeit kündigen.
          </p>
        </div>`;
    } else {
      // Store ist noch nicht offen - Trial startet bei Eröffnung
      if (settings.storeOpening.openingDate) {
        trialStartDate = new Date(settings.storeOpening.openingDate);
        trialEndDate = new Date(settings.storeOpening.openingDate);
        trialEndDate.setDate(trialEndDate.getDate() + 30);
        trialMessage = `
          <div style="background-color: #e8f4fd; border: 1px solid #2196f3; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3 style="color: #1565c0; margin: 0 0 15px 0; font-size: 18px;">
              🗓️ 30 Tage kostenloser Probemonat startet bei Store-Eröffnung!
            </h3>
            <p style="color: #1565c0; margin: 0; font-size: 14px;">
              Ihr Probemonat startet automatisch am <strong>${trialStartDate.toLocaleDateString('de-DE')}</strong> mit der Store-Eröffnung 
              und läuft bis zum <strong>${trialEndDate.toLocaleDateString('de-DE')}</strong>. 
              Die Mietdauer Ihrer Verkaufsflächen beginnt ebenfalls erst ab der Store-Eröffnung.
            </p>
          </div>`;
      } else {
        trialMessage = `
          <div style="background-color: #e8f4fd; border: 1px solid #2196f3; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3 style="color: #1565c0; margin: 0 0 15px 0; font-size: 18px;">
              🗓️ 30 Tage kostenloser Probemonat startet bei Store-Eröffnung!
            </h3>
            <p style="color: #1565c0; margin: 0; font-size: 14px;">
              Ihr Probemonat startet automatisch mit der Store-Eröffnung. 
              Die Mietdauer Ihrer Verkaufsflächen beginnt ebenfalls erst ab der Store-Eröffnung.
              Wir informieren Sie rechtzeitig über den genauen Eröffnungstermin.
            </p>
          </div>`;
      }
    }
    
    const html = `
      <div style="font-family: 'Quicksand', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #09122c; margin: 0;">housnkuh</h1>
            <p style="color: #666; margin: 10px 0;">Regionaler Marktplatz Kronach</p>
          </div>
          
          <h2 style="color: #09122c; text-align: center; margin-bottom: 20px;">🎉 Buchungsbestätigung</h2>
          
          <p style="color: #333; line-height: 1.6;">
            Hallo ${bookingData.vendorName},
          </p>
          
          <p style="color: #333; line-height: 1.6;">
            herzlich willkommen bei housnkuh! Ihre Paket-Buchung war erfolgreich und wir freuen uns, Sie als neuen Direktvermarkter bei uns begrüßen zu dürfen.
          </p>
          
          ${trialMessage}

          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #09122c; margin-top: 0;">📦 Ihr gebuchtes Paket:</h3>
            
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
                  ${bookingData.packageData.totalCost.monthly.toFixed(2)}€ ${isStoreOpen ? `(ab ${trialEndDate.toLocaleDateString('de-DE')})` : `(ab Store-Eröffnung ${trialStartDate.toLocaleDateString('de-DE')})`}
                </td>
              </tr>
            </table>

            ${selectedPackages && selectedPackages.length > 0 ? `
            <h4 style="color: #09122c; margin: 15px 0 10px 0;">Gewählte Verkaufsflächen:</h4>
            ${selectedPackages.map(pkg => {
              if (!pkg) return '';
              return `
              <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dotted #ddd;">
                <span style="color: #333;">${pkg.count}x ${pkg.name}</span>
                <span style="color: #333; font-weight: bold;">${pkg.total.toFixed(2)}€/Monat</span>
              </div>
              `;
            }).join('')}
            ` : ''}

            ${bookingData.packageData.selectedAddons && bookingData.packageData.selectedAddons.length > 0 ? `
            <h4 style="color: #09122c; margin: 15px 0 10px 0;">Zusatzoptionen:</h4>
            <p style="color: #333; font-size: 14px;">${bookingData.packageData.selectedAddons.join(', ')}</p>
            ` : ''}
          </div>
          
${bookingData.confirmationToken ? `
          <div style="background-color: #fff3cd; border: 1px solid #ffeeba; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3 style="color: #856404; margin: 0 0 10px 0; font-size: 16px;">
              ⚠️ Wichtig: E-Mail-Adresse bestätigen
            </h3>
            <p style="color: #856404; margin: 10px 0; font-size: 14px;">
              Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse, um Ihre Buchung zu aktivieren:
            </p>
            <div style="text-align: center; margin: 15px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/vendor/confirm?token=${bookingData.confirmationToken}" 
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
              ${bookingData.confirmationToken ? '<li>Bestätigen Sie Ihre E-Mail-Adresse (Link oben)</li>' : ''}
              <li>Unser Team prüft Ihre Buchung (innerhalb von 2 Werktagen)</li>
              <li>Wir weisen Ihnen passende Mietfächer zu</li>
              <li>Sie erhalten eine weitere E-Mail mit den finalen Details</li>
              <li>Der Vertrag wird erstellt und Sie können starten!</li>
            </ol>
          </div>
          
          <h3 style="color: #09122c; margin: 30px 0 15px 0;">🎯 Ihre Vorteile im Probemonat:</h3>
          <ul style="color: #333; line-height: 1.6; padding-left: 20px;">
            <li>Kostenloser Test aller Funktionen</li>
            <li>Zugang zum housnkuh-Kassensystem</li>
            <li>Tägliche Verkaufsübersichten</li>
            <li>Support und Beratung</li>
            <li>Jederzeit kündbar ohne Kosten</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #666; font-size: 14px;">
              Bei Fragen können Sie uns jederzeit unter <a href="mailto:info@housnkuh.de" style="color: #e17564;">info@housnkuh.de</a> erreichen.
            </p>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
            <h4 style="color: #09122c;">Kontakt & Support:</h4>
            <p style="color: #333; margin: 5px 0;">📞 Telefon: 0157 35711257</p>
            <p style="color: #333; margin: 5px 0;">✉️ E-Mail: eva-maria.schaller@housnkuh.de</p>
            <p style="color: #333; margin: 5px 0;">📍 Adresse: Strauer Str. 15, 96317 Kronach</p>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              © housnkuh - Ihr regionaler Marktplatz<br>
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
    
    console.log('Sending booking confirmation email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });
    
    try {
      const result = await transporter.sendMail(mailOptions);
      console.log('Booking confirmation email sent successfully:', result.messageId);
      return true;
    } catch (emailError) {
      console.error('Booking confirmation email sending error:', emailError);
      
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ In development mode, treating booking confirmation email as sent successfully');
        return true; // Return success in development mode
      }
      
      return false;
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('Detailed booking confirmation email error:', {
        message: error.message,
      });
    } else {
      console.error('Detailed booking confirmation email error:', error);
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ In development mode, treating booking confirmation email as sent successfully');
      return true; // Return success in development mode
    }
    
    return false;
  }
};

// Interface für Admin-Bestätigung
export interface AdminConfirmationData {
  vendorName: string;
  email: string;
  mietfaecher: Array<{_id: string, bezeichnung: string, typ: string, preis: number}>;
  vertrag: any;
  packageData: any;
}

// Funktion zum Senden einer Admin-Bestätigung für zugewiesene Mietfächer
export const sendAdminConfirmationEmail = async (adminConfirmationData: AdminConfirmationData): Promise<boolean> => {
  try {
    console.log(`Sending admin confirmation email to: ${adminConfirmationData.email}`);
    
    // Fake success in development mode if email settings are not available
    if (process.env.NODE_ENV === 'development' && 
        (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
      console.warn('⚠️ Running in development mode without email configuration');
      console.log('📧 Admin confirmation would be sent with data:', adminConfirmationData);
      return true; // Return success in development mode
    }
    
    const transporter = createTransporter();
    
    const subject = 'Mietfach-Zuweisung bestätigt - Ihr housnkuh Vertrag ist aktiv!';
    
    // Store Status prüfen
    const Settings = require('../models/Settings').default;
    const settings = await Settings.getSettings();
    const isStoreOpen = settings.isStoreOpen();
    
    // Berechne wichtige Daten abhängig vom Store Status
    let trialStartDate: Date;
    let trialEndDate: Date;
    let contractEndDate: Date;
    let statusMessage: string;
    
    if (isStoreOpen) {
      // Store ist offen - alles startet sofort
      trialStartDate = new Date();
      trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 30);
      
      contractEndDate = new Date(trialEndDate);
      contractEndDate.setMonth(contractEndDate.getMonth() + (adminConfirmationData.packageData.rentalDuration || 3));
      
      statusMessage = `✅ Ihr kostenloser Probemonat läuft noch bis zum ${trialEndDate.toLocaleDateString('de-DE')}`;
    } else {
      // Store ist noch nicht offen - alles startet bei Store-Eröffnung
      if (settings.storeOpening.openingDate) {
        trialStartDate = new Date(settings.storeOpening.openingDate);
        trialEndDate = new Date(settings.storeOpening.openingDate);
        trialEndDate.setDate(trialEndDate.getDate() + 30);
        
        contractEndDate = new Date(trialEndDate);
        contractEndDate.setMonth(contractEndDate.getMonth() + (adminConfirmationData.packageData.rentalDuration || 3));
        
        statusMessage = `🗓️ Ihr kostenloser Probemonat startet mit der Store-Eröffnung am ${trialStartDate.toLocaleDateString('de-DE')} und läuft bis zum ${trialEndDate.toLocaleDateString('de-DE')}`;
      } else {
        // Fallback wenn kein Öffnungsdatum gesetzt
        trialStartDate = new Date();
        trialStartDate.setMonth(trialStartDate.getMonth() + 3);
        trialEndDate = new Date(trialStartDate);
        trialEndDate.setDate(trialEndDate.getDate() + 30);
        
        contractEndDate = new Date(trialEndDate);
        contractEndDate.setMonth(contractEndDate.getMonth() + (adminConfirmationData.packageData.rentalDuration || 3));
        
        statusMessage = `🗓️ Ihr kostenloser Probemonat startet mit der Store-Eröffnung`;
      }
    }
    
    const totalMonthlyCost = adminConfirmationData.mietfaecher.reduce((sum, mietfach) => sum + mietfach.preis, 0);
    
    const html = `
      <div style="font-family: 'Quicksand', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #09122c; margin: 0;">housnkuh</h1>
            <p style="color: #666; margin: 10px 0;">Regionaler Marktplatz Kronach</p>
          </div>
          
          <h2 style="color: #09122c; text-align: center; margin-bottom: 20px;">🎉 Ihre Mietfächer sind zugewiesen!</h2>
          
          <p style="color: #333; line-height: 1.6;">
            Hallo ${adminConfirmationData.vendorName},
          </p>
          
          <p style="color: #333; line-height: 1.6;">
            großartige Neuigkeiten! Unser Team hat Ihre Buchung geprüft und Ihnen passende Mietfächer zugewiesen. 
            Ihr Vertrag ist jetzt aktiv und Sie können mit dem Verkauf beginnen!
          </p>
          
          <div style="background-color: ${isStoreOpen ? '#e8f5e8' : '#cfe2ff'}; border: 1px solid ${isStoreOpen ? '#4caf50' : '#86b7fe'}; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3 style="color: ${isStoreOpen ? '#2e7d32' : '#0c63e4'}; margin: 0 0 15px 0; font-size: 18px;">
              ${statusMessage}
            </h3>
            <p style="color: ${isStoreOpen ? '#2e7d32' : '#0c63e4'}; margin: 0; font-size: 14px;">
              Nach dem Probemonat beginnt Ihr gewählter Vertrag (${adminConfirmationData.packageData.rentalDuration} Monate) 
              bis zum ${contractEndDate.toLocaleDateString('de-DE')}.
            </p>
          </div>

          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #09122c; margin-top: 0;">📍 Ihre zugewiesenen Mietfächer:</h3>
            
            ${adminConfirmationData.mietfaecher.map(mietfach => `
              <div style="background-color: white; padding: 15px; margin: 10px 0; border-radius: 8px; border: 1px solid #ddd;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <h4 style="color: #09122c; margin: 0 0 5px 0;">${mietfach.bezeichnung}</h4>
                    <p style="color: #666; margin: 0; font-size: 14px;">Typ: ${mietfach.typ}</p>
                  </div>
                  <div style="text-align: right;">
                    <span style="color: #e17564; font-weight: bold; font-size: 16px;">${mietfach.preis}€/Monat</span>
                  </div>
                </div>
              </div>
            `).join('')}
            
            <div style="border-top: 2px solid #09122c; padding-top: 15px; margin-top: 15px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #09122c; font-weight: bold; font-size: 16px;">Gesamt monatlich:</span>
                <span style="color: #e17564; font-weight: bold; font-size: 18px;">${totalMonthlyCost.toFixed(2)}€</span>
              </div>
              <p style="color: #666; font-size: 12px; margin: 5px 0 0 0;">
                (Erste 30 Tage kostenlos, danach ${totalMonthlyCost.toFixed(2)}€/Monat)
              </p>
            </div>
          </div>
          
          <div style="background-color: #fff3cd; border: 1px solid #ffeeba; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3 style="color: #856404; margin: 0 0 10px 0; font-size: 16px;">
              🚀 So geht's weiter:
            </h3>
            <ol style="color: #856404; margin: 10px 0; padding-left: 20px; font-size: 14px;">
              ${isStoreOpen ? `
              <li>Besuchen Sie uns vor Ort, um Ihre Mietfächer zu besichtigen</li>
              <li>Bringen Sie Ihre Produkte mit und richten Sie Ihre Flächen ein</li>
              <li>Unser Team erklärt Ihnen das Kassensystem</li>
              <li>Ab sofort können Kunden Ihre Produkte kaufen!</li>
              ` : `
              <li>Wir informieren Sie rechtzeitig vor der Store-Eröffnung</li>
              <li>Sie können dann Ihre Mietfächer besichtigen</li>
              <li>Richten Sie Ihre Flächen ein und bereiten Sie sich auf den Start vor</li>
              <li>Ab Store-Eröffnung können Kunden Ihre Produkte kaufen!</li>
              `}
            </ol>
          </div>
          
          <h3 style="color: #09122c; margin: 30px 0 15px 0;">📋 Vertragsinformationen:</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666; width: 180px;"><strong>Vertragsnummer:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">V${new Date().getFullYear()}-${String(adminConfirmationData.vertrag._id).slice(-6)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;"><strong>${isStoreOpen ? 'Probemonat bis:' : 'Probemonat Start:'}</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${isStoreOpen ? trialEndDate.toLocaleDateString('de-DE') : trialStartDate.toLocaleDateString('de-DE') + ' (bei Store-Eröffnung)'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;"><strong>Vertrag bis:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${contractEndDate.toLocaleDateString('de-DE')}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;"><strong>Provision:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${adminConfirmationData.packageData.totalCost?.provision || 4}%</td>
            </tr>
          </table>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #666; font-size: 14px;">
              Bei Fragen können Sie uns jederzeit unter <a href="mailto:info@housnkuh.de" style="color: #e17564;">info@housnkuh.de</a> erreichen.
            </p>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
            <h4 style="color: #09122c;">Kontakt & Öffnungszeiten:</h4>
            <p style="color: #333; margin: 5px 0;">📞 Telefon: 0157 35711257</p>
            <p style="color: #333; margin: 5px 0;">✉️ E-Mail: eva-maria.schaller@housnkuh.de</p>
            <p style="color: #333; margin: 5px 0;">📍 Adresse: Strauer Str. 15, 96317 Kronach</p>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              © housnkuh - Ihr regionaler Marktplatz<br>
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
    
    console.log('Sending admin confirmation email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });
    
    try {
      const result = await transporter.sendMail(mailOptions);
      console.log('Admin confirmation email sent successfully:', result.messageId);
      return true;
    } catch (emailError) {
      console.error('Admin confirmation email sending error:', emailError);
      
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ In development mode, treating admin confirmation email as sent successfully');
        return true; // Return success in development mode
      }
      
      return false;
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('Detailed admin confirmation email error:', {
        message: error.message,
      });
    } else {
      console.error('Detailed admin confirmation email error:', error);
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ In development mode, treating admin confirmation email as sent successfully');
      return true; // Return success in development mode
    }
    
    return false;
  }
};

// Send admin notification for launch day activations
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
    console.log('Sending launch day activation notification to admins:', adminEmails);
    
    if (!isConfigured()) {
      console.warn('⚠️ Email service not configured');
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 Would send launch day notification to:', adminEmails);
        console.log('📊 Activation results:', activationResult);
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
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/dashboard" 
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
          console.error(`Failed to send launch notification to ${email}:`, err);
          return null;
        })
      )
    );
    
    const successCount = results.filter(r => r !== null).length;
    console.log(`Launch day notification sent to ${successCount}/${adminEmails.length} admins`);
    
    return successCount > 0;
    
  } catch (error) {
    console.error('Error sending launch day activation notification:', error);
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ In development mode, treating launch notification as sent');
      return true;
    }
    return false;
  }
};

// Monitoring alert email interface
export interface MonitoringAlertData {
  alertId: string;
  severity: 'warning' | 'critical' | 'emergency';
  title: string;
  message: string;
  timestamp: Date;
  details: any;
}

// Function to send monitoring alerts to administrators
export const sendMonitoringAlert = async (to: string, alertData: MonitoringAlertData): Promise<boolean> => {
  try {
    console.log(`Sending monitoring alert to: ${to}, severity: ${alertData.severity}`);
    
    // Fake success in development mode if email settings are not available
    if (process.env.NODE_ENV === 'development' && 
        (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
      console.warn('⚠️ Running in development mode without email configuration');
      console.log('🚨 Would send monitoring alert:', alertData);
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
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/dashboard" 
               style="display: inline-block; padding: 12px 30px; background-color: #09122c; color: white; text-decoration: none; border-radius: 5px; margin-right: 10px;">
              View Dashboard
            </a>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/health" 
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
    
    console.log('Sending monitoring alert:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      severity: alertData.severity
    });
    
    try {
      const result = await transporter.sendMail(mailOptions);
      console.log('Monitoring alert sent successfully:', result.messageId);
      return true;
    } catch (emailError) {
      console.error('Monitoring alert email error:', emailError);
      
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ In development mode, treating monitoring alert as sent successfully');
        return true;
      }
      
      return false;
    }
  } catch (error) {
    console.error('Error in sendMonitoringAlert:', error);
    
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ In development mode, treating monitoring alert as sent successfully');
      return true;
    }
    
    return false;
  }
};