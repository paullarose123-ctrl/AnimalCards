import type { SportId } from './types';
import { ATHLETES } from '../data/athletes';
import { SPORT_ORDER } from '../data/sports';

// Badges de collection : une famille de l'album complétée (toutes ses espèces découvertes, Icônes comprises,
// comme le compte « 24/24 » de l'onglet de l'album) donne le badge de la famille, gardé pour toujours.

/** Espèces découvertes et espèces de la famille, comme dans l'onglet de l'album. */
export function familyProgress(discovered: Record<string, number>, sport: SportId): [number, number] {
  let owned = 0;
  let total = 0;
  for (const athlete of ATHLETES) {
    if (athlete.sport !== sport || athlete.habitat) continue;
    total += 1;
    if (discovered[athlete.id]) owned += 1;
  }
  return [owned, total];
}

/** Familles complètes de l'album. */
export function completedFamilies(discovered: Record<string, number>): SportId[] {
  return SPORT_ORDER.filter((sport) => {
    const [owned, total] = familyProgress(discovered, sport);
    return total > 0 && owned === total;
  });
}

/** Familles complètes qui n'ont pas encore leur badge. */
export function newBadges(discovered: Record<string, number>, badges: Record<string, number>): SportId[] {
  return completedFamilies(discovered).filter((sport) => !badges[sport]);
}
