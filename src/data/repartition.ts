// Espèces qui vivent sur plusieurs continents : leur carte montre le logo « Plusieurs continents » (un globe)
// au lieu d'un drapeau, et le duel de culture générale sait sur quels continents elles vivent.
// Animaux domestiques et espèces répandues partout : les cinq continents habités.

export type Continent = 'afrique' | 'asie' | 'amerique' | 'europe' | 'oceanie';

const PARTOUT: Continent[] = ['afrique', 'asie', 'amerique', 'europe', 'oceanie'];
const HOLARCTIQUE: Continent[] = ['europe', 'asie', 'amerique'];
const EURASIE: Continent[] = ['europe', 'asie'];

export const CONTINENTS_MULTIPLES: Record<string, Continent[]> = {
  // domestiques, élevés sur tous les continents
  chat: PARTOUT,
  cheval: PARTOUT,
  vache: PARTOUT,
  mouton: PARTOUT,
  poule: PARTOUT,
  cochon: PARTOUT,
  chevre: PARTOUT,
  ane: PARTOUT,
  canard: PARTOUT,
  oie: PARTOUT,
  dindon: PARTOUT,
  abeille: PARTOUT,
  // déjà « monde entier »
  rat: PARTOUT,
  souris: PARTOUT,
  moineau: PARTOUT,
  pigeon: PARTOUT,
  fourmi: PARTOUT,
  moustique: PARTOUT,
  puce: PARTOUT,
  'mille-pattes': PARTOUT,
  tardigrade: PARTOUT,
  // sauvages, sur plusieurs continents (dont introduites, comme le lapin en Australie)
  'renard-roux': PARTOUT,
  'faucon-pelerin': PARTOUT,
  balbuzard: PARTOUT,
  effraie: PARTOUT,
  'sterne-arctique': PARTOUT,
  lapin: ['europe', 'afrique', 'amerique', 'oceanie'],
  hirondelle: ['europe', 'asie', 'afrique', 'amerique'],
  'aigle-royal': ['europe', 'asie', 'afrique', 'amerique'],
  corbeau: ['europe', 'asie', 'afrique', 'amerique'],
  'mante-religieuse': ['europe', 'asie', 'afrique', 'amerique'],
  loup: HOLARCTIQUE,
  'ours-brun': HOLARCTIQUE,
  'ours-polaire': HOLARCTIQUE,
  hermine: HOLARCTIQUE,
  belette: HOLARCTIQUE,
  glouton: HOLARCTIQUE,
  elan: HOLARCTIQUE,
  renne: HOLARCTIQUE,
  'renard-polaire': HOLARCTIQUE,
  harfang: HOLARCTIQUE,
  cigogne: ['europe', 'afrique', 'asie'],
  sanglier: ['europe', 'asie', 'afrique'],
  cerf: ['europe', 'asie', 'afrique'],
  leopard: ['afrique', 'asie'],
  lynx: EURASIE,
  'chacal-dore': EURASIE,
  'crocodile-marin': ['asie', 'oceanie'],
};
