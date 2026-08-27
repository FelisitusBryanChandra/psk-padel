// Decorative wave backdrop, modeled on loading.io's "m-wave" pattern: several
// tiled SVG layers in the brand accent color (lime), scrolling continuously
// at different speeds/opacities for depth. Colors are pulled from the same
// --color-lime CSS custom property the rest of the app uses, so light/dark
// mode need no separate palette — only opacity is varied per layer.
//
// Each layer fades out at its own top/bottom edge (mask-image) rather than
// having a hard box boundary — without that, wherever a layer's edge landed
// on the page showed up as a visible seam. The whole thing is also blurred:
// session cards use `.glass`, whose `backdrop-filter: saturate(1.4)` amplifies
// whatever's directly behind a card, so a crisp, high-contrast wave shape
// read as blotchy/oversaturated depending on scroll position. Blurring the
// source softens that interaction instead of fighting it.
const WAVE_PATH =
  "M0,120 C150,60 350,180 600,120 C850,60 1050,180 1200,120 L1200,240 L0,240 Z";

const EDGE_FADE = "linear-gradient(to bottom, transparent 0%, black 35%, black 65%, transparent 100%)";

const LAYERS = [
  { height: 480, centerY: -30, opacity: 8, duration: 30, reverse: false },
  { height: 380, centerY: 20, opacity: 11, duration: 21, reverse: true },
  { height: 280, centerY: 70, opacity: 15, duration: 14, reverse: false },
];

export function WaveBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden blur-3xl"
    >
      {LAYERS.map((layer, i) => (
        <svg
          key={i}
          className="wave-layer absolute left-0 w-[200%]"
          style={{
            height: layer.height,
            top: `calc(50% + ${layer.centerY}px - ${layer.height / 2}px)`,
            animationDuration: `${layer.duration}s`,
            animationDirection: layer.reverse ? "reverse" : "normal",
            maskImage: EDGE_FADE,
            WebkitMaskImage: EDGE_FADE,
          }}
          viewBox="0 0 2400 240"
          preserveAspectRatio="none"
        >
          <path
            d={WAVE_PATH}
            style={{ fill: `color-mix(in srgb, var(--color-lime) ${layer.opacity}%, transparent)` }}
          />
          <path
            d={WAVE_PATH}
            transform="translate(1200,0)"
            style={{ fill: `color-mix(in srgb, var(--color-lime) ${layer.opacity}%, transparent)` }}
          />
        </svg>
      ))}
    </div>
  );
}
