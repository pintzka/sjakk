// Slår sammen genererte oppgaver (tools/out/pz*.json) til public/puzzles.json
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const all = [];
const seen = new Set();
for (const f of readdirSync('tools/out').filter((f) => /^pz\d+\.json$/.test(f))) {
  for (const p of JSON.parse(readFileSync('tools/out/' + f, 'utf8'))) {
    const key = p.fen.split(' ').slice(0, 2).join(' ') + p.moves[0];
    if (seen.has(key)) continue;
    seen.add(key);
    // Litt lavere rating på de enkleste typene, så nybegynnere får nok å øve på
    let r = p.rating;
    if (p.themes.includes('henger')) r -= 120;
    if (p.themes.includes('mattI1')) r -= 80;
    all.push({ id: 'g' + all.length.toString(36), fen: p.fen, moves: p.moves, rating: Math.max(300, Math.round(r)), themes: p.themes });
  }
}
all.sort((a, b) => a.rating - b.rating);
writeFileSync('public/puzzles.json', JSON.stringify(all));
const by = {};
for (const p of all) for (const t of p.themes) by[t] = (by[t] ?? 0) + 1;
const buckets = {};
for (const p of all) { const b = Math.floor(p.rating / 200) * 200; buckets[b] = (buckets[b] ?? 0) + 1; }
console.log(all.length, 'oppgaver', JSON.stringify(by), JSON.stringify(buckets));
