import { useMemo } from 'react';
import type { CardFace } from '../engine/types';
import { useGame, OBJECTIVES, MAX_FREE_PACKS, FREE_PACK_INTERVAL } from '../store/game';
import { useUi } from '../store/ui';
import { useNow, formatDuration, timeAgo } from '../hooks/useNow';
import { ATHLETES } from '../data/athletes';
import { RARITIES, RARITY_ORDER, RECORD_START, rarityOf } from '../engine/cards';
import { FREE_PACK } from '../engine/packs';
import { PackArt } from '../components/PackArt';
import { Landscape } from '../components/PackScene';
import { HERO_SCENE } from '../art/scenes';
import { Card } from '../components/Card';
import { Balles } from '../components/Balles';
import { sfx } from '../audio/sfx';

// Ce qu'on peut décrocher : une légende et son record, le roi des animaux, une Icône en version Prime.
const SHOWCASE: CardFace[] = [
  { athleteId: 'guepard', variant: 'base', record: RECORD_START },
  { athleteId: 'lion', variant: 'base' },
  { athleteId: 't-rex', variant: 'prime' },
];

function Showcase() {
  const openDetail = useUi((s) => s.openDetail);
  return (
    <figure className="showcase">
      <div className="showcase__fan">
        {SHOWCASE.map((card) => (
          <div key={card.athleteId} className="showcase__slot">
            <Card card={card} size="sm" tilt onClick={() => openDetail({ card })} />
          </div>
        ))}
      </div>
      <figcaption>À décrocher : légendaires, Icônes et versions Prime</figcaption>
    </figure>
  );
}

function FreePackHero() {
  const freePacks = useGame((s) => s.freePacks);
  const nextFreePackAt = useGame((s) => s.nextFreePackAt);
  const openFreePack = useGame((s) => s.openFreePack);
  const now = useNow(1000);
  const full = freePacks >= MAX_FREE_PACKS;
  const progress = full ? 1 : 1 - Math.max(0, nextFreePackAt - now) / FREE_PACK_INTERVAL;

  return (
    <section className="hero" aria-labelledby="hero-title">
      <Landscape className="hero__art" scene={HERO_SCENE} seed="accueil" />
      <div className="hero__pack">
        <PackArt tone="bronze" name={FREE_PACK.name} size={FREE_PACK.size} className={freePacks > 0 ? 'is-ready' : ''} />
        {freePacks > 0 && <span className="hero__count">×{freePacks}</span>}
      </div>
      <div className="hero__text">
        <p className="eyebrow">Booster gratuit · 5 cartes</p>
        <h1 id="hero-title">
          {freePacks > 0 ? (
            <>
              {freePacks} booster{freePacks > 1 ? 's' : ''} t’attend{freePacks > 1 ? 'ent' : ''}
            </>
          ) : (
            <>Prochain booster dans {formatDuration(nextFreePackAt - now)}</>
          )}
        </h1>
        <p className="hero__sub">
          Un nouveau booster toutes les 10 minutes, jusqu’à {MAX_FREE_PACKS} en réserve. Plus une espèce est célèbre, plus sa carte est rare.
        </p>
        <div className="hero__timer" aria-label={full ? 'Réserve pleine' : `Prochain booster dans ${formatDuration(nextFreePackAt - now)}`}>
          <div className="meter">
            <div className="meter__fill" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <span>{full ? 'Réserve pleine : ouvre un booster pour relancer le compteur' : `+1 dans ${formatDuration(nextFreePackAt - now)}`}</span>
        </div>
        <button
          type="button"
          className="btn btn--primary btn--xl"
          disabled={freePacks <= 0}
          onClick={() => {
            sfx.whoosh();
            openFreePack();
          }}
        >
          Ouvrir un booster
        </button>
      </div>
      <Showcase />
    </section>
  );
}

