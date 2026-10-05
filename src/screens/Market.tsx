import { useMemo, useState } from 'react';
import { useGame } from '../store/game';
import { useUi, DEFAULT_FILTERS } from '../store/ui';
import { useNow, formatDuration, timeAgo } from '../hooks/useNow';
import { ATHLETES_BY_ID } from '../data/athletes';
import { SPORTS, SPORT_ORDER } from '../data/sports';
import { RARITIES, RARITY_ORDER, collectionNumber, displayName, rarityOf } from '../engine/cards';
import { MARKET_TAX, MAX_MY_LISTINGS, marketPrice, netAfterTax, nextMinBid, type Listing, type MyListing } from '../engine/market';
import type { RarityId, SportId } from '../engine/types';
import { Card } from '../components/Card';
import { Balles } from '../components/Balles';
import { Landscape } from '../components/PackScene';
import { SCREEN_SCENES } from '../art/scenes';
import { useOnline } from '../store/online';
import { useAccount } from '../store/account';
import { accountsEnabled } from '../account/supabase';
import type { OnlineListing } from '../account/market';
import type { CardFace } from '../engine/types';
import type { MarketFilters } from '../store/ui';

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** La carte correspond-elle aux filtres de recherche du marché ? */
function matchesFilters(card: CardFace, price: number, filters: MarketFilters, q: string): boolean {
  const athlete = ATHLETES_BY_ID[card.athleteId];
  if (!athlete) return false;
  if (filters.sport && athlete.sport !== filters.sport) return false;
  if (filters.rarity && rarityOf(athlete).id !== filters.rarity) return false;
  if (filters.prime && card.variant !== 'prime') return false;
  if (filters.icons && !athlete.retired) return false;
  if (filters.maxPrice && price > filters.maxPrice) return false;
  if (q && !normalize(`${displayName(athlete)} ${athlete.nick ?? ''} ${athlete.latin ?? ''}`).includes(q)) return false;
  return true;
}

/** Une annonce d'un vrai joueur : prix fixe, achat immédiat. */
function OnlineRow({ listing, now, mine = false }: { listing: OnlineListing; now: number; mine?: boolean }) {
  const athlete = ATHLETES_BY_ID[listing.card.athleteId];
  const news = useGame((s) => s.market.news);
  const balles = useGame((s) => s.balles);
  // espèce pas encore dans la collection du joueur
  const discovered = useGame((s) => !!s.discovered[listing.card.athleteId]);
  const openDetail = useUi((s) => s.openDetail);
  const buy = useOnline((s) => s.buy);
  const cancel = useOnline((s) => s.cancel);
  const busy = useOnline((s) => s.pending === listing.id);
  const connected = useAccount((s) => !!s.session);
  if (!athlete) return null;
  const price = marketPrice(listing.card, now, news);
  const left = listing.expiresAt - now;
  const deal = listing.price < price * 0.97;
  const rarity = rarityOf(athlete);
  return (
    <li className="listing listing--online">
      <Card card={listing.card} size="xs" onClick={() => openDetail({ card: listing.card })} />
      <div className="listing__info">
        <p className="listing__name">
          <b>{displayName(athlete)}</b>
          {!discovered && <span className="new-tag">Nouveau</span>}
          {listing.card.variant === 'prime' && <span className="chip-rarity chip-rarity--prime">Prime</span>}
          {listing.card.variant === 'reverse' && <span className="chip-rarity chip-rarity--reverse">Reverse</span>}
        </p>
        <p className="listing__meta">
          <span className={`chip-rarity chip-rarity--${rarity.id}`}>{rarity.name}</span> N° {collectionNumber(athlete)} ·{' '}
          <span className="player-tag">{mine ? 'Toi' : listing.seller}</span>
        </p>
        <p className="listing__market">
          Cote <Balles value={price} />
          {deal && !mine && <span className="deal">Bonne affaire</span>}
        </p>
      </div>
      <div className="listing__prices">
        <span className={`listing__time${left < 10 * 60_000 ? ' is-urgent' : ''}`}>{left > 0 ? formatDuration(left) : 'Terminée'}</span>
        <span className="listing__bid">
          Prix <Balles value={listing.price} />
        </span>
      </div>
      <div className="listing__actions">
        {mine ? (
          <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => cancel(listing)}>
            {busy ? 'Retrait…' : 'Retirer'}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={busy || !connected || balles < listing.price}
            title={connected ? undefined : 'Connecte-toi pour acheter aux autres joueurs'}
            onClick={() => buy(listing)}
          >
            {busy ? 'Achat…' : <>Acheter <Balles value={listing.price} /></>}
          </button>
        )}
      </div>
    </li>
  );
}

