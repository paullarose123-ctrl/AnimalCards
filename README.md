# AnimalCards

Jeu de cartes à collectionner d’animaux, jouable dans le navigateur. On ouvre des boosters, on collectionne des espèces réelles (du lion au tardigrade, en passant par le T. rex), on les revend au marché et on les fait jouer en match.

C’est le même jeu qu’AthletiCards (même moteur, même interface, mêmes règles), avec des animaux à la place des sportifs : les sports deviennent des familles d’animaux, les légendes retraitées deviennent les espèces disparues, et les meilleures saisons deviennent des individus célèbres.

Le logo (`src/components/Logo.tsx`) écrit « animalcards » en serif (police Fraunces), et le point du i est une petite feuille.

## Commandes de triche

Dans l’adresse du jeu (ou dans la console du navigateur) :

- `?graines=1000000000` fixe le solde à ce montant (`animalcards.solde(1000000000)`) ;
- `?graines=illimite` donne des graines illimitées, affichées « ∞ » (`animalcards.graines()`) ;
- `?graines=normal` revient au jeu normal (`animalcards.graines(false)`).

Pour une version à envoyer (téléphone, page claude.ai), compiler avec des graines offertes : `VITE_GRAINES=100000000 npm run build:single`. Le solde est fixé une seule fois par navigateur, au premier lancement, puis les graines se dépensent normalement. Le résultat est dans `artifact/` (`animalcards.html` et ses paquets de photos `photos/*.json`).

## Carte du monde

Dans l’écran Collection, l’onglet « Carte du monde » place chaque espèce dans son pays emblématique (le drapeau de sa carte). Les pays se colorent selon la part de leurs espèces déjà découvertes (à découvrir, en cours, complet) et un repère donne leur nombre, avec un anneau de progression ; « Océans » et « Monde entier » ont leur propre repère. Survol : nom et progression ; clic : zoom sur le pays et ses cartes (grisées tant qu’elles ne sont pas découvertes). Molette ou boutons pour zoomer, glisser pour se déplacer. Tracé des pays : world-atlas (Natural Earth, domaine public), projection d3-geo ; positions et rattachements dans `src/data/geo.ts`.

## Direction artistique

Un sous-bois au crépuscule, comme un carnet de naturaliste ouvert à la lueur d’une lampe : fond vert forêt avec du feuillage en filigrane et un grain de papier, texte couleur parchemin, vert mousse et lichen pour l’action, miel pour l’or. Titres et noms d’espèces en Fraunces (serif organique), interface en Outfit. Le dos des cartes est une petite affiche de nuit de pleine lune. Les boosters sont de petites affiches de parc naturel : chaque pack a son paysage en aplats (forêt à l’aube, sommets enneigés, savane au couchant, aurore boréale, récif, volcan, nuit de pleine lune…) avec une silhouette d’animal, et chaque famille a le sien (le loup qui hurle pour les canidés, la raie manta pour les requins, les flamants pour les oiseaux…). Ils sont dessinés en SVG par `src/components/PackScene.tsx`, les paysages et palettes sont choisis dans `src/components/PackArt.tsx`. Les couleurs sont dans `src/styles/base.css`, les cartes dans `src/styles/card.css`.

## Lancer le jeu

```bash
cd animalcards
npm install
npm run dev          # http://localhost:5173
npm test             # tests du moteur (boosters, marché, matchs)
npm run build        # version de production dans dist/
npm run build:single # un seul fichier HTML autonome dans artifact/
```

`#galerie` à la fin de l’adresse affiche une planche de contrôle visuel : les matières de cartes, les emblèmes des familles et tous les drapeaux.

## Les règles du jeu

### Rareté = célébrité

Chaque espèce a un score de célébrité (0-100). Plus elle est connue, plus sa carte est rare. Le jeu compte 435 espèces dans 19 familles, dont 46 Icônes (espèces disparues), plus 31 cartes Mythe.

| Rareté | Célébrité | Booster gratuit |
| --- | --- | --- |
| Légendaire | 90 et plus (lion, tigre, éléphant, loup, orque, T. rex…) | 0,8 % par carte |
| Épique | 75 à 89 | 3,2 % |
| Rare | 60 à 74 | 10 % |
| Peu commune | 44 à 59 | 26 % |
| Commune | moins de 44 | 60 % |

À l’intérieur d’une rareté, les plus célèbres sortent encore moins souvent : le lion sort environ 5 fois moins que le crocodile du Nil.

### Plus une carte est rare, plus elle est forte

