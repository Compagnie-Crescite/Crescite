// Vérifie qu'une maquette se lit par les trois entrées, s'ouvre sur le logo, et n'affiche que le texte de ses sources.
// Usage : node maquettes/onglets.mjs <dossier de sortie> m03 [m04 …]
// Règle 15 : des frises chronologiques (FRISE, .frise[data-frise]) là où il y a un calendrier, aucune tentacule après un
// clic ordinaire sur un lien du menu (TENTACULES.actives() === 0, sauf un lien déclaré data-moment) ; REACTIVITE=1 ajoute
// les budgets de maquettes/reactivite.mjs (bureau et téléphone ralenti ×4). Le texte se lit même hors de l'écran
// (content-visibility : auto est forcé à visible, et ce qui apparaît au défilement à son état final, le temps de la lecture).
// Règle 16 : l'espace pro (#/espace-pro, une page et non plus une redirection) : son h1, ses trois portes et leurs vrais
// liens vers equipe/, pro/ et admin/ (dans le même onglet), le lien « Espace pro » dans le menu et le pied de page.
// Captures : <n>-tab-<vue>.png (ordinateur) et <n>-mtab-<vue>.png (téléphone), <n>-intro.png ; rapport des anomalies.
// Le contrôle du texte compare chaque texte visible aux textes de D (le site d'origine, le dossier scolaire de Bérénice,
// les univers et les actions culturelles des spectacles) : tout texte absent de D est signalé.
const PW = process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright/index.mjs';
const { chromium } = await import(PW);
const { mesurer, depassements } = process.env.REACTIVITE === '1' ? await import('./reactivite.mjs') : {};
const [out, ...names] = process.argv.slice(2);
const dist = new URL('./dist/', import.meta.url);
// [vue, adresse, attendus : textes qui doivent être visibles (fonctions de D), interdits : textes qui ne doivent pas l'être]
const VUES = [
  ['accueil', '#/'],
  // voir : les prochaines dates tout public en haut, puis l'agenda passé, saison par saison (la plus récente d'abord),
  // les saisons terminées refermées (leurs lignes ne se lisent pas tant qu'on ne les ouvre pas)
  ['voir', '#/voir', D => [D.dates.find(d => !d.scolaire).details[0].texte, D.site.saisons.find(s => s.saison === '2019-2020').titre],
    D => [...D.dates.filter(d => d.scolaire).map(d => d.details[0].texte),
          ...D.saisons['2023-2024'].spectacles.flatMap(g => g.dates).map(d => (d.details[0] || {}).texte).filter(t => t && t.length > 30).slice(0, 3)]],
  // programmer (règle 13) : le contact diffusion, le dossier PDF, les conditions financières sur demande
  ['programmer', '#/programmer', D => [D.shows.find(s => s.slug === 'mon-royaume').programmer.representations, D.site.programmation.contact.nom,
    D.site.libelles.contactDiffusion, D.site.libelles.dossierPdf, D.site.libelles.conditionsFinancieres]],
  // établissement : rien de l'action culturelle masquée de Cassandres (règle 14)
  ['etablissement', '#/etablissement', D => ['afin de participer à « l’école du spectateur »', D.shows.find(s => s.slug === 'berenice').actionCulturelle.type],
    () => ['Lieux d’enseignement agronomique', 'Notre première intuition à ce stade du travail']],
  ['spectacles', '#/spectacles', D => D.shows.map(s => s.titreLignes[0])],
  ['compagnie', '#/compagnie', D => [D.site.compagnie.directeur.titre, 'Cassandre(s)']],
  ['contact', '#/contact', D => [D.site.contact.titre]],
  ['berenice-voir', '#/spectacle/berenice/voir', D => ['Rome, an 79.']],
  ['berenice-programmer', '#/spectacle/berenice/programmer', D => ['100 à 120 places', D.site.libelles.dossierPdf, D.site.programmation.contact.email]],
  // une fiche technique déposée (document) se lit en lien ; sans fiche (Macbeth), « Fiche technique sur demande »
  ['cleophene-programmer', '#/spectacle/cleophene/programmer', D => [D.site.libelles.dossierPdf,
    ...D.documents.filter(d => d.spectacle === 'cleophene' && d.pour === 'pros').map(d => d.titre)]],
  ['macbeth-programmer', '#/spectacle/macbeth-fatum/programmer', D => [D.site.libelles.ficheTechniqueSurDemande, D.site.libelles.dossierPdf]],
  ['berenice-etablissement', '#/spectacle/berenice/etablissement', D => ['Atelier de préparation', 'À partir de la seconde']],
  ['cleophene-etablissement', '#/spectacle/cleophene/etablissement', D => ['parcours du spectateur']],
  ['macbeth-etablissement', '#/spectacle/macbeth-fatum/etablissement', D => [D.site.libelles.aCompleter]],
  ['cassandres', '#/spectacle/cassandres/voir', D => ['Spectacle en création']],
  ['saison', '#/agenda/2019-2020', D => [D.site.saisons.find(s => s.saison === '2019-2020').titre]],
  ['mentions', '#/mentions-legales'],
  // l'espace pro (règle 16) : son texte et ses trois portes (leurs liens sont contrôlés à part)
  ['espace-pro', '#/espace-pro', D => D.site.espacePro ? [D.site.espacePro.titre, D.site.espacePro.texte, ...D.site.espacePro.portes.flatMap(p => [p.titre, p.texte])] : []],
];
// les anciennes adresses et l'adresse d'un spectacle sans entrée : où elles doivent mener
// (#/espace-pro n'est plus redirigé vers programmer : c'est la page de l'espace pro, règle 16)
const REDIRECTIONS = [['#/agenda', /^#\/voir$/], ['#/actions-culturelles', /^#\/etablissement$/],
  ['#/spectacle/mon-royaume', /^#\/spectacle\/mon-royaume\/(voir|programmer|etablissement)$/],
  // un spectacle sans action culturelle n'a pas d'onglet établissement (règle 14)
  ['#/spectacle/cassandres/etablissement', /^#\/spectacle\/cassandres\/voir$/]];
// les vues où une entrée du menu doit être marquée aria-current="page" (une seule)
const ONGLETS = ['voir', 'programmer', 'etablissement', 'spectacles', 'compagnie', 'contact'];
// les trois entrées, à portée de main en haut de ces vues (sans ouvrir de menu)
const ENTREES = ['#/voir', '#/programmer', '#/etablissement'];
const A_PORTEE = ['spectacles', 'compagnie', 'berenice-voir'];
// ce qui a disparu : le mot de passe de l'ancien espace pro et les anciens libellés des portes (« Espace pro » est revenu,
// règle 16 : une page de trois portes, sans mot de passe)
const DISPARUS = ['mot de passe', 'je programme', 'je fais venir dans mon établissement'];
// les seuls libellés permis hors de D (voir le contrat)
const PERMIS = ['Accueil', 'Menu', 'Rouen', 'Aller au contenu', 'Fermer'];
// règle 15 D : les frises chronologiques attendues (au moins tant) dans ces vues
const FRISES = { voir: 2, saison: 1, 'berenice-voir': 1, etablissement: 1, compagnie: 1, programmer: 1 };
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
    const docs = await page.evaluate(() => (D.documents || []).filter(d => d.pour === 'pros').map(d => [d.spectacle, d.url]));
    const D_DOCS = slug => new Set(docs.filter(([s]) => s === slug).map(([, u]) => u)).size;
    const titres = new Map();
    for (const [vue, hash, attendus, interdits] of VUES) {
      await page.evaluate(h => { location.hash = h; }, hash);
      await page.waitForTimeout(900);
      const etat = await page.evaluate(([att, int, DISPARUS, ENTREES]) => {
        // le contenu hors de l'écran (content-visibility: auto) et ce qui apparaît au défilement (MOUVEMENT.reveler :
        // .mv-attente) se lisent aussi : on les montre dans leur état final le temps de la lecture
        const forcer = document.createElement('style');
        forcer.textContent = '*, *::before, *::after { content-visibility: visible !important; } .mv-attente, .mv-attente > * { opacity: 1 !important; transform: none !important; clip-path: none !important; transition: none !important; animation: none !important; }';
        document.head.appendChild(forcer);
        try {
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
        // voir : la première date à venir se lit avant le titre de la saison la plus ancienne
        let ordre = null;
        if (location.hash === '#/voir') {
          const a = window.__norm(D.dates.find(d => !d.scolaire).details[0].texte), b = window.__norm(D.site.saisons[D.site.saisons.length - 1].titre);
          const ia = lu.indexOf(a), ib = lu.lastIndexOf(b);
          ordre = { ok: ia >= 0 && ib >= 0 && ia < ib, detail: `${ia} / ${ib}` };
        }
        return {
          ordre, titre: document.title, hash: location.hash,
          h1: [...document.querySelectorAll('h1')].filter(h => h.offsetParent || h.getClientRects().length).map(h => h.textContent.trim().replace(/\s+/g, ' ')).join(' | '),
          courant: [...document.querySelectorAll('header [aria-current="page"], nav [aria-current="page"]')].filter(vis).map(a => a.textContent.trim()),
          hauteur: document.documentElement.scrollHeight, haut: Math.round(scrollY),
          debord: document.documentElement.scrollWidth - innerWidth, hors: [...new Set(hors)],
          manquants: fA.filter(s => s && !lu.includes(window.__norm(s))),
          presents: [...fI, ...DISPARUS].filter(s => s && lu.includes(window.__norm(s))),
          aPortee,
          // règle 14 : aucun lien visible vers l'onglet établissement d'un spectacle sans action culturelle
          sansAction: D.shows.filter(s => !s.actionCulturelle).flatMap(s => [...document.querySelectorAll(`a[href$="#/spectacle/${s.slug}/etablissement"]`)].filter(vis).map(() => s.slug)),
          // règle 13 : les boutons du dossier PDF, et les liens mailto: visibles
          dossiers: [...document.querySelectorAll('[data-dossier]')].filter(vis).map(e => e.getAttribute('data-dossier')),
          mailto: [...document.querySelectorAll('a[href^="mailto:"]')].filter(vis).length,
          // les liens visibles vers les documents publics (D.documents) du spectacle de la vue
          liensDocs: (() => { const m = /^#\/spectacle\/([^/]+)\/programmer$/.exec(location.hash); if (!m) return 0;
            const urls = new Set((D.documents || []).filter(d => d.spectacle === m[1] && d.pour === 'pros').map(d => d.url));
            return new Set([...document.querySelectorAll('a[href]')].filter(a => vis(a) && urls.has(a.href)).map(a => a.href)).size; })(),
          // règle 15 D : les frises de l'outil commun (FRISE), rendues dans la vue
          frises: [...document.querySelectorAll('.frise[data-frise]')].filter(f => { for (let e = f; e && e !== document.body; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden') return false; } return f.getClientRects().length > 0; }).length,
          // règle 16 : sur la vue espace-pro, le h1, les liens visibles de chaque porte (et leur cible), le lien du menu et du pied
          pro: location.hash === '#/espace-pro' && D.site.espacePro ? (() => {
            const P = D.site.espacePro, n = window.__norm;
            const h1 = [...document.querySelectorAll('h1')].filter(vis).map(h => n(h.textContent));
            const liens = P.portes.map(p => ({ href: p.href, vus: [...document.querySelectorAll('main a[href]')].filter(a => a.getAttribute('href') === p.href && vis(a)).map(a => a.getAttribute('target') || '') }));
            const menu = [...document.querySelectorAll('header a[href="#/espace-pro"], nav a[href="#/espace-pro"]')].filter(a => !a.closest('main, footer') && n(a.textContent).includes(n(P.titre)));
            return { h1ok: h1.includes(n(P.titre)), liens, menu: menu.length, pied: document.querySelectorAll('footer a[href="#/espace-pro"]').length };
          })() : null,
        };
        } finally { forcer.remove(); }
      }, [attendus && attendus.toString(), interdits && interdits.toString(), DISPARUS, ENTREES]);
      if (etat.debord > 1) log.push(`${tag} ${vue} : débordement horizontal de ${etat.debord}px`);
      if (!etat.h1) log.push(`${tag} ${vue} : aucun h1 visible`);
      if (etat.haut > 2 && vue !== 'accueil') log.push(`${tag} ${vue} : la page ne remonte pas en haut (scrollY ${etat.haut})`);
      if (ONGLETS.includes(vue) && !mobile && etat.courant.length !== 1) log.push(`${tag} ${vue} : ${etat.courant.length} entrée(s) de menu marquée(s) aria-current="page" au lieu d'une`);
      if (titres.has(etat.titre) && titres.get(etat.titre) !== etat.hash && vue !== 'accueil') log.push(`${tag} ${vue} : document.title identique à un autre onglet (« ${etat.titre} »)`);
      titres.set(etat.titre, etat.hash);
      if (etat.hors.length && tag === 'tab') log.push(`${tag} ${vue} : texte absent des sources : ${etat.hors.slice(0, 12).map(s => `« ${s} »`).join(', ')}${etat.hors.length > 12 ? ` (+${etat.hors.length - 12})` : ''}`);
      if (etat.manquants.length) log.push(`${tag} ${vue} : attendu mais absent : ${etat.manquants.map(s => `« ${String(s).slice(0, 60)} »`).join(', ')}`);
      if (vue === 'voir' && etat.ordre && !etat.ordre.ok) log.push(`${tag} voir : les prochaines dates doivent précéder l'agenda passé (${etat.ordre.detail})`);
      if (etat.presents.length) log.push(`${tag} ${vue} : ne devrait pas apparaître : ${etat.presents.map(s => `« ${String(s).slice(0, 60)} »`).join(', ')}`);
      if (etat.sansAction.length) log.push(`${tag} ${vue} : lien visible vers l'onglet établissement de ${[...new Set(etat.sansAction)].join(', ')}, qui n'a pas d'action culturelle (règle 14)`);
      if (vue === 'espace-pro') {
        if (etat.hash !== '#/espace-pro') log.push(`${tag} espace-pro : #/espace-pro mène à « ${etat.hash} » au lieu d'être la page de l'espace pro (règle 16)`);
        else if (!etat.pro) log.push(`${tag} espace-pro : D.site.espacePro absent des données (règle 16)`);
        else {
          if (!etat.pro.h1ok) log.push(`${tag} espace-pro : le h1 n'est pas D.site.espacePro.titre (« ${etat.h1.slice(0, 60)} »)`);
          etat.pro.liens.forEach(l => { if (!l.vus.length) log.push(`${tag} espace-pro : aucun lien visible <a href="${l.href}"> (règle 16)`);
            else if (l.vus.every(t => t && t !== '_self')) log.push(`${tag} espace-pro : le lien vers ${l.href} s'ouvre dans un autre onglet (règle 16 : le même onglet)`); });
          if (!etat.pro.menu) log.push(`${tag} espace-pro : pas de lien « Espace pro » vers #/espace-pro dans le menu (règle 16)`);
          if (!etat.pro.pied) log.push(`${tag} espace-pro : pas de lien vers #/espace-pro dans le pied de page (règle 16)`);
        }
      }
      if (FRISES[vue] && etat.frises < FRISES[vue]) log.push(`${tag} ${vue} : ${etat.frises} frise(s) chronologique(s) (.frise[data-frise]) au lieu d'au moins ${FRISES[vue]} (règle 15 D)`);
      if (vue === 'programmer' && !etat.dossiers.length) log.push(`${tag} programmer : aucun bouton [data-dossier] (dossier PDF, règle 13)`);
      if (vue === 'programmer' && !etat.mailto) log.push(`${tag} programmer : aucun lien mailto: visible vers le contact diffusion (règle 13)`);
      const slugVue = (/^#\/spectacle\/([^/]+)\/programmer$/.exec(hash) || [])[1];
      if (slugVue && !etat.dossiers.includes(slugVue)) log.push(`${tag} ${vue} : pas de bouton [data-dossier="${slugVue}"] (règle 13)`);
      // les documents des pros du spectacle, en liens
      if (slugVue && etat.liensDocs < D_DOCS(slugVue)) log.push(`${tag} ${vue} : ${etat.liensDocs} lien(s) vers les documents du spectacle sur ${D_DOCS(slugVue)} (règle 13)`);
      // le dossier PDF se compose et se télécharge (une fois par maquette)
      if (vue === 'berenice-programmer' && tag === 'tab' && etat.dossiers.includes('berenice')) {
        const dl = page.waitForEvent('download', { timeout: 20000 }).catch(() => null);
        await page.evaluate(() => { const b = [...document.querySelectorAll('[data-dossier="berenice"]')].find(e => e.getClientRects().length); b.scrollIntoView({ block: 'center' }); b.click(); });
        const f = await dl;
        if (!f) log.push(`${tag} ${vue} : le bouton du dossier PDF ne télécharge rien en 20 s`);
        else if (f.suggestedFilename() !== 'dossier-berenice.pdf') log.push(`${tag} ${vue} : téléchargement inattendu « ${f.suggestedFilename()} »`);
        await page.evaluate(() => scrollTo(0, 0));
      }
      if (process.env.EDITION === '1' && tag === 'tab') {
        const att = { compagnie: [['[data-edit^="site.compagnie.paragraphes"]', 2]], 'berenice-voir': [['[data-edit^="shows.berenice.texte"]', 1], ['[data-edit-photo^="shows.berenice"]', 1]],
          'berenice-etablissement': [['[data-edit^="dossiers.berenice"]', 3], ['[data-edit^="shows.berenice.actionCulturelle"]', 1]], etablissement: [['[data-edit^="site.ecole"]', 1]],
          voir: [['[data-agenda]', 1], ['[data-date-id]', 10]], programmer: [['[data-edit*=".programmer."]', 3]],
          'espace-pro': [['[data-edit="site.espacePro.titre"]', 1], ['[data-edit="site.espacePro.texte"]', 1],
            ['[data-edit^="site.espacePro.portes."][data-edit$=".titre"]', 3], ['[data-edit^="site.espacePro.portes."][data-edit$=".texte"]', 3]] }[vue] || [];
        const n = await page.evaluate(sels => sels.map(([s]) => document.querySelectorAll(s).length), att);
        att.forEach(([s, min], i) => { if (n[i] < min) log.push(`${tag} ${vue} : édition : ${n[i]} élément(s) ${s} (au moins ${min})`); });
        const lien = await page.evaluate(() => { const l = D.site.libelles.modifierSite; return [...document.querySelectorAll('a, button')].some(b => b.textContent.trim() === l && b.getClientRects().length); });
        if (!lien) log.push(`${tag} ${vue} : édition : pas de lien « Modifier le site » visible`);
      }
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
    // règle 15 A : un clic ordinaire sur un lien du menu ne fait jouer aucune tentacule (sauf un moment déclaré data-moment)
    if (tag === 'tab') {
      await page.evaluate(() => { location.hash = '#/voir'; });
      await page.waitForTimeout(900);
      const hrefs = await page.evaluate(() => [...new Set([...document.querySelectorAll('header a[href^="#/"], nav a[href^="#/"]')].filter(a => !a.closest('main') && a.getClientRects().length).map(a => a.getAttribute('href')))]);
      for (const href of hrefs.slice(0, 10)) {
        const pret = await page.evaluate(href => {
          document.querySelectorAll('[data-onglets-clic]').forEach(a => a.removeAttribute('data-onglets-clic'));
          const a = [...document.querySelectorAll(`header a[href="${href}"], nav a[href="${href}"]`)].find(x => !x.closest('main') && x.getClientRects().length && getComputedStyle(x).visibility !== 'hidden');
          if (!a) return null;
          a.setAttribute('data-onglets-clic', '');
          return { moment: !!a.closest('[data-moment]') };
        }, href);
        if (!pret) continue;
        await page.click('[data-onglets-clic]', { timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(150);
        const n = await page.evaluate(() => typeof TENTACULES !== 'undefined' && typeof TENTACULES.actives === 'function' ? TENTACULES.actives() : 0);
        if (n > 0 && !pret.moment) log.push(`${tag} : ${n} animation(s) de tentacule après un clic ordinaire sur « ${href} » (règle 15 A ; un moment se déclare par data-moment)`);
        await page.waitForTimeout(450);
      }
    }
    await ctx.close();
  }
  // règle 15 C : les budgets de la réactivité (REACTIVITE=1)
  if (mesurer) for (const profil of ['bureau', 'telephone']) {
    const m = await mesurer(browser, n, { dist, profil });
    depassements(m).forEach(d => log.push(`réactivité : ${d}`));
    log.push(`· réactivité ${profil} : INP max ${Math.max(0, ...m.gestes.filter(g => !g.absent).map(g => g.inp))} ms · CLS ${m.cls} · contenu max ${Math.max(0, ...m.gestes.filter(g => g.navigation && g.contenu != null).map(g => g.contenu))} ms`);
  }
  report[n] = log;
}
console.log(JSON.stringify(report, null, 1));
await browser.close();
