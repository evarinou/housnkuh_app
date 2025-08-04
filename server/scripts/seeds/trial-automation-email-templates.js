// server/scripts/seeds/trial-automation-email-templates.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Import the compiled JavaScript version
const EmailTemplate = require('../../dist/models/EmailTemplate').default;

dotenv.config();

const trialEmailTemplates = [
  {
    templateId: 'trial_welcome_email',
    name: 'Willkommen - Probemonat gestartet',
    type: 'trial_activation',
    subject: 'Willkommen bei housnkuh - Ihr Probemonat hat begonnen! 🎉',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h1 style="color: #2c5530; text-align: center; margin-bottom: 30px;">
            Willkommen bei housnkuh! 🌱
          </h1>
          
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            Hallo {{vendorName}},
          </p>
          
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            herzlichen Glückwunsch! Ihr 30-tägiger Probemonat bei housnkuh hat am <strong>{{trialStartDate}}</strong> begonnen.
          </p>
          
          <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2c5530; margin-top: 0;">Ihr Probemonat im Überblick:</h3>
            <ul style="color: #333; margin: 10px 0;">
              <li>Startdatum: {{trialStartDate}}</li>
              <li>Enddatum: {{trialEndDate}}</li>
              <li>Dauer: 30 Tage kostenlos</li>
              <li>Vollzugang zu allen Funktionen</li>
            </ul>
          </div>
          
          <h3 style="color: #2c5530; margin-top: 30px;">Erste Schritte:</h3>
          <ol style="color: #333; line-height: 1.6;">
            <li>Loggen Sie sich in Ihr Dashboard ein</li>
            <li>Vervollständigen Sie Ihr Verkäuferprofil</li>
            <li>Laden Sie Ihre ersten Produktbilder hoch</li>
            <li>Entdecken Sie unsere Verkaufstools</li>
          </ol>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{dashboardUrl}}" style="background-color: #2c5530; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Jetzt Dashboard öffnen
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            Bei Fragen stehen wir Ihnen gerne zur Verfügung: 
            <a href="mailto:{{contactEmail}}" style="color: #2c5530;">{{contactEmail}}</a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #888; text-align: center;">
            © {{currentYear}} housnkuh - Ihr regionaler Direktvermarkter-Marktplatz
          </p>
        </div>
      </div>
    `,
    textBody: `
      Willkommen bei housnkuh!
      
      Hallo {{vendorName}},
      
      herzlichen Glückwunsch! Ihr 30-tägiger Probemonat bei housnkuh hat am {{trialStartDate}} begonnen.
      
      Ihr Probemonat im Überblick:
      - Startdatum: {{trialStartDate}}
      - Enddatum: {{trialEndDate}}
      - Dauer: 30 Tage kostenlos
      - Vollzugang zu allen Funktionen
      
      Erste Schritte:
      1. Loggen Sie sich in Ihr Dashboard ein
      2. Vervollständigen Sie Ihr Verkäuferprofil
      3. Laden Sie Ihre ersten Produktbilder hoch
      4. Entdecken Sie unsere Verkaufstools
      
      Dashboard öffnen: {{dashboardUrl}}
      
      Bei Fragen: {{contactEmail}}
      
      © {{currentYear}} housnkuh
    `,
    variables: ['vendorName', 'trialStartDate', 'trialEndDate', 'dashboardUrl', 'contactEmail', 'currentYear'],
    description: 'Willkommens-E-Mail die gesendet wird, wenn ein Direktvermarkter seinen Probemonat startet',
    category: 'vendor',
    isActive: true
  },
  
  {
    templateId: 'trial_7_day_reminder',
    name: '7-Tage Probemonat Erinnerung',
    type: 'trial_7_day_reminder',
    subject: 'Nur noch 7 Tage Probemonat - Verpassen Sie nichts! ⏰',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h1 style="color: #2c5530; text-align: center; margin-bottom: 30px;">
            Nur noch 7 Tage Probemonat! ⏰
          </h1>
          
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            Hallo {{vendorName}},
          </p>
          
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            Ihr Probemonat bei housnkuh läuft noch <strong>{{daysRemaining}} Tage</strong> (bis zum {{trialEndDate}}).
          </p>
          
          <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h3 style="color: #856404; margin-top: 0;">Nutzen Sie die verbleibende Zeit optimal:</h3>
            <ul style="color: #856404; margin: 10px 0;">
              <li>Testen Sie alle Verkaufsfeatures</li>
              <li>Laden Sie weitere Produkte hoch</li>
              <li>Sammeln Sie erste Kundenfeedbacks</li>
              <li>Entscheiden Sie über Ihre Mitgliedschaft</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{dashboardUrl}}" style="background-color: #2c5530; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Dashboard öffnen
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            Fragen zur Mitgliedschaft? Kontaktieren Sie uns: 
            <a href="mailto:{{contactEmail}}" style="color: #2c5530;">{{contactEmail}}</a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #888; text-align: center;">
            © {{currentYear}} housnkuh
          </p>
        </div>
      </div>
    `,
    textBody: `
      Nur noch 7 Tage Probemonat!
      
      Hallo {{vendorName}},
      
      Ihr Probemonat bei housnkuh läuft noch {{daysRemaining}} Tage (bis zum {{trialEndDate}}).
      
      Nutzen Sie die verbleibende Zeit optimal:
      - Testen Sie alle Verkaufsfeatures
      - Laden Sie weitere Produkte hoch
      - Sammeln Sie erste Kundenfeedbacks
      - Entscheiden Sie über Ihre Mitgliedschaft
      
      Dashboard öffnen: {{dashboardUrl}}
      
      Fragen zur Mitgliedschaft? {{contactEmail}}
      
      © {{currentYear}} housnkuh
    `,
    variables: ['vendorName', 'daysRemaining', 'trialEndDate', 'dashboardUrl', 'contactEmail', 'currentYear'],
    description: 'Erinnerung 7 Tage vor Ende des Probemonats',
    category: 'vendor',
    isActive: true
  },
  
  {
    templateId: 'trial_3_day_reminder',
    name: '3-Tage Probemonat Erinnerung',
    type: 'trial_3_day_reminder',
    subject: 'Letzte 3 Tage Probemonat - Jetzt entscheiden! 🚨',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h1 style="color: #dc3545; text-align: center; margin-bottom: 30px;">
            Letzte 3 Tage Probemonat! 🚨
          </h1>
          
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            Hallo {{vendorName}},
          </p>
          
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            Ihr Probemonat endet in nur noch <strong>{{daysRemaining}} Tagen</strong> am {{trialEndDate}}.
          </p>
          
          <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
            <h3 style="color: #721c24; margin-top: 0;">Handeln Sie jetzt:</h3>
            <ul style="color: #721c24; margin: 10px 0;">
              <li>Sichern Sie sich Ihre Mitgliedschaft</li>
              <li>Nutzen Sie die letzten Probetage</li>
              <li>Kontaktieren Sie uns bei Fragen</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{dashboardUrl}}" style="background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Jetzt Dashboard öffnen
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            Entscheidungshilfe gewünscht? Kontaktieren Sie uns: 
            <a href="mailto:{{contactEmail}}" style="color: #dc3545;">{{contactEmail}}</a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #888; text-align: center;">
            © {{currentYear}} housnkuh
          </p>
        </div>
      </div>
    `,
    textBody: `
      Letzte 3 Tage Probemonat!
      
      Hallo {{vendorName}},
      
      Ihr Probemonat endet in nur noch {{daysRemaining}} Tagen am {{trialEndDate}}.
      
      Handeln Sie jetzt:
      - Sichern Sie sich Ihre Mitgliedschaft
      - Nutzen Sie die letzten Probetage
      - Kontaktieren Sie uns bei Fragen
      
      Dashboard öffnen: {{dashboardUrl}}
      
      Entscheidungshilfe gewünscht? {{contactEmail}}
      
      © {{currentYear}} housnkuh
    `,
    variables: ['vendorName', 'daysRemaining', 'trialEndDate', 'dashboardUrl', 'contactEmail', 'currentYear'],
    description: 'Urgente Erinnerung 3 Tage vor Ende des Probemonats',
    category: 'vendor',
    isActive: true
  },
  
  {
    templateId: 'trial_1_day_reminder',
    name: '1-Tag Probemonat Erinnerung',
    type: 'trial_1_day_reminder',
    subject: 'Letzter Tag Probemonat - Morgen läuft er ab! ⚠️',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h1 style="color: #dc3545; text-align: center; margin-bottom: 30px;">
            Letzter Tag Probemonat! ⚠️
          </h1>
          
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            Hallo {{vendorName}},
          </p>
          
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            <strong>Morgen endet Ihr Probemonat</strong> am {{trialEndDate}}.
          </p>
          
          <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
            <h3 style="color: #721c24; margin-top: 0;">Letzte Chance:</h3>
            <ul style="color: #721c24; margin: 10px 0;">
              <li>Sichern Sie sich heute noch Ihre Mitgliedschaft</li>
              <li>Nutzen Sie die letzten Stunden</li>
              <li>Rufen Sie uns an für sofortige Hilfe</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{dashboardUrl}}" style="background-color: #dc3545; color: white; padding: 15px 35px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
              JETZT HANDELN
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            Sofortige Hilfe gewünscht? Kontaktieren Sie uns: 
            <a href="mailto:{{contactEmail}}" style="color: #dc3545;">{{contactEmail}}</a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #888; text-align: center;">
            © {{currentYear}} housnkuh
          </p>
        </div>
      </div>
    `,
    textBody: `
      Letzter Tag Probemonat!
      
      Hallo {{vendorName}},
      
      MORGEN endet Ihr Probemonat am {{trialEndDate}}.
      
      Letzte Chance:
      - Sichern Sie sich heute noch Ihre Mitgliedschaft
      - Nutzen Sie die letzten Stunden
      - Rufen Sie uns an für sofortige Hilfe
      
      Dashboard öffnen: {{dashboardUrl}}
      
      Sofortige Hilfe gewünscht? {{contactEmail}}
      
      © {{currentYear}} housnkuh
    `,
    variables: ['vendorName', 'daysRemaining', 'trialEndDate', 'dashboardUrl', 'contactEmail', 'currentYear'],
    description: 'Finale Erinnerung 1 Tag vor Ende des Probemonats',
    category: 'vendor',
    isActive: true
  },
  
  {
    templateId: 'trial_expired_notification',
    name: 'Probemonat abgelaufen',
    type: 'trial_expired',
    subject: 'Ihr Probemonat ist abgelaufen - Reaktivierung möglich 📅',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h1 style="color: #6c757d; text-align: center; margin-bottom: 30px;">
            Ihr Probemonat ist abgelaufen 📅
          </h1>
          
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            Hallo {{vendorName}},
          </p>
          
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            Ihr 30-tägiger Probemonat bei housnkuh ist am {{trialEndDate}} abgelaufen.
          </p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6c757d;">
            <h3 style="color: #495057; margin-top: 0;">Kein Problem - Reaktivierung jederzeit möglich:</h3>
            <ul style="color: #495057; margin: 10px 0;">
              <li>Ihre Daten sind sicher gespeichert</li>
              <li>Einfache Reaktivierung</li>
              <li>Alle Funktionen sofort wieder verfügbar</li>
              <li>Keine Einrichtungsgebühren</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{renewalUrl}}" style="background-color: #2c5530; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Mitgliedschaft reaktivieren
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            Haben Sie Fragen zur Reaktivierung? Kontaktieren Sie uns: 
            <a href="mailto:{{contactEmail}}" style="color: #2c5530;">{{contactEmail}}</a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #888; text-align: center;">
            © {{currentYear}} housnkuh
          </p>
        </div>
      </div>
    `,
    textBody: `
      Ihr Probemonat ist abgelaufen
      
      Hallo {{vendorName}},
      
      Ihr 30-tägiger Probemonat bei housnkuh ist am {{trialEndDate}} abgelaufen.
      
      Kein Problem - Reaktivierung jederzeit möglich:
      - Ihre Daten sind sicher gespeichert
      - Einfache Reaktivierung
      - Alle Funktionen sofort wieder verfügbar
      - Keine Einrichtungsgebühren
      
      Mitgliedschaft reaktivieren: {{renewalUrl}}
      
      Haben Sie Fragen zur Reaktivierung? {{contactEmail}}
      
      © {{currentYear}} housnkuh
    `,
    variables: ['vendorName', 'trialEndDate', 'renewalUrl', 'contactEmail', 'currentYear'],
    description: 'Benachrichtigung nach Ablauf des Probemonats',
    category: 'vendor',
    isActive: true
  },
  
  {
    templateId: 'trial_conversion_confirmation',
    name: 'Probemonat Konvertierung bestätigt',
    type: 'trial_conversion_confirmation',
    subject: 'Willkommen als Vollmitglied bei housnkuh! 🎉',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h1 style="color: #28a745; text-align: center; margin-bottom: 30px;">
            Willkommen als Vollmitglied! 🎉
          </h1>
          
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            Hallo {{vendorName}},
          </p>
          
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            herzlichen Glückwunsch! Sie haben Ihren Probemonat erfolgreich in eine Vollmitgliedschaft umgewandelt.
          </p>
          
          <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h3 style="color: #155724; margin-top: 0;">Ihre Vollmitgliedschaft:</h3>
            <ul style="color: #155724; margin: 10px 0;">
              <li>Unbegrenzter Zugang zu allen Features</li>
              <li>Vollständige Verkaufstools</li>
              <li>Premium-Support</li>
              <li>Regelmäßige Updates</li>
            </ul>
          </div>
          
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            Konvertiert am: <strong>{{conversionDate}}</strong>
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{dashboardUrl}}" style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Vollmitglied Dashboard
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            Fragen zur Mitgliedschaft? Kontaktieren Sie uns: 
            <a href="mailto:{{contactEmail}}" style="color: #28a745;">{{contactEmail}}</a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #888; text-align: center;">
            © {{currentYear}} housnkuh
          </p>
        </div>
      </div>
    `,
    textBody: `
      Willkommen als Vollmitglied!
      
      Hallo {{vendorName}},
      
      herzlichen Glückwunsch! Sie haben Ihren Probemonat erfolgreich in eine Vollmitgliedschaft umgewandelt.
      
      Ihre Vollmitgliedschaft:
      - Unbegrenzter Zugang zu allen Features
      - Vollständige Verkaufstools
      - Premium-Support
      - Regelmäßige Updates
      
      Konvertiert am: {{conversionDate}}
      
      Vollmitglied Dashboard: {{dashboardUrl}}
      
      Fragen zur Mitgliedschaft? {{contactEmail}}
      
      © {{currentYear}} housnkuh
    `,
    variables: ['vendorName', 'conversionDate', 'dashboardUrl', 'contactEmail', 'currentYear'],
    description: 'Bestätigung der erfolgreichen Konvertierung vom Probemonat zur Vollmitgliedschaft',
    category: 'vendor',
    isActive: true
  }
];

async function seedTrialEmailTemplates() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/housnkuh');
    console.log('Connected to MongoDB');

    // Clear existing trial templates
    await EmailTemplate.deleteMany({
      templateId: { $in: trialEmailTemplates.map(t => t.templateId) }
    });
    console.log('Cleared existing trial email templates');

    // Insert new templates
    for (const template of trialEmailTemplates) {
      await EmailTemplate.create(template);
      console.log(`✅ Created template: ${template.name}`);
    }

    console.log('✅ All trial email templates seeded successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding trial email templates:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedTrialEmailTemplates();
}

module.exports = { seedTrialEmailTemplates, trialEmailTemplates };