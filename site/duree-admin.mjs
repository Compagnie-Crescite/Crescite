// La durée d'un spectacle dans l'administration : un seul champ (Général > Durée du spectacle), réécrit « durée : 1h15 » à la
// sortie du champ, enregistré dans la colonne duree ; l'ancien champ « Programmer > Durée » n'existe plus et son contenu
// (programmer.duree) est retiré à l'enregistrement. Dans Chromium, sur la base fictive (après le build).
import { chromium, MODIFS, DB, ok, calme, ouvrir, bilan } from './admin-fictif.mjs';
import path from 'node:path';
import { ROOT } from './admin-fictif.mjs';

const CAPT = path.join(ROOT, 'site', 'dist', 'shots-duree');
const nav = await chromium.launch();
const sp = DB.crescite_spectacles[0];
sp.duree = 'durée : 1h25'; sp.programmer = { ...(sp.programmer || {}), duree: 'Durée : 1h25', format: 'SPECTACLE IN SITU' };
const { page, erreurs } = await ouvrir(nav, { largeur: 1440, hauteur: 900, hash: `#/spectacles/${sp.slug}` });
await calme(page);
await page.evaluate(() => sessionStorage.setItem('crescite-onglet-sp', 'Général'));
await page.reload(); await calme(page);

const champ = page.locator('[data-chemin="duree"]');
ok('1 · le champ « Durée du spectacle » est dans Général', await champ.count() === 1 && /Durée du spectacle/.test(await page.locator('label[for="' + await champ.getAttribute('id') + '"]').innerText()));
ok('2 · il montre la durée de la base', await champ.inputValue() === 'durée : 1h25');
await champ.fill('1h15'); await page.locator('[data-chemin="titre"]').focus();
ok('3 · « 1h15 » se réécrit « durée : 1h15 » en quittant le champ', await champ.inputValue() === 'durée : 1h15', await champ.inputValue());
await page.getByRole('tab', { name: 'Programmer' }).click();
ok('4 · l\'onglet Programmer n\'a plus de champ Durée', await page.locator('[data-chemin="programmer.duree"]').count() === 0 && await page.locator('[data-chemin="programmer.format"]').count() === 1);
const n0 = MODIFS.length;
await page.locator('[data-enregistrer]').first().click(); await calme(page);
const m = MODIFS.slice(n0).find(x => x.table === 'crescite_spectacles');
ok('5 · l\'enregistrement écrit duree = « durée : 1h15 »', !!m && m.body && m.body.duree === 'durée : 1h15', JSON.stringify(m && m.body).slice(0, 300));
ok('6 · et retire programmer.duree', !!m && m.body && m.body.programmer && !('duree' in m.body.programmer) && m.body.programmer.format === 'SPECTACLE IN SITU', JSON.stringify(m && m.body && m.body.programmer));
ok('7 · aucune erreur de page', !erreurs.length, erreurs.join(' | '));
await nav.close();
bilan(CAPT);
