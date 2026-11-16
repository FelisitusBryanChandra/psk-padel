// Odometer-style number: each digit is a 0-9 strip slid into place with a
// spring (.roll/.roll-col in globals.css). Columns are keyed from the right,
// so going 9 -> 10 adds a column on the left instead of re-rolling the ones.
const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function RollingNumber({ value, className = "" }: { value: number; className?: string }) {
  const digits = String(Math.max(0, Math.trunc(value))).split("");
  return (
    <span className={`roll ${className}`} aria-label={String(value)} role="img">
      {digits.map((d, i) => (
        <span
          key={digits.length - i}
          className="roll-col"
          style={{ transform: `translateY(${-Number(d)}em)` }}
          aria-hidden="true"
        >
          {DIGITS.map((n) => (
            <span key={n}>{n}</span>
          ))}
        </span>
      ))}
    </span>
  );
}
