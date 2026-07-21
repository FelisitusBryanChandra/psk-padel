"use client";

import { Spinner } from "@/app/Spinner";

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6"
      onClick={loading ? undefined : onCancel}
    >
      <div
        className="glass-strong w-full max-w-sm rounded-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-heading text-lg font-black text-ink">{title}</h3>
        <p className="mt-2 text-sm text-ink-muted">{message}</p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="neu-raised flex-1 rounded-xl py-3 text-xs font-black uppercase tracking-widest text-ink-muted transition-shadow active:shadow-none disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-live py-3 text-xs font-black uppercase tracking-widest text-white active:scale-95 transition-transform disabled:opacity-70"
          >
            {loading && <Spinner className="text-base" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
