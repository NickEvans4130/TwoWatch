# CLAUDE.md — TwoWatch Project Rules

## Project context
TwoWatch is a watch-party web app for long-distance couples. The core mechanic is a mutual-ready gate: both users must confirm they're present before a video plays. Media is embedded via VidSrc iframes (no self-hosted media). This is a public-facing product, not a personal tool.

## Monorepo structure
- `apps/web` — React 18 + TypeScript + Vite + Tailwind frontend
- `apps/server` — Node.js + TypeScript + Express + Socket.io + Prisma backend
- Root `package.json` uses npm workspaces

## Core constraints

### Never do these
- Do not add a component library (no shadcn, no MUI, no Chakra) — custom components only
- Do not use `any` in TypeScript — type everything properly
- Do not store media files — all video comes from VidSrc embeds
- Do not implement payment or subscription logic — MVP is free
- Do not add analytics or tracking

### Always do these
- Use `zod` for all API request validation on the backend
- Use the shared color palette from the design spec (CSS variables in `index.css`)
- Return consistent error shapes from the API: `{ error: string, code?: string }`
- JWT goes in `Authorization: Bearer <token>` header — never in cookies
- All socket events must validate the JWT before processing room actions
- Dev mode: if `RESEND_API_KEY` is not set, return `devMagicUrl` in the magic link API response and display it on the login page

## Key design decisions

### The overlay mechanic
The VidSrc iframe is always mounted and loading in the background. A full-size overlay div (z-index 10) covers it. The overlay is only removed when `canPlay === true` from socket state. This is the core sync mechanism — we don't try to programmatically pause/play the iframe.

### Room state is in-memory
Socket room state lives in a `Map<roomId, RoomState>` on the server. It is not persisted to the database. Only completed watch sessions (both users left after >10 min) write a `WatchProgress` record.

### TMDB + VidSrc relationship
- TMDB gives us metadata (title, poster, episode list)
- VidSrc needs the **IMDB ID** (not TMDB ID) for embed URLs
- Always fetch and store the IMDB ID when adding to watchlist
- TMDB external IDs endpoint: `/movie/{tmdb_id}/external_ids` or `/tv/{tmdb_id}/external_ids`

### Auth flow
1. User enters email → backend creates user (if new) + MagicLink record → sends email (or logs URL in dev)
2. User clicks link → `/verify?token=xxx` → backend validates token + returns JWT
3. Frontend stores JWT in localStorage under key `tw_token`
4. All authenticated requests use `Authorization: Bearer <token>`

## File naming conventions
- React components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Utilities/lib: `camelCase.ts`
- Route handlers: `camelCase.ts` in `src/routes/`
- Socket handlers: in `src/socket/`

## Socket event naming
- Client → Server: `snake_case` verbs (e.g. `join_room`, `user_ready`)
- Server → Client: `snake_case` nouns/states (e.g. `room_state`, `partner_disconnected`)

## Environment
- Backend runs on port 3001
- Frontend dev server on port 5173
- Use `concurrently` at root to run both with `npm run dev`
- SQLite for local dev (`DATABASE_URL=file:./dev.db` in `apps/server`)
- Prisma client generated to `apps/server/src/generated/prisma`

## When implementing the watch room
The watch room is the most important page. Get this right:
1. Connect to socket on mount, emit `join_room` with roomId + userId + token
2. Listen to `room_state` events — drive all UI from this state
3. The ready button toggles between `user_ready` and `user_unready` emissions
4. The overlay has three distinct visual states — implement all three
5. Handle `partner_disconnected` with a toast/banner notification
6. Clean up socket listeners and emit a leave event on unmount

## Seed data
The seed script should create:
- User A: `alice@example.com` (name: Alice)
- User B: `bob@example.com` (name: Bob)
- A couple linking them
- 3 watchlist items: one movie, two TV shows (use real TMDB/IMDB IDs)
- One WatchProgress record showing S1E1 of one show already watched

Example real IDs to use:
- Severance (TV): TMDB 95396, IMDB tt11280740
- Inception (Movie): TMDB 27205, IMDB tt1375666
- The Bear (TV): TMDB 136315, IMDB tt14452776
