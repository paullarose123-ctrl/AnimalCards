import type { Athlete, CardFace, RarityId, SportId, Variant } from './types';
import { ATHLETES, ATHLETES_BY_ID } from '../data/athletes';
import { SPORTS } from '../data/sports';
import {
  ICON_CHANCE,
  HABITAT_CHANCE,
  PRIME_CHANCE,
  RARITY_ORDER,
  REVERSE_CHANCE,
  canBePrime,
  dropWeight,
  iconWeight,
  isIcon,
  habitatWeight,
  isHabitat,
  rarityOf,
  rarityScore,
} from './cards';
import { weightedPick, weightedPickCached, type Rng } from './random';

export type Odds = Record<RarityId, number>;

export interface PackDef {
  id: string;
  name: string;
  tagline: string;
  price: number;
  size: number;
  odds: Odds;
  primeChance: number;
  /** dernière carte : rareté minimale garantie, ou version Prime garantie (un individu célèbre) */
  guaranteed?: { min: RarityId; odds?: Partial<Odds>; prime?: boolean };
  filter?: (athlete: Athlete) => boolean;
  /** couleur dominante de l'emballage */
  tone: 'bronze' | 'silver' | 'gold' | 'violet' | 'black' | 'icon' | 'prime' | 'sport';
  sport?: SportId;
}

/** La série en cours : tous les animaux du monde. Les suivantes seront consacrées chacune à un pays. */
export const SERIES = { number: 1, name: 'Animaux du monde' } as const;

/** Prochaine série (consacrée à un pays) : sa date de sortie, à minuit heure du joueur. */
export const NEXT_SERIES = { number: 2, release: new Date(2026, 10, 1) };

export const FREE_ODDS: Odds = { commune: 60, 'peu-commune': 26, rare: 10, epique: 3.2, legendaire: 0.8 };

export const FREE_PACK: PackDef = {
  id: 'gratuit',
  name: 'Booster gratuit',
  tagline: '5 cartes, un nouveau toutes les 30 minutes',
  price: 0,
  size: 5,
  odds: FREE_ODDS,
  primeChance: PRIME_CHANCE,
  tone: 'bronze',
};

export const SHOP_PACKS: PackDef[] = [
  {
    id: 'decouverte',
    name: 'Pack Découverte',
    tagline: '5 cartes, mêmes chances que le booster gratuit',
    price: 600,
    size: 5,
    odds: FREE_ODDS,
    primeChance: PRIME_CHANCE,
    tone: 'silver',
  },
  {
    id: 'pro',
    name: 'Pack Pro',
    tagline: '5 cartes dont 1 Rare ou mieux garantie',
    price: 2_500,
    size: 5,
    odds: { commune: 40, 'peu-commune': 32, rare: 19, epique: 7, legendaire: 2 },
    primeChance: PRIME_CHANCE,
    guaranteed: { min: 'rare', odds: { rare: 80, epique: 16, legendaire: 4 } },
    tone: 'gold',
  },
  {
    id: 'elite',
    name: 'Pack Élite',
    tagline: '5 cartes dont 1 Épique ou mieux garantie',
    price: 10_000,
    size: 5,
    odds: { commune: 10, 'peu-commune': 35, rare: 38, epique: 13, legendaire: 4 },
    primeChance: PRIME_CHANCE * 1.25,
    guaranteed: { min: 'epique', odds: { epique: 84, legendaire: 16 } },
    tone: 'violet',
  },
  {
    id: 'icones',
    name: 'Pack Icônes',
    tagline: '1 seule carte, une Icône garantie : une espèce disparue (T. rex, mammouth, thylacine, tigre de Java…)',
    price: 600_000,
    size: 1,
    odds: { commune: 40, 'peu-commune': 30, rare: 18, epique: 9, legendaire: 3 },
    primeChance: PRIME_CHANCE,
    guaranteed: { min: 'commune', odds: { commune: 40, 'peu-commune': 30, rare: 18, epique: 9, legendaire: 3 } },
    filter: (athlete) => !!athlete.retired,
    tone: 'icon',
  },
  {
    id: 'prime',
    name: 'Pack Prime',
    tagline: '3 cartes dont 1 version Prime garantie : l’individu le plus célèbre d’une espèce vedette',
    price: 250_000,
    size: 3,
    odds: { commune: 10, 'peu-commune': 35, rare: 40, epique: 12, legendaire: 3 },
    primeChance: PRIME_CHANCE,
    guaranteed: { min: 'rare', prime: true },
    tone: 'prime',
  },
  {
    id: 'legende',
    name: 'Pack Légende',
    tagline: '3 cartes dont 1 Légendaire garantie',
    price: 90_000,
    size: 3,
    odds: { commune: 0, 'peu-commune': 30, rare: 50, epique: 17, legendaire: 3 },
    primeChance: PRIME_CHANCE,
    guaranteed: { min: 'legendaire', odds: { legendaire: 100 } },
    tone: 'black',
  },
];

