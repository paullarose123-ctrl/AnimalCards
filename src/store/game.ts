import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { CardFace, OwnedCard } from '../engine/types';
import { ATHLETES, ATHLETES_BY_ID } from '../data/athletes';
import { ICONES_REMPLACEES } from '../data/remplacements';
import { SPORTS, SPORT_ORDER } from '../data/sports';
import { canBePrime, quickSellValue, rarityOf, rarityScore } from '../engine/cards';
import { FREE_PACK, NO_DUPE_WINDOW, SHOP_PACKS, openPack, sportPack, type PackDef } from '../engine/packs';
import {
  MAX_MY_LISTINGS,
  advanceMarket,
  createMarket,
  createMyListing,
  netAfterTax,
  nextMinBid,
  type MarketEvent,
  type MarketState,
} from '../engine/market';
import { TEAM_SIZE, autoTeamFrom, canDuel, createDuel, duelResult, playDuelRound, rewardFor, type DuelState } from '../engine/duel';
import { makeUid } from '../engine/random';
import { newBadges } from '../engine/badges';

export const FREE_PACK_INTERVAL = 30 * 60_000;
/** nombre de cartes de la vitrine du profil */
export const FAVORITES_SIZE = 5;
/** nom de la sauvegarde dans le stockage du navigateur */
const SAVE_NAME = 'animalcards-save';
export const MAX_FREE_PACKS = 5;
export const START_BALLES = 5_000;
/** solde affiché « ∞ » quand les crédits illimités sont activées */
export const UNLIMITED_BALLES = 99_999_999_999;
const DIVISION_POINTS_TO_PROMOTE = 7;

/** Graines rendues pour chaque carte d'une espèce retirée du jeu (sauvegardes < v4). */
const REMOVED_CARD_REFUND = 2_000;

/** Anciennes cartes Mythe (sanctuaires, divinités…) → créature fantastique qui les remplace (sauvegardes < v3). */
const MYTHES_REMPLACES: Record<string, string> = {
  sphinx: 'lion-aile',
  sirene: 'long',
  'arche-de-noe': 'tortue-monde',
  serengeti: 'cerf-blanc',
  galapagos: 'quetzalcoatl',
  'grande-barriere': 'kitsune',
  yellowstone: 'grande-ourse',
  amazonie: 'salamandre',
  madagascar: 'hydre',
  kruger: 'behemoth',
  antarctique: 'jormungand',
  'ile-kangourou': 'bunyip',
  ganesh: 'simurgh',
  bastet: 'tigre-blanc',
  anubis: 'cerbere',
  horus: 'oiseau-tonnerre',
  sobek: 'fenrir',
  apis: 'taureau-de-crete',
  khepri: 'jorogumo',
};

/**
 * Version 6 : la carte Chien devient une race (le bouvier bernois, dont c'était la photo) ; les cartes Mythe
 * deviennent des cartes Habitat de même rareté. Les cartes Prime devenues impossibles (Laïka) redeviennent des
 * cartes classiques.
 */
const CARTES_REMPLACEES_V6: Record<string, string> = {
  chien: 'bouvier-bernois',
  'mythe-dragon': 'habitat-galapagos',
  'mythe-phenix': 'habitat-amazonie',
  'mythe-licorne': 'habitat-serengeti',
  'mythe-griffon': 'habitat-antarctique',
  'mythe-pegase': 'habitat-grande-barriere',
  'mythe-kraken': 'habitat-mariannes',
  'mythe-yeti': 'habitat-himalaya',
  'mythe-nessie': 'habitat-borneo',
  'mythe-hydre': 'habitat-sundarbans',
  'mythe-cerbere': 'habitat-yellowstone',
  'mythe-leviathan': 'habitat-banquise',
  'mythe-fenrir': 'habitat-banquise',
  'mythe-kitsune': 'habitat-madagascar',
  'mythe-quetzalcoatl': 'habitat-congo',
  'mythe-long': 'habitat-borneo',
  'mythe-gevaudan': 'habitat-yellowstone',
  'mythe-oiseau-tonnerre': 'habitat-himalaya',
  'mythe-simurgh': 'habitat-sahara',
  'mythe-tigre-blanc': 'habitat-taiga',
  'mythe-lion-aile': 'habitat-okavango',
  'mythe-jormungand': 'habitat-sargasses',
  'mythe-grande-ourse': 'habitat-taiga',
  'mythe-lapin-de-jade': 'habitat-gobi',
  'mythe-salamandre': 'habitat-camargue',
  'mythe-tortue-monde': 'habitat-everglades',
  'mythe-behemoth': 'habitat-pantanal',
  'mythe-cerf-blanc': 'habitat-bialowieza',
  'mythe-dakuwaqa': 'habitat-patagonie',
  'mythe-jorogumo': 'habitat-monteverde',
  'mythe-taureau-de-crete': 'habitat-camargue',
  'mythe-bunyip': 'habitat-outback',
};

/** Espèces sans photo correcte → espèce de la même famille qui les remplace (sauvegardes < v5). */
const ESPECES_REMPLACEES: Record<string, string> = {
  'chat-dore': 'lynx-pardelle',
  musaraigne: 'pika',
  vaquita: 'dauphin-de-commerson',
  'requin-du-groenland': 'requin-citron',
  'requin-lutin': 'requin-oceanique',
};

