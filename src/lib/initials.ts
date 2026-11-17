// Short labels for a group of players (usually one session), unique within
// that group. Each name starts with the plainest form and only grows when it
// clashes with another name in the same group:
//   "Bryan Chandra" -> BC; with "Brittany Caroline" too -> BrC / BiC;
//   with "Bryan Cooper" too -> BrCh / BrCo. One-word names use two letters
//   ("Nico" -> Ni).
function parts(name: string): [string, string] {
  const words = name
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
  if (words.length === 0) return ["?", ""];
  return [words[0], words.length > 1 ? words[words.length - 1] : ""];
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// Candidate labels for one name, plainest first, growing until the whole
// name is used.
function candidates(name: string): string[] {
  const [first, last] = parts(name);
  const out: string[] = [];
  if (!last) {
    for (let n = 2; n <= Math.max(2, first.length); n++) out.push(cap(first.slice(0, n)));
  } else {
    out.push(first[0].toUpperCase() + last[0].toUpperCase());
    out.push(cap(first.slice(0, 2)) + last[0].toUpperCase());
    for (let n = 2; n <= Math.max(first.length, last.length); n++) {
      out.push(cap(first.slice(0, n)) + cap(last.slice(0, n)));
    }
  }
  return [...new Set(out)];
}

export function initialsFor(names: string[]): Map<string, string> {
  const unique = [...new Set(names)];
  const level = new Map(unique.map((n) => [n, 0]));
  const label = (n: string) => {
    const c = candidates(n);
    return c[Math.min(level.get(n)!, c.length - 1)];
  };

  for (let round = 0; round < 12; round++) {
    const groups = new Map<string, string[]>();
    for (const n of unique) {
      const key = label(n).toUpperCase();
      groups.set(key, [...(groups.get(key) ?? []), n]);
    }
    let clashed = false;
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      clashed = true;
      for (const n of group) level.set(n, level.get(n)! + 1);
    }
    if (!clashed) break;
  }

  // Names that are still identical after using every letter (e.g. "Nico"
  // and "Nico!") get a number: Ni, Ni2.
  const seen = new Map<string, number>();
  return new Map(
    unique.map((n) => {
      const base = label(n);
      const count = (seen.get(base.toUpperCase()) ?? 0) + 1;
      seen.set(base.toUpperCase(), count);
      return [n, count > 1 ? `${base}${count}` : base];
    })
  );
}
