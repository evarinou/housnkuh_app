/**
 * @file Email service facade for housnkuh marketplace
 * @description Reine Re-Export-Fassade für den modularen E-Mail-Service.
 * Die Implementierung liegt in den Domänenmodulen unter `./email/`:
 * - `email/core.ts`             – Transporter, Template-Logik, emailService-Objekt (sendDatabaseTemplateEmail), sendCustomEmail
 * - `email/newsletterEmails.ts` – Newsletter-Bestätigung, Eröffnungsdatum-Änderung
 * - `email/vendorEmails.ts`     – Vendor-Bestätigung, Vor-Registrierung, Contest, Registrierung, Kündigung, Buchungsablehnung
 * - `email/trialEmails.ts`      – Probemonat (Aktivierung, Warnung, Ablauf, Status, Konvertierung), Launch-Day-Report
 * - `email/bookingEmails.ts`    – Buchungsbestätigungen, Admin-Bestätigung, Zusatzleistungen, Paket-Eingang, Lagerservice
 * - `email/invoiceEmails.ts`    – Rechnungsbenachrichtigung mit PDF-Anhang
 * - `email/monitoringEmails.ts` – System-Monitoring-Alerts
 * - `email/contactEmails.ts`    – Kontaktformular-Mails
 * Bestehende Importe über `utils/emailService` bleiben unverändert gültig.
 */

export {
  getFrontendUrl,
  testEmailConnection,
  sendCustomEmail,
  emailService
} from './email/core';

export {
  sendNewsletterConfirmation,
  sendOpeningDateChangeNotification
} from './email/newsletterEmails';

export {
  sendVendorConfirmationEmail,
  sendPreRegistrationConfirmation,
  sendVendorContestEmail,
  sendVendorRegistrationConfirmation,
  sendCancellationConfirmationEmail,
  sendBookingRejectionEmail
} from './email/vendorEmails';
export type { VendorContestData } from './email/vendorEmails';

export {
  sendTrialActivationEmail,
  sendTrialExpirationWarning,
  sendTrialExpiredEmail,
  sendTrialStatusEmail,
  sendTrialConversionEmail,
  sendLaunchDayActivationNotification
} from './email/trialEmails';

export {
  sendBookingConfirmation,
  sendAdminConfirmationEmail,
  sendBookingConfirmationWithSchedule,
  sendAdminZusatzleistungenNotification,
  sendEnhancedAdminZusatzleistungenNotification,
  sendPackageArrivalConfirmation,
  sendLagerserviceActivationNotification
} from './email/bookingEmails';
export type {
  PackageBookingData,
  AdminConfirmationData,
  BookingConfirmationWithScheduleData,
  ZusatzleistungenAdminNotificationData,
  PackageArrivalNotificationData,
  LagerserviceActivationData
} from './email/bookingEmails';

export { sendInvoiceNotification } from './email/invoiceEmails';

export { sendMonitoringAlert } from './email/monitoringEmails';
export type { MonitoringAlertData } from './email/monitoringEmails';

export { sendContactFormEmail } from './email/contactEmails';
export type { ContactFormData } from './email/contactEmails';