export function sportPack(sport: SportId, sportName: string): PackDef {
  return {
    id: `sport-${sport}`,
    name: `Pack ${sportName}`,
    tagline: `5 cartes, uniquement ${SPORTS[sport].group}`,
    // la Préhistoire ne contient que des Icônes : son pack coûte le prix d'un trésor
    price: sport === 'prehistoire' ? 100_000 : 4_000,
    size: 5,
    odds: { commune: 50, 'peu-commune': 30, rare: 14, epique: 4.8, legendaire: 1.2 },
    primeChance: PRIME_CHANCE,
    filter: (athlete) => athlete.sport === sport,
    tone: 'sport',
    sport,
  };
}

const poolCache = new Map<string, Record<RarityId, Athlete[]>>();

/** Booster qui ne contient que des Icônes (Pack Icônes, Pack Préhistoire) : elles y sortent normalement. */
export function isIconPack(pack: PackDef): boolean {
  return pack.tone === 'icon' || pack.sport === 'prehistoire';
}

function poolFor(pack: PackDef): Record<RarityId, Athlete[]> {
  const cached = poolCache.get(pack.id);
  if (cached) return cached;
  const pool = { commune: [], 'peu-commune': [], rare: [], epique: [], legendaire: [] } as Record<RarityId, Athlete[]>;
  for (const athlete of ATHLETES) {
    // les Habitats ont leur propre tirage, et les Icônes aussi hors de leurs packs (voir drawCard)
    if (isHabitat(athlete) || (isIcon(athlete) && !isIconPack(pack))) continue;
    if (!pack.filter || pack.filter(athlete)) pool[rarityOf(athlete).id].push(athlete);
  }
  poolCache.set(pack.id, pool);
  return pool;
}

/** Icônes qui peuvent sortir, très rarement, dans un booster ordinaire. */
export function iconPool(pack: PackDef): Athlete[] {
  if (isIconPack(pack)) return [];
  return ATHLETES.filter((athlete) => isIcon(athlete) && !isHabitat(athlete) && (!pack.filter || pack.filter(athlete)));
}

/** Probabilité qu'une carte ordinaire du booster soit une Icône (affichée en boutique ; 1 pour les packs d'Icônes). */
export function iconOdds(pack: PackDef): number {
  if (isIconPack(pack)) return 1;
  return iconPool(pack).length ? ICON_CHANCE : 0;
}

function rollRarity(rng: Rng, odds: Partial<Odds>, pool: Record<RarityId, Athlete[]>): RarityId {
  const available = RARITY_ORDER.filter((id) => (odds[id] ?? 0) > 0 && pool[id].length > 0);
  if (available.length === 0) {
    // repli : la rareté disponible la plus proche
    return RARITY_ORDER.find((id) => pool[id].length > 0) ?? 'commune';
  }
  return weightedPick(rng, available, (id) => odds[id] ?? 0);
}

function cardOf(athlete: Athlete, variant: Variant): CardFace {
  return { athleteId: athlete.id, variant };
}

/** Habitats (grands lieux de la planète) qui peuvent sortir dans ce booster. */
export function habitatPool(pack: PackDef): Athlete[] {
  return ATHLETES.filter((athlete) => isHabitat(athlete) && (!pack.filter || pack.filter(athlete)));
}

/** Probabilité qu'une carte ordinaire du booster soit un Habitat (affichée en boutique). */
export function habitatOdds(pack: PackDef): number {
  return habitatPool(pack).length ? HABITAT_CHANCE : 0;
}

/** Nombre de boosters sur lesquels une même espèce ne peut pas ressortir. */
export const NO_DUPE_WINDOW = 7;

/**
 * Tire une espèce en écartant celles déjà sorties récemment (`avoid`) et celles du booster en cours (`taken`).
 * Si la rareté tirée n'a plus d'espèce disponible (petit pack de famille), on relâche d'abord la fenêtre des
 * boosters précédents, puis le booster en cours : la rareté promise est toujours respectée.
 */
function pickFresh(rng: Rng, candidates: Athlete[], weight: (athlete: Athlete) => number, avoid: ReadonlySet<string>, taken: ReadonlySet<string>): Athlete {
  if (!avoid.size && !taken.size) return weightedPickCached(rng, candidates, weight);
  const fresh = candidates.filter((athlete) => !avoid.has(athlete.id) && !taken.has(athlete.id));
  if (fresh.length) return weightedPick(rng, fresh, weight);
  const notInPack = candidates.filter((athlete) => !taken.has(athlete.id));
  if (notInPack.length) return weightedPick(rng, notInPack, weight);
  return weightedPickCached(rng, candidates, weight);
}

