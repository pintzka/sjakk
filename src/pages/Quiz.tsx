// Quizer: koordinater, matt eller ikke, finn brikken som henger, og trekk-telling.
import { useEffect, useRef, useState } from 'preact/hooks';
import { Chess } from 'chess.js';
import { Board, type Highlight } from '../board/Board';
import { PIECE_DEF, type PieceType } from '../board/pieces';
import { loadPuzzles, type Puzzle } from '../lib/puzzles';
import { playUci } from '../lib/chess';
import { starMoves } from '../lib/stars';
import { play } from '../lib/sound';
import { update, addXp, useProgress, checkBadges, addPoints, goalProgress } from '../lib/store';
import { TopBar, shuffle, Confetti } from '../ui';

export const QUIZZES = [
  { id: 'koordinater', name: 'Finn feltet', desc: 'Trykk på riktig felt så fort du kan. 30 sekunder.' },
  { id: 'matt', name: 'Matt eller ikke?', desc: 'Er det sjakkmatt, eller kan kongen redde seg?' },
  { id: 'henger', name: 'Gratis brikke', desc: 'Trykk på brikken du kan slå gratis.' },
  { id: 'telling', name: 'Tell trekkene', desc: 'Hvor mange felt kan brikken gå til?' },
];

export function QuizList() {
  const s = useProgress();
  return (
    <div>
      <TopBar title="Quiz" back="#/reise" />
      {QUIZZES.map((q) => (
        <a key={q.id} href={`#/quiz/${q.id}`} class="card click" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
          <div class="row"><div class="grow"><b>{q.name}</b><div class="small muted">{q.desc}</div></div>{s.quizBest[q.id] !== undefined && <span class="chip">Rekord: {s.quizBest[q.id]}</span>}</div>
        </a>
      ))}
    </div>
  );
}

function finishQuiz(id: string, score: number) {
  let record = false;
  update((s) => { if (score > (s.quizBest[id] ?? -1)) { s.quizBest[id] = score; record = true; } });
  addXp(Math.max(5, score * 2)); addPoints(Math.max(1, Math.round(score / 2))); goalProgress('lessons'); checkBadges();
  return record;
}

function Result({ id, score, max, onAgain }: { id: string; score: number; max?: number; onAgain: () => void }) {
  const [record] = useState(() => finishQuiz(id, score));
  useEffect(() => { play('win'); }, []);
  return (
    <div class="card center" style={{ marginTop: '16px' }}>
      {record && <Confetti />}
      <h1>{score}{max ? ` av ${max}` : ' poeng'}</h1>
      {record && <p><b style={{ color: 'var(--gold)' }}>Ny rekord!</b></p>}
      <p class="muted">+{Math.max(5, score * 2)} XP · +{Math.max(1, Math.round(score / 2))} poeng</p>
      <div class="btnrow"><button class="btn" onClick={onAgain}>Prøv igjen</button><a class="btn secondary" href="#/quiz">Andre quizer</a></div>
    </div>
  );
}

export function Quiz({ id }: { id: string }) {
  const [round, setRound] = useState(0);
  const q = QUIZZES.find((x) => x.id === id);
  if (!q) return <div class="card">Fant ikke quizen.</div>;
  const again = () => setRound(round + 1);
  return (
    <div>
      <TopBar title={q.name} back="#/quiz" />
      {id === 'koordinater' && <Coords key={round} onAgain={again} />}
      {id === 'matt' && <MateQuiz key={round} onAgain={again} />}
      {id === 'henger' && <HangQuiz key={round} onAgain={again} />}
      {id === 'telling' && <CountQuiz key={round} onAgain={again} />}
    </div>
  );
}

const FILES = 'abcdefgh';
const randSq = () => FILES[Math.floor(Math.random() * 8)] + (1 + Math.floor(Math.random() * 8));

function Coords({ onAgain }: { onAgain: () => void }) {
  const [started, setStarted] = useState(false);
  const [color, setColor] = useState<'w' | 'b'>('w');
  const [target, setTarget] = useState(randSq());
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(30);
  const [hl, setHl] = useState<Record<string, Highlight>>({});
  useEffect(() => {
    if (!started || time <= 0) return;
    const t = setTimeout(() => setTime(time - 1), 1000);
    return () => clearTimeout(t);
  }, [started, time]);
  if (started && time <= 0) return <Result id="koordinater" score={score} onAgain={onAgain} />;
  function click(sq: string) {
    if (!started) return;
    if (sq === target) { setScore(score + 1); play('click'); setHl({ [sq]: 'good' }); let n = randSq(); while (n === target) n = randSq(); setTarget(n); }
    else { play('bad'); setHl({ [sq]: 'bad' }); }
  }
  return (
    <div>
      {!started ? (
        <div class="card">
          <p>Et feltnavn dukker opp. Trykk på feltet så fort du kan. Du har 30 sekunder.</p>
          <div class="btnrow"><button class={`btn ${color === 'w' ? '' : 'secondary'}`} onClick={() => setColor('w')}>Som hvit</button><button class={`btn ${color === 'b' ? '' : 'secondary'}`} onClick={() => setColor('b')}>Som svart</button></div>
          <button class="btn gold block" style={{ marginTop: '10px' }} onClick={() => setStarted(true)}>Start</button>
        </div>
      ) : (
        <div class="row" style={{ justifyContent: 'space-between', marginBottom: '8px' }}>
          <span class="timer">{time}s</span><span style={{ fontSize: '2rem', fontWeight: 900 }}>{target}</span><span class="chip">Poeng: {score}</span>
        </div>
      )}
      <Board fen="8/8/8/8/8/8/8/8 w - - 0 1" orientation={color} onSquareClick={click} highlights={hl} coords={!started} />
    </div>
  );
}

interface MateQ { fen: string; mate: boolean; escape?: string }
function MateQuiz({ onAgain }: { onAgain: () => void }) {
  const [qs, setQs] = useState<MateQ[] | null>(null);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [answer, setAnswer] = useState<boolean | null>(null);
  useEffect(() => { loadPuzzles().then((all) => setQs(buildMateQs(all))); }, []);
  if (!qs) return <div class="card muted center">Laster...</div>;
  if (i >= qs.length) return <Result id="matt" score={score} max={qs.length} onAgain={onAgain} />;
  const q = qs[i];
  function pick(a: boolean) { if (answer !== null) return; setAnswer(a); if (a === q.mate) { setScore(score + 1); play('good'); } else play('bad'); }
  const turn = q.fen.split(' ')[1];
  return (
    <div>
      <div class="progress-dots">{qs.map((_, k) => <span key={k} class={k <= i ? 'on' : ''} />)}</div>
      <p class="lesson-text">{turn === 'w' ? 'Hvit' : 'Svart'} står i sjakk. Er det <b>sjakkmatt</b>?</p>
      <Board fen={q.fen} orientation={turn as 'w' | 'b'} arrows={answer !== null && q.escape ? [{ from: q.escape.slice(0, 2), to: q.escape.slice(2, 4), color: '#2f7d4f' }] : []} />
      <div class="btnrow" style={{ marginTop: '10px' }}>
        <button class={`btn ${answer === null ? '' : q.mate ? 'good' : 'secondary'}`} onClick={() => pick(true)}>Ja, matt</button>
        <button class={`btn ${answer === null ? '' : !q.mate ? 'good' : 'secondary'}`} onClick={() => pick(false)}>Nei</button>
      </div>
      {answer !== null && (
        <>
          <div class={`status ${answer === q.mate ? 'good' : 'bad'}`}>{answer === q.mate ? 'Riktig!' : 'Feil.'} {q.mate ? 'Det er matt.' : 'Ikke matt: den grønne pilen viser en redning.'}</div>
          <button class="btn block" onClick={() => { setI(i + 1); setAnswer(null); }}>Neste</button>
        </>
      )}
    </div>
  );
}

function buildMateQs(all: Puzzle[]): MateQ[] {
  const yes: MateQ[] = [], no: MateQ[] = [];
  for (const p of shuffle(all).slice(0, 400)) {
    const c = new Chess(p.fen);
    try {
      for (const m of p.moves) {
        playUci(c, m);
        if (c.inCheck()) {
          if (c.isCheckmate()) { if (yes.length < 6) yes.push({ fen: c.fen(), mate: true }); }
          else if (no.length < 6) { const esc = c.moves({ verbose: true })[0]; no.push({ fen: c.fen(), mate: false, escape: esc.from + esc.to }); }
        }
      }
    } catch { /* hopp over */ }
    if (yes.length >= 5 && no.length >= 5) break;
  }
  return shuffle([...yes.slice(0, 5), ...no.slice(0, 5)]);
}

