/**
 * @file invoiceEmails.test.ts
 * @purpose Unit tests für den Rechnungs-Direktversand (sendInvoiceNotificationDirect),
 * der die frühere Bull/Redis-E-Mail-Queue ersetzt (AUDIT OP8): Erfolg setzt
 * emailStatus 'sent', Fehler setzt 'failed' und alarmiert den Admin.
 * @created 2026-07-08
 */

jest.mock('../logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

jest.mock('../../models/Invoice', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    updateOne: jest.fn()
  }
}));

jest.mock('../../services/pdf/invoicePdfService', () => ({
  invoicePdfService: {
    generatePdfBuffer: jest.fn()
  }
}));

const mockAlertEmailDeliveryFailure = jest.fn().mockResolvedValue(undefined);
jest.mock('../../services/alertingService', () => ({
  __esModule: true,
  default: {
    alertEmailDeliveryFailure: mockAlertEmailDeliveryFailure
  }
}));

const mockSendMail = jest.fn();
jest.mock('./core', () => ({
  getFrontendUrl: jest.fn(() => 'http://localhost:3000'),
  createTransporter: jest.fn(() => ({ sendMail: mockSendMail })),
  emailService: {
    compileTemplate: jest.fn(() => '<html>Rechnung</html>')
  }
}));

// readFileSync für das Handlebars-Template abfangen
jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    readFileSync: jest.fn(() => '{{invoiceNumber}}')
  };
});

import { sendInvoiceNotificationDirect } from './invoiceEmails';
import Invoice from '../../models/Invoice';
import { invoicePdfService } from '../../services/pdf/invoicePdfService';

const MockedInvoice = Invoice as jest.Mocked<typeof Invoice>;
const mockedPdfService = invoicePdfService as jest.Mocked<typeof invoicePdfService>;

describe('sendInvoiceNotificationDirect', () => {
  const invoiceId = 'invoice-123';

  const mockVendor = {
    _id: { toString: () => 'vendor-456' },
    email: 'vendor@example.com',
    toObject: jest.fn()
  };

  const mockInvoice = {
    _id: invoiceId,
    invoiceNumber: 'RE-2026-07-00001',
    vendor: mockVendor,
    toObject: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockVendor.toObject.mockReturnValue({ email: 'vendor@example.com', kontakt: { name: 'Test Vendor' } });
    mockInvoice.toObject.mockReturnValue({
      invoiceNumber: 'RE-2026-07-00001',
      period: { month: 7, year: 2026 },
      subtotal: 100,
      tax: 19,
      totalAmount: 119,
      status: 'sent',
      dueDate: new Date('2026-08-01')
    });

    (MockedInvoice.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockInvoice)
    });
    (MockedInvoice.updateOne as jest.Mock).mockResolvedValue({ acknowledged: true });
    (mockedPdfService.generatePdfBuffer as jest.Mock).mockResolvedValue(Buffer.from('pdf-content'));
    mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
  });

  it('setzt bei Erfolg den emailStatus auf sent', async () => {
    await sendInvoiceNotificationDirect(invoiceId);

    // PDF wurde erzeugt und E-Mail mit Anhang verschickt
    expect(mockedPdfService.generatePdfBuffer).toHaveBeenCalledWith(invoiceId);
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'vendor@example.com',
        attachments: [
          expect.objectContaining({
            filename: 'Rechnung_RE-2026-07-00001.pdf',
            contentType: 'application/pdf'
          })
        ]
      })
    );

    // Status 'sent' inkl. emailSentAt und Versuchszähler
    expect(MockedInvoice.updateOne).toHaveBeenCalledWith(
      { _id: invoiceId },
      {
        $set: expect.objectContaining({
          emailStatus: 'sent',
          emailSentAt: expect.any(Date),
          lastEmailAttempt: expect.any(Date)
        }),
        $inc: { emailAttempts: 1 }
      }
    );

    // Kein Admin-Alert bei Erfolg
    expect(mockAlertEmailDeliveryFailure).not.toHaveBeenCalled();
  });

  it('setzt bei Versandfehler den emailStatus auf failed und alarmiert den Admin', async () => {
    mockSendMail.mockRejectedValue(new Error('SMTP nicht erreichbar'));

    await expect(sendInvoiceNotificationDirect(invoiceId)).rejects.toThrow('SMTP nicht erreichbar');

    expect(MockedInvoice.updateOne).toHaveBeenCalledWith(
      { _id: invoiceId },
      {
        $set: expect.objectContaining({
          emailStatus: 'failed',
          lastEmailAttempt: expect.any(Date)
        }),
        $inc: { emailAttempts: 1 }
      }
    );

    // Admin-Alert mit Fehlerdetails (Verhalten der früheren Queue erhalten)
    expect(mockAlertEmailDeliveryFailure).toHaveBeenCalledWith({
      userId: 'vendor-456',
      email: 'vendor@example.com',
      emailType: 'invoiceNotification',
      errorMessage: 'SMTP nicht erreichbar'
    });
  });

  it('wirft bei unbekannter Rechnung, setzt failed und alarmiert den Admin', async () => {
    (MockedInvoice.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(null)
    });

    await expect(sendInvoiceNotificationDirect(invoiceId)).rejects.toThrow(`Invoice not found: ${invoiceId}`);

    expect(mockSendMail).not.toHaveBeenCalled();
    expect(MockedInvoice.updateOne).toHaveBeenCalledWith(
      { _id: invoiceId },
      expect.objectContaining({
        $set: expect.objectContaining({ emailStatus: 'failed' })
      })
    );
    expect(mockAlertEmailDeliveryFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        emailType: 'invoiceNotification',
        errorMessage: `Invoice not found: ${invoiceId}`
      })
    );
  });
});
