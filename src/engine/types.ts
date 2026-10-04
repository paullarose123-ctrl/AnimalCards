// Types centraux du jeu. Tout le moteur (raretés, marché, matchs) s'appuie dessus.
// Le code reprend celui d'AthletiCards : une « Athlete » est ici une espèce animale (ou une carte Mythe)
// et un « sport » est une famille d'animaux.

export type StatKey = 'vit' | 'for' | 'end' | 'tec' | 'int' | 'aur';
export type Stats = Record<StatKey, number>;

export type RarityId = 'commune' | 'peu-commune' | 'rare' | 'epique' | 'legendaire';

/** Famille d'animaux : chacune a sa couleur, sa particularité en match et ses ultis. */
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
  | 'ferme'
  | 'prehistoire';

/** Profil de stats : décalages appliqués à la note de l'animal pour chaque stat physique/mentale. */
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
  | 'ferme-compagnon' | 'ferme-trait' | 'ferme-basse-cour'
  // préhistoire
  | 'dino-predateur' | 'dino-colosse' | 'dino-volant' | 'dino-marin';

/** Effet d'un ulti pendant une manche de match. */
export type UltiEffect =
  | { kind: 'boost'; value: number } // + puissance
  | { kind: 'stat-swap'; stat: StatKey; value: number } // remplace la stat principale de l'épreuve
  | { kind: 'best-stat'; value: number } // utilise la meilleure stat de l'animal
  | { kind: 'debuff'; value: number } // − puissance adverse
  | { kind: 'double'; value: number } // la manche compte double si gagnée
  | { kind: 'team-buff'; value: number; boost: number } // bonus sur toutes les manches suivantes
  | { kind: 'comeback'; value: number; bonus: number } // bonus supplémentaire si l'équipe est menée
  | { kind: 'last-round'; value: number; bonus: number } // bonus supplémentaire à la dernière manche
  | { kind: 'event'; value: number; events: EventId[]; bonus: number } // bonus supplémentaire sur certaines épreuves
  | { kind: 'cancel'; value: number } // annule l'ulti adverse
  | { kind: 'streak'; value: number; perWin: number } // + par manche déjà gagnée
  | { kind: 'record'; value: number }; // guépard : +1 km/h à chaque utilisation

export interface Ulti {
  id: string;
  name: string;
  desc: string;
  effects: UltiEffect[];
  signature?: boolean;
}

/** Modèle d'ulti de famille : la valeur est fixée selon la rareté de la carte ({v} dans le texte). */
export interface SportUltiTemplate {
  name: string;
  desc: string;
  effect: UltiEffect;
}

/**
 * Version d'une carte : classique, Prime (un individu célèbre de l'espèce, plus rare et plus fort)
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
  /** 0-100 : célébrité de l'espèce. Détermine la rareté. */
  fame: number;
  /** 0-100 : puissance naturelle. Elle place la note de la carte dans la plage de sa rareté. */
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
  stats?: Partial<Stats>;
  ulti?: Ulti;
  /** identifiant Wikidata (hérité d'AthletiCards) */
  wikidata?: string;
  /** titre de la page Wikipédia en français, quand il diffère du nom (photos) */
  wiki?: string;
  /** carte « Mythe » : une créature fantastique des mythes et légendes, et non une espèce */
  mythe?: MytheInfo;
}

/** competition = créature légendaire (les seules cartes Mythe depuis la version 3) ; equipe et club ne servent plus */
export type MytheKind = 'competition' | 'equipe' | 'club';

/** Bonus d'une carte Mythe pendant un match, pour les animaux de la famille concernée (ou tous). */
export interface MytheBonus {
  sport: SportId | 'all';
  value: number;
  /** bonus supplémentaire sur certaines épreuves */
  events?: EventId[];
  eventBonus?: number;
}

export interface MytheInfo {
  kind: MytheKind;
  /** apparition de la légende, protection du site ou culte */
  year: string;
  /** chiffre marquant ou pouvoir, affiché dans la fiche */
  palmares: string;
  bonus: MytheBonus;
}

export interface Rarity {
  id: RarityId;
  name: string;
  /** score de rareté minimal (voir rarityScore) */
  minScore: number;
  /** valeur marchande de base en graines */
  baseValue: number;
  /** puissance bonus des ultis génériques */
  ultiPower: number;
  order: number;
}

export type EventId =
  | 'sprint'
  | 'bras-de-fer'
  | 'marathon'
  | 'coup-de-genie'
  | 'geste-technique'
  | 'money-time'
  | 'face-a-face'
  | 'bain-de-foule'
  | 'decathlon';

export interface MatchEvent {
  id: EventId;
  name: string;
  desc: string;
  primary: StatKey;
  secondary: StatKey;
  /** si défini, moyenne de ces stats à la place de primaire/secondaire */
  blend?: StatKey[];
  /** la célébrité de l'animal compte dans l'épreuve */
  popularity?: boolean;
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
  passive: { name: string; desc: string };
  ultis: SportUltiTemplate[];
}

/** Ce qui définit l'apparence d'une carte. */
export interface CardFace {
  athleteId: string;
  variant: Variant;
  /** progression propre à l'exemplaire (record de vitesse du guépard en km/h) */
  record?: number;
}

/** Exemplaire possédé d'une carte (on peut avoir des doublons). */
export interface OwnedCard extends CardFace {
  uid: string;
  obtainedAt: number;
  /** carte verrouillée : ne peut pas être vendue par erreur */
  locked?: boolean;
}
