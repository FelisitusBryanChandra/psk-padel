"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BottomNav } from "@/app/BottomNav";
import { PageHero } from "@/app/PageHero";
import { SideNav } from "@/app/SideNav";
import { SETTINGS_STORAGE_KEY } from "@/lib/settings";
import { ACCENT_THEMES, applyAccentTheme, readAccentTheme, type AccentTheme } from "@/lib/theme";

// Every row here must actually gate real behavior somewhere — see
// readRespectMaxPoints() in src/lib/settings.ts and its use in the
// Scoreboard. The previous auto-advance/sound/haptics/sharing/push rows
// were removed: they only persisted a preference value with nothing in the
// app reading it back.
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

const MODES = [
  { light: false, label: "Night court", icon: "dark_mode", bg: "#0b0d0c", ink: "#f2f5ef" },
  { light: true, label: "Day court", icon: "light_mode", bg: "#eef0e8", ink: "#0b0d0c" },
] as const;

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 font-heading text-lg font-extrabold uppercase tracking-wide text-ink">
      {children}
    </h2>
  );
}

function Check() {
  return (
    <motion.span
      initial={{ scale: 0, rotate: -45 }}
      animate={{ scale: 1, rotate: 0 }}
      exit={{ scale: 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 22 }}
      className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-lime text-on-lime"
    >
      <span className="material-symbols-outlined text-base">check</span>
    </motion.span>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [accent, setAccent] = useState<AccentTheme>("volt");
  const [light, setLight] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {
      // ignore malformed/unavailable storage
    }
    setAccent(readAccentTheme());
    setLight(document.documentElement.classList.contains("light"));
    setLoaded(true);
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

  // Same storage key and class ThemeToggle uses.
  function selectMode(next: boolean) {
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    try {
      localStorage.setItem("theme", next ? "light" : "dark");
    } catch {
      // ignore unavailable storage
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-28 pt-4 md:max-w-xl lg:max-w-2xl">
      <PageHero
        line1="Your"
        line2="Setup."
        ghost="SETTINGS"
        sub="Make the app feel like your court."
        noToggle
      />

      <div className="stagger flex flex-col gap-8">
        <section>
          <SectionTitle>Mode</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            {MODES.map((m) => {
              const on = light === m.light;
              return (
                <motion.button
                  key={m.label}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => selectMode(m.light)}
                  className={`relative overflow-hidden rounded-3xl border-2 p-4 text-left transition-colors duration-300 ${
                    on ? "border-lime" : "border-outline"
                  }`}
                  style={{ background: m.bg, color: m.ink }}
                >
                  <span className="material-symbols-outlined text-3xl">{m.icon}</span>
                  <span className="mt-6 block font-heading text-2xl font-black uppercase italic leading-none">
                    {m.label}
                  </span>
                  <AnimatePresence>{on && <Check />}</AnimatePresence>
                </motion.button>
              );
            })}
          </div>
        </section>

        <section>
          <SectionTitle>Accent</SectionTitle>
          <div className="grid grid-cols-3 gap-3">
            {ACCENT_THEMES.map((t) => {
              const on = accent === t.id;
              return (
                <motion.button
                  key={t.id}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => selectAccent(t.id)}
                  aria-label={t.label}
                  className={`relative flex flex-col items-start overflow-hidden rounded-3xl border-2 bg-surface p-3 transition-colors duration-300 ${
                    on ? "border-lime" : "border-outline"
                  }`}
                >
                  <motion.span
                    className="h-12 w-12 rounded-2xl"
                    style={{ background: t.swatch, boxShadow: on ? `0 8px 24px -6px ${t.swatch}` : "none" }}
                    animate={{ rotate: on ? 0 : -8, scale: on ? 1.05 : 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 18 }}
                  />
                  <span className="mt-4 font-heading text-xl font-black uppercase text-ink">{t.label}</span>
                  <AnimatePresence>{on && <Check />}</AnimatePresence>
                </motion.button>
              );
            })}
          </div>
        </section>

        {GROUPS.map((g) => (
          <section key={g.title}>
            <SectionTitle>{g.title}</SectionTitle>
            <div className="flex flex-col gap-2">
              {g.rows.map(([key, label, hint]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-4 rounded-3xl border border-outline bg-surface p-4"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface-highest text-lime">
                    <span className="material-symbols-outlined">scoreboard</span>
                  </span>
                  <span className="flex-1">
                    <span className="block text-base font-semibold text-ink">{label}</span>
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
            </div>
          </section>
        ))}
      </div>

      <SideNav />
      <BottomNav />
    </main>
  );
}
