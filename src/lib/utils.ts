import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwind-aware className combiner. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Sleep helper for retry/backoff logic. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an async operation with exponential backoff + jitter.
 * `shouldRetry` decides whether a given error is transient.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: {
    retries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    shouldRetry?: (error: unknown) => boolean;
    onRetry?: (error: unknown, attempt: number) => void;
  } = {},
): Promise<T> {
  const { retries = 5, baseDelayMs = 500, maxDelayMs = 30_000, shouldRetry = () => true, onRetry } = opts;

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt += 1;
      if (attempt > retries || !shouldRetry(error)) throw error;
      const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      const jitter = Math.floor(backoff * 0.25 * Math.random());
      onRetry?.(error, attempt);
      await sleep(backoff + jitter);
    }
  }
}

/** Chunk an array into fixed-size batches. */
export function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) throw new Error('chunk size must be > 0');
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/** Format a number with thousands separators. */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

/** Coerce a possibly-undefined query param to a positive integer with a default. */
export function toInt(value: string | null | undefined, fallback: number): number {
  if (value == null) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}
