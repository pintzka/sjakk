// Brett for oppgaver: finn riktig trekk. Brukes av taktikk, nivåtest, dagens oppgave og leksjoner.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { Chess } from 'chess.js';
import { Board, type Highlight, type Arrow } from './Board';
import { destsOf, needsPromotion, checkSquare, playUci, norsk } from '../lib/chess';
import { play } from '../lib/sound';
import { analyser, scoreOf, withTimeout } from '../engine/stockfish';
import { explainPuzzle, lineText } from '../lib/explain';
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
  engineCheck?: boolean;    // la Stockfish godta like gode trekk og vise hvorfor et feil trekk er feil
  explain?: string;         // egen forklaring (leksjoner); ellers lages en automatisk
  autoExplain?: boolean;    // vis automatisk forklaring når oppgaven er ferdig
  children?: ComponentChildren; // vises under status/forklaring (i høyre kolonne på PC)
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
  const [alt, setAlt] = useState(false);
  const mistakes = useRef(0); const hinted = useRef(false);
  const solverColor = useRef<'w' | 'b'>('w');
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };

  useEffect(() => {
    const ch = new Chess(p.fen); chRef.current = ch;
    mistakes.current = 0; hinted.current = false;
    setFen(p.fen); setLast(null); setStatus(null); setHl({}); setDone(false); setShowArrows([]); setAlt(false);
    if (p.engineCheck) analyser.ready().catch(() => {});
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
    if (!ok && p.engineCheck) { checkWithEngine(uci, expected); return; }
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
    } else wrong(uci, null);
  }

  // Feil trekk: vis det, eventuelt med motstanderens svar som rød pil, og ta det tilbake
  function wrong(uci: string, refute: { reply: string; text: string } | null, alreadyPlayed = false) {
    mistakes.current += 1;
    const m = alreadyPlayed ? true : applyMove(uci);
    setFlash({ kind: 'bad', key: Date.now() }); play('bad');
    const base = p.oneTry ? 'Ikke riktig. Her er løsningen.' : 'Ikke helt. Prøv igjen!';
    setStatus({ text: refute ? `${refute.text} ${p.oneTry ? 'Her er løsningen.' : 'Prøv igjen!'}` : base, kind: 'bad' });
    if (refute) setShowArrows([{ from: refute.reply.slice(0, 2), to: refute.reply.slice(2, 4), color: '#b3362a' }]);
    setLocked(true);
    later(() => {
      setShowArrows([]);
      if (m) { chRef.current.undo(); setFen(chRef.current.fen()); setLast(null); }
      if (p.oneTry) { mistakes.current -= 1; showSolution(); } else setLocked(false);
    }, refute ? 2600 : 650);
  }

  // Spør Stockfish: er trekket ditt like bra som løsningen? Hvis ikke, hva svarer motstanderen?
  async function checkWithEngine(uci: string, expected: string) {
    const ch = chRef.current;
    const fenBefore = ch.fen();
    const test = new Chess(fenBefore);
    try { playUci(test, uci); } catch { return; }
    setLocked(true);
    applyMove(uci);
    setStatus({ text: 'Sjekker trekket ditt...', kind: 'info' });
    let res;
    try { res = await withTimeout(analyser.go(fenBefore, { depth: 12, multipv: 2, searchmoves: [uci, expected] }), 7000); }
    catch { wrong(uci, null, true); return; }
    const mine = res.find((l) => l.move === uci), sol = res.find((l) => l.move === expected);
    const ms = scoreOf(mine), ss = scoreOf(sol);
    const accept = !!mine && (ss >= 9000 ? ms >= ss : ms >= 300 && ms >= ss - 120);
    if (accept) {
      const solSan = norsk(new Chess(fenBefore).move({ from: expected.slice(0, 2), to: expected.slice(2, 4), promotion: expected[4] || undefined }).san);
      setAlt(true);
      setStatus({ text: `Også et vinnende trekk! Løsningen vi hadde i tankene var ${solSan}.`, kind: 'good' });
      setFlash({ kind: 'good', key: Date.now() }); play('good'); finish();
      return;
    }
    const reply = mine?.pv[1];
    if (!reply) { wrong(uci, null, true); return; }
    const after = new Chess(fenBefore); playUci(after, uci);
    let replySan = reply;
    try { replySan = norsk(after.move({ from: reply.slice(0, 2), to: reply.slice(2, 4), promotion: reply[4] || undefined }).san); } catch { /* */ }
    const verdict = ms <= -9000 ? 'og da blir du satt matt.' : ms < -150 ? 'og da står du dårligst.' : ms < 150 ? 'og da er det omtrent likt.' : 'og da vinner du mindre enn med beste trekk.';
    wrong(uci, { reply, text: `Motstanderen svarer ${replySan} (rød pil), ${verdict}` }, true);
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
    <div class="play-layout">
      <div class="play-board">
      <div class="status info" style={{ marginTop: 0 }}>{p.prompt ?? `${turnText}: finn det beste trekket`}</div>
      <Board fen={fen} orientation={solverColor.current} dests={!locked && !done ? destsOf(ch) : undefined}
        onMove={onMove} needsPromotion={(f, t) => needsPromotion(ch, f, t)} lastMove={last} check={checkSquare(ch)}
        highlights={{ ...p.extraHighlights, ...hl }} flash={flash} arrows={[...(p.arrows ?? []), ...showArrows]} />
      </div>
      <div class="play-side">
      {status && <div class={`status ${status.kind}`}>{status.text}</div>}
      {done && (p.explain || p.autoExplain) && <ExplainCard {...p} alt={alt} />}
      {!done && (p.allowHint !== false || p.allowSolution) && (
        <div class="btnrow" style={{ marginTop: '8px' }}>
          {p.allowHint !== false && <button class="btn secondary small" onClick={hint} disabled={locked}><IconHint size={18} /> Hint</button>}
          {p.allowSolution && mistakes.current > 0 && <button class="btn secondary small" onClick={showSolution} disabled={locked}>Vis løsning</button>}
        </div>
      )}
      {p.children}
      </div>
    </div>
  );
}

function ExplainCard(p: PuzzleBoardProps & { alt: boolean }) {
  const solStart = p.setupMove ? 1 : 0;
  if (p.explain) {
    const start = new Chess(p.fen);
    if (p.setupMove) playUci(start, p.moves[0]);
    return (
      <div class="card explain">
        <div class="label">Hvorfor?</div>
        <p style={{ margin: '4px 0 6px' }}>{p.explain}</p>
        <div class="small muted">Løsning: {lineText(start.fen(), p.moves.slice(solStart))}</div>
      </div>
    );
  }
  const e = explainPuzzle(p.fen, p.moves, !!p.setupMove);
  return (
    <div class="card explain">
      <div class="label">Hvorfor?</div>
      <div class="explain-line">{e.line}</div>
      <ul>{e.points.map((t, i) => <li key={i}>{t}</li>)}</ul>
      <p class="small" style={{ margin: 0 }}><b>{e.summary}</b></p>
    </div>
  );
}
