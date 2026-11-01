// Spill mot venner (bare registrerte brukere) og vennetabell.
import { useEffect, useRef, useState } from 'preact/hooks';
import { Chess } from 'chess.js';
import { Board } from '../board/Board';
import { PieceSvg } from '../board/pieces';
import { api, useAccount } from '../lib/account';
import { destsOf, needsPromotion, checkSquare, playUci, norsk } from '../lib/chess';
import { play } from '../lib/sound';
import { levelFromXp, addXp, update } from '../lib/store';
import { TopBar, Modal, Confetti, IconFlip, IconFlag } from '../ui';

interface User { id: number; name: string; xp: number; puzzle: number; play: number; active: number }
interface Game { id: number; white: number; black: number; created_by: number; status: string; moves: string; fen: string; result: string | null; reason: string | null; white_name: string; black_name: string; updated: number }

export function myTurn(g: Game, me: number) {
  if (g.status !== 'active') return false;
  const n = g.moves ? g.moves.split(' ').length : 0;
  return (n % 2 === 0 ? g.white : g.black) === me;
}

export function useGamesBadge() {
  const acc = useAccount();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!acc) { setN(0); return; }
    let alive = true;
    const load = () => api<{ me: number; games: Game[] }>('games').then((r) => {
      if (alive) setN(r.games.filter((g) => myTurn(g, r.me) || (g.status === 'pending' && g.created_by !== r.me)).length);
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
          <div class="row"><div class="grow"><b>{opp(g)}</b> utfordrer deg! Du er {g.white === me ? 'hvit' : 'svart'}.</div></div>
          <div class="btnrow" style={{ marginTop: '8px' }}><button class="btn good" onClick={() => act(g, 'accept')}>Spill</button><button class="btn secondary" onClick={() => act(g, 'decline')}>Nei takk</button></div>
        </div>
      ))}
      {active.length > 0 && <h2>Partier i gang</h2>}
      {active.map((g) => (
        <a key={g.id} href={'#/venn/' + g.id} class="card click row" style={{ textDecoration: 'none', color: 'inherit', display: 'flex' }}>
          <div class="grow"><b>Mot {opp(g)}</b><div class="small muted">{g.moves ? Math.ceil(g.moves.split(' ').length / 2) : 0} trekk</div></div>
          {myTurn(g, me) ? <span class="chip" style={{ borderColor: 'var(--good)', color: 'var(--good)' }}>Din tur</span> : <span class="chip">Venter</span>}
        </a>
      ))}
      {waiting.map((g) => <div key={g.id} class="card small muted">Venter på at {opp(g)} godtar utfordringen.</div>)}

      <h2 style={{ marginTop: '14px' }}>Vennetabell</h2>
      <div class="card" style={{ padding: '6px 10px' }}>
        {users.map((u, i) => (
          <div key={u.id} class="row" style={{ padding: '8px 0', borderBottom: i < users.length - 1 ? '1px solid var(--line)' : 'none' }}>
            <b style={{ width: '22px' }}>{i + 1}</b>
            <div class="grow"><b>{u.name}</b>{u.id === me && <span class="muted"> (deg)</span>}<div class="small muted">Nivå {levelFromXp(u.xp)} · Oppgaver {u.puzzle || '–'} · Spill {u.play || '–'}</div></div>
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

  const load = () => api<{ me: number; game: Game }>('games/' + id).then((r) => {
    setMe(r.me);
    if (prevMoves.current !== null && r.game.moves !== prevMoves.current) play('move');
    if (prevStatus.current === 'active' && r.game.status === 'done') onFinished(r.game, r.me);
    prevMoves.current = r.game.moves; prevStatus.current = r.game.status;
    setG(r.game);
  }).catch((e) => setErr(e.message));

  function onFinished(game: Game, meId: number) {
    const won = (game.result === '1-0' && game.white === meId) || (game.result === '0-1' && game.black === meId);
    const draw = game.result === '½-½';
    addXp(won ? 60 : draw ? 30 : 15);
    if (won) { setCelebrate(true); play('win'); } else play(draw ? 'good' : 'lose');
    update((s) => { s.games = [{ bot: 'venn', result: (won ? 'win' : draw ? 'draw' : 'loss') as 'win' | 'draw' | 'loss', color: (game.white === meId ? 'w' : 'b') as 'w' | 'b', date: new Date().toISOString().slice(0, 10), pgn: '', moves: game.moves.split(' ').length }, ...s.games].slice(0, 30); });
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
  const resultText = g.status === 'done' ? (g.result === '½-½' ? 'Remis' : ((g.result === '1-0') === (myColor === 'w') ? 'Du vant!' : `${oppName} vant`)) + (g.reason ? ` (${g.reason})` : '') : g.status === 'pending' ? (g.created_by === me ? `Venter på at ${oppName} godtar.` : `${oppName} har utfordret deg.`) : g.status === 'declined' ? 'Utfordringen ble avslått.' : canMove ? 'Din tur!' : `${oppName} tenker...`;

  return (
    <div>
      {celebrate && <Confetti />}
      <TopBar title={`Mot ${oppName}`} back="#/venner" />
      <div class="player"><div class="avatar" style={{ background: 'var(--surface2)' }}><PieceSvg type="k" color={orientation === 'w' ? 'b' : 'w'} /></div><b class="grow">{orientation === myColor ? oppName : acc.name}</b></div>
      <Board fen={ch.fen()} orientation={orientation} dests={canMove ? destsOf(ch) : undefined} onMove={onMove}
        needsPromotion={(f, t) => needsPromotion(ch, f, t)} lastMove={lastUci ? [lastUci.slice(0, 2), lastUci.slice(2, 4)] : null} check={checkSquare(ch)} />
      <div class="player"><div class="avatar" style={{ background: 'var(--surface2)' }}><PieceSvg type="k" color={orientation} /></div><b class="grow">{orientation === myColor ? acc.name : oppName}</b></div>
      <div class={`status ${g.status === 'done' ? 'info' : canMove ? 'good' : ''}`}>{resultText}</div>
      {err && <div class="status bad">{err}</div>}
      <div class="movelist">{hist.map((m, i) => <span key={i}>{i % 2 === 0 ? `${i / 2 + 1}. ` : ''}{norsk(m)}</span>)}</div>
      <div class="btnrow" style={{ marginTop: '10px' }}>
        <button class="btn secondary small" onClick={() => setFlip(!flip)}><IconFlip size={18} /> Snu</button>
        {g.status === 'active' && <button class="btn secondary small" onClick={() => setConfirm(true)}><IconFlag size={18} /> Gi opp</button>}
        {g.status === 'pending' && g.created_by !== me && <button class="btn good small" onClick={() => api(`games/${g.id}/accept`, { method: 'POST' }).then(load)}>Godta</button>}
      </div>
      <p class="small muted center" style={{ marginTop: '10px' }}>Trekkene lagres med en gang. Dere kan spille samtidig, eller ta ett trekk om gangen når det passer.</p>
      {confirm && (
        <Modal onClose={() => setConfirm(false)}>
          <h2>Gi opp?</h2>
          <div class="btnrow"><button class="btn secondary" onClick={() => setConfirm(false)}>Nei</button><button class="btn bad" onClick={() => { setConfirm(false); api(`games/${g.id}/resign`, { method: 'POST' }).then(load); }}>Gi opp</button></div>
        </Modal>
      )}
    </div>
  );
}
