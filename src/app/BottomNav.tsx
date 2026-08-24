"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const SIDE_ITEMS = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/profile", label: "Profile", icon: "person" },
] as const;

const DIAL_OPTIONS = [
  {
    href: "/schedule?mode=import",
    label: "Import",
    icon: "content_paste",
  },
  {
    href: "/session/new",
    label: "Manual",
    icon: "edit",
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [dialOpen, setDialOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Tapping anywhere outside the dial closes it — there's no dark backdrop
  // to catch the click for us like the old bottom sheet had.
  useEffect(() => {
    if (!dialOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setDialOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [dialOpen]);

  function goTo(href: string) {
    setDialOpen(false);
    router.push(href);
  }

  return (
    <nav className="glass-strong fixed bottom-0 left-1/2 z-20 flex w-full max-w-md -translate-x-1/2 items-center justify-around px-5 pb-3 pt-4 md:max-w-xl lg:max-w-2xl">
      <Link
        href={SIDE_ITEMS[0].href}
        className={`flex flex-col items-center gap-1 text-xs font-bold transition-colors ${
          pathname === SIDE_ITEMS[0].href ? "text-lime" : "text-ink-muted"
        }`}
      >
        <span className="material-symbols-outlined text-2xl">{SIDE_ITEMS[0].icon}</span>
        {SIDE_ITEMS[0].label}
      </Link>

      <div ref={wrapperRef} className="relative">
        <div
          className={`absolute bottom-full left-1/2 mb-4 flex -translate-x-1/2 gap-8 transition-all duration-200 ${
            dialOpen
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-2 opacity-0"
          }`}
        >
          {DIAL_OPTIONS.map((opt) => (
            <button
              key={opt.href}
              onClick={() => goTo(opt.href)}
              className="flex flex-col items-center gap-1.5"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-lime text-on-lime shadow-lg transition-transform active:scale-90">
                <span className="material-symbols-outlined text-xl">{opt.icon}</span>
              </span>
              <span className="text-[10px] font-bold text-ink">{opt.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => setDialOpen((v) => !v)}
          aria-label={dialOpen ? "Close" : "New session"}
          aria-expanded={dialOpen}
          className="-mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-lime text-on-lime shadow-lg transition-transform active:scale-95"
        >
          <span
            className="material-symbols-outlined text-3xl transition-transform duration-200"
            style={{ transform: dialOpen ? "rotate(45deg)" : "rotate(0deg)" }}
          >
            add
          </span>
        </button>
      </div>

      <Link
        href={SIDE_ITEMS[1].href}
        className={`flex flex-col items-center gap-1 text-xs font-bold transition-colors ${
          pathname === SIDE_ITEMS[1].href ? "text-lime" : "text-ink-muted"
        }`}
      >
        <span className="material-symbols-outlined text-2xl">{SIDE_ITEMS[1].icon}</span>
        {SIDE_ITEMS[1].label}
      </Link>
    </nav>
  );
}