export type ToastKind = 'success' | 'info' | 'warn' | 'error' | 'gold';
export interface Toast {
  id: string;
  kind: ToastKind;
  text: string;
}

export interface Objective {
  id: string;
  title: string;
  reward: number;
  progress: (state: GameState) => [number, number];
}

export interface Opening {
  packName: string;
  tone: PackDef['tone'];
  /** famille du pack, pour son paysage */
  sport?: PackDef['sport'];
  cards: Array<CardFace & { uid: string; isNew: boolean }>;
}

export interface GameStats {
  packsOpened: number;
  cardsSold: number;
  cardsBought: number;
  matchesPlayed: number;
  matchesWon: number;
  bestPull?: CardFace;
}

export interface GameState {
  balles: number;
  collection: OwnedCard[];
  /** espèces déjà obtenues au moins une fois (album) */
  discovered: Record<string, number>;
  primesFound: Record<string, number>;
  freePacks: number;
  nextFreePackAt: number;
  market: MarketState;
  watchlist: string[];
  team: string[];
  division: number;
  divisionPoints: number;
  /** duel de records en cours */
  match: DuelState | null;
  stats: GameStats;
  claimed: string[];
  muted: boolean;
  /** musique de fond coupée (les effets sonores restent) */
  musicOff: boolean;
  /** crédits illimités (commande de triche ?graines=illimite) */
  unlimited: boolean;
  /** espèces des derniers boosters ouverts : elles ne ressortent pas avant NO_DUPE_WINDOW boosters */
  recentPacks: string[][];
  /** vitrine du profil : les cartes préférées du joueur (uid), FAVORITES_SIZE emplacements, chaîne vide si libre */
  favorites: string[];
  /** photo de profil : l'espèce dont la photo est affichée (chaîne vide : l'initiale du pseudo) */
  avatar: string;
  /** badges de collection : famille complétée → date d'obtention (gardés même si la famille s'agrandit) */
  badges: Record<string, number>;
  opening: Opening | null;
  toasts: Toast[];

  tick: (now?: number) => void;
  openFreePack: () => boolean;
  buyPack: (packId: string) => boolean;
  closeOpening: () => void;
  quickSell: (uids: string[]) => number;
  listCard: (uid: string, startPrice: number, buyNow: number, durationMin: number) => boolean;
  cancelListing: (listingId: string) => void;
  clearFinishedListings: () => void;
  buyListing: (listingId: string) => boolean;
  placeBid: (listingId: string, amount: number) => boolean;
  toggleWatch: (listingId: string) => void;
  setTeamSlot: (slot: number, uid: string | null) => void;
  autoTeam: () => void;
  /** lance un duel de la ligue, ou contre la vitrine d'un ami */
  startMatch: (friend?: { pseudo: string; cards: CardFace[] }) => boolean;
  playMatchRound: (index: number) => void;
  finishMatch: () => void;
  abandonMatch: () => void;
  toggleLock: (uid: string) => void;
  setFavorite: (slot: number, uid: string | null) => void;
  setAvatar: (athleteId: string) => void;
  claimObjective: (id: string) => void;
  toggleMute: () => void;
  toggleMusic: () => void;
  setUnlimited: (on: boolean) => void;
  toast: (kind: ToastKind, text: string) => void;
  dismissToast: (id: string) => void;
  resetGame: () => void;
  /** marché en ligne : ventes, achats et retours déjà réglés dans cette partie (clé « rôle:id ») */
  onlineDone: string[];
  /** retire une carte de la réserve pour la mettre en vente en ligne (null si elle n'est pas vendable) */
  escrowCard: (uid: string) => OwnedCard | null;
  /** rend une carte retirée par escrowCard (la mise en vente a échoué) */
  restoreCard: (card: OwnedCard) => void;
  /** règle une annonce en ligne dans la partie, une seule fois : carte achetée, graines d'une vente ou carte rendue */
  /** reçoit une carte une seule fois (clé déjà réglée : rien), avec une notification */
  receiveOnce: (key: string, card: CardFace, toast: string) => boolean;
  settleOnline: (role: 'buy' | 'sell' | 'back', listing: { id: string; card: CardFace; price: number; buyer?: string | null; expired?: boolean }) => boolean;
}

// Le stockage du navigateur peut être indisponible (navigation privée, aperçu) : on retombe sur la mémoire.
const memory = new Map<string, string>();
const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name) ?? memory.get(name) ?? null;
    } catch {
      return memory.get(name) ?? null;
    }
  },
  setItem: (name, value) => {
    memory.set(name, value);
    try {
      window.localStorage.setItem(name, value);
    } catch {
      /* stockage plein ou bloqué : la partie continue en mémoire */
    }
  },
  removeItem: (name) => {
    memory.delete(name);
    try {
      window.localStorage.removeItem(name);
    } catch {
      /* rien */
    }
  },
};

function toOwned(face: CardFace, now: number): OwnedCard {
  return { uid: makeUid('c'), athleteId: face.athleteId, variant: face.variant, obtainedAt: now, ...(face.record ? { record: face.record } : {}) };
}

/** Nom de l'équipe en duel : le pseudo du joueur connecté (lu dans la session gardée par store/account.ts). */
function playerName(): string {
  try {
    const saved = JSON.parse(window.localStorage.getItem('animalcards-compte') ?? 'null') as { state?: { session?: { pseudo?: string } } } | null;
    return saved?.state?.session?.pseudo ?? 'Mon équipe';
  } catch {
    return 'Mon équipe';
  }
}

