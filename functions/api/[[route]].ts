// API for sjakk.pintzka.com (Cloudflare Pages Functions + D1).
// Brukere registrerer seg med en invitasjonskode (INVITE_CODE) og logger inn med navn + PIN.
import { Chess } from 'chess.js';

interface Env { DB: D1Database; INVITE_CODE?: string }
type Ctx = { request: Request; env: Env; params: { route?: string[] } };

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const fail = (msg: string, status = 400) => json({ error: msg }, status);
const now = () => Date.now();
const DAY = 86400000;

function hex(buf: ArrayBuffer) { return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join(''); }
function randomHex(n: number) { const a = new Uint8Array(n); crypto.getRandomValues(a); return hex(a.buffer); }
async function hashPin(pin: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 100000 }, key, 256);
  return hex(bits);
}
function safeEq(a: string, b: string) { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }

async function newSession(env: Env, userId: number) {
  const token = randomHex(24);
  await env.DB.prepare('INSERT INTO sessions (token, user_id, expires) VALUES (?, ?, ?)').bind(token, userId, now() + 180 * DAY).run();
  return token;
}

async function auth(req: Request, env: Env): Promise<{ id: number; name: string } | null> {
  const h = req.headers.get('authorization') ?? '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return null;
  const row = await env.DB.prepare('SELECT u.id, u.name, s.expires FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?').bind(token).first<{ id: number; name: string; expires: number }>();
  if (!row || row.expires < now()) return null;
  return { id: row.id, name: row.name };
}

async function body<T>(req: Request): Promise<T> { try { return await req.json() as T; } catch { return {} as T; } }

interface GameRow { id: number; white: number; black: number; created_by: number; status: string; moves: string; fen: string; result: string | null; reason: string | null; created: number; updated: number; white_name?: string; black_name?: string }

// Frister: 24 timer på hvert trekk (ellers taper man på tid), 3 dager på å godta en utfordring.
const MOVE_LIMIT = DAY;
const INVITE_LIMIT = 3 * DAY;
async function expireGames(env: Env) {
  const t = now();
  // Hvem er i trekket? Antall trekk = antall mellomrom + 1 (0 hvis tomt). Partall: hvit i trekket.
  const whiteToMove = "(g.moves = '' OR (length(g.moves) - length(replace(g.moves, ' ', '')) + 1) % 2 = 0)";
  await env.DB.batch([
    env.DB.prepare(`UPDATE games AS g SET status = 'done',
        result = CASE WHEN ${whiteToMove} THEN '0-1' ELSE '1-0' END,
        reason = (SELECT name FROM users WHERE id = CASE WHEN ${whiteToMove} THEN g.white ELSE g.black END) || ' svarte ikke innen 24 timer',
        updated = ?1
      WHERE g.status = 'active' AND g.updated < ?2`).bind(t, t - MOVE_LIMIT),
    env.DB.prepare("UPDATE games SET status = 'declined', reason = 'Utfordringen gikk ut', updated = ?1 WHERE status = 'pending' AND created < ?2").bind(t, t - INVITE_LIMIT),
  ]);
}

const GAME_SELECT = 'SELECT g.*, w.name AS white_name, b.name AS black_name FROM games g JOIN users w ON w.id = g.white JOIN users b ON b.id = g.black';

