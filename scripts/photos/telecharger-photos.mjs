#!/usr/bin/env node
// Photos des animaux depuis Wikimedia Commons (licences libres uniquement), avec crédits.
//
//   node scripts/photos/telecharger-photos.mjs telecharger [--tout] [--limite 20] [--seulement lion,tigre]
//   node scripts/photos/telecharger-photos.mjs finaliser
//   node scripts/photos/telecharger-photos.mjs recadrer [--seulement lion,tigre]   (après un changement de cadrage)
//
// Étape « telecharger » : pour chaque espèce (et chaque carte Habitat), prend la première photo libre de Commons
// parmi l'image principale de sa page Wikipédia en français (titre imposé dans titres.json, sinon nom scientifique,
// sinon nom commun), celle de sa page en anglais, puis son image Wikidata. Une photo choisie à la main dans
// choix.json (éventuellement recadrée) passe avant tout ; celles listées dans refus.json sont ignorées
// (carte de répartition, squelette, mauvais animal…). Par défaut, seules les espèces sans photo, ou dont la photo
// est refusée ou n'est plus celle choisie, sont traitées ; --tout (ou "tout": true dans config.json) les refait toutes.
// Pour les identifiants listés dans "explorer" (config.json), une planche numérotée de leurs photos Commons est
// enregistrée dans scripts/photos/explorer/ pour aider à choisir.
// Étape « finaliser » : produit public/photos/<id>.webp, la photo cadrée au format 3:4 de la fenêtre des cartes,
// et met à jour src/data/photos.json (crédits affichés dans le jeu).
// Demande Node 22.18 ou plus récent (le script lit directement src/data/athletes.ts).

import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

// chemins en texte : sharp n'accepte pas les objets URL
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const path = (p) => join(ROOT, p);
const RAW_DIR = path('tmp/photos/brut');
const META_FILE = path('tmp/photos/meta.json');
const OUT_DIR = path('public/photos');
const CREDITS_FILE = path('src/data/photos.json');
const readJson = (name) => JSON.parse(readFileSync(new URL(name, import.meta.url), 'utf8'));
const CONFIG = readJson('./config.json');
const OVERRIDES = readJson('./titres.json');
const REFUS = readJson('./refus.json');
const CHOIX = readJson('./choix.json');
/** Recherche Commons imposée (id → mots-clés) : ses premiers résultats passent avant la photo de la page Wikipédia. */
const RECHERCHE = readJson('./recherche.json');
/**
 * Photo choisie à la main : un nom de fichier Commons, ou { fichier, recadrage: [x, y, largeur, hauteur] } en fractions
 * de l'image, ou une image hors Commons { url, page, auteur } (Pixabay, licence Pixabay : réutilisation libre).
 * Options : "rotation" (degrés, après le recadrage) ; "fond" { url, page, auteur } = un paysage Pixabay sur lequel
 * l'animal est posé, détouré selon "detourer" : "alpha" (PNG déjà transparent), "blanc" ou "noir" (fond uni retiré).
 */
const PIXABAY_LICENSE = { license: 'Licence Pixabay', licenseUrl: 'https://pixabay.com/fr/service/license-summary/' };
const choiceOf = (id) => {
  const choice = CHOIX[id];
  if (!choice) return null;
  if (typeof choice === 'string') return { file: choice };
  const extra = { crop: choice.recadrage, rotation: choice.rotation, fond: choice.fond, detourer: choice.detourer };
  if (choice.url) {
    // licence Pixabay par défaut ; « licence » et « licenceUrl » pour une image d'ailleurs (Flickr en CC BY-SA…)
    const license = choice.licence ? { license: choice.licence, licenseUrl: choice.licenceUrl ?? '' } : PIXABAY_LICENSE;
    return { file: choice.page, ...extra, direct: { thumb: choice.url, page: choice.page, author: choice.auteur, ...license } };
  }
  return { file: choice.fichier, ...extra };
};

/**
 * Pose un animal détouré sur un paysage (image 1200 × 1600, au format des cartes) : fond légèrement flou, animal
 * entier posé au sol aux deux tiers du bas, ombre douce sous ses pattes, luminosité accordée au paysage.
 */
