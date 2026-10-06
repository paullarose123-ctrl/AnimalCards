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

/**
 * Créatures préhistoriques retirées du jeu en octobre 2026 → Icône récente de même rareté (sauvegardes < v8) :
 * les Légendaires deviennent le lion de l'Atlas, les Épiques un tigre disparu, et ainsi de suite.
 */
export const PREHISTOIRE_REMPLACEE: Record<string, string> = {
  // Légendaires
  't-rex': 'lion-de-l-atlas',
  mammouth: 'lion-de-l-atlas',
  velociraptor: 'lion-de-l-atlas',
  // Épiques
  triceratops: 'tigre-de-la-caspienne',
  megalodon: 'tigre-de-la-caspienne',
  brachiosaure: 'tigre-de-la-caspienne',
  stegosaure: 'tigre-de-bali',
  spinosaure: 'tigre-de-bali',
  smilodon: 'tigre-de-bali',
  // Rares
  diplodocus: 'loup-du-japon',
  ankylosaure: 'loup-du-japon',
  allosaure: 'loup-du-japon',
  iguanodon: 'loup-du-japon',
  pteranodon: 'conure-de-caroline',
  mosasaure: 'conure-de-caroline',
  archeopteryx: 'conure-de-caroline',
  plesiosaure: 'conure-de-caroline',
  // Peu communes
  giganotosaure: 'bison-du-caucase',
  'ours-des-cavernes': 'bison-du-caucase',
  argentinosaure: 'rhinoceros-de-java-du-vietnam',
  titanoboa: 'autruche-d-arabie',
  quetzalcoatlus: 'autruche-d-arabie',
  dimetrodon: 'panthere-de-formose',
  'lion-des-cavernes': 'panthere-de-formose',
  ichtyosaure: 'loutre-du-japon',
  // Communes
  dunkleosteus: 'bubale',
  megaloceros: 'wapiti-de-l-est',
  trilobite: 'caribou-de-dawson',
  meganeura: 'tetras-des-bruyeres',
  deinosuchus: 'emeu-de-king-island',
};

/** Identifiant actuel d'une carte qui a pu être enregistrée avant un remplacement. */
export function currentAthleteId(id: string): string {
  return PREHISTOIRE_REMPLACEE[id] ?? ICONES_REMPLACEES[id] ?? id;
}
