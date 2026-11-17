"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";

const SPRING = { stiffness: 220, damping: 22, mass: 0.6 };

// Wraps a card so it tilts toward a mouse cursor in 3D with a soft glare
// following it. Spring-driven, so it glides after the cursor and eases back
// on leave. Mouse only: touch input is ignored, so swipes and taps on
// phones behave exactly as before.
export function Tilt({
  children,
  className = "",
  max = 7,
  lift = true,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
  lift?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Pointer position across the card, 0..1 on each axis; 0.5 = centered.
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const hover = useMotionValue(0);

  const sx = useSpring(px, SPRING);
  const sy = useSpring(py, SPRING);
  const sh = useSpring(hover, SPRING);

  const rotateY = useTransform(sx, [0, 1], [-max, max]);
  const rotateX = useTransform(sy, [0, 1], [max, -max]);
  const y = useTransform(sh, [0, 1], [0, lift ? -3 : 0]);
  const glareX = useTransform(sx, (v) => `${(v * 100).toFixed(1)}%`);
  const glareY = useTransform(sy, (v) => `${(v * 100).toFixed(1)}%`);
  const glareOpacity = useTransform(sh, [0, 1], [0, 1]);

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    px.set(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
    py.set(Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)));
    hover.set(1);
  }

  function onLeave() {
    px.set(0.5);
    py.set(0.5);
    hover.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ rotateX, rotateY, y, transformPerspective: 900 }}
      className={`tilt-wrap relative ${className}`}
    >
      {children}
      <motion.span
        aria-hidden="true"
        className="tilt-glare"
        style={{ opacity: glareOpacity, "--gx": glareX, "--gy": glareY } as never}
      />
    </motion.div>
  );
}
