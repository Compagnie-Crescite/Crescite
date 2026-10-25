// Captures d'une ou plusieurs maquettes : accueil (écran et page entière), page spectacle, les saisons (l'agenda, règle 21),
// téléphone.
// Usage : node maquettes/shoot.mjs <dossier de sortie> m03 [m04 …]
// Variables : PLAYWRIGHT_MODULE (chemin du module playwright), CHROMIUM (exécutable).
const PW = process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright/index.mjs';
const { chromium } = await import(PW);
const [out, ...names] = process.argv.slice(2);
const dist = new URL('./dist/', import.meta.url);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const report = {};
for (const n of names) {
  const url = new URL(`${n}.html`, dist).href;
  const log = [];
  for (const [view, vp, opts] of [
    ['home', { width: 1440, height: 900 }, {}],
    ['show', { width: 1440, height: 900 }, { hash: '#/spectacle/berenice/voir' }],
    ['agenda', { width: 1440, height: 900 }, { hash: '#/saisons' }],
    ['mobile', { width: 390, height: 844 }, { mobile: true }],
    ['mshow', { width: 390, height: 844 }, { mobile: true, hash: '#/spectacle/ci-gisait-cyrano/voir' }],
  ]) {
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
  }
  report[n] = log;
}
console.log(JSON.stringify(report, null, 1));
await browser.close();
