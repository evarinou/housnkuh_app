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
    
    // Fake success in development mode if email settings are not available
    if (process.env.NODE_ENV === 'development' && 
        (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
      console.warn('⚠️ Running in development mode without email configuration');
      console.log('🔗 Vendor confirmation URL would be:', `${process.env.FRONTEND_URL || 'http://localhost:3000'}/vendor/confirm?token=${token}`);
      return true; // Return success in development mode
    }
    
    const transporter = createTransporter();
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const confirmUrl = `${baseUrl}/vendor/confirm?token=${token}`;
    
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