import { useProgress, today, goalOf, GOAL, GOAL_BONUS, weekPoints, weekId } from '../lib/store';
import { useAccount } from '../lib/account';
import { nextLesson } from './Journey';
import { useGamesBadge } from './Friends';
import { TopBar, XpBar, Flame, IconBolt, IconSwords, IconMap, IconQuiz, IconUser, IconTimer, IconTrophy } from '../ui';
import { RatingChart } from './Profile';
import { botById } from '../engine/bots';

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
      <div class="home-cols"><div>
      <div class="hero"><div class="label">{new Date().toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })}</div><h1>Hei{name ? `, ${name}` : ''}!</h1></div>
      <div class="card"><XpBar />
        <div class="mini-stats">
          <div><div class="mini-num row" style={{ gap: '3px' }}><Flame on={practicedToday} />{s.streak.count}</div><div class="label">På rad</div></div>
          <div><div class="mini-num">{Math.round(s.puzzleRating)}</div><div class="label">Oppgaver</div></div>
          <div><div class="mini-num">{Math.round(s.playRating)}</div><div class="label">Spill</div></div>
          <a href="#/tabell"><div class="mini-num">{weekPoints(s)}</div><div class="label">Poeng uke {+weekId().split('-W')[1]}</div></a>
        </div>
        {!practicedToday && s.streak.count > 0 && <div class="small" style={{ marginTop: '6px', color: 'var(--gold)' }}>Løs én oppgave i dag for å holde streaken!</div>}
      </div>

      <GoalCard />
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
        <div class="row"><IconBolt /><div class="grow"><b>Dagens oppgave</b><div class="small muted">{dailyDone ? 'Løst i dag. Ny i morgen!' : 'Løs den for +25 XP og +10 poeng'}</div></div>{dailyDone && <span class="chip" style={{ color: 'var(--good)' }}>Ferdig</span>}</div>
      </a>

      </div><div>
      <div class="grid2 home-tiles">
        <a href="#/oppgaver" class="card click"><IconBolt /><div><b>Taktikk</b></div><div class="small muted">{due ? `${due} til repetisjon` : 'Finn beste trekk'}</div></a>
        <a href="#/spill" class="card click"><IconSwords /><div><b>Spill</b></div><div class="small muted">Mot boter eller venner</div></a>
        <a href="#/reise" class="card click"><IconMap /><div><b>Leksjoner</b></div><div class="small muted">{Object.keys(s.lessons).length} fullført</div></a>
        <a href="#/quiz" class="card click"><IconQuiz /><div><b>Quiz</b></div><div class="small muted">Rask trening</div></a>
        <a href="#/lyn" class="card click"><IconTimer /><div><b>Lynrunde</b></div><div class="small muted">{s.rush.best ? `Rekord: ${s.rush.best}` : '3 minutter, 3 liv'}</div></a>
        <a href="#/tabell" class="card click"><IconTrophy /><div><b>Tabell</b></div><div class="small muted">Hvem leder denne uka?</div></a>
      </div>
      <div class="card desktop-only"><div class="label" style={{ marginBottom: '6px' }}>Ratingen din</div><RatingChart data={s.ratingHistory} /></div>
      {s.games.length > 0 && (
        <div class="card desktop-only">
          <div class="label" style={{ marginBottom: '6px' }}>Siste partier</div>
          {s.games.slice(0, 5).map((g, i) => (
            <div key={i} class="row small" style={{ padding: '3px 0' }}>
              <span class="grow">{g.bot === 'venn' ? 'Mot venn' : `Mot ${botById(g.bot).name}`} · {g.date}</span>
              <b style={{ color: g.result === 'win' ? 'var(--good)' : g.result === 'loss' ? 'var(--bad)' : 'var(--muted)' }}>{g.result === 'win' ? 'Seier' : g.result === 'loss' ? 'Tap' : 'Remis'}</b>
            </div>
          ))}
        </div>
      )}
      </div></div>
    </div>
  );
}

function GoalCard() {
  const s = useProgress();
  const g = goalOf(s);
  const items = [
    { label: 'Løs oppgaver', n: g.puzzles, of: GOAL.puzzles, href: '#/oppgaver' },
    { label: 'Spill et parti', n: g.games, of: GOAL.games, href: '#/spill' },
    { label: 'Leksjon eller quiz', n: g.lessons, of: GOAL.lessons, href: '#/reise' },
  ];
  return (
    <div class={`card goal ${g.done ? 'done' : ''}`}>
      <div class="row" style={{ marginBottom: '6px' }}><span class="label grow">Dagens mål</span><span class="small muted">{g.done ? `Nådd! +${GOAL_BONUS} poeng` : `+${GOAL_BONUS} poeng når alt er gjort`}</span></div>
      {items.map((it) => {
        const ok = it.n >= it.of;
        return (
          <a key={it.label} href={it.href} class={`goal-item ${ok ? 'ok' : ''}`}>
            <span class="goal-check">{ok ? '✓' : ''}</span>
            <span class="grow">{it.label}</span>
            <span class="small muted">{Math.min(it.n, it.of)}/{it.of}</span>
            <span class="goal-bar"><i style={{ width: `${Math.min(100, (it.n / it.of) * 100)}%` }} /></span>
          </a>
        );
      })}
    </div>
  );
}