async function composeOnLandscape(animalBuffer, fond, detourer = 'alpha') {
  const [W, H] = [1200, 1600];
  const response = await request(fond.url);
  if (!response) throw new Error(`décor introuvable : ${fond.url}`);
  const landscape = await sharp(Buffer.from(await response.arrayBuffer()))
    .rotate()
    .resize(W, H, { fit: 'cover', position: 'centre' })
    .blur(1.6)
    .toBuffer();
  const { channels: bgStats } = await sharp(landscape).stats();
  const bgLum = (0.3 * bgStats[0].mean + 0.59 * bgStats[1].mean + 0.11 * bgStats[2].mean) / 255;

  // détourage : transparence existante, ou distance au blanc / au noir du fond uni
  const { data, info } = await sharp(animalBuffer)
    .resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const px = info.width * info.height;
  if (detourer === 'blanc' || detourer === 'blanc-ombre' || detourer === 'noir') {
    // le fond uni est la zone presque blanche (ou noire) reliée aux bords de l'image : remplissage depuis les bords,
    // pour ne pas trouer les parties claires (ou sombres) de l'animal. « blanc-ombre » : l'ombre grise dessinée sous
    // l'animal devient une ombre noire translucide, qui se fond dans le sol du décor.
    const target = detourer === 'noir' ? 0 : 255;
    const shadows = detourer === 'blanc-ombre';
    const distance = (i) => {
      const o = i * 4;
      return Math.max(Math.abs(data[o] - target), Math.abs(data[o + 1] - target), Math.abs(data[o + 2] - target));
    };
    const TOL = 34;
    const seen = new Uint8Array(px);
    const stack = [];
    for (let x = 0; x < info.width; x++) stack.push(x, (info.height - 1) * info.width + x);
    for (let y = 0; y < info.height; y++) stack.push(y * info.width, y * info.width + info.width - 1);
    while (stack.length) {
      const i = stack.pop();
      if (seen[i]) continue;
      seen[i] = 1;
      const d = distance(i);
      if (d > TOL) {
        const o = i * 4;
        const [r, g, b] = [data[o], data[o + 1], data[o + 2]];
        const lum = 0.3 * r + 0.59 * g + 0.11 * b;
        if (!shadows || Math.max(r, g, b) - Math.min(r, g, b) > 16 || lum < 110) continue;
        data[o] = data[o + 1] = data[o + 2] = 0;
        data[o + 3] = Math.min(data[o + 3], Math.round((255 - lum) * 0.9));
      } else {
        // fondu : plus le pixel est proche du fond, plus il est transparent
        data[i * 4 + 3] = Math.min(data[i * 4 + 3], Math.round(255 * Math.max(0, (d - 12) / (TOL - 12))));
      }
      const [x, y] = [i % info.width, Math.floor(i / info.width)];
      if (x > 0) stack.push(i - 1);
      if (x < info.width - 1) stack.push(i + 1);
      if (y > 0) stack.push(i - info.width);
      if (y < info.height - 1) stack.push(i + info.width);
    }
    // fond blanc enfermé entre les pattes, la queue et l'ombre : retiré aussi quand il est vraiment blanc
    if (shadows) {
      for (let i = 0; i < px; i++) {
        const d = distance(i);
        if (d <= 22) data[i * 4 + 3] = Math.min(data[i * 4 + 3], Math.round(255 * Math.max(0, (d - 12) / (TOL - 12))));
      }
    }
  }
  let [x0, y0, x1, y1] = [info.width, info.height, 0, 0];
  let lumSum = 0;
  let lumN = 0;
  for (let i = 0; i < px; i++) {
    const o = i * 4;
    const [r, g, b] = [data[o], data[o + 1], data[o + 2]];
    const a = data[o + 3];
    if (a > 60) {
      const [x, y] = [i % info.width, Math.floor(i / info.width)];
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      lumSum += (0.3 * r + 0.59 * g + 0.11 * b) / 255;
      lumN += 1;
    }
  }
  if (!lumN) throw new Error('animal introuvable après détourage');
  const cut = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
    .png()
    .toBuffer();
  // l'animal tient dans 88 % de la largeur et 58 % de la hauteur, les pattes à 84 % de la hauteur
  const [aw, ah] = [x1 - x0 + 1, y1 - y0 + 1];
  const scale = Math.min((0.88 * W) / aw, (0.58 * H) / ah);
  const [sw, sh] = [Math.round(aw * scale), Math.round(ah * scale)];
  const left = Math.round((W - sw) / 2);
  const top = Math.round(0.84 * H - sh);
  const brightness = Math.min(1.12, Math.max(0.88, 1 + (bgLum - lumSum / lumN) * 0.35));
  const animal = await sharp(cut).resize(sw, sh).modulate({ brightness }).png().toBuffer();
  const shadow = Buffer.from(
    `<svg width="${W}" height="${H}"><defs><filter id="f"><feGaussianBlur stdDeviation="${Math.round(sh * 0.035) + 6}"/></filter></defs>` +
      `<ellipse cx="${W / 2}" cy="${top + sh - sh * 0.015}" rx="${sw * 0.42}" ry="${Math.max(10, sh * 0.045)}" fill="#000" fill-opacity="0.5" filter="url(#f)"/></svg>`,
  );
  return sharp(landscape)
    .composite([{ input: shadow }, { input: animal, left, top }])
    .jpeg({ quality: 92 })
    .toBuffer();
}
const EXPLORE_DIR = path('scripts/photos/explorer');
const REPO = process.env.GITHUB_REPOSITORY ?? 'paullarose123-ctrl/AnimalCards';
const USER_AGENT = `AnimalCardsPhotos/1.0 (https://github.com/${REPO}; jeu de fan non commercial)`;

