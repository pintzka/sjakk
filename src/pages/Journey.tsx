// Sjakkreisen: øyer med leksjoner og en boss på hver øy.
import { ISLANDS, ALL_LESSONS, type Island } from '../data/lessons';
import { botById, BOTS } from '../engine/bots';
import { useProgress, type Progress } from '../lib/store';
import { TopBar, Avatar, IconLock, StarIcon, IconQuiz } from '../ui';

export function islandUnlocked(s: Progress, idx: number) {
  if (idx === 0) return true;
  const prev = ISLANDS[idx - 1];
  const bossBeaten = (s.bots[prev.boss]?.w ?? 0) > 0;
  const doneShare = prev.lessons.filter((l) => s.lessons[l.id]).length / prev.lessons.length;
  return bossBeaten || doneShare >= 0.7;
}

export function nextLesson(s: Progress) {
  for (let i = 0; i < ISLANDS.length; i++) {
    if (!islandUnlocked(s, i)) break;
    const l = ISLANDS[i].lessons.find((x) => !s.lessons[x.id]);
    if (l) return { lesson: l, island: ISLANDS[i] };
  }
  return null;
}

export function Journey() {
  const s = useProgress();
  const total = ALL_LESSONS.length;
  const done = ALL_LESSONS.filter((l) => s.lessons[l.id]).length;
  const starsSum = Object.values(s.lessons).reduce((a, l) => a + l.stars, 0);
  const kare = BOTS[BOTS.length - 1];
  return (
    <div>
      <TopBar title="Sjakkreisen" />
      <div class="row" style={{ marginBottom: '12px' }}>
        <span class="chip">Leksjoner {done}/{total}</span>
        <span class="chip"><StarIcon /> {starsSum}/{total * 3}</span>
        <a class="chip" href="#/quiz" style={{ textDecoration: 'none', color: 'inherit' }}><IconQuiz size={18} /> Quiz</a>
      </div>
      <div class="journey-grid">
      {ISLANDS.map((isl, idx) => <IslandCard key={isl.id} island={isl} idx={idx} s={s} />)}
      <div class="island">
        <div class="island-head" style={{ background: '#1f1d1a' }}><div><div class="label">Finalen</div><h2>Sluttbossen</h2></div></div>
        <div class="island-body">
          <div class="row">
            <Avatar piece={kare.piece} color={kare.color} size={50} />
            <div class="grow"><b>{kare.name}</b><div class="small muted">ca. {kare.elo} · Slå ham for å bli sjakkonge</div></div>
            <a class="btn gold small" href="#/spill">Utfordre</a>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

function IslandCard({ island, idx, s }: { island: Island; idx: number; s: Progress }) {
  const open = islandUnlocked(s, idx);
  const boss = botById(island.boss);
  const bossBeaten = (s.bots[boss.id]?.w ?? 0) > 0;
  const nextId = island.lessons.find((l) => !s.lessons[l.id])?.id;
  return (
    <div class={`island ${open ? '' : 'locked'}`}>
      <div class="island-head" style={{ background: island.color }}>
        <div class="grow"><div class="label">Øy {idx + 1}</div><h2>{island.name}</h2></div>
        {!open && <IconLock />}
      </div>
      <div class="island-body">
        <div class="small muted">{open ? island.desc : `Slå ${botById(ISLANDS[idx - 1].boss).name} eller fullfør 70 % av ${ISLANDS[idx - 1].name} for å åpne.`}</div>
        {open && (
          <>
            <div class="lessons">
              {island.lessons.map((l, k) => {
                const st = s.lessons[l.id]?.stars ?? 0;
                return (
                  <a key={l.id} href={`#/leksjon/${l.id}`} class={`lesson-dot ${st ? 'done' : ''} ${l.id === nextId ? 'next' : ''}`}>
                    <span class="num">{k + 1}</span>
                    <span>{l.title}</span>
                    <span class="marks">{[1, 2, 3].map((n) => <i key={n} class={n <= st ? 'on' : ''} />)}</span>
                  </a>
                );
              })}
            </div>
            <div class="boss">
              <Avatar piece={boss.piece} color={boss.color} size={44} />
              <div class="grow"><span class="label">Boss</span><div><b>{boss.name}</b></div><div class="small muted">{bossBeaten ? 'Slått! Neste øy er åpen.' : `ca. ${boss.elo} · Slå bossen for å åpne neste øy`}</div></div>
              <a class={`btn small ${bossBeaten ? 'secondary' : 'gold'}`} href="#/spill">{bossBeaten ? 'Igjen' : 'Spill'}</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