| Rareté | Note |
| --- | --- |
| Légendaire | 91 à 99 |
| Épique | 85 à 90 |
| Rare | 78 à 84 |
| Peu commune | 70 à 77 |
| Commune | 58 à 69 |

Dans une même rareté, la puissance naturelle de l’espèce et sa célébrité la placent dans la plage (lion, tigre et T. rex à 98). Les stats découlent de la note et du profil de l’animal (un guépard est tout en vitesse, une tortue tout en endurance). La version Prime ajoute +3.

### Versions spéciales

- **Icônes** : les espèces disparues. Les dinosaures et la mégafaune de la préhistoire, et les espèces éteintes par l’homme, avec leur année de disparition : dodo (1681), thylacine (1936), tourte voyageuse (1914), grand pingouin (1844), aurochs (1627)… Carte marbre blanc et or : cadre ivoire veiné, liserés, ruban et médaillon dorés, voile nacré et reflet doré qui passent lentement.
- **Prime** : un individu célèbre d’une espèce vedette, avec son année : Laïka (chien, 1957), Félicette (chat, 1963), Keiko (orque, 1993), Knut (ours polaire, 2006), Koko (gorille, 1972), Jumbo (éléphant, 1882), Paul le poulpe (2010), Dolly (mouton, 1996), Sue (T. rex, 1990), Jonathan (tortue géante, 1832)… 24 au total. +3 de note, +4 à toutes les stats, ulti renforcé, liseré irisé. Une de ces espèces tirée dans un booster a 8 % de chances d’être en Prime. Valeur ×6 au marché.
- **Reverse** : n’importe quelle carte peut sortir en finition aquarelle pastel (environ 1 carte sur 20). Mêmes stats que la classique, valeur ×2,5 au marché.

### Cartes Mythe

31 cartes qui ne sont pas des espèces : des créatures fantastiques des mythes et légendes du monde. Légendes : Dragon, Phénix, Licorne, Griffon, Pégase. Épiques : Kraken, Yéti, Monstre du loch Ness, Hydre de Lerne, Cerbère, Léviathan, Fenrir, Kitsune, Quetzalcóatl, Dragon chinois, Bête du Gévaudan, Oiseau-tonnerre. Or : Simurgh, Tigre blanc, Lion ailé, Jörmungand, Grande Ourse, Lapin de jade, Salamandre de feu, Tortue du monde, Béhémoth, Cerf blanc, Dakuwaqa, Jorōgumo, Taureau de Crète, Bunyip. Elles sortent dans tous les boosters, environ 1 carte sur 40. Les anciennes cartes Mythe (sanctuaires et divinités) des sauvegardes sont remplacées par la créature de la même famille.

En match, une carte Mythe se place dans l’emplacement « Mythe » de l’équipe et donne un bonus aux animaux de sa famille (tous les animaux pour la Tortue du monde), avec un supplément sur certaines épreuves : le Lion ailé donne +4 aux félins, +4 de plus en Ruse. Les cartes Mythe sont définies à la fin de `src/data/athletes.ts` (fonction `M`).

### La carte

Style « cadre de naturaliste » : chaque palier reprend la palette d’un booster, sans métal (Forêt au lever du jour = Commune, Cimes au matin bleu = Peu commune, Savane au couchant = Rare, Aurore boréale = Épique, Crépuscule flamboyant = Légende, marbre blanc et or = Icône, Océan pastel = Prime, nuit de pleine lune = Mythe, aquarelle pastel = Reverse) : ciel peint autour de la photo, cadre couleur de premier plan, liserés et textes clairs, collines en aplats sous le nom. Cadre sombre avec le code de l’espèce en onglet (« LIO », « REQ »), pastille avec le palier et la note, famille écrite à la verticale, photo dans une fenêtre, drapeau du pays emblématique de l’espèce (pays de découverte pour les fossiles, « Océans » ou « Monde entier » pour les espèces de partout), médaillon de la famille, nom dans un bandeau et milieu de vie sur la plaque du bas. Une réglette en bas de la photo donne le poids, la taille (longueur, hauteur ou envergure) et la population restante sur Terre (« Éteint » pour les espèces disparues) ; la fiche ajoute la longévité. Mesures dans `src/data/mesures.ts` (valeurs typiques d’un adulte), populations dans `src/data/populations.ts` (estimations arrondies : population sauvage, ou mondiale élevage compris pour les animaux domestiques). La fiche de chaque carte montre le nom scientifique, un fait réel et les 6 stats utilisées en match :

| Stat | Ce qu’elle mesure |
| --- | --- |
| VIT | Vitesse |
| FOR | Force |
| END | Endurance |
| AGI | Agilité, adresse, précision du geste |
| INT | Intelligence, ruse, mémoire |
| AUR | Aura : prestance, intimidation, charisme |

