// Spill mot venner (bare registrerte brukere) og vennetabell.
import { useEffect, useRef, useState } from 'preact/hooks';
import { Chess } from 'chess.js';
import { Board } from '../board/Board';
import { PieceSvg } from '../board/pieces';
import { api, useAccount } from '../lib/account';
import { destsOf, needsPromotion, checkSquare, playUci, norsk } from '../lib/chess';
import { play } from '../lib/sound';
import { levelFromXp, addXp, update, addPoints, goalProgress } from '../lib/store';
import { TopBar, Modal, Confetti, MoveList, IconFlip, IconFlag } from '../ui';

interface User { id: number; name: string; xp: number; puzzle: number; play: number; active: number; created: number; games: number }
interface Game { id: number; white: number; black: number; created_by: number; status: string; moves: string; fen: string; result: string | null; reason: string | null; white_name: string; black_name: string; updated: number; last_chat?: number | null; last_chat_user?: number | null }
interface ChatMsg { id: number; user_id: number; text: string; created: number }

// Husker siste chatmelding du har sett i hvert parti (bare på denne enheten)
const SEEN_KEY = 'sjakkreisen.chatSeen';
function seenMap(): Record<string, number> { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}'); } catch { return {}; } }
function markSeen(gameId: number, id: number) { try { const m = seenMap(); if ((m[gameId] ?? 0) < id) { m[gameId] = id; localStorage.setItem(SEEN_KEY, JSON.stringify(m)); } } catch { /* */ } }
export function unreadChat(g: Game, me: number) { return !!g.last_chat && g.last_chat_user !== me && (seenMap()[g.id] ?? 0) < g.last_chat; }

function ago(ms: number) {
  if (!ms) return 'aldri';
  const d = Math.floor((Date.now() - ms) / 86400000);
  return d <= 0 ? 'i dag' : d === 1 ? 'i går' : `for ${d} dager siden`;
}

export function myTurn(g: Game, me: number) {
  if (g.status !== 'active') return false;
  const n = g.moves ? g.moves.split(' ').length : 0;
  return (n % 2 === 0 ? g.white : g.black) === me;
}

// 24 timer på hvert trekk (sjekkes på serveren). Viser hvor lang tid som er igjen.
export const MOVE_LIMIT = 24 * 3600 * 1000;
export function timeLeft(g: Game) {
  const ms = g.updated + MOVE_LIMIT - Date.now();
  if (ms <= 0) return 'tiden er ute';
  const h = Math.floor(ms / 3600000);
  return h >= 1 ? `${h} t igjen` : `${Math.max(1, Math.round(ms / 60000))} min igjen`;
}

export function useGamesBadge() {
  const acc = useAccount();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!acc) { setN(0); return; }
    let alive = true;
    const load = () => api<{ me: number; games: Game[] }>('games').then((r) => {
      if (alive) setN(r.games.filter((g) => myTurn(g, r.me) || (g.status === 'pending' && g.created_by !== r.me) || unreadChat(g, r.me)).length);
    }).catch(() => {});
    load(); const t = setInterval(load, 20000);
    return () => { alive = false; clearInterval(t); };
  }, [acc?.token]);
  return n;
}

