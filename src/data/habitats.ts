import type { ArchetypeId, Athlete, SportId } from '../engine/types';
import type { SceneDef } from '../components/PackScene';

// Cartes Habitat : de grands lieux de la planète (forêt amazonienne, Grande Barrière de corail…). Ce ne sont pas
// des espèces : la carte montre le lieu en paysage peint, sa superficie et les animaux du jeu qui y vivent.
// Elles sortent environ une fois sur 30 des boosters. Célébrité 92 = Légendaire, 80 = Épique, 66 = Rare,
// 50 = Peu commune. Les faits restent sobres et vérifiables.

/** Profil requis par le type Athlete (les Habitats ne jouent pas en duel). */
const ARCHETYPE: Record<SportId, ArchetypeId> = {
  felins: 'felin-puissant', canides: 'canide-meute', ours: 'ours-colosse', primates: 'primate-malin', geants: 'geant-colosse',
  ongules: 'ongule-endurant', petits: 'petit-agile', marsupiaux: 'marsu-sauteur', marins: 'marin-geant', requins: 'requin-predateur',
  poissons: 'poisson-rapide', rapaces: 'rapace-aigle', oiseaux: 'oiseau-paradeur', reptiles: 'reptile-mastodonte',
  amphibiens: 'amphibien-toxique', insectes: 'insecte-colonie', invertebres: 'cephalopode', ferme: 'ferme-compagnon',
};

interface Def {
  id: string;
  name: string;
  sport: SportId;
  country: string;
  fame: number;
  /** où se trouve le lieu (affiché sous le nom) */
  lieu: string;
  superficie: string;
  especes: string[];
  fact: string;
  protection?: string;
  scene: SceneDef;
}

function H(d: Def): Athlete {
  return {
    id: `habitat-${d.id}`,
    first: '',
    last: d.name,
    sport: d.sport,
    archetype: ARCHETYPE[d.sport],
    role: d.lieu,
    country: d.country,
    fame: d.fame,
    level: 70,
    fact: d.fact,
    habitat: { superficie: d.superficie, especes: d.especes, scene: d.scene, ...(d.protection ? { protection: d.protection } : {}) },
  };
}

