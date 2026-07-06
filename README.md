# PSK Padel

Free, self-hosted Padel Americano scorekeeping app: rounds, live scoring, serve tracking and standings, for personal use.

## Local development

1. Copy `.env` and set `DATABASE_URL` (Postgres) and `APP_PASSCODE` (shared login passcode).
2. `npm install`
3. `npx prisma db push` — syncs the schema to your database.
4. `npm run dev` — open [http://localhost:3000](http://localhost:3000).

## Deploying to Vercel + Neon

1. Create a free Neon Postgres database, copy its connection string into the Vercel project's `DATABASE_URL` env var.
2. Set `APP_PASSCODE` (shared passcode for login) and `CRON_SECRET` (any random string — Vercel sends it automatically as a bearer token when it calls the daily cleanup cron) as Vercel env vars.
3. Run `npx prisma db push` once against the Neon `DATABASE_URL` to create the schema.
4. Deploy. `vercel.json` already schedules `/api/cron/cleanup` daily — it deletes any session older than 30 days.

## How it works

- Sessions hold players, courts, and per-tournament settings (`pointsPerMatch`, `pointsPerServe`).
- "Generate Next Round" builds one round at a time, balancing games played and minimizing repeat partners.
- Match scores are entered live, point by point, with serve tracking (team + player level) that auto-rotates every `pointsPerServe` points, with a manual override.
- Standings are computed from raw match scores: SD (point differential) is the default ranking key, with a toggle to sort by raw Score. `+M` shows bonus points for rounds missed due to sit-outs.
- A read-only `/session/[id]/board` view is meant to be left open on a shared/TV screen.
- Session data older than 30 days is deleted automatically; download a month's matches as CSV from the home screen first.
