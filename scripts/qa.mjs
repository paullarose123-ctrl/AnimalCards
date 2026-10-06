// Parcours de test visuel : node scripts/qa.mjs [url] [dossier]
import { chromium } from 'playwright';
const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? '/tmp/claude-0/shots';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errors = [];
async function session(name, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errors.push(`${name}: ${m.text()}`); });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  return page;
}
const shot = (page, file, full = false) => page.screenshot({ path: `${out}/${file}.png`, fullPage: full });

const desk = await session('desk', { width: 1280, height: 860 });
await shot(desk, '01-home', true);
await desk.getByRole('button', { name: 'Ouvrir un booster' }).click();
await desk.waitForTimeout(600);
await shot(desk, '02-pack');
await desk.locator('.opening__pack').click({ force: true });
await desk.waitForTimeout(1600);
await shot(desk, '03-cards');
await desk.getByRole('button', { name: 'Tout révéler' }).click();
await desk.waitForTimeout(1500);
await shot(desk, '04-revealed');
// termine la révélation (walkout éventuels)
for (let i = 0; i < 8; i++) {
  if (await desk.locator('.walkout').count()) { await desk.locator('.walkout').click({ force: true }); await desk.waitForTimeout(400); await desk.locator('.walkout').click({ force: true }).catch(() => {}); }
  const all = desk.getByRole('button', { name: 'Tout révéler' });
  if (await all.count() && await all.isEnabled()) await all.click();
  await desk.waitForTimeout(700);
}
await desk.waitForTimeout(900);
await shot(desk, '05-summary');
// walkout forcé : guépard légendaire
await desk.evaluate(() => {
  window.__game.setState({ opening: { packName: 'Pack Élite', tone: 'violet', cards: [
    { athleteId: 'herisson', variant: 'base', uid: 'x1', isNew: true },
    { athleteId: 'guepard', variant: 'base', record: 110, uid: 'x2', isNew: true },
  ] } });
});
await desk.waitForTimeout(400);
await desk.locator('.opening__pack').click({ force: true });
await desk.waitForTimeout(1500);
await desk.getByRole('button', { name: 'Révéler', exact: true }).click();
await desk.waitForTimeout(700);
await desk.getByRole('button', { name: 'Révéler', exact: true }).click();
await desk.waitForTimeout(600);
await shot(desk, '06-walkout-flag');
await desk.waitForTimeout(1100);
await shot(desk, '07-walkout-sport');
await desk.waitForTimeout(1000);
await shot(desk, '08-walkout-rating');
await desk.waitForTimeout(1600);
await shot(desk, '09-walkout-reveal');
await desk.getByRole('button', { name: 'Continuer' }).click();
await desk.waitForTimeout(1500);
await desk.getByRole('button', { name: 'Terminer' }).click().catch(() => {});
await desk.waitForTimeout(300);
// donne des cartes et des balles pour tester le reste
await desk.evaluate(() => {
  const ids = ['lion', 'tigre', 'loup', 'orque', 'gorille', 'lion-de-l-atlas', 'zebre', 'herisson', 'gnou', 'castor', 'koala', 'pieuvre'];
  const now = Date.now();
  const s = window.__game.getState();
  window.__game.setState({ balles: 150000, collection: [...s.collection, ...ids.map((id, i) => ({ uid: 'q' + i, athleteId: id, variant: i === 0 ? 'prime' : 'base', obtainedAt: now + i }))], discovered: { ...s.discovered, ...Object.fromEntries(ids.map((id) => [id, 1])) } });
});
await desk.getByRole('button', { name: /Collection/ }).first().click();
await desk.waitForTimeout(500);
await shot(desk, '10-collection', true);
await desk.getByRole('tab', { name: 'Album' }).click();
await desk.waitForTimeout(500);
await shot(desk, '11-album');
await desk.getByRole('button', { name: /Mercato/ }).first().click();
await desk.waitForTimeout(500);
await shot(desk, '12-market', false);
await desk.locator('.listing .card').first().click();
await desk.waitForTimeout(500);
await shot(desk, '13-detail-listing');
await desk.keyboard.press('Escape');
await desk.getByRole('button', { name: /Collection/ }).first().click();
await desk.waitForTimeout(300);
await desk.getByRole('tab', { name: 'Mon club' }).click();
await desk.locator('.card-grid .card').first().click();
await desk.waitForTimeout(500);
await shot(desk, '14-detail-owned');
await desk.getByRole('button', { name: 'Mettre en vente' }).click();
await desk.waitForTimeout(300);
await shot(desk, '15-sell-form');
await desk.keyboard.press('Escape');
await desk.getByRole('button', { name: /Matchs/ }).first().click();
await desk.waitForTimeout(300);
await desk.getByRole('button', { name: 'Équipe auto' }).click();
await desk.waitForTimeout(300);
await shot(desk, '16-team', true);
await desk.getByRole('button', { name: 'Lancer le match' }).click();
await desk.waitForTimeout(500);
await desk.locator('.hand__card').first().click();
await desk.locator('#use-ulti').check().catch(() => {});
await desk.waitForTimeout(200);
await shot(desk, '17-match', true);
await desk.getByRole('button', { name: 'Jouer la manche' }).click();
await desk.waitForTimeout(1800);
await shot(desk, '18-clash', true);
for (let r = 0; r < 4; r++) {
  await desk.getByRole('button', { name: /Manche suivante|Voir le résultat/ }).click();
  await desk.waitForTimeout(300);
  await desk.locator('.hand__card:not(:disabled)').first().click();
  await desk.getByRole('button', { name: 'Jouer la manche' }).click();
  await desk.waitForTimeout(1200);
}
await desk.getByRole('button', { name: /Manche suivante|Voir le résultat/ }).click();
await desk.waitForTimeout(400);
await shot(desk, '19-final', true);
await desk.getByRole('button', { name: /Encaisser/ }).click();
await desk.getByRole('button', { name: /Boutique/ }).first().click();
await desk.waitForTimeout(400);
await shot(desk, '20-shop', true);

const mob = await session('mob', { width: 390, height: 844 });
await shot(mob, '21-mobile-home', true);
await mob.getByRole('button', { name: 'Ouvrir un booster' }).click();
await mob.waitForTimeout(500);
await mob.locator('.opening__pack').click({ force: true });
await mob.waitForTimeout(1500);
await shot(mob, '22-mobile-cards');
await mob.evaluate(() => window.__game.setState({ opening: null }));
await mob.getByRole('button', { name: /Mercato/ }).first().click();
await mob.waitForTimeout(400);
await shot(mob, '23-mobile-market');
await mob.locator('.listing .card').first().click();
await mob.waitForTimeout(400);
await shot(mob, '24-mobile-detail', false);
const overflow = await mob.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
console.log('débordement horizontal mobile :', overflow);
console.log(errors.length ? 'ERREURS:\n' + errors.join('\n') : 'aucune erreur console');
await browser.close();
