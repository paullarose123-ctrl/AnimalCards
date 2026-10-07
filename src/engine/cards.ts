import type { Athlete, BaseRarityId, CardFace, Rarity, RarityId, Variant } from './types';
import { currentAthleteId } from '../data/remplacements';
import { SPORT_ORDER } from '../data/sports';
import { ATHLETES, ATHLETES_BY_ID } from '../data/athletes';
import { CHIENS_DANS_LE_MONDE, POPULATIONS } from '../data/populations';
import { clamp } from './random';

// ───────────── Raretés ─────────────
// La rareté mélange deux choses : la célébrité de l'espèce (fame) et sa rareté dans la nature (le nombre
// d'individus encore vivants). Le lion reste Légendaire parce qu'il est très connu ET en déclin ; le loup
// d'Éthiopie, peu connu mais dont il reste 500 individus, monte ; le moineau, partout, reste commun.
export const RARITIES: Record<RarityId, Rarity> = {
  commune: { id: 'commune', name: 'Commune', minScore: 0, baseValue: 150, order: 0 },
  'peu-commune': { id: 'peu-commune', name: 'Peu commune', minScore: 43, baseValue: 450, order: 1 },
  rare: { id: 'rare', name: 'Rare', minScore: 58, baseValue: 1_500, order: 2 },
  epique: { id: 'epique', name: 'Épique', minScore: 72, baseValue: 6_000, order: 3 },
  legendaire: { id: 'legendaire', name: 'Légendaire', minScore: 80, baseValue: 25_000, order: 4 },
  // les Icônes (espèces disparues) forment un palier à part, au-dessus de Légendaire : on y entre par l'extinction,
  // pas par le score
  icone: { id: 'icone', name: 'Icône', minScore: 101, baseValue: 100_000, order: 5 },
};

/** Les cinq paliers des espèces vivantes, du plus courant au plus rare (chances des boosters). */
export const RARITY_ORDER: BaseRarityId[] = ['commune', 'peu-commune', 'rare', 'epique', 'legendaire'];

/** Tous les paliers, Icône comprise (filtres, résumés de collection). */
export const RARITY_TIERS: RarityId[] = [...RARITY_ORDER, 'icone'];

/**
 * Rareté dans la nature (0-100), sur une échelle logarithmique : 1 000 individus → 100, 10 000 → 85,
 * 100 000 → 70, un million → 55, un milliard → 10.
 */
export function scarcityOf(population: number): number {
  return clamp(145 - 15 * Math.log10(Math.max(1, population)), 0, 100);
}

// Pour les cartes sans population (espèces éteintes, Habitats), la célébrité seule fixe la rareté : elle est
// ramenée sur l'échelle du score (anciens seuils 44 / 60 / 75 / 90 → nouveaux seuils 43 / 58 / 72 / 80).
const FAME_STEPS: Array<[number, number]> = [
  [0, 0],
  [44, 43],
  [60, 58],
  [75, 72],
  [90, 80],
  [100, 100],
];

function fameOnly(fame: number): number {
  for (let i = 1; i < FAME_STEPS.length; i++) {
    const [f0, s0] = FAME_STEPS[i - 1];
    const [f1, s1] = FAME_STEPS[i];
    if (fame <= f1) return s0 + ((fame - f0) / (f1 - f0)) * (s1 - s0);
  }
  return 100;
}

const scoreCache = new Map<string, number>();

/** Score de rareté (0-100) : moitié célébrité, moitié rareté dans la nature. */
export function rarityScore(athlete: Athlete): number {
  const cached = scoreCache.get(athlete.id);
  if (cached !== undefined) return cached;
  const population = athlete.retired ? undefined : athlete.race ? CHIENS_DANS_LE_MONDE : POPULATIONS[athlete.id];
  const score = population === undefined ? fameOnly(athlete.fame) : (athlete.fame + scarcityOf(population)) / 2;
  scoreCache.set(athlete.id, score);
  return score;
}

export function rarityOf(athlete: Athlete): Rarity {
  if (athlete.retired && !athlete.habitat) return RARITIES.icone;
  const score = rarityScore(athlete);
  for (let i = RARITY_ORDER.length - 1; i >= 0; i--) {
    const rarity = RARITIES[RARITY_ORDER[i]];
    if (score >= rarity.minScore) return rarity;
  }
  return RARITIES.commune;
}

