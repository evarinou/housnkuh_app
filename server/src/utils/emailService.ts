// server/src/utils/emailService.ts - Korrigierte Version
import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

dotenv.config();

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
    
    const result = await transporter.sendMail(mailOptions);
    console.log('Vendor welcome email sent successfully:', result.messageId);
    
    return true;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Detailed vendor email error:', {
        message: error.message,
      });
    } else {
      console.error('Detailed vendor email error:', error);
    }
    return false;
  }
};