// All fremgang lagres i nettleseren (localStorage). Ingen innlogging trengs.
import { useEffect, useState } from 'preact/hooks';

export interface Settings {
  sound: boolean;
  boardTheme: string;
  showDests: boolean;
  theme: 'dark' | 'light';
  evalBar?: boolean;   // stillingsmåler mot data (av/på), standard på
  v?: number;
}

export interface GameRecord { bot: string; result: 'win' | 'loss' | 'draw'; color: 'w' | 'b'; date: string; pgn: string; moves: number }

export interface Progress {
  version: 1;
  name: string;
  createdAt: string;
  placementDone: boolean;
  xp: number;
  puzzleRating: number;
  puzzleGames: number;
  playRating: number;
  playGames: number;
  ratingHistory: { d: string; puzzle: number; play: number }[];
  streak: { count: number; best: number; lastDay: string | null; freezes: number };
  lessons: Record<string, { stars: number; date: string }>;
  quizBest: Record<string, number>;
  bots: Record<string, { w: number; l: number; d: number }>;
  badges: Record<string, string>;
  puzzles: { solved: number; failed: number; inARow: number; bestInARow: number; byTheme: Record<string, number> };
  review: { id: string; due: string; step: number }[];
  recent: string[];
  games: GameRecord[];
  daily: Record<string, boolean>;
  stats: { mates: number; forks: number; promotions: number; hintsUsed: number };
  settings: Settings;
}

const KEY = 'sjakkreisen.v1';

export const today = () => new Date().toISOString().slice(0, 10);
const dayDiff = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

function fresh(): Progress {
  return {
    version: 1, name: '', createdAt: new Date().toISOString(), placementDone: false,
    xp: 0, puzzleRating: 500, puzzleGames: 0, playRating: 400, playGames: 0,
    ratingHistory: [], streak: { count: 0, best: 0, lastDay: null, freezes: 1 },
    lessons: {}, quizBest: {}, bots: {}, badges: {},
    puzzles: { solved: 0, failed: 0, inARow: 0, bestInARow: 0, byTheme: {} },
    review: [], recent: [], games: [], daily: {},
    stats: { mates: 0, forks: 0, promotions: 0, hintsUsed: 0 },
    settings: { sound: true, boardTheme: 'tre', showDests: true, theme: 'light', v: 2 },
  };
}

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw);
      const base = fresh();
      const settings = data.settings?.v === 2 ? { ...base.settings, ...data.settings } : { ...base.settings, sound: data.settings?.sound ?? true, showDests: data.settings?.showDests ?? true };
      return { ...base, ...data, settings, stats: { ...base.stats, ...data.stats }, puzzles: { ...base.puzzles, ...data.puzzles }, streak: { ...base.streak, ...data.streak } };
    }
  } catch { /* privat modus eller blokkert lagring */ }
  return fresh();
}

let state: Progress = load();
const listeners = new Set<() => void>();

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignorer */ }
  listeners.forEach((l) => l());
}

export function getProgress() { return state; }
export function update(fn: (s: Progress) => void) { fn(state); state = { ...state }; save(); }

export function useProgress(): Progress {
  const [, setN] = useState(0);
  useEffect(() => { const l = () => setN((n) => n + 1); listeners.add(l); return () => { listeners.delete(l); }; }, []);
  return state;
}
export function useSettings(): Settings { return useProgress().settings; }

export function resetProgress() { state = fresh(); save(); }
export function subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function replaceProgress(data: Partial<Progress>) {
  const base = fresh();
  state = { ...base, ...data, settings: { ...base.settings, ...data.settings }, stats: { ...base.stats, ...data.stats }, puzzles: { ...base.puzzles, ...data.puzzles }, streak: { ...base.streak, ...data.streak } } as Progress;
  save();
}
export function exportCode(): string { return btoa(unescape(encodeURIComponent(JSON.stringify(state)))); }
export function importCode(code: string): boolean {
  try {
    const data = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
    if (data.version !== 1) return false;
    state = { ...fresh(), ...data }; save(); return true;
  } catch { return false; }
}

// ---- Nivå og XP ----
export const levelFromXp = (xp: number) => Math.floor(Math.sqrt(xp / 50)) + 1;
export const xpForLevel = (lvl: number) => 50 * (lvl - 1) ** 2;

