// Stillingsmåler: viser hvem som leder, fra −3 til +3 (og videre, eller M5 for matt i 5).
// Stockfish regner i bakgrunnen på en egen motor, så boten ikke må vente.
import { useEffect, useState } from 'preact/hooks';
import { Chess } from 'chess.js';
import { analyser } from '../engine/stockfish';

export interface Eval { cp: number | null; mate: number | null } // sett fra hvit

export function useEval(fen: string, on: boolean, depth = 12) {
  const [ev, setEv] = useState<{ fen: string; e: Eval } | null>(null);
  useEffect(() => {
    if (!on) return;
    let alive = true;
    const ch = new Chess(fen);
    if (ch.isCheckmate()) return;
    if (ch.isGameOver()) { setEv({ fen, e: { cp: 0, mate: null } }); return; }
    const t = setTimeout(() => {
      analyser.go(fen, { depth }).then((r) => {
        if (!alive || !r[0]) return;
        const sign = ch.turn() === 'w' ? 1 : -1;
        const l = r[0];
        setEv({ fen, e: { cp: l.cp === null ? null : l.cp * sign, mate: l.mate === null ? null : l.mate * sign } });
      }).catch(() => {});
    }, 150);
    return () => { alive = false; clearTimeout(t); };
  }, [fen, on]);
  return ev;
}

function label(e: Eval, over: boolean, winnerWhite: boolean) {
  if (over) return winnerWhite ? '1–0' : '0–1';
  if (e.mate !== null) return `M${Math.abs(e.mate)}`;
  const v = (e.cp ?? 0) / 100;
  const s = Math.abs(v) >= 10 ? Math.round(Math.abs(v)).toString() : Math.abs(v).toFixed(1).replace('.', ',');
  return (v > 0.05 ? '+' : v < -0.05 ? '−' : '') + s;
}

// whiteName/blackName brukes i teksten under («Du leder med 1,4»)
export function EvalGauge({ fen, whiteName, blackName }: { fen: string; whiteName: string; blackName: string }) {
  const ev = useEval(fen, true);
  const ch = new Chess(fen);
  const mated = ch.isCheckmate();
  const e = ev?.e;
  const stale = !ev || ev.fen !== fen;
  // Posisjon på skalaen: −3..+3 fyller måleren, større verdier går helt ut til kanten
  let v = 0;
  let whiteWins = false;
  if (mated) { whiteWins = ch.turn() === 'b'; v = whiteWins ? 3.6 : -3.6; }
  else if (e) v = e.mate !== null ? (e.mate > 0 ? 3.6 : -3.6) : Math.max(-3.6, Math.min(3.6, (e.cp ?? 0) / 100));
  const pos = 50 + (v / 3.6) * 50;
  const lead = mated ? (whiteWins ? whiteName : blackName) + ' vant'
    : !e ? 'Regner...'
    : e.mate !== null ? `${e.mate > 0 ? whiteName : blackName} kan sette matt i ${Math.abs(e.mate)}`
    : Math.abs(e.cp ?? 0) < 30 ? 'Omtrent likt'
    : (() => { const x = label({ cp: Math.abs(e.cp ?? 0), mate: null }, false, true).replace('+', ''); return `${(e.cp ?? 0) > 0 ? whiteName : blackName} leder med ${x} ${x === '1,0' ? 'bonde' : 'bønder'}`; })();
  return (
    <div class={`gauge ${stale && !mated ? 'stale' : ''}`} aria-label="Stillingsmåler">
      <div class="gauge-scale">
        <span class="gauge-end">Svart</span>
        <div class="gauge-track">
          {[-3, -2, -1, 0, 1, 2, 3].map((t) => <i key={t} class={t === 0 ? 'zero' : ''} style={{ left: `${50 + (t / 3.6) * 50}%` }}><b>{t > 0 ? '+' + t : t < 0 ? '−' + -t : '0'}</b></i>)}
          <div class="gauge-fill" style={{ left: `${Math.min(50, pos)}%`, width: `${Math.abs(pos - 50)}%`, background: v >= 0 ? 'var(--gauge-white)' : 'var(--gauge-black)' }} />
          <div class="gauge-arrow" style={{ left: `${pos}%` }}><span>{e || mated ? label(e ?? { cp: 0, mate: null }, mated, whiteWins) : '…'}</span></div>
        </div>
        <span class="gauge-end">Hvit</span>
      </div>
      <div class="gauge-text small muted">{lead}</div>
    </div>
  );
}
