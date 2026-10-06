# AnimalCards

Jeu de cartes à collectionner d’animaux, jouable dans le navigateur. On ouvre des boosters, on collectionne des espèces réelles (du lion au tardigrade, en passant par le thylacine), on les revend au marché et on les fait jouer en match.

C’est le même jeu qu’AthletiCards (même moteur, même interface, mêmes règles), avec des animaux à la place des sportifs : les sports deviennent des familles d’animaux, les légendes retraitées deviennent les espèces disparues, et les meilleures saisons deviennent des individus célèbres.

Le logo (`src/components/Logo.tsx`) écrit « animalcards » en serif (police Fraunces), et le point du i est une petite feuille.

## Commandes de triche

Seulement en développement (`npm run dev`) et dans la version de test (`npm run build:single`) : elles n’existent pas sur le site public, où les joueurs échangent au marché en ligne. Dans l’adresse du jeu (ou dans la console du navigateur) :

- `?graines=1000000000` fixe le solde à ce montant (`animalcards.solde(1000000000)`) ;
- `?graines=illimite` donne des crédits illimités, affichées « ∞ » (`animalcards.graines()`) ;
- `?graines=normal` revient au jeu normal (`animalcards.graines(false)`).

Pour une version à envoyer (téléphone, page claude.ai), compiler avec des crédits offerts : `VITE_GRAINES=100000000 npm run build:single`. Le solde est fixé une seule fois par navigateur, au premier lancement, puis les crédits se dépensent normalement. Le résultat est dans `artifact/` (`animalcards.html` et ses paquets de photos `photos/*.json`).

## Carte du monde

Dans l’écran Collection, l’onglet « Carte du monde » place chaque espèce dans le pays de son drapeau. Les pays se colorent selon la part de leurs espèces déjà découvertes (à découvrir, en cours, complet) et un repère donne leur nombre, avec un anneau de progression ; « Océans » et « Monde entier » ont leur propre repère. Survol : nom et progression ; clic : zoom sur le pays et ses cartes (grisées tant qu’elles ne sont pas découvertes). Molette ou boutons pour zoomer, glisser pour se déplacer. Tracé des pays : world-atlas (Natural Earth, domaine public), projection d3-geo ; positions et rattachements dans `src/data/geo.ts`.

## Direction artistique

Un sous-bois au crépuscule, comme un carnet de naturaliste ouvert à la lueur d’une lampe : fond vert forêt avec du feuillage en filigrane et un grain de papier, texte couleur parchemin, vert mousse et lichen pour l’action, miel pour l’or. Titres et noms d’espèces en Fraunces (serif organique), interface en Outfit. Le dos des cartes est une petite affiche de crépuscule : le soleil se couche dans une vallée de sapins, sous un ciel bleu nuit et pêche (`src/components/CardBack.tsx`). Les boosters sont de petites affiches de parc naturel : chaque pack a son paysage en aplats (forêt à l’aube, sommets enneigés, savane au couchant, aurore boréale, récif, volcan, nuit de pleine lune…) avec une silhouette d’animal, et chaque famille a le sien (le loup qui hurle pour les canidés, la raie manta pour les requins, les flamants pour les oiseaux…). Ils sont dessinés en SVG par `src/components/PackScene.tsx`, les paysages et palettes sont choisis dans `src/components/PackArt.tsx`. Les couleurs sont dans `src/styles/base.css`, les cartes dans `src/styles/card.css`.

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

### Rareté : célébrité et espèce menacée

La rareté d’une carte mélange deux choses, à parts égales : la célébrité de l’espèce (0-100) et sa rareté dans la nature, calculée sur le nombre d’individus encore vivants (1 000 individus → 100, 10 000 → 85, 100 000 → 70, un million → 55, un milliard → 10). Le lion, le tigre et le panda restent Légendaires, parce qu’ils sont très connus et en déclin ; le loup d’Éthiopie (500 individus) monte ; le moineau ou la vache, très nombreux, sont communs. Les espèces éteintes et les Habitats gardent une rareté fixée par leur célébrité. Les races de chien comptent comme l’ensemble des chiens du monde.

