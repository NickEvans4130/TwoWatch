import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/create', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const couple = await prisma.couple.create({ data: { userAId: req.user!.userId } });
  res.json({ couple, inviteCode: couple.inviteCode });
});

const joinSchema = z.object({ inviteCode: z.string() });

router.post('/join', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = joinSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request' });
    return;
  }

  const couple = await prisma.couple.findUnique({ where: { inviteCode: parsed.data.inviteCode } });
  if (!couple) {
    res.status(404).json({ error: 'Invite code not found' });
    return;
  }
  if (couple.userBId) {
    res.status(400).json({ error: 'Couple is already full', code: 'COUPLE_FULL' });
    return;
  }
  if (couple.userAId === req.user!.userId) {
    res.status(400).json({ error: 'Cannot join your own couple' });
    return;
  }

  const updated = await prisma.couple.update({
    where: { id: couple.id },
    data: { userBId: req.user!.userId },
    include: { userA: true, userB: true },
  });
  res.json({ couple: updated });
});

router.get('/me', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const couples = await prisma.couple.findMany({
    where: { OR: [{ userAId: req.user!.userId }, { userBId: req.user!.userId }] },
    include: {
      userA: { select: { id: true, email: true, name: true } },
      userB: { select: { id: true, email: true, name: true } },
      _count: { select: { watchlist: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ couples });
});

export default router;
