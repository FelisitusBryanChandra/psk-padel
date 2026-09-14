"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/session/start", label: "New", icon: "add_circle" },
  { href: "/history", label: "History", icon: "history" },
  { href: "/profile", label: "Profile", icon: "person" },
  { href: "/settings", label: "Settings", icon: "settings" },
] as const;

// Mobile counterpart to SideNav -- same 5 destinations (New Session routes
// through /session/start's import-vs-manual picker rather than straight to
// the manual form), laid out as one flat justify-between row so every item
// gets the same gap and the row's own edge padding is symmetric left/right.
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="glass-strong fixed bottom-0 left-1/2 z-20 flex w-full max-w-md -translate-x-1/2 items-center justify-between px-6 pb-3 pt-4 md:hidden">
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
