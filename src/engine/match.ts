import type { CardFace, EventId, SportId, StatKey, UltiEffect } from './types';
import { ATHLETES, ATHLETES_BY_ID } from '../data/athletes';
import { EVENTS, EVENT_ORDER, SPORTS } from '../data/sports';
import { RECORD_START, canBePrime, isMythe, overallOf, popularityOf, primeRecordStart, rarityOf, statsOf, ultiOf } from './cards';
import { makeUid, pick, shuffle, type Rng } from './random';

// Matchs : 5 manches, chacune est une épreuve (Sprint, Corps à corps, Instinct de survie…).
// À chaque manche, chaque équipe envoie un animal pas encore utilisé. Puissance =
// stats de l'épreuve + particularité de la famille + ulti éventuel + un peu de hasard.

export const TEAM_SIZE = 5;
export const ROUNDS = 5;
export const MAX_ENERGY = 3;

export interface MatchCard extends CardFace {
  uid: string;
}

export interface SideState {
  name: string;
  cards: MatchCard[];
  used: number[];
  energy: number;
  score: number;
  wins: number;
  /** bonus permanent accumulé (ultis de type « toute l'équipe ») */
  buff: number;
  wonLast: boolean;
  /** carte Mythe (créature fantastique) qui donne un bonus à ses animaux */
  mythe?: MatchCard;
}

export interface PowerPart {
  label: string;
  value: number;
}

export interface Play {
  index: number;
  ulti: boolean;
  /** ulti annulé par un contre adverse */
  cancelled: boolean;
  power: number;
  parts: PowerPart[];
}

export interface RoundLog {
  round: number;
  event: EventId;
  me: Play;
  opp: Play;
  winner: 'me' | 'opp' | 'draw';
  points: number;
  /** cartes dont le record a progressé (guépard) */
  records: string[];
}

export interface MatchState {
  id: string;
  division: number;
  events: EventId[];
  round: number;
  me: SideState;
  opp: SideState;
  log: RoundLog[];
  finished: boolean;
}

const CLUB_NAMES = [
  'La Meute du Vercors', 'Le Clan des Marais', 'Les Rôdeurs de la Brousse', 'La Horde des Steppes', 'Les Gardiens du Récif',
  'Le Troupeau des Collines', 'La Colonie du Grand Chêne', 'Les Nocturnes de la Lande', 'Les Seigneurs de la Banquise',
  'La Bande des Mangroves', 'Les Écailles du Désert', 'La Volée des Falaises', 'La Harde des Cèdres',
  'Les Ombres de la Canopée', 'Le Banc des Abysses', 'La Tribu des Baobabs',
];

export function divisionTarget(division: number): number {
  return 64 + (10 - division) * 3.2;
}

/** Équipe adverse d'un niveau proche de la division. */
export function createOpponent(division: number, rng: Rng): { name: string; cards: MatchCard[]; mythe?: MatchCard } {
  const target = divisionTarget(division);
  const athletes = ATHLETES.filter((a) => !isMythe(a));
  let pool = athletes.filter((a) => Math.abs(overallOf(a) - target) <= 3);
  if (pool.length < TEAM_SIZE) pool = athletes.slice().sort((a, b) => Math.abs(overallOf(a) - target) - Math.abs(overallOf(b) - target)).slice(0, 20);
  const chosen = shuffle(rng, pool).slice(0, TEAM_SIZE);
  const cards = chosen.map((athlete) => {
    const variant = division <= 3 && canBePrime(athlete) && rng() < 0.15 ? ('prime' as const) : ('base' as const);
    const record = primeRecordStart(athlete);
    return { uid: makeUid('o'), athleteId: athlete.id, variant, ...(record ? { record } : {}) };
  });
  // dans les divisions hautes, l'adversaire aligne parfois un Mythe qui colle à son équipe
  let mythe: MatchCard | undefined;
  if (division <= 6 && rng() < 0.35) {
    const sports = new Set(chosen.map((a) => a.sport));
    const fitting = ATHLETES.filter((a) => a.mythe && (a.mythe.bonus.sport === 'all' || sports.has(a.mythe.bonus.sport)));
    if (fitting.length) mythe = { uid: makeUid('o'), athleteId: pick(rng, fitting).id, variant: 'base' };
  }
  return { name: pick(rng, CLUB_NAMES), cards, mythe };
}

export const START_ENERGY = 2;

