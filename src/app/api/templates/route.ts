import { z } from 'zod';
import { apiHandler, json } from '@/server/api/handler';
import { requireUserId } from '@/server/auth/session';
import { searchParamsToObject } from '@/server/api/validation';
import { listTemplates } from '@/server/repositories/template.repository';
import type { Paginated } from '@/types';

export const dynamic = 'force-dynamic';

const schema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(200).optional(),
});

/** GET /api/templates — paginated template list with usage counts + samples. */
export const GET = apiHandler(async (req) => {
  const userId = await requireUserId();
  const { page = 1, pageSize = 25 } = schema.parse(searchParamsToObject(req.url));
  const { rows, total } = await listTemplates(userId, { page, pageSize });

  const body: Paginated<{
    id: string;
    name: string;
    emailCount: number;
    recipients: number;
    sampleSubject: string | null;
    sampleBodyText: string | null;
    createdAt: string;
  }> = {
    data: rows.map((t) => ({
      id: t.id,
      name: t.name,
      emailCount: t.emailCount,
      recipients: t._count.recipients,
      sampleSubject: t.sampleSubject,
      sampleBodyText: t.sampleBodyText,
      createdAt: t.createdAt.toISOString(),
    })),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
  return json(body);
});
