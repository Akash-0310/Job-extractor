import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/config/constants';
import type { RecipientFilters } from '@/types';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Resolve the upper bound of a date filter.
 *
 * The filter UI is `<input type="date">`, so dateTo arrives as "YYYY-MM-DD" and
 * `new Date()` reads that as midnight UTC. Used directly as `lte` it excluded
 * everything sent during the end day itself — picking the same day for From and
 * To returned no rows at all. Stretch a date-only bound to the end of that day;
 * a full timestamp is already precise, so it passes through untouched.
 *
 * Both ends stay on a UTC-day basis, matching how the `gte` bound already
 * behaves.
 */
function toUpperBound(value: string): Date {
  return DATE_ONLY.test(value) ? new Date(`${value}T23:59:59.999Z`) : new Date(value);
}

/** Build the Prisma `where` clause shared by list, search, and export. */
export function buildRecipientWhere(
  userId: string,
  filters: RecipientFilters,
): Prisma.RecipientWhereInput {
  const where: Prisma.RecipientWhereInput = { userId };
  const and: Prisma.RecipientWhereInput[] = [];

  if (filters.q) {
    const q = filters.q;
    and.push({
      OR: [
        { email: { contains: q, mode: 'insensitive' } },
        { latestSubject: { contains: q, mode: 'insensitive' } },
        { company: { name: { contains: q, mode: 'insensitive' } } },
        { company: { domain: { contains: q, mode: 'insensitive' } } },
      ],
    });
  }
  if (filters.companyId) and.push({ companyId: filters.companyId });
  if (filters.templateId) and.push({ latestTemplateId: filters.templateId });
  if (filters.domain) {
    and.push({ company: { domain: { contains: filters.domain, mode: 'insensitive' } } });
  }
  if (filters.dateFrom || filters.dateTo) {
    const lastSentAt: Prisma.DateTimeFilter = {};
    if (filters.dateFrom) lastSentAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) lastSentAt.lte = toUpperBound(filters.dateTo);
    and.push({ lastSentAt });
  }

  if (and.length > 0) where.AND = and;
  return where;
}

function buildOrderBy(filters: RecipientFilters): Prisma.RecipientOrderByWithRelationInput {
  const dir = filters.sortDir === 'asc' ? 'asc' : 'desc';
  switch (filters.sortBy) {
    case 'firstSentAt':
      return { firstSentAt: dir };
    case 'sentCount':
      return { sentCount: dir };
    case 'email':
      return { email: dir };
    case 'lastSentAt':
    default:
      return { lastSentAt: dir };
  }
}

export async function listRecipients(userId: string, filters: RecipientFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, filters.pageSize ?? DEFAULT_PAGE_SIZE));
  const where = buildRecipientWhere(userId, filters);

  const [rows, total] = await Promise.all([
    prisma.recipient.findMany({
      where,
      orderBy: buildOrderBy(filters),
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        company: { select: { id: true, name: true, domain: true } },
        latestTemplate: { select: { id: true, name: true } },
      },
    }),
    prisma.recipient.count({ where }),
  ]);

  return { rows, total, page, pageSize };
}

/** Stream all recipients matching a filter (for export). Uses cursor paging. */
export async function* streamRecipients(userId: string, filters: RecipientFilters) {
  const where = buildRecipientWhere(userId, filters);
  const pageSize = 1000;
  let cursor: string | undefined;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const batch = await prisma.recipient.findMany({
      where,
      orderBy: { id: 'asc' },
      take: pageSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        company: { select: { name: true, domain: true } },
        latestTemplate: { select: { name: true } },
      },
    });
    if (batch.length === 0) break;
    for (const row of batch) yield row;
    if (batch.length < pageSize) break;
    cursor = batch[batch.length - 1]!.id;
  }
}

export function countRecipients(userId: string) {
  return prisma.recipient.count({ where: { userId } });
}
