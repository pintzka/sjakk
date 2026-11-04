// Lager en forklaring på en oppgave ut fra trekkene: hvorfor løsningen virker.
// Ser etter matt, gaffel, binding, spidd, avdekket angrep, ubeskyttede brikker, offer og forvandling,
// og regner ut hvor mye materiell du vinner.
import { Chess, type Square, type Color, type PieceSymbol } from 'chess.js';
import { norsk, playUci, VALUES } from './chess';

const NAME: Record<string, string> = { p: 'bonden', n: 'springeren', b: 'løperen', r: 'tårnet', q: 'dronningen', k: 'kongen' };
const INDEF: Record<string, string> = { p: 'en bonde', n: 'en springer', b: 'en løper', r: 'et tårn', q: 'dronningen', k: 'kongen' };

export interface Explanation { line: string; points: string[]; summary: string }

const opp = (c: Color): Color => (c === 'w' ? 'b' : 'w');
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function material(ch: Chess, color: Color) {
  let s = 0;
  for (const row of ch.board()) for (const x of row) if (x) s += (x.color === color ? 1 : -1) * VALUES[x.type];
  return s;
}

function listText(a: string[]) {
  if (a.length <= 1) return a.join('');
  return a.slice(0, -1).join(', ') + ' og ' + a[a.length - 1];
}

// Notasjon med trekknummer fra stillingen, f.eks. «12... Dxh2+ 13. Kxh2 Th5#»
export function lineText(fen: string, moves: string[]) {
  const ch = new Chess(fen);
  let n = +fen.split(' ')[5] || 1;
  const out: string[] = [];
  moves.forEach((u, i) => {
    const white = ch.turn() === 'w';
    const m = playUci(ch, u);
    if (!m) return;
    if (white) out.push(`${n}. ${norsk(m.san)}`);
    else { out.push(i === 0 ? `${n}... ${norsk(m.san)}` : norsk(m.san)); n++; }
  });
  return out.join(' ');
}

const FILES = 'abcdefgh';
function sq(f: number, r: number) { return (FILES[f] + (r + 1)) as Square; }
function coords(s: string) { return [FILES.indexOf(s[0]), +s[1] - 1]; }

// Linjebrikke på `from`: finn første og andre brikke langs hver retning den kan gå
function rays(ch: Chess, from: string, type: PieceSymbol) {
  const dirs: number[][] = [];
  if (type === 'r' || type === 'q') dirs.push([1, 0], [-1, 0], [0, 1], [0, -1]);
  if (type === 'b' || type === 'q') dirs.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
  const res: { first: Square; second: Square | null }[] = [];
  const [f0, r0] = coords(from);
  for (const [df, dr] of dirs) {
    let f = f0 + df, r = r0 + dr, first: Square | null = null;
    while (f >= 0 && f < 8 && r >= 0 && r < 8) {
      const s = sq(f, r);
      if (ch.get(s)) { if (!first) first = s; else { res.push({ first, second: s }); first = null; break; } }
      f += df; r += dr;
    }
    if (first) res.push({ first, second: null });
  }
  return res;
}

// Hva truer du med? Lat som det er ditt trekk igjen og se etter matt eller lønnsomme slag.
function threats(after: Chess, me: Color): string[] {
  const parts = after.fen().split(' ');
  parts[1] = me; parts[3] = '-';
  let t: Chess;
  try { t = new Chess(parts.join(' ')); } catch { return []; }
  if (t.inCheck()) return [];
  const out: string[] = [];
  for (const mv of t.moves({ verbose: true })) {
    const x = new Chess(t.fen()); x.move(mv);
    if (x.isCheckmate()) return [`matt med ${norsk(mv.san)}`];
  }
  const seen = new Set<string>();
  for (const mv of t.moves({ verbose: true })) {
    if (!mv.captured || seen.has(mv.to)) continue;
    const defended = t.attackers(mv.to, opp(me)).length > 0;
    const gain = VALUES[mv.captured] - (defended ? VALUES[mv.piece] : 0);
    if (gain >= 1) {
      seen.add(mv.to);
      // Har brikken som er truet noe trygt sted å gå?
      const escapes = after.moves({ square: mv.to, verbose: true }).filter((e) => !after.isAttacked(e.to, me));
      out.push(`å slå ${NAME[mv.captured]} på ${mv.to}` + (escapes.length === 0 && mv.captured !== 'p' ? ` (og den har ingen trygge felt å flykte til)` : ''));
    }
  }
  return out.slice(0, 2);
}

