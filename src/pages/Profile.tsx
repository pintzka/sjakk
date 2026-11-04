import { useState } from 'preact/hooks';
import { useProgress, update, BADGES, BOARD_THEMES, levelFromXp, resetProgress, exportCode, importCode, applyTheme } from '../lib/store';
import { useAccount } from '../lib/account';
import { botById } from '../engine/bots';
import { TopBar, XpBar, Modal } from '../ui';

export function Profile() {
  const s = useProgress();
  const acc = useAccount();
  const lvl = levelFromXp(s.xp);
  const [confirm, setConfirm] = useState(false);
  const [transfer, setTransfer] = useState(false);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const set = (fn: (st: typeof s) => void) => update(fn);
  const wins = Object.values(s.bots).reduce((a, b) => a + b.w, 0);
  return (
    <div>
      <TopBar title="Meg" />
      <div class="card">
        <div class="row"><div class="grow"><h2 style={{ margin: 0 }}>{s.name || acc?.name || 'Sjakkspiller'}</h2><div class="small muted">{acc ? `Logget inn som ${acc.name}` : 'Ikke logget inn'}</div></div><a class="btn secondary small" href="#/konto">{acc ? 'Konto' : 'Logg inn'}</a></div>
        <div style={{ marginTop: '10px' }}><XpBar /></div>
      </div>
      <div class="grid2" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <Stat label="Oppgaverating" value={Math.round(s.puzzleRating)} />
        <Stat label="Spillrating" value={Math.round(s.playRating)} />
        <Stat label="Beste streak" value={s.streak.best} />
        <Stat label="Oppgaver løst" value={s.puzzles.solved} />
        <Stat label="Seire" value={wins} />
        <Stat label="Leksjoner" value={Object.keys(s.lessons).length} />
      </div>
      <div class="card"><h3>Ratingen din</h3><RatingChart data={s.ratingHistory} /></div>
      <div class="card">
        <h3>Merker ({Object.keys(s.badges).length}/{BADGES.length})</h3>
        <div class="badges">
          {BADGES.map((b) => (
            <div key={b.id} class={`badge ${s.badges[b.id] ? '' : 'off'}`} title={b.desc}>
              <svg viewBox="0 0 48 48"><path d="M24 3l17 7v12c0 11-7.5 19-17 23C14.5 41 7 33 7 22V10z" fill={b.color} /><path d="M24 14l2.9 6.2 6.8.8-5 4.6 1.3 6.7L24 29l-6 3.3 1.3-6.7-5-4.6 6.8-.8z" fill="#fbf9f4" /></svg>
              {b.name}<div class="muted" style={{ fontWeight: 400 }}>{b.desc}</div>
            </div>
          ))}
        </div>
      </div>
      {s.games.length > 0 && (
        <div class="card">
          <h3>Siste partier</h3>
          {s.games.slice(0, 8).map((g, i) => (
            <div key={i} class="row small" style={{ padding: '4px 0' }}>
              <span class="grow">{g.bot === 'venn' ? 'Mot venn' : `Mot ${botById(g.bot).name}`} · {g.moves} halvtrekk</span>
              <b style={{ color: g.result === 'win' ? 'var(--good)' : g.result === 'loss' ? 'var(--bad)' : 'var(--muted)' }}>{g.result === 'win' ? 'Seier' : g.result === 'loss' ? 'Tap' : 'Remis'}</b>
            </div>
          ))}
        </div>
      )}
      <div class="card">
        <h3>Innstillinger</h3>
        <label class="toggle"><span>Lyd</span><input type="checkbox" checked={s.settings.sound} onChange={(e) => set((st) => { st.settings.sound = (e.target as HTMLInputElement).checked; })} /></label>
        <label class="toggle"><span>Vis hvor brikkene kan gå</span><input type="checkbox" checked={s.settings.showDests} onChange={(e) => set((st) => { st.settings.showDests = (e.target as HTMLInputElement).checked; })} /></label>
        <label class="toggle"><span>Stillingsmåler i partier mot data</span><input type="checkbox" checked={s.settings.evalBar !== false} onChange={(e) => set((st) => { st.settings.evalBar = (e.target as HTMLInputElement).checked; })} /></label>
        <label class="toggle"><span>Mørkt tema</span><input type="checkbox" checked={s.settings.theme === 'dark'} onChange={(e) => { set((st) => { st.settings.theme = (e.target as HTMLInputElement).checked ? 'dark' : 'light'; }); applyTheme(); }} /></label>
        <div class="small muted" style={{ margin: '8px 0 4px' }}>Brettfarger (flere låses opp med nivå)</div>
        <div class="tabs" style={{ flexWrap: 'wrap' }}>
          {BOARD_THEMES.map((t) => {
            const open = lvl >= t.level;
            return <button key={t.id} class={`tab ${s.settings.boardTheme === t.id ? 'on' : ''}`} disabled={!open} style={{ opacity: open ? 1 : 0.4 }} onClick={() => set((st) => { st.settings.boardTheme = t.id; })}>{t.name}{!open && ` (nivå ${t.level})`}</button>;
          })}
        </div>
      </div>
      <div class="card">
        <h3>Fremgang</h3>
        {!acc && <p class="small muted">Uten bruker lagres fremgangen bare på denne enheten. Du kan flytte den med en kode.</p>}
        <div class="btnrow">
          <button class="btn secondary small" onClick={() => { update((st) => { st.placementDone = false; }); location.hash = '#/'; }}>Ta nivåtesten på nytt</button>
          <button class="btn secondary small" onClick={() => { setTransfer(true); setCode(''); setMsg(''); }}>Flytt med kode</button>
          <button class="btn secondary small" onClick={() => setConfirm(true)}>Start helt på nytt</button>
        </div>
      </div>
      <p class="small muted center">Rokade er åpen kildekode (GPL-3). Sjakkmotoren er <a href="https://stockfishchess.org" target="_blank" rel="noopener">Stockfish</a> (GPL-3). Brikker, figurer, lyder og oppgaver er laget for denne siden.</p>
      {confirm && (
        <Modal onClose={() => setConfirm(false)}>
          <h2>Starte på nytt?</h2><p class="muted">All fremgang på denne enheten blir slettet.</p>
          <div class="btnrow"><button class="btn secondary" onClick={() => setConfirm(false)}>Avbryt</button><button class="btn bad" onClick={() => { resetProgress(); setConfirm(false); location.hash = '#/'; }}>Slett</button></div>
        </Modal>
      )}
      {transfer && (
        <Modal onClose={() => setTransfer(false)}>
          <h2>Flytt fremgang</h2>
          <p class="small muted">Kopier koden og lim den inn på den andre enheten.</p>
          <textarea rows={3} readOnly value={exportCode()} onFocus={(e) => (e.target as HTMLTextAreaElement).select()} />
          <p class="small muted" style={{ marginTop: '10px' }}>Eller lim inn en kode her:</p>
          <textarea rows={3} value={code} onInput={(e) => setCode((e.target as HTMLTextAreaElement).value)} />
          {msg && <div class="status info">{msg}</div>}
          <div class="btnrow" style={{ marginTop: '8px' }}><button class="btn" disabled={!code} onClick={() => setMsg(importCode(code) ? 'Fremgangen er hentet!' : 'Koden virker ikke.')}>Hent</button><button class="btn secondary" onClick={() => setTransfer(false)}>Lukk</button></div>
        </Modal>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div class="card center" style={{ padding: '10px 6px' }}><div class="bignum">{value}</div><div class="label" style={{ fontSize: '.62rem' }}>{label}</div></div>;
}

export function RatingChart({ data }: { data: { d: string; puzzle: number; play: number }[] }) {
  if (data.length < 2) return <p class="small muted">Grafen kommer når du har øvd noen dager.</p>;
  const W = 320, H = 150, P = 28;
  const vals = data.flatMap((d) => [d.puzzle, d.play]);
  const min = Math.floor((Math.min(...vals) - 30) / 50) * 50, max = Math.ceil((Math.max(...vals) + 30) / 50) * 50;
  const x = (i: number) => P + (i / (data.length - 1)) * (W - P - 8);
  const y = (v: number) => H - 18 - ((v - min) / (max - min)) * (H - 30);
  const line = (k: 'puzzle' | 'play') => data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d[k]).toFixed(1)}`).join(' ');
  const ticks = [min, Math.round((min + max) / 2), max];
  return (
    <svg class="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Ratingutvikling">
      {ticks.map((t) => <g key={t}><line x1={P} x2={W - 8} y1={y(t)} y2={y(t)} stroke="var(--line)" /><text x={P - 4} y={y(t) + 4} font-size="10" text-anchor="end" fill="var(--muted)">{t}</text></g>)}
      <path d={line('puzzle')} fill="none" stroke="#2c5d8a" stroke-width="2.5" stroke-linejoin="round" />
      <path d={line('play')} fill="none" stroke="#b9800f" stroke-width="2.5" stroke-linejoin="round" />
      <text x={P} y={H - 3} font-size="10" fill="var(--muted)">{data[0].d.slice(5)}</text>
      <text x={W - 8} y={H - 3} font-size="10" text-anchor="end" fill="var(--muted)">{data[data.length - 1].d.slice(5)}</text>
      <text x={W - 8} y={y(data[data.length - 1].puzzle) - 6} font-size="10" text-anchor="end" fill="#2c5d8a">Oppgaver</text>
      <text x={W - 8} y={y(data[data.length - 1].play) + 14} font-size="10" text-anchor="end" fill="#b9800f">Spill</text>
    </svg>
  );
}
