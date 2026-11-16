"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

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
      className="pressable relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-surface-high text-ink"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={light ? "dark" : "light"}
          initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 90, scale: 0.4, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 22 }}
          className="material-symbols-outlined text-xl"
        >
          {light ? "dark_mode" : "light_mode"}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
