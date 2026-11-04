// Taktikkoppgaver: lastes fra /puzzles.json (laget av tools/build-puzzles.mjs)
import { getProgress, update, today } from './store';

export interface Puzzle { id: string; fen: string; moves: string[]; rating: number; themes: string[] }

export const THEMES: Record<string, string> = {
  alle: 'Alle',
  henger: 'Gratis brikke',
  mattI1: 'Matt i 1',
  mattI2: 'Matt i 2',
  mattI3: 'Matt i 3',
  gaffel: 'Gaffel',
  vinnMateriale: 'Vinn materiale',
  forvandling: 'Forvandling',
};

let cache: Promise<Puzzle[]> | null = null;
export function loadPuzzles(): Promise<Puzzle[]> {
  if (!cache) cache = fetch('/puzzles.json').then((r) => r.json());
  return cache;
}

export function pickPuzzle(all: Puzzle[], theme = 'alle', opts: { rating?: number; avoid?: string[] } = {}): Puzzle {
  const s = getProgress();
  const rating = opts.rating ?? s.puzzleRating;
  const avoid = new Set([...(opts.avoid ?? []), ...s.recent]);
  const pool = theme === 'alle' ? all : all.filter((p) => p.themes.includes(theme));
  // Først: oppgaver du bommet på tidligere, som skal repeteres i dag
  if (!opts.rating) {
    const t = today();
    const due = s.review.filter((r) => r.due <= t).map((r) => pool.find((p) => p.id === r.id)).filter(Boolean) as Puzzle[];
    if (due.length) return due[0];
  }
  for (const w of [75, 125, 200, 300, 500, 2000]) {
    const c = pool.filter((p) => Math.abs(p.rating - rating) <= w && !avoid.has(p.id));
    if (c.length >= 6 || w === 2000) {
      const list = c.length ? c : pool;
      return list[Math.floor(Math.random() * list.length)];
    }
  }
  return pool[0];
}

export function recordPuzzle(p: Puzzle, clean: boolean) {
  update((s) => {
    s.recent = [p.id, ...s.recent.filter((x) => x !== p.id)].slice(0, 150);
    const inReview = s.review.find((r) => r.id === p.id);
    if (clean) {
      s.puzzles.solved += 1; s.puzzles.inARow += 1;
      s.puzzles.bestInARow = Math.max(s.puzzles.bestInARow, s.puzzles.inARow);
      for (const t of p.themes) s.puzzles.byTheme[t] = (s.puzzles.byTheme[t] ?? 0) + 1;
      if (inReview) {
        inReview.step += 1;
        if (inReview.step >= 3) s.review = s.review.filter((r) => r.id !== p.id);
        else inReview.due = addDays([1, 3, 7][inReview.step]);
      }
    } else {
      s.puzzles.failed += 1; s.puzzles.inARow = 0;
      if (inReview) { inReview.step = 0; inReview.due = addDays(1); }
      else s.review.push({ id: p.id, due: addDays(1), step: 0 });
    }
  });
}

function addDays(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv-SE'); }

// Dagens oppgave: samme oppgave hele dagen, tilpasset ratingen
export function dailyPuzzle(all: Puzzle[]): Puzzle {
  const d = today();
  let h = 0; for (const c of d) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const r = getProgress().puzzleRating + 50;
  const c = all.filter((p) => Math.abs(p.rating - r) < 150);
  const list = c.length ? c : all;
  return list[h % list.length];
}
