import { z } from 'zod';
import { EXPORT_FORMATS, EXPORT_VIEWS } from '@/config/constants';

/** Parse recipient/search list filters from URL search params. */
export const recipientFiltersSchema = z.object({
  q: z.string().trim().max(200).optional(),
  companyId: z.string().cuid().optional(),
  domain: z.string().trim().max(200).optional(),
  templateId: z.string().cuid().optional(),
  dateFrom: z.string().datetime().optional().or(z.string().date().optional()),
  dateTo: z.string().datetime().optional().or(z.string().date().optional()),
  sortBy: z.enum(['lastSentAt', 'firstSentAt', 'sentCount', 'email']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(200).optional(),
});

export const syncSchema = z.object({
  mode: z.enum(['full', 'incremental', 'auto']).default('auto'),
});

export const settingsSchema = z.object({
  theme: z.enum(['LIGHT', 'DARK', 'SYSTEM']).optional(),
  syncIntervalMinutes: z.coerce.number().int().min(5).max(10_080).optional(),
  batchSize: z.coerce.number().int().min(10).max(500).optional(),
  maxEmails: z.coerce.number().int().min(0).max(1_000_000).optional(),
  exportDir: z.string().trim().max(500).optional(),
  autoSyncEnabled: z.boolean().optional(),
});

export const exportSchema = z.object({
  format: z.enum(EXPORT_FORMATS),
  view: z.enum(EXPORT_VIEWS).optional(),
  q: z.string().trim().max(200).optional(),
  companyId: z.string().cuid().optional(),
  domain: z.string().trim().max(200).optional(),
  templateId: z.string().cuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

/** Convert URLSearchParams into a plain object (dropping empty strings). */
export function searchParamsToObject(url: string): Record<string, string> {
  const params = new URL(url).searchParams;
  const obj: Record<string, string> = {};
  for (const [k, v] of params.entries()) {
    if (v !== '') obj[k] = v;
  }
  return obj;
}