/** Énergie au coup d'envoi : un primate dans l'équipe en apporte une de plus (Intelligence). */
export function startEnergy(cards: CardFace[]): number {
  const prepared = cards.some((card) => ATHLETES_BY_ID[card.athleteId].sport === 'primates');
  return Math.min(MAX_ENERGY, START_ENERGY + (prepared ? 1 : 0));
}

function newSide(name: string, cards: MatchCard[], mythe?: MatchCard): SideState {
  return { name, cards, used: [], energy: startEnergy(cards), score: 0, wins: 0, buff: 0, wonLast: false, ...(mythe ? { mythe } : {}) };
}

export function createMatch(myCards: MatchCard[], division: number, rng: Rng, myName = 'Mon équipe', myMythe?: MatchCard): MatchState {
  const opponent = createOpponent(division, rng);
  return {
    id: makeUid('match'),
    division,
    events: shuffle(rng, EVENT_ORDER).slice(0, ROUNDS),
    round: 0,
    me: newSide(myName, myCards, myMythe),
    opp: newSide(opponent.name, opponent.cards, opponent.mythe),
    log: [],
    finished: false,
  };
}

function effectsOf(card: CardFace): UltiEffect[] {
  return ultiOf(ATHLETES_BY_ID[card.athleteId], card.variant).effects;
}

/** Valeur de base d'un animal pour une épreuve. */
export function eventBase(card: CardFace, eventId: EventId, swap?: StatKey | 'best'): number {
  const event = EVENTS[eventId];
  const athlete = ATHLETES_BY_ID[card.athleteId];
  const stats = statsOf(athlete, card.variant);
  if (swap === 'best') {
    return Math.max(...Object.values(stats));
  }
  if (swap) {
    return stats[swap] * 0.7 + (event.blend ? stats[event.secondary] : stats[event.secondary]) * 0.3;
  }
  if (event.blend) return event.blend.reduce((sum, key) => sum + stats[key], 0) / event.blend.length;
  if (event.popularity) return stats.aur * 0.5 + popularityOf(athlete) * 0.5;
  return stats[event.primary] * 0.7 + stats[event.secondary] * 0.3;
}

/** Bonus de la particularité de la famille. */
function passiveBonus(side: SideState, other: SideState, card: CardFace, eventId: EventId, round: number): PowerPart | null {
  const sport = ATHLETES_BY_ID[card.athleteId].sport;
  const label = SPORTS[sport].passive.name;
  switch (sport) {
    case 'canides': {
      const mates = side.cards.filter((c) => c !== card && ATHLETES_BY_ID[c.athleteId].sport === 'canides').length;
      return mates ? { label, value: Math.min(8, mates * 2) } : null;
    }
    case 'marsupiaux':
      return side.wonLast ? { label, value: 6 } : null;
    case 'felins':
      return eventId === 'face-a-face' || eventId === 'money-time' ? { label, value: 5 } : null;
    case 'ongules':
      return round === 0 || eventId === 'sprint' ? { label, value: 6 } : null;
    case 'reptiles':
      return { label, value: 2 * (round + 1) };
    case 'ours':
      return side.score < other.score ? { label, value: 7 } : null;
    case 'geants':
      return eventId === 'bras-de-fer' || eventId === 'decathlon' ? { label, value: 6 } : null;
    case 'oiseaux':
      return side.wonLast ? { label, value: 5 } : null;
    case 'poissons':
      return eventId === 'money-time' || eventId === 'marathon' ? { label, value: 5 } : null;
    case 'insectes':
      return eventId === 'geste-technique' ? { label, value: 6 } : null;
    case 'petits':
      return eventId === 'geste-technique' || eventId === 'bain-de-foule' ? { label, value: 6 } : null;
    case 'ferme':
      return eventId === 'bain-de-foule' || eventId === 'face-a-face' ? { label, value: 5 } : null;
    case 'prehistoire':
      return round === ROUNDS - 1 ? { label, value: 8 } : null;
    default:
      // invertébrés (malus renvoyés), mammifères marins (malus ignorés), primates (énergie au coup d'envoi),
      // requins (énergie après une manche écrasée) et rapaces (peu de hasard) : voir playRound, newSide et variance
      return null;
  }
}

