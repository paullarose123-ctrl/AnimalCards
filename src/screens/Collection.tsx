import { useEffect, useMemo, useState } from 'react';
import { useGame, formatBalles } from '../store/game';
import { useUi } from '../store/ui';
import { ATHLETES, ATHLETES_BY_ID } from '../data/athletes';
import { SPORTS, SPORT_ORDER } from '../data/sports';
import { RARITIES, RARITY_ORDER, collectionNumber, displayName, quickSellValue, rarityOf, rarityScore } from '../engine/cards';
import type { OwnedCard, RarityId, SportId } from '../engine/types';
import { Card } from '../components/Card';
import { SportIcon } from '../components/SportIcon';
import { Landscape } from '../components/PackScene';
import { WorldMap } from '../components/WorldMap';
import { SCREEN_SCENES } from '../art/scenes';

type Sort = 'number' | 'rarity' | 'recent' | 'name';

// On n'affiche qu'une page de cartes à la fois : la base peut contenir des milliers d'espèces.
const PAGE = 120;

function MoreButton({ shown, total, onMore }: { shown: number; total: number; onMore: () => void }) {
  if (shown >= total) return null;
  return (
    <div className="more">
      <button type="button" className="btn btn--ghost" onClick={onMore}>
        Afficher plus ({(total - shown).toLocaleString('fr-FR')} restantes)
      </button>
    </div>
  );
}

