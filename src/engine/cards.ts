import type { ArchetypeId, Athlete, Rarity, RarityId, StatKey, Stats, Ulti, UltiEffect, Variant } from './types';
import { SPORTS } from '../data/sports';
import { ATHLETES, ATHLETES_BY_ID } from '../data/athletes';
import { clamp, hashString, hashUnit } from './random';

// ───────────── Raretés ─────────────
// La rareté vient uniquement de la célébrité (fame). Plus l'espèce est connue, plus sa carte est rare.
export const RARITIES: Record<RarityId, Rarity> = {
  commune: { id: 'commune', name: 'Commune', minFame: 0, baseValue: 150, ultiPower: 8, order: 0 },
  'peu-commune': { id: 'peu-commune', name: 'Peu commune', minFame: 44, baseValue: 450, ultiPower: 10, order: 1 },
  rare: { id: 'rare', name: 'Rare', minFame: 60, baseValue: 1_500, ultiPower: 12, order: 2 },
  epique: { id: 'epique', name: 'Épique', minFame: 75, baseValue: 6_000, ultiPower: 14, order: 3 },
  legendaire: { id: 'legendaire', name: 'Légendaire', minFame: 90, baseValue: 25_000, ultiPower: 18, order: 4 },
};

export const RARITY_ORDER: RarityId[] = ['commune', 'peu-commune', 'rare', 'epique', 'legendaire'];

export function rarityOf(athlete: Athlete): Rarity {
  for (let i = RARITY_ORDER.length - 1; i >= 0; i--) {
    const rarity = RARITIES[RARITY_ORDER[i]];
    if (athlete.fame >= rarity.minFame) return rarity;
  }
  return RARITIES.commune;
}

/** Plage de célébrité couverte par une rareté (pour graduer la rareté à l'intérieur d'un palier). */
function fameSpan(rarity: Rarity): [number, number] {
  const next = RARITY_ORDER[rarity.order + 1];
  return [rarity.minFame, next ? RARITIES[next].minFame : 101];
}

/**
 * Poids de tirage d'une carte à l'intérieur de sa rareté : plus l'espèce est célèbre,
 * plus elle sort rarement. Le lion sort ~5 fois moins souvent que le crocodile du Nil.
 */
export function dropWeight(athlete: Athlete): number {
  const rarity = rarityOf(athlete);
  return Math.exp(-(athlete.fame - rarity.minFame) / 6);
}

// ───────────── Prime ─────────────
// Seules les espèces vedettes ont une version Prime : un individu célèbre de l'espèce,
// renseigné dans la base (Laïka 1957, Keiko 1993, Sue 1990…).
export function canBePrime(athlete: Athlete): boolean {
  return !!athlete.prime;
}

/** Chance qu'une de ces espèces vedettes, tirée dans un booster, sorte en version Prime. */
export const PRIME_CHANCE = 0.08;
export const PRIME_LEVEL_BOOST = 3;
export const PRIME_STAT_BOOST = 4;
export const PRIME_ULTI_BOOST = 4;
export const PRIME_VALUE_MULTIPLIER = 6;

// ───────────── Reverse ─────────────
// Finition holographique : n'importe quelle carte peut sortir en Reverse (environ 1 carte sur 20),
// avec la même note et les mêmes stats que la classique, mais une cote plus élevée.
export const REVERSE_CHANCE = 0.05;
export const REVERSE_VALUE_MULTIPLIER = 2.5;

// ───────────── Mythes ─────────────
// Créatures légendaires, sanctuaires et divinités : environ 1 carte sur 40 dans les boosters.
export const MYTHE_CHANCE = 0.025;

export function isMythe(athlete: Athlete): boolean {
  return !!athlete.mythe;
}

/** Poids de tirage d'un Mythe selon sa rareté : les Légendes sortent six fois moins que les Or. */
export function mytheWeight(athlete: Athlete): number {
  const order = rarityOf(athlete).order;
  return order >= 4 ? 1 : order === 3 ? 3 : 6;
}

// ───────────── Stats ─────────────
// Décalages par profil : force, vitesse, endurance, agilité, intelligence, sang-froid.
// Le sang-froid ne s'affiche pas seul : il nourrit l'Aura avec la note et la célébrité.
type Offsets = [number, number, number, number, number, number]; // for, vit, end, tec, int, men

