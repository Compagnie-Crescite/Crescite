// Vérifie qu'une maquette se lit par onglets : chaque entrée du menu ouvre sa propre page.
// Usage : node maquettes/onglets.mjs <dossier de sortie> m03 [m04 …]
// Captures : <n>-tab-<onglet>.png (ordinateur) et <n>-mtab-<onglet>.png (téléphone) ; rapport des anomalies.
const PW = process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright/index.mjs';
const { chromium } = await import(PW);
const [out, ...names] = process.argv.slice(2);
const dist = new URL('./dist/', import.meta.url);
const ONGLETS = [['accueil', '#/'], ['spectacles', '#/spectacles'], ['agenda', '#/agenda'], ['compagnie', '#/compagnie'], ['contact', '#/contact'], ['spectacle', '#/spectacle/berenice']];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const report = {};
for (const n of names) {
  const log = [];
  for (const [tag, vp, mobile] of [['tab', { width: 1440, height: 900 }, false], ['mtab', { width: 390, height: 844 }, true]]) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, locale: 'fr-FR' });
    const page = await ctx.newPage();
    page.on('pageerror', e => log.push(`${tag} erreur : ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') log.push(`${tag} console : ${m.text()}`); });
    await page.goto(new URL(`${n}.html`, dist).href, { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    const titres = new Set();
    for (const [onglet, hash] of ONGLETS) {
      await page.evaluate(h => { location.hash = h; }, hash);
      await page.waitForTimeout(900);
      const etat = await page.evaluate(() => ({
        titre: document.title,
        h1: [...document.querySelectorAll('h1')].filter(h => h.offsetParent || h.getClientRects().length).map(h => h.textContent.trim().replace(/\s+/g, ' ')).join(' | '),
        courant: [...document.querySelectorAll('header [aria-current="page"], nav [aria-current="page"]')].map(a => a.textContent.trim()),
        hauteur: document.documentElement.scrollHeight,
        haut: Math.round(scrollY),
        debord: document.documentElement.scrollWidth - innerWidth,
      }));
      if (etat.debord > 1) log.push(`${tag} ${onglet} : débordement horizontal de ${etat.debord}px`);
      if (!etat.h1) log.push(`${tag} ${onglet} : aucun h1 visible`);
      if (etat.haut > 2 && onglet !== 'accueil') log.push(`${tag} ${onglet} : la page ne remonte pas en haut (scrollY ${etat.haut})`);
      if (['spectacles', 'agenda', 'compagnie', 'contact'].includes(onglet) && !mobile && etat.courant.length !== 1) log.push(`${tag} ${onglet} : ${etat.courant.length} entrée(s) de menu marquée(s) aria-current="page" au lieu d'une`);
      if (titres.has(etat.titre) && onglet !== 'accueil') log.push(`${tag} ${onglet} : document.title identique à un autre onglet (« ${etat.titre} »)`);
      titres.add(etat.titre);
      if (tag === 'tab') log.push(`· ${onglet} : « ${etat.titre} » · h1 « ${etat.h1.slice(0, 70)} » · menu actif ${JSON.stringify(etat.courant)} · hauteur ${etat.hauteur}px`);
      await page.screenshot({ path: `${out}/${n}-${tag}-${onglet}.png` });
    }
    await ctx.close();
  }
  report[n] = log;
}
console.log(JSON.stringify(report, null, 1));
await browser.close();