export type Toast = { text: string; kind: 'xp' | 'badge' | 'level' };
const toastListeners = new Set<(t: Toast) => void>();
export function onToast(fn: (t: Toast) => void) { toastListeners.add(fn); return () => { toastListeners.delete(fn); }; }
export function toast(t: Toast) { toastListeners.forEach((l) => l(t)); }

export function addXp(n: number) {
  const before = levelFromXp(state.xp);
  update((s) => { s.xp += n; });
  touchStreak();
  const after = levelFromXp(state.xp);
  if (after > before) toast({ text: `Nytt nivå: ${after}!`, kind: 'level' });
  checkBadges();
}

export function touchStreak() {
  const t = today();
  const st = state.streak;
  if (st.lastDay === t) return;
  update((s) => {
    const k = s.streak;
    if (!k.lastDay) k.count = 1;
    else {
      const diff = dayDiff(k.lastDay, t);
      if (diff === 1) k.count += 1;
      else if (diff === 2 && k.freezes > 0) { k.freezes -= 1; k.count += 1; }
      else k.count = 1;
    }
    if (k.count % 7 === 0) k.freezes = Math.min(2, k.freezes + 1);
    k.best = Math.max(k.best, k.count);
    k.lastDay = t;
  });
}

function logRating() {
  const d = today();
  update((s) => {
    const last = s.ratingHistory[s.ratingHistory.length - 1];
    const entry = { d, puzzle: Math.round(s.puzzleRating), play: Math.round(s.playRating) };
    if (last && last.d === d) s.ratingHistory[s.ratingHistory.length - 1] = entry;
    else s.ratingHistory.push(entry);
  });
}

const expected = (a: number, b: number) => 1 / (1 + 10 ** ((b - a) / 400));

export function ratePuzzle(puzzleRating: number, solved: boolean): number {
  const k = state.puzzleGames < 20 ? 60 : state.puzzleGames < 60 ? 40 : 24;
  const delta = Math.round(k * ((solved ? 1 : 0) - expected(state.puzzleRating, puzzleRating)));
  update((s) => { s.puzzleRating = Math.max(100, s.puzzleRating + delta); s.puzzleGames += 1; });
  logRating();
  return delta;
}

// factor < 1 gir mindre gevinst (f.eks. når man har brukt trekkforslag); tap teller fullt
export function rateGame(botElo: number, score: number, factor = 1): number {
  const k = state.playGames < 10 ? 50 : 32;
  let delta = Math.round(k * (score - expected(state.playRating, botElo)));
  if (delta > 0) delta = Math.round(delta * factor);
  update((s) => { s.playRating = Math.max(100, s.playRating + delta); s.playGames += 1; });
  logRating();
  return delta;
}

export function awardBadge(id: string) {
  if (state.badges[id]) return;
  update((s) => { s.badges[id] = today(); });
  const b = BADGES.find((x) => x.id === id);
  if (b) toast({ text: `Nytt merke: ${b.name}`, kind: 'badge' });
}

