// Sjekker at alle trekk i åpningstreneren er lovlige. Bruk: node --experimental-strip-types tools/check-openings.mjs
import { Chess } from 'chess.js';
import { OPENINGS } from '../src/data/openings.ts';
let bad = 0;
for (const o of OPENINGS) for (const l of o.lines) {
  const ch = new Chess();
  for (const [i, [san]] of l.steps.entries()) {
    try { ch.move(san); } catch { console.log(`${o.id}/${l.id}: trekk ${i + 1} (${san}) er ulovlig etter ${ch.history().join(' ')}`); bad++; break; }
  }
  const mine = l.steps.filter((_, i) => (o.side === 'w' ? i % 2 === 0 : i % 2 === 1));
  if (l.steps.length % 2 === (o.side === 'w' ? 0 : 1)) console.log(`${o.id}/${l.id}: slutter med motstanderens trekk`);
  if (mine.some(([, why]) => !why) && l.id === 'hoved') { /* ok: ikke alle trekk trenger forklaring */ }
}
console.log(bad ? `${bad} feil` : `Alt OK (${OPENINGS.length} åpninger, ${OPENINGS.reduce((n, o) => n + o.lines.length, 0)} varianter)`);
