import type { CardFace, OwnedCard, SportId, Variant } from './types';
import { ATHLETES, ATHLETES_BY_ID } from '../data/athletes';
import { SPORTS } from '../data/sports';
import { REVERSE_CHANCE, baseValueOf, canBePrime, canBeReverse, displayName, dropWeight, isHabitat, rarityOf, roundPrice } from './cards';
import { hashUnit, makeUid, pick, randInt, weightedPick, type Rng } from './random';

// Marché d'échange simulé : des collectionneurs IA mettent des cartes en vente, enchérissent
// et achètent les cartes du joueur. Tout est calculé à partir de l'heure, donc le marché
// continue de vivre quand le jeu est fermé (rattrapage au retour).
// Le module est pur (état + heure + hasard en entrée) pour pouvoir passer côté serveur plus tard.

export const MARKET_TAX = 0.05;
export const MAX_MY_LISTINGS = 15;
export const TARGET_LISTINGS = 64;
const MINUTE = 60_000;

export interface Listing {
  id: string;
  card: CardFace;
  seller: string;
  startPrice: number;
  buyNow: number;
  currentBid: number | null;
  /** 'me' si le joueur est le meilleur enchérisseur */
  bidder: 'me' | 'ai' | null;
  bidCount: number;
  createdAt: number;
  expiresAt: number;
}

export interface MyListing {
  id: string;
  card: OwnedCard;
  startPrice: number;
  buyNow: number;
  currentBid: number | null;
  bidCount: number;
  createdAt: number;
  expiresAt: number;
  status: 'active' | 'sold' | 'expired';
  soldPrice?: number;
  buyer?: string;
}

export interface MarketNews {
  id: string;
  at: number;
  text: string;
  /** cible : une espèce, une famille ou les icônes (espèces disparues) */
  athleteId?: string;
  sport?: SportId;
  icons?: boolean;
  factor: number;
  duration: number;
}

export interface MarketState {
  listings: Listing[];
  myListings: MyListing[];
  news: MarketNews[];
  lastTick: number;
  nextNewsAt: number;
}

/** Événements produits par une mise à jour du marché, pour les notifications. */
export type MarketEvent =
  | { type: 'sold'; listing: MyListing; net: number }
  | { type: 'expired'; listing: MyListing }
  | { type: 'bid-on-mine'; listing: MyListing }
  | { type: 'outbid'; listing: Listing; refund: number }
  | { type: 'won'; listing: Listing; card: CardFace; price: number }
  | { type: 'news'; news: MarketNews };

const MANAGERS = [
  'Ranger Bernard', 'La Pioche', 'Max l’Explorateur', 'Collec’ de Kevin', 'Tonton Dédé', 'Sofia la Soigneuse', 'Le Dénicheur',
  'AS Grenier', 'Les Amis des Bêtes', 'Club des Naturalistes', 'Bourse aux Plumes', 'Lili la Naturaliste', 'Nadia Jumelles',
  'Le Garde forestier', 'Karim Safari', 'Real Carton', 'Mamie Ornitho', 'Atelier Fossile', 'Brocante du Bocage', 'Lucas le Zoologue',
  'Gaspard Enchères', 'Ferme du Pré', 'US Vide-Grenier', 'Cabinet de Curiosités', 'Les Coureurs de Brousse', 'Madame Ménagerie',
];

// ───────────── Prix ─────────────

/** Oscillation lente et propre à chaque carte (±12 %), déterministe dans le temps. */
function wave(key: string, t: number): number {
  const p1 = hashUnit(`${key}:p1`) * Math.PI * 2;
  const p2 = hashUnit(`${key}:p2`) * Math.PI * 2;
  const slow = Math.sin((t / (6 * 60 * MINUTE)) * Math.PI * 2 + p1) * 0.08;
  const fast = Math.sin((t / (47 * MINUTE)) * Math.PI * 2 + p2) * 0.04;
  return 1 + slow + fast;
}

function newsFactor(news: MarketNews[], athleteId: string, t: number): number {
  const athlete = ATHLETES_BY_ID[athleteId];
  let factor = 1;
  for (const item of news) {
    const matches =
      item.athleteId === athleteId || (item.sport && item.sport === athlete.sport) || (item.icons && athlete.retired);
    if (!matches || t < item.at) continue;
    const progress = (t - item.at) / item.duration;
    if (progress >= 1) continue;
    factor *= 1 + (item.factor - 1) * (1 - progress);
  }
  return factor;
}

