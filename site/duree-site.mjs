// La durée d'un spectacle sur le site : le champ `duree` du spectacle (administration, Général) est repris partout, jamais
// l'ancien programmer.duree : l'espace pro > Programmer (catalogue et fiche), la page du spectacle, le dossier scolaire
// (couverture, fiche technique, texte). Dans Chromium, sur l'instantané du site (?base=0), après le build.
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
let ko = 0;
const ok = (nom, v, detail = '') => { if (!v) ko++; console.log(`${v ? '  ✓' : '  ✗'} ${nom}${!v && detail ? `\n      ${detail}` : ''}`); };

const nav = await chromium.launch();
const page = await nav.newPage({ viewport: { width: 1280, height: 900 } });
const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
const URL = `file://${path.join(ROOT, 'site', 'dist', 'index.html')}?base=0`;
await page.goto(`${URL}#/`, { waitUntil: 'load' }); await page.waitForTimeout(1200);
// la base dit 1h15 ; l'ancien champ des conditions de programmation dit encore 1h25
await page.evaluate(() => { const s = D.shows.find(x => x.slug === 'berenice'); s.duree = AGENDA.dureeCanon('1h15'); s.programmer.duree = 'Durée : 1h25'; });
const lire = async hash => {
  await page.evaluate(h => { location.hash = '#/'; }, hash); await page.waitForTimeout(250);
  await page.evaluate(h => { location.hash = h; }, hash); await page.waitForTimeout(1800);
  return page.evaluate(() => (document.querySelector('main') || document.body).textContent.replace(/\s+/g, ' '));
};
const duree = (t, motif) => [...t.matchAll(motif)].map(x => x[1]);

let t = await lire('#/espace-pro/programmer');
ok('1 · espace pro > Programmer : le catalogue dit 1h15', /Bérénice\s*SPECTACLE IN SITU\s*1h15/.test(t) && !/1h25/.test(t), (t.match(/Bérénice.{0,60}/) || [''])[0]);
t = await lire('#/spectacle/berenice/programmer');
ok('2 · la fiche Programmer de Bérénice dit 1h15', /durée : 1h15/.test(t) && !/1h25/.test(t));
t = await lire('#/spectacle/berenice/etablissement');
ok('3 · dossier scolaire : la couverture dit 1h15', /Durée : 1h15/.test(t));
ok('4 · … le texte « d\'une durée de » aussi', /d'une durée de 1 h 15/i.test(t) && !/1 h 25/.test(t));
ok('5 · … et la fiche technique, sans toucher au montage', /Durée : 1h15/.test(t) && /Durée : 6 heures de montage/.test(t) && !/1h25/.test(t));
await page.evaluate(() => { D.shows.find(x => x.slug === 'berenice').duree = AGENDA.dureeCanon('55 min'); });
t = await lire('#/espace-pro/programmer');
ok('6 · « 55 min » devient « 55 minutes » partout', /Bérénice\s*SPECTACLE IN SITU\s*55 minutes/.test(t));
ok('7 · aucune erreur de page', !erreurs.length, erreurs.join(' | '));
await nav.close();
process.exit(ko ? 1 : 0);
