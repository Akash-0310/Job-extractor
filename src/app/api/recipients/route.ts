import { apiHandler, json } from '@/server/api/handler';
import { requireUserId } from '@/server/auth/session';
import { recipientFiltersSchema, searchParamsToObject } from '@/server/api/validation';
import { listRecipients } from '@/server/repositories/recipient.repository';
import type { Paginated } from '@/types';

export const dynamic = 'force-dynamic';

/** GET /api/recipients — paginated, filtered, deduplicated recipient list. */
export const GET = apiHandler(async (req) => {
  const userId = await requireUserId();
  const filters = recipientFiltersSchema.parse(searchParamsToObject(req.url));
  const { rows, total, page, pageSize } = await listRecipients(userId, filters);

  const body: Paginated<(typeof rows)[number]> = {
    data: rows,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
  return json(body);
});
