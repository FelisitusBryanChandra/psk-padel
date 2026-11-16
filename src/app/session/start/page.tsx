"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { PageHero } from "@/app/PageHero";

const OPTIONS = [
  {
    href: "/session/new",
    icon: "edit",
    accent: true,
    kicker: "From scratch",
    title: "Enter manually",
    subtitle: "Fill in every session detail yourself.",
  },
  {
    href: "/schedule?mode=import",
    icon: "content_paste",
    accent: false,
    kicker: "Fastest",
    title: "Import schedule",
    subtitle: "Paste a WhatsApp schedule message and we'll fill in the players.",
  },
] as const;

// Landing screen for the bottom nav's "New Session" action -- picks between
// the two ways to start a session before handing off to whichever flow.
export default function SessionStartPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-24 pt-4 md:max-w-xl lg:max-w-2xl">
      <PageHero
        line1="New"
        line2="Session."
        ghost="START"
        backHref="/"
        sub="Pick how you want to start. You can fine-tune everything before round one."
      />

      <div className="flex flex-col gap-3">
        {OPTIONS.map((opt, i) => (
          <motion.div
            key={opt.href}
            initial={{ opacity: 0, y: 24, rotate: i ? 2 : -2 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24, delay: 0.3 + i * 0.1 }}
            whileTap={{ scale: 0.97 }}
          >
            <Link
              href={opt.href}
              className={`relative flex min-h-40 flex-col justify-between overflow-hidden rounded-[28px] p-5 ${
                opt.accent ? "bg-lime text-on-lime" : "border-2 border-outline bg-surface text-ink"
              }`}
            >
              {opt.accent && <span aria-hidden="true" className="card-sweep" />}
              <span
                aria-hidden="true"
                className="material-symbols-outlined pointer-events-none absolute -bottom-6 -right-4 text-[8rem] opacity-15"
              >
                {opt.icon}
              </span>
              <div className="flex items-center justify-between">
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
                    opt.accent ? "bg-on-lime/15" : "bg-surface-highest text-lime"
                  }`}
                >
                  {opt.kicker}
                </span>
                <span className="material-symbols-outlined text-3xl">arrow_forward</span>
              </div>
              <div className="mt-8">
                <h2 className="font-heading text-4xl font-black uppercase italic leading-none">
                  {opt.title}
                </h2>
                <p className={`mt-2 max-w-[16rem] text-sm ${opt.accent ? "opacity-75" : "text-ink-muted"}`}>
                  {opt.subtitle}
                </p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </main>
  );
}
