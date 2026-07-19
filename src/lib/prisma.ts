import { PrismaClient } from '@prisma/client';
import { env, isProduction } from './env';

/**
 * Singleton Prisma client. In development Next.js hot-reloads modules, which
 * would otherwise create a new client (and a new connection pool) on every
 * reload and exhaust the database connections.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProduction ? ['error', 'warn'] : ['error', 'warn'],
  });

if (!isProduction) {
  globalForPrisma.prisma = prisma;
}

// Reference env so the module participates in fail-fast validation on import.
void env.DATABASE_URL;
