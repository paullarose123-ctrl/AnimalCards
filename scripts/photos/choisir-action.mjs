#!/usr/bin/env node
// Choisit pour chaque athlète une photo « en action » (en tenue, en train de jouer) sur Wikimedia Commons,
// plutôt que l'image principale de Wikipédia, souvent un portrait ou une photo de presse.
//
//   node scripts/photos/choisir-action.mjs [--seulement messi,duplantis] [--limite 20]
//
// Pour chaque athlète : photos de sa catégorie Commons (sinon recherche sur son nom), notées d'après
// le titre, la description et les catégories (« match », « vs », « final », « Grand Prix »… comptent pour ;
// « interview », « conférence de presse », « portrait », « cérémonie »… comptent contre). La meilleure,
// si elle est assez sûre, est écrite dans choix.json ; sinon la photo actuelle est gardée.
// Ensuite : telecharger --tout, puis finaliser. Les cartes Mythe ne sont pas concernées.
//
// Choix à l'œil, quand la note ne suffit pas :
//   node scripts/photos/choisir-action.mjs --seulement messi,ali --candidats 8
//     → tmp/photos/candidats/01.jpg… (les 8 meilleures candidates de chaque athlète, numérotées de 0 à 7)
//   node scripts/photos/choisir-action.mjs --prendre messi=2,ali=0
//     → écrit ces candidates dans choix.json

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const path = (p) => join(ROOT, p);
const CHOIX_FILE = new URL('./choix.json', import.meta.url);
const REFUS = JSON.parse(readFileSync(new URL('./refus.json', import.meta.url), 'utf8'));
const REPORT_FILE = path('tmp/photos/action.json');
const CANDIDATS_FILE = path('tmp/photos/candidats.json');
const USER_AGENT = 'SportMastersPhotos/1.0 (https://github.com/NateVk76/claude; jeu de fan non commercial)';

const argv = process.argv.slice(2);
const option = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

// --portrait : privilégie les gros plans de l'athlète de face, en tenue (style carte de joueur)
const PORTRAIT = argv.includes('--portrait');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
let pausedUntil = 0;

async function json(url, attempt = 1) {
  await sleep(pausedUntil - Date.now());
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Api-User-Agent': USER_AGENT } });
  if ((response.status === 429 || response.status >= 500) && attempt < 6) {
    pausedUntil = Math.max(pausedUntil, Date.now() + 2000 * 2 ** (attempt - 1));
    return json(url, attempt + 1);
  }
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

function readAthletes() {
  const source = readFileSync(path('src/data/athletes.ts'), 'utf8');
  const pattern = /^\s*a\('([^']+)', '([^']*)', '([^']*)', '([a-z]+)', '[^']*', '[^']*', '[A-Z-]+', (\d+), (\d+)/gm;
  return [...source.matchAll(pattern)].map((m) => ({ id: m[1], first: m[2], last: m[3], sport: m[4], fame: Number(m[5]) }));
}

const normalize = (text) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

// Mots d'un sport en action (titres et catégories Commons sont surtout en anglais).
const SPORT_WORDS = {
  foot: ['football', 'soccer', 'ligue 1', 'premier league', 'la liga', 'serie a', 'bundesliga', 'champions league', 'uefa', 'fifa', 'world cup', 'euro 20', 'copa'],
  basket: ['basketball', 'nba', 'euroleague', 'fiba', 'dunk'],
  tennis: ['tennis', 'open', 'roland garros', 'wimbledon', 'davis cup', 'atp', 'wta', 'forehand', 'backhand', 'serve'],
  athle: ['athletics', 'athletisme', 'diamond league', 'championships', 'meeting', 'relay', 'hurdles', 'pole vault', 'high jump', 'long jump', 'sprint', 'marathon', 'javelin', 'discus', 'shot put', 'decathlon', 'heptathlon'],
  natation: ['swimming', 'natation', 'freestyle', 'butterfly', 'backstroke', 'breaststroke', 'medley', 'pool'],
  cyclisme: ['cycling', 'tour de france', 'giro', 'vuelta', 'stage', 'paris-roubaix', 'criterium', 'peloton', 'time trial'],
  auto: ['grand prix', 'formula', 'f1', 'motogp', 'rally', 'qualifying', 'race', 'circuit', 'lap', 'pit'],
  combat: ['boxing', 'fight', 'bout', 'ufc', 'judo', 'mma', 'ring'],
  rugby: ['rugby', 'six nations', 'top 14', 'test match', 'try', 'scrum', 'lineout'],
  hand: ['handball', 'ehf'],
  volley: ['volleyball', 'volley', 'nations league', 'cev'],
  hiver: ['ski', 'slalom', 'downhill', 'giant slalom', 'biathlon', 'skating', 'figure skating', 'world cup', 'snowboard', 'freestyle'],
  gym: ['gymnastics', 'beam', 'floor', 'vault', 'uneven bars', 'rings', 'pommel'],
  golf: ['golf', 'open championship', 'masters', 'ryder cup', 'pga', 'dp world tour', 'tee', 'fairway'],
  glisse: ['surfing', 'surf', 'skateboarding', 'climbing', 'bmx', 'wave'],
  us: ['nfl', 'super bowl', 'baseball', 'mlb', 'hockey', 'nhl', 'stanley cup', 'american football', 'touchdown'],
};

