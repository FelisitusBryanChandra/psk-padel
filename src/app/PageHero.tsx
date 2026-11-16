"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Logo } from "./Logo";
import { RiseLine } from "./RiseLine";
import { ThemeToggle } from "./ThemeToggle";

// Poster-style page header shared by the secondary screens: wordmark bar,
// a two-line rising headline (second line in the accent), an optional
// subtitle, and a drifting outlined ghost word behind it.
export function PageHero({
  line1,
  line2,
  sub,
  ghost,
  backHref,
  closeHref,
  noToggle,
  children,
}: {
  noToggle?: boolean;
  line1: string;
  line2: string;
  sub?: React.ReactNode;
  ghost?: string;
  backHref?: string;
  closeHref?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="relative -mx-5 mb-6 overflow-hidden px-5 pb-1">
      {ghost && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 top-14 select-none whitespace-nowrap font-heading text-[8.5rem] font-black italic leading-none text-transparent"
          style={{ WebkitTextStroke: "1.5px color-mix(in srgb, var(--color-ink) 13%, transparent)" }}
          initial={{ x: 60, opacity: 0 }}
          animate={{ x: [60, -30, 60], opacity: 1 }}
          transition={{ x: { duration: 18, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 1 } }}
        >
          {ghost}
        </motion.span>
      )}

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          {backHref && (
            <Link
              href={backHref}
              aria-label="Back"
              className="pressable mr-1 flex h-10 w-10 items-center justify-center rounded-xl bg-surface-high text-ink"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
          )}
          <Logo className="h-7 w-auto text-lime" />
          <span className="font-heading text-xl font-black italic tracking-tight text-ink">
            PSK<span className="text-lime">/</span>PADEL
          </span>
        </div>
        {closeHref ? (
          <Link
            href={closeHref}
            aria-label="Close"
            className="pressable flex h-10 w-10 items-center justify-center rounded-xl bg-surface-high text-ink"
          >
            <span className="material-symbols-outlined">close</span>
          </Link>
        ) : (
          !noToggle && <ThemeToggle />
        )}
      </div>

      <h1 className="relative mt-6 font-heading text-[clamp(3.6rem,19vw,4.8rem)] font-black uppercase italic leading-[0.84] tracking-tight text-ink">
        <RiseLine text={line1} delay={0.05} />
        <RiseLine text={line2} delay={0.18} className="text-lime" />
      </h1>
      {sub && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="relative mt-3 flex items-center gap-2 text-sm text-ink-muted"
        >
          {sub}
        </motion.p>
      )}
      {children && <div className="relative mt-5">{children}</div>}
    </header>
  );
}

// Pill switch with a springing accent highlight. `id` must be unique per
// on-screen instance (it keys the shared highlight).
export function Segmented<T extends string>({
  id,
  value,
  options,
  onChange,
}: {
  id: string;
  value: T;
  options: readonly { value: T; label: React.ReactNode }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-2xl bg-surface-high p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl px-2 py-2.5 font-heading text-base font-extrabold uppercase tracking-wide transition-colors duration-300 ${
            value === o.value ? "text-on-lime" : "text-ink-muted"
          }`}
        >
          {value === o.value && (
            <motion.span
              layoutId={`seg-${id}`}
              className="absolute inset-0 rounded-xl bg-lime"
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
            />
          )}
          <span className="relative flex items-center gap-2">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
