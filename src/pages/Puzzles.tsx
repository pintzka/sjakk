import { useEffect, useState } from 'preact/hooks';
import { Chess } from 'chess.js';
import { norsk } from '../lib/chess';
import { PuzzleBoard, type PuzzleResult } from '../board/PuzzleBoard';
import { loadPuzzles, pickPuzzle, dailyPuzzle, recordPuzzle, THEMES, type Puzzle } from '../lib/puzzles';
import { ratePuzzle, addXp, useProgress, checkBadges, update, today, addPoints, goalProgress, type MyPuzzle } from '../lib/store';
import { TopBar, IconTimer } from '../ui';

export function Puzzles({ daily, start }: { daily?: boolean; start?: string }) {
  const s = useProgress();
  const [all, setAll] = useState<Puzzle[] | null>(null);
  const [theme, setTheme] = useState(start === 'mine' && s.myPuzzles.length ? 'mine' : 'alle');
  const [pz, setPz] = useState<Puzzle | null>(null);
  const [result, setResult] = useState<{ delta: number; xp: number; clean: boolean; pts: number } | null>(null);

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
    let pts = r.clean ? Math.max(2, Math.round(pz.rating / 100)) : 1;
    if (daily && !s.daily[today()]) { xp += 25; pts += 10; update((st) => { st.daily[today()] = true; }); }
    addXp(xp); addPoints(pts); goalProgress('puzzles'); checkBadges();
    setResult({ delta, xp, clean: r.clean, pts });
  }

  function next() { if (all) { setPz(pickPuzzle(all, theme, { avoid: pz ? [pz.id] : [] })); setResult(null); } }
  if (theme === 'mine' && !daily) return (
    <div>
      <TopBar title="Taktikkoppgaver" />
      <Tabs theme={theme} setTheme={setTheme} mineCount={s.myPuzzles.length} />
      <MinePuzzles />
    </div>
  );

  const dueCount = s.review.filter((r) => r.due <= today()).length;
  return (
    <div>
      <TopBar title={daily ? 'Dagens oppgave' : 'Taktikkoppgaver'} back={daily ? '#/' : undefined} />
      <div class="row" style={{ marginBottom: '10px', flexWrap: 'wrap' }}>
        <span class="chip">Oppgaverating: {Math.round(s.puzzleRating)}</span>
        <span class="chip">På rad: {s.puzzles.inARow}</span>
        {dueCount > 0 && !daily && <span class="chip" style={{ borderColor: 'var(--gold)' }}>Repetisjon: {dueCount}</span>}
        {!daily && <a class="btn small gold" href="#/lyn" style={{ marginLeft: 'auto' }}><IconTimer size={16} /> Lynrunde</a>}
      </div>
      {!daily && <Tabs theme={theme} setTheme={setTheme} mineCount={s.myPuzzles.length} />}
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
                    Rating {result.delta >= 0 ? '+' : ''}{result.delta} · +{result.xp} XP · +{result.pts} poeng
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

function Tabs({ theme, setTheme, mineCount }: { theme: string; setTheme: (t: string) => void; mineCount: number }) {
  return (
    <div class="tabs">
      {Object.entries(THEMES).map(([k, v]) => <button key={k} class={`tab ${theme === k ? 'on' : ''}`} onClick={() => setTheme(k)}>{v}</button>)}
      {mineCount > 0 && <button class={`tab ${theme === 'mine' ? 'on' : ''}`} onClick={() => setTheme('mine')}>Mine feil ({mineCount})</button>}
    </div>
  );
}

// Oppgaver laget av feil fra dine egne partier. Løser du en to ganger uten feil, er den lært og forsvinner.
function MinePuzzles() {
  const s = useProgress();
  const pickMine = (avoid?: string) => {
    const list = s.myPuzzles.filter((p) => p.id !== avoid);
    if (!list.length) return s.myPuzzles[0] ?? null;
    const min = Math.min(...list.map((p) => p.solved));
    const c = list.filter((p) => p.solved === min);
    return c[Math.floor(Math.random() * c.length)];
  };
  const [mp, setMp] = useState<MyPuzzle | null>(() => pickMine());
  const [res, setRes] = useState<{ clean: boolean; learned: boolean } | null>(null);
  if (!mp) return <div class="card center muted">Ingen egne feil ennå. Spill et parti mot en bot og trykk «Se gjennom» etterpå.</div>;
  const playedSan = (() => { try { return norsk(new Chess(mp.fen).move({ from: mp.played.slice(0, 2), to: mp.played.slice(2, 4), promotion: mp.played[4] || undefined }).san); } catch { return mp.played; } })();
  function onDone(r: PuzzleResult) {
    let learned = false;
    update((st) => {
      const x = st.myPuzzles.find((p) => p.id === mp!.id);
      if (!x) return;
      if (r.clean) { x.solved += 1; if (x.solved >= 2) { st.myPuzzles = st.myPuzzles.filter((p) => p.id !== x.id); learned = true; } }
    });
    addXp(r.clean ? 12 : 3); addPoints(r.clean ? 4 : 1); goalProgress('puzzles'); checkBadges();
    setRes({ clean: r.clean, learned });
  }
  return (
    <PuzzleBoard key={mp.id} fen={mp.fen} moves={[mp.best]} onDone={onDone} allowSolution engineCheck autoExplain
      prompt={`Fra partiet ditt ${mp.date.slice(8)}.${mp.date.slice(5, 7)}: du spilte ${playedSan}. Finn et bedre trekk!`}>
      {res && (
        <div class="card" style={{ marginTop: '10px' }}>
          <div class="row">
            <div class="grow"><b>{res.learned ? 'Lært! Denne er ute av lista.' : res.clean ? 'Riktig! Klarer du den én gang til, er den lært.' : 'Den kommer tilbake.'}</b><div class="small muted">+{res.clean ? 12 : 3} XP · +{res.clean ? 4 : 1} poeng</div></div>
            <button class="btn" onClick={() => { setMp(pickMine(mp.id)); setRes(null); }}>Neste</button>
          </div>
        </div>
      )}
      <p class="small muted" style={{ marginTop: '8px' }}>{s.myPuzzles.length} egne feil å øve på. De lages når du ser gjennom et parti mot en bot.</p>
    </PuzzleBoard>
  );
}
