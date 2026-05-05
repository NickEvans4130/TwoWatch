import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

const createRoomSchema = z.object({
  watchlistItemId: z.string(),
  season: z.number().optional(),
  episode: z.number().optional(),
});

router.post('/create', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = createRoomSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request' });
    return;
  }

  const couple = await prisma.couple.findFirst({
    where: { OR: [{ userAId: req.user!.userId }, { userBId: req.user!.userId }] },
  });
  if (!couple) {
    res.status(400).json({ error: 'Not in a couple' });
    return;
  }

  const item = await prisma.watchlistItem.findFirst({
    where: { id: parsed.data.watchlistItemId, coupleId: couple.id },
  });
  if (!item) {
    res.status(404).json({ error: 'Watchlist item not found' });
    return;
  }

  const room = await prisma.room.create({
    data: {
      coupleId: couple.id,
      tmdbId: item.tmdbId,
      imdbId: item.imdbId,
      mediaType: item.mediaType,
      season: parsed.data.season,
      episode: parsed.data.episode,
    },
  });

  res.json({ roomId: room.id });
});

router.get('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const couple = await prisma.couple.findFirst({
    where: { OR: [{ userAId: req.user!.userId }, { userBId: req.user!.userId }] },
  });
  if (!couple) {
    res.status(400).json({ error: 'Not in a couple' });
    return;
  }

  const room = await prisma.room.findFirst({
    where: { id: req.params.id, coupleId: couple.id },
  });
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  res.json({ room });
});

export default router;
