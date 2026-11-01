// Liten hjelper som snakker med Stockfish (UCI) i Node.js.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const stockfish = require('stockfish');

export class Engine {
  constructor(flavor = 'lite-single') {
    this.cb = null;
    this.e = stockfish(flavor, (line) => { if (this.cb) this.cb(line); });
  }
  send(c) { this.e.processCommand(c); }
  cmd(c, done) {
    return new Promise((res) => {
      const lines = [];
      this.cb = (l) => { lines.push(l); if (done(l)) { this.cb = null; res(lines); } };
      this.send(c);
    });
  }
  async init() {
    await this.cmd('uci', (l) => l === 'uciok');
    this.send('setoption name Hash value 32');
    await this.cmd('isready', (l) => l === 'readyok');
  }
  // Returnerer [{move, cp, mate, pv}] sortert etter multipv
  async analyse(fen, depth, multipv = 1) {
    this.send(`setoption name MultiPV value ${multipv}`);
    this.send('position fen ' + fen);
    const lines = await this.cmd(`go depth ${depth}`, (l) => l.startsWith('bestmove'));
    const best = {};
    for (const l of lines) {
      if (!l.startsWith('info') || !l.includes(' pv ')) continue;
      const mpv = +(l.match(/ multipv (\d+)/)?.[1] ?? 1);
      const cp = l.match(/ score cp (-?\d+)/);
      const mate = l.match(/ score mate (-?\d+)/);
      const pv = l.split(' pv ')[1].trim().split(' ');
      if (l.includes('lowerbound') || l.includes('upperbound')) continue;
      best[mpv] = { move: pv[0], pv, cp: cp ? +cp[1] : null, mate: mate ? +mate[1] : null };
    }
    return Object.keys(best).sort((a, b) => a - b).map((k) => best[k]);
  }
  quit() { try { this.e.terminate?.(); } catch {} }
}

// Gjør om score til ett tall (mate = stort tall)
export function val(s) {
  if (!s) return -99999;
  if (s.mate !== null) return s.mate > 0 ? 100000 - s.mate * 100 : -100000 - s.mate * 100;
  return s.cp;
}