const ARCHETYPES: Record<ArchetypeId, Offsets> = {
  // félins : puissance (lion, tigre), vitesse pure (guépard), agilité (lynx, léopard des neiges)
  'felin-puissant': [8, 2, -6, 2, -2, 5],
  'felin-sprinteur': [-6, 14, -12, 4, -2, 0],
  'felin-agile': [-4, 4, -2, 8, 0, 1],
  // canidés : la meute qui ne lâche rien, le rusé solitaire
  'canide-meute': [0, 3, 8, 0, 4, 1],
  'canide-ruse': [-8, 4, 0, 5, 9, 0],
  'ours-colosse': [14, -4, 0, -5, 0, 4],
  'ours-grimpeur': [4, -5, -2, 5, 2, 2],
  'primate-force': [12, -4, -2, 0, 6, 4],
  'primate-malin': [-4, 0, 0, 4, 13, 2],
  'primate-acrobate': [-8, 6, 0, 11, 4, 0],
  'geant-colosse': [16, -10, 4, -9, 2, 4],
  'geant-elance': [6, 0, 2, -2, 0, 2],
  'ongule-sprinteur': [-4, 11, 2, 3, -5, 0],
  'ongule-costaud': [11, -2, 6, -6, -4, 2],
  'ongule-endurant': [0, 2, 12, -2, -2, 1],
  'petit-agile': [-14, 6, -2, 10, 5, 0],
  'petit-teigneux': [5, 0, 2, 2, 0, 5],
  'petit-nocturne': [-12, 6, 2, 8, 6, 0],
  // paresseux, capybara, pangolin : tout en calme
  'petit-placide': [0, -14, 6, 4, 0, 6],
  'marsu-sauteur': [4, 6, 5, 2, -4, 0],
  'marsu-placide': [-4, -8, 2, 2, -2, 6],
  'marsu-chasseur': [6, 2, 0, 2, 0, 2],
  'marin-geant': [14, -4, 10, -7, 4, 4],
  'marin-chasseur': [4, 6, 2, 4, 8, 2],
  'marin-pinnipede': [2, 0, 4, 2, 2, 0],
  'requin-predateur': [10, 4, 0, 0, -6, 6],
  'requin-rapide': [0, 12, 4, 2, -6, 2],
  'requin-curieux': [4, -4, 8, 4, -4, 2],
  'poisson-rapide': [2, 12, 4, 2, -6, 2],
  'poisson-coriace': [6, 2, 2, 2, -4, 2],
  'poisson-etrange': [-8, -4, 0, 8, 2, 4],
  'rapace-aigle': [8, 6, 0, 4, 0, 6],
  'rapace-faucon': [-4, 14, -2, 8, -2, 2],
  'rapace-nocturne': [-4, 2, -4, 8, 8, 4],
  'rapace-planeur': [0, -4, 12, 0, 2, 0],
  'oiseau-coureur': [6, 10, 4, -4, -8, 0],
  'oiseau-malin': [-10, 2, 0, 6, 14, 2],
  'oiseau-voyageur': [-6, 4, 14, 2, 0, 0],
  'oiseau-paradeur': [-8, 0, 0, 8, 0, 8],
  'reptile-mastodonte': [12, -2, 0, -2, -4, 6],
  'reptile-venimeux': [-4, 8, -4, 8, 0, 4],
  'reptile-tortue': [4, -16, 14, -2, 2, 4],
  'reptile-lezard': [-6, 4, 0, 10, 2, 0],
  'amphibien-toxique': [-10, 2, 0, 6, 0, 8],
  'amphibien-sauteur': [-4, 8, -2, 7, 0, 0],
  'amphibien-etrange': [0, -6, 6, 2, 2, 2],
  'insecte-colonie': [-2, 0, 8, 6, 6, -2],
  'insecte-guerrier': [6, 4, -2, 6, -4, 2],
  'insecte-voltigeur': [-10, 8, 4, 8, 0, 2],
  arachnide: [-2, 4, 0, 8, 2, 4],
  cephalopode: [-2, 2, -2, 10, 12, 2],
  crustace: [8, 0, 2, 4, -4, 0],
  'invertebre-etrange': [-6, -8, 10, 4, -8, 4],
  'ferme-compagnon': [-4, 4, 2, 4, 6, 2],
  'ferme-trait': [8, 0, 8, -4, -2, 0],
  'ferme-basse-cour': [-4, 0, 0, 2, 2, 2],
  'dino-predateur': [12, 2, -4, 0, 0, 6],
  'dino-colosse': [16, -10, 6, -6, -6, 4],
  'dino-volant': [-6, 8, 4, 8, 0, 2],
  'dino-marin': [8, 6, 2, 0, -4, 4],
};