const argv = process.argv.slice(2);
const step = argv[0];
const option = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));

// Wikimedia limite le débit : après un refus (429), tous les téléchargements font une pause.
let pausedUntil = 0;

async function request(url, attempt = 1) {
  await sleep(pausedUntil - Date.now());
  const headers = { 'User-Agent': USER_AGENT, 'Api-User-Agent': USER_AGENT };
  // le CDN de Pixabay sert ses images aux pages de Pixabay
  if (url.includes('cdn.pixabay.com')) headers.Referer = 'https://pixabay.com/';
  const response = await fetch(url, { headers });
  if (response.status === 404) return null;
  if ((response.status === 429 || response.status >= 500) && attempt < 7) {
    await response.body?.cancel();
    const asked = Number(response.headers.get('retry-after')) * 1000;
    const wait = Math.min(60_000, asked > 0 ? asked : 2_000 * 2 ** (attempt - 1));
    pausedUntil = Math.max(pausedUntil, Date.now() + wait);
    return request(url, attempt + 1);
  }
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response;
}

async function json(url) {
  const response = await request(url);
  return response ? response.json() : null;
}

/** Espèces et cartes Mythe de la base (src/data/athletes.ts), les plus célèbres d'abord. */
async function readAnimals() {
  const { ATHLETES } = await import(pathToFileURL(path('src/data/athletes.ts')).href);
  return ATHLETES.map((a) => ({ id: a.id, name: a.last, latin: a.latin, sport: a.sport, fame: a.fame, mythe: false })).sort((a, b) => b.fame - a.fame);
}

/** Nom de fichier Commons d'une page de crédit (https://commons.wikimedia.org/wiki/File:…). */
const fileOfPage = (url = '') => decodeURIComponent(url.split('File:')[1] ?? '').replace(/_/g, ' ');

/** Page Wikipédia (API MediaWiki) : titre, image principale, homonymie, Wikidata, titre anglais. */
async function lookup(lang, title) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    redirects: '1',
    prop: 'pageimages|pageprops|langlinks',
    piprop: 'original|name',
    lllang: 'en',
    titles: title,
  });
  const data = await json(`https://${lang}.wikipedia.org/w/api.php?${params}`);
  const page = data?.query?.pages?.[0];
  if (!page || page.missing || page.invalid) return null;
  return {
    lang,
    title: page.title,
    disambiguation: page.pageprops ? 'disambiguation' in page.pageprops : false,
    image: page.pageimage ?? null,
    item: page.pageprops?.wikibase_item ?? null,
    enTitle: page.langlinks?.[0]?.title ?? null,
  };
}

/** Page de l'animal dans une langue : titre imposé, nom scientifique, puis nom commun. */
async function resolve(lang, animal, log, hint) {
  const titles = lang === 'fr' ? [OVERRIDES[animal.id], animal.latin, animal.name] : [hint, animal.latin, animal.name];
  for (const title of new Set(titles.filter(Boolean))) {
    const page = await lookup(lang, title.replace(/’/g, "'"));
    if (page && !page.disambiguation) return page;
    log.push(`${lang}:« ${title} » ${page ? 'homonymie' : 'introuvable'}`);
  }
  return null;
}

