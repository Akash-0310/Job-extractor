import { apiHandler, json } from '@/server/api/handler';
import { requireUserId } from '@/server/auth/session';
import { settingsSchema } from '@/server/api/validation';
import { getSettings, updateSettings } from '@/server/repositories/settings.repository';

export const dynamic = 'force-dynamic';

/** GET /api/settings — current user settings (created with defaults if absent). */
export const GET = apiHandler(async () => {
  const userId = await requireUserId();
  const settings = await getSettings(userId);
  return json(settings);
});

/** PATCH /api/settings — update user settings. */
export const PATCH = apiHandler(async (req) => {
  const userId = await requireUserId();
  const input = settingsSchema.parse(await req.json());
  const settings = await updateSettings(userId, input);
  return json(settings);
});