/** Bonus de la carte Mythe de l'équipe, pour un animal de la bonne famille (ou tous). */
export function mytheBonus(side: Pick<SideState, 'mythe'>, card: CardFace, eventId: EventId): PowerPart | null {
  const def = side.mythe && ATHLETES_BY_ID[side.mythe.athleteId];
  const info = def?.mythe;
  if (!def || !info) return null;
  const sport = ATHLETES_BY_ID[card.athleteId].sport;
  if (info.bonus.sport !== 'all' && info.bonus.sport !== sport) return null;
  const extra = info.bonus.events?.includes(eventId) ? (info.bonus.eventBonus ?? 0) : 0;
  return { label: `Mythe : ${def.last}`, value: info.bonus.value + extra };
}

function variance(card: CardFace): number {
  const sport = ATHLETES_BY_ID[card.athleteId].sport;
  if (sport === 'rapaces') return 1.5;
  if (sport === 'insectes') return 2;
  return 6;
}

interface Computed {
  power: number;
  parts: PowerPart[];
  debuff: number;
  double: boolean;
  teamBoost: number;
  cancels: boolean;
  record: boolean;
}

/** Calcule la puissance d'une carte pour la manche (sans le hasard si rng est absent). */
export function computePower(
  side: SideState,
  other: SideState,
  index: number,
  eventId: EventId,
  round: number,
  useUlti: boolean,
  ultiCancelled: boolean,
  rng?: Rng,
): Computed {
  const card = side.cards[index];
  const athlete = ATHLETES_BY_ID[card.athleteId];
  const ulti = ultiOf(athlete, card.variant);
  const effects = useUlti && !ultiCancelled ? effectsOf(card) : [];
  const parts: PowerPart[] = [];
  let debuff = 0;
  let double = false;
  let teamBoost = 0;
  let cancels = false;
  let record = false;

  const swapEffect = effects.find((e) => e.kind === 'stat-swap' || e.kind === 'best-stat');
  const swap = swapEffect?.kind === 'stat-swap' ? swapEffect.stat : swapEffect?.kind === 'best-stat' ? 'best' : undefined;
  const base = eventBase(card, eventId, swap);
  parts.push({ label: swap ? `${EVENTS[eventId].name} (stat de l’ulti)` : EVENTS[eventId].name, value: base });

  const passive = passiveBonus(side, other, card, eventId, round);
  if (passive) parts.push(passive);
  const mythe = mytheBonus(side, card, eventId);
  if (mythe) parts.push(mythe);
  if (side.buff) parts.push({ label: 'Bonus d’équipe', value: side.buff });

  let ultiBonus = 0;
  for (const effect of effects) {
    switch (effect.kind) {
      case 'boost':
      case 'stat-swap':
      case 'best-stat':
        ultiBonus += effect.value;
        break;
      case 'debuff':
        debuff += effect.value;
        break;
      case 'double':
        double = true;
        ultiBonus += effect.value;
        break;
      case 'team-buff':
        ultiBonus += effect.value;
        teamBoost += effect.boost;
        break;
      case 'comeback':
        ultiBonus += effect.value + (side.score < other.score ? effect.bonus : 0);
        break;
      case 'last-round':
        ultiBonus += effect.value + (round === ROUNDS - 1 ? effect.bonus : 0);
        break;
      case 'event':
        ultiBonus += effect.value + (effect.events.includes(eventId) ? effect.bonus : 0);
        break;
      case 'cancel':
        ultiBonus += effect.value;
        cancels = true;
        break;
      case 'streak':
        ultiBonus += effect.value + effect.perWin * side.wins;
        break;
      case 'record': {
        const start = primeRecordStart(athlete) ?? RECORD_START;
        ultiBonus += effect.value + Math.floor(((card.record ?? start) - start) / 5);
        record = true;
        break;
      }
    }
  }
  if (effects.length) parts.push({ label: `Ulti : ${ulti.name}`, value: ultiBonus });

  let power = parts.reduce((sum, part) => sum + part.value, 0);
  if (rng) {
    const spread = variance(card);
    const luck = (rng() * 2 - 1) * spread;
    parts.push({ label: 'Forme du jour', value: luck });
    power += luck;
  }
  return { power, parts, debuff, double, teamBoost, cancels, record };
}

/** Estimation (sans hasard) pour aider le joueur à choisir. */
export function estimatePower(state: MatchState, index: number, useUlti: boolean): number {
  const eventId = state.events[state.round];
  return computePower(state.me, state.opp, index, eventId, state.round, useUlti, false).power;
}