/** Prix de marché actuel d'une carte (ce que les IA sont prêtes à payer en moyenne). */
export function marketPrice(card: Pick<CardFace, 'athleteId' | 'variant'>, t: number, news: MarketNews[] = []): number {
  const athlete = ATHLETES_BY_ID[card.athleteId];
  const base = baseValueOf(athlete, card.variant);
  return roundPrice(base * wave(`${card.athleteId}:${card.variant}`, t) * newsFactor(news, card.athleteId, t));
}

/** Historique de prix sur les dernières heures (pour le graphique de la fiche). */
export function priceHistory(card: Pick<CardFace, 'athleteId' | 'variant'>, t: number, news: MarketNews[], hours = 24, points = 48): Array<{ t: number; price: number }> {
  const out: Array<{ t: number; price: number }> = [];
  for (let i = points - 1; i >= 0; i--) {
    const at = t - (i * hours * 60 * MINUTE) / (points - 1);
    out.push({ t: at, price: marketPrice(card, at, news) });
  }
  return out;
}

/** Palier minimal de surenchère. */
export function bidIncrement(price: number): number {
  if (price < 1_000) return 50;
  if (price < 10_000) return 100;
  if (price < 50_000) return 250;
  if (price < 100_000) return 500;
  return 1_000;
}

export function nextMinBid(listing: Pick<Listing, 'currentBid' | 'startPrice'>): number {
  return listing.currentBid === null ? listing.startPrice : listing.currentBid + bidIncrement(listing.currentBid);
}

// ───────────── Génération des annonces IA ─────────────

function listingWeight(athleteId: string): number {
  const athlete = ATHLETES_BY_ID[athleteId];
  // les cartes courantes circulent davantage, mais on garde du rêve dans les annonces
  const tierWeight = [1, 0.8, 0.55, 0.4, 0.28][rarityOf(athlete).order];
  // les Icônes (espèces disparues) sont des trésors : elles passent très rarement sur le marché
  return tierWeight * (0.35 + dropWeight(athlete)) * (athlete.retired ? 0.05 : 1);
}

// Répartition cumulée des poids, calculée une fois : le tirage reste rapide même avec des milliers d'espèces.
let listingCdf: { cdf: Float64Array; total: number } | null = null;

function pickListingAthlete(rng: Rng) {
  if (!listingCdf) {
    const cdf = new Float64Array(ATHLETES.length);
    let total = 0;
    ATHLETES.forEach((athlete, i) => {
      total += listingWeight(athlete.id);
      cdf[i] = total;
    });
    listingCdf = { cdf, total };
  }
  const roll = rng() * listingCdf.total;
  let lo = 0;
  let hi = listingCdf.cdf.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (listingCdf.cdf[mid] <= roll) lo = mid + 1;
    else hi = mid;
  }
  return ATHLETES[lo];
}

export function createAiListing(rng: Rng, t: number, news: MarketNews[], forceAthleteId?: string): Listing {
  const athlete = forceAthleteId ? ATHLETES_BY_ID[forceAthleteId] : pickListingAthlete(rng);
  // les espèces vedettes passent parfois en version Prime sur le marché, pour faire rêver
  // et les Rares et au-dessus peuvent y apparaître en finition Reverse
  const variant: Variant = isHabitat(athlete) ? 'base' : canBePrime(athlete) && rng() < 0.2 ? 'prime' : canBeReverse(athlete) && rng() < REVERSE_CHANCE ? 'reverse' : 'base';
  const card: CardFace = { athleteId: athlete.id, variant };
  const price = marketPrice(card, t, news);
  const buyNow = roundPrice(price * (0.9 + rng() * 0.38));
  const startPrice = roundPrice(buyNow * (0.55 + rng() * 0.3));
  const duration = pick(rng, [5, 10, 15, 30, 45, 60, 90]) * MINUTE;
  const elapsed = rng() * duration * 0.6;
  return {
    id: makeUid('l'),
    card,
    seller: pick(rng, MANAGERS),
    startPrice,
    buyNow: Math.max(buyNow, startPrice + bidIncrement(startPrice)),
    currentBid: null,
    bidder: null,
    bidCount: 0,
    createdAt: t - elapsed,
    expiresAt: t - elapsed + duration,
  };
}