export interface BadgeDef { id: string; name: string; desc: string; test: (s: Progress) => boolean; color: string }
export const BADGES: BadgeDef[] = [
  { id: 'first-puzzle', name: 'Første oppgave', desc: 'Løs én taktikkoppgave', color: '#2c5d8a', test: (s) => s.puzzles.solved >= 1 },
  { id: 'puzzle-25', name: 'Oppgavejeger', desc: 'Løs 25 oppgaver', color: '#2c5d8a', test: (s) => s.puzzles.solved >= 25 },
  { id: 'puzzle-100', name: 'Oppgavemester', desc: 'Løs 100 oppgaver', color: '#2c5d8a', test: (s) => s.puzzles.solved >= 100 },
  { id: 'puzzle-500', name: 'Taktikkmaskin', desc: 'Løs 500 oppgaver', color: '#2c5d8a', test: (s) => s.puzzles.solved >= 500 },
  { id: 'row-5', name: 'På rad', desc: '5 riktige oppgaver på rad', color: '#b9800f', test: (s) => s.puzzles.bestInARow >= 5 },
  { id: 'row-15', name: 'Ustoppelig', desc: '15 riktige oppgaver på rad', color: '#b9800f', test: (s) => s.puzzles.bestInARow >= 15 },
  { id: 'fork-10', name: 'Gaffelkongen', desc: 'Løs 10 gaffeloppgaver', color: '#1f5c46', test: (s) => (s.puzzles.byTheme['gaffel'] ?? 0) >= 10 },
  { id: 'mate-25', name: 'Mattmaker', desc: 'Løs 25 mattoppgaver', color: '#b3362a', test: (s) => Object.entries(s.puzzles.byTheme).filter(([k]) => k.startsWith('mattI')).reduce((a, [, v]) => a + v, 0) >= 25 },
  { id: 'rating-600', name: 'Over 600', desc: 'Oppgaverating over 600', color: '#4b4466', test: (s) => s.puzzleRating >= 600 },
  { id: 'rating-800', name: 'Over 800', desc: 'Oppgaverating over 800', color: '#4b4466', test: (s) => s.puzzleRating >= 800 },
  { id: 'rating-1000', name: 'Over 1000', desc: 'Oppgaverating over 1000', color: '#4b4466', test: (s) => s.puzzleRating >= 1000 },
  { id: 'rating-1200', name: 'Over 1200', desc: 'Oppgaverating over 1200', color: '#4b4466', test: (s) => s.puzzleRating >= 1200 },
  { id: 'streak-3', name: '3 dager', desc: 'Øv 3 dager på rad', color: '#b7694c', test: (s) => s.streak.best >= 3 },
  { id: 'streak-7', name: 'En hel uke', desc: 'Øv 7 dager på rad', color: '#b7694c', test: (s) => s.streak.best >= 7 },
  { id: 'streak-30', name: 'En hel måned', desc: 'Øv 30 dager på rad', color: '#b7694c', test: (s) => s.streak.best >= 30 },
  { id: 'first-win', name: 'Første seier', desc: 'Vinn et parti mot en bot', color: '#1f5c46', test: (s) => Object.values(s.bots).some((b) => b.w > 0) },
  { id: 'beat-tora', name: 'Tårnknuser', desc: 'Slå Tårn-Tora', color: '#1f5c46', test: (s) => (s.bots['tora']?.w ?? 0) > 0 },
  { id: 'beat-dina', name: 'Dronningslager', desc: 'Slå Dronning-Dina', color: '#1f5c46', test: (s) => (s.bots['dina']?.w ?? 0) > 0 },
  { id: 'beat-kare', name: 'Kongemaker', desc: 'Slå Kong Kåre', color: '#b9800f', test: (s) => (s.bots['kare']?.w ?? 0) > 0 },
  { id: 'lessons-5', name: 'Lærevillig', desc: 'Fullfør 5 leksjoner', color: '#5b6b3a', test: (s) => Object.keys(s.lessons).length >= 5 },
  { id: 'lessons-20', name: 'Sjakkprofessor', desc: 'Fullfør 20 leksjoner', color: '#5b6b3a', test: (s) => Object.keys(s.lessons).length >= 20 },
  { id: 'games-10', name: 'Spilleglad', desc: 'Spill 10 partier', color: '#1f5c46', test: (s) => s.games.length >= 10 },
  { id: 'level-5', name: 'Nivå 5', desc: 'Nå nivå 5', color: '#b9800f', test: (s) => levelFromXp(s.xp) >= 5 },
  { id: 'level-10', name: 'Nivå 10', desc: 'Nå nivå 10', color: '#b9800f', test: (s) => levelFromXp(s.xp) >= 10 },
];

export function checkBadges() {
  for (const b of BADGES) if (!state.badges[b.id] && b.test(state)) awardBadge(b.id);
}

// Brettfarger låses opp med nivå
export const BOARD_THEMES = [
  { id: 'tre', name: 'Valnøtt', level: 1 },
  { id: 'klassisk', name: 'Filt', level: 1 },
  { id: 'is', name: 'Is', level: 3 },
  { id: 'lava', name: 'Rust', level: 6 },
  { id: 'natt', name: 'Skifer', level: 10 },
  { id: 'gull', name: 'Gull', level: 15 },
];

export function applyTheme() {
  document.documentElement.dataset.theme = state.settings.theme;
}
