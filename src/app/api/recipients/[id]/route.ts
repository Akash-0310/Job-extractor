import { apiHandler, json } from '@/server/api/handler';
import { requireUserId } from '@/server/auth/session';
import { prisma } from '@/lib/prisma';
import { NotFoundError } from '@/lib/errors';
import { listMessagesForRecipient } from '@/server/repositories/message.repository';

export const dynamic = 'force-dynamic';

/** GET /api/recipients/:id — a recipient plus its send history. */
export const GET = apiHandler(async (_req, { params }) => {
  const userId = await requireUserId();
  const recipient = await prisma.recipient.findFirst({
    where: { id: params.id, userId },
    include: {
      company: { select: { id: true, name: true, domain: true } },
      latestTemplate: { select: { id: true, name: true } },
    },
  });
  if (!recipient) throw new NotFoundError('Recipient not found');

  const history = await listMessagesForRecipient(userId, recipient.id);
  return json({ recipient, history });
});
