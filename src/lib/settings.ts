// Shared with src/app/settings/page.tsx (which writes these) and any screen
// that needs to read a preference back (currently just the Scoreboard, for
// respectMaxPoints) — a single source of truth for the storage key so the
// two sides can't drift apart.
export const SETTINGS_STORAGE_KEY = "psk_settings";

export function readRespectMaxPoints(): boolean {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return true;
    const parsed = JSON.parse(raw);
    return parsed.respectMaxPoints ?? true;
  } catch {
    return true;
  }
}
