import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { signToken, verifyToken } from '../lib/jwt';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

const magicLinkSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

router.post('/magic-link', async (req: Request, res: Response): Promise<void> => {
  const parsed = magicLinkSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', code: 'VALIDATION_ERROR' });
    return;
  }
  const { email, name } = parsed.data;

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({ data: { email, name } });
  } else if (name && !user.name) {
    user = await prisma.user.update({ where: { id: user.id }, data: { name } });
  }

  const expiresAt = new Date(Date.now() + 1000 * 60 * 15); // 15 min
  const magicLink = await prisma.magicLink.create({
    data: { userId: user.id, expiresAt },
  });

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const url = `${frontendUrl}/verify?token=${magicLink.token}`;

  if (!process.env.RESEND_API_KEY) {
    console.log('[DEV] Magic link:', url);
    res.json({ message: 'Check your email', devMagicUrl: url });
    return;
  }

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.FROM_EMAIL || 'noreply@twowatch.app',
      to: email,
      subject: 'Your TwoWatch login link',
      html: `<p>Click to sign in: <a href="${url}">${url}</a></p><p>Expires in 15 minutes.</p>`,
    });
  } catch (err) {
    console.error('Email send failed:', err);
    res.status(500).json({ error: 'Failed to send email' });
    return;
  }

  res.json({ message: 'Check your email' });
});

router.get('/verify', async (req: Request, res: Response): Promise<void> => {
  const token = req.query.token as string;
  if (!token) {
    res.status(400).json({ error: 'Missing token' });
    return;
  }

  const magicLink = await prisma.magicLink.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!magicLink || magicLink.used || magicLink.expiresAt < new Date()) {
    res.status(400).json({ error: 'Invalid or expired link', code: 'INVALID_TOKEN' });
    return;
  }

  await prisma.magicLink.update({ where: { id: magicLink.id }, data: { used: true } });

  const jwt = signToken({ userId: magicLink.user.id, email: magicLink.user.email });
  res.json({ token: jwt, user: { id: magicLink.user.id, email: magicLink.user.email, name: magicLink.user.name } });
});

router.get('/me', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ id: user.id, email: user.email, name: user.name });
});

export default router;