export const onRequest = async ({ request, env, params }: Ctx): Promise<Response> => {
  const route = params.route ?? [];
  const [a, b, c] = route;
  const method = request.method;
  try {
    // ---- Registrering og innlogging ----
    if (a === 'register' && method === 'POST') {
      const { code, name, pin } = await body<{ code?: string; name?: string; pin?: string }>(request);
      if (!env.INVITE_CODE) return fail('Registrering er ikke satt opp ennå.', 503);
      if (!code || !safeEq(code.trim().toLowerCase(), env.INVITE_CODE.trim().toLowerCase())) return fail('Feil invitasjonskode.', 403);
      const n = (name ?? '').trim();
      if (!/^[\p{L}\p{N} _-]{2,20}$/u.test(n)) return fail('Navnet må være 2–20 tegn (bokstaver, tall, mellomrom).');
      if (!/^\d{4,8}$/.test(pin ?? '')) return fail('PIN må være 4–8 siffer.');
      const exists = await env.DB.prepare('SELECT id FROM users WHERE name = ?').bind(n).first();
      if (exists) return fail('Det navnet er tatt. Velg et annet.', 409);
      const salt = randomHex(16);
      const res = await env.DB.prepare('INSERT INTO users (name, pin_hash, salt, created) VALUES (?, ?, ?, ?)').bind(n, await hashPin(pin!, salt), salt, now()).run();
      const id = Number(res.meta.last_row_id);
      return json({ token: await newSession(env, id), user: { id, name: n } });
    }
    if (a === 'login' && method === 'POST') {
      const { name, pin } = await body<{ name?: string; pin?: string }>(request);
      const u = await env.DB.prepare('SELECT * FROM users WHERE name = ?').bind((name ?? '').trim()).first<{ id: number; name: string; pin_hash: string; salt: string; fails: number; lock_until: number }>();
      if (!u) return fail('Fant ingen bruker med det navnet.', 404);
      if (u.lock_until > now()) return fail('For mange feil. Vent et par minutter.', 429);
      if (!safeEq(await hashPin(pin ?? '', u.salt), u.pin_hash)) {
        const fails = u.fails + 1;
        await env.DB.prepare('UPDATE users SET fails = ?, lock_until = ? WHERE id = ?').bind(fails >= 5 ? 0 : fails, fails >= 5 ? now() + 5 * 60000 : 0, u.id).run();
        return fail('Feil PIN.', 403);
      }
      await env.DB.prepare('UPDATE users SET fails = 0 WHERE id = ?').bind(u.id).run();
      return json({ token: await newSession(env, u.id), user: { id: u.id, name: u.name } });
    }

    const me = await auth(request, env);
    if (!me) return fail('Ikke logget inn.', 401);

    if (a === 'logout' && method === 'POST') {
      const token = (request.headers.get('authorization') ?? '').slice(7);
      await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
      return json({ ok: true });
    }
    if (a === 'me' && method === 'GET') {
      const p = await env.DB.prepare('SELECT data, updated FROM progress WHERE user_id = ?').bind(me.id).first<{ data: string; updated: number }>();
      return json({ user: me, progress: p ? JSON.parse(p.data) : null, updated: p?.updated ?? 0 });
    }
    if (a === 'progress' && method === 'PUT') {
      const { data } = await body<{ data?: any }>(request);
      if (!data || typeof data !== 'object') return fail('Mangler data.');
      const raw = JSON.stringify(data);
      if (raw.length > 400000) return fail('For mye data.', 413);
      await env.DB.prepare('INSERT INTO progress (user_id, data, xp, puzzle_rating, play_rating, updated) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, xp = excluded.xp, puzzle_rating = excluded.puzzle_rating, play_rating = excluded.play_rating, updated = excluded.updated')
        .bind(me.id, raw, Math.round(+data.xp || 0), Math.round(+data.puzzleRating || 0), Math.round(+data.playRating || 0), now()).run();
      return json({ ok: true });
    }
    if (a === 'users' && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT u.id, u.name, COALESCE(p.xp,0) AS xp, COALESCE(p.puzzle_rating,0) AS puzzle, COALESCE(p.play_rating,0) AS play, COALESCE(p.updated,0) AS active FROM users u LEFT JOIN progress p ON p.user_id = u.id ORDER BY xp DESC').all();
      return json({ users: results });
    }

    // ---- Partier mot venner ----
    if (a === 'games') await expireGames(env);
    if (a === 'games' && !b && method === 'GET') {
      const { results } = await env.DB.prepare(`${GAME_SELECT} WHERE (g.white = ? OR g.black = ?) AND (g.status IN ('pending','active') OR g.updated > ?) ORDER BY g.updated DESC LIMIT 30`).bind(me.id, me.id, now() - 14 * DAY).all<GameRow>();
      return json({ me: me.id, games: results, limit: MOVE_LIMIT, serverNow: now() });
    }
    if (a === 'games' && !b && method === 'POST') {
      const { opponent, color } = await body<{ opponent?: number; color?: string }>(request);
      if (!opponent || opponent === me.id) return fail('Velg en motstander.');
      const opp = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(opponent).first();
      if (!opp) return fail('Fant ikke motstanderen.', 404);
      const open = await env.DB.prepare("SELECT COUNT(*) AS n FROM games WHERE status IN ('pending','active') AND ((white = ?1 AND black = ?2) OR (white = ?2 AND black = ?1))").bind(me.id, opponent).first<{ n: number }>();
      if ((open?.n ?? 0) >= 3) return fail('Dere har allerede tre partier i gang.');
      const iAmWhite = color === 'w' ? true : color === 'b' ? false : Math.random() < 0.5;
      const fen = new Chess().fen();
      const res = await env.DB.prepare('INSERT INTO games (white, black, created_by, status, fen, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(iAmWhite ? me.id : opponent, iAmWhite ? opponent : me.id, me.id, 'pending', fen, now(), now()).run();
      return json({ id: Number(res.meta.last_row_id) });
    }
    if (a === 'games' && b) {
      const id = Number(b);
      const g = await env.DB.prepare(`${GAME_SELECT} WHERE g.id = ?`).bind(id).first<GameRow>();
      if (!g || (g.white !== me.id && g.black !== me.id)) return fail('Fant ikke partiet.', 404);
      if (!c && method === 'GET') return json({ me: me.id, game: g, limit: MOVE_LIMIT, serverNow: now() });
      if (c === 'accept' && method === 'POST') {
        if (g.status !== 'pending' || g.created_by === me.id) return fail('Kan ikke godta dette partiet.');
        await env.DB.prepare("UPDATE games SET status = 'active', updated = ? WHERE id = ?").bind(now(), id).run();
        return json({ ok: true });
      }
      if (c === 'decline' && method === 'POST') {
        if (g.status !== 'pending') return fail('Partiet er ikke en utfordring.');
        await env.DB.prepare("UPDATE games SET status = 'declined', updated = ? WHERE id = ?").bind(now(), id).run();
        return json({ ok: true });
      }
      if (c === 'resign' && method === 'POST') {
        if (g.status !== 'active') return fail('Partiet er ikke i gang.');
        const result = g.white === me.id ? '0-1' : '1-0';
        await env.DB.prepare("UPDATE games SET status = 'done', result = ?, reason = ?, updated = ? WHERE id = ?").bind(result, `${me.name} ga opp`, now(), id).run();
        return json({ ok: true });
      }
      if (c === 'move' && method === 'POST') {
        const { uci, ply } = await body<{ uci?: string; ply?: number }>(request);
        if (g.status !== 'active') return fail('Partiet er ikke i gang.');
        const moves = g.moves ? g.moves.split(' ') : [];
        if (ply !== moves.length) return fail('Partiet har endret seg. Last på nytt.', 409);
        const ch = new Chess();
        for (const m of moves) ch.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] || undefined });
        const myColor = g.white === me.id ? 'w' : 'b';
        if (ch.turn() !== myColor) return fail('Det er ikke din tur.');
        try { ch.move({ from: uci!.slice(0, 2), to: uci!.slice(2, 4), promotion: uci![4] || undefined }); } catch { return fail('Ulovlig trekk.'); }
        moves.push(uci!);
        let status = 'active', result: string | null = null, reason: string | null = null;
        if (ch.isGameOver()) {
          status = 'done';
          if (ch.isCheckmate()) { result = ch.turn() === 'w' ? '0-1' : '1-0'; reason = 'Sjakkmatt'; }
          else { result = '½-½'; reason = ch.isStalemate() ? 'Patt' : ch.isThreefoldRepetition() ? 'Tre like stillinger' : ch.isInsufficientMaterial() ? 'For lite materiell' : '50-trekksregelen'; }
        }
        await env.DB.prepare('UPDATE games SET moves = ?, fen = ?, status = ?, result = ?, reason = ?, updated = ? WHERE id = ?').bind(moves.join(' '), ch.fen(), status, result, reason, now(), id).run();
        return json({ ok: true });
      }
    }
    return fail('Ukjent forespørsel.', 404);
  } catch (e) {
    return fail('Serverfeil: ' + (e as Error).message, 500);
  }
};
