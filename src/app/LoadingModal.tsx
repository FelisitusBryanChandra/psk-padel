"use client";

import { useEffect, useState } from "react";

const DEFAULT_MESSAGES = ["SYNCING DATA...", "CALIBRATING GRID...", "UPDATING BRACKETS..."];

export function LoadingModal({
  open,
  messages = DEFAULT_MESSAGES,
  subMessage = "Preparing your tournament experience",
  progress,
  onCancel,
}: {
  open: boolean;
  messages?: string[];
  subMessage?: string;
  progress?: number;
  onCancel?: () => void;
}) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!open || messages.length < 2) return;
    setMessageIndex(0);
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % messages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [open, messages]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/40 px-6 backdrop-blur-sm">
      <div className="loading-modal-entrance relative w-full max-w-md overflow-hidden rounded-[32px] border border-white/10 bg-surface/60 p-8 text-center shadow-2xl backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-0 rounded-[32px] ring-1 ring-inset ring-white/5" />

        <div className="relative mb-6 flex h-48 w-full items-center justify-center">
          <div className="absolute h-32 w-32 rounded-full bg-lime/15 blur-[64px]" />
          <div className="relative flex h-32 w-32 items-center justify-center">
            <div className="loading-ring absolute inset-0 rounded-full border border-lime/20" />
            <div className="loading-ring loading-ring-delay-1 absolute inset-2 rounded-full border border-lime/30" />
            <div className="loading-ring loading-ring-delay-2 absolute inset-4 rounded-full border border-lime/40" />
            <div className="absolute h-16 w-16 animate-spin rounded-full border-t-2 border-r-2 border-lime" />
            <div className="absolute h-1.5 w-1.5 rounded-full bg-lime shadow-[0_0_8px_#caf300]" />
          </div>
        </div>

        <h1 className="mb-4 font-heading text-3xl font-black uppercase tracking-tighter text-lime">
          PSK Padel
        </h1>

        <div className="mb-8 flex flex-col gap-2">
          <p className="animate-pulse text-xs font-black uppercase tracking-[0.2em] text-ink-muted">
            {messages[messageIndex]}
          </p>
          {subMessage && <p className="text-sm text-ink/60">{subMessage}</p>}
        </div>

        <div className="relative mb-8 h-1 w-full overflow-hidden rounded-full bg-white/5">
          {progress === undefined ? (
            <div className="loading-progress-indeterminate h-full w-2/5 rounded-full bg-gradient-to-r from-lime-dim/80 to-lime shadow-[0_0_15px_rgba(202,243,0,0.3)]" />
          ) : (
            <div
              className="h-full rounded-full bg-gradient-to-r from-lime-dim/80 to-lime shadow-[0_0_15px_rgba(202,243,0,0.3)] transition-[width] duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          )}
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            className="rounded-full border border-white/10 px-6 py-2 text-xs font-black uppercase tracking-widest text-ink-muted transition-colors hover:border-white/20 hover:text-ink active:scale-95"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
