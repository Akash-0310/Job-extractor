import { apiHandler } from '@/server/api/handler';
import { requireUserId } from '@/server/auth/session';
import { exportSchema, searchParamsToObject } from '@/server/api/validation';
import { exportRecipients } from '@/server/services/export.service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/export?format=csv|xlsx|json&<filters>
 * Streams the deduplicated recipient dataset as a downloadable file.
 */
export const GET = apiHandler(async (req) => {
  const userId = await requireUserId();
  const parsed = exportSchema.parse(searchParamsToObject(req.url));
  const { format, view, ...filters } = parsed;

  const result = await exportRecipients(userId, format, filters, view);

  // result.body is a string or Uint8Array; both are valid runtime BodyInit in
  // Node's undici. The DOM lib's BodyInit union omits ArrayBufferView, so cast.
  return new Response(result.body as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Cache-Control': 'no-store',
    },
  });
});
