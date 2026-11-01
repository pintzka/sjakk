// Brett for oppgaver: finn riktig trekk. Brukes av taktikk, nivåtest, dagens oppgave og leksjoner.
import { useEffect, useRef, useState } from 'preact/hooks';
import { Chess } from 'chess.js';
import { Board, type Highlight, type Arrow } from './Board';
import { destsOf, needsPromotion, checkSquare, playUci } from '../lib/chess';
import { play } from '../lib/sound';
import { IconHint } from '../ui';

export interface PuzzleResult { clean: boolean; mistakes: number; hinted: boolean }

export interface PuzzleBoardProps {
  fen: string;
  moves: string[];          // løsningstrekk (annenhver: spiller, motstander, ...)
  setupMove?: boolean;      // første trekk er motstanderens trekk som spilles automatisk
  onDone: (r: PuzzleResult) => void;
  prompt?: string;
  allowHint?: boolean;
  allowSolution?: boolean;
  arrows?: Arrow[];
  extraHighlights?: Record<string, Highlight>;
  oneTry?: boolean;         // første feil avslutter oppgaven (nivåtest)
}

export function PuzzleBoard(p: PuzzleBoardProps) {
  const chRef = useRef(new Chess(p.fen));
  const [fen, setFen] = useState(p.fen);
  const [idx, setIdx] = useState(0);
  const [last, setLast] = useState<[string, string] | null>(null);
  const [status, setStatus] = useState<{ text: string; kind: 'good' | 'bad' | 'info' } | null>(null);
  const [flash, setFlash] = useState<{ kind: 'good' | 'bad'; key: number } | null>(null);
  const [hl, setHl] = useState<Record<string, Highlight>>({});
  const [locked, setLocked] = useState(true);
  const [done, setDone] = useState(false);
  const [showArrows, setShowArrows] = useState<Arrow[]>([]);
  const mistakes = useRef(0); const hinted = useRef(false);
  const solverColor = useRef<'w' | 'b'>('w');
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };

  useEffect(() => {
    const ch = new Chess(p.fen); chRef.current = ch;
    mistakes.current = 0; hinted.current = false;
    setFen(p.fen); setLast(null); setStatus(null); setHl({}); setDone(false); setShowArrows([]);
    solverColor.current = p.setupMove ? (ch.turn() === 'w' ? 'b' : 'w') : ch.turn();
    if (p.setupMove) {
      setIdx(1); setLocked(true);
      later(() => { applyMove(p.moves[0]); setLocked(false); }, 700);
    } else { setIdx(0); setLocked(false); }
    return () => { timers.current.forEach(clearTimeout); timers.current = []; };
  }, [p.fen, p.moves.join(',')]);

  function applyMove(uci: string) {
    const ch = chRef.current;
    const m = playUci(ch, uci);
    if (!m) return null;
    setFen(ch.fen()); setLast([m.from, m.to]);
    play(ch.inCheck() ? 'check' : m.captured ? 'capture' : 'move');
    return m;
  }

  function finish() {
    setDone(true); setLocked(true);
    p.onDone({ clean: mistakes.current === 0 && !hinted.current, mistakes: mistakes.current, hinted: hinted.current });
  }

  function onMove(from: string, to: string, promotion?: string) {
    if (locked || done) return;
    const ch = chRef.current;
    const expected = p.moves[idx];
    const uci = from + to + (promotion ?? (needsPromotion(ch, from, to) ? 'q' : ''));
    // Godta også et annet trekk som gir matt
    let ok = uci === expected;
    if (!ok) {
      const test = new Chess(ch.fen());
      try { playUci(test, uci); if (test.isCheckmate()) ok = true; } catch { /* ulovlig */ }
    }
    setHl({});
    if (ok) {
      applyMove(uci);
      const nextIdx = idx + 1;
      if (nextIdx >= p.moves.length || chRef.current.isGameOver()) {
        setStatus({ text: mistakes.current || hinted.current ? 'Riktig til slutt!' : 'Riktig! Bra jobba!', kind: 'good' });
        setFlash({ kind: 'good', key: Date.now() }); play('good'); finish(); return;
      }
      setStatus({ text: 'Bra! Fortsett...', kind: 'good' });
      setLocked(true);
      later(() => { applyMove(p.moves[nextIdx]); setIdx(nextIdx + 1); setLocked(false); setStatus({ text: 'Bra! Finn neste trekk.', kind: 'info' }); }, 550);
    } else {
      mistakes.current += 1;
      const m = applyMove(uci);
      setFlash({ kind: 'bad', key: Date.now() }); play('bad');
      setStatus({ text: p.oneTry ? 'Ikke riktig. Her er løsningen.' : 'Ikke helt. Prøv igjen!', kind: 'bad' });
      setLocked(true);
      later(() => {
        if (m) { chRef.current.undo(); setFen(chRef.current.fen()); setLast(null); }
        if (p.oneTry) { mistakes.current -= 1; showSolution(); } else setLocked(false);
      }, 650);
    }
  }

  function hint() {
    hinted.current = true;
    const exp = p.moves[idx];
    if (!hl[exp.slice(0, 2)]) { setHl({ [exp.slice(0, 2)]: 'hint' }); setStatus({ text: 'Se på den markerte brikken.', kind: 'info' }); }
    else setShowArrows([{ from: exp.slice(0, 2), to: exp.slice(2, 4), color: '#2c5d8a' }]);
  }

  function showSolution() {
    mistakes.current += 1; setLocked(true);
    let i = idx;
    const step = () => {
      if (i >= p.moves.length) { setStatus({ text: 'Slik var løsningen.', kind: 'info' }); finish(); return; }
      applyMove(p.moves[i]); i++; later(step, 700);
    };
    step();
  }

  const ch = chRef.current;
  const turnText = solverColor.current === 'w' ? 'Hvit i trekket' : 'Svart i trekket';
  return (
    <div>
      <div class="status info" style={{ marginTop: 0 }}>{p.prompt ?? `${turnText}: finn det beste trekket`}</div>
      <Board fen={fen} orientation={solverColor.current} dests={!locked && !done ? destsOf(ch) : undefined}
        onMove={onMove} needsPromotion={(f, t) => needsPromotion(ch, f, t)} lastMove={last} check={checkSquare(ch)}
        highlights={{ ...p.extraHighlights, ...hl }} flash={flash} arrows={[...(p.arrows ?? []), ...showArrows]} />
      {status && <div class={`status ${status.kind}`}>{status.text}</div>}
      {!done && (p.allowHint !== false || p.allowSolution) && (
        <div class="btnrow" style={{ marginTop: '8px' }}>
          {p.allowHint !== false && <button class="btn secondary small" onClick={hint} disabled={locked}><IconHint size={18} /> Hint</button>}
          {p.allowSolution && mistakes.current > 0 && <button class="btn secondary small" onClick={showSolution} disabled={locked}>Vis løsning</button>}
        </div>
      )}
    </div>
  );
}
