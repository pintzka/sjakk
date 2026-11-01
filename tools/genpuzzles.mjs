// Lager egne taktikkoppgaver: Stockfish spiller mot seg selv med innlagte tabber,
// og vi leter etter stillinger der det finnes ett klart beste trekk.
// Bruk: node tools/genpuzzles.mjs <antall-partier> <utfil> <seed>
import { Chess } from 'chess.js';
import { writeFileSync } from 'node:fs';
import { Engine, val } from './engine-node.mjs';

const [games = '50', out = 'puzzles.json', seedArg = '1'] = process.argv.slice(2);
let seed = +seedArg * 9973;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

const e = new Engine();
await e.init();
const puzzles = [];
const seen = new Set();

function uci(m) { return m.from + m.to + (m.promotion || ''); }
function play(ch, u) { return ch.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); }
function material(ch, color) {
  let s = 0;
  for (const row of ch.board()) for (const p of row) if (p) s += (p.color === color ? 1 : -1) * VALUE[p.type];
  return s;
}

// Finn løsningen fra stilling (solver i trekket). Returnerer liste med uci-trekk eller null.
async function solve(fen, maxSolver) {
  const ch = new Chess(fen);
  const line = [];
  for (let i = 0; i < maxSolver; i++) {
    const a = await e.analyse(ch.fen(), 16, 2);
    if (!a.length) break;
    const [b1, b2] = a;
    const v1 = val(b1), v2 = b2 ? val(b2) : -99999;
    const isMate = b1.mate !== null && b1.mate > 0;
    let unique;
    if (isMate) unique = !(b2 && b2.mate !== null && b2.mate > 0 && b2.mate <= b1.mate + (b1.mate === 1 ? 0 : 0));
    else unique = v1 >= 200 && v2 <= v1 - 250 && v2 < 250;
    if (i === 0 && !unique) return null;
    if (i > 0 && !unique) break;
    line.push(b1.move);
    play(ch, b1.move);
    if (ch.isGameOver()) break;
    // motstanderens beste svar
    const r = await e.analyse(ch.fen(), 12, 1);
    if (!r.length) break;
    if (i + 1 >= maxSolver) break;
    line.push(r[0].move);
    play(ch, r[0].move);
  }
  // løsningen må slutte med solvers trekk
  if (line.length % 2 === 0) line.pop();
  return line.length ? line : null;
}

function themesFor(startFen, line, mateN) {
  const ch = new Chess(startFen);
  const solver = ch.turn();
  const themes = new Set();
  if (mateN) themes.add('mattI' + mateN);
  let firstCapture = false, firstCheck = false, hanging = false;
  for (let i = 0; i < line.length; i++) {
    const before = new Chess(ch.fen());
    const m = play(ch, line[i]);
    if (i % 2 === 1) continue; // bare solvers trekk
    if (i === 0) {
      firstCapture = !!m.captured; firstCheck = ch.inCheck();
      if (m.captured && line.length === 1 && !mateN) {
        const defenders = before.attackers(m.to, before.turn() === 'w' ? 'b' : 'w');
        if (defenders.length === 0) hanging = true;
      }
    }
    if (m.promotion) themes.add('forvandling');
    // gaffel: brikken som flyttet angriper minst to verdifulle brikker
    const opp = solver === 'w' ? 'b' : 'w';
    let targets = 0;
    for (const row of ch.board()) for (const p of row) {
      if (!p || p.color !== opp) continue;
      if (p.type === 'p') continue;
      if (VALUE[p.type] < VALUE[m.piece] && p.type !== 'k' && m.piece !== 'p' && m.piece !== 'n' && m.piece !== 'b') continue;
      const att = ch.attackers(p.square, solver);
      if (att.includes(m.to)) targets++;
    }
    if (targets >= 2 && !mateN) themes.add('gaffel');
  }
  if (hanging) themes.add('henger');
  if (!mateN && !themes.has('henger')) themes.add('vinnMateriale');
  if (!mateN && ch.isCheckmate()) themes.add('mattI' + Math.ceil(line.length / 2));
  return { themes: [...themes], firstCapture, firstCheck };
}

function rate(themes, line, firstCapture, firstCheck) {
  const n = Math.ceil(line.length / 2);
  let r;
  if (themes.includes('mattI1')) r = 650;
  else if (themes.includes('henger')) r = 600;
  else if (themes.includes('mattI2')) r = 1150;
  else if (themes.some((t) => t.startsWith('mattI'))) r = 1450 + (n - 3) * 200;
  else r = [0, 950, 1300, 1600][n] ?? 1700;
  if (themes.includes('gaffel') && n === 1) r += 50;
  if (!firstCapture && !firstCheck) r += 150;
  if (firstCheck) r -= 50;
  r += Math.round((rnd() - 0.5) * 150);
  return Math.max(400, r);
}

async function chooseMove(ch, ply) {
  const moves = ch.moves({ verbose: true });
  if (ply < 6) {
    const a = await e.analyse(ch.fen(), 6, 4);
    return pick(a.slice(0, Math.min(4, a.length))).move;
  }
  const a = await e.analyse(ch.fen(), 7, 2);
  if (a.length > 1 && Math.abs(val(a[0]) - val(a[1])) < 40 && rnd() < 0.5) return a[1].move;
  return a[0].move;
}

const t0 = Date.now();
for (let g = 0; g < +games; g++) {
  const ch = new Chess();
  let prevEval = 0;
  for (let ply = 0; ply < 110 && !ch.isGameOver(); ply++) {
    const fenBefore = ch.fen();
    const blunder = ply >= 8 && rnd() < 0.16;
    let mv;
    if (blunder) mv = uci(pick(ch.moves({ verbose: true })));
    else mv = await chooseMove(ch, ply);
    play(ch, mv);
    if (ch.isGameOver()) break;
    if (!blunder && rnd() > 0.15) continue;
    const key = ch.fen().split(' ').slice(0, 4).join(' ');
    if (seen.has(key)) continue;
    seen.add(key);
    // Var stillingen før tabben omtrent lik (sett fra solvers side)?
    const pre = await e.analyse(fenBefore, 10, 1);
    const preForSolver = -val(pre[0]);
    const quick = await e.analyse(ch.fen(), 12, 1);
    const q = quick[0];
    if (!q) continue;
    const isMate = q.mate !== null && q.mate > 0 && q.mate <= 4;
    if (!isMate && (q.cp === null || q.cp < 250)) continue;
    if (!isMate && preForSolver > 150) continue;
    if (isMate && preForSolver > 900) continue;
    const line = await solve(ch.fen(), isMate ? q.mate : 3);
    if (!line) continue;
    // sjekk at matt faktisk blir matt
    let mateN = null;
    if (isMate) {
      const t = new Chess(ch.fen());
      for (const u of line) play(t, u);
      if (!t.isCheckmate()) continue;
      mateN = Math.ceil(line.length / 2);
    }
    const { themes, firstCapture, firstCheck } = themesFor(ch.fen(), line, mateN);
    puzzles.push({
      id: `p${seedArg}-${puzzles.length}`,
      fen: fenBefore,
      moves: [mv, ...line],
      rating: rate(themes, line, firstCapture, firstCheck),
      themes,
    });
  }
  if (g % 5 === 4) {
    writeFileSync(out, JSON.stringify(puzzles));
    console.log(`parti ${g + 1}: ${puzzles.length} oppgaver, ${Math.round((Date.now() - t0) / 1000)} s`);
  }
}
writeFileSync(out, JSON.stringify(puzzles));
console.log('ferdig', puzzles.length);
process.exit(0);
