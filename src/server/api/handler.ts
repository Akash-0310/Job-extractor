import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError, isAppError, toMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

/** Convert any thrown value into a consistent JSON error response. */
export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: error.flatten() } },
      { status: 400 },
    );
  }
  if (isAppError(error)) {
    if (error.statusCode >= 500) logger.error({ err: error }, 'API error');
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: error.details } },
      { status: error.statusCode },
    );
  }
  logger.error({ err: error }, 'Unhandled API error');
  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message: toMessage(error) } },
    { status: 500 },
  );
}

/** Context passed to inner handlers (params always present, possibly empty). */
export interface HandlerContext {
  params: Record<string, string>;
}

/** Shape Next.js passes to a route handler (params optional). */
interface RouteContext {
  params?: Record<string, string>;
}

/**
 * Wrap a route handler so every thrown AppError/ZodError becomes a clean JSON
 * response and unexpected errors are logged and returned as 500 without leaking
 * stack traces. The returned signature is compatible with both static and
 * dynamic Next.js App Router routes.
 */
export function apiHandler(fn: (req: Request, ctx: HandlerContext) => Promise<Response>) {
  return async (req: Request, ctx?: RouteContext): Promise<Response> => {
    try {
      return await fn(req, { params: ctx?.params ?? {} });
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

export function json<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

export { AppError };
