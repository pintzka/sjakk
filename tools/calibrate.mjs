// Måler hvor vanskelig hver oppgave er, så ratingen blir mer riktig.
// For hver oppgave: hvor dypt Stockfish må regne før den finner (og holder seg til) løsningstrekket,
// om første trekk er et offer, og om det er et stille trekk (ikke slag eller sjakk).
// build-puzzles.mjs bruker dette til å regne ut ratingen.
// Bruk: node tools/calibrate.mjs tools/out/pz1.json [flere filer]   → lagrer i tools/out/calib.json
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { Chess } from 'chess.js';
import { Engine } from './engine-node.mjs';

const CACHE = 'tools/out/calib.json';
const MAXD = 14;
const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};
export const keyOf = (p) => p.fen.split(' ').slice(0, 2).join(' ') + p.moves[0];

const V = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
function material(ch, color) {
  let s = 0;
  for (const row of ch.board()) for (const x of row) if (x) s += (x.color === color ? 1 : -1) * V[x.type];
  return s;
}
function play(ch, u) { return ch.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); }

const e = new Engine();
await e.init();
e.send('setoption name MultiPV value 1');

async function findDepth(fen, target) {
  e.send('ucinewgame');
  e.send('position fen ' + fen);
  const lines = await e.cmd(`go depth ${MAXD}`, (l) => l.startsWith('bestmove'));
  const byDepth = {};
  for (const l of lines) {
    if (!l.startsWith('info') || !l.includes(' pv ') || l.includes('bound')) continue;
    const d = +(l.match(/ depth (\d+)/)?.[1] ?? 0);
    byDepth[d] = l.split(' pv ')[1].trim().split(' ')[0];
  }
  let fd = MAXD + 1;
  for (let d = MAXD; d >= 1; d--) {
    if (!byDepth[d]) continue;
    if (byDepth[d] === target) fd = d; else break;
  }
  return fd;
}

for (const f of process.argv.slice(2)) {
  const list = JSON.parse(readFileSync(f, 'utf8'));
  let n = 0;
  for (const p of list) {
    const k = keyOf(p);
    if (cache[k]) continue;
    const ch = new Chess(p.fen);
    play(ch, p.moves[0]);
    const solver = ch.turn();
    const start = ch.fen();
    const before = material(ch, solver);
    const m = play(ch, p.moves[1]);
    const quiet = !m.captured && !ch.inCheck();
    // Offer: etter første trekk og motstanderens svar har du mindre materiell enn før
    if (p.moves[2]) play(ch, p.moves[2]);
    const sac = material(ch, solver) - before <= -2 && p.moves.length > 3;
    const d = await findDepth(start, p.moves[1]);
    cache[k] = { d, sac, quiet };
    if (++n % 25 === 0) { writeFileSync(CACHE, JSON.stringify(cache)); console.log(f, n, '/', list.length); }
  }
  writeFileSync(CACHE, JSON.stringify(cache));
  console.log(f, 'ferdig', n);
}
e.quit();
process.exit(0);
