// Slår sammen genererte oppgaver (tools/out/pz*.json) til public/puzzles.json
// Ratingen regnes ut fra målingene i tools/out/calib.json (kjør tools/calibrate.mjs først).
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { Chess } from 'chess.js';

const calib = existsSync('tools/out/calib.json') ? JSON.parse(readFileSync('tools/out/calib.json', 'utf8')) : {};
const V = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

// Hvor mange «fristende» trekk (slag, sjakk, forvandling) ser bedre ut enn løsningen ved første øyekast?
function greedyRank(p) {
  const ch = new Chess(p.fen);
  ch.move({ from: p.moves[0].slice(0, 2), to: p.moves[0].slice(2, 4), promotion: p.moves[0][4] });
  const start = ch.fen();
  const k = (mv) => {
    const t = new Chess(start); t.move(mv);
    let s = 0;
    if (mv.captured) s += 100 + V[mv.captured] * 10 - V[mv.piece];
    if (t.inCheck()) s += 50;
    if (mv.promotion) s += 80;
    return s;
  };
  const legal = ch.moves({ verbose: true });
  const sol = legal.find((x) => x.from + x.to + (x.promotion ?? '') === p.moves[1]);
  const sk = k(sol);
  return legal.filter((x) => x !== sol && k(x) > sk).length;
}

// Lite, fast «tilfeldig» tall fra stillingen, så like oppgaver får litt ulik rating
function jitter(s) { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0; return ((h >>> 0) % 81) - 40; }

// Fast id ut fra stillingen, så id-en ikke endrer seg når vi bygger på nytt (repetisjon peker på id)
function idOf(key) { let h = 0x811c9dc5; for (const ch of key) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193); } return 'h' + (h >>> 0).toString(36); }

function rate(p) {
  const x = calib[p.fen.split(' ').slice(0, 2).join(' ') + p.moves[0]];
  if (!x) return null;
  const n = Math.ceil((p.moves.length - 1) / 2);
  let r = 380 + 250 * (n - 1) + 120 * Math.min(greedyRank(p), 6);
  if (x.quiet) r += 220;
  if (x.sac) r += 200;
  r += 35 * Math.min(Math.max(x.d - 1, 0), 10);
  if (p.themes.includes('mattI2')) r += 150;
  if (p.themes.some((t) => /^mattI[3-9]/.test(t))) r += 250;
  if (p.themes.includes('henger')) r -= 60;
  return r + jitter(p.fen);
}
const all = [];
const seen = new Set();
let missing = 0;
for (const f of readdirSync('tools/out').filter((f) => /^pz\d+\.json$/.test(f))) {
  for (const p of JSON.parse(readFileSync('tools/out/' + f, 'utf8'))) {
    const key = p.fen.split(' ').slice(0, 2).join(' ') + p.moves[0];
    if (seen.has(key)) continue;
    seen.add(key);
    const r = rate(p);
    if (r === null) { missing++; continue; }
    all.push({ id: idOf(key), fen: p.fen, moves: p.moves, rating: Math.max(250, Math.round(r)), themes: p.themes });
  }
}
all.sort((a, b) => a.rating - b.rating);
writeFileSync('public/puzzles.json', JSON.stringify(all));
const by = {};
for (const p of all) for (const t of p.themes) by[t] = (by[t] ?? 0) + 1;
const buckets = {};
for (const p of all) { const b = Math.floor(p.rating / 200) * 200; buckets[b] = (buckets[b] ?? 0) + 1; }
if (missing) console.log(missing, 'oppgaver mangler kalibrering (kjør tools/calibrate.mjs)');
console.log(all.length, 'oppgaver', JSON.stringify(by), JSON.stringify(buckets));
