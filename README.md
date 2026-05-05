# TwoWatch

TwoWatch is a watch-party app for long-distance couples. Both users must confirm they're ready before video playback begins — no more manual countdown calls.

## Features

- Mutual-ready gate: playback only starts when both partners confirm
- Shared watchlist with TMDB search (movies and TV shows)
- Episode progress tracking
- Real-time sync via Socket.io
- Magic link auth (no passwords)
- Works on mobile and desktop

## Local dev setup

```bash
# 1. Clone the repo
git clone <repo-url> && cd twowatch

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
# Edit apps/server/.env — add your TMDB_API_KEY and JWT_SECRET

# 4. Run database migration
npm run db:migrate

# 5. Seed with test data
npm run db:seed

# 6. Start the dev servers
npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:3001

## TMDB API key

Sign up free at https://www.themoviedb.org — go to Settings > API and request a key. Paste it into `apps/server/.env` as `TMDB_API_KEY`.

## Deployment

**Frontend (Vercel):**
- Connect `apps/web` to Vercel
- Set `VITE_API_URL` and `VITE_SOCKET_URL` to your Railway backend URL

**Backend (Railway):**
- Connect `apps/server` to Railway
- Set all env vars from `.env.example`
- Start command: `npm run build && node dist/index.js`
- Add a Railway PostgreSQL addon and update `DATABASE_URL`
- Run `npx prisma migrate deploy` after deploy

Note: WebSockets work on Railway. Vercel does not support WebSockets — keep frontend and backend as separate deployments.

## How the sync mechanic works

When both users join a watch room, their browsers connect via Socket.io. A full-size overlay div covers the VidSrc iframe. The server tracks each user's ready state and only emits `canPlay: true` when both are simultaneously ready and connected. The frontend removes the overlay on `canPlay: true` and re-applies it if either user disconnects or un-readies. The iframe is always mounted in the background so it loads while users wait.

## Known limitations

- VidSrc availability depends on a third-party service — some content may not be available
- No frame-perfect sync: we remove the overlay at the same moment for both users, but actual playback start may differ by 1-2 seconds depending on connection latency
- No in-room chat
