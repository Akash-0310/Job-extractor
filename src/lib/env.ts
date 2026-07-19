import { z } from 'zod';

/**
 * Centralized, validated environment configuration.
 * Fails fast at startup if a required variable is missing or malformed so we
 * never run with a half-configured environment (a common production footgun).
 */
const booleanish = z
  .string()
  .optional()
  .transform((v) => v === 'true' || v === '1');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),

  NEXTAUTH_SECRET: z.string().min(16, 'NEXTAUTH_SECRET must be at least 16 characters'),
  NEXTAUTH_URL: z.string().url().default('http://localhost:3000'),

  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET is required'),

  EXPORT_DIR: z.string().default('./exports'),
  DEFAULT_BATCH_SIZE: z.coerce.number().int().positive().default(100),
  DEFAULT_SYNC_INTERVAL_MINUTES: z.coerce.number().int().positive().default(60),
  DEFAULT_MAX_EMAILS: z.coerce.number().int().nonnegative().default(0),

  DISABLE_ENV_VALIDATION: booleanish,
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  // Allow builds (e.g. `next build` in CI without secrets) to skip validation.
  if (process.env.DISABLE_ENV_VALIDATION === 'true') {
    return process.env as unknown as Env;
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

export const env = loadEnv();

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
