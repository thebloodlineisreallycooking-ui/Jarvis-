import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import type { z } from 'zod';

export class HttpError extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly current?: unknown) { super(message); }
}
export function input<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new HttpError(400, 'INVALID_INPUT', 'Kontrollera inmatning, längd och tillåtna fält.');
  return result.data;
}
export const notFound = () => new HttpError(404, 'NOT_FOUND', 'Resursen hittades inte.');
export function privateHeaders(_req: Request, res: Response, next: NextFunction) {
  res.set({ 'Cache-Control': 'private, no-store', Pragma: 'no-cache', 'X-Request-ID': randomUUID() });
  next();
}
export type SecurityOptions = { allowedOrigins?: string[]; allowOriginlessLoopback?: boolean };
export function originGuard(options: SecurityOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const origin = req.get('origin');
    const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '');
    // Only an explicitly injected native test harness may omit Origin. Browser
    // production requests must match the configured origin or trusted Host.
    if (!origin && options.allowOriginlessLoopback && local && !req.get('sec-fetch-site')) return next();
    const expected = options.allowedOrigins ?? [process.env.JARVIS_ORIGIN || `${process.env.NODE_ENV === 'production' ? 'https' : 'http'}://${req.get('host')}`];
    if (!origin || !expected.includes(origin) || req.get('sec-fetch-site') === 'cross-site') {
      return res.status(403).json({ code: 'ORIGIN_DENIED', error: 'Begäran måste komma från appens egen adress.' });
    }
    next();
  };
}
export function rateLimit(max: number, windowMs: number, key: (req: Request, res: Response) => string, now = Date.now) {
  const buckets = new Map<string, { count: number; reset: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const time = now();
    for (const [id, bucket] of buckets) if (bucket.reset <= time) buckets.delete(id);
    const id = key(req, res);
    let bucket = buckets.get(id);
    if (!bucket) {
      // Bound memory even under many synthetic source addresses. Do not evict a
      // live bucket and thereby silently reopen an attacker's allowance.
      if (buckets.size >= 10000) { res.set('Retry-After', '60'); return res.status(429).json({ code: 'RATE_LIMITED', error: 'För många anrop. Vänta en minut.' }); }
      bucket = { count: 0, reset: time + windowMs }; buckets.set(id, bucket);
    }
    if (++bucket.count > max) {
      const seconds = Math.max(1, Math.ceil((bucket.reset - time) / 1000));
      res.set('Retry-After', String(seconds));
      return res.status(429).json({ code: 'RATE_LIMITED', error: `För många anrop. Försök igen om ${seconds} sekunder.` });
    }
    next();
  };
}
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (res.headersSent) { res.end(); return; }
  if (error instanceof HttpError) {
    res.status(error.status).json({ code: error.code, error: error.message, ...(error.current === undefined ? {} : { current: error.current }) }); return;
  }
  const status = typeof error === 'object' && error !== null && 'status' in error ? error.status : undefined;
  if (status === 400 || status === 413) { res.status(status).json({ code: 'INVALID_BODY', error: status === 400 ? 'Invalid JSON request.' : 'Request is too large.' }); return; }
  // Never log Error.message/stack, URL, body, headers, or SQL parameters.
  console.warn(JSON.stringify({ code: 'INTERNAL_ERROR', requestId: res.getHeader('X-Request-ID') }));
  res.status(500).json({ code: 'INTERNAL_ERROR', error: 'Servern kunde inte slutföra begäran. Försök igen.' });
}