/** Choix de l'IA : plus la division est haute, plus elle joue juste. */
export function aiChoose(state: MatchState, rng: Rng): { index: number; ulti: boolean } {
  const side = state.opp;
  const eventId = state.events[state.round];
  const available = side.cards.map((_, i) => i).filter((i) => !side.used.includes(i));
  const precision = 0.45 + (10 - state.division) * 0.055; // 0.45 en D10 → 0.95 en D1
  const lastRound = state.round === ROUNDS - 1;
  const canUlti = side.energy > 0;
  const wantsUlti = canUlti && (lastRound || state.round >= 2 || side.energy >= 2 || side.score < state.me.score);
  if (rng() > precision) {
    return { index: pick(rng, available), ulti: wantsUlti && rng() < 0.5 };
  }
  // évalue l'épreuve actuelle en gardant les meilleures cartes pour les épreuves où elles brillent
  let best = available[0];
  let bestScore = -Infinity;
  for (const i of available) {
    const now = computePower(side, state.me, i, eventId, state.round, wantsUlti, false).power;
    const future = state.events.slice(state.round + 1).reduce((sum, ev) => sum + eventBase(side.cards[i], ev), 0) / Math.max(1, ROUNDS - state.round - 1);
    const score = now - (lastRound ? 0 : future * 0.35);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return { index: best, ulti: wantsUlti };
}

const passiveDebuff = (sport: SportId) => (sport === 'amphibiens' ? 4 : 0);

/**
 * Malus subis par un animal : ceux que l'adversaire lui envoie (received), et ceux qu'il a lui-même
 * envoyés à un invertébré, qui les renvoie (Insaisissable). Un mammifère marin ne subit rien (Hydrodynamique) ;
 * un invertébré ne subit rien non plus, et entre deux invertébrés l'échange annule tout.
 */
export function takenMalus(sport: SportId, otherSport: SportId, received: number, sent: number): { direct: number; returned: number } {
  if (sport === 'marins' || sport === 'invertebres') return { direct: 0, returned: 0 };
  return { direct: received, returned: otherSport === 'invertebres' ? sent : 0 };
}

/** Joue la manche en cours. Le choix de l'IA se fait sans connaître celui du joueur. */
export function playRound(state: MatchState, myIndex: number, myUlti: boolean, rng: Rng): { state: MatchState; log: RoundLog } {
  if (state.finished) throw new Error('Match terminé');
  if (state.me.used.includes(myIndex)) throw new Error('Animal déjà utilisé');
  const eventId = state.events[state.round];
  const ai = aiChoose(state, rng);
  const meUlti = myUlti && state.me.energy > 0;
  const oppUlti = ai.ulti && state.opp.energy > 0;

  const meCancels = meUlti && effectsOf(state.me.cards[myIndex]).some((e) => e.kind === 'cancel');
  const oppCancels = oppUlti && effectsOf(state.opp.cards[ai.index]).some((e) => e.kind === 'cancel');
  // un contre annule l'ulti adverse (deux contres s'annulent mutuellement leurs effets hors contre)
  const meCancelled = meUlti && oppCancels && !meCancels;
  const oppCancelled = oppUlti && meCancels && !oppCancels;

  const me = computePower(state.me, state.opp, myIndex, eventId, state.round, meUlti, meCancelled, rng);
  const opp = computePower(state.opp, state.me, ai.index, eventId, state.round, oppUlti, oppCancelled, rng);

  const meSport = ATHLETES_BY_ID[state.me.cards[myIndex].athleteId].sport;
  const oppSport = ATHLETES_BY_ID[state.opp.cards[ai.index].athleteId].sport;
  const meMalus = takenMalus(meSport, oppSport, opp.debuff + passiveDebuff(oppSport), me.debuff + passiveDebuff(meSport));
  const oppMalus = takenMalus(oppSport, meSport, me.debuff + passiveDebuff(meSport), opp.debuff + passiveDebuff(oppSport));
  if (meMalus.direct) me.parts.push({ label: 'Malus adverse', value: -meMalus.direct });
  if (meMalus.returned) me.parts.push({ label: 'Malus renvoyé (Insaisissable)', value: -meMalus.returned });
  if (oppMalus.direct) opp.parts.push({ label: 'Malus adverse', value: -oppMalus.direct });
  if (oppMalus.returned) opp.parts.push({ label: 'Malus renvoyé (Insaisissable)', value: -oppMalus.returned });
  const mePower = Math.max(1, me.power - meMalus.direct - meMalus.returned);
  const oppPower = Math.max(1, opp.power - oppMalus.direct - oppMalus.returned);

  let winner: RoundLog['winner'] = 'draw';
  if (Math.abs(mePower - oppPower) >= 0.5) winner = mePower > oppPower ? 'me' : 'opp';
  const points = winner === 'me' ? (me.double ? 2 : 1) : winner === 'opp' ? (opp.double ? 2 : 1) : 0;

  const records: string[] = [];
  const nextMe: SideState = {
    ...state.me,
    cards: state.me.cards.map((card, i) => {
      if (i === myIndex && me.record) {
        records.push(card.uid);
        const start = primeRecordStart(ATHLETES_BY_ID[card.athleteId]) ?? RECORD_START;
        return { ...card, record: (card.record ?? start) + 1 };
      }
      return card;
    }),
    used: [...state.me.used, myIndex],
    energy: Math.min(MAX_ENERGY, state.me.energy - (meUlti ? 1 : 0) + (winner === 'opp' ? 1 : 0) + (winner === 'me' && meSport === 'requins' && mePower - oppPower >= 10 ? 1 : 0)),
    score: state.me.score + (winner === 'me' ? points : 0),
    wins: state.me.wins + (winner === 'me' ? 1 : 0),
    buff: state.me.buff + me.teamBoost,
    wonLast: winner === 'me',
  };
  const nextOpp: SideState = {
    ...state.opp,
    used: [...state.opp.used, ai.index],
    energy: Math.min(MAX_ENERGY, state.opp.energy - (oppUlti ? 1 : 0) + (winner === 'me' ? 1 : 0) + (winner === 'opp' && oppSport === 'requins' && oppPower - mePower >= 10 ? 1 : 0)),
    score: state.opp.score + (winner === 'opp' ? points : 0),
    wins: state.opp.wins + (winner === 'opp' ? 1 : 0),
    buff: state.opp.buff + opp.teamBoost,
    wonLast: winner === 'opp',
  };

  const log: RoundLog = {
    round: state.round,
    event: eventId,
    me: { index: myIndex, ulti: meUlti, cancelled: meCancelled, power: mePower, parts: me.parts },
    opp: { index: ai.index, ulti: oppUlti, cancelled: oppCancelled, power: oppPower, parts: opp.parts },
    winner,
    points,
    records,
  };
  const round = state.round + 1;
  return {
    state: { ...state, me: nextMe, opp: nextOpp, round, log: [...state.log, log], finished: round >= ROUNDS },
    log,
  };
}

export function matchResult(state: MatchState): 'win' | 'draw' | 'loss' {
  if (state.me.score > state.opp.score) return 'win';
  if (state.me.score < state.opp.score) return 'loss';
  return 'draw';
}

export function rewardFor(result: 'win' | 'draw' | 'loss', division: number): number {
  const scale = 1 + (10 - division) * 0.25;
  const base = result === 'win' ? 500 : result === 'draw' ? 200 : 80;
  return Math.round((base * scale) / 10) * 10;
}

export function teamRating(cards: CardFace[]): number {
  if (!cards.length) return 0;
  return Math.round(cards.reduce((sum, card) => sum + overallOf(ATHLETES_BY_ID[card.athleteId], card.variant), 0) / cards.length);
}

/** Synergies affichées dans l'écran d'équipe. */
export function teamSynergies(cards: CardFace[]): string[] {
  const out: string[] = [];
  const pack = cards.filter((c) => ATHLETES_BY_ID[c.athleteId].sport === 'canides').length;
  if (pack >= 2) out.push(`Meute : +${Math.min(8, (pack - 1) * 2)} pour chaque membre de la meute`);
  const sports = new Set(cards.map((c) => ATHLETES_BY_ID[c.athleteId].sport));
  if (sports.has('primates')) out.push(`Intelligence : ${startEnergy(cards)} points d’énergie au coup d’envoi`);
  if (sports.size >= 4) out.push('Équipe mixte : chaque épreuve trouve son spécialiste');
  const legend = cards.filter((c) => rarityOf(ATHLETES_BY_ID[c.athleteId]).id === 'legendaire').length;
  if (legend) out.push(`${legend} légende${legend > 1 ? 's' : ''} dans l’équipe`);
  return out;
}