Le jeu compte 425 espèces dans 18 familles, dont 25 Icônes (espèces disparues depuis 1800) et 12 races de chien, plus 26 cartes Habitat.

| Rareté | Score | Booster gratuit |
| --- | --- | --- |
| Légendaire | 80 et plus (panda, tigre, lion, axolotl, requin blanc…) | 0,8 % par carte |
| Épique | 72 à 79 | 3,2 % |
| Rare | 58 à 71 | 10 % |
| Peu commune | 43 à 57 | 26 % |
| Commune | moins de 43 | 60 % |

À l’intérieur d’une rareté, les scores les plus hauts sortent encore moins souvent.

### Versions spéciales

- **Icônes** : les espèces et sous-espèces disparues depuis 1800, presque toujours à cause de l’homme (chasse, braconnage, milieu détruit), avec leur année de disparition et une vraie photo : de l’animal lui-même, ou à défaut d’un animal vivant de la même espèce (le rhinocéros noir pour le rhinocéros noir de l’Ouest, le loup gris pour le loup du Japon). Émeu de King Island (1822), quagga (1883), loup du Japon (1905), conure de Caroline (1918), thylacine (1936), lion de l’Atlas (1942), rhinocéros de Java du Vietnam (2010), tortue de Pinta (2012), rainette de Rabb (2016)… 25 au total. Plus de dinosaures ni de mégafaune préhistorique depuis octobre 2026 : les cartes déjà obtenues sont devenues une Icône de même rareté (le T. rex est devenu le lion de l’Atlas). Carte marbre blanc et or.
- **Prime** : un individu célèbre d’une espèce vedette, avec son année et son histoire : Félicette (chat, 1963), Keiko (orque, 1993), Knut (ours polaire, 2006), Koko (gorille, 1972), Jumbo (éléphant, 1882), Hachikō (akita, 1925), Balto (husky, 1925), Barry (saint-bernard, 1800)… 26 au total. Une de ces espèces tirée dans un booster a 5 % de chances d’être en Prime. Valeur ×6 au marché.
- **Reverse** : seules les cartes Rares, Épiques et Légendaires peuvent sortir en finition aquarelle (environ 1 sur 20), chacune aux couleurs de sa rareté : lavis pêche et corail pour la Rare, lavande et menthe étoilées pour l’Épique, lavis irisé et filet d’or pour la Légendaire. Valeur ×2,5 au marché.

### Cartes Habitat

26 cartes qui ne sont pas des espèces mais de grands lieux de la planète, peints comme les boosters : Forêt amazonienne, Grande Barrière de corail, Îles Galápagos, Serengeti, Antarctique (Légendaires) ; Banquise arctique, Himalaya, Madagascar, Bornéo, Bassin du Congo, Yellowstone, Sundarbans, Fosse des Mariannes (Épiques) ; Pantanal, Okavango, Outback, Sahara, Taïga, Patagonie (Rares) ; Camargue, Białowieża, Everglades, Monteverde, Tasmanie, Gobi, Mer des Sargasses (Peu communes). Chaque carte donne le lieu, sa superficie, sa protection (patrimoine mondial…), une anecdote et les animaux du jeu qui y vivent ; la fiche montre en vert ceux qu’on a déjà trouvés. Elles sortent environ 1 carte sur 40. Définies dans `src/data/habitats.ts`. Les anciennes cartes Mythe des sauvegardes deviennent des Habitats de même rareté.

### La carte

