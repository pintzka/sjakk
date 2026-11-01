// Nivåtest ved første oppstart: 12 oppgaver. Riktig svar gir et stort hopp opp, feil et hopp ned.
// Hoppene blir mindre etter hvert. Til slutt regnes ratingen ut fra alle svarene samlet
// (hvor vanskelige oppgavene var og om du klarte dem), ikke bare fra hvor trappen endte.
import { useEffect, useState } from 'preact/hooks';
import { PuzzleBoard, type PuzzleResult } from '../board/PuzzleBoard';
import { loadPuzzles, type Puzzle } from '../lib/puzzles';
import { update, addXp, useProgress } from '../lib/store';
import { Confetti } from '../ui';

const START = 500;
const STEPS = [250, 200, 175, 150, 125, 100, 100, 75, 75, 60, 50, 50];

type Answer = { r: number; ok: boolean };

// Mest sannsynlige rating gitt svarene (Elo-kurve), med en bred startantagelse rundt 650.
export function estimate(answers: Answer[]) {
  let best = START, bestL = -Infinity;
  for (let R = 200; R <= 2600; R += 5) {
    let L = -((R - 650) ** 2) / (2 * 450 ** 2);
    for (const a of answers) {
      const p = 1 / (1 + 10 ** ((a.r - R) / 400));
      L += Math.log(a.ok ? p : 1 - p);
    }
    if (L > bestL) { bestL = L; best = R; }
  }
  return Math.round(best / 5) * 5;
}

// Velg en ubrukt oppgave så nær målet som mulig (litt tilfeldig blant de nærmeste)
function pickNear(all: Puzzle[], target: number, used: string[]) {
  const c = all.filter((p) => !used.includes(p.id)).sort((a, b) => Math.abs(a.rating - target) - Math.abs(b.rating - target)).slice(0, 5);
  return c[Math.floor(Math.random() * c.length)];
}

export function Placement({ onStart, onClose }: { onStart: () => void; onClose: () => void }) {
  const s = useProgress();
  const [stage, setStage] = useState<'intro' | 'test' | 'done'>('intro');
  const [name, setName] = useState(s.name);
  const [all, setAll] = useState<Puzzle[] | null>(null);
  const [i, setI] = useState(0);
  const [target, setTarget] = useState(START);
  const [pz, setPz] = useState<Puzzle | null>(null);
  const [answered, setAnswered] = useState<boolean | null>(null);
  const [used, setUsed] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [rating, setRating] = useState(START);

  useEffect(() => { loadPuzzles().then(setAll); }, []);
  useEffect(() => { if (all && stage === 'test') setPz(pickNear(all, target, used)); }, [all, stage, i]);

  function onDone(r: PuzzleResult) {
    if (!pz) return;
    setAnswered(r.clean);
    setAnswers([...answers, { r: pz.rating, ok: r.clean }]);
    setTarget(Math.max(250, target + (r.clean ? STEPS[i] : -STEPS[i])));
    setUsed([...used, pz.id]);
  }
  function next() {
    setAnswered(null);
    if (i + 1 >= STEPS.length) {
      const est = estimate(answers);
      const play = Math.max(250, est - 75);
      update((st) => { st.puzzleRating = est; st.playRating = play; st.placementDone = true; st.name = name.trim(); st.ratingHistory.push({ d: new Date().toISOString().slice(0, 10), puzzle: est, play }); });
      addXp(60);
      setRating(est);
      setStage('done');
    } else setI(i + 1);
  }

  if (stage === 'intro') return (
    <div class="card" style={{ marginTop: '20px' }}>
      <h1>Velkommen til Sjakkreisen!</h1>
      <p>Her lærer du sjakk med leksjoner, taktikkoppgaver, quiz og boter du kan spille mot. Jo mer du øver, jo flere nivåer, merker og brett låser du opp.</p>
      <p>Først en <b>nivåtest</b> med 12 oppgaver. Du får ett forsøk på hver. Klarer du den, blir neste mye vanskeligere. Bommer du, blir neste lettere. Det er helt vanlig å bomme på de siste!</p>
      <label class="small muted">Hva heter du?</label>
      <input type="text" value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} placeholder="Navnet ditt" style={{ margin: '4px 0 12px' }} />
      <button class="btn block" onClick={() => { onStart(); setStage('test'); }}>Start nivåtesten</button>
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
      <div class="label">Startratingen din</div>
      <div class="bignum" style={{ fontSize: '3rem', margin: '4px 0 8px' }}>{rating}</div>
      <p>Du klarte {answers.filter((a) => a.ok).length} av {answers.length}. Ratingen går opp når du løser oppgaver og vinner partier.</p>
      <p class="muted">+60 XP for å ta testen.</p>
      <button class="btn block" onClick={() => { onClose(); location.hash = '#/reise'; }}>Start reisen</button>
    </div>
  );
  return (
    <div>
      <div class="topbar"><div class="title">Nivåtest</div><span class="chip">{i + 1} / {STEPS.length}</span></div>
      <div class="progress-dots">{STEPS.map((_, k) => <span key={k} class={k < answers.length ? (answers[k].ok ? 'on good' : 'on bad') : k === i ? 'on' : ''} />)}</div>
      {pz && <PuzzleBoard key={pz.id} fen={pz.fen} moves={pz.moves} setupMove onDone={onDone} allowHint={false} oneTry />}
      {answered !== null && <button class="btn block" style={{ marginTop: '10px' }} onClick={next}>{i + 1 >= STEPS.length ? 'Se resultatet' : 'Neste'}</button>}
    </div>
  );
}