function formatBalles(value: number): string {
  return `${value.toLocaleString('fr-FR')} crédits`;
}

function initialState(now: number) {
  return {
    balles: START_BALLES,
    collection: [] as OwnedCard[],
    discovered: {} as Record<string, number>,
    primesFound: {} as Record<string, number>,
    freePacks: 5,
    nextFreePackAt: now + FREE_PACK_INTERVAL,
    market: createMarket(now, Math.random),
    watchlist: [] as string[],
    team: [] as string[],
    division: 10,
    divisionPoints: 0,
    match: null as DuelState | null,
    stats: { packsOpened: 0, cardsSold: 0, cardsBought: 0, matchesPlayed: 0, matchesWon: 0 } as GameStats,
    claimed: [] as string[],
    onlineDone: [] as string[],
    muted: false,
    musicOff: false,
    unlimited: false,
    recentPacks: [] as string[][],
    favorites: [] as string[],
    avatar: '',
    badges: {} as Record<string, number>,
    opening: null as Opening | null,
    toasts: [] as Toast[],
  };
}

function uniqueCount(state: Pick<GameState, 'discovered'>): number {
  return Object.keys(state.discovered).length;
}

function hasRarity(state: Pick<GameState, 'discovered'>, order: number): boolean {
  return Object.keys(state.discovered).some((id) => rarityOf(ATHLETES_BY_ID[id]).order >= order);
}

function bestSportCompletion(state: Pick<GameState, 'discovered'>): [number, number] {
  let best: [number, number] = [0, 1];
  for (const sport of SPORT_ORDER) {
    const all = ATHLETES.filter((a) => a.sport === sport && !a.habitat);
    const owned = all.filter((a) => state.discovered[a.id]).length;
    if (owned / all.length > best[0] / best[1]) best = [owned, all.length];
  }
  return best;
}

export const OBJECTIVES: Objective[] = [
  { id: 'open-3', title: 'Ouvrir 3 boosters', reward: 1_000, progress: (s) => [Math.min(3, s.stats.packsOpened), 3] },
  { id: 'collect-25', title: 'Obtenir 25 espèces différentes', reward: 2_000, progress: (s) => [Math.min(25, uniqueCount(s)), 25] },
  { id: 'first-sale', title: 'Vendre une carte sur le marché', reward: 1_000, progress: (s) => [Math.min(1, s.stats.cardsSold), 1] },
  { id: 'first-buy', title: 'Acheter une carte sur le marché', reward: 1_000, progress: (s) => [Math.min(1, s.stats.cardsBought), 1] },
  { id: 'first-win', title: 'Gagner un duel de records', reward: 1_500, progress: (s) => [Math.min(1, s.stats.matchesWon), 1] },
  { id: 'first-epic', title: 'Obtenir une carte Épique', reward: 2_500, progress: (s) => [hasRarity(s, 3) ? 1 : 0, 1] },
  { id: 'collect-100', title: 'Obtenir 100 espèces différentes', reward: 10_000, progress: (s) => [Math.min(100, uniqueCount(s)), 100] },
  { id: 'division-5', title: 'Atteindre la division 5', reward: 8_000, progress: (s) => [Math.min(5, 10 - s.division), 5] },
  { id: 'first-legend', title: 'Obtenir une carte Légendaire', reward: 10_000, progress: (s) => [hasRarity(s, 4) ? 1 : 0, 1] },
  { id: 'first-prime', title: 'Obtenir une carte Prime', reward: 10_000, progress: (s) => [Object.keys(s.primesFound).length ? 1 : 0, 1] },
  { id: 'sport-complete', title: 'Compléter une famille de l’album', reward: 20_000, progress: (s) => bestSportCompletion(s) },
];

export function packById(id: string): PackDef | undefined {
  if (id === FREE_PACK.id) return FREE_PACK;
  if (id.startsWith('sport-')) {
    const sport = SPORTS[id.slice(6) as keyof typeof SPORTS];
    return sport ? sportPack(sport.id, sport.name) : undefined;
  }
  return SHOP_PACKS.find((pack) => pack.id === id);
}

