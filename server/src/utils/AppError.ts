/**
 * @file AppError.ts
 * @purpose Anwendungs-Fehlerklasse für die zentrale errorHandler-Middleware (AUDIT KON1).
 * Controller werfen/nexten AppError mit kuratierter, client-tauglicher Message und
 * Statuscode; der zentrale Handler sendet sie unmaskiert im Standard-Shape
 * { success: false, message }. Nackte Errors werden dagegen in Produktion maskiert.
 * @created 2026-07-07
 */

export class AppError extends Error {
  /** HTTP-Statuscode der Antwort */
  statusCode: number;
  /** Ursprünglicher Fehler (für zentrales Logging mit Stack) */
  cause?: unknown;

  constructor(message: string, statusCode = 500, cause?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.cause = cause;
  }
}

export default AppError;
