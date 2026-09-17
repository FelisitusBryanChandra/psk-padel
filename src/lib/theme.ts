// Accent color themes -- see the matching [data-accent="..."] blocks in
// globals.css for the actual color values. This registry only carries the
// swatch dot's own display colors (one per light/dark, since --color-lime
// itself flips between them) plus the id/label; it never sets CSS values
// itself, so a new accent needs a globals.css block AND an entry here, not
// one or the other.
export const ACCENT_THEMES = [
  { id: "mint", label: "Mint", swatchDark: "#2ff0bf", swatchLight: "#22c9a2" },
  { id: "ocean", label: "Ocean", swatchDark: "#4fb4ff", swatchLight: "#0077c2" },
  { id: "violet", label: "Violet", swatchDark: "#b58cff", swatchLight: "#7c3fe0" },
  { id: "amber", label: "Amber", swatchDark: "#ffb347", swatchLight: "#b9720a" },
  { id: "rose", label: "Rose", swatchDark: "#ff6fa5", swatchLight: "#c81760" },
] as const;

export type AccentTheme = (typeof ACCENT_THEMES)[number]["id"];

export const ACCENT_THEME_STORAGE_KEY = "psk_accent_theme";

const DEFAULT_ACCENT: AccentTheme = "mint";

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

// "mint" is the palette baked into globals.css with no [data-accent]
// selector, so applying it means clearing the attribute, not setting it to
// "mint" -- keeps the DOM matching the CSS's actual default case.
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

// Base color themes -- the structural neutrals (bg/surface tiers, ink,
// outline, neu-shadows), a separate axis from the accent above: see the
// matching [data-base="..."] blocks in globals.css. Same registry/CSS
// pairing rule as ACCENT_THEMES. swatchDark/swatchLight are each theme's
// own --color-bg in that mode -- these are near-black in dark mode and
// pale in light mode, so unlike accents the two are never close enough to
// substitute for each other.
export const BASE_THEMES = [
  { id: "petrol", label: "Petrol", swatchDark: "#06222b", swatchLight: "#cfe3e4" },
  { id: "slate", label: "Slate", swatchDark: "#14181d", swatchLight: "#e3e6ea" },
  { id: "charcoal", label: "Charcoal", swatchDark: "#1a1614", swatchLight: "#ece3d8" },
] as const;

export type BaseTheme = (typeof BASE_THEMES)[number]["id"];

export const BASE_THEME_STORAGE_KEY = "psk_base_theme";

const DEFAULT_BASE: BaseTheme = "petrol";

function isBaseTheme(value: string | null): value is BaseTheme {
  return BASE_THEMES.some((t) => t.id === value);
}

export function readBaseTheme(): BaseTheme {
  try {
    const raw = localStorage.getItem(BASE_THEME_STORAGE_KEY);
    return isBaseTheme(raw) ? raw : DEFAULT_BASE;
  } catch {
    return DEFAULT_BASE;
  }
}

// "petrol" is the palette baked into globals.css with no [data-base]
// selector, same reasoning as applyAccentTheme's "mint" case.
export function applyBaseTheme(theme: BaseTheme) {
  if (theme === DEFAULT_BASE) {
    document.documentElement.removeAttribute("data-base");
  } else {
    document.documentElement.setAttribute("data-base", theme);
  }
  try {
    localStorage.setItem(BASE_THEME_STORAGE_KEY, theme);
  } catch {
    // ignore unavailable storage
  }
}
