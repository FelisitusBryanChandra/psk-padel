// Accent color themes -- see the matching [data-accent="..."] blocks in
// globals.css for the actual color values. This registry only carries the
// swatch dot's display color plus the id/label; a new accent needs a
// globals.css block AND an entry here (and in layout.tsx's no-flash script).
// Light mode inverts the accent (black surfaces, neon text), so one swatch
// color serves both modes.
export const ACCENT_THEMES = [
  { id: "volt", label: "Volt", swatch: "#d4ff3a" },
  { id: "flame", label: "Flame", swatch: "#ff7a1a" },
  { id: "ice", label: "Ice", swatch: "#3af0ff" },
] as const;

export type AccentTheme = (typeof ACCENT_THEMES)[number]["id"];

export const ACCENT_THEME_STORAGE_KEY = "psk_accent_theme";

const DEFAULT_ACCENT: AccentTheme = "volt";

function isAccentTheme(value: string | null): value is AccentTheme {
  return ACCENT_THEMES.some((t) => t.id === value);
}

export function readAccentTheme(): AccentTheme {
  try {
    const raw = localStorage.getItem(ACCENT_THEME_STORAGE_KEY);
    return isAccentTheme(raw) ? raw : DEFAULT_ACCENT;
  } catch {
    return DEFAULT_ACCENT;
  }
}

// "volt" is the palette baked into globals.css with no [data-accent]
// selector, so applying it means clearing the attribute.
export function applyAccentTheme(theme: AccentTheme) {
  if (theme === DEFAULT_ACCENT) {
    document.documentElement.removeAttribute("data-accent");
  } else {
    document.documentElement.setAttribute("data-accent", theme);
  }
  try {
    localStorage.setItem(ACCENT_THEME_STORAGE_KEY, theme);
  } catch {
    // ignore unavailable storage
  }
}