const isPhoto = (file) => /\.(jpe?g|png|webp)$/i.test(file);

/** Cartes, vues satellites, reliefs, montages, panneaux : pas une photo de l'animal ou du lieu. */
const NOT_A_PHOTO = /map|carte|satellite|topograph|annotated|\bDEM|relief|location|locator|copernicus|landsat|sentinel|astronaut|\bISS\b|blue[ _]marble|\bEO\b|-EO\.|assemblage|montage|collage|sign\b|panneau|logo|diagram|\bplan\b/i;

/** Premières photos libres d'une recherche Commons. */
async function searchCommons(query) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    generator: 'search',
    gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: '6',
    gsrlimit: '20',
    prop: 'imageinfo',
    iiprop: 'size',
  });
  const data = await json(`https://commons.wikimedia.org/w/api.php?${params}`);
  return (data?.query?.pages ?? [])
    .sort((a, b) => a.index - b.index)
    .filter((page) => (page.imageinfo?.[0]?.width ?? 0) >= 1000)
    .map((page) => page.title.replace(/^File:/, ''))
    .filter((file) => isPhoto(file) && !NOT_A_PHOTO.test(file));
}

/** Images Wikidata (P18) d'un élément, la préférée d'abord. */
async function wikidataImages(item) {
  const data = await json(`https://www.wikidata.org/w/api.php?action=wbgetclaims&format=json&entity=${item}&property=P18`);
  const rank = { preferred: 0, normal: 1 };
  return (data?.claims?.P18 ?? [])
    .filter((claim) => claim.rank in rank)
    .sort((a, b) => rank[a.rank] - rank[b.rank])
    .map((claim) => claim.mainsnak?.datavalue?.value)
    .filter((file) => typeof file === 'string' && isPhoto(file));
}

/** Photos possibles, dans l'ordre : choix manuel, page française, page anglaise, Wikidata. */
async function* candidates(animal, log) {
  const seen = new Set();
  const choice = choiceOf(animal.id);
  if (choice) {
    seen.add(choice.file);
    yield { ...choice, source: choice.direct ? 'pixabay' : 'choix' };
  }
  if (RECHERCHE[animal.id]) {
    for (const file of await searchCommons(RECHERCHE[animal.id])) {
      if (seen.has(file)) continue;
      seen.add(file);
      yield { file, source: `recherche:${RECHERCHE[animal.id]}` };
    }
  }
  let item = null;
  let enTitle = null;
  for (const lang of ['fr', 'en']) {
    const page = await resolve(lang, animal, log, enTitle);
    if (!page) continue;
    item ??= page.item;
    enTitle ??= page.enTitle;
    const file = page.image?.replace(/_/g, ' ');
    // une carte Mythe accepte aussi une illustration vectorielle (dieux égyptiens…) ; pour une espèce, un SVG est
    // presque toujours une carte de répartition
    if (!file || !isPhoto(file) || NOT_A_PHOTO.test(file)) log.push(`${lang}:« ${page.title} » sans photo`);
    else if (!seen.has(file)) {
      seen.add(file);
      yield { file, source: `${lang}:${page.title}` };
    }
  }
  if (!item) return;
  for (const file of await wikidataImages(item)) {
    if (seen.has(file) || NOT_A_PHOTO.test(file)) continue;
    seen.add(file);
    yield { file, source: `wikidata:${item}` };
  }
}

function stripHtml(html = '') {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90);
}

