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
      {ISLANDS.map((isl, idx) => <IslandCard key={isl.id} island={isl} idx={idx} s={s} />)}
      <div class="island" style={{ background: 'linear-gradient(135deg,#3a2a6b,#120c26)', color: '#fff' }}>
        <h2>Sluttbossen</h2>
        <div class="boss">
          <Avatar piece={kare.piece} color={kare.color} size={52} />
          <div class="grow"><b>{kare.name}</b><div class="small" style={{ opacity: .8 }}>ca. {kare.elo} · Slå ham for å bli sjakkonge</div></div>
          <a class="btn gold small" href="#/spill">Utfordre</a>
        </div>
      </div>
    </div>
  );
}

function IslandCard({ island, idx, s }: { island: Island; idx: number; s: Progress }) {
  const open = islandUnlocked(s, idx);
  const boss = botById(island.boss);
  const bossBeaten = (s.bots[boss.id]?.w ?? 0) > 0;
  return (
    <div class={`island ${open ? '' : 'locked'}`} style={{ background: island.color, color: '#fff' }}>
      <h2>{!open && <IconLock />}{island.name}</h2>
      <div class="small" style={{ opacity: .85 }}>{open ? island.desc : `Slå ${botById(ISLANDS[idx - 1].boss).name} eller fullfør 70 % av ${ISLANDS[idx - 1].name} for å åpne.`}</div>
      {open && (
        <>
          <div class="lessons">
            {island.lessons.map((l, k) => {
              const st = s.lessons[l.id]?.stars ?? 0;
              return (
                <a key={l.id} href={`#/leksjon/${l.id}`} class={`lesson-dot ${st ? 'done' : ''}`} style={{ textDecoration: 'none' }}>
                  <span class="num">{k + 1}</span>
                  <span>{l.title}</span>
                  <span class="stars">{'★'.repeat(st)}{'☆'.repeat(3 - st)}</span>
                </a>
              );
            })}
          </div>
          <div class="boss">
            <Avatar piece={boss.piece} color={boss.color} size={46} />
            <div class="grow"><b>Boss: {boss.name}</b><div class="small" style={{ opacity: .8 }}>{bossBeaten ? 'Slått! Neste øy er åpen.' : `ca. ${boss.elo} · Slå bossen for å åpne neste øy`}</div></div>
            <a class={`btn small ${bossBeaten ? 'secondary' : 'gold'}`} href="#/spill">{bossBeaten ? 'Igjen' : 'Spill'}</a>
          </div>
        </>
      )}
    </div>
  );
}
