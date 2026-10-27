'use strict';
/* La bibliothèque d'icônes de l'administration (admin/index.html et ses modules) : chaque dessin n'existe qu'une fois,
   ici, sous un nom ; les modules ne portent plus leurs propres svg. Avant, les mêmes icônes (le calendrier, l'équipe,
   l'horloge, la roue dentée, les trois points, l'œil barré, la croix) étaient dessinées quatre fois, à quatre traits.
   - ICONES.svg(nom, { taille, trait = 2, classe }) : le svg prêt à poser dans un gabarit (viewBox 24 × 24, trait de la
     couleur du texte, bouts arrondis, aria-hidden : l'icône ne parle jamais seule, le libellé est à côté, en .sr ou en
     title). Sa taille est celle de la classe .ico (index.html : 16 px, flex: none) ; quand `taille` est donnée, elle
     passe par la variable --ico (style="--ico:22px"), jamais par les seuls attributs width / height : une règle CSS
     l'emporte sur eux, et la barre du téléphone n'a pas de règle pour ses svg. `classe` s'ajoute à .ico. Le trait reste
     ce qu'il était à chaque appel (1,9 au téléphone, 2,2 pour la loupe, le chevron du fil, l'actualisation et le
     planning, 2,4 pour la croix d'annonce) : l'unification du trait est l'affaire du lot 16. Un nom inconnu lève une
     erreur (jamais un trou muet). Les noms de rubriques (ICONES.ALIAS : dates, planning, lieux, feuilles) mènent au
     tracé partagé.
   - ICONES.TRACES (gelé) : nom → le dedans du svg ; ICONES.NOMS = ses clés (la petite vue d'essai #/essai/icones les
     montre toutes en grille, le nom sous chaque icône).
   - ICONES.ICO : l'objet 16 px aux noms de GESTES.ICO (haut, bas, plus, reglages, agenda, cache…), que gestes.js reprend
     quand ICONES est chargé (menus.js lit G.ICO : rien n'y change). L'espace de l'équipe ne charge pas ce module : gestes.js
     et planning.js y gardent leurs tracés.
   - ICONES.ornement : la tentacule en filigrane du tableau de bord (260 × 160, hors du carré 24 × 24).
   - ICONES.RENOMMAGE : l'ancien nom (fichier:nom) → le nom de la bibliothèque. Pour chaque doublon fusionné, le tracé du
     téléphone et du planning est celui retenu (le téléphone et le planning ne changent pas), les menus de GESTES
     prennent le leur :
       gestes:agenda, mobile:dates, tableau:prochaines → calendrier (celui du téléphone)
       gestes:reglages (le cercle aux huit rayons) → soleil ; tableau:reglages (la roue dentée) → engrenage ;
         ICO.reglages pointe sur engrenage (côté administration, les menus de GESTES changent donc d'aspect pour le rouage)
       mobile:equipe, tableau:equipe → equipe ; mobile:planning, tableau:journal → horloge (planning est l'alias de la rubrique)
       gestes:points (avec remplissage), mobile:plus → points (celui du téléphone : sans remplissage)
       gestes:cache, planning:masquer → oeil-barre (celui du planning) ; gestes:croix, planning:fermer → croix (celui du planning)
       gestes:gauche / droite, planning:avant / apres, index:CHEVRON_FIL → gauche / droite (le tracé du planning)
       gestes:plus, mobile:ajouter → plus ; tableau:actions, tableau:eclair → eclair
     Les svg 12 × 12 et 12 × 18 (les chevrons, la croix et la poignée de tableau.js, les chevrons du pied de fiche et du
     bouton « Plus » de l'en-tête) restent dans leurs modules, hors bibliothèque, comme la pieuvre et le fond de carte.
   Chargé avant gestes.js : le script principal lit LOUPE et ICONE_ACTUALISER à son évaluation, et gestes.js son ICO.
   API : ICONES.svg(nom, options)   ICONES.TRACES   ICONES.NOMS   ICONES.ICO   ICONES.ornement   ICONES.RENOMMAGE   ICONES.ALIAS */
