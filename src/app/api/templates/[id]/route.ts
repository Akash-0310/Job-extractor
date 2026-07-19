import { z } from 'zod';
import { apiHandler, json } from '@/server/api/handler';
import { requireUserId } from '@/server/auth/session';
import { NotFoundError } from '@/lib/errors';
import { getTemplate, renameTemplate } from '@/server/repositories/template.repository';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({ name: z.string().trim().min(1).max(120) });

/** GET /api/templates/:id — a single template with its full sample body. */
export const GET = apiHandler(async (_req, { params }) => {
  const userId = await requireUserId();
  const template = await getTemplate(userId, params.id ?? '');
  if (!template) throw new NotFoundError('Template not found');
  return json(template);
});

/** PATCH /api/templates/:id — rename a template. */
export const PATCH = apiHandler(async (req, { params }) => {
  const userId = await requireUserId();
  const { name } = patchSchema.parse(await req.json());
  const result = await renameTemplate(userId, params.id ?? '', name);
  if (result.count === 0) throw new NotFoundError('Template not found');
  return json({ ok: true });
});
