// Capture d'écran d'une page locale : node scripts/shot.mjs <url> <fichier.png> [largeur] [hauteur] [fullPage]
import { chromium } from 'playwright';
const [url, out, width = '1400', height = '900', full = 'true'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: Number(width), height: Number(height) }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
await page.screenshot({ path: out, fullPage: full === 'true' });
if (errors.length) console.log('ERREURS:', errors.join('\n'));
await browser.close();
