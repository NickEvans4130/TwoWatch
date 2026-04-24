import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: { email: 'alice@example.com', name: 'Alice' },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: { email: 'bob@example.com', name: 'Bob' },
  });

  let couple = await prisma.couple.findFirst({
    where: { userAId: alice.id },
  });

  if (!couple) {
    couple = await prisma.couple.create({
      data: { userAId: alice.id, userBId: bob.id },
    });
  }

  const severance = await prisma.watchlistItem.upsert({
    where: { id: 'seed-severance' },
    update: {},
    create: {
      id: 'seed-severance',
      coupleId: couple.id,
      tmdbId: '95396',
      imdbId: 'tt11280740',
      mediaType: 'tv',
      title: 'Severance',
      posterPath: '/lI15PEzFWu6vJCYCdFKAoEDpKxG.jpg',
    },
  });

  await prisma.watchlistItem.upsert({
    where: { id: 'seed-thebear' },
    update: {},
    create: {
      id: 'seed-thebear',
      coupleId: couple.id,
      tmdbId: '136315',
      imdbId: 'tt14452776',
      mediaType: 'tv',
      title: 'The Bear',
      posterPath: '/sHFlbKS3WLqMnp9t2ghADIJFnuQ.jpg',
    },
  });

  await prisma.watchlistItem.upsert({
    where: { id: 'seed-inception' },
    update: {},
    create: {
      id: 'seed-inception',
      coupleId: couple.id,
      tmdbId: '27205',
      imdbId: 'tt1375666',
      mediaType: 'movie',
      title: 'Inception',
      posterPath: '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
    },
  });

  await prisma.watchProgress.upsert({
    where: { id: 'seed-progress-s1e1' },
    update: {},
    create: {
      id: 'seed-progress-s1e1',
      watchlistItemId: severance.id,
      season: 1,
      episode: 1,
      completedBy: JSON.stringify([alice.id, bob.id]),
    },
  });

  console.log('Seed complete.');
  console.log('Alice:', alice.email);
  console.log('Bob:', bob.email);
  console.log('Couple ID:', couple.id);
  console.log('Invite code:', couple.inviteCode);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