/** Les cartes Prime d'espèces qui n'ont pas (ou plus) de version Prime redeviennent des cartes classiques. */
function dropInvalidPrimes(state: GameState): GameState {
  const fix = <T extends CardFace>(card: T): T => {
    const athlete = ATHLETES_BY_ID[card.athleteId];
    return card.variant === 'prime' && athlete && !canBePrime(athlete) ? { ...card, variant: 'base' } : card;
  };
  state.collection = state.collection.map(fix);
  state.market = {
    ...state.market,
    listings: state.market.listings.map((listing) => ({ ...listing, card: fix(listing.card) })),
    myListings: state.market.myListings.map((listing) => ({ ...listing, card: fix(listing.card) })),
  };
  state.primesFound = Object.fromEntries(
    Object.entries(state.primesFound ?? {}).filter(([id]) => ATHLETES_BY_ID[id] && canBePrime(ATHLETES_BY_ID[id])),
  );
  if (state.stats.bestPull) state.stats = { ...state.stats, bestPull: fix(state.stats.bestPull) };
  return state;
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => {
      const pushToast = (kind: ToastKind, text: string) => {
        const toast = { id: makeUid('t'), kind, text };
        set((s) => ({ toasts: [...s.toasts.slice(-3), toast] }));
      };

      // tirage d'un booster sans aucune espèce sortie dans les NO_DUPE_WINDOW boosters précédents
      const drawPack = (pack: PackDef): CardFace[] => {
        const recent = get().recentPacks ?? [];
        const cards = openPack(pack, Math.random, new Set(recent.flat()));
        set({ recentPacks: [...recent, cards.map((c) => c.athleteId)].slice(-(NO_DUPE_WINDOW - 1)) });
        return cards;
      };

      const addCards = (faces: CardFace[], packName: string, tone: PackDef['tone'], sport?: PackDef['sport']) => {
        const now = Date.now();
        const state = get();
        const discovered = { ...state.discovered };
        const primesFound = { ...state.primesFound };
        const owned: Opening['cards'] = [];
        const newCards: OwnedCard[] = [];
        let best = state.stats.bestPull;
        for (const face of faces) {
          const card = toOwned(face, now);
          const isNew = face.variant === 'prime' ? !primesFound[face.athleteId] : !discovered[face.athleteId];
          discovered[face.athleteId] = (discovered[face.athleteId] ?? 0) + 1;
          if (face.variant === 'prime') primesFound[face.athleteId] = (primesFound[face.athleteId] ?? 0) + 1;
          owned.push({ ...face, uid: card.uid, isNew });
          newCards.push(card);
          const rank = (c: CardFace) => rarityOf(ATHLETES_BY_ID[c.athleteId]).order * 100 + (c.variant === 'prime' ? 50 : c.variant === 'reverse' ? 20 : 0) + rarityScore(ATHLETES_BY_ID[c.athleteId]);
          if (!best || rank(face) > rank(best)) best = face;
        }
        set((s) => ({
          collection: [...s.collection, ...newCards],
          discovered,
          primesFound,
          opening: { packName, tone, sport, cards: owned },
          stats: { ...s.stats, packsOpened: s.stats.packsOpened + 1, bestPull: best },
        }));
      };

      const applyMarketEvents = (events: MarketEvent[]) => {
        if (!events.length) return;
        const now = Date.now();
        let balles = 0;
        let sold = 0;
        let bought = 0;
        const returned: OwnedCard[] = [];
        const won: OwnedCard[] = [];
        const discovered = { ...get().discovered };
        const primesFound = { ...get().primesFound };
        for (const event of events) {
          switch (event.type) {
            case 'sold':
              balles += event.net;
              sold += 1;
              pushToast('success', `${ATHLETES_BY_ID[event.listing.card.athleteId].last} : vendu ${formatBalles(event.listing.soldPrice ?? 0)} (${formatBalles(event.net)} après la taxe de 5 %)`);
              break;
            case 'expired':
              returned.push(event.listing.card);
              pushToast('info', `Personne n’a acheté ${ATHLETES_BY_ID[event.listing.card.athleteId].last} : la carte revient dans ta réserve`);
              break;
            case 'outbid':
              balles += event.refund;
              pushToast('warn', `Surenchère sur ${ATHLETES_BY_ID[event.listing.card.athleteId].last} : ${formatBalles(event.refund)} remboursées`);
              break;
            case 'won': {
              const card = toOwned(event.card, now);
              won.push(card);
              bought += 1;
              discovered[card.athleteId] = (discovered[card.athleteId] ?? 0) + 1;
              if (card.variant === 'prime') primesFound[card.athleteId] = (primesFound[card.athleteId] ?? 0) + 1;
              pushToast('gold', `Enchère remportée : ${ATHLETES_BY_ID[event.card.athleteId].last} rejoint ta réserve`);
              break;
            }
            case 'bid-on-mine':
              break;
            case 'news':
              break;
          }
        }
        set((s) => ({
          balles: s.balles + balles,
          collection: [...s.collection, ...returned, ...won],
          discovered,
          primesFound,
          stats: { ...s.stats, cardsSold: s.stats.cardsSold + sold, cardsBought: s.stats.cardsBought + bought },
        }));
      };

      return {
        ...initialState(Date.now()),

        tick: (now = Date.now()) => {
          const state = get();
          // boosters gratuits
          if (state.freePacks < MAX_FREE_PACKS && now >= state.nextFreePackAt) {
            const earned = Math.floor((now - state.nextFreePackAt) / FREE_PACK_INTERVAL) + 1;
            const freePacks = Math.min(MAX_FREE_PACKS, state.freePacks + earned);
            set({ freePacks, nextFreePackAt: freePacks >= MAX_FREE_PACKS ? now + FREE_PACK_INTERVAL : state.nextFreePackAt + earned * FREE_PACK_INTERVAL });
          } else if (state.freePacks >= MAX_FREE_PACKS && state.nextFreePackAt < now) {
            set({ nextFreePackAt: now + FREE_PACK_INTERVAL });
          }
          // marché
          const { state: market, events } = advanceMarket(get().market, now, Math.random);
          const listingIds = new Set(market.listings.map((l) => l.id));
          set((s) => ({ market, watchlist: s.watchlist.filter((id) => listingIds.has(id)) }));
          applyMarketEvents(events);
        },

        openFreePack: () => {
          const state = get();
          if (state.freePacks <= 0) return false;
          const cards = drawPack(FREE_PACK);
          set({ freePacks: state.freePacks - 1, nextFreePackAt: state.freePacks >= MAX_FREE_PACKS ? Date.now() + FREE_PACK_INTERVAL : state.nextFreePackAt });
          addCards(cards, FREE_PACK.name, FREE_PACK.tone);
          return true;
        },

        buyPack: (packId) => {
          const pack = packById(packId);
          const state = get();
          if (!pack) return false;
          if (state.balles < pack.price) {
            pushToast('error', `Il te manque ${formatBalles(pack.price - state.balles)} pour ce pack`);
            return false;
          }
          set({ balles: state.balles - pack.price });
          addCards(drawPack(pack), pack.name, pack.tone, pack.sport);
          return true;
        },

        closeOpening: () => set({ opening: null }),

        quickSell: (uids) => {
          const state = get();
          const set_ = new Set(uids);
          const sellable = state.collection.filter((c) => set_.has(c.uid) && !c.locked);
          const total = sellable.reduce((sum, c) => sum + quickSellValue(ATHLETES_BY_ID[c.athleteId], c.variant), 0);
          if (!sellable.length) return 0;
          const sold = new Set(sellable.map((c) => c.uid));
          set((s) => ({
            balles: s.balles + total,
            collection: s.collection.filter((c) => !sold.has(c.uid)),
            team: s.team.filter((uid) => !sold.has(uid)),
          }));
          pushToast('success', `${sellable.length} carte${sellable.length > 1 ? 's' : ''} vendue${sellable.length > 1 ? 's' : ''} au comptoir pour ${formatBalles(total)}`);
          return total;
        },

        listCard: (uid, startPrice, buyNow, durationMin) => {
          const state = get();
          const card = state.collection.find((c) => c.uid === uid);
          if (!card || card.locked) return false;
          const active = state.market.myListings.filter((l) => l.status === 'active').length;
          if (active >= MAX_MY_LISTINGS) {
            pushToast('error', `Tu as déjà ${MAX_MY_LISTINGS} cartes en vente. Attends qu’une vente se termine.`);
            return false;
          }
          if (buyNow <= startPrice) {
            pushToast('error', 'Le prix d’achat immédiat doit être supérieur à l’enchère de départ');
            return false;
          }
          const listing = createMyListing(card, startPrice, buyNow, durationMin, Date.now());
          set((s) => ({
            collection: s.collection.filter((c) => c.uid !== uid),
            team: s.team.filter((t) => t !== uid),
            market: { ...s.market, myListings: [listing, ...s.market.myListings] },
          }));
          pushToast('info', `${ATHLETES_BY_ID[card.athleteId].last} est en vente sur le marché`);
          return true;
        },

        cancelListing: (listingId) => {
          const state = get();
          const listing = state.market.myListings.find((l) => l.id === listingId);
          if (!listing || listing.status !== 'active') return;
          if (listing.currentBid !== null) {
            pushToast('error', 'Impossible de retirer une carte qui a déjà reçu une enchère');
            return;
          }
          set((s) => ({
            collection: [...s.collection, listing.card],
            market: { ...s.market, myListings: s.market.myListings.filter((l) => l.id !== listingId) },
          }));
        },

        clearFinishedListings: () =>
          set((s) => ({ market: { ...s.market, myListings: s.market.myListings.filter((l) => l.status === 'active') } })),

        buyListing: (listingId) => {
          const state = get();
          const listing = state.market.listings.find((l) => l.id === listingId);
          if (!listing) {
            pushToast('error', 'Trop tard : cette carte vient d’être vendue');
            return false;
          }
          const refund = listing.bidder === 'me' ? listing.currentBid ?? 0 : 0;
          if (state.balles + refund < listing.buyNow) {
            pushToast('error', `Il te manque ${formatBalles(listing.buyNow - state.balles - refund)}`);
            return false;
          }
          const card = toOwned(listing.card, Date.now());
          set((s) => ({
            balles: s.balles + refund - listing.buyNow,
            collection: [...s.collection, card],
            discovered: { ...s.discovered, [card.athleteId]: (s.discovered[card.athleteId] ?? 0) + 1 },
            primesFound: card.variant === 'prime' ? { ...s.primesFound, [card.athleteId]: (s.primesFound[card.athleteId] ?? 0) + 1 } : s.primesFound,
            market: { ...s.market, listings: s.market.listings.filter((l) => l.id !== listingId) },
            watchlist: s.watchlist.filter((id) => id !== listingId),
            stats: { ...s.stats, cardsBought: s.stats.cardsBought + 1 },
          }));
          pushToast('gold', `${ATHLETES_BY_ID[card.athleteId].last} rejoint ta réserve pour ${formatBalles(listing.buyNow)}`);
          return true;
        },

        placeBid: (listingId, amount) => {
          const state = get();
          const listing = state.market.listings.find((l) => l.id === listingId);
          if (!listing) {
            pushToast('error', 'Cette enchère est terminée');
            return false;
          }
          if (amount < nextMinBid(listing)) {
            pushToast('error', `L’enchère minimale est de ${formatBalles(nextMinBid(listing))}`);
            return false;
          }
          if (amount >= listing.buyNow) return get().buyListing(listingId);
          const refund = listing.bidder === 'me' ? listing.currentBid ?? 0 : 0;
          if (state.balles + refund < amount) {
            pushToast('error', `Il te manque ${formatBalles(amount - state.balles - refund)}`);
            return false;
          }
          set((s) => ({
            balles: s.balles + refund - amount,
            market: {
              ...s.market,
              listings: s.market.listings.map((l) =>
                l.id === listingId
                  ? { ...l, currentBid: amount, bidder: 'me' as const, bidCount: l.bidCount + 1, expiresAt: Math.max(l.expiresAt, Date.now() + 30_000) }
                  : l,
              ),
            },
            watchlist: s.watchlist.includes(listingId) ? s.watchlist : [...s.watchlist, listingId],
          }));
          pushToast('info', `Enchère de ${formatBalles(amount)} placée. Tu seras remboursé si quelqu’un surenchérit.`);
          return true;
        },

        toggleWatch: (listingId) =>
          set((s) => ({ watchlist: s.watchlist.includes(listingId) ? s.watchlist.filter((id) => id !== listingId) : [...s.watchlist, listingId] })),

        setTeamSlot: (slot, uid) =>
          set((s) => {
            const team = s.team.slice(0, TEAM_SIZE);
            while (team.length < TEAM_SIZE) team.push('');
            if (uid) {
              const existing = team.indexOf(uid);
              if (existing >= 0) team[existing] = '';
            }
            team[slot] = uid ?? '';
            return { team };
          }),

        autoTeam: () => set((s) => ({ team: autoTeamFrom(s.collection) })),

        startMatch: (friend) => {
          const state = get();
          const cards = state.team
            .map((uid) => state.collection.find((c) => c.uid === uid))
            .filter((c): c is OwnedCard => !!c && canDuel(ATHLETES_BY_ID[c.athleteId]));
          if (cards.length < TEAM_SIZE) {
            pushToast('error', `Il faut ${TEAM_SIZE} animaux dans ton équipe pour jouer`);
            return false;
          }
          const match = createDuel(
            cards.map((c) => ({ uid: c.uid, athleteId: c.athleteId, variant: c.variant })),
            state.division,
            Math.random,
            playerName(),
            friend,
          );
          set({ match });
          return true;
        },

        playMatchRound: (index) => {
          const state = get();
          if (!state.match || state.match.finished) return;
          set({ match: playDuelRound(state.match, index, Math.random).state });
        },

        finishMatch: () => {
          const state = get();
          const match = state.match;
          if (!match || !match.finished) return;
          const result = duelResult(match);
          const reward = rewardFor(result, match.division);
          let division = state.division;
          // un duel entre amis rapporte des graines mais ne compte pas pour la ligue
          let points = state.divisionPoints + (match.friend ? 0 : result === 'win' ? 3 : result === 'draw' ? 1 : 0);
          let promoted = false;
          if (points >= DIVISION_POINTS_TO_PROMOTE && division > 1) {
            division -= 1;
            points = 0;
            promoted = true;
          }
          set((s) => ({
            match: null,
            balles: s.balles + reward,
            division,
            divisionPoints: points,
            stats: { ...s.stats, matchesPlayed: s.stats.matchesPlayed + 1, matchesWon: s.stats.matchesWon + (result === 'win' ? 1 : 0) },
          }));
          pushToast(result === 'win' ? 'gold' : 'info', `${result === 'win' ? 'Victoire' : result === 'draw' ? 'Match nul' : 'Défaite'} : +${formatBalles(reward)}`);
          if (promoted) pushToast('gold', `Promotion ! Bienvenue en division ${division}`);
        },

        abandonMatch: () => set({ match: null }),

        toggleLock: (uid) => set((s) => ({ collection: s.collection.map((c) => (c.uid === uid ? { ...c, locked: !c.locked } : c)) })),

        setAvatar: (athleteId) => set({ avatar: athleteId }),

        setFavorite: (slot, uid) =>
          set((s) => {
            const favorites = Array.from({ length: FAVORITES_SIZE }, (_, i) => s.favorites[i] ?? '');
            // une carte n'occupe qu'un emplacement : elle quitte l'ancien si on la place ailleurs
            const next = favorites.map((current) => (uid && current === uid ? '' : current));
            next[slot] = uid ?? '';
            return { favorites: next };
          }),

        claimObjective: (id) => {
          const state = get();
          const objective = OBJECTIVES.find((o) => o.id === id);
          if (!objective || state.claimed.includes(id)) return;
          const [done, total] = objective.progress(state);
          if (done < total) return;
          set((s) => ({ balles: s.balles + objective.reward, claimed: [...s.claimed, id] }));
          pushToast('gold', `Objectif réussi : +${formatBalles(objective.reward)}`);
        },

        toggleMute: () => set((s) => ({ muted: !s.muted })),
        toggleMusic: () => set((s) => ({ musicOff: !s.musicOff })),
        setUnlimited: (on) => {
          if (on === get().unlimited) return;
          set(on ? { unlimited: true, balles: UNLIMITED_BALLES } : { unlimited: false, balles: START_BALLES });
          pushToast(on ? 'gold' : 'info', on ? 'Crédits illimités activés' : 'Crédits illimités désactivés');
        },
        toast: pushToast,
        dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
        resetGame: () => set({ ...initialState(Date.now()) }),

        escrowCard: (uid) => {
          const card = get().collection.find((c) => c.uid === uid);
          if (!card || card.locked) return null;
          set((s) => ({
            collection: s.collection.filter((c) => c.uid !== uid),
            team: s.team.map((t) => (t === uid ? '' : t)),
            favorites: s.favorites.map((f) => (f === uid ? '' : f)),
          }));
          return card;
        },

        restoreCard: (card) => set((s) => ({ collection: s.collection.some((c) => c.uid === card.uid) ? s.collection : [...s.collection, card] })),

        receiveOnce: (key, face, text) => {
          if (get().onlineDone.includes(key) || !ATHLETES_BY_ID[face.athleteId]) return false;
          const card = toOwned(face, Date.now());
          set((s) => ({
            collection: [...s.collection, card],
            discovered: { ...s.discovered, [card.athleteId]: (s.discovered[card.athleteId] ?? 0) + 1 },
            primesFound: card.variant === 'prime' ? { ...s.primesFound, [card.athleteId]: (s.primesFound[card.athleteId] ?? 0) + 1 } : s.primesFound,
            onlineDone: [key, ...s.onlineDone].slice(0, 400),
          }));
          pushToast('gold', text);
          return true;
        },

        settleOnline: (role, listing) => {
          const key = `${role}:${listing.id}`;
          if (get().onlineDone.includes(key)) return false;
          const athlete = ATHLETES_BY_ID[listing.card.athleteId];
          if (!athlete) return false;
          const done = (s: GameState) => [key, ...s.onlineDone].slice(0, 400);
          if (role === 'sell') {
            const net = netAfterTax(listing.price);
            set((s) => ({ balles: s.balles + net, onlineDone: done(s), stats: { ...s.stats, cardsSold: s.stats.cardsSold + 1 } }));
            pushToast('gold', `${listing.buyer ?? 'Un joueur'} a acheté ton ${athlete.last} : +${formatBalles(net)}`);
            return true;
          }
          const card = toOwned(listing.card, Date.now());
          if (role === 'buy') {
            set((s) => ({
              balles: Math.max(0, s.balles - listing.price),
              collection: [...s.collection, card],
              discovered: { ...s.discovered, [card.athleteId]: (s.discovered[card.athleteId] ?? 0) + 1 },
              primesFound: card.variant === 'prime' ? { ...s.primesFound, [card.athleteId]: (s.primesFound[card.athleteId] ?? 0) + 1 } : s.primesFound,
              onlineDone: done(s),
              stats: { ...s.stats, cardsBought: s.stats.cardsBought + 1 },
            }));
            pushToast('gold', `${athlete.last} rejoint ta réserve pour ${formatBalles(listing.price)}`);
            return true;
          }
          set((s) => ({ collection: [...s.collection, card], onlineDone: done(s) }));
          pushToast('info', listing.expired ? `${athlete.last} n’a pas trouvé preneur : la carte revient dans ta réserve` : `${athlete.last} est retiré du marché et revient dans ta réserve`);
          return true;
        },
      };
    },
    {
      // AnimalCards a sa propre sauvegarde (même si AthletiCards est publié sur le même domaine)
      name: SAVE_NAME,
      version: 7,
      storage: createJSONStorage(() => safeStorage),
      migrate: (persisted, version) => {
        let state = persisted as GameState;
        // versions 5 et 7 : des espèces sont remplacées par une autre ; les cartes déjà obtenues deviennent la
        // nouvelle espèce (identifiants remplacés partout dans la sauvegarde). Avant le nettoyage de la version 4,
        // qui retire les cartes d'espèces inconnues.
        const replacements = { ...(version < 5 ? ESPECES_REMPLACEES : {}), ...(version < 7 ? ICONES_REMPLACEES : {}) };
        if (Object.keys(replacements).length) {
          let text = JSON.stringify(state);
          for (const [from, to] of Object.entries(replacements)) text = text.replaceAll(`"${from}"`, `"${to}"`);
          state = JSON.parse(text) as GameState;
        }
        if (version < 3) {
          // version 3 : les cartes Mythe ne sont plus que des créatures fantastiques. Chaque sanctuaire ou divinité
          // déjà obtenu devient la créature de la même famille (identifiants remplacés partout dans la sauvegarde).
          let text = JSON.stringify(state);
          for (const [from, to] of Object.entries(MYTHES_REMPLACES)) text = text.replaceAll(`"mythe-${from}"`, `"mythe-${to}"`);
          state = JSON.parse(text) as GameState;
          // un match en cours avec d'anciens Mythes est abandonné
          state.match = null;
        }
        if (version < 6) {
          let text = JSON.stringify(state);
          for (const [from, to] of Object.entries(CARTES_REMPLACEES_V6)) text = text.replaceAll(`"${from}"`, `"${to}"`);
          state = dropInvalidPrimes(JSON.parse(text) as GameState);
          // l'Arène devient le Duel de records : un ancien match en cours est abandonné, l'emplacement Mythe disparaît
          if (state.match && (state.match as { kind?: string }).kind !== 'duel') state.match = null;
          delete (state as { mythe?: string }).mythe;
        }
        if (version < 2) {
          // avant la version 2, n'importe quelle carte pouvait sortir en Prime :
          // seules les espèces vedettes gardent la leur
          state = dropInvalidPrimes(state);
        }
        if (version < 4) {
          // version 4 : des espèces ont été retirées du jeu. Leurs cartes disparaissent de la réserve, du marché,
          // de l'équipe et de l'album, et les graines de leur revente rapide sont rendues au joueur.
          const known = (id: string) => !!ATHLETES_BY_ID[id];
          const gone = state.collection.filter((card) => !known(card.athleteId));
          const goneUids = new Set(gone.map((card) => card.uid));
          state.balles += gone.length * REMOVED_CARD_REFUND;
          state.collection = state.collection.filter((card) => known(card.athleteId));
          state.team = (state.team ?? []).map((uid) => (goneUids.has(uid) ? '' : uid));
          state.discovered = Object.fromEntries(Object.entries(state.discovered ?? {}).filter(([id]) => known(id)));
          state.primesFound = Object.fromEntries(Object.entries(state.primesFound ?? {}).filter(([id]) => known(id)));
          state.recentPacks = (state.recentPacks ?? []).map((ids) => ids.filter(known));
          state.market = {
            ...state.market,
            listings: state.market.listings.filter((listing) => known(listing.card.athleteId)),
            myListings: state.market.myListings.filter((listing) => known(listing.card.athleteId)),
          };
          if (state.stats.bestPull && !known(state.stats.bestPull.athleteId)) state.stats = { ...state.stats, bestPull: undefined };
          state.match = null;
        }
        return state;
      },
      partialize: (state) => {
        // les notifications et l'ouverture en cours ne sont pas sauvegardées
        const { toasts: _toasts, opening: _opening, ...rest } = state;
        void _toasts;
        void _opening;
        return rest;
      },
    },
  ),
);

