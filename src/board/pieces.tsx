// Egne, enkle sjakkbrikker tegnet som SVG (viewBox 0 0 100 100).
import type { JSX } from 'preact';

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type Color = 'w' | 'b';

const BASE = 'M22 87h56v-5c0-3.5-2.2-6-5.5-6h-45c-3.3 0-5.5 2.5-5.5 6z';
const BASE_W = 'M19 87h62v-5c0-3.5-2.2-6-5.5-6h-51c-3.3 0-5.5 2.5-5.5 6z';
const FOOT = 'M31 76c2-6 6-9.5 10-10.5h18c4 1 8 4.5 10 10.5z';
const COLLAR = (y: number, w = 28) => `M${50 - w / 2} ${y + 6}h${w}a3 3 0 0 0 0-6h-${w}a3 3 0 0 0 0 6z`;

// Klassiske silhuetter (Staunton-inspirert), tegnet for Sjakkreisen.
const SHAPES: Record<PieceType, (detail: string) => JSX.Element> = {
  p: () => (
    <>
      <path d={BASE} />
      <path d="M33 76c1.5-9.5 6-16.5 11-20h12c5 3.5 9.5 10.5 11 20z" />
      <path d={COLLAR(50, 26)} />
      <circle cx="50" cy="37" r="12" />
    </>
  ),
  r: () => (
    <>
      <path d={BASE_W} />
      <path d="M26 76h48v-6H26z" />
      <path d="M32 70l2.5-33h31L68 70z" />
      <path d="M28 37h44v-6H28z" />
      <path d="M28 31V16h9v6.5h7V16h12v6.5h7V16h9v15z" />
    </>
  ),
  b: (d) => (
    <>
      <path d={BASE} />
      <path d={FOOT} />
      <path d={COLLAR(59.5, 28)} />
      <path d="M50 17C38.5 26 34 36 34 44.5c0 7 4.5 12 9.5 14h13c5-2 9.5-7 9.5-14C66 36 61.5 26 50 17z" />
      <circle cx="50" cy="12.5" r="4.6" />
      <path d="M56 30L45.5 42.5M45 49h10" fill="none" stroke={d} stroke-width="2.6" stroke-linecap="round" />
    </>
  ),
  n: (d) => (
    <>
      <path d={BASE_W} />
      <path d="M29 76C29 66 34 60 40.5 55c5-4 6.5-8 5.5-11.5-4 3-9 5-14 5-5 0-9-2-10-6-1-3 .8-6 3.8-8.5L39 21.5c2-5 6-8.5 10-10.5l1-6.5 5.5 5.5C68 12 78 24.5 79 42c.6 12-2 23-5.5 34z" />
      <circle cx="44" cy="25.5" r="2.6" fill={d} stroke="none" />
      <circle cx="27" cy="40.5" r="1.6" fill={d} stroke="none" />
      <path d="M57.5 14.5C67 21 72 32.5 72 47" fill="none" stroke={d} stroke-width="2.4" stroke-linecap="round" />
    </>
  ),
  q: (d) => (
    <>
      <path d={BASE_W} />
      <path d={FOOT} />
      <path d={COLLAR(59.5, 30)} />
      <path d="M36.5 60L26.5 26l7.5 18 4.5-24 5.5 20 6-24 6 24 5.5-20 4.5 24 7.5-18-10 34z" />
      <circle cx="26.5" cy="23" r="3.8" /><circle cx="38.5" cy="17" r="3.8" /><circle cx="50" cy="13" r="4.2" />
      <circle cx="61.5" cy="17" r="3.8" /><circle cx="73.5" cy="23" r="3.8" />
      <path d="M37.5 54c8-2.5 17-2.5 25 0" fill="none" stroke={d} stroke-width="2.2" stroke-linecap="round" />
    </>
  ),
  k: (d) => (
    <>
      <path d={BASE_W} />
      <path d={FOOT} />
      <path d={COLLAR(59.5, 30)} />
      <path d="M37 60C29.5 48 27.5 38 32.5 32c4.5-5.5 12-4 17.5 4.5C55.5 28 63 26.5 67.5 32c5 6 3 16-4.5 28z" />
      <path d="M47 4.5h6v7h7v6h-7v15h-6v-15h-7v-6h7z" />
      <path d="M36.5 50.5c9-3.5 18-3.5 27 0" fill="none" stroke={d} stroke-width="2.2" stroke-linecap="round" />
    </>
  ),
};

export const PIECE_NAMES: Record<PieceType, string> = {
  p: 'bonde', n: 'springer', b: 'løper', r: 'tårn', q: 'dronning', k: 'konge',
};

export function PieceSvg({ type, color }: { type: PieceType; color: Color }) {
  const fill = color === 'w' ? '#fbf8f1' : '#26231f';
  const stroke = '#1f1d1a';
  const detail = color === 'w' ? '#1f1d1a' : '#efe9dd';
  return (
    <svg viewBox="0 0 100 100" aria-label={`${color === 'w' ? 'hvit' : 'svart'} ${PIECE_NAMES[type]}`}>
      <g fill={fill} stroke={stroke} stroke-width="2.6" stroke-linejoin="round">{SHAPES[type](detail)}</g>
    </svg>
  );
}

export function StarSvg() {
  return (
    <svg viewBox="0 0 100 100" class="star">
      <circle cx="50" cy="50" r="30" fill="#d6a21e" stroke="#1f1d1a" stroke-width="4" /><path d="M50 30l5.6 12.2 13.4 1.5-10 9.1 2.8 13.2L50 59.3 38.2 66l2.8-13.2-10-9.1 13.4-1.5z" fill="#fbf8f1" />
    </svg>
  );
}

export const PIECE_DEF: Record<PieceType, string> = {
  p: 'bonden', n: 'springeren', b: 'løperen', r: 'tårnet', q: 'dronningen', k: 'kongen',
};