/** Les annonces des joueurs, en tête de l'onglet Acheter. */
function OnlineSection({ filters, now }: { filters: MarketFilters; now: number }) {
  const active = useOnline((s) => s.active);
  const loaded = useOnline((s) => s.loaded);
  const error = useOnline((s) => s.error);
  const me = useAccount((s) => s.session?.userId);
  const setTab = useUi((s) => s.setTab);
  const q = normalize(filters.query.trim());
  const results = active
    .filter((l) => l.sellerId !== me && l.expiresAt > now && matchesFilters(l.card, l.price, filters, q))
    .sort((a, b) => (filters.sort === 'price-asc' ? a.price - b.price : filters.sort === 'price-desc' ? b.price - a.price : b.createdAt - a.createdAt));
  return (
    <section className="market-section" aria-labelledby="online-title">
      <h2 id="online-title" className="market-section__title">
        <span className="live-dot" aria-hidden="true" /> Annonces des joueurs
        <small>{active.length ? `${active.length} en ligne` : ''}</small>
      </h2>
      {!me && (
        <p className="info-bar">
          <span>Connecte-toi pour acheter et vendre aux autres joueurs.</span>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => setTab('profil')}>
            Se connecter
          </button>
        </p>
      )}
      {error && <p className="error-text">{error}</p>}
      {!loaded ? (
        <p className="muted">Chargement des annonces…</p>
      ) : results.length === 0 ? (
        <p className="muted">{active.length ? 'Aucune annonce de joueur ne correspond à ta recherche.' : 'Aucun joueur ne vend de carte pour l’instant. Sois le premier : ouvre une carte de ta réserve et choisis « Mettre en vente ».'}</p>
      ) : (
        <ul className="listings">
          {results.slice(0, 60).map((listing) => (
            <OnlineRow key={listing.id} listing={listing} now={now} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ListingRow({ listing, now }: { listing: Listing; now: number }) {
  const athlete = ATHLETES_BY_ID[listing.card.athleteId];
  const news = useGame((s) => s.market.news);
  const balles = useGame((s) => s.balles);
  // espèce pas encore dans la collection du joueur
  const discovered = useGame((s) => !!s.discovered[listing.card.athleteId]);
  const buy = useGame((s) => s.buyListing);
  const bid = useGame((s) => s.placeBid);
  const watch = useGame((s) => s.toggleWatch);
  const watched = useGame((s) => s.watchlist.includes(listing.id));
  const openDetail = useUi((s) => s.openDetail);
  const [bidding, setBidding] = useState(false);
  const minBid = nextMinBid(listing);
  const [amount, setAmount] = useState(minBid);
  const price = marketPrice(listing.card, now, news);
  const left = listing.expiresAt - now;
  const deal = listing.buyNow < price * 0.97;
  const rarity = rarityOf(athlete);

  return (
    <li className={`listing${listing.bidder === 'me' ? ' is-leading' : ''}`}>
      <Card card={listing.card} size="xs" onClick={() => openDetail({ card: listing.card, listingId: listing.id })} />
      <div className="listing__info">
        <p className="listing__name">
          <b>{displayName(athlete)}</b>
          {!discovered && <span className="new-tag">Nouveau</span>}
          {listing.card.variant === 'prime' && <span className="chip-rarity chip-rarity--prime">Prime</span>}
          {listing.card.variant === 'reverse' && <span className="chip-rarity chip-rarity--reverse">Reverse</span>}
        </p>
        <p className="listing__meta">
          <span className={`chip-rarity chip-rarity--${rarity.id}`}>{rarity.name}</span> N° {collectionNumber(athlete)} · {SPORTS[athlete.sport].name} ·{' '}
          {listing.seller}
        </p>
        <p className="listing__market">
          Cote <Balles value={price} />
          {deal && <span className="deal">Bonne affaire</span>}
        </p>
      </div>
      <div className="listing__prices">
        <span className={`listing__time${left < 60_000 ? ' is-urgent' : ''}`}>{formatDuration(left)}</span>
        <span className="listing__bid">
          {listing.currentBid === null ? 'Départ' : listing.bidder === 'me' ? 'Ton enchère' : 'Enchère'} <Balles value={listing.currentBid ?? listing.startPrice} />
        </span>
      </div>
      <div className="listing__actions">
        <button type="button" className="btn btn--primary btn--sm" disabled={balles < listing.buyNow} onClick={() => buy(listing.id)}>
          Acheter <Balles value={listing.buyNow} />
        </button>
        {!bidding ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => {
              setAmount(minBid);
              setBidding(true);
            }}
          >
            Enchérir
          </button>
        ) : (
          <form
            className="bid-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (bid(listing.id, Math.max(amount, minBid))) setBidding(false);
            }}
          >
            <label className="visually-hidden" htmlFor={`bid-${listing.id}`}>
              Montant de l’enchère
            </label>
            <input id={`bid-${listing.id}`} type="number" inputMode="numeric" min={minBid} step={50} value={amount} onChange={(e) => setAmount(Number(e.target.value))} autoFocus />
            <button type="submit" className="btn btn--gold btn--sm">
              OK
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setBidding(false)} aria-label="Annuler l’enchère">
              ×
            </button>
          </form>
        )}
        <button type="button" className={`icon-btn icon-btn--sm${watched ? ' is-on' : ''}`} onClick={() => watch(listing.id)} aria-pressed={watched} aria-label={watched ? 'Ne plus suivre' : 'Suivre cette annonce'}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12,20 L4.5,12.5 A4.5,4.5 0 0 1 12,6.5 A4.5,4.5 0 0 1 19.5,12.5 Z" />
          </svg>
        </button>
      </div>
    </li>
  );
}

function BuyTab() {
  const listings = useGame((s) => s.market.listings);
  const news = useGame((s) => s.market.news);
  const filters = useUi((s) => s.marketFilters);
  const setFilters = useUi((s) => s.setMarketFilters);
  const now = useNow(1000);

  const results = useMemo(() => {
    const q = normalize(filters.query.trim());
    const list = listings.filter((listing) => matchesFilters(listing.card, listing.buyNow, filters, q) && listing.expiresAt > now);
    return list.sort((a, b) => {
      switch (filters.sort) {
        case 'price-asc':
          return a.buyNow - b.buyNow;
        case 'price-desc':
          return b.buyNow - a.buyNow;
        case 'number':
          return collectionNumber(ATHLETES_BY_ID[a.card.athleteId]).localeCompare(collectionNumber(ATHLETES_BY_ID[b.card.athleteId]));
        default:
          return a.expiresAt - b.expiresAt;
      }
    });
  }, [listings, filters, now]);

  return (
    <>
      <div className="filters" role="search">
        <label className="field field--grow">
          <span className="visually-hidden">Rechercher un animal</span>
          <input id="market-search" type="search" placeholder="Rechercher un animal (ex. Guépard)" value={filters.query} onChange={(e) => setFilters({ query: e.target.value })} />
        </label>
        <label className="field">
          <span className="visually-hidden">Famille</span>
          <select id="market-sport" value={filters.sport} onChange={(e) => setFilters({ sport: e.target.value as SportId | '' })}>
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
          <select id="market-rarity" value={filters.rarity} onChange={(e) => setFilters({ rarity: e.target.value as RarityId | '' })}>
            <option value="">Toutes les raretés</option>
            {RARITY_ORDER.map((id) => (
              <option key={id} value={id}>
                {RARITIES[id].name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="visually-hidden">Prix maximum</span>
          <input
            id="market-max"
            type="number"
            inputMode="numeric"
            placeholder="Prix max"
            value={filters.maxPrice ?? ''}
            onChange={(e) => setFilters({ maxPrice: e.target.value ? Number(e.target.value) : null })}
          />
        </label>
        <label className="field">
          <span className="visually-hidden">Trier</span>
          <select id="market-sort" value={filters.sort} onChange={(e) => setFilters({ sort: e.target.value as typeof filters.sort })}>
            <option value="ending">Fin la plus proche</option>
            <option value="price-asc">Prix croissant</option>
            <option value="price-desc">Prix décroissant</option>
            <option value="number">N° de collection</option>
          </select>
        </label>
        <label className="toggle">
          <input id="market-prime" type="checkbox" checked={filters.prime} onChange={(e) => setFilters({ prime: e.target.checked })} />
          <span>Prime</span>
        </label>
        <label className="toggle">
          <input id="market-icons" type="checkbox" checked={filters.icons} onChange={(e) => setFilters({ icons: e.target.checked })} />
          <span>Icônes</span>
        </label>
      </div>
      <div className="market-news" aria-label="Tendances du marché">
        {news.slice(0, 3).map((item) => (
          <span key={item.id} className={item.factor >= 1 ? 'is-up' : 'is-down'}>
            {item.factor >= 1 ? '▲' : '▼'} {item.text} <time>{timeAgo(item.at, now)}</time>
          </span>
        ))}
      </div>
      {accountsEnabled() && <OnlineSection filters={filters} now={now} />}
      <h2 className="market-section__title">
        Collectionneurs du jeu <small>enchères et achat immédiat</small>
      </h2>
      {results.length === 0 ? (
        <div className="empty">
          <p>Aucune carte ne correspond à ta recherche en ce moment.</p>
          <p className="muted">De nouvelles annonces arrivent chaque minute. Élargis les filtres ou reviens plus tard.</p>
          <button type="button" className="btn btn--ghost" onClick={() => setFilters(DEFAULT_FILTERS)}>
            Effacer les filtres
          </button>
        </div>
      ) : (
        <ul className="listings">
          {results.slice(0, 60).map((listing) => (
            <ListingRow key={listing.id} listing={listing} now={now} />
          ))}
        </ul>
      )}
    </>
  );
}

function MyListingRow({ listing, now }: { listing: MyListing; now: number }) {
  const athlete = ATHLETES_BY_ID[listing.card.athleteId];
  const cancel = useGame((s) => s.cancelListing);
  const openDetail = useUi((s) => s.openDetail);
  return (
    <li className={`listing listing--mine is-${listing.status}`}>
      <Card card={listing.card} size="xs" onClick={() => openDetail({ card: listing.card })} />
      <div className="listing__info">
        <p className="listing__name">
          <b>{displayName(athlete)}</b>
        </p>
        <p className="listing__meta">
          Départ <Balles value={listing.startPrice} /> · Immédiat <Balles value={listing.buyNow} />
        </p>
      </div>
      <div className="listing__prices">
        {listing.status === 'active' && (
          <>
            <span className="listing__time">{formatDuration(listing.expiresAt - now)}</span>
            <span className="listing__bid">
              {listing.currentBid === null ? 'Aucune enchère' : <>Enchère <Balles value={listing.currentBid} /></>}
            </span>
          </>
        )}
        {listing.status === 'sold' && (
          <span className="status status--good">
            Vendue à {listing.buyer} · +<Balles value={netAfterTax(listing.soldPrice ?? 0)} />
          </span>
        )}
        {listing.status === 'expired' && <span className="status">Invendue, revenue dans ta réserve</span>}
      </div>
      <div className="listing__actions">
        {listing.status === 'active' && listing.currentBid === null && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => cancel(listing.id)}>
            Retirer
          </button>
        )}
      </div>
    </li>
  );
}

/** Mes ventes en ligne : annonces en cours et dernières ventes conclues. */
function OnlineMine({ now }: { now: number }) {
  const me = useAccount((s) => s.session?.userId);
  const mine = useOnline((s) => s.mine);
  const history = useOnline((s) => s.history);
  if (!me) return null;
  const active = mine.filter((l) => l.sellerId === me && l.status === 'active');
  const recent = history.slice(0, 10);
  return (
    <section className="market-section" aria-labelledby="online-mine-title">
      <h2 id="online-mine-title" className="market-section__title">
        <span className="live-dot" aria-hidden="true" /> En vente aux joueurs <small>{active.length}/15</small>
      </h2>
      {active.length === 0 ? (
        <p className="muted">Aucune carte en vente en ligne. Ouvre une carte de ta réserve et choisis « Aux joueurs ».</p>
      ) : (
        <ul className="listings">
          {active.map((listing) => (
            <OnlineRow key={listing.id} listing={listing} now={now} mine />
          ))}
        </ul>
      )}
      {recent.length > 0 && (
        <ul className="trade-log" aria-label="Dernières transactions">
          {recent.map((l) => {
            const sold = l.sellerId === me;
            const athlete = ATHLETES_BY_ID[l.card.athleteId];
            return (
              <li key={l.id} className={sold ? 'is-sold' : 'is-bought'}>
                {sold ? (
                  <>
                    <b>{l.buyer}</b> a acheté ton {athlete?.last} · +<Balles value={netAfterTax(l.price)} />
                  </>
                ) : (
                  <>
                    Tu as acheté {athlete?.last} à <b>{l.seller}</b> · −<Balles value={l.price} />
                  </>
                )}
                <time>{timeAgo(l.soldAt ?? l.createdAt, now)}</time>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function MineTab() {
  const myListings = useGame((s) => s.market.myListings);
  const clear = useGame((s) => s.clearFinishedListings);
  const setTab = useUi((s) => s.setTab);
  const now = useNow(1000);
  const active = myListings.filter((l) => l.status === 'active');
  const finished = myListings.filter((l) => l.status !== 'active');
  return (
    <>
      {accountsEnabled() && <OnlineMine now={now} />}
      <h2 className="market-section__title">
        Ventes aux collectionneurs du jeu
      </h2>
      <div className="info-bar">
        <span>
          {active.length}/{MAX_MY_LISTINGS} cartes en vente. Taxe du marché : {Math.round(MARKET_TAX * 100)} % sur chaque vente.
        </span>
        {finished.length > 0 && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={clear}>
            Effacer les ventes terminées
          </button>
        )}
      </div>
      {myListings.length === 0 ? (
        <div className="empty">
          <p>Tu n’as aucune carte en vente.</p>
          <p className="muted">Ouvre une carte de ta réserve et choisis « Mettre en vente ». Les collectionneurs IA achètent en quelques minutes si le prix est juste.</p>
          <button type="button" className="btn btn--primary" onClick={() => setTab('collection')}>
            Aller à ma réserve
          </button>
        </div>
      ) : (
        <ul className="listings">
          {[...active, ...finished].map((listing) => (
            <MyListingRow key={listing.id} listing={listing} now={now} />
          ))}
        </ul>
      )}
    </>
  );
}

function WatchTab() {
  const listings = useGame((s) => s.market.listings);
  const watchlist = useGame((s) => s.watchlist);
  const now = useNow(1000);
  const watched = listings.filter((l) => watchlist.includes(l.id));
  if (!watched.length) {
    return (
      <div className="empty">
        <p>Aucune annonce suivie.</p>
        <p className="muted">Touche le cœur d’une annonce pour la suivre. Les annonces sur lesquelles tu enchéris sont suivies automatiquement.</p>
      </div>
    );
  }
  return (
    <ul className="listings">
      {watched.map((listing) => (
        <ListingRow key={listing.id} listing={listing} now={now} />
      ))}
    </ul>
  );
}

export function MarketScreen() {
  const tab = useUi((s) => s.marketTab);
  const setTab = useUi((s) => s.setMarketTab);
  const myCount = useGame((s) => s.market.myListings.length);
  const watchCount = useGame((s) => s.watchlist.length);
  return (
    <div className="screen">
      <header className="screen__head screen__head--art">
        <Landscape className="screen__art" scene={SCREEN_SCENES.mercato} seed="marché" />
        <div>
          <p className="eyebrow">Bourse d’échange</p>
          <h1>Marché</h1>
          <p className="muted">Achète et vends tes cartes aux autres joueurs, en direct, ou aux collectionneurs du jeu.</p>
        </div>
        <div className="segmented" role="tablist" aria-label="Sections du marché">
          <button type="button" role="tab" aria-selected={tab === 'buy'} className={tab === 'buy' ? 'is-active' : ''} onClick={() => setTab('buy')}>
            Acheter
          </button>
          <button type="button" role="tab" aria-selected={tab === 'mine'} className={tab === 'mine' ? 'is-active' : ''} onClick={() => setTab('mine')}>
            Mes ventes{myCount ? ` (${myCount})` : ''}
          </button>
          <button type="button" role="tab" aria-selected={tab === 'watch'} className={tab === 'watch' ? 'is-active' : ''} onClick={() => setTab('watch')}>
            Suivies{watchCount ? ` (${watchCount})` : ''}
          </button>
        </div>
      </header>
      {tab === 'buy' && <BuyTab />}
      {tab === 'mine' && <MineTab />}
      {tab === 'watch' && <WatchTab />}
    </div>
  );
}
