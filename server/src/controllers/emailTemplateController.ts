/**
 * @file Email Template controller for the housnkuh marketplace application
 * @description Email template management controller with CRUD operations and template rendering
 * Handles email template creation, modification, and administration
 */

import { Request, Response } from 'express';
import EmailTemplate, { IEmailTemplate } from '../models/EmailTemplate';
import { emailService } from '../utils/emailService';

// GET /api/admin/email-templates - Alle Templates auflisten
export const getAllEmailTemplates = async (req: Request, res: Response) => {
  try {
    const { category, isActive } = req.query;
    
    const filter: any = {};
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const templates = await EmailTemplate.find(filter)
      .select('-htmlBody -textBody') // Für Performance, body nur bei einzelnen Templates laden
      .sort({ category: 1, name: 1 });

    res.json({
      success: true,
      data: templates,
      count: templates.length
    });
  } catch (error) {
    console.error('Error fetching email templates:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Email-Templates'
    });
  }
};

// GET /api/admin/email-templates/:id - Einzelnes Template laden
export const getEmailTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const template = await EmailTemplate.findById(id);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Email-Template nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error fetching email template:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Email-Templates'
    });
  }
};

// PUT /api/admin/email-templates/:id - Template bearbeiten
export const updateEmailTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { subject, htmlBody, textBody, variables, description, isActive } = req.body;
    
    // Admin-User aus JWT token extrahieren (falls verfügbar)
    const modifiedBy = (req as any).user?.username || 'admin';

    const updateData = {
      subject,
      htmlBody,
      textBody,
      variables: Array.isArray(variables) ? variables : [],
      description,
      isActive,
      modifiedBy,
      lastModified: new Date()
    };

    const template = await EmailTemplate.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Email-Template nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: template,
      message: 'Email-Template erfolgreich aktualisiert'
    });
  } catch (error) {
    console.error('Error updating email template:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Email-Templates'
    });
  }
};

// POST /api/admin/email-templates/preview - Template-Vorschau generieren
export const previewEmailTemplate = async (req: Request, res: Response) => {
  try {
    const { htmlBody, subject, templateData = {} } = req.body;

    if (!htmlBody || !subject) {
      return res.status(400).json({
        success: false,
        message: 'HTML-Body und Subject sind erforderlich'
      });
    }

    // Standard-Testdaten für Preview
    const defaultTemplateData = {
      vendorName: 'Max Mustermann',
      siteName: 'Housnkuh',
      siteUrl: process.env.CLIENT_URL || 'http://localhost:3000',
      currentYear: new Date().getFullYear().toString(),
      trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('de-DE'),
      contractNumber: 'K-2024-001',
      ...templateData
    };

    // Handlebars-Template kompilieren und rendern
    const compiledSubject = emailService.compileTemplate(subject, defaultTemplateData);
    const compiledHtml = emailService.compileTemplate(htmlBody, defaultTemplateData);

    res.json({
      success: true,
      data: {
        subject: compiledSubject,
        htmlBody: compiledHtml,
        templateData: defaultTemplateData
      }
    });
  } catch (error) {
    console.error('Error generating email preview:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Generieren der Template-Vorschau',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// POST /api/admin/email-templates/send-test - Test-Email versenden
export const sendTestEmail = async (req: Request, res: Response) => {
  try {
    const { templateId, testEmail, templateData = {} } = req.body;

    if (!templateId || !testEmail) {
      return res.status(400).json({
        success: false,
        message: 'Template-ID und Test-Email-Adresse sind erforderlich'
      });
    }

    const template = await EmailTemplate.findById(templateId);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Email-Template nicht gefunden'
      });
    }

    // Standard-Testdaten
    const defaultTemplateData = {
      vendorName: 'Test Vendor',
      siteName: 'Housnkuh',
      siteUrl: process.env.CLIENT_URL || 'http://localhost:3000',
      currentYear: new Date().getFullYear().toString(),
      trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('de-DE'),
      contractNumber: 'TEST-2024-001',
      ...templateData
    };

    // Test-Email versenden
    await emailService.sendEmail({
      to: testEmail,
      subject: `[TEST] ${emailService.compileTemplate(template.subject, defaultTemplateData)}`,
      html: emailService.compileTemplate(template.htmlBody, defaultTemplateData),
      text: template.textBody ? emailService.compileTemplate(template.textBody, defaultTemplateData) : undefined
    });

    res.json({
      success: true,
      message: `Test-Email erfolgreich an ${testEmail} gesendet`
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Versenden der Test-Email',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET /api/admin/email-templates/variables/:type - Verfügbare Variablen für Template-Typ
export const getTemplateVariables = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;

    // Definiere verfügbare Variablen pro Template-Typ
    const variablesByType: Record<string, { name: string; description: string; example: string }[]> = {
      vendor_registration_confirmation: [
        { name: 'vendorName', description: 'Name des Vendors', example: 'Max Mustermann' },
        { name: 'confirmationUrl', description: 'Bestätigungs-URL', example: 'https://...' },
        { name: 'siteName', description: 'Name der Plattform', example: 'Housnkuh' },
        { name: 'siteUrl', description: 'URL der Plattform', example: 'https://housnkuh.de' }
      ],
      contract_created: [
        { name: 'vendorName', description: 'Name des Vendors', example: 'Max Mustermann' },
        { name: 'contractNumber', description: 'Vertragsnummer', example: 'K-2024-001' },
        { name: 'startDate', description: 'Startdatum', example: '01.01.2024' },
        { name: 'endDate', description: 'Enddatum', example: '31.12.2024' },
        { name: 'mietfachNumber', description: 'Mietfach-Nummer', example: 'MF-001' }
      ],
      trial_ending: [
        { name: 'vendorName', description: 'Name des Vendors', example: 'Max Mustermann' },
        { name: 'trialEndDate', description: 'Ende der Testphase', example: '31.01.2024' },
        { name: 'daysRemaining', description: 'Verbleibende Tage', example: '3' }
      ],
      // Weitere Template-Typen können hier hinzugefügt werden
      default: [
        { name: 'siteName', description: 'Name der Plattform', example: 'Housnkuh' },
        { name: 'siteUrl', description: 'URL der Plattform', example: 'https://housnkuh.de' },
        { name: 'currentYear', description: 'Aktuelles Jahr', example: '2024' }
      ]
    };

    const variables = variablesByType[type] || variablesByType.default;

    res.json({
      success: true,
      data: {
        type,
        variables
      }
    });
  } catch (error) {
    console.error('Error fetching template variables:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Template-Variablen'
    });
  }
};