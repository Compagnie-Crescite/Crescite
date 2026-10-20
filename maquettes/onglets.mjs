// Vérifie qu'une maquette se lit par les trois entrées, s'ouvre sur le logo, et n'affiche que le texte de ses sources.
// Usage : node maquettes/onglets.mjs <dossier de sortie> m03 [m04 …]
// Captures : <n>-tab-<vue>.png (ordinateur) et <n>-mtab-<vue>.png (téléphone), <n>-intro.png ; rapport des anomalies.
// Le contrôle du texte compare chaque texte visible aux textes de D (le site d'origine, le dossier scolaire de Bérénice,
// les univers et les actions culturelles des spectacles) : tout texte absent de D est signalé.
const PW = process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright/index.mjs';
const { chromium } = await import(PW);
const [out, ...names] = process.argv.slice(2);
const dist = new URL('./dist/', import.meta.url);
// [vue, adresse, attendus : textes qui doivent être visibles (fonctions de D), interdits : textes qui ne doivent pas l'être]
const VUES = [
  ['accueil', '#/'],
  ['voir', '#/voir', D => [D.dates.find(d => !d.scolaire).details[0].texte], D => D.dates.filter(d => d.scolaire).map(d => d.details[0].texte)],
  ['programmer', '#/programmer', D => [D.shows.find(s => s.slug === 'mon-royaume').programmer.representations]],
  ['etablissement', '#/etablissement', D => ['afin de participer à « l’école du spectateur »', D.shows.find(s => s.slug === 'berenice').actionCulturelle.type]],
  ['spectacles', '#/spectacles', D => D.shows.map(s => s.titreLignes[0])],
  ['compagnie', '#/compagnie', D => [D.site.compagnie.directeur.titre, 'Cassandre(s)']],
  ['contact', '#/contact', D => [D.site.contact.titre]],
  ['berenice-voir', '#/spectacle/berenice/voir', D => ['Rome, an 79.']],
  ['berenice-programmer', '#/spectacle/berenice/programmer', D => ['100 à 120 places']],
  ['berenice-etablissement', '#/spectacle/berenice/etablissement', D => ['Atelier de préparation', 'À partir de la seconde']],
  ['cleophene-etablissement', '#/spectacle/cleophene/etablissement', D => ['parcours du spectateur']],
  ['macbeth-etablissement', '#/spectacle/macbeth-fatum/etablissement', D => [D.site.libelles.aCompleter]],
  ['cassandres', '#/spectacle/cassandres/voir', D => ['Spectacle en création']],
  ['saison', '#/agenda/2019-2020', D => [D.site.saisons.find(s => s.saison === '2019-2020').titre]],
  ['mentions', '#/mentions-legales'],
];
// les anciennes adresses et l'adresse d'un spectacle sans entrée : où elles doivent mener
const REDIRECTIONS = [['#/espace-pro', /^#\/programmer$/], ['#/agenda', /^#\/voir$/], ['#/actions-culturelles', /^#\/etablissement$/],
  ['#/spectacle/mon-royaume', /^#\/spectacle\/mon-royaume\/(voir|programmer|etablissement)$/]];
// les vues où une entrée du menu doit être marquée aria-current="page" (une seule)
const ONGLETS = ['voir', 'programmer', 'etablissement', 'spectacles', 'compagnie', 'contact'];
// les trois entrées, à portée de main en haut de ces vues (sans ouvrir de menu)
const ENTREES = ['#/voir', '#/programmer', '#/etablissement'];
const A_PORTEE = ['spectacles', 'compagnie', 'berenice-voir'];
// ce qui a disparu : l'espace pro à mot de passe et les anciens libellés des portes
const DISPARUS = ['mot de passe', 'espace pro', 'je programme', 'je fais venir dans mon établissement'];
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
    page.on('request', r => { const u = r.url(); if (!/^(file|data|blob|about):/.test(u) && !/fonts\.(googleapis|gstatic)\.com|omekkqjinvppadsoinvj\.supabase\.co/.test(u)) log.push(`${tag} requête externe : ${u.slice(0, 90)}`); });
    // par défaut, l'instantané du dépôt (?base=0) : le contrôle ne dépend pas de l'état de la base ; BASE=1 pour la base
    await page.goto(new URL(`${n}.html${process.env.BASE === '1' ? '' : '?base=0'}`, dist).href, { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    const intro = await page.evaluate(() => !!document.querySelector('.intro'));
    if (!intro) log.push(`${tag} : pas d'ouverture sur le logo au chargement de l'accueil (INTRO.ouvrir)`);
    else await page.screenshot({ path: `${out}/${n}-${tag === 'tab' ? '' : 'm'}intro.png` });
    // le corpus : tous les textes de D, normalisés
    await page.evaluate(PERMIS => {
      const norm = s => String(s).replace(/<[^>]+>/g, ' ').replace(/&nbsp;|[   ]/g, ' ').replace(/[’‘]/g, "'").replace(/[«»“”"]/g, '"').replace(/\s+/g, ' ').trim().toLowerCase();
      const parts = [];
      // tout D, sauf les images et le dessin (D.photos, D.logo, D.arms, D.carte, au premier niveau seulement :
      // les légendes des photos d'un spectacle, elles, sont du texte)
      const walk = (v, k, n) => {
        if (n === 1 && ['photos', 'logo', 'arms', 'carte'].includes(k)) return;
        if (typeof v === 'string') parts.push(norm(v)); else if (Array.isArray(v)) v.forEach(x => walk(x, null, n + 1)); else if (v && typeof v === 'object') Object.entries(v).forEach(([kk, x]) => walk(x, kk, n + 1));
      };
      walk(D, null, 0);
      D.carte.lieux.forEach(l => parts.push(norm(`${l.c} (${l.dep})`)));
      PERMIS.forEach(p => parts.push(norm(p)));
      window.__corpus = parts.join(' | ');
      window.__norm = norm;
    }, PERMIS);
    const titres = new Map();
    for (const [vue, hash, attendus, interdits] of VUES) {
      await page.evaluate(h => { location.hash = h; }, hash);
      await page.waitForTimeout(900);
      const etat = await page.evaluate(([att, int, DISPARUS, ENTREES]) => {
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
        // le texte lisible de la vue (hors ouverture), pour les attendus et les interdits
        const intro = document.querySelector('.intro');
        const lu = window.__norm(document.body.innerText.replace(intro ? intro.innerText : '', ''));
        const fA = att ? new Function('D', `return (${att})(D)`)(D) : [];
        const fI = int ? new Function('D', `return (${int})(D)`)(D) : [];
        // une entrée est « à portée » si un lien visible y mène dans le premier écran (en-tête, barre fixe…)
        const aPortee = ENTREES.filter(h => [...document.querySelectorAll(`a[href="${h}"]`)].some(a => {
          if (!vis(a)) return false; const r = a.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; }));
        return {
          titre: document.title, hash: location.hash,
          h1: [...document.querySelectorAll('h1')].filter(h => h.offsetParent || h.getClientRects().length).map(h => h.textContent.trim().replace(/\s+/g, ' ')).join(' | '),
          courant: [...document.querySelectorAll('header [aria-current="page"], nav [aria-current="page"]')].filter(vis).map(a => a.textContent.trim()),
          hauteur: document.documentElement.scrollHeight, haut: Math.round(scrollY),
          debord: document.documentElement.scrollWidth - innerWidth, hors: [...new Set(hors)],
          manquants: fA.filter(s => s && !lu.includes(window.__norm(s))),
          presents: [...fI, ...DISPARUS].filter(s => s && lu.includes(window.__norm(s))),
          aPortee,
        };
      }, [attendus && attendus.toString(), interdits && interdits.toString(), DISPARUS, ENTREES]);
      if (etat.debord > 1) log.push(`${tag} ${vue} : débordement horizontal de ${etat.debord}px`);
      if (!etat.h1) log.push(`${tag} ${vue} : aucun h1 visible`);
      if (etat.haut > 2 && vue !== 'accueil') log.push(`${tag} ${vue} : la page ne remonte pas en haut (scrollY ${etat.haut})`);
      if (ONGLETS.includes(vue) && !mobile && etat.courant.length !== 1) log.push(`${tag} ${vue} : ${etat.courant.length} entrée(s) de menu marquée(s) aria-current="page" au lieu d'une`);
      if (titres.has(etat.titre) && titres.get(etat.titre) !== etat.hash && vue !== 'accueil') log.push(`${tag} ${vue} : document.title identique à un autre onglet (« ${etat.titre} »)`);
      titres.set(etat.titre, etat.hash);
      if (etat.hors.length && tag === 'tab') log.push(`${tag} ${vue} : texte absent des sources : ${etat.hors.slice(0, 12).map(s => `« ${s} »`).join(', ')}${etat.hors.length > 12 ? ` (+${etat.hors.length - 12})` : ''}`);
      if (etat.manquants.length) log.push(`${tag} ${vue} : attendu mais absent : ${etat.manquants.map(s => `« ${String(s).slice(0, 60)} »`).join(', ')}`);
      if (etat.presents.length) log.push(`${tag} ${vue} : ne devrait pas apparaître : ${etat.presents.map(s => `« ${String(s).slice(0, 60)} »`).join(', ')}`);
      if (A_PORTEE.includes(vue) && etat.aPortee.length < 3) log.push(`${tag} ${vue} : les trois entrées ne sont pas toutes à portée dans le premier écran (liens visibles : ${JSON.stringify(etat.aPortee)})`);
      if (tag === 'tab') log.push(`· ${vue} : « ${etat.titre} » · h1 « ${etat.h1.slice(0, 60)} » · menu actif ${JSON.stringify(etat.courant)} · hauteur ${etat.hauteur}px`);
      await page.screenshot({ path: `${out}/${n}-${tag}-${vue}.png` });
    }
    for (const [hash, attendu] of REDIRECTIONS) {
      await page.evaluate(h => { location.hash = h; }, hash);
      await page.waitForTimeout(700);
      const h = await page.evaluate(() => location.hash);
      if (!attendu.test(h)) log.push(`${tag} ${hash} : mène à « ${h} » au lieu de ${attendu}`);
    }
    await ctx.close();
  }
  report[n] = log;
}
console.log(JSON.stringify(report, null, 1));
await browser.close();
