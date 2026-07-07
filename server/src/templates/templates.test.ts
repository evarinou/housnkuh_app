/**
 * @file templates.test.ts
 * @purpose Unit tests for Handlebars template compilation and rendering
 * @created 2025-09-04
 * @modified 2025-09-04
 */

import fs from 'fs/promises';
import path from 'path';
import handlebars from 'handlebars';
import mongoose from 'mongoose';
import { JSDOM } from 'jsdom';

// Register Handlebars helpers for testing
handlebars.registerHelper('formatDate', (date: Date | string, format: string) => {
  const d = new Date(date);
  if (format === 'DD.MM.YYYY') {
    return d.toLocaleDateString('de-DE');
  }
  return d.toLocaleDateString('de-DE');
});

handlebars.registerHelper('formatPrice', (price: number) => {
  return price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
});

handlebars.registerHelper('formatNumber', (number: number, type: string) => {
  if (type === 'decimal') {
    return number.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  }
  return number.toLocaleString('de-DE');
});

handlebars.registerHelper('formatMonth', (month: number) => {
  const months = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];
  return months[month - 1] || 'Unbekannt';
});

handlebars.registerHelper('multiply', (a: number, b: number) => a * b);
handlebars.registerHelper('subtract', (a: number, b: number) => a - b);
handlebars.registerHelper('eq', (a: any, b: any) => a === b);
handlebars.registerHelper('isOverdue', (dueDate: Date) => new Date() > new Date(dueDate));

