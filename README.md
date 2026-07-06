# PSK Padel

Free, self-hosted Padel Americano scorekeeping app: rounds, live scoring, serve tracking and standings, for personal use.

## Local development

1. Copy `.env` and set `DATABASE_URL` (Postgres) and `APP_PASSCODE` (shared login passcode).
2. `npm install`
3. `npx prisma db push` — syncs the schema to your database.
4. `npm run dev` — open [http://localhost:3000](http://localhost:3000).

For a local Postgres, `npx prisma dev --name <project>` works, but run it as a **plain foreground command** (not `-d`/detached) — the detached mode has been unreliable and dies unexpectedly during longer sessions. Keep it running in its own terminal/background task for the duration of your work, and re-run `npx prisma db push` if you ever have to restart it.

## Deploying to Vercel + Neon

1. Create a free Neon Postgres database, copy its connection string into the Vercel project's `DATABASE_URL` env var.
2. Set `APP_PASSCODE` (shared passcode for login) and `CRON_SECRET` (any random string — Vercel sends it automatically as a bearer token when it calls the daily cleanup cron) as Vercel env vars.
3. Run `npx prisma db push` once against the Neon `DATABASE_URL` to create the schema.
4. Seed the named login codes once: `curl -X POST https://<your-domain>/api/admin/seed-login-codes -H "Authorization: Bearer $CRON_SECRET"`.
5. Deploy. `vercel.json` already schedules `/api/cron/cleanup` daily — it deletes any session older than 30 days.

## How it works

- Sessions hold players, courts, and per-tournament settings (`pointsPerMatch`, `pointsPerServe`). Creating a session auto-generates the standard `players − 1` round-robin schedule; "Add More Matches" generates further rounds beyond that.
- Each match has its own landscape **Scoreboard** screen (`/session/[id]/match/[matchId]`) — score and serve changes there are local until you tap "Finish Match", which writes the final result in one request.
- Standings are computed from raw match scores: SD (point differential) is the default ranking key, with a toggle to sort by raw Score. `+M` shows bonus points for rounds missed due to sit-outs. Ties share a rank.
- A read-only `/session/[id]/board` view is meant to be left open on a shared/TV screen, and shows any matches currently in progress above the standings.
- Login accepts the shared `APP_PASSCODE` or any DB-backed named code (see the seed step above); failed attempts are rate-limited.
- `/schedule` is a standalone tool to draft and share a plain-text "next session" announcement, and to parse one back into a pre-filled Create Session form.
- A sun/moon toggle switches between dark (default) and light themes, saved to `localStorage`.
- Session data older than 30 days is deleted automatically; download a month's matches as CSV from the home screen first.