function moveSentences(before: Chess, after: Chess, u: string, reply: string | undefined, mateLine: boolean): string[] {
  const me = before.turn(), them = opp(me);
  const m = playUci(new Chess(before.fen()), u)!;
  const san = norsk(m.san);
  const moverName = NAME[m.piece];
  const out: string[] = [];

  if (after.isCheckmate()) {
    const k = after.board().flat().find((x) => x && x.type === 'k' && x.color === them)!;
    const [kf, kr] = coords(k.square);
    const covered: string[] = [], blocked: string[] = [];
    for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) {
      if (!df && !dr) continue;
      const f = kf + df, r = kr + dr;
      if (f < 0 || f > 7 || r < 0 || r > 7) continue;
      const s = sq(f, r), p = after.get(s);
      if (p && p.color === them) blocked.push(s);
      else if (!p) covered.push(s);
    }
    let t = `${san} er sjakkmatt! Kongen står i sjakk, og ingen brikke kan slå ${moverName} eller sette seg imellom.`;
    if (covered.length && covered.length <= 5) t += ` Kongen kan ikke flykte: ${listText(covered)} ${covered.length === 1 ? 'er' : 'er'} dekket av brikkene dine`;
    else if (covered.length) t += ' Alle fluktfeltene er dekket av brikkene dine';
    if (blocked.length) t += `${covered.length ? ', og' : ' Kongen kan ikke flykte:'} egne brikker står i veien på ${listText(blocked)}`;
    out.push(t + '.');
    return out;
  }

  if (m.promotion) out.push(`Bonden går helt fram og blir ${NAME[m.promotion]}.`);

  // Gaffel: brikken som flyttet angriper to verdifulle eller ubeskyttede brikker
  const targets: { s: Square; type: PieceSymbol }[] = [];
  for (const x of after.board().flat()) {
    if (!x || x.color !== them || x.type === 'p') continue;
    if (!after.attackers(x.square, me).includes(m.to as Square)) continue;
    const undefended = after.attackers(x.square, them).length === 0;
    if (x.type === 'k' || VALUES[x.type] > VALUES[m.piece] || undefended) targets.push({ s: x.square, type: x.type });
  }
  if (targets.length >= 2) {
    const k = targets.find((t) => t.type === 'k');
    const others = targets.filter((t) => t.type !== 'k').map((t) => `${NAME[t.type]} på ${t.s}`);
    out.push(k
      ? `${cap(moverName)} på ${m.to} gir sjakk og angriper samtidig ${listText(others)}. Det er en gaffel: motstanderen må redde kongen og mister det andre.`
      : `${cap(moverName)} på ${m.to} angriper både ${listText(targets.map((t) => `${NAME[t.type]} på ${t.s}`))} samtidig. Det er en gaffel: motstanderen kan bare redde én.`);
  }

  // Binding og spidd fra en linjebrikke
  if (out.length === 0 && (m.piece === 'b' || m.piece === 'r' || m.piece === 'q')) {
    for (const { first, second } of rays(after, m.to, m.piece)) {
      const a = after.get(first), b = second ? after.get(second) : null;
      if (!a || !b || a.color !== them || b.color !== them) continue;
      if (a.type === 'k' && VALUES[b.type] >= 3) { out.push(`${san} gir sjakk langs linjen. Når kongen flytter seg, står ${NAME[b.type]} på ${second} bak den, og den kan du ta. Det kalles et spidd.`); break; }
      if (b.type === 'k' && a.type !== 'k') { out.push(`${cap(NAME[a.type])} på ${first} er bundet: den kan ikke flytte, fordi kongen står bak den.` + (VALUES[a.type] > VALUES[m.piece] ? ` Du truer med å slå den, og den kan ikke rømme.` : '')); break; }
      if (a.type === 'q' && (b.type === 'r' || (VALUES[b.type] >= 3 && after.attackers(second!, them).length === 0))) { out.push(`${san} angriper dronningen. Flytter den seg, kan du ta ${NAME[b.type]} på ${second} som står bak.`); break; }
    }
  }

  // Avdekket angrep: en annen av brikkene dine angriper plutselig noe stort
  if (out.length === 0) {
    for (const x of after.board().flat()) {
      if (!x || x.color !== them || !(x.type === 'k' || x.type === 'q' || x.type === 'r')) continue;
      const nowA = after.attackers(x.square, me).filter((s) => s !== m.to);
      const wasA = before.attackers(x.square, me);
      const fresh = nowA.find((s) => !wasA.includes(s));
      if (fresh) {
        const p = after.get(fresh)!;
        out.push(x.type === 'k'
          ? `Når ${moverName} flytter, gir ${NAME[p.type]} på ${fresh} sjakk. Det er avdekket sjakk: motstanderen må redde kongen, og ${moverName} kan gjøre det den vil.`
          : `Når ${moverName} flytter, angriper ${NAME[p.type]} på ${fresh} plutselig ${NAME[x.type]} på ${x.square}. Det er et avdekket angrep.`);
        break;
      }
    }
  }

  // Slag
  if (m.captured && !mateLine) {
    const defenders = before.attackers(m.to as Square, them);
    if (defenders.length === 0) out.push(`${cap(NAME[m.captured])} på ${m.to} var ubeskyttet, så ${san} vinner den gratis.`);
    else if (VALUES[m.captured] > VALUES[m.piece]) out.push(`${san} slår ${INDEF[m.captured]} med ${INDEF[m.piece]}, som er mindre verdt. Selv om motstanderen tar tilbake, tjener du på byttet.`);
  }

  // Offer: motstanderen slår brikken du nettopp flyttet, og du taper materiell i øyeblikket
  if (reply && reply.slice(2, 4) === m.to && VALUES[m.piece] > (m.captured ? VALUES[m.captured] : 0) && m.piece !== 'k') {
    out.push(`${san} er et offer: du gir bort ${moverName} med vilje, fordi det du får etterpå er verdt mer.`);
  }

  if (out.length === 0 && after.inCheck()) out.push(`${san} gir sjakk, så motstanderen må bruke trekket sitt på å redde kongen.`);
  if (out.length === 0 || (mateLine && !after.inCheck())) {
    const th = threats(after, me);
    if (th.length === 2) out.push(`${san} lager to trusler samtidig: ${th[0]} og ${th[1]}. Motstanderen kan ikke stoppe begge.`);
    else if (th.length === 1) out.push(`${san} truer ${th[0]}, og motstanderen har ikke noe godt forsvar.`);
    else if (out.length === 0 && !m.captured) out.push(`${san} er et stille trekk, men det lager en trussel motstanderen ikke klarer å stoppe.`);
  }
  return out;
}

