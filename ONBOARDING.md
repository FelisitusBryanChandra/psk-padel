# PSK Padel — Onboarding Guide

PSK Padel is a free, self-hosted web app for running **Padel Americano** sessions: it auto-generates fair round-robin matches, tracks live scores, and keeps standings — no spreadsheet needed.

Live app: **https://psk-padel.vercel.app**

## 1. Logging in

Open the link above. You'll see a passcode screen ("Championship Access").

- Shared passcode: `padel2026`
- Or use your personal named code if one has been set up for you (ask whoever runs the app).

You stay logged in on that device/browser until you clear cookies.

## 2. Creating a session

From the home screen, tap **New Session**:

- **Name** — e.g. "Friday Night Padel"
- **Date**
- **Courts** — how many courts are available (matches per round = courts × 1)
- **Max points per match** and **points per serve** (controls the serve-rotation math)
- **Players** — add at least 4 names (use the dashed "Add player" row)

On creation, the app automatically generates `players − 1` rounds — the standard Americano round-robin length, so everyone partners with everyone as evenly as possible with minimal repeats. You can always add more rounds later with **Add More Matches**.

## 3. Running a session — Matches tab

Each round shows one match per court: two pairs, e.g. "P1 & P4 vs P3 & P6".

- Tap an unfinished match's **Scoreboard** button to open the live scoring screen.
- On mobile, rotate your phone — the scoreboard forces landscape for easier viewing.
- Use **+ / −** to adjust each side's score. Tap the racket icon to switch who's serving (it highlights the serving side).
- **Update** saves your current progress to the server without ending the match — useful if you want the score visible elsewhere (like the TV board) mid-match, or you're stepping away.
- **Finish Match** locks in the final score and returns you to the session.
- Finished a match by mistake? Use **Reopen** on the Matches tab to correct it.

## 4. Standings tab

Live-updating leaderboard sorted by your choice of:
- **SD** (score difference — points won minus points lost), or
- **Score** (total points won)

Tap the sort chip once to flip between the two. Ties are ranked competition-style (equal scores share the same rank).

## 5. TV Board

Each session has a **Board** view meant for a TV or shared screen — it shows the standings plus a "Now Playing" section for any matches currently live. Great for keeping everyone updated without checking their phone.

## 6. Swapping a player mid-session

If someone drops out or a substitute arrives, use the player-swap control on the session page. It only affects matches that haven't started yet — anything already played or in progress keeps the original player, so history stays accurate.

## 7. Ending or deleting a session

- **Reopen** undoes a finished match if you scored it wrong.
- **End Session** / **Delete Session** are available from the session screen, each with a confirmation prompt — these are permanent.

## 8. Dark / Light mode

Use the sun/moon toggle in the header to switch themes. Your choice is remembered on that device.

## 9. Schedule export / import (planning ahead)

If you like planning sessions in a group chat before creating them in the app, use the **Schedule** tool (linked from the home screen):

- **Export**: fill in host name, description, date, court, and players, then generate a copy-paste-ready text block for your chat.
- **Import**: paste that same text back in, and it parses straight into a pre-filled Create Session form — just set courts, max points, and serve settings and you're ready to go.

## Notes for this session

- No signup/account system — access is passcode-only, shared among your group.
- All data (players, sessions, scores) is stored centrally, so everyone sees the same live state.
