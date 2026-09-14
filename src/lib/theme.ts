// Accent color themes -- see the matching [data-accent="..."] blocks in
// globals.css for the actual color values. This registry only carries the
// swatch dot's own display color plus the id/label; it never sets CSS
// values itself, so a new accent needs a globals.css block AND an entry
// here, not one or the other.
export const ACCENT_THEMES = [
  { id: "mint", label: "Mint", swatch: "#2ff0bf" },
  { id: "ocean", label: "Ocean", swatch: "#4fb4ff" },
  { id: "violet", label: "Violet", swatch: "#b58cff" },
  { id: "amber", label: "Amber", swatch: "#ffb347" },
  { id: "rose", label: "Rose", swatch: "#ff6fa5" },
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
