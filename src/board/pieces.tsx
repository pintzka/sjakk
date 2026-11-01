// Egne, enkle sjakkbrikker tegnet som SVG (viewBox 0 0 100 100).
import type { JSX } from 'preact';

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type Color = 'w' | 'b';

const BASE = 'M22 80h56a4 4 0 0 1 4 4v4H18v-4a4 4 0 0 1 4-4z';

const SHAPES: Record<PieceType, (detail: string) => JSX.Element> = {
  p: () => (
    <>
      <path d="M50 18a12 12 0 0 1 8 21c6 3 9 8 9 13H33c0-5 3-10 9-13a12 12 0 0 1 8-21z" />
      <path d="M38 52h24c1 9 5 17 12 24v4H26v-4c7-7 11-15 12-24z" />
      <path d={BASE} />
    </>
  ),
  r: () => (
    <>
      <path d="M24 16h11v8h7v-8h16v8h7v-8h11v20H24z" />
      <path d="M30 36h40l-3 36H33z" />
      <path d="M26 72h48v8H26z" />
      <path d={BASE} />
    </>
  ),
  b: (d) => (
    <>
      <circle cx="50" cy="15" r="6" />
      <path d="M50 22c13 10 19 21 19 31 0 9-7 15-19 15s-19-6-19-15c0-10 6-21 19-31z" />
      <path d="M57 35L46 49" fill="none" stroke={d} stroke-width="4" stroke-linecap="round" />
      <path d="M34 68h32l4 12H30z" />
      <path d={BASE} />
    </>
  ),
  n: (d) => (
    <>
      <path d="M32 80C33 68 42 60 47 52c-6 4-12 8-18 8-6 0-10-5-8-10l16-21c6-6 12-8 18-8l4-10 4 10c11 8 14 28 9 59z" />
      <circle cx="43" cy="34" r="3.2" fill={d} stroke="none" />
      <path d="M64 24c6 8 8 22 6 40" fill="none" stroke={d} stroke-width="3.5" stroke-linecap="round" />
      <path d={BASE} />
    </>
  ),
  q: () => (
    <>
      <path d="M26 72L18 34l13 18 4-27 9 25 6-30 6 30 9-25 4 27 13-18-8 38z" />
      <circle cx="18" cy="31" r="5" /><circle cx="35" cy="23" r="5" /><circle cx="50" cy="16" r="5.5" />
      <circle cx="65" cy="23" r="5" /><circle cx="82" cy="31" r="5" />
      <path d="M26 72h48l-2 8H28z" />
      <path d={BASE} />
    </>
  ),
  k: (d) => (
    <>
      <path d="M46 5h8v8h7v7h-7v9h-8v-9h-7v-7h7z" />
      <path d="M27 74C17 58 21 40 36 40c7 0 11 4 14 10 3-6 7-10 14-10 15 0 19 18 9 34z" />
      <path d="M50 50v22" fill="none" stroke={d} stroke-width="3" stroke-linecap="round" />
      <path d="M27 74h46l-2 6H29z" />
      <path d={BASE} />
    </>
  ),
};

export const PIECE_NAMES: Record<PieceType, string> = {
  p: 'bonde', n: 'springer', b: 'løper', r: 'tårn', q: 'dronning', k: 'konge',
};

export function PieceSvg({ type, color }: { type: PieceType; color: Color }) {
  const fill = color === 'w' ? '#fff8e8' : '#3a3346';
  const stroke = color === 'w' ? '#2a2333' : '#0f0c16';
  const detail = color === 'w' ? '#2a2333' : '#cfc6e6';
  return (
    <svg viewBox="0 0 100 100" aria-label={`${color === 'w' ? 'hvit' : 'svart'} ${PIECE_NAMES[type]}`}>
      <g fill={fill} stroke={stroke} stroke-width="3.2" stroke-linejoin="round">{SHAPES[type](detail)}</g>
    </svg>
  );
}

export function StarSvg() {
  return (
    <svg viewBox="0 0 100 100" class="star">
      <path d="M50 6l12.6 27.4 29.9 3.4-22.3 20.3 6.2 29.5L50 71.6 23.6 86.6l6.2-29.5L7.5 36.8l29.9-3.4z" fill="#ffd36b" stroke="#b37800" stroke-width="4" stroke-linejoin="round" />
    </svg>
  );
}

export const PIECE_DEF: Record<PieceType, string> = {
  p: 'bonden', n: 'springeren', b: 'løperen', r: 'tårnet', q: 'dronningen', k: 'kongen',
};
