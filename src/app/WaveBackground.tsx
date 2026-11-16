// Court Night backdrop: a flat near-black ground with one faint accent glow
// at the top and a barely-there court-line grid. The glow is the
// --color-glow-a token, so it follows the accent and light/dark themes.
export function WaveBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 bg-bg"
      style={{
        backgroundImage: [
          "radial-gradient(90% 45% at 50% -10%, var(--color-glow-a) 0%, transparent 70%)",
          "linear-gradient(var(--color-outline) 1px, transparent 1px)",
          "linear-gradient(90deg, var(--color-outline) 1px, transparent 1px)",
        ].join(", "),
        backgroundSize: "100% 100%, 100% 33.333vh, 50vw 100%",
        backgroundPosition: "0 0, 0 0, -1px 0",
        maskImage: "linear-gradient(to bottom, black 0%, transparent 85%)",
        WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 85%)",
      }}
    />
  );
}