function CollectionSummary() {
  const discovered = useGame((s) => s.discovered);
  const bestPull = useGame((s) => s.stats.bestPull);
  const collection = useGame((s) => s.collection);
  const openDetail = useUi((s) => s.openDetail);
  const setTab = useUi((s) => s.setTab);

  const perRarity = useMemo(() => {
    const totals = Object.fromEntries(RARITY_ORDER.map((id) => [id, { owned: 0, total: 0 }])) as Record<string, { owned: number; total: number }>;
    for (const athlete of ATHLETES) {
      const entry = totals[rarityOf(athlete).id];
      entry.total += 1;
      if (discovered[athlete.id]) entry.owned += 1;
    }
    return totals;
  }, [discovered]);

  const owned = Object.keys(discovered).length;
  return (
    <section className="panel summary" aria-labelledby="summary-title">
      <div className="summary__head">
        <h2 id="summary-title">Ta collection</h2>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setTab('collection')}>
          Voir l’album
        </button>
      </div>
      <div className="summary__body">
        {bestPull ? (
          <div className="summary__best">
            <Card card={bestPull} size="sm" onClick={() => openDetail({ card: bestPull })} />
            <span className="summary__best-label">Meilleure trouvaille</span>
          </div>
        ) : (
          <p className="muted">Ouvre ton premier booster pour commencer ta collection.</p>
        )}
        <div className="summary__stats">
          <div className="bigstat">
            <b>
              {owned}
              <small> / {ATHLETES.length}</small>
            </b>
            <span>espèces découvertes · {collection.length} cartes</span>
          </div>
          <ul className="rarity-list">
            {RARITY_ORDER.slice()
              .reverse()
              .map((id) => (
                <li key={id} className={`rarity-row rarity-row--${id}`}>
                  <span className="rarity-dot" />
                  <span className="rarity-row__name">{RARITIES[id].name}</span>
                  <span className="rarity-row__count">
                    {perRarity[id].owned}/{perRarity[id].total}
                  </span>
                  <span className="meter meter--thin">
                    <span className="meter__fill" style={{ width: `${(perRarity[id].owned / perRarity[id].total) * 100}%` }} />
                  </span>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Objectives() {
  const state = useGame();
  const claim = useGame((s) => s.claimObjective);
  const list = OBJECTIVES.filter((o) => !state.claimed.includes(o.id)).slice(0, 5);
  return (
    <section className="panel" aria-labelledby="obj-title">
      <h2 id="obj-title">Objectifs</h2>
      {list.length === 0 && <p className="muted">Tous les objectifs sont remplis. Chapeau.</p>}
      <ul className="objectives">
        {list.map((objective) => {
          const [done, total] = objective.progress(state);
          const complete = done >= total;
          return (
            <li key={objective.id} className={`objective${complete ? ' is-complete' : ''}`}>
              <div className="objective__text">
                <span>{objective.title}</span>
                <span className="meter meter--thin">
                  <span className="meter__fill" style={{ width: `${(done / total) * 100}%` }} />
                </span>
              </div>
              <span className="objective__progress">
                {done}/{total}
              </span>
              {complete ? (
                <button type="button" className="btn btn--gold btn--sm" onClick={() => claim(objective.id)}>
                  Récupérer <Balles value={objective.reward} />
                </button>
              ) : (
                <Balles value={objective.reward} className="objective__reward" />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function MarketNewsPanel() {
  const news = useGame((s) => s.market.news);
  const setTab = useUi((s) => s.setTab);
  const now = useNow(15_000);
  return (
    <section className="panel" aria-labelledby="news-title">
      <div className="summary__head">
        <h2 id="news-title">Actu du marché</h2>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setTab('mercato')}>
          Ouvrir le marché
        </button>
      </div>
      {news.length === 0 ? (
        <p className="muted">Le marché s’éveille. Les premières tendances arrivent dans quelques minutes.</p>
      ) : (
        <ul className="news">
          {news.slice(0, 5).map((item) => (
            <li key={item.id} className={item.factor >= 1 ? 'is-up' : 'is-down'}>
              <span className="news__arrow" aria-hidden="true">
                {item.factor >= 1 ? '▲' : '▼'}
              </span>
              <span className="news__text">{item.text}</span>
              <time className="news__time">{timeAgo(item.at, now)}</time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RecentPulls() {
  const collection = useGame((s) => s.collection);
  const openDetail = useUi((s) => s.openDetail);
  const recent = collection.slice(-8).reverse();
  if (!recent.length) return null;
  return (
    <section className="panel" aria-labelledby="recent-title">
      <h2 id="recent-title">Dernières cartes</h2>
      <div className="card-row">
        {recent.map((card) => (
          <Card key={card.uid} card={card} size="xs" onClick={() => openDetail({ card })} />
        ))}
      </div>
    </section>
  );
}

export function HomeScreen() {
  return (
    <div className="screen screen--home">
      <FreePackHero />
      <div className="grid-2">
        <CollectionSummary />
        <Objectives />
      </div>
      <RecentPulls />
      <MarketNewsPanel />
      <p className="footnote">
        Les notes et stats sont une interprétation de jeu. {ATHLETES.filter((a) => !a.mythe).length} espèces, dont {ATHLETES.filter((a) => a.retired).length} Icônes (espèces disparues),
        et {ATHLETES.filter((a) => a.mythe).length} cartes Mythe. Photos libres de Wikimedia Commons et de Pixabay (dont des illustrations réalistes pour les espèces disparues et les créatures), auteurs crédités dans la fiche de chaque carte.
      </p>
    </div>
  );
}
