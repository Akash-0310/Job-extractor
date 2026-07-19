import { apiHandler, json } from '@/server/api/handler';
import { requireUserId } from '@/server/auth/session';
import { getDashboardStats, getTopCompanies, getMonthlyVolume } from '@/server/services/stats.service';

export const dynamic = 'force-dynamic';

export const GET = apiHandler(async () => {
  const userId = await requireUserId();
  const [stats, topCompanies, monthly] = await Promise.all([
    getDashboardStats(userId),
    getTopCompanies(userId),
    getMonthlyVolume(userId),
  ]);
  return json({
    stats,
    topCompanies: topCompanies.map((c) => ({
      id: c.id,
      name: c.name,
      domain: c.domain,
      recipients: c._count.recipients,
    })),
    monthly,
  });
});