const ACTION = [' vs ', ' vs. ', ' v ', ' v. ', 'versus', 'match', 'game ', 'during', 'in action', 'playing', 'plays ', 'final', 'semifinal', 'semi-final', 'quarterfinal', 'round of', 'olympic', 'summer games', 'winter games', 'tournament', 'competition', 'championship', 'league', 'cup ', 'race', 'heat '];
const BAD = [
  'interview', 'press', 'conference', 'portrait', 'headshot', 'head shot', 'award', 'ceremony', 'gala', 'premiere', 'meeting with', 'visit', 'reception', 'signing', 'autograph',
  'selfie', 'minister', 'president', 'mayor', 'embassy', 'museum', 'statue', 'wax', 'grave', 'tomb', 'poster', 'stamp', 'drawing', 'painting', 'signature', 'logo', 'book',
  'studio', 'festival', 'red carpet', 'cannes', 'party', 'wedding', 'charity', 'launch', 'presentation', 'unveil', 'ambassador', 'fashion', 'mural', 'graffiti', 'caricature',
  'bust', 'plaque', 'medal ceremony', 'at the elysee', 'elysee', 'white house', 'kremlin', 'talk show', 'television', 'tv show', 'screenshot', 'mixed zone', 'zone mixte', 'arrival',
  'airport', 'hotel', 'birthday', 'funeral', 'memorial', 'election', 'campaign', 'forum', 'summit', 'bench', 'coach',
  'avenue', 'street', 'collage', 'top-25', 'sketch', 'car.', 'mosaic', 'cartoon', 'illustration', 'jersey', 'shirt display', 'boots',
  'ticket', 'helmet', 'exposition', 'exhibition', 'prayer', 'jogging with', 'senior day', 'and lebron',
];
const GROUP = ['team photo', 'squad', 'line-up', 'lineup', 'team picture', 'group photo', 'celebrat'];

/** Note d'une photo : plus elle est haute, plus l'athlète a des chances d'être en action et seul au premier plan. */
function score(page, athlete) {
  const info = page.imageinfo?.[0];
  if (!info) return -99;
  const meta = info.extmetadata ?? {};
  const license = meta.LicenseShortName?.value ?? '';
  if (meta.NonFree?.value === 'true' || !license) return -99;
  const title = normalize(page.title.replace(/^File:/, '').replace(/_/g, ' '));
  const cats = normalize((page.categories ?? []).map((c) => c.title.replace(/^Category:/, '')).join(' | '));
  const desc = normalize(`${meta.ImageDescription?.value ?? ''} ${meta.ObjectName?.value ?? ''}`.replace(/<[^>]*>/g, ' '));
  const all = ` ${title} | ${desc} | ${cats} `;
  let s = 0;
  for (const word of ACTION) if (all.includes(word)) s += 2;
  for (const word of SPORT_WORDS[athlete.sport] ?? []) if (all.includes(word)) s += 2;
  if (/in action|players in action|matches|games in |races|during the/.test(cats)) s += 4;
  for (const word of BAD) if (all.includes(word)) s -= 6;
  for (const word of GROUP) if (all.includes(word)) s -= 4;
  if (/podium|trophy|medal/.test(all)) s -= 3;
  if (/magazine|newspaper|scan/.test(all)) s -= 3;
  if (/\bfans?\b/.test(title)) s -= 6;
  if (PORTRAIT) {
    // gros plan de face en tenue : les recadrages Commons « (cropped) » d'une photo de match en sont souvent
    if (/\(cropped\)/.test(title)) s += 8;
    if (info.height > info.width) s += 3;
    if (info.width / info.height > 1.3) s -= 4;
  } else if (/\(cropped\)/.test(title)) s -= 1;
  // les mots d'action présents dans le titre lui-même comptent double
  for (const word of [...ACTION, ...(SPORT_WORDS[athlete.sport] ?? [])]) if (` ${title} `.includes(word)) s += 2;
  // l'athlète doit être nommé dans le titre, et son nom complet doit figurer dans le titre ou les catégories
  // (sinon la photo peut montrer un homonyme : DeAndre Jordan au lieu de Michael Jordan)
  const last = normalize(athlete.last).split(/[\s-]/).pop();
  const full = normalize(`${athlete.first} ${athlete.last}`.trim());
  if (!title.includes(last)) s -= 5;
  if (athlete.first && !title.includes(full) && !cats.includes(full)) s -= 8;
  // photo assez grande pour la carte
  if ((info.width ?? 0) < 600 || (info.height ?? 0) < 600) s -= 4;
  // photos en paysage très larges : l'athlète est souvent petit dans l'image
  if (info.width / info.height > 1.9) s -= 2;
  if (!/\.(jpe?g|png|webp)$/i.test(title)) return -99;
  return s;
}

