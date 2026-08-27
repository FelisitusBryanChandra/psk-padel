import { LOGO_PATHS, LOGO_VIEWBOX } from "@/app/Logo";
import { computeRanks, sortStandings, type StandingRow } from "@/lib/types";

/**
 * Renders the standings as a share-ready PNG on a canvas.
 *
 * Deliberately canvas-drawn rather than a DOM screenshot: it needs no extra
 * dependency, and it lets the card use a fixed share-friendly width instead of
 * inheriting whatever the phone viewport happened to be. Colours are pulled
 * from the live CSS custom properties, so the export tracks the light/dark
 * theme the user is currently looking at.
 */

// Logical layout units; the bitmap is rendered at SCALE× for retina sharpness.
const SCALE = 2;
const W = 680;
const PAD = 32;
const ROW_H = 46;
const HEADER_H = 188;
const FOOTER_H = 58;

const COL = {
  rankCx: PAD + 18,
  avatarCx: PAD + 62,
  nameX: PAD + 89,
  wtlCx: 428,
  sdCx: 490,
  mCx: 548,
  scoreRight: W - PAD,
};

const MEDALS = [
  ["#ffd700", "#a16207"],
  ["#c0c0c0", "#64748b"],
  ["#cd7f32", "#92400e"],
];

type Palette = ReturnType<typeof readPalette>;

function readPalette() {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) =>
    css.getPropertyValue(name).trim() || fallback;
  return {
    bg: v("--color-bg", "#17151c"),
    surface: v("--color-surface", "#211f28"),
    surfaceHigh: v("--color-surface-high", "#2d2a35"),
    surfaceHighest: v("--color-surface-highest", "#3a3641"),
    ink: v("--color-ink", "#f1efe9"),
    inkMuted: v("--color-ink-muted", "#b3aebd"),
    outline: v("--color-outline", "#45414f"),
    lime: v("--color-lime", "#caf300"),
    limeDim: v("--color-lime-dim", "#b0d500"),
    live: v("--color-live", "#ff5449"),
    orange: v("--color-accent-orange", "#ffb238"),
    heading: v("--font-heading", "sans-serif"),
    body: v("--font-body", "sans-serif"),
  };
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w[0]));
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function truncate(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth)
    out = out.slice(0, -1);
  return `${out}…`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Draws the PSK mark scaled to `height`, top-left anchored at (x, y). */
function drawLogo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  height: number,
  fill: string,
) {
  const k = height / LOGO_VIEWBOX.height;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.fillStyle = fill;
  for (const d of LOGO_PATHS) ctx.fill(new Path2D(d));
  ctx.restore();
}

function label(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  size: number,
  color: string,
) {
  ctx.font = `900 ${size}px ${p.heading}`;
  ctx.fillStyle = color;
  ctx.letterSpacing = "1.5px";
}

export type ExportOptions = {
  rows: StandingRow[];
  scoreLabel: string;
  sessionName: string;
  sessionDate?: string;
};

