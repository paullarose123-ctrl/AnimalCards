import { useMemo, type CSSProperties, type PointerEvent } from 'react';
import type { CardFace } from '../engine/types';
import { useGame, OBJECTIVES, MAX_FREE_PACKS, FREE_PACK_INTERVAL } from '../store/game';
import { useUi } from '../store/ui';
import { useNow, formatDuration, timeAgo } from '../hooks/useNow';
import { ATHLETES } from '../data/athletes';
import { RARITIES, RARITY_ORDER, rarityOf } from '../engine/cards';
import { FREE_PACK } from '../engine/packs';
import { PackArt } from '../components/PackArt';
import { Landscape } from '../components/PackScene';
import { HERO_SCENE } from '../art/scenes';
import { Card } from '../components/Card';
import { CardBackMexique } from '../components/CardBackMexique';
import { NEXT_SERIES, SERIES } from '../engine/packs';
import { Balles } from '../components/Balles';
import { sfx } from '../audio/sfx';
import { useAccount } from '../store/account';
import { accountsEnabled } from '../account/supabase';

// Ce qu'on peut décrocher : une légende, le roi des animaux, une Icône en version Prime (éventail fixe).
const SHOWCASE: CardFace[] = [
  { athleteId: 'guepard', variant: 'base' },
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

/** Invitation à créer un compte, tant que le joueur joue en invité. */
function AccountInvite() {
  const guest = useAccount((s) => !s.session);
  const packsOpened = useGame((s) => s.stats.packsOpened);
  const setTab = useUi((s) => s.setTab);
  if (!guest || !accountsEnabled()) return null;
  return (
    <section className="panel invite" aria-labelledby="invite-title">
      <div>
        <h2 id="invite-title">Garde ta collection pour toujours</h2>
        <p className="muted">
          {packsOpened > 0
            ? 'Crée un compte avec un pseudo et un mot de passe : ta progression sera sauvegardée et tu la retrouveras partout.'
            : 'Un pseudo, un mot de passe, et ta progression est sauvegardée : tu la retrouves sur n’importe quel appareil.'}
        </p>
      </div>
      <button type="button" className="btn btn--primary" onClick={() => setTab('profil')}>
        Créer mon compte
      </button>
    </section>
  );
}

/** Le booster de l'accueil s'incline en 3D vers la souris. */
function tiltHero(event: PointerEvent<HTMLElement>) {
  if (event.pointerType !== 'mouse') return;
  const rect = event.currentTarget.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - 0.5;
  const y = (event.clientY - rect.top) / rect.height - 0.5;
  event.currentTarget.style.setProperty('--hx', `${(-y * 18).toFixed(2)}deg`);
  event.currentTarget.style.setProperty('--hy', `${(x * 30).toFixed(2)}deg`);
}

function untiltHero(event: PointerEvent<HTMLElement>) {
  event.currentTarget.style.setProperty('--hx', '0deg');
  event.currentTarget.style.setProperty('--hy', '0deg');
}

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** Extensions : la série en cours, la prochaine (consacrée à un pays) et son compte à rebours. */
function ExpansionBanner() {
  const now = useNow(1000);
  const release = NEXT_SERIES.release;
  const left = Math.max(0, release.getTime() - now);
  const days = Math.floor(left / 86_400_000);
  const hours = Math.floor((left % 86_400_000) / 3_600_000);
  const minutes = Math.floor((left % 3_600_000) / 60_000);
  const seconds = Math.floor((left % 60_000) / 1000);
  const timeline = [
    { serie: SERIES.number, label: 'disponible', state: 'live' },
    { serie: NEXT_SERIES.number, label: MONTHS[release.getMonth()], state: 'next' },
    { serie: NEXT_SERIES.number + 1, label: 'bientôt', state: 'later' },
  ];
  const species = ATHLETES.filter((a) => !a.habitat).length;
  return (
    <section className="expansion" aria-labelledby="expansion-title">
      <div className="expansion__glow" aria-hidden="true" />
      <div className="expansion__text">
        <p className="eyebrow">Extensions</p>
        <h2 id="expansion-title">La Série {NEXT_SERIES.number} arrive en {MONTHS[release.getMonth()]}</h2>
        <p className="expansion__sub">
          La <b>Série {SERIES.number} · {SERIES.name}</b> est disponible : {species} espèces des quatre coins de la planète, {ATHLETES.filter((a) => a.habitat).length} Habitats et{' '}
          {ATHLETES.filter((a) => a.retired).length} Icônes. Les prochaines séries partiront chacune à la découverte d’un pays : ses espèces, ses habitats et
          son booster.
        </p>
        <div className="expansion__countdown" aria-label={`Série ${NEXT_SERIES.number} dans ${days} jours et ${hours} heures`}>
          <span className="expansion__next">Série {NEXT_SERIES.number} · le 1er {MONTHS[release.getMonth()]}</span>
          <div className="countdown">
            {[
              [days, 'jours'],
              [hours, 'h'],
              [minutes, 'min'],
              [seconds, 's'],
            ].map(([value, unit]) => (
              <span key={unit} className="countdown__cell">
                <b>{String(value).padStart(2, '0')}</b>
                <small>{unit}</small>
              </span>
            ))}
          </div>
        </div>
        <ol className="expansion__timeline">
          {timeline.map((step) => (
            <li key={step.serie} className={`is-${step.state}`}>
              <i aria-hidden="true" />
              <b>Série {step.serie}</b>
              <span>{step.label}</span>
            </li>
          ))}
        </ol>
      </div>
      {/* les dos de cartes de la prochaine série : le Mexique */}
      <div className="expansion__teaser" aria-hidden="true">
        <div className="expansion__card expansion__card--1">
          <CardBackMexique />
        </div>
        <div className="expansion__card expansion__card--2">
          <CardBackMexique />
        </div>
        <div className="expansion__card expansion__card--3">
          <CardBackMexique />
        </div>
      </div>
    </section>
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
    <section className="hero" aria-labelledby="hero-title" onPointerMove={tiltHero} onPointerLeave={untiltHero}>
      <Landscape className="hero__art" scene={HERO_SCENE} seed="accueil" />
      <div className="hero__pack">
        <div className="hero__tilt">
          <PackArt tone="bronze" name={FREE_PACK.name} title={SERIES.name} size={FREE_PACK.size} className={freePacks > 0 ? 'is-ready' : ''} />
        </div>
        {/* les boosters en réserve : des sachets empilés derrière, et une pastille par booster dessous */}
        {freePacks > 1 && <span className="hero__ghost hero__ghost--1" aria-hidden="true" />}
        {freePacks > 2 && <span className="hero__ghost hero__ghost--2" aria-hidden="true" />}
        <div className="hero__pips" role="img" aria-label={`${freePacks} booster${freePacks > 1 ? 's' : ''} sur ${MAX_FREE_PACKS}`}>
          {Array.from({ length: MAX_FREE_PACKS }, (_, i) => (
            <i
              key={i}
              className={i < freePacks ? 'is-full' : i === freePacks ? 'is-next' : ''}
              style={i === freePacks ? ({ ['--fill' as string]: `${Math.round(progress * 100)}%` } as CSSProperties) : undefined}
            />
          ))}
        </div>
      </div>
      <div className="hero__text">
        <p className="eyebrow">Série {SERIES.number} · {SERIES.name} · booster gratuit</p>
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
          Un nouveau booster toutes les {FREE_PACK_INTERVAL / 60_000} minutes, jusqu’à {MAX_FREE_PACKS} en réserve. Plus une espèce est célèbre, plus sa carte est rare.
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
      <ExpansionBanner />
      <AccountInvite />
      <div className="grid-2">
        <CollectionSummary />
        <Objectives />
      </div>
      <RecentPulls />
      <MarketNewsPanel />
      <p className="footnote">
        Mesures, populations et anecdotes réelles (estimations arrondies). {ATHLETES.filter((a) => !a.habitat).length} espèces, dont {ATHLETES.filter((a) => a.retired).length} Icônes (espèces disparues),
        et {ATHLETES.filter((a) => a.habitat).length} cartes Habitat. Photos libres de Wikimedia Commons, iNaturalist, Unsplash et Pixabay (dont des illustrations réalistes pour les dinosaures et la préhistoire), auteurs crédités dans la fiche de chaque carte.
      </p>
    </div>
  );
}
