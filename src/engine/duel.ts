import type { Athlete, CardFace } from './types';
import { ATHLETES, ATHLETES_BY_ID } from '../data/athletes';
import { MESURES, formatLongevite, formatPoids, formatTaille } from '../data/mesures';
import { CHIENS_DANS_LE_MONDE, POPULATIONS, formatPopulation } from '../data/populations';
import { canBePrime, isHabitat } from './cards';
import { CONTINENTS_MULTIPLES, type Continent } from '../data/repartition';
import { makeUid, pick, shuffle, type Rng } from './random';

// Duel de records : un jeu de culture générale sur les animaux, avec leurs vraies mesures.
// Un duel se joue en 5 manches ; chaque manche est une question tirée au sort : un record (le plus lourd, le plus
// petit, celui qui vit le plus longtemps…) ou une question oui/non (« Vient d'Afrique ? », « Est un oiseau ? »).
// Chaque joueur envoie un de ses 5 animaux, pas encore joué, sans voir ses mesures : il faut savoir.
// La vraie mesure la plus forte (ou la plus faible, selon le record) gagne ; pour une question, un « oui » bat un « non ».

export const TEAM_SIZE = 5;
export const ROUNDS = 5;

export type RecordId =
  | 'lourd'
  | 'leger'
  | 'grand'
  | 'petit'
  | 'vieux'
  | 'ephemere'
  | 'nombreux'
  | 'rare'
  | 'afrique'
  | 'asie'
  | 'amerique'
  | 'europe'
  | 'oceanie'
  | 'mammifere'
  | 'oiseau'
  | 'reptile'
  | 'poisson';

export interface RecordDef {
  id: RecordId;
  name: string;
  desc: string;
  /** le plus grand chiffre gagne (max) ou le plus petit (min) */
  best: 'max' | 'min';
  /** question oui/non (valeur 1 ou 0) plutôt qu'un record chiffré */
  question?: boolean;
  value: (athlete: Athlete) => number | null;
  format: (value: number, athlete: Athlete) => string;
}

const extinct = (a: Athlete) => !!a.retired || a.sport === 'prehistoire';

/** Individus encore vivants : 0 pour une espèce éteinte, les chiens du monde pour une race de chien. */
function population(a: Athlete): number | null {
  if (extinct(a)) return 0;
  if (a.race) return CHIENS_DANS_LE_MONDE;
  return POPULATIONS[a.id] ?? null;
}

const poids = (a: Athlete) => MESURES[a.id]?.[0] ?? null;
const taille = (a: Athlete) => MESURES[a.id]?.[1] ?? null;
const formatPop = (n: number, a: Athlete) => (n === 0 && extinct(a) ? 'Éteint' : a.race ? `${formatPopulation(n)} (tous les chiens)` : formatPopulation(n));

// ───── continents et classes, pour les questions oui/non ─────

/**
 * Continent du pays emblématique de l'espèce (la Russie compte pour l'Asie : ses espèces sont sibériennes).
 * Les espèces de plusieurs continents sont dans src/data/repartition.ts.
 */
const CONTINENT: Record<string, Continent> = Object.fromEntries(
  (
    [
      ['afrique', 'BW CD CM DZ EG ET GA GH KE LR MA MG MU NA RW SC SD TZ ZA'],
      ['asie', 'CN ID IN JP KZ LK MN MY NP PH SY TH RU'],
      ['europe', 'BE CH DE ES FI FR GB GB-ENG GB-SCT GB-WLS GR HR IE IS IT NL NO PL RO SI SE'],
      ['amerique', 'AR BR CA CL CO CR CU EC GT JM MX PE US GL'],
      ['oceanie', 'AU FJ NZ PG'],
    ] as Array<[Continent, string]>
  ).flatMap(([continent, codes]) => codes.split(' ').map((code) => [code, continent])),
);

type Classe = 'mammifere' | 'oiseau' | 'reptile' | 'poisson' | 'autre';

const CLASSE_DES_FAMILLES: Partial<Record<Athlete['sport'], Classe>> = {
  felins: 'mammifere', canides: 'mammifere', ours: 'mammifere', primates: 'mammifere', geants: 'mammifere',
  ongules: 'mammifere', petits: 'mammifere', marsupiaux: 'mammifere', marins: 'mammifere',
  requins: 'poisson', poissons: 'poisson', rapaces: 'oiseau', oiseaux: 'oiseau', reptiles: 'reptile',
};