const ICONES = (() => {
  // ------------------------------------------------------------------------------------------- les tracés
  const TRACES = Object.freeze({
    // ---- les flèches, les gestes courants (nées de GESTES.ICO)
    haut: '<path d="m6 15 6-6 6 6"/>',
    bas: '<path d="m6 9 6 6 6-6"/>',
    gauche: '<path d="m15 18-6-6 6-6"/>',
    droite: '<path d="m9 18 6-6-6-6"/>',
    points: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    ouvrir: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    externe: '<path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
    copier: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/>',
    dupliquer: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    tel: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1"/>',
    mel: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    message: '<path d="M4 5h16v11H8l-4 4z"/>',
    coche: '<path d="m5 12 4 4L19 7"/>',
    croix: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    moins: '<path d="M5 12h14"/>',
    carte: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
    feuille: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    soleil: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    oeil: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    'oeil-barre': '<path d="M10.6 5.1A9.9 9.9 0 0 1 12 5c5.4 0 8.8 4.6 9.8 6.4a1.3 1.3 0 0 1 0 1.2 15.5 15.5 0 0 1-2.4 3.2M6.6 6.6C4.4 8 2.9 10.2 2.2 11.4a1.3 1.3 0 0 0 0 1.2C3.2 14.4 6.6 19 12 19a9.6 9.6 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="M3 3l18 18"/>',
    poubelle: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    euro: '<path d="M18 6a7 7 0 1 0 0 12M4 10h10M4 14h10"/>',
    partager: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6"/>',
    alerte: '<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17h.01"/>',
    // ---- la barre du téléphone et les rubriques
    'tableau-de-bord': '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/>',
    calendrier: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    horloge: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    equipe: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.5a5 5 0 0 1 6 5"/>',
    installer: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M12 7v7M9 11l3 3 3-3"/>',
    spectacles: '<path d="M4 5h7v6a3.5 3.5 0 0 1-7 0z"/><path d="M13 9h7v6a3.5 3.5 0 0 1-7 0z"/><path d="M6 8h1M9 8h1M15 12h1M18 12h1"/>',
    diffusion: '<path d="M3 10v4h3l7 4V6l-7 4z"/><path d="M17 9a4 4 0 0 1 0 6"/>',
    mallette: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18"/>',
    ateliers: '<path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z"/>',
    texte: '<path d="M5 7V5h14v2M12 5v14M9 19h6"/>',
    journal: '<path d="M6 3h11a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6z"/><path d="M6 3v18M10 8h5M10 12h5"/>',
    // ---- les tuiles du tableau de bord
    eclair: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    bannette: '<path d="M3 13h5l2 3h4l2-3h5"/><path d="M5 5h14l2 8v6H3v-6z"/>',
    'presse-papiers': '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2"/><path d="m9 13 2 2 4-4"/>',
    histogramme: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    'calendrier-question': '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M10.5 14.5a1.7 1.7 0 1 1 2.3 1.6c-.6.3-.8.6-.8 1.2M12 19.5h.01"/>',
    crayon: '<path d="m4 20 4-1L19 8l-3-3L5 16z"/><path d="m14 7 3 3"/>',
    // ---- le planning (partagé avec l'équipe, qui garde ses tracés)
    aujourdhui: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><circle cx="12" cy="15" r="1.6" fill="currentColor" stroke="none"/>',
    personne: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/>',
    // ---- le script principal : la recherche, le témoin, la clé du mot de passe, le tableau de bord
    loupe: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
    actualiser: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4.5H15"/>',
    cle: '<circle cx="8" cy="15" r="4"/><path d="M10.8 12.2 20 3M16.5 6.5l3 3M14.5 8.5l2 2"/>',
    entonnoir: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
    engrenage: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    // ---- neufs : ce que les lots suivants dessinent (les vues, le thème, les réglages de la page, la fiche)
    liste: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r=".8"/><circle cx="4.5" cy="12" r=".8"/><circle cx="4.5" cy="18" r=".8"/>',
    grille: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    lune: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    moniteur: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    densite: '<path d="M4 6h16M4 10h16M4 14h16M4 18h16"/>',
    epingle: '<path d="M12 17v5"/><path d="M9 3h6l-1 6 3 3v2H7v-2l3-3z"/>',
    etoile: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    replier: '<path d="m7 11 5-5 5 5M7 18l5-5 5 5"/>',
    deplier: '<path d="m7 6 5 5 5-5M7 13l5 5 5-5"/>',
    'poignee-h': '<g fill="currentColor" stroke="none"><circle cx="6" cy="9.5" r="1.4"/><circle cx="12" cy="9.5" r="1.4"/><circle cx="18" cy="9.5" r="1.4"/><circle cx="6" cy="14.5" r="1.4"/><circle cx="12" cy="14.5" r="1.4"/><circle cx="18" cy="14.5" r="1.4"/></g>',
    'poignee-v': '<g fill="currentColor" stroke="none"><circle cx="9.5" cy="6" r="1.4"/><circle cx="14.5" cy="6" r="1.4"/><circle cx="9.5" cy="12" r="1.4"/><circle cx="14.5" cy="12" r="1.4"/><circle cx="9.5" cy="18" r="1.4"/><circle cx="14.5" cy="18" r="1.4"/></g>',
    coin: '<path d="M20 10 10 20M20 15l-5 5"/>',
    'coche-cercle': '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>',
    remplacant: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
    absent: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 10.3-5.2"/><path d="m15 15 6 6M21 15l-6 6"/>',
    cadenas: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    fiche: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M5.5 16c.6-1.8 2-2.5 3.5-2.5s2.9.7 3.5 2.5M14 10h4M14 14h4"/>',
    'vue-liste': '<rect x="3.5" y="4" width="17" height="4.5" rx="1.5"/><rect x="3.5" y="10" width="17" height="4.5" rx="1.5"/><rect x="3.5" y="16" width="17" height="4.5" rx="1.5"/>',
    'vue-tableur': '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 14.5h18M9.5 4v16"/>',
    'vue-carte': '<path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z"/><path d="M9 4v13.5M15 6.5V20"/>',
  });
  const NOMS = Object.keys(TRACES);

  // ------------------------------------------------------------------------------------------- les noms et les anciens noms
  // les rubriques gardent leur nom, le tracé est celui qu'elles partagent
  const ALIAS = Object.freeze({ dates: 'calendrier', planning: 'horloge', lieux: 'carte', feuilles: 'feuille' });
  // ancien fichier:nom → nom de la bibliothèque (voir l'en-tête)
  const RENOMMAGE = Object.freeze({
    'gestes:haut': 'haut', 'gestes:bas': 'bas', 'gestes:gauche': 'gauche', 'gestes:droite': 'droite', 'gestes:points': 'points', 'gestes:ouvrir': 'ouvrir', 'gestes:externe': 'externe',
    'gestes:copier': 'copier', 'gestes:tel': 'tel', 'gestes:mel': 'mel', 'gestes:coche': 'coche', 'gestes:croix': 'croix', 'gestes:plus': 'plus', 'gestes:moins': 'moins', 'gestes:carte': 'carte',
    'gestes:feuille': 'feuille', 'gestes:reglages': 'soleil', 'gestes:oeil': 'oeil', 'gestes:cache': 'oeil-barre', 'gestes:poubelle': 'poubelle', 'gestes:euro': 'euro', 'gestes:agenda': 'calendrier',
    'gestes:partager': 'partager', 'gestes:alerte': 'alerte', 'gestes:dupliquer': 'dupliquer', 'gestes:message': 'message',
    'mobile:tableau': 'tableau-de-bord', 'mobile:dates': 'calendrier', 'mobile:planning': 'horloge', 'mobile:equipe': 'equipe', 'mobile:plus': 'points', 'mobile:ajouter': 'plus', 'mobile:installer': 'installer',
    'tableau:actions': 'eclair', 'tableau:urgent': 'bannette', 'tableau:avant': 'presse-papiers', 'tableau:prochaines': 'calendrier', 'tableau:chiffres': 'histogramme', 'tableau:equipe': 'equipe',
    'tableau:diffusion': 'diffusion', 'tableau:propositions': 'calendrier-question', 'tableau:ateliers': 'ateliers', 'tableau:journal': 'horloge', 'tableau:spectacles': 'spectacles', 'tableau:memo': 'crayon',
    'tableau:reglages': 'engrenage', 'tableau:eclair': 'eclair', 'tableau:entonnoir': 'entonnoir',
    'planning:avant': 'gauche', 'planning:apres': 'droite', 'planning:ici': 'aujourdhui', 'planning:fermer': 'croix', 'planning:masquer': 'oeil-barre', 'planning:gens': 'personne',
    'index:LOUPE': 'loupe', 'index:ICONE_ACTUALISER': 'actualiser', 'index:cle': 'cle', 'index:CHEVRON_FIL': 'gauche', 'index:croix-annonce': 'croix',
  });

  // ------------------------------------------------------------------------------------------- le svg
  function svg(nom, { taille, trait = 2, classe } = {}) {
    // (Object.hasOwn : « constructor » ou « toString », hérités de Object, ne sont pas des icônes)
    const d = Object.hasOwn(TRACES, nom) ? TRACES[nom] : Object.hasOwn(ALIAS, nom) ? TRACES[ALIAS[nom]] : undefined;
    if (d === undefined) throw new Error(`ICONES.svg : l'icône « ${nom} » n'existe pas`);
    return `<svg class="ico${classe ? ` ${classe}` : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${trait}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${taille ? ` style="--ico:${taille}px"` : ''}>${d}</svg>`;
  }

  // l'objet 16 px aux noms de GESTES.ICO (menus.js : G.ICO) ; reglages est la roue dentée, cache l'œil barré, agenda le calendrier
  const CLES_ICO = { haut: 'haut', bas: 'bas', gauche: 'gauche', droite: 'droite', points: 'points', ouvrir: 'ouvrir', externe: 'externe', copier: 'copier', tel: 'tel', mel: 'mel', coche: 'coche', croix: 'croix', plus: 'plus', moins: 'moins', carte: 'carte', feuille: 'feuille', reglages: 'engrenage', oeil: 'oeil', cache: 'oeil-barre', poubelle: 'poubelle', euro: 'euro', agenda: 'calendrier', partager: 'partager', alerte: 'alerte', dupliquer: 'dupliquer', message: 'message' };
  const ICO = Object.freeze(Object.fromEntries(Object.entries(CLES_ICO).map(([cle, nom]) => [cle, svg(nom, { taille: 16 })])));

  // la tentacule en filigrane du tableau de bord (hors du carré 24 × 24 : 260 × 160)
  const ornement = '<svg class="tb-salut-orne" viewBox="0 0 260 160" aria-hidden="true" focusable="false"><path d="M-10 150 C 40 150, 70 60, 130 50 C 185 41, 230 70, 232 110 C 234 140, 205 150, 195 132 C 186 116, 206 104, 214 118" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/><g fill="currentColor"><circle cx="48" cy="118" r="5"/><circle cx="72" cy="88" r="5"/><circle cx="100" cy="64" r="5"/><circle cx="135" cy="54" r="5"/><circle cx="170" cy="56" r="5"/><circle cx="203" cy="72" r="5"/><circle cx="224" cy="97" r="4.5"/><circle cx="222" cy="128" r="4"/></g></svg>';

  return { svg, TRACES, NOMS, ICO, ornement, RENOMMAGE, ALIAS };
})();