export function createMarket(t: number, rng: Rng): MarketState {
  const listings: Listing[] = [];
  // quelques têtes d'affiche dès l'ouverture, pour faire rêver
  const headliners = ATHLETES.filter((a) => rarityOf(a).order >= 3);
  for (let i = 0; i < 6; i++) listings.push(createAiListing(rng, t, [], pick(rng, headliners).id));
  while (listings.length < TARGET_LISTINGS) listings.push(createAiListing(rng, t, []));
  return { listings, myListings: [], news: [], lastTick: t, nextNewsAt: t + 2 * MINUTE };
}

// ───────────── Actualités du marché ─────────────

function pct(factor: number): string {
  return `${factor > 1 ? '+' : '−'}${Math.round(Math.abs(factor - 1) * 100)} %`;
}

export function createNews(rng: Rng, t: number): MarketNews {
  const roll = rng();
  const duration = randInt(rng, 25, 90) * MINUTE;
  if (roll < 0.18) {
    const sports = Object.values(SPORTS);
    const sport = pick(rng, sports);
    const factor = 1.1 + rng() * 0.12;
    return { id: makeUid('n'), at: t, sport: sport.id, factor, duration, text: `Semaine ${sport.of} : ${sport.group} ${pct(factor)}` };
  }
  if (roll < 0.26) {
    const factor = 1.12 + rng() * 0.1;
    return { id: makeUid('n'), at: t, icons: true, factor, duration, text: `Les collectionneurs s’arrachent les espèces disparues : ${pct(factor)}` };
  }
  const athlete = weightedPick(rng, ATHLETES, (a) => 0.2 + a.fame / 100);
  const up = rng() < 0.62;
  const factor = up ? 1.15 + rng() * 0.25 : 0.75 + rng() * 0.15;
  const name = displayName(athlete);
  const text = up
    ? pick(rng, [`Ruée sur les cartes ${name} : ${pct(factor)}`, `La cote « ${name} » s’envole : ${pct(factor)}`, `Tout le monde veut la carte ${name} : ${pct(factor)}`])
    : pick(rng, [`Les cartes ${name} se vendent moins cher : ${pct(factor)}`, `Trop de cartes ${name} sur le marché : ${pct(factor)}`]);
  return { id: makeUid('n'), at: t, athleteId: athlete.id, factor, duration, text };
}

// ───────────── Simulation ─────────────

/** Probabilité par minute qu'un collectionneur IA achète au prix immédiat. */
function buyNowChancePerMinute(buyNow: number, price: number): number {
  const ratio = buyNow / price;
  return Math.min(0.6, 0.42 * Math.exp(-(ratio - 0.9) * 6));
}

/**
 * Fait avancer le marché jusqu'à `now`, minute par minute (rattrapage après une absence inclus).
 * Renvoie le nouvel état et la liste des événements à notifier.
 */