interface Group {
  key: string;
  cards: OwnedCard[];
}

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function Club() {
  const collection = useGame((s) => s.collection);
  const team = useGame((s) => s.team);
  const quickSell = useGame((s) => s.quickSell);
  const openDetail = useUi((s) => s.openDetail);
  const [query, setQuery] = useState('');
  const [sport, setSport] = useState<SportId | ''>('');
  const [rarity, setRarity] = useState<RarityId | ''>('');
  const [sort, setSort] = useState<Sort>('number');
  const [dupesOnly, setDupesOnly] = useState(false);
  const [confirmDupes, setConfirmDupes] = useState(false);
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => setLimit(PAGE), [query, sport, rarity, sort, dupesOnly]);

  const groups = useMemo(() => {
    const map = new Map<string, Group>();
    for (const card of collection) {
      const key = `${card.athleteId}:${card.variant}`;
      const group = map.get(key) ?? { key, cards: [] };
      group.cards.push(card);
      map.set(key, group);
    }
    const q = normalize(query.trim());
    let list = [...map.values()].filter((group) => {
      const athlete = ATHLETES_BY_ID[group.cards[0].athleteId];
      if (sport && athlete.sport !== sport) return false;
      if (rarity && rarityOf(athlete).id !== rarity) return false;
      if (dupesOnly && group.cards.length < 2) return false;
      if (q && !normalize(`${displayName(athlete)} ${athlete.nick ?? ''} ${athlete.latin ?? ''}`).includes(q)) return false;
      return true;
    });
    const rank = (g: Group) => rarityOf(ATHLETES_BY_ID[g.cards[0].athleteId]).order * 1000 + (g.cards[0].variant === 'prime' ? 500 : g.cards[0].variant === 'reverse' ? 200 : 0) + rarityScore(ATHLETES_BY_ID[g.cards[0].athleteId]);
    list = list.sort((a, b) => {
      if (sort === 'number') return collectionNumber(ATHLETES_BY_ID[a.cards[0].athleteId]).localeCompare(collectionNumber(ATHLETES_BY_ID[b.cards[0].athleteId]));
      if (sort === 'rarity') return rank(b) - rank(a);
      if (sort === 'recent') return Math.max(...b.cards.map((c) => c.obtainedAt)) - Math.max(...a.cards.map((c) => c.obtainedAt));
      return ATHLETES_BY_ID[a.cards[0].athleteId].last.localeCompare(ATHLETES_BY_ID[b.cards[0].athleteId].last, 'fr');
    });
    return list;
  }, [collection, query, sport, rarity, sort, dupesOnly]);

  // doublons vendables : on garde toujours l'exemplaire le plus ancien, les cartes verrouillées et celles de l'équipe
  const extraCopies = useMemo(() => {
    const byKey = new Map<string, OwnedCard[]>();
    for (const card of collection) {
      const key = `${card.athleteId}:${card.variant}`;
      byKey.set(key, [...(byKey.get(key) ?? []), card]);
    }
    const extras: OwnedCard[] = [];
    for (const cards of byKey.values()) {
      const sorted = cards.slice().sort((a, b) => a.obtainedAt - b.obtainedAt);
      for (const card of sorted.slice(1)) if (!card.locked && !team.includes(card.uid)) extras.push(card);
    }
    return extras;
  }, [collection, team]);
  const extrasValue = extraCopies.reduce((sum, c) => sum + quickSellValue(ATHLETES_BY_ID[c.athleteId], c.variant), 0);

  if (!collection.length) {
    return (
      <div className="empty">
        <p>Ta réserve est vide pour l’instant.</p>
        <p className="muted">Ouvre un booster gratuit pour accueillir tes premiers animaux.</p>
      </div>
    );
  }

  return (
    <>
      <div className="filters" role="search">
        <label className="field field--grow">
          <span className="visually-hidden">Rechercher un animal</span>
          <input id="club-search" type="search" placeholder="Rechercher un animal" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <label className="field">
          <span className="visually-hidden">Famille</span>
          <select id="club-sport" value={sport} onChange={(e) => setSport(e.target.value as SportId | '')}>
            <option value="">Toutes les familles</option>
            {SPORT_ORDER.map((id) => (
              <option key={id} value={id}>
                {SPORTS[id].name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="visually-hidden">Rareté</span>
          <select id="club-rarity" value={rarity} onChange={(e) => setRarity(e.target.value as RarityId | '')}>
            <option value="">Toutes les raretés</option>
            {RARITY_ORDER.map((id) => (
              <option key={id} value={id}>
                {RARITIES[id].name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="visually-hidden">Trier</span>
          <select id="club-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="number">N° de collection</option>
            <option value="rarity">Plus rares</option>
            <option value="recent">Plus récentes</option>
            <option value="name">Nom</option>
          </select>
        </label>
        <label className="toggle">
          <input id="club-dupes" type="checkbox" checked={dupesOnly} onChange={(e) => setDupesOnly(e.target.checked)} />
          <span>Doublons</span>
        </label>
      </div>

      {extraCopies.length > 0 && (
        <div className="dupes-bar">
          <span>
            {extraCopies.length} doublon{extraCopies.length > 1 ? 's' : ''} vendable{extraCopies.length > 1 ? 's' : ''} au comptoir (un exemplaire de chaque carte est conservé).
          </span>
          {!confirmDupes ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmDupes(true)}>
              Vendre les doublons
            </button>
          ) : (
            <span className="btn-row">
              <button
                type="button"
                className="btn btn--gold btn--sm"
                onClick={() => {
                  quickSell(extraCopies.map((c) => c.uid));
                  setConfirmDupes(false);
                }}
              >
                Confirmer : +{formatBalles(extrasValue)}
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmDupes(false)}>
                Annuler
              </button>
            </span>
          )}
        </div>
      )}

      <p className="muted small">
        {groups.length} carte{groups.length > 1 ? 's' : ''} affichée{groups.length > 1 ? 's' : ''}
      </p>
      <div className="card-grid">
        {groups.slice(0, limit).map((group) => {
          const card = group.cards[0];
          return (
            <div key={group.key} className="card-cell">
              <Card card={card} size="sm" onClick={() => openDetail({ card })} />
              {group.cards.length > 1 && <span className="count-badge">×{group.cards.length}</span>}
              {group.cards.some((c) => team.includes(c.uid)) && <span className="team-badge">Équipe</span>}
              {group.cards.some((c) => c.locked) && (
                <span className="lock-badge" aria-label="Verrouillée">
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M4,7 V5 A4,4 0 0 1 12,5 V7 M3,7 H13 V14 H3 Z" />
                  </svg>
                </span>
              )}
            </div>
          );
        })}
      </div>
      <MoreButton shown={limit} total={groups.length} onMore={() => setLimit((l) => l + PAGE)} />
    </>
  );
}

/** Onglet des cartes Habitat dans l'album, après les familles. */
function HabitatTab({ active, done, onClick }: { active: boolean; done: number; onClick: () => void }) {
  const total = ATHLETES.filter((a) => a.habitat).length;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`sport-tab${active ? ' is-active' : ''}${done === total ? ' is-complete' : ''}`}
      onClick={onClick}
      style={{ ['--sport' as string]: '#e9c77b' }}
    >
      <svg className="sport-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 19 L9 9 L13 15 L16 11 L21 19 Z M15.5 6.5 A2 2 0 1 1 15.49 6.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" />
      </svg>
      <span>Habitats</span>
      <small>
        {done}/{total}
      </small>
    </button>
  );
}

function Album() {
  const discovered = useGame((s) => s.discovered);
  const collection = useGame((s) => s.collection);
  const openDetail = useUi((s) => s.openDetail);
  // une famille d'animaux, ou les cartes Habitat
  const [sport, setSport] = useState<SportId | 'habitats'>('felins');
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => setLimit(PAGE), [sport]);

  const athletes = useMemo(
    () =>
      // dans l'ordre des numéros de collection
      ATHLETES.filter((a) => (sport === 'habitats' ? !!a.habitat : a.sport === sport && !a.habitat)).sort((a, b) =>
        collectionNumber(a).localeCompare(collectionNumber(b)),
      ),
    [sport],
  );
  const owned = athletes.filter((a) => discovered[a.id]).length;

  return (
    <>
      <div className="sport-tabs" role="tablist" aria-label="Familles de l’album">
        {SPORT_ORDER.map((id) => {
          const all = ATHLETES.filter((a) => a.sport === id && !a.habitat);
          const done = all.filter((a) => discovered[a.id]).length;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={sport === id}
              className={`sport-tab${sport === id ? ' is-active' : ''}${done === all.length ? ' is-complete' : ''}`}
              onClick={() => setSport(id)}
              style={{ ['--sport' as string]: SPORTS[id].color }}
            >
              <SportIcon sport={id} />
              <span>{SPORTS[id].name}</span>
              <small>
                {done}/{all.length}
              </small>
            </button>
          );
        })}
        <HabitatTab active={sport === 'habitats'} done={ATHLETES.filter((a) => a.habitat && discovered[a.id]).length} onClick={() => setSport('habitats')} />
      </div>
      <div className="album-head">
        <h2>
          {sport === 'habitats' ? 'Habitats' : SPORTS[sport].name} <small>{owned}/{athletes.length}</small>
        </h2>
        <span className="meter">
          <span className="meter__fill" style={{ width: `${(owned / athletes.length) * 100}%` }} />
        </span>
      </div>
      <div className="card-grid card-grid--album">
        {athletes.slice(0, limit).map((athlete) => {
          const have = !!discovered[athlete.id];
          const mine = collection.find((c) => c.athleteId === athlete.id);
          const card = mine ?? { athleteId: athlete.id, variant: 'base' as const };
          return (
            <div key={athlete.id} className="card-cell">
              <Card card={card} size="xs" locked={!have} onClick={() => openDetail({ card })} />
              {!have && <span className="album-name">{athlete.last}</span>}
            </div>
          );
        })}
      </div>
      <MoreButton shown={limit} total={athletes.length} onMore={() => setLimit((l) => l + PAGE)} />
    </>
  );
}

