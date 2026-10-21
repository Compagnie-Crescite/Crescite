// Vérifie qu'une maquette se lit par les trois entrées, s'ouvre sur le logo, et n'affiche que le texte de ses sources.
// Usage : node maquettes/onglets.mjs <dossier de sortie> m03 [m04 …]
// Règle 15 : des frises chronologiques (FRISE, .frise[data-frise]) là où il y a un calendrier, aucune tentacule après un
// clic ordinaire sur un lien du menu (TENTACULES.actives() === 0, sauf un lien déclaré data-moment) ; REACTIVITE=1 ajoute
// les budgets de maquettes/reactivite.mjs (bureau et téléphone ralenti ×4). Le texte se lit même hors de l'écran
// (content-visibility : auto est forcé à visible, et ce qui apparaît au défilement à son état final, le temps de la lecture).
// Règle 16 : l'espace pro (#/espace-pro, une page et non plus une redirection) : son h1, ses trois portes et leurs vrais
// liens vers equipe/, pro/ et admin/ (dans le même onglet), le lien « Espace pro » dans le menu et le pied de page.
// Règle 17 (REGLE17=1 seulement) : réserver une date, d'un geste (RESERVER) ; règle 18 (REGLE18=1 seulement) : les vidéos se
// lisent dans le site (LECTEUR). Voir regle17() et regle18() plus bas. Règle 19 (REGLE19=1) : le jour et la nuit (THEME), le
// bouton sur chaque vue, la bascule gardée, chaque vue relue en nuit, le contraste du texte de jour et de nuit ; règle 20
// (REGLE20=1) : la troupe sur la page de la compagnie (TROUPE). Voir regle19() et regle20().
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
// ------------------------------------------------------------------------------------------------ règle 17 (REGLE17=1)
// Réserver une date, d'un geste. Sur une page de spectacle qui a des dates à venir (Ci-gisait Cyrano en a beaucoup) et sur
// #/voir : des boutons de date [data-reserver] (des <button aria-pressed>) qui écrivent leurs heures (celles de D, sinon
// libelles.horaireAPreciser) et leur commune ; aucun bouton pour une date scolaire, passée ou annulée ; un seul choisi ; la
// carte de la date choisie [data-reserver-carte] : un lien libelles.reserver vers une adresse http(s) de la date, en nouvel
// onglet (rel noopener), quand la date en a une dans D, sinon libelles.reservationAupresDuLieu sans bouton ; ses liens ne
// mènent qu'aux adresses de la date dans D ; choisir change la carte sur place (même vue, même position) ; au clavier, la
// flèche passe au bouton suivant et Entrée le choisit (Échap referme la carte d'une ligne de #/voir) ; au téléphone, la
// bande défile, aimantée.
const ETAT17 = `(() => {
  const L = D.site.libelles, auj = D.aujourdhui, http = u => typeof u === 'string' && /^https?:\\/\\//i.test(u);
  const cle = d => (d.id != null && d.id !== '' ? String(d.id) : [d.slug || '', d.iso || '', d.l ?? ''].join('~'));
  const res = new Map(D.dates.filter(d => !d.scolaire && (d.fin || d.iso || '') >= auj && !/annul/i.test(d.etat || '')).map(d => [cle(d), d]));
  const heures = d => [...new Set((d.representations || []).filter(x => !x.annulee && x.public !== 'scolaire' && x.heure).map(x => String(x.heure).slice(0, 5)))]
    .map(h => \`\${+h.slice(0, 2)}h\${h.slice(3, 5) !== '00' ? h.slice(3, 5) : ''}\`);
  const liens = d => [d.lien, ...(d.representations || []).filter(x => !x.annulee && x.public !== 'scolaire').map(x => x.lien)].filter(http);
  const vis = e => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  const bs = [...document.querySelectorAll('main [data-reserver]')].filter(vis), pb = [];
  bs.forEach(b => {
    const k = b.getAttribute('data-reserver'), d = res.get(k), t = b.textContent.replace(/\\s+/g, ' ').trim();
    if (!d) { pb.push(\`un bouton pour une date qui n'est pas réservable (\${k})\`); return; }
    if (b.tagName !== 'BUTTON' || !/^(true|false)$/.test(b.getAttribute('aria-pressed') || '')) pb.push(\`« \${t.slice(0, 40)} » n'est pas un <button aria-pressed>\`);
    const hs = heures(d);
    if (hs.length ? hs.some(h => !t.includes(h)) : !t.includes(L.horaireAPreciser)) pb.push(\`« \${t.slice(0, 50)} » n'écrit pas son horaire (\${hs.join(', ') || L.horaireAPreciser})\`);
    if (d.commune && !t.includes(d.commune)) pb.push(\`« \${t.slice(0, 50)} » ne dit pas sa commune (\${d.commune})\`);
  });
  const cartes = [...document.querySelectorAll('main [data-reserver-carte]')].filter(vis), carte = cartes[0];
  const kc = carte ? carte.getAttribute('data-reserver-carte') : null, dc = kc ? res.get(kc) : null;
  if (carte) {
    const as = [...carte.querySelectorAll('a[href]')].filter(vis), r = as.find(a => a.textContent.includes(L.reserver)), permis = new Set(dc ? liens(dc) : []);
    as.filter(a => /^https?:/i.test(a.getAttribute('href'))).forEach(a => { if (!permis.has(a.getAttribute('href'))) pb.push(\`la carte de \${kc} mène à une adresse absente de D (\${a.getAttribute('href').slice(0, 60)})\`); });
    if (dc && liens(dc).length && (!r || !http(r.getAttribute('href')) || r.getAttribute('target') !== '_blank' || !/noopener/.test(r.getAttribute('rel') || '')))
      pb.push(\`la carte de \${kc} n'a pas de lien « \${L.reserver} » http(s) en nouvel onglet (rel noopener), alors que la date a un lien\`);
    if (dc && !liens(dc).length && (r || !carte.textContent.includes(L.reservationAupresDuLieu))) pb.push(\`la carte de \${kc}, sans lien dans D, doit dire « \${L.reservationAupresDuLieu} », sans bouton\`);
    if (!dc) pb.push(\`une carte pour une date qui n'est pas réservable (\${kc})\`);
  }
  const bande = document.querySelector('main .rs-bande');
  return { n: bs.length, cles: bs.map(b => b.getAttribute('data-reserver')), choisis: bs.filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.getAttribute('data-reserver')),
    cartes: cartes.map(c => c.getAttribute('data-reserver-carte')), pb, y: Math.round(scrollY), avecLien: bs.map(b => b.getAttribute('data-reserver')).filter(k => res.get(k) && liens(res.get(k)).length),
    focus: document.activeElement && document.activeElement.getAttribute('data-reserver'), aimant: bande ? getComputedStyle(bande).scrollSnapType : null,
    defile: bande ? ['auto', 'scroll'].includes(getComputedStyle(bande).overflowX) : null };
})()`;
async function regle17(page, tag, log) {
  const etat = () => page.evaluate(ETAT17), pfx = `${tag} règle 17`;
  // un geste sur le bouton d'une date : la position de la page ne bouge pas (rend le décalage en px) ; on attend d'abord que
  // la page soit posée (après un long saut, les chapitres en content-visibility se mesurent et la page bouge encore un peu)
  const pose = async () => { let y = -1; for (let i = 0; i < 20; i++) { const z = await page.evaluate(() => scrollY); if (z === y) return; y = z; await page.waitForTimeout(150); } };
  const toucher = async k => { const l = page.locator(`main [data-reserver="${k}"]`).first(); await l.scrollIntoViewIfNeeded(); await pose(); await l.scrollIntoViewIfNeeded();
    const y1 = await page.evaluate(() => scrollY); await l.click(); await page.waitForTimeout(450); return Math.abs((await page.evaluate(() => scrollY)) - y1); };
  for (const [vue, hash] of [['ci-gisait-cyrano-voir', '#/spectacle/ci-gisait-cyrano/voir'], ['voir', '#/voir']]) {
    await page.evaluate(h => { location.hash = h; }, hash);
    await page.waitForTimeout(1000);
    const liste = vue === 'voir';
    let e = await etat();
    e.pb.forEach(p => log.push(`${pfx} ${vue} : ${p}`));
    if (e.n < 2) { log.push(`${pfx} ${vue} : ${e.n} bouton(s) de date [data-reserver] au lieu d'au moins 2`); continue; }
    if (!liste && (e.choisis.length !== 1 || e.choisis[0] !== e.cles[0])) log.push(`${pfx} ${vue} : la prochaine date doit être choisie d'office (choisis : ${JSON.stringify(e.choisis)})`);
    if (!liste && (e.cartes.length !== 1 || e.cartes[0] !== e.choisis[0])) log.push(`${pfx} ${vue} : la carte de la date choisie manque (${JSON.stringify(e.cartes)})`);
    if (!liste && tag === 'mtab' && (!e.defile || !/x/.test(e.aimant || ''))) log.push(`${pfx} ${vue} : au téléphone, la bande doit défiler au doigt, aimantée (overflow-x ${e.defile}, scroll-snap-type ${e.aimant})`);
    // un geste sur une date qui a un lien : sa carte, sur place
    const k = e.avecLien.find(x => !e.choisis.includes(x)) || e.cles.find(x => !e.choisis.includes(x));
    await page.evaluate(() => { const m = document.querySelector('main > *'); if (m) m.__r17 = 1; });
    const saut = await toucher(k);
    if (saut > 2) log.push(`${pfx} ${vue} : choisir une date fait défiler la page de ${Math.round(saut)} px`);
    e = await etat();
    e.pb.forEach(p => log.push(`${pfx} ${vue} après un choix : ${p}`));
    if (e.choisis.length !== 1 || e.choisis[0] !== k) log.push(`${pfx} ${vue} : après un geste sur ${k}, choisis ${JSON.stringify(e.choisis)}`);
    if (e.cartes.length !== 1 || e.cartes[0] !== k) log.push(`${pfx} ${vue} : après un geste sur ${k}, la carte est ${JSON.stringify(e.cartes)}`);
    const surPlace = await page.evaluate(() => { const m = document.querySelector('main > *'); return !!(m && m.__r17); });
    if (!surPlace) log.push(`${pfx} ${vue} : choisir une date a refait la vue (la carte doit changer sur place)`);
    if (!e.avecLien.length) log.push(`${pfx} ${vue} : aucune date réservable avec un lien dans D (le lien « Réserver » n'a pas pu être essayé)`);
    // au clavier : la flèche passe au bouton suivant, Entrée le choisit
    await page.locator(`main [data-reserver="${k}"]`).first().focus();
    await page.keyboard.press(liste ? 'ArrowDown' : 'ArrowRight');
    const f = await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-reserver'));
    if (!f || f === k) log.push(`${pfx} ${vue} : la flèche ne passe pas au bouton de date suivant (focus : ${f})`);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(450);
    e = await etat();
    if (!f || e.choisis.length !== 1 || e.choisis[0] !== f || e.cartes.length !== 1 || e.cartes[0] !== f) log.push(`${pfx} ${vue} : au clavier (flèche puis Entrée), la carte ne passe pas à la date suivante (choisis ${JSON.stringify(e.choisis)}, carte ${JSON.stringify(e.cartes)})`);
    e.pb.forEach(p => log.push(`${pfx} ${vue} au clavier : ${p}`));
    if (liste) {   // Échap referme la carte d'une ligne
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      e = await etat();
      if (e.cartes.length || e.choisis.length) log.push(`${pfx} voir : Échap ne referme pas la carte (${JSON.stringify(e.cartes)})`);
    }
    if (tag === 'tab') log.push(`· règle 17 ${vue} : ${e.n} boutons de date, dont ${e.avecLien.length} avec un lien de réservation`);
  }
}

