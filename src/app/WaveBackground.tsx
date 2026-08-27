// Decorative wave backdrop, modeled on loading.io's "m-wave" pattern: several
// tiled SVG layers in the brand accent color (lime), scrolling continuously
// at different speeds/opacities for depth. Colors are pulled from the same
// --color-lime CSS custom property the rest of the app uses, so light/dark
// mode need no separate palette — only opacity is varied per layer. Bands
// are centered vertically (not bottom-anchored) so they sit clear of the
// fixed bottom nav.
const WAVE_PATH =
  "M0,120 C150,60 350,180 600,120 C850,60 1050,180 1200,120 L1200,240 L0,240 Z";

const LAYERS = [
  { height: 420, centerY: -40, opacity: 20, duration: 26, reverse: false },
  { height: 320, centerY: 10, opacity: 30, duration: 18, reverse: true },
  { height: 220, centerY: 60, opacity: 42, duration: 12, reverse: false },
];

export function WaveBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
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
