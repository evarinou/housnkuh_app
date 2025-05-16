// server/src/utils/emailService.ts
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Konfiguration des E-Mail-Transports
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.yourprovider.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || ''
  }
});

// Funktion zum Senden einer Newsletter-Bestätigungsmail
export const sendNewsletterConfirmation = async (to: string, token: string, type: string): Promise<boolean> => {
  try {
    const baseUrl = process.env.FRONTEND_URL || 'https://housnkuh.de';
    const confirmUrl = `${baseUrl}/newsletter-confirm?token=${token}&type=${type}`;
    
    const subject = 'Bestätigen Sie Ihren Newsletter bei housnkuh';
    
    let typeText = type === 'vendor' ? 'als Direktvermarkter' : 'als Kunde';
    
    const html = `
      <div style="font-family: 'Quicksand', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <img src="${baseUrl}/logo.png" alt="housnkuh Logo" style="display: block; margin: 20px auto; max-width: 150px;">
        <h2 style="color: #09122c; text-align: center;">Newsletter-Anmeldung bestätigen</h2>
        <p>Vielen Dank für Ihre Anmeldung zum housnkuh-Newsletter ${typeText}!</p>
        <p>Um Ihre Anmeldung zu bestätigen, klicken Sie bitte auf den folgenden Button:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${confirmUrl}" style="background-color: #e17564; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Newsletter bestätigen
          </a>
        </div>
        <p>Alternativ können Sie auch diesen Link in Ihren Browser kopieren:</p>
        <p><a href="${confirmUrl}">${confirmUrl}</a></p>
        <p>Der Link ist 24 Stunden gültig.</p>
        <p>Sollten Sie sich nicht für unseren Newsletter angemeldet haben, können Sie diese E-Mail ignorieren.</p>
        <p style="margin-top: 30px; font-size: 14px; color: #666; text-align: center;">
          © housnkuh - Strauer Str. 15, 96317 Kronach
        </p>
      </div>
    `;
    
    await transporter.sendMail({
      from: `"housnkuh" <${process.env.EMAIL_FROM || 'info@housnkuh.de'}>`,
      to,
      subject,
      html
    });
    
    return true;
  } catch (error) {
    console.error('Fehler beim Senden der Bestätigungs-E-Mail:', error);
    return false;
  }
};