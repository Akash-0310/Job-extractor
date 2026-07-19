import pino from 'pino';
import { env, isProduction } from './env';

/**
 * Structured logger. Pretty-prints in development, emits JSON in production
 * (so it can be shipped to a log aggregator). Never logs secrets — callers
 * should pass only non-sensitive context fields.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  base: undefined,
  redact: {
    paths: [
      'access_token',
      'refresh_token',
      'id_token',
      '*.access_token',
      '*.refresh_token',
      'password',
      'authorization',
      'headers.authorization',
    ],
    censor: '[redacted]',
  },
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
      },
});

export function childLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}
