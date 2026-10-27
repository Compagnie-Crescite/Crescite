/* Réserver une date, d'un geste (règle 17 du contrat), commun aux maquettes : les dates où l'on peut réserver, la bande de
   leurs boutons (l'horaire écrit sur chacun), la carte de réservation de la date choisie, le clavier. Chaque maquette
   l'habille dans son style (classes .rs-*, variables --rs-*) et y joue sa transition (le crochet effet). build.py l'ajoute
   après mouvement.js. Aucune dépendance (AGENDA, s'il est là, écrit les dates comme l'agenda). D est relu à chaque appel.

   Les données : D.dates[] { id, slug, titre, ligneDate, ligneLieu, details, lien, iso, fin, precision, scolaire, etat,
   commune, l, lieu (le nom du lieu, de la base), representations: [{ jour, heure, public, annulee, lien }] } ; D.shows
   (titre, univers) ; D.photos ; les libellés de D.site.libelles : reserver, surLeSiteDuLieu, horaireAPreciser,
   reservationAupresDuLieu, choisirUneDate, representations, scolaire, joursCourts, moisCourts. Rien d'inventé : un lien
   ne s'affiche que s'il est dans les données (http ou https), une heure que si la base la donne.

   RESERVER.dates(slug)        les dates réservables, dans l'ordre du temps : à venir (fin ≥ D.aujourdhui), tout public ou
                               mixtes (pas scolaires), ni annulées ni toutes leurs séances annulées ; d'un spectacle (slug),
                               ou de toute la saison (sans slug)
   RESERVER.cle(d)             la clé d'une date : son id dans la base, sinon « slug~iso~l » (l'instantané n'a pas d'id)
   RESERVER.trouver(cle)       la date réservable de cette clé, ou null
   RESERVER.seances(d)         [{ jour, heure ('20h30', ou '' si la base ne la donne pas), scolaire, lien }] : ses représentations
                               non annulées, dans l'ordre ; lien : celui de la séance (sa billetterie), sinon celui de la date ;
                               une séance scolaire n'a jamais de lien
   RESERVER.heures(d)          ['14h', '20h'] : les heures des séances tout public, sans doublon ; [] si aucune n'est connue
   RESERVER.lien(d)            où l'on réserve : le lien de la date, sinon celui de sa première séance tout public qui en a un ;
                               null s'il n'y en a pas (la carte dit alors « Réservation auprès du lieu », sans faux bouton)
   RESERVER.lieu(d)            le nom du lieu, ou null
   RESERVER.commune(d)         sa commune (« Pont-Audemer » : sans son département)
   RESERVER.jours(d)           { semaine: ['ven.'], jour: '18', mois: ['déc.'] } : la date écrite court (AGENDA.court, avec les
                               noms courts de D.site.libelles) ; deux jours qui se suivent : ['jeu.', 'ven.'], '19 – 20' ;
                               plusieurs : '8 – 11' ; une période : '12 – 20' ; un mois : 'mars', ['2027'] (l'intervalle :
                               un tiret demi-cadratin entre deux espaces fines insécables, qui ne se coupe jamais)
   RESERVER.bouton(d, o)       le HTML du bouton d'une date, qui se lit « ven. 18 déc. · 14h, 20h — Pont-Audemer » :
                               <button class="rs-date" data-reserver="<clé>" aria-pressed> ; o.choisi, o.classe, o.style
                               (les variables de l'univers), o.attributs (une chaîne : data-date-id…, aria-controls…)
   RESERVER.bande(dates, o)    le HTML de la bande : <div class="rs-bande" role="group" aria-label="<o.libelle, ou
                               libelles.choisirUneDate>"> et un bouton par date ; o.choisie (la clé), o.attributs (de la bande :
                               data-agenda…), o.bouton(d) → les options du bouton de d
   RESERVER.carte(d, o)        le HTML du contenu de la carte d'une date : la photo du spectacle (.rs-photo, un fond discret ;
                               o.photo false : sans), le spectacle (.rs-sp ; o.titre false : sans ; o.href : un lien vers sa page),
                               le jour (d.ligneDate), le lieu et sa commune, ses précisions quand elles disent plus que les
                               séances, les séances (chacune un lien avec son heure, ou un repère sans lien), puis UN bouton
                               principal .rs-reserver « Réserver » (nouvel onglet ; « sur le site du lieu » et le nom du lieu),
                               ou .rs-aupres « Réservation auprès du lieu » et son nom ; puis, en retrait, .rs-agenda
                               « Ajouter à mon agenda » (libelles.ajouterAgenda), qui télécharge RESERVER.ics(d), puis
                               le dit un instant à la place de son libellé, et au lecteur d'écran (.rs-agenda-msg, role status, libelles.agendaTelecharge)
   RESERVER.ics(d)             le texte du fichier iCalendar de la date (ses séances tout public à leur heure, sinon une
                               journée ; le lieu et sa commune ; ses précisions et le lien de réservation) ; null pour une
                               date au mois près
   RESERVER.telecharger(d)     télécharge ce fichier (« <slug>-<jour>.ics »)
   RESERVER.univers(show)      les variables CSS de l'univers du spectacle (une chaîne « --rs-fond:…; … »), lisibles (AA) :
                               --rs-fond --rs-fond2 --rs-texte --rs-texte2 --rs-accent --rs-sur-accent (le texte sur l'accent)
                               --rs-vif (l'accent qui se lit en petit sur le fond) --rs-lueur --rs-titre (la police de titre)
                               --rs-titre-g (sa graisse)
   RESERVER.photo(show)        l'adresse de la photo du spectacle (D.photos), pour un src
   RESERVER.permis()           faux si le visiteur a demandé moins d'animations, ou avec ?anim=0 (comme MOUVEMENT.permis)

   RESERVER.monter(racine, o) → { choisir(cle, { geste }), dessiner(), cle(), date(), montrer(), detruire() }
     Rend les boutons vivants : un geste (clic, toucher, Entrée, Espace) choisit une date ; les flèches (gauche et droite ;
     haut et bas aussi dans une liste), Origine et Fin passent d'un bouton à l'autre ; un seul est choisi (aria-pressed) ; la
     carte se refait sur place, sans recharger la vue ni perdre la position.
     racine         l'élément qui contient les boutons [data-reserver] : la bande, ou toute une liste (écouteurs délégués : la
                    maquette peut redessiner ses lignes, puis appeler dessiner())
     o.dates        les dates des boutons (défaut : RESERVER.dates())
     o.carte        l'élément de la carte (sous la bande) ; ou une fonction (bouton) → l'élément où dessiner la carte de ce
                    bouton (une liste : sous sa ligne), la carte d'avant est alors vidée et cachée
     o.choisie      la clé choisie au départ ; 'premiere' (défaut) : la première date ; null : aucune (une liste)
     o.basculer     true : un geste sur le bouton choisi referme sa carte (une liste)
     o.roving       true (défaut) : un seul arrêt de tabulation dans la bande, le bouton choisi ; false : tous (une liste)
     o.axe          'h' (défaut : gauche et droite) ou 'hv' (une liste : haut et bas aussi)
     o.adresse      true : l'adresse garde la date choisie (?date=<clé>, par history.replaceState : ni rechargement ni historique)
     o.carteOptions les options de RESERVER.carte, ou une fonction (d) → ces options
     o.univers(show, d) → les variables CSS posées sur la carte (défaut : RESERVER.univers(show))
     o.effet({ carte, bouton, date, show, avant, ancien, fondAvant, premier, ouverture, origine }) : la transition de la
                    maquette, appelée quand la carte vient d'être refaite. avant : la date d'avant (ou null) ; ancien : un
                    élément détaché qui garde le contenu d'avant (pour un fondu enchaîné) ; fondAvant : la couleur de fond
                    d'avant ; premier : le premier dessin (sans transition) ; ouverture : la carte s'ouvre (une liste : sous
                    une autre ligne), au lieu de changer de date ; origine() : { x, y }, le centre du bouton choisi dans la
                    carte (lu à la demande). Défaut : un fondu bref (160 ms), rien avec ?anim=0.
     o.surChoix(d, cle)  après chaque choix (d : null quand une carte se referme)
   L'habillage : des styles de base sobres (injectés une fois en tête de <head>, sans poids : :where()) ; la maquette écrit le
   reste. Classes : .rs-bande .rs-date (.rs-q .rs-s .rs-n .rs-m .rs-h .rs-o .rs-sep ; [aria-pressed="true"]) .rs-carte (posée
   par la maquette) .rs-photo .rs-c .rs-sp .rs-quand .rs-ou .rs-lieu .rs-commune .rs-det .rs-seances .rs-k .rs-liste
   .rs-seance (.est-scolaire) .rs-sj .rs-sh .rs-scol .rs-sans .rs-action .rs-reserver (.rs-r : .rs-r1 .rs-r2) .rs-aupres .rs-etat .rs-plus .rs-agenda. */