### Familles et particularités

19 familles, chacune avec un passif en match et ses propres ultis :

| Famille | Particularité |
| --- | --- |
| Félins | Chasseur solitaire : +5 en Face-à-face et Instinct de survie |
| Canidés & hyènes | Meute : +2 par autre canidé dans l’équipe (max +8) |
| Ours | Colère de l’ours : +7 quand l’équipe est menée |
| Primates | Intelligence : l’équipe commence le match avec 3 points d’énergie au lieu de 2 |
| Géants | Masse : +6 en Corps à corps et Loi de la jungle |
| Ongulés | Démarrage : +6 à la 1re manche et au Sprint |
| Petits mammifères | Frimousse : +6 en Adresse et Coup de cœur |
| Marsupiaux & cie | Bonds : +6 après une manche gagnée |
| Mammifères marins | Hydrodynamique : insensibles aux malus adverses |
| Requins & raies | Frénésie : +1 énergie après une manche écrasée |
| Poissons | Remontée du courant : +5 en Migration et Instinct de survie |
| Rapaces | Vue perçante : presque aucune part de hasard |
| Oiseaux | Vol en V : +5 après une manche gagnée |
| Reptiles | Sang-froid : +2 par numéro de manche (ils se réchauffent) |
| Amphibiens | Peau toxique : l’adversaire perd 4 |
| Insectes & araignées | Instinct : +6 en Adresse, résultats très réguliers |
| Invertébrés marins | Insaisissable : renvoient les malus à l’adversaire |
| Ferme & compagnie | Meilleur ami : +5 en Coup de cœur et Face-à-face |
| Préhistoire | Dernier rugissement : +8 à la dernière manche |

Les espèces vedettes ont un **ulti signature** : « Pointe de vitesse » pour le guépard (son record de vitesse inscrit sur la carte monte d’1 km/h à chaque utilisation), « Roi de la savane » pour le lion, « Mémoire d’éléphant », « Appel de la meute » pour le loup, « Piqué à 389 km/h » pour le faucon pèlerin, « Coup de massue » pour la crevette-mante, « Huit bras, neuf cerveaux » pour la pieuvre, « Roi des tyrans » pour le T. rex…

### Boosters et boutique

- Un booster gratuit toutes les 10 minutes, jusqu’à 10 en réserve.
- Pas de doublon rapproché : une espèce sortie dans un booster ne peut pas ressortir avant 7 boosters (ni deux fois dans le même). Seuls les petits packs de famille relâchent cette règle quand il ne reste plus d’espèce disponible dans la rareté tirée.
- Boutique : Découverte, Pro (1 Rare garantie), Élite (1 Épique garantie), Icônes (espèces disparues, 60 000 graines), Prime (1 individu célèbre garanti, 250 000 graines), Légende (1 Légendaire garantie) et un pack par famille (1 500 graines, 100 000 pour la Préhistoire, qui ne contient que des Icônes). Les chances sont affichées sur chaque pack.
- Les Icônes sont des trésors : hors du Pack Icônes et du Pack Préhistoire, environ 1 carte sur 200 seulement (jamais à la place de la carte garantie), et elles passent très rarement sur le marché.
- La monnaie du jeu : les graines.
- Les Épiques, Légendaires et Prime ont droit à leur révélation : drapeau, puis famille, puis note, puis la carte avec confettis et fanfare.

### Marché

- Des collectionneurs IA mettent des cartes en vente, enchérissent et achètent les tiennes.
- Achat immédiat ou enchères (remboursement automatique si quelqu’un surenchérit).
- Vente : enchère de départ, prix d’achat immédiat, durée de 5 min à 3 h. Taxe de 5 % sur chaque vente.
- La cote de chaque carte fluctue (courbe sur 24 h dans la fiche) et des actus font bouger les prix : « Semaine des félins +15 % », « Ruée sur les cartes Axolotl »…
- Le marché continue de tourner quand le jeu est fermé.

### Arène (matchs)

- Équipe de 5 animaux, toutes familles mélangées.
- 5 manches, chacune est une épreuve tirée au sort : Sprint, Corps à corps, Migration, Ruse, Adresse, Instinct de survie, Face-à-face, Coup de cœur (la popularité compte), Loi de la jungle (le plus complet).
- À chaque manche on choisit qui envoyer sans connaître le choix adverse. Puissance = stats de l’épreuve + particularité de la famille + ulti + forme du jour.
- Énergie : 2 au départ, un ulti en coûte 1, chaque manche perdue en rend 1.
- Ligue de la division 10 à la division 1 : victoire +3 points, nul +1, promotion à 7 points.

