// Spiller av en leksjon steg for steg.
import { useEffect, useRef, useState } from 'preact/hooks';
import { Chess } from 'chess.js';
import { Board, type Highlight } from '../board/Board';
import { PuzzleBoard } from '../board/PuzzleBoard';
import { ALL_LESSONS, ISLANDS, type Step } from '../data/lessons';
import { starMoves, starPar } from '../lib/stars';
import { destsOf, needsPromotion, checkSquare, playUci } from '../lib/chess';
import { loadPuzzles, pickPuzzle, recordPuzzle, type Puzzle } from '../lib/puzzles';
import { engine } from '../engine/stockfish';
import { play } from '../lib/sound';
import { update, addXp, useProgress, today, checkBadges, ratePuzzle } from '../lib/store';
import { Confetti, StarIcon } from '../ui';

type Done = (mistakes: number) => void;

export function Lesson({ id }: { id: string }) {
  const lesson = ALL_LESSONS.find((l) => l.id === id);
  const s = useProgress();
  const [i, setI] = useState(0);
  const [stepDone, setStepDone] = useState(false);
  const mistakes = useRef(0);
  const [finished, setFinished] = useState<{ stars: number; xp: number } | null>(null);
  if (!lesson) return <div class="card">Fant ikke leksjonen. <a href="#/reise">Tilbake</a></div>;
  const step = lesson.steps[i];
  const island = ISLANDS.find((x) => x.id === lesson.island)!;

  const onStep: Done = (m) => { mistakes.current += m; setStepDone(true); };
  function next() {
    if (i + 1 < lesson!.steps.length) { setI(i + 1); setStepDone(false); return; }
    const stars = mistakes.current === 0 ? 3 : mistakes.current <= 2 ? 2 : 1;
    const prev = s.lessons[lesson!.id]?.stars ?? 0;
    const xp = prev ? (stars > prev ? 10 : 5) : 20 + stars * 5;
    update((st) => { st.lessons[lesson!.id] = { stars: Math.max(prev, stars), date: today() }; });
    addXp(xp); checkBadges(); play('win');
    setFinished({ stars, xp });
  }

  if (finished) {
    const idx = island.lessons.findIndex((l) => l.id === lesson.id);
    const nextL = island.lessons[idx + 1];
    return (
      <div class="card center" style={{ marginTop: '20px' }}>
        <Confetti />
        <h1>Leksjon fullført!</h1>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', margin: '10px 0' }}>{[1, 2, 3].map((k) => <span key={k} style={{ opacity: k <= finished.stars ? 1 : 0.25 }}><StarIcon size={44} /></span>)}</div>
        <p><b>+{finished.xp} XP</b></p>
        {finished.stars < 3 && <p class="small muted">Gjør leksjonen uten feil for å få tre stjerner.</p>}
        <div class="stack">
          {nextL ? <a class="btn block" href={`#/leksjon/${nextL.id}`}>Neste: {nextL.title}</a> : <a class="btn gold block" href="#/reise">Ta bossen på {island.name}!</a>}
          <a class="btn secondary block" href="#/reise">Til kartet</a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div class="topbar">
        <a href="#/reise" class="btn secondary small">Avslutt</a>
        <div class="title" style={{ textAlign: 'center' }}>{lesson.title}</div>
        <span class="chip">{i + 1}/{lesson.steps.length}</span>
      </div>
      <div class="progress-dots">{lesson.steps.map((_, k) => <span key={k} class={k <= i ? 'on' : ''} />)}</div>
      <StepView key={`${lesson.id}-${i}`} step={step} onDone={onStep} />
      {(stepDone || step.t === 'info') && <button class="btn block" style={{ marginTop: '12px' }} onClick={next}>{i + 1 < lesson.steps.length ? 'Videre' : 'Fullfør'}</button>}
    </div>
  );
}

function Text({ html }: { html: string }) { return <p class="lesson-text" dangerouslySetInnerHTML={{ __html: html }} />; }

function StepView({ step, onDone }: { step: Step; onDone: Done }) {
  switch (step.t) {
    case 'info': return <div><Text html={step.text} />{step.fen && <Board fen={step.fen} arrows={step.arrows} highlights={step.hl} />}</div>;
    case 'stars': return <StarsStep step={step} onDone={onDone} />;
    case 'squares': return <SquaresStep step={step} onDone={onDone} />;
    case 'choice': return <ChoiceStep step={step} onDone={onDone} />;
    case 'puzzle': return <div><Text html={step.text} /><PuzzleBoard fen={step.fen} moves={step.moves} prompt=" " onDone={(r) => onDone(r.mistakes + (r.hinted ? 1 : 0))} allowSolution /></div>;
    case 'practice': return <PracticeStep step={step} onDone={onDone} />;
    case 'play': return <PlayStep step={step} onDone={onDone} />;
  }
}

function StarsStep({ step, onDone }: { step: Extract<Step, { t: 'stars' }>; onDone: Done }) {
  const [pos, setPos] = useState(step.from);
  const [left, setLeft] = useState(step.stars);
  const [moves, setMoves] = useState(0);
  const par = useRef(starPar(step.piece, step.from, step.stars, step.blockers ?? []) ?? 99);
  const done = left.length === 0;
  const placement: Record<string, string> = { [pos]: step.piece.toUpperCase() };
  for (const b of step.blockers ?? []) placement[b] = 'P';
  const fen = toFen(placement);
  const dests = new Map([[pos, starMoves(step.piece, pos, step.blockers ?? [], left)]]);
  function onMove(_: string, to: string) {
    setPos(to); setMoves(moves + 1);
    if (left.includes(to)) {
      const nl = left.filter((x) => x !== to); setLeft(nl); play('star');
      if (!nl.length) { const over = moves + 1 - par.current; play('good'); onDone(over <= 0 ? 0 : over <= 2 ? 1 : 3); }
    } else play('move');
  }
  const reset = () => { setPos(step.from); setLeft(step.stars); setMoves(0); };
  return (
    <div>
      <Text html={step.text} />
      <Board fen={fen} dests={done ? undefined : dests} onMove={onMove} stars={left} coords />
      <div class="row" style={{ marginTop: '8px', justifyContent: 'space-between' }}>
        <span class="chip">Trekk: {moves} (beste: {par.current})</span>
        {!done && <button class="btn secondary small" onClick={reset}>Start på nytt</button>}
      </div>
      {done && <div class={`status ${moves <= par.current ? 'good' : 'info'}`}>{moves <= par.current ? 'Perfekt! Færrest mulig trekk.' : `Bra! Klarer du det på ${par.current} trekk neste gang?`}</div>}
    </div>
  );
}

function toFen(placement: Record<string, string>) {
  const rows: string[] = [];
  for (let r = 8; r >= 1; r--) {
    let row = '', empty = 0;
    for (const f of 'abcdefgh') { const p = placement[f + r]; if (p) { if (empty) { row += empty; empty = 0; } row += p; } else empty++; }
    if (empty) row += empty;
    rows.push(row);
  }
  return rows.join('/') + ' w - - 0 1';
}

function SquaresStep({ step, onDone }: { step: Extract<Step, { t: 'squares' }>; onDone: Done }) {
  const [found, setFound] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string | null>(null);
  const mistakes = useRef(0);
  const done = found.length === step.answer.length;
  const hl: Record<string, Highlight> = {};
  for (const f of found) hl[f] = 'good';
  if (wrong) hl[wrong] = 'bad';
  function click(sq: string) {
    if (done) return;
    if (step.answer.includes(sq) && !found.includes(sq)) {
      const nf = [...found, sq]; setFound(nf); play('good');
      if (nf.length === step.answer.length) onDone(mistakes.current);
    } else if (!found.includes(sq)) { mistakes.current++; setWrong(sq); play('bad'); setTimeout(() => setWrong(null), 500); }
  }
  return (
    <div>
      <Text html={step.text} />
      <Board fen={step.fen} onSquareClick={click} highlights={hl} />
      {done && <div class="status good">Riktig!</div>}
      {!done && step.answer.length > 1 && <div class="small muted center" style={{ marginTop: '6px' }}>{found.length} av {step.answer.length}</div>}
    </div>
  );
}

function ChoiceStep({ step, onDone }: { step: Extract<Step, { t: 'choice' }>; onDone: Done }) {
  const [picked, setPicked] = useState<number[]>([]);
  const right = picked.includes(step.answer);
  function pick(k: number) {
    if (right || picked.includes(k)) return;
    const np = [...picked, k]; setPicked(np);
    if (k === step.answer) { play('good'); onDone(np.length - 1); } else play('bad');
  }
  return (
    <div>
      <Text html={step.text} />
      {step.fen && <div style={{ marginBottom: '10px' }}><Board fen={step.fen} arrows={step.arrows} /></div>}
      <div class="opts">
        {step.options.map((o, k) => <button key={k} class={`opt ${picked.includes(k) ? (k === step.answer ? 'right' : 'wrong') : ''}`} onClick={() => pick(k)}>{o}</button>)}
      </div>
      {right && <div class="card" style={{ marginTop: '10px' }}><Text html={step.explain} /></div>}
      {!right && picked.length > 0 && <div class="status bad">Ikke helt. Prøv et annet svar.</div>}
    </div>
  );
}

function PracticeStep({ step, onDone }: { step: Extract<Step, { t: 'practice' }>; onDone: Done }) {
  const [all, setAll] = useState<Puzzle[] | null>(null);
  const [n, setN] = useState(0);
  const [pz, setPz] = useState<Puzzle | null>(null);
  const [solvedThis, setSolvedThis] = useState(false);
  const used = useRef<string[]>([]);
  const mistakes = useRef(0);
  useEffect(() => { loadPuzzles().then((a) => { setAll(a); const p = pickPuzzle(a, step.theme); used.current.push(p.id); setPz(p); }); }, []);
  function done(r: { clean: boolean; mistakes: number }) {
    if (!pz) return;
    ratePuzzle(pz.rating, r.clean); recordPuzzle(pz, r.clean); addXp(r.clean ? 8 : 2);
    if (!r.clean) mistakes.current++;
    setSolvedThis(true);
    if (n + 1 >= step.count) onDone(mistakes.current);
  }
  function nextPz() { if (!all) return; const p = pickPuzzle(all, step.theme, { avoid: used.current }); used.current.push(p.id); setPz(p); setN(n + 1); setSolvedThis(false); }
  return (
    <div>
      <Text html={`${step.text} <span class="muted">(${Math.min(n + 1, step.count)} av ${step.count})</span>`} />
      {pz && <PuzzleBoard key={pz.id} fen={pz.fen} moves={pz.moves} setupMove onDone={done} allowSolution />}
      {solvedThis && n + 1 < step.count && <button class="btn block" style={{ marginTop: '10px' }} onClick={nextPz}>Neste oppgave</button>}
    </div>
  );
}

function PlayStep({ step, onDone }: { step: Extract<Step, { t: 'play' }>; onDone: Done }) {
  const ch = useRef(new Chess(step.fen));
  const [fen, setFen] = useState(step.fen);
  const [last, setLast] = useState<[string, string] | null>(null);
  const [thinking, setThinking] = useState(false);
  const [moves, setMoves] = useState(0);
  const [result, setResult] = useState<'won' | 'lost' | null>(null);
  const [msg, setMsg] = useState('');
  const tries = useRef(0);
  const me = new Chess(step.fen).turn();

  function check(): boolean {
    const c = ch.current;
    if (step.goal === 'mate' && c.isCheckmate()) { win('Sjakkmatt! Bra jobba!'); return true; }
    if (step.goal === 'promote') {
      const h = c.history({ verbose: true }); const lm = h[h.length - 1];
      if (lm && lm.promotion && lm.color === me) {
        const opp = me === 'w' ? 'b' : 'w';
        const safe = c.attackers(lm.to, opp).length === 0 || c.attackers(lm.to, me).length > 0;
        if (safe) { win('Bonden ble forvandlet! Bra jobba!'); return true; }
      }
    }
    if (c.isStalemate()) { lose('Patt! Det ble remis. Pass på at motstanderen alltid har et trekk.'); return true; }
    if (c.isDraw() || c.isGameOver()) { lose('Det ble remis. Prøv igjen!'); return true; }
    if (step.goal === 'promote' && !c.board().flat().some((p) => p && p.type === 'p' && p.color === me) && !c.history({ verbose: true }).some((m) => m.promotion && m.color === me)) { lose('Bonden ble slått. Prøv igjen!'); return true; }
    return false;
  }
  function win(t: string) { setResult('won'); setMsg(t); play('win'); onDone(tries.current); }
  function lose(t: string) { setResult('lost'); setMsg(t); play('lose'); }

  async function onMove(from: string, to: string, promotion?: string) {
    const c = ch.current;
    let m; try { m = c.move({ from, to, promotion: promotion ?? (needsPromotion(c, from, to) ? 'q' : undefined) }); } catch { return; }
    if (!m) return;
    setLast([m.from, m.to]); setFen(c.fen()); play(c.inCheck() ? 'check' : m.captured ? 'capture' : 'move');
    const nm = moves + 1; setMoves(nm);
    if (check()) return;
    if (nm >= step.maxMoves) { lose(`Du brukte opp alle ${step.maxMoves} trekkene. Prøv igjen!`); return; }
    setThinking(true);
    const [best] = await engine.go(c.fen(), { depth: 12 });
    await new Promise((r) => setTimeout(r, 250));
    const rm = playUci(c, best.move);
    setThinking(false);
    if (rm) { setLast([rm.from, rm.to]); setFen(c.fen()); play(rm.captured ? 'capture' : 'move'); }
    check();
  }
  function retry() { ch.current = new Chess(step.fen); setFen(step.fen); setLast(null); setMoves(0); setResult(null); setMsg(''); tries.current++; }
  const c = ch.current;
  return (
    <div>
      <Text html={step.text} />
      <Board fen={fen} orientation={me} dests={!result && !thinking ? destsOf(c) : undefined} onMove={onMove} needsPromotion={(f, t) => needsPromotion(c, f, t)} lastMove={last} check={checkSquare(c)} />
      <div class="row" style={{ marginTop: '8px', justifyContent: 'space-between' }}>
        <span class="chip">Trekk: {moves} / {step.maxMoves}</span>
        {thinking && <span class="small muted">Motstanderen tenker...</span>}
        {!result && <button class="btn secondary small" onClick={retry}>Start på nytt</button>}
      </div>
      {msg && <div class={`status ${result === 'won' ? 'good' : 'bad'}`}>{msg}</div>}
      {result === 'lost' && <button class="btn block" onClick={retry}>Prøv igjen</button>}
    </div>
  );
}