Style « cadre de naturaliste » : chaque palier reprend la palette d’un booster (Forêt au lever du jour = Commune, Cimes au matin bleu = Peu commune, Savane au couchant = Rare, Aurore boréale = Épique, Crépuscule flamboyant = Légende, marbre blanc et or = Icône, Océan pastel = Prime, mousse et miel = Habitat, aquarelle pastel = Reverse). Cadre sombre avec le code de l’espèce en onglet (« LIO », « REQ »), losange avec le **milieu de vie en un mot** (Ville, Campagne, Forêt, Jungle, Savane, Océan, Montagne… déduit du milieu détaillé, `src/data/milieux.ts` ; Prime, Reverse, Icône et Habitat gardent leur nom) et le **numéro de collection** (N° 001 à 425, famille par famille dans l’ordre de l’album, sans trou ; H01 à H26 pour les Habitats), famille écrite à la verticale, photo dans une fenêtre, drapeau du pays où l’espèce est la plus présente aujourd’hui (un globe si elle vit sur plusieurs continents, « Océans » pour les espèces marines de tous les océans ; corrections dans `src/data/repartition.ts`, cachés pendant les duels), médaillon de la famille, nom dans un bandeau et milieu de vie sur la plaque du bas. Le nom scientifique est écrit en petit, en italique, en bas de la photo, et une réglette donne le poids, la taille (longueur, hauteur ou envergure) et la population restante sur Terre (« Éteint » pour les espèces disparues). Mesures dans `src/data/mesures.ts` (valeurs typiques d’un adulte), populations dans `src/data/populations.ts` (estimations arrondies : population sauvage, ou mondiale élevage compris pour les animaux domestiques).

À l’ouverture d’un booster, chaque carte révélée s’accompagne d’une fiche avec de vraies informations : nom scientifique, pays, famille, milieu, poids, taille, longévité, population, une anecdote (« Le savais-tu ? ») et l’histoire de l’individu célèbre pour une version Prime.

Le dos des cartes est une affiche de crépuscule : soleil couchant dans une vallée de sapins (`src/components/CardBack.tsx`).

### Boosters et boutique

- Séries : la Série 1 « Animaux du monde » (le booster gratuit porte ce nom) réunit des espèces de toute la planète ; les séries suivantes seront consacrées chacune à un pays. L’accueil annonce la série en cours et la prochaine, avec un compte à rebours : la Série 2, consacrée au Mexique, sort le 1er novembre 2026, et l’accueil montre déjà son dos de carte et son booster (`CardBackMexique` et `PackArtMexique`, dessinés avec les silhouettes de `src/art/mexique.ts`). Série en cours et prochaine sortie : `SERIES` et `NEXT_SERIES` dans `src/engine/packs.ts`.

- Un booster gratuit toutes les 30 minutes, jusqu’à 5 en réserve.
- Pas de doublon rapproché : une espèce sortie dans un booster ne peut pas ressortir avant 7 boosters, et jamais deux fois dans le même booster (quand toutes les espèces d’une rareté y sont déjà, la carte suivante sort dans une autre rareté). Seuls les petits packs de famille relâchent la règle des 7 boosters quand il ne reste plus d’espèce disponible dans la rareté tirée.
- Boutique : Découverte, Pro (1 Rare garantie), Élite (1 Épique garantie), Icônes (1 seule carte, toujours une Icône : le pack le plus cher, 600 000 crédits), Prime (1 individu célèbre garanti, 250 000 crédits), Légende (1 Légendaire garantie) et un pack de 3 cartes par famille (4 000 crédits). Les chances sont affichées sur chaque pack.
- Les Icônes sont les cartes les plus rares : hors du Pack Icônes, environ 1 carte sur 1 000 seulement (jamais à la place de la carte garantie), et elles passent très rarement sur le marché. Une Icône vaut au moins 100 000 crédits (dix fois la cote de sa rareté).
- La monnaie du jeu : les crédits.
- Les Épiques, Légendaires, Prime et Icônes ont droit à leur révélation : drapeau, puis famille, puis numéro, pendant que des étincelles sont aspirées vers un cœur d’énergie ; puis flash, onde de choc, gerbe d’étincelles et la carte qui jaillit dans un halo de sa couleur, avec confettis et fanfare.

### Marché

- **Entre joueurs, en ligne** (avec un compte) : on met une carte en vente à prix fixe pour 1 h, 6 h, 1 jour ou 3 jours ; tous les joueurs la voient et le premier qui l’achète l’emporte. Le serveur (fonctions `market_*` de `supabase/schema.sql`) garantit qu’une carte n’est vendue qu’une fois, jamais à son vendeur. L’acheteur reçoit la carte tout de suite, le vendeur ses crédits (moins 5 %) dès que son jeu est ouvert ; une carte invendue revient dans la réserve. 15 annonces en ligne au plus par joueur.
- Des collectionneurs IA mettent des cartes en vente, enchérissent et achètent les tiennes.
- Achat immédiat ou enchères (remboursement automatique si quelqu’un surenchérit).
- Vente : enchère de départ, prix d’achat immédiat, durée de 5 min à 3 h. Taxe de 5 % sur chaque vente.
- La cote de chaque carte fluctue (courbe sur 24 h dans la fiche) et des actus font bouger les prix : « Semaine des félins +15 % », « Ruée sur les cartes Axolotl »…
- Le marché continue de tourner quand le jeu est fermé.

