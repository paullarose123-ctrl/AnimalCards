import { useEffect, useMemo, useRef, useState } from 'react';
import { useGame, formatBalles } from '../store/game';
import { useUi } from '../store/ui';
import { useNow, formatDuration } from '../hooks/useNow';
import { ATHLETES_BY_ID } from '../data/athletes';
import { EVENTS, SPORTS, STAT_KEYS, STAT_LABELS } from '../data/sports';
import { mesuresOf } from '../data/mesures';
import { populationOf } from '../data/populations';
import { displayName, extinctionLabel, formatRecord, isIcon, overallOf, popularityOf, quickSellValue, rarityOf, statsOf, ultiOf } from '../engine/cards';
import { MARKET_TAX, marketPrice, netAfterTax, nextMinBid, priceBounds, priceHistory, suggestedPrices } from '../engine/market';
import type { CardFace, OwnedCard } from '../engine/types';
import { Card } from '../components/Card';
import { packScene } from '../components/PackArt';
import { Landscape } from '../components/PackScene';
import { Flag, countryName } from '../components/Flag';
import { Balles } from '../components/Balles';
import { photoCredit } from '../photos';

function Sparkline({ points }: { points: Array<{ t: number; price: number }> }) {
  const w = 280;
  const h = 64;
  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = Math.max(1, max - min);
  const coords = points.map((p, i) => [(i / (points.length - 1)) * w, h - 6 - ((p.price - min) / span) * (h - 14)] as const);
  const line = coords.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;
  const [lx, ly] = coords[coords.length - 1];
  const up = prices[prices.length - 1] >= prices[0];
  return (
    <svg className={`sparkline ${up ? 'is-up' : 'is-down'}`} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label={`Cote sur 24 heures, de ${min.toLocaleString('fr-FR')} à ${max.toLocaleString('fr-FR')} graines`}>
      <line x1={0} y1={h - 6} x2={w} y2={h - 6} className="sparkline__base" />
      <path d={area} className="sparkline__area" />
      <path d={line} className="sparkline__line" />
      <circle cx={lx} cy={ly} r={3.5} className="sparkline__dot" />
    </svg>
  );
}

