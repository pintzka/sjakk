# Sjakkreisen – sjakk.pintzka.com

En nettside der Daniel (og vennene hans) lærer sjakk: leksjoner, taktikkoppgaver, quiz og boter på ulike nivåer, med XP, merker, streak og rating.

## Innhold
- **Sjakkreisen:** 5 øyer (Regler, Matt, Taktikk, Åpning, Sluttspill) med 30 leksjoner og en boss-bot på hver øy.
- **Taktikkoppgaver:** egne oppgaver generert med Stockfish (`tools/genpuzzles.mjs`), tilpasset ratingen din, med repetisjon av oppgaver du bommet på (1, 3 og 7 dager).
- **Quiz:** Finn feltet, Matt eller ikke, Gratis brikke, Tell trekkene.
- **Spill:** 6 boter fra ca. 250 til ca. 1900, hint, angre, og gjennomgang av partiet etterpå. Spill mot en venn på samme skjerm.
- **Brukere:** registrering med invitasjonskode, innlogging med navn + PIN, fremgang lagres på serveren, partier mot andre registrerte brukere og vennetabell.

## Teknikk
- Vite + Preact + TypeScript, statisk side på Cloudflare Pages.
- `functions/api/[[route]].ts`: API (Pages Functions) med Cloudflare D1-databasen `sjakk-db` (binding `DB`, se `wrangler.toml`, skjema i `migrations/`).
- Hemmelighet `INVITE_CODE` settes i Cloudflare (Settings → Variables and Secrets).
- Sjakkregler: [chess.js](https://github.com/jhlywa/chess.js) (BSD-2). Motor: [Stockfish](https://stockfishchess.org) via [stockfish.js](https://github.com/nmrugg/stockfish.js) (GPL-3), lite-versjonen i en Web Worker.
- Brikker, figurer og lyder er laget for denne siden (SVG og Web Audio).

## Kommandoer
```
npm install
npm run dev            # lokal utvikling
npm run build          # bygger til dist/
npm run check-lessons  # sjekker alle leksjoner med Stockfish (node --experimental-strip-types)
node tools/genpuzzles.mjs 100 tools/out/pz9.json 9   # lag flere oppgaver
npm run puzzles        # slår sammen tools/out/pz*.json til public/puzzles.json
```

## Lisens
GPL-3.0-or-later (fordi Stockfish er GPL-3). Se `LICENSE`.
