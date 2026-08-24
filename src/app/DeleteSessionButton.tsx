"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmModal } from "./ConfirmModal";

export function DeleteSessionButton({
  sessionId,
  name,
  onDeleted,
}: {
  sessionId: string;
  name: string;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  function openConfirm(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setConfirming(true);
  }

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
    setDeleting(false);
    setConfirming(false);
    onDeleted?.();
    router.refresh();
  }

  return (
    <>
      <button
        onClick={openConfirm}
        disabled={deleting}
        aria-label="Delete session"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-live-bg/20 hover:text-live disabled:opacity-40"
      >
        <span className="material-symbols-outlined text-lg">delete</span>
      </button>
      <ConfirmModal
        open={confirming}
        title="Delete session?"
        message={`Delete "${name}"? This removes all its rounds and scores permanently.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
