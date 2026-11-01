// Brukerkonto: innlogging med navn + PIN, og synk av fremgang til serveren.
import { useEffect, useState } from 'preact/hooks';
import { getProgress, replaceProgress, resetProgress, subscribe } from './store';

export interface Account { token: string; id: number; name: string }
const KEY = 'sjakkreisen.account';

let account: Account | null = null;
try { account = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { account = null; }
const listeners = new Set<() => void>();
function setAccount(a: Account | null) {
  account = a;
  try { a ? localStorage.setItem(KEY, JSON.stringify(a)) : localStorage.removeItem(KEY); } catch { /* ignorer */ }
  listeners.forEach((l) => l());
}
export function getAccount() { return account; }
export function useAccount() {
  const [, setN] = useState(0);
  useEffect(() => { const l = () => setN((n) => n + 1); listeners.add(l); return () => { listeners.delete(l); }; }, []);
  return account;
}

export class ApiError extends Error { constructor(msg: string, public status: number) { super(msg); } }

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (account) headers.authorization = 'Bearer ' + account.token;
  let res: Response;
  try {
    res = await fetch('/api/' + path, { method: opts.method ?? 'GET', headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  } catch { throw new ApiError('Får ikke kontakt med serveren. Er du på nett?', 0); }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && account) setAccount(null);
  if (!res.ok) throw new ApiError(data.error ?? 'Noe gikk galt.', res.status);
  return data as T;
}

async function afterLogin(r: { token: string; user: { id: number; name: string } }) {
  setAccount({ token: r.token, id: r.user.id, name: r.user.name });
  const me = await api<{ progress: any }>('me');
  const local = getProgress();
  if (me.progress && (me.progress.xp ?? 0) >= local.xp) replaceProgress(me.progress);
  else { replaceProgress({ ...local, name: r.user.name }); await pushNow(); }
  if (!getProgress().name) replaceProgress({ ...getProgress(), name: r.user.name });
}

export async function login(name: string, pin: string) { await afterLogin(await api('login', { method: 'POST', body: { name, pin } })); }
export async function register(code: string, name: string, pin: string) { await afterLogin(await api('register', { method: 'POST', body: { code, name, pin } })); }
export async function logout() {
  try { await pushNow(); await api('logout', { method: 'POST' }); } catch { /* ignorer */ }
  setAccount(null);
  resetProgress();
}

// ---- Synk ----
let timer: number | undefined;
export type SyncState = 'idle' | 'saving' | 'saved' | 'error';
let syncState: SyncState = 'idle';
export const getSyncState = () => syncState;
async function pushNow() {
  if (!account) return;
  window.clearTimeout(timer);
  syncState = 'saving';
  try { await api('progress', { method: 'PUT', body: { data: getProgress() } }); syncState = 'saved'; }
  catch { syncState = 'error'; }
}
subscribe(() => {
  if (!account) return;
  window.clearTimeout(timer);
  timer = window.setTimeout(pushNow, 3000);
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') pushNow(); });

// Hent siste fremgang fra serveren ved oppstart (hvis den er nyere)
export async function pullOnStart() {
  if (!account) return;
  try {
    const me = await api<{ progress: any }>('me');
    if (me.progress && (me.progress.xp ?? 0) > getProgress().xp) replaceProgress(me.progress);
  } catch { /* offline: bruk lokal */ }
}