async function candidates(athlete) {
  const name = `${athlete.first} ${athlete.last}`.trim().replace(/’/g, "'");
  // la catégorie Commons de l'athlète et ses sous-catégories (« Lionel Messi in 2018 »…), puis son nom
  const queries = [`deepcat:"${name}" filetype:bitmap`, `incategory:"${name}" filetype:bitmap`, `"${name}" filetype:bitmap`];
  const pages = new Map();
  for (const query of queries) {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      formatversion: '2',
      generator: 'search',
      gsrsearch: query,
      gsrnamespace: '6',
      gsrlimit: '40',
      prop: 'imageinfo|categories',
      iiprop: 'url|size|extmetadata',
      iiurlwidth: '330',
      clshow: '!hidden',
      cllimit: 'max',
    });
    // deepcat peut échouer sur les très grandes catégories : on passe alors à la recherche suivante
    const data = await json(`https://commons.wikimedia.org/w/api.php?${params}`).catch(() => null);
    for (const page of data?.query?.pages ?? []) if (!pages.has(page.title)) pages.set(page.title, page);
    if (pages.size >= 30) break;
  }
  return [...pages.values()];
}

/** Planches des candidates (une ligne par athlète, vignettes numérotées) : tmp/photos/candidats/01.jpg… */
async function planchesCandidats(ids, report) {
  const { default: sharp } = await import('sharp');
  const out = path('tmp/photos/candidats');
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const [W, H, NAME, ROWS] = [120, 160, 110, 10];
  const cols = Math.max(...ids.map((id) => report[id].length));
  const labelled = (input, n) => {
    const label = `<svg width="${W}" height="22"><rect width="26" height="22" fill="#000"/><text x="6" y="16" font-family="sans-serif" font-size="15" font-weight="bold" fill="#ff0">${n}</text></svg>`;
    return sharp(input)
      .resize(W, H, { fit: 'contain', background: '#222' })
      .composite([{ input: Buffer.from(label), left: 0, top: 0 }])
      .jpeg()
      .toBuffer();
  };
  const tile = async (c, n) => {
    if (c.local) return labelled(c.local, n);
    if (!c.thumb) return null;
    for (let attempt = 1; attempt <= 4; attempt++) {
      await sleep(pausedUntil - Date.now());
      const response = await fetch(c.thumb, { headers: { 'User-Agent': USER_AGENT } }).catch(() => null);
      if (response?.ok) return labelled(Buffer.from(await response.arrayBuffer()), n);
      pausedUntil = Math.max(pausedUntil, Date.now() + 2000 * attempt);
    }
    return null;
  };
  for (let sheet = 0; sheet * ROWS < ids.length; sheet++) {
    const slice = ids.slice(sheet * ROWS, (sheet + 1) * ROWS);
    const layers = [];
    for (const [row, id] of slice.entries()) {
      const top = row * (H + 4);
      const name = `<svg width="${NAME}" height="${H}"><text x="4" y="20" font-family="sans-serif" font-size="13" fill="#fff">${id}</text></svg>`;
      layers.push({ input: Buffer.from(name), left: 0, top });
      for (const [n, c] of report[id].entries()) {
        const img = await tile(c, n);
        if (img) layers.push({ input: img, left: NAME + n * (W + 2), top });
      }
    }
    const file = `${String(sheet + 1).padStart(2, '0')}.jpg`;
    await sharp({ create: { width: NAME + cols * (W + 2), height: slice.length * (H + 4), channels: 3, background: '#111' } })
      .composite(layers)
      .jpeg({ quality: 72 })
      .toFile(join(out, file));
    console.log(`tmp/photos/candidats/${file}`);
  }
}

