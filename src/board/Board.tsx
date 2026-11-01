// Sjakkbrettet: viser brikker, lar deg trykke eller dra for å flytte.
import { useRef, useState, useEffect } from 'preact/hooks';
import { PieceSvg, StarSvg, type PieceType, type Color } from './pieces';
import { useSettings } from '../lib/store';

export type Highlight = 'good' | 'bad' | 'hint' | 'target' | 'mark';
export interface Arrow { from: string; to: string; color?: string }

export interface BoardProps {
  fen: string;
  orientation?: Color;
  dests?: Map<string, string[]>;
  onMove?: (from: string, to: string, promotion?: PieceType) => void;
  needsPromotion?: (from: string, to: string) => boolean;
  lastMove?: [string, string] | null;
  check?: string | null;
  highlights?: Record<string, Highlight>;
  arrows?: Arrow[];
  stars?: string[];
  onSquareClick?: (sq: string) => void;
  coords?: boolean;
  flash?: { kind: 'good' | 'bad'; key: number } | null;
  showDests?: boolean;
}

const FILES = 'abcdefgh';

export function parsePlacement(fen: string): Record<string, { type: PieceType; color: Color }> {
  const out: Record<string, { type: PieceType; color: Color }> = {};
  const rows = fen.split(' ')[0].split('/');
  rows.forEach((row, i) => {
    let f = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) { f += +ch; continue; }
      const color: Color = ch === ch.toUpperCase() ? 'w' : 'b';
      out[FILES[f] + (8 - i)] = { type: ch.toLowerCase() as PieceType, color };
      f++;
    }
  });
  return out;
}

