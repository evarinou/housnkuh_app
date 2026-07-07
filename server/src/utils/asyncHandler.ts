/**
 * @file asyncHandler.ts
 * @purpose Wrapper für async Express-Handler: abgelehnte Promises landen in next()
 * und damit in der zentralen errorHandler-Middleware statt als unhandled rejection
 * (AUDIT KON1). Für Handler ohne eigenes try/catch.
 * @created 2026-07-07
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

export const asyncHandler = (handler: AsyncRequestHandler): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
};

export default asyncHandler;
