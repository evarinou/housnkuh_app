// server/src/utils/emailService.ts - Debug-Version
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Erweiterte E-Mail-Service-Konfiguration mit Debugging
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
    logger: true // Detaillierte Logs
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
    
    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    
    return true;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Detailed email error:', {
        message: error.message,
        // Optionally add more properties if you know the error type
      });
    } else {
      console.error('Detailed email error:', error);
    }
    return false;
  }
};