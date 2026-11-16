"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";

const ITEMS = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/history", label: "History", icon: "history" },
  { href: "/session/start", label: "New", icon: "add" },
  { href: "/settings", label: "Settings", icon: "settings" },
  { href: "/profile", label: "Profile", icon: "person" },
] as const;

// Mobile counterpart to SideNav -- same 5 destinations, with New raised as
// the center accent button. The active item's highlight springs in on each
// page instead of just appearing.
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="nav-pill fixed bottom-4 left-1/2 z-20 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between rounded-[22px] px-3 py-2 md:hidden">
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        if (item.href === "/session/start") {
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className="pressable -mt-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-lime text-on-lime shadow-[0_10px_30px_-8px_var(--color-lime)]"
            >
              <span className="material-symbols-outlined text-3xl">{item.icon}</span>
            </Link>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`pressable relative isolate flex w-14 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-semibold transition-colors duration-300 ${
              active ? "text-lime" : "text-ink-muted"
            }`}
          >
            {active && (
              <motion.span
                layoutId="bottom-nav-active"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 -z-10 rounded-2xl bg-surface-highest"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
            <span
              className="material-symbols-outlined text-2xl"
              style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
