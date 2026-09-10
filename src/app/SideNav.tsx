"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/session/new", label: "New session", icon: "add_circle" },
  { href: "/history", label: "History", icon: "history" },
  { href: "/profile", label: "Profile", icon: "person" },
  { href: "/settings", label: "Settings", icon: "settings" },
] as const;

// Desktop-only counterpart to BottomNav: a sticky rail in the gutter beside
// the centered content column (pages stay `mx-auto max-w-*`, so this floats
// in the empty space to the left rather than reflowing anything).
export function SideNav() {
  const pathname = usePathname();

  return (
    <nav className="glass fixed left-6 top-24 z-20 hidden w-56 flex-col gap-1 rounded-2xl p-3 md:flex">
      <div className="px-3 pb-2 pt-1 text-[11px] font-black uppercase tracking-widest text-ink-muted">
        Navigate
      </div>
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
              active ? "neu-inset-sm text-ink" : "text-ink-muted"
            }`}
          >
            <span className="material-symbols-outlined text-xl">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