## Organisation du code

Le code est celui d’AthletiCards : les noms internes n’ont pas changé (une espèce est une `Athlete`, une famille un `SportId`, la monnaie s’appelle `balles` dans l’état du jeu).

```
src/
  data/athletes.ts   les 435 espèces, leurs ultis signatures, versions Prime, et les 31 cartes Mythe
  data/sports.ts     familles, particularités, ultis de famille, épreuves, stats
  engine/            moteur pur, sans interface : cartes, boosters, marché, matchs
  store/             état du jeu (sauvegarde locale « animalcards-save ») et état de l’interface
  components/        carte, logo, drapeaux, emblèmes des familles, packs
  overlays/          ouverture de booster, fiche carte
  screens/           Boosters, Collection, Marché, Arène, Boutique
```

Le moteur (`src/engine`) ne dépend pas de l’interface : il prend un état, l’heure et une source de hasard, et renvoie le nouvel état.

Pour ajouter une espèce : une ligne `x('id', 'Nom', 'famille', 'profil', 'Milieu', 'PAYS', célébrité, puissance, 'Fait.', { ...L('Nom scientifique') })` dans `src/data/athletes.ts`, puis relancer le script des photos.

## Photos des animaux

Les photos viennent de Wikimedia Commons (licences libres : CC BY, CC BY-SA, domaine public…), d’iNaturalist (photos d’observations dans la nature, sous licence Creative Commons, y compris « pas d’utilisation commerciale » : le jeu est gratuit et sans publicité), d’Unsplash (licence Unsplash) et de Pixabay (licence Pixabay, réutilisation libre), avec l’auteur et la licence affichés dans la fiche de chaque carte. Les espèces disparues et les créatures Mythe sont des illustrations réalistes de Pixabay (souvent générées par IA), l’animal en entier dans son décor, comme une photo de documentaire.

```bash
node scripts/photos/telecharger-photos.mjs telecharger   # cherche et télécharge (Node 22.18 ou plus récent)
node scripts/photos/telecharger-photos.mjs finaliser     # public/photos/<id>.webp + crédits dans src/data/photos.json
```

1. Pour chaque espèce, le script prend l’image principale de sa page Wikipédia en français (trouvée par le titre imposé dans `scripts/photos/titres.json`, sinon par le nom scientifique, sinon par le nom commun), sinon celle de sa page en anglais, sinon son image Wikidata.
2. La photo est cadrée au format 3:4 de la fenêtre des cartes (600 × 800, WebP).

Si une photo ne convient pas (carte de répartition, squelette, mauvais animal…), ajoute son nom de fichier Commons dans `scripts/photos/refus.json` : le script prendra la suivante. Pour choisir soi-même, mets le nom du fichier retenu dans `scripts/photos/choix.json` (avec au besoin un recadrage : `{ "fichier": "…", "recadrage": [x, y, largeur, hauteur] }`, en fractions de l’image), ou une image Pixabay : `{ "url": "https://cdn.pixabay.com/photo/…_1280.jpg", "page": "https://pixabay.com/…", "auteur": "…" }` ; `"explorer"` dans `config.json` produit une planche numérotée des photos Commons d’une espèce. Sans photo libre, la carte affiche le médaillon de sa famille. Le cadrage de chaque carte est dans `config.json`, « cadrage » : `[x, y, zoom]` (centre du cadre en fractions de la photo, 1 = le plus grand cadre 3:4 possible), choisi pour montrer l’animal entier et non sa seule tête ; `"etendre"` garde l’image entière et prolonge son fond uni (rendus 3D et maquettes photographiées en studio). Les photos viennent de la nature, pas des zoos ; les espèces disparues, les dinosaures et les Mythes sont des illustrations réalistes (pas des dessins ni des maquettes de parc).

La GitHub Action `.github/workflows/photos.yml` fait la même chose en ligne.

Dans la version en un seul fichier (`npm run build:single`), les photos sont regroupées par paquets de 16 (`artifact/photos/pNN.json`, avec un index `artifact/photos/index.json`) et chargées au fur et à mesure que les cartes s’affichent.

## Et ensuite

- Plus d’espèces (le moteur a été testé avec 10 000 cartes).
- Multijoueur : un vrai marché entre joueurs demande un serveur qui fait autorité sur les soldes, l’ouverture des boosters et les ventes.

Les notes et stats sont une interprétation de jeu. AnimalCards est un projet de fan non commercial.
