// server/scripts/seeds/seed-email-templates.js
// Erstellt die Standard Email Templates in der Datenbank

const mongoose = require('mongoose');
const EmailTemplate = require('../../src/models/EmailTemplate.ts').default;
require('dotenv').config();

const emailTemplates = [
  // === PHASE 1 TEMPLATES - CRITICAL USER EXPERIENCE ===
  
  {
    templateId: 'booking_confirmation',
    name: 'Buchungsbestätigung',
    type: 'booking_confirmation',
    subject: 'Buchungsbestätigung - dein housnkuh Paket',
    htmlBody: `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Buchungsbestätigung</title>
  <style>
    body { font-family: 'Quicksand', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
    .container { background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #09122c; margin: 0; }
    .header p { color: #666; margin: 10px 0; }
    .trial-info { background-color: #e3f2fd; border: 1px solid #2196f3; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .trial-info h3 { color: #1976d2; margin: 0 0 15px 0; font-size: 18px; }
    .trial-info p { color: #1976d2; margin: 0; font-size: 14px; }
    .package-details { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .package-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    .package-table td { padding: 8px 0; border-bottom: 1px solid #eee; }
    .package-table .label { color: #666; width: 180px; font-weight: bold; }
    .package-table .value { color: #333; }
    .zusatzleistungen { background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 15px; margin: 20px 0; border-radius: 8px; }
    .zusatzleistungen h4 { color: #1d4ed8; margin: 0 0 10px 0; font-size: 16px; }
    .service-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dotted #bfdbfe; }
    .service-name { color: #1e40af; }
    .service-desc { font-size: 12px; color: #64748b; }
    .service-price { color: #1e40af; font-weight: bold; }
    .confirmation-section { background-color: #fff3cd; border: 1px solid #ffeeba; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .next-steps { background-color: #fff3cd; border: 1px solid #ffeeba; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .next-steps h3 { color: #856404; margin: 0 0 10px 0; font-size: 16px; }
    .next-steps ol { color: #856404; margin: 10px 0; padding-left: 20px; font-size: 14px; }
    .benefits { color: #333; line-height: 1.6; padding-left: 20px; }
    .contact-info { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; }
    .contact-info h4 { color: #09122c; }
    .contact-info p { color: #333; margin: 5px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; }
    .footer p { color: #666; font-size: 12px; margin: 0; }
    .footer a { color: #e17564; }
    .button { background-color: #e17564; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>housnkuh</h1>
      <p>Regionaler Marktplatz Kronach</p>
    </div>
    
    <h2 style="color: #09122c; text-align: center; margin-bottom: 20px;">📋 deine Paketübersicht</h2>
    
    <p>Hallo {{vendorName}},</p>
    
    <p>herzlich willkommen bei housnkuh! deine Paket-Buchung war erfolgreich und wir freuen uns, du als neuen Direktvermarkter bei uns begrüßen zu dürfen.</p>
    
    <div class="trial-info">
      <h3>🏪 30 Tage kostenloser Probemonat startet bei Store-Eröffnung</h3>
      <p>Die Mietdauer der gewählten Verkaufsflächen beginnt nach Ablauf des Probemonats. du kannst während des Probemonats alle Funktionen kostenlos nutzen und jederzeit kündigen.</p>
    </div>

    <div class="package-details">
      <h3 style="color: #09122c; margin-top: 0;">📦 dein gebuchtes Paket:</h3>
      
      <table class="package-table">
        <tr>
          <td class="label">Provisionsmodell:</td>
          <td class="value">{{provisionModel}} ({{provisionRate}}% Provision)</td>
        </tr>
        <tr>
          <td class="label">Vertragslaufzeit:</td>
          <td class="value">{{rentalDuration}} Monate (nach Probemonat)</td>
        </tr>
        <tr>
          <td class="label">Monatliche Kosten:</td>
          <td class="value" style="font-weight: bold;">{{monthlyCost}}€ (ab {{trialEndDate}})</td>
        </tr>
      </table>

      {{#if selectedPackages}}
      <h4 style="color: #09122c; margin: 15px 0 10px 0;">Gewählte Verkaufsflächen:</h4>
      {{#each selectedPackages}}
      <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dotted #ddd;">
        <span>{{count}}x {{name}}</span>
        <span style="font-weight: bold;">{{total}}€/Monat</span>
      </div>
      {{/each}}
      {{/if}}

      {{#if hasZusatzleistungen}}
      <div class="zusatzleistungen">
        <h4>📦 Zusatzleistungen</h4>
        {{#if lagerservice}}
        <div class="service-item">
          <div>
            <div class="service-name"><strong>🏪 Lagerservice</strong></div>
            <div class="service-desc">Professionelle Lagerung deiner Produkte</div>
          </div>
          <span class="service-price">{{lagerserviceKosten}}€/Monat</span>
        </div>
        {{/if}}
        {{#if versandservice}}
        <div class="service-item">
          <div>
            <div class="service-name"><strong>🚚 Versandservice</strong></div>
            <div class="service-desc">Versand direkt vom Lager an deine Kunden</div>
          </div>
          <span class="service-price">{{versandserviceKosten}}€/Monat</span>
        </div>
        {{/if}}
      </div>
      {{/if}}
    </div>
    
    {{#if confirmationToken}}
    <div class="confirmation-section">
      <h3 style="color: #856404; margin: 0 0 10px 0; font-size: 16px;">⚠️ Wichtig: E-Mail-Adresse bestätigen</h3>
      <p style="color: #856404; margin: 10px 0; font-size: 14px;">Bitte bestätige zuerst deine E-Mail-Adresse, um deine Buchung zu aktivieren:</p>
      <div style="text-align: center; margin: 15px 0;">
        <a href="{{siteUrl}}/vendor/confirm?token={{confirmationToken}}" class="button">
          E-Mail-Adresse bestätigen
        </a>
      </div>
    </div>
    {{/if}}
    
    <div class="next-steps">
      <h3>📋 Was passiert als nächstes?</h3>
      <ol>
        {{#if confirmationToken}}<li>Bestätige deine E-Mail-Adresse (Link oben)</li>{{/if}}
        <li>Wir weisen dir passende Mietfächer zu</li>
        <li>du erhältst eine weitere E-Mail mit den finalen Details</li>
        <li>du kannst starten!</li>
      </ol>
    </div>
    
    <h3 style="color: #09122c; margin: 30px 0 15px 0;">🎯 deine Vorteile im Probemonat:</h3>
    <ul class="benefits">
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
    
    <div class="contact-info">
      <h4>Kontakt & Support:</h4>
      <p>📞 Telefon: 0157 35711257</p>
      <p>✉️ E-Mail: eva-maria.schaller@housnkuh.de</p>
      <p>📍 Adresse: Strauer Str. 15, 96317 Kronach</p>
    </div>
    
    <div class="footer">
      <p>© housnkuh - dein regionaler Marktplatz<br>
      <a href="{{siteUrl}}">www.housnkuh.de</a></p>
    </div>
  </div>
</body>
</html>`,
    textBody: `Buchungsbestätigung - dein housnkuh Paket

Hallo {{vendorName}},

herzlich willkommen bei housnkuh! deine Paket-Buchung war erfolgreich.

30 Tage kostenloser Probemonat startet bei Store-Eröffnung
Die Mietdauer der gewählten Verkaufsflächen beginnt nach Ablauf des Probemonats.

dein gebuchtes Paket:
- Provisionsmodell: {{provisionModel}} ({{provisionRate}}% Provision)
- Vertragslaufzeit: {{rentalDuration}} Monate (nach Probemonat)
- Monatliche Kosten: {{monthlyCost}}€ (ab {{trialEndDate}})

{{#if confirmationToken}}
Wichtig: E-Mail-Adresse bestätigen
{{siteUrl}}/vendor/confirm?token={{confirmationToken}}
{{/if}}

Was passiert als nächstes?
1. {{#if confirmationToken}}Bestätige deine E-Mail-Adresse{{/if}}
2. Wir weisen dir passende Mietfächer zu
3. du erhältst eine weitere E-Mail mit den finalen Details
4. du kannst starten!

deine Vorteile im Probemonat:
- Kostenloser Test aller Funktionen
- Zugang zum housnkuh-Kassensystem
- Tägliche Verkaufsübersichten
- Support und Beratung
- Jederzeit kündbar ohne Kosten

Kontakt & Support:
📞 Telefon: 0157 35711257
✉️ E-Mail: eva-maria.schaller@housnkuh.de
📍 Adresse: Strauer Str. 15, 96317 Kronach

© housnkuh - dein regionaler Marktplatz
{{siteUrl}}`,
    variables: ['vendorName', 'provisionModel', 'provisionRate', 'rentalDuration', 'monthlyCost', 'trialEndDate', 'selectedPackages', 'hasZusatzleistungen', 'lagerservice', 'versandservice', 'lagerserviceKosten', 'versandserviceKosten', 'confirmationToken', 'siteUrl'],
    description: 'Buchungsbestätigung nach erfolgreicher Paket-Buchung mit Trial-Informationen und Paket-Details',
    category: 'vendor',
    isActive: true,
    version: 1
  },

  {
    templateId: 'contact_form_admin',
    name: 'Kontaktformular - Admin Benachrichtigung',
    type: 'contact_form_admin',
    subject: 'Neue Kontaktanfrage: {{subject}}',
    htmlBody: `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Neue Kontaktanfrage</title>
  <style>
    body { font-family: 'Quicksand', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
    .container { background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #09122c; margin: 0; }
    .header p { color: #666; margin: 10px 0; }
    .contact-details { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .contact-table { width: 100%; border-collapse: collapse; }
    .contact-table td { padding: 8px 0; border-bottom: 1px solid #eee; }
    .contact-table .label { color: #666; width: 120px; font-weight: bold; }
    .contact-table .value { color: #333; }
    .message-box { background-color: white; padding: 15px; border-radius: 5px; border: 1px solid #eee; color: #333; line-height: 1.6; margin-top: 20px; }
    .note-section { background-color: #fffbf0; padding: 15px; border-radius: 5px; border-left: 4px solid #e17564; margin: 20px 0; }
    .note-section h4 { color: #09122c; margin-top: 0; }
    .note-section p { color: #333; margin: 5px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; }
    .footer p { color: #666; font-size: 12px; margin: 0; }
    .footer a { color: #e17564; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>housnkuh</h1>
      <p>Kontaktformular-Anfrage</p>
    </div>
    
    <h2 style="color: #09122c; margin-bottom: 20px;">Neue Kontaktanfrage</h2>
    
    <div class="contact-details">
      <h3 style="color: #09122c; margin-top: 0;">Kontaktdetails:</h3>
      
      <table class="contact-table">
        <tr>
          <td class="label">Name:</td>
          <td class="value">{{name}}</td>
        </tr>
        <tr>
          <td class="label">E-Mail:</td>
          <td class="value">{{email}}</td>
        </tr>
        {{#if phone}}
        <tr>
          <td class="label">Telefon:</td>
          <td class="value">{{phone}}</td>
        </tr>
        {{/if}}
        <tr>
          <td class="label">Betreff:</td>
          <td class="value">{{subject}}</td>
        </tr>
        <tr>
          <td class="label">Datum:</td>
          <td class="value">{{currentDate}} {{currentTime}}</td>
        </tr>
      </table>
      
      <div>
        <h4 style="color: #09122c; margin-bottom: 10px;">Nachricht:</h4>
        <div class="message-box">{{message}}</div>
      </div>
    </div>
    
    <div class="note-section">
      <h4>Hinweis:</h4>
      <p>Diese Anfrage wurde über das Kontaktformular auf der Website gesendet. Bitte antworte dem Kunden so schnell wie möglich.</p>
    </div>
    
    <div class="footer">
      <p>© housnkuh - Automatisch generierte E-Mail<br>
      <a href="{{siteUrl}}">www.housnkuh.de</a></p>
    </div>
  </div>
</body>
</html>`,
    variables: ['name', 'email', 'phone', 'subject', 'message', 'currentDate', 'currentTime', 'siteUrl'],
    description: 'Admin-Benachrichtigung bei neuen Kontaktformular-Anfragen',
    category: 'admin',
    isActive: true,
    version: 1
  },

  {
    templateId: 'contact_form_user_confirmation',
    name: 'Kontaktformular - Bestätigung für Absender',
    type: 'contact_form_user_confirmation',
    subject: 'deine Kontaktanfrage bei housnkuh: {{subject}}',
    htmlBody: `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kontaktanfrage Bestätigung</title>
  <style>
    body { font-family: 'Quicksand', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
    .container { background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #09122c; margin: 0; }
    .header p { color: #666; margin: 10px 0; }
    .summary-box { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .summary-table { width: 100%; border-collapse: collapse; }
    .summary-table td { padding: 8px 0; border-bottom: 1px solid #eee; }
    .summary-table .label { color: #666; width: 120px; font-weight: bold; }
    .summary-table .value { color: #333; }
    .message-box { background-color: white; padding: 15px; border-radius: 5px; border: 1px solid #eee; color: #333; line-height: 1.6; margin-top: 20px; }
    .next-steps { background-color: #fffbf0; padding: 15px; border-radius: 5px; border-left: 4px solid #e17564; margin: 20px 0; }
    .next-steps h4 { color: #09122c; margin-top: 0; }
    .next-steps p { color: #333; margin: 5px 0; }
    .contact-info { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; }
    .contact-info h4 { color: #09122c; }
    .contact-info p { color: #333; margin: 5px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; }
    .footer p { color: #666; font-size: 12px; margin: 0; }
    .footer a { color: #e17564; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>housnkuh</h1>
      <p>Regionaler Marktplatz Kronach</p>
    </div>
    
    <h2 style="color: #09122c; text-align: center; margin-bottom: 20px;">Vielen Dank für deine Anfrage!</h2>
    
    <p>Hallo {{name}},</p>
    
    <p>vielen Dank für deine Kontaktanfrage. housnkuh hat deine Nachricht erhalten und Eva-Maria Schaller meldet sich so schnell wie möglich bei dir.</p>
    
    <div class="summary-box">
      <h3 style="color: #09122c; margin-top: 0;">deine Anfrage im Überblick:</h3>
      
      <table class="summary-table">
        <tr>
          <td class="label">Betreff:</td>
          <td class="value">{{subject}}</td>
        </tr>
        <tr>
          <td class="label">Datum:</td>
          <td class="value">{{currentDate}} {{currentTime}}</td>
        </tr>
      </table>
      
      <div>
        <h4 style="color: #09122c; margin-bottom: 10px;">deine Nachricht:</h4>
        <div class="message-box">{{message}}</div>
      </div>
    </div>
    
    <div class="next-steps">
      <h4>Nächste Schritte:</h4>
      <p>Eva-Maria Schaller wird deine Anfrage prüfen und sich innerhalb von 1-2 Werktagen bei dir melden. Bei dringenden Anfragen kannst du housnkuh auch telefonisch erreichen.</p>
    </div>
    
    <div class="contact-info">
      <h4>Bei weiteren Fragen steht dir Eva-Maria Schaller gerne zur Verfügung:</h4>
      <p>📞 Telefon: 0157 35711257</p>
      <p>✉️ E-Mail: eva-maria.schaller@housnkuh.de</p>
      <p>📍 Adresse: Strauer Str. 15, 96317 Kronach</p>
    </div>
    
    <div class="footer">
      <p>© housnkuh - dein regionaler Marktplatz<br>
      <a href="{{siteUrl}}">www.housnkuh.de</a></p>
    </div>
  </div>
</body>
</html>`,
    variables: ['name', 'subject', 'message', 'currentDate', 'currentTime', 'siteUrl'],
    description: 'Bestätigungs-Email für Kontaktformular-Absender',
    category: 'notification',
    isActive: true,
    version: 1
  },

  {
    templateId: 'newsletter_confirmation_new',
    name: 'Newsletter-Anmeldung bestätigen (Neu)',
    type: 'newsletter_confirmation_new',
    subject: 'Bestätige deinen Newsletter bei housnkuh',
    htmlBody: `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Newsletter bestätigen</title>
  <style>
    body { font-family: 'Quicksand', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
    .container { background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #09122c; margin: 0; }
    .header p { color: #666; margin: 10px 0; }
    .button { background-color: #e17564; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; }
    .button-center { text-align: center; margin: 30px 0; }
    .link-box { color: #666; font-size: 14px; margin: 20px 0; }
    .link-text { color: #e17564; word-break: break-all; font-size: 14px; }
    .benefits { color: #333; line-height: 1.6; padding-left: 20px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; }
    .footer p { color: #666; font-size: 12px; margin: 0; }
    .footer a { color: #e17564; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>housnkuh</h1>
      <p>Regionaler Marktplatz Kronach</p>
    </div>
    
    <h2 style="color: #09122c; text-align: center; margin-bottom: 20px;">Newsletter-Anmeldung bestätigen</h2>
    
    <p>Vielen Dank für dein Interesse an unserem housnkuh Newsletter {{typeText}}!</p>
    
    <p>Um deine Anmeldung abzuschließen, klicke bitte auf den folgenden Button:</p>
    
    <div class="button-center">
      <a href="{{confirmationUrl}}" class="button">Newsletter-Anmeldung bestätigen</a>
    </div>
    
    <div class="link-box">
      <p>Alternativ kannst du auch diesen Link in deinen Browser kopieren:</p>
      <p class="link-text">{{confirmationUrl}}</p>
      <p>Der Link ist 24 Stunden gültig.</p>
      <p>Solltest du dich nicht für unseren Newsletter angemeldet haben, kannst du diese E-Mail ignorieren.</p>
    </div>
    
    <p>Sie erhalten dann regelmäßig Informationen über:</p>
    <ul class="benefits">
      <li>🥕 Neue regionale Produzenten</li>
      <li>🏪 Aktuelle Angebote und Produkte</li>
      <li>📈 Neuigkeiten von housnkuh</li>
      {{#if isVendorNewsletter}}
      <li>💼 Vendor-spezifische Tipps und Updates</li>
      <li>📊 Marktplatz-Statistiken und Trends</li>
      {{/if}}
    </ul>
    
    <div class="footer">
      <p>© housnkuh - Strauer Str. 15, 96317 Kronach<br>
      <a href="{{siteUrl}}">www.housnkuh.de</a></p>
    </div>
  </div>
</body>
</html>`,
    variables: ['typeText', 'confirmationUrl', 'isVendorNewsletter', 'siteUrl'],
    description: 'Double-Opt-In Email für Newsletter-Anmeldungen mit Type-spezifischen Inhalten',
    category: 'notification',
    isActive: true,
    version: 1
  },

  {
    templateId: 'trial_activation',
    name: 'Testphase aktiviert',
    type: 'trial_activation',
    subject: '🎉 dein kostenloser Probemonat bei housnkuh hat begonnen!',
    htmlBody: `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Testphase aktiviert</title>
  <style>
    body { font-family: 'Quicksand', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
    .container { background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #09122c; margin: 0; }
    .header p { color: #666; margin: 10px 0; }
    .trial-overview { background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745; }
    .trial-table { width: 100%; border-collapse: collapse; }
    .trial-table td { padding: 8px 0; border-bottom: 1px solid #ddd; }
    .trial-table .label { color: #666; width: 150px; font-weight: bold; }
    .trial-table .value { color: #333; }
    .action-section { background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 20px 0; }
    .action-section h4 { color: #09122c; margin-top: 0; }
    .action-section ul { color: #333; padding-left: 20px; margin: 10px 0; }
    .action-section li { margin: 5px 0; }
    .button { background-color: #e17564; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px; }
    .button-center { text-align: center; margin: 30px 0; }
    .info-section { background-color: #e3f2fd; padding: 15px; border-radius: 5px; border-left: 4px solid #2196f3; margin: 20px 0; }
    .info-section h4 { color: #09122c; margin-top: 0; }
    .info-section ul { color: #333; padding-left: 20px; margin: 10px 0; }
    .info-section li { margin: 5px 0; }
    .contact-info { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; }
    .contact-info h4 { color: #09122c; }
    .contact-info p { color: #333; margin: 5px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; }
    .footer p { color: #666; font-size: 12px; margin: 0; }
    .footer a { color: #e17564; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>housnkuh</h1>
      <p>Regionaler Marktplatz Kronach</p>
    </div>
    
    <h2 style="color: #09122c; text-align: center; margin-bottom: 20px;">🎉 dein Probemonat ist gestartet!</h2>
    
    <p>Liebe/r {{vendorName}},</p>
    
    <p>herzlichen Glückwunsch! housnkuh ist jetzt offiziell eröffnet und dein kostenloser Probemonat hat begonnen.</p>
    
    <div class="trial-overview">
      <h3 style="color: #09122c; margin-top: 0;">✅ dein Probemonat im Überblick:</h3>
      
      <table class="trial-table">
        <tr>
          <td class="label">Startdatum:</td>
          <td class="value">{{trialStartDate}}</td>
        </tr>
        <tr>
          <td class="label">Enddatum:</td>
          <td class="value">{{trialEndDate}}</td>
        </tr>
        <tr>
          <td class="label">Dauer:</td>
          <td class="value">30 Tage kostenlos</td>
        </tr>
      </table>
    </div>
    
    <div class="action-section">
      <h4>🚀 Was du jetzt tun können:</h4>
      <ul>
        <li>Loggen du dich in dein Vendor-Dashboard ein</li>
        <li>Vervollständigen du dein Profil</li>
        <li>Laden du Produktbilder hoch</li>
        <li>Starten du mit dem Verkauf deiner Produkte</li>
        <li>Nutzen du alle Features kostenfrei</li>
      </ul>
    </div>
    
    <div class="button-center">
      <a href="{{dashboardUrl}}" class="button">Zu deinem Dashboard</a>
    </div>
    
    <div class="info-section">
      <h4>💡 Wichtige Informationen:</h4>
      <ul>
        <li>Der Probemonat ist völlig kostenfrei</li>
        <li>du können jederzeit kündigen</li>
        <li>Wir erinnern du rechtzeitig vor dem Ende</li>
        <li>Unser Support-Team steht dir zur Verfügung</li>
      </ul>
    </div>
    
    <p>Wir freuen uns darauf, du auf deinem Weg als Direktvermarkter bei housnkuh zu begleiten!</p>
    
    <p>Mit freundlichen Grüßen,<br>
    Eva-Maria Schaller<br>
    housnkuh</p>
    
    <div class="contact-info">
      <h4>Bei Fragen steht dir Eva-Maria Schaller gerne zur Verfügung:</h4>
      <p>📞 Telefon: 0157 35711257</p>
      <p>✉️ E-Mail: eva-maria.schaller@housnkuh.de</p>
      <p>📍 Adresse: Strauer Str. 15, 96317 Kronach</p>
    </div>
    
    <div class="footer">
      <p>© housnkuh - dein regionaler Marktplatz<br>
      <a href="{{siteUrl}}">www.housnkuh.de</a></p>
    </div>
  </div>
</body>
</html>`,
    variables: ['vendorName', 'trialStartDate', 'trialEndDate', 'dashboardUrl', 'siteUrl'],
    description: 'Bestätigung der Trial-Aktivierung mit Dashboard-Zugang und wichtigen Informationen',
    category: 'vendor',
    isActive: true,
    version: 1
  },

  // === EXISTING TEMPLATES (already implemented) ===
  {
    templateId: 'vendor_registration_confirmation',
    name: 'Vendor Registrierung Bestätigung',
    type: 'vendor_registration_confirmation',
    subject: '🎉 Willkommen bei housnkuh - Registrierung bestätigt',
    htmlBody: `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Willkommen bei housnkuh</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #FF8C00; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .highlight { background: #FFF3E0; padding: 15px; border-left: 4px solid #FF8C00; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
    .button { display: inline-block; background: #FF8C00; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Willkommen bei housnkuh! 🎉</h1>
  </div>
  
  <div class="content">
    <p>Hallo {{vendorName}},</p>
    
    <p>herzlichen Glückwunsch! Ihre Registrierung bei housnkuh war erfolgreich.</p>
    
    <div class="highlight">
      <h3>Ihre Testphase beginnt jetzt!</h3>
      <p>Sie können ab sofort alle Funktionen unserer Plattform 30 Tage lang kostenlos nutzen.</p>
    </div>
    
    <p>Was passiert als nächstes:</p>
    <ul>
      <li>✅ Ihr Vendor-Account ist aktiv</li>
      <li>📦 Sie können sofort Mietfächer buchen</li>
      <li>🎯 Ihre Testphase läuft bis zum {{trialEndDate}}</li>
      <li>📧 Sie erhalten eine Erinnerung vor Ablauf</li>
    </ul>
    
    <p style="text-align: center;">
      <a href="{{siteUrl}}/vendor/dashboard" class="button">Zum Dashboard</a>
    </p>
    
    <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung!</p>
    
    <p>Viele Grüße<br>Ihr housnkuh Team</p>
  </div>
  
  <div class="footer">
    <p>{{siteName}} | {{currentYear}} | <a href="{{siteUrl}}">{{siteUrl}}</a></p>
  </div>
</body>
</html>`,
    textBody: `Willkommen bei housnkuh!

Hallo {{vendorName}},

herzlichen Glückwunsch! Ihre Registrierung bei housnkuh war erfolgreich.

Ihre Testphase beginnt jetzt!
Sie können ab sofort alle Funktionen unserer Plattform 30 Tage lang kostenlos nutzen.

Was passiert als nächstes:
- Ihr Vendor-Account ist aktiv
- Sie können sofort Mietfächer buchen  
- Ihre Testphase läuft bis zum {{trialEndDate}}
- Sie erhalten eine Erinnerung vor Ablauf

Dashboard: {{siteUrl}}/vendor/dashboard

Bei Fragen stehen wir Ihnen gerne zur Verfügung!

Viele Grüße
Ihr housnkuh Team

{{siteName}} | {{currentYear}} | {{siteUrl}}`,
    variables: ['vendorName', 'trialEndDate', 'siteName', 'siteUrl', 'currentYear'],
    description: 'Bestätigungsmail nach erfolgreicher Vendor-Registrierung mit Testphase-Informationen',
    category: 'vendor',
    isActive: true,
    version: 1
  },
  
  {
    templateId: 'trial_ending',
    name: 'Testphase endet bald',
    type: 'trial_ending',
    subject: '⏰ Ihre housnkuh Testphase endet in {{daysRemaining}} Tagen',
    htmlBody: `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Testphase endet bald</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #FF6B35; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .warning { background: #FFF3E0; padding: 15px; border-left: 4px solid #FF6B35; margin: 20px 0; }
    .button { display: inline-block; background: #FF6B35; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>⏰ Testphase endet bald</h1>
  </div>
  
  <div class="content">
    <p>Hallo {{vendorName}},</p>
    
    <div class="warning">
      <h3>Ihre Testphase endet in {{daysRemaining}} Tagen!</h3>
      <p>Am {{trialEndDate}} läuft Ihre kostenlose Testphase bei housnkuh ab.</p>
    </div>
    
    <p>Um weiterhin alle Funktionen nutzen zu können, buchen Sie jetzt einen regulären Mietfach-Vertrag.</p>
    
    <p>Vorteile einer Verlängerung:</p>
    <ul>
      <li>🏪 Ununterbrochener Zugang zu Ihrem Mietfach</li>
      <li>📈 Weiterhin Verkäufe über unsere Plattform</li>
      <li>👥 Zugang zu unserem Kundennetzwerk</li>
      <li>📊 Detaillierte Verkaufsstatistiken</li>
    </ul>
    
    <p style="text-align: center;">
      <a href="{{siteUrl}}/vendor/dashboard" class="button">Jetzt verlängern</a>
    </p>
    
    <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung!</p>
    
    <p>Viele Grüße<br>Ihr housnkuh Team</p>
  </div>
  
  <div class="footer">
    <p>{{siteName}} | {{currentYear}} | <a href="{{siteUrl}}">{{siteUrl}}</a></p>
  </div>
</body>
</html>`,
    variables: ['vendorName', 'daysRemaining', 'trialEndDate', 'siteName', 'siteUrl', 'currentYear'],
    description: 'Erinnerungsmail wenn die Vendor-Testphase bald abläuft',
    category: 'vendor',
    isActive: true,
    version: 1
  },

  {
    templateId: 'contract_created',
    name: 'Vertrag erstellt',
    type: 'contract_created',
    subject: '📋 Ihr housnkuh Vertrag {{contractNumber}} wurde erstellt',
    htmlBody: `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vertrag erstellt</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .contract-info { background: #E8F5E8; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; }
    .button { display: inline-block; background: #4CAF50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📋 Vertrag erfolgreich erstellt</h1>
  </div>
  
  <div class="content">
    <p>Hallo {{vendorName}},</p>
    
    <p>Ihr housnkuh Mietfach-Vertrag wurde erfolgreich erstellt!</p>
    
    <div class="contract-info">
      <h3>Vertragsdetails</h3>
      <p><strong>Vertragsnummer:</strong> {{contractNumber}}</p>
      <p><strong>Mietfach:</strong> {{mietfachNumber}}</p>
      <p><strong>Laufzeit:</strong> {{startDate}} bis {{endDate}}</p>
    </div>
    
    <p>Was passiert als nächstes:</p>
    <ul>
      <li>✅ Ihr Mietfach ist ab {{startDate}} für Sie reserviert</li>
      <li>📦 Sie können sofort mit dem Einlagern beginnen</li>
      <li>🏪 Ihre Produkte werden online sichtbar</li>
      <li>📊 Zugang zu allen Verkaufsstatistiken</li>
    </ul>
    
    <p style="text-align: center;">
      <a href="{{siteUrl}}/vendor/dashboard" class="button">Zum Dashboard</a>
    </p>
    
    <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung!</p>
    
    <p>Viele Grüße<br>Ihr housnkuh Team</p>
  </div>
  
  <div class="footer">
    <p>{{siteName}} | {{currentYear}} | <a href="{{siteUrl}}">{{siteUrl}}</a></p>
  </div>
</body>
</html>`,
    variables: ['vendorName', 'contractNumber', 'mietfachNumber', 'startDate', 'endDate', 'siteName', 'siteUrl', 'currentYear'],
    description: 'Bestätigungsmail nach Vertragserstellung mit allen wichtigen Details',
    category: 'vendor',
    isActive: true,
    version: 1
  },

  {
    templateId: 'newsletter_confirmation',
    name: 'Newsletter Anmeldung bestätigen',
    type: 'newsletter_confirmation',
    subject: '📧 Newsletter-Anmeldung bei housnkuh bestätigen',
    htmlBody: `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Newsletter bestätigen</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; background: #2196F3; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📧 Newsletter-Anmeldung</h1>
  </div>
  
  <div class="content">
    <p>Hallo,</p>
    
    <p>vielen Dank für Ihr Interesse an unserem housnkuh Newsletter!</p>
    
    <p>Um Ihre Anmeldung abzuschließen, klicken Sie bitte auf den folgenden Button:</p>
    
    <p style="text-align: center;">
      <a href="{{confirmationUrl}}" class="button">Newsletter-Anmeldung bestätigen</a>
    </p>
    
    <p><small>Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:<br>
    {{confirmationUrl}}</small></p>
    
    <p>Sie erhalten dann regelmäßig Informationen über:</p>
    <ul>
      <li>🥕 Neue regionale Produzenten</li>
      <li>🏪 Aktuelle Angebote und Produkte</li>
      <li>📈 Neuigkeiten von housnkuh</li>
    </ul>
    
    <p>Viele Grüße<br>Ihr housnkuh Team</p>
  </div>
  
  <div class="footer">
    <p>{{siteName}} | {{currentYear}} | <a href="{{siteUrl}}">{{siteUrl}}</a></p>
  </div>
</body>
</html>`,
    variables: ['confirmationUrl', 'siteName', 'siteUrl', 'currentYear'],
    description: 'Double-Opt-In Email für Newsletter-Anmeldungen',
    category: 'notification',
    isActive: true,
    version: 1
  },

  {
    templateId: 'contact_form_received',
    name: 'Kontaktanfrage erhalten',
    type: 'contact_form_received',
    subject: '📬 Neue Kontaktanfrage von {{name}}',
    htmlBody: `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Neue Kontaktanfrage</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #9C27B0; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .contact-info { background: #F3E5F5; padding: 15px; border-left: 4px solid #9C27B0; margin: 20px 0; }
    .message-box { background: white; padding: 15px; border: 1px solid #ddd; border-radius: 5px; margin: 15px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📬 Neue Kontaktanfrage</h1>
  </div>
  
  <div class="content">
    <p>Eine neue Kontaktanfrage ist über das housnkuh Kontaktformular eingegangen:</p>
    
    <div class="contact-info">
      <h3>Kontaktdaten</h3>
      <p><strong>Name:</strong> {{name}}</p>
      <p><strong>Email:</strong> {{email}}</p>
      {{#if phone}}<p><strong>Telefon:</strong> {{phone}}</p>{{/if}}
      <p><strong>Betreff:</strong> {{subject}}</p>
    </div>
    
    <div class="message-box">
      <h4>Nachricht:</h4>
      <p>{{message}}</p>
    </div>
    
    <p><small>Eingegangen am: {{currentDate}} um {{currentTime}}</small></p>
  </div>
  
  <div class="footer">
    <p>{{siteName}} Admin-Benachrichtigung | {{currentYear}}</p>
  </div>
</body>
</html>`,
    variables: ['name', 'email', 'phone', 'subject', 'message', 'currentDate', 'currentTime', 'siteName', 'currentYear'],
    description: 'Admin-Benachrichtigung bei neuen Kontaktformular-Anfragen',
    category: 'admin',
    isActive: true,
    version: 1
  },

  // === PHASE 2 TEMPLATES - VENDOR LIFECYCLE ===
  
  {
    templateId: 'vendor_confirmation',
    name: 'Vendor-Bestätigung: Mietfächer zugewiesen',
    type: 'vendor_confirmation',
    subject: 'deine Buchung wurde bestätigt - Willkommen bei housnkuh!',
    htmlBody: `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Buchung bestätigt</title>
  <style>
    body { font-family: 'Quicksand', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
    .container { background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #09122c; margin: 0; }
    .header p { color: #666; margin: 10px 0; }
    .success-section { background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745; }
    .mietfach-item { background-color: white; padding: 15px; border-radius: 5px; border: 1px solid #ddd; margin: 10px 0; }
    .mietfach-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px; }
    .contract-details { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .contract-table { width: 100%; border-collapse: collapse; }
    .contract-table td { padding: 8px 0; border-bottom: 1px solid #eee; }
    .contract-table .label { color: #666; width: 150px; font-weight: bold; }
    .contract-table .value { color: #333; }
    .next-steps { background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 20px 0; }
    .button { background-color: #e17564; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px; }
    .contact-info { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; }
    .footer p { color: #666; font-size: 12px; margin: 0; }
    .footer a { color: #e17564; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>housnkuh</h1>
      <p>Regionaler Marktplatz Kronach</p>
    </div>
    
    <h2 style="color: #09122c; text-align: center; margin-bottom: 20px;">🎉 deine Buchung wurde bestätigt!</h2>
    
    <p>Liebe/r {{vendorName}},</p>
    
    <p>herzlichen Glückwunsch! housnkuh freut sich, du als neuen Direktvermarkter begrüßen zu dürfen. 
    deine Buchungsanfrage wurde erfolgreich bestätigt und dir wurden die folgenden Verkaufsflächen zugewiesen.</p>
    
    <div class="success-section">
      <h3 style="color: #09122c; margin-top: 0;">✅ deine zugewiesenen Mietfächer:</h3>
      {{#each mietfaecher}}
      <div class="mietfach-item">
        <h4 style="color: #09122c; margin: 0 0 10px 0;">{{bezeichnung}}</h4>
        <div class="mietfach-grid">
          <div><strong>Typ:</strong> {{typ}}</div>
          <div><strong>Standort:</strong> {{standort}}</div>
          <div><strong>Größe:</strong> {{groesse.flaeche}} {{groesse.einheit}}</div>
          <div><strong>Monatspreis:</strong> {{preis}}€</div>
        </div>
        {{#if beschreibung}}<p style="color: #666; font-size: 14px; margin: 10px 0 0 0;">{{beschreibung}}</p>{{/if}}
      </div>
      {{/each}}
    </div>
    
    <div class="contract-details">
      <h3 style="color: #09122c; margin-top: 0;">📋 Vertragsdetails:</h3>
      
      <table class="contract-table">
        <tr>
          <td class="label">Vertragsnummer:</td>
          <td class="value">{{contractId}}</td>
        </tr>
        <tr>
          <td class="label">Laufzeit:</td>
          <td class="value">{{rentalDuration}} Monate</td>
        </tr>
        <tr>
          <td class="label">Monatliche Kosten:</td>
          <td class="value">{{monthlyCost}}€</td>
        </tr>
        <tr>
          <td class="label">Provision:</td>
          <td class="value">{{provisionRate}}% auf Verkäufe</td>
        </tr>
        <tr>
          <td class="label">Mietbeginn:</td>
          <td class="value">{{contractStartDate}}</td>
        </tr>
      </table>
    </div>
    
    <div class="next-steps">
      <h4 style="color: #09122c; margin-top: 0;">📞 Nächste Schritte:</h4>
      <ol style="color: #333; padding-left: 20px; margin: 10px 0;">
        <li style="margin: 5px 0;">Eva-Maria Schaller kontaktiert dich in den nächsten 2 Werktagen</li>
        <li style="margin: 5px 0;">Gemeinsame Besichtigung der zugewiesenen Verkaufsflächen</li>
        <li style="margin: 5px 0;">Einweisung in das housnkuh-Kassensystem</li>
        <li style="margin: 5px 0;">Übergabe deines persönlichen Zugangs und der Schlüssel</li>
        <li style="margin: 5px 0;">du können mit dem Verkauf deiner Produkte beginnen!</li>
      </ol>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{frontendUrl}}/vendor/dashboard" class="button">
        Zu deinem Vendor-Dashboard
      </a>
    </div>
    
    <div class="contact-info">
      <h4 style="color: #09122c;">Kontakt & Support:</h4>
      <p style="color: #333; margin: 5px 0;">📞 Telefon: 0157 35711257</p>
      <p style="color: #333; margin: 5px 0;">✉️ E-Mail: eva-maria.schaller@housnkuh.de</p>
      <p style="color: #333; margin: 5px 0;">📍 Adresse: Strauer Str. 15, 96317 Kronach</p>
    </div>
    
    <div class="footer">
      <p>© housnkuh - dein regionaler Marktplatz<br>
      <a href="https://housnkuh.de">www.housnkuh.de</a></p>
    </div>
  </div>
</body>
</html>`,
    variables: ['vendorName', 'mietfaecher', 'contractId', 'rentalDuration', 'monthlyCost', 'provisionRate', 'contractStartDate', 'frontendUrl'],
    description: 'Bestätigung der Mietfach-Zuweisung an Vendor',
    category: 'vendor',
    isActive: true,
    version: 1
  },

  {
    templateId: 'trial_expiration_warning',
    name: 'Probemonat-Warnung: Endet in 7 Tagen',
    type: 'trial_expiration_warning',
    subject: '⏰ dein Probemonat bei housnkuh endet bald',
    htmlBody: `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Probemonat endet bald</title>
  <style>
    body { font-family: 'Quicksand', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
    .container { background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #09122c; margin: 0; }
    .header p { color: #666; margin: 10px 0; }
    .warning-box { background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107; }
    .action-box { background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745; }
    .cancellation-box { background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545; }
    .button { background-color: #e17564; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; }
    .secondary-button { background-color: #6c757d; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
    .contact-info { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; }
    .footer p { color: #666; font-size: 12px; margin: 0; }
    .footer a { color: #e17564; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>housnkuh</h1>
      <p>Regionaler Marktplatz Kronach</p>
    </div>
    
    <h2 style="color: #09122c; text-align: center; margin-bottom: 20px;">⏰ dein Probemonat endet in 7 Tagen</h2>
    
    <p>Liebe/r {{vendorName}},</p>
    
    <p>dein kostenloser Probemonat bei housnkuh neigt sich dem Ende zu. 
    Am <strong>{{trialEndDate}}</strong> endet deine Testphase.</p>
    
    <div class="warning-box">
      <h4 style="color: #09122c; margin-top: 0;">⚠️ Was passiert nach dem Probemonat?</h4>
      <p style="margin: 0;">Wenn du nichts unternimmst, wird dein Vertrag automatisch in die kostenpflichtige Phase überführt. 
      Die monatlichen Kosten betragen {{monthlyCost}}€ plus {{provisionRate}}% Provision auf deine Verkäufe.</p>
    </div>
    
    <div class="action-box">
      <h4 style="color: #09122c; margin-top: 0;">✅ Weitermachen mit housnkuh?</h4>
      <p>Wenn du mit unserem Service zufrieden bist und weitermachen möchtest, brauchst du nichts zu tun. 
      dein Vertrag läuft nahtlos weiter.</p>
      
      <div style="text-align: center; margin: 15px 0;">
        <a href="{{frontendUrl}}/vendor/dashboard" class="button">
          Zu deinem Dashboard
        </a>
      </div>
    </div>
    
    <div class="cancellation-box">
      <h4 style="color: #09122c; margin-top: 0;">❌ Kündigen?</h4>
      <p style="margin: 10px 0;">Falls du kündigen möchtest, kontaktiere uns bis spätestens <strong>{{cancellationDeadline}}</strong>:</p>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>📞 Telefon: 0157 35711257</li>
        <li>✉️ E-Mail: eva-maria.schaller@housnkuh.de</li>
      </ul>
      
      <div style="text-align: center; margin: 15px 0;">
        <a href="mailto:eva-maria.schaller@housnkuh.de?subject=Kündigung%20Probemonat%20{{vendorName}}" class="secondary-button">
          Kündigungs-Email senden
        </a>
      </div>
    </div>
    
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h4 style="color: #09122c; margin-top: 0;">📊 deine bisherigen Erfolge:</h4>
      <ul style="color: #333; padding-left: 20px; margin: 10px 0;">
        <li>{{trialDays}} Tage im kostenlosen Probemonat</li>
        <li>Zugang zu allen housnkuh-Funktionen</li>
        <li>Support und Beratung inklusive</li>
        <li>Flexible Kündigung jederzeit möglich</li>
      </ul>
    </div>
    
    <div class="contact-info">
      <h4 style="color: #09122c;">Fragen? Wir helfen gerne!</h4>
      <p style="color: #333; margin: 5px 0;">📞 Telefon: 0157 35711257</p>
      <p style="color: #333; margin: 5px 0;">✉️ E-Mail: eva-maria.schaller@housnkuh.de</p>
      <p style="color: #333; margin: 5px 0;">📍 Adresse: Strauer Str. 15, 96317 Kronach</p>
    </div>
    
    <div class="footer">
      <p>© housnkuh - dein regionaler Marktplatz<br>
      <a href="https://housnkuh.de">www.housnkuh.de</a></p>
    </div>
  </div>
</body>
</html>`,
    variables: ['vendorName', 'trialEndDate', 'monthlyCost', 'provisionRate', 'cancellationDeadline', 'frontendUrl', 'trialDays'],
    description: 'Warnung 7 Tage vor Ablauf des Probemonats',
    category: 'vendor',
    isActive: true,
    version: 1
  },

  {
    templateId: 'trial_expired',
    name: 'Probemonat abgelaufen - Vertrag beendet',
    type: 'trial_expired',
    subject: '📋 dein Probemonat ist beendet - Vertragsabschluss bei housnkuh',
    htmlBody: `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Probemonat beendet</title>
  <style>
    body { font-family: 'Quicksand', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
    .container { background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #09122c; margin: 0; }
    .header p { color: #666; margin: 10px 0; }
    .expired-notice { background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545; }
    .next-phase { background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745; }
    .contract-details { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .contract-table { width: 100%; border-collapse: collapse; }
    .contract-table td { padding: 8px 0; border-bottom: 1px solid #eee; }
    .contract-table .label { color: #666; width: 150px; font-weight: bold; }
    .contract-table .value { color: #333; }
    .button { background-color: #e17564; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; }
    .contact-info { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; }
    .footer p { color: #666; font-size: 12px; margin: 0; }
    .footer a { color: #e17564; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>housnkuh</h1>
      <p>Regionaler Marktplatz Kronach</p>
    </div>
    
    <h2 style="color: #09122c; text-align: center; margin-bottom: 20px;">📋 dein Probemonat ist beendet</h2>
    
    <p>Liebe/r {{vendorName}},</p>
    
    <p>dein 30-tägiger Probemonat bei housnkuh ist am {{trialEndDate}} abgelaufen.</p>
    
    {{#if contractContinues}}
    <div class="next-phase">
      <h4 style="color: #09122c; margin-top: 0;">🎉 Willkommen in der kostenpflichtigen Phase!</h4>
      <p style="margin: 0;">dein Vertrag läuft nahtlos weiter. Ab sofort gelten die regulären Konditionen.</p>
    </div>
    
    <div class="contract-details">
      <h3 style="color: #09122c; margin-top: 0;">📋 deine neuen Konditionen:</h3>
      
      <table class="contract-table">
        <tr>
          <td class="label">Monatliche Grundgebühr:</td>
          <td class="value">{{monthlyCost}}€</td>
        </tr>
        <tr>
          <td class="label">Provision:</td>
          <td class="value">{{provisionRate}}% auf Verkäufe</td>
        </tr>
        <tr>
          <td class="label">Abrechnungszeitraum:</td>
          <td class="value">{{billingPeriod}}</td>
        </tr>
        <tr>
          <td class="label">Nächste Abrechnung:</td>
          <td class="value">{{nextBillingDate}}</td>
        </tr>
        <tr>
          <td class="label">Vertragslaufzeit:</td>
          <td class="value">{{contractDuration}} Monate</td>
        </tr>
      </table>
    </div>
    
    <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <h4 style="color: #09122c; margin-top: 0;">💡 Was ändert sich?</h4>
      <ul style="color: #333; padding-left: 20px; margin: 10px 0;">
        <li>Monatliche Grundgebühr wird ab {{nextBillingDate}} berechnet</li>
        <li>Alle Funktionen bleiben unverändert verfügbar</li>
        <li>Support und Beratung weiterhin inklusive</li>
        <li>Kündigung mit {{noticePeriod}} Tagen Vorlauf möglich</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{frontendUrl}}/vendor/dashboard" class="button">
        Zu deinem Dashboard
      </a>
    </div>
    {{else}}
    <div class="expired-notice">
      <h4 style="color: #09122c; margin-top: 0;">❌ Vertrag beendet</h4>
      <p style="margin: 0;">Da wir keine Bestätigung zur Fortsetzung erhalten haben, wurde dein Vertrag beendet. 
      dein Zugang zu den Verkaufsflächen wird in den nächsten Tagen deaktiviert.</p>
    </div>
    
    <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <h4 style="color: #09122c; margin-top: 0;">🔄 Später wieder einsteigen?</h4>
      <p style="margin: 0;">Falls du in Zukunft wieder bei housnkuh verkaufen möchtest, melde dich einfach bei uns. 
      Wir finden gerne eine Lösung!</p>
    </div>
    {{/if}}
    
    <div class="contact-info">
      <h4 style="color: #09122c;">Bei Fragen sind wir da!</h4>
      <p style="color: #333; margin: 5px 0;">📞 Telefon: 0157 35711257</p>
      <p style="color: #333; margin: 5px 0;">✉️ E-Mail: eva-maria.schaller@housnkuh.de</p>
      <p style="color: #333; margin: 5px 0;">📍 Adresse: Strauer Str. 15, 96317 Kronach</p>
    </div>
    
    <div class="footer">
      <p>© housnkuh - dein regionaler Marktplatz<br>
      <a href="https://housnkuh.de">www.housnkuh.de</a></p>
    </div>
  </div>
</body>
</html>`,
    variables: ['vendorName', 'trialEndDate', 'contractContinues', 'monthlyCost', 'provisionRate', 'billingPeriod', 'nextBillingDate', 'contractDuration', 'noticePeriod', 'frontendUrl'],
    description: 'Benachrichtigung nach Ablauf des Probemonats',
    category: 'vendor',
    isActive: true,
    version: 1
  },

  {
    templateId: 'cancellation_confirmation',
    name: 'Kündigung bestätigt',
    type: 'cancellation_confirmation',
    subject: '✅ Kündigung bestätigt - Schade, dass du gehst!',
    htmlBody: `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kündigung bestätigt</title>
  <style>
    body { font-family: 'Quicksand', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
    .container { background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #09122c; margin: 0; }
    .header p { color: #666; margin: 10px 0; }
    .confirmation-box { background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545; }
    .details-box { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .return-box { background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745; }
    .details-table { width: 100%; border-collapse: collapse; }
    .details-table td { padding: 8px 0; border-bottom: 1px solid #eee; }
    .details-table .label { color: #666; width: 150px; font-weight: bold; }
    .details-table .value { color: #333; }
    .contact-info { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; }
    .footer p { color: #666; font-size: 12px; margin: 0; }
    .footer a { color: #e17564; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>housnkuh</h1>
      <p>Regionaler Marktplatz Kronach</p>
    </div>
    
    <h2 style="color: #09122c; text-align: center; margin-bottom: 20px;">✅ Kündigung bestätigt</h2>
    
    <p>Liebe/r {{vendorName}},</p>
    
    <p>wir haben deine Kündigung erhalten und bestätigen hiermit die Beendigung deines Vertrags bei housnkuh.</p>
    
    <div class="confirmation-box">
      <h4 style="color: #09122c; margin-top: 0;">📋 Kündigungsbestätigung</h4>
      <p style="margin: 0;">dein Vertrag wird zum <strong>{{cancellationDate}}</strong> beendet. 
      {{#if isTrialCancellation}}Da du dich noch im Probemonat befindest, entstehen keine weiteren Kosten.{{/if}}</p>
    </div>
    
    <div class="details-box">
      <h3 style="color: #09122c; margin-top: 0;">📊 Vertragsdetails:</h3>
      
      <table class="details-table">
        <tr>
          <td class="label">Vertragsnummer:</td>
          <td class="value">{{contractId}}</td>
        </tr>
        <tr>
          <td class="label">Letzter Nutzungstag:</td>
          <td class="value">{{lastUsageDate}}</td>
        </tr>
        {{#if finalAmount}}
        <tr>
          <td class="label">Abschlussbetrag:</td>
          <td class="value">{{finalAmount}}€</td>
        </tr>
        {{/if}}
        {{#if refundAmount}}
        <tr>
          <td class="label">Rückerstattung:</td>
          <td class="value">{{refundAmount}}€</td>
        </tr>
        {{/if}}
        <tr>
          <td class="label">Status:</td>
          <td class="value">{{contractStatus}}</td>
        </tr>
      </table>
    </div>
    
    <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <h4 style="color: #09122c; margin-top: 0;">📦 Was passiert als nächstes?</h4>
      <ol style="color: #333; padding-left: 20px; margin: 10px 0;">
        <li style="margin: 5px 0;">dein Zugang läuft bis {{cancellationDate}}</li>
        <li style="margin: 5px 0;">Alle Daten werden nach der Kündigungsfrist gelöscht</li>
        {{#if hasPhysicalItems}}
        <li style="margin: 5px 0;">Bitte räume deine Verkaufsflächen bis zum {{clearoutDate}}</li>
        <li style="margin: 5px 0;">Rückgabe der Schlüssel an Eva-Maria Schaller</li>
        {{/if}}
        {{#if finalAmount}}
        <li style="margin: 5px 0;">Abschlussbetrag wird am {{finalBillingDate}} abgerechnet</li>
        {{/if}}
      </ol>
    </div>
    
    <div class="return-box">
      <h4 style="color: #09122c; margin-top: 0;">🔄 Später wieder dabei?</h4>
      <p style="margin: 0;">Es tut uns leid, dass du gehst! Falls du in Zukunft wieder bei housnkuh verkaufen möchtest, 
      sind wir jederzeit für ein Gespräch offen. Als ehemaliger Vendor kennst du die Vorteile bereits.</p>
    </div>
    
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h4 style="color: #09122c; margin-top: 0;">💭 Feedback willkommen!</h4>
      <p style="margin: 0;">deine Erfahrungen helfen uns besser zu werden. Falls du Lust hast, 
      teile gerne dein Feedback mit uns - was lief gut, was könnte besser werden?</p>
    </div>
    
    <div class="contact-info">
      <h4 style="color: #09122c;">Kontakt für Rückfragen:</h4>
      <p style="color: #333; margin: 5px 0;">📞 Telefon: 0157 35711257</p>
      <p style="color: #333; margin: 5px 0;">✉️ E-Mail: eva-maria.schaller@housnkuh.de</p>
      <p style="color: #333; margin: 5px 0;">📍 Adresse: Strauer Str. 15, 96317 Kronach</p>
    </div>
    
    <div class="footer">
      <p>© housnkuh - dein regionaler Marktplatz<br>
      <a href="https://housnkuh.de">www.housnkuh.de</a></p>
    </div>
  </div>
</body>
</html>`,
    variables: ['vendorName', 'cancellationDate', 'isTrialCancellation', 'contractId', 'lastUsageDate', 'finalAmount', 'refundAmount', 'contractStatus', 'hasPhysicalItems', 'clearoutDate', 'finalBillingDate'],
    description: 'Bestätigung einer Kündigung mit allen Details',
    category: 'vendor',
    isActive: true,
    version: 1
  },

  {
    templateId: 'admin_confirmation',
    name: 'Admin-Bestätigung: Mietfach-Zuweisung aktiv',
    type: 'admin_confirmation',
    subject: 'Mietfach-Zuweisung bestätigt - dein housnkuh Vertrag ist aktiv!',
    htmlBody: `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vertrag aktiv</title>
  <style>
    body { font-family: 'Quicksand', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
    .container { background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #09122c; margin: 0; }
    .header p { color: #666; margin: 10px 0; }
    .active-notice { background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745; }
    .mietfach-item { background-color: white; padding: 15px; border-radius: 5px; border: 1px solid #ddd; margin: 10px 0; }
    .mietfach-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px; }
    .status-info { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .status-table { width: 100%; border-collapse: collapse; }
    .status-table td { padding: 8px 0; border-bottom: 1px solid #eee; }
    .status-table .label { color: #666; width: 150px; font-weight: bold; }
    .status-table .value { color: #333; }
    .trial-info { background-color: #e3f2fd; border: 1px solid #2196f3; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .button { background-color: #e17564; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; }
    .contact-info { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; }
    .footer p { color: #666; font-size: 12px; margin: 0; }
    .footer a { color: #e17564; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>housnkuh</h1>
      <p>Regionaler Marktplatz Kronach</p>
    </div>
    
    <h2 style="color: #09122c; text-align: center; margin-bottom: 20px;">🎉 dein Vertrag ist jetzt aktiv!</h2>
    
    <p>Liebe/r {{vendorName}},</p>
    
    <p>großartig! die Administration hat deine Mietfächer bestätigt und zugewiesen. 
    dein housnkuh-Vertrag ist jetzt vollständig aktiv.</p>
    
    <div class="active-notice">
      <h4 style="color: #09122c; margin-top: 0;">✅ Status: Vertrag aktiv</h4>
      <p style="margin: 0;">Alle deine Verkaufsflächen sind bereit und du können sofort mit dem Verkauf beginnen!</p>
    </div>
    
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #09122c; margin-top: 0;">📦 deine bestätigten Mietfächer:</h3>
      {{#each mietfaecher}}
      <div class="mietfach-item">
        <h4 style="color: #09122c; margin: 0 0 10px 0;">{{bezeichnung}}</h4>
        <div class="mietfach-grid">
          <div><strong>Typ:</strong> {{typ}}</div>
          <div><strong>Standort:</strong> {{standort}}</div>
          <div><strong>Größe:</strong> {{groesse.flaeche}} {{groesse.einheit}}</div>
          <div><strong>Preis:</strong> {{adjustedPrice}}€/Monat</div>
        </div>
        {{#if beschreibung}}<p style="color: #666; font-size: 14px; margin: 10px 0 0 0;">{{beschreibung}}</p>{{/if}}
      </div>
      {{/each}}
    </div>
    
    {{#if isTrialActive}}
    <div class="trial-info">
      <h3 style="color: #1976d2; margin: 0 0 15px 0; font-size: 18px;">
        🏪 {{trialStatus}}
      </h3>
      <p style="color: #1976d2; margin: 0; font-size: 14px;">
        {{trialMessage}}
      </p>
    </div>
    {{/if}}
    
    <div class="status-info">
      <h3 style="color: #09122c; margin-top: 0;">📊 Vertragsübersicht:</h3>
      
      <table class="status-table">
        <tr>
          <td class="label">Vertragsnummer:</td>
          <td class="value">{{contractId}}</td>
        </tr>
        <tr>
          <td class="label">Aktivierungsdatum:</td>
          <td class="value">{{activationDate}}</td>
        </tr>
        <tr>
          <td class="label">Monatliche Kosten:</td>
          <td class="value">{{totalMonthlyPrice}}€</td>
        </tr>
        {{#if scheduledStartDate}}
        <tr>
          <td class="label">Regulärer Start:</td>
          <td class="value">{{scheduledStartDate}}</td>
        </tr>
        {{/if}}
        <tr>
          <td class="label">Vertragsstatus:</td>
          <td class="value">{{contractStatus}}</td>
        </tr>
      </table>
    </div>
    
    {{#if zusatzleistungen}}
    <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 15px; margin: 20px 0; border-radius: 8px;">
      <h4 style="color: #1d4ed8; margin: 0 0 10px 0; font-size: 16px;">📦 Zusatzleistungen</h4>
      {{#if zusatzleistungen.lagerservice}}
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dotted #bfdbfe;">
        <div style="color: #1e40af;">
          <strong>🏪 Lagerservice</strong>
          {{#if zusatzleistungen.lagerservice_bestätigt}}
          <div style="font-size: 12px; color: #64748b;">Bestätigt am: {{zusatzleistungen.lagerservice_bestätigt}}</div>
          {{/if}}
        </div>
        <span style="color: #1e40af; font-weight: bold;">{{zusatzleistungen.lagerservice_kosten}}€/Monat</span>
      </div>
      {{/if}}
      {{#if zusatzleistungen.versandservice}}
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0;">
        <div style="color: #1e40af;">
          <strong>🚚 Versandservice</strong>
          <div style="font-size: 12px; color: #64748b;">
            {{#if zusatzleistungen.versandservice_aktiv}}Aktiv{{else}}Inaktiv{{/if}}
          </div>
        </div>
        <span style="color: #1e40af; font-weight: bold;">{{zusatzleistungen.versandservice_kosten}}€/Monat</span>
      </div>
      {{/if}}
    </div>
    {{/if}}
    
    <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <h4 style="color: #09122c; margin-top: 0;">🚀 Jetzt kann's losgehen!</h4>
      <ul style="color: #333; padding-left: 20px; margin: 10px 0;">
        <li style="margin: 5px 0;">Verkaufsflächen sind bereit für deine Produkte</li>
        <li style="margin: 5px 0;">Kassensystem-Zugang ist aktiviert</li>
        <li style="margin: 5px 0;">Dashboard zeigt alle wichtigen Informationen</li>
        <li style="margin: 5px 0;">Bei Fragen steht dir unser Support zur Verfügung</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{frontendUrl}}/vendor/dashboard" class="button">
        Zu deinem Dashboard
      </a>
    </div>
    
    <div class="contact-info">
      <h4 style="color: #09122c;">Kontakt & Support:</h4>
      <p style="color: #333; margin: 5px 0;">📞 Telefon: 0157 35711257</p>
      <p style="color: #333; margin: 5px 0;">✉️ E-Mail: eva-maria.schaller@housnkuh.de</p>
      <p style="color: #333; margin: 5px 0;">📍 Adresse: Strauer Str. 15, 96317 Kronach</p>
    </div>
    
    <div class="footer">
      <p>© housnkuh - dein regionaler Marktplatz<br>
      <a href="https://housnkuh.de">www.housnkuh.de</a></p>
    </div>
  </div>
</body>
</html>`,
    variables: ['vendorName', 'mietfaecher', 'isTrialActive', 'trialStatus', 'trialMessage', 'contractId', 'activationDate', 'totalMonthlyPrice', 'scheduledStartDate', 'contractStatus', 'zusatzleistungen', 'frontendUrl'],
    description: 'Admin-Bestätigung nach Mietfach-Zuweisung',
    category: 'admin',
    isActive: true,
    version: 1
  },

  // === PHASE 3 TEMPLATES - BACKEND NOTIFICATIONS ===
  
  {
    templateId: 'trial_expiration_warning',
    name: 'Trial-Ablauf Warnung (7 Tage)',
    type: 'trial_expiration_warning',
    subject: '⏰ dein Probemonat bei housnkuh endet bald',
    htmlBody: `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trial-Warnung</title>
  <style>
    body { font-family: 'Quicksand', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
    .container { background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #09122c; margin: 0; }
    .header p { color: #666; margin: 10px 0; }
    .warning-box { background-color: #fff3cd; border: 1px solid #ffc107; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #ffc107; }
    .warning-box h3 { color: #09122c; margin-top: 0; }
    .benefits-box { background-color: #e8f5e8; border: 1px solid #28a745; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #28a745; }
    .benefits-box h3 { color: #09122c; margin-top: 0; }
    .pricing-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    .pricing-table td { padding: 8px 0; border-bottom: 1px solid #eee; }
    .pricing-table .label { color: #666; width: 150px; font-weight: bold; }
    .pricing-table .value { color: #333; }
    .contact-info { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; }
    .contact-info h4 { color: #09122c; }
    .contact-info p { color: #333; margin: 5px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; }
    .footer p { color: #666; font-size: 12px; margin: 0; }
    .footer a { color: #e17564; }
    .button { background-color: #e17564; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>housnkuh</h1>
      <p>Regionaler Marktplatz Kronach</p>
    </div>
    
    <h2 style="color: #09122c; text-align: center; margin-bottom: 20px;">⏰ dein Probemonat endet in 7 Tagen</h2>
    
    <p>Liebe/r {{vendorName}},</p>
    
    <p>dein kostenloser Probemonat bei housnkuh neigt sich dem Ende zu. Am <strong>{{trialEndDate}}</strong> endet deine Testphase.</p>
    
    <div class="warning-box">
      <h3>🤔 Wie geht es weiter?</h3>
      <p>du haben die Wahl: Setzen du deine erfolgreiche Verkaufstätigkeit bei housnkuh fort oder kündigen du rechtzeitig.</p>
    </div>
    
    <div class="benefits-box">
      <h3>✅ Weitermachen lohnt sich:</h3>
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
      <table class="pricing-table">
        <tr>
          <td class="label">Monatliche Gebühr:</td>
          <td class="value">Je nach gewähltem Paket</td>
        </tr>
        <tr>
          <td class="label">Provision:</td>
          <td class="value">{{provisionRate}}% auf Verkäufe</td>
        </tr>
        <tr>
          <td class="label">Kündigungsfrist:</td>
          <td class="value">1 Monat zum Monatsende</td>
        </tr>
      </table>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{dashboardUrl}}" class="button">Jetzt entscheiden</a>
    </div>
    
    <div class="contact-info">
      <h4>Bei Fragen steht dir Eva-Maria Schaller gerne zur Verfügung:</h4>
      <p>📞 Telefon: {{phone}}</p>
      <p>✉️ E-Mail: {{adminEmail}}</p>
      <p>📍 Adresse: {{address}}</p>
    </div>
    
    <div class="footer">
      <p>© {{currentYear}} housnkuh - dein regionaler Marktplatz<br>
      <a href="{{siteUrl}}">www.housnkuh.de</a></p>
    </div>
  </div>
</body>
</html>`,
    variables: ['vendorName', 'trialEndDate', 'provisionRate', 'dashboardUrl', 'phone', 'adminEmail', 'address', 'currentYear', 'siteUrl'],
    description: 'Warnung an Vendor 7 Tage vor Ablauf des kostenlosen Probemonats',
    category: 'notification',
    isActive: true,
    version: 1
  },

  {
    templateId: 'trial_expired_notification',
    name: 'Trial abgelaufen - Konto deaktiviert',
    type: 'trial_expired',
    subject: '⚠️ dein Probemonat ist abgelaufen - Konto deaktiviert',
    htmlBody: `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trial abgelaufen</title>
  <style>
    body { font-family: 'Quicksand', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
    .container { background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #09122c; margin: 0; }
    .header p { color: #666; margin: 10px 0; }
    .expired-box { background-color: #f8d7da; border: 1px solid #dc3545; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #dc3545; }
    .expired-box h3 { color: #721c24; margin-top: 0; }
    .info-box { background-color: #e3f2fd; border: 1px solid #2196f3; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #2196f3; }
    .info-box h3 { color: #1976d2; margin-top: 0; }
    .contact-info { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; }
    .contact-info h4 { color: #09122c; }
    .contact-info p { color: #333; margin: 5px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; }
    .footer p { color: #666; font-size: 12px; margin: 0; }
    .footer a { color: #e17564; }
    .button { background-color: #e17564; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>housnkuh</h1>
      <p>Regionaler Marktplatz Kronach</p>
    </div>
    
    <h2 style="color: #721c24; text-align: center; margin-bottom: 20px;">⚠️ dein Probemonat ist abgelaufen</h2>
    
    <p>Liebe/r {{vendorName}},</p>
    
    <p>dein kostenloser Probemonat bei housnkuh ist am {{trialEndDate}} abgelaufen.</p>
    
    <div class="expired-box">
      <h3>📋 Status deines Kontos:</h3>
      <p>dein Vendor-Konto wurde vorübergehend deaktiviert. Du können sich nicht mehr einloggen und deine Produkte sind nicht mehr für Kunden sichtbar.</p>
    </div>
    
    <div class="info-box">
      <h3>🔄 Du möchten weitermachen?</h3>
      <p>Kein Problem! Kontaktieren du uns einfach und du aktivieren dein Konto wieder. Du können jederzeit mit einem kostenpflichtigen Paket fortfahren.</p>
      <ul style="color: #333; padding-left: 20px; margin: 10px 0;">
        <li style="margin: 5px 0;">Alle deine Daten bleiben erhalten</li>
        <li style="margin: 5px 0;">Sofortige Reaktivierung nach Paket-Auswahl</li>
        <li style="margin: 5px 0;">Keine Einrichtungsgebühren</li>
        <li style="margin: 5px 0;">Flexible Laufzeiten verfügbar</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="mailto:{{adminEmail}}" class="button">Jetzt reaktivieren</a>
    </div>
    
    <p>Vielen Dank für das Vertrauen in housnkuh. du hoffen, bald wieder von dir zu hören!</p>
    
    <div class="contact-info">
      <h4>Bei Fragen steht dir Eva-Maria Schaller gerne zur Verfügung:</h4>
      <p>📞 Telefon: {{phone}}</p>
      <p>✉️ E-Mail: {{adminEmail}}</p>
      <p>📍 Adresse: {{address}}</p>
    </div>
    
    <div class="footer">
      <p>© {{currentYear}} housnkuh - dein regionaler Marktplatz<br>
      <a href="{{siteUrl}}">www.housnkuh.de</a></p>
    </div>
  </div>
</body>
</html>`,
    variables: ['vendorName', 'trialEndDate', 'adminEmail', 'phone', 'address', 'currentYear', 'siteUrl'],
    description: 'Benachrichtigung nach Ablauf des Probemonats mit Reaktivierungsoptionen',
    category: 'notification',
    isActive: true,
    version: 1
  },

  {
    templateId: 'cancellation_confirmation',
    name: 'Kündigungsbestätigung',
    type: 'cancellation_confirmation',
    subject: '✅ Kündigung bestätigt - Schade, dass du uns verlassen',
    htmlBody: `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kündigungsbestätigung</title>
  <style>
    body { font-family: 'Quicksand', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
    .container { background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #09122c; margin: 0; }
    .header p { color: #666; margin: 10px 0; }
    .confirmation-box { background-color: #f5f5f5; border: 1px solid #dee2e6; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .confirmation-box h3 { color: #09122c; margin-top: 0; }
    .info-box { background-color: #e3f2fd; border: 1px solid #2196f3; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #2196f3; }
    .info-box h3 { color: #1976d2; margin-top: 0; }
    .contact-info { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; }
    .contact-info h4 { color: #09122c; }
    .contact-info p { color: #333; margin: 5px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; }
    .footer p { color: #666; font-size: 12px; margin: 0; }
    .footer a { color: #e17564; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Kündigung bestätigt</h1>
    </div>
    
    <p>Hallo {{vendorName}},</p>
    
    <p>deine Registrierung bei housnkuh wurde erfolgreich gekündigt.</p>
    
    {{#if trialEndDate}}
    <div class="confirmation-box">
      <p><strong>Zugang bis:</strong> {{trialEndDate}}<br>
      <small style="color: #666;">Du können dein Konto bis zu diesem Datum weiterhin nutzen.</small></p>
    </div>
    {{/if}}
    
    <p>Wir bedauern, dass du dich entschieden haben, housnkuh zu verlassen. Falls du deine Meinung ändern, kannst du dich jederzeit wieder anmelden.</p>
    
    <div class="info-box">
      <h3>🔄 Jederzeit willkommen zurück!</h3>
      <p>deine Daten bleiben für {{dataRetentionDays}} Tage gespeichert, falls du deine Meinung ändern. Danach werden alle persönlichen Daten gelöscht.</p>
    </div>
    
    <p>Vielen Dank, dass du housnkuh ausprobiert haben!</p>
    
    <div class="contact-info">
      <h4>Bei Fragen kontaktieren du uns:</h4>
      <p>📞 Telefon: {{phone}}</p>
      <p>✉️ E-Mail: {{adminEmail}}</p>
    </div>
    
    <div class="footer">
      <p>© {{currentYear}} housnkuh - dein regionaler Marktplatz<br>
      <a href="{{siteUrl}}">www.housnkuh.de</a></p>
    </div>
  </div>
</body>
</html>`,
    variables: ['vendorName', 'trialEndDate', 'dataRetentionDays', 'phone', 'adminEmail', 'currentYear', 'siteUrl'],
    description: 'Bestätigung einer Kündigung mit Informationen über Datenlöschung',
    category: 'notification',
    isActive: true,
    version: 1
  },

  {
    templateId: 'admin_notification',
    name: 'Admin-Benachrichtigung',
    type: 'admin_notification',
    subject: '🔔 housnkuh Admin: {{notificationType}}',
    htmlBody: `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Benachrichtigung</title>
  <style>
    body { font-family: 'Quicksand', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
    .container { background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #2B6CB0 0%, #1E40AF 100%); border-radius: 8px; color: white; }
    .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
    .header p { margin: 10px 0 0 0; font-size: 16px; opacity: 0.9; }
    .notification-box { background-color: #e3f2fd; border: 1px solid #2196f3; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #2196f3; }
    .notification-box h3 { color: #1976d2; margin-top: 0; }
    .details-box { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .details-box h4 { color: #09122c; margin: 0 0 10px 0; }
    .details-table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .details-table td { padding: 5px 0; color: #333; }
    .details-table .label { color: #666; width: 120px; font-weight: bold; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; }
    .footer p { color: #666; font-size: 12px; margin: 0; }
    .footer a { color: #e17564; }
    .button { background-color: #09122c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>housnkuh</h1>
      <p>Admin-Dashboard Benachrichtigung</p>
    </div>
    
    <div class="notification-box">
      <h3>🔔 {{notificationType}}</h3>
      <p>{{message}}</p>
    </div>
    
    {{#if details}}
    <div class="details-box">
      <h4>Details:</h4>
      <table class="details-table">
        <tr>
          <td class="label">Zeitstempel:</td>
          <td>{{timestamp}}</td>
        </tr>
        {{#if userEmail}}
        <tr>
          <td class="label">Benutzer:</td>
          <td>{{userEmail}}</td>
        </tr>
        {{/if}}
        {{#if additionalInfo}}
        <tr>
          <td class="label">Zusätzliche Info:</td>
          <td>{{additionalInfo}}</td>
        </tr>
        {{/if}}
      </table>
    </div>
    {{/if}}
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{dashboardUrl}}" class="button">Admin Dashboard öffnen</a>
    </div>
    
    <div class="footer">
      <p>© {{currentYear}} housnkuh - Automatische Admin-Benachrichtigung<br>
      <a href="{{siteUrl}}">www.housnkuh.de</a></p>
    </div>
  </div>
</body>
</html>`,
    variables: ['notificationType', 'message', 'details', 'timestamp', 'userEmail', 'additionalInfo', 'dashboardUrl', 'currentYear', 'siteUrl'],
    description: 'Allgemeine Admin-Benachrichtigung für verschiedene Ereignisse',
    category: 'admin',
    isActive: true,
    version: 1
  },

  {
    templateId: 'system_notification',
    name: 'System-Benachrichtigung',
    type: 'system_notification',
    subject: '🔧 housnkuh System: {{alertType}}',
    htmlBody: `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>System Benachrichtigung</title>
  <style>
    body { font-family: 'Quicksand', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
    .container { background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #09122c; margin: 0; }
    .header p { color: #666; margin: 10px 0; }
    .alert-box { padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid; }
    .alert-info { background-color: #e3f2fd; border-color: #2196f3; }
    .alert-warning { background-color: #fff3cd; border-color: #ffc107; }
    .alert-error { background-color: #f8d7da; border-color: #dc3545; }
    .alert-box h3 { margin-top: 0; }
    .alert-info h3 { color: #1976d2; }
    .alert-warning h3 { color: #856404; }
    .alert-error h3 { color: #721c24; }
    .technical-details { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; font-family: monospace; font-size: 12px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; }
    .footer p { color: #666; font-size: 12px; margin: 0; }
    .footer a { color: #e17564; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>housnkuh</h1>
      <p>System Monitoring</p>
    </div>
    
    <div class="alert-box alert-{{severity}}">
      <h3>{{alertIcon}} {{alertType}}</h3>
      <p>{{message}}</p>
    </div>
    
    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <h4 style="color: #09122c; margin: 0 0 10px 0;">System Details:</h4>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 5px 0; color: #666; width: 120px; font-weight: bold;">Zeitpunkt:</td>
          <td style="padding: 5px 0; color: #333;">{{timestamp}}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #666; font-weight: bold;">Server:</td>
          <td style="padding: 5px 0; color: #333;">{{serverInfo}}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #666; font-weight: bold;">Schweregrad:</td>
          <td style="padding: 5px 0; color: #333;">{{severity}}</td>
        </tr>
      </table>
    </div>
    
    {{#if technicalDetails}}
    <div class="technical-details">
      <h4 style="color: #09122c; margin: 0 0 10px 0;">Technische Details:</h4>
      <pre style="margin: 0; white-space: pre-wrap;">{{technicalDetails}}</pre>
    </div>
    {{/if}}
    
    <div class="footer">
      <p>© {{currentYear}} housnkuh - Automatisches Monitoring System<br>
      <a href="{{siteUrl}}">www.housnkuh.de</a></p>
      <p style="color: #999; font-size: 11px; margin: 10px 0 0 0;">
        Diese Nachricht wurde automatisch generiert.
      </p>
    </div>
  </div>
</body>
</html>`,
    variables: ['alertType', 'alertIcon', 'severity', 'message', 'timestamp', 'serverInfo', 'technicalDetails', 'currentYear', 'siteUrl'],
    description: 'System-Benachrichtigungen für technische Ereignisse und Fehler',
    category: 'system',
    isActive: true,
    version: 1
  }
];

async function seedEmailTemplates() {
  try {
    console.log('🌱 Starting email templates seeding...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/housnkuh');
    console.log('✅ Connected to MongoDB');
    
    // Clear existing templates (optional - nur beim ersten Mal)
    // await EmailTemplate.deleteMany({});
    // console.log('🗑️  Cleared existing templates');
    
    // Insert templates
    for (const templateData of emailTemplates) {
      const existingTemplate = await EmailTemplate.findOne({ templateId: templateData.templateId });
      
      if (existingTemplate) {
        console.log(`⚠️  Template '${templateData.templateId}' already exists, skipping...`);
      } else {
        const template = new EmailTemplate({
          ...templateData,
          lastModified: new Date(),
          modifiedBy: 'system-seed'
        });
        
        await template.save();
        console.log(`✅ Created template: ${templateData.name}`);
      }
    }
    
    console.log(`🎉 Email templates seeding completed! Created ${emailTemplates.length} template definitions.`);
    
  } catch (error) {
    console.error('❌ Error seeding email templates:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  seedEmailTemplates();
}

module.exports = { seedEmailTemplates, emailTemplates };