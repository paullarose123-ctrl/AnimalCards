import type { Athlete } from '../engine/types';

// Milieu de vie en un mot, écrit dans le losange de la carte au-dessus du numéro (« Ville », « Campagne », « Océan »…).
// Il se déduit du milieu détaillé de l'espèce (la plaque du bas de la carte). L'ordre compte : un pigeon des villes
// est en « Ville », un renard « Forêt et campagne » en « Campagne », un animal domestique jamais en « Forêt ».

/** Un des mots, en entier (les lettres accentuées comptent comme des lettres). */
const w = (words: string) => new RegExp(`(?<!\\p{L})(?:${words})(?!\\p{L})`, 'u');

const RULES: Array<[string, RegExp]> = [
  ['Partout', w('partout')],
  ['Ville', w('villes?|maison|recoins|police')],
  ['Campagne', w('campagne|ferme|fermes|prés|pâturages|champs|bocage|vergers|haies|jardins|poulailler|ruches|rizières|mûriers|cage|bocal|volière|cynodromes|coteaux|talus|provence|villages|granges')],
  ['Récif', w('récifs?|corallien|lagons?')],
  ['Abysses', w('abysses|profondeurs|profonds')],
  ['Océan', w('océans?|haute mer|mers?|antarctique|austral|australes|arctique|atlantique|béring|barents|pôle')],
  ['Côtes', w('côtes?|plages?|rochers|estuaires?|mangroves?|lagunes?|herbiers|fonds|falaises marines')],
  ['Glaces', w('banquise|toundra|neige|enneigées')],
  ['Montagne', w('montagnes?|andes|himalaya|himalayenne|alpes|falaises|éboulis|plateaux?|cols|collines')],
  ['Désert', w('désert|déserts|kalahari|gobi')],
  ['Savane', w('savane|brousse|bush|cerrado')],
  ['Jungle', w('jungle|tropicale|équatoriale|amazonienne|amazonie|amazone|canopée|nuages|bornéo|congo|ituri|monteverde')],
  ['Marais', w('marais|marécages|everglades|floride')],
  ['Rivières', w('rivières|fleuves?|lacs?|étangs|mares|bassins|yangzi|gironde')],
  ['Prairie', w('prairies?|plaines|steppe|garrigue|maquis')],
  ['Îles', w('îles?|galápagos|kodiak|rottnest|tasmanie|maurice|sonde')],
  ['Sous terre', w('sous terre|terriers|grottes')],
  ['Forêt', w('forêts?|taïga|boréale|bambous|eucalyptus|pinèdes|bois|chênes|białowieża|parcs|feuilles|californie')],
];

/** Milieu en un mot pour le losange de la carte. */
export function milieuCourt(athlete: Athlete): string {
  const text = athlete.role.toLowerCase();
  for (const [label, re] of RULES) if (re.test(text)) return label;
  if (athlete.sport === 'marins' || athlete.sport === 'requins') return 'Océan';
  if (athlete.sport === 'ferme') return 'Campagne';
  return 'Nature';
}