export function explainPuzzle(fen: string, moves: string[], setupMove = true): Explanation {
  const ch = new Chess(fen);
  const points: string[] = [];
  let sol = moves;
  if (setupMove) {
    const m = playUci(ch, moves[0]);
    if (m) points.push(`Motstanderen spilte ${norsk(m.san)}. Det var en feil som du kan straffe.`);
    sol = moves.slice(1);
  }
  const start = ch.fen();
  const me = ch.turn();
  const startMat = material(ch, me);
  const mine: string[] = [], theirs: string[] = [];
  let forced = true;
  // Ender løsningen med matt? Da handler forklaringen om matten, ikke om materiell.
  const endCh = new Chess(start);
  for (const u of sol) playUci(endCh, u);
  const mateLine = endCh.isCheckmate();
  for (let i = 0; i < sol.length; i++) {
    const before = new Chess(ch.fen());
    const m = playUci(ch, sol[i]);
    if (!m) break;
    if (i % 2 === 0) {
      if (m.captured) mine.push(INDEF[m.captured]);
      for (const t of moveSentences(before, ch, sol[i], sol[i + 1], mateLine)) if (!points.includes(t)) points.push(t);
    } else {
      if (m.captured) theirs.push(INDEF[m.captured]);
      if (before.moves().length > 1) forced = false;
    }
  }
  const solverMoves = Math.ceil(sol.length / 2);
  let summary: string;
  if (ch.isCheckmate()) {
    summary = solverMoves === 1 ? 'Matt i ett trekk.'
      : `Matt i ${solverMoves} trekk. ` + (forced ? 'Alle motstanderens svar var tvunget.' : 'Motstanderen kan prøve andre forsvar, men da blir det matt like fort eller enda raskere.');
  } else {
    const net = material(ch, me) - startMat;
    const got = mine.length ? `Du tar ${listText(mine)}` : '';
    const lost = theirs.length ? `${got ? ', og motstanderen får bare' : 'Motstanderen tar'} ${listText(theirs)}` : '';
    if (net >= 1) summary = `${got}${lost}. Til sammen vinner du ${net} ${net === 1 ? 'poeng' : 'poeng'} materiell (bonde 1, springer og løper 3, tårn 5, dronning 9).`;
    else summary = 'Du vinner ikke materiell med en gang, men trusselen er så sterk at du får en klart bedre stilling.';
  }
  return { line: lineText(start, sol), points, summary };
}
