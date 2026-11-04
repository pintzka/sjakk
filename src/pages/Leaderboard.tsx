// Tabell over alle brukere: ukens poeng, totale poeng, nivå, ratinger og lynrunde.
import { useEffect, useState } from 'preact/hooks';
import { api, useAccount } from '../lib/account';
import { useProgress, levelFromXp, weekId, weekPoints, today } from '../lib/store';
import { TopBar, Flame } from '../ui';

interface Row { id: number; name: string; created: number; xp: number; puzzle: number; play: number; active: number; week: string | null; weekPts: number; total: number; rush: number; streak: number; streakDay: string | null; games: number }

const TABS = [
  { id: 'uke', label: 'Denne uka', val: (r: Row) => (r.week === weekId() ? r.weekPts : 0), unit: 'poeng' },
  { id: 'total', label: 'Totalt', val: (r: Row) => r.total, unit: 'poeng' },
  { id: 'xp', label: 'Nivå', val: (r: Row) => r.xp, unit: 'XP' },
  { id: 'oppg', label: 'Oppgaverating', val: (r: Row) => Math.round(r.puzzle), unit: '' },
  { id: 'spill', label: 'Spillrating', val: (r: Row) => Math.round(r.play), unit: '' },
  { id: 'lyn', label: 'Lynrunde', val: (r: Row) => r.rush, unit: 'løst' },
] as const;

function ago(ms: number) {
  if (!ms) return 'aldri';
  const d = Math.floor((Date.now() - ms) / 86400000);
  return d <= 0 ? 'i dag' : d === 1 ? 'i går' : `for ${d} dager siden`;
}
// Streaken teller bare hvis man har øvd i dag eller i går
function liveStreak(r: Row) {
  if (!r.streakDay) return 0;
  const diff = Math.round((Date.parse(today()) - Date.parse(r.streakDay)) / 86400000);
  return diff <= 1 ? r.streak : 0;
}

export function Leaderboard() {
  const s = useProgress();
  const acc = useAccount();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('uke');
  useEffect(() => { if (acc) api<{ users: Row[] }>('users').then((r) => setRows(r.users)).catch((e) => setErr(e.message)); }, [acc?.token]);
  const t = TABS.find((x) => x.id === tab)!;
  const sorted = rows ? [...rows].sort((a, b) => t.val(b) - t.val(a)) : [];
  const wk = weekId().split('-W')[1];

  return (
    <div>
      <TopBar title="Tabell" />
      <div class="grid2 stats4">
        <div class="card center"><div class="bignum">{weekPoints(s)}</div><div class="label">Poeng uke {+wk}</div></div>
        <div class="card center"><div class="bignum">{s.score.total}</div><div class="label">Poeng totalt</div></div>
        <div class="card center"><div class="bignum">{levelFromXp(s.xp)}</div><div class="label">Nivå ({s.xp} XP)</div></div>
        <div class="card center"><div class="bignum">{s.rush.best}</div><div class="label">Beste lynrunde</div></div>
      </div>
      {!acc && (
        <div class="card"><h3>Logg inn for å se tabellen</h3><p class="muted small">Tabellen viser alle som har bruker, og hvem som har flest poeng denne uka.</p><a class="btn block" href="#/konto">Logg inn eller registrer deg</a></div>
      )}
      {acc && (
        <>
          <div class="tabs">{TABS.map((x) => <button key={x.id} class={`tab ${tab === x.id ? 'on' : ''}`} onClick={() => setTab(x.id)}>{x.label}</button>)}</div>
          {tab === 'uke' && <p class="small muted" style={{ marginTop: '-4px' }}>Ukens poeng starter på nytt hver mandag, så alle har en ny sjanse.</p>}
          {err && <div class="status bad">{err}</div>}
          {!rows && !err && <div class="card center muted">Laster...</div>}
          {rows && (
            <div class="card table-card">
              {sorted.map((r, i) => {
                const v = t.val(r);
                const st = liveStreak(r);
                return (
                  <div key={r.id} class={`lb-row ${r.id === acc.id ? 'me' : ''}`}>
                    <span class={`lb-rank ${i < 3 && v > 0 ? 'top' : ''}`}>{i + 1}</span>
                    <div class="grow">
                      <b>{r.name}</b>{r.id === acc.id && <span class="muted"> (deg)</span>}
                      <div class="small muted">Nivå {levelFromXp(r.xp)} · Oppgaver {Math.round(r.puzzle) || '–'} · Spill {Math.round(r.play) || '–'}{st > 0 && <> · <Flame size={13} /> {st}</>}</div>
                      <div class="small muted desktop-inline">Registrert {r.created ? new Date(r.created).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' }) : '–'} · Sist aktiv {ago(r.active)} · {r.games} vennepartier</div>
                    </div>
                    <div class="lb-val"><b>{v}</b>{t.unit && <span class="small muted"> {t.unit}</span>}</div>
                  </div>
                );
              })}
            </div>
          )}
          <a class="btn secondary block" href="#/venner">Utfordre en venn</a>
        </>
      )}
      <div class="card small" style={{ marginTop: '12px' }}>
        <div class="label" style={{ marginBottom: '6px' }}>Slik får du poeng</div>
        <div class="pts-grid">
          <span>Oppgave uten feil</span><b>rating / 100</b>
          <span>Oppgave med feil</span><b>1</b>
          <span>Leksjon</span><b>5 per stjerne</b>
          <span>Seier mot bot</span><b>bot-rating / 25</b>
          <span>Seier mot venn</span><b>30</b>
          <span>Lynrunde</span><b>2 per oppgave</b>
          <span>Dagens oppgave</span><b>+10</b>
          <span>Dagens mål</span><b>+15</b>
        </div>
        <p class="muted" style={{ margin: '8px 0 0' }}>Remis gir halvparten. Trekkforslag halverer poengene for partiet. XP gir nivå og teller alt du øver på. Poeng teller hvor godt du gjør det.</p>
      </div>
    </div>
  );
}
