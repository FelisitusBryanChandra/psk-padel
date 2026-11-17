"use client";

import { useEffect, useRef } from "react";

// Desktop-only pointer effects, wired once for the whole app:
//  - "court lights": a lime glow plus a finer court grid revealed around
//    the cursor (the .court-lights layer, see globals.css);
//  - magnetic pull: any [data-magnetic] element leans toward the cursor.
// Touch devices and reduced-motion users get neither.
export function PointerFX() {
  const lightsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lights = lightsRef.current;
    let frame = 0;
    let last: PointerEvent | null = null;
    let magnet: HTMLElement | null = null;

    function apply() {
      frame = 0;
      const e = last;
      if (!e) return;
      if (lights) {
        lights.style.setProperty("--mx", `${e.clientX}px`);
        lights.style.setProperty("--my", `${e.clientY}px`);
        lights.classList.add("on");
      }
      if (reduced) return;
      const el = (e.target as Element | null)?.closest<HTMLElement>("[data-magnetic]") ?? null;
      if (magnet && magnet !== el) magnet.style.translate = "";
      magnet = el;
      if (el) {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        // Proportional pull, capped so wide buttons don't drift far.
        const tx = Math.max(-8, Math.min(8, dx * 0.18));
        const ty = Math.max(-5, Math.min(5, dy * 0.28));
        el.style.translate = `${tx.toFixed(1)}px ${ty.toFixed(1)}px`;
      }
    }

    function onMove(e: PointerEvent) {
      if (e.pointerType !== "mouse") return;
      last = e;
      if (!frame) frame = requestAnimationFrame(apply);
    }

    function onLeave() {
      lights?.classList.remove("on");
      if (magnet) magnet.style.translate = "";
      magnet = null;
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return <div ref={lightsRef} aria-hidden="true" className="court-lights" />;
}