export function Board(p: BoardProps) {
  const settings = useSettings();
  const orientation = p.orientation ?? 'w';
  const pieces = parsePlacement(p.fen);
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ from: string; x: number; y: number; moved: boolean; size: number } | null>(null);
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);
  const [flashClass, setFlashClass] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const downRef = useRef<{ x: number; y: number; sq: string; wasSelected: boolean } | null>(null);

  useEffect(() => { setSelected(null); setPromo(null); }, [p.fen]);
  useEffect(() => {
    if (!p.flash) return;
    setFlashClass('');
    const t = requestAnimationFrame(() => setFlashClass(p.flash!.kind === 'good' ? 'flash-good' : 'flash-bad'));
    return () => cancelAnimationFrame(t);
  }, [p.flash?.key]);

  const squares: string[] = [];
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const file = orientation === 'w' ? f : 7 - f;
    const rank = orientation === 'w' ? 8 - r : r + 1;
    squares.push(FILES[file] + rank);
  }

  function sqAt(x: number, y: number): string | null {
    const el = ref.current; if (!el) return null;
    const rect = el.getBoundingClientRect();
    const fx = Math.floor(((x - rect.left) / rect.width) * 8);
    const fy = Math.floor(((y - rect.top) / rect.height) * 8);
    if (fx < 0 || fx > 7 || fy < 0 || fy > 7) return null;
    return squares[fy * 8 + fx];
  }

  const canMoveFrom = (sq: string) => !!p.dests && (p.dests.get(sq)?.length ?? 0) > 0;
  const destsOf = (sq: string | null) => (sq && p.dests?.get(sq)) || [];

  function tryMove(from: string, to: string) {
    if (!destsOf(from).includes(to)) return false;
    if (p.needsPromotion?.(from, to)) { setPromo({ from, to }); return true; }
    setSelected(null);
    p.onMove?.(from, to);
    return true;
  }

  function onDown(e: PointerEvent) {
    if (promo) return;
    const sq = sqAt(e.clientX, e.clientY); if (!sq) return;
    if (p.onSquareClick && !p.dests) { p.onSquareClick(sq); return; }
    if (selected && sq !== selected && destsOf(selected).includes(sq)) { tryMove(selected, sq); return; }
    if (canMoveFrom(sq)) {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      const rect = ref.current!.getBoundingClientRect();
      downRef.current = { x: e.clientX, y: e.clientY, sq, wasSelected: selected === sq };
      setSelected(sq);
      setDrag({ from: sq, x: e.clientX, y: e.clientY, moved: false, size: rect.width / 8 });
    } else {
      setSelected(null);
      p.onSquareClick?.(sq);
    }
  }
  function onMoveEv(e: PointerEvent) {
    if (!drag || !downRef.current) return;
    const moved = drag.moved || Math.hypot(e.clientX - downRef.current.x, e.clientY - downRef.current.y) > 6;
    setDrag({ ...drag, x: e.clientX, y: e.clientY, moved });
  }
  function onUp(e: PointerEvent) {
    const d = drag; const down = downRef.current;
    setDrag(null); downRef.current = null;
    if (!d || !down) return;
    const sq = sqAt(e.clientX, e.clientY);
    if (d.moved) {
      if (sq && sq !== d.from && tryMove(d.from, sq)) return;
      return; // dro tilbake: behold markering
    }
    if (down.wasSelected) setSelected(null); // trykk på samme brikke igjen fjerner markering
  }

  const showDests = p.showDests !== false && settings.showDests;
  const dests = destsOf(selected);
  const hl = p.highlights ?? {};

  return (
    <div class={`board-wrap board-${settings.boardTheme} ${flashClass}`}>
      <div class="board" ref={ref} onPointerDown={onDown as any} onPointerMove={onMoveEv as any} onPointerUp={onUp as any} onPointerCancel={() => { setDrag(null); }}>
        {squares.map((sq, i) => {
          const f = FILES.indexOf(sq[0]); const r = +sq[1];
          const light = (f + r) % 2 === 0;
          const pc = pieces[sq];
          const cls = ['sq', light ? 'l' : 'd'];
          if (p.lastMove && (p.lastMove[0] === sq || p.lastMove[1] === sq)) cls.push('last');
          if (selected === sq) cls.push('sel');
          if (p.check === sq) cls.push('check');
          if (hl[sq]) cls.push('hl-' + hl[sq]);
          const row = Math.floor(i / 8), col = i % 8;
          return (
            <div class={cls.join(' ')} key={sq} data-sq={sq}>
              {p.coords !== false && col === 0 && <span class="coord r">{sq[1]}</span>}
              {p.coords !== false && row === 7 && <span class="coord f">{sq[0]}</span>}
              {pc && <div class={`piece ${drag?.moved && drag.from === sq ? 'dragging' : ''}`}><PieceSvg type={pc.type} color={pc.color} /></div>}
              {p.stars?.includes(sq) && <StarSvg />}
              {showDests && dests.includes(sq) && (pc ? <span class="ring" /> : <span class="dot" />)}
            </div>
          );
        })}
      </div>
      {p.arrows && p.arrows.length > 0 && <Arrows arrows={p.arrows} orientation={orientation} />}
      {drag?.moved && pieces[drag.from] && (
        <div class="drag-ghost" style={{ left: drag.x + 'px', top: drag.y + 'px', width: drag.size * 1.25 + 'px', height: drag.size * 1.25 + 'px' }}>
          <PieceSvg type={pieces[drag.from].type} color={pieces[drag.from].color} />
        </div>
      )}
      {promo && (
        <div class="promo" onPointerDown={(e) => e.stopPropagation()}>
          <div class="promo-inner">
            {(['q', 'r', 'b', 'n'] as PieceType[]).map((t) => (
              <button key={t} onClick={() => { const pr = promo; setPromo(null); setSelected(null); p.onMove?.(pr.from, pr.to, t); }}>
                <PieceSvg type={t} color={pieces[promo.from]?.color ?? 'w'} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Arrows({ arrows, orientation }: { arrows: Arrow[]; orientation: Color }) {
  const c = (sq: string) => {
    const f = FILES.indexOf(sq[0]); const r = +sq[1];
    const x = orientation === 'w' ? f : 7 - f;
    const y = orientation === 'w' ? 8 - r : r - 1;
    return [x * 100 + 50, y * 100 + 50];
  };
  return (
    <svg class="arrows" viewBox="0 0 800 800">
      <defs>
        {['#2c5d8a', '#2f7d4f', '#b3362a', '#d6a21e'].map((col) => (
          <marker id={'ah' + col.slice(1)} key={col} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto">
            <path d="M0 0L10 5L0 10z" fill={col} />
          </marker>
        ))}
      </defs>
      {arrows.map((a, i) => {
        const col = a.color ?? '#2c5d8a';
        const [x1, y1] = c(a.from); const [x2, y2] = c(a.to);
        const len = Math.hypot(x2 - x1, y2 - y1); const k = (len - 30) / len;
        return <line key={i} x1={x1} y1={y1} x2={x1 + (x2 - x1) * k} y2={y1 + (y2 - y1) * k} stroke={col} stroke-width="16" stroke-linecap="round" opacity=".85" marker-end={`url(#ah${col.slice(1)})`} />;
      })}
    </svg>
  );
}
