// Alle leksjonene i Sjakkreisen. Filen er ren data, så den er lett å endre og utvide.
// Sjekk at alt er gyldig med: npm run check-lessons

export type Hl = 'good' | 'bad' | 'hint' | 'target' | 'mark';
export interface LArrow { from: string; to: string; color?: string }

export type Step =
  | { t: 'info'; text: string; fen?: string; arrows?: LArrow[]; hl?: Record<string, Hl> }
  | { t: 'stars'; text: string; piece: 'p' | 'n' | 'b' | 'r' | 'q' | 'k'; from: string; stars: string[]; blockers?: string[] }
  | { t: 'squares'; text: string; fen: string; answer: string[]; ordered?: boolean }
  | { t: 'choice'; text: string; fen?: string; arrows?: LArrow[]; options: string[]; answer: number; explain: string }
  | { t: 'puzzle'; text: string; fen: string; moves: string[]; free?: boolean }
  | { t: 'practice'; text: string; theme: string; count: number }
  | { t: 'play'; text: string; fen: string; goal: 'mate' | 'promote'; maxMoves: number };

export interface Lesson { id: string; title: string; steps: Step[] }
export interface Island { id: string; name: string; desc: string; color: string; boss: string; lessons: Lesson[] }

const G = '#2fd27a', R = '#ff5a5f', Y = '#ffb020';
const EMPTY = '8/8/8/8/8/8/8/8 w - - 0 1';

