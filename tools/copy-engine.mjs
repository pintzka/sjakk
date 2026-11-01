// Kopierer Stockfish (lite, ett tråd) fra node_modules til public/stockfish/
import { mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const bin = join(dirname(require.resolve('stockfish/package.json')), 'bin');
mkdirSync('public/stockfish', { recursive: true });
for (const f of ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm']) copyFileSync(join(bin, f), join('public/stockfish', f));
copyFileSync(join(bin, '..', 'Copying.txt'), 'public/stockfish/LICENSE-stockfish.txt');
console.log('Stockfish kopiert til public/stockfish/');
