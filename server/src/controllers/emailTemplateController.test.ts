/**
 * @file emailTemplateController.test.ts
 * @purpose Unit tests for emailTemplateController functions, testing CRUD operations and URL standardization
 * @created 2025-08-18
 */

import { Request, Response } from 'express';
import {
  getAllEmailTemplates,
  getEmailTemplate,
  updateEmailTemplate,
  previewEmailTemplate,
  sendTestEmail,
  getTemplateVariables
} from './emailTemplateController';
import EmailTemplate from '../models/EmailTemplate';
import { emailService } from '../utils/emailService';

// Mock dependencies
jest.mock('../models/EmailTemplate');
jest.mock('../utils/emailService');

describe('emailTemplateController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup response mocks
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnThis();
    
    res = {
      json: jsonMock,
      status: statusMock
    };

    // Setup environment variable for consistent testing
    process.env.FRONTEND_URL = 'https://test.housnkuh.de';
  });

  afterEach(() => {
    // Clean up environment variable
    delete process.env.FRONTEND_URL;
  });

  describe('getAllEmailTemplates', () => {
    it('should return all email templates with filters', async () => {
      req = {
        query: {
          category: 'vendor_registration',
          isActive: 'true'
        }
      };

      const mockTemplates = [
        { id: '1', name: 'Template 1', category: 'vendor_registration' },
        { id: '2', name: 'Template 2', category: 'vendor_registration' }
      ];

      (EmailTemplate.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockTemplates)
        })
      });

      await getAllEmailTemplates(req as Request, res as Response);

      expect(EmailTemplate.find).toHaveBeenCalledWith({
        category: 'vendor_registration',
        isActive: true
      });
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockTemplates,
        count: 2
      });
    });

    it('should handle errors gracefully', async () => {
      req = { query: {} };
      
      (EmailTemplate.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockRejectedValue(new Error('Database error'))
        })
      });

      await getAllEmailTemplates(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Fehler beim Laden der Email-Templates'
      });
    });
  });

  describe('previewEmailTemplate', () => {
    it('should generate preview with FRONTEND_URL in template data', async () => {
      req = {
        body: {
          htmlBody: '<p>Hello {{vendorName}} from {{siteName}} at {{siteUrl}}</p>',
          subject: 'Welcome {{vendorName}}',
          templateData: { vendorName: 'Test Vendor' }
        }
      };

      const mockCompileTemplate = jest.fn()
        .mockReturnValueOnce('Welcome Test Vendor')
        .mockReturnValueOnce('<p>Hello Test Vendor from Housnkuh at https://test.housnkuh.de</p>');

      (emailService.compileTemplate as jest.Mock) = mockCompileTemplate;

      await previewEmailTemplate(req as Request, res as Response);

      expect(mockCompileTemplate).toHaveBeenCalledTimes(2);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          subject: 'Welcome Test Vendor',
          htmlBody: '<p>Hello Test Vendor from Housnkuh at https://test.housnkuh.de</p>',
          templateData: expect.objectContaining({
            vendorName: 'Test Vendor',
            siteName: 'Housnkuh',
            siteUrl: 'https://test.housnkuh.de',
            currentYear: new Date().getFullYear().toString()
          })
        }
      });
    });

    it('should use default localhost URL when FRONTEND_URL is not set', async () => {
      delete process.env.FRONTEND_URL;

      req = {
        body: {
          htmlBody: '<p>Site URL: {{siteUrl}}</p>',
          subject: 'Test Subject'
        }
      };

      const mockCompileTemplate = jest.fn()
        .mockReturnValueOnce('Test Subject')
        .mockReturnValueOnce('<p>Site URL: http://localhost:3000</p>');

      (emailService.compileTemplate as jest.Mock) = mockCompileTemplate;

      await previewEmailTemplate(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          templateData: expect.objectContaining({
            siteUrl: 'http://localhost:3000'
          })
        })
      });
    });

    it('should return 400 for missing required fields', async () => {
      req = {
        body: {
          htmlBody: '<p>Test</p>'
          // missing subject
        }
      };

      await previewEmailTemplate(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'HTML-Body und Subject sind erforderlich'
      });
    });
  });

  describe('sendTestEmail', () => {
    it('should send test email with FRONTEND_URL in template data', async () => {
      req = {
        body: {
          templateId: 'template123',
          testEmail: 'test@example.com',
          templateData: { vendorName: 'Test Vendor' }
        }
      };

      const mockTemplate = {
        _id: 'template123',
        subject: 'Test Subject for {{vendorName}}',
        htmlBody: '<p>Hello {{vendorName}} from {{siteUrl}}</p>',
        textBody: 'Hello {{vendorName}} from {{siteUrl}}'
      };

      (EmailTemplate.findById as jest.Mock).mockResolvedValue(mockTemplate);
      
      const mockCompileTemplate = jest.fn()
        .mockReturnValueOnce('Test Subject for Test Vendor')
        .mockReturnValueOnce('<p>Hello Test Vendor from https://test.housnkuh.de</p>')
        .mockReturnValueOnce('Hello Test Vendor from https://test.housnkuh.de');

      (emailService.compileTemplate as jest.Mock) = mockCompileTemplate;
      (emailService.sendEmail as jest.Mock).mockResolvedValue(true);

      await sendTestEmail(req as Request, res as Response);

      expect(EmailTemplate.findById).toHaveBeenCalledWith('template123');
      expect(emailService.sendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: '[TEST] Test Subject for Test Vendor',
        html: '<p>Hello Test Vendor from https://test.housnkuh.de</p>',
        text: 'Hello Test Vendor from https://test.housnkuh.de'
      });
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Test-Email erfolgreich an test@example.com gesendet'
      });
    });

    it('should return 404 for non-existent template', async () => {
      req = {
        body: {
          templateId: 'nonexistent',
          testEmail: 'test@example.com'
        }
      };

      (EmailTemplate.findById as jest.Mock).mockResolvedValue(null);

      await sendTestEmail(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Email-Template nicht gefunden'
      });
    });

    it('should return 400 for missing required fields', async () => {
      req = {
        body: {
          templateId: 'template123'
          // missing testEmail
        }
      };

      await sendTestEmail(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Template-ID und Test-Email-Adresse sind erforderlich'
      });
    });
  });

  describe('getEmailTemplate', () => {
    it('should return specific email template', async () => {
      req = { params: { id: 'template123' } };

      const mockTemplate = {
        _id: 'template123',
        name: 'Test Template',
        subject: 'Test Subject'
      };

      (EmailTemplate.findById as jest.Mock).mockResolvedValue(mockTemplate);

      await getEmailTemplate(req as Request, res as Response);

      expect(EmailTemplate.findById).toHaveBeenCalledWith('template123');
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockTemplate
      });
    });

    it('should return 404 for non-existent template', async () => {
      req = { params: { id: 'nonexistent' } };

      (EmailTemplate.findById as jest.Mock).mockResolvedValue(null);

      await getEmailTemplate(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Email-Template nicht gefunden'
      });
    });
  });

  describe('updateEmailTemplate', () => {
    it('should update email template successfully', async () => {
      req = {
        params: { id: 'template123' },
        body: {
          subject: 'Updated Subject',
          htmlBody: '<p>Updated content</p>',
          textBody: 'Updated content',
          variables: ['vendorName', 'siteUrl'],
          description: 'Updated description',
          isActive: true
        },
        user: { username: 'testadmin' }
      } as any;

      const mockUpdatedTemplate = {
        _id: 'template123',
        subject: 'Updated Subject',
        htmlBody: '<p>Updated content</p>',
        modifiedBy: 'testadmin'
      };

      (EmailTemplate.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedTemplate);

      await updateEmailTemplate(req as Request, res as Response);

      expect(EmailTemplate.findByIdAndUpdate).toHaveBeenCalledWith(
        'template123',
        expect.objectContaining({
          subject: 'Updated Subject',
          htmlBody: '<p>Updated content</p>',
          modifiedBy: 'testadmin'
        }),
        { new: true, runValidators: true }
      );
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedTemplate,
        message: 'Email-Template erfolgreich aktualisiert'
      });
    });
  });

  describe('getTemplateVariables', () => {
    it('should return variables for specific template type', async () => {
      req = { params: { type: 'vendor_registration_confirmation' } };

      await getTemplateVariables(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          type: 'vendor_registration_confirmation',
          variables: expect.arrayContaining([
            expect.objectContaining({
              name: 'vendorName',
              description: 'Name des Vendors'
            }),
            expect.objectContaining({
              name: 'siteUrl',
              description: 'URL der Plattform'
            })
          ])
        }
      });
    });

    it('should return default variables for unknown template type', async () => {
      req = { params: { type: 'unknown_type' } };

      await getTemplateVariables(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          type: 'unknown_type',
          variables: expect.arrayContaining([
            expect.objectContaining({
              name: 'siteName',
              description: 'Name der Plattform'
            }),
            expect.objectContaining({
              name: 'siteUrl',
              description: 'URL der Plattform'
            })
          ])
        }
      });
    });
  });
});