function SellForm({ card, onDone }: { card: OwnedCard; onDone: () => void }) {
  const news = useGame((s) => s.market.news);
  const listCard = useGame((s) => s.listCard);
  const suggestion = useMemo(() => suggestedPrices(card, Date.now(), news), [card, news]);
  const bounds = priceBounds(card);
  const [start, setStart] = useState(suggestion.start);
  const [buyNow, setBuyNow] = useState(suggestion.buyNow);
  const [duration, setDuration] = useState(15);
  const invalid = buyNow <= start || start < bounds.min || buyNow > bounds.max;

  return (
    <form
      className="sell-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (invalid) return;
        if (listCard(card.uid, start, buyNow, duration)) onDone();
      }}
    >
      <p className="sell-form__hint">
        Cote actuelle : <Balles value={suggestion.market} />. Les collectionneurs achètent vite en dessous de la cote, rarement au-dessus de +30 %.
      </p>
      <div className="field-row">
        <label className="field">
          <span>Enchère de départ</span>
          <input id="sell-start" type="number" inputMode="numeric" min={bounds.min} max={bounds.max} step={50} value={start} onChange={(e) => setStart(Number(e.target.value))} />
        </label>
        <label className="field">
          <span>Achat immédiat</span>
          <input id="sell-buynow" type="number" inputMode="numeric" min={bounds.min} max={bounds.max} step={50} value={buyNow} onChange={(e) => setBuyNow(Number(e.target.value))} />
        </label>
      </div>
      <div className="presets" role="group" aria-label="Prix rapides">
        {[
          ['Vente express', 0.9],
          ['Au prix du marché', 1.02],
          ['Pour les pressés', 1.2],
        ].map(([label, factor]) => (
          <button
            key={label}
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => {
              const target = Math.round((suggestion.market * (factor as number)) / 50) * 50;
              setBuyNow(target);
              setStart(Math.round((target * 0.7) / 50) * 50);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <fieldset className="durations">
        <legend>Durée</legend>
        {[5, 15, 60, 180].map((d) => (
          <label key={d} className={`pill${duration === d ? ' is-active' : ''}`}>
            <input type="radio" name="duration" value={d} checked={duration === d} onChange={() => setDuration(d)} />
            {d < 60 ? `${d} min` : `${d / 60} h`}
          </label>
        ))}
      </fieldset>
      <p className="sell-form__net">
        Si elle part au prix immédiat, tu touches <Balles value={netAfterTax(buyNow)} /> (taxe du marché {Math.round(MARKET_TAX * 100)} %).
      </p>
      {invalid && (
        <p className="error-text" role="alert">
          {buyNow <= start
            ? 'Le prix d’achat immédiat doit être supérieur à l’enchère de départ.'
            : `Choisis un prix entre ${bounds.min.toLocaleString('fr-FR')} et ${bounds.max.toLocaleString('fr-FR')} graines.`}
        </p>
      )}
      <div className="sell-form__actions">
        <button type="submit" className="btn btn--primary" disabled={invalid}>
          Mettre en vente
        </button>
        <button type="button" className="btn btn--ghost" onClick={onDone}>
          Annuler
        </button>
      </div>
    </form>
  );
}

function ListingActions({ listingId }: { listingId: string }) {
  const listing = useGame((s) => s.market.listings.find((l) => l.id === listingId));
  const balles = useGame((s) => s.balles);
  const buy = useGame((s) => s.buyListing);
  const bid = useGame((s) => s.placeBid);
  const watch = useGame((s) => s.toggleWatch);
  const watched = useGame((s) => s.watchlist.includes(listingId));
  const close = useUi((s) => s.closeDetail);
  const now = useNow(1000);
  const [amount, setAmount] = useState(() => (listing ? nextMinBid(listing) : 0));
  if (!listing) return <p className="muted">Cette annonce est terminée.</p>;
  const minBid = nextMinBid(listing);
  return (
    <div className="listing-actions">
      <div className="listing-actions__meta">
        <span>Vendu par {listing.seller}</span>
        <span>Fin dans {formatDuration(listing.expiresAt - now)}</span>
        <span>
          {listing.currentBid === null ? 'Aucune enchère' : `${listing.bidCount} enchère${listing.bidCount > 1 ? 's' : ''}${listing.bidder === 'me' ? ' · tu mènes' : ''}`}
        </span>
      </div>
      <div className="listing-actions__row">
        <button
          type="button"
          className="btn btn--primary"
          disabled={balles < listing.buyNow}
          onClick={() => {
            if (buy(listing.id)) close();
          }}
        >
          Acheter <Balles value={listing.buyNow} />
        </button>
        <form
          className="bid-form"
          onSubmit={(event) => {
            event.preventDefault();
            bid(listing.id, amount);
          }}
        >
          <label className="visually-hidden" htmlFor="detail-bid">
            Montant de l’enchère
          </label>
          <input id="detail-bid" type="number" inputMode="numeric" min={minBid} step={50} value={Math.max(amount, minBid)} onChange={(e) => setAmount(Number(e.target.value))} />
          <button type="submit" className="btn btn--ghost">
            Enchérir
          </button>
        </form>
        <button type="button" className={`btn btn--ghost${watched ? ' is-on' : ''}`} onClick={() => watch(listing.id)} aria-pressed={watched}>
          {watched ? 'Suivie' : 'Suivre'}
        </button>
      </div>
    </div>
  );
}

export function CardDetail() {
  const detail = useUi((s) => s.detail);
  const close = useUi((s) => s.closeDetail);
  const searchMarketFor = useUi((s) => s.searchMarketFor);
  const collection = useGame((s) => s.collection);
  const news = useGame((s) => s.market.news);
  const toggleLock = useGame((s) => s.toggleLock);
  const quickSell = useGame((s) => s.quickSell);
  const setTeamSlot = useGame((s) => s.setTeamSlot);
  const team = useGame((s) => s.team);
  const [selling, setSelling] = useState(false);
  const [confirmQuick, setConfirmQuick] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const now = useNow(30_000);

  useEffect(() => {
    setSelling(false);
    setConfirmQuick(false);
    if (detail) window.setTimeout(() => closeRef.current?.focus(), 30);
  }, [detail]);

  useEffect(() => {
    if (!detail) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detail, close]);

  if (!detail) return null;
  const face: CardFace = detail.card;
  const athlete = ATHLETES_BY_ID[face.athleteId];
  const rarity = rarityOf(athlete);
  const stats = statsOf(athlete, face.variant);
  const ulti = ultiOf(athlete, face.variant);
  const sport = SPORTS[athlete.sport];
  const mesures = athlete.mythe ? null : mesuresOf(athlete.id);
  const population = populationOf(athlete);
  const owned = 'uid' in detail.card && !detail.listingId ? collection.find((c) => c.uid === (detail.card as OwnedCard).uid) : undefined;
  const copies = collection.filter((c) => c.athleteId === face.athleteId && c.variant === face.variant);
  const price = marketPrice(face, now, news);
  const history = priceHistory(face, now, news);
  const change = Math.round(((history[history.length - 1].price - history[0].price) / history[0].price) * 100);
  const inTeam = owned ? team.includes(owned.uid) : false;

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="detail-title" onClick={close}>
      <div className="modal__panel detail" onClick={(event) => event.stopPropagation()}>
        <button ref={closeRef} type="button" className="modal__close" onClick={close} aria-label="Fermer la fiche">
          ×
        </button>
        <div className="detail__card">
          {/* la carte posée sur le paysage de sa famille */}
          <div className="detail__stage">
            <Landscape className="detail__scene" scene={packScene('sport', athlete.sport)} seed={`Pack ${sport.name}`} />
            <Card card={detail.card} size="lg" tilt />
          </div>
          <p className="detail__tip">Bouge la carte avec le doigt ou la souris</p>
          {photoCredit(face.athleteId) && (
            <p className="detail__credit">
              Photo :{' '}
              <a href={photoCredit(face.athleteId)!.page} target="_blank" rel="noreferrer">
                {photoCredit(face.athleteId)!.author}
              </a>
              , {photoCredit(face.athleteId)!.license}
              {photoCredit(face.athleteId)!.page.includes('pixabay.com') ? ', Pixabay' : ', Wikimedia Commons'}
              {photoCredit(face.athleteId)!.cutout ? ' (détourée)' : ''}
            </p>
          )}
        </div>
        <div className="detail__info">
          <div className="detail__chips">
            <span className={`chip-rarity chip-rarity--${rarity.id}`}>{rarity.name}</span>
            {face.variant === 'prime' && <span className="chip-rarity chip-rarity--prime">Prime{athlete.prime ? ` ${athlete.prime.year}` : ''}</span>}
            {face.variant === 'reverse' && <span className="chip-rarity chip-rarity--reverse">Reverse</span>}
            {athlete.mythe && <span className="chip-rarity chip-rarity--mythe">Mythe · {athlete.role}</span>}
            {isIcon(athlete) && <span className="chip-rarity chip-rarity--icon">Icône</span>}
          </div>
          <h2 id="detail-title">
            {displayName(athlete)}
            {athlete.nick && <small> « {athlete.nick} »</small>}
          </h2>
          {athlete.latin && <p className="detail__latin">{athlete.latin}</p>}
          <p className="detail__meta">
            <Flag code={athlete.country} className="detail__flag" /> {countryName(athlete.country)} · {sport.name} · {athlete.role}
            {athlete.died ? ` · ${extinctionLabel(athlete)}` : ''}
          </p>
          {mesures && (
            <dl className="detail__mesures">
              {mesures.poids && (
                <div>
                  <dt>Poids</dt>
                  <dd>{mesures.poids}</dd>
                </div>
              )}
              {mesures.taille && (
                <div>
                  <dt>{mesures.tailleLabel}</dt>
                  <dd>{mesures.taille}</dd>
                </div>
              )}
              {mesures.longevite && (
                <div>
                  <dt>Longévité</dt>
                  <dd>{mesures.longevite}</dd>
                </div>
              )}
              {population && (
                <div className={population.extinct ? 'is-extinct' : ''}>
                  <dt>{population.extinct ? 'Statut' : population.label}</dt>
                  <dd>{population.extinct ? 'Éteint' : `≈ ${population.value}`}</dd>
                </div>
              )}
            </dl>
          )}
          <p className="detail__fact">{athlete.fact}</p>
          {face.variant === 'prime' && athlete.prime && (
            <p className="detail__prime">
              <b>Version Prime {athlete.prime.year}</b> : {athlete.prime.note}
            </p>
          )}
          {face.variant === 'prime' && !athlete.prime && (
            <p className="detail__prime">
              <b>Version Prime</b> : un individu d’exception, +{overallOf(athlete, 'prime') - overallOf(athlete)} de note et des stats boostées.
            </p>
          )}
          {face.variant === 'reverse' && (
            <p className="detail__prime">
              <b>Version Reverse</b> : finition holographique, environ 1 carte sur 20. Mêmes stats que la version classique, mais une cote bien plus élevée au marché.
            </p>
          )}

          {athlete.mythe ? (
            // une carte Mythe n'a pas de stats : elle donne un bonus à l'équipe
            <div className="ulti-box is-signature">
              <p className="ulti-box__label">Carte Mythe · bonus d’équipe en match</p>
              <p className="ulti-box__name">
                +{athlete.mythe.bonus.value}{' '}
                {athlete.mythe.bonus.sport === 'all' ? 'pour tous les animaux' : `pour ${SPORTS[athlete.mythe.bonus.sport].group}`}
              </p>
              <p className="ulti-box__desc">
                {athlete.mythe.bonus.events?.length
                  ? `+${athlete.mythe.bonus.eventBonus} de plus en ${athlete.mythe.bonus.events.map((e) => EVENTS[e].name).join(', ')}. `
                  : ''}
                Place-la dans l’emplacement Mythe de ton équipe, dans l’écran Arène. À savoir : {athlete.mythe.palmares}.
              </p>
            </div>
          ) : (
          <>
          <div className="detail__stats">
            {STAT_KEYS.map((key) => (
              <div key={key} className="statbar" title={STAT_LABELS[key].desc}>
                <span className="statbar__label">{STAT_LABELS[key].name}</span>
                <span className="statbar__track">
                  <span className="statbar__fill" style={{ width: `${stats[key]}%` }} data-level={stats[key] >= 90 ? 'elite' : stats[key] >= 80 ? 'good' : stats[key] >= 65 ? 'mid' : 'low'} />
                </span>
                <b className="statbar__value">{stats[key]}</b>
              </div>
            ))}
            <div className="statbar statbar--pop" title="Célébrité : c’est elle qui fixe la rareté de la carte">
              <span className="statbar__label">Popularité</span>
              <span className="statbar__track">
                <span className="statbar__fill" style={{ width: `${popularityOf(athlete)}%` }} />
              </span>
              <b className="statbar__value">{popularityOf(athlete)}</b>
            </div>
          </div>

          <div className={`ulti-box${ulti.signature ? ' is-signature' : ''}`}>
            <p className="ulti-box__label">{ulti.signature ? 'Ulti signature' : `Ulti · ${sport.name}`}</p>
            <p className="ulti-box__name">{ulti.name}</p>
            <p className="ulti-box__desc">{ulti.desc}</p>
            {'record' in face && face.record ? (
              <p className="ulti-box__record">
                Record de vitesse de cette carte : {formatRecord(face.record)}
              </p>
            ) : null}
          </div>
          <div className="passive-box">
            <p className="ulti-box__label">Particularité · {sport.name}</p>
            <p>
              <b>{sport.passive.name}</b> : {sport.passive.desc}
            </p>
          </div>
          </>
          )}

          <div className="market-box">
            <div className="market-box__head">
              <span>Cote du marché</span>
              <Balles value={price} />
              <span className={`trend ${change >= 0 ? 'is-up' : 'is-down'}`}>
                {change >= 0 ? '+' : ''}
                {change} % sur 24 h
              </span>
            </div>
            <Sparkline points={history} />
          </div>

          {detail.listingId && <ListingActions listingId={detail.listingId} />}

          {owned && !selling && (
            <div className="detail__actions">
              <p className="muted">
                Tu possèdes {copies.length} exemplaire{copies.length > 1 ? 's' : ''} de cette carte.
              </p>
              <div className="btn-row">
                <button type="button" className="btn btn--primary" onClick={() => setSelling(true)} disabled={owned.locked}>
                  Mettre en vente
                </button>
                {!confirmQuick ? (
                  <button type="button" className="btn btn--ghost" onClick={() => setConfirmQuick(true)} disabled={owned.locked}>
                    Vente rapide
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn--danger"
                    onClick={() => {
                      quickSell([owned.uid]);
                      close();
                    }}
                  >
                    Confirmer : +{formatBalles(quickSellValue(athlete, face.variant))}
                  </button>
                )}
                <button type="button" className="btn btn--ghost" onClick={() => toggleLock(owned.uid)} aria-pressed={!!owned.locked}>
                  {owned.locked ? 'Déverrouiller' : 'Verrouiller'}
                </button>
                {!inTeam && (
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => {
                      const padded = [...team];
                      while (padded.length < 5) padded.push('');
                      const empty = padded.findIndex((uid) => !uid || !collection.some((c) => c.uid === uid));
                      setTeamSlot(empty === -1 ? 4 : empty, owned.uid);
                    }}
                  >
                    Ajouter à l’équipe
                  </button>
                )}
              </div>
              {owned.locked && <p className="muted small">Carte verrouillée : elle ne peut pas être vendue par erreur.</p>}
            </div>
          )}
          {owned && selling && <SellForm card={owned} onDone={() => setSelling(false)} />}
          {!owned && !detail.listingId && (
            <div className="btn-row">
              <button type="button" className="btn btn--primary" onClick={() => searchMarketFor(athlete.last)}>
                Chercher sur le marché
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
