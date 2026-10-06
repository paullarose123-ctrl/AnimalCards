import type { SceneDef } from '../components/PackScene';
// Types centraux du jeu. Tout le moteur (raretés, marché, duels) s'appuie dessus.
// Le code reprend celui d'AthletiCards : une « Athlete » est ici une espèce animale (ou une carte Habitat)
// et un « sport » est une famille d'animaux.

/** Raretés : les cinq paliers des espèces vivantes, et l'Icône (espèce disparue), un palier à part au-dessus. */
export type RarityId = 'commune' | 'peu-commune' | 'rare' | 'epique' | 'legendaire' | 'icone';

/** Les cinq paliers tirés dans les boosters selon les chances de chaque pack (les Icônes ont leur propre tirage). */
export type BaseRarityId = Exclude<RarityId, 'icone'>;

/** Famille d'animaux : chacune a sa couleur et son emblème. */
export type SportId =
  | 'felins'
  | 'canides'
  | 'ours'
  | 'primates'
  | 'geants'
  | 'ongules'
  | 'petits'
  | 'marsupiaux'
  | 'marins'
  | 'requins'
  | 'poissons'
  | 'rapaces'
  | 'oiseaux'
  | 'reptiles'
  | 'amphibiens'
  | 'insectes'
  | 'invertebres'
  | 'ferme';

/** Profil de l'animal dans sa famille (hérité de l'ancien système de stats, gardé pour classer les espèces). */
export type ArchetypeId =
  // félins
  | 'felin-puissant' | 'felin-sprinteur' | 'felin-agile'
  // canidés
  | 'canide-meute' | 'canide-ruse'
  // ours
  | 'ours-colosse' | 'ours-grimpeur'
  // primates
  | 'primate-force' | 'primate-malin' | 'primate-acrobate'
  // géants
  | 'geant-colosse' | 'geant-elance'
  // ongulés
  | 'ongule-sprinteur' | 'ongule-costaud' | 'ongule-endurant'
  // petits mammifères
  | 'petit-agile' | 'petit-teigneux' | 'petit-nocturne' | 'petit-placide'
  // marsupiaux
  | 'marsu-sauteur' | 'marsu-placide' | 'marsu-chasseur'
  // mammifères marins
  | 'marin-geant' | 'marin-chasseur' | 'marin-pinnipede'
  // requins et raies
  | 'requin-predateur' | 'requin-rapide' | 'requin-curieux'
  // poissons
  | 'poisson-rapide' | 'poisson-coriace' | 'poisson-etrange'
  // rapaces
  | 'rapace-aigle' | 'rapace-faucon' | 'rapace-nocturne' | 'rapace-planeur'
  // oiseaux
  | 'oiseau-coureur' | 'oiseau-malin' | 'oiseau-voyageur' | 'oiseau-paradeur'
  // reptiles
  | 'reptile-mastodonte' | 'reptile-venimeux' | 'reptile-tortue' | 'reptile-lezard'
  // amphibiens
  | 'amphibien-toxique' | 'amphibien-sauteur' | 'amphibien-etrange'
  // insectes et araignées
  | 'insecte-colonie' | 'insecte-guerrier' | 'insecte-voltigeur' | 'arachnide'
  // invertébrés marins
  | 'cephalopode' | 'crustace' | 'invertebre-etrange'
  // ferme et compagnie
  | 'ferme-compagnon' | 'ferme-trait' | 'ferme-basse-cour';

/**
 * Version d'une carte : classique, Prime (un individu célèbre de l'espèce, plus rare)
 * ou Reverse (même carte que la classique, en finition holographique : plus rare, plus chère).
 */
export type Variant = 'base' | 'prime' | 'reverse';

export interface Athlete {
  id: string;
  /** vide pour les animaux : tout le nom est dans « last » */
  first: string;
  /** nom commun de l'espèce (« Lion », « Grand requin blanc ») */
  last: string;
  /** prénom d'abord même dans un pays où le nom de famille se dit en premier (hérité d'AthletiCards) */
  westernName?: boolean;
  /** surnom (« Roi des animaux ») */
  nick?: string;
  /** nom scientifique, affiché en italique dans la fiche */
  latin?: string;
  /** race domestique (les races de chien) : pas d'estimation de population propre */
  race?: true;
  /** famille d'animaux */
  sport: SportId;
  /** milieu de vie affiché sur la carte (période géologique pour la préhistoire) */
  role: string;
  archetype: ArchetypeId;
  /** pays emblématique de l'espèce (pays de découverte pour les fossiles) */
  country: string;
  /** 0-100 : célébrité de l'espèce. Avec la population restante, elle fixe la rareté. */
  fame: number;
  /** 0-100 : ancienne « puissance naturelle » d'AthletiCards, inutilisée */
  level: number;
  /** espèce disparue : carte Icône */
  retired?: boolean;
  /** hérité d'AthletiCards (années de vie), inutilisé ici */
  born?: number;
  /** année de disparition de l'espèce, affichée sur les cartes Icône */
  died?: number;
  fact: string;
  /** individu célèbre de la version Prime : année et histoire */
  prime?: { year: string; note: string };
  /** numéro sur la silhouette (hérité d'AthletiCards) */
  num?: number;
  /** identifiant Wikidata (hérité d'AthletiCards) */
  wikidata?: string;
  /** titre de la page Wikipédia en français, quand il diffère du nom (photos) */
  wiki?: string;
  /** carte « Habitat » : un grand lieu de la planète, et non une espèce */
  habitat?: HabitatInfo;
}

export interface HabitatInfo {
  /** « 5,5 millions de km² », « 2 300 km de long » */
  superficie: string;
  /** espèces du jeu qui y vivent */
  especes: string[];
  /** paysage peint de la carte */
  scene: SceneDef;
  /** protection du lieu (patrimoine mondial…) */
  protection?: string;
}

export interface Rarity {
  id: RarityId;
  name: string;
  /** score de rareté minimal (voir rarityScore) */
  minScore: number;
  /** valeur marchande de base en graines */
  baseValue: number;
  order: number;
}

export interface SportDef {
  id: SportId;
  /** nom affiché (« Félins ») */
  name: string;
  short: string;
  /** les membres de la famille, avec l'article (« les félins »), pour les phrases */
  group: string;
  /** complément (« des félins », « de la ferme ») : « Semaine des félins », « Pack des félins » */
  of: string;
  color: string;
  /** couleur de l'emblème posé sur la couleur de la famille, quand celle-ci est trop claire pour du blanc */
  ink?: string;
}

/** Ce qui définit l'apparence d'une carte. */
export interface CardFace {
  athleteId: string;
  variant: Variant;
  /** ancien record de vitesse du guépard (sauvegardes d'avant les duels), inutilisé */
  record?: number;
}

/** Exemplaire possédé d'une carte (on peut avoir des doublons). */
export interface OwnedCard extends CardFace {
  uid: string;
  obtainedAt: number;
  /** carte verrouillée : ne peut pas être vendue par erreur */
  locked?: boolean;
}
