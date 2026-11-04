import { useEffect, useState } from 'preact/hooks';
import { PuzzleBoard, type PuzzleResult } from '../board/PuzzleBoard';
import { loadPuzzles, pickPuzzle, dailyPuzzle, recordPuzzle, THEMES, type Puzzle } from '../lib/puzzles';
import { ratePuzzle, addXp, useProgress, checkBadges, update, today } from '../lib/store';
import { TopBar } from '../ui';

export function Puzzles({ daily }: { daily?: boolean }) {
  const s = useProgress();
  const [all, setAll] = useState<Puzzle[] | null>(null);
  const [theme, setTheme] = useState('alle');
  const [pz, setPz] = useState<Puzzle | null>(null);
  const [result, setResult] = useState<{ delta: number; xp: number; clean: boolean } | null>(null);

  useEffect(() => { loadPuzzles().then((a) => { setAll(a); }); }, []);
  useEffect(() => {
    if (!all) return;
    if (daily) setPz(dailyPuzzle(all));
    else setPz(pickPuzzle(all, theme));
    setResult(null);
  }, [all, theme]);

  function onDone(r: PuzzleResult) {
    if (!pz) return;
    const delta = ratePuzzle(pz.rating, r.clean);
    recordPuzzle(pz, r.clean);
    let xp = r.clean ? 10 : r.mistakes <= 1 && !r.hinted ? 4 : 2;
    if (daily && !s.daily[today()]) { xp += 25; update((st) => { st.daily[today()] = true; }); }
    addXp(xp); checkBadges();
    setResult({ delta, xp, clean: r.clean });
  }

  function next() { if (all) { setPz(pickPuzzle(all, theme, { avoid: pz ? [pz.id] : [] })); setResult(null); } }

  const dueCount = s.review.filter((r) => r.due <= today()).length;
  return (
    <div>
      <TopBar title={daily ? 'Dagens oppgave' : 'Taktikkoppgaver'} back={daily ? '#/' : undefined} />
      <div class="row" style={{ marginBottom: '10px' }}>
        <span class="chip">Oppgaverating: {Math.round(s.puzzleRating)}</span>
        <span class="chip">På rad: {s.puzzles.inARow}</span>
        {dueCount > 0 && !daily && <span class="chip" style={{ borderColor: 'var(--gold)' }}>Repetisjon: {dueCount}</span>}
      </div>
      {!daily && (
        <div class="tabs">
          {Object.entries(THEMES).map(([k, v]) => <button key={k} class={`tab ${theme === k ? 'on' : ''}`} onClick={() => setTheme(k)}>{v}</button>)}
        </div>
      )}
      {!pz && <div class="card center muted">Laster oppgaver...</div>}
      {pz && (
        <>
          <PuzzleBoard key={pz.id} fen={pz.fen} moves={pz.moves} setupMove onDone={onDone} allowSolution engineCheck autoExplain>
          <div class="row small muted" style={{ justifyContent: 'space-between', marginTop: '6px' }}>
            <span>{pz.themes.map((t) => THEMES[t] ?? t).join(' · ')}</span>
            {result && <span>Oppgavens rating: {pz.rating}</span>}
          </div>
          {result && (
            <div class="card" style={{ marginTop: '10px' }}>
              <div class="row">
                <div class="grow">
                  <b>{result.clean ? 'Løst!' : 'Neste gang sitter den!'}</b>
                  <div class="small muted">
                    Rating {result.delta >= 0 ? '+' : ''}{result.delta} · +{result.xp} XP
                    {!result.clean && ' · Kommer tilbake i morgen for repetisjon'}
                  </div>
                </div>
                {daily ? <a class="btn" href="#/oppgaver">Flere oppgaver</a> : <button class="btn" onClick={next}>Neste</button>}
              </div>
            </div>
          )}
          <div class="card desktop-only small" style={{ marginTop: '10px' }}>
            <div class="label">Slik velges oppgavene</div>
            <p style={{ margin: '6px 0 0' }}>Du får oppgaver rundt din egen rating ({Math.round(s.puzzleRating)}). Løser du dem, går ratingen opp og oppgavene blir vanskeligere. Bommer du, kommer oppgaven tilbake for repetisjon etter 1, 3 og 7 dager.</p>
            <p class="muted" style={{ margin: '6px 0 0' }}>Løst: {s.puzzles.solved} · Bommet: {s.puzzles.failed} · Beste rekke: {s.puzzles.bestInARow}</p>
          </div>
          </PuzzleBoard>
        </>
      )}
    </div>
  );
}
