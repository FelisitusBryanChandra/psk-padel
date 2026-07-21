"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.classList.contains("light"));
  }, []);

  function toggle() {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    localStorage.setItem("theme", next ? "light" : "dark");
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="neu-raised flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-shadow active:shadow-none"
    >
      <span className="material-symbols-outlined text-lg">
        {light ? "dark_mode" : "light_mode"}
      </span>
    </button>
  );
}