const RESERVER = (() => {
  'use strict';
  const COUPE = (() => { try { return new URLSearchParams(location.search).get('anim') === '0'; } catch (e) { return false; } })();
  const reduit = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  const permis = () => !COUPE && !(reduit && reduit.matches);
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ESC[c]);
  const A = typeof AGENDA !== 'undefined' ? AGENDA : null;
  const MOIS = A ? A.MOIS : ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const L = () => (typeof D !== 'undefined' && D && D.site && D.site.libelles) || {};
  const http = u => (typeof u === 'string' && /^https?:\/\/\S+$/i.test(u.trim()) ? u.trim() : null);
  const heureTexte = h => (A ? A.heureTexte(h) : (h ? `${+h.slice(0, 2)}h${h.slice(3, 5) !== '00' ? h.slice(3, 5) : ''}` : ''));
  const court = j => {
    const Lb = L(), noms = { semaine: Lb.joursCourts, mois: Lb.moisCourts };
    if (A && A.court) return A.court(j, noms);
    const w = (new Date(Date.UTC(+j.slice(0, 4), +j.slice(5, 7) - 1, +j.slice(8, 10))).getUTCDay() + 6) % 7;
    return { semaine: (noms.semaine || [])[w] || '', jour: String(+j.slice(8, 10)), mois: (noms.mois || MOIS)[+j.slice(5, 7) - 1], an: j.slice(0, 4) };
  };
  const show = slug => ((typeof D !== 'undefined' && D.shows) || []).find(s => s.slug === slug) || null;

  /* ---------------------------------------------------------------------------------------------- les données */
  const annulee = d => /annul/i.test(d.etat || '');
  const toutesAnnulees = d => (d.representations || []).length > 0 && d.representations.every(r => r && r.annulee);
  function dates(slug) {
    const auj = (typeof D !== 'undefined' && D.aujourdhui) || (A ? A.iso(new Date()) : '');
    return ((typeof D !== 'undefined' && D.dates) || []).filter(d => d && !d.scolaire && !d.residence && !annulee(d) && !toutesAnnulees(d)
      && (d.fin || d.iso || '') >= auj && (!slug || d.slug === slug));
  }
  const cle = d => (d.id != null && d.id !== '' ? String(d.id) : [d.slug || '', d.iso || '', d.l ?? ''].join('~'));
  const trouver = k => (k == null ? null : dates().find(d => cle(d) === String(k)) || null);
  function seances(d) {
    const lienDate = http(d.lien);
    return (d.representations || []).filter(r => r && !r.annulee)
      .slice().sort((a, b) => String(a.jour || '').localeCompare(String(b.jour || '')) || String(a.heure || '99').localeCompare(String(b.heure || '99')))
      .map(r => { const scolaire = r.public === 'scolaire'; return { jour: r.jour || d.iso || null, heure: r.heure ? heureTexte(String(r.heure).slice(0, 5)) : '', scolaire, lien: scolaire ? null : http(r.lien) || lienDate }; });
  }
  function heures(d) {
    const hs = [...new Set((d.representations || []).filter(r => r && !r.annulee && r.public !== 'scolaire' && r.heure).map(r => String(r.heure).slice(0, 5)))].sort();
    return hs.map(heureTexte);
  }
  const lien = d => http(d.lien) || (seances(d).find(s => !s.scolaire && s.lien) || {}).lien || null;
  const lieu = d => (typeof d.lieu === 'string' && d.lieu.trim() ? d.lieu.trim() : d.lieu && d.lieu.nom ? d.lieu.nom : null);
  const commune = d => d.commune || String(d.ligneLieu || '').replace(/\s*\([^)]*\)\s*$/, '');
  function jours(d) {
    if (d.precision === 'month' && d.iso) return { semaine: [], jour: MOIS[+d.iso.slice(5, 7) - 1], mois: [d.iso.slice(0, 4)] };
    let js = [...new Set(seances(d).filter(x => !x.scolaire && x.jour).map(x => x.jour))].sort();
    if (!js.length) js = d.iso ? (d.fin && d.fin !== d.iso ? [d.iso, d.fin] : [d.iso]) : [];
    if (!js.length) return { semaine: [], jour: d.ligneDate || '', mois: [] };
    const a = court(js[0]), b = court(js[js.length - 1]);
    if (js.length === 1) return { semaine: [a.semaine], jour: a.jour, mois: [a.mois] };
    const suivis = js.length === 2 && Date.parse(js[1]) - Date.parse(js[0]) === 864e5;
    return { semaine: suivis ? [a.semaine, b.semaine] : [], jour: `${a.jour}${ENTRE}${b.jour}`, mois: js[0].slice(0, 7) === js[js.length - 1].slice(0, 7) ? [a.mois] : [a.mois, b.mois] };
  }
  // les précisions de la date, quand elles disent plus que la carte (celles que l'agenda compose des séances, non)
  function precisions(d) {
    const ds = (d.details || []).map(x => (typeof x === 'string' ? x : x && x.texte)).filter(Boolean);
    if (!ds.length || !A || !(d.representations || []).length) return ds;
    try {
      const auto = A.precisions({ debut: d.iso, fin: d.fin, details: null, lien: d.lien }, d.representations, lieu(d) ? { nom: lieu(d) } : null).map(x => x.texte);
      return auto.join('|') === ds.join('|') ? [] : ds;
    } catch (e) { return ds; }
  }

  /* ---------------------------------------------------------------------------------------------- l'univers d'un spectacle */
  const hex = x => /^#[0-9a-f]{6}$/i.test(x || '');
  const lum = h => { const v = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const contraste = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  function univers(s) {
    const u = (s && s.univers) || {}, c = u.couleurs || {}, p = u.polices || {};
    const fond = hex(c.fond) ? c.fond : '#1a1016', fond2 = hex(c.fond2) ? c.fond2 : fond;
    const texte = hex(c.texte) && contraste(c.texte, fond) >= 4.5 ? c.texte : lum(fond) > 0.4 ? '#1a1016' : '#ffffff';
    const texte2 = hex(c.texte2) && contraste(c.texte2, fond) >= 4.5 && contraste(c.texte2, fond2) >= 4.5 ? c.texte2 : texte;
    const accent = hex(c.accent) ? c.accent : texte;
    const lisible = x => hex(x) && contraste(x, fond) >= 4.5 && contraste(x, fond2) >= 4.5;
    const vif = (u.clair ? [c.accent, c.accent2, c.scene] : [c.accent2, c.scene, c.accent]).find(lisible) || texte2;
    const sur = contraste('#ffffff', accent) >= 4.5 ? '#ffffff' : contraste(fond, accent) >= contraste(texte, accent) ? fond : texte;
    const titre = p.titre ? `'${p.titre}', ${/grotesk|anton|ubuntu|sans|inter|raleway/i.test(p.titre) ? 'system-ui, sans-serif' : 'Georgia, serif'}` : 'inherit';
    return `--rs-fond:${fond};--rs-fond2:${fond2};--rs-texte:${texte};--rs-texte2:${texte2};--rs-accent:${accent};--rs-sur-accent:${sur};--rs-vif:${vif};--rs-lueur:${c.lueur || 'transparent'};--rs-titre:${titre};--rs-titre-g:${p.titreGraisse || 600}`;
  }
  const photo = s => (s && typeof D !== 'undefined' && D.photos ? D.photos[s.slug] || null : null);

  /* ---------------------------------------------------------------------------------------------- le HTML */
  // (l'intervalle de la forme courte : un tiret demi-cadratin entre deux espaces fines insécables, qui ne se coupe jamais)
  const ENTRE = '\u202f–\u202f';
  const mots = xs => xs.map(x => `<span>${esc(x)}</span>`).join(ENTRE);
  function bouton(d, o = {}) {
    const Lb = L(), j = jours(d), h = heures(d), k = cle(d);
    return `<button type="button" class="rs-date${o.classe ? ' ' + o.classe : ''}" data-reserver="${esc(k)}" aria-pressed="${o.choisi ? 'true' : 'false'}"${o.attributs || ''}${o.style ? ` style="${esc(o.style)}"` : ''}>`
      + `<span class="rs-q">${j.semaine.length ? `<span class="rs-s">${mots(j.semaine)}</span> ` : ''}<b class="rs-n">${esc(j.jour)}</b>${j.mois.length ? ` <span class="rs-m">${mots(j.mois)}</span>` : ''}</span>`
      + `<span class="rs-sep"> · </span><span class="rs-h${h.length ? '' : ' rs-h--sans'}">${h.length ? h.map(x => `<span>${esc(x)}</span>`).join(', ') : `<span>${esc(Lb.horaireAPreciser)}</span>`}</span>`
      + `<span class="rs-sep"> — </span><span class="rs-o">${esc(commune(d))}</span></button>`;
  }
  function bande(ds, o = {}) {
    const Lb = L(), k = o.choisie == null ? null : String(o.choisie);
    return `<div class="rs-bande" role="group" aria-label="${esc(o.libelle || Lb.choisirUneDate || '')}"${o.attributs || ''}>${ds.map(d => bouton(d, Object.assign({ choisi: cle(d) === k }, o.bouton ? o.bouton(d) : {}))).join('')}</div>`;
  }
  function seancesHTML(d, Lb) {
    // deux séances que rien ne distingue (même jour, même heure, même public, même lien) ne font qu'un repère
    const vus = new Set(), ss = seances(d).filter(x => { const k = [x.jour, x.heure, x.scolaire, x.lien].join('|'); if (vus.has(k)) return false; vus.add(k); return true; });
    if (!ss.length || !ss.some(x => x.heure || x.scolaire)) return `<p class="rs-seances rs-seances--sans"><span class="rs-k">${esc(Lb.representations)}</span> <span class="rs-sans">${esc(Lb.horaireAPreciser)}</span></p>`;
    const plusieurs = new Set(ss.map(x => x.jour)).size > 1;
    return `<div class="rs-seances"><p class="rs-k">${esc(Lb.representations)}</p><ul class="rs-liste">${ss.map(x => {
      const j = plusieurs && x.jour ? court(x.jour) : null;
      const q = `${j ? `<span class="rs-sj"><span>${esc(j.semaine)}</span> ${esc(j.jour)} <span>${esc(j.mois)}</span></span>` : ''}<b class="rs-sh${x.heure ? '' : ' rs-sh--sans'}">${esc(x.heure || (x.scolaire ? '' : Lb.horaireAPreciser))}</b>${x.scolaire ? `<em class="rs-scol">${esc(Lb.scolaire)}</em>` : ''}`;
      return `<li>${x.lien ? `<a class="rs-seance" href="${esc(x.lien)}" target="_blank" rel="noopener">${q}${EXT}${DEHORS()}</a>` : `<span class="rs-seance${x.scolaire ? ' est-scolaire' : ''}">${q}</span>`}</li>`;
    }).join('')}</ul></div>`;
  }
  const FLECHE = '<svg class="rs-fleche" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 17L17 7M9 7h8v8"/></svg>';
  // un lien vers la billetterie s'ouvre dans un nouvel onglet : la flèche qui sort (celle du site, .ext ; le bouton de
  // réservation a la sienne, en grand) et, pour les lecteurs d'écran, « (nouvel onglet) »
  const DEHORS = () => (L().nouvelOnglet ? `<span class="rs-masque"> ${esc(L().nouvelOnglet)}</span>` : '');
  const EXT = '<svg class="ext" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M4.5 2.5h5v5M9.5 2.5l-7 7"/></svg>';
  function carte(d, o = {}) {
    const Lb = L(), s = show(d.slug), ou = lieu(d), href = lien(d), ph = o.photo === false ? null : photo(s), pr = precisions(d);
    const titre = s ? s.titre : d.titre;
    return `${ph ? `<img class="rs-photo" src="${esc(ph)}" alt="" decoding="async">` : ''}<div class="rs-c">`
      + (o.titre === false ? '' : `<p class="rs-sp">${o.href ? `<a href="${esc(o.href)}">${esc(titre)}</a>` : `<span>${esc(titre)}</span>`}</p>`)
      + `<p class="rs-quand"><time${d.iso ? ` datetime="${esc(d.iso)}"` : ''}>${esc(d.ligneDate || d.ligne || '')}</time>${d.etat ? ` <em class="rs-etat">${esc(d.etat)}</em>` : ''}</p>`
      + `<p class="rs-ou">${ou ? `<span class="rs-lieu">${esc(ou)}</span> ` : ''}<span class="rs-commune">${esc(d.ligneLieu || commune(d))}</span></p>`
      + (pr.length ? `<ul class="rs-det">${pr.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '')
      + seancesHTML(d, Lb)
      + `<p class="rs-action">${href
        ? `<a class="rs-reserver" href="${esc(href)}" target="_blank" rel="noopener"><span class="rs-r"><span class="rs-r1">${esc(Lb.reserver)}</span><span class="rs-r2"><span>${esc(Lb.surLeSiteDuLieu)}</span>${ou ? `<span class="rs-sep"> · </span><span>${esc(ou)}</span>` : ''}</span></span>${FLECHE}${DEHORS()}</a>`
        : `<span class="rs-aupres"><span>${esc(Lb.reservationAupresDuLieu)}</span>${ou ? `<span class="rs-sep"> · </span><b>${esc(ou)}</b>` : ''}</span>`}</p>`
      + (Lb.ajouterAgenda && agendaPermis(d) ? `<p class="rs-plus"><button type="button" class="rs-agenda" data-reserver-ics="${esc(cle(d))}">${AGENDA_ICONE}<span>${esc(Lb.ajouterAgenda)}</span></button><span class="rs-agenda-msg rs-masque" role="status"></span></p>` : '')
      + '</div>';
  }

  /* ---------------------------------------------------------------------------------------------- l'agenda (.ics) */
  // la date dans son agenda à soi : un fichier iCalendar (RFC 5545) tiré de D seul. Chaque séance tout public dont l'heure est
  // connue est un évènement à son heure (Europe/Paris), qui finit avec la durée du spectacle quand D la dit (« 1h25 »,
  // « 55 minutes ») ; un jour de séances sans heure connue, ou une date sans séance, un évènement d'une journée (du premier
  // au dernier jour). Le spectacle (le titre), le lieu et sa commune ; dans la description, ses précisions et le lien de
  // réservation (celui de la séance, sinon celui de la date). Une date au mois près n'en a pas : son jour n'est pas fixé
  const AGENDA_ICONE = '<svg class="rs-fleche" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4M12 13v5M9.5 15.5h5"/></svg>';
  const agendaPermis = d => !!(d && /^\d{4}-\d{2}-\d{2}$/.test(d.iso || '') && (!d.precision || d.precision === 'day'));
  const icsEchap = s => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  // une ligne de plus de 75 octets se plie (CRLF, puis une espace), sans couper un caractère
  const plier = l => { const out = []; let cur = '', n = 0;
    for (const ch of l) { const b = ch.codePointAt(0) < 0x80 ? 1 : ch.codePointAt(0) < 0x800 ? 2 : ch.codePointAt(0) < 0x10000 ? 3 : 4;
      if (n + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; n = 0; } cur += ch; n += b; }
    out.push(cur); return out.join('\r\n '); };
  const jourIcs = iso => iso.replace(/-/g, '');
  const lendemain = iso => { const t = new Date(`${iso}T12:00:00Z`); t.setUTCDate(t.getUTCDate() + 1); return t.toISOString().slice(0, 10); };
  // la durée du spectacle, en minutes, lue dans D (« durée : 1h25 », « 1h », « 55 minutes ») ; null si D ne la dit pas
  const minutes = s => { const t = String((s && s.duree) || ''); let m = /(\d+)\s*h\s*(\d{1,2})?/i.exec(t);
    if (m) return +m[1] * 60 + (+m[2] || 0); m = /(\d+)\s*min/i.exec(t); return m ? +m[1] : null; };
  const plus = (jour, hm, mn) => { const [h, m] = hm.split(':').map(Number), t = new Date(Date.UTC(+jour.slice(0, 4), +jour.slice(5, 7) - 1, +jour.slice(8, 10), h, m + mn));
    return `${t.toISOString().slice(0, 10).replace(/-/g, '')}T${t.toISOString().slice(11, 16).replace(':', '')}00`; };
  const PARIS = ['BEGIN:VTIMEZONE', 'TZID:Europe/Paris',
    'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
    'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
    'END:VTIMEZONE'];
  function ics(d) {
    if (!agendaPermis(d)) return null;
    const s = show(d.slug), titre = (s && s.titre) || d.titre || '', ou = [lieu(d), d.ligneLieu || commune(d)].filter(Boolean).join(', ');
    const pr = (d.details || []).map(x => (typeof x === 'string' ? x : x && x.texte)).filter(Boolean), lienDate = lien(d), duree = minutes(s);
    const k = cle(d), stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    const reps = (d.representations || []).filter(r => r && !r.annulee && r.public !== 'scolaire').map(r => ({ jour: /^\d{4}-\d{2}-\d{2}$/.test(r.jour || '') ? r.jour : d.iso, heure: r.heure ? String(r.heure).slice(0, 5) : '', lien: http(r.lien) || lienDate }));
    const vus = new Set(), aHeure = reps.filter(r => /^\d{2}:\d{2}$/.test(r.heure) && !vus.has(`${r.jour} ${r.heure}`) && vus.add(`${r.jour} ${r.heure}`))
      .sort((a, b) => `${a.jour} ${a.heure}`.localeCompare(`${b.jour} ${b.heure}`));
    const joursTimes = new Set(aHeure.map(r => r.jour)), joursSans = [...new Set(reps.filter(r => !joursTimes.has(r.jour)).map(r => r.jour))].sort();
    const ev = [];
    const evenement = (id, quand, url) => ev.push('BEGIN:VEVENT', `UID:${icsEchap(`${k}-${id}`)}@crescite`, `DTSTAMP:${stamp}`, ...quand, `SUMMARY:${icsEchap(titre)}`,
      ...(ou ? [`LOCATION:${icsEchap(ou)}`] : []), ...((pr.length || url) ? [`DESCRIPTION:${icsEchap([...pr, url].filter(Boolean).join('\n'))}`] : []), ...(url ? [`URL:${url}`] : []), 'END:VEVENT');
    aHeure.forEach(r => evenement(`${r.jour}-${r.heure.replace(':', '')}`, [`DTSTART;TZID=Europe/Paris:${jourIcs(r.jour)}T${r.heure.replace(':', '')}00`,
      ...(duree ? [`DTEND;TZID=Europe/Paris:${plus(r.jour, r.heure, duree)}`] : [])], r.lien));
    joursSans.forEach(j => evenement(j, [`DTSTART;VALUE=DATE:${jourIcs(j)}`, `DTEND;VALUE=DATE:${jourIcs(lendemain(j))}`], lienDate));
    if (!ev.length) { const fin = /^\d{4}-\d{2}-\d{2}$/.test(d.fin || '') && d.fin >= d.iso ? d.fin : d.iso;
      evenement(d.iso, [`DTSTART;VALUE=DATE:${jourIcs(d.iso)}`, `DTEND;VALUE=DATE:${jourIcs(lendemain(fin))}`], lienDate); }
    return [...['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Crescite//Site//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'], ...(aHeure.length ? PARIS : []), ...ev, 'END:VCALENDAR']
      .map(plier).join('\r\n') + '\r\n';
  }
  // le fichier se télécharge (le nom : le spectacle et le premier jour) ; un téléphone le propose à son agenda
  function telecharger(d) {
    const t = ics(d); if (!t || typeof document === 'undefined') return false;
    const url = URL.createObjectURL(new Blob([t], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `${d.slug || 'date'}-${d.iso}.ics`; a.hidden = true;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  }

  /* ---------------------------------------------------------------------------------------------- le geste */
  const varsDe = t => String(t || '').split(';').map(x => x.trim()).filter(Boolean).map(x => { const i = x.indexOf(':'); return [x.slice(0, i).trim(), x.slice(i + 1).trim()]; }).filter(([k]) => k.startsWith('--'));
  const fonduBref = ({ carte: c, premier }) => {
    if (premier || COUPE || !c.animate) return;
    const x = c.querySelector('.rs-c') || c;
    x.animate([{ opacity: 0.25 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' });
  };
  function garderAdresse(k) {
    try {
      const h = location.hash || '#/', i = h.indexOf('?'), chemin = i < 0 ? h : h.slice(0, i), q = new URLSearchParams(i < 0 ? '' : h.slice(i + 1));
      if (k == null) q.delete('date'); else q.set('date', k);
      const s = q.toString();
      history.replaceState(history.state, '', `${location.pathname}${location.search}${chemin}${s ? '?' + s : ''}`);
    } catch (e) { /* adresse inchangée */ }
  }
  function monter(racine, o = {}) {
    if (!racine) return null;
    const opt = Object.assign({ choisie: 'premiere', basculer: false, roving: true, axe: 'h', adresse: false }, o);
    const ds = opt.dates || dates();
    const ctl = typeof AbortController === 'function' ? new AbortController() : null, sig = ctl ? { signal: ctl.signal } : {};
    let choisie = null, conteneur = null;
    const boutons = () => [...racine.querySelectorAll('[data-reserver]')];
    const boutonDe = k => (k == null ? null : boutons().find(b => b.getAttribute('data-reserver') === k) || null);
    const dateDe = k => (k == null ? null : ds.find(d => cle(d) === k) || null);
    const visible = b => b.getClientRects().length > 0;
    const ouCarte = b => (typeof opt.carte === 'function' ? (b ? opt.carte(b) : null) : opt.carte || null);
    function marquer() {
      const bs = boutons(), c = bs.find(b => b.getAttribute('data-reserver') === choisie) || null;
      bs.forEach(b => { const oui = b === c; if (b.getAttribute('aria-pressed') !== String(oui)) b.setAttribute('aria-pressed', String(oui)); b.classList.toggle('est-choisi', oui); });
      if (opt.roving) { const t = c || bs[0]; bs.forEach(b => { b.tabIndex = b === t ? 0 : -1; }); }
      return c;
    }
    function vider(el) { if (!el) return; el.textContent = ''; el.removeAttribute('data-reserver-carte'); if (typeof opt.carte === 'function') el.hidden = true; }
    function dessinerCarte(el, d, b, { premier, avant, ouverture = false }) {
      const s = show(d.slug), fondAvant = premier || ouverture || !el.isConnected ? null : getComputedStyle(el).backgroundColor;
      const ancien = premier || ouverture ? null : document.createElement('div');
      if (ancien) while (el.firstChild) ancien.appendChild(el.firstChild);
      const co = typeof opt.carteOptions === 'function' ? opt.carteOptions(d) : opt.carteOptions || {};
      el.innerHTML = carte(d, co);
      varsDe(opt.univers ? opt.univers(s, d) : univers(s)).forEach(([k, v]) => el.style.setProperty(k, v));
      el.setAttribute('data-reserver-carte', cle(d));
      el.setAttribute('data-date-id', d.id ?? '');
      el.setAttribute('data-l', d.l ?? '');
      el.hidden = false;
      const origine = () => { if (!b) return { x: 0, y: 0 }; const r = el.getBoundingClientRect(), q = b.getBoundingClientRect(); return { x: q.left + q.width / 2 - r.left, y: q.top + q.height / 2 - r.top }; };
      (opt.effet || fonduBref)({ carte: el, bouton: b, date: d, show: s, avant, ancien, fondAvant, premier: !!premier, ouverture: !!ouverture, origine });
    }
    function choisir(k, { geste = true, premier = false } = {}) {
      k = k == null ? null : String(k);
      if (opt.basculer && geste && k === choisie) k = null;
      const d = dateDe(k);
      if (k != null && !d) return;
      const avant = dateDe(choisie);
      if (k === choisie && !premier) return;
      choisie = k;
      const b = marquer();
      const el = d ? ouCarte(b) : null;
      if (conteneur && conteneur !== el) vider(conteneur);
      if (d && el) dessinerCarte(el, d, b, { premier, ouverture: !premier && conteneur !== el, avant: conteneur === el ? avant : null });
      conteneur = el;
      if (opt.adresse && geste) garderAdresse(k);
      if (opt.surChoix) opt.surChoix(d, k);
    }
    // une liste redessinée par la maquette (un filtre, D qui change) : les boutons et la carte reprennent l'état, sans transition
    function dessiner() {
      const b = marquer(), d = dateDe(choisie), el = d && b ? ouCarte(b) : null;
      if (conteneur && conteneur !== el && conteneur.isConnected) vider(conteneur);
      conteneur = el;
      if (d && el) dessinerCarte(el, d, b, { premier: true, avant: null });
    }
    // la bande défile jusqu'au bouton choisi (sans faire défiler la page)
    function montrer(k = choisie) {
      const b = boutonDe(k), bande = b && b.closest('.rs-bande');
      if (!b || !bande || bande.scrollWidth <= bande.clientWidth) return;
      const r = bande.getBoundingClientRect(), q = b.getBoundingClientRect();
      bande.scrollLeft += q.left - r.left - (r.width - q.width) / 2;
    }
    racine.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('[data-reserver]');
      if (b && racine.contains(b)) choisir(b.getAttribute('data-reserver'), { geste: true });
    }, sig);
    racine.addEventListener('keydown', e => {
      const b = e.target.closest && e.target.closest('[data-reserver]');
      if (!b || !racine.contains(b) || e.altKey || e.ctrlKey || e.metaKey) return;
      const v = opt.axe === 'hv', bs = boutons().filter(visible), i = bs.indexOf(b);
      if (i < 0) return;
      const j = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: bs.length - 1, ...(v ? { ArrowDown: i + 1, ArrowUp: i - 1 } : {}) }[e.key];
      if (j === undefined) return;
      e.preventDefault();
      const c = bs[Math.max(0, Math.min(bs.length - 1, j))];
      if (c === b) return;
      if (opt.roving) { b.tabIndex = -1; c.tabIndex = 0; }
      c.focus({ preventScroll: !!c.closest('.rs-bande') });
      const bande = c.closest('.rs-bande');
      if (bande) { const r = bande.getBoundingClientRect(), q = c.getBoundingClientRect(); if (q.left < r.left || q.right > r.right) bande.scrollBy({ left: q.left < r.left ? q.left - r.left - 24 : q.right - r.right + 24, behavior: permis() ? 'smooth' : 'auto' }); }
    }, sig);
    const k0 = opt.choisie === 'premiere' ? (ds[0] ? cle(ds[0]) : null) : opt.choisie == null ? null : dateDe(String(opt.choisie)) ? String(opt.choisie) : (typeof opt.carte === 'function' ? null : ds[0] ? cle(ds[0]) : null);
    choisir(k0, { geste: false, premier: true });
    return {
      choisir: (k, x = {}) => choisir(k, Object.assign({ geste: true }, x)), dessiner, montrer,
      cle: () => choisie, date: () => dateDe(choisie),
      detruire: () => { if (ctl) ctl.abort(); },
    };
  }

  /* ---------------------------------------------------------------------------------------------- les styles de base */
  const STYLE = `
:where(.rs-bande) { display: flex; gap: 8px; overflow-x: auto; overscroll-behavior-x: contain; scroll-snap-type: x mandatory; scrollbar-width: thin; }
:where(.rs-bande) > :where(*) { flex: none; scroll-snap-align: start; }
:where(.rs-date) { position: relative; display: inline-flex; flex-direction: column; align-items: flex-start; gap: 2px; font: inherit; color: inherit; text-align: left; cursor: pointer; }
:where(.rs-date .rs-sep) { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
:where(.rs-seance .ext) { display: inline-block; width: .72em; height: .72em; margin-left: .3em; fill: none; stroke: currentColor; stroke-width: 1.6; }
:where(.rs-masque) { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
:where(.rs-carte) { position: relative; isolation: isolate; overflow: hidden; background: var(--rs-fond2, #fff); color: var(--rs-texte, inherit); }
:where(.rs-photo) { position: absolute; z-index: -1; inset: 0 0 0 auto; width: 55%; height: 100%; object-fit: cover; opacity: .3; pointer-events: none; }
:where(.rs-liste) { list-style: none; display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; }
:where(.rs-seance) { display: inline-flex; align-items: baseline; gap: 8px; }
:where(.rs-reserver) { display: inline-flex; align-items: center; gap: 12px; background: var(--rs-accent, #000); color: var(--rs-sur-accent, #fff); text-decoration: none; }
:where(.rs-r) { display: flex; flex-direction: column; align-items: flex-start; }
:where(.rs-fleche) { width: 1.2em; height: 1.2em; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; flex: none; }
:where(.rs-agenda) { display: inline-flex; align-items: center; gap: 8px; font: inherit; color: inherit; cursor: pointer; }
`;
  (function styles() {
    if (typeof document === 'undefined' || document.getElementById('reserver-style') || !document.head) return;
    const s = document.createElement('style');
    s.id = 'reserver-style';
    s.textContent = STYLE;
    document.head.insertBefore(s, document.head.firstChild);
    // « Ajouter à mon agenda », où que soit la carte (sous la bande, sous une ligne) : un seul écouteur, délégué
    document.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('[data-reserver-ics]'); if (!b) return;
      const d = trouver(b.getAttribute('data-reserver-ics')); if (!d || !telecharger(d)) return;
      // (le fichier part sans rien montrer, le navigateur le range parfois en silence : le bouton le dit un instant, à la place
      // de son libellé (rien ne bouge autour), et le lecteur d'écran l'entend, role status ; libelles.agendaTelecharge)
      const m = b.parentElement && b.parentElement.querySelector('.rs-agenda-msg'), x = b.querySelector('span'), t = L().agendaTelecharge;
      if (!m || !x || !t) return;
      if (!b.__lib) b.__lib = x.textContent;
      m.textContent = t; x.textContent = t; clearTimeout(m.__t);
      m.__t = setTimeout(() => { m.textContent = ''; if (x.isConnected) x.textContent = b.__lib; }, 3200);
    });
  })();

  return { dates, cle, trouver, seances, heures, lien, lieu, commune, jours, bouton, bande, carte, univers, photo, permis, monter, ics, telecharger };
})();