### Duel de records

Un jeu de culture générale sur les animaux.

- Équipe de 5 animaux, toutes familles mélangées (pas de carte Habitat).
- 5 manches, chacune une question tirée au sort parmi 17 et annoncée dès le début. Des records : le plus lourd, le plus léger, le plus grand, le plus petit, vit le plus longtemps, vit le moins longtemps, le plus nombreux, le plus rare (une espèce éteinte n’a plus aucun individu). Et au plus deux questions oui/non : vit en Afrique, en Asie, en Amérique, en Europe ou en Océanie (les espèces de plusieurs continents, comme le chat ou le loup, sont listées dans `src/data/repartition.ts` et portent le logo « Plusieurs continents ») ; est un mammifère, un oiseau, un reptile ou un poisson.
- Les mesures sont cachées sur toutes les cartes pendant le duel : on choisit quel animal envoyer d’après ce qu’on sait. Chaque animal ne joue qu’une fois. Ce sont les vraies mesures de l’espèce qui décident (une mesure inconnue perd la manche) ; pour une question, oui bat non.
- Plus la division est haute, plus l’adversaire joue juste. Ligue de la division 10 à la division 1 : victoire +3 points, nul +1, promotion à 7 points.
- On peut aussi défier un ami : son équipe est faite des animaux de sa vitrine (complétée au hasard), joués par l’ordinateur. Ce duel rapporte des crédits mais ne compte pas pour la ligue.

### Comptes et profil

- Échanges entre amis : depuis la liste d’amis, « Échanger » propose une de ses cartes contre une espèce **de même rareté** (celles de la vitrine de l’ami en premier). La carte proposée quitte la réserve en attendant ; l’ami accepte en donnant un exemplaire (le plus simple qu’il ait) ou refuse, et la carte revient si c’est refusé ou annulé. Le serveur (fonctions `trade_*` de `supabase/schema.sql`) vérifie que les deux joueurs sont amis et que l’espèce donnée est la bonne ; chaque échange n’est réglé qu’une fois dans la partie.
- Album : une carte jamais obtenue reste sombre, même ouverte en grand.

- Un compte se crée avec un pseudo et un mot de passe (écran Profil, bouton en haut à droite). Toute la progression est alors sauvegardée dans le compte (au plus toutes les 30 secondes quand elle change, et à la fermeture de l’onglet) et rechargée à la connexion, sur n’importe quel appareil. Sans compte, la partie reste dans le navigateur.
- Le profil montre une photo de profil (la photo d’un animal déjà découvert) et une vitrine de 5 cartes préférées.
- Amis : on envoie une demande d’ami avec un pseudo ; l’autre joueur la voit (pastille sur son bouton Profil) et l’accepte ou la refuse. Entre amis, on voit la photo et la vitrine de l’autre, et on peut le défier en duel. Table `friendships` dans `supabase/schema.sql`.
- Les comptes passent par Supabase (`src/account`) : tables et règles de sécurité dans `supabase/schema.sql` (chaque joueur ne lit et ne modifie que sa propre sauvegarde), adresse du projet et clé publique dans `src/account/config.ts`. Le pseudo devient une adresse fictive (`pseudo@joueurs.animalcards.app`), d’où la confirmation par e-mail coupée dans le projet Supabase.

## Organisation du code

Le code est celui d’AthletiCards : les noms internes n’ont pas changé (une espèce est une `Athlete`, une famille un `SportId`, la monnaie s’appelle `balles` dans l’état du jeu).