const DEFS: Def[] = [
  // ───── légendaires ─────
  {
    id: 'amazonie', name: 'Forêt amazonienne', sport: 'primates', country: 'BR', fame: 92,
    lieu: 'Brésil, Pérou, Colombie et six autres pays', superficie: '5,5 millions de km²',
    especes: ['jaguar', 'harpie', 'ara', 'toucan', 'paresseux', 'anaconda', 'dauphin-rose', 'piranha', 'ouistiti-pygmee', 'morpho', 'capybara', 'tapir'],
    fact: 'La plus grande forêt tropicale du monde : environ une espèce connue sur dix y vit. Le fleuve Amazone y déverse plus d’eau que tout autre fleuve.',
    scene: { kind: 'jungle', palette: { sky: ['#ffb46b', '#ffe3b0'], sun: '#fff3d6', far: '#4f9a6a', near: '#06261a', accent: '#ffffff' } },
  },
  {
    id: 'grande-barriere', name: 'Grande Barrière de corail', sport: 'poissons', country: 'AU', fame: 92,
    lieu: 'Australie, au large du Queensland', superficie: '2 300 km de long',
    especes: ['poisson-clown', 'chirurgien-bleu', 'poisson-perroquet', 'corail', 'dugong', 'raie-manta', 'crevette-mante', 'poulpe-a-anneaux-bleus', 'baleine-a-bosse', 'poisson-pierre'],
    fact: 'La plus grande construction d’êtres vivants de la planète : des milliards de minuscules coraux l’ont bâtie, et on la voit depuis l’espace.',
    protection: 'Patrimoine mondial de l’UNESCO depuis 1981',
    scene: { kind: 'recif', creature: 'banc', palette: { sky: ['#38d1d6', '#0b4f7a'], sun: '#ffffff', far: '#2aa3b5', near: '#062a40', accent: '#ffd166' } },
  },
  {
    id: 'galapagos', name: 'Îles Galápagos', sport: 'reptiles', country: 'EC', fame: 92,
    lieu: 'Équateur, à 1 000 km des côtes', superficie: '8 000 km² de terres',
    especes: ['iguane-marin', 'tortue-de-pinta', 'requin-marteau', 'baleine-a-bosse'],
    fact: 'Charles Darwin y passa en 1835 : les différences entre les animaux d’une île à l’autre l’aidèrent à comprendre l’évolution des espèces.',
    protection: 'Parmi les tout premiers sites du patrimoine mondial de l’UNESCO, en 1978',
    scene: { kind: 'ocean', palette: { sky: ['#f7a35c', '#ffe0b0'], sun: '#fff4dc', far: '#3f8f8a', near: '#0d2b3a', accent: '#ffffff' } },
  },
  {
    id: 'serengeti', name: 'Serengeti', sport: 'felins', country: 'TZ', fame: 92,
    lieu: 'Tanzanie', superficie: '14 750 km² de parc national',
    especes: ['lion', 'guepard', 'leopard', 'elephant', 'girafe', 'gnou', 'zebre', 'hyene', 'gazelle', 'buffle', 'hippopotame', 'crocodile-du-nil'],
    fact: 'Chaque année, plus d’un million de gnous et des centaines de milliers de zèbres suivent les pluies : c’est la grande migration.',
    protection: 'Patrimoine mondial de l’UNESCO depuis 1981',
    scene: { kind: 'savane', creature: 'elephant', palette: { sky: ['#f57c3a', '#ffd27a'], sun: '#fff1c4', far: '#d9894a', near: '#2a1208', accent: '#ffe9a8' } },
  },
  {
    id: 'antarctique', name: 'Antarctique', sport: 'oiseaux', country: 'AQ', fame: 92,
    lieu: 'Autour du pôle Sud', superficie: '14 millions de km²',
    especes: ['manchot-empereur', 'leopard-de-mer', 'krill', 'baleine-bleue', 'orque', 'albatros', 'elephant-de-mer'],
    fact: 'Le continent le plus froid, le plus sec et le plus venté : on y a mesuré −89,2 °C en 1983. Sa glace contient la majorité de l’eau douce de la planète.',
    protection: 'Traité sur l’Antarctique (1959) : réservé à la paix et à la science',
    scene: { kind: 'montagne', palette: { sky: ['#7fb2e6', '#e8f4ff'], sun: '#ffffff', far: '#a9c6e8', near: '#1c3657', accent: '#ffffff' } },
  },

  // ───── épiques ─────
  {
    id: 'banquise', name: 'Banquise arctique', sport: 'ours', country: 'GL', fame: 80,
    lieu: 'Océan Arctique, autour du pôle Nord', superficie: 'environ 15 millions de km² en hiver',
    especes: ['ours-polaire', 'morse', 'narval', 'beluga', 'phoque-du-groenland', 'renard-polaire', 'baleine-boreale', 'harfang'],
    fact: 'De l’eau de mer gelée qui fond en partie chaque été : à la fin de l’été, elle couvre bien moins de surface qu’à la fin des années 1970.',
    scene: { kind: 'aurore', palette: { sky: ['#061428', '#163a5e'], sun: '#eaf6ff', far: '#5d7fa8', near: '#081626', accent: '#61f2c2', accent2: '#7aa8ff' } },
  },
  {
    id: 'himalaya', name: 'Himalaya', sport: 'felins', country: 'NP', fame: 80,
    lieu: 'Népal, Inde, Chine, Bhoutan et Pakistan', superficie: '2 400 km de long',
    especes: ['panthere-des-neiges', 'panda-roux', 'yak', 'ours-isabelle', 'gypaete', 'rhinoceros-indien'],
    fact: 'Le « toit du monde » : l’Everest y culmine à 8 849 m. La chaîne monte encore de quelques millimètres par an.',
    scene: { kind: 'montagne', creature: 'aigle', palette: { sky: ['#3b5fa0', '#ffc7a0'], sun: '#fff1dd', far: '#8f9ac0', near: '#16213d', accent: '#ffffff' } },
  },
  {
    id: 'madagascar', name: 'Madagascar', sport: 'primates', country: 'MG', fame: 80,
    lieu: 'Océan Indien, au large de l’Afrique', superficie: '587 000 km²',
    especes: ['lemur-catta', 'aye-aye', 'sifaka', 'fossa', 'cameleon'],
    fact: 'Séparée des continents depuis des dizaines de millions d’années, l’île abrite des animaux qui n’existent nulle part ailleurs, dont tous les lémuriens.',
    scene: { kind: 'foret', palette: { sky: ['#ff9a62', '#ffe0a8'], sun: '#fff2d2', far: '#c98a5a', near: '#2a1610', accent: '#ffffff' } },
  },
  {
    id: 'borneo', name: 'Forêt de Bornéo', sport: 'primates', country: 'MY', fame: 80,
    lieu: 'Indonésie, Malaisie et Brunei', superficie: '743 000 km² (troisième plus grande île du monde)',
    especes: ['orang-outan', 'nasique', 'ours-malais', 'panthere-nebuleuse', 'rhinoceros-de-sumatra', 'python-reticule', 'rhacophore'],
    fact: 'L’une des plus vieilles forêts tropicales du monde : on lui donne plus de 100 millions d’années.',
    scene: { kind: 'jungle', palette: { sky: ['#7ac0b0', '#f3e3b0'], sun: '#fff8e0', far: '#3f8a6a', near: '#062418', accent: '#ffffff' } },
  },
  {
    id: 'congo', name: 'Bassin du Congo', sport: 'geants', country: 'CD', fame: 80,
    lieu: 'Six pays d’Afrique centrale', superficie: 'environ 2 millions de km² de forêt',
    especes: ['gorille', 'bonobo', 'chimpanze', 'okapi', 'elephant-de-foret', 'mandrill', 'grenouille-goliath', 'goliath'],
    fact: 'La deuxième plus grande forêt tropicale du monde, après l’Amazonie. Le fleuve Congo est le plus profond du monde : plus de 200 m par endroits.',
    scene: { kind: 'jungle', palette: { sky: ['#5f9a7a', '#e6e8b0'], sun: '#fffbe0', far: '#3d7a5a', near: '#04200f', accent: '#ffffff' } },
  },
  {
    id: 'yellowstone', name: 'Yellowstone', sport: 'canides', country: 'US', fame: 80,
    lieu: 'États-Unis (Wyoming, Montana, Idaho)', superficie: '8 983 km²',
    especes: ['loup', 'bison', 'ours-brun', 'elan', 'pygargue', 'coyote', 'castor'],
    fact: 'Le premier parc national du monde, créé en 1872. En 1995, le retour des loups a changé tout le paysage : moins de cerfs, plus d’arbres le long des rivières.',
    protection: 'Patrimoine mondial de l’UNESCO depuis 1978',
    scene: { kind: 'foret', palette: { sky: ['#5b8fd6', '#ffe1b0'], sun: '#fff6dc', far: '#8aa98a', near: '#14251a', accent: '#ffffff' } },
  },
  {
    id: 'sundarbans', name: 'Mangrove des Sundarbans', sport: 'felins', country: 'BD', fame: 80,
    lieu: 'Inde et Bangladesh, delta du Gange', superficie: '10 000 km²',
    especes: ['tigre', 'crocodile-marin', 'chat-viverrin', 'cobra-royal', 'poisson-archer'],
    fact: 'La plus grande forêt de mangroves du monde, posée sur l’eau salée ; ses tigres nagent d’île en île.',
    protection: 'Patrimoine mondial de l’UNESCO (1987 en Inde, 1997 au Bangladesh)',
    scene: { kind: 'marais', creature: 'lucioles', palette: { sky: ['#1d3b4f', '#e79a5f'], sun: '#ffe7c2', far: '#456b5a', near: '#0a1a14', accent: '#f6ff9a' } },
  },
  {
    id: 'mariannes', name: 'Fosse des Mariannes', sport: 'invertebres', country: 'XO', fame: 80,
    lieu: 'Océan Pacifique, près de l’île de Guam', superficie: '2 550 km de long',
    especes: ['baudroie', 'isopode-geant', 'poulpe-dumbo', 'calmar-geant'],
    fact: 'L’endroit le plus profond des océans : près de 11 000 m sous la surface. L’Everest y disparaîtrait entièrement.',
    scene: { kind: 'recif', creature: 'meduses', palette: { sky: ['#1a3a7a', '#020818'], sun: '#cfe6ff', far: '#1c2f66', near: '#01040d', accent: '#8fd3ff' } },
  },

  // ───── rares ─────
  {
    id: 'pantanal', name: 'Pantanal', sport: 'petits', country: 'BR', fame: 66,
    lieu: 'Brésil, Bolivie et Paraguay', superficie: 'environ 150 000 km²',
    especes: ['jaguar', 'capybara', 'anaconda', 'ara', 'tapir', 'fourmilier'],
    fact: 'La plus grande zone humide du monde : à la saison des pluies, l’eau recouvre la plus grande partie de ses plaines.',
    scene: { kind: 'marais', palette: { sky: ['#ff9a5a', '#ffe2a8'], sun: '#fff3d8', far: '#7fae6a', near: '#14260f', accent: '#ffffff' } },
  },
  {
    id: 'okavango', name: 'Delta de l’Okavango', sport: 'geants', country: 'BW', fame: 66,
    lieu: 'Botswana', superficie: 'jusqu’à 15 000 km² inondés',
    especes: ['elephant', 'hippopotame', 'lycaon', 'buffle', 'crocodile-du-nil', 'lion', 'zebre', 'koudou'],
    fact: 'Un fleuve qui n’atteint jamais la mer : il se perd dans le désert du Kalahari en formant un immense delta vert.',
    protection: 'Patrimoine mondial de l’UNESCO depuis 2014',
    scene: { kind: 'savane', creature: 'elephant', palette: { sky: ['#b9507a', '#ffc48c'], sun: '#fff0da', far: '#a76c80', near: '#22121d', accent: '#f6e3cf' } },
  },
  {
    id: 'outback', name: 'Outback australien', sport: 'marsupiaux', country: 'AU', fame: 66,
    lieu: 'Intérieur de l’Australie', superficie: 'la plus grande partie du continent',
    especes: ['kangourou', 'dingo', 'emeu', 'wombat', 'bilby', 'moloch', 'taipan', 'termite'],
    fact: 'Le cœur rouge de l’Australie : sa terre doit sa couleur au fer rouillé. Uluru, rocher sacré des Aborigènes, s’y dresse à 348 m.',
    scene: { kind: 'outback', creature: 'kangourou', palette: { sky: ['#ff7a50', '#ffd28c'], sun: '#fff2d0', far: '#d8643a', near: '#34120a', accent: '#ffd28c' } },
  },
  {
    id: 'sahara', name: 'Sahara', sport: 'canides', country: 'DZ', fame: 66,
    lieu: 'Afrique du Nord, onze pays', superficie: '9 millions de km²',
    especes: ['fennec', 'dromadaire', 'chat-des-sables', 'scorpion', 'criquet-pelerin'],
    fact: 'Le plus grand désert chaud du monde. Il y a environ 6 000 ans, il était vert, avec des lacs, des girafes et des hippopotames.',
    scene: { kind: 'desert', palette: { sky: ['#f2a65a', '#ffe6b0'], sun: '#fff6dc', far: '#e0a060', near: '#4a2210', accent: '#ffffff' } },
  },
  {
    id: 'taiga', name: 'Taïga', sport: 'ongules', country: 'RU', fame: 66,
    lieu: 'Du Canada à la Sibérie, tout autour du Grand Nord', superficie: 'environ un tiers des forêts du monde',
    especes: ['glouton', 'elan', 'ours-brun', 'loup', 'renne', 'polatouche', 'lynx', 'harfang'],
    fact: 'La plus grande forêt du monde : une ceinture de sapins, d’épicéas et de bouleaux qui fait presque le tour de la Terre.',
    scene: { kind: 'foret', palette: { sky: ['#7c9cc8', '#e6eef8'], sun: '#ffffff', far: '#8fa8b8', near: '#0f1e22', accent: '#ffffff' } },
  },
  {
    id: 'patagonie', name: 'Patagonie', sport: 'rapaces', country: 'AR', fame: 66,
    lieu: 'Argentine et Chili, au sud des Andes', superficie: 'environ 1 million de km²',
    especes: ['puma', 'condor', 'elephant-de-mer', 'dauphin-de-commerson', 'orque'],
    fact: 'Au bout du monde, ses glaciers descendent jusqu’aux lacs ; le Perito Moreno avance d’environ 2 m par jour.',
    scene: { kind: 'montagne', palette: { sky: ['#4f86c6', '#dbeeff'], sun: '#ffffff', far: '#8fb0d0', near: '#1a2a3c', accent: '#ffffff' } },
  },

  // ───── peu communes ─────
  {
    id: 'camargue', name: 'Camargue', sport: 'oiseaux', country: 'FR', fame: 50,
    lieu: 'France, delta du Rhône', superficie: 'environ 1 000 km²',
    especes: ['flamant-rose', 'cigogne', 'grue', 'sanglier', 'cheval', 'anguille'],
    fact: 'Le seul endroit de France où les flamants roses nichent chaque année, par milliers, au milieu des étangs salés.',
    scene: { kind: 'marais', creature: 'flamants', palette: { sky: ['#ff8fb5', '#ffe0b8'], sun: '#fff3e4', far: '#e08aab', near: '#2a0f2e', accent: '#ffffff' } },
  },
  {
    id: 'bialowieza', name: 'Forêt de Białowieża', sport: 'ongules', country: 'PL', fame: 50,
    lieu: 'Pologne et Biélorussie', superficie: '1 400 km²',
    especes: ['bison-d-europe', 'loup', 'lynx', 'elan', 'cerf', 'sanglier', 'castor'],
    fact: 'L’une des dernières forêts primaires d’Europe. Le bison d’Europe, disparu de la nature dans les années 1920, y a été relâché à nouveau.',
    protection: 'Patrimoine mondial de l’UNESCO depuis 1979',
    scene: { kind: 'foret', palette: { sky: ['#e8a050', '#ffe8b8'], sun: '#fff3d0', far: '#a0784a', near: '#22160c', accent: '#ffffff' } },
  },
  {
    id: 'everglades', name: 'Everglades', sport: 'reptiles', country: 'US', fame: 50,
    lieu: 'États-Unis, sud de la Floride', superficie: '6 100 km² de parc national',
    especes: ['alligator', 'lamantin', 'requin-citron', 'pelican', 'crotale'],
    fact: 'Une rivière d’herbe large de dizaines de kilomètres, qui coule si lentement qu’on la croit immobile ; alligators et crocodiles y vivent côte à côte.',
    protection: 'Patrimoine mondial de l’UNESCO depuis 1979',
    scene: { kind: 'marais', palette: { sky: ['#3fa0c0', '#fff0c0'], sun: '#fffbe6', far: '#5aa080', near: '#0a2018', accent: '#ffffff' } },
  },
  {
    id: 'monteverde', name: 'Forêt de nuages de Monteverde', sport: 'amphibiens', country: 'CR', fame: 50,
    lieu: 'Costa Rica', superficie: '105 km² de réserve',
    especes: ['quetzal', 'crapaud-dore', 'rainette-aux-yeux-rouges', 'singe-hurleur', 'paresseux', 'colibri', 'basilic'],
    fact: 'Les nuages accrochés aux arbres l’arrosent toute l’année. Le crapaud doré, qui ne vivait qu’ici, n’a plus été vu depuis 1989.',
    scene: { kind: 'jungle', palette: { sky: ['#9fc3b8', '#eef4e8'], sun: '#ffffff', far: '#6fa08a', near: '#0c2a20', accent: '#ffffff' } },
  },
  {
    id: 'tasmanie', name: 'Tasmanie', sport: 'marsupiaux', country: 'AU', fame: 50,
    lieu: 'Île au sud de l’Australie', superficie: '68 000 km²',
    especes: ['diable-de-tasmanie', 'thylacine', 'wombat', 'echidne', 'ornithorynque', 'quoll'],
    fact: 'Le dernier thylacine connu, le « tigre de Tasmanie », est mort au zoo de Hobart en 1936.',
    scene: { kind: 'foret', palette: { sky: ['#6a8fb8', '#f0dcc0'], sun: '#fff6e0', far: '#6f8f78', near: '#101c18', accent: '#ffffff' } },
  },
  {
    id: 'gobi', name: 'Désert de Gobi', sport: 'ongules', country: 'MN', fame: 50,
    lieu: 'Mongolie et Chine', superficie: '1,3 million de km²',
    especes: ['ours-de-gobi', 'cheval-de-przewalski', 'manul', 'saiga'],
    fact: 'Un désert froid : il y gèle l’hiver. Le cheval de Przewalski, disparu de la nature, y a été réintroduit en 1992.',
    scene: { kind: 'desert', palette: { sky: ['#d07a4a', '#f8d8a8'], sun: '#fff2d8', far: '#c08a5a', near: '#2e1a10', accent: '#ffffff' } },
  },
  {
    id: 'sargasses', name: 'Mer des Sargasses', sport: 'poissons', country: 'XO', fame: 50,
    lieu: 'Océan Atlantique Nord', superficie: 'environ 4 millions de km²',
    especes: ['anguille', 'tortue-luth', 'espadon', 'hippocampe'],
    fact: 'La seule mer sans côtes, couverte d’algues flottantes : les anguilles d’Europe y naissent puis traversent l’Atlantique.',
    scene: { kind: 'ocean', palette: { sky: ['#5ab8e8', '#e8f6ff'], sun: '#ffffff', far: '#3a90c8', near: '#0a2a50', accent: '#ffffff' } },
  },
];

export const HABITATS: Athlete[] = DEFS.map(H);
