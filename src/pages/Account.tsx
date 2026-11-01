// Logg inn / registrer deg med invitasjonskode.
import { useState } from 'preact/hooks';
import { login, register, logout, useAccount } from '../lib/account';
import { TopBar } from '../ui';

export function Account() {
  const acc = useAccount();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: Event) {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      if (mode === 'login') await login(name, pin); else await register(code, name, pin);
      location.hash = '#/';
    } catch (ex) { setErr((ex as Error).message); }
    setBusy(false);
  }

  if (acc) return (
    <div>
      <TopBar title="Konto" back="#/meg" />
      <div class="card">
        <h2>Logget inn som {acc.name}</h2>
        <p class="muted">Fremgangen din lagres automatisk, så du kan bruke Sjakkreisen på mobil, nettbrett og PC.</p>
        <button class="btn secondary block" onClick={async () => { await logout(); location.hash = '#/'; }}>Logg ut</button>
      </div>
    </div>
  );

  const inp = (v: string, set: (s: string) => void, props: Record<string, unknown>) => (
    <input type="text" value={v} onInput={(e) => set((e.target as HTMLInputElement).value)} style={{ margin: '4px 0 12px' }} {...props} />
  );
  return (
    <div>
      <TopBar title="Konto" back="#/" />
      <div class="tabs">
        <button class={`tab ${mode === 'login' ? 'on' : ''}`} onClick={() => setMode('login')}>Logg inn</button>
        <button class={`tab ${mode === 'register' ? 'on' : ''}`} onClick={() => setMode('register')}>Ny bruker</button>
      </div>
      <form class="card" onSubmit={submit}>
        {mode === 'register' && <p class="muted small">For å lage en bruker trenger du en <b>invitasjonskode</b> fra Carl.</p>}
        <label class="small muted">Navn</label>
        {inp(name, setName, { autocomplete: 'username', placeholder: 'For eksempel Daniel', autocapitalize: 'words' })}
        <label class="small muted">PIN (4–8 siffer)</label>
        {inp(pin, setPin, { type: 'password', inputMode: 'numeric', pattern: '[0-9]*', autocomplete: mode === 'login' ? 'current-password' : 'new-password', placeholder: '••••' })}
        {mode === 'register' && <><label class="small muted">Invitasjonskode</label>{inp(code, setCode, { placeholder: 'Koden fra Carl', autocapitalize: 'none' })}</>}
        {err && <div class="status bad">{err}</div>}
        <button class="btn block" type="submit" disabled={busy || !name || !pin || (mode === 'register' && !code)}>{busy ? 'Vent litt...' : mode === 'login' ? 'Logg inn' : 'Lag bruker'}</button>
        {mode === 'register' && <p class="small muted" style={{ marginTop: '10px', marginBottom: 0 }}>Har du allerede øvd på denne enheten uten bruker, blir fremgangen tatt med inn i den nye brukeren.</p>}
      </form>
    </div>
  );
}