// Badges de collection : dès qu'une famille de l'album est complète (booster, marché, échange, partie rechargée…),
// son badge est gagné pour de bon, avec une notification.
function awardBadges(state: GameState) {
  const earned = newBadges(state.discovered, state.badges ?? {});
  if (!earned.length) return;
  const now = Date.now();
  useGame.setState({ badges: { ...state.badges, ...Object.fromEntries(earned.map((sport) => [sport, now])) } });
  for (const sport of earned) useGame.getState().toast('gold', `Badge ${SPORTS[sport].name} : tu as complété la collection ${SPORTS[sport].of} !`);
}

useGame.subscribe((state, previous) => {
  if (state.discovered !== previous.discovered) awardBadges(state);
});
// la sauvegarde du navigateur est relue avant cet abonnement : on vérifie aussi la partie chargée
awardBadges(useGame.getState());

/**
 * Commandes de triche (graines) : seulement en développement et dans la version de test (mode « single »).
 * Sur le site public, les joueurs échangent au marché en ligne : personne ne doit pouvoir se donner des graines.
 */
const CHEATS = import.meta.env.DEV || import.meta.env.MODE === 'single';

// Graines illimitées : le solde est remis au plafond dès qu'une dépense le fait baisser.
// Sur le site public, une partie restée en mode illimité (ancienne triche) repart au solde de départ.
useGame.subscribe((state) => {
  if (state.unlimited && !CHEATS) useGame.setState({ unlimited: false, balles: START_BALLES });
  else if (state.unlimited && state.balles < UNLIMITED_BALLES) useGame.setState({ balles: UNLIMITED_BALLES });
});

