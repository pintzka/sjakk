// Logg inn / registrer deg med invitasjonskode.
import { useState } from 'preact/hooks';
import { login, register, logout, useAccount } from '../lib/account';
import { TopBar, LogoMark, IconLock } from '../ui';

// Skjemaet brukes både på kontosiden og i innloggingsvinduet som vises før man har logget inn.
export function AuthForm({ start = 'login' }: { start?: 'login' | 'register' }) {
  const [mode, setMode] = useState<'login' | 'register'>(start);
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: Event) {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      if (mode === 'login') await login(name.trim(), pin); else await register(code.trim(), name.trim(), pin);
      location.hash = '#/';
    } catch (ex) { setErr((ex as Error).message); }
    setBusy(false);
  }
  const inp = (v: string, set: (s: string) => void, props: Record<string, unknown>) => (
    <input type="text" value={v} onInput={(e) => set((e.target as HTMLInputElement).value)} style={{ margin: '4px 0 12px' }} {...props} />
  );
  return (
    <>
      <div class="tabs" style={{ marginBottom: '12px' }}>
        <button type="button" class={`tab ${mode === 'login' ? 'on' : ''}`} onClick={() => { setMode('login'); setErr(''); }}>Logg inn</button>
        <button type="button" class={`tab ${mode === 'register' ? 'on' : ''}`} onClick={() => { setMode('register'); setErr(''); }}>Ny bruker</button>
      </div>
      <form onSubmit={submit}>
        {mode === 'register' && <p class="muted small" style={{ marginTop: 0 }}>For å lage en bruker trenger du en <b>invitasjonskode</b> fra Carl.</p>}
        <label class="small muted">Navn</label>
        {inp(name, setName, { autocomplete: 'username', placeholder: 'For eksempel Daniel', autocapitalize: 'words' })}
        <label class="small muted">PIN (4–8 siffer)</label>
        {inp(pin, setPin, { type: 'password', inputMode: 'numeric', pattern: '[0-9]*', autocomplete: mode === 'login' ? 'current-password' : 'new-password', placeholder: '••••' })}
        {mode === 'register' && <><label class="small muted">Invitasjonskode</label>{inp(code, setCode, { placeholder: 'Koden fra Carl', autocapitalize: 'none' })}</>}
        {err && <div class="status bad">{err}</div>}
        <button class="btn block" type="submit" disabled={busy || !name.trim() || !pin || (mode === 'register' && !code.trim())}>{busy ? 'Vent litt...' : mode === 'login' ? 'Logg inn' : 'Lag bruker'}</button>
      </form>
    </>
  );
}

// Vinduet som ligger over en uskarp forside til man har logget inn.
export function LoginGate() {
  return (
    <div class="modal-bg gate-bg">
      <div class="modal gate" role="dialog" aria-modal="true" aria-labelledby="gate-title">
        <div class="center" style={{ marginBottom: '14px' }}>
          <LogoMark size={64} />
          <h1 id="gate-title" style={{ margin: '10px 0 4px' }}>Velkommen til Rokade</h1>
          <p class="muted" style={{ margin: 0 }}>Lær sjakk med leksjoner, oppgaver, åpninger og partier mot boter og venner.</p>
        </div>
        <AuthForm />
        <div class="gate-lock small muted"><IconLock size={16} /> Alt annet er låst til du har logget inn. Poeng og fremgang lagres på brukeren din, så du kan bytte mellom mobil og PC.</div>
      </div>
    </div>
  );
}

export function Account() {
  const acc = useAccount();
  if (acc) return (
    <div>
      <TopBar title="Konto" back="#/meg" />
      <div class="card">
        <h2>Logget inn som {acc.name}</h2>
        <p class="muted">Poeng og fremgang lagres på serveren, så du kan bruke Rokade på mobil, nettbrett og PC.</p>
        <button class="btn secondary block" onClick={async () => { await logout(); location.hash = '#/'; }}>Logg ut</button>
      </div>
    </div>
  );
  return (
    <div>
      <TopBar title="Konto" back="#/" />
      <div class="card"><AuthForm /></div>
    </div>
  );
}
