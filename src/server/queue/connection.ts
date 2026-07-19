import IORedis, { type Redis } from 'ioredis';
import { env } from '@/lib/env';

/**
 * Shared Redis connection for BullMQ. `maxRetriesPerRequest: null` is required
 * by BullMQ for blocking commands. Reused across hot reloads in development.
 */
const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

export const redisConnection: Redis =
  globalForRedis.redis ??
  new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    // Connect on first command, not at import time, so importing a route/queue
    // (e.g. during `next build`) never blocks on Redis being available.
    lazyConnect: true,
  });

if (env.NODE_ENV !== 'production') {
  globalForRedis.redis = redisConnection;
}