/** Informations Commons : la photo doit y être hébergée (donc libre) avec une licence déclarée. */
async function commonsInfo(file) {
  const data = await json(
    `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1800&titles=${encodeURIComponent(`File:${file}`)}`,
  );
  const page = data && Object.values(data.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  if (!info) return { reason: 'absente de Commons' };
  const meta = info.extmetadata ?? {};
  const license = stripHtml(meta.LicenseShortName?.value);
  if (meta.NonFree?.value === 'true' || !license) return { reason: `licence refusée (${license || 'aucune'})` };
  return {
    info: {
      thumb: info.thumburl ?? info.url,
      page: info.descriptionurl,
      author: stripHtml(meta.Artist?.value) || 'Auteur inconnu',
      license,
      licenseUrl: meta.LicenseUrl?.value ?? '',
    },
  };
}

/** Planche numérotée des photos Commons d'un animal (une ou plusieurs recherches), pour en choisir une dans choix.json. */
async function explore(animal, queries) {
  const pages = [];
  const seen = new Set();
  for (const query of queries) {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      formatversion: '2',
      generator: 'search',
      gsrsearch: `${query} filetype:bitmap`,
      gsrnamespace: '6',
      gsrlimit: '40',
      prop: 'imageinfo',
      iiprop: 'url|size|extmetadata',
      iiurlwidth: '330',
    });
    const data = await json(`https://commons.wikimedia.org/w/api.php?${params}`);
    for (const page of (data?.query?.pages ?? []).sort((a, b) => a.index - b.index)) {
      if (seen.has(page.title)) continue;
      seen.add(page.title);
      pages.push(page);
    }
  }
  const [W, H, LABEL, COLS] = [220, 290, 22, 6];
  const layers = [];
  const list = [];
  for (const page of pages) {
    if (list.length >= 36) break;
    const info = page.imageinfo?.[0];
    const file = page.title.replace(/^File:/, '');
    const license = stripHtml(info?.extmetadata?.LicenseShortName?.value);
    if (!info || !isPhoto(file) || !license || info.extmetadata?.NonFree?.value === 'true') continue;
    const response = await request(info.thumburl ?? info.url);
    if (!response) continue;
    const n = list.length + 1;
    const [x, y] = [((n - 1) % COLS) * W, Math.floor((n - 1) / COLS) * (H + LABEL)];
    const tile = await sharp(Buffer.from(await response.arrayBuffer())).rotate().resize(W, H, { fit: 'contain', background: '#222' }).jpeg().toBuffer();
    const label = `<svg width="${W}" height="${LABEL}"><rect width="100%" height="100%" fill="#000"/><text x="6" y="16" font-family="sans-serif" font-size="14" fill="#fff">${n} · ${info.width}×${info.height}</text></svg>`;
    layers.push({ input: tile, left: x, top: y }, { input: Buffer.from(label), left: x, top: y + H });
    list.push({ n, file, license, width: info.width, height: info.height });
  }
  if (!list.length) {
    console.log(`  ${animal.id} : aucune photo libre trouvée sur Commons`);
    return;
  }
  mkdirSync(EXPLORE_DIR, { recursive: true });
  const size = { width: COLS * W, height: Math.ceil(list.length / COLS) * (H + LABEL), channels: 3, background: '#111' };
  await sharp({ create: size }).composite(layers).jpeg({ quality: 72 }).toFile(join(EXPLORE_DIR, `${animal.id}.jpg`));
  writeFileSync(join(EXPLORE_DIR, `${animal.id}.json`), `${JSON.stringify(list, null, 1)}\n`);
  console.log(`  ${animal.id} : ${list.length} photos sur la planche scripts/photos/explorer/${animal.id}.jpg`);
}

