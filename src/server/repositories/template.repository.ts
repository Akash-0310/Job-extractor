import { prisma } from '@/lib/prisma';

export async function listTemplates(userId: string, opts: { page: number; pageSize: number }) {
  const where = { userId };
  const [rows, total] = await Promise.all([
    prisma.template.findMany({
      where,
      orderBy: { emailCount: 'desc' },
      skip: (opts.page - 1) * opts.pageSize,
      take: opts.pageSize,
      include: { _count: { select: { recipients: true, messages: true } } },
    }),
    prisma.template.count({ where }),
  ]);
  return { rows, total };
}

export function getTemplate(userId: string, id: string) {
  return prisma.template.findFirst({ where: { id, userId } });
}

export function countTemplates(userId: string) {
  return prisma.template.count({ where: { userId } });
}

export function renameTemplate(userId: string, id: string, name: string) {
  return prisma.template.updateMany({ where: { id, userId }, data: { name } });
}
