// Captures d'une ou plusieurs maquettes : accueil (écran et page entière), page spectacle, les saisons (l'agenda, règle 21),
// téléphone.
// Usage : node maquettes/shoot.mjs <dossier de sortie> m03 [m04 …]
// Variables : PLAYWRIGHT_MODULE (chemin du module playwright), CHROMIUM (exécutable), PARALLELE (captures à la fois).
const PW = process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright/index.mjs';
const { chromium } = await import(PW);
const [out, ...names] = process.argv.slice(2);
const dist = new URL('./dist/', import.meta.url);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--no-sandbox'] });
const VUES = [
  ['home', { width: 1440, height: 900 }, {}],
  ['show', { width: 1440, height: 900 }, { hash: '#/spectacle/berenice/voir' }],
  ['agenda', { width: 1440, height: 900 }, { hash: '#/saisons' }],
  ['mobile', { width: 390, height: 844 }, { mobile: true }],
  ['mshow', { width: 390, height: 844 }, { mobile: true, hash: '#/spectacle/ci-gisait-cyrano/voir' }],
];
// une capture attend surtout : elles vont en parallèle, PARALLELE à la fois (4 par défaut) ; le rapport garde l'ordre
const capture = async (n, view, vp, opts) => {
  const url = new URL(`${n}.html`, dist).href;
  const log = [];
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: !!opts.mobile, hasTouch: !!opts.mobile, colorScheme: 'light', locale: 'fr-FR' });
  const page = await ctx.newPage();
  page.on('pageerror', e => log.push(`${view} pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') log.push(`${view} console: ${m.text()}`); });
  await page.goto(url + (opts.hash || ''), { waitUntil: 'load' });
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `${out}/${n}-${view}.png` });
  if (view === 'home') { await page.screenshot({ path: `${out}/${n}-full.png`, fullPage: true }); }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 1) log.push(`${view}: débordement horizontal de ${overflow}px`);
  await ctx.close();
  return log;
};
const taches = names.flatMap(n => VUES.map(v => [n, ...v]));
const logs = new Array(taches.length);
let suivante = 0;
await Promise.all(Array.from({ length: Math.max(1, Math.min(taches.length, Number(process.env.PARALLELE) || 4)) }, async () => {
  for (let i; (i = suivante++) < taches.length;) logs[i] = await capture(...taches[i]);
}));
const report = {};
names.forEach((n, k) => { report[n] = logs.slice(k * VUES.length, (k + 1) * VUES.length).flat(); });
console.log(JSON.stringify(report, null, 1));
await browser.close();