describe('Invoice Template Tests', () => {
  let invoiceTemplate: HandlebarsTemplateDelegate;
  
  beforeAll(async () => {
    // Load the invoice template
    const templatePath = path.join(__dirname, 'invoice.hbs');
    const templateSource = await fs.readFile(templatePath, 'utf-8');
    invoiceTemplate = handlebars.compile(templateSource);
  });

  const mockInvoiceData = {
    invoiceNumber: 'RE-2025-09-00001',
    status: 'sent',
    createdAt: new Date('2025-09-04'),
    dueDate: new Date('2025-09-18'),
    period: {
      month: 9,
      year: 2025
    },
    subtotal: 125.50,
    tax: 0.19,
    totalAmount: 149.35,
    paidDate: null,
    companyInfo: {
      name: 'housnkuh GmbH',
      address: 'Musterstraße 123, 12345 Musterstadt',
      email: 'info@housnkuh.de',
      phone: '+49 123 456789',
      website: 'www.housnkuh.de',
      taxId: 'DE123456789'
    },
    vendor: {
      firstName: 'Max',
      lastName: 'Mustermann',
      businessName: 'Muster Bio-Hof GmbH',
      email: 'max@musterhof.de',
      taxId: 'DE987654321',
      address: {
        street: 'Hofstraße',
        number: '42',
        zipCode: '98765',
        city: 'Musterdorf',
        country: 'Deutschland'
      }
    },
    items: [
      {
        description: 'Standard Mietfach (50x30x40cm)',
        quantity: 2,
        unitPrice: 45.00,
        totalPrice: 90.00,
        type: 'mietfach',
        period: {
          from: new Date('2025-09-01'),
          to: new Date('2025-09-30')
        }
      },
      {
        description: 'Lagerservice Premium',
        quantity: 1,
        unitPrice: 35.50,
        totalPrice: 35.50,
        type: 'zusatzleistung',
        period: {
          from: new Date('2025-09-01'),
          to: new Date('2025-09-30')
        }
      }
    ]
  };

  describe('Template Compilation', () => {
    test('should compile invoice template without errors', async () => {
      expect(invoiceTemplate).toBeDefined();
      expect(typeof invoiceTemplate).toBe('function');
    });

    test('should render template with mock data', () => {
      const result = invoiceTemplate(mockInvoiceData);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(1000);
    });

    test('should generate valid HTML', () => {
      const html = invoiceTemplate(mockInvoiceData);
      const dom = new JSDOM(html);
      const document = dom.window.document;
      
      expect(document.doctype).toBeTruthy();
      expect(document.querySelector('html')).toBeTruthy();
      expect(document.querySelector('head')).toBeTruthy();
      expect(document.querySelector('body')).toBeTruthy();
    });
  });

  describe('Variable Substitution', () => {
    test('should substitute invoice number correctly', () => {
      const html = invoiceTemplate(mockInvoiceData);
      expect(html).toContain('RE-2025-09-00001');
    });

    test('should substitute company information correctly', () => {
      const html = invoiceTemplate(mockInvoiceData);
      expect(html).toContain('housnkuh GmbH');
      expect(html).toContain('info@housnkuh.de');
      expect(html).toContain('DE123456789');
    });

    test('should substitute vendor information correctly', () => {
      const html = invoiceTemplate(mockInvoiceData);
      expect(html).toContain('Muster Bio-Hof GmbH');
      expect(html).toContain('max@musterhof.de');
      expect(html).toContain('Hofstraße 42');
      expect(html).toContain('98765 Musterdorf');
    });

    test('should substitute invoice amounts correctly', () => {
      const html = invoiceTemplate(mockInvoiceData);
      expect(html).toContain('125,50€'); // Subtotal
      expect(html).toContain('149,35€'); // Total amount
      expect(html).toContain('19%'); // Tax rate
    });

    test('should substitute invoice period correctly', () => {
      const html = invoiceTemplate(mockInvoiceData);
      expect(html).toContain('September'); // Month name
      expect(html).toContain('2025'); // Year
    });
  });

  describe('Input Escaping and Security', () => {
    test('should escape HTML in vendor names', () => {
      const maliciousData = {
        ...mockInvoiceData,
        vendor: {
          ...mockInvoiceData.vendor,
          businessName: '<script>alert("XSS")</script>Hacker GmbH'
        }
      };
      
      const html = invoiceTemplate(maliciousData);
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    test('should escape HTML in item descriptions', () => {
      const maliciousData = {
        ...mockInvoiceData,
        items: [{
          ...mockInvoiceData.items[0],
          description: '<img src="x" onerror="alert(1)">Malicious Item'
        }]
      };
      
      const html = invoiceTemplate(maliciousData);
      expect(html).not.toContain('<img src="x"');
      expect(html).toContain('Malicious Item'); // Handlebars auto-escapes
    });

    test('should handle special characters in addresses', () => {
      const specialCharData = {
        ...mockInvoiceData,
        vendor: {
          ...mockInvoiceData.vendor,
          address: {
            ...mockInvoiceData.vendor.address,
            street: 'Straße mit Ümlaut & Sonderzeichen'
          }
        }
      };
      
      const html = invoiceTemplate(specialCharData);
      expect(html).toContain('Ümlaut');
      expect(html).toContain('&amp;'); // & should be escaped
    });
  });

  describe('Number Formatting', () => {
    test('should format prices in German style', () => {
      const testData = {
        ...mockInvoiceData,
        subtotal: 1234.56,
        totalAmount: 1469.33
      };
      
      const html = invoiceTemplate(testData);
      expect(html).toContain('1.234,56€');
      expect(html).toContain('1.469,33€');
    });

    test('should format quantities correctly', () => {
      const testData = {
        ...mockInvoiceData,
        items: [{
          ...mockInvoiceData.items[0],
          quantity: 2.5
        }]
      };
      
      const html = invoiceTemplate(testData);
      expect(html).toContain('2,5');
    });

    test('should handle zero amounts correctly', () => {
      const testData = {
        ...mockInvoiceData,
        subtotal: 0,
        totalAmount: 0
      };
      
      const html = invoiceTemplate(testData);
      expect(html).toContain('0,00€');
    });
  });

  describe('Date Formatting', () => {
    test('should format dates in German DD.MM.YYYY format', () => {
      const html = invoiceTemplate(mockInvoiceData);
      expect(html).toMatch(/\d{1,2}\.\d{1,2}\.\d{4}/); // German date format
    });

    test('should handle different date inputs', () => {
      const testData = {
        ...mockInvoiceData,
        createdAt: '2025-09-04T10:30:00Z',
        dueDate: new Date('2025-12-25')
      };
      
      const html = invoiceTemplate(testData);
      expect(html).toContain('4.9.2025');
      expect(html).toContain('25.12.2025');
    });
  });

  describe('Conditional Rendering', () => {
    test('should show paid date when invoice is paid', () => {
      const paidData = {
        ...mockInvoiceData,
        status: 'paid',
        paidDate: new Date('2025-09-10')
      };
      
      const html = invoiceTemplate(paidData);
      expect(html).toContain('Bezahlt am:');
      expect(html).toContain('10.9.2025');
    });

    test('should not show paid date when invoice is not paid', () => {
      const html = invoiceTemplate(mockInvoiceData);
      expect(html).not.toContain('Bezahlt am:');
    });

    test('should render different item types with appropriate icons', () => {
      const html = invoiceTemplate(mockInvoiceData);
      expect(html).toContain('📦 Mietfach'); // Mietfach icon
      expect(html).toContain('⚡ Zusatzleistung'); // Zusatzleistung icon
    });

    test('should handle missing optional fields gracefully', () => {
      const minimalData = {
        ...mockInvoiceData,
        vendor: {
          firstName: 'John',
          lastName: 'Doe',
          address: {
            street: 'Main St',
            number: '1',
            zipCode: '12345',
            city: 'City'
          }
        },
        companyInfo: {
          name: 'Test Company',
          address: 'Test Address',
          email: 'test@test.com'
        }
      };
      
      const html = invoiceTemplate(minimalData);
      expect(html).toBeDefined();
      expect(html).toContain('John Doe');
    });
  });

  describe('Status Display', () => {
    test('should display correct status badge for sent invoice', () => {
      const html = invoiceTemplate(mockInvoiceData);
      expect(html).toContain('status-sent');
      expect(html).toContain('sent');
    });

    test('should display correct status badge for paid invoice', () => {
      const paidData = { ...mockInvoiceData, status: 'paid' };
      const html = invoiceTemplate(paidData);
      expect(html).toContain('status-paid');
      expect(html).toContain('paid');
    });

    test('should display overdue warning for overdue invoices', () => {
      const overdueData = {
        ...mockInvoiceData,
        dueDate: new Date('2020-01-01') // Past date
      };
      
      const html = invoiceTemplate(overdueData);
      expect(html).toContain('überfällig');
    });
  });

  describe('Table Structure', () => {
    test('should render items table with correct headers', () => {
      const html = invoiceTemplate(mockInvoiceData);
      const dom = new JSDOM(html);
      const document = dom.window.document;
      
      const table = document.querySelector('.items-table');
      expect(table).toBeTruthy();
      
      const headers = table?.querySelectorAll('th');
      expect(headers?.length).toBe(4);
      expect(headers?.[0]?.textContent).toBe('Beschreibung');
      expect(headers?.[1]?.textContent).toBe('Menge');
      expect(headers?.[2]?.textContent).toBe('Einzelpreis');
      expect(headers?.[3]?.textContent).toBe('Gesamtpreis');
    });

    test('should render calculation table correctly', () => {
      const html = invoiceTemplate(mockInvoiceData);
      const dom = new JSDOM(html);
      const document = dom.window.document;
      
      const calcTable = document.querySelector('.calculation-table');
      expect(calcTable).toBeTruthy();
      
      // Check for subtotal, tax, and total rows
      expect(html).toContain('Nettobetrag:');
      expect(html).toContain('MwSt.');
      expect(html).toContain('Gesamtbetrag:');
    });
  });

  describe('German Language Support', () => {
    test('should use German month names', () => {
      const testData = {
        ...mockInvoiceData,
        period: { month: 12, year: 2025 }
      };
      
      const html = invoiceTemplate(testData);
      expect(html).toContain('Dezember');
    });

    test('should use German terminology throughout', () => {
      const html = invoiceTemplate(mockInvoiceData);
      expect(html).toContain('RECHNUNG');
      expect(html).toContain('Rechnungsempfänger');
      expect(html).toContain('Abrechnungszeitraum');
      expect(html).toContain('Zahlungsbedingungen');
      expect(html).toContain('Bankverbindung');
    });
  });

  describe('Error Handling', () => {
    test('should handle empty items array', () => {
      const emptyItemsData = {
        ...mockInvoiceData,
        items: []
      };
      
      const html = invoiceTemplate(emptyItemsData);
      expect(html).toBeDefined();
      expect(html.length).toBeGreaterThan(0);
    });

    test('should handle missing vendor data gracefully', () => {
      const noVendorData = {
        ...mockInvoiceData,
        vendor: {}
      };
      
      const html = invoiceTemplate(noVendorData);
      expect(html).toBeDefined();
    });

    test('should handle undefined/null values', () => {
      const nullData = {
        ...mockInvoiceData,
        paidDate: null,
        vendor: {
          ...mockInvoiceData.vendor,
          businessName: null,
          taxId: undefined
        }
      };
      
      const html = invoiceTemplate(nullData);
      expect(html).toBeDefined();
      expect(html).not.toContain('null');
      expect(html).not.toContain('undefined');
    });
  });
});