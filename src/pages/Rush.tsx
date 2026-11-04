// Lynrunde: løs så mange oppgaver du klarer på 3 minutter. Tre feil, og runden er over.
// Oppgavene starter lett og blir vanskeligere for hver du klarer.
import { useEffect, useRef, useState } from 'preact/hooks';
import { PuzzleBoard, type PuzzleResult } from '../board/PuzzleBoard';
import { loadPuzzles, type Puzzle } from '../lib/puzzles';
import { useProgress, update, addXp, addPoints, goalProgress, checkBadges } from '../lib/store';
import { play } from '../lib/sound';
import { TopBar, Confetti, IconTimer } from '../ui';

const SECONDS = 180;
const LIVES = 3;

function pickNear(all: Puzzle[], target: number, used: Set<string>) {
  const c = all.filter((p) => !used.has(p.id)).sort((a, b) => Math.abs(a.rating - target) - Math.abs(b.rating - target)).slice(0, 6);
  return c[Math.floor(Math.random() * c.length)];
}

export function Rush() {
  const s = useProgress();
  const [all, setAll] = useState<Puzzle[] | null>(null);
  const [stage, setStage] = useState<'intro' | 'run' | 'done'>('intro');
  const [pz, setPz] = useState<Puzzle | null>(null);
  const [solved, setSolved] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [left, setLeft] = useState(SECONDS);
  const [result, setResult] = useState<{ score: number; record: boolean } | null>(null);
  const used = useRef(new Set<string>());
  const target = useRef(400);
  const endAt = useRef(0);
  const ended = useRef(false);

  useEffect(() => { loadPuzzles().then(setAll); }, []);

  useEffect(() => {
    if (stage !== 'run') return;
    const t = setInterval(() => {
      const l = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setLeft(l);
      if (l <= 0) finish(solvedRef.current);
    }, 250);
    return () => clearInterval(t);
  }, [stage]);

  const solvedRef = useRef(0);
  const livesRef = useRef(LIVES);

  function start() {
    if (!all) return;
    used.current = new Set();
    ended.current = false;
    // Start litt under din egen rating, men aldri over 600
    target.current = Math.min(600, Math.max(300, s.puzzleRating - 250));
    solvedRef.current = 0; livesRef.current = LIVES;
    setSolved(0); setLives(LIVES); setLeft(SECONDS); setResult(null);
    endAt.current = Date.now() + SECONDS * 1000;
    nextPuzzle();
    setStage('run');
  }

  function nextPuzzle() {
    if (!all) return;
    const p = pickNear(all, target.current, used.current);
    used.current.add(p.id);
    setPz(p);
  }

  function onDone(r: PuzzleResult) {
    if (ended.current) return;
    if (r.clean) {
      solvedRef.current += 1;
      setSolved(solvedRef.current);
      target.current += 60;
      goalProgress('puzzles');
      setTimeout(() => { if (!ended.current) nextPuzzle(); }, 350);
    } else {
      const l = livesRef.current - 1;
      livesRef.current = l;
      setLives(l);
      target.current = Math.max(300, target.current - 40);
      if (l <= 0) { setTimeout(() => finish(solvedRef.current), 900); return; }
      setTimeout(() => { if (!ended.current) nextPuzzle(); }, 900);
    }
  }

  function finish(score: number) {
    if (ended.current) return;
    ended.current = true;
    let record = false;
    update((st) => { st.rush.plays += 1; if (score > st.rush.best) { st.rush.best = score; record = score > 0; } });
    addXp(score * 3); addPoints(score * 2); checkBadges();
    play(record ? 'win' : 'good');
    setResult({ score, record });
    setStage('done');
  }

  const mm = Math.floor(left / 60), ss = String(left % 60).padStart(2, '0');

  if (stage === 'intro' || !all) return (
    <div>
      <TopBar title="Lynrunde" back="#/oppgaver" />
      <div class="card center" style={{ maxWidth: '520px', margin: '0 auto 12px' }}>
        <div style={{ color: 'var(--gold)' }}><IconTimer size={48} /></div>
        <h1>Lynrunde</h1>
        <p>Løs så mange oppgaver du klarer på <b>3 minutter</b>. Du har <b>3 liv</b>. Oppgavene starter lette og blir vanskeligere for hver du klarer.</p>
        <p class="muted small">Hver oppgave du løser gir 2 poeng og 3 XP. Lynrunden endrer ikke oppgaveratingen din.</p>
        <div class="row" style={{ justifyContent: 'center', gap: '24px', margin: '12px 0' }}>
          <div><div class="bignum">{s.rush.best}</div><div class="label">Rekord</div></div>
          <div><div class="bignum">{s.rush.plays}</div><div class="label">Runder</div></div>
        </div>
        <button class="btn block" disabled={!all} onClick={start}>{all ? 'Start' : 'Laster...'}</button>
      </div>
    </div>
  );

  if (stage === 'done' && result) return (
    <div>
      <TopBar title="Lynrunde" back="#/oppgaver" />
      {result.record && <Confetti />}
      <div class="card center" style={{ maxWidth: '520px', margin: '0 auto 12px' }}>
        <div class="label">{lives <= 0 ? 'Tom for liv' : 'Tiden er ute'}</div>
        <div class="bignum" style={{ fontSize: '3.4rem', margin: '6px 0' }}>{result.score}</div>
        <p>{result.score === 1 ? 'oppgave løst' : 'oppgaver løst'}{result.record && <><br /><b style={{ color: 'var(--gold)' }}>Ny rekord!</b></>}</p>
        <p class="muted">+{result.score * 3} XP · +{result.score * 2} poeng · Rekord: {s.rush.best}</p>
        <div class="btnrow"><button class="btn" onClick={start}>Prøv igjen</button><a class="btn secondary" href="#/tabell">Se tabellen</a></div>
      </div>
    </div>
  );

  return (
    <div>
      <div class="topbar">
        <div class="title">Lynrunde</div>
        <span class={`chip rush-time ${left <= 20 ? 'low' : ''}`}><IconTimer size={16} /> {mm}:{ss}</span>
        <span class="chip" aria-label={`${lives} liv igjen`}>{Array.from({ length: LIVES }, (_, i) => <span key={i} style={{ color: i < lives ? 'var(--bad)' : 'var(--line)' }}>♥</span>)}</span>
        <span class="chip"><b>{solved}</b>&nbsp;løst</span>
      </div>
      {pz && <PuzzleBoard key={pz.id} fen={pz.fen} moves={pz.moves} setupMove onDone={onDone} allowHint={false} oneTry engineCheck />}
    </div>
  );
}