/** Exceptions des familles mélangées (ferme, préhistoire) ; le reste de la préhistoire est fait de reptiles. */
const CLASSE_A_PART: Record<string, Classe> = {
  poule: 'oiseau', canard: 'oiseau', oie: 'oiseau', dindon: 'oiseau', pigeon: 'oiseau', perruche: 'oiseau',
  'poisson-rouge': 'poisson', escargot: 'autre', 'ver-a-soie': 'autre',
  mammouth: 'mammifere', smilodon: 'mammifere', 'lion-des-cavernes': 'mammifere', 'ours-des-cavernes': 'mammifere',
  megaloceros: 'mammifere', megalodon: 'poisson', dunkleosteus: 'poisson', archeopteryx: 'oiseau', trilobite: 'autre', meganeura: 'autre',
};

export function classeOf(a: Athlete): Classe {
  if (CLASSE_A_PART[a.id]) return CLASSE_A_PART[a.id];
  if (a.sport === 'ferme') return 'mammifere';
  if (a.sport === 'prehistoire') return 'reptile';
  return CLASSE_DES_FAMILLES[a.sport] ?? 'autre';
}

const yesNo = (v: number) => (v ? 'Oui' : 'Non');
const continentQuestion = (id: Continent, where: string): RecordDef => ({
  id,
  name: `Vit ${where}`,
  desc: `L’animal vit-il ${where} (à l’état sauvage, ou élevé partout pour un animal domestique) ? Oui bat non.`,
  best: 'max',
  question: true,
  value: (a) => (CONTINENT[a.country] === id || CONTINENTS_MULTIPLES[a.id]?.includes(id) ? 1 : 0),
  format: yesNo,
});
const classeQuestion = (id: Exclude<Classe, 'autre'>, name: string): RecordDef => ({
  id,
  name: `Est ${name}`,
  desc: `L’animal est-il ${name} ? Oui bat non.`,
  best: 'max',
  question: true,
  value: (a) => (classeOf(a) === id ? 1 : 0),
  format: yesNo,
});

export const RECORDS: Record<RecordId, RecordDef> = {
  lourd: { id: 'lourd', name: 'Le plus lourd', desc: 'Le poids d’un adulte : le plus lourd gagne.', best: 'max', value: poids, format: (v) => formatPoids(v) },
  leger: { id: 'leger', name: 'Le plus léger', desc: 'Le poids d’un adulte : le plus léger gagne.', best: 'min', value: poids, format: (v) => formatPoids(v) },
  grand: {
    id: 'grand',
    name: 'Le plus grand',
    desc: 'Sa plus grande mesure (longueur, hauteur ou envergure) : le plus grand gagne.',
    best: 'max',
    value: taille,
    format: (v) => formatTaille(v),
  },
  petit: {
    id: 'petit',
    name: 'Le plus petit',
    desc: 'Sa plus grande mesure (longueur, hauteur ou envergure) : le plus petit gagne.',
    best: 'min',
    value: taille,
    format: (v) => formatTaille(v),
  },
  vieux: {
    id: 'vieux',
    name: 'Vit le plus longtemps',
    desc: 'La longévité dans la nature : celui qui vit le plus vieux gagne.',
    best: 'max',
    value: (a) => MESURES[a.id]?.[3] ?? null,
    format: (v) => formatLongevite(v),
  },
  ephemere: {
    id: 'ephemere',
    name: 'Vit le moins longtemps',
    desc: 'La longévité dans la nature : celui qui vit le moins longtemps gagne.',
    best: 'min',
    value: (a) => MESURES[a.id]?.[3] ?? null,
    format: (v) => formatLongevite(v),
  },
  nombreux: {
    id: 'nombreux',
    name: 'Le plus nombreux',
    desc: 'Le nombre d’individus encore vivants sur Terre : le plus nombreux gagne.',
    best: 'max',
    value: population,
    format: formatPop,
  },
  rare: {
    id: 'rare',
    name: 'Le plus rare',
    desc: 'Le nombre d’individus encore vivants : le plus rare gagne. Une espèce éteinte n’en a plus aucun.',
    best: 'min',
    value: population,
    format: formatPop,
  },
  afrique: continentQuestion('afrique', 'en Afrique'),
  asie: continentQuestion('asie', 'en Asie'),
  amerique: continentQuestion('amerique', 'en Amérique'),
  europe: continentQuestion('europe', 'en Europe'),
  oceanie: continentQuestion('oceanie', 'en Océanie'),
  mammifere: classeQuestion('mammifere', 'un mammifère'),
  oiseau: classeQuestion('oiseau', 'un oiseau'),
  reptile: classeQuestion('reptile', 'un reptile'),
  poisson: classeQuestion('poisson', 'un poisson'),
};

