// Åpningstrener: lær trekkene i starten av partiet og hvorfor de er gode.
// «Lær» viser neste trekk med pil og forklaring. «Øv» er uten hjelp, og variantene kommer tilbake til repetisjon.
import { useEffect, useRef, useState } from 'preact/hooks';
import { Chess } from 'chess.js';
import { Board, type Arrow } from '../board/Board';
import { destsOf, needsPromotion, checkSquare, norsk } from '../lib/chess';
import { play } from '../lib/sound';
import { OPENINGS, openingById, lineKey, type Opening, type OpeningLine } from '../data/openings';
import { useProgress, update, addXp, addPoints, goalProgress, checkBadges, today, type OpeningRep } from '../lib/store';
import { TopBar, Avatar, MoveList, Confetti, IconBook } from '../ui';

const INTERVALS = [1, 3, 7, 14, 30];
const addDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv-SE'); };
const strip = (san: string) => san.replace(/[+#?!]/g, '');
const fmtDate = (d: string) => `${+d.slice(8)}.${+d.slice(5, 7)}.`;
const isDue = (r?: OpeningRep) => !!r && r.due <= today();

function dueLines(reps: Record<string, OpeningRep>, only?: Opening) {
  const out: { o: Opening; l: OpeningLine }[] = [];
  for (const o of only ? [only] : OPENINGS) for (const l of o.lines) if (isDue(reps[lineKey(o, l)])) out.push({ o, l });
  return out;
}

// ---------- Oversikt ----------
export function Openings({ arg }: { arg?: string }) {
  const s = useProgress();
  const reps = s.openings ?? {};
  const due = dueLines(reps);
  if (arg === 'ov') return <PracticeQueue title="Repetisjon" back="#/apninger" queue={due} />;

  const card = (o: Opening) => {
    const learned = o.lines.filter((l) => reps[lineKey(o, l)]).length;
    const d = o.lines.filter((l) => isDue(reps[lineKey(o, l)])).length;
    return (
      <a key={o.id} href={`#/apning/${o.id}`} class="card click opening-card">
        <div class="row" style={{ alignItems: 'flex-start' }}>
          <Avatar piece={o.side === 'w' ? 'n' : 'b'} color={o.side === 'w' ? '#e9e1cf' : '#3a3530'} size={44} />
          <div class="grow">
            <div class="row" style={{ gap: '8px', flexWrap: 'wrap' }}><b>{o.name}</b><span class="chip small">{o.level}</span>{d > 0 && <span class="chip small" style={{ borderColor: 'var(--gold)' }}>{d} til repetisjon</span>}</div>
            <div class="small muted" style={{ marginTop: '2px' }}>{o.short}</div>
            <div class="bar" style={{ marginTop: '8px' }}><i style={{ width: `${(learned / o.lines.length) * 100}%` }} /></div>
            <div class="small muted" style={{ marginTop: '4px' }}>{learned} av {o.lines.length} varianter lært</div>
          </div>
        </div>
      </a>
    );
  };
  return (
    <div>
      <TopBar title="Åpninger" back="#/reise" />
      <p class="muted" style={{ marginTop: 0 }}>Lær de første trekkene i partiet, og hvorfor de er gode. Varianter du har lært, kommer tilbake til repetisjon etter 1, 3, 7, 14 og 30 dager, så du husker dem.</p>
      {due.length > 0 && (
        <a href="#/apninger/ov" class="card click accent">
          <div class="row"><IconBook /><div class="grow"><b>Repetisjon i dag</b><div class="small">{due.length} {due.length === 1 ? 'variant' : 'varianter'} venter</div></div><span class="btn small secondary">Start</span></div>
        </a>
      )}
      <div class="opening-cols">
        <div><div class="label" style={{ margin: '14px 0 8px' }}>Når du spiller hvit</div>{OPENINGS.filter((o) => o.side === 'w').map(card)}</div>
        <div><div class="label" style={{ margin: '14px 0 8px' }}>Når du spiller svart</div>{OPENINGS.filter((o) => o.side === 'b').map(card)}</div>
      </div>
    </div>
  );
}

// ---------- Én åpning ----------
export function OpeningPage({ id }: { id: string }) {
  const s = useProgress();
  const o = openingById(id);
  const [run, setRun] = useState<{ queue: OpeningLine[]; mode: 'learn' | 'practice' } | null>(null);
  if (!o) return <div><TopBar title="Åpninger" back="#/apninger" /><div class="card">Fant ikke åpningen.</div></div>;
  const reps = s.openings ?? {};
  if (run) return <PracticeQueue title={o.name} queue={run.queue.map((l) => ({ o, l }))} mode={run.mode} onExit={() => setRun(null)} />;
  const due = dueLines(reps, o);
  const firstNew = o.lines.find((l) => !reps[lineKey(o, l)]);
  return (
    <div>
      <TopBar title={o.name} back="#/apninger" />
      <div class="opening-cols">
        <div>
          <div class="card">
            <div class="row" style={{ gap: '8px', marginBottom: '6px' }}><span class="chip">{o.side === 'w' ? 'Du spiller hvit' : 'Du spiller svart'}</span><span class="chip">{o.level}</span></div>
            <p style={{ margin: '4px 0 8px' }}>{o.short}</p>
            <div class="label">Ideene</div>
            <ul class="ideas">{o.ideas.map((t) => <li key={t}>{t}</li>)}</ul>
          </div>
          <div class="btnrow" style={{ marginBottom: '12px' }}>
            {firstNew && <button class="btn" onClick={() => setRun({ queue: [firstNew], mode: 'learn' })}>Lær neste variant</button>}
            {due.length > 0 && <button class="btn gold" onClick={() => setRun({ queue: due.map((x) => x.l), mode: 'practice' })}>Repeter ({due.length})</button>}
            {!firstNew && !due.length && <button class="btn secondary" onClick={() => setRun({ queue: [...o.lines].sort(() => Math.random() - 0.5), mode: 'practice' })}>Øv på alle</button>}
          </div>
        </div>
        <div>
          <div class="label" style={{ margin: '4px 0 8px' }}>Varianter</div>
          {o.lines.map((l) => {
            const r = reps[lineKey(o, l)];
            const mine = l.steps.filter((_, i) => (o.side === 'w' ? i % 2 === 0 : i % 2 === 1)).length;
            return (
              <div key={l.id} class="card line-row">
                <div class="grow">
                  <b>{l.name}</b>
                  <div class="small muted">{mine} trekk å huske · {line(l, 6)}…</div>
                  <div class="small" style={{ marginTop: '4px' }}>
                    {!r ? <span class="muted">Ikke lært ennå</span>
                      : isDue(r) ? <span style={{ color: 'var(--gold)' }}>Klar for repetisjon</span>
                      : <span class="muted">Lært · neste repetisjon {fmtDate(r.due)}</span>}
                    {r && <span class="rep-dots" aria-label={`${r.reps} repetisjoner på rad`}>{INTERVALS.map((_, k) => <i key={k} class={k < r.reps ? 'on' : ''} />)}</span>}
                  </div>
                </div>
                <div class="line-btns">
                  {r && <button class="btn small" onClick={() => setRun({ queue: [l], mode: 'practice' })}>Øv</button>}
                  <button class={`btn small ${r ? 'secondary' : ''}`} onClick={() => setRun({ queue: [l], mode: 'learn' })}>{r ? 'Se igjen' : 'Lær'}</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function line(l: OpeningLine, n: number) {
  return l.steps.slice(0, n).map(([san], i) => (i % 2 === 0 ? `${i / 2 + 1}.${norsk(san)}` : norsk(san))).join(' ');
}

// ---------- Kjør en eller flere varianter etter hverandre ----------
function PracticeQueue({ title, back, queue, mode = 'practice', onExit }: { title: string; back?: string; queue: { o: Opening; l: OpeningLine }[]; mode?: 'learn' | 'practice'; onExit?: () => void }) {
  const [list] = useState(queue);
  const [i, setI] = useState(0);
  const [m, setM] = useState(mode);
  const [attempt, setAttempt] = useState(0);
  const [res, setRes] = useState<{ misses: number; xp: number; pts: number; learned: boolean } | null>(null);
  const cur = list[i];
  const exit = () => { if (onExit) onExit(); else location.hash = back ?? '#/apninger'; };
  if (!cur) return (
    <div>
      <TopBar title={title} back={back} />
      <div class="card center"><h2>Ingen varianter å repetere nå</h2><p class="muted">Kom tilbake i morgen, eller lær en ny variant.</p><button class="btn" onClick={exit}>Tilbake</button></div>
    </div>
  );
  function onDone(misses: number) {
    const key = lineKey(cur.o, cur.l);
    let xp = 0, pts = 0, learned = false;
    update((s) => {
      s.openings = { ...(s.openings ?? {}) };
      const r = s.openings[key];
      if (m === 'learn' || !r) {
        learned = !r;
        s.openings[key] = r ? { ...r, tries: r.tries + 1 } : { learned: today(), reps: 0, due: addDays(1), clean: 0, tries: 1 };
        xp = r ? 5 : 15; pts = r ? 1 : 3;
      } else if (misses === 0) {
        const reps = r.reps + 1;
        s.openings[key] = { ...r, reps, clean: r.clean + 1, tries: r.tries + 1, due: addDays(INTERVALS[Math.min(reps, INTERVALS.length) - 1]) };
        xp = 10; pts = 3;
      } else {
        s.openings[key] = { ...r, reps: 0, tries: r.tries + 1, due: addDays(1) };
        xp = 4; pts = 1;
      }
    });
    addXp(xp); addPoints(pts); goalProgress('lessons'); checkBadges();
    play(misses === 0 ? 'star' : 'good');
    setRes({ misses, xp, pts, learned });
    // På mobil ligger resultatet under brettet: rull det fram
    window.setTimeout(() => document.getElementById('opening-result')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
  }
  const last = i + 1 >= list.length;
  return (
    <div>
      <TopBar title={title} back={onExit ? undefined : back} />
      {onExit && !res && <button class="btn secondary small" style={{ marginBottom: '8px' }} onClick={exit}>Avslutt</button>}
      <Trainer key={`${i}-${m}-${attempt}`} o={cur.o} l={cur.l} mode={m} onDone={onDone} frozen={!!res}>
        {res && (
          <div class="card" id="opening-result" style={{ marginTop: '10px' }}>
            {res.misses === 0 && m === 'practice' && <Confetti />}
            <b>{m === 'learn' ? (res.learned ? 'Variant lært!' : 'Bra repetert!') : res.misses === 0 ? 'Feilfritt!' : `${res.misses} ${res.misses === 1 ? 'feil' : 'feil'} denne gangen`}</b>
            <div class="small muted">+{res.xp} XP · +{res.pts} poeng{m === 'learn' && res.learned ? ' · Den kommer tilbake til repetisjon i morgen' : ''}{m === 'practice' && res.misses > 0 ? ' · Den kommer tilbake i morgen' : ''}</div>
            <div class="btnrow" style={{ marginTop: '10px' }}>
              {m === 'learn' && <button class="btn" onClick={() => { setM('practice'); setRes(null); setAttempt(attempt + 1); }}>Øv uten hjelp</button>}
              {!last && <button class={`btn ${m === 'learn' ? 'secondary' : ''}`} onClick={() => { setI(i + 1); setM(mode); setRes(null); setAttempt(attempt + 1); }}>Neste variant</button>}
              {m === 'practice' && res.misses > 0 && <button class="btn secondary" onClick={() => { setRes(null); setAttempt(attempt + 1); }}>Prøv igjen</button>}
              <button class="btn secondary" onClick={exit}>{last ? 'Ferdig' : 'Avslutt'}</button>
            </div>
          </div>
        )}
      </Trainer>
    </div>
  );
}

// ---------- Selve brettet ----------
function Trainer({ o, l, mode, onDone, frozen, children }: { o: Opening; l: OpeningLine; mode: 'learn' | 'practice'; onDone: (misses: number) => void; frozen?: boolean; children?: any }) {
  const chRef = useRef(new Chess());
  const [fen, setFen] = useState(chRef.current.fen());
  const [ply, setPly] = useState(0);
  const [last, setLast] = useState<[string, string] | null>(null);
  const [flash, setFlash] = useState<{ kind: 'good' | 'bad'; key: number } | null>(null);
  const [wrong, setWrong] = useState(0);
  const [notes, setNotes] = useState<{ san: string; text?: string; mine: boolean }[]>([]);
  const [finished, setFinished] = useState(false);
  const misses = useRef(0);
  const timers = useRef<number[]>([]);
  const mineAt = (i: number) => (o.side === 'w' ? i % 2 === 0 : i % 2 === 1);

  useEffect(() => {
    if (!mineAt(0)) timers.current.push(window.setTimeout(() => opp(0), 600));
    return () => timers.current.forEach(clearTimeout);
  }, []);

  function apply(san: string) {
    const ch = chRef.current;
    const m = ch.move(san);
    setFen(ch.fen()); setLast([m.from, m.to]);
    play(ch.inCheck() ? 'check' : m.captured ? 'capture' : 'move');
  }
  function next(i: number) {
    const n = i + 1;
    setPly(n); setWrong(0);
    if (n >= l.steps.length) { setFinished(true); timers.current.push(window.setTimeout(() => onDone(misses.current), 500)); return; }
    if (!mineAt(n)) timers.current.push(window.setTimeout(() => opp(n), 650));
  }
  function opp(i: number) {
    const [san, why] = l.steps[i];
    apply(san);
    setNotes((ns) => [...ns, { san, text: why, mine: false }]);
    next(i);
  }
  function onMove(from: string, to: string, promotion?: string) {
    if (finished || frozen || !mineAt(ply) || ply >= l.steps.length) return;
    const [san, why] = l.steps[ply];
    const test = new Chess(chRef.current.fen());
    let m;
    try { m = test.move({ from, to, promotion: promotion ?? (needsPromotion(chRef.current, from, to) ? 'q' : undefined) }); } catch { return; }
    if (strip(m.san) === strip(san)) {
      apply(san);
      setFlash({ kind: 'good', key: Date.now() });
      setNotes((ns) => [...ns, { san, text: why, mine: true }]);
      next(ply);
    } else {
      misses.current += 1;
      setWrong((w) => w + 1);
      setFlash({ kind: 'bad', key: Date.now() });
      play('bad');
    }
  }

  const ch = chRef.current;
  const myTurn = !finished && ply < l.steps.length && mineAt(ply);
  const expected = myTurn ? (() => { try { const t = new Chess(ch.fen()); const m = t.move(l.steps[ply][0]); return m; } catch { return null; } })() : null;
  const showArrow = expected && (mode === 'learn' || wrong >= 2);
  const arrows: Arrow[] = showArrow ? [{ from: expected!.from, to: expected!.to, color: 'rgba(31,92,70,.75)' }] : [];
  const lastNote = notes[notes.length - 1];
  const totalMine = l.steps.filter((_, i) => mineAt(i)).length;
  const doneMine = l.steps.slice(0, ply).filter((_, i) => mineAt(i)).length;

  let prompt: string;
  if (finished) prompt = 'Varianten er ferdig!';
  else if (!myTurn) prompt = 'Motstanderen tenker...';
  else if (mode === 'learn') prompt = `Spill ${norsk(l.steps[ply][0])}`;
  else if (wrong >= 2) prompt = `Følg pilen: ${norsk(l.steps[ply][0])}`;
  else if (wrong === 1) prompt = 'Ikke det trekket i denne åpningen. Prøv igjen!';
  else prompt = 'Hvilket trekk kommer nå?';

  return (
    <div class="play-layout">
      <div class="play-board">
        <div class={`status ${wrong > 0 && myTurn && mode === 'practice' ? 'bad' : 'info'}`} style={{ marginTop: 0 }}>{prompt}</div>
        <Board fen={fen} orientation={o.side} dests={myTurn && !frozen ? destsOf(ch) : undefined} onMove={onMove}
          needsPromotion={(f, t) => needsPromotion(ch, f, t)} lastMove={last} check={checkSquare(ch)} flash={flash} arrows={arrows} />
      </div>
      <div class="play-side">
        <div class="row small muted" style={{ justifyContent: 'space-between', margin: '2px 0 6px' }}>
          <span>{l.name}</span><span>{doneMine} / {totalMine} trekk</span>
        </div>
        <div class="bar" style={{ marginBottom: '10px' }}><i style={{ width: `${(doneMine / totalMine) * 100}%` }} /></div>
        {mode === 'learn' && myTurn && l.steps[ply][1] && (
          <div class="card explain"><div class="label">Ditt trekk: {norsk(l.steps[ply][0])}</div><p style={{ margin: '4px 0 0' }}>{l.steps[ply][1]}</p></div>
        )}
        {lastNote?.text && !(mode === 'learn' && myTurn && l.steps[ply][1]) && (
          <div class="card explain"><div class="label">{lastNote.mine ? 'Riktig' : 'Motstanderen'}: {norsk(lastNote.san)}</div><p style={{ margin: '4px 0 0' }}>{lastNote.text}</p></div>
        )}
        {mode === 'learn' && myTurn && l.steps[ply][1] && lastNote?.text && !lastNote.mine && (
          <div class="small muted" style={{ marginBottom: '8px' }}>Motstanderen spilte {norsk(lastNote.san)}: {lastNote.text}</div>
        )}
        <MoveList sans={ch.history().map(norsk)} />
        {children}
      </div>
    </div>
  );
}
