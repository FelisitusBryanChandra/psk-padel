"use client";

import { AnimatePresence, motion } from "motion/react";
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
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={loading ? undefined : onCancel}
        >
          <motion.div
            className="glass-strong w-full max-w-sm rounded-3xl p-6"
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-heading text-2xl font-extrabold uppercase text-ink">{title}</h3>
            <p className="mt-2 text-sm text-ink-muted">{message}</p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={onCancel}
                disabled={loading}
                className="pressable flex-1 rounded-xl bg-surface-highest py-3 text-sm font-semibold text-ink disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className="pressable flex flex-1 items-center justify-center gap-2 rounded-xl bg-live py-3 text-sm font-bold text-white disabled:opacity-70"
              >
                {loading && <Spinner className="text-base" />}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
