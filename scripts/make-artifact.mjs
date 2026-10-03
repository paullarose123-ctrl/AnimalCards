// Transforme le build « un seul fichier » en page publiable :
// on retire doctype / html / head / body (la plateforme les ajoute) et on garde
// <title>, les styles, la racine React et le script, dans cet ordre.
// Les photos partent à côté, car la page publiée ne peut charger que ses propres fichiers :
// des paquets de PAR_PAQUET photos (artifact/photos/pNN.json, id → data URI), groupés par famille
// puis par célébrité, et un index id → paquet (artifact/photos/index.json).
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const PAR_PAQUET = 16;
// Un peu plus légères que public/photos (480 × 640) : c'est tout le jeu qui se télécharge.
const LARGEUR = 420;
const QUALITE = 74;

const html = readFileSync('dist-single/index.html', 'utf8');
const title = html.match(/<title>[\s\S]*?<\/title>/)?.[0] ?? '<title>AnimalCards</title>';
const styles = [...html.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map((m) => m[0].replace(/<style[^>]*>/, '<style>'));
const scripts = [...html.matchAll(/<script[^>]*>[\s\S]*?<\/script>/g)].map((m) => m[0].replace(/<script[^>]*>/, '<script type="module">'));
if (!scripts.length) throw new Error('Aucun script trouvé dans le build');

// l'encodage d'abord : sans lui, un navigateur qui lirait la page en Latin-1 casserait les accents du script
const page = ['<meta charset="utf-8">', title, ...styles, '<div id="root"></div>', ...scripts].join('\n');
rmSync('artifact', { recursive: true, force: true });
mkdirSync('artifact/photos', { recursive: true });
writeFileSync('artifact/animalcards.html', page);
console.log(`artifact/animalcards.html : ${(page.length / 1024 / 1024).toFixed(2)} Mo`);

const credits = JSON.parse(readFileSync('src/data/photos.json', 'utf8'));
// la base est lue directement (Node 22.18 ou plus récent sait lire le TypeScript)
const { ATHLETES } = await import(pathToFileURL('src/data/athletes.ts').href);
const info = Object.fromEntries(ATHLETES.map((a) => [a.id, { sport: a.sport, fame: a.fame }]));
const ids = Object.keys(credits)
  .filter((id) => existsSync(`public/photos/${credits[id].file}`))
  .sort((a, b) => {
    const [x, y] = [info[a] ?? { sport: '~', fame: 0 }, info[b] ?? { sport: '~', fame: 0 }];
    return x.sport < y.sport ? -1 : x.sport > y.sport ? 1 : y.fame - x.fame || (a < b ? -1 : 1);
  });

const index = {};
let total = 0;
for (let start = 0; start < ids.length; start += PAR_PAQUET) {
  const name = `p${String(start / PAR_PAQUET + 1).padStart(2, '0')}`;
  const chunk = {};
  for (const id of ids.slice(start, start + PAR_PAQUET)) {
    const image = await sharp(`public/photos/${credits[id].file}`)
      .resize({ width: LARGEUR, withoutEnlargement: true })
      .webp({ quality: QUALITE, alphaQuality: 90 })
      .toBuffer();
    chunk[id] = `data:image/webp;base64,${image.toString('base64')}`;
    index[id] = name;
  }
  const text = JSON.stringify(chunk);
  total += text.length;
  writeFileSync(`artifact/photos/${name}.json`, text);
}
writeFileSync('artifact/photos/index.json', JSON.stringify(index));
console.log(`artifact/photos : ${ids.length} photos en ${Math.ceil(ids.length / PAR_PAQUET)} paquets, ${(total / 1024 / 1024).toFixed(2)} Mo`);
