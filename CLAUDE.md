# Rokade (sjakk.pintzka.com)

Daniel (13) eier prosjektet. Svar på norsk, forklar på et nivå som passer en 13-åring.
Bare egne figurer, brikker, lyder og oppgaver. Ikke bruk innhold andre har rettighetene til.

- Leksjoner: `src/data/lessons.ts` (ren data). Kjør `node --experimental-strip-types tools/check-lessons.mjs` etter endringer.
- Oppgaver: genereres med `tools/genpuzzles.mjs`, slås sammen med `node tools/build-puzzles.mjs` til `public/puzzles.json` (sjekkes inn).
- Boter: `src/engine/bots.ts`. Fremgang: `src/lib/store.ts` (localStorage) + synk i `src/lib/account.ts`.
- API: `functions/api/[[route]].ts`, D1 `sjakk-db` (id i `wrangler.toml`). Skjemaendringer: ny fil i `migrations/` og kjør den mot D1.
- Stillinger som sendes til Stockfish må være lovlige (ingen konge i sjakk for den som ikke er i trekket), ellers krasjer motoren.