export function advanceMarket(state: MarketState, now: number, rng: Rng): { state: MarketState; events: MarketEvent[] } {
  const events: MarketEvent[] = [];
  let listings = state.listings.map((l) => ({ ...l }));
  let myListings = state.myListings.map((l) => ({ ...l }));
  let news = state.news.slice();
  let nextNewsAt = state.nextNewsAt;

  // au plus 24 h de rattrapage, par pas d'une minute maximum
  let t = Math.max(state.lastTick, now - 24 * 60 * MINUTE);
  if (now <= t) return { state, events };

  while (t < now) {
    const stepSize = Math.min(MINUTE, now - t);
    t += stepSize;
    const dt = stepSize / MINUTE;

    // actualités
    if (t >= nextNewsAt) {
      const item = createNews(rng, t);
      news = [item, ...news].slice(0, 30);
      events.push({ type: 'news', news: item });
      nextNewsAt = t + randInt(rng, 3, 7) * MINUTE;
    }

    // annonces IA : enchères des IA, achats par d'autres managers, expiration
    const kept: Listing[] = [];
    for (const listing of listings) {
      const price = marketPrice(listing.card, t, news);
      if (t >= listing.expiresAt) {
        if (listing.bidder === 'me') {
          events.push({ type: 'won', listing, card: listing.card, price: listing.currentBid ?? listing.startPrice });
        }
        continue;
      }
      // une IA surenchérit si le prix reste intéressant
      const minBid = nextMinBid(listing);
      const remaining = (listing.expiresAt - t) / MINUTE;
      const urgency = remaining < 3 ? 2.2 : 1;
      if (minBid < price * 0.97 && rng() < 0.12 * dt * urgency) {
        const wasMine = listing.bidder === 'me';
        const refund = listing.currentBid ?? 0;
        listing.currentBid = minBid;
        listing.bidder = 'ai';
        listing.bidCount += 1;
        if (wasMine) events.push({ type: 'outbid', listing: { ...listing }, refund });
        // en fin d'enchère, une surenchère repousse un peu la fin (comme sur les vrais sites)
        if (remaining < 1) listing.expiresAt = t + MINUTE;
      }
      // un autre collectionneur achète au prix immédiat (sauf si le joueur mène l'enchère)
      if (listing.bidder !== 'me' && rng() < buyNowChancePerMinute(listing.buyNow, price) * 0.25 * dt) continue;
      kept.push(listing);
    }
    listings = kept;
    while (listings.length < TARGET_LISTINGS) {
      const fresh = createAiListing(rng, t, news);
      const duration = fresh.expiresAt - fresh.createdAt;
      fresh.createdAt = t;
      fresh.expiresAt = t + duration;
      listings.push(fresh);
    }

    // annonces du joueur
    myListings = myListings.map((listing) => {
      if (listing.status !== 'active') return listing;
      const price = marketPrice(listing.card, t, news);
      if (t >= listing.expiresAt) {
        if (listing.currentBid !== null) {
          const sold = { ...listing, status: 'sold' as const, soldPrice: listing.currentBid, buyer: pick(rng, MANAGERS) };
          events.push({ type: 'sold', listing: sold, net: netAfterTax(listing.currentBid) });
          return sold;
        }
        const expired = { ...listing, status: 'expired' as const };
        events.push({ type: 'expired', listing: expired });
        return expired;
      }
      if (rng() < buyNowChancePerMinute(listing.buyNow, price) * dt) {
        const sold = { ...listing, status: 'sold' as const, soldPrice: listing.buyNow, buyer: pick(rng, MANAGERS) };
        events.push({ type: 'sold', listing: sold, net: netAfterTax(listing.buyNow) });
        return sold;
      }
      const minBid = nextMinBid(listing);
      if (minBid <= price * (0.8 + rng() * 0.25) && minBid < listing.buyNow && rng() < 0.3 * dt) {
        const updated = { ...listing, currentBid: minBid, bidCount: listing.bidCount + 1 };
        events.push({ type: 'bid-on-mine', listing: updated });
        return updated;
      }
      return listing;
    });
  }

  // les actualités expirées depuis longtemps sont oubliées
  news = news.filter((item) => now - item.at < item.duration + 6 * 60 * MINUTE);
  return { state: { listings, myListings, news, lastTick: now, nextNewsAt }, events };
}

export function netAfterTax(price: number): number {
  return Math.floor(price * (1 - MARKET_TAX));
}

// ───────────── Actions du joueur ─────────────

export function createMyListing(card: OwnedCard, startPrice: number, buyNow: number, durationMin: number, t: number): MyListing {
  return {
    id: makeUid('m'),
    card,
    startPrice,
    buyNow,
    currentBid: null,
    bidCount: 0,
    createdAt: t,
    expiresAt: t + durationMin * MINUTE,
    status: 'active',
  };
}

/** Prix conseillés pour vendre une carte (enchère de départ et achat immédiat). */
export function suggestedPrices(card: CardFace, t: number, news: MarketNews[]): { start: number; buyNow: number; market: number } {
  const market = marketPrice(card, t, news);
  return { market, start: roundPrice(market * 0.7), buyNow: roundPrice(market * 1.02) };
}

export function priceBounds(card: CardFace): { min: number; max: number } {
  const base = baseValueOf(ATHLETES_BY_ID[card.athleteId], card.variant);
  return { min: Math.max(50, roundPrice(base * 0.2)), max: roundPrice(base * 8) };
}
