// Stjerne-øvelser: én brikke flytter fritt og samler stjerner. Egne enkle trekkregler.
const F = 'abcdefgh';
const xy = (s: string): [number, number] => [F.indexOf(s[0]), +s[1] - 1];
const sq = (x: number, y: number) => F[x] + (y + 1);
const inside = (x: number, y: number) => x >= 0 && x < 8 && y >= 0 && y < 8;

export function starMoves(piece: string, from: string, blockers: string[], stars: string[] = []): string[] {
  const [x, y] = xy(from);
  const block = new Set(blockers);
  const out: string[] = [];
  const ray = (dx: number, dy: number) => {
    let cx = x + dx, cy = y + dy;
    while (inside(cx, cy) && !block.has(sq(cx, cy))) { out.push(sq(cx, cy)); cx += dx; cy += dy; }
  };
  const step = (dx: number, dy: number) => { const cx = x + dx, cy = y + dy; if (inside(cx, cy) && !block.has(sq(cx, cy))) out.push(sq(cx, cy)); };
  const rook = [[1, 0], [-1, 0], [0, 1], [0, -1]], bishop = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  switch (piece) {
    case 'r': rook.forEach(([a, b]) => ray(a, b)); break;
    case 'b': bishop.forEach(([a, b]) => ray(a, b)); break;
    case 'q': [...rook, ...bishop].forEach(([a, b]) => ray(a, b)); break;
    case 'k': [...rook, ...bishop].forEach(([a, b]) => step(a, b)); break;
    case 'n': [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]].forEach(([a, b]) => step(a, b)); break;
    case 'p': {
      const st = new Set(stars);
      const f1 = sq(x, y + 1);
      if (y < 7 && !block.has(f1) && !st.has(f1)) {
        out.push(f1);
        const f2 = y + 2 < 8 ? sq(x, y + 2) : '';
        if (y === 1 && f2 && !block.has(f2) && !st.has(f2)) out.push(f2);
      }
      for (const dx of [-1, 1]) if (inside(x + dx, y + 1) && st.has(sq(x + dx, y + 1))) out.push(sq(x + dx, y + 1));
      break;
    }
  }
  return out;
}

// Minste antall trekk for å samle alle stjernene (bredde-først-søk). null = umulig.
export function starPar(piece: string, from: string, stars: string[], blockers: string[]): number | null {
  const idx = new Map(stars.map((s, i) => [s, i]));
  const full = (1 << stars.length) - 1;
  const start = `${from}|0`;
  const seen = new Set([start]);
  let frontier: [string, number][] = [[from, 0]];
  for (let d = 1; d <= 40 && frontier.length; d++) {
    const next: [string, number][] = [];
    for (const [pos, mask] of frontier) {
      const remaining = stars.filter((_, i) => !(mask & (1 << i)));
      for (const to of starMoves(piece, pos, blockers, remaining)) {
        const i = idx.get(to);
        const m = i !== undefined ? mask | (1 << i) : mask;
        if (m === full) return d;
        const k = `${to}|${m}`;
        if (!seen.has(k)) { seen.add(k); next.push([to, m]); }
      }
    }
    frontier = next;
  }
  return null;
}
