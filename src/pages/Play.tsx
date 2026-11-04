import { useEffect, useRef, useState } from 'preact/hooks';
import { Chess, type Move } from 'chess.js';
import { Board, type Arrow } from '../board/Board';
import { PieceSvg, PIECE_DEF, type PieceType } from '../board/pieces';
import { BOTS, botById, botMove, say, type Bot } from '../engine/bots';
import { engine, scoreOf } from '../engine/stockfish';
import { destsOf, needsPromotion, checkSquare, playUci, norsk, VALUES } from '../lib/chess';
import { play } from '../lib/sound';
import { useProgress, update, addXp, rateGame, checkBadges, getProgress, today } from '../lib/store';
import { TopBar, Avatar, Modal, Confetti, MoveList, IconHint, IconUndo, IconFlip, IconFlag, IconLock, IconSwords, IconGauge } from '../ui';
import { EvalGauge } from '../board/EvalGauge';
import { useGamesBadge } from './Friends';
import { useAccount } from '../lib/account';

export function isUnlocked(bot: Bot) {
  const s = getProgress();
  const i = BOTS.indexOf(bot);
  if (i <= 1) return true;
  const prev = BOTS[i - 1];
  return (s.bots[prev.id]?.w ?? 0) > 0 || s.playRating >= bot.elo - 100;
}