/** Plage de score couverte par un palier d'espèces vivantes (pour graduer la rareté à l'intérieur du palier). */
function scoreSpan(rarity: Rarity): [number, number] {
  const next = RARITY_ORDER[rarity.order + 1];
  return [rarity.minScore, next ? RARITIES[next].minScore : 100];
}

/**
 * Poids de tirage d'une carte à l'intérieur de sa rareté : plus son score est haut, plus elle sort rarement.
 * Le panda sort environ 6 fois moins souvent que le loup.
 */
export function dropWeight(athlete: Athlete): number {
  // Icônes : d'après leur célébrité seule ; le lion de l'Atlas sort une quarantaine de fois moins que le bubale
  if (isIcon(athlete)) return Math.exp(-(rarityScore(athlete) - 30) / 14);
  const rarity = rarityOf(athlete);
  return Math.exp(-(rarityScore(athlete) - rarity.minScore) / 6);
}

// ───────────── Prime ─────────────
// Seules les espèces vedettes ont une version Prime : un individu célèbre de l'espèce,
// renseigné dans la base (Laïka 1957, Keiko 1993, Sue 1990…).
export function canBePrime(athlete: Athlete): boolean {
  return !!athlete.prime;
}

/** Chance qu'une de ces espèces vedettes, tirée dans un booster, sorte en version Prime. */
export const PRIME_CHANCE = 0.05;
export const PRIME_VALUE_MULTIPLIER = 6;
/** valeur minimale d'une carte Prime au marché */
export const PRIME_MIN_VALUE = 50_000;

// ───────────── Reverse ─────────────
// Finition aquarelle : seules les cartes Rares, Épiques et Légendaires peuvent sortir en Reverse (environ 1 sur 20),
// identique à la classique, mais avec une cote plus élevée. Jamais une Commune, une Peu commune, une Icône ni un Habitat.
export const REVERSE_CHANCE = 0.05;
export const REVERSE_VALUE_MULTIPLIER = 2.5;

export function canBeReverse(athlete: Athlete): boolean {
  const order = rarityOf(athlete).order;
  return !athlete.habitat && order >= RARITIES.rare.order && order <= RARITIES.legendaire.order;
}

/**
 * Carte telle qu'elle existe aujourd'hui : l'espèce qui remplace une espèce retirée, et la version classique d'une
 * finition qui n'existe plus pour elle (Reverse d'une Commune, Peu commune ou Icône ; Prime d'une espèce sans Prime).
 * Sert aux cartes venues du serveur (marché en ligne, échanges, vitrines) ; les sauvegardes sont converties au chargement.
 */
export function currentFace<T extends CardFace>(card: T): T {
  const athleteId = currentAthleteId(card.athleteId);
  const athlete = ATHLETES_BY_ID[athleteId];
  if (!athlete) return { ...card, athleteId };
  const invalid = (card.variant === 'reverse' && !canBeReverse(athlete)) || (card.variant === 'prime' && !canBePrime(athlete));
  return { ...card, athleteId, variant: invalid ? 'base' : card.variant };
}

// ───────────── Habitats ─────────────
// Grands lieux de la planète (Amazonie, Grande Barrière…) : environ 1 carte sur 30 dans les boosters.
export const HABITAT_CHANCE = 0.034;

export function isHabitat(athlete: Athlete): boolean {
  return !!athlete.habitat;
}

// ───────────── Icônes ─────────────
// Espèces disparues depuis 1800 (thylacine, lion de l'Atlas, loup du Japon…) : un palier de rareté à part, au-dessus
// de Légendaire. Un trésor, environ 1 carte sur 1 000 dans les boosters ordinaires. Seul le Pack Icônes, bien plus
// cher, n'en contient que.
export const ICON_CHANCE = 0.001;
/** Une Icône vaut de ICON_MIN_VALUE (une espèce peu connue) à ICON_MAX_VALUE (la plus célèbre). */
export const ICON_MIN_VALUE = 100_000;
export const ICON_MAX_VALUE = 350_000;

/** Poids de tirage d'une Icône : plus elle est célèbre, plus elle sort rarement. */
export function iconWeight(athlete: Athlete): number {
  return dropWeight(athlete);
}

/** Poids de tirage d'un Habitat selon sa rareté : les Légendaires sortent six fois moins que les Rares. */
export function habitatWeight(athlete: Athlete): number {
  const order = rarityOf(athlete).order;
  return order >= 4 ? 1 : order === 3 ? 3 : 6;
}