/** --prendre messi=2,ali=0 : écrit dans choix.json les candidates retenues sur les planches. */
function prendre(choix, picks) {
  const report = JSON.parse(readFileSync(CANDIDATS_FILE, 'utf8'));
  for (const pick of picks.split(',')) {
    const [id, n] = pick.trim().split('=');
    const file = report[id]?.[Number(n)]?.file;
    if (!file) console.warn(`  ${pick} : candidate introuvable`);
    else choix[id] = file;
  }
  const sorted = Object.fromEntries(Object.entries(choix).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(CHOIX_FILE, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`${picks.split(',').length} photos retenues.`);
}

async function main() {
  let athletes = readAthletes();
  const only = option('seulement')?.split(',').map((s) => s.trim());
  if (only) athletes = athletes.filter((a) => only.includes(a.id));
  const limit = Number(option('limite') ?? 0);
  if (limit > 0) athletes = athletes.slice(0, limit);
  const candidats = Number(option('candidats') ?? 0);

  const choix = JSON.parse(readFileSync(CHOIX_FILE, 'utf8'));
  if (option('prendre')) return prendre(choix, option('prendre'));
  const report = {};
  let next = 0;
  let changed = 0;
  let done = 0;

  async function worker() {
    while (next < athletes.length) {
      const athlete = athletes[next++];
      try {
        const pages = await candidates(athlete);
        const refused = new Set(REFUS[athlete.id] ?? []);
        const ranked = pages
          .map((page) => ({ file: page.title.replace(/^File:/, ''), score: score(page, athlete), thumb: page.imageinfo?.[0]?.thumburl }))
          .filter((c) => !refused.has(c.file))
          .sort((a, b) => b.score - a.score);
        const best = ranked[0];
        if (candidats) {
          // la photo actuelle en premier (n° 0) pour pouvoir la garder, puis les meilleures candidates
          const others = ranked.filter((c) => c.score > -99 && c.file !== choix[athlete.id]);
          const local = path(`public/photos/${athlete.id}.webp`);
          const first = choix[athlete.id] && existsSync(local) ? [{ file: choix[athlete.id], score: 0, local }] : [];
          report[athlete.id] = [...first, ...others].slice(0, candidats);
        } else report[athlete.id] = ranked.slice(0, 5);
        if (!candidats && best && best.score >= 6) {
          if (choix[athlete.id] !== best.file) changed += 1;
          choix[athlete.id] = best.file;
        }
      } catch (error) {
        console.warn(`  ${athlete.id} : ${error.message}`);
      }
      done += 1;
      if (done % 25 === 0) console.log(`  ${done}/${athletes.length}`);
      await sleep(200);
    }
  }

  console.log(`Recherche de photos en action pour ${athletes.length} athlètes…`);
  await Promise.all(Array.from({ length: 3 }, worker));
  if (candidats) {
    writeFileSync(CANDIDATS_FILE, JSON.stringify(report, null, 1));
    await planchesCandidats(athletes.map((a) => a.id).filter((id) => report[id]?.length), report);
    return;
  }
  const sorted = Object.fromEntries(Object.entries(choix).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(CHOIX_FILE, `${JSON.stringify(sorted, null, 2)}\n`);
  writeFileSync(REPORT_FILE, JSON.stringify(report, null, 1));
  const weak = athletes.filter((a) => !(report[a.id]?.[0]?.score >= 6)).map((a) => a.id);
  console.log(`${changed} photos choisies ou changées. Sans photo d'action assez sûre (photo actuelle gardée) : ${weak.length}`);
  console.log(weak.join(', '));
}

await main();
