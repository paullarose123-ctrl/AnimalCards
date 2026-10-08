// Les divisions de la Ligue des naturalistes : de la 10 (débutants) à la 1 (élite), chacune porte le nom d'un animal
// et d'un métal, du « Hérisson de bronze » au « Lion légendaire ». L'animal sert d'emblème (sa photo dans un médaillon).

export type DivisionTier = 'bronze' | 'argent' | 'or' | 'platine' | 'diamant' | 'legende';

export interface DivisionInfo {
  /** numéro interne, 10 → 1 */
  number: number;
  /** nom complet : « Gorille d'argent » */
  name: string;
  /** espèce de l'emblème */
  athleteId: string;
  tier: DivisionTier;
}

const DIVISIONS: DivisionInfo[] = [
  { number: 10, name: 'Hérisson de bronze', athleteId: 'herisson', tier: 'bronze' },
  { number: 9, name: 'Renard de bronze', athleteId: 'renard-roux', tier: 'bronze' },
  { number: 8, name: 'Loup d’argent', athleteId: 'loup', tier: 'argent' },
  { number: 7, name: 'Gorille d’argent', athleteId: 'gorille', tier: 'argent' },
  { number: 6, name: 'Guépard d’or', athleteId: 'guepard', tier: 'or' },
  { number: 5, name: 'Aigle d’or', athleteId: 'aigle-royal', tier: 'or' },
  { number: 4, name: 'Ours de platine', athleteId: 'ours-polaire', tier: 'platine' },
  { number: 3, name: 'Orque de platine', athleteId: 'orque', tier: 'platine' },
  { number: 2, name: 'Tigre de diamant', athleteId: 'tigre', tier: 'diamant' },
  { number: 1, name: 'Lion légendaire', athleteId: 'lion', tier: 'legende' },
];

export const TIER_NAMES: Record<DivisionTier, string> = {
  bronze: 'Bronze',
  argent: 'Argent',
  or: 'Or',
  platine: 'Platine',
  diamant: 'Diamant',
  legende: 'Légende',
};

/** La division d'après son numéro (10 = la plus basse, 1 = l'élite). */
export function divisionInfo(number: number): DivisionInfo {
  return DIVISIONS.find((d) => d.number === number) ?? DIVISIONS[0];
}

/** « division Gorille d'argent » */
export function divisionName(number: number): string {
  return divisionInfo(number).name;
}