// ------------------------------------------------------------------------------------------------ règle 18 (REGLE18=1)
// Les vidéos se lisent dans le site. Sur la page de chaque spectacle qui a une vidéo dans D : une figure [data-lecteur] dont
// l'affiche est une photo de D (jamais une image de YouTube ou de Vimeo), le titre de la vidéo, les boutons libelles.assombrir
// et (si l'API Fullscreen existe) libelles.pleinEcran ; aucun lecteur (iframe) ni aucune requête vers YouTube ou Vimeo avant
// le geste ; au geste, le lecteur youtube-nocookie.com ou player.vimeo.com avec dnt=1 ; une seule vidéo à la fois (Macbeth et
// ses teasers) ; « assombrir » éteint la page (le voile .lc-nuit), le focus reste dans la vidéo, Échap rallume, un geste hors
// de la vidéo aussi ; « plein écran » met le cadre du lecteur en plein écran ; sur #/programmer, « Bande-annonce » ouvre la
// vidéo dans une boîte (dialog), Échap la ferme et arrête la vidéo. Les lecteurs sont simulés (aucune requête ne sort).
const LECTEURS = /^https:\/\/(www\.youtube-nocookie\.com|player\.vimeo\.com)\//;
async function regle18(page, tag, log) {
  const pfx = `${tag} règle 18`;
  await page.route(LECTEURS, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><meta charset="utf-8"><title>lecteur</title><body style="margin:0;background:#000"></body>' }));
  const shows = await page.evaluate(() => D.shows.filter(s => s.video).map(s => ({ slug: s.slug, titre: s.video.titre, url: s.video.url })));
  for (const s of shows) {
    await page.evaluate(h => { location.hash = h; }, `#/spectacle/${s.slug}/voir`);
    await page.waitForTimeout(900);
    const e = await page.evaluate(s => {
      const L = D.site.libelles, photos = new Set(Object.values(D.photos)), vis = el => !!el && el.getClientRects().length > 0;
      const fs = [...document.querySelectorAll('main figure[data-lecteur]')], f = fs[0];
      if (!f) return { absent: true };
      const imgs = fs.map(x => x.querySelector('img.lc-affiche')).filter(Boolean);
      return { n: fs.length, iframes: document.querySelectorAll('main iframe').length,
        affiches: imgs.filter(i => !photos.has(i.getAttribute('src')) || /ytimg|vimeocdn|youtube|vimeo/i.test(i.getAttribute('src'))).length, sansAffiche: fs.length - imgs.length,
        titre: f.textContent.includes(s.titre), nuit: [...f.querySelectorAll('[data-lecteur-nuit]')].some(b => vis(b) && b.textContent.includes(L.assombrir)),
        plein: !document.fullscreenEnabled || [...f.querySelectorAll('[data-lecteur-plein]')].some(b => vis(b) && b.textContent.includes(L.pleinEcran)),
        lire: !!f.querySelector('button[data-lecteur-lire]') };
    }, s);
    if (e.absent) { log.push(`${pfx} ${s.slug} : la vidéo n'est pas lue dans la page (aucune figure [data-lecteur])`); continue; }
    if (e.iframes) log.push(`${pfx} ${s.slug} : ${e.iframes} lecteur(s) chargé(s) avant tout geste`);
    if (e.affiches || e.sansAffiche) log.push(`${pfx} ${s.slug} : ${e.affiches + e.sansAffiche} vidéo(s) sans une affiche prise dans D.photos`);
    if (!e.titre) log.push(`${pfx} ${s.slug} : le titre de la vidéo (« ${s.titre} ») n'est pas écrit`);
    if (!e.lire) log.push(`${pfx} ${s.slug} : pas de bouton de lecture`);
    if (!e.nuit) log.push(`${pfx} ${s.slug} : pas de bouton « assombrir » visible`);
    if (!e.plein) log.push(`${pfx} ${s.slug} : pas de bouton « plein écran » visible alors que l'API Fullscreen existe`);
  }
  // au geste : le lecteur sans cookie (YouTube) ou dnt=1 (Vimeo), sur place
  page.__geste18 = true;
  for (const s of shows.filter(x => /youtube|vimeo/.test(x.url)).filter((x, i, a) => a.findIndex(y => /youtube/.test(y.url) === /youtube/.test(x.url)) === i)) {
    await page.evaluate(h => { location.hash = h; }, `#/spectacle/${s.slug}/voir`);
    await page.waitForTimeout(900);
    const b = page.locator('main figure[data-lecteur] [data-lecteur-lire]').first();
    await b.scrollIntoViewIfNeeded(); await b.click(); await page.waitForTimeout(500);
    const src = await page.evaluate(() => [...document.querySelectorAll('main iframe')].map(i => i.src));
    const ok = /youtube/.test(s.url) ? /^https:\/\/www\.youtube-nocookie\.com\/embed\//.test(src[0] || '') : /^https:\/\/player\.vimeo\.com\/video\/\d+\?.*dnt=1/.test(src[0] || '');
    if (src.length !== 1 || !ok) log.push(`${pfx} ${s.slug} : au geste, le lecteur attendu (youtube-nocookie ou vimeo dnt=1) n'est pas chargé (${JSON.stringify(src).slice(0, 120)})`);
  }
  // une seule vidéo à la fois (Macbeth : sa bande-annonce et ses teasers)
  const plusieurs = await page.evaluate(() => (D.shows.find(s => (s.medias || []).filter(m => m.type === 'video').length > 1) || {}).slug);
  if (plusieurs) {
    await page.evaluate(h => { location.hash = h; }, `#/spectacle/${plusieurs}/voir`);
    await page.waitForTimeout(900);
    const ls = page.locator('main figure[data-lecteur] [data-lecteur-lire]');
    if (await ls.count() < 2) log.push(`${pfx} ${plusieurs} : ses autres vidéos (médias) ne se lisent pas dans la page`);
    else {
      await ls.nth(0).scrollIntoViewIfNeeded(); await ls.nth(0).click(); await page.waitForTimeout(300);
      await ls.nth(1).scrollIntoViewIfNeeded(); await ls.nth(1).click(); await page.waitForTimeout(300);
      const n = await page.evaluate(() => document.querySelectorAll('main iframe').length);
      if (n !== 1) log.push(`${pfx} ${plusieurs} : ${n} vidéos jouent en même temps`);
    }
  }
  // assombrir : la page s'éteint autour de la vidéo, le focus y reste ; Échap, puis un geste hors de la vidéo, la rallument
  const s0 = shows[0];
  if (s0) {
    await page.evaluate(h => { location.hash = h; }, `#/spectacle/${s0.slug}/voir`);
    await page.waitForTimeout(900);
    const nuit = page.locator('main figure[data-lecteur] [data-lecteur-nuit]').first();
    await nuit.scrollIntoViewIfNeeded(); await nuit.click(); await page.waitForTimeout(600);
    const eteinte = () => page.evaluate(() => { const v = document.querySelector('.lc-nuit'); return !!(v && !v.hidden && v.getClientRects().length && +getComputedStyle(v).opacity > 0.5 && document.documentElement.classList.contains('lc-sombre')); });
    if (!(await eteinte())) log.push(`${pfx} : « assombrir » n'éteint pas la page (.lc-nuit)`);
    let dehors = 0;
    for (let i = 0; i < 6; i++) { await page.keyboard.press('Tab'); await page.waitForTimeout(60); if (!(await page.evaluate(() => { const f = document.querySelector('main figure.lc-eteint'); return !!(f && f.contains(document.activeElement)); }))) dehors++; }
    if (dehors) log.push(`${pfx} : page éteinte, le focus sort de la vidéo (${dehors} fois sur 6 tabulations)`);
    await nuit.focus(); await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    if (await eteinte()) log.push(`${pfx} : Échap ne rallume pas la page`);
    await nuit.click(); await page.waitForTimeout(500);
    // un point hors de la vidéo (et de ses boutons) : au-dessus ou au-dessous d'elle, sinon à côté
    const pt = await page.evaluate(() => { const r = document.querySelector('main figure.lc-eteint').getBoundingClientRect(), m = 24;
      return r.top > m + 4 ? [Math.round(innerWidth / 2), Math.round(r.top - m)] : r.bottom < innerHeight - m - 4 ? [Math.round(innerWidth / 2), Math.round(r.bottom + m)] : [Math.max(2, Math.round(r.left - m)), Math.round(innerHeight / 2)]; });
    await page.mouse.click(pt[0], pt[1]); await page.waitForTimeout(400);
    if (await eteinte()) log.push(`${pfx} : un geste hors de la vidéo ne rallume pas la page`);
    // plein écran : le cadre du lecteur
    const plein = page.locator('main figure[data-lecteur] [data-lecteur-plein]').first();
    if (await plein.count() && await plein.isVisible()) {
      await plein.click(); await page.waitForTimeout(500);
      const pe = await page.evaluate(() => !!(document.fullscreenElement && document.fullscreenElement.classList.contains('lc-cadre')));
      if (!pe) log.push(`${pfx} : « plein écran » ne met pas le cadre du lecteur en plein écran`);
      await page.evaluate(() => document.fullscreenElement && document.exitFullscreen().catch(() => {})); await page.waitForTimeout(300);
    }
  }
  // un catalogue (#/programmer) : « Bande-annonce » ouvre la vidéo dans une boîte, Échap la ferme et l'arrête
  await page.evaluate(() => { location.hash = '#/programmer'; });
  await page.waitForTimeout(900);
  const ouvrir = page.locator('main [data-lecteur-ouvrir]').first();
  if (await ouvrir.count()) {
    await ouvrir.scrollIntoViewIfNeeded(); await ouvrir.click(); await page.waitForTimeout(500);
    const b = await page.evaluate(() => { const d = document.querySelector('dialog.lc-boite'); return { ouverte: !!(d && d.open), lecteur: !!(d && d.querySelector('iframe')) }; });
    if (!b.ouverte || !b.lecteur) log.push(`${pfx} programmer : « Bande-annonce » n'ouvre pas la vidéo dans la page (${JSON.stringify(b)})`);
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    const apres = await page.evaluate(() => { const d = document.querySelector('dialog.lc-boite'); return { ouverte: !!(d && d.open), iframes: document.querySelectorAll('iframe').length }; });
    if (apres.ouverte || apres.iframes) log.push(`${pfx} programmer : Échap ne ferme pas la boîte de la vidéo (${JSON.stringify(apres)})`);
  } else log.push(`${pfx} programmer : pas de bouton « Bande-annonce » qui lise la vidéo dans la page ([data-lecteur-ouvrir])`);
  page.__geste18 = false;
  await page.unroute(LECTEURS);
  if (tag === 'tab') log.push(`· règle 18 : ${shows.length} spectacles avec une vidéo, lues dans la page`);
}

// ------------------------------------------------------------------------------------------------ règle 19 (REGLE19=1)
// Le jour et la nuit (THEME). Sur chaque vue, au premier écran et hors du contenu (en-tête, menu, barre) : un bouton
// [data-theme-bouton] visible, avec son icône, nommé par un libellé de D (libelles.modeNuit, jour ou nuit) et qui dit son
// état (aria-pressed : la nuit est mise). La bascule pose data-theme="nuit" sur <html>, assombrit le fond de la page, se
// garde (localStorage « crescite-theme ») et se retrouve au rechargement, posée avant le premier dessin ; sous « moins
// d'animations », elle est instantanée. Puis chaque vue se relit en nuit (rien de cassé : son h1, aucun débordement, aucune
// erreur) ; de jour comme de nuit, le contraste de chaque texte sur son fond (AA : 4,5:1, 3:1 pour un grand texte), quand
// ce fond est une couleur unie (un texte sur une photo ou un dégradé n'est pas mesuré).
const CONTRASTE = `(() => {
  const couleur = s => {
    let m = /^rgba?\\(([^)]+)\\)$/.exec(s || '');
    if (m) { const p = m[1].split(/[\\s,\\/]+/).filter(Boolean).map(Number); return [p[0] / 255, p[1] / 255, p[2] / 255, p.length > 3 ? p[3] : 1]; }
    m = /^color\\(srgb ([^)]+)\\)$/.exec(s || '');
    if (m) { const p = m[1].split(/[\\s\\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
    return null;
  };
  const sur = (h, b) => [h[0] * h[3] + b[0] * (1 - h[3]), h[1] * h[3] + b[1] * (1 - h[3]), h[2] * h[3] + b[2] * (1 - h[3]), 1];
  const lum = c => { const f = x => x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  // le fond d'un texte : les fonds de ses parents superposés jusqu'au premier opaque ; inconnu sur une image ou un dégradé
  const fond = el => {
    const couches = [];
    for (let e = el; e; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (s.backgroundImage !== 'none' || s.mixBlendMode !== 'normal' || (s.filter && s.filter !== 'none')) return null;
      const c = couleur(s.backgroundColor);
      if (c && c[3] > 0) { couches.push(c); if (c[3] >= 1) break; }
    }
    let b = [1, 1, 1, 1];
    for (let i = couches.length - 1; i >= 0; i--) b = sur(couches[i], b);
    return b;
  };
  const visible = el => { for (let e = el; e && e !== document.documentElement; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 1) return false; } return el.getClientRects().length > 0; };
  const pb = [], vus = new Set();
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let t; (t = tw.nextNode()) && vus.size < 5000;) {
    const el = t.parentElement, txt = t.textContent.replace(/\\s+/g, ' ').trim();
    if (!el || txt.length < 2 || vus.has(el) || el.closest('script,style,noscript,svg,.intro,[aria-hidden="true"],.mv-lecteur,[hidden]') || el.matches(':disabled')) continue;
    vus.add(el);
    if (!visible(el)) continue;
    // un texte pour les lecteurs d'écran seulement (masqué : 1 px, découpé) n'a pas de contraste à tenir
    const rc = el.getBoundingClientRect(), s = getComputedStyle(el);
    if (rc.width <= 2 || rc.height <= 2 || (s.clipPath || '').startsWith('inset(50%')) continue;
    const b = fond(el), c = couleur(s.color);
    if (!b || !c) continue;
    const k = ratio(sur(c, b), b), grand = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.66 && +s.fontWeight >= 700);
    if (k < (grand ? 3 : 4.5) - .005) pb.push(\`« \${txt.slice(0, 36)} » \${k.toFixed(2)}:1\`);
  }
  return [...new Set(pb)];
})()`;
// ce qui apparaît au défilement, montré à son état final le temps de la lecture (comme pour le contrôle du texte)
const MONTRER = '*, *::before, *::after { content-visibility: visible !important; } .mv-attente, .mv-attente > * { opacity: 1 !important; transform: none !important; clip-path: none !important; transition: none !important; animation: none !important; } [data-troupe] *, [data-troupe] *::before, [data-troupe] *::after { animation: none !important; transition: none !important; }';
async function contrastes(page) {
  return page.evaluate(([css, code]) => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); try { return (0, eval)(code); } finally { s.remove(); } }, [MONTRER, CONTRASTE]);
}
async function regle19(page, tag, log) {
  const pfx = `${tag} règle 19`;
  const bouton = () => page.evaluate(() => {
    const L = D.site.libelles, noms = [L.modeNuit, L.jour, L.nuit].filter(Boolean);
    const vis = e => { for (let x = e; x && x !== document.body; x = x.parentElement) { const s = getComputedStyle(x); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; } return e.getClientRects().length > 0; };
    document.querySelectorAll('[data-r19]').forEach(x => x.removeAttribute('data-r19'));
    const b = [...document.querySelectorAll('[data-theme-bouton]')].filter(vis).find(x => !x.closest('main, footer'));
    if (!b) return { absent: true };
    b.setAttribute('data-r19', '');
    const r = b.getBoundingClientRect(), nom = (b.getAttribute('aria-label') || b.textContent || '').trim();
    return { portee: r.bottom > 0 && r.top < innerHeight && r.left >= -1 && r.right <= innerWidth + 1, nom, nomD: noms.includes(nom), presse: b.getAttribute('aria-pressed'),
      theme: document.documentElement.dataset.theme, icone: !!b.querySelector('svg'), fond: getComputedStyle(document.body).backgroundColor };
  });
  const aller = async h => { await page.evaluate(h => { location.hash = h; }, h); await page.waitForTimeout(700); };
  const lumFond = f => { const p = (f.match(/[\d.]+/g) || []).map(Number); const c = x => (x /= 255) <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; return .2126 * c(p[0]) + .7152 * c(p[1]) + .0722 * c(p[2]); };
  const relire = async (theme) => {
    for (const [vue, hash] of VUES) {
      await aller(hash);
      const b = await bouton();
      if (b.absent) { log.push(`${pfx} ${theme} ${vue} : pas de bouton jour/nuit [data-theme-bouton] visible hors du contenu (en-tête, menu)`); continue; }
      if (!b.portee) log.push(`${pfx} ${theme} ${vue} : le bouton jour/nuit n'est pas à portée dans le premier écran`);
      if (!b.nomD) log.push(`${pfx} ${theme} ${vue} : le bouton jour/nuit n'est pas nommé par un libellé de D (« ${b.nom} »)`);
      if (!b.icone) log.push(`${pfx} ${theme} ${vue} : le bouton jour/nuit n'a pas d'icône`);
      if (b.theme !== theme) log.push(`${pfx} ${theme} ${vue} : data-theme vaut « ${b.theme} »`);
      if (b.presse !== String(b.theme === 'nuit')) log.push(`${pfx} ${theme} ${vue} : aria-pressed (${b.presse}) ne dit pas l'état (data-theme ${b.theme})`);
      const e = await page.evaluate(() => ({ debord: document.documentElement.scrollWidth - innerWidth, h1: [...document.querySelectorAll('h1')].some(h => h.getClientRects().length) }));
      if (e.debord > 1) log.push(`${pfx} ${theme} ${vue} : débordement horizontal de ${e.debord}px`);
      if (!e.h1) log.push(`${pfx} ${theme} ${vue} : aucun h1 visible`);
      const pb = await contrastes(page);
      if (pb.length) log.push(`${pfx} ${theme} ${vue} : contraste insuffisant : ${pb.slice(0, 8).join(', ')}${pb.length > 8 ? ` (+${pb.length - 8})` : ''}`);
    }
  };
  // le jour (le réglage de l'appareil : clair dans ce navigateur), puis la bascule
  await relire('jour');
  await aller('#/voir');
  const avant = await bouton();
  if (avant.absent) return;
  await page.click('[data-r19]');
  await page.waitForTimeout(800);
  const apres = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, fond: getComputedStyle(document.body).backgroundColor,
    garde: (() => { try { return localStorage.getItem('crescite-theme'); } catch (e) { return 'indisponible'; } })(), bascule: document.documentElement.classList.contains('theme-bascule'),
    presse: (document.querySelector('[data-r19]') || {}).getAttribute ? document.querySelector('[data-r19]').getAttribute('aria-pressed') : null }));
  if (apres.theme !== 'nuit') log.push(`${pfx} : la bascule ne pose pas data-theme="nuit" (« ${apres.theme} »)`);
  if (apres.fond === avant.fond || lumFond(apres.fond) > .1) log.push(`${pfx} : la nuit ne change pas le fond de la page (${avant.fond} → ${apres.fond})`);
  if (apres.garde !== 'nuit') log.push(`${pfx} : le choix n'est pas gardé (localStorage crescite-theme : ${apres.garde})`);
  if (apres.bascule) log.push(`${pfx} : la transition de la bascule ne se termine pas (html.theme-bascule)`);
  if (apres.presse !== 'true') log.push(`${pfx} : après la bascule, le bouton ne dit pas « enfoncé » (aria-pressed ${apres.presse})`);
  // gardé : au rechargement, la nuit est là avant le premier dessin
  await page.reload({ waitUntil: 'commit' });
  const tot = await page.waitForFunction(() => document.documentElement && document.documentElement.dataset.theme, null, { timeout: 5000 }).then(h => h.jsonValue()).catch(() => null);
  await page.waitForTimeout(1200);
  if (tot !== 'nuit') log.push(`${pfx} : au rechargement, la nuit n'est pas posée d'emblée (data-theme « ${tot} »)`);
  // rien de cassé en nuit
  await relire('nuit');
  // et le retour au jour
  await aller('#/');
  if (!(await bouton()).absent) {
    await page.click('[data-r19]');
    await page.waitForTimeout(800);
    const j = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, garde: localStorage.getItem('crescite-theme') }));
    if (j.theme !== 'jour' || j.garde !== 'jour') log.push(`${pfx} : le retour au jour ne se fait pas (${JSON.stringify(j)})`);
  }
  // « moins d'animations » : la bascule est instantanée
  if (tag === 'tab') {
    const ctx2 = await page.context().browser().newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce', locale: 'fr-FR' });
    const p2 = await ctx2.newPage();
    await p2.goto(page.url().replace(/#.*$/, '#/voir'), { waitUntil: 'load' });
    await p2.waitForTimeout(900);
    // instantanée = sans transition de vue ni cercle (html.theme-bascule), la nuit posée dans les images qui suivent le clic
    // (la bascule peut attendre que le bouton enfoncé soit dessiné : c'est ce qui garde l'INP bas)
    const ok = await p2.evaluate(() => new Promise(res => {
      const html = document.documentElement, b = [...document.querySelectorAll('[data-theme-bouton]')].find(x => x.getClientRects().length);
      if (!b) return res(null);
      let vt = 0, bascule = false;
      const svt = document.startViewTransition;
      if (svt) document.startViewTransition = function (...a) { vt++; return svt.apply(this, a); };
      const mo = new MutationObserver(() => { if (html.classList.contains('theme-bascule')) bascule = true; });
      mo.observe(html, { attributes: true, attributeFilter: ['class'] });
      const t0 = performance.now();
      b.click();
      const fin = () => { mo.disconnect(); if (svt) document.startViewTransition = svt; res({ theme: html.dataset.theme, bascule, transitions: vt, ms: Math.round(performance.now() - t0) }); };
      const regarde = () => (html.dataset.theme === 'nuit' || performance.now() - t0 > 600 ? fin() : requestAnimationFrame(regarde));
      regarde();
    }));
    if (!ok || ok.theme !== 'nuit' || ok.bascule || ok.transitions || ok.ms > 300) log.push(`${pfx} : sous « moins d'animations », la bascule n'est pas instantanée (${JSON.stringify(ok)})`);
    await ctx2.close();
    log.push(`· règle 19 : le bouton sur ${VUES.length} vues, la bascule (${avant.fond} → ${apres.fond}), gardée, relue en nuit`);
  }
}

// ------------------------------------------------------------------------------------------------ règle 20 (REGLE20=1)
// La troupe, sur la page de la compagnie (TROUPE) : sa racine [data-troupe] entre la présentation (site.compagnie.paragraphes)
// et les repères (site.compagnie.datesTitre) ; son titre (data-edit="site.troupe.titre") ; chaque catégorie qui a quelqu'un
// ([data-troupe-categorie], son titre éditable site.troupe.categories.<i>.titre, son icône) ; chaque personne publiée de D,
// dans chaque catégorie de ses métiers ([data-troupe-place][data-troupe-personne]), son nom visible à son arrivée dans
// l'écran, une vignette (img de sa photo) seulement si sa photo est publiée, et ni silhouette ni initiales sinon (rien que
// son nom et ses métiers) ; une personne à plusieurs places : la survoler allume toutes ses places et les relie ; au
// clavier, un arrêt par catégorie, les flèches d'une personne à l'autre, Entrée la choisit, Échap la relâche ; à 360 px,
// rien ne déborde. Une photo publiée introuvable (le fichier manque) est signalée, sans être une anomalie de la maquette.
async function regle20(page, tag, log) {
  const pfx = `${tag} règle 20`;
  await page.evaluate(() => { location.hash = '#/compagnie'; });
  await page.waitForTimeout(1000);
  const e = await page.evaluate(async css => {
    // ce qui apparaît au défilement par MOUVEMENT (le titre, les filets) : à son état final le temps de la lecture ; la
    // troupe garde son propre mouvement (ses places doivent se lire à leur arrivée dans l'écran)
    const montrer = document.createElement('style'); montrer.textContent = css; document.head.appendChild(montrer);
    try {
    const T = D.site.troupe || {}, P = D.personnes || {}, cats = (T.categories || []).filter(c => c && c.cle);
    const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, ' ').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const racine = document.querySelector('main [data-troupe]');
    if (!racine) return { absent: true };
    const avant = [...document.querySelectorAll('main [data-edit^="site.compagnie.paragraphes"]')].pop();
    const apres = [...document.querySelectorAll('main h2, main h3')].find(h => norm(h.textContent) === norm(D.site.compagnie.datesTitre));
    const suit = (a, b) => !!(a && b && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING));
    const pb = [], info = [];
    if (!suit(avant, racine) || !suit(racine, apres)) pb.push('la troupe n\'est pas entre la présentation de la compagnie et ses repères');
    let pourquoi = '';
    const vis = el => { if (!el || !el.getClientRects().length) { pourquoi = 'sans boîte'; return false; } for (let x = el; x && x !== document.body; x = x.parentElement) { const s = getComputedStyle(x); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .9) { pourquoi = `${x.tagName.toLowerCase()}.${[...x.classList].join('.')} : opacité ${s.opacity}`; return false; } } return true; };
    const image = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const voir = async el => { el.scrollIntoView({ block: 'center', behavior: 'instant' }); await image(); return vis(el); };
    // le titre de la section
    const titre = document.querySelector('main [data-edit="site.troupe.titre"]');
    if (!titre || norm(titre.textContent) !== norm(T.titre)) pb.push(`pas de titre « ${T.titre} » éditable (data-edit="site.troupe.titre")`);
    else if (!(await voir(titre))) pb.push('le titre de la troupe ne se voit pas');
    // les catégories attendues : celles des métiers connus des personnes
    const catDe = new Map(); cats.forEach(c => (c.metiers || []).forEach(m => catDe.set(norm(m), c.cle)));
    const attendues = new Set();
    Object.values(P).forEach(p => (p.metiers || []).forEach(m => { const k = catDe.get(norm(m)); if (k) attendues.add(k); }));
    for (const [i, c] of cats.entries()) {
      if (!attendues.has(c.cle)) continue;
      const el = racine.querySelector(`[data-troupe-categorie="${c.cle}"]`);
      if (!el) { pb.push(`la catégorie « ${c.titre} » manque`); continue; }
      const t = el.querySelector(`[data-edit="site.troupe.categories.${i}.titre"]`);
      if (!t || norm(t.textContent) !== norm(c.titre)) pb.push(`le titre de la catégorie « ${c.titre} » n'est pas écrit et éditable (site.troupe.categories.${i}.titre)`);
      else if (!(await voir(t))) pb.push(`le titre de la catégorie « ${c.titre} » ne se voit pas`);
      if (!el.querySelector('svg')) pb.push(`la catégorie « ${c.titre} » n'a pas d'icône`);
    }
    // chaque personne, dans chaque catégorie de ses métiers ; sa vignette seulement si sa photo est publiée (et se charge)
    const charge = src => new Promise(r => { const i = new Image(); i.onload = () => r(true); i.onerror = () => r(false); i.src = src; });
    let places = 0, vignettes = 0;
    for (const [slug, p] of Object.entries(P)) {
      const ps = [...racine.querySelectorAll('[data-troupe-place]')].filter(x => x.getAttribute('data-troupe-personne') === slug);
      const nom = `${p.prenom || ''} ${p.nom || ''}`.trim();
      places += ps.length;
      if (!ps.length) { pb.push(`${nom} n'est pas dans la troupe`); continue; }
      (p.metiers || []).forEach(m => { const k = catDe.get(norm(m)); if (k && !ps.some(x => x.closest(`[data-troupe-categorie="${k}"]`))) pb.push(`${nom} n'est pas dans la catégorie de son métier « ${m} »`); });
      const ok = p.photo ? await charge(p.photo) : false;
      if (p.photo && !ok) info.push(`photo publiée introuvable : ${slug}`);
      for (const x of ps) {
        const imgs = [...x.querySelectorAll('img')];
        if (ok && !imgs.some(i => i.getAttribute('src') === p.photo)) pb.push(`${nom} : sa photo publiée n'a pas de vignette`);
        if (!p.photo && imgs.length) pb.push(`${nom} : une vignette sans photo publiée`);
        vignettes += imgs.length ? 1 : 0;
        // ni silhouette ni initiales : rien que le nom et les métiers
        const mots = []; for (let w = document.createTreeWalker(x, NodeFilter.SHOW_TEXT), t; (t = w.nextNode());) mots.push(t.textContent);
        let reste = ` ${norm(mots.join(' '))} `;
        [nom, ...(p.metiers || [])].forEach(m => { reste = reste.replace(` ${norm(m)} `, ' '); });
        if (reste.trim()) pb.push(`${nom} : sa place écrit autre chose que son nom et ses métiers (« ${reste.trim().slice(0, 30)} »)`);
        if (!(await voir(x)) || !norm(mots.join(' ')).includes(norm(nom))) pb.push(`${nom} : son nom ne se lit pas à son arrivée dans l'écran (${pourquoi || 'nom absent'})`);
      }
    }
    return { pb, info, n: Object.keys(P).length, places, vignettes, cats: [...racine.querySelectorAll('[data-troupe-categorie]')].length,
      multiple: Object.keys(P).find(s => racine.querySelectorAll(`[data-troupe-personne="${s}"]`).length > 1) || null };
    } finally { montrer.remove(); }
  }, '*, *::before, *::after { content-visibility: visible !important; } .mv-attente, .mv-attente > * { opacity: 1 !important; transform: none !important; clip-path: none !important; transition: none !important; animation: none !important; }');
  if (e.absent) { log.push(`${pfx} : pas de troupe ([data-troupe]) sur la page de la compagnie`); return; }
  e.pb.slice(0, 20).forEach(p => log.push(`${pfx} : ${p}`));
  if (e.pb.length > 20) log.push(`${pfx} : (+${e.pb.length - 20} autres)`);
  // les liens : une personne à plusieurs places, survolée (au clavier : focalisée)
  if (e.multiple) {
    const sel = `main [data-troupe-place][data-troupe-personne="${e.multiple}"]`;
    await page.locator(sel).first().scrollIntoViewIfNeeded();
    await page.locator(sel).first().hover();
    await page.waitForTimeout(500);
    const l = await page.evaluate(s => { const ps = [...document.querySelectorAll('main [data-troupe-place]')], miens = ps.filter(x => x.getAttribute('data-troupe-personne') === s);
      return { n: miens.length, allumes: miens.filter(x => x.classList.contains('est-allume')).length, autres: ps.filter(x => x.getAttribute('data-troupe-personne') !== s && x.classList.contains('est-allume')).length,
        liens: document.querySelectorAll('main [data-troupe] .troupe-liens .troupe-lien').length }; }, e.multiple);
    if (l.allumes !== l.n || l.autres) log.push(`${pfx} : survoler ${e.multiple} n'allume pas toutes ses places (${l.allumes}/${l.n}, ${l.autres} autre(s))`);
    if (l.liens < l.n - 1) log.push(`${pfx} : survoler ${e.multiple} ne relie pas ses ${l.n} places (${l.liens} lien(s))`);
    await page.mouse.move(2, 2);
    await page.waitForTimeout(250);
  }
  // au clavier : un arrêt de tabulation par catégorie, les flèches, Entrée et Échap
  const k = await page.evaluate(() => {
    const cats = [...document.querySelectorAll('main [data-troupe] [data-troupe-categorie]')];
    const arrets = cats.map(c => [...c.querySelectorAll('[data-troupe-place]')].filter(p => p.tabIndex === 0).length);
    const c0 = cats.find(c => c.querySelectorAll('[data-troupe-place]').length > 1);
    if (c0) { const p = [...c0.querySelectorAll('[data-troupe-place]')].find(x => x.tabIndex === 0); p.setAttribute('data-r20', ''); }
    return { arrets, c0: !!c0 };
  });
  if (k.arrets.some(n => n !== 1)) log.push(`${pfx} : au clavier, chaque catégorie doit avoir un seul arrêt de tabulation (${JSON.stringify(k.arrets)})`);
  if (k.c0) {
    await page.focus('[data-r20]');
    await page.keyboard.press('ArrowDown');
    const f1 = await page.evaluate(() => { const a = document.activeElement, d = document.querySelector('[data-r20]'); return { autre: !!(a && a !== d && a.matches('[data-troupe-place]')), meme: !!(a && d && a.closest('[data-troupe-categorie]') === d.closest('[data-troupe-categorie]')), slug: a && a.getAttribute('data-troupe-personne') }; });
    if (!f1.autre || !f1.meme) log.push(`${pfx} : au clavier, la flèche ne passe pas à la personne suivante de la catégorie`);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
    const choisi = await page.evaluate(s => [...document.querySelectorAll(`main [data-troupe-personne="${s}"]`)].every(x => x.getAttribute('aria-pressed') === 'true'), f1.slug);
    if (!choisi) log.push(`${pfx} : au clavier, Entrée ne choisit pas la personne (aria-pressed)`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    const relache = await page.evaluate(() => !document.querySelector('main [data-troupe-place][aria-pressed="true"]'));
    if (!relache) log.push(`${pfx} : au clavier, Échap ne relâche pas la personne choisie`);
    await page.keyboard.press('Tab');
    const f2 = await page.evaluate(() => { const a = document.activeElement, d = document.querySelector('[data-r20]'); return !(a && d && a.closest('[data-troupe-categorie]') === d.closest('[data-troupe-categorie]')); });
    if (!f2) log.push(`${pfx} : au clavier, Tab ne passe pas à la catégorie suivante`);
  }
  // à 360 px, rien ne déborde
  if (tag === 'mtab') {
    const vp = page.viewportSize();
    await page.setViewportSize({ width: 360, height: vp.height });
    await page.waitForTimeout(500);
    const d = await page.evaluate(() => { const r = document.querySelector('main [data-troupe]'); return { page: document.documentElement.scrollWidth - innerWidth,
      places: r ? [...r.querySelectorAll('[data-troupe-place]')].filter(p => { const b = p.getBoundingClientRect(); return b.right > innerWidth + 1 || b.left < -1; }).length : 0 }; });
    if (d.page > 1 || d.places) log.push(`${pfx} : à 360 px, la troupe déborde (${d.page}px, ${d.places} place(s) hors de l'écran)`);
    await page.setViewportSize(vp);
    await page.waitForTimeout(300);
  }
  if (tag === 'tab') log.push(`· règle 20 : ${e.n} personnes, ${e.places} places en ${e.cats} catégories, ${e.vignettes} vignettes${e.info.length ? ` ; ${e.info.join(', ')}` : ''}`);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const report = {};
for (const n of names) {
  const log = [];
  for (const [tag, vp, mobile] of [['tab', { width: 1440, height: 900 }, false], ['mtab', { width: 390, height: 844 }, true]]) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, locale: 'fr-FR' });
    const page = await ctx.newPage();
    page.on('pageerror', e => log.push(`${tag} erreur : ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') log.push(`${tag} console : ${m.text()}`); });
    // (règle 18 : le lecteur d'une vidéo, YouTube sans cookie ou Vimeo, n'est permis qu'après le geste qui la lance)
    page.on('request', r => { const u = r.url(); if (!/^(file|data|blob|about):/.test(u) && !/fonts\.(googleapis|gstatic)\.com|omekkqjinvppadsoinvj\.supabase\.co/.test(u) && !(page.__geste18 && LECTEURS.test(u))) log.push(`${tag} requête externe : ${u.slice(0, 90)}`); });
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
    // règles 17 et 18 : seulement si leur variable est posée (le temps que toutes les maquettes les aient)
    if (process.env.REGLE17 === '1') await regle17(page, tag, log);
    if (process.env.REGLE18 === '1') await regle18(page, tag, log);
    // règles 19 et 20, de même (REGLE19=1, REGLE20=1) ; la 19 relit toutes les vues en nuit, puis revient au jour
    if (process.env.REGLE20 === '1') await regle20(page, tag, log);
    if (process.env.REGLE19 === '1') await regle19(page, tag, log);
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
