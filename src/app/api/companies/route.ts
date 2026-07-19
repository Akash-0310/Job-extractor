import { z } from 'zod';
import { apiHandler, json } from '@/server/api/handler';
import { requireUserId } from '@/server/auth/session';
import { searchParamsToObject } from '@/server/api/validation';
import { listCompanies } from '@/server/repositories/company.repository';
import type { Paginated } from '@/types';

export const dynamic = 'force-dynamic';

const schema = z.object({
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(200).optional(),
});

/** GET /api/companies — paginated company list with recipient counts. */
export const GET = apiHandler(async (req) => {
  const userId = await requireUserId();
  const { q, page = 1, pageSize = 25 } = schema.parse(searchParamsToObject(req.url));
  const { rows, total } = await listCompanies(userId, { q, page, pageSize });

  const body: Paginated<{
    id: string;
    name: string;
    domain: string;
    recipients: number;
    messages: number;
    createdAt: string;
  }> = {
    data: rows.map((c) => ({
      id: c.id,
      name: c.name,
      domain: c.domain,
      recipients: c._count.recipients,
      messages: c._count.messages,
      createdAt: c.createdAt.toISOString(),
    })),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
  return json(body);
});
