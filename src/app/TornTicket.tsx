"use client";

import { useAnimate, useInView, useReducedMotion } from "motion/react";
import { useEffect } from "react";

// How deep the ripped edge's teeth reach, in px. The stub overlaps the body
// by this much so the two jagged edges interlock and read as one whole
// ticket until the tear plays.
const JAG = 9;
const TEETH: [number, number][] = [
  [0, 0], [6, 7], [0, 13], [8, 21], [2, 28], [7, 36], [0, 44], [5, 52],
  [9, 60], [1, 68], [7, 77], [0, 85], [6, 93], [0, 100],
];

const BODY_CLIP = `polygon(0 0, ${TEETH.map(([d, y]) => `calc(100% - ${d}px) ${y}%`).join(", ")}, 0 100%)`;
const STUB_CLIP = `polygon(${[...TEETH].reverse().map(([d, y]) => `${JAG - d}px ${y}%`).join(", ")}, 100% 0, 100% 100%)`;

// A finished-session ticket: the body plus a stub that rips off the first
// time the card scrolls into view.
export function TornTicket({
  body,
  stub,
  stubWidth = 76,
  radius = 24,
  bodyClassName = "",
  stubClassName = "",
}: {
  body: React.ReactNode;
  stub: React.ReactNode;
  stubWidth?: number;
  radius?: number;
  bodyClassName?: string;
  stubClassName?: string;
}) {
  const [scope, animate] = useAnimate();
  const inView = useInView(scope, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      animate(".tt-stub", { x: 8, y: 6, rotate: 4 }, { duration: 0 });
      animate(".tt-spark", { opacity: 0 }, { duration: 0 });
      animate(".tt-stamp", { opacity: 0.9, scale: 1 }, { duration: 0 });
      return;
    }
    (async () => {
      await animate(".tt-stub", { x: [0, 1.5, -1, 1, 0] }, { duration: 0.22, delay: 0.15 });
      animate(".tt-spark", { scaleY: [0, 1], opacity: [1, 1, 0] }, { duration: 0.5, ease: "easeOut" });
      animate(
        ".tt-stub",
        { rotate: [0, 9, 4], x: [0, 3, 8], y: [0, -3, 6] },
        { duration: 0.75, times: [0, 0.45, 1], ease: [0.22, 1.4, 0.36, 1] }
      );
      await animate(".tt-body", { x: [0, -3, 0] }, { duration: 0.35, delay: 0.25 });
      animate(".tt-stamp", { opacity: [0, 0.9], scale: [1.7, 1] }, { type: "spring", stiffness: 520, damping: 18 });
    })();
  }, [inView, reduce, animate]);

  return (
    <div ref={scope} className="torn-ticket relative flex items-stretch pr-2">
      <div
        className={`tt-body relative min-w-0 flex-1 ${bodyClassName}`}
        style={{ clipPath: BODY_CLIP, borderRadius: `${radius}px 0 0 ${radius}px` }}
      >
        {body}
      </div>
      <div
        className={`tt-stub relative shrink-0 ${stubClassName}`}
        style={{
          width: stubWidth,
          marginLeft: -JAG,
          paddingLeft: JAG,
          clipPath: STUB_CLIP,
          borderRadius: `0 ${radius}px ${radius}px 0`,
          transformOrigin: "0% 100%",
        }}
      >
        {stub}
      </div>
      <span
        aria-hidden="true"
        className="tt-spark pointer-events-none absolute top-0 bottom-0 w-[3px] rounded-full bg-lime opacity-0"
        style={{
          right: stubWidth + 8 - JAG / 2 - 1.5,
          transformOrigin: "top",
          boxShadow: "0 0 10px 2px var(--color-lime)",
        }}
      />
    </div>
  );
}

// The PLAYED punch-stamp; stays hidden until the tear finishes.
export function PlayedStamp() {
  return (
    <span
      className="tt-stamp inline-block -rotate-[8deg] rounded-md border-2 border-lime px-1.5 py-px font-heading text-sm font-black tracking-[0.12em] text-lime opacity-0"
    >
      PLAYED
    </span>
  );
}