// ───────────── Valeur marchande ─────────────

/** Valeur de référence d'une carte en graines (sans les fluctuations du marché). */
export function baseValueOf(athlete: Athlete, variant: Variant = 'base'): number {
  const rarity = rarityOf(athlete);
  const multiplier = variant === 'prime' ? PRIME_VALUE_MULTIPLIER : variant === 'reverse' ? REVERSE_VALUE_MULTIPLIER : 1;
  let value: number;
  if (isIcon(athlete)) {
    // une Icône (espèce disparue) est la carte la plus rare du jeu : elle vaut une fortune, d'autant plus qu'elle est célèbre
    value = ICON_MIN_VALUE + clamp((rarityScore(athlete) - 40) / 44, 0, 1) * (ICON_MAX_VALUE - ICON_MIN_VALUE);
  } else {
    const [lo, hi] = scoreSpan(rarity);
    const withinTier = clamp((rarityScore(athlete) - lo) / (hi - lo), 0, 1); // 0 → 1
    value = rarity.baseValue * (1 + withinTier * 1.5);
  }
  value *= multiplier;
  // une Prime est un individu unique et célèbre (Hachikō, Dolly…) : elle vaut cher même si son espèce est commune
  return roundPrice(variant === 'prime' ? Math.max(value, PRIME_MIN_VALUE) : value);
}

/** Arrondit un prix à une valeur "lisible" comme sur un vrai marché. */
export function roundPrice(value: number): number {
  if (value < 1_000) return Math.max(50, Math.round(value / 10) * 10);
  if (value < 10_000) return Math.round(value / 50) * 50;
  if (value < 100_000) return Math.round(value / 250) * 250;
  return Math.round(value / 1_000) * 1_000;
}

/** Valeur de vente rapide (au comptoir) : immédiate mais peu intéressante. */
export function quickSellValue(athlete: Athlete, variant: Variant = 'base'): number {
  return roundPrice(baseValueOf(athlete, variant) * 0.3);
}

export function getAthlete(id: string): Athlete {
  const athlete = ATHLETES_BY_ID[id];
  if (!athlete) throw new Error(`Animal inconnu : ${id}`);
  return athlete;
}

/** Icône : une espèce disparue depuis 1800 (thylacine, lion de l'Atlas, loup du Japon…). */
export function isIcon(athlete: Athlete): boolean {
  return !!athlete.retired;
}

/** Nom affiché. Pour un animal, tout le nom est dans « last » (« Grand requin blanc »). */
export function displayName(athlete: Athlete): string {
  if (!athlete.first) return athlete.last;
  return `${athlete.first} ${athlete.last}`;
}

/** Ligne des années d'une Icône : « Disparu en 1681 ». */
export function extinctionLabel(athlete: Athlete): string {
  if (!athlete.died) return '';
  return athlete.born ? `${athlete.born}–${athlete.died}` : `Disparu en ${athlete.died}`;
}

export function athletesByRarity(): Record<RarityId, Athlete[]> {
  const out = { commune: [], 'peu-commune': [], rare: [], epique: [], legendaire: [], icone: [] } as Record<RarityId, Athlete[]>;
  for (const athlete of ATHLETES) out[rarityOf(athlete).id].push(athlete);
  return out;
}

// ───────────── Numéros de collection ─────────────
// Chaque espèce a son numéro dans l'album, famille par famille (dans l'ordre du jeu), sans trou : N° 001 à N° 4xx.
// Dans chaque famille, ses Icônes (espèces disparues) viennent en dernier. Les Habitats ont leur propre série : H01, H02…
let numbers: Map<string, string> | null = null;

export function collectionNumber(athlete: Athlete): string {
  if (!numbers) {
    numbers = new Map();
    let n = 0;
    for (const sport of SPORT_ORDER) {
      for (const extinct of [false, true]) {
        for (const a of ATHLETES) if (a.sport === sport && !a.habitat && !!a.retired === extinct) numbers.set(a.id, String(++n).padStart(3, '0'));
      }
    }
    let h = 0;
    for (const a of ATHLETES) if (a.habitat) numbers.set(a.id, `H${String(++h).padStart(2, '0')}`);
  }
  return numbers.get(athlete.id) ?? '';
}
