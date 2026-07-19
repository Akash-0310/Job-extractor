import { z } from 'zod';
import { apiHandler } from '@/server/api/handler';
import { requireUserId } from '@/server/auth/session';
import { searchParamsToObject } from '@/server/api/validation';
import { EXPORT_FORMATS } from '@/config/constants';
import { exportCompanies } from '@/server/services/export.service';

export const dynamic = 'force-dynamic';

const schema = z.object({
  format: z.enum(EXPORT_FORMATS),
  q: z.string().trim().max(200).optional(),
});

/**
 * GET /api/companies/export?format=csv|xlsx|json
 * Downloads the company list — one row per company/HR contact address
 * (Company, Domain, Email), grouped and sorted by company name.
 */
export const GET = apiHandler(async (req) => {
  const userId = await requireUserId();
  const { format, q } = schema.parse(searchParamsToObject(req.url));

  const result = await exportCompanies(userId, format, { q });

  return new Response(result.body as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Cache-Control': 'no-store',
    },
  });
});
