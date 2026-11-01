// Sjekker at alle leksjoner er gyldige: lovlige stillinger og trekk, stjerner som kan nås,
// og at oppgavene har riktig løsning ifølge Stockfish.
// Kjør: node --experimental-strip-types tools/check-lessons.mjs
import { Chess } from 'chess.js';
import { ISLANDS } from '../src/data/lessons.ts';
import { starMoves, starPar } from '../src/lib/stars.ts';
import { Engine, val } from './engine-node.mjs';

const e = new Engine(); await e.init();
let errors = 0;
const err = (id, msg) => { errors++; console.log('FEIL', id, msg); };
const play = (ch, u) => ch.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });

for (const isl of ISLANDS) for (const l of isl.lessons) {
  for (const [i, s] of l.steps.entries()) {
    const id = `${l.id}#${i}`;
    try {
      if (s.t === 'puzzle' || s.t === 'play') {
        const ch = new Chess(s.fen);
        if (s.t === 'puzzle') {
          for (let k = 0; k < s.moves.length; k++) {
            const fen = ch.fen();
            if (k % 2 === 0 && !s.free) {
              const a = await e.analyse(fen, 14, 2);
              const best = a[0], second = a[1];
              const t = new Chess(fen); play(t, s.moves[k]);
              const mates = t.isCheckmate();
              if (!mates && best.move !== s.moves[k]) err(id, `trekk ${s.moves[k]} er ikke Stockfish sitt beste (${best.move}, ${JSON.stringify(a.map(x=>[x.move,x.cp,x.mate]))})`);
              else if (!mates && second && val(best) - val(second) < 150) console.log('ADVARSEL', id, 'flere gode trekk', JSON.stringify(a.map(x=>[x.move,x.cp,x.mate])));
            }
            if (!play(ch, s.moves[k])) err(id, 'ulovlig trekk ' + s.moves[k]);
          }
        } else {
          const a = await e.analyse(s.fen, 16, 1);
          if (!a.length) err(id, 'Stockfish godtar ikke stillingen');
          console.log('spill', id, s.goal, JSON.stringify(a.map(x=>[x.move,x.cp,x.mate])));
        }
      }
      if (s.t === 'stars') {
        const par = starPar(s.piece, s.from, s.stars, s.blockers ?? []);
        if (par === null) err(id, 'stjernene kan ikke nås');
        else console.log('stjerner', id, 'par', par);
      }
      if (s.t === 'choice' && s.answer >= s.options.length) err(id, 'svar utenfor alternativene');
    } catch (ex) { err(id, ex.message); }
  }
}
console.log(errors ? `${errors} feil` : 'Alt OK');
process.exit(errors ? 1 : 0);