export const ISLANDS: Island[] = [
  {
    id: 'regler', name: 'Regeløya', desc: 'Hvordan brikkene går, sjakk, matt og spesialtrekk.', color: 'linear-gradient(135deg,#2f8f5b,#1d5c3c)', boss: 'bo',
    lessons: [
      { id: 'brettet', title: 'Brettet', steps: [
        { t: 'info', fen: EMPTY, text: 'Sjakkbrettet har 64 felt. Linjene opp og ned heter <b>a til h</b>, og radene heter <b>1 til 8</b>. Hvert felt har et navn, for eksempel <b>e4</b>.', hl: { e4: 'mark' } },
        { t: 'squares', fen: EMPTY, text: 'Trykk på feltet <b>e4</b>.', answer: ['e4'] },
        { t: 'squares', fen: EMPTY, text: 'Trykk på feltet <b>b7</b>.', answer: ['b7'] },
        { t: 'squares', fen: EMPTY, text: 'Trykk på feltet <b>g2</b>.', answer: ['g2'] },
        { t: 'squares', fen: EMPTY, text: 'Trykk på alle fire hjørnefeltene.', answer: ['a1', 'h1', 'a8', 'h8'] },
      ] },
      { id: 'taarnet', title: 'Tårnet', steps: [
        { t: 'info', fen: '8/8/8/8/3R4/8/8/8 w - - 0 1', text: 'Tårnet går <b>rett fram, bakover og til sidene</b>, så langt det vil, men kan ikke hoppe over brikker.', arrows: [{ from: 'd4', to: 'd8' }, { from: 'd4', to: 'd1' }, { from: 'd4', to: 'a4' }, { from: 'd4', to: 'h4' }] },
        { t: 'stars', piece: 'r', from: 'a1', stars: ['a6', 'f6', 'f2', 'h2'], text: 'Samle alle stjernene med tårnet. Prøv å bruke så få trekk som mulig!' },
        { t: 'stars', piece: 'r', from: 'a1', stars: ['c3', 'h8', 'e5'], blockers: ['a4', 'c1', 'e8', 'f5'], text: 'Bøndene dine står i veien. Tårnet kan ikke hoppe over dem.' },
      ] },
      { id: 'loperen', title: 'Løperen', steps: [
        { t: 'info', fen: '8/8/8/8/3B4/8/8/8 w - - 0 1', text: 'Løperen går <b>på skrå</b>, så langt den vil. Den blir alltid på samme farge.', arrows: [{ from: 'd4', to: 'h8' }, { from: 'd4', to: 'a7' }, { from: 'd4', to: 'a1' }, { from: 'd4', to: 'g1' }] },
        { t: 'stars', piece: 'b', from: 'c1', stars: ['e3', 'g5', 'd8', 'a5'], text: 'Samle stjernene med løperen.' },
        { t: 'stars', piece: 'b', from: 'f1', stars: ['b5', 'e8', 'h3', 'a2'], blockers: ['d3', 'f5'], text: 'Nå med noen bønder i veien.' },
      ] },
      { id: 'dronningen', title: 'Dronningen', steps: [
        { t: 'info', fen: '8/8/8/8/3Q4/8/8/8 w - - 0 1', text: 'Dronningen er den sterkeste brikken. Den går <b>som tårnet og løperen til sammen</b>.', arrows: [{ from: 'd4', to: 'd8' }, { from: 'd4', to: 'h8' }, { from: 'd4', to: 'h4' }, { from: 'd4', to: 'g1' }, { from: 'd4', to: 'd1' }, { from: 'd4', to: 'a1' }, { from: 'd4', to: 'a4' }, { from: 'd4', to: 'a7' }] },
        { t: 'stars', piece: 'q', from: 'd1', stars: ['d5', 'h5', 'e8', 'a4', 'b7'], text: 'Samle stjernene med dronningen.' },
      ] },
      { id: 'kongen', title: 'Kongen', steps: [
        { t: 'info', fen: '8/8/8/8/3K4/8/8/8 w - - 0 1', text: 'Kongen går <b>ett felt</b> i alle retninger. Den er den viktigste brikken: blir kongen matt, har du tapt.', hl: { c3: 'target', c4: 'target', c5: 'target', d3: 'target', d5: 'target', e3: 'target', e4: 'target', e5: 'target' } },
        { t: 'stars', piece: 'k', from: 'e1', stars: ['e3', 'g3', 'g5', 'd6'], text: 'Samle stjernene med kongen.' },
      ] },
      { id: 'springeren', title: 'Springeren', steps: [
        { t: 'info', fen: '8/8/8/8/3N4/8/8/8 w - - 0 1', text: 'Springeren hopper i en <b>L</b>: to felt én vei og ett felt til siden. Den er den eneste brikken som kan hoppe over andre.', hl: { b3: 'target', b5: 'target', c2: 'target', c6: 'target', e2: 'target', e6: 'target', f3: 'target', f5: 'target' } },
        { t: 'stars', piece: 'n', from: 'b1', stars: ['c3', 'd5', 'f6', 'h7'], text: 'Hopp til alle stjernene.' },
        { t: 'stars', piece: 'n', from: 'g1', stars: ['e2', 'g4', 'h6', 'f8'], blockers: ['f2', 'g2', 'h2', 'f3'], text: 'Springeren hopper rett over bøndene.' },
      ] },
      { id: 'bonden', title: 'Bonden', steps: [
        { t: 'info', fen: '8/8/8/8/8/8/4P3/8 w - - 0 1', text: 'Bonden går <b>ett felt rett fram</b>. Fra startfeltet kan den gå to. Den <b>slår på skrå</b>, ett felt fram.', arrows: [{ from: 'e2', to: 'e4' }] },
        { t: 'stars', piece: 'p', from: 'e2', stars: ['d5', 'e7', 'd8'], text: 'Stjernene er fiendebrikker. Bonden kan bare gå til en stjerne ved å <b>slå på skrå</b>.' },
        { t: 'info', fen: '8/4P1k1/8/8/8/8/8/4K3 w - - 0 1', text: 'Når bonden kommer til siste rad, blir den <b>forvandlet</b> til en annen brikke. Nesten alltid velger man dronning.' },
        { t: 'puzzle', fen: '8/4P1k1/8/8/8/8/8/4K3 w - - 0 1', moves: ['e7e8q'], free: true, text: 'Flytt bonden til siste rad og velg dronning.' },
      ] },
      { id: 'sjakk-matt', title: 'Sjakk, matt og patt', steps: [
        { t: 'info', fen: '4k3/8/8/8/8/8/8/4R1K1 b - - 0 1', text: 'Når kongen blir angrepet, står den i <b>sjakk</b>. Da må du redde den: flytt kongen, slå brikken som angriper, eller sett en brikke imellom.', arrows: [{ from: 'e1', to: 'e8', color: R }] },
        { t: 'choice', fen: '4k3/8/8/8/8/8/8/4R1K1 b - - 0 1', text: 'Svart står i sjakk. Hvilket trekk redder kongen?', options: ['Kongen til d7', 'Kongen til e7', 'Ingenting, det er matt'], answer: 0, explain: 'På e7 står kongen fortsatt på e-linjen og er i sjakk. På d7 er den trygg.' },
        { t: 'info', fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', text: '<b>Sjakkmatt</b> betyr at kongen står i sjakk og ikke kan reddes. Da er partiet over.' },
        { t: 'puzzle', fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', moves: ['a1a8'], text: 'Sett matt i ett trekk!' },
        { t: 'choice', fen: 'k7/8/1Q6/8/8/8/8/7K b - - 0 1', text: 'Svart er i trekket. Hva er dette?', options: ['Sjakkmatt', 'Patt', 'Svart kan flytte kongen'], answer: 1, explain: '<b>Patt</b>: Svart står ikke i sjakk, men har ingen lovlige trekk. Da blir det remis. Pass på dette når du vinner!' },
      ] },
      { id: 'rokade', title: 'Rokade', steps: [
        { t: 'info', fen: 'r3k2r/pppq1ppp/2npbn2/2b1p3/2B1P3/2NPBN2/PPPQ1PPP/R3K2R w KQkq - 0 1', text: '<b>Rokade</b> er et spesialtrekk: kongen går to felt mot tårnet, og tårnet hopper over på andre siden. Det setter kongen i sikkerhet.', arrows: [{ from: 'e1', to: 'g1', color: G }, { from: 'h1', to: 'f1', color: Y }] },
        { t: 'puzzle', fen: 'r3k2r/pppq1ppp/2npbn2/2b1p3/2B1P3/2NPBN2/PPPQ1PPP/R3K2R w KQkq - 0 1', moves: ['e1g1'], free: true, text: 'Rokér kort: flytt kongen to felt mot h-tårnet.' },
        { t: 'puzzle', fen: 'r3k2r/pppq1ppp/2npbn2/2b1p3/2B1P3/2NPBN2/PPPQ1PPP/R3K2R w KQkq - 0 1', moves: ['e1c1'], free: true, text: 'Rokér langt: flytt kongen to felt mot a-tårnet.' },
        { t: 'choice', text: 'Når er det IKKE lov å rokere?', options: ['Når kongen står i sjakk', 'Når motstanderen har flere brikker', 'Etter trekk ti'], answer: 0, explain: 'Du kan ikke rokere hvis kongen står i sjakk, må gå over et angrepet felt, eller hvis kongen eller tårnet har flyttet før.' },
      ] },
      { id: 'en-passant', title: 'En passant', steps: [
        { t: 'info', fen: 'rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3', text: 'Svart flyttet akkurat bonden <b>to felt</b>, fra d7 til d5, rett ved siden av den hvite bonden. Da kan hvit slå den <b>en passant</b>, som om den bare hadde gått ett felt.', arrows: [{ from: 'e5', to: 'd6', color: G }], hl: { d5: 'bad' } },
        { t: 'puzzle', fen: 'rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3', moves: ['e5d6'], free: true, text: 'Slå bonden på d5 en passant.' },
        { t: 'choice', text: 'Når kan du slå en passant?', options: ['Bare rett etter at motstanderens bonde gikk to felt', 'Når som helst', 'Bare med dronningen'], answer: 0, explain: 'En passant må gjøres med en gang. Venter du ett trekk, er sjansen borte.' },
      ] },
    ],
  },
  {
    id: 'matt', name: 'Mattøya', desc: 'Lær de viktigste måtene å sette matt på.', color: 'linear-gradient(135deg,#b23a48,#6d1f2c)', boss: 'sara',
    lessons: [
      { id: 'baklinje', title: 'Baklinjematt', steps: [
        { t: 'info', fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', text: 'Kongen er sperret inne av sine egne bønder. Et tårn eller en dronning på bakerste rad gir <b>baklinjematt</b>.', arrows: [{ from: 'd1', to: 'd8', color: G }], hl: { f7: 'mark', g7: 'mark', h7: 'mark' } },
        { t: 'puzzle', fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', moves: ['d1d8'], text: 'Sett baklinjematt.' },
        { t: 'puzzle', fen: '1r4k1/5ppp/8/8/8/8/5PPP/1Q4K1 w - - 0 1', moves: ['b1b8'], text: 'Sett matt i ett trekk.' },
        { t: 'info', text: 'Tips: Pass på din egen baklinje også! Et lite «luftehull» med h-bonden (h3) kan redde kongen.' },
        { t: 'practice', theme: 'mattI1', count: 3, text: 'Øv på matt i ett trekk.' },
      ] },
      { id: 'kysset', title: 'Dronningkysset', steps: [
        { t: 'info', fen: 'k7/1Q6/1K6/8/8/8/8/8 b - - 0 1', text: 'Dronningen setter matt rett ved siden av kongen når den er <b>beskyttet</b> av en annen brikke. Her beskytter den hvite kongen dronningen.', hl: { b7: 'good', b6: 'mark' } },
        { t: 'puzzle', fen: 'k7/7Q/1K6/8/8/8/8/8 w - - 0 1', moves: ['h7b7'], text: 'Sett matt i ett trekk. Det finnes flere måter!' },
        { t: 'puzzle', fen: '6k1/8/6K1/8/8/8/8/Q7 w - - 0 1', moves: ['a1a8'], text: 'Sett matt i ett trekk.' },
      ] },
      { id: 'trappematt', title: 'Trappematt med to tårn', steps: [
        { t: 'info', fen: '4k3/R7/1R6/8/8/8/8/6K1 w - - 0 1', text: 'To tårn kan sette matt alene. Det ene sperrer en rad, det andre gir sjakk på neste. Som å gå i en <b>trapp</b>.', arrows: [{ from: 'b6', to: 'b8', color: G }], hl: { a7: 'mark' } },
        { t: 'play', fen: '4k3/8/8/8/8/8/R7/1R4K1 w - - 0 1', goal: 'mate', maxMoves: 10, text: 'Sett matt med de to tårnene. Du har 10 trekk.' },
        { t: 'play', fen: '8/8/8/3k4/8/8/6K1/R6R w - - 0 1', goal: 'mate', maxMoves: 12, text: 'Kongen står midt på brettet. Skyv den mot kanten med trappen.' },
      ] },
      { id: 'dronningmatt', title: 'Dronningmatt', steps: [
        { t: 'info', fen: '8/8/3k4/8/8/8/8/4K2Q w - - 0 1', text: 'Med dronning og konge kan du alltid sette matt. Planen: <b>1)</b> skyv kongen mot kanten med dronningen, <b>2)</b> hent din egen konge, <b>3)</b> sett matt. <b>Pass på patt!</b> La alltid motstanderen ha et trekk.' },
        { t: 'play', fen: '8/8/3k4/8/8/8/8/4K2Q w - - 0 1', goal: 'mate', maxMoves: 25, text: 'Sett matt med dronning og konge. Du har 25 trekk.' },
      ] },
      { id: 'taarnmatt', title: 'Tårnmatt', steps: [
        { t: 'info', fen: '4k3/8/4K3/8/8/8/8/R7 w - - 0 1', text: 'Med tårn og konge må kongene stå <b>rett overfor hverandre</b>. Da gir tårnet matt på kanten.', arrows: [{ from: 'a1', to: 'a8', color: G }] },
        { t: 'puzzle', fen: '4k3/8/4K3/8/8/8/8/R7 w - - 0 1', moves: ['a1a8'], text: 'Sett matt.' },
        { t: 'play', fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1', goal: 'mate', maxMoves: 35, text: 'Sett matt med tårn og konge. Bruk tårnet til å sperre, og kongen til å presse. Du har 35 trekk.' },
      ] },
      { id: 'matt2', title: 'Matt i to', steps: [
        { t: 'info', text: 'Nå blir det vanskeligere: Du trenger <b>to trekk</b> for å sette matt. Se etter sjakker først, så slag, så trusler.' },
        { t: 'practice', theme: 'mattI2', count: 4, text: 'Finn matt i to.' },
      ] },
    ],
  },
  {
    id: 'taktikk', name: 'Taktikkøya', desc: 'Gafler, bindinger og andre triks som vinner brikker.', color: 'linear-gradient(135deg,#3b6fd8,#22408a)', boss: 'lars',
    lessons: [
      { id: 'henger', title: 'Brikker som henger', steps: [
        { t: 'info', fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5', text: 'En brikke <b>henger</b> når den kan slås og ingen beskytter den. Før hvert trekk: sjekk om motstanderen har en brikke som henger, og om dine egne henger.' },
        { t: 'choice', fen: 'rnbqkbnr/ppp2ppp/8/3pp3/4P3/5N2/PPPPBPPP/RNBQK2R w KQkq - 0 3', text: 'Hvit i trekket. Hvilken svart brikke kan hvit slå gratis?', options: ['Bonden på e5', 'Bonden på d5', 'Ingen'], answer: 0, explain: 'Springeren på f3 kan slå e5, og ingen svart brikke beskytter den. (d5 er beskyttet av dronningen.)' },
        { t: 'practice', theme: 'henger', count: 4, text: 'Finn brikken som henger, og slå den.' },
      ] },
      { id: 'gaffel', title: 'Gaffel', steps: [
        { t: 'info', fen: 'r3k3/2N5/8/8/8/8/8/4K3 b - - 0 1', text: 'En <b>gaffel</b> er når én brikke angriper to brikker samtidig. Motstanderen kan bare redde én av dem. Springeren er den beste gaffelbrikken.', arrows: [{ from: 'c7', to: 'e8', color: R }, { from: 'c7', to: 'a8', color: R }] },
        { t: 'puzzle', fen: 'r3k3/8/8/1N6/8/8/7P/4K3 w - - 0 1', moves: ['b5c7', 'e8d7', 'c7a8'], text: 'Finn springergaffelen og vinn tårnet.' },
        { t: 'puzzle', fen: 'r3k3/8/8/8/8/8/5PPP/1Q4K1 w - - 0 1', moves: ['b1e4', 'e8f8', 'e4a8'], text: 'Dronningen kan også lage gafler. Gi sjakk og angrip tårnet samtidig.' },
        { t: 'practice', theme: 'gaffel', count: 3, text: 'Finn gaffelen.' },
      ] },
      { id: 'binding', title: 'Binding', steps: [
        { t: 'info', fen: 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3', text: 'En brikke er <b>bundet</b> når den ikke kan flytte uten at noe viktigere bak den blir slått. Her er springeren på c6 bundet til kongen.', arrows: [{ from: 'b5', to: 'e8', color: R }], hl: { c6: 'mark' } },
        { t: 'puzzle', fen: '4k3/pp6/3p4/4n3/8/8/5PPP/4R1K1 w - - 0 1', moves: ['f2f4'], text: 'Springeren på e5 er bundet til kongen av tårnet. Angrip den med noe som er mindre verdt!' },
        { t: 'puzzle', fen: '4k3/3q4/8/8/P7/8/5PPP/4KB2 w - - 0 1', moves: ['f1b5', 'e8d8', 'b5d7'], text: 'Bind dronningen til kongen, og vinn den.' },
      ] },
      { id: 'spidd', title: 'Spidd', steps: [
        { t: 'info', fen: '3q4/8/8/3k4/8/8/8/3RK3 b - - 0 1', text: 'Et <b>spidd</b> er en binding «baklengs»: du angriper en verdifull brikke, og når den flytter, slår du brikken bak.', arrows: [{ from: 'd1', to: 'd8', color: R }] },
        { t: 'puzzle', fen: '3q4/8/8/3k4/8/8/8/R3K3 w - - 0 1', moves: ['a1d1', 'd5e5', 'd1d8'], text: 'Gi sjakk slik at du vinner dronningen.' },
      ] },
      { id: 'avdekket', title: 'Avdekket angrep', steps: [
        { t: 'info', fen: '4k3/8/8/2q5/4N3/8/8/4RK2 w - - 0 1', text: 'Når en brikke flytter seg og <b>åpner linjen</b> for en annen brikke, får du et avdekket angrep. Her: når springeren flytter, gir tårnet sjakk.', arrows: [{ from: 'e1', to: 'e8', color: R }, { from: 'e4', to: 'c5', color: G }] },
        { t: 'puzzle', fen: '4k3/8/8/2q5/4N3/8/8/4RK2 w - - 0 1', moves: ['e4c5'], text: 'Vinn dronningen med avdekket sjakk.' },
      ] },
      { id: 'taktikkmix', title: 'Bland alt', steps: [
        { t: 'info', text: 'Nå blander vi alt: gafler, bindinger, brikker som henger og matt. Se etter <b>sjakker, slag og trusler</b>, i den rekkefølgen.' },
        { t: 'practice', theme: 'alle', count: 6, text: 'Finn det beste trekket.' },
      ] },
    ],
  },
  {
    id: 'aapning', name: 'Åpningsøya', desc: 'Hvordan du starter partiet godt.', color: 'linear-gradient(135deg,#c98a1a,#7a4f00)', boss: 'tora',
    lessons: [
      { id: 'gylne', title: 'Tre gylne regler', steps: [
        { t: 'info', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', text: 'Tre gylne regler i åpningen: <b>1)</b> ta kontroll over sentrum, <b>2)</b> få ut springere og løpere, <b>3)</b> rokér tidlig.', arrows: [{ from: 'e2', to: 'e4', color: G }, { from: 'g1', to: 'f3', color: G }, { from: 'f1', to: 'c4', color: G }], hl: { d4: 'mark', e4: 'mark', d5: 'mark', e5: 'mark' } },
        { t: 'choice', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', text: 'Hvilket første trekk følger reglene best?', options: ['e4', 'h4', 'Springer til a3'], answer: 0, explain: 'e4 tar sentrum og åpner veien for løperen og dronningen.' },
        { t: 'choice', text: 'Hvorfor er det lurt å rokere tidlig?', options: ['Kongen blir trygg, og tårnet kommer i spill', 'Du vinner en bonde', 'Det er påbudt'], answer: 0, explain: 'Kongen i midten er lett å angripe. Etter rokade står den trygt, og tårnet kan brukes.' },
        { t: 'choice', text: 'Hva er problemet med å flytte dronningen ut veldig tidlig?', options: ['Den blir jaget av mindre brikker, og du taper tid', 'Dronningen kan ikke gå tilbake', 'Det er ulovlig'], answer: 0, explain: 'Motstanderen utvikler brikkene sine mens han jager dronningen din. Da kommer han foran.' },
      ] },
      { id: 'skolematt', title: 'Skolematt', steps: [
        { t: 'info', fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3', text: 'Dette er <b>skolematt-fella</b>. Dronningen og løperen sikter begge mot f7, som bare kongen beskytter.', arrows: [{ from: 'h5', to: 'f7', color: R }, { from: 'c4', to: 'f7', color: R }] },
        { t: 'choice', fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3', text: 'Svart i trekket. Hva bør svart spille?', options: ['Springer til f6 (angriper dronningen)', 'g6 eller dronning til e7', 'a6'], answer: 1, explain: 'Springer til f6 taper med en gang: dronningen slår på f7, matt. g6 jager dronningen, og De7 forsvarer f7.' },
        { t: 'puzzle', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', moves: ['h5f7'], text: 'Svart forsvarte seg ikke. Sett matt!' },
      ] },
      { id: 'italiensk', title: 'Italiensk parti', steps: [
        { t: 'info', fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', text: '<b>Italiensk parti</b> er en åpning som følger alle de gylne reglene: e4, springer til f3, løper til c4 og rokade.' },
        { t: 'puzzle', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', moves: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5', 'e1g1'], free: true, text: 'Spill italiensk: e4, springer til f3, løper til c4, og rokér kort.' },
      ] },
      { id: 'utvikling', title: 'Utvikling', steps: [
        { t: 'info', fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 6 5', text: 'Å <b>utvikle</b> betyr å få brikkene ut fra startfeltene. Flytt helst hver brikke bare én gang i åpningen.' },
        { t: 'choice', fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 6 5', text: 'Hvit i trekket. Hva er det beste neste steget?', options: ['Rokér kort', 'Flytt løperen fra c4 igjen', 'Flytt a-bonden'], answer: 0, explain: 'Springerne og løperen er ute. Nå er det tid for å sette kongen i sikkerhet.' },
      ] },
    ],
  },
  {
    id: 'sluttspill', name: 'Sluttspilløya', desc: 'Vinn når det er få brikker igjen.', color: 'linear-gradient(135deg,#6a4bd8,#3a2685)', boss: 'dina',
    lessons: [
      { id: 'fribonde', title: 'Løp, bonde, løp!', steps: [
        { t: 'info', fen: '8/8/8/8/8/k7/6P1/6K1 w - - 0 1', text: 'I sluttspillet er bøndene supersterke. En bonde som ingen kan stoppe, blir til en dronning.' },
        { t: 'play', fen: '8/8/8/8/8/k7/6P1/6K1 w - - 0 1', goal: 'promote', maxMoves: 8, text: 'Forvandle bonden til dronning uten at svart får slått den.' },
      ] },
      { id: 'kvadrat', title: 'Kvadratregelen', steps: [
        { t: 'info', fen: '8/8/8/8/P7/8/8/6k1 w - - 0 1', text: 'Tegn et <b>kvadrat</b> fra bonden til siste rad. Kommer kongen inn i kvadratet når det er dens tur, rekker den å stoppe bonden.', hl: { a4: 'mark', b4: 'mark', c4: 'mark', d4: 'mark', e4: 'mark', a8: 'mark', b8: 'mark', c8: 'mark', d8: 'mark', e8: 'mark', a5: 'mark', a6: 'mark', a7: 'mark', e5: 'mark', e6: 'mark', e7: 'mark' } },
        { t: 'choice', fen: '8/8/8/8/P7/8/8/6k1 w - - 0 1', text: 'Hvit i trekket. Rekker den svarte kongen å stoppe bonden?', options: ['Ja', 'Nei'], answer: 1, explain: 'Etter a5 er kvadratet a5–d5–d8–a8. Kongen på g1 kommer ikke inn i det.' },
        { t: 'choice', fen: '8/8/8/8/P3k3/8/8/K7 w - - 0 1', text: 'Hvit i trekket. Rekker kongen å stoppe bonden nå?', options: ['Ja', 'Nei'], answer: 0, explain: 'Etter a5 går kongen til d5 og er inne i kvadratet. Den rekker det.' },
      ] },
      { id: 'opposisjon', title: 'Konge og bonde', steps: [
        { t: 'info', fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1', text: 'Med konge og bonde mot konge: Få kongen din <b>foran</b> bonden. Står kongen på 6. rad foran bonden, vinner du alltid.' },
        { t: 'play', fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1', goal: 'promote', maxMoves: 15, text: 'Forvandle bonden til dronning uten at den blir slått.' },
      ] },
      { id: 'taarnbak', title: 'Tårnet bak bonden', steps: [
        { t: 'info', fen: '8/5k2/8/P7/8/8/8/R5K1 w - - 0 1', text: 'Har du en fribonde, bør tårnet stå <b>bak</b> bonden. Da blir tårnet sterkere for hvert steg bonden tar.', arrows: [{ from: 'a1', to: 'a5', color: G }, { from: 'a5', to: 'a8', color: Y }] },
        { t: 'play', fen: '8/5k2/8/P7/8/8/8/R5K1 w - - 0 1', goal: 'promote', maxMoves: 12, text: 'Forvandle a-bonden uten å miste den.' },
      ] },
    ],
  },
];

export const ALL_LESSONS = ISLANDS.flatMap((i) => i.lessons.map((l) => ({ ...l, island: i.id })));
