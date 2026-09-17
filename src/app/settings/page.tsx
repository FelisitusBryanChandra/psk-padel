"use client";

import { useEffect, useState } from "react";
import { BottomNav } from "@/app/BottomNav";
import { Logo } from "@/app/Logo";
import { SideNav } from "@/app/SideNav";
import { ThemeToggle } from "@/app/ThemeToggle";
import { SETTINGS_STORAGE_KEY } from "@/lib/settings";
import {
  ACCENT_THEMES,
  applyAccentTheme,
  readAccentTheme,
  type AccentTheme,
  BASE_THEMES,
  applyBaseTheme,
  readBaseTheme,
  type BaseTheme,
} from "@/lib/theme";

// Every row here must actually gate real behavior somewhere — see
// readRespectMaxPoints() in src/lib/settings.ts and its use in the
// Scoreboard's adjust(). The previous auto-advance/sound/haptics/sharing/
// push rows were removed: they only persisted a preference value with
// nothing in the app reading it back.
type SettingsState = {
  respectMaxPoints: boolean;
};

const DEFAULTS: SettingsState = {
  respectMaxPoints: true,
};

const GROUPS: { title: string; rows: [keyof SettingsState, string, string][] }[] = [
  {
    title: "Match day",
    rows: [
      [
        "respectMaxPoints",
        "Respect max points",
        "Score entry stops at the match's point target instead of counting past it.",
      ],
    ],
  },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [accent, setAccent] = useState<AccentTheme>("mint");
  const [base, setBase] = useState<BaseTheme>("petrol");
  const [light, setLight] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {
      // ignore malformed/unavailable storage
    }
    setAccent(readAccentTheme());
    setBase(readBaseTheme());
    setLoaded(true);
  }, []);

  // Swatch dots need to show each theme's light-mode color while ThemeToggle
  // has the app in light mode (otherwise every Base color option keeps
  // showing its near-black dark-mode color, which reads as "these all look
  // the same" once the page itself is light). ThemeToggle flips the class
  // directly with no callback, so watch for it instead of threading state
  // through a prop.
  useEffect(() => {
    setLight(document.documentElement.classList.contains("light"));
    const observer = new MutationObserver(() => {
      setLight(document.documentElement.classList.contains("light"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore unavailable storage
    }
  }, [settings, loaded]);

  function toggle(key: keyof SettingsState) {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function selectAccent(theme: AccentTheme) {
    setAccent(theme);
    applyAccentTheme(theme);
  }

  function selectBase(theme: BaseTheme) {
    setBase(theme);
    applyBaseTheme(theme);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-24 pt-4 md:max-w-xl lg:max-w-2xl">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-auto text-ink" />
          <h1 className="font-heading text-2xl font-black tracking-tight text-ink">Settings</h1>
        </div>
        <ThemeToggle />
      </header>

      <div className="flex flex-col gap-6">
        <section className="glass rounded-xl px-5 py-1">
          <h2 className="pb-1 pt-4 text-xs font-black uppercase tracking-widest text-ink-muted">
            Appearance
          </h2>
          <div className="flex items-center gap-4 border-b border-outline py-4 last:border-0">
            <span className="flex-1">
              <span className="block text-sm font-semibold text-ink">Base color</span>
              <span className="mt-0.5 block text-xs text-ink-muted">
                The background/surface palette. Applies to both light and dark mode.
              </span>
            </span>
            <div className="flex items-center gap-2">
              {BASE_THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectBase(t.id)}
                  aria-label={t.label}
                  className={`h-7 w-7 rounded-full transition-transform active:scale-90 ${
                    base === t.id ? "ring-2 ring-offset-2 ring-offset-surface ring-ink" : ""
                  }`}
                  style={{ background: light ? t.swatchLight : t.swatchDark }}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 border-b border-outline py-4 last:border-0">
            <span className="flex-1">
              <span className="block text-sm font-semibold text-ink">Accent color</span>
              <span className="mt-0.5 block text-xs text-ink-muted">
                Applies to both light and dark mode.
              </span>
            </span>
            <div className="flex items-center gap-2">
              {ACCENT_THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectAccent(t.id)}
                  aria-label={t.label}
                  className={`h-7 w-7 rounded-full transition-transform active:scale-90 ${
                    accent === t.id ? "ring-2 ring-offset-2 ring-offset-surface ring-ink" : ""
                  }`}
                  style={{ background: light ? t.swatchLight : t.swatchDark }}
                />
              ))}
            </div>
          </div>
        </section>

        {GROUPS.map((g) => (
          <section key={g.title} className="glass rounded-xl px-5 py-1">
            <h2 className="pb-1 pt-4 text-xs font-black uppercase tracking-widest text-ink-muted">
              {g.title}
            </h2>
            {g.rows.map(([key, label, hint]) => (
              <label
                key={key}
                className="flex items-center gap-4 border-b border-outline py-4 last:border-0"
              >
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-ink">{label}</span>
                  <span className="mt-0.5 block text-xs text-ink-muted">{hint}</span>
                </span>
                <span className="sort-toggle sort-toggle-stateful">
                  <input
                    type="checkbox"
                    className="sort-toggle-input"
                    checked={settings[key]}
                    onChange={() => toggle(key)}
                  />
                  <span className="sort-toggle-indicator" />
                </span>
              </label>
            ))}
          </section>
        ))}
      </div>

      <SideNav />
      <BottomNav />
    </main>
  );
}
