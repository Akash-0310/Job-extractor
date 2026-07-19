import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import type { Theme } from '@prisma/client';

export interface SettingsInput {
  theme?: Theme;
  syncIntervalMinutes?: number;
  batchSize?: number;
  maxEmails?: number;
  exportDir?: string;
  autoSyncEnabled?: boolean;
}

/** Get the user's settings, creating defaults from env on first access. */
export async function getSettings(userId: string) {
  return prisma.userSettings.upsert({
    where: { userId },
    create: {
      userId,
      batchSize: env.DEFAULT_BATCH_SIZE,
      syncIntervalMinutes: env.DEFAULT_SYNC_INTERVAL_MINUTES,
      maxEmails: env.DEFAULT_MAX_EMAILS,
      exportDir: env.EXPORT_DIR,
    },
    update: {},
  });
}

export async function updateSettings(userId: string, input: SettingsInput) {
  await getSettings(userId); // ensure a row exists
  return prisma.userSettings.update({
    where: { userId },
    data: input,
  });
}