async function download() {
  mkdirSync(RAW_DIR, { recursive: true });
  const all = argv.includes('--tout') || process.env.PHOTOS_TOUT === 'true' || CONFIG.tout === true;
  const only = (option('seulement') ?? process.env.PHOTOS_SEULEMENT ?? '').split(',').map((id) => id.trim()).filter(Boolean);
  const limit = Number(option('limite') ?? CONFIG.limite ?? 0);
  const current = existsSync(CREDITS_FILE) ? JSON.parse(readFileSync(CREDITS_FILE, 'utf8')) : {};
  const refused = (id, file) => (REFUS[id] ?? []).includes(file);
  // fichier Commons de la photo actuelle, ou adresse de sa page pour une image hors Commons
  const currentFile = (id) => (current[id]?.page?.includes('File:') ? fileOfPage(current[id].page) : (current[id]?.page ?? ''));
  const sameCrop = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  const outdated = (a) => {
    const choice = choiceOf(a.id);
    if (!current[a.id] || refused(a.id, currentFile(a.id))) return true;
    return !!choice && (choice.file !== currentFile(a.id) || !sameCrop(choice.crop, current[a.id].crop));
  };
  let animals = await readAnimals();
  // "explorer" : une liste d'identifiants, ou { "identifiant": ["recherche", …] } pour chercher autre chose que le nom
  const explorer = Array.isArray(CONFIG.explorer) ? Object.fromEntries(CONFIG.explorer.map((id) => [id, []])) : (CONFIG.explorer ?? {});
  for (const animal of animals.filter((a) => a.id in explorer)) {
    const queries = [explorer[animal.id]].flat().filter(Boolean);
    await explore(animal, queries.length ? queries : [animal.latin ?? animal.name]).catch((error) => console.warn(`  ${animal.id} : ${error.message}`));
  }
  if (only.length) animals = animals.filter((a) => only.includes(a.id));
  else if (!all) animals = animals.filter(outdated);
  if (limit > 0) animals = animals.slice(0, limit);

  const photos = {};
  const none = [];
  const errors = [];
  let next = 0;
  let done = 0;

  async function worker() {
    while (next < animals.length) {
      const animal = animals[next++];
      const log = [];
      try {
        for await (const { file, source, crop, direct, rotation, fond, detourer } of candidates(animal, log)) {
          if (refused(animal.id, file)) {
            log.push(`« ${file} » refusée`);
            continue;
          }
          const { info, reason } = direct ? { info: direct } : await commonsInfo(file);
          if (!info) {
            log.push(`« ${file} » ${reason}`);
            continue;
          }
          const response = await request(info.thumb);
          if (!response) {
            log.push(`« ${file} » introuvable au téléchargement`);
            continue;
          }
          let image = sharp(await sharp(Buffer.from(await response.arrayBuffer())).rotate().toBuffer());
          if (crop) {
            // recadrage choisi à la main : on ne garde que l'animal
            const { width, height } = await image.metadata();
            const left = Math.round(crop[0] * width);
            const top = Math.round(crop[1] * height);
            image = image.extract({ left, top, width: Math.min(width - left, Math.round(crop[2] * width)), height: Math.min(height - top, Math.round(crop[3] * height)) });
          }
          if (rotation) image = sharp(await image.rotate(rotation).toBuffer());
          if (fond) image = sharp(await composeOnLandscape(await image.png().toBuffer(), fond, detourer));
          await image.resize({ width: 1800, withoutEnlargement: true }).jpeg({ quality: 90 }).toFile(join(RAW_DIR, `${animal.id}.jpg`));
          const credit = fond ? { author: `${info.author} ; décor : ${fond.auteur}`, license: `${info.license} ; décor : Licence Pixabay` } : {};
          photos[animal.id] = { file, source, ...(crop ? { crop } : {}), ...info, ...credit };
          break;
        }
        if (!photos[animal.id]) {
          none.push(animal.id);
          console.log(`  ${animal.id} : aucune photo libre (${log.join(' ; ') || 'page introuvable'})`);
        }
      } catch (error) {
        // erreur réseau : on garde la photo actuelle, s'il y en a une
        errors.push(animal.id);
        console.warn(`  ${animal.id} : ${error.message}`);
      }
      done += 1;
      if (done % 25 === 0) console.log(`  ${done}/${animals.length}`);
      await sleep(250);
    }
  }

  console.log(`Recherche des photos de ${animals.length} cartes${all && !only.length ? ' (toutes)' : ''}…`);
  await Promise.all(Array.from({ length: 3 }, worker));
  writeFileSync(META_FILE, JSON.stringify({ photos, none }, null, 1));
  console.log(`${Object.keys(photos).length} photos trouvées, ${none.length} sans photo libre : ${none.join(', ') || '-'}`);
  if (errors.length) console.log(`${errors.length} erreurs réseau (photo actuelle conservée) : ${errors.join(', ')}`);
}

/**
 * Image de la carte (600 × 800, format 3:4 de la fenêtre) à partir de la photo brute.
 * Cadrage dans config.json, « cadrage » : { "lion": [0.45, 0.4, 1.3] } = centre horizontal, centre vertical
 * (fractions de la photo) et zoom (1 = le plus grand cadre 3:4 possible) ; "etendre" = la photo entière, dont le fond
 * uni (rendus 3D et maquettes photographiées en studio) est prolongé en haut et en bas jusqu'à remplir la fenêtre :
 * l'animal reste entier, sans raccord visible. Aucun mode n'ajoute de fond flou : un animal trop allongé pour la
 * carte est recadré (sa tête gardée), ou mérite une autre photo.
 * Sans cadrage, sharp choisit la zone la plus intéressante.
 * { "miroir": true, … } retourne la photo de gauche à droite (pour sortir la tête de sous la pastille de note, en haut
 * à gauche de la carte) ; les coordonnées de « corps » ou de « cadre » ([x, y, zoom]) se lisent alors sur l'image
 * retournée.
 */
