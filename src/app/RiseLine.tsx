"use client";

import { motion } from "motion/react";

// One headline line whose letters spring up from below a clipped baseline.
export function RiseLine({ text, delay, className }: { text: string; delay: number; className?: string }) {
  return (
    <span className={`block overflow-hidden pb-1 ${className ?? ""}`} aria-label={text}>
      {Array.from(text).map((ch, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          className="hl-ch inline-block"
          style={{ "--i": i } as React.CSSProperties}
          initial={{ y: "105%", rotate: 8 }}
          animate={{ y: 0, rotate: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 26, delay: delay + i * 0.035 }}
        >
          {ch === " " ? " " : ch}
        </motion.span>
      ))}
    </span>
  );
}