export function CollectionScreen() {
  const [view, setView] = useState<'club' | 'album' | 'carte'>('club');
  const collection = useGame((s) => s.collection);
  const discovered = useGame((s) => s.discovered);
  return (
    <div className="screen">
      <header className="screen__head screen__head--art">
        <Landscape className="screen__art" scene={SCREEN_SCENES.collection} seed="collection" />
        <div>
          <p className="eyebrow">Collection</p>
          <h1>{view === 'club' ? 'Ma réserve' : view === 'album' ? 'Album' : 'Carte du monde'}</h1>
          <p className="muted">
            {collection.length} carte{collection.length > 1 ? 's' : ''} · {Object.keys(discovered).length} découvertes sur {ATHLETES.length}
          </p>
        </div>
        <div className="segmented" role="tablist" aria-label="Vue de la collection">
          <button type="button" role="tab" aria-selected={view === 'club'} className={view === 'club' ? 'is-active' : ''} onClick={() => setView('club')}>
            Ma réserve
          </button>
          <button type="button" role="tab" aria-selected={view === 'album'} className={view === 'album' ? 'is-active' : ''} onClick={() => setView('album')}>
            Album
          </button>
          <button type="button" role="tab" aria-selected={view === 'carte'} className={view === 'carte' ? 'is-active' : ''} onClick={() => setView('carte')}>
            Carte du monde
          </button>
        </div>
      </header>
      {view === 'club' ? <Club /> : view === 'album' ? <Album /> : <WorldMap />}
    </div>
  );
}
