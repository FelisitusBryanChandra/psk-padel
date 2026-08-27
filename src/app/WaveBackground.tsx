// Decorative, theme-reactive wave backdrop — three tiled SVG layers scroll
// at different speeds for depth. Colors use theme tokens (ink/lime/lime-dim)
// with low opacity so it reads correctly in both light and dark without a
// separate palette per theme.
const WAVE_PATH =
  "M0,100 C150,40 350,160 600,100 C850,40 1050,160 1200,100 L1200,200 L0,200 Z";

export function WaveBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <svg
        className="wave-layer absolute bottom-0 left-0 h-36 w-[200%] fill-ink/[0.05] [animation-duration:32s]"
        viewBox="0 0 2400 200"
        preserveAspectRatio="none"
      >
        <path d={WAVE_PATH} />
        <path d={WAVE_PATH} transform="translate(1200,0)" />
      </svg>
      <svg
        className="wave-layer absolute bottom-0 left-0 h-28 w-[200%] fill-lime/[0.10] [animation-direction:reverse] [animation-duration:22s]"
        viewBox="0 0 2400 200"
        preserveAspectRatio="none"
      >
        <path d={WAVE_PATH} transform="translate(0,20)" />
        <path d={WAVE_PATH} transform="translate(1200,20)" />
      </svg>
      <svg
        className="wave-layer absolute bottom-0 left-0 h-20 w-[200%] fill-lime-dim/[0.08] [animation-duration:15s]"
        viewBox="0 0 2400 200"
        preserveAspectRatio="none"
      >
        <path d={WAVE_PATH} transform="translate(0,40)" />
        <path d={WAVE_PATH} transform="translate(1200,40)" />
      </svg>
    </div>
  );
}
