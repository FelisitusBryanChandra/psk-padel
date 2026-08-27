// Decorative wave backdrop, modeled on loading.io's "m-wave" pattern: several
// tiled SVG layers in the brand accent color (lime), scrolling continuously
// at different speeds/opacities for depth. Colors are pulled from the same
// --color-lime CSS custom property the rest of the app uses, so light/dark
// mode need no separate palette — only opacity is varied per layer.
const WAVE_PATH =
  "M0,120 C150,60 350,180 600,120 C850,60 1050,180 1200,120 L1200,240 L0,240 Z";

const LAYERS = [
  { height: 180, opacity: 14, duration: 26, reverse: false, offsetY: 0 },
  { height: 150, opacity: 20, duration: 18, reverse: true, offsetY: 20 },
  { height: 120, opacity: 28, duration: 12, reverse: false, offsetY: 40 },
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
          className="wave-layer absolute bottom-0 left-0 w-[200%]"
          style={{
            height: layer.height,
            animationDuration: `${layer.duration}s`,
            animationDirection: layer.reverse ? "reverse" : "normal",
          }}
          viewBox="0 0 2400 240"
          preserveAspectRatio="none"
        >
          <path
            d={WAVE_PATH}
            transform={`translate(0,${layer.offsetY})`}
            style={{ fill: `color-mix(in srgb, var(--color-lime) ${layer.opacity}%, transparent)` }}
          />
          <path
            d={WAVE_PATH}
            transform={`translate(1200,${layer.offsetY})`}
            style={{ fill: `color-mix(in srgb, var(--color-lime) ${layer.opacity}%, transparent)` }}
          />
        </svg>
      ))}
    </div>
  );
}