async function renderCard(id) {
  let raw = join(RAW_DIR, `${id}.jpg`);
  const target = join(OUT_DIR, `${id}.webp`);
  let spec = CONFIG.cadrage?.[id];
  const [W, H] = [600, 800];
  if (spec && !Array.isArray(spec) && typeof spec === 'object' && (spec.miroir || spec.cadre)) {
    if (spec.miroir) {
      const mirrored = join(RAW_DIR, '..', 'miroir', `${id}.jpg`);
      mkdirSync(join(RAW_DIR, '..', 'miroir'), { recursive: true });
      await sharp(raw).flop().jpeg({ quality: 92 }).toFile(mirrored);
      raw = mirrored;
    }
    spec = spec.corps ? { corps: spec.corps } : spec.cadre;
  }
  if (spec && !Array.isArray(spec) && typeof spec === 'object' && spec.corps) {
    return renderBody(raw, target, spec.corps, W, H);
  }
  if (spec === 'etendre') {
    const front = await sharp(raw).resize(W, H, { fit: 'inside' }).toBuffer();
    const { width, height } = await sharp(front).metadata();
    // on prolonge en recopiant la rangée de bord ; si l'animal ou son ombre touche un bord, on ne prolonge que l'autre
    const spread = async (y) => {
      const { channels } = await sharp(front).extract({ left: 0, top: y, width, height: 1 }).stats();
      return Math.max(...channels.slice(0, 3).map((c) => c.stdev));
    };
    const [topSpread, bottomSpread] = [await spread(0), await spread(height - 1)];
    const free = H - height;
    const top = topSpread < 12 && bottomSpread < 12 ? Math.floor(free / 2) : topSpread <= bottomSpread ? free : 0;
    const left = Math.floor((W - width) / 2);
    await sharp(front)
      .extend({ top, bottom: free - top, left, right: W - width - left, extendWith: 'copy' })
      .webp({ quality: 82 })
      .toFile(target);
    return;
  }
  if (!Array.isArray(spec)) {
    await sharp(raw).resize(W, H, { fit: 'cover', position: sharp.strategy.attention }).webp({ quality: 82 }).toFile(target);
    return;
  }
  const [cx = 0.5, cy = 0.42, zoom = 1] = spec;
  const { width, height } = await sharp(raw).metadata();
  const ratio = W / H;
  let cw = width / height > ratio ? height * ratio : width;
  let ch = cw / ratio;
  cw /= zoom;
  ch /= zoom;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const left = Math.round(clamp(cx * width - cw / 2, 0, width - cw));
  const top = Math.round(clamp(cy * height - ch / 2, 0, height - ch));
  await sharp(raw)
    .extract({ left, top, width: Math.round(Math.min(cw, width - left)), height: Math.round(Math.min(ch, height - top)) })
    .resize(W, H, { fit: 'cover' })
    .webp({ quality: 82 })
    .toFile(target);
}

/**
 * Cadrage « corps entier » : { "corps": [x0, y0, x1, y1] } = boîte englobant tout l'animal, tête comprise
 * (fractions de la photo brute). Le cadre 3:4 contient toute la boîte avec une marge (plus en haut pour le badge de
 * note, plus en bas pour le bandeau du nom), sans jamais sortir de la photo. Si l'animal est trop long pour tenir
 * entier dans un cadre 3:4 de cette photo, le cadre prend toute la place possible, centré sur l'animal, et la carte
 * est signalée (elle mérite une photo où l'animal tient en entier).
 * Renvoie la part de l'animal qui tient dans le cadre (1 = entier).
 */
