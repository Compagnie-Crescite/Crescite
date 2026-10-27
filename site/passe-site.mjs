// La passe finale du site public : chaque route, au bureau (1440×900) et au téléphone (390×844, tactile), la nuit et avec un
// appareil réglé sur le jour (le site public n'a que la nuit, règle 19 : il doit la garder) ; axe-core (WCAG 2.1 A et AA,
// le contraste compris), le débordement à 360 px, les erreurs de script.
// Usage : AXE=<chemin de axe.min.js> node site/passe-site.mjs [<dossier dist>] [--port 8xxx] [--sortie <fichier.json>]
//   le dossier (site/dist par défaut) est servi sur un port libre ; axe-core se lit d'un fichier local (AXE, sinon
//   node_modules/axe-core) : aucun réseau. Sortie : un tableau par route et le total ; code 1 s'il reste un défaut.
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { createRequire } from 'node:module';

const PW = process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright/index.mjs';
const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const dist = resolve(args.find((a, i) => !a.startsWith('--') && !['--port', '--sortie'].includes(args[i - 1])) || new URL('./dist/', import.meta.url).pathname);
let axe = process.env.AXE;
if (!axe) { try { axe = createRequire(import.meta.url).resolve('axe-core/axe.min.js'); } catch (e) { /* plus bas */ } }
if (!axe || !existsSync(axe)) { console.error('axe-core introuvable : AXE=<chemin de axe.min.js>'); process.exit(2); }
const AXE = readFileSync(axe, 'utf8');

// le serveur : les fichiers de dist, rien d'autre
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.css': 'text/css', '.woff2': 'font/woff2', '.pdf': 'application/pdf' };
const serveur = createServer((q, r) => { const p = join(dist, decodeURIComponent(new URL(q.url, 'http://x').pathname)); const f = existsSync(p) && !p.endsWith('/') ? p : join(p, 'index.html');
  if (!f.startsWith(dist) || !existsSync(f)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' }); r.end(readFileSync(f)); });
await new Promise(ok => serveur.listen(+(opt('--port') || 0), '127.0.0.1', ok));
const BASE = `http://127.0.0.1:${serveur.address().port}/index.html?base=0&anim=0&intro=0`;

const { chromium } = await import(PW);
const browser = await chromium.launch({ args: ['--no-sandbox'] });
// les routes : les pages du menu et leurs sous-pages, chaque spectacle et ses onglets, les textes légaux, une adresse inconnue
const routes = await (async () => {
  const p = await browser.newPage(); await p.goto(BASE + '#/', { waitUntil: 'load' }); await p.waitForTimeout(800);
  const r = await p.evaluate(() => { const fini = s => !s.enTournee && !s.statut;
    const sp = D.shows.flatMap(s => (fini(s) ? [`#/spectacle/${s.slug}`] : ['voir', 'programmer', ...(s.actionCulturelle ? ['etablissement'] : [])].map(e => `#/spectacle/${s.slug}/${e}`)));
    const passe = Object.keys(D.saisons).filter(k => k !== D.saison).sort().reverse()[0];
    return ['#/', '#/saisons', passe ? `#/saisons/${passe}` : null, '#/spectacles', '#/compagnie', '#/contact', '#/espace-pro', '#/espace-pro/programmer', '#/espace-pro/etablissement',
      ...Object.keys(D.site.legal || {}).map(k => `#/${k}`), ...sp, '#/adresse-inconnue'].filter(Boolean); });
  await p.close(); return r;
})();
const PROFILS = { bureau: { viewport: { width: 1440, height: 900 } }, telephone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } };
const rapport = [];
for (const [nom, P] of Object.entries(PROFILS)) for (const schema of ['dark', 'light']) {
  const ctx = await browser.newContext({ ...P, colorScheme: schema, locale: 'fr-FR' });
  const page = await ctx.newPage();
  const erreurs = []; page.on('pageerror', e => erreurs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/favicon|net::ERR/.test(m.text())) erreurs.push(m.text()); });
  for (const h of routes) {
    erreurs.length = 0;
    await page.goto('about:blank'); await page.goto(BASE + h, { waitUntil: 'load' }); await page.waitForTimeout(1200);
    // (la page lue jusqu'en bas : ce qui se pose au défilement est posé, puis le haut)
    await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 800) { scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } scrollTo(0, 0); });
    await page.waitForTimeout(500);
    await page.evaluate(AXE);
    const res = await page.evaluate(async () => { const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] });
      return { theme: document.documentElement.dataset.theme, v: r.violations.map(v => ({ id: v.id, n: v.nodes.length, cibles: v.nodes.slice(0, 4).map(x => x.target.join(' ')) })) }; });
    let deborde = null;
    if (nom === 'telephone' && schema === 'dark') {
      await page.setViewportSize({ width: 360, height: 800 }); await page.waitForTimeout(400);
      deborde = await page.evaluate(() => { const W = document.documentElement.clientWidth, sw = document.documentElement.scrollWidth;
        const hors = [...document.querySelectorAll('main *, header *, footer *')].filter(e => { const r = e.getBoundingClientRect(); if (!r.width || r.right <= W + 1) return false;
          for (let x = e.parentElement; x && x !== document.body; x = x.parentElement) { const s = getComputedStyle(x); if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) return false; } return getComputedStyle(e).position !== 'fixed'; })
          .slice(0, 3).map(e => `${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]}`);
        return sw > W + 1 || hors.length ? { sw, W, hors } : null; });
      await page.setViewportSize(P.viewport);
    }
    rapport.push({ profil: nom, schema, route: h, theme: res.theme, violations: res.v, deborde, erreurs: [...erreurs] });
  }
  await ctx.close();
}
await browser.close(); serveur.close();
// le tableau : une ligne par route qui a un défaut, puis le total
let total = 0;
for (const x of rapport) {
  const n = x.violations.reduce((a, v) => a + v.n, 0) + (x.deborde ? 1 : 0) + x.erreurs.length + (x.theme !== 'nuit' ? 1 : 0); total += n;
  if (n) console.log(`${x.profil.padEnd(9)} ${x.schema.padEnd(5)} ${x.route.padEnd(40)} ${x.violations.map(v => `${v.id}×${v.n} [${v.cibles.join(' | ')}]`).join(' ; ')}${x.deborde ? ` débordement ${JSON.stringify(x.deborde)}` : ''}${x.erreurs.length ? ` erreurs ${x.erreurs.join(' / ')}` : ''}${x.theme !== 'nuit' ? ` thème ${x.theme}` : ''}`);
}
const par = k => Object.entries(rapport.reduce((m, x) => { x.violations.forEach(v => { m[v.id] = (m[v.id] || 0) + v.n; }); return m; }, {}));
console.log(`\n${rapport.length} vues (${routes.length} routes × bureau, téléphone × nuit, jour) : ${total} défaut${total > 1 ? 's' : ''}`);
console.log(`  axe : ${par().map(([k, n]) => `${k} ${n}`).join(', ') || '0'} · débordements à 360 px : ${rapport.filter(x => x.deborde).length} · erreurs de script : ${rapport.reduce((a, x) => a + x.erreurs.length, 0)} · hors de la nuit : ${rapport.filter(x => x.theme !== 'nuit').length}`);
if (opt('--sortie')) writeFileSync(opt('--sortie'), JSON.stringify(rapport, null, 1));
process.exit(total ? 1 : 0);
