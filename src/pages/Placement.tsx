// Nivåtest ved første oppstart: 8 oppgaver som blir lettere eller vanskeligere etter svarene.
import { useEffect, useState } from 'preact/hooks';
import { PuzzleBoard, type PuzzleResult } from '../board/PuzzleBoard';
import { loadPuzzles, pickPuzzle, type Puzzle } from '../lib/puzzles';
import { update, addXp, useProgress } from '../lib/store';
import { Confetti } from '../ui';

const STEPS = [150, 125, 100, 100, 75, 75, 50, 50];

export function Placement() {
  const s = useProgress();
  const [stage, setStage] = useState<'intro' | 'test' | 'done'>('intro');
  const [name, setName] = useState(s.name);
  const [all, setAll] = useState<Puzzle[] | null>(null);
  const [i, setI] = useState(0);
  const [rating, setRating] = useState(450);
  const [pz, setPz] = useState<Puzzle | null>(null);
  const [answered, setAnswered] = useState<boolean | null>(null);
  const [used, setUsed] = useState<string[]>([]);

  useEffect(() => { loadPuzzles().then(setAll); }, []);
  useEffect(() => { if (all && stage === 'test') setPz(pickPuzzle(all, 'alle', { rating, avoid: used })); }, [all, stage, i]);

  function onDone(r: PuzzleResult) {
    setAnswered(r.clean);
    const nr = Math.max(250, rating + (r.clean ? STEPS[i] : -STEPS[i]));
    setRating(nr);
    if (pz) setUsed([...used, pz.id]);
  }
  function next() {
    setAnswered(null);
    if (i + 1 >= STEPS.length) {
      update((st) => { st.puzzleRating = rating; st.playRating = Math.max(250, rating - 50); st.placementDone = true; st.name = name.trim(); st.ratingHistory.push({ d: new Date().toISOString().slice(0, 10), puzzle: rating, play: Math.max(250, rating - 50) }); });
      addXp(40);
      setStage('done');
    } else setI(i + 1);
  }

  if (stage === 'intro') return (
    <div class="card" style={{ marginTop: '20px' }}>
      <h1>Velkommen til Sjakkreisen!</h1>
      <p>Her lærer du sjakk med leksjoner, taktikkoppgaver, quiz og boter du kan spille mot. Jo mer du øver, jo flere nivåer, merker og brett låser du opp.</p>
      <p>Først en kort <b>nivåtest</b>: 8 oppgaver. De blir vanskeligere når du svarer riktig og lettere når du bommer. Det er helt greit å bomme!</p>
      <label class="small muted">Hva heter du?</label>
      <input type="text" value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} placeholder="Navnet ditt" style={{ margin: '4px 0 12px' }} />
      <button class="btn block" onClick={() => setStage('test')}>Start nivåtesten</button>
      <div class="btnrow" style={{ marginTop: '8px' }}>
        <a class="btn secondary" href="#/konto">Jeg har bruker</a>
        <button class="btn secondary" onClick={() => { update((st) => { st.placementDone = true; st.name = name.trim(); }); }}>Hopp over</button>
      </div>
    </div>
  );
  if (stage === 'done') return (
    <div class="card center" style={{ marginTop: '20px' }}>
      <Confetti />
      <h1>Ferdig!</h1>
      <p>Startratingen din er <b>{rating}</b>. Den går opp når du løser oppgaver og vinner partier.</p>
      <p class="muted">+40 XP for å ta testen.</p>
      <a class="btn block" href="#/reise">Start reisen</a>
    </div>
  );
  return (
    <div>
      <div class="topbar"><div class="title">Nivåtest</div><span class="chip">{i + 1} / {STEPS.length}</span></div>
      <div class="progress-dots">{STEPS.map((_, k) => <span key={k} class={k <= i ? 'on' : ''} />)}</div>
      {pz && <PuzzleBoard key={pz.id} fen={pz.fen} moves={pz.moves} setupMove onDone={onDone} allowHint={false} oneTry />}
      {answered !== null && <button class="btn block" style={{ marginTop: '10px' }} onClick={next}>{i + 1 >= STEPS.length ? 'Se resultatet' : 'Neste'}</button>}
    </div>
  );
}