export const RECORD_ORDER = Object.keys(RECORDS) as RecordId[];

/** Au plus deux questions oui/non par duel : elles finissent souvent à égalité. */
export const MAX_QUESTIONS = 2;

/** Les 5 manches d'un duel : des records variés, dont au plus MAX_QUESTIONS questions oui/non. */
export function drawRecords(rng: Rng): RecordId[] {
  const out: RecordId[] = [];
  let questions = 0;
  for (const id of shuffle(rng, RECORD_ORDER)) {
    if (out.length >= ROUNDS) break;
    if (RECORDS[id].question) {
      if (questions >= MAX_QUESTIONS) continue;
      questions += 1;
    }
    out.push(id);
  }
  return out;
}

export interface DuelCard extends CardFace {
  uid: string;
}

export interface DuelSide {
  name: string;
  cards: DuelCard[];
  used: number[];
  score: number;
}

export interface DuelRound {
  round: number;
  record: RecordId;
  me: number;
  opp: number;
  /** valeurs mesurées (null : inconnue, la carte perd la manche) */
  myValue: number | null;
  oppValue: number | null;
  winner: 'me' | 'opp' | 'draw';
}

export interface DuelState {
  id: string;
  /** distingue un duel d'un ancien match d'Arène dans les sauvegardes */
  kind: 'duel';
  /** pseudo de l'ami défié (son équipe est sa vitrine) ; absent pour un duel de la ligue */
  friend?: string;
  division: number;
  records: RecordId[];
  round: number;
  me: DuelSide;
  opp: DuelSide;
  log: DuelRound[];
  finished: boolean;
}

const RIVALS = [
  'Les Explorateurs du Vercors', 'Le Club des Marais', 'Les Naturalistes de la Brousse', 'Les Pisteurs des Steppes',
  'Les Plongeurs du Récif', 'Les Botanistes des Collines', 'Les Guetteurs du Grand Chêne', 'Les Veilleurs de la Lande',
  'Les Arpenteurs de la Banquise', 'Les Rangers des Mangroves', 'Les Curieux du Désert', 'Les Ornithologues des Falaises',
  'Les Herboristes des Cèdres', 'Les Grimpeurs de la Canopée', 'Les Sondeurs des Abysses', 'Les Gardes du Baobab',
];

/** Les animaux qui peuvent jouer un duel (pas les cartes Habitat). */
export function canDuel(athlete: Athlete): boolean {
  return !isHabitat(athlete);
}

/**
 * Chance que l'adversaire joue sa meilleure carte pour le record : 35 % en division 10, 95 % en division 1.
 * Le reste du temps, il joue au hasard.
 */
export function aiSkill(division: number): number {
  return Math.min(0.95, 0.35 + (10 - division) * (0.6 / 9));
}

export function createDuel(
  myCards: DuelCard[],
  division: number,
  rng: Rng,
  myName = 'Mon équipe',
  friend?: { pseudo: string; cards: CardFace[] },
): DuelState {
  // contre un ami : les animaux de sa vitrine, complétés au hasard s'il en a moins de 5
  const given = (friend?.cards ?? []).filter((c) => ATHLETES_BY_ID[c.athleteId] && canDuel(ATHLETES_BY_ID[c.athleteId])).slice(0, TEAM_SIZE);
  const taken = new Set(given.map((c) => c.athleteId));
  const pool = ATHLETES.filter((a) => canDuel(a) && !taken.has(a.id));
  const chosen = shuffle(rng, pool).slice(0, TEAM_SIZE - given.length);
  const oppCards = given.map((c) => ({ uid: makeUid('o'), athleteId: c.athleteId, variant: c.variant })).concat(chosen.map((athlete) => ({
    uid: makeUid('o'),
    athleteId: athlete.id,
    variant: division <= 3 && canBePrime(athlete) && rng() < 0.15 ? ('prime' as const) : ('base' as const),
  })));
  return {
    id: makeUid('duel'),
    kind: 'duel',
    ...(friend ? { friend: friend.pseudo } : {}),
    division,
    records: drawRecords(rng),
    round: 0,
    me: { name: myName, cards: myCards, used: [], score: 0 },
    opp: { name: friend?.pseudo ?? pick(rng, RIVALS), cards: oppCards, used: [], score: 0 },
    log: [],
    finished: false,
  };
}