/** Code court du profil, comme le poste sur une carte FUT. */
export const POSITION_CODES: Record<ArchetypeId, string> = {
  'felin-puissant': 'FAUVE', 'felin-sprinteur': 'SPR', 'felin-agile': 'AGI',
  'canide-meute': 'MEUTE', 'canide-ruse': 'RUSE',
  'ours-colosse': 'COL', 'ours-grimpeur': 'GRIMP',
  'primate-force': 'FORCE', 'primate-malin': 'MALIN', 'primate-acrobate': 'ACRO',
  'geant-colosse': 'COL', 'geant-elance': 'ÉLAN',
  'ongule-sprinteur': 'SPR', 'ongule-costaud': 'COST', 'ongule-endurant': 'END',
  'petit-agile': 'AGI', 'petit-teigneux': 'TEIGN', 'petit-nocturne': 'NUIT', 'petit-placide': 'ZEN',
  'marsu-sauteur': 'SAUT', 'marsu-placide': 'ZEN', 'marsu-chasseur': 'CHASS',
  'marin-geant': 'GÉANT', 'marin-chasseur': 'CHASS', 'marin-pinnipede': 'PINNI',
  'requin-predateur': 'PRÉD', 'requin-rapide': 'SPR', 'requin-curieux': 'CUR',
  'poisson-rapide': 'SPR', 'poisson-coriace': 'COR', 'poisson-etrange': 'ÉTR',
  'rapace-aigle': 'AIGLE', 'rapace-faucon': 'PIQUÉ', 'rapace-nocturne': 'NUIT', 'rapace-planeur': 'PLAN',
  'oiseau-coureur': 'COUR', 'oiseau-malin': 'MALIN', 'oiseau-voyageur': 'VOY', 'oiseau-paradeur': 'PARADE',
  'reptile-mastodonte': 'MASTO', 'reptile-venimeux': 'VENIN', 'reptile-tortue': 'TORT', 'reptile-lezard': 'LÉZ',
  'amphibien-toxique': 'TOX', 'amphibien-sauteur': 'SAUT', 'amphibien-etrange': 'ÉTR',
  'insecte-colonie': 'COLO', 'insecte-guerrier': 'GUER', 'insecte-voltigeur': 'VOL', arachnide: 'ARA',
  cephalopode: 'CÉPH', crustace: 'CRUST', 'invertebre-etrange': 'ÉTR',
  'ferme-compagnon': 'COMP', 'ferme-trait': 'TRAIT', 'ferme-basse-cour': 'BASSE',
  'dino-predateur': 'PRÉD', 'dino-colosse': 'COL', 'dino-volant': 'VOL', 'dino-marin': 'MER',
};

// ───────────── Note ─────────────
// Plus une carte est rare, plus elle est forte : chaque rareté a sa plage de notes.
// Dans une même rareté, la puissance naturelle (level) et la célébrité départagent les espèces.
export const RATING_BANDS: Record<RarityId, [number, number]> = {
  commune: [58, 69],
  'peu-commune': [70, 77],
  rare: [78, 84],
  epique: [85, 90],
  legendaire: [91, 99],
};

const ratingCache = new Map<string, number>();

/** Note de la version classique. */
export function baseRating(athlete: Athlete): number {
  const cached = ratingCache.get(athlete.id);
  if (cached !== undefined) return cached;
  const rarity = rarityOf(athlete);
  const [lo, hi] = RATING_BANDS[rarity.id];
  const [fameLo, fameHi] = fameSpan(rarity);
  const fameScore = clamp((athlete.fame - fameLo) / (fameHi - fameLo), 0, 1);
  const levelScore = clamp((athlete.level - 72) / 27, 0, 1);
  const rating = Math.round(lo + (0.6 * levelScore + 0.4 * fameScore) * (hi - lo));
  ratingCache.set(athlete.id, rating);
  return rating;
}

/** Note globale affichée en haut de la carte (la version Prime gagne +3). */
export function overallOf(athlete: Athlete, variant: Variant = 'base'): number {
  const rating = baseRating(athlete);
  return variant === 'prime' ? Math.min(99, rating + PRIME_LEVEL_BOOST) : rating;
}

const statCache = new Map<string, Stats>();

