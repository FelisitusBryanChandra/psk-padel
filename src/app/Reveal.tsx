"use client";

import { motion } from "motion/react";

// Card entrance on scroll: rises, untilts and settles the first time it
// scrolls into view (and on load for whatever is already on screen).
// Alternating tilt direction keeps a list from feeling mechanical.
export function Reveal({
  children,
  index = 0,
  className,
}: {
  children: React.ReactNode;
  index?: number;
  className?: string;
}) {
  const tilt = index % 2 === 0 ? -1.5 : 1.5;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 32, scale: 0.95, rotate: tilt }}
      whileInView={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 24,
        delay: Math.min(index, 4) * 0.05,
      }}
    >
      {children}
    </motion.div>
  );
}
