import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

async function getUserCouple(userId: string) {
  return prisma.couple.findFirst({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
  });
}

const addSchema = z.object({
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

  const couple = await getUserCouple(req.user!.userId);
  if (!couple) {
    res.status(400).json({ error: 'Not in a couple', code: 'NO_COUPLE' });
    return;
  }

  const existing = await prisma.watchlistItem.findFirst({
    where: { coupleId: couple.id, tmdbId: parsed.data.tmdbId },
  });
  if (existing) {
    res.status(400).json({ error: 'Already in watchlist', code: 'ALREADY_ADDED' });
    return;
  }

  const item = await prisma.watchlistItem.create({
    data: { coupleId: couple.id, ...parsed.data },
  });
  res.json({ item });
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const couple = await getUserCouple(req.user!.userId);
  if (!couple) {
    res.status(400).json({ error: 'Not in a couple' });
    return;
  }

  const item = await prisma.watchlistItem.findFirst({
    where: { id: req.params.id, coupleId: couple.id },
  });
  if (!item) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }

  await prisma.watchlistItem.delete({ where: { id: item.id } });
  res.json({ success: true });
});

router.get('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const couple = await getUserCouple(req.user!.userId);
  if (!couple) {
    res.json({ items: [] });
    return;
  }

  const items = await prisma.watchlistItem.findMany({
    where: { coupleId: couple.id },
    include: { progress: { orderBy: { watchedAt: 'desc' } } },
    orderBy: { addedAt: 'desc' },
  });
  res.json({ items });
});

export default router;
