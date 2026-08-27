"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "@/app/Spinner";
import { Logo } from "@/app/Logo";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      return;
    }

    router.push(searchParams.get("from") || "/");
    router.refresh();
  }

  return (
    <div className="glass-strong w-full max-w-sm rounded-3xl p-8">
      <header className="mb-10 flex flex-col items-center text-center">
        <Logo className="mb-3 h-16 w-auto text-lime" />
        <h1 className="font-heading text-3xl font-black italic uppercase tracking-tight text-ink">
          PSK Padel
        </h1>
        <p className="mt-2 text-xs font-black uppercase tracking-[0.2em] text-ink-muted/60">
          Championship Access
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="text-center text-xs font-black uppercase tracking-[0.2em] text-lime-dim">
          Enter Secure Passcode
        </label>
        <input
          type="password"
          inputMode="text"
          autoFocus
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="Passcode"
          className="neu-inset w-full rounded-xl border border-white/5 px-4 py-4 text-center text-lg text-ink outline-none transition-colors focus:border-lime"
        />

        {error && <p className="text-center text-sm text-live">{error}</p>}

        <button
          type="submit"
          disabled={loading || !passcode}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-lime px-4 py-4 text-lg font-black text-on-lime shadow-[0_0_30px_rgba(202,243,0,0.25)] transition-transform active:scale-95 disabled:opacity-40 disabled:shadow-none"
        >
          {loading ? (
            <>
              <Spinner className="text-xl" />
              Checking...
            </>
          ) : (
            <>
              Enter Gate
              <span className="material-symbols-outlined text-xl">arrow_forward</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6">
      <div className="pointer-events-none absolute -left-[10%] -top-[10%] h-[40%] w-[40%] rounded-full bg-lime/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-[10%] -right-[10%] h-[40%] w-[40%] rounded-full bg-lime-dim/5 blur-[120px]" />
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