/** Fixe le solde à un montant précis (commande de triche). */
function setSolde(amount: number) {
  const value = Math.max(0, Math.round(amount));
  useGame.setState({ unlimited: false, balles: value });
  useGame.getState().toast('gold', `Solde fixé à ${formatBalles(value)}`);
}

// Commandes de triche, dans l'adresse ou dans la console du navigateur (sauvegardées avec la partie) :
//   ?graines=1000000000          → solde fixé à ce montant        (console : animalcards.solde(1000000000))
//   ?graines=illimite            → crédits illimités              (console : animalcards.graines())
//   ?graines=normal              → retour au jeu normal            (console : animalcards.graines(false))
if (typeof window !== 'undefined' && CHEATS) {
  const flag = new URLSearchParams(window.location.search).get('graines');
  if (flag === 'illimite' || flag === 'illimité' || flag === 'infini') useGame.getState().setUnlimited(true);
  else if (flag === 'normal') useGame.getState().setUnlimited(false);
  else if (flag && /^\d+$/.test(flag)) setSolde(Number(flag));
  (window as unknown as { animalcards: { graines: (on?: boolean) => void; solde: (amount: number) => void } }).animalcards = {
    graines: (on = true) => useGame.getState().setUnlimited(on),
    solde: setSolde,
  };

  // Version publiée avec des graines offertes : VITE_GRAINES=100000000 à la compilation fixe ce solde une seule
  // fois par navigateur (au premier lancement), ensuite les graines se dépensent normalement.
  const offered = Number(import.meta.env.VITE_GRAINES ?? 0);
  if (offered > 0) {
    const key = 'animalcards-graines-offertes';
    let already: string | null = null;
    try {
      already = window.localStorage.getItem(key);
    } catch {
      // stockage indisponible : on offre les graines à chaque lancement
    }
    if (already !== String(offered)) {
      setSolde(offered);
      try {
        window.localStorage.setItem(key, String(offered));
      } catch {
        // idem
      }
    }
  }
}

/** La sauvegarde telle qu'elle est stockée (« { state, version } » en JSON), pour l'envoyer au compte du joueur. */
export function readSave(): string | null {
  return safeStorage.getItem(SAVE_NAME) as string | null;
}

/** Remplace la partie par une sauvegarde venue du compte du joueur (migrée si elle vient d'une ancienne version). */
export async function writeSave(raw: string): Promise<void> {
  safeStorage.setItem(SAVE_NAME, raw);
  await useGame.persist.rehydrate();
}

export { formatBalles };