export function Play({ botId }: { botId?: string }) {
  const s = useProgress();
  const [choose, setChoose] = useState<string | null>(null);
  const acc = useAccount();
  const turns = useGamesBadge();
  if (botId) {
    const [id, color] = botId.split('-');
    return <Game key={botId} bot={id === 'venn' ? null : botById(id)} color={color === 'b' ? 'b' : 'w'} />;
  }
  const start = (id: string, c: 'w' | 'b' | 'r') => {
    const col = c === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : c;
    location.hash = `#/spill/${id}-${col}-${Date.now() % 100000}`;
  };
  return (
    <div>
      <TopBar title="Spill" />
      <div class="row" style={{ marginBottom: '10px' }}><span class="chip">Spillrating: {Math.round(s.playRating)}</span></div>
      <a href="#/venner" class="card click goodline" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
        <div class="row">
          <div class="avatar" style={{ background: '#1f5c46', width: '52px', height: '52px', color: '#fbf9f4' }}><IconSwords size={28} /></div>
          <div class="grow"><b>Spill mot venner</b><div class="small muted">{acc ? 'Mot andre på Sjakkreisen. Trekkene lagres, og dere har 24 timer på hvert trekk.' : 'Logg inn for å utfordre andre på Sjakkreisen'}</div></div>
          {turns > 0 && <span class="chip" style={{ borderColor: 'var(--good)', color: 'var(--good)' }}>{turns === 1 ? 'Din tur' : `${turns} venter`}</span>}
        </div>
      </a>
      <div class="label" style={{ margin: '14px 0 6px' }}>Mot datamaskinen</div>
      {BOTS.map((b) => {
        const rec = s.bots[b.id] ?? { w: 0, l: 0, d: 0 };
        const open = isUnlocked(b);
        return (
          <div key={b.id} class={`card ${open ? 'click' : ''}`} style={{ opacity: open ? 1 : 0.55 }} onClick={() => open && setChoose(b.id)}>
            <div class="row">
              <Avatar piece={b.piece} color={b.color} size={52} />
              <div class="grow">
                <div class="row" style={{ gap: '6px' }}><b>{b.name}</b><span class="chip small">ca. {b.elo}</span></div>
                <div class="small muted">{open ? b.style : `Slå ${BOTS[BOTS.indexOf(b) - 1].name} for å låse opp`}</div>
                {(rec.w + rec.l + rec.d > 0) && <div class="small">Seire {rec.w} · Tap {rec.l} · Remis {rec.d}</div>}
              </div>
              {!open && <IconLock />}
            </div>
          </div>
        );
      })}
      <div class="card click" onClick={() => setChoose('venn')}>
        <div class="row">
          <div class="avatar" style={{ background: '#7d7466', width: '52px', height: '52px' }}><PieceSvg type="k" color="w" /></div>
          <div class="grow"><b>Spill på samme skjerm</b><div class="small muted">To spillere ved samme telefon, for eksempel mot pappa i sofaen</div></div>
        </div>
      </div>
      {choose && (
        <Modal onClose={() => setChoose(null)}>
          {choose !== 'venn' && (() => { const b = botById(choose); return (
            <div class="center">
              <div style={{ display: 'flex', justifyContent: 'center' }}><Avatar piece={b.piece} color={b.color} size={72} /></div>
              <h2 style={{ marginTop: '8px' }}>{b.name}</h2>
              <p class="muted">{b.intro}</p>
            </div>
          ); })()}
          {choose === 'venn' && <h2 class="center">Spill på samme skjerm</h2>}
          <p class="center"><b>Velg farge</b></p>
          <div class="btnrow">
            <button class="btn secondary" onClick={() => start(choose, 'w')}>Hvit</button>
            <button class="btn secondary" onClick={() => start(choose, 'b')}>Svart</button>
            <button class="btn" onClick={() => start(choose, 'r')}>Tilfeldig</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

type EndInfo = { result: 'win' | 'loss' | 'draw'; reason: string; delta?: number; xp?: number; hints?: number; penalty?: number };

const HINT_XP = 10; // hvert trekkforslag koster 10 XP, og seier gir halv ratinggevinst

function Game({ bot, color }: { bot: Bot | null; color: 'w' | 'b' }) {
  const ch = useRef(new Chess());
  const [fen, setFen] = useState(ch.current.fen());
  const [orientation, setOrientation] = useState<'w' | 'b'>(color);
  const [last, setLast] = useState<[string, string] | null>(null);
  const [thinking, setThinking] = useState(false);
  const [bubble, setBubble] = useState(bot ? say(bot.lines.start) : '');
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [hints, setHints] = useState(3);
  const hintsUsed = useRef(0);
  const settings = useProgress().settings;
  const showEval = settings.evalBar !== false;
  const [end, setEnd] = useState<EndInfo | null>(null);
  const [review, setReview] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const refresh = () => { setFen(ch.current.fen()); };

  useEffect(() => { if (bot && ch.current.turn() !== color) botTurn(); }, []);

  function afterMove(m: Move, byBot: boolean) {
    setLast([m.from, m.to]); setArrows([]); setSuggest('');
    play(ch.current.inCheck() ? 'check' : m.captured ? 'capture' : 'move');
    if (bot && m.captured && Math.random() < 0.45) setBubble(say(byBot ? bot.lines.capture : bot.lines.lost));
    refresh();
    if (ch.current.isGameOver()) { finish(); return true; }
    return false;
  }

  async function botTurn() {
    if (!bot) return;
    setThinking(true);
    if (Math.random() < 0.25) setBubble(say(bot.lines.think));
    const t0 = Date.now();
    const fenNow = ch.current.fen();
    let uci: string;
    try { uci = await botMove(bot, fenNow); } catch { uci = ''; }
    const wait = Math.max(0, 450 + Math.random() * 400 - (Date.now() - t0));
    await new Promise((r) => setTimeout(r, wait));
    if (!alive.current || ch.current.fen() !== fenNow) return;
    let m: Move | null = null;
    try { m = playUci(ch.current, uci); } catch { m = null; }
    if (!m) { const all = ch.current.moves({ verbose: true }); m = ch.current.move(all[Math.floor(Math.random() * all.length)]); }
    setThinking(false);
    afterMove(m!, true);
  }

  function onMove(from: string, to: string, promotion?: PieceType) {
    let m: Move | null = null;
    try { m = ch.current.move({ from, to, promotion: promotion ?? (needsPromotion(ch.current, from, to) ? 'q' : undefined) }); } catch { return; }
    if (!m) return;
    if (m.promotion) update((s) => { s.stats.promotions += 1; });
    const over = afterMove(m, false);
    if (!over && bot) botTurn();
    else if (!bot) setOrientation(ch.current.turn());
  }

  function finish(resigned = false) {
    const c = ch.current;
    let result: EndInfo['result']; let reason: string;
    if (resigned) { result = 'loss'; reason = 'Du ga opp.'; }
    else if (c.isCheckmate()) {
      const loser = c.turn();
      result = !bot ? (loser === 'w' ? 'loss' : 'win') : loser === color ? 'loss' : 'win';
      reason = !bot ? `${loser === 'w' ? 'Svart' : 'Hvit'} vant med sjakkmatt!` : result === 'win' ? 'Sjakkmatt! Du vant!' : 'Sjakkmatt.';
    } else {
      result = 'draw';
      reason = c.isStalemate() ? 'Patt: den som er i trekket har ingen lovlige trekk, men står ikke i sjakk.' : c.isThreefoldRepetition() ? 'Remis ved tre like stillinger.' : c.isInsufficientMaterial() ? 'Remis: ingen av dere har nok brikker til å sette matt.' : 'Remis (50-trekksregelen).';
    }
    const info: EndInfo = { result, reason };
    if (bot) {
      const score = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
      const used = hintsUsed.current;
      info.delta = rateGame(bot.elo, score, used ? 0.5 : 1);
      const fullXp = result === 'win' ? 50 + Math.round(bot.elo / 40) : result === 'draw' ? 25 : 10;
      info.hints = used;
      info.penalty = Math.min(fullXp - 5, used * HINT_XP);
      info.xp = fullXp - info.penalty;
      update((s) => {
        const r = s.bots[bot.id] ?? { w: 0, l: 0, d: 0 };
        if (result === 'win') r.w++; else if (result === 'loss') r.l++; else r.d++;
        s.bots[bot.id] = r;
        s.games = [{ bot: bot.id, result, color, date: today(), pgn: c.pgn(), moves: c.history().length }, ...s.games].slice(0, 30);
        if (result === 'win' && c.isCheckmate()) s.stats.mates += 1;
      });
      addXp(info.xp); checkBadges();
      setBubble(say(result === 'win' ? bot.lines.lose : result === 'loss' ? bot.lines.win : ['Remis! Godt kjempet.']));
      play(result === 'win' ? 'win' : result === 'loss' ? 'lose' : 'good');
    } else play('win');
    setThinking(false);
    setEnd(info);
  }

  const [suggest, setSuggest] = useState('');
  async function hint() {
    if (hints <= 0 || thinking) return;
    setHints(hints - 1);
    hintsUsed.current += 1;
    update((s) => { s.stats.hintsUsed += 1; });
    const fenNow = ch.current.fen();
    const [best] = await engine.go(fenNow, { depth: 12 });
    if (!best || !alive.current || ch.current.fen() !== fenNow) return;
    setArrows([{ from: best.move.slice(0, 2), to: best.move.slice(2, 4), color: '#2f7d4f' }]);
    let san = best.move;
    try { san = norsk(new Chess(fenNow).move({ from: best.move.slice(0, 2), to: best.move.slice(2, 4), promotion: best.move[4] || undefined }).san); } catch { /* */ }
    setSuggest(`Stockfish foreslår ${san} (grønn pil). Koster ${HINT_XP} XP.`);
  }
  function toggleEval() { update((s) => { s.settings.evalBar = !showEval; }); }

  function undo() {
    if (thinking) return;
    const c = ch.current;
    if (bot) { if (c.turn() !== color) return; c.undo(); c.undo(); }
    else c.undo();
    const h = c.history({ verbose: true }); const lm = h[h.length - 1];
    setLast(lm ? [lm.from, lm.to] : null); setArrows([]); refresh();
    if (!bot) setOrientation(c.turn());
  }

  const c = ch.current;
  const myTurn = !end && !thinking && (!bot || c.turn() === color);
  const hist = c.history();
  const capturedBy = (side: 'w' | 'b') => {
    const start: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const on: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
    const opp = side === 'w' ? 'b' : 'w';
    for (const row of c.board()) for (const p of row) if (p && p.color === opp && p.type !== 'k') on[p.type]++;
    const list: PieceType[] = [];
    for (const t of ['q', 'r', 'b', 'n', 'p']) for (let i = 0; i < Math.max(0, start[t] - on[t]); i++) list.push(t as PieceType);
    return list;
  };
  const material = (side: 'w' | 'b') => capturedBy(side).reduce((a, t) => a + VALUES[t], 0);
  const top = orientation === 'w' ? 'b' : 'w';
  const PlayerRow = ({ side }: { side: 'w' | 'b' }) => {
    const isBot = bot && side !== color;
    const diff = material(side) - material(side === 'w' ? 'b' : 'w');
    return (
      <div class="player">
        {isBot ? <Avatar piece={bot!.piece} color={bot!.color} /> : <div class="avatar" style={{ background: 'var(--surface2)' }}><PieceSvg type="k" color={side} /></div>}
        <div class="grow">
          <div class="row" style={{ gap: '6px' }}>
            <b>{isBot ? bot!.name : bot ? 'Du' : side === 'w' ? 'Hvit' : 'Svart'}</b>
            {c.turn() === side && !end && <span class="chip small">{isBot && thinking ? 'tenker...' : 'i trekket'}</span>}
          </div>
          <div class="captured">{capturedBy(side).map((t, i) => <PieceSvg key={i} type={t} color={side === 'w' ? 'b' : 'w'} />)}{diff > 0 && <span class="small muted">&nbsp;+{diff}</span>}</div>
        </div>
        {isBot && bubble && <div class="bubble" style={{ maxWidth: '45%' }}>{bubble}</div>}
      </div>
    );
  };

  if (review) return <Review pgn={c.pgn()} color={color} onBack={() => setReview(false)} />;

  return (
    <div>
      <TopBar title={bot ? `Mot ${bot.name}` : 'Samme skjerm'} back="#/spill" />
      <div class="play-layout"><div class="play-board">
      <PlayerRow side={top} />
      {showEval && <EvalGauge fen={fen} whiteName={bot ? (color === 'w' ? 'Du' : bot.name) : 'Hvit'} blackName={bot ? (color === 'b' ? 'Du' : bot.name) : 'Svart'} />}
      <Board fen={fen} orientation={orientation} dests={myTurn ? destsOf(c) : undefined} onMove={onMove}
        needsPromotion={(f, t) => needsPromotion(c, f, t)} lastMove={last} check={checkSquare(c)} arrows={arrows} />
      <PlayerRow side={top === 'w' ? 'b' : 'w'} />
      </div><div class="play-side">
      <div class="desktop-only label" style={{ marginBottom: '4px' }}>Trekk</div>
      <MoveList sans={hist.map(norsk)} />
      <div class="btnrow" style={{ marginTop: '10px' }}>
        {bot && <button class="btn secondary small" onClick={hint} disabled={!myTurn || hints <= 0}><IconHint size={18} /> Forslag ({hints})</button>}
        <button class={`btn small ${showEval ? '' : 'secondary'}`} onClick={toggleEval} aria-label="Stillingsmåler av/på" title="Stillingsmåler av/på"><IconGauge size={18} /></button>
        {(!bot || bot.undo) && <button class="btn secondary small" onClick={undo} disabled={!myTurn || hist.length < (bot ? 2 : 1)}><IconUndo size={18} /><span class="btn-text"> Angre</span></button>}
        <button class="btn secondary small" onClick={() => setOrientation(orientation === 'w' ? 'b' : 'w')}><IconFlip size={18} /></button>
        {bot && !end && <button class="btn secondary small" onClick={() => setConfirmResign(true)}><IconFlag size={18} /></button>}
      </div>
      {suggest && !end && <div class="status good">{suggest}</div>}
      {end && !review && <div class="status info">{end.reason} <button class="btn small" style={{ marginLeft: '8px' }} onClick={() => setReview(true)}>Se gjennom</button></div>}
      {bot && <BotStats bot={bot} />}
      </div></div>
      {confirmResign && (
        <Modal onClose={() => setConfirmResign(false)}>
          <h2>Gi opp?</h2><p class="muted">Partiet teller som tap.</p>
          <div class="btnrow"><button class="btn secondary" onClick={() => setConfirmResign(false)}>Spill videre</button><button class="btn bad" onClick={() => { setConfirmResign(false); finish(true); }}>Gi opp</button></div>
        </Modal>
      )}
      {end && <EndModal end={end} bot={bot} onReview={() => setReview(true)} />}
    </div>
  );
}

function EndModal({ end, bot, onReview }: { end: EndInfo; bot: Bot | null; onReview: () => void }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  const title = end.result === 'win' ? 'Du vant!' : end.result === 'loss' ? 'Du tapte' : 'Remis';
  return (
    <>
      {end.result === 'win' && <Confetti />}
      <Modal onClose={() => setOpen(false)}>
        <div class="center">
          {bot && <div style={{ display: 'flex', justifyContent: 'center' }}><Avatar piece={bot.piece} color={bot.color} size={64} /></div>}
          <h1 style={{ marginTop: '8px' }}>{title}</h1>
          <p class="muted">{end.reason}</p>
          {bot && <p><b>+{end.xp} XP</b> · Spillrating {end.delta! >= 0 ? '+' : ''}{end.delta}</p>}
          {bot && !!end.hints && <p class="small muted">Du brukte {end.hints} trekkforslag: −{end.penalty} XP{end.result !== 'loss' ? ' og halv ratinggevinst' : ''}.</p>}
          {end.result === 'loss' && <p class="small muted">Tips: se gjennom partiet for å finne de største feilene. Det er slik man blir bedre.</p>}
        </div>
        <div class="stack">
          <button class="btn block" onClick={onReview}>Se gjennom partiet</button>
          <div class="btnrow">
            <button class="btn secondary" onClick={() => setOpen(false)}>Se brettet</button>
            <a class="btn secondary" href="#/spill">Ny motstander</a>
          </div>
        </div>
      </Modal>
    </>
  );
}

interface Mistake { ply: number; fenBefore: string; played: string; playedSan: string; best: string; bestSan: string; loss: number; kind: string; why: string }

function Review({ pgn, color, onBack }: { pgn: string; color: 'w' | 'b'; onBack: () => void }) {
  const [progress, setProgress] = useState(0);
  const [mistakes, setMistakes] = useState<Mistake[] | null>(null);
  const [counts, setCounts] = useState({ tabbe: 0, feil: 0, unoyaktig: 0, gode: 0 });
  const [sel, setSel] = useState(0);
  const [curve, setCurve] = useState<{ ply: number; v: number }[]>([]);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  useEffect(() => {
    (async () => {
      const pts: { ply: number; v: number }[] = [];
      const g = new Chess(); g.loadPgn(pgn);
      const moves = g.history({ verbose: true });
      const replay = new Chess();
      const mine = moves.map((m, i) => ({ m, i })).filter(({ m }) => m.color === color);
      const out: Mistake[] = []; const cnt = { tabbe: 0, feil: 0, unoyaktig: 0, gode: 0 };
      let done = 0;
      for (let i = 0; i < moves.length; i++) {
        const m = moves[i];
        if (m.color === color) {
          if (!alive.current) return;
          const fenBefore = replay.fen();
          const [best] = await engine.go(fenBefore, { depth: 10 });
          replay.move(m);
          const after = replay.isCheckmate() ? null : (await engine.go(replay.fen(), { depth: 10 }))[0];
          const clamp = (v: number) => Math.max(-1500, Math.min(1500, v));
          const bestScore = clamp(scoreOf(best));
          const afterScore = replay.isCheckmate() ? 1500 : clamp(-scoreOf(after ?? undefined));
          const loss = bestScore - afterScore;
          pts.push({ ply: i, v: bestScore }, { ply: i + 1, v: afterScore });
          const playedUci = m.from + m.to + (m.promotion ?? '');
          if (best && best.move !== playedUci && loss >= 70) {
            const kind = loss >= 300 ? 'Tabbe' : loss >= 150 ? 'Feil' : 'Unøyaktig';
            if (kind === 'Tabbe') cnt.tabbe++; else if (kind === 'Feil') cnt.feil++; else cnt.unoyaktig++;
            const tmp = new Chess(fenBefore); const bm = playUci(tmp, best.move);
            let why = '';
            if (best.mate !== null && best.mate > 0) why = `Du hadde matt i ${best.mate}!`;
            else if (after && after.mate !== null && after.mate > 0) why = `Etter dette trekket kunne motstanderen sette matt i ${after.mate}.`;
            else if (after) {
              const t2 = new Chess(replay.fen()); let reply: Move | null = null;
              try { reply = playUci(t2, after.move); } catch { reply = null; }
              if (reply?.captured) why = `Etter trekket ditt kunne motstanderen slå på ${reply.to} og vinne ${PIECE_DEF[reply.captured as PieceType]}.`;
              else if (bm?.captured) why = `Du kunne tatt ${PIECE_DEF[bm.captured as PieceType]} på ${bm.to}.`;
              else why = 'Det andre trekket ga en bedre stilling.';
            }
            out.push({ ply: i, fenBefore, played: playedUci, playedSan: norsk(m.san), best: best.move, bestSan: norsk(bm?.san ?? best.move), loss, kind, why });
          } else cnt.gode++;
          done++; setProgress(Math.round((done / mine.length) * 100));
        } else replay.move(m);
      }
      out.sort((a, b) => b.loss - a.loss);
      if (alive.current) { setMistakes(out.slice(0, 5)); setCounts(cnt); setCurve(pts); }
    })();
  }, []);

  const cur = mistakes?.[sel];
  return (
    <div>
      <div class="topbar"><button class="btn secondary small" onClick={onBack}>Tilbake</button><div class="title">Gjennomgang</div></div>
      {!mistakes && <div class="card center"><p>Stockfish ser gjennom partiet ditt...</p><div class="xpbar"><div style={{ width: progress + '%' }} /></div></div>}
      {mistakes && (
        <>
          <div class="grid2" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: '10px' }}>
            <div class="card center" style={{ padding: '8px' }}><b style={{ color: 'var(--good)' }}>{counts.gode}</b><div class="small muted">Gode</div></div>
            <div class="card center" style={{ padding: '8px' }}><b>{counts.unoyaktig}</b><div class="small muted">Unøyaktig</div></div>
            <div class="card center" style={{ padding: '8px' }}><b style={{ color: 'var(--gold)' }}>{counts.feil}</b><div class="small muted">Feil</div></div>
            <div class="card center" style={{ padding: '8px' }}><b style={{ color: 'var(--bad)' }}>{counts.tabbe}</b><div class="small muted">Tabber</div></div>
          </div>
          {curve.length > 2 && <div class="card"><div class="label">Hvem ledet?</div><EvalCurve pts={curve} marks={mistakes.map((m) => m.ply)} /></div>}
          {mistakes.length === 0 && <div class="card center"><b>Ingen store feil! Supert parti.</b></div>}
          {cur && (
            <>
              <div class="tabs">{mistakes.map((m, i) => <button key={i} class={`tab ${i === sel ? 'on' : ''}`} onClick={() => setSel(i)}>Trekk {Math.floor(m.ply / 2) + 1}: {m.kind}</button>)}</div>
              <Board fen={cur.fenBefore} orientation={color}
                arrows={[{ from: cur.played.slice(0, 2), to: cur.played.slice(2, 4), color: '#b3362a' }, { from: cur.best.slice(0, 2), to: cur.best.slice(2, 4), color: '#2f7d4f' }]} />
              <div class="card" style={{ marginTop: '10px' }}>
                <p><b style={{ color: cur.kind === 'Tabbe' ? 'var(--bad)' : 'var(--gold)' }}>{cur.kind}:</b> Du spilte <b>{cur.playedSan}</b> (rød pil). Bedre var <b>{cur.bestSan}</b> (grønn pil).</p>
                <p class="muted" style={{ marginBottom: 0 }}>{cur.why}</p>
              </div>
            </>
          )}
          <a class="btn block" href="#/spill" style={{ marginTop: '6px' }}>Spill igjen</a>
        </>
      )}
    </div>
  );
}

// Graf over partiet sett fra deg: over streken leder du, under leder motstanderen. Røde prikker er feilene dine.
function EvalCurve({ pts, marks }: { pts: { ply: number; v: number }[]; marks: number[] }) {
  const W = 320, H = 120, P = 6;
  const maxPly = Math.max(...pts.map((p) => p.ply), 1);
  const x = (ply: number) => P + (ply / maxPly) * (W - 2 * P);
  const y = (v: number) => H / 2 - (Math.max(-500, Math.min(500, v)) / 500) * (H / 2 - 8);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.ply).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(pts[pts.length - 1].ply).toFixed(1)},${H / 2} L${x(pts[0].ply).toFixed(1)},${H / 2} Z`;
  return (
    <svg class="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Hvem ledet gjennom partiet">
      <defs>
        <clipPath id="ec-top"><rect x="0" y="0" width={W} height={H / 2} /></clipPath>
        <clipPath id="ec-bot"><rect x="0" y={H / 2} width={W} height={H / 2} /></clipPath>
      </defs>
      <path d={area} fill="var(--good-soft)" clip-path="url(#ec-top)" />
      <path d={area} fill="var(--bad-soft)" clip-path="url(#ec-bot)" />
      <line x1={P} x2={W - P} y1={H / 2} y2={H / 2} stroke="var(--line-strong)" />
      <path d={line} fill="none" stroke="var(--text)" stroke-width="1.8" stroke-linejoin="round" />
      {marks.map((m) => { const p = pts.find((q) => q.ply === m + 1); return p ? <circle key={m} cx={x(p.ply)} cy={y(p.v)} r="3.5" fill="var(--bad)" /> : null; })}
      <text x={P + 2} y="12" font-size="10" fill="var(--muted)">Du leder</text>
      <text x={P + 2} y={H - 4} font-size="10" fill="var(--muted)">Motstanderen leder</text>
    </svg>
  );
}

// Bare på PC: litt mer info om motstanderen ved siden av brettet
function BotStats({ bot }: { bot: Bot }) {
  const s = useProgress();
  const rec = s.bots[bot.id] ?? { w: 0, l: 0, d: 0 };
  return (
    <div class="card desktop-only" style={{ marginTop: '12px' }}>
      <div class="row"><Avatar piece={bot.piece} color={bot.color} size={40} /><div class="grow"><b>{bot.name}</b><div class="small muted">ca. {bot.elo} · {bot.style}</div></div></div>
      <p class="small" style={{ margin: '8px 0 0' }}>Dere har spilt {rec.w + rec.l + rec.d} partier: {rec.w} seire, {rec.l} tap, {rec.d} remis.</p>
      <p class="small muted" style={{ margin: '6px 0 0' }}>Spillratingen din er {Math.round(s.playRating)}. Trekkforslag koster {HINT_XP} XP og halv ratinggevinst.</p>
    </div>
  );
}