function HangQuiz({ onAgain }: { onAgain: () => void }) {
  const [qs, setQs] = useState<{ fen: string; target: string; from: string }[] | null>(null);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => {
    loadPuzzles().then((all) => {
      const list = shuffle(all.filter((p) => p.themes.includes('henger'))).slice(0, 10).map((p) => {
        const c = new Chess(p.fen); playUci(c, p.moves[0]);
        return { fen: c.fen(), target: p.moves[1].slice(2, 4), from: p.moves[1].slice(0, 2) };
      });
      setQs(list);
    });
  }, []);
  if (!qs) return <div class="card muted center">Laster...</div>;
  if (!qs.length) return <div class="card">Ingen oppgaver ennå.</div>;
  if (i >= qs.length) return <Result id="henger" score={score} max={qs.length} onAgain={onAgain} />;
  const q = qs[i];
  const turn = q.fen.split(' ')[1] as 'w' | 'b';
  function click(sq: string) { if (picked) return; setPicked(sq); if (sq === q.target) { setScore(score + 1); play('good'); } else play('bad'); }
  const hl: Record<string, Highlight> = {};
  if (picked) { hl[q.target] = 'good'; if (picked !== q.target) hl[picked] = 'bad'; }
  return (
    <div>
      <div class="progress-dots">{qs.map((_, k) => <span key={k} class={k <= i ? 'on' : ''} />)}</div>
      <p class="lesson-text">{turn === 'w' ? 'Hvit' : 'Svart'} i trekket. Trykk på motstanderens brikke som du kan <b>slå gratis</b>.</p>
      <Board fen={q.fen} orientation={turn} onSquareClick={click} highlights={hl} arrows={picked ? [{ from: q.from, to: q.target, color: '#2f7d4f' }] : []} />
      {picked && <><div class={`status ${picked === q.target ? 'good' : 'bad'}`}>{picked === q.target ? 'Riktig!' : 'Den grønne brikken var gratis.'}</div><button class="btn block" onClick={() => { setI(i + 1); setPicked(null); }}>Neste</button></>}
    </div>
  );
}

function makeCountQ() {
  const pieces: PieceType[] = ['n', 'b', 'r', 'q', 'k'];
  const piece = pieces[Math.floor(Math.random() * pieces.length)];
  const from = randSq();
  const blockers: string[] = [];
  const nb = Math.floor(Math.random() * 4);
  while (blockers.length < nb) { const s = randSq(); if (s !== from && !blockers.includes(s)) blockers.push(s); }
  const answer = starMoves(piece, from, blockers).length;
  const opts = new Set([answer]);
  while (opts.size < 4) { const d = answer + Math.floor(Math.random() * 9) - 4; if (d >= 0 && d !== answer) opts.add(d); }
  const placement: Record<string, string> = { [from]: piece.toUpperCase() };
  for (const b of blockers) placement[b] = 'P';
  let fen = '';
  for (let r = 8; r >= 1; r--) { let e = 0; for (const f of FILES) { const p = placement[f + r]; if (p) { if (e) { fen += e; e = 0; } fen += p; } else e++; } if (e) fen += e; if (r > 1) fen += '/'; }
  return { piece, from, fen: fen + ' w - - 0 1', answer, options: [...opts].sort((a, b) => a - b), dests: starMoves(piece, from, blockers) };
}

function CountQuiz({ onAgain }: { onAgain: () => void }) {
  const qs = useRef(Array.from({ length: 10 }, makeCountQ));
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  if (i >= qs.current.length) return <Result id="telling" score={score} max={10} onAgain={onAgain} />;
  const q = qs.current[i];
  function pick(n: number) { if (picked !== null) return; setPicked(n); if (n === q.answer) { setScore(score + 1); play('good'); } else play('bad'); }
  const hl: Record<string, Highlight> = {};
  if (picked !== null) for (const d of q.dests) hl[d] = 'target';
  return (
    <div>
      <div class="progress-dots">{qs.current.map((_, k) => <span key={k} class={k <= i ? 'on' : ''} />)}</div>
      <p class="lesson-text">Hvor mange felt kan <b>{PIECE_DEF[q.piece]}</b> på {q.from} gå til? Bøndene er dine egne.</p>
      <Board fen={q.fen} highlights={hl} />
      <div class="grid2" style={{ marginTop: '10px', gridTemplateColumns: 'repeat(4,1fr)' }}>
        {q.options.map((n) => <button key={n} class={`btn ${picked === null ? 'secondary' : n === q.answer ? 'good' : n === picked ? 'bad' : 'secondary'}`} onClick={() => pick(n)}>{n}</button>)}
      </div>
      {picked !== null && <><div class={`status ${picked === q.answer ? 'good' : 'bad'}`}>{picked === q.answer ? 'Riktig!' : `Riktig svar er ${q.answer}.`}</div><button class="btn block" onClick={() => { setI(i + 1); setPicked(null); }}>Neste</button></>}
    </div>
  );
}
