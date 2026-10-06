// Espèces retirées du jeu et remplacées par une autre : l'identifiant d'avant donne celui de l'espèce qui la remplace.
// Les sauvegardes sont converties à leur chargement (store/game.ts) ; les cartes venues du serveur (marché en ligne,
// échanges, vitrines des amis) passent par currentAthleteId.

/**
 * Icônes sans aucune vraie photo possible (disparues avant la photographie, ou jamais photographiées vivantes)
 * → espèce disparue récemment, photographiée vivante (sauvegardes < v7).
 */
export const ICONES_REMPLACEES: Record<string, string> = {
  dodo: 'thylacine',
  aurochs: 'melomys',
  moa: 'paruline-de-bachman',
  'grand-pingouin': 'canard-des-mariannes',
  aepyornis: 'cyprinodon-de-catarina',
  baiji: 'rainette-de-rabb',
  'rhytine-de-steller': 'crapaud-dore',
  'phoque-moine-des-caraibes': 'scinque-de-christmas',
};

/**
 * Icônes retirées du jeu en octobre 2026 → Icône restante de même rareté et, si possible, de même famille
 * (sauvegardes < v9). Il n'y a plus d'Icône Épique : les deux tigres deviennent le lion de l'Atlas (Légendaire).
 */
export const ICONES_RETIREES: Record<string, string> = {
  'tigre-de-java': 'thylacine',
  'tigre-de-la-caspienne': 'lion-de-l-atlas',
  'tigre-de-bali': 'lion-de-l-atlas',
  'panthere-de-formose': 'grizzly-de-californie',
  'cerf-de-schomburgk': 'wapiti-de-l-est',
  'tourte-voyageuse': 'tetras-des-bruyeres',
  'arlequin-de-chiriqui': 'crapaud-dore',
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
  // Épiques (plus d'Icône Épique : elles deviennent Légendaires)
  triceratops: 'lion-de-l-atlas',
  megalodon: 'lion-de-l-atlas',
  brachiosaure: 'lion-de-l-atlas',
  stegosaure: 'lion-de-l-atlas',
  spinosaure: 'lion-de-l-atlas',
  smilodon: 'lion-de-l-atlas',
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
  dimetrodon: 'grizzly-de-californie',
  'lion-des-cavernes': 'grizzly-de-californie',
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
  const next = PREHISTOIRE_REMPLACEE[id] ?? ICONES_REMPLACEES[id] ?? id;
  return ICONES_RETIREES[next] ?? next;
}
