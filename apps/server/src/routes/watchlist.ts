import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

async function userInCouple(userId: string, coupleId: string): Promise<boolean> {
  const couple = await prisma.couple.findFirst({
    where: { id: coupleId, OR: [{ userAId: userId }, { userBId: userId }] },
  });
  return couple !== null;
}

const addSchema = z.object({
  coupleId: z.string(),
  tmdbId: z.string(),
  imdbId: z.string(),
  mediaType: z.enum(['movie', 'tv']),
  title: z.string(),
  posterPath: z.string().optional(),
});

router.post('/add', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = addSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request' });
    return;
  }

  if (!(await userInCouple(req.user!.userId, parsed.data.coupleId))) {
    res.status(403).json({ error: 'Not in this couple' });
    return;
  }

  const existing = await prisma.watchlistItem.findFirst({
    where: { coupleId: parsed.data.coupleId, tmdbId: parsed.data.tmdbId },
  });
  if (existing) {
    res.status(400).json({ error: 'Already in watchlist', code: 'ALREADY_ADDED' });
    return;
  }

  const { coupleId, ...rest } = parsed.data;
  const item = await prisma.watchlistItem.create({ data: { coupleId, ...rest } });
  res.json({ item });
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const item = await prisma.watchlistItem.findUnique({ where: { id: req.params.id } });
  if (!item) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }

  if (!(await userInCouple(req.user!.userId, item.coupleId))) {
    res.status(403).json({ error: 'Not in this couple' });
    return;
  }

  await prisma.watchlistItem.delete({ where: { id: item.id } });
  res.json({ success: true });
});

router.get('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const coupleId = req.query.coupleId as string | undefined;

  if (coupleId) {
    if (!(await userInCouple(req.user!.userId, coupleId))) {
      res.status(403).json({ error: 'Not in this couple' });
      return;
    }
    const items = await prisma.watchlistItem.findMany({
      where: { coupleId },
      include: { progress: { orderBy: { watchedAt: 'desc' } } },
      orderBy: { addedAt: 'desc' },
    });
    res.json({ items });
  } else {
    // Return watchlist for all couples the user is in
    const couples = await prisma.couple.findMany({
      where: { OR: [{ userAId: req.user!.userId }, { userBId: req.user!.userId }] },
      select: { id: true },
    });
    const coupleIds = couples.map((c) => c.id);
    const items = await prisma.watchlistItem.findMany({
      where: { coupleId: { in: coupleIds } },
      include: { progress: { orderBy: { watchedAt: 'desc' } } },
      orderBy: { addedAt: 'desc' },
    });
    res.json({ items });
  }
});

export default router;
