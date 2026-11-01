import { useEffect, useRef, useState } from 'preact/hooks';
import { Chess, type Move } from 'chess.js';
import { Board, type Arrow } from '../board/Board';
import { PieceSvg, PIECE_DEF, type PieceType } from '../board/pieces';
import { BOTS, botById, botMove, say, type Bot } from '../engine/bots';
import { engine, scoreOf } from '../engine/stockfish';
import { destsOf, needsPromotion, checkSquare, playUci, norsk, VALUES } from '../lib/chess';
import { play } from '../lib/sound';
import { useProgress, update, addXp, rateGame, checkBadges, getProgress, today } from '../lib/store';
import { TopBar, Avatar, Modal, Confetti, IconHint, IconUndo, IconFlip, IconFlag, IconLock } from '../ui';

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
          <div class="avatar" style={{ background: 'var(--surface2)', width: '52px', height: '52px' }}><PieceSvg type="k" color="b" /></div>
          <div class="grow"><b>Spill mot en venn</b><div class="small muted">To spillere på samme skjerm, for eksempel mot pappa</div></div>
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
          {choose === 'venn' && <h2 class="center">Spill mot en venn</h2>}
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

type EndInfo = { result: 'win' | 'loss' | 'draw'; reason: string; delta?: number; xp?: number };

function Game({ bot, color }: { bot: Bot | null; color: 'w' | 'b' }) {
  const ch = useRef(new Chess());
  const [fen, setFen] = useState(ch.current.fen());
  const [orientation, setOrientation] = useState<'w' | 'b'>(color);
  const [last, setLast] = useState<[string, string] | null>(null);
  const [thinking, setThinking] = useState(false);
  const [bubble, setBubble] = useState(bot ? say(bot.lines.start) : '');
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [hints, setHints] = useState(3);
  const [end, setEnd] = useState<EndInfo | null>(null);
  const [review, setReview] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const refresh = () => { setFen(ch.current.fen()); };

  useEffect(() => { if (bot && ch.current.turn() !== color) botTurn(); }, []);

  function afterMove(m: Move, byBot: boolean) {
    setLast([m.from, m.to]); setArrows([]);
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
      info.delta = rateGame(bot.elo, score);
      info.xp = result === 'win' ? 50 + Math.round(bot.elo / 40) : result === 'draw' ? 25 : 10;
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

  async function hint() {
    if (hints <= 0 || thinking) return;
    setHints(hints - 1);
    update((s) => { s.stats.hintsUsed += 1; });
    const [best] = await engine.go(ch.current.fen(), { depth: 10 });
    if (best && alive.current) setArrows([{ from: best.move.slice(0, 2), to: best.move.slice(2, 4), color: '#2fd27a' }]);
  }

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
      <TopBar title={bot ? `Mot ${bot.name}` : 'Mot en venn'} back="#/spill" />
      <PlayerRow side={top} />
      <Board fen={fen} orientation={orientation} dests={myTurn ? destsOf(c) : undefined} onMove={onMove}
        needsPromotion={(f, t) => needsPromotion(c, f, t)} lastMove={last} check={checkSquare(c)} arrows={arrows} />
      <PlayerRow side={top === 'w' ? 'b' : 'w'} />
      <div class="movelist">{hist.map((m, i) => <span key={i}>{i % 2 === 0 ? `${i / 2 + 1}. ` : ''}{norsk(m)}</span>)}</div>
      <div class="btnrow" style={{ marginTop: '10px' }}>
        {bot && <button class="btn secondary small" onClick={hint} disabled={!myTurn || hints <= 0}><IconHint size={18} /> Hint ({hints})</button>}
        {(!bot || bot.undo) && <button class="btn secondary small" onClick={undo} disabled={!myTurn || hist.length < (bot ? 2 : 1)}><IconUndo size={18} /> Angre</button>}
        <button class="btn secondary small" onClick={() => setOrientation(orientation === 'w' ? 'b' : 'w')}><IconFlip size={18} /></button>
        {bot && !end && <button class="btn secondary small" onClick={() => setConfirmResign(true)}><IconFlag size={18} /></button>}
      </div>
      {end && !review && <div class="status info">{end.reason} <button class="btn small" style={{ marginLeft: '8px' }} onClick={() => setReview(true)}>Se gjennom</button></div>}
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
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  useEffect(() => {
    (async () => {
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
      if (alive.current) { setMistakes(out.slice(0, 5)); setCounts(cnt); }
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
          {mistakes.length === 0 && <div class="card center"><b>Ingen store feil! Supert parti.</b></div>}
          {cur && (
            <>
              <div class="tabs">{mistakes.map((m, i) => <button key={i} class={`tab ${i === sel ? 'on' : ''}`} onClick={() => setSel(i)}>Trekk {Math.floor(m.ply / 2) + 1}: {m.kind}</button>)}</div>
              <Board fen={cur.fenBefore} orientation={color}
                arrows={[{ from: cur.played.slice(0, 2), to: cur.played.slice(2, 4), color: '#ff5a5f' }, { from: cur.best.slice(0, 2), to: cur.best.slice(2, 4), color: '#2fd27a' }]} />
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