export function statsOf(athlete: Athlete, variant: Variant = 'base'): Stats {
  const key = `${athlete.id}:${variant}`;
  const cached = statCache.get(key);
  if (cached) return cached;

  const [oFor, oVit, oEnd, oTec, oInt, oMen] = ARCHETYPES[athlete.archetype] ?? [0, 0, 0, 0, 0, 0];
  const rating = baseRating(athlete);
  const noise = (stat: string) => Math.round((hashUnit(`${athlete.id}:${stat}`) - 0.5) * 8);
  const skill = (offset: number, stat: string) => clamp(rating + offset + noise(stat), 25, 99);
  const stats: Stats = {
    vit: skill(oVit, 'vit'),
    for: skill(oFor, 'for'),
    end: skill(oEnd, 'end'),
    tec: skill(oTec, 'tec'),
    int: skill(oInt, 'int'),
    aur: clamp(Math.round(rating * 0.62 + athlete.fame * 0.3 + oMen * 0.8 + 4) + noise('aur'), 25, 99),
  };

  // les stats notées à la main expriment un point fort par rapport au niveau réel : on garde l'écart
  if (athlete.stats) {
    for (const [stat, value] of Object.entries(athlete.stats) as Array<[StatKey, number]>) {
      stats[stat] = clamp(value - athlete.level + rating, 25, 99);
    }
  }
  if (variant === 'prime') {
    for (const stat of Object.keys(stats) as StatKey[]) stats[stat] = Math.min(99, stats[stat] + PRIME_STAT_BOOST);
  }
  statCache.set(key, stats);
  return stats;
}

/** Popularité (0-99), dérivée de la célébrité. Sert à la rareté et à l'épreuve Coup de cœur. */
export function popularityOf(athlete: Athlete): number {
  return clamp(Math.round(20 + athlete.fame * 0.79), 20, 99);
}

// ───────────── Ultis ─────────────

function withValue(effect: UltiEffect, value: number): UltiEffect {
  return { ...effect, value } as UltiEffect;
}

/** Ulti de la carte : signature pour les espèces vedettes, sinon un ulti de sa famille dont la force dépend de la rareté. */
export function ultiOf(athlete: Athlete, variant: Variant = 'base'): Ulti {
  const primeBoost = variant === 'prime' ? PRIME_ULTI_BOOST : 0;
  if (athlete.ulti) {
    if (!primeBoost) return athlete.ulti;
    const effects = athlete.ulti.effects.map((effect, i) => (i === 0 ? withValue(effect, effect.value + primeBoost) : effect));
    return { ...athlete.ulti, effects };
  }
  const sport = SPORTS[athlete.sport];
  const template = sport.ultis[hashString(`${athlete.id}:ulti`) % sport.ultis.length];
  const power = rarityOf(athlete).ultiPower + primeBoost;
  return {
    id: `${athlete.sport}-${template.name}`,
    name: template.name,
    desc: template.desc.replace('{v}', String(power)),
    effects: [withValue(template.effect, power)],
  };
}

// ───────────── Valeur marchande ─────────────

/** Valeur de référence d'une carte en graines (sans les fluctuations du marché). */
export function baseValueOf(athlete: Athlete, variant: Variant = 'base'): number {
  const rarity = rarityOf(athlete);
  const [lo, hi] = fameSpan(rarity);
  const withinTier = (athlete.fame - lo) / (hi - lo); // 0 → 1
  const fameFactor = 1 + withinTier * 1.5;
  const levelFactor = 0.7 + Math.max(0, baseRating(athlete) - 58) / 70;
  const multiplier = variant === 'prime' ? PRIME_VALUE_MULTIPLIER : variant === 'reverse' ? REVERSE_VALUE_MULTIPLIER : 1;
  const value = rarity.baseValue * fameFactor * levelFactor * multiplier;
  return roundPrice(value);
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

/** Icône : une espèce disparue (dodo, thylacine, dinosaures…). */
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
  const out = { commune: [], 'peu-commune': [], rare: [], epique: [], legendaire: [] } as Record<RarityId, Athlete[]>;
  for (const athlete of ATHLETES) out[rarityOf(athlete).id].push(athlete);
  return out;
}

/** Record de vitesse du guépard inscrit sur sa carte, en km/h. Il grimpe à chaque ulti utilisé. */
export const RECORD_START = 110;

export function primeRecordStart(athlete: Athlete): number | undefined {
  return athlete.ulti?.effects.some((effect) => effect.kind === 'record') ? RECORD_START : undefined;
}

/** « 112 km/h » */
export function formatRecord(kmh: number): string {
  return `${kmh} km/h`;
}
