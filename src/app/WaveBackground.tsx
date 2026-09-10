// Static backdrop for the petrol/glass material system: three soft aurora
// glows over a deep petrol ground, fixed to the viewport so every glass
// panel's backdrop-filter: saturate() has color behind it to refract instead
// of just dimming a flat ground. Glow colors are theme tokens (--color-glow-*,
// see globals.css) so they flip with the same `.light` class ThemeToggle
// already toggles on <html> — no separate light/dark component needed.
export function WaveBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 bg-bg"
      style={{
        backgroundImage: [
          "radial-gradient(68% 52% at 6% -6%, var(--color-glow-a) 0%, transparent 62%)",
          "radial-gradient(56% 44% at 98% 2%, var(--color-glow-b) 0%, transparent 64%)",
          "radial-gradient(64% 48% at 62% 104%, var(--color-glow-c) 0%, transparent 66%)",
          "radial-gradient(110% 80% at 50% 45%, var(--color-bg-2) 0%, transparent 72%)",
        ].join(", "),
        backgroundAttachment: "fixed",
      }}
    />
  );
}
