"use client";

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-outline bg-surface-high p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-heading text-lg font-black text-ink">{title}</h3>
        <p className="mt-2 text-sm text-ink-muted">{message}</p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-outline py-3 text-xs font-black uppercase tracking-widest text-ink-muted active:scale-95 transition-transform"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-live py-3 text-xs font-black uppercase tracking-widest text-white active:scale-95 transition-transform"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
