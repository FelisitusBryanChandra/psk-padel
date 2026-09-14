"use client";

import Link from "next/link";
import { ThemeToggle } from "@/app/ThemeToggle";

const OPTIONS = [
  {
    href: "/schedule?mode=import",
    icon: "content_paste",
    iconClassName: "bg-accent-blue/15 text-accent-blue",
    title: "Import from schedule",
    subtitle: "Paste a WhatsApp schedule message and we'll fill in the players for you.",
  },
  {
    href: "/session/new",
    icon: "edit",
    iconClassName: "bg-lime/15 text-lime",
    title: "Enter manually",
    subtitle: "Fill in every session detail yourself, from scratch.",
  },
] as const;

// Landing screen for the bottom nav's "New Session" action -- picks between
// the two ways to start a session before handing off to whichever flow.
export default function SessionStartPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-24 pt-4 md:max-w-xl lg:max-w-2xl">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="material-symbols-outlined text-ink">
            arrow_back
          </Link>
          <h1 className="font-heading text-2xl font-black tracking-tight text-ink">
            New Session
          </h1>
        </div>
        <ThemeToggle />
      </header>

      <section className="glass-strong rounded-3xl p-6">
        <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-lime/15 px-3 py-1 text-xs font-black uppercase tracking-widest text-lime">
          <span className="material-symbols-outlined text-sm">bolt</span>
          Quick start
        </span>
        <h2 className="font-heading text-2xl font-black text-ink">How do you want to start?</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Pick whichever is faster — you can always fine-tune the details before the first round.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {OPTIONS.map((opt) => (
            <Link
              key={opt.href}
              href={opt.href}
              className="glass flex items-center gap-4 rounded-2xl p-4 transition-transform active:scale-[0.98]"
            >
              <span
                className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${opt.iconClassName}`}
              >
                <span className="material-symbols-outlined text-2xl">{opt.icon}</span>
              </span>
              <span className="flex-1">
                <span className="block font-heading text-base font-bold text-ink">
                  {opt.title}
                </span>
                <span className="mt-0.5 block text-xs text-ink-muted">{opt.subtitle}</span>
              </span>
              <span className="material-symbols-outlined text-ink-muted">chevron_right</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
