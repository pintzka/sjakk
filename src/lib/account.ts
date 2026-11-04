// Brukerkonto: innlogging med navn + PIN, og synk av fremgang til serveren.
import { useEffect, useState } from 'preact/hooks';
import { getProgress, replaceProgress, resetProgress, subscribe, toast } from './store';

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

// Revisjonen av fremgangen vi sist så på serveren. Brukes for å oppdage at en annen enhet har lagret noe nyere.
const REV_KEY = 'sjakkreisen.rev';
let syncedRev = 0;
try { syncedRev = +(localStorage.getItem(REV_KEY) || 0); } catch { /* ignorer */ }
function setRev(r: number) { syncedRev = r; try { localStorage.setItem(REV_KEY, String(r)); } catch { /* ignorer */ } }
// Lokale endringer som ikke er lagret på serveren ennå (huskes også om appen lukkes før lagring)
const DIRTY_KEY = 'sjakkreisen.dirty';
let dirty = false;
try { dirty = localStorage.getItem(DIRTY_KEY) === '1'; } catch { /* ignorer */ }
function setDirty(d: boolean) { dirty = d; try { d ? localStorage.setItem(DIRTY_KEY, '1') : localStorage.removeItem(DIRTY_KEY); } catch { /* ignorer */ } }
let applying = false;   // true mens vi legger inn fremgang fra serveren (skal ikke sendes tilbake)
function applyRemote(p: any, rev: number) {
  applying = true;
  try { replaceProgress(p); } finally { applying = false; }
  setDirty(false);
  setRev(rev);
}

async function afterLogin(r: { token: string; user: { id: number; name: string } }) {
  setAccount({ token: r.token, id: r.user.id, name: r.user.name });
  const me = await api<{ progress: any; rev?: number }>('me');
  const local = getProgress();
  if (me.progress && (me.progress.xp ?? 0) >= local.xp) applyRemote(me.progress, me.rev ?? 0);
  else { setRev(me.rev ?? 0); replaceProgress({ ...local, name: r.user.name }); await pushNow(); }
  if (!getProgress().name) replaceProgress({ ...getProgress(), name: r.user.name });
}

export async function login(name: string, pin: string) { await afterLogin(await api('login', { method: 'POST', body: { name, pin } })); }
export async function register(code: string, name: string, pin: string) { await afterLogin(await api('register', { method: 'POST', body: { code, name, pin } })); }
export async function logout() {
  try { await pushNow(); await api('logout', { method: 'POST' }); } catch { /* ignorer */ }
  setAccount(null);
  setRev(0);
  applying = true; resetProgress(); applying = false;
  setDirty(false);
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
  try {
    const r = await api<{ rev: number }>('progress', { method: 'PUT', body: { data: getProgress(), rev: syncedRev } });
    setDirty(false); setRev(r.rev ?? syncedRev); syncState = 'saved';
  } catch (ex) {
    // 409: en annen enhet har lagret mer fremgang. Da tar vi den.
    if (ex instanceof ApiError && ex.status === 409) {
      try { const me = await api<{ progress: any; rev?: number }>('me'); if (me.progress) { applyRemote(me.progress, me.rev ?? 0); toast({ text: 'Hentet nyere fremgang fra en annen enhet', kind: 'xp' }); } } catch { /* ignorer */ }
      syncState = 'saved';
    } else syncState = 'error';
  }
}
subscribe(() => {
  if (!account || applying) return;
  setDirty(true);
  window.clearTimeout(timer);
  timer = window.setTimeout(pushNow, 2500);
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { if (dirty) pushNow(); }
  else pull();
});
window.addEventListener('pagehide', () => { if (dirty) pushNow(); });

// Hent nyeste fremgang fra serveren (ved oppstart og når appen kommer fram igjen)
let lastPull = 0;
export async function pull() {
  if (!account || Date.now() - lastPull < 5000) return;
  lastPull = Date.now();
  try {
    const me = await api<{ progress: any; rev?: number }>('me');
    const rev = me.rev ?? 0;
    if (!me.progress) { if (getProgress().xp > 0 || getProgress().placementDone) pushNow(); return; }
    if (rev > syncedRev) {
      if (!dirty) applyRemote(me.progress, rev);
      else pushNow(); // serveren avgjør hvem som har mest fremgang
    } else if (dirty) pushNow();
  } catch { /* offline: bruk lokal */ }
}
export const pullOnStart = pull;
