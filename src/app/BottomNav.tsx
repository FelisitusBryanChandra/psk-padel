"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/profile", label: "Profile", icon: "person" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="glass-strong fixed bottom-0 left-1/2 z-20 flex w-full max-w-md -translate-x-1/2 items-center justify-around px-5 py-3 md:max-w-xl lg:max-w-2xl">
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-1 text-xs font-bold transition-colors ${
              active ? "text-lime" : "text-ink-muted"
            }`}
          >
            <span className="material-symbols-outlined text-2xl">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
