/**
 * @file apiResponse.ts
 * @purpose Standardized API response utilities for consistent JSON responses across all endpoints.
 *          Provides typed factory functions for success and error responses.
 * @created 2026-03-25
 */

import { Response } from 'express';

/**
 * Standard success response shape
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    count?: number;
    page?: number;
    totalPages?: number;
    total?: number;
  };
}

/**
 * Standard error response shape
 * `message` liegt zusätzlich top-level, weil der Client durchgängig
 * `response.data.message` liest (AUDIT KON1: einheitliches Shape).
 */
export interface ApiErrorResponse {
  success: false;
  message: string;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ─── Success Helpers ──────────────────────────────────────────

/** 200 OK with data */
export const ok = <T>(res: Response, data: T, meta?: ApiSuccessResponse<T>['meta']): void => {
  res.status(200).json({ success: true, data, ...(meta && { meta }) });
};

/** 201 Created with data */
export const created = <T>(res: Response, data: T): void => {
  res.status(201).json({ success: true, data });
};

/** 204 No Content (delete operations) */
export const noContent = (res: Response): void => {
  res.status(204).end();
};

// ─── Error Helpers ────────────────────────────────────────────

/** Generic error response */
export const fail = (res: Response, status: number, code: string, message: string, details?: unknown): void => {
  res.status(status).json({
    success: false,
    message,
    error: { code, message, ...(details !== undefined && { details }) },
  });
};

/** 400 Bad Request */
export const badRequest = (res: Response, message: string, details?: unknown): void => {
  fail(res, 400, 'BAD_REQUEST', message, details);
};

/** 401 Unauthorized */
export const unauthorized = (res: Response, message = 'Nicht autorisiert'): void => {
  fail(res, 401, 'UNAUTHORIZED', message);
};

/** 403 Forbidden */
export const forbidden = (res: Response, message = 'Zugriff verweigert'): void => {
  fail(res, 403, 'FORBIDDEN', message);
};

/** 404 Not Found */
export const notFound = (res: Response, message = 'Nicht gefunden'): void => {
  fail(res, 404, 'NOT_FOUND', message);
};

/** 409 Conflict */
export const conflict = (res: Response, message: string): void => {
  fail(res, 409, 'CONFLICT', message);
};

/** 422 Validation Error */
export const validationError = (res: Response, message: string, details?: unknown): void => {
  fail(res, 422, 'VALIDATION_ERROR', message, details);
};

/** 429 Rate Limited */
export const rateLimited = (res: Response, message = 'Zu viele Anfragen'): void => {
  fail(res, 429, 'RATE_LIMITED', message);
};

/** 500 Internal Server Error */
export const serverError = (res: Response, message = 'Interner Serverfehler'): void => {
  fail(res, 500, 'INTERNAL_ERROR', message);
};
