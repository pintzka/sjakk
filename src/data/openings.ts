// Åpningstreneren: egne forklaringer på vanlige åpninger. Trekkene skrives på engelsk (SAN) slik chess.js vil ha dem,
// og vises på norsk (S = springer, L = løper, T = tårn, D = dronning, K = konge).
// Hvert trekk er [trekk, forklaring?]. Forklaringen vises når trekket spilles.
// Kjør tools/check-openings.mjs etter endringer: den sjekker at alle trekk er lovlige.

export type Step = [san: string, why?: string];
export interface OpeningLine { id: string; name: string; steps: Step[] }
export interface Opening {
  id: string;
  name: string;
  side: 'w' | 'b';
  level: 'Lett' | 'Middels';
  short: string;
  ideas: string[];
  lines: OpeningLine[];
}

export const OPENINGS: Opening[] = [
  {
    id: 'italiensk', name: 'Italiensk parti', side: 'w', level: 'Lett',
    short: 'Rask utvikling og løperen rett mot f7. En av de eldste og beste åpningene for nybegynnere.',
    ideas: [
      'Ta midten med e-bonden og få springer og løper ut fort.',
      'Løperen på c4 sikter mot f7, det svakeste feltet hos svart.',
      'Rokér tidlig, så kongen er trygg og tårnet kommer i spill.',
      'Bonden til c3 forbereder d4 senere.',
    ],
    lines: [
      {
        id: 'hoved', name: 'Hovedvarianten (Giuoco piano)', steps: [
          ['e4', 'Bonden tar midten og åpner veien for både løperen og dronningen.'],
          ['e5', 'Svart gjør det samme og tar sin del av midten.'],
          ['Nf3', 'Springeren kommer ut og angriper bonden på e5 med en gang.'],
          ['Nc6', 'Svart dekker bonden med springeren.'],
          ['Bc4', 'Løperen går til c4 og sikter mot f7, feltet bare kongen passer på.'],
          ['Bc5', 'Svart setter løperen sin på samme type felt og sikter mot f2.'],
          ['c3', 'Forbereder d4, så du kan ta enda mer av midten senere. Feltet d4 tas også fra springeren på c6.'],
          ['Nf6', 'Svart får ut neste springer og angriper e4.'],
          ['d3', 'Rolig og solid: dekker e4 og åpner for løperen på c1.'],
          ['d6', 'Svart dekker e5 og åpner for sin egen løper.'],
          ['O-O', 'Rokade! Kongen blir trygg, og tårnet kommer nærmere midten.'],
          ['O-O', 'Svart rokerer også.'],
          ['Re1', 'Tårnet står bra på e-linjen og passer på e4. Nå er alle brikkene klare til midtspillet.'],
        ],
      },
      {
        id: 'toSpringere', name: 'Svart spiller 3...Sf6', steps: [
          ['e4', 'Ta midten.'],
          ['e5'],
          ['Nf3', 'Utvikle og angrip e5.'],
          ['Nc6'],
          ['Bc4', 'Løperen mot f7.'],
          ['Nf6', 'Svart angriper e4 i stedet for å sette ut løperen. Dette heter tospringerforsvaret.'],
          ['d3', 'Dekk e4 rolig. Det finnes skarpere trekk, men d3 er trygt og godt.'],
          ['Be7', 'Svart setter løperen hjem og gjør klar for rokade.'],
          ['O-O', 'Rokér først, angrip etterpå.'],
          ['O-O'],
          ['Re1', 'Tårnet til e-linjen dekker e4 og forbereder d4 senere.'],
          ['d6'],
          ['c3', 'Samme plan som i hovedvarianten: c3 og senere d4.'],
        ],
      },
      {
        id: 'felle', name: 'Felle: svart passer ikke på f7', steps: [
          ['e4', 'Ta midten.'],
          ['e5'],
          ['Nf3'],
          ['Nc6'],
          ['Bc4', 'Løperen mot f7.'],
          ['Nd4', 'Svart flytter springeren igjen i stedet for å utvikle. Ser fristende ut å slå e5, men pass på!'],
          ['c3', 'Jag springeren bort. Slår du på e5 med springeren, kommer svart med ...Dg5 og angriper både springeren og g2.'],
          ['Nxf3+', 'Svart bytter av.'],
          ['Qxf3', 'Dronningen slår tilbake, og nå er både dronningen og løperen rettet mot f7.'],
          ['d6', 'Svart vil åpne for løperen, men glemmer f7.'],
          ['Qxf7#', 'Matt! Dronningen er dekket av løperen på c4, og kongen har ingen felt å flykte til. Husk: f7 er det svake feltet.'],
        ],
      },
    ],
  },
  {
    id: 'london', name: 'Londonsystemet', side: 'w', level: 'Lett',
    short: 'Samme oppsett nesten uansett hva svart gjør. Lett å lære og vanskelig å knuse.',
    ideas: [
      'd4, Lf4, e3, Sf3, c3 og Sbd2: samme oppsett hver gang.',
      'Løperen kommer ut til f4 før du spiller e3, ellers blir den stengt inne.',
      'Bonden på c3 og e3 gjør d4-bonden bunnsolid.',
      'Senere kan du angripe på kongesiden med Se5 og f4 eller g4.',
    ],
    lines: [
      {
        id: 'hoved', name: 'Mot 1...d5', steps: [
          ['d4', 'Dronningbonden tar midten. Den er dekket av dronningen fra start.'],
          ['d5', 'Svart stopper bonden.'],
          ['Bf4', 'Løperen ut FØR e3. Det er hele poenget med Londonsystemet.'],
          ['Nf6'],
          ['e3', 'Nå åpner du for den andre løperen og gjør d4 sterk.'],
          ['e6'],
          ['Nf3', 'Springeren ut mot midten.'],
          ['c5', 'Svart angriper d4 fra siden.'],
          ['c3', 'Dekk d4 med en bonde. Nå står bondekjeden c3–d4–e3 stødig.'],
          ['Nc6'],
          ['Nbd2', 'Springeren går til d2, ikke c3, fordi c3 er opptatt av bonden.'],
          ['Bd6', 'Svart vil bytte av den gode løperen din på f4.'],
          ['Bg3', 'Behold løperen! Slår svart på g3, åpner du h-linjen for tårnet ditt.'],
          ['O-O'],
          ['Bd3', 'Siste løper ut, sikter mot kongen til svart. Neste er rokade.'],
        ],
      },
      {
        id: 'kongeindisk', name: 'Mot 1...Sf6 og ...g6', steps: [
          ['d4', 'Ta midten.'],
          ['Nf6'],
          ['Bf4', 'Samme oppsett: løperen ut først.'],
          ['g6', 'Svart vil sette løperen på g7 (fianchetto).'],
          ['e3'],
          ['Bg7'],
          ['Nf3'],
          ['O-O'],
          ['Be2', 'Mot g7-løperen er det lurt å stå solid. Løperen på e2 holder springeren på f3 trygg.'],
          ['d6'],
          ['O-O', 'Rokér, og bestem planen senere. Ofte kommer h3 og c3 snart.'],
        ],
      },
      {
        id: 'db6', name: 'Når svart angriper b2', steps: [
          ['d4'],
          ['d5'],
          ['Bf4'],
          ['c5', 'Svart angriper midten tidlig.'],
          ['e3'],
          ['Nc6'],
          ['c3', 'Dekk d4.'],
          ['Qb6', 'Dronningen angriper b2, som løperen din har forlatt.'],
          ['Qb3', 'Svar med dronningen: den dekker b2 og tilbyr bytte. Byttes dronningene, blir a-linjen åpen for tårnet ditt.'],
        ],
      },
    ],
  },
  {
    id: 'dronninggambit', name: 'Dronninggambit', side: 'w', level: 'Middels',
    short: 'Du tilbyr c-bonden for å trekke svarts d-bonde bort fra midten. Spilt i verdensmesterskap i over hundre år.',
    ideas: [
      'c4 angriper d5 fra siden. Det er ikke et ekte offer: du får som regel bonden tilbake.',
      'Får du byttet bort d5-bonden, kan du ta hele midten med e4.',
      'Springerne til c3 og f3, løperen til g5 for å presse f6-springeren.',
    ],
    lines: [
      {
        id: 'avslatt', name: 'Avslått (2...e6)', steps: [
          ['d4', 'Ta midten.'],
          ['d5'],
          ['c4', 'Gambiten: c-bonden angriper d5.'],
          ['e6', 'Svart sier nei takk og dekker d5 med en bonde.'],
          ['Nc3', 'Mer press på d5.'],
          ['Nf6', 'Svart dekker d5 igjen.'],
          ['Bg5', 'Løperen binder springeren på f6, som er en av forsvarerne til d5.'],
          ['Be7', 'Svart løser bindingen.'],
          ['e3', 'Åpner for den andre løperen og dekker d4 og c4.'],
          ['O-O'],
          ['Nf3', 'Siste springer ut.'],
          ['Nbd7'],
          ['Rc1', 'Tårnet til c-linjen, som ofte åpner seg i denne åpningen.'],
        ],
      },
      {
        id: 'antatt', name: 'Antatt (2...dxc4)', steps: [
          ['d4'],
          ['d5'],
          ['c4'],
          ['dxc4', 'Svart tar bonden, men gir fra seg midten.'],
          ['e3', 'Åpner for løperen, som kan slå tilbake på c4 neste trekk.'],
          ['Nf6'],
          ['Bxc4', 'Bonden er tilbake, og du har mer av midten.'],
          ['e6'],
          ['Nf3'],
          ['c5', 'Svart angriper d4.'],
          ['O-O', 'Rokér og la svart bestemme seg. Du står fint.'],
        ],
      },
      {
        id: 'slavisk', name: 'Slavisk (2...c6)', steps: [
          ['d4'],
          ['d5'],
          ['c4'],
          ['c6', 'Svart dekker d5 med c-bonden og holder løperen på c8 fri.'],
          ['Nf3', 'Utvikle.'],
          ['Nf6'],
          ['Nc3'],
          ['dxc4', 'Nå tar svart bonden og vil holde den med ...b5.'],
          ['a4', 'Stopper ...b5, så svart ikke kan holde på bonden.'],
          ['Bf5', 'Svart får ut løperen.'],
          ['e3', 'Åpner for løperen, som snart slår tilbake på c4.'],
        ],
      },
    ],
  },
  {
    id: 'spansk', name: 'Spansk parti', side: 'w', level: 'Middels',
    short: 'Løperen til b5 presser springeren som dekker e5. Favoritten til mange verdensmestere.',
    ideas: [
      'Lb5 angriper forsvareren av e5.',
      'Ikke slå på e5 for tidlig: e4 er ofte svak hvis du gjør det.',
      'Rokér, Te1, c3 og d4 er den vanlige planen.',
    ],
    lines: [
      {
        id: 'hoved', name: 'Hovedvarianten', steps: [
          ['e4', 'Ta midten.'],
          ['e5'],
          ['Nf3', 'Angrip e5.'],
          ['Nc6'],
          ['Bb5', 'Løperen presser springeren som dekker e5.'],
          ['a6', 'Svart spør løperen hva den vil.'],
          ['Ba4', 'Behold presset. Løperen kan trekke seg til b3 senere.'],
          ['Nf6', 'Svart angriper e4.'],
          ['O-O', 'Rokér! e4 er ikke i fare ennå: slår svart, kommer Te1 med kraft.'],
          ['Be7'],
          ['Re1', 'Nå dekker tårnet e4.'],
          ['b5', 'Svart jager løperen.'],
          ['Bb3', 'Løperen står fint på b3 og sikter fortsatt mot f7.'],
          ['d6'],
          ['c3', 'Gjør klar for d4.'],
          ['O-O'],
          ['h3', 'Lite, men viktig: stopper ...Lg4 som ville bundet springeren på f3. Neste plan er d4.'],
        ],
      },
      {
        id: 'avbytte', name: 'Avbyttevarianten', steps: [
          ['e4'],
          ['e5'],
          ['Nf3'],
          ['Nc6'],
          ['Bb5'],
          ['a6'],
          ['Bxc6', 'Bytt av! Svart får doble bønder og er litt svakere i sluttspillet.'],
          ['dxc6', 'Svart slår tilbake mot midten og åpner for løperen.'],
          ['O-O', 'Ikke slå på e5 ennå: ...Dd4 ville vunnet bonden tilbake. Rokér først.'],
          ['f6', 'Svart dekker e5 med en bonde.'],
          ['d4', 'Åpne midten nå som kongen er trygg.'],
        ],
      },
    ],
  },
  {
    id: 'skandinavisk', name: 'Skandinavisk', side: 'b', level: 'Lett',
    short: 'Svart angriper e4 med en gang. Enkle planer, og du bestemmer hva som skjer fra trekk én.',
    ideas: [
      '1...d5 går rett på e4-bonden.',
      'Dronningen slår tilbake på d5 og går til a5 når den blir jaget.',
      'Løperen ut til f5 eller g4 før du spiller ...e6.',
      'Bondene på c6 og e6 gjør stillingen solid.',
    ],
    lines: [
      {
        id: 'hoved', name: 'Hovedvarianten med ...Da5', steps: [
          ['e4'],
          ['d5', 'Angrip e4 med en gang.'],
          ['exd5', 'Hvit slår.'],
          ['Qxd5', 'Dronningen slår tilbake.'],
          ['Nc3', 'Hvit angriper dronningen og vinner tid.'],
          ['Qa5', 'Dronningen går til a5. Der er den trygg og binder springeren på c3.'],
          ['d4'],
          ['Nf6', 'Utvikle springeren.'],
          ['Nf3'],
          ['c6', 'Gir dronningen et sted å trekke seg til (c7) og stopper Sb5.'],
          ['Bc4'],
          ['Bf5', 'Løperen ut FØR ...e6, så den ikke blir stengt inne.'],
          ['Bd2', 'Hvit truer Sd5 og avdekket angrep på dronningen.'],
          ['e6', 'Nå er alt dekket. Neste er ...Lb4 eller ...Sbd7 og rokade.'],
        ],
      },
      {
        id: 'sf3', name: 'Hvit spiller 3.Sf3', steps: [
          ['e4'],
          ['d5', 'Angrip e4.'],
          ['exd5'],
          ['Qxd5'],
          ['Nf3', 'Hvit lar dronningen stå i fred.'],
          ['Bg4', 'Binder springeren til dronningen på d1.'],
          ['Be2'],
          ['Nc6', 'Utvikle og press d4-feltet.'],
          ['d4'],
          ['O-O-O', 'Lang rokade! Tårnet kommer rett mot d4, og kongen er trygg på c8.'],
        ],
      },
      {
        id: 'e5', name: 'Hvit går forbi med 2.e5', steps: [
          ['e4'],
          ['d5', 'Angrip e4.'],
          ['e5', 'Hvit slår ikke, men går forbi.'],
          ['Bf5', 'Løperen ut før bondekjeden stenger den inne.'],
          ['d4'],
          ['e6', 'Bygg en solid bondekjede.'],
          ['Nf3'],
          ['c5', 'Angrip basen av hvits bondekjede (d4). Slik spiller man mot en lang bondekjede.'],
        ],
      },
    ],
  },
  {
    id: 'carokann', name: 'Caro-Kann', side: 'b', level: 'Middels',
    short: 'Svart forbereder ...d5 med ...c6. Svært solid, med god løper på f5.',
    ideas: [
      '...c6 forbereder ...d5, så du kan slå tilbake med en bonde.',
      'Den lyse løperen kommer ut til f5 før ...e6.',
      'Mot e5 angriper du basen med ...c5.',
    ],
    lines: [
      {
        id: 'klassisk', name: 'Klassisk', steps: [
          ['e4'],
          ['c6', 'Forbereder ...d5.'],
          ['d4'],
          ['d5', 'Angrip e4. Slår hvit, slår du tilbake med c-bonden.'],
          ['Nc3', 'Hvit dekker e4.'],
          ['dxe4', 'Bytt i midten.'],
          ['Nxe4'],
          ['Bf5', 'Løperen ut og angriper springeren med en gang.'],
          ['Ng3', 'Springeren angriper løperen.'],
          ['Bg6', 'Løperen trekker seg, men står fortsatt aktivt.'],
          ['h4', 'Hvit truer h5 for å fange løperen.'],
          ['h6', 'Gir løperen fluktfeltet h7.'],
          ['Nf3'],
          ['Nd7', 'Springeren til d7 hindrer Se5 og gjør klar for ...Sgf6.'],
        ],
      },
      {
        id: 'fremstot', name: 'Fremstøt (3.e5)', steps: [
          ['e4'],
          ['c6'],
          ['d4'],
          ['d5'],
          ['e5', 'Hvit går forbi og tar plass.'],
          ['Bf5', 'Løperen ut før ...e6.'],
          ['Nf3'],
          ['e6', 'Solid bondekjede.'],
          ['Be2'],
          ['c5', 'Angrip basen d4. c-bonden går to ganger, men det er verdt det.'],
        ],
      },
      {
        id: 'avbytte', name: 'Avbytte (3.exd5)', steps: [
          ['e4'],
          ['c6'],
          ['d4'],
          ['d5'],
          ['exd5'],
          ['cxd5', 'Slå tilbake mot midten.'],
          ['Bd3'],
          ['Nc6', 'Utvikle og press d4.'],
          ['c3'],
          ['Nf6'],
          ['Bf4'],
          ['Bg4', 'Løperen ut og binder springeren hvis den kommer til f3.'],
        ],
      },
    ],
  },
  {
    id: 'mot-e4', name: 'Mot 1.e4: 1...e5', side: 'b', level: 'Lett',
    short: 'Det klassiske svaret. Lær å forsvare deg mot skolematt og å møte de vanligste angrepene.',
    ideas: [
      'Svar e4 med e5 og ta din del av midten.',
      'Springeren til c6 dekker e5. Springeren til f6 forsvarer kongen.',
      'Pass alltid på f7 i starten.',
    ],
    lines: [
      {
        id: 'italiensk', name: 'Mot Italiensk', steps: [
          ['e4'],
          ['e5', 'Ta midten.'],
          ['Nf3', 'Hvit angriper e5.'],
          ['Nc6', 'Dekk e5 og utvikle samtidig.'],
          ['Bc4'],
          ['Bc5', 'Løperen ut, sikter mot f2.'],
          ['c3'],
          ['Nf6', 'Angrip e4.'],
          ['d3'],
          ['d6', 'Dekk e5 og åpne for løperen på c8.'],
          ['O-O'],
          ['O-O', 'Kongen i sikkerhet.'],
        ],
      },
      {
        id: 'skotsk', name: 'Mot Skotsk (3.d4)', steps: [
          ['e4'],
          ['e5'],
          ['Nf3'],
          ['Nc6'],
          ['d4', 'Hvit åpner midten med en gang.'],
          ['exd4', 'Slå: ellers bytter hvit på e5.'],
          ['Nxd4'],
          ['Bc5', 'Angrip springeren på d4.'],
          ['Be3', 'Hvit dekker springeren.'],
          ['Qf6', 'Mer press på d4. Nå angriper du springeren tre ganger.'],
          ['c3', 'Hvit dekker med bonden.'],
          ['Nge7', 'Springeren til e7, ikke f6, der dronningen står. Neste er rokade.'],
        ],
      },
      {
        id: 'skolematt', name: 'Stopp skolematt', steps: [
          ['e4'],
          ['e5'],
          ['Qh5', 'Dronningen ut tidlig. Den truer både e5 og f7.'],
          ['Nc6', 'Dekk e5 med springeren.'],
          ['Bc4', 'Nå truer hvit Dxf7 matt!'],
          ['g6', 'Stopp dronningen og jag den bort.'],
          ['Qf3', 'Ny matttrussel mot f7.'],
          ['Nf6', 'Springeren stenger veien til f7.'],
          ['Qb3', 'Igjen mot f7.'],
          ['Qe7', 'Dronningen dekker f7. Nå har du flere brikker ute, og hvits dronning har brukt mange trekk.'],
        ],
      },
    ],
  },
  {
    id: 'mot-d4', name: 'Mot 1.d4: 1...d5', side: 'b', level: 'Middels',
    short: 'Solid svar mot dronningbonden. Svart bygger en trygg stilling og rokerer raskt.',
    ideas: [
      'Svar d4 med d5 og hold midten.',
      'Mot c4 dekker du med ...e6 (eller ...c6), ikke ved å slå.',
      'Springeren til f6, løperen til e7 og rask rokade.',
    ],
    lines: [
      {
        id: 'avslatt', name: 'Mot Dronninggambit', steps: [
          ['d4'],
          ['d5', 'Hold midten.'],
          ['c4', 'Hvit tilbyr c-bonden.'],
          ['e6', 'Dekk d5 med en bonde. Det er det sikreste.'],
          ['Nc3'],
          ['Nf6'],
          ['Bg5', 'Hvit binder springeren.'],
          ['Be7', 'Løs bindingen.'],
          ['e3'],
          ['O-O', 'Kongen i sikkerhet.'],
          ['Nf3'],
          ['h6', 'Spør løperen hva den vil.'],
          ['Bh4'],
          ['b6', 'Gjør klar for ...Lb7, som sikter mot hele diagonalen.'],
        ],
      },
      {
        id: 'london', name: 'Mot Londonsystemet', steps: [
          ['d4'],
          ['d5'],
          ['Bf4'],
          ['Nf6'],
          ['e3'],
          ['c5', 'Angrip d4 fra siden med en gang.'],
          ['c3'],
          ['Nc6', 'Mer press på d4.'],
          ['Nd2'],
          ['e6'],
          ['Ngf3'],
          ['Bd6', 'Bytt av den farlige løperen på f4.'],
        ],
      },
      {
        id: 'rolig', name: 'Mot rolig spill uten c4', steps: [
          ['d4'],
          ['d5'],
          ['Nf3'],
          ['Nf6'],
          ['e3'],
          ['e6', 'Åpne for løperen.'],
          ['Bd3'],
          ['c5', 'Ta plass og press d4.'],
          ['b3'],
          ['Nc6', 'Utvikle mot midten.'],
        ],
      },
    ],
  },
];

export const openingById = (id: string) => OPENINGS.find((o) => o.id === id);
export const lineKey = (o: Opening, l: OpeningLine) => `${o.id}/${l.id}`;

// Finn åpningsnavnet til et parti ut fra de første trekkene (lengste treff vinner)
export function nameOpening(sans: string[]): string | null {
  let best: { name: string; n: number } | null = null;
  for (const o of OPENINGS) for (const l of o.lines) {
    let n = 0;
    while (n < l.steps.length && n < sans.length && l.steps[n][0] === sans[n]) n++;
    if (n >= 3 && (!best || n > best.n)) best = { name: o.name, n };
  }
  return best?.name ?? null;
}
