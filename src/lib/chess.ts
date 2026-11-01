// Hjelpefunksjoner rundt chess.js
import { Chess, type Square } from 'chess.js';

export function destsOf(ch: Chess): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const mv of ch.moves({ verbose: true })) {
    const a = m.get(mv.from) ?? [];
    if (!a.includes(mv.to)) a.push(mv.to);
    m.set(mv.from, a);
  }
  return m;
}

export function needsPromotion(ch: Chess, from: string, to: string) {
  const p = ch.get(from as Square);
  return !!p && p.type === 'p' && (to[1] === '8' || to[1] === '1');
}

export function checkSquare(ch: Chess): string | null {
  if (!ch.inCheck()) return null;
  const turn = ch.turn();
  for (const row of ch.board()) for (const p of row) if (p && p.type === 'k' && p.color === turn) return p.square;
  return null;
}

export function playUci(ch: Chess, uci: string) {
  return ch.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined });
}

// Norsk notasjon: K konge, D dronning, T tårn, L løper, S springer
export function norsk(san: string) {
  return san.replace(/[KQRBN]/g, (c) => ({ K: 'K', Q: 'D', R: 'T', B: 'L', N: 'S' } as Record<string, string>)[c]);
}

export const VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
