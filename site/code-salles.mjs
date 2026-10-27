// Le code d'accès des salles dans l'administration (admin/equipe.js, rubrique Espace pro), vérifié dans Chromium, hors
// ligne, sur la base fictive commune (admin-fictif.mjs) : l'invitation qui a un code (le dix-neuvième script) le montre
// en grand, en deux groupes de cinq, lisible caractère par caractère aux lecteurs d'écran, avec « Copier le code »,
// « Copier le message », « Partager… » (là où le navigateur partage) et « Par SMS » (au téléphone seulement) ; le
// courriel de « Écrire » le donne ; une invitation sans code (le script pas encore lancé) garde le lien seul.
//   python3 site/build.py && node site/code-salles.mjs
// Captures dans site/dist/shots-code/. Sort en erreur si une vérification manque.
import fs from 'node:fs';
import path from 'node:path';
import { chromium, ICI, ok, calme, ouvrir, texte, compte, bilan } from './admin-fictif.mjs';

const CAPT = path.join(ICI, 'dist', 'shots-code');
fs.mkdirSync(CAPT, { recursive: true });
const navigateur = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });

for (const [nom, largeur, hauteur] of [['bureau', 1440, 900], ['téléphone', 390, 844]]) {
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur, hauteur, hash: '#/pro/1' });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  await page.waitForSelector('.pro-code', { timeout: 8000 }).catch(() => {});
  const v = await page.evaluate(() => {
    const el = document.querySelector('.pro-code-v'); if (!el) return null;
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    return { texte: el.querySelector('[aria-hidden]')?.textContent, lu: el.querySelector('.sr')?.textContent, taille: parseFloat(cs.fontSize), deborde: r.right > innerWidth + 0.5 || r.left < -0.5 };
  });
  ok(`${nom} · le code en grand, en deux groupes de cinq`, v && v.texte === 'K7QM4-TZPXW' && v.taille >= 28, JSON.stringify(v));
  ok(`${nom} · lu caractère par caractère aux lecteurs d'écran`, v && v.lu === 'K 7 Q M 4 T Z P X W', v?.lu);
  ok(`${nom} · rien ne déborde`, v && !v.deborde);
  ok(`${nom} · l'adresse où le saisir est écrite`, /\/pro\/.*« Code d’accès »/.test(await texte(page, '.pro-code-ou')));
  await page.click('[data-pro="copier-code"]');
  const copie = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
  ok(`${nom} · « Copier le code » copie le code, et le dit`, copie === 'K7QM4-TZPXW' && /Code d’accès copié/.test(await page.evaluate(() => new Promise(r => setTimeout(() => r(document.body.innerText), 150)))), copie);
  await page.click('[data-pro="copier-message"]');
  const msg = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
  ok(`${nom} · « Copier le message » : le code, l'adresse de l'espace, le lien et la date de fin`, /K7QM4-TZPXW/.test(msg) && /\/pro\//.test(msg) && /#abc/.test(msg) && /Valable jusqu’au/.test(msg), msg);
  const sms = await page.evaluate(() => { const a = document.querySelector('[data-pro="sms"]'); return a ? { vu: a.getClientRects().length > 0 && getComputedStyle(a).display !== 'none', href: a.getAttribute('href') } : null; });
  ok(`${nom} · « Par SMS » ${largeur < 600 ? 'au téléphone, avec le message' : 'caché à la souris'}`, sms && (largeur < 600 ? sms.vu && decodeURIComponent(sms.href).includes('K7QM4-TZPXW') : !sms.vu), JSON.stringify(sms));
  const ecrire = await page.evaluate(() => decodeURIComponent(document.querySelector('[data-pro="ecrire"]')?.getAttribute('href') || ''));
  ok(`${nom} · le courriel de « Écrire » donne le code`, /code d’accès : K7QM4-TZPXW/.test(ecrire));
  const cibles = await page.evaluate(() => [...document.querySelectorAll('.pro-code .btn')].filter(b => b.getClientRects().length).every(b => b.getBoundingClientRect().height >= 44 - 0.5 || matchMedia('(pointer: fine)').matches));
  ok(`${nom} · ses boutons font 44 px au doigt`, cibles);
  await calme(page); await page.screenshot({ path: path.join(CAPT, `code-${largeur}.png`) });
  // une invitation sans code : le lien seul, « Copier le lien » en principal
  await page.evaluate(() => { location.hash = '#/pro/2'; });
  await page.waitForFunction(() => /Festival/.test(document.querySelector('#pro-actions')?.closest('main, #vue, body')?.innerText || ''), null, { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(300);
  ok(`${nom} · sans code (le script pas encore lancé), le lien seul`, await compte(page, '.pro-code') === 0 && await page.evaluate(() => document.querySelector('[data-pro="copier"]')?.classList.contains('principal')));
  ok(`${nom} · aucune erreur de script`, !erreurs.length, erreurs.join(' | '));
  await ctx.close();
}
await navigateur.close();
bilan(CAPT);
