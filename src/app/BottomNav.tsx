"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/history", label: "History", icon: "history" },
  { href: "/session/start", label: "New", icon: "add_circle" },
  { href: "/settings", label: "Settings", icon: "settings" },
  { href: "/profile", label: "Profile", icon: "person" },
] as const;

// Mobile counterpart to SideNav -- same 5 destinations (New Session routes
// through /session/start's import-vs-manual picker rather than straight to
// the manual form), reordered so New sits dead center of the row rather
// than matching SideNav's order. Laid out as one flat justify-between row
// so every item gets the same gap and the row's own edge padding is
// symmetric left/right. Floats as a fully-rounded pill inset from the
// screen edges (iOS-style quick-action bar) rather than a flush,
// edge-to-edge bar.
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="glass-strong fixed bottom-4 left-1/2 z-20 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between rounded-full px-6 py-3 shadow-lg md:hidden">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex flex-col items-center gap-1 text-xs font-bold transition-colors ${
            pathname === item.href ? "text-lime" : "text-ink-muted"
          }`}
        >
          <span className="material-symbols-outlined text-2xl">{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
