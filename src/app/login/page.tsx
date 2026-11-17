"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useAnimate } from "motion/react";
import { Spinner } from "@/app/Spinner";
import { Logo } from "@/app/Logo";
import { RiseLine } from "@/app/RiseLine";

const DRAW = { duration: 1.4, ease: [0.22, 1, 0.36, 1] } as const;

// Top-down padel court in accent lines that draw themselves in, with a ball
// bouncing between the service boxes.
function CourtBackdrop() {
  const line = { initial: { pathLength: 0 }, animate: { pathLength: 1 } };
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 400"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 h-full w-full text-lime opacity-[0.16]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
    >
      <motion.rect x="20" y="20" width="160" height="360" rx="2" {...line} transition={DRAW} />
      <motion.path d="M20 200 H180" strokeWidth="2.4" {...line} transition={{ ...DRAW, delay: 0.2 }} />
      <motion.path d="M20 95 H180 M20 305 H180" {...line} transition={{ ...DRAW, delay: 0.35 }} />
      <motion.path d="M100 95 V305" {...line} transition={{ ...DRAW, delay: 0.5 }} />
      <motion.circle
        r="4"
        fill="currentColor"
        stroke="none"
        initial={{ cx: 60, cy: 140, opacity: 0 }}
        animate={{ cx: [60, 140, 70, 130, 60], cy: [140, 262, 250, 150, 140], opacity: 1 }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
      />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPasscode, setShowPasscode] = useState(false);
  const [entering, setEntering] = useState(false);
  const [fieldScope, animateField] = useAnimate<HTMLDivElement>();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    });

    setLoading(false);

    if (!res.ok) {
      setError("Wrong passcode");
      animateField(fieldScope.current!, { x: [0, -14, 14, -9, 9, -4, 0] }, { duration: 0.45 });
      navigator.vibrate?.([30, 40, 30]);
      return;
    }

    // Lime wipe covers the screen, then we navigate underneath it.
    setEntering(true);
    setTimeout(() => {
      router.push(searchParams.get("from") || "/");
      router.refresh();
    }, 450);
  }

  return (
    <>
      <div className="relative flex flex-1 flex-col justify-between px-6 pb-8 pt-6">
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-auto text-lime" />
          <span className="font-heading text-xl font-black italic tracking-tight text-ink">
            PSK<span className="text-lime">/</span>PADEL
          </span>
        </div>

        <div>
          <h1 className="hl-wave w-fit font-heading text-[clamp(4rem,22vw,5.4rem)] font-black uppercase italic leading-[0.82] tracking-tight text-ink">
            <RiseLine text="STEP ON" delay={0.15} />
            <RiseLine text="COURT." delay={0.35} className="text-lime" />
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="mt-3 text-sm text-ink-muted"
          >
            Americano and Mexicano scoring for the PSK crew.
          </motion.p>

          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28, delay: 0.8 }}
            className="mt-8 flex flex-col gap-3"
          >
            <label
              htmlFor="passcode"
              className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted"
            >
              Passcode
            </label>
            <div ref={fieldScope} className="relative">
              <input
                id="passcode"
                type={showPasscode ? "text" : "password"}
                inputMode="text"
                autoFocus
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  if (error) setError("");
                }}
                placeholder="••••••"
                className={`w-full rounded-2xl border-2 bg-surface px-5 py-4 pr-14 font-heading text-3xl font-extrabold tracking-[0.3em] text-ink outline-none transition-colors duration-300 placeholder:text-ink-muted/40 ${
                  error ? "border-live" : "border-outline focus:border-lime"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPasscode((v) => !v)}
                aria-label={showPasscode ? "Hide passcode" : "Show passcode"}
                className="pressable absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-ink-muted"
              >
                <span className="material-symbols-outlined text-2xl">
                  {showPasscode ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-1.5 text-sm font-semibold text-live"
                >
                  <span className="material-symbols-outlined text-base">error</span>
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading || !passcode}
              data-magnetic
              className="shimmer-btn group mt-1 py-4! text-xl!"
            >
              {loading ? (
                <>
                  <Spinner className="text-xl" />
                  Checking
                </>
              ) : (
                <>
                  Enter
                  <span className="nudge material-symbols-outlined text-2xl">
                    arrow_forward
                  </span>
                </>
              )}
            </button>
          </motion.form>
        </div>
      </div>

      <AnimatePresence>
        {entering && (
          <motion.div
            aria-hidden="true"
            className="fixed inset-0 z-50 bg-lime"
            initial={{ clipPath: "circle(0% at 50% 90%)" }}
            animate={{ clipPath: "circle(150% at 50% 90%)" }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default function LoginPage() {
  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col overflow-hidden">
      <CourtBackdrop />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-bg via-bg/85 to-transparent"
      />
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