async function renderBody(raw, target, [x0, y0, x1, y1], W, H) {
  const { width: PW, height: PH } = await sharp(raw).metadata();
  const ratio = W / H;
  const bx0 = x0 * PW;
  const bx1 = x1 * PW;
  const by0 = y0 * PH;
  const by1 = y1 * PH;
  const bw = bx1 - bx0;
  const bh = by1 - by0;
  const maxW = Math.min(PW, PH * ratio);
  // marge confortable si possible, sinon la plus grande qui tienne dans la photo
  const wanted = Math.max(bw * 1.1, bh * 1.32 * ratio, 40);
  const tight = Math.max(bw * 1.02, bh * 1.12 * ratio, 40);
  const cw = Math.min(maxW, wanted <= maxW ? wanted : Math.max(tight, maxW));
  const ch = cw / ratio;
  // placement : l'animal entier si possible (un peu plus d'air au-dessus qu'au-dessous), dans la photo
  const fit = (lo, hi, size, photo, bias) => {
    const free = size - (hi - lo);
    const start = free >= 0 ? lo - free * bias : (lo + hi) / 2 - size / 2;
    return Math.min(photo - size, Math.max(0, start));
  };
  const left = fit(bx0, bx1, cw, PW, 0.5);
  const top = fit(by0, by1, ch, PH, 0.58);
  await sharp(raw)
    .extract({ left: Math.round(left), top: Math.round(top), width: Math.round(Math.min(cw, PW - left)), height: Math.round(Math.min(ch, PH - top)) })
    .resize(W, H, { fit: 'cover' })
    .webp({ quality: 84 })
    .toFile(target);
  return Math.min(1, cw / bw, ch / bh);
}

/** Enregistre les photos téléchargées (meta.json), produit leurs images de carte et met à jour les crédits. */
async function finalize() {
  mkdirSync(OUT_DIR, { recursive: true });
  const { photos, none } = JSON.parse(readFileSync(META_FILE, 'utf8'));
  const known = new Set((await readAnimals()).map((a) => a.id));
  const credits = existsSync(CREDITS_FILE) ? JSON.parse(readFileSync(CREDITS_FILE, 'utf8')) : {};
  for (const id of Object.keys(credits)) if (!known.has(id) || none.includes(id)) delete credits[id];
  for (const [id, info] of Object.entries(photos)) {
    // espèce retirée du jeu depuis le téléchargement : on l'ignore
    if (!known.has(id) || !existsSync(join(RAW_DIR, `${id}.jpg`))) continue;
    await renderCard(id);
    // taille de la photo brute : sert à régler un cadrage précis (config.json) sans la retélécharger
    const { width: rawW, height: rawH } = await sharp(join(RAW_DIR, `${id}.jpg`)).metadata();
    credits[id] = {
      file: `${id}.webp`,
      cutout: false,
      author: info.author,
      license: info.license,
      licenseUrl: info.licenseUrl,
      page: info.page,
      ...(info.crop ? { crop: info.crop } : {}),
      brut: [rawW, rawH],
    };
  }
  // images qui n'ont plus d'animal
  const used = new Set(Object.values(credits).map((credit) => credit.file));
  for (const file of readdirSync(OUT_DIR)) if (!used.has(file)) unlinkSync(join(OUT_DIR, file));
  const sorted = Object.fromEntries(Object.entries(credits).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(CREDITS_FILE, `${JSON.stringify(sorted, null, 1)}\n`);
  console.log(`${Object.keys(photos).length} photos traitées, ${Object.keys(sorted).length} au total dans public/photos`);
}

/** Refait les images de carte de toutes les photos déjà téléchargées, après un changement de cadrage. */
async function recrop() {
  const credits = JSON.parse(readFileSync(CREDITS_FILE, 'utf8'));
  const only = (option('seulement') ?? '').split(',').map((id) => id.trim()).filter(Boolean);
  const ids = Object.keys(credits).filter((id) => (!only.length || only.includes(id)) && existsSync(join(RAW_DIR, `${id}.jpg`)));
  const cut = [];
  for (const id of ids) {
    const part = await renderCard(id);
    if (typeof part === 'number' && part < 0.97) cut.push(`${id} (${Math.round(part * 100)} %)`);
  }
  console.log(`${ids.length} images de carte recadrées`);
  if (cut.length) console.log(`Animal pas entièrement visible (photo à remplacer) : ${cut.join(', ')}`);
}

if (step === 'telecharger') await download();
else if (step === 'finaliser') await finalize();
else if (step === 'recadrer') await recrop();
else {
  console.error('Étape inconnue. Utilise « telecharger », « finaliser » ou « recadrer ».');
  process.exit(1);
}
