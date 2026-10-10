// Vérifie les fiches des espèces avec Wikidata : statut de conservation UICN (P141), durée de gestation (P3063)
// et principales sources de nourriture (P1034), retrouvés par nom scientifique (P225).
// Résultat dans scripts/fiches/wikidata.json, que le test des fiches compare à src/data/encyclopedie.ts.
// À lancer par le robot « Fiches des espèces » (le conteneur de développement n'a pas accès à Wikidata).

import { writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const USER_AGENT = 'AnimalCards/1.0 (https://www.animalcards.fr ; jeu de cartes éducatif)';
const STATUS = {
  Q211005: 'LC',
  Q719675: 'NT',
  Q278113: 'VU',
  Q11394: 'EN',
  Q219127: 'CR',
  Q239509: 'EW',
  Q237350: 'EX',
  Q3245245: 'DD',
};

const { ATHLETES } = await import(pathToFileURL(`${ROOT}src/data/athletes.ts`).href);
// nom scientifique sans précision entre parenthèses (« Panthera pardus (forme noire) »)
const latinOf = (a) => (a.latin ?? '').replace(/\s*\(.*\)\s*/g, '').trim();
const names = [...new Set(ATHLETES.filter((a) => !a.habitat && !a.race && latinOf(a)).map(latinOf))];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function sparql(query) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch('https://query.wikidata.org/sparql', {
      method: 'POST',
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ query }),
    });
    if (res.ok) return (await res.json()).results.bindings;
    console.log('Wikidata', res.status, 'nouvel essai');
    await sleep(3000 * (attempt + 1));
  }
  throw new Error('Wikidata ne répond pas');
}

const out = {};
for (let i = 0; i < names.length; i += 50) {
  const batch = names.slice(i, i + 50);
  const values = batch.map((n) => JSON.stringify(n)).join(' ');
  const rows = await sparql(`
    SELECT ?name ?item ?status ?statusLabel ?gestation ?unitLabel ?foodLabel WHERE {
      VALUES ?name { ${values} }
      ?item wdt:P225 ?name .
      OPTIONAL { ?item wdt:P141 ?status . }
      OPTIONAL { ?item p:P3063/psv:P3063 [ wikibase:quantityAmount ?gestation ; wikibase:quantityUnit ?unit ] . }
      OPTIONAL { ?item wdt:P1034 ?food . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". }
    }`);
  for (const r of rows) {
    const name = r.name.value;
    const entry = (out[name] ??= { items: [], uicn: [], gestation: [], food: [] });
    const item = r.item.value.split('/').pop();
    if (!entry.items.includes(item)) entry.items.push(item);
    // statut connu, ou son libellé tel quel s'il n'est pas dans la liste (pour le repérer)
    const status = r.status && (STATUS[r.status.value.split('/').pop()] ?? `? ${r.statusLabel?.value ?? r.status.value}`);
    if (status && !entry.uicn.includes(status)) entry.uicn.push(status);
    if (r.gestation) {
      const g = `${Number(r.gestation.value)} ${r.unitLabel?.value ?? ''}`.trim();
      if (!entry.gestation.includes(g)) entry.gestation.push(g);
    }
    if (r.foodLabel && !entry.food.includes(r.foodLabel.value)) entry.food.push(r.foodLabel.value);
  }
  console.log(`${Math.min(i + 50, names.length)}/${names.length}`);
  await sleep(1000);
}
for (const n of names) out[n] ??= { items: [], uicn: [], gestation: [], food: [] };

const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(`${ROOT}scripts/fiches/wikidata.json`, `${JSON.stringify(sorted, null, 1)}\n`);
const found = Object.values(sorted).filter((e) => e.uicn.length).length;
console.log(`${names.length} noms scientifiques, ${found} avec un statut UICN`);
