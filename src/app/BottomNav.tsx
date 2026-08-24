"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const SIDE_ITEMS = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/profile", label: "Profile", icon: "person" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);

  function goTo(href: string) {
    setSheetOpen(false);
    router.push(href);
  }

  return (
    <>
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

        <button
          onClick={() => setSheetOpen(true)}
          aria-label="New session"
          className="-mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-lime text-on-lime shadow-lg transition-transform active:scale-95"
        >
          <span className="material-symbols-outlined text-3xl">add</span>
        </button>

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

      {sheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70"
          onClick={() => setSheetOpen(false)}
        >
          <div
            className="glass-strong w-full max-w-md rounded-t-2xl p-6 pb-8 md:max-w-xl lg:max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 font-heading text-lg font-black text-ink">New Session</h3>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => goTo("/schedule?mode=import")}
                className="neu-raised flex items-center gap-3 rounded-xl p-4 text-left transition-shadow active:shadow-none"
              >
                <span className="material-symbols-outlined text-2xl text-lime">content_paste</span>
                <span>
                  <span className="block text-sm font-bold text-ink">Import Player List</span>
                  <span className="block text-xs text-ink-muted">
                    Paste a numbered list of names
                  </span>
                </span>
              </button>
              <button
                onClick={() => goTo("/session/new")}
                className="neu-raised flex items-center gap-3 rounded-xl p-4 text-left transition-shadow active:shadow-none"
              >
                <span className="material-symbols-outlined text-2xl text-lime">edit</span>
                <span>
                  <span className="block text-sm font-bold text-ink">Create Manually</span>
                  <span className="block text-xs text-ink-muted">Fill in the details yourself</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
