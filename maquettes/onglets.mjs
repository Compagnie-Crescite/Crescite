// Vérifie qu'une maquette se lit par son menu (les saisons, les spectacles, la compagnie, l'espace pro), s'ouvre sur le logo,
// et n'affiche que le texte de ses sources.
// Usage : node maquettes/onglets.mjs <dossier de sortie> m03 [m04 …]
// Règle 21 (v4, la navigation par les saisons) : sur chaque vue, au bureau comme au téléphone, les quatre éléments du menu
// (D.site.menu) sont à portée dans le premier écran, hors du contenu et sans ouvrir de menu ; un seul aria-current="page" (sur
// l'élément du menu de la vue ; sur la page d'un spectacle, « les spectacles » est marqué aria-current="true", dans une
// sous-page de l'espace pro, « l'espace pro ») ; les trois entrées ne sont plus ni dans l'en-tête ni dans le pied, ni sur
// l'accueil. #/saisons : une date à venir (une date scolaire aussi, marquée), la frise de la saison (.frise[data-frise] : des
// marques d'au moins trois couleurs, --fr-c pour FRISE, et la légende des titres écrite tout près), toutes les dates, puis les
// saisons passées, fermées, chacune annoncée avec sa carte (un SVG de la France). #/saisons/<saison> : la même page, cette
// saison ouverte et amenée à l'écran. La page d'un spectacle qui n'est plus en tournée : une seule page, aucun lien vers ses
// onglets (nulle part vers ses onglets programmer et établissement), son bilan et une belle carte de ses tournées. Les deux
// pages de l'espace pro (#/espace-pro/programmer reprend les contrôles de la règle 13). Les anciennes adresses redirigées.
// Règle 15 : des frises chronologiques (FRISE, .frise[data-frise]) là où il y a un calendrier, aucune tentacule après un
// clic ordinaire sur un lien du menu (TENTACULES.actives() === 0, sauf un lien déclaré data-moment) ; REACTIVITE=1 ajoute
// les budgets de maquettes/reactivite.mjs (bureau et téléphone ralenti ×4). Le texte se lit même hors de l'écran
// (content-visibility : auto est forcé à visible, et ce qui apparaît au défilement à son état final, le temps de la lecture).
// Règle 16 : l'espace pro (#/espace-pro, une page et non plus une redirection) : son h1, ses trois portes et leurs vrais
// liens vers equipe/, pro/ et admin/ (dans le même onglet), le lien « Espace pro » dans le menu et le pied de page.
// Règle 17 (REGLE17=1 seulement) : réserver une date, d'un geste (RESERVER) ; règle 18 (REGLE18=1 seulement) : les vidéos se
// lisent dans le site (LECTEUR). Voir regle17() et regle18() plus bas. Règle 19 (REGLE19=1) : la nuit seule (THEME), sur
// chaque vue, d'emblée, sans bouton jour/nuit, et le contraste du texte de nuit ; règle 20 (REGLE20=1) : la troupe sur la
// page de la compagnie (TROUPE). Voir regle19() et regle20().
// Au téléphone, chaque vue se relit aussi à 360 px (la largeur visée) : rien ne déborde.
// Captures : <n>-tab-<vue>.png (ordinateur) et <n>-mtab-<vue>.png (téléphone), <n>-intro.png ; rapport des anomalies.
// Le contrôle du texte compare chaque texte visible aux textes de D (le site d'origine, le dossier scolaire de Bérénice,
// les univers et les actions culturelles des spectacles) : tout texte absent de D est signalé.
const PW = process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright/index.mjs';
const { chromium } = await import(PW);
const { readFileSync } = await import('node:fs');
const { mesurer, depassements } = process.env.REACTIVITE === '1' ? await import('./reactivite.mjs') : {};
const [out, ...names] = process.argv.slice(2);
const dist = new URL('./dist/', import.meta.url);
// [vue, adresse, attendus : textes qui doivent être visibles (fonctions de D), interdits : textes qui ne doivent pas l'être]
// (les fonctions se lisent dans la page : window.__propres(saison) y donne les précisions de dates qu'on ne lit que dans cette
// saison, window.__passees(slug) celles des dates passées d'un spectacle ; voir plus bas, au chargement de chaque maquette)
const VUES = [
  ['accueil', '#/'],
  // les saisons (règle 21) : le titre du menu, la saison en cours (ses prochaines dates, une date scolaire comprise et marquée ;
  // toutes ses dates), puis les saisons passées, la plus récente d'abord, fermées (leurs lignes ne se lisent pas tant qu'on ne
  // les ouvre pas : celles de 2023-2024 qu'on ne lit que là)
  ['saisons', '#/saisons', D => { const L = D.site.libelles, pub = D.dates.find(d => !d.scolaire && (d.details || [])[0]), sco = D.dates.find(d => d.scolaire && (d.details || [])[0]);
    return [D.site.menu[0].texte, D.site.saisons[0].titre, L.prochainesDates, L.toutesLesDates, L.saisonsPassees, pub && pub.details[0].texte,
      sco && sco.details[0].texte, sco && L.scolaire, D.site.saisons.find(s => s.saison === '2019-2020').titre]; },
    () => window.__propres('2023-2024', 3)],
  // une saison passée (#/saisons/2019-2020) : la page des saisons, cette saison ouverte (ses lignes se lisent) et amenée à l'écran
  ['saison-passee', '#/saisons/2019-2020', D => [D.site.saisons.find(s => s.saison === '2019-2020').titre, ...window.__propres('2019-2020', 2, 24)]],
  ['spectacles', '#/spectacles', D => D.shows.map(s => s.titreLignes[0])],
  ['compagnie', '#/compagnie', D => [D.site.compagnie.directeur.titre, 'Cassandre(s)']],
  ['contact', '#/contact', D => [D.site.contact.titre]],
  // l'espace pro (règles 16 et 21) : son texte, ses deux pages (le « court » des entrées programmer et établissement), puis ses
  // trois portes (les liens sont contrôlés à part)
  ['espace-pro', '#/espace-pro', D => D.site.espacePro ? [D.site.espacePro.titre, D.site.espacePro.texte, ...D.site.espacePro.portes.flatMap(p => [p.titre, p.texte]),
    ...D.site.entrees.filter(e => e.cle !== 'voir').map(e => e.court)] : []],
  // programmer (règles 13 et 21) : le contact diffusion, le dossier PDF, les conditions financières sur demande ; aucune date
  // tout public (elles sont dans les saisons)
  ['pro-programmer', '#/espace-pro/programmer', D => [D.site.entrees.find(e => e.cle === 'programmer').texte, D.shows.find(s => s.slug === 'mon-royaume').programmer.representations,
    D.site.programmation.contact.nom, D.site.libelles.contactDiffusion, D.site.libelles.dossierPdf, D.site.libelles.conditionsFinancieres],
    D => D.dates.filter(d => !d.scolaire).map(d => ((d.details || [])[0] || {}).texte).filter(t => t && t.length > 30).slice(0, 2)],
  // établissement : Macbeth « à compléter », rien de l'action culturelle masquée de Cassandres (règle 14)
  ['pro-etablissement', '#/espace-pro/etablissement', D => [D.site.entrees.find(e => e.cle === 'etablissement').texte, 'afin de participer à « l’école du spectateur »',
    D.shows.find(s => s.slug === 'berenice').actionCulturelle.type,
    // « à compléter » : seulement si un spectacle a une action culturelle sans type (l'instantané du dépôt : Macbeth ; la base
    // n'en a pas pour lui, et la page ne le montre pas)
    D.shows.some(s => s.actionCulturelle && !s.actionCulturelle.type) ? D.site.libelles.aCompleter : null],
    () => ['Lieux d’enseignement agronomique', 'Notre première intuition à ce stade du travail']],
  ['berenice-voir', '#/spectacle/berenice/voir', D => ['Rome, an 79.']],
  ['berenice-programmer', '#/spectacle/berenice/programmer', D => ['100 à 120 places', D.site.libelles.dossierPdf, D.site.programmation.contact.email]],
  // une fiche technique déposée (document) se lit en lien ; sans fiche (Cassandres, en création), « Fiche technique sur demande »
  ['cleophene-programmer', '#/spectacle/cleophene/programmer', D => [D.site.libelles.dossierPdf,
    ...D.documents.filter(d => d.spectacle === 'cleophene' && d.pour === 'pros').map(d => d.titre)]],
  ['cassandres-programmer', '#/spectacle/cassandres/programmer', D => [D.site.libelles.dossierPdf,
    D.documents.some(d => d.spectacle === 'cassandres' && d.type === 'fiche_technique') ? null : D.site.libelles.ficheTechniqueSurDemande]],
  ['berenice-etablissement', '#/spectacle/berenice/etablissement', D => ['Atelier de préparation', 'À partir de la seconde']],
  ['cleophene-etablissement', '#/spectacle/cleophene/etablissement', D => ['parcours du spectateur']],
  ['cassandres', '#/spectacle/cassandres/voir', D => ['Spectacle en création']],
  // un spectacle qui n'est plus en tournée (règle 21) : une seule page, sans onglets ; sa présentation, son bilan (ses dates
  // passées, sa carte), les actions culturelles menées s'il y en a (leur type, leur texte), jamais « à compléter »
  ['la-folle-idee', '#/spectacle/la-folle-idee', D => { const L = D.site.libelles, ac = D.shows.find(s => s.slug === 'la-folle-idee').actionCulturelle || {};
    const brut = h => String(h || '').split(/<[^>]+>/).map(x => x.trim()).sort((a, b) => b.length - a.length)[0];
    return [L.bilan, ac.type || (ac.textes || []).length ? L.actionsMenees : null, ac.type, (ac.textes || [])[0] && brut(ac.textes[0].texte), ...window.__passees('la-folle-idee', 3)]; },
    D => [D.site.libelles.aCompleter]],
  ['macbeth', '#/spectacle/macbeth-fatum', D => [D.site.libelles.bilan, ...window.__passees('macbeth-fatum', 2)],
    D => { const ac = D.shows.find(s => s.slug === 'macbeth-fatum').actionCulturelle || {}, texte = ac.type || ['textes', 'formule', 'dispositifs'].some(k => (ac[k] || []).length);
      return [D.site.libelles.aCompleter, texte ? null : D.site.libelles.actionsMenees]; }],
  ['mentions', '#/mentions-legales'],
];
// les anciennes adresses et les adresses d'un spectacle sans onglet : où elles doivent mener
// (#/espace-pro n'est plus redirigé vers programmer : c'est la page de l'espace pro, règle 16)
const REDIRECTIONS = [['#/voir', /^#\/saisons$/], ['#/agenda', /^#\/saisons$/], ['#/programmer', /^#\/espace-pro\/programmer$/],
  ['#/etablissement', /^#\/espace-pro\/etablissement$/], ['#/actions-culturelles', /^#\/espace-pro\/etablissement$/],
  ['#/agenda/2019-2020', /^#\/saisons\/2019-2020$/],
  ['#/spectacle/mon-royaume', /^#\/spectacle\/mon-royaume\/(voir|programmer|etablissement)$/],
  // un spectacle sans action culturelle n'a pas d'onglet établissement (règle 14)
  ['#/spectacle/cassandres/etablissement', /^#\/spectacle\/cassandres\/voir$/],
  // un spectacle qui n'est plus en tournée n'a qu'une page (règle 21) : ses anciens onglets y mènent, et la mémoire de l'onglet
  // ne s'y applique pas
  ['#/spectacle/la-folle-idee/programmer', /^#\/spectacle\/la-folle-idee$/], ['#/spectacle/la-folle-idee/voir', /^#\/spectacle\/la-folle-idee$/],
  ['#/spectacle/macbeth-fatum/etablissement', /^#\/spectacle\/macbeth-fatum$/], ['#/spectacle/la-folle-idee', /^#\/spectacle\/la-folle-idee$/]];
// règle 21 : l'élément du menu (sa clé dans D.site.menu) marqué dans chaque vue : aria-current="page" sur les vues du menu, « true »
// dans les vues qui en dépendent (la page d'un spectacle : « spectacles », ajouté plus bas ; une sous-page de l'espace pro) ;
// les autres vues (accueil, contact, mentions) ne marquent aucun élément du menu
const COURANT = { saisons: ['saisons', 'page'], 'saison-passee': ['saisons', 'page'], spectacles: ['spectacles', 'page'], compagnie: ['compagnie', 'page'],
  'espace-pro': ['espacePro', 'page'], 'pro-programmer': ['espacePro', 'true'], 'pro-etablissement': ['espacePro', 'true'] };
// ce qui a disparu : le mot de passe de l'ancien espace pro et les anciens libellés des portes (« Espace pro » est revenu,
// règle 16 : une page de trois portes, sans mot de passe)
const DISPARUS = ['mot de passe', 'je programme', 'je fais venir dans mon établissement'];
// les seuls libellés permis hors de D (voir le contrat)
const PERMIS = ['Accueil', 'Menu', 'Rouen', 'Aller au contenu', 'Fermer'];
// règle 15 D : les frises chronologiques attendues (au moins tant) dans ces vues (les saisons : celle de la saison en cours et
// celle des saisons passées ; la page d'un spectacle qui n'est plus en tournée : la frise de sa tournée, dans son bilan)
const FRISES = { saisons: 2, 'saison-passee': 2, 'berenice-voir': 1, 'pro-etablissement': 1, compagnie: 1, 'pro-programmer': 1, 'la-folle-idee': 1, macbeth: 1 };
// ------------------------------------------------------------------------------------------------ règle 17 (REGLE17=1)
// Réserver une date, d'un geste. Sur une page de spectacle qui a des dates à venir (Ci-gisait Cyrano en a beaucoup) et sur
// #/saisons (ses prochaines dates, règle 21) : des boutons de date [data-reserver] (des <button aria-pressed>) qui écrivent leurs heures (celles de D, sinon
// libelles.horaireAPreciser) et leur commune ; aucun bouton pour une date scolaire, passée ou annulée ; un seul choisi ; la
// carte de la date choisie [data-reserver-carte] : un lien libelles.reserver vers une adresse http(s) de la date, en nouvel
// onglet (rel noopener), quand la date en a une dans D, sinon libelles.reservationAupresDuLieu sans bouton ; ses liens ne
// mènent qu'aux adresses de la date dans D ; choisir change la carte sur place (même vue, même position) ; au clavier, la
// flèche passe au bouton suivant et Entrée le choisit (Échap referme la carte d'une ligne de #/saisons) ; au téléphone, la
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
  for (const [vue, hash] of [['ci-gisait-cyrano-voir', '#/spectacle/ci-gisait-cyrano/voir'], ['saisons', '#/saisons']]) {
    await page.evaluate(h => { location.hash = h; }, hash);
    await page.waitForTimeout(1000);
    const liste = vue === 'saisons';
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
      if (e.cartes.length || e.choisis.length) log.push(`${pfx} ${vue} : Échap ne referme pas la carte (${JSON.stringify(e.cartes)})`);
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
// de la vidéo aussi ; « plein écran » met le cadre du lecteur en plein écran ; sur #/espace-pro/programmer, « Bande-annonce »
// ouvre la vidéo dans une boîte (dialog), Échap la ferme et arrête la vidéo. Les lecteurs sont simulés (aucune requête ne sort).
// La page d'un spectacle : son onglet voir s'il est en tournée (ou en création), sa seule page sinon (règle 21).
const LECTEURS = /^https:\/\/(www\.youtube-nocookie\.com|player\.vimeo\.com)\//;
async function regle18(page, tag, log) {
  const pfx = `${tag} règle 18`;
  await page.route(LECTEURS, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><meta charset="utf-8"><title>lecteur</title><body style="margin:0;background:#000"></body>' }));
  const shows = await page.evaluate(() => D.shows.filter(s => s.video).map(s => ({ slug: s.slug, titre: s.video.titre, url: s.video.url,
    ici: s.enTournee || s.statut ? `#/spectacle/${s.slug}/voir` : `#/spectacle/${s.slug}` })));
  for (const s of shows) {
    await page.evaluate(h => { location.hash = h; }, s.ici);
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
    await page.evaluate(h => { location.hash = h; }, s.ici);
    await page.waitForTimeout(900);
    const b = page.locator('main figure[data-lecteur] [data-lecteur-lire]').first();
    if (!(await b.count())) { log.push(`${pfx} ${s.slug} : aucune vidéo lisible dans la page`); continue; }
    await b.scrollIntoViewIfNeeded(); await b.click(); await page.waitForTimeout(500);
    const src = await page.evaluate(() => [...document.querySelectorAll('main iframe')].map(i => i.src));
    const ok = /youtube/.test(s.url) ? /^https:\/\/www\.youtube-nocookie\.com\/embed\//.test(src[0] || '') : /^https:\/\/player\.vimeo\.com\/video\/\d+\?.*dnt=1/.test(src[0] || '');
    if (src.length !== 1 || !ok) log.push(`${pfx} ${s.slug} : au geste, le lecteur attendu (youtube-nocookie ou vimeo dnt=1) n'est pas chargé (${JSON.stringify(src).slice(0, 120)})`);
  }
  // une seule vidéo à la fois (Macbeth : sa bande-annonce et ses teasers)
  const plusieurs = await page.evaluate(() => { const s = D.shows.find(x => (x.medias || []).filter(m => m.type === 'video').length > 1);
    return s ? { slug: s.slug, ici: s.enTournee || s.statut ? `#/spectacle/${s.slug}/voir` : `#/spectacle/${s.slug}` } : null; });
  if (plusieurs) {
    await page.evaluate(h => { location.hash = h; }, plusieurs.ici);
    await page.waitForTimeout(900);
    const ls = page.locator('main figure[data-lecteur] [data-lecteur-lire]');
    if (await ls.count() < 2) log.push(`${pfx} ${plusieurs.slug} : ses autres vidéos (médias) ne se lisent pas dans la page`);
    else {
      await ls.nth(0).scrollIntoViewIfNeeded(); await ls.nth(0).click(); await page.waitForTimeout(300);
      await ls.nth(1).scrollIntoViewIfNeeded(); await ls.nth(1).click(); await page.waitForTimeout(300);
      const n = await page.evaluate(() => document.querySelectorAll('main iframe').length);
      if (n !== 1) log.push(`${pfx} ${plusieurs.slug} : ${n} vidéos jouent en même temps`);
    }
  }
  // assombrir : la page s'éteint autour de la vidéo, le focus y reste ; Échap, puis un geste hors de la vidéo, la rallument
  const s0 = shows[0];
  if (s0) {
    await page.evaluate(h => { location.hash = h; }, s0.ici);
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
  // un catalogue (#/espace-pro/programmer) : « Bande-annonce » ouvre la vidéo dans une boîte, Échap la ferme et l'arrête
  await page.evaluate(() => { location.hash = '#/espace-pro/programmer'; });
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
// La nuit, seule (THEME) : la compagnie a retiré le jour du site public (octobre 2026) ; le jour et la nuit restent à
// l'administration et aux espaces personnels. Sur chaque vue : data-theme="nuit" sur <html>, posé avant le premier dessin,
// quel que soit le réglage de l'appareil (clair dans ce navigateur) ou un choix « jour » gardé d'une visite d'avant
// (localStorage « crescite-theme ») ; un fond de page sombre ; aucun bouton jour/nuit ([data-theme-bouton]) ; rien de
// cassé (son h1, aucun débordement) ; le contraste de chaque texte sur son fond (AA : 4,5:1, 3:1 pour un grand texte),
// quand ce fond est une couleur unie (un texte sur une photo ou un dégradé n'est pas mesuré), l'opacité de ses parents
// comprise.
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
  // l'opacité qu'il reste au texte : le produit de celles de ses parents (0 : caché, rien à mesurer)
  const opacite = el => { let o = 1; for (let e = el; e && e !== document.documentElement; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden') return 0; o *= +s.opacity; } return el.getClientRects().length > 0 ? o : 0; };
  const pb = [], vus = new Set();
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let t; (t = tw.nextNode()) && vus.size < 5000;) {
    const el = t.parentElement, txt = t.textContent.replace(/\\s+/g, ' ').trim();
    if (!el || txt.length < 2 || vus.has(el) || el.closest('script,style,noscript,svg,.intro,[aria-hidden="true"],.mv-lecteur,[hidden]') || el.matches(':disabled')) continue;
    vus.add(el);
    const op = opacite(el);
    if (op < .05) continue;
    // un texte pour les lecteurs d'écran seulement (masqué : 1 px, découpé) n'a pas de contraste à tenir
    const rc = el.getBoundingClientRect(), s = getComputedStyle(el);
    if (rc.width <= 2 || rc.height <= 2 || (s.clipPath || '').startsWith('inset(50%')) continue;
    const b = fond(el), c = couleur(s.color);
    if (c) c[3] *= op;
    if (!b || !c) continue;
    const k = ratio(sur(c, b), b), grand = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.66 && +s.fontWeight >= 700);
    if (k < (grand ? 3 : 4.5) - .005) pb.push(\`« \${txt.slice(0, 36)} » \${k.toFixed(2)}:1\`);
  }
  return [...new Set(pb)];
})()`;
// ce qui apparaît au défilement, montré à son état final le temps de la lecture (comme pour le contrôle du texte)
const MONTRER = '*, *::before, *::after { content-visibility: visible !important; transition: none !important; } .mv-attente, .mv-attente > * { opacity: 1 !important; transform: none !important; clip-path: none !important; transition: none !important; animation: none !important; } [data-troupe] *, [data-troupe] *::before, [data-troupe] *::after { animation: none !important; transition: none !important; }';
async function contrastes(page) {
  return page.evaluate(([css, code]) => {
    // les animations à leur fin (un libellé qui paraît en fondu se lit fini) ; celles du défilement, retirées (l'état de base)
    for (const a of document.getAnimations()) {
      try { if (a.timeline && typeof DocumentTimeline !== 'undefined' && !(a.timeline instanceof DocumentTimeline)) a.cancel(); else a.finish(); } catch (e) { /* une animation sans fin : laissée */ }
    }
    const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); try { return (0, eval)(code); } finally { s.remove(); }
  }, [MONTRER, CONTRASTE]);
}
async function regle19(page, tag, log) {
  const pfx = `${tag} règle 19`;
  const aller = async h => { await page.evaluate(h => { location.hash = h; }, h); await page.waitForTimeout(700); };
  const lumFond = f => { const p = (f.match(/[\d.]+/g) || []).map(Number); const c = x => (x /= 255) <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; return .2126 * c(p[0]) + .7152 * c(p[1]) + .0722 * c(p[2]); };
  // un choix « jour » gardé d'une visite d'avant, un appareil réglé clair : la nuit quand même, dès le premier dessin
  await page.evaluate(() => { try { localStorage.setItem('crescite-theme', 'jour'); } catch (e) { /* sans stockage */ } });
  await page.reload({ waitUntil: 'commit' });
  const tot = await page.waitForFunction(() => document.documentElement && document.documentElement.dataset.theme, null, { timeout: 5000 }).then(h => h.jsonValue()).catch(() => null);
  await page.waitForTimeout(1200);
  if (tot !== 'nuit') log.push(`${pfx} : la nuit n'est pas posée d'emblée (data-theme « ${tot} », appareil clair et choix « jour » gardé)`);
  for (const [vue, hash] of VUES) {
    await aller(hash);
    const e = await page.evaluate(L => {
      // le fond de la page : celui du corps, ou celui de <html> si le corps est transparent
      const fond = [document.body, document.documentElement].map(x => getComputedStyle(x).backgroundColor).find(c => !/^(transparent|rgba\(0, 0, 0, 0\))$/.test(c)) || 'rgb(255, 255, 255)';
      return { theme: document.documentElement.dataset.theme, fond,
        boutons: [...document.querySelectorAll('[data-theme-bouton]')].filter(b => b.getClientRects().length).length,
        debord: document.documentElement.scrollWidth - L, h1: [...document.querySelectorAll('h1')].some(h => h.getClientRects().length) };
    }, page.viewportSize().width);
    if (e.theme !== 'nuit') log.push(`${pfx} ${vue} : data-theme vaut « ${e.theme} »`);
    if (lumFond(e.fond) > .1) log.push(`${pfx} ${vue} : le fond de la page n'est pas sombre (${e.fond})`);
    if (e.boutons) log.push(`${pfx} ${vue} : un bouton jour/nuit reste à l'écran ([data-theme-bouton])`);
    if (e.debord > 1) log.push(`${pfx} ${vue} : débordement horizontal de ${e.debord}px`);
    if (!e.h1) log.push(`${pfx} ${vue} : aucun h1 visible`);
    const pb = await contrastes(page);
    if (pb.length) log.push(`${pfx} ${vue} : contraste insuffisant : ${pb.slice(0, 8).join(', ')}${pb.length > 8 ? ` (+${pb.length - 8})` : ''}`);
  }
  await page.evaluate(() => { try { localStorage.removeItem('crescite-theme'); } catch (e) { /* sans stockage */ } });
  if (tag === 'tab') log.push(`· règle 19 : la nuit sur ${VUES.length} vues, d'emblée, sans bouton jour/nuit`);
}

// ------------------------------------------------------------------------------------------------ règle 23 (REGLE23=1)
// Les semaines de résidence et l'ordre des filtres (demande de la compagnie, octobre 2026). Sur #/saisons et sur
// #/saisons/<saison> d'une saison qui en a (la saison en cours et deux saisons passées au plus) : chaque résidence de
// D.saisons (residence: true) est à l'écran ([data-date-id]), sa ligne dit « Résidence » (D.site.libelles.residence), aucun
// bouton de réservation ne lui revient ; la frise de la saison en cours la marque (.frise-point.est-residence). Sur #/saisons,
// dans chaque groupe de boutons de spectacles (aria-pressed : les filtres, une légende qui filtre), les spectacles en tournée
// (D.shows, enTournee) d'abord. Les résidences ne viennent que de la base : l'instantané du dépôt n'en a pas (INSTANTANE).
// La synthèse (demande de la compagnie, octobre 2026) : les résidences ne sont plus dans les saisons (aucune sur #/saisons ni
// sur #/saisons/<saison>, aucun repère .est-residence sur leurs frises) mais dans l'historique de chaque spectacle : sur sa
// page, chacune a sa ligne (dans un historique replié, ou le bilan), qui dit « Résidence », sans réservation, et la frise de sa
// tournée la marque.
async function regle23(page, tag, log, n = '') {
  const pfx = `${tag} règle 23`;
  const aller = async h => {
    await page.evaluate(h => { location.hash = h; }, h); await page.waitForTimeout(1300);
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise(r => setTimeout(r, 25)); } scrollTo(0, 0); });
    await page.waitForTimeout(400);
  };
  const info = await page.evaluate(() => {
    const parSaison = {};
    for (const [k, S] of Object.entries(D.saisons || {})) { const r = S.spectacles.flatMap(g => g.dates.filter(d => d.residence).map(d => d.id)); if (r.length) parSaison[k] = r; }
    return { saison: D.saison, parSaison, lib: ((D.site || {}).libelles || {}).residence || '', enTournee: (D.shows || []).filter(s => s.enTournee).map(s => s.titre),
      titres: [...new Set([...(D.shows || []).map(s => s.titre), ...Object.values(D.saisons || {}).flatMap(S => S.spectacles.map(g => g.titre))])].filter(Boolean) };
  });
  // les filtres
  await aller('#/saisons');
  const groupes = await page.evaluate(({ titres }) => {
    const norm = s => String(s || '').normalize('NFC').replace(/[’']/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();
    const T = titres.map(t => [norm(t), t]).sort((a, b) => b[0].length - a[0].length);
    const par = new Map();
    for (const b of document.querySelectorAll('main [aria-pressed]')) {
      if (!b.getClientRects().length) continue;
      const x = norm(b.textContent), t = (T.find(([k]) => x.includes(k)) || [])[1];
      if (!t) continue;
      const g = b.parentElement.closest('[role="group"], ul, ol, div, nav, p') || b.parentElement;
      if (!par.has(g)) par.set(g, []);
      if (!par.get(g).includes(t)) par.get(g).push(t);
    }
    return [...par.values()].filter(l => l.length >= 2);
  }, { titres: info.titres });
  const tournee = new Set(info.enTournee);
  for (const l of groupes) {
    const dernier = Math.max(-1, ...l.map((t, i) => (tournee.has(t) ? i : -1))), premier = l.findIndex(t => !tournee.has(t));
    if (premier !== -1 && dernier > premier) log.push(`${pfx} : les filtres ne mettent pas d'abord les spectacles en tournée (${l.join(', ')})`);
  }
  if (!groupes.length) log.push(`${pfx} : aucun groupe de filtres par spectacle reconnu sur #/saisons (des boutons aria-pressed au titre des spectacles)`);
  // les résidences
  const saisons = Object.keys(info.parSaison).sort().reverse();
  const choisies = [...(saisons.includes(info.saison) ? [info.saison] : []), ...saisons.filter(k => k !== info.saison).slice(0, 2)];
  let vues = 0;
  if (n === 'synthese') {
    // aucune dans les saisons
    for (const k of choisies) {
      await aller(k === info.saison ? '#/saisons' : `#/saisons/${k}`);
      const r = await page.evaluate(({ ids }) => [...ids.filter(id => document.querySelector(`main [data-date-id="${id}"]`)).map(id => `la résidence ${id} est dans la saison`),
        ...(document.querySelector('main .frise .frise-point.est-residence') ? ['une frise de la saison marque une résidence'] : [])], { ids: info.parSaison[k] });
      r.slice(0, 6).forEach(x => log.push(`${pfx} ${k} : ${x}`));
    }
    // chacune dans l'historique de son spectacle (deux spectacles au plus)
    const parSp = await page.evaluate(() => { const m = {}; for (const S of Object.values(D.saisons || {})) for (const g of S.spectacles) for (const d of g.dates) if (d.residence && g.slug) (m[g.slug] = m[g.slug] || []).push(d.id); return m; });
    const sps = Object.keys(parSp).slice(0, 2);
    for (const sl of sps) {
      await aller(`#/spectacle/${sl}`);
      const r = await page.evaluate(({ ids, lib }) => {
        const pb = [];
        for (const id of ids) {
          const el = document.querySelector(`main [data-date-id="${id}"]`);
          if (!el) { pb.push(`la résidence ${id} n'est pas dans l'historique du spectacle`); continue; }
          if (lib && !(el.textContent || '').includes(lib)) pb.push(`la ligne de la résidence ${id} ne dit pas « ${lib} »`);
          if (el.querySelector('[data-reserver]')) pb.push(`la résidence ${id} a un bouton de réservation`);
        }
        if (!document.querySelector('main .frise .frise-point.est-residence')) pb.push(`la frise de la tournée ne marque pas ses résidences (.est-residence)`);
        return pb;
      }, { ids: parSp[sl], lib: info.lib });
      vues += parSp[sl].length;
      r.slice(0, 6).forEach(x => log.push(`${pfx} ${sl} : ${x}`));
      if (r.length > 6) log.push(`${pfx} ${sl} : … et ${r.length - 6} autre(s)`);
    }
    if (tag === 'tab') log.push(`· règle 23 : ${saisons.length ? `aucune résidence dans ${choisies.length} saison(s) ; ${vues} résidences relues dans l'historique de ${sps.length} spectacle(s)` : 'aucune résidence dans les données de la page (INSTANTANE pour les apporter)'} ; filtres : ${groupes.length} groupe(s), ${info.enTournee.length} spectacles en tournée`);
    return;
  }
  for (const k of choisies) {
    await aller(k === info.saison ? '#/saisons' : `#/saisons/${k}`);
    const r = await page.evaluate(({ ids, lib, enCours }) => {
      const pb = [];
      for (const id of ids) {
        const el = [...document.querySelectorAll(`main [data-date-id="${id}"]`)].find(x => x.getClientRects().length && (x.textContent || '').trim().length > 8)
          || document.querySelector(`main [data-date-id="${id}"]`);
        if (!el) { pb.push(`la résidence ${id} n'est pas à l'écran`); continue; }
        if (lib && !(el.textContent || '').includes(lib)) pb.push(`la ligne de la résidence ${id} ne dit pas « ${lib} »`);
        if (el.querySelector('[data-reserver]') || document.querySelector(`main [data-reserver][data-date-id="${id}"]`)) pb.push(`la résidence ${id} a un bouton de réservation`);
      }
      if (enCours && !document.querySelector('.frise .frise-point.est-residence')) pb.push(`la frise de la saison ne marque pas ses résidences (residence: true, .est-residence)`);
      return pb;
    }, { ids: info.parSaison[k], lib: info.lib, enCours: k === info.saison });
    vues += info.parSaison[k].length;
    r.slice(0, 6).forEach(x => log.push(`${pfx} ${k} : ${x}`));
    if (r.length > 6) log.push(`${pfx} ${k} : … et ${r.length - 6} autre(s)`);
  }
  if (tag === 'tab') log.push(`· règle 23 : ${saisons.length ? `${vues} résidences relues sur ${choisies.length} saison(s)` : 'aucune résidence dans les données de la page (INSTANTANE pour les apporter)'} ; filtres : ${groupes.length} groupe(s), ${info.enTournee.length} spectacles en tournée`);
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
  }, '*, *::before, *::after { content-visibility: visible !important; transition: none !important; } .mv-attente, .mv-attente > * { opacity: 1 !important; transform: none !important; clip-path: none !important; transition: none !important; animation: none !important; }');
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
    const d = await page.evaluate(L => { const r = document.querySelector('main [data-troupe]'); return { page: document.documentElement.scrollWidth - L,
      places: r ? [...r.querySelectorAll('[data-troupe-place]')].filter(p => { const b = p.getBoundingClientRect(); return b.right > L + 1 || b.left < -1; }).length : 0 }; }, 360);
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
    // par défaut, l'instantané du dépôt (?base=0) : le contrôle ne dépend pas de l'état de la base ; BASE=1 pour la base.
    // INSTANTANE=<dossier> : la page lit la base, servie par un instantané (un <table>.json par table : ce que le public y
    // lit) ; le contrôle porte alors sur les vraies données (leurs numéros de date, les résidences…), sans réseau. Une table
    // absente de l'instantané répond une liste vide.
    const INST = process.env.INSTANTANE;
    if (INST) {
      await ctx.route('https://omekkqjinvppadsoinvj.supabase.co/rest/v1/**', route => {
        const u = new URL(route.request().url()), m = u.pathname.match(/\/rest\/v1\/(crescite_[a-z_]+)/);
        let rows = [];
        try { rows = m ? JSON.parse(readFileSync(`${INST}/${m[1]}.json`, 'utf8')) : []; } catch (e) { rows = []; }
        const off = Number(u.searchParams.get('offset') || 0), lim = Number(u.searchParams.get('limit') || 1000);
        return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(rows.slice(off, off + lim)) });
      });
      // le temps réel de la base : fermé sur place (rien ne part vers la vraie base)
      await ctx.routeWebSocket(/omekkqjinvppadsoinvj\.supabase\.co/, ws => ws.close());
    }
    await page.goto(new URL(`${n}.html${process.env.BASE === '1' || INST ? '' : '?base=0'}`, dist).href, { waitUntil: 'load' });
    if (INST) await page.waitForFunction(() => { try { return Object.values(D.saisons || {}).some(S => S.spectacles.some(g => g.dates.some(d => d.id != null))); } catch (e) { return false; } }, null, { timeout: 30000 })
      .catch(() => log.push(`${tag} : l'instantané de la base n'a pas remplacé les données de la page`));
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
      Object.values(D.personnes || {}).forEach(p => p && p.prenom && p.nom && parts.push(norm(`${p.prenom} ${p.nom}`)));
      D.carte.lieux.forEach(l => parts.push(norm(`${l.c} (${l.dep})`)));
      PERMIS.forEach(p => parts.push(norm(p)));
      window.__corpus = parts.join(' | ');
      window.__norm = norm;
      window.__sansResidences = document.title !== '' && /synthese\.html/.test(location.pathname);
      // les précisions de dates qu'on ne lit que dans une saison (assez longues, absentes des autres saisons et des dates à
      // venir) : de quoi savoir si une saison est ouverte ou fermée sans la confondre avec une autre ; et les précisions des
      // dates passées d'un spectacle, toutes saisons (son bilan)
      const precisions = d => (d.details || []).map(x => x && x.texte).filter(Boolean);
      window.__propres = (k, n = 3, min = 30) => {
        const ailleurs = new Set([...Object.entries(D.saisons || {}).filter(([kk]) => kk !== k).flatMap(([, S]) => (S.spectacles || []).flatMap(g => (g.dates || []).flatMap(precisions))),
          ...(D.dates || []).flatMap(precisions)]);
        // (la synthèse ne met pas les résidences dans les saisons, règle 23 : leurs précisions n'y servent pas de repère)
        return [...new Set(((D.saisons || {})[k] || { spectacles: [] }).spectacles.flatMap(g => (g.dates || []).filter(d => !(window.__sansResidences && d.residence)).map(d => precisions(d)[0])).filter(t => t && t.length >= min && !ailleurs.has(t)))].slice(0, n);
      };
      window.__passees = (slug, n = 3, min = 20) => [...new Set(Object.values(D.saisons || {}).flatMap(S => (S.spectacles || []).filter(g => g.slug === slug)
        .flatMap(g => (g.dates || []).map(d => precisions(d)[0]))).filter(t => t && t.length >= min))].slice(0, n);
    }, PERMIS);
    const docs = await page.evaluate(() => (D.documents || []).filter(d => d.pour === 'pros').map(d => [d.spectacle, d.url]));
    const D_DOCS = slug => new Set(docs.filter(([s]) => s === slug).map(([, u]) => u)).size;
    const titres = new Map(), signale = new Set();
    for (const [vue, hash, attendus, interdits] of VUES) {
      await page.evaluate(h => { location.hash = h; }, hash);
      await page.waitForTimeout(900);
      // (le débordement se mesure contre la largeur de l'écran demandée : en émulation mobile, une page qui déborde
      // élargit innerWidth avec elle, et le débordement ne se voyait pas)
      const etat = await page.evaluate(([att, int, DISPARUS, LARGEUR]) => {
        // le contenu hors de l'écran (content-visibility: auto) et ce qui apparaît au défilement (MOUVEMENT.reveler :
        // .mv-attente) se lisent aussi : on les montre dans leur état final le temps de la lecture
        const forcer = document.createElement('style');
        forcer.textContent = '*, *::before, *::after { content-visibility: visible !important; transition: none !important; } .mv-attente, .mv-attente > * { opacity: 1 !important; transform: none !important; clip-path: none !important; transition: none !important; animation: none !important; }';
        document.head.appendChild(forcer);
        try {
        const vis = el => { for (let e = el; e && e !== document.body; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; } return el.getClientRects().length > 0; };
        const n = window.__norm, main = document.querySelector('main');
        // hors du contenu : l'en-tête, les barres, le pied (tout ce qui n'est pas dans <main>)
        const horsContenu = el => !(main && main.contains(el));
        const dansEcran = el => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
        const hors = [], textesHors = [];
        const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let t; (t = tw.nextNode());) {
          const p = t.parentElement;
          if (!p || p.closest('script,style,noscript,.intro,[aria-hidden="true"] title,svg title,.sr-only,.visually-hidden,.sr') || !vis(p)) continue;
          const s = n(t.textContent);
          if (s && horsContenu(p)) textesHors.push(s);
          if (s.length < 4 || /^[\d\s.,:;\/–—\-+()·•|→←↗↓↑×]+$/.test(s)) continue;
          if (!window.__corpus.includes(s)) hors.push(t.textContent.trim().replace(/\s+/g, ' ').slice(0, 80));
        }
        // le texte lisible de la vue (hors ouverture), pour les attendus et les interdits
        const intro = document.querySelector('.intro');
        const lu = n(document.body.innerText.replace(intro ? intro.innerText : '', ''));
        const fA = att ? new Function('D', `return (${att})(D)`)(D) : [];
        const fI = int ? new Function('D', `return (${int})(D)`)(D) : [];
        // règle 21 : un élément du menu est « à portée » si un lien visible y mène, hors du contenu, dans le premier écran (en-tête,
        // barre fixe…), sans ouvrir de menu
        const menu = (D.site.menu || []).map(m => ({ cle: m.cle, href: m.href, texte: m.texte }));
        const aPortee = menu.filter(m => [...document.querySelectorAll('a[href]')].some(a => a.getAttribute('href') === m.href && horsContenu(a) && vis(a) && dansEcran(a))).map(m => m.href);
        // les marques aria-current : dans l'en-tête et les menus hors du contenu ; puis toutes (les onglets d'un spectacle compris)
        const marques = v => [...document.querySelectorAll(`header [aria-current="${v}"], nav [aria-current="${v}"]`)].filter(vis);
        const courantTete = marques('page').filter(horsContenu).map(a => a.getAttribute('href') || a.textContent.trim().replace(/\s+/g, ' '));
        const courantVrai = [...document.querySelectorAll('[aria-current="true"]')].filter(a => horsContenu(a) && vis(a)).map(a => a.getAttribute('href') || '');
        // règle 21 : les trois entrées ne sont plus ni dans l'en-tête ni dans le pied (rien hors du contenu), ni sur l'accueil
        const E = D.site.entrees || [], textesTete = ' ' + textesHors.join(' | ') + ' ';
        const entreesHors = [...new Set(E.flatMap(e => [e.texte, e.court]).filter(t => t && textesTete.includes(n(t))))];
        const entreesAccueil = /^#?\/?$/.test(location.hash) ? E.map(e => e.texte).filter(t => t && lu.includes(n(t))) : [];
        // règle 21 : un spectacle qui n'est plus en tournée n'a qu'une page : aucun lien visible vers ses onglets programmer et
        // établissement, nulle part ; sur sa page, aucun non plus vers son onglet voir
        const finis = D.shows.filter(s => !s.enTournee && !s.statut).map(s => s.slug), ici = (/^#\/spectacle\/([^/?]+)/.exec(location.hash) || [])[1];
        const ongletsFinis = [...document.querySelectorAll('a[href]')].filter(vis).map(a => a.getAttribute('href') || '').filter(h => {
          const m = /#\/spectacle\/([^/?]+)\/(voir|programmer|etablissement)(?:[?/]|$)/.exec(h);
          return !!m && finis.includes(m[1]) && (m[2] !== 'voir' || m[1] === ici); });
        // une carte de France : un SVG qui trace le contour de D.carte (un chemin, ou un <use> qui le reprend)
        const contour = D.carte && D.carte.contour;
        const estCarte = svg => !!contour && [...svg.querySelectorAll('path, use')].some(x => {
          if (x.tagName.toLowerCase() !== 'use') return x.getAttribute('d') === contour;
          const h = x.getAttribute('href') || x.getAttribute('xlink:href') || '', c = h[0] === '#' ? document.getElementById(h.slice(1)) : null;
          return !!c && (c.getAttribute('d') === contour || [...c.querySelectorAll('path')].some(q => q.getAttribute('d') === contour)); });
        const cartes = main ? [...main.querySelectorAll('svg')].filter(x => vis(x) && estCarte(x)) : [];
        // les nœuds de texte visibles du contenu qui contiennent ce texte
        const noeuds = texte => { const t0 = n(texte), out = [], w = document.createTreeWalker(main || document.body, NodeFilter.SHOW_TEXT);
          for (let t; (t = w.nextNode());) if (t.parentElement && n(t.textContent).includes(t0) && vis(t.parentElement)) out.push(t); return out; };
        const boite = t => { const r = document.createRange(); r.selectNodeContents(t); return r.getBoundingClientRect(); };
        // règle 22 : le thème (D.site.couleurSaison : couleur ou vive, à peine retouchée), porté par un élément, ses descendants ou
        // leurs ::before / ::after (texte, fond, bordure, filet, ombre, tracé) ; et le magenta de marque d'avant (#bc3e80), qui
        // ne doit plus paraître nulle part
        const theme = D.site.couleurSaison || null, rgbDe = h => (/^#[0-9a-f]{6}$/i.test(h || '') ? [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)) : null);
        const ciblesTheme = theme ? [rgbDe(theme.couleur), rgbDe(theme.vive)].filter(Boolean) : [];
        const couleursDans = v => { const out = [];
          String(v || '').replace(/rgba?\(([^)]+)\)/g, (_, x) => { const q = x.split(/[\s,\/]+/).filter(Boolean).map(Number); if (!(q.length > 3 && q[3] === 0)) out.push(q.slice(0, 3)); return ''; })
            .replace(/color\(srgb ([^)]+)\)/g, (_, x) => { const q = x.split(/[\s\/]+/).filter(Boolean).map(Number); if (!(q.length > 3 && q[3] === 0)) out.push(q.slice(0, 3).map(c => c * 255)); return ''; });
          return out; };
        const proche = (c, t, d) => Math.hypot(c[0] - t[0], c[1] - t[1], c[2] - t[2]) < d;
        const PROPS = ['color', 'backgroundColor', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor', 'outlineColor', 'fill', 'stroke', 'boxShadow', 'textDecorationColor', 'backgroundImage'];
        const porteTheme = el => !!el && ciblesTheme.length > 0 && [el, ...el.querySelectorAll('*')].slice(0, 400).some(x => [null, '::before', '::after'].some(ps => {
          const st = getComputedStyle(x, ps); return PROPS.some(k => couleursDans(st[k]).some(c => ciblesTheme.some(t => proche(c, t, 14)))); }));
        const magenta = /^#?\/?$|^#\/saisons$/.test(location.hash) ? (() => { const out = [];
          for (const x of document.querySelectorAll('body *')) {
            if (out.length >= 3) break;
            if (x.closest('script, style, noscript') || !x.getClientRects().length) continue;
            const st = getComputedStyle(x);
            if (['color', 'backgroundColor', 'fill', 'stroke', 'borderTopColor', 'borderBottomColor'].some(k => couleursDans(st[k]).some(c => proche(c, [188, 62, 128], 8))))
              out.push(x.tagName.toLowerCase() + (x.id ? '#' + x.id : '') + (typeof x.className === 'string' && x.className.trim() ? '.' + x.className.trim().split(/\s+/).slice(0, 2).join('.') : ''));
          }
          return out; })() : [];
        // #/saisons : les prochaines dates avant les saisons passées ; la frise de la saison (la plus colorée des frises de la vue) et
        // la légende de ses spectacles, écrite tout près d'elle ; chaque saison passée annoncée avec sa carte, dans son bloc
        let ordre = null, saisons = null;
        if (location.hash === '#/saisons') {
          const d0 = D.dates.find(d => !d.scolaire && (d.details || [])[0]);
          const a = d0 ? n(d0.details[0].texte) : '', b = n(D.site.saisons[D.site.saisons.length - 1].titre);
          const ia = a ? lu.indexOf(a) : -1, ib = lu.lastIndexOf(b);
          ordre = { ok: ia >= 0 && ib >= 0 && ia < ib, detail: `${ia} / ${ib}` };
          const frs = main ? [...main.querySelectorAll('.frise[data-frise]')].filter(vis) : [];
          // les couleurs des marques : --fr-c des repères de FRISE ; sinon les petites formes pleines d'une frise faite à la main
          const couleurs = f => { const cs = new Set();
            f.querySelectorAll('.frise-point').forEach(x => { const c = getComputedStyle(x).getPropertyValue('--fr-c').trim().toLowerCase(); if (c) cs.add(c); });
            if (!cs.size) f.querySelectorAll('*').forEach(x => { const r = x.getBoundingClientRect(); if (r.width < 3 || r.width > 40 || r.height < 3 || r.height > 40) return;
              const st = getComputedStyle(x); if (st.backgroundColor && !/^(transparent|rgba\(0, 0, 0, 0\))$/.test(st.backgroundColor)) cs.add(st.backgroundColor);
              if (x instanceof SVGElement && st.fill && st.fill !== 'none') cs.add(st.fill); });
            return cs; };
          const fr = frs.map(f => ({ f, k: couleurs(f).size })).sort((x, y) => y.k - x.k)[0];
          const SA = (D.saisons || {})[D.saison] || { spectacles: [] }, titreDe = slug => (D.shows.find(s => s.slug === slug) || {}).titre;
          const titresS = [...new Set([...SA.spectacles.map(g => titreDe(g.slug) || g.titre), ...(D.dates || []).map(d => titreDe(d.slug) || d.titre)].filter(Boolean))];
          const legende = [];
          if (fr) { const R = fr.f.getBoundingClientRect();
            titresS.forEach(x => { if (noeuds(x).some(t => { const r = boite(t); return r.width > 0 && r.bottom > R.top - 260 && r.top < R.bottom + 260; })) legende.push(x); }); }
          const passees = (D.site.saisons || []).filter(x => x.saison < D.saison && ((D.saisons || {})[x.saison] || { spectacles: [] }).spectacles.some(g => (g.dates || []).length));
          const tous = passees.map(x => n(x.titre));
          const aSaCarte = x => noeuds(x.titre).some(t => { for (let el = t.parentElement; el && el !== main && el !== document.body; el = el.parentElement) {
            if (![...el.querySelectorAll('svg')].some(v => vis(v) && estCarte(v))) continue;
            const txt = n(el.innerText || ''); return tous.filter(y => txt.includes(y)).length === 1; } return false; });
          // règle 22 : la marque de la saison en cours (le bloc de son titre) ou l'élément courant du menu porte le thème
          const marquesTheme = [...[...document.querySelectorAll('[aria-current="page"]')].filter(a => horsContenu(a) && vis(a)),
            ...noeuds(D.site.saisons[0].titre).flatMap(t => { const out = []; for (let el = t.parentElement, i = 0; el && el !== main && i < 3; el = el.parentElement, i++) out.push(el); return out; })];
          saisons = { frises: frs.length, couleurs: fr ? fr.k : 0, titres: titresS, legende, passees: passees.length, sansCarte: passees.filter(x => !aSaCarte(x)).map(x => x.titre),
            theme: theme ? marquesTheme.some(porteTheme) : null };
        }
        // #/saisons/<saison> : la saison est amenée à l'écran (son titre se voit)
        let saisonVue = null;
        const mS = /^#\/saisons\/(\d{4}-\d{4})$/.exec(location.hash), xS = mS && (D.site.saisons || []).find(x => x.saison === mS[1]);
        if (xS) saisonVue = { titre: xS.titre, ok: noeuds(xS.titre).some(t => { const r = boite(t); return r.height > 0 && r.bottom > 0 && r.top < innerHeight; }) };
        // la page d'un spectacle qui n'est plus en tournée : une belle carte de ses tournées
        const mSp = /^#\/spectacle\/([^/?]+)$/.exec(location.hash);
        const seul = mSp && finis.includes(mSp[1]) ? { carte: cartes.filter(x => x.getBoundingClientRect().width >= (LARGEUR < 600 ? 240 : 280)).length,
          largeur: Math.round(Math.max(0, ...cartes.map(x => x.getBoundingClientRect().width))) } : null;
        return {
          ordre, saisons, saisonVue, seul, magenta, titre: document.title, hash: location.hash,
          h1: [...document.querySelectorAll('h1')].filter(h => h.offsetParent || h.getClientRects().length).map(h => h.textContent.trim().replace(/\s+/g, ' ')).join(' | '),
          menu, aPortee, courantTete, courantVrai, courantTout: marques('page').length, entreesHors, entreesAccueil, ongletsFinis,
          hauteur: document.documentElement.scrollHeight, haut: Math.round(scrollY),
          debord: document.documentElement.scrollWidth - LARGEUR, hors: [...new Set(hors)],
          manquants: fA.filter(s => s && !lu.includes(n(s))),
          presents: [...fI, ...DISPARUS].filter(s => s && lu.includes(n(s))),
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
          // règles 16 et 21 : sur la vue espace-pro, le h1, ses deux pages (programmer, établissements scolaires) avant ses trois
          // portes, les liens visibles de chaque porte (et leur cible), le lien du menu et du pied
          pro: location.hash === '#/espace-pro' && D.site.espacePro ? (() => {
            const P = D.site.espacePro;
            const h1 = [...document.querySelectorAll('h1')].filter(vis).map(h => n(h.textContent));
            const liens = P.portes.map(p => ({ href: p.href, vus: [...document.querySelectorAll('main a[href]')].filter(a => a.getAttribute('href') === p.href && vis(a)).map(a => a.getAttribute('target') || '') }));
            const menuPro = [...document.querySelectorAll('header a[href="#/espace-pro"], nav a[href="#/espace-pro"]')].filter(a => !a.closest('main, footer') && n(a.textContent).includes(n(P.titre)));
            const pages = ['#/espace-pro/programmer', '#/espace-pro/etablissement'].map(h => [h, [...document.querySelectorAll(`main a[href="${h}"]`)].find(vis) || null]);
            const porte = [...document.querySelectorAll('main a[href]')].find(a => vis(a) && P.portes.some(p => p.href === a.getAttribute('href')));
            return { h1ok: h1.includes(n(P.titre)), liens, menu: menuPro.length, pied: document.querySelectorAll('footer a[href="#/espace-pro"]').length,
              pages: pages.filter(([, a]) => !a).map(([h]) => h), avant: pages.every(([, a]) => a && porte && !!(a.compareDocumentPosition(porte) & Node.DOCUMENT_POSITION_FOLLOWING)) };
          })() : null,
        };
        } finally { forcer.remove(); }
      }, [attendus && attendus.toString(), interdits && interdits.toString(), DISPARUS, page.viewportSize().width]);
      if (etat.debord > 1) log.push(`${tag} ${vue} : débordement horizontal de ${etat.debord}px`);
      if (!etat.h1) log.push(`${tag} ${vue} : aucun h1 visible`);
      // (#/saisons/<saison> mène à sa saison, plus bas dans la page des saisons)
      if (etat.haut > 2 && vue !== 'accueil' && vue !== 'saison-passee') log.push(`${tag} ${vue} : la page ne remonte pas en haut (scrollY ${etat.haut})`);
      // règle 21 : les quatre éléments du menu à portée sur chaque vue, au bureau comme au téléphone
      const pasAPortee = etat.menu.filter(m => !etat.aPortee.includes(m.href));
      if (pasAPortee.length) log.push(`${tag} ${vue} : le menu n'est pas tout entier à portée dans le premier écran (hors du contenu, sans ouvrir de menu) : manque ${pasAPortee.map(m => `« ${m.texte} »`).join(', ')}`);
      // un seul aria-current="page" par vue (en-tête, barres et onglets compris) : sur la vue d'un élément du menu, le sien ; sur
      // une vue qui en dépend (la page d'un spectacle, une sous-page de l'espace pro), l'élément est marqué aria-current="true"
      const cour = COURANT[vue] || (/^#\/spectacle\//.test(hash) ? ['spectacles', 'true'] : null), hrefCour = cour && (etat.menu.find(m => m.cle === cour[0]) || {}).href;
      if (etat.courantTout > 1) log.push(`${tag} ${vue} : ${etat.courantTout} marques aria-current="page" visibles au lieu d'une au plus`);
      if (cour && cour[1] === 'page' && (etat.courantTete.length !== 1 || etat.courantTete[0] !== hrefCour)) log.push(`${tag} ${vue} : le menu doit marquer « ${hrefCour} » aria-current="page", et lui seul (marqués : ${JSON.stringify(etat.courantTete)})`);
      if (cour && cour[1] === 'true') {
        if (etat.courantTete.length) log.push(`${tag} ${vue} : aria-current="page" dans l'en-tête (${JSON.stringify(etat.courantTete)}) ; ici, « ${hrefCour} » se marque aria-current="true"`);
        if (!etat.courantVrai.includes(hrefCour)) log.push(`${tag} ${vue} : « ${hrefCour} » n'est pas mis en évidence dans le menu (aria-current="true")`);
      }
      // les trois entrées : plus dans l'en-tête ni dans le pied (signalé une fois), plus sur l'accueil
      if (etat.entreesHors.length && !signale.has('entrees')) { signale.add('entrees'); log.push(`${tag} ${vue} : les trois entrées se lisent encore hors du contenu (en-tête, barre ou pied ; règle 21) : ${etat.entreesHors.map(s => `« ${s} »`).join(', ')}`); }
      if (etat.entreesAccueil.length) log.push(`${tag} ${vue} : les trois entrées se lisent encore sur l'accueil (règle 21) : ${etat.entreesAccueil.map(s => `« ${s} »`).join(', ')}`);
      if (etat.ongletsFinis.length) log.push(`${tag} ${vue} : lien visible vers un onglet d'un spectacle qui n'est plus en tournée (règle 21 : une seule page) : ${[...new Set(etat.ongletsFinis)].slice(0, 4).join(', ')}`);
      if (titres.has(etat.titre) && titres.get(etat.titre) !== etat.hash && vue !== 'accueil') log.push(`${tag} ${vue} : document.title identique à un autre onglet (« ${etat.titre} »)`);
      titres.set(etat.titre, etat.hash);
      if (etat.hors.length && tag === 'tab') log.push(`${tag} ${vue} : texte absent des sources : ${etat.hors.slice(0, 12).map(s => `« ${s} »`).join(', ')}${etat.hors.length > 12 ? ` (+${etat.hors.length - 12})` : ''}`);
      if (etat.manquants.length) log.push(`${tag} ${vue} : attendu mais absent : ${etat.manquants.map(s => `« ${String(s).slice(0, 60)} »`).join(', ')}`);
      if (vue === 'saisons' && etat.ordre && !etat.ordre.ok) log.push(`${tag} saisons : les prochaines dates doivent précéder les saisons passées (${etat.ordre.detail})`);
      if (vue === 'saisons' && etat.saisons) {
        const S = etat.saisons, besoin = Math.min(3, S.titres.length);
        if (!S.frises) log.push(`${tag} saisons : pas de frise de la saison (.frise[data-frise], règle 21)`);
        else if (S.couleurs < 3) log.push(`${tag} saisons : la frise de la saison n'a des marques que de ${S.couleurs} couleur(s) (au moins 3 : chaque date à la couleur de son spectacle, sur une seule ligne du temps)`);
        if (S.legende.length < besoin) log.push(`${tag} saisons : la légende de la frise (les titres de ses spectacles, écrits tout près d'elle) ne se lit pas : ${S.legende.length} titre(s) sur ${besoin}`);
        if (S.sansCarte.length) log.push(`${tag} saisons : ${S.sansCarte.length} saison(s) passée(s) sur ${S.passees} sans sa carte (un SVG de la France dans son bloc, avec son titre) : ${S.sansCarte.slice(0, 4).map(t => `« ${t} »`).join(', ')}${S.sansCarte.length > 4 ? '…' : ''}`);
        if (S.theme === false) log.push(`${tag} saisons : ni la marque de la saison en cours ni l'élément courant du menu ne portent le thème (D.site.couleurSaison, couleur ou vive : règle 22)`);
      }
      if (etat.magenta.length) log.push(`${tag} ${vue} : magenta de marque encore présent (règle 22 : le thème à la place) : ${etat.magenta.join(', ')}`);
      if (etat.saisonVue && !etat.saisonVue.ok) log.push(`${tag} ${vue} : la saison « ${etat.saisonVue.titre} » n'est pas amenée à l'écran`);
      if (etat.seul && !etat.seul.carte) log.push(`${tag} ${vue} : pas de belle carte de ses tournées (un SVG de la France d'au moins ${page.viewportSize().width < 600 ? 240 : 280} px ; la plus large : ${etat.seul.largeur} px)`);
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
          etat.pro.pages.forEach(h => log.push(`${tag} espace-pro : aucun lien visible vers sa page <a href="${h}"> (règle 21)`));
          if (!etat.pro.pages.length && !etat.pro.avant) log.push(`${tag} espace-pro : ses deux pages (programmer, établissements scolaires) doivent précéder les trois portes (règle 21)`);
        }
      }
      if (FRISES[vue] && etat.frises < FRISES[vue]) log.push(`${tag} ${vue} : ${etat.frises} frise(s) chronologique(s) (.frise[data-frise]) au lieu d'au moins ${FRISES[vue]} (règle 15 D)`);
      if (vue === 'pro-programmer' && !etat.dossiers.length) log.push(`${tag} ${vue} : aucun bouton [data-dossier] (dossier PDF, règle 13)`);
      if (vue === 'pro-programmer' && !etat.mailto) log.push(`${tag} ${vue} : aucun lien mailto: visible vers le contact diffusion (règle 13)`);
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
          'berenice-etablissement': [['[data-edit^="dossiers.berenice"]', 3], ['[data-edit^="shows.berenice.actionCulturelle"]', 1]], 'pro-etablissement': [['[data-edit^="site.ecole"]', 1]],
          saisons: [['[data-agenda]', 1], ['[data-date-id]', 10]], 'pro-programmer': [['[data-edit*=".programmer."]', 3]],
          // la page d'un spectacle qui n'est plus en tournée : ses textes, et les lignes de son bilan (dates passées, éditables)
          'la-folle-idee': [['[data-edit^="shows.la-folle-idee."]', 5], ['[data-agenda]', 1], ['[data-date-id]', 5]],
          'espace-pro': [['[data-edit="site.espacePro.titre"]', 1], ['[data-edit="site.espacePro.texte"]', 1],
            ['[data-edit^="site.espacePro.portes."][data-edit$=".titre"]', 3], ['[data-edit^="site.espacePro.portes."][data-edit$=".texte"]', 3]] }[vue] || [];
        const nb = await page.evaluate(sels => sels.map(([s]) => document.querySelectorAll(s).length), att);
        att.forEach(([s, min], i) => { if (nb[i] < min) log.push(`${tag} ${vue} : édition : ${nb[i]} élément(s) ${s} (au moins ${min})`); });
        const lien = await page.evaluate(() => { const l = D.site.libelles.modifierSite; return [...document.querySelectorAll('a, button')].some(b => b.textContent.trim() === l && b.getClientRects().length); });
        if (!lien) log.push(`${tag} ${vue} : édition : pas de lien « Modifier le site » visible`);
      }
      if (tag === 'tab') log.push(`· ${vue} : « ${etat.titre} » · h1 « ${etat.h1.slice(0, 60)} » · menu actif ${JSON.stringify(etat.courantTete)}${etat.courantVrai.length ? ` (true : ${JSON.stringify(etat.courantVrai)})` : ''} · hauteur ${etat.hauteur}px`);
      await page.screenshot({ path: `${out}/${n}-${tag}-${vue}.png` });
    }
    // au téléphone étroit (360 px, la largeur visée par les maquettes) : aucune vue ne déborde
    if (tag === 'mtab') {
      await page.setViewportSize({ width: 360, height: vp.height });
      const debords = [];
      for (const [vue, hash] of VUES) {
        await page.evaluate(h => { location.hash = h; }, hash);
        await page.waitForTimeout(600);
        const d = await page.evaluate(L => document.documentElement.scrollWidth - L, 360);
        if (d > 1) debords.push(`${vue} (${d}px)`);
      }
      if (debords.length) log.push(`${tag} : à 360 px, débordement horizontal : ${debords.join(', ')}`);
      await page.setViewportSize(vp);
      await page.waitForTimeout(300);
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
    // règles 19 et 20, de même (REGLE19=1, REGLE20=1) ; la 19 relit toutes les vues (la nuit, seule)
    if (process.env.REGLE20 === '1') await regle20(page, tag, log);
    if (process.env.REGLE19 === '1') await regle19(page, tag, log);
    if (process.env.REGLE23 === '1') await regle23(page, tag, log, n);
    // règle 15 A : un clic ordinaire sur un lien du menu ne fait jouer aucune tentacule (sauf un moment déclaré data-moment)
    if (tag === 'tab') {
      await page.evaluate(() => { location.hash = '#/saisons'; });
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