export function Friends() {
  const acc = useAccount();
  const [users, setUsers] = useState<User[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [me, setMe] = useState(0);
  const [err, setErr] = useState('');
  const [challenge, setChallenge] = useState<User | null>(null);

  const load = () => {
    api<{ users: User[] }>('users').then((r) => setUsers(r.users)).catch((e) => setErr(e.message));
    api<{ me: number; games: Game[] }>('games').then((r) => { setGames(r.games); setMe(r.me); }).catch((e) => setErr(e.message));
  };
  useEffect(() => { if (acc) { load(); const t = setInterval(load, 10000); return () => clearInterval(t); } }, [acc?.token]);

  if (!acc) return (
    <div>
      <TopBar title="Venner" back="#/spill" />
      <div class="card"><h2>Logg inn for å spille mot venner</h2><p class="muted">Med en bruker kan du spille mot andre som er registrert, se vennetabellen, og fremgangen din blir lagret på alle enhetene dine.</p><a class="btn block" href="#/konto">Logg inn eller registrer deg</a></div>
    </div>
  );

  async function send(u: User, color: string) {
    try { const r = await api<{ id: number }>('games', { method: 'POST', body: { opponent: u.id, color } }); setChallenge(null); location.hash = '#/venn/' + r.id; }
    catch (e) { setErr((e as Error).message); setChallenge(null); }
  }
  async function act(g: Game, what: 'accept' | 'decline') {
    try { await api(`games/${g.id}/${what}`, { method: 'POST' }); if (what === 'accept') location.hash = '#/venn/' + g.id; else load(); }
    catch (e) { setErr((e as Error).message); }
  }

  const invites = games.filter((g) => g.status === 'pending' && g.created_by !== me);
  const waiting = games.filter((g) => g.status === 'pending' && g.created_by === me);
  const active = games.filter((g) => g.status === 'active');
  const done = games.filter((g) => g.status === 'done').slice(0, 8);
  const opp = (g: Game) => (g.white === me ? g.black_name : g.white_name);

  return (
    <div>
      <TopBar title="Venner" back="#/spill" />
      {err && <div class="status bad">{err}</div>}
      {invites.map((g) => (
        <div key={g.id} class="card" style={{ borderColor: 'var(--gold)' }}>
          <div class="row"><div class="grow"><b>{opp(g)}</b> utfordrer deg! Du er {g.white === me ? 'hvit' : 'svart'}.<div class="small muted">Utfordringen gjelder i 3 dager.</div></div></div>
          <div class="btnrow" style={{ marginTop: '8px' }}><button class="btn good" onClick={() => act(g, 'accept')}>Spill</button><button class="btn secondary" onClick={() => act(g, 'decline')}>Nei takk</button></div>
        </div>
      ))}
      {active.length > 0 && <h2>Partier i gang</h2>}
      {active.map((g) => (
        <a key={g.id} href={'#/venn/' + g.id} class="card click row" style={{ textDecoration: 'none', color: 'inherit', display: 'flex' }}>
          <div class="grow"><b>Mot {opp(g)}</b><div class="small muted">{g.moves ? Math.ceil(g.moves.split(' ').length / 2) : 0} trekk</div></div>
          {unreadChat(g, me) && <span class="chip" style={{ borderColor: 'var(--info)', color: 'var(--info)' }}>Ny melding</span>}
          {myTurn(g, me) ? <span class="chip" style={{ borderColor: 'var(--good)', color: 'var(--good)' }}>Din tur · {timeLeft(g)}</span> : <span class="chip">Venter · {timeLeft(g)}</span>}
        </a>
      ))}
      {waiting.map((g) => <a key={g.id} href={'#/venn/' + g.id} class="card click small muted" style={{ display: 'block', textDecoration: 'none' }}>Venter på at {opp(g)} godtar utfordringen.</a>)}
      {active.length === 0 && invites.length === 0 && waiting.length === 0 && <div class="card small"><b>Slik virker det:</b> Trykk «Utfordre» ved en venn. Når vennen godtar, spiller dere ett trekk om gangen når det passer. Dere har 24 timer på hvert trekk. Den som ikke trekker innen fristen, taper på tid.</div>}

      <h2 style={{ marginTop: '14px' }}>Alle brukere ({users.length})</h2>
      <div class="card" style={{ padding: '6px 10px' }}>
        {users.map((u, i) => (
          <div key={u.id} class="row" style={{ padding: '8px 0', borderBottom: i < users.length - 1 ? '1px solid var(--line)' : 'none' }}>
            <b style={{ width: '22px' }}>{i + 1}</b>
            <div class="grow"><b>{u.name}</b>{u.id === me && <span class="muted"> (deg)</span>}
              <div class="small muted">Nivå {levelFromXp(u.xp)} · Oppgaver {Math.round(u.puzzle) || '–'} · Spill {Math.round(u.play) || '–'}</div>
              <div class="small muted">Registrert {u.created ? new Date(u.created).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' }) : '–'} · Sist aktiv {ago(u.active)} · {u.games} {u.games === 1 ? 'parti' : 'partier'} mot venner</div>
            </div>
            {u.id !== me && <button class="btn small" onClick={() => setChallenge(u)}>Utfordre</button>}
          </div>
        ))}
        {users.length <= 1 && <p class="small muted" style={{ margin: '8px 0' }}>Ingen andre har registrert seg ennå. Be dem om å lage en bruker med invitasjonskoden.</p>}
      </div>

      {done.length > 0 && <h2 style={{ marginTop: '14px' }}>Ferdige partier</h2>}
      {done.map((g) => {
        const won = (g.result === '1-0' && g.white === me) || (g.result === '0-1' && g.black === me);
        const draw = g.result === '½-½';
        return <a key={g.id} href={'#/venn/' + g.id} class="card click row" style={{ textDecoration: 'none', color: 'inherit', display: 'flex' }}><div class="grow">Mot {opp(g)}<div class="small muted">{g.reason}</div></div><b style={{ color: draw ? 'var(--muted)' : won ? 'var(--good)' : 'var(--bad)' }}>{draw ? 'Remis' : won ? 'Seier' : 'Tap'}</b></a>;
      })}

      {challenge && (
        <Modal onClose={() => setChallenge(null)}>
          <h2 class="center">Utfordre {challenge.name}</h2>
          <p class="center"><b>Velg farge</b></p>
          <div class="btnrow">
            <button class="btn secondary" onClick={() => send(challenge, 'w')}>Hvit</button>
            <button class="btn secondary" onClick={() => send(challenge, 'b')}>Svart</button>
            <button class="btn" onClick={() => send(challenge, 'r')}>Tilfeldig</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function FriendGame({ id }: { id: string }) {
  const acc = useAccount();
  const [g, setG] = useState<Game | null>(null);
  const [me, setMe] = useState(0);
  const [err, setErr] = useState('');
  const [flip, setFlip] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const prevStatus = useRef<string | null>(null);
  const prevMoves = useRef<string | null>(null);

  const [chat, setChat] = useState<ChatMsg[]>([]);
  const load = () => api<{ me: number; game: Game; chat?: ChatMsg[] }>('games/' + id).then((r) => {
    setMe(r.me);
    if (r.chat) setChat(r.chat);
    if (prevMoves.current !== null && r.game.moves !== prevMoves.current) play('move');
    if (prevStatus.current === 'active' && r.game.status === 'done') onFinished(r.game, r.me);
    prevMoves.current = r.game.moves; prevStatus.current = r.game.status;
    setG(r.game);
  }).catch((e) => setErr(e.message));

  function onFinished(game: Game, meId: number) {
    const won = (game.result === '1-0' && game.white === meId) || (game.result === '0-1' && game.black === meId);
    const draw = game.result === '½-½';
    addXp(won ? 60 : draw ? 30 : 15); addPoints(won ? 30 : draw ? 15 : 0); goalProgress('games');
    if (won) { setCelebrate(true); play('win'); } else play(draw ? 'good' : 'lose');
    update((s) => { s.games = [{ bot: 'venn', result: (won ? 'win' : draw ? 'draw' : 'loss') as 'win' | 'draw' | 'loss', color: (game.white === meId ? 'w' : 'b') as 'w' | 'b', date: new Date().toLocaleDateString('sv-SE'), pgn: '', moves: game.moves.split(' ').length }, ...s.games].slice(0, 30); });
  }

  useEffect(() => { if (acc) { load(); const t = setInterval(load, 2500); return () => clearInterval(t); } }, [acc?.token, id]);

  if (!acc) return <div><TopBar title="Parti" back="#/venner" /><a class="btn block" href="#/konto">Logg inn</a></div>;
  if (!g) return <div><TopBar title="Parti" back="#/venner" />{err ? <div class="status bad">{err}</div> : <div class="card center muted">Laster...</div>}</div>;

  const ch = new Chess();
  const moves = g.moves ? g.moves.split(' ') : [];
  for (const m of moves) playUci(ch, m);
  const myColor: 'w' | 'b' = g.white === me ? 'w' : 'b';
  const orientation = flip ? (myColor === 'w' ? 'b' : 'w') : myColor;
  const canMove = g.status === 'active' && ch.turn() === myColor && !sending;
  const lastUci = moves[moves.length - 1];
  const oppName = g.white === me ? g.black_name : g.white_name;

  async function onMove(from: string, to: string, promotion?: string) {
    const uci = from + to + (promotion ?? (needsPromotion(ch, from, to) ? 'q' : ''));
    const test = new Chess(ch.fen());
    let m; try { m = playUci(test, uci); } catch { return; }
    play(test.inCheck() ? 'check' : m?.captured ? 'capture' : 'move');
    setSending(true);
    setG({ ...g!, moves: [...moves, uci].join(' ') });
    prevMoves.current = [...moves, uci].join(' ');
    try { await api(`games/${g!.id}/move`, { method: 'POST', body: { uci, ply: moves.length } }); }
    catch (e) { setErr((e as Error).message); }
    setSending(false); load();
  }

  const hist = ch.history();
  const resultText = g.status === 'done' ? (g.result === '½-½' ? 'Remis' : ((g.result === '1-0') === (myColor === 'w') ? 'Du vant!' : `${oppName} vant`)) + (g.reason ? ` (${g.reason})` : '') : g.status === 'pending' ? (g.created_by === me ? `Venter på at ${oppName} godtar.` : `${oppName} har utfordret deg.`) : g.status === 'declined' ? 'Utfordringen ble avslått.' : canMove ? `Din tur! (${timeLeft(g)})` : `Venter på ${oppName} (${timeLeft(g)})`;

  return (
    <div>
      {celebrate && <Confetti />}
      <TopBar title={`Mot ${oppName}`} back="#/venner" />
      <div class="play-layout"><div class="play-board">
      <div class="player"><div class="avatar" style={{ background: 'var(--surface2)' }}><PieceSvg type="k" color={orientation === 'w' ? 'b' : 'w'} /></div><b class="grow">{orientation === myColor ? oppName : acc.name}</b></div>
      <Board fen={ch.fen()} orientation={orientation} dests={canMove ? destsOf(ch) : undefined} onMove={onMove}
        needsPromotion={(f, t) => needsPromotion(ch, f, t)} lastMove={lastUci ? [lastUci.slice(0, 2), lastUci.slice(2, 4)] : null} check={checkSquare(ch)} />
      <div class="player"><div class="avatar" style={{ background: 'var(--surface2)' }}><PieceSvg type="k" color={orientation} /></div><b class="grow">{orientation === myColor ? acc.name : oppName}</b></div>
      </div><div class="play-side">
      <div class={`status ${g.status === 'done' ? 'info' : canMove ? 'good' : ''}`}>{resultText}</div>
      {err && <div class="status bad">{err}</div>}
      <MoveList sans={hist.map(norsk)} />
      <div class="btnrow" style={{ marginTop: '10px' }}>
        <button class="btn secondary small" onClick={() => setFlip(!flip)}><IconFlip size={18} /> Snu</button>
        {g.status === 'active' && <button class="btn secondary small" onClick={() => setConfirm(true)}><IconFlag size={18} /> Gi opp</button>}
        {g.status === 'pending' && g.created_by !== me && <button class="btn good small" onClick={() => api(`games/${g.id}/accept`, { method: 'POST' }).then(load)}>Godta</button>}
      </div>
      <Chat gameId={g.id} me={me} oppName={oppName} msgs={chat} setMsgs={setChat} />
      <p class="small muted center" style={{ marginTop: '10px' }}>Trekkene lagres med en gang. Dere har 24 timer på hvert trekk. Den som ikke trekker innen fristen, taper på tid.</p>
      </div></div>
      {confirm && (
        <Modal onClose={() => setConfirm(false)}>
          <h2>Gi opp?</h2>
          <div class="btnrow"><button class="btn secondary" onClick={() => setConfirm(false)}>Nei</button><button class="btn bad" onClick={() => { setConfirm(false); api(`games/${g.id}/resign`, { method: 'POST' }).then(load); }}>Gi opp</button></div>
        </Modal>
      )}
    </div>
  );
}

const QUICK = ['Lykke til!', 'Godt trekk!', 'Oi!', 'Din tur 😊', 'Takk for partiet!'];

function Chat({ gameId, me, oppName, msgs, setMsgs }: { gameId: number; me: number; oppName: string; msgs: ChatMsg[]; setMsgs: (m: ChatMsg[]) => void }) {
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const lastId = msgs.length ? msgs[msgs.length - 1].id : 0;
  useEffect(() => {
    if (lastId) markSeen(gameId, lastId);
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [lastId]);
  async function send(t: string) {
    const v = t.trim();
    if (!v || busy) return;
    setBusy(true); setErr('');
    try { const r = await api<{ chat: ChatMsg[] }>(`games/${gameId}/chat`, { method: 'POST', body: { text: v } }); setMsgs(r.chat); setText(''); }
    catch (e) { setErr((e as Error).message); }
    setBusy(false);
  }
  return (
    <div class="chat">
      <div class="label">Chat med {oppName}</div>
      <div class="chat-box" ref={box}>
        {msgs.length === 0 && <div class="small muted" style={{ padding: '6px 2px' }}>Ingen meldinger ennå. Si hei!</div>}
        {msgs.map((m) => (
          <div key={m.id} class={`chat-msg ${m.user_id === me ? 'mine' : ''}`}>
            <span>{m.text}</span>
            <time>{new Date(m.created).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}</time>
          </div>
        ))}
      </div>
      <div class="chat-quick">{QUICK.map((q) => <button key={q} class="tab" onClick={() => send(q)} disabled={busy}>{q}</button>)}</div>
      <form class="chat-form" onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <input type="text" value={text} maxLength={200} placeholder="Skriv en melding" onInput={(e) => setText((e.target as HTMLInputElement).value)} />
        <button class="btn small" type="submit" disabled={busy || !text.trim()}>Send</button>
      </form>
      {err && <div class="small" style={{ color: 'var(--bad)' }}>{err}</div>}
    </div>
  );
}
