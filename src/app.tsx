import { useEffect, useState } from 'preact/hooks';
import { useProgress } from './lib/store';
import { Home } from './pages/Home';
import { Journey } from './pages/Journey';
import { Lesson } from './pages/Lesson';
import { Puzzles } from './pages/Puzzles';
import { Play } from './pages/Play';
import { Friends, FriendGame, useGamesBadge } from './pages/Friends';
import { QuizList, Quiz } from './pages/Quiz';
import { Profile } from './pages/Profile';
import { Account } from './pages/Account';
import { Placement } from './pages/Placement';
import { Toasts, IconHome, IconMap, IconBolt, IconSwords, IconUser } from './ui';

function useHash() {
  const [h, setH] = useState(location.hash);
  useEffect(() => {
    const f = () => { setH(location.hash); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return h.replace(/^#\/?/, '');
}

export function App() {
  const s = useProgress();
  const route = useHash();
  const [page, arg] = [route.split('/')[0], route.split('/').slice(1).join('/')];
  const turns = useGamesBadge();
  // Holder nivåtesten åpen til resultatet er vist, selv om placementDone allerede er lagret
  const [placing, setPlacing] = useState(false);

  let view;
  if ((!s.placementDone || placing) && (page === '' || page === 'reise')) view = <Placement onStart={() => setPlacing(true)} onClose={() => setPlacing(false)} />;
  else switch (page) {
    case 'reise': view = <Journey />; break;
    case 'leksjon': view = <Lesson key={arg} id={arg} />; break;
    case 'oppgaver': view = <Puzzles />; break;
    case 'dagens': view = <Puzzles key="daily" daily />; break;
    case 'spill': view = <Play key={arg || 'list'} botId={arg || undefined} />; break;
    case 'venner': view = <Friends />; break;
    case 'venn': view = <FriendGame key={arg} id={arg} />; break;
    case 'quiz': view = arg ? <Quiz key={arg} id={arg} /> : <QuizList />; break;
    case 'meg': view = <Profile />; break;
    case 'konto': view = <Account />; break;
    default: view = <Home />;
  }
  const hideNav = page === 'leksjon';
  const nav = [
    { href: '#/', icon: <IconHome />, label: 'Hjem', on: page === '' },
    { href: '#/reise', icon: <IconMap />, label: 'Reise', on: ['reise', 'leksjon', 'quiz'].includes(page) },
    { href: '#/oppgaver', icon: <IconBolt />, label: 'Oppgaver', on: page === 'oppgaver' || page === 'dagens' },
    { href: '#/spill', icon: <IconSwords />, label: 'Spill', on: ['spill', 'venner', 'venn'].includes(page), badge: turns },
    { href: '#/meg', icon: <IconUser />, label: 'Meg', on: page === 'meg' || page === 'konto' },
  ];
  return (
    <>
      <Toasts />
      <div class={`app ${hideNav ? 'nonav' : ''}`}>{view}</div>
      {!hideNav && (
        <nav class="nav"><div class="nav-inner">
          <a href="#/" class="nav-brand">Sjakkreisen</a>
          {nav.map((n) => (
            <a key={n.href} href={n.href} class={n.on ? 'active' : ''} style={{ position: 'relative' }}>
              {n.icon}{n.label}
              {!!n.badge && <span style={{ position: 'absolute', top: '4px', left: '55%', background: 'var(--bad)', color: '#fff', borderRadius: '99px', fontSize: '.65rem', padding: '1px 6px' }}>{n.badge}</span>}
            </a>
          ))}
        </div></nav>
      )}
    </>
  );
}
