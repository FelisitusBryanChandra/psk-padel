"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteSessionButton({ sessionId, name }: { sessionId: string; name: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Delete "${name}"? This removes all its rounds and scores permanently.`)) {
      return;
    }

    setDeleting(true);
    await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      aria-label="Delete session"
      className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-live-bg/20 hover:text-live disabled:opacity-40"
    >
      <span className="material-symbols-outlined text-lg">delete</span>
    </button>
  );
}