/** Valeur d'une carte pour un record (null si la mesure n'est pas connue). */
export function recordValue(card: CardFace, record: RecordId): number | null {
  return RECORDS[record].value(ATHLETES_BY_ID[card.athleteId]);
}

/** Qui gagne entre deux valeurs : une mesure inconnue perd, deux inconnues font match nul. */
export function compare(record: RecordId, mine: number | null, theirs: number | null): 'me' | 'opp' | 'draw' {
  if (mine === null && theirs === null) return 'draw';
  if (mine === null) return 'opp';
  if (theirs === null) return 'me';
  if (mine === theirs) return 'draw';
  const better = RECORDS[record].best === 'max' ? mine > theirs : mine < theirs;
  return better ? 'me' : 'opp';
}

/** Choix de l'adversaire : sa meilleure carte pour le record (selon son niveau), sinon une carte au hasard. */
export function aiChoose(state: DuelState, rng: Rng): number {
  const record = state.records[state.round];
  const free = state.opp.cards.map((_, i) => i).filter((i) => !state.opp.used.includes(i));
  if (rng() >= aiSkill(state.division)) return pick(rng, free);
  const score = (i: number) => {
    const v = recordValue(state.opp.cards[i], record);
    if (v === null) return -Infinity;
    return RECORDS[record].best === 'max' ? v : -v;
  };
  return free.reduce((best, i) => (score(i) > score(best) ? i : best), free[0]);
}

export function playDuelRound(state: DuelState, myIndex: number, rng: Rng): { state: DuelState; log: DuelRound } {
  const record = state.records[state.round];
  const oppIndex = aiChoose(state, rng);
  const myValue = recordValue(state.me.cards[myIndex], record);
  const oppValue = recordValue(state.opp.cards[oppIndex], record);
  const winner = compare(record, myValue, oppValue);
  const log: DuelRound = { round: state.round, record, me: myIndex, opp: oppIndex, myValue, oppValue, winner };
  const round = state.round + 1;
  return {
    state: {
      ...state,
      round,
      me: { ...state.me, used: [...state.me.used, myIndex], score: state.me.score + (winner === 'me' ? 1 : 0) },
      opp: { ...state.opp, used: [...state.opp.used, oppIndex], score: state.opp.score + (winner === 'opp' ? 1 : 0) },
      log: [...state.log, log],
      finished: round >= ROUNDS,
    },
    log,
  };
}

export function duelResult(state: DuelState): 'win' | 'draw' | 'loss' {
  if (state.me.score > state.opp.score) return 'win';
  if (state.me.score < state.opp.score) return 'loss';
  return 'draw';
}

export function rewardFor(result: 'win' | 'draw' | 'loss', division: number): number {
  const scale = 1 + (10 - division) * 0.25;
  const base = result === 'win' ? 500 : result === 'draw' ? 200 : 80;
  return Math.round((base * scale) / 10) * 10;
}

/** Valeur affichée d'une carte pour un record (« 190 kg », « Éteint », « inconnu »). */
export function formatRecordValue(card: CardFace, record: RecordId, value = recordValue(card, record)): string {
  if (value === null) return 'inconnu';
  return RECORDS[record].format(value, ATHLETES_BY_ID[card.athleteId]);
}

/**
 * Équipe auto : cinq espèces différentes qui couvrent au mieux tous les records
 * (la plus lourde, la plus légère, la plus grande, la plus petite et celle qui vit le plus longtemps).
 */
export function autoTeamFrom(cards: DuelCard[]): string[] {
  const unique = new Map<string, DuelCard>();
  for (const card of cards) if (canDuel(ATHLETES_BY_ID[card.athleteId]) && !unique.has(card.athleteId)) unique.set(card.athleteId, card);
  const list = [...unique.values()];
  const team: DuelCard[] = [];
  for (const record of ['lourd', 'leger', 'vieux', 'rare', 'grand'] as RecordId[]) {
    const best = list
      .filter((c) => !team.includes(c) && recordValue(c, record) !== null)
      .sort((a, b) => {
        const va = recordValue(a, record)!;
        const vb = recordValue(b, record)!;
        return RECORDS[record].best === 'max' ? vb - va : va - vb;
      })[0];
    if (best) team.push(best);
  }
  for (const card of list) if (team.length < TEAM_SIZE && !team.includes(card)) team.push(card);
  return team.slice(0, TEAM_SIZE).map((c) => c.uid);
}
