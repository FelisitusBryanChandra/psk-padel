"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Spinner } from "@/app/Spinner";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="pressable flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-live/40 font-heading text-lg font-extrabold uppercase tracking-wide text-live disabled:opacity-40"
    >
      {loading ? (
        <Spinner className="text-xl" />
      ) : (
        <span className="material-symbols-outlined text-xl">logout</span>
      )}
      Log Out
    </button>
  );
}