```
src/
  data/athletes.ts   les 425 espèces et leurs versions Prime
  data/habitats.ts   les 26 cartes Habitat
  data/sports.ts     familles : nom, couleur
  engine/            moteur pur, sans interface : cartes, boosters, marché, duels de records
  account/           comptes Supabase (inscription, connexion, sauvegarde)
  store/             état du jeu (sauvegarde « animalcards-save »), compte du joueur et état de l’interface
  components/        carte, logo, drapeaux, emblèmes des familles, packs
  overlays/          ouverture de booster, fiche carte
  screens/           Boosters, Collection, Marché, Duel, Boutique, Profil
```

Le moteur (`src/engine`) ne dépend pas de l’interface : il prend un état, l’heure et une source de hasard, et renvoie le nouvel état.

Pour ajouter une espèce : une ligne `x('id', 'Nom', 'famille', 'profil', 'Milieu', 'PAYS', célébrité, 0, 'Fait.', { ...L('Nom scientifique') })` dans `src/data/athletes.ts`, ses mesures dans `src/data/mesures.ts` et sa population dans `src/data/populations.ts`, puis relancer le script des photos.

## Photos des animaux

Les photos viennent de Wikimedia Commons (licences libres : CC BY, CC BY-SA, domaine public…), d’iNaturalist (photos d’observations dans la nature, sous licence Creative Commons, y compris « pas d’utilisation commerciale » : le jeu est gratuit et sans publicité), d’Unsplash (licence Unsplash) et de Pixabay (licence Pixabay, réutilisation libre), avec l’auteur et la licence affichés dans la fiche de chaque carte. Les espèces disparues depuis l’invention de la photographie ont de vraies photos, parfois anciennes et en noir et blanc, l’animal en entier dans son décor, comme une photo de documentaire.

```bash
node scripts/photos/telecharger-photos.mjs telecharger   # cherche et télécharge (Node 22.18 ou plus récent)
node scripts/photos/telecharger-photos.mjs finaliser     # public/photos/<id>.webp + crédits dans src/data/photos.json
```

1. Pour chaque espèce, le script prend l’image principale de sa page Wikipédia en français (trouvée par le titre imposé dans `scripts/photos/titres.json`, sinon par le nom scientifique, sinon par le nom commun), sinon celle de sa page en anglais, sinon son image Wikidata.
2. La photo est cadrée au format 3:4 de la fenêtre des cartes (600 × 800, WebP).

Si une photo ne convient pas (carte de répartition, squelette, mauvais animal…), ajoute son nom de fichier Commons dans `scripts/photos/refus.json` : le script prendra la suivante. Pour choisir soi-même, mets le nom du fichier retenu dans `scripts/photos/choix.json` (avec au besoin un recadrage : `{ "fichier": "…", "recadrage": [x, y, largeur, hauteur] }`, en fractions de l’image), ou une image Pixabay : `{ "url": "https://cdn.pixabay.com/photo/…_1280.jpg", "page": "https://pixabay.com/…", "auteur": "…" }` ; `"explorer"` dans `config.json` produit une planche numérotée des photos Commons d’une espèce. Sans photo libre, la carte affiche le médaillon de sa famille. Le cadrage de chaque carte est dans `config.json`, « cadrage » : `[x, y, zoom]` (centre du cadre en fractions de la photo, 1 = le plus grand cadre 3:4 possible), choisi pour montrer l’animal entier et non sa seule tête ; `"etendre"` garde l’image entière et prolonge son fond uni (rendus 3D et maquettes photographiées en studio). Les photos viennent de la nature autant que possible. Aucun cadrage n’ajoute de fond flou : un animal trop allongé pour la carte est recadré, ou mérite une autre photo.

La GitHub Action `.github/workflows/photos.yml` fait la même chose en ligne.

Dans la version en un seul fichier (`npm run build:single`), les photos sont regroupées par paquets de 16 (`artifact/photos/pNN.json`, avec un index `artifact/photos/index.json`) et chargées au fur et à mesure que les cartes s’affichent.

## Et ensuite

- Plus d’espèces (le moteur a été testé avec 10 000 cartes).
- Photos des races de chien (onze d’entre elles affichent encore le médaillon de leur famille).
- Économie côté serveur : les ventes en ligne sont garanties par le serveur, mais les crédits et l’ouverture des boosters restent calculées dans le jeu de chaque joueur.

Mesures et populations sont des estimations arrondies. AnimalCards est un projet de fan non commercial.
