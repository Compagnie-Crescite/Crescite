// Vérifie qu'une maquette se lit par onglets, s'ouvre sur le logo, et n'affiche que le texte du site d'origine.
// Usage : node maquettes/onglets.mjs <dossier de sortie> m03 [m04 …]
// Captures : <n>-tab-<vue>.png (ordinateur) et <n>-mtab-<vue>.png (téléphone), <n>-intro.png ; rapport des anomalies.
// Le contrôle du texte compare chaque texte visible aux textes de D (le site d'origine) : tout texte absent de D est signalé.
const PW = process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright/index.mjs';
const { chromium } = await import(PW);
const [out, ...names] = process.argv.slice(2);
const dist = new URL('./dist/', import.meta.url);
const VUES = [['accueil', '#/'], ['spectacles', '#/spectacles'], ['agenda', '#/agenda'], ['compagnie', '#/compagnie'],
  ['actions', '#/actions-culturelles'], ['pro', '#/espace-pro'], ['contact', '#/contact'], ['spectacle', '#/spectacle/berenice'],
  ['cassandres', '#/spectacle/cassandres'], ['saison', '#/agenda/2019-2020'], ['mentions', '#/mentions-legales']];
const ONGLETS = ['spectacles', 'agenda', 'compagnie', 'actions', 'pro', 'contact'];
// les seuls libellés permis hors de D (voir le contrat)
const PERMIS = ['Accueil', 'Menu', 'Rouen', 'Aller au contenu', 'Fermer'];
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
    const intro = await page.evaluate(() => !!document.querySelector('.intro'));
    if (!intro) log.push(`${tag} : pas d'ouverture sur le logo au chargement de l'accueil (INTRO.ouvrir)`);
    else await page.screenshot({ path: `${out}/${n}-${tag === 'tab' ? '' : 'm'}intro.png` });
    // le corpus : tous les textes de D, normalisés
    await page.evaluate(PERMIS => {
      const norm = s => String(s).replace(/<[^>]+>/g, ' ').replace(/&nbsp;|[   ]/g, ' ').replace(/[’‘]/g, "'").replace(/[«»“”"]/g, '"').replace(/\s+/g, ' ').trim().toLowerCase();
      const parts = [];
      const walk = (v, k) => {
        if (['photos', 'logo', 'arms', 'carte'].includes(k)) return;
        if (typeof v === 'string') parts.push(norm(v)); else if (Array.isArray(v)) v.forEach(x => walk(x)); else if (v && typeof v === 'object') Object.entries(v).forEach(([kk, x]) => walk(x, kk));
      };
      walk(D);
      D.carte.lieux.forEach(l => parts.push(norm(`${l.c} (${l.dep})`)));
      PERMIS.forEach(p => parts.push(norm(p)));
      window.__corpus = parts.join(' | ');
      window.__norm = norm;
    }, PERMIS);
    const titres = new Set();
    for (const [vue, hash] of VUES) {
      await page.evaluate(h => { location.hash = h; }, hash);
      await page.waitForTimeout(900);
      const etat = await page.evaluate(() => {
        const vis = el => { for (let e = el; e && e !== document.body; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; } return el.getClientRects().length > 0; };
        const hors = [];
        const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let t; (t = tw.nextNode());) {
          const p = t.parentElement;
          if (!p || p.closest('script,style,noscript,.intro,[aria-hidden="true"] title,svg title,.sr-only,.visually-hidden,.sr') || !vis(p)) continue;
          const s = window.__norm(t.textContent);
          if (s.length < 4 || /^[\d\s.,:;\/–—\-+()·•|→←↗↓↑×]+$/.test(s)) continue;
          if (!window.__corpus.includes(s)) hors.push(t.textContent.trim().replace(/\s+/g, ' ').slice(0, 80));
        }
        return {
          titre: document.title,
          h1: [...document.querySelectorAll('h1')].filter(h => h.offsetParent || h.getClientRects().length).map(h => h.textContent.trim().replace(/\s+/g, ' ')).join(' | '),
          courant: [...document.querySelectorAll('header [aria-current="page"], nav [aria-current="page"]')].map(a => a.textContent.trim()),
          hauteur: document.documentElement.scrollHeight, haut: Math.round(scrollY),
          debord: document.documentElement.scrollWidth - innerWidth, hors: [...new Set(hors)],
        };
      });
      if (etat.debord > 1) log.push(`${tag} ${vue} : débordement horizontal de ${etat.debord}px`);
      if (!etat.h1) log.push(`${tag} ${vue} : aucun h1 visible`);
      if (etat.haut > 2 && vue !== 'accueil') log.push(`${tag} ${vue} : la page ne remonte pas en haut (scrollY ${etat.haut})`);
      if (ONGLETS.includes(vue) && !mobile && etat.courant.length !== 1) log.push(`${tag} ${vue} : ${etat.courant.length} entrée(s) de menu marquée(s) aria-current="page" au lieu d'une`);
      if (titres.has(etat.titre) && vue !== 'accueil') log.push(`${tag} ${vue} : document.title identique à un autre onglet (« ${etat.titre} »)`);
      titres.add(etat.titre);
      if (etat.hors.length && tag === 'tab') log.push(`${tag} ${vue} : texte absent du site d'origine : ${etat.hors.slice(0, 12).map(s => `« ${s} »`).join(', ')}${etat.hors.length > 12 ? ` (+${etat.hors.length - 12})` : ''}`);
      if (tag === 'tab') log.push(`· ${vue} : « ${etat.titre} » · h1 « ${etat.h1.slice(0, 60)} » · menu actif ${JSON.stringify(etat.courant)} · hauteur ${etat.hauteur}px`);
      await page.screenshot({ path: `${out}/${n}-${tag}-${vue}.png` });
    }
    await ctx.close();
  }
  report[n] = log;
}
console.log(JSON.stringify(report, null, 1));
await browser.close();
