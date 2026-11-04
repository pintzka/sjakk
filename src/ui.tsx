// Felles småkomponenter og ikoner.
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { PieceSvg, type PieceType } from './board/pieces';
import { onToast, type Toast, useProgress, levelFromXp, xpForLevel, today } from './lib/store';

const I = (d: ComponentChildren) => (p: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={p.size ?? 24} height={p.size ?? 24} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{d}</svg>
);
export const IconHome = I(<><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></>);
export const IconMap = I(<><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z" /><path d="M9 4v14M15 6v14" /></>);
export const IconBolt = I(<path d="M13 2L4 14h7l-1 8 9-12h-7z" />);
export const IconSwords = I(<><path d="M14 4h6v6L9 21l-3-3z" /><path d="M4 14l6 6M3 21l3-3" /></>);
export const IconUser = I(<><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></>);
export const IconBack = I(<path d="M15 5l-7 7 7 7" />);
export const IconLock = I(<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>);
export const IconHint = I(<><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-4 10.5c1 1 1.5 2 1.5 3.5h5c0-1.5.5-2.5 1.5-3.5A6 6 0 0 0 12 3z" /></>);
export const IconUndo = I(<><path d="M9 14L4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></>);
export const IconFlip = I(<><path d="M7 4v16M7 20l-3-3M7 20l3-3" /><path d="M17 20V4M17 4l-3 3M17 4l3 3" /></>);
export const IconFlag = I(<><path d="M5 21V4" /><path d="M5 4h12l-2 4 2 4H5" /></>);
export const IconTrophy = I(<><path d="M8 21h8M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" /></>);
export const IconTimer = I(<><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M9 2h6" /></>);
export const IconGauge = I(<><path d="M3 15a9 9 0 0 1 18 0" /><path d="M12 15l4-5" /><path d="M3 19h18" /></>);
export const IconBook = I(<><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 21V5M8 7h7" /></>);
export const IconQuiz = I(<><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 1-1 1.7v.5" /><path d="M12 17h.01" /></>);

export function Flame({ size = 18, on = true }: { size?: number; on?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-3-1-6 1-9z" fill={on ? '#c4552f' : 'none'} stroke={on ? '#c4552f' : 'currentColor'} stroke-width="1.6" stroke-linejoin="round" />
    </svg>
  );
}
export function StarIcon({ size = 18 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size}><path d="M12 2.5l2.9 6.3 6.8.8-5 4.7 1.3 6.8L12 17.7l-6 3.4 1.3-6.8-5-4.7 6.8-.8z" fill="var(--gold)" /></svg>;
}

export function Avatar({ piece, color, size = 44 }: { piece: PieceType; color: string; size?: number }) {
  return (
    <div class="avatar" style={{ background: color, width: size + 'px', height: size + 'px' }} aria-hidden="true">
      <PieceSvg type={piece} color="w" />
    </div>
  );
}

// Rokade-logoen: tårnet som hopper over kongen (rokade), egen tegning.
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" class="logo-mark">
      <rect width="100" height="100" rx="22" fill="#1f5c46" />
      <path d="M20 40C29 13 64 9 75.5 25.5" fill="none" stroke="#e2ab3f" stroke-width="7" stroke-linecap="round" />
      <path d="M84 36.5L67.5 29.5 82 19z" fill="#e2ab3f" stroke="#e2ab3f" stroke-width="2" stroke-linejoin="round" />
      <g transform="translate(18 28.5) scale(.64)" fill="#fbf8f1" stroke="#16130f" stroke-width="3.4" stroke-linejoin="round">
        <path d="M19 87h62v-5c0-3.5-2.2-6-5.5-6h-51c-3.3 0-5.5 2.5-5.5 6z" /><path d="M26 76h48v-6H26z" /><path d="M32 70l2.5-33h31L68 70z" /><path d="M28 37h44v-6H28z" /><path d="M28 31V16h9v6.5h7V16h12v6.5h7V16h9v15z" />
      </g>
    </svg>
  );
}
export function Logo({ size = 30 }: { size?: number }) {
  return <span class="logo"><LogoMark size={size} /><span class="logo-word">Rokade</span></span>;
}

export function Modal({ children, onClose }: { children: ComponentChildren; onClose?: () => void }) {
  return (
    <div class="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div class="modal">{children}</div>
    </div>
  );
}

export function Confetti() {
  const colors = ['#1f5c46', '#d6a21e', '#b3362a', '#2c5d8a', '#1f1d1a'];
  return (
    <div class="confetti">
      {Array.from({ length: 60 }, (_, i) => (
        <i key={i} style={{ left: Math.random() * 100 + '%', background: colors[i % colors.length], animationDelay: Math.random() * 0.6 + 's', animationDuration: 1.2 + Math.random() * 1.2 + 's' }} />
      ))}
    </div>
  );
}

export function Toasts() {
  const [items, setItems] = useState<(Toast & { id: number })[]>([]);
  useEffect(() => onToast((t) => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { ...t, id }].slice(-2)); // maks to om gangen, så de ikke dekker skjermen
    setTimeout(() => setItems((x) => x.filter((y) => y.id !== id)), 3200);
  }), []);
  return (
    <div style={{ position: 'fixed', top: '12px', left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', zIndex: 80, pointerEvents: 'none' }}>
      {items.map((t) => (
        <div key={t.id} class="chip" style={{ background: 'var(--text)', color: 'var(--bg)', borderColor: 'var(--text)', padding: '8px 14px', animation: 'pop .25s', fontSize: '.9rem' }}>
          {t.kind === 'level' ? <StarIcon /> : t.kind === 'badge' ? <StarIcon /> : <IconBolt size={16} />} {t.text}
        </div>
      ))}
    </div>
  );
}

export function TopBar({ title, back }: { title?: string; back?: string }) {
  const s = useProgress();
  const lvl = levelFromXp(s.xp);
  const cur = xpForLevel(lvl), next = xpForLevel(lvl + 1);
  return (
    <div class="topbar">
      {back && <a href={back} class="btn secondary small" aria-label="Tilbake"><IconBack size={18} /></a>}
      <div class={`title ${title ? '' : 'brand'}`}>{title ?? <Logo />}</div>
      <span class="chip" title="Dager på rad"><Flame on={s.streak.lastDay === today()} /> {s.streak.count}</span>
      <span class="chip" title={`${s.xp - cur} / ${next - cur} XP til neste nivå`}><StarIcon /> {lvl}</span>
    </div>
  );
}

export function XpBar() {
  const s = useProgress();
  const lvl = levelFromXp(s.xp);
  const cur = xpForLevel(lvl), next = xpForLevel(lvl + 1);
  return (
    <div>
      <div class="row small" style={{ justifyContent: 'space-between', marginBottom: '4px' }}>
        <span class="label" style={{ color: 'var(--text)' }}>Nivå {lvl}</span><span class="muted">{s.xp - cur} / {next - cur} XP</span>
      </div>
      <div class="xpbar"><div style={{ width: Math.round(((s.xp - cur) / (next - cur)) * 100) + '%' }} /></div>
    </div>
  );
}

// Trekkliste: «1. e4 e5 2. Sf3 …» (på PC som tabell med tre kolonner)
export function MoveList({ sans }: { sans: string[] }) {
  const out = [];
  for (let i = 0; i < sans.length; i += 2) {
    out.push(<span key={'n' + i} class="mn">{i / 2 + 1}.</span>, <span key={'w' + i}>{sans[i]}</span>, <span key={'b' + i}>{sans[i + 1] ?? ''}</span>);
  }
  return <div class="movelist">{out}</div>;
}

export const shuffle = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
