import { useProgress, today } from '../lib/store';
import { useAccount } from '../lib/account';
import { nextLesson } from './Journey';
import { useGamesBadge } from './Friends';
import { TopBar, XpBar, Flame, IconBolt, IconSwords, IconMap, IconQuiz, IconUser } from '../ui';

export function Home() {
  const s = useProgress();
  const acc = useAccount();
  const nl = nextLesson(s);
  const friendTurns = useGamesBadge();
  const due = s.review.filter((r) => r.due <= today()).length;
  const dailyDone = !!s.daily[today()];
  const practicedToday = s.streak.lastDay === today();
  const name = s.name || acc?.name;
  return (
    <div>
      <TopBar />
      <div class="hero"><div class="label">{new Date().toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })}</div><h1>Hei{name ? `, ${name}` : ''}!</h1></div>
      <div class="card"><XpBar />
        <div class="row small" style={{ marginTop: '10px', gap: '14px' }}>
          <span class="row" style={{ gap: '4px' }}><Flame on={practicedToday} /> {s.streak.count} {s.streak.count === 1 ? 'dag' : 'dager'} på rad</span>
          <span class="muted">Oppgaver {Math.round(s.puzzleRating)} · Spill {Math.round(s.playRating)}</span>
        </div>
        {!practicedToday && s.streak.count > 0 && <div class="small" style={{ marginTop: '6px', color: 'var(--gold)' }}>Løs én oppgave i dag for å holde streaken!</div>}
      </div>

      {!acc && (
        <a href="#/konto" class="card click accent">
          <div class="row"><IconUser /><div class="grow"><b>Lag bruker eller logg inn</b><div class="small muted">Lagre fremgangen og spill mot venner</div></div></div>
        </a>
      )}
      {friendTurns > 0 && (
        <a href="#/venner" class="card click goodline">
          <div class="row"><IconSwords /><div class="grow"><b>{friendTurns === 1 ? 'Et parti venter på deg' : `${friendTurns} partier venter på deg`}</b><div class="small muted">Mot venner</div></div></div>
        </a>
      )}

      {nl && (
        <a href={`#/leksjon/${nl.lesson.id}`} class="island" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
          <div class="island-head" style={{ background: nl.island.color }}>
            <div class="grow"><div class="label">Fortsett reisen · {nl.island.name}</div><h2>{nl.lesson.title}</h2></div>
            <span class="btn small" style={{ background: '#fbf9f4', color: '#1f1d1a', borderColor: '#fbf9f4' }}>Start</span>
          </div>
        </a>
      )}

      <a href="#/dagens" class={`card click ${dailyDone ? '' : 'goldline'}`}>
        <div class="row"><IconBolt /><div class="grow"><b>Dagens oppgave</b><div class="small muted">{dailyDone ? 'Løst i dag. Ny i morgen!' : 'Løs den for +25 ekstra XP'}</div></div>{dailyDone && <span class="chip" style={{ color: 'var(--good)' }}>Ferdig</span>}</div>
      </a>

      <div class="grid2">
        <a href="#/oppgaver" class="card click"><IconBolt /><div><b>Taktikk</b></div><div class="small muted">{due ? `${due} til repetisjon` : 'Finn beste trekk'}</div></a>
        <a href="#/spill" class="card click"><IconSwords /><div><b>Spill</b></div><div class="small muted">Mot boter eller venner</div></a>
        <a href="#/reise" class="card click"><IconMap /><div><b>Leksjoner</b></div><div class="small muted">{Object.keys(s.lessons).length} fullført</div></a>
        <a href="#/quiz" class="card click"><IconQuiz /><div><b>Quiz</b></div><div class="small muted">Rask trening</div></a>
      </div>
    </div>
  );
}
