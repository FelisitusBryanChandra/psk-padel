// Generated player avatar: a little character face drawn from the player's
// name, so the same name always gets the same avatar everywhere, with no
// network calls and nothing stored. Colors are picked to sit well on the
// Court Night palette.
const COLORS = ["#d4ff3a", "#ff7a1a", "#3af0ff", "#ff5fa2", "#9b7bff", "#ffd75e", "#5cf5cc", "#ff5a3c"];
const INK = "#0b0d0c";

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Small deterministic random stream seeded by the name.
function stream(seed: number) {
  let s = seed || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

export function Avatar({
  name,
  size = 36,
  className = "",
  ring,
  badge,
}: {
  name: string;
  size?: number;
  className?: string;
  ring?: string;
  // Short label (from initialsFor) shown in a corner chip, so faces stay
  // recognizable when no name is printed next to them.
  badge?: string;
}) {
  const r = stream(hash(name.trim().toLowerCase()));
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(r() * arr.length)];

  const bg = pick(COLORS);
  const head = pick(COLORS.filter((c) => c !== bg));
  const band = pick(COLORS.filter((c) => c !== bg && c !== head));
  const tilt = (r() - 0.5) * 24;
  const dx = (r() - 0.5) * 6;
  const dy = 2 + r() * 4;
  const radius = 8 + r() * 10;
  const eyes = Math.floor(r() * 3);
  const mouth = Math.floor(r() * 4);
  const hasBand = r() < 0.45;

  // Small avatars get a proportionally bigger chip so the label stays legible.
  const chip = Math.max(15, Math.round(size * (size < 40 ? 0.5 : 0.38)));

  return (
    <span
      className={`relative inline-block shrink-0 ${className}`}
      style={{ width: size, height: size }}
      title={name}
    >
      <span
        className="block h-full w-full overflow-hidden rounded-full"
        style={{ boxShadow: ring ? `0 0 0 3px ${ring}` : undefined }}
        aria-hidden="true"
      >
      <svg viewBox="0 0 36 36" width={size} height={size} className="block">
        <rect width="36" height="36" fill={bg} />
        <g transform={`translate(${dx} ${dy}) rotate(${tilt} 18 18)`}>
          <rect x="6" y="6" width="24" height="26" rx={radius} fill={head} />
          {hasBand && <rect x="5" y="10" width="26" height="4" rx="2" fill={band} />}
          {eyes === 0 && (
            <>
              <circle cx="14" cy="19" r="1.7" fill={INK} />
              <circle cx="22" cy="19" r="1.7" fill={INK} />
            </>
          )}
          {eyes === 1 && (
            <>
              <rect x="12" y="18.2" width="4" height="1.8" rx="0.9" fill={INK} />
              <rect x="20" y="18.2" width="4" height="1.8" rx="0.9" fill={INK} />
            </>
          )}
          {eyes === 2 && (
            <>
              <circle cx="14" cy="19" r="2.3" fill="#fff" />
              <circle cx="22" cy="19" r="2.3" fill="#fff" />
              <circle cx="14.6" cy="19.4" r="1.1" fill={INK} />
              <circle cx="22.6" cy="19.4" r="1.1" fill={INK} />
            </>
          )}
          {mouth === 0 && <path d="M14 24.5 Q18 28 22 24.5" stroke={INK} strokeWidth="1.6" fill="none" strokeLinecap="round" />}
          {mouth === 1 && <rect x="15" y="25" width="6" height="1.6" rx="0.8" fill={INK} />}
          {mouth === 2 && <ellipse cx="18" cy="25.6" rx="2.2" ry="1.8" fill={INK} />}
          {mouth === 3 && <path d="M13.5 24 Q18 29.5 22.5 24 Z" fill={INK} />}
        </g>
      </svg>
      </span>
      {badge && (
        <span
          className="absolute flex items-center justify-center rounded-full bg-[#0b0d0c] font-heading font-black leading-none tracking-tight text-[#d4ff3a]"
          style={{
            right: -size * 0.12,
            bottom: -size * 0.08,
            height: chip,
            minWidth: chip,
            padding: `0 ${Math.round(chip * 0.28)}px`,
            fontSize: Math.round(chip * 0.66),
            boxShadow: "0 0 0 1.5px rgba(212,255,58,0.35)",
          }}
        >
          {badge}
        </span>
      )}
    </span>
  );
}