function drawCard(
  rng: Rng,
  pack: PackDef,
  odds: Partial<Odds>,
  pool: Record<RarityId, Athlete[]>,
  allowHabitat = true,
  avoid: ReadonlySet<string> = new Set(),
  taken: ReadonlySet<string> = new Set(),
): CardFace {
  if (allowHabitat && rng() < HABITAT_CHANCE) {
    const habitats = habitatPool(pack);
    if (habitats.length) return cardOf(pickFresh(rng, habitats, habitatWeight, avoid, taken), 'base');
  }
  let athlete: Athlete | null = null;
  // une Icône, très rarement, à la place d'une carte ordinaire (jamais à la place de la carte garantie)
  if (allowHabitat && rng() < ICON_CHANCE) {
    const icons = iconPool(pack);
    if (icons.length) athlete = pickFresh(rng, icons, iconWeight, avoid, taken);
  }
  athlete ??= pickFresh(rng, pool[rollRarity(rng, odds, pool)], dropWeight, avoid, taken);
  if (canBePrime(athlete) && rng() < pack.primeChance) return cardOf(athlete, 'prime');
  return cardOf(athlete, rng() < REVERSE_CHANCE ? 'reverse' : 'base');
}

/** Probabilité qu'une carte ordinaire du booster sorte en version Reverse (affichée en boutique). */
export function reverseOdds(pack: PackDef): number {
  return (1 - primeOdds(pack)) * REVERSE_CHANCE;
}

const primePools = new Map<string, Athlete[]>();

/** Espèces vedettes qui peuvent sortir en Prime dans ce booster. */
export function primePool(pack: PackDef): Athlete[] {
  let pool = primePools.get(pack.id);
  if (!pool) {
    pool = ATHLETES.filter((athlete) => canBePrime(athlete) && (!pack.filter || pack.filter(athlete)));
    primePools.set(pack.id, pool);
  }
  return pool;
}

/**
 * Poids de tirage de la Prime garantie : les individus des espèces vedettes (Épiques et Légendaires : Elsa la
 * lionne, Knut, Keiko, Sue le T. rex…) sortent bien plus souvent que ceux des espèces communes (Dolly, les chiens).
 */
export function primeWeight(athlete: Athlete): number {
  return [1, 1.5, 3, 4, 4][rarityOf(athlete).order];
}

/** Probabilité qu'une carte ordinaire du booster sorte en version Prime (affichée en boutique). */
export function primeOdds(pack: PackDef): number {
  const pool = poolFor(pack);
  const available = RARITY_ORDER.filter((id) => pack.odds[id] > 0 && pool[id].length > 0);
  const total = available.reduce((sum, id) => sum + pack.odds[id], 0);
  let share = 0;
  for (const id of available) {
    const all = pool[id].reduce((sum, athlete) => sum + dropWeight(athlete), 0);
    const eligible = pool[id].filter(canBePrime).reduce((sum, athlete) => sum + dropWeight(athlete), 0);
    share += (pack.odds[id] / total) * (eligible / all);
  }
  return share * pack.primeChance;
}

/**
 * Ouvre un booster. Les cartes sont renvoyées de la moins rare à la plus rare (suspense garanti).
 * Jamais deux fois la même espèce dans un booster, ni une espèce listée dans `avoid`
 * (celles des NO_DUPE_WINDOW derniers boosters ouverts, tenues à jour par le magasin du jeu).
 */
export function openPack(pack: PackDef, rng: Rng, avoid: ReadonlySet<string> = new Set()): CardFace[] {
  const pool = poolFor(pack);
  const cards: CardFace[] = [];
  const taken = new Set<string>();
  for (let i = 0; i < pack.size; i++) {
    const isLast = i === pack.size - 1;
    let card: CardFace;
    if (isLast && pack.guaranteed?.prime) {
      card = cardOf(pickFresh(rng, primePool(pack), primeWeight, avoid, taken), 'prime');
    } else if (isLast && pack.guaranteed) {
      // la carte garantie reste un animal de la rareté promise
      card = drawCard(rng, pack, pack.guaranteed.odds ?? { [pack.guaranteed.min]: 1 }, pool, false, avoid, taken);
    } else {
      card = drawCard(rng, pack, pack.odds, pool, true, avoid, taken);
    }
    taken.add(card.athleteId);
    cards.push(card);
  }
  return sortByRarity(cards);
}

export function cardRank(card: CardFace): number {
  const athlete = ATHLETES_BY_ID[card.athleteId];
  // une Prime est toujours révélée en dernier, quelle que soit la rareté de son espèce
  return (card.variant === 'prime' ? 100 : 0) + rarityOf(athlete).order * 10 + (card.variant === 'reverse' ? 2 : 0) + rarityScore(athlete) / 100;
}

export function sortByRarity(cards: CardFace[]): CardFace[] {
  return cards.slice().sort((a, b) => cardRank(a) - cardRank(b));
}

export function allPacks(): PackDef[] {
  return [FREE_PACK, ...SHOP_PACKS];
}
