// Botene du kan spille mot. De svakeste er laget i ren JavaScript, de sterkere bruker Stockfish.
import { Chess, type Move } from 'chess.js';
import { engine } from './stockfish';
import type { PieceType } from '../board/pieces';

export interface Bot {
  id: string; name: string; elo: number; piece: PieceType; color: string;
  intro: string; style: string;
  lines: { start: string[]; capture: string[]; lost: string[]; win: string[]; lose: string[]; think: string[] };
  undo: boolean;
}

export const BOTS: Bot[] = [
  {
    id: 'bo', name: 'Bonde-Bo', elo: 250, piece: 'p', color: '#8bd17c', undo: true,
    intro: 'Bo har nettopp lært hvordan brikkene går. Han tar gjerne brikker, men tenker ikke så langt.',
    style: 'Tar alt han ser',
    lines: {
      start: ['Hei! Jeg har øvd hele uka!', 'Er det jeg som er hvit? Eller du?'],
      capture: ['Nam nam!', 'Den tar jeg!', 'Hehe, gratis brikke!'],
      lost: ['Åh nei, den så jeg ikke!', 'Hvor ble den av?'],
      win: ['Jippi! Jeg vant!'], lose: ['Godt spilt! Du er flink!'], think: ['Hmm...', 'Hvilken skal jeg flytte?'],
    },
  },
  {
    id: 'sara', name: 'Springer-Sara', elo: 500, piece: 'n', color: '#5cc7ff', undo: true,
    intro: 'Sara elsker springere og gafler. Hun passer på brikkene sine, men ikke alltid.',
    style: 'Liker gafler',
    lines: {
      start: ['Pass deg for springerne mine!', 'Klar for en gaffel?'],
      capture: ['Hopp, hopp, tatt!', 'Takk for den!'],
      lost: ['Oi, der glemte jeg å passe på.', 'Grr!'],
      win: ['Hopp hopp hurra!'], lose: ['Du var for sterk i dag!'], think: ['La meg telle feltene...', 'Hmm, hopp eller ikke hopp?'],
    },
  },
  {
    id: 'lars', name: 'Løper-Lars', elo: 800, piece: 'b', color: '#ffb020', undo: true,
    intro: 'Lars angriper hele tiden på skrå. Han glemmer ofte forsvaret når han angriper.',
    style: 'Angriper, glemmer forsvar',
    lines: {
      start: ['Diagonaler er det beste som finnes!', 'Jeg kommer på skrå!'],
      capture: ['Zoom, på skrå!', 'Angrep!'],
      lost: ['Det var ikke en del av planen.', 'Hmpf.'],
      win: ['Angrep vinner partier!'], lose: ['Godt forsvart! Respekt.'], think: ['Hvor kan jeg angripe?', 'Hmm...'],
    },
  },
  {
    id: 'tora', name: 'Tårn-Tora', elo: 1100, piece: 'r', color: '#ff8a3d', undo: false,
    intro: 'Tora er solid som en borg. Hun gir sjelden bort brikker, så du må finne gode planer.',
    style: 'Solid og trygg',
    lines: {
      start: ['Borgen min er klar.', 'La oss se hva du kan.'],
      capture: ['Tatt.', 'Den sto ubeskyttet.'],
      lost: ['Godt sett.', 'Den fortjente du.'],
      win: ['Tålmodighet lønner seg.'], lose: ['Imponerende! Du har blitt god.'], think: ['Tenker...', 'Interessant trekk.'],
    },
  },
  {
    id: 'dina', name: 'Dronning-Dina', elo: 1400, piece: 'q', color: '#ff5a8a', undo: false,
    intro: 'Dina straffer de fleste feil. Spill trygt, utvikle brikkene og se etter taktikker.',
    style: 'Straffer feil',
    lines: {
      start: ['Dronningen hilser deg.', 'Vis meg hva du har lært.'],
      capture: ['Takk.', 'Den tar dronningen seg av.'],
      lost: ['Hm. Ikke dårlig.', 'Den så jeg ikke komme.'],
      win: ['Dronningen vinner igjen.'], lose: ['Du slo meg! Det er det få som gjør.'], think: ['...', 'Hm.'],
    },
  },
  {
    id: 'kare', name: 'Kong Kåre', elo: 1900, piece: 'k', color: '#a48bff', undo: false,
    intro: 'Sjefsbossen. Kåre er sterkere enn de fleste klubbspillere. Klarer du å slå ham, er du skikkelig god.',
    style: 'Sjefsboss',
    lines: {
      start: ['Så du har kommet helt hit.', 'Kongen tar imot utfordringen.'],
      capture: ['Som forventet.', 'Takk for brikken.'],
      lost: ['Godt trekk.', 'Interessant.'],
      win: ['Kom tilbake når du har øvd mer.'], lose: ['Du er en ekte sjakkonge nå!'], think: ['Kongen tenker...', '...'],
    },
  },
];

export function botById(id: string) { return BOTS.find((b) => b.id === id) ?? BOTS[0]; }

const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
export const say = (a: string[]) => pick(a);

function bestCaptureValue(ch: Chess): number {
  let best = 0;
  for (const m of ch.moves({ verbose: true })) if (m.captured) best = Math.max(best, VAL[m.captured]);
  return best;
}

function boMove(ch: Chess): Move {
  const moves = ch.moves({ verbose: true });
  const captures = moves.filter((m) => m.captured);
  if (captures.length && Math.random() < 0.6) {
    captures.sort((a, b) => VAL[b.captured!] - VAL[a.captured!]);
    return Math.random() < 0.7 ? captures[0] : pick(captures);
  }
  return pick(moves);
}

function saraMove(ch: Chess): Move {
  const moves = ch.moves({ verbose: true });
  if (Math.random() < 0.18) return pick(moves);
  let best: Move[] = []; let bestScore = -Infinity;
  for (const m of moves) {
    ch.move(m);
    let score: number;
    if (ch.isCheckmate()) score = Math.random() < 0.75 ? 100 : 0;
    else score = (m.captured ? VAL[m.captured] : 0) - (Math.random() < 0.7 ? bestCaptureValue(ch) : 0) + (m.promotion ? 8 : 0) + Math.random() * 0.4;
    ch.undo();
    if (score > bestScore) { bestScore = score; best = [m]; } else if (score === bestScore) best.push(m);
  }
  return pick(best);
}

export async function botMove(bot: Bot, fen: string): Promise<string> {
  try { return await botMoveInner(bot, fen); }
  catch { return (() => { const ch = new Chess(fen); const m = saraMove(ch); return m.from + m.to + (m.promotion ?? ''); })(); }
}

async function botMoveInner(bot: Bot, fen: string): Promise<string> {
  const ch = new Chess(fen);
  const uci = (m: Move) => m.from + m.to + (m.promotion ?? '');
  switch (bot.id) {
    case 'bo': return uci(boMove(ch));
    case 'sara': return uci(saraMove(ch));
    case 'lars': {
      if (Math.random() < 0.1) return uci(pick(ch.moves({ verbose: true })));
      return (await engine.go(fen, { depth: 2, skill: 0 }))[0].move;
    }
    case 'tora': return (await engine.go(fen, { depth: 5, skill: 3 }))[0].move;
    case 'dina': return (await engine.go(fen, { depth: 8, skill: 8 }))[0].move;
    default: return (await engine.go(fen, { movetime: 700, skill: 16 }))[0].move;
  }
}
