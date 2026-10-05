// Espèces retirées du jeu et remplacées par une autre : l'identifiant d'avant donne celui de l'espèce qui la remplace.
// Les sauvegardes sont converties à leur chargement (store/game.ts) ; les cartes venues du serveur (marché en ligne,
// échanges, vitrines des amis) passent par currentAthleteId.

/**
 * Icônes sans aucune vraie photo possible (disparues avant la photographie, ou jamais photographiées vivantes)
 * → espèce disparue récemment, photographiée vivante (sauvegardes < v7).
 */
export const ICONES_REMPLACEES: Record<string, string> = {
  dodo: 'tigre-de-java',
  aurochs: 'melomys',
  moa: 'paruline-de-bachman',
  'grand-pingouin': 'canard-des-mariannes',
  aepyornis: 'cyprinodon-de-catarina',
  baiji: 'rainette-de-rabb',
  'rhytine-de-steller': 'arlequin-de-chiriqui',
  'phoque-moine-des-caraibes': 'scinque-de-christmas',
};

/** Identifiant actuel d'une carte qui a pu être enregistrée avant un remplacement. */
export function currentAthleteId(id: string): string {
  return ICONES_REMPLACEES[id] ?? id;
}