export async function renderStandingsImage(opts: ExportOptions): Promise<Blob> {
  const { rows, scoreLabel, sessionName, sessionDate } = opts;

  // Without this the first export can land on the fallback font, since the
  // webfonts are only guaranteed loaded once the document says so.
  if (document.fonts?.ready) await document.fonts.ready;

  const sorted = sortStandings(rows);
  const ranks = computeRanks(sorted);
  const p = readPalette();

  const height = HEADER_H + sorted.length * ROW_H + FOOTER_H;
  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable in this browser");
  ctx.scale(SCALE, SCALE);
  ctx.textBaseline = "alphabetic";

  // Background + lime top rule.
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, W, height);
  ctx.fillStyle = p.lime;
  ctx.fillRect(0, 0, W, 6);

  drawLogo(ctx, PAD, 40, 34, p.lime);

  ctx.letterSpacing = "0px";
  ctx.font = `900 30px ${p.heading}`;
  ctx.fillStyle = p.ink;
  ctx.fillText(truncate(ctx, sessionName.toUpperCase(), W - PAD * 2), PAD, 118);

  const dateText = sessionDate
    ? new Date(sessionDate).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";
  label(ctx, p, 11, p.inkMuted);
  ctx.fillText(
    [dateText, `Ranked by ${scoreLabel}`]
      .filter(Boolean)
      .join("  ·  ")
      .toUpperCase(),
    PAD,
    140,
  );

  // Column headers.
  const headerY = 172;
  label(ctx, p, 10, p.inkMuted);
  ctx.textAlign = "left";
  ctx.fillText("#", PAD + 10, headerY);
  ctx.fillText("PLAYER", COL.nameX, headerY);
  ctx.textAlign = "center";
  ctx.fillText("W-T-L", COL.wtlCx, headerY);
  ctx.fillText("SD", COL.sdCx, headerY);
  ctx.fillText("+M", COL.mCx, headerY);
  ctx.textAlign = "right";
  // Full-contrast ink rather than lime: lime-on-cream is unreadable in light mode.
  ctx.fillStyle = p.ink;
  ctx.fillText(scoreLabel.toUpperCase(), COL.scoreRight, headerY);

  ctx.strokeStyle = p.outline;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, HEADER_H - 0.5);
  ctx.lineTo(W - PAD, HEADER_H - 0.5);
  ctx.stroke();

  sorted.forEach((r, idx) => {
    const top = HEADER_H + idx * ROW_H;
    const mid = top + ROW_H / 2;

    if (idx % 2 === 1) {
      ctx.fillStyle = p.surface;
      ctx.fillRect(PAD - 8, top, W - (PAD - 8) * 2, ROW_H);
    }

    // Rank badge — medal gradient for the top three, matching the on-screen table.
    const rank = ranks[idx];
    ctx.beginPath();
    ctx.arc(COL.rankCx, mid, 15, 0, Math.PI * 2);
    if (rank <= 3) {
      const [from, to] = MEDALS[rank - 1];
      const g = ctx.createLinearGradient(
        COL.rankCx - 15,
        mid - 15,
        COL.rankCx + 15,
        mid + 15,
      );
      g.addColorStop(0, from);
      g.addColorStop(1, to);
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = p.surfaceHigh;
    }
    ctx.fill();
    ctx.letterSpacing = "0px";
    ctx.font = `900 14px ${p.heading}`;
    ctx.fillStyle = rank <= 3 ? "#000000" : p.inkMuted;
    ctx.textAlign = "center";
    ctx.fillText(String(rank), COL.rankCx, mid + 5);

    // Avatar initials.
    ctx.beginPath();
    ctx.arc(COL.avatarCx, mid, 16, 0, Math.PI * 2);
    ctx.fillStyle = p.surfaceHighest;
    ctx.fill();
    ctx.font = `900 11px ${p.heading}`;
    ctx.fillStyle = p.inkMuted;
    ctx.fillText(initials(r.name), COL.avatarCx, mid + 4);

    ctx.textAlign = "left";
    ctx.font = `500 16px ${p.body}`;
    ctx.fillStyle = p.ink;
    ctx.fillText(
      truncate(ctx, r.name, COL.wtlCx - 40 - COL.nameX),
      COL.nameX,
      mid + 6,
    );

    ctx.textAlign = "center";
    ctx.font = `400 14px ${p.body}`;
    ctx.fillStyle = p.inkMuted;
    ctx.fillText(`${r.wins}-${r.ties}-${r.losses}`, COL.wtlCx, mid + 5);

    ctx.font = `700 15px ${p.body}`;
    ctx.fillStyle = r.sd > 0 ? p.limeDim : r.sd < 0 ? p.live : p.inkMuted;
    ctx.fillText(r.sd > 0 ? `+${r.sd}` : String(r.sd), COL.sdCx, mid + 5);

    if (r.mBonus) {
      ctx.fillStyle = p.orange;
      ctx.fillText(`+${r.mBonus}`, COL.mCx, mid + 5);
    }

    ctx.textAlign = "right";
    ctx.font = `900 20px ${p.heading}`;
    ctx.fillStyle = p.ink;
    ctx.fillText(String(r.score), COL.scoreRight, mid + 7);
  });

  const footerY = HEADER_H + sorted.length * ROW_H;
  ctx.strokeStyle = p.outline;
  ctx.beginPath();
  ctx.moveTo(PAD, footerY + 0.5);
  ctx.lineTo(W - PAD, footerY + 0.5);
  ctx.stroke();

  label(ctx, p, 10, p.inkMuted);
  ctx.textAlign = "left";
  ctx.fillText("PSK PADEL", PAD, footerY + 32);
  ctx.textAlign = "right";
  ctx.fillText(
    `+M = MISSED-ROUND BONUS  ·  ${sorted.length} PLAYERS`,
    W - PAD,
    footerY + 32,
  );

  // Rounded outer mask so the card reads as a card, not a screenshot.
  ctx.globalCompositeOperation = "destination-in";
  ctx.fillStyle = "#000";
  roundRect(ctx, 0, 0, W, height, 20);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Could not encode the image")),
      "image/png",
    );
  });
}

function fileName(sessionName: string, sessionDate?: string) {
  const slug =
    sessionName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "session";
  const date = (sessionDate ?? new Date().toISOString()).slice(0, 10);
  return `psk-padel-${slug}-${date}.png`;
}

/**
 * Hands the rendered card to the OS share sheet when available (the path that
 * actually gets it into WhatsApp on a phone) and falls back to a download.
 */
export async function shareStandingsImage(opts: ExportOptions) {
  const blob = await renderStandingsImage(opts);
  const file = new File([blob], fileName(opts.sessionName, opts.sessionDate), {
    type: "image/png",
  });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: opts.sessionName });
      return;
    } catch (err) {
      // A user-cancelled share sheet is not a failure — don't fall through to
      // a surprise download, but do fall back if sharing genuinely broke.
      if (err instanceof DOMException && err.name === "AbortError") return;
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
}
