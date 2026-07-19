import { prisma } from '@/lib/prisma';
import { inferCompany } from '@/server/services/company.service';

/**
 * Get-or-create the Company row for a recipient email. Companies are keyed by
 * (userId, domain) so the same company is never duplicated. Public providers
 * (gmail.com etc.) still get a row so recipients always link to something,
 * but their `name` is the domain itself.
 */
export async function upsertCompanyForEmail(userId: string, email: string): Promise<string> {
  const inferred = inferCompany(email);
  const company = await prisma.company.upsert({
    where: { userId_domain: { userId, domain: inferred.domain } },
    create: { userId, domain: inferred.domain, name: inferred.name },
    update: {}, // name is stable once created
    select: { id: true },
  });
  return company.id;
}

export async function listCompanies(
  userId: string,
  opts: { q?: string; page: number; pageSize: number },
) {
  const where = {
    userId,
    ...(opts.q
      ? {
          OR: [
            { name: { contains: opts.q, mode: 'insensitive' as const } },
            { domain: { contains: opts.q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.company.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (opts.page - 1) * opts.pageSize,
      take: opts.pageSize,
      include: { _count: { select: { recipients: true, messages: true } } },
    }),
    prisma.company.count({ where }),
  ]);

  return { rows, total };
}

export function countCompanies(userId: string) {
  return prisma.company.count({ where: { userId } });
}
