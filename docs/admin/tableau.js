'use strict';
/* Le tableau de bord de l'administration (#/accueil), sa page d'ouverture : ce qui presse et ce qui vient, en un écran,
   et le geste qui y mène en un clic. Chargé après index.html, equipe.js et disponibilites.js, dont il reprend l'état (E),
   le client (sb) et les outils (cadre, annoncer, aCompleterAvant, resteFeuille, equipeDeLaDate…).
   - Des tuiles (TUILES), chacune sur ce que l'administration a déjà en mémoire : les actions rapides ; à traiter (les
     demandes de devis à répondre, les relances en retard, les notes de frais à valider, les options à confirmer, les dates
     sans horaire, les contrats à suivre, les feuilles de route à publier, les propositions en attente, les invitations
     pro qui échoient, les portraits sans accord) ; à compléter avant la tournée ; les prochaines dates ; la saison en
     chiffres ; qui part bientôt ; la diffusion ; les propositions de dates ; les séances d'atelier ; les dernières
     modifications ; les spectacles ; un mémo. Chaque ligne mène là où l'on agit, le champ visé prenant le focus
     (data-viser). Une tuile dont la base n'a pas les tables (E.ideale, E.sql4, E.sql5, E.equipeInstallee) ne se montre pas.
   - Entièrement personnalisable, « Personnaliser » : l'ordre (glisser une tuile par son titre, ou ← →), la taille (une,
     deux colonnes ou toute la largeur), masquer ou remettre une tuile, la réduire ; les réglages de chaque tuile (⚙ : la
     période, le nombre de lignes, ce qu'elle suit) ; les colonnes de la grille ; la page d'ouverture de l'administration.
   - Tout est gardé avec le compte (crescite_preferences, script SQL 6, clé accueil.tableau) : on retrouve son tableau sur
     tous ses appareils. Sans le script, sur cet appareil (localStorage) ; la disposition de l'appareil passe dans la base
     à la première ouverture qui suit.
   - Le temps réel de la base redessine les tuiles (rafraichir sur la grille, [data-liste]) ; le journal se relit alors,
     au plus toutes les cinq secondes. */
const TABLEAU = (() => {
  // ===================================================================================================== état
  const CLE_PREF = 'accueil.tableau', CLE_LOCAL = 'crescite-admin-tableau', VERSION = 1;
  const T = { conf: null, confDe: undefined, lecture: null, ecriture: Promise.resolve(), prefs: null, minuteur: null,
    edition: false, journal: null, journalLu: 0, journalLecture: null, journalDiffere: null, propLecture: null, ouverts: new Set(), glisse: null, memoMinuteur: null,
    filtre: null, voirReportees: false, glisseObjet: null, fileIndex: 0, fileCle: null, vueAuto: '' };
  const absent = e => !!e && /PGRST202|PGRST205|42883|42P01|Could not find the (function|table)|does not exist|schema cache/i.test(`${e.code || ''} ${e.message || ''}`);
  const uid = () => E.session?.user?.id || null;

  // ===================================================================================================== outils
  const pl = (n, un, plusieurs) => `${n} ${n > 1 ? plusieurs || `${un}s` : un}`;
  const fin = d => d.fin || d.debut;
  const aVenir = d => fin(d) >= AUJ;
  const sansJour = d => d.precision === 'mois' || d.precision === 'saison';
  const dansJours = j => Math.round((Date.parse(`${j}T12:00:00Z`) - Date.parse(`${AUJ}T12:00:00Z`)) / 864e5);
  const dansTexte = j => { const n = dansJours(j); return n < 0 ? `il y a ${pl(-n, 'jour')}` : n === 0 ? 'aujourd’hui' : n === 1 ? 'demain' : n < 14 ? `dans ${n} jours` : n < 60 ? `dans ${pl(Math.round(n / 7), 'semaine')}` : `dans ${pl(Math.round(n / 30), 'mois', 'mois')}`; };
  const depuisTexte = q => { const m = Math.round((Date.now() - Date.parse(q)) / 6e4); return m < 1 ? 'à l’instant' : m < 60 ? `il y a ${m} min` : m < 1440 ? `il y a ${pl(Math.round(m / 60), 'heure')}` : m < 43200 ? `il y a ${pl(Math.round(m / 1440), 'jour')}` : jourSansAn(String(q).slice(0, 10)); };
  const euros = n => `${(Number(n) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  const entier = n => Number(n || 0).toLocaleString('fr-FR');
  const jj = j => (j ? `<span class="tb-jj"><b>${+j.slice(8, 10)}</b>${MC[+j.slice(5, 7) - 1]}</span>` : '<span class="tb-jj"></span>');
  const ouDe = d => { const l = lieu(d.lieu_id); return l ? (l.nom ? `${l.nom}, ${l.commune}` : l.commune) : (d.intitule || '').split(' — ')[1] || 'lieu à préciser'; };
  const titreDate = d => spectacle(d.spectacle_id)?.titre || 'Spectacle à préciser';
  const couleurDate = d => couleurSp(spectacle(d.spectacle_id));
  const sp = id => spectacle(id);
  const parDebut = (a, b) => (a.debut < b.debut ? -1 : a.debut > b.debut ? 1 : a.id - b.id);
  const heuresDe = d => {
    const reps = repsDe(d.id), jours = new Set(reps.map(r => r.jour));
    if (!reps.length) return '';
    return `<span class="reps">${reps.slice(0, 4).map(r => `<span class="rep${r.public === 'scolaire' ? ' sco' : ''}${r.annulee ? ' ann' : ''}">${jours.size > 1 ? `${+r.jour.slice(8, 10)}/${+r.jour.slice(5, 7)} ` : ''}${r.heure ? AGENDA.heureTexte(h5(r.heure)) : 'heure ?'}</span>`).join('')}${reps.length > 4 ? `<span class="rep">+${reps.length - 4}</span>` : ''}</span>`;
  };
  const badgesDate = d => [d.statut === 'option' && '<span class="badge option">Option</span>', d.statut === 'reportee' && '<span class="badge option">Reportée</span>',
    d.statut === 'annulee' && '<span class="badge annulee">Annulée</span>', d.public === 'scolaire' && '<span class="badge sco">Scolaire</span>', d.public === 'mixte' && '<span class="badge sco">Mixte</span>',
    d.nature && d.nature !== 'representations' && `<span class="badge">${esc((NATURES_DATE.find(x => x[0] === d.nature) || [])[1] || d.nature)}</span>`].filter(Boolean).join('');
  // une ligne du tableau : ce qui est à gauche (le jour, un avatar), le titre et son sous-titre, ce qui est à droite
  const ligne = ({ href, viser, couleur, gauche, titre, sous, droite, classe, externe, attrs = '' }) => `<a class="tb-l${gauche ? '' : ' sans-gauche'}${classe ? ` ${classe}` : ''}" href="${esc(href)}"${viser ? ` data-viser="${esc(viser)}"` : ''}${externe ? ' target="_blank" rel="noopener"' : ''}${couleur ? ` style="--c:${esc(couleur)}"` : ''}${attrs ? ` ${attrs}` : ''}>${gauche || ''}<span class="tb-l-corps"><span class="tb-l-t">${titre}</span>${sous ? `<span class="tb-l-s">${sous}</span>` : ''}</span>${droite ? `<span class="tb-l-d">${droite}</span>` : ''}</a>`;
  const rien = (texte, ok = false) => `<p class="tb-rien${ok ? ' ok' : ''}">${texte}</p>`;
  const plus = (n, href, texte = 'Tout voir') => (n > 0 ? `<a class="tb-plus" href="${esc(href)}">${n > 1 ? `Et ${n} autres` : 'Et une autre'} · ${texte} →</a>` : '');
  // l'auteur d'une modification, comme le journal : un administrateur (son nom), une personne de l'équipe qui a modifié
  // depuis son espace (le quatorzième script : son nom, « équipe »), le compte connecté, sinon un import
  const nomAdmin = id => {
    const a = E.admins.find(x => x.user_id === id);
    if (a?.nom) return a.nom;
    const f = id ? (E.privees || []).find(x => x.user_id === id) : null, p = f ? personne(f.personne_id) : null;
    if (p && nomDe(p)) return a ? nomDe(p) : `${nomDe(p)} (équipe)`;
    return id === uid() ? E.session.user.email : id ? (a ? 'un administrateur' : 'un autre compte') : 'import';
  };
  // le bilan d'une proposition de dates : combien de disponibles, de pas disponibles, de peut-être, sans réponse
  const reponseDe = (jour, pid) => (jour.reponses || []).find(r => String(r.personne_id) === String(pid))?.reponse || 'attente';
  const bilanDe = p => { const n = { oui: 0, non: 0, peut_etre: 0, attente: 0 }; for (const j of p.jours || []) for (const d of p.destinataires || []) n[reponseDe(j, d.personne_id)]++; return n; };
  const bilanHtml = n => [['oui', '✓', 'disponible'], ['non', '✗', 'pas disponible'], ['peut_etre', '?', 'peut-être'], ['attente', '…', 'en attente']]
    .filter(([k]) => n[k]).map(([k, s, t]) => `<span class="dp-r ${k === 'peut_etre' ? 'pe' : k}"><span aria-hidden="true">${s}</span> ${n[k]}<span class="sr"> ${t}</span></span>`).join(' ') || '<span class="compte">personne à prévenir</span>';
  const SVG = {
    reglages: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    chevron: '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    poignee: '<svg viewBox="0 0 12 18" width="10" height="15" fill="currentColor" aria-hidden="true"><circle cx="3.5" cy="3" r="1.6"/><circle cx="8.5" cy="3" r="1.6"/><circle cx="3.5" cy="9" r="1.6"/><circle cx="8.5" cy="9" r="1.6"/><circle cx="3.5" cy="15" r="1.6"/><circle cx="8.5" cy="15" r="1.6"/></svg>',
    croix: '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    eclair: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
    entonnoir: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 5h18l-7 8v6l-4 2v-8z"/></svg>',
  };

  // ===================================================================================================== les tuiles
  const TAILLES = [['p', '1', 'Une colonne'], ['m', '2', 'Deux colonnes'], ['g', '⟷', 'Toute la largeur']];
  const JOURS = [[7, '7 jours'], [14, '14 jours'], [30, '30 jours'], [60, '60 jours'], [90, '90 jours']];
  // les actions rapides possibles : clé, libellé, adresse (ou action spéciale), quand elle est là
  const ACTIONS = [
    ['date', '＋ Nouvelle date', '#/representations/nouvelle'],
    ['proposer', '＋ Proposer des dates', '#/planning/proposer', () => E.equipeInstallee && E.sql5 !== false],
    ['personne', '＋ Nouvelle fiche', '#/equipe/nouvelle', () => E.equipeInstallee],
    ['lieu', '＋ Nouveau lieu', '#/lieux/nouveau'],
    ['seance', '＋ Séance d’atelier', '#/ateliers/seances/nouvelle'],
    ['invitation', '＋ Inviter une salle', '#/pro/nouvelle', () => E.sql4],
    ['prospect', '＋ Opportunité de diffusion', 'prospect', () => E.ideale],
    ['tableur', 'Tableur des séances', '#/representations/tableur'],
    ['feuilles', 'Feuilles de route', '#/feuilles', () => E.equipeInstallee],
    ['planning', 'Planning de l’équipe', '#/planning', () => E.equipeInstallee],
    ['devis', 'Demandes de devis', '#/diffusion/devis', () => E.ideale],
    ['frais', 'Notes de frais', '#/equipe/frais', () => E.ideale && E.equipeInstallee],
    ['journal', 'Journal des modifications', '#/journal'],
    ['site', 'Voir le site ↗', SITE, null, true],
    ['editer', 'Modifier sur le site ↗', `${SITE}?edition`, null, true],
    ['recherche', `Rechercher… ${RACCOURCI_RCH}`, 'recherche'],
  ];
  const ACTIONS_DEFAUT = ['date', 'proposer', 'personne', 'lieu', 'seance', 'invitation', 'prospect', 'tableur', 'editer', 'recherche'];
  // ce qu'il y a à traiter : une catégorie par source, chacune avec ses lignes (tri : la plus urgente d'abord)
  const CATEGORIES = [
    { k: 'devis', titre: 'Demandes de devis à répondre', tout: '#/diffusion/devis', dispo: () => E.ideale,
      lignes: () => (E.devis || []).filter(d => (d.statut || 'nouveau') === 'nouveau').map(d => ({ tri: String(d.cree_le), href: `#/diffusion/devis/${d.id}`, attrs: `data-devis="${d.id}"`, couleur: sp(d.spectacle_id) ? couleurSp(sp(d.spectacle_id)) : 'var(--option)',
        titre: esc(d.structure_nom), sous: esc([d.commune, sp(d.spectacle_id)?.titre, d.periode_souhaitee].filter(Boolean).join(' · ')), droite: `<span class="badge option">${esc(depuisTexte(d.cree_le))}</span>` })) },
    { k: 'relances', titre: 'Relances de diffusion en retard', tout: '#/diffusion', dispo: () => E.ideale,
      lignes: () => (E.prospects || []).filter(p => p.date_prochaine_relance && p.date_prochaine_relance <= AUJ && !['bilan', 'refus', 'converti_en_date'].includes(p.etape)).map(p => ({ tri: p.date_prochaine_relance, href: typeof TIROIR !== 'undefined' ? `#/diffusion/piste/${p.id}` : '#/diffusion', attrs: `data-prospect="${p.id}"`, couleur: sp(p.spectacle_id) ? couleurSp(sp(p.spectacle_id)) : 'var(--alerte)',
        titre: esc(p.structure), sous: esc([p.commune, sp(p.spectacle_id)?.titre, p.contact_nom].filter(Boolean).join(' · ')), droite: `<span class="badge annulee">relance ${esc(p.date_prochaine_relance === AUJ ? 'aujourd’hui' : `le ${jourSansAn(p.date_prochaine_relance)}`)}</span>` })) },
    { k: 'frais', titre: 'Notes de frais à valider', tout: '#/equipe/frais', dispo: () => E.ideale && E.equipeInstallee,
      lignes: () => (E.frais || []).filter(f => (f.statut || 'en_attente') === 'en_attente').map(f => ({ tri: String(f.cree_le), href: '#/equipe/frais', attrs: `data-frais="${f.id}"`, couleur: 'var(--option)',
        titre: esc(nomDe(personne(f.personne_id)) || 'Une personne'), sous: esc([CAT_FRAIS[f.categorie] || f.categorie, f.date_depense ? jourSansAn(f.date_depense) : '', f.commentaire].filter(Boolean).join(' · ')), droite: `<b>${esc(euros(f.montant_ttc))}</b>` })) },
    { k: 'options', titre: 'Options à confirmer', tout: '#/representations',
      lignes: () => E.dates.filter(d => d.statut === 'option' && aVenir(d) && !sansJour(d) && dansJours(d.debut) <= 60).map(d => ({ tri: d.debut, href: `#/representations/${d.id}`, viser: '[data-statut="confirmee"]', couleur: couleurDate(d),
        titre: esc(titreDate(d)), sous: `${esc(jourSansAn(d.debut))} · ${esc(ouDe(d))}`, droite: `<span class="badge option">${esc(dansTexte(d.debut))}</span>` })) },
    { k: 'heures', titre: 'Dates sans horaire', tout: '#/representations',
      lignes: () => E.dates.filter(d => d.statut === 'confirmee' && aVenir(d) && !sansJour(d) && (d.nature || 'representations') === 'representations' && dansJours(d.debut) <= 60 && (!repsDe(d.id).length || repsDe(d.id).some(r => !r.heure && !r.annulee)))
        .map(d => ({ tri: d.debut, href: `#/representations/${d.id}`, viser: repsDe(d.id).length ? '#d-reps input[type=time]' : '#d-vide', couleur: couleurDate(d), titre: esc(titreDate(d)), sous: `${esc(jourSansAn(d.debut))} · ${esc(ouDe(d))}`, droite: `<span class="badge option">${repsDe(d.id).length ? 'heure ?' : 'aucune représentation'}</span>` })) },
    { k: 'contrats', titre: 'Contrats à suivre', tout: '#/representations',
      lignes: () => E.dates.filter(d => d.statut === 'confirmee' && aVenir(d) && !sansJour(d) && (d.nature || 'representations') === 'representations' && dansJours(d.debut) <= 90)
        .map(d => ({ d, c: (E.suivis.find(s => s.date_id === d.id)?.contrat || '').trim() })).filter(x => x.c !== 'signé')
        .map(({ d, c }) => ({ tri: d.debut, href: `#/representations/${d.id}`, viser: '#s-contrat', couleur: couleurDate(d), titre: esc(titreDate(d)), sous: `${esc(jourSansAn(d.debut))} · ${esc(ouDe(d))}`, droite: `<span class="badge${c ? ' option' : ''}">${esc(c ? `contrat ${c}` : 'contrat ?')}</span>` })) },
    { k: 'feuilles', titre: 'Feuilles de route à publier', tout: '#/feuilles', dispo: () => E.equipeInstallee,
      lignes: () => E.dates.filter(d => d.statut === 'confirmee' && aVenir(d) && !sansJour(d) && dansJours(d.debut) <= 21).map(d => ({ d, f: E.feuilles.find(x => x.date_id === d.id) })).filter(x => !x.f || x.f.statut !== 'publiee')
        .map(({ d, f }) => ({ tri: d.debut, href: `#/feuilles/${d.id}`, viser: f ? '#fr-manques' : '#fr-composer', couleur: couleurDate(d), titre: esc(titreDate(d)), sous: `${esc(jourSansAn(d.debut))} · ${esc(ouDe(d))}`, droite: f ? `<span class="badge option">brouillon${aCompleter(d.id) ? ` · ${aCompleter(d.id)} à compléter` : ''}</span>` : '<span class="badge">à composer</span>' })) },
    { k: 'propositions', titre: 'Propositions de dates en attente', tout: '#/planning/propositions', dispo: () => E.equipeInstallee && E.sql5 !== false,
      lignes: () => (E.propositions || []).filter(p => p.statut === 'ouverte').map(p => { const n = bilanDe(p), tous = (p.jours || []).some(j => (p.destinataires || []).length && p.destinataires.every(d => reponseDe(j, d.personne_id) === 'oui'));
        return { tri: String(p.cree_le), href: `#/planning/proposition/${p.id}`, couleur: sp(p.spectacle_id) ? couleurSp(sp(p.spectacle_id)) : 'var(--accent)', titre: esc(p.titre), sous: bilanHtml(n),
          droite: tous ? '<span class="badge ok">un jour où tout le monde est libre</span>' : n.attente ? `<span class="badge option">${pl(n.attente, 'réponse')} en attente</span>` : '<span class="badge">à clore</span>' }; }) },
    { k: 'pro', titre: 'Invitations pro qui échoient', tout: '#/pro', dispo: () => E.sql4,
      lignes: () => (E.acces || []).filter(a => a.actif && a.expire_le >= AUJ && dansJours(a.expire_le) <= 15).map(a => ({ tri: a.expire_le, href: `#/pro/${a.id}`, attrs: `data-acces="${a.id}"`, couleur: 'var(--option)', titre: esc(a.nom), sous: esc([a.contact, visitesTexte(a)].filter(Boolean).join(' · ')), droite: `<span class="badge option">échoit ${esc(dansTexte(a.expire_le))}</span>` })) },
    { k: 'portraits', titre: 'Portraits sans accord de publication', tout: '#/equipe', dispo: () => E.equipeInstallee, defaut: false,
      lignes: () => (E.personnes || []).filter(p => p.photo && !p.photo_publique && p.publie !== false).map(p => ({ tri: norm(nomDe(p)), href: `#/equipe/${p.id}`, viser: 'photo_publique', couleur: 'var(--gris)', titre: esc(nomDe(p)), sous: esc((p.metiers || []).join(', ')), droite: '<span class="badge">accord à cocher</span>' })) },
  ];
  const CATEGORIES_DEFAUT = CATEGORIES.filter(c => c.defaut !== false).map(c => c.k);
  const saisonDecalee = (s, n) => { const [a, b] = String(s).split('-').map(Number); return Number.isFinite(a) && Number.isFinite(b) ? `${a + n}-${b + n}` : s; };
  // les chiffres d'une saison : les dates confirmées (représentations), les séances d'atelier, les spectateurs
  function chiffresSaison(S) {
    const ds = E.dates.filter(d => d.saison === S && (d.nature || 'representations') === 'representations');
    const confs = ds.filter(d => d.statut === 'confirmee'), ids = new Set(confs.map(d => d.id));
    const reps = confs.reduce((n, d) => { const r = E.reps.filter(x => x.date_id === d.id); return n + (r.length ? r.filter(x => !x.annulee).length : Math.max(1, d.nb_representations || 1)); }, 0);
    const avenir = confs.filter(aVenir).length;
    const lieux = new Set(confs.map(d => d.lieu_id).filter(Boolean)), deps = new Set([...lieux].map(id => lieu(id)?.departement).filter(Boolean));
    const seances = E.seances.filter(s => s.jour && AGENDA.saisonDe(s.jour) === S && s.statut !== 'annulee');
    const heures = seances.reduce((n, s) => n + heuresSeance(s), 0);
    const chiffres = E.chiffresInstalles ? (E.chiffres || []).filter(c => ids.has(c.date_id)) : [];
    return { dates: confs.length, avenir, passees: confs.length - avenir, reps, options: ds.filter(d => d.statut === 'option').length, scolaires: confs.filter(d => d.public === 'scolaire' || d.public === 'mixte').length,
      lieux: lieux.size, deps: deps.size, spectacles: new Set(confs.map(d => d.spectacle_id)).size, seances: seances.length, heures: Math.round(heures * 10) / 10,
      residences: E.dates.filter(d => d.saison === S && d.nature === 'residence' && d.statut !== 'annulee').length,
      spectateurs: E.chiffresInstalles ? chiffres.reduce((n, c) => n + (Number(c.spectateurs) || 0), 0) : null, renseignees: chiffres.filter(c => c.spectateurs != null).length };
  }
  // le lien d'une ligne du journal : la fiche qu'elle concerne, sinon le journal
  function lienJournal(j) {
    const x = j.apres || j.avant || {};
    const date = id => (E.dates.some(d => d.id === id) ? `#/representations/${id}` : '#/journal');
    switch (j.table_nom) {
      case 'crescite_dates': return j.operation === 'DELETE' ? '#/journal' : date(x.id);
      case 'crescite_representations': case 'crescite_dates_suivi': case 'crescite_dates_chiffres': case 'crescite_equipes': return date(x.date_id);
      case 'crescite_feuilles': return E.dates.some(d => d.id === x.date_id) ? `#/feuilles/${x.date_id}` : '#/journal';
      case 'crescite_lieux': case 'crescite_lieux_suivi': { const id = x.id ?? x.lieu_id; return E.lieux.some(l => l.id === id) ? `#/lieux/${id}` : '#/journal'; }
      case 'crescite_personnes': return (E.personnes || []).some(p => p.id === x.id) ? `#/equipe/${x.id}` : '#/journal';
      case 'crescite_spectacles': case 'crescite_distributions': case 'crescite_documents': { const s = sp(x.spectacle_id ?? x.id); return s ? `#/spectacles/${s.slug}` : '#/journal'; }
      case 'crescite_ateliers': return E.ateliers.some(a => a.id === x.id) ? `#/ateliers/catalogue/${x.id}` : '#/journal';
      case 'crescite_seances': return E.seances.some(s => s.id === x.id) ? `#/ateliers/seances/${x.id}` : '#/journal';
      case 'crescite_textes': return x.cle ? `#/textes/${encodeURIComponent(x.cle)}` : '#/journal';
      case 'crescite_notes_frais': return '#/equipe/frais';
      case 'crescite_devis_demandes': return `#/diffusion/devis/${x.id}`;
      case 'crescite_diffusion_prospects': return '#/diffusion';
      default: return '#/journal';
    }
  }
  const resumeJournal = j => { try { return resume(j) || ''; } catch { return j.ligne || ''; } };

  /* Chaque tuile : son titre, ce qu'elle montre (description, pour « Personnaliser »), sa taille et sa visibilité par
     défaut, quand elle est disponible (dispo), le lien « Tout voir », ses réglages (choix, case, cases), son corps
     (html, n : le compte du badge, ok : rien à faire), et ce qu'il faut préparer quand elle paraît (lire). */
  const TUILES = {
    actions: { titre: 'Actions rapides', description: 'Créer, proposer, inviter, ouvrir le tableur ou le site : chaque geste en un clic.', taille: 'g',
      reglages: [{ k: 'actions', t: 'cases', l: 'Les actions', choix: () => ACTIONS.filter(a => !a[3] || a[3]()).map(a => [a[0], a[1]]), defaut: ACTIONS_DEFAUT }],
      corps: r => {
        const xs = ACTIONS.filter(a => r.actions.includes(a[0]) && (!a[3] || a[3]()));
        return { html: xs.length ? `<div class="tb-actions">${xs.map(([k, l, href, , externe], i) => (href.startsWith('#') || externe
          ? `<a class="btn${i === 0 ? ' principal' : ''}" href="${esc(href)}" data-action="${k}"${externe ? ' target="_blank" rel="noopener"' : ''}>${esc(l)}</a>`
          : `<button type="button" class="btn${i === 0 ? ' principal' : ''}" data-tb-action="${esc(href)}" data-action="${k}">${esc(l)}</button>`)).join('')}</div>` : rien('Aucune action choisie : cochez-en dans les réglages (⚙).') };
      } },
    urgent: { titre: 'À traiter', description: 'Ce qui attend une réponse ou une décision : devis, relances, notes de frais, options, horaires, contrats, feuilles, propositions, invitations. Chaque ligne se traite sur place (l’éclair), s’épingle ou se reporte (clic droit).', taille: 'm', lien: () => null,
      reglages: [{ k: 'categories', t: 'cases', l: 'Ce que la tuile suit', choix: () => CATEGORIES.filter(c => !c.dispo || c.dispo()).map(c => [c.k, c.titre]), defaut: CATEGORIES_DEFAUT },
        { k: 'ordre', t: 'choix', l: 'Ordre', choix: [['sujet', 'Par sujet'], ['urgence', 'Par urgence (échéance et coût du retard)']], defaut: 'sujet' },
        { k: 'max', t: 'choix', l: 'Lignes par sujet', choix: [[3, '3'], [5, '5'], [10, '10']], defaut: 5 }],
      corps: r => {
        const U = urgences(r), html = [];
        const une = x => `<div class="tb-lt${x.epingle ? ' epingle' : ''}${x.reporte ? ' reportee' : ''}">${ligne({ ...x, attrs: `${x.attrs || ''} data-cle="${esc(x.cle)}"${x.sp ? ` data-sp="${x.sp}"` : ''}${x.date ? ` data-date="${x.date}"` : ''}`,
          droite: `${x.epingle ? '<span class="tb-epingle" title="Épinglée en haut">📌</span>' : ''}${x.reporte ? `<span class="badge">reportée au ${esc(jourSansAn(x.reporte))}</span>` : ''}${x.droite || ''}` })}${TRAITER[x.k] ? `<button type="button" class="tb-traiter" data-traiter="${esc(x.cle)}" title="Traiter sans quitter le tableau" aria-label="Traiter : ${esc(x.titreTexte)}">${SVG.eclair}</button>` : ''}</div>`;
        if (r.ordre === 'urgence') {
          const xs = U.lignes.filter(x => !x.reporte || T.voirReportees);
          html.push(xs.length ? `<section class="tb-cat tb-cat-plate">${xs.slice(0, r.max * 3).map(x => une({ ...x, sous: `<span class="tb-cat-tag">${esc(x.sujet)}</span> ${x.sous}` })).join('')}${plus(xs.length - r.max * 3, '#/representations', 'Tout voir')}</section>` : '');
        } else {
          for (const c of U.categories) {
            const xs = c.lignes.filter(x => !x.reporte || T.voirReportees);
            if (!xs.length) continue;
            html.push(`<section class="tb-cat"><h3><a href="${esc(c.tout)}">${esc(c.titre)}</a><span class="badge option">${xs.length}</span></h3>${xs.slice(0, r.max).map(une).join('')}${plus(xs.length - r.max, c.tout)}</section>`);
          }
        }
        if (U.reportees) html.push(`<p class="tb-note"><button type="button" class="lien-btn" data-tb-reportees aria-pressed="${T.voirReportees}">${T.voirReportees ? 'Cacher' : 'Montrer'} ${pl(U.reportees, 'ligne reportée', 'lignes reportées')}</button></p>`);
        return { n: U.total, ok: !U.total, html: html.join('') || rien('Rien à traiter : tout est à jour.', true) };
      } },
    avant: { titre: 'À compléter avant la tournée', description: 'Pour les dates confirmées qui viennent : les téléphones de l’équipe, les adresses et contacts des lieux, les feuilles de route.', taille: 'p', lien: () => ['#/representations', 'Représentations'],
      reglages: [{ k: 'jours', t: 'choix', l: 'Les dates confirmées des', choix: [[30, '30 prochains jours'], [60, '60 prochains jours'], [90, '90 prochains jours']], defaut: 60 }],
      corps: r => {
        const a = aCompleterAvant(r.jours);
        const quand = ds => `${ds.length > 1 ? 'les' : 'le'} ${ds.slice(0, 2).map(d => jourSansAn(d.debut)).join(', ')}${ds.length > 2 ? ` et ${ds.length - 2 > 1 ? `${ds.length - 2} autres` : 'une autre'}` : ''}`;
        const section = (titre, xs) => (xs.length ? `<section class="tb-cat"><h3>${titre}<span class="badge option">${xs.length}</span></h3>${xs.join('')}</section>` : '');
        const html = a.n ? section('Téléphones', a.pers.map(x => ligne({ href: `#/equipe/${x.p.id}`, viser: 'telephone', couleur: 'var(--option)', titre: esc(nomDe(x.p)), sous: `pas de téléphone · part ${esc(quand(x.dates))}` })))
          + section('Lieux', [...a.lieux.map(x => ligne({ href: `#/lieux/${x.l.id}`, viser: x.manque[0], couleur: 'var(--option)', titre: esc(x.l.nom ? `${x.l.nom}, ${x.l.commune}` : x.l.commune), sous: `${x.manque.map(m => `sans ${m}`).join(', ')} · ${esc(quand(x.dates))}` })),
            ...a.sansLieu.map(d => ligne({ href: `#/representations/${d.id}`, viser: '#d-lieu input', attrs: `data-date="${d.id}" data-sp="${d.spectacle_id}"`, couleur: couleurDate(d), titre: 'Lieu à préciser', sous: `${esc(titreDate(d))} · le ${esc(jourSansAn(d.debut))}` }))])
          + section('Feuilles de route', a.feuilles.map(x => ligne({ href: `#/feuilles/${x.d.id}`, viser: x.f ? '#fr-manques' : '#fr-composer', attrs: `data-date="${x.d.id}" data-sp="${x.d.spectacle_id}"`, couleur: couleurDate(x.d), titre: `${esc(jourSansAn(x.d.debut))} · ${esc(ouDe(x.d))}`, sous: esc(titreDate(x.d)), droite: x.f ? `<span class="badge option">${x.n} à compléter</span>` : '<span class="badge">à composer</span>' })))
          : rien(a.ds.length ? `Rien ne manque pour ${pl(a.ds.length, 'date confirmée')} : téléphones, lieux et feuilles de route sont complets.` : 'Aucune date confirmée dans cette période.', !!a.ds.length);
        return { n: a.n, ok: !a.n, html };
      } },
    prochaines: { titre: 'Prochaines dates', description: 'Les dates qui viennent, avec leurs horaires, leur lieu et l’état de leur feuille de route.', taille: 'p', lien: () => ['#/representations', 'Représentations'],
      reglages: [{ k: 'n', t: 'choix', l: 'Montrer', choix: [[5, '5 dates'], [8, '8 dates'], [12, '12 dates'], [20, '20 dates']], defaut: 8 }, { k: 'options', t: 'case', l: 'Les options aussi', defaut: true }, { k: 'autres', t: 'case', l: 'Répétitions, résidences et autres dates', defaut: true }],
      corps: r => {
        const xs = E.dates.filter(d => aVenir(d) && d.statut !== 'annulee' && (r.options || d.statut !== 'option') && (r.autres || (d.nature || 'representations') === 'representations')).sort(parDebut);
        return { html: xs.length ? xs.slice(0, r.n).map(d => ligne({ href: `#/representations/${d.id}`, attrs: `data-date="${d.id}" data-sp="${d.spectacle_id}"`, couleur: couleurDate(d), gauche: jj(d.debut), titre: esc(titreDate(d)), sous: `${esc(ouDe(d))}${d.fin && d.fin !== d.debut ? ` · jusqu’au ${esc(jourSansAn(d.fin))}` : ''}${heuresDe(d)}`,
          droite: `<span class="compte">${esc(dansTexte(d.debut))}</span>${badgesDate(d)}${E.equipeInstallee ? resteFeuille(d.id) : ''}${typeof PARCOURS !== 'undefined' ? PARCOURS.points(d) : ''}` })).join('') + plus(xs.length - r.n, '#/representations') : rien('Aucune date à venir.') };
      } },
    chiffres: { titre: 'La saison en chiffres', description: 'Dates, représentations, lieux, séances d’atelier et spectateurs de la saison, à côté de la précédente.', taille: 'p', lien: () => ['#/representations', 'Représentations'],
      reglages: [{ k: 'saison', t: 'choix', l: 'Saison', choix: () => { const s = AGENDA.saisonDe(AUJ); return [['courante', `En cours (${s})`], ['precedente', `Précédente (${saisonDecalee(s, -1)})`], ['prochaine', `Prochaine (${saisonDecalee(s, 1)})`]]; }, defaut: 'courante' }],
      corps: r => {
        const S = saisonDecalee(AGENDA.saisonDe(AUJ), r.saison === 'precedente' ? -1 : r.saison === 'prochaine' ? 1 : 0), c = chiffresSaison(S), p = chiffresSaison(saisonDecalee(S, -1));
        const kpi = (l, v, sous, href) => `<${href ? `a href="${esc(href)}"` : 'div'}><span>${l}</span><b>${v}</b>${sous ? `<small>${sous}</small>` : ''}</${href ? 'a' : 'div'}>`;
        const vs = (a, b, quoi = '') => (b ? `${entier(b)}${quoi} la saison d’avant` : '');
        return { html: `<p class="tb-saison">Saison <b>${esc(S)}</b>${c.options ? ` · ${pl(c.options, 'option')}` : ''}${c.residences ? ` · ${pl(c.residences, 'résidence')}` : ''}</p><div class="tb-kpi">
          ${kpi('Dates confirmées', entier(c.dates), c.dates ? `${c.passees} jouée${c.passees > 1 ? 's' : ''}, ${c.avenir} à venir` : vs(c.dates, p.dates), '#/representations')}
          ${kpi('Représentations', entier(c.reps), vs(c.reps, p.reps))}
          ${kpi('Lieux', entier(c.lieux), c.deps ? `dans ${pl(c.deps, 'département')}` : vs(c.lieux, p.lieux), '#/lieux')}
          ${kpi('Séances scolaires', entier(c.scolaires), c.scolaires || p.scolaires ? vs(c.scolaires, p.scolaires) : 'dates scolaires ou mixtes')}
          ${kpi('Séances d’atelier', entier(c.seances), c.heures ? `${entier(c.heures)} h d’éducation artistique` : vs(c.seances, p.seances), '#/ateliers/seances')}
          ${E.chiffresInstalles ? kpi('Spectateurs', entier(c.spectateurs), c.renseignees ? `sur ${pl(c.renseignees, 'date renseignée')}` : 'à renseigner dans chaque date') : kpi('Spectacles joués', entier(c.spectacles), vs(c.spectacles, p.spectacles), '#/spectacles')}
        </div>${courbesSaison(S, c, p)}` };
      } },
    equipe: { titre: 'Qui part bientôt', description: 'Les personnes de l’équipe en tournée dans les jours qui viennent, avec leur téléphone.', taille: 'p', dispo: () => E.equipeInstallee, lien: () => ['#/equipe', 'Équipe'],
      reglages: [{ k: 'jours', t: 'choix', l: 'Dans les', choix: JOURS.slice(0, 3), defaut: 14 }],
      corps: r => {
        const ds = E.dates.filter(d => d.statut === 'confirmee' && aVenir(d) && !sansJour(d) && dansJours(d.debut) <= r.jours).sort(parDebut);
        const pers = new Map();
        ds.forEach(d => equipeDeLaDate(d).forEach(x => { const p = personne(x.personne_id); if (!p) return; if (!pers.has(p.id)) pers.set(p.id, { p, fonctions: new Set(), dates: [] }); const o = pers.get(p.id); if (x.fonction) o.fonctions.add(x.fonction); o.dates.push(d); }));
        const xs = [...pers.values()].sort((a, b) => parDebut(a.dates[0], b.dates[0]) || norm(nomDe(a.p)).localeCompare(norm(nomDe(b.p))));
        return { n: xs.length, html: xs.length ? xs.map(x => { const tel = (priveeDe(x.p.id)?.telephone || '').trim(), href = tel ? (jetonsContact(tel).find(j => j.genre === 'tel') || {}).href : '';
          return ligne({ href: `#/equipe/${x.p.id}`, viser: tel ? '' : 'telephone', attrs: `data-personne="${x.p.id}" data-sp="${x.dates[0].spectacle_id}" draggable="true"`, couleur: couleurDate(x.dates[0]), gauche: avatar(x.p, true), titre: esc(nomDe(x.p)), sous: `${esc([...x.fonctions].join(', ') || (x.p.metiers || []).join(', '))}${x.fonctions.size || (x.p.metiers || []).length ? ' · ' : ''}${esc(x.dates.slice(0, 3).map(d => `${jourSansAn(d.debut)} ${ouDe(d).split(',').pop().trim()}`).join(', '))}${x.dates.length > 3 ? ` +${x.dates.length - 3}` : ''}`,
            droite: tel && href ? `<span class="tb-tel" data-tel="${esc(href)}">${esc(typeof FEUILLE !== 'undefined' ? FEUILLE.telTexte(tel) : tel)}</span>` : '<span class="badge option">téléphone ?</span>' }); }).join('')
          : rien(ds.length ? 'Aucune équipe de tournée connue pour ces dates.' : 'Aucune date confirmée dans cette période.') };
      } },
    diffusion: { titre: 'Diffusion', description: 'Le pipeline de tournée, les montants, les demandes de devis et les alertes de tournée du site.', taille: 'p', dispo: () => E.ideale, lien: () => ['#/diffusion', 'Diffusion'],
      corps: () => {
        const ps = E.prospects || [], actifs = ps.filter(p => !['bilan', 'refus', 'converti_en_date'].includes(p.etape));
        let nego = 0, signe = 0;
        ps.forEach(p => { const m = Number(p.montant_estime) || 0; if (p.etape === 'contrat_signe') signe += m; else if (!['bilan', 'refus', 'converti_en_date'].includes(p.etape)) nego += m; });
        const retard = ps.filter(p => p.date_prochaine_relance && p.date_prochaine_relance < AUJ && !['bilan', 'refus', 'converti_en_date'].includes(p.etape)).length;
        const devis = (E.devis || []), nouveaux = devis.filter(d => (d.statut || 'nouveau') === 'nouveau').length, enCours = devis.filter(d => ['en_cours', 'devis_envoye'].includes(d.statut)).length;
        const alertes = E.alertesInstallees ? E.alertes.filter(a => a.active && a.confirme_le).length : null, attente = E.alertesInstallees ? E.alertes.filter(a => a.active && !a.confirme_le).length : 0;
        const etapes = ETAPES_CRM.map(([k, l], i) => [k, l.replace(/^\d\.\s*/, ''), ps.filter(p => p.etape === k).length, `color-mix(in srgb, var(--accent) ${35 + i * 16}%, var(--carte))`]);
        const total = etapes.reduce((n, e) => n + e[2], 0);
        const kpi = (l, v, sous, href, classe = '') => `<a href="${esc(href)}"${classe ? ` class="${classe}"` : ''}><span>${l}</span><b>${v}</b>${sous ? `<small>${sous}</small>` : ''}</a>`;
        return { n: nouveaux + retard, html: `<div class="tb-kpi">
          ${kpi('Dossiers actifs', entier(actifs.length), retard ? `${pl(retard, 'relance')} en retard` : 'relances à jour', '#/diffusion', retard ? 'alerte' : '')}
          ${kpi('En négociation', euros(nego).replace(',00', ''), 'montants estimés', '#/diffusion')}
          ${kpi('Cessions confirmées', euros(signe).replace(',00', ''), '', '#/diffusion', 'ok')}
          ${kpi('Demandes de devis', entier(nouveaux), nouveaux ? `nouvelle${nouveaux > 1 ? 's' : ''}, à répondre` : enCours ? `${enCours} en cours` : 'rien de nouveau', '#/diffusion/devis', nouveaux ? 'alerte' : '')}
          ${alertes != null ? kpi('Alertes de tournée', entier(alertes), attente ? `${attente} en attente de confirmation` : 'confirmées', '#/diffusion/alertes') : ''}</div>
          ${total ? `<div class="tb-pipe" role="img" aria-label="${esc(etapes.map(e => `${e[1]} : ${e[2]}`).join(', '))}">${etapes.filter(e => e[2]).map(e => `<span style="flex:${e[2]};background:${e[3]}" title="${esc(`${e[1]} : ${e[2]}`)}"></span>`).join('')}</div>
          <p class="tb-legende">${etapes.map(e => `<span><i style="background:${e[3]}"></i>${esc(e[1])} <b>${e[2]}</b></span>`).join('')}</p>` : rien('Aucune opportunité de diffusion pour l’instant.')}` };
      } },
    propositions: { titre: 'Propositions de dates', description: 'Les propositions ouvertes à l’équipe et leurs réponses jour par jour.', taille: 'p', dispo: () => E.equipeInstallee && E.sql5 !== false, lien: () => ['#/planning/propositions', 'Propositions'],
      reglages: [{ k: 'n', t: 'choix', l: 'Montrer', choix: [[4, '4 propositions'], [8, '8 propositions'], [15, '15 propositions']], defaut: 4 }],
      lire: () => { if (E.propositionsLues || E.sql5 === false || typeof DISPONIBILITES === 'undefined') return null; if (!T.propLecture) T.propLecture = DISPONIBILITES.chargerPropositions().finally(() => { T.propLecture = null; }); return T.propLecture; },
      corps: r => {
        if (!E.propositionsLues) return { html: `<p class="tb-rien" role="status">${E.sql5Erreur ? `Les propositions n’ont pas pu être lues (${esc(E.sql5Erreur)}) : rechargez la page dans un moment.` : 'Lecture des propositions…'}</p>` };
        const xs = E.propositions.filter(p => p.statut === 'ouverte').sort((a, b) => (a.cree_le < b.cree_le ? 1 : -1));
        const bouton = '<a class="btn petit tb-bouton" href="#/planning/proposer">＋ Proposer des dates</a>';
        return { n: xs.length, html: (xs.length ? xs.slice(0, r.n).map(p => { const j0 = (p.jours || [])[0]; return ligne({ href: `#/planning/proposition/${p.id}`, attrs: `data-proposition="${p.id}"${p.spectacle_id ? ` data-sp="${p.spectacle_id}"` : ''} draggable="true"`, couleur: sp(p.spectacle_id) ? couleurSp(sp(p.spectacle_id)) : 'var(--accent)', gauche: jj(j0 ? String(j0.debut).slice(0, 10) : ''), titre: esc(p.titre),
          sous: `${esc(pl((p.destinataires || []).length, 'personne'))}${(p.jours || []).length > 1 ? ` · ${pl(p.jours.length, 'jour')}` : ''}${sp(p.spectacle_id) ? ` · ${esc(titreCourt(sp(p.spectacle_id)))}` : ''}<span class="dp-bilan">${bilanHtml(bilanDe(p))}</span>` }); }).join('') + plus(xs.length - r.n, '#/planning/propositions')
          : rien('Aucune proposition ouverte.')) + bouton };
      } },
    ateliers: { titre: 'Séances d’atelier à venir', description: 'Les séances menées dans les établissements dans les semaines qui viennent.', taille: 'p', lien: () => ['#/ateliers/seances', 'Ateliers'],
      reglages: [{ k: 'jours', t: 'choix', l: 'Dans les', choix: JOURS.slice(1, 4), defaut: 30 }],
      corps: r => {
        const xs = E.seances.filter(s => s.jour >= AUJ && dansJours(s.jour) <= r.jours && s.statut !== 'annulee').sort((a, b) => (a.jour < b.jour ? -1 : a.jour > b.jour ? 1 : String(a.heure_debut || '').localeCompare(String(b.heure_debut || ''))));
        const heures = xs.reduce((n, s) => n + heuresSeance(s), 0);
        return { n: xs.length, html: xs.length ? xs.slice(0, 8).map(s => { const a = E.ateliers.find(x => x.id === s.atelier_id), l = lieu(s.lieu_id), spx = sp(s.spectacle_id || a?.spectacle_id);
          return ligne({ href: `#/ateliers/seances/${s.id}`, attrs: `data-seance="${s.id}"${spx ? ` data-sp="${spx.id}"` : ''}`, couleur: couleurSp(spx), gauche: jj(s.jour), titre: esc(a?.titre || spx?.titre || 'Séance d’atelier'), sous: esc([l ? (l.nom || l.commune) : s.etablissement, s.classe, s.niveau, s.nb_eleves ? pl(s.nb_eleves, 'élève') : ''].filter(Boolean).join(' · ')),
            droite: `<span class="compte">${s.heure_debut ? esc(AGENDA.heureTexte(h5(s.heure_debut)) + (s.heure_fin ? `–${AGENDA.heureTexte(h5(s.heure_fin))}` : '')) : 'heure ?'}</span>${s.statut === 'option' ? '<span class="badge option">Option</span>' : ''}` }); }).join('')
          + plus(xs.length - 8, '#/ateliers/seances') + `<p class="tb-note">${pl(xs.length, 'séance')}${heures ? ` · ${entier(Math.round(heures * 10) / 10)} h d’éducation artistique` : ''}</p>` : rien('Aucune séance d’atelier dans cette période.') };
      } },
    journal: { titre: 'Dernières modifications', description: 'Ce qui vient de changer dans la base, par qui ; chaque ligne mène à la fiche.', taille: 'p', lien: () => ['#/journal', 'Journal'],
      reglages: [{ k: 'n', t: 'choix', l: 'Montrer', choix: [[5, '5 modifications'], [8, '8 modifications'], [15, '15 modifications']], defaut: 8 }],
      lire: () => lireJournal(),
      corps: r => {
        if (!T.journal) return { html: '<p class="tb-rien" role="status">Lecture du journal…</p>' };
        const xs = T.journal.filter(j => j.operation !== 'UPDATE' || champsChanges(j).length).slice(0, r.n);
        return { html: xs.length ? xs.map(j => { const ch = champsChanges(j), diff = diffDe(j); return `<div class="tb-lt">${ligne({ href: lienJournal(j), attrs: `data-j="${j.id}"${diff.length ? ` data-diff="${esc(JSON.stringify(diff))}"` : ''}`, couleur: j.operation === 'DELETE' ? 'var(--alerte)' : j.operation === 'INSERT' ? 'var(--ok)' : 'var(--trait)', titre: `${OPS_JOURNAL[j.operation] || j.operation} · ${esc(NOMS_TABLES[j.table_nom] || j.table_nom)}`,
          sous: `${esc(resumeJournal(j))}${ch.length ? ` — ${esc(ch.slice(0, 4).join(', '))}${ch.length > 4 ? '…' : ''}` : ''}`, droite: `<span class="compte">${esc(depuisTexte(j.quand))}</span><span class="compte">${esc(nomAdmin(j.qui))}</span>` })}${recente(j) ? `<button type="button" class="btn petit tb-annuler" data-tb-annuler="${j.id}" title="Annuler cette modification (un quart d’heure)">Annuler</button>` : ''}</div>`; }).join('') : rien('Rien encore.') };
      } },
    spectacles: { titre: 'Spectacles', description: 'Chaque spectacle, ses dates à venir et la prochaine ; sa fiche et ses dates en un clic.', taille: 'p', visible: false, lien: () => ['#/spectacles', 'Spectacles'],
      corps: () => {
        const xs = E.spectacles.filter(s => s.page).sort((a, b) => a.ordre - b.ordre);
        return { html: xs.length ? xs.map(s => { const ds = E.dates.filter(d => d.spectacle_id === s.id && aVenir(d) && d.statut !== 'annulee' && (d.nature || 'representations') === 'representations').sort(parDebut), confirmees = ds.filter(d => d.statut === 'confirmee'), d0 = ds[0];
          return `<div class="tb-sp" style="--c:${esc(couleurSp(s))}" data-sp="${s.id}"><span class="pastille"></span><span class="tb-l-corps"><a class="tb-l-t" href="#/spectacles/${esc(s.slug)}">${esc(s.titre)}</a><span class="tb-l-s">${d0 ? `${esc(jourSansAn(d0.debut))} · ${esc(ouDe(d0))}${d0.statut === 'option' ? ' (option)' : ''}` : 'aucune date à venir'}${s.publie ? '' : ' · non publié'}</span></span>
            <span class="tb-sp-boutons"><button type="button" class="tb-ico" data-tb-filtre="${s.id}" aria-pressed="${T.filtre === s.id}" title="Filtrer le tableau sur ce spectacle" aria-label="Filtrer le tableau sur ${esc(s.titre)}">${SVG.entonnoir}</button><button type="button" class="btn petit" data-tb-sp="${s.id}" aria-label="Les dates de ${esc(s.titre)}">${confirmees.length}${ds.length > confirmees.length ? ` + ${ds.length - confirmees.length} opt.` : ''} date${confirmees.length > 1 ? 's' : ''}</button></span></div>`; }).join('') : rien('Aucun spectacle.') };
      } },
    memo: { titre: 'Mémo', description: 'Un bloc-notes à vous : à rappeler, à ne pas oublier. Gardé avec votre compte.', taille: 'p', visible: false, lien: () => null,
      corps: r => ({ html: `<textarea class="tb-memo" aria-label="Mémo" placeholder="À rappeler, à ne pas oublier…" rows="7">${esc(r.texte || '')}</textarea><p class="tb-memo-etat compte" aria-live="polite"></p>` }) },
  };
  const reglagesDe = k => (TUILES[k].reglages || []).filter(r => !r.dispo || r.dispo());
  const choixDe = r => (typeof r.choix === 'function' ? r.choix() : r.choix || []);
  const dispo = k => !!TUILES[k] && (!TUILES[k].dispo || TUILES[k].dispo());

  // ===================================================================================================== la disposition
  const defauts = () => ({ v: VERSION, modifie: 0, colonnes: 'auto', depart: 'accueil', tuiles: Object.entries(TUILES).map(([k, t]) => ({ k, visible: t.visible !== false, taille: t.taille || 'p', replie: false, reglages: {} })), urgent: { epingles: [], reports: {} }, vues: [], vue: null, manuelLe: 0 });
  // une disposition lue (de la base, de l'appareil, d'une autre version) remise d'équerre : les tuiles connues dans l'ordre
  // donné, les nouvelles ajoutées à la fin avec leurs défauts
  function normaliser(c) {
    const d = defauts(), vues = new Set();
    const out = { v: VERSION, modifie: Number(c?.modifie) || 0, colonnes: ['auto', '2', '3', '4'].includes(String(c?.colonnes)) ? String(c.colonnes) : 'auto', depart: c?.depart === 'representations' ? 'representations' : 'accueil', tuiles: [],
      urgent: { epingles: Array.isArray(c?.urgent?.epingles) ? c.urgent.epingles.filter(x => typeof x === 'string').slice(0, 50) : [], reports: c?.urgent?.reports && typeof c.urgent.reports === 'object' ? Object.fromEntries(Object.entries(c.urgent.reports).filter(([, j]) => /^\d{4}-\d{2}-\d{2}$/.test(String(j)))) : {} },
      vues: (Array.isArray(c?.vues) ? c.vues : []).filter(v => v && typeof v.nom === 'string' && v.nom.trim()).slice(0, 12).map(v => ({ nom: String(v.nom).trim().slice(0, 40), tuiles: Array.isArray(v.tuiles) ? v.tuiles : [], colonnes: ['auto', '2', '3', '4'].includes(String(v.colonnes)) ? String(v.colonnes) : 'auto',
        auto: { jours: Array.isArray(v.auto?.jours) ? v.auto.jours.map(String).filter(x => /^[0-6]$/.test(x)) : [], periode: ['matin', 'apres'].includes(v.auto?.periode) ? v.auto.periode : '', veille: !!v.auto?.veille } })),
      vue: typeof c?.vue === 'string' && c.vue ? c.vue : null, manuelLe: Number(c?.manuelLe) || 0,
      base: c?.base && Array.isArray(c.base.tuiles) ? { tuiles: c.base.tuiles, colonnes: ['auto', '2', '3', '4'].includes(String(c.base.colonnes)) ? String(c.base.colonnes) : 'auto' } : null };
    if (out.vue && !out.vues.some(v => v.nom === out.vue)) out.vue = null;
    for (const x of Array.isArray(c?.tuiles) ? c.tuiles : []) {
      if (!x || !TUILES[x.k] || vues.has(x.k)) continue;
      vues.add(x.k);
      out.tuiles.push({ k: x.k, visible: x.visible !== false, taille: TAILLES.some(t => t[0] === x.taille) ? x.taille : (TUILES[x.k].taille || 'p'), replie: !!x.replie, reglages: x.reglages && typeof x.reglages === 'object' && !Array.isArray(x.reglages) ? x.reglages : {} });
    }
    d.tuiles.forEach(x => { if (!vues.has(x.k)) out.tuiles.push(x); });
    return out;
  }
  const conf = () => T.conf || (T.conf = normaliser(local()));
  const tuile = k => conf().tuiles.find(t => t.k === k);
  // la valeur d'un réglage d'une tuile : celle choisie si elle est permise, sinon la valeur par défaut
  function valeurs(k) {
    const t = tuile(k), out = {};
    for (const r of TUILES[k].reglages || []) {
      const v = t?.reglages?.[r.k], choix = choixDe(r).map(c => c[0]);
      if (r.t === 'cases') out[r.k] = Array.isArray(v) ? v.filter(x => choix.includes(x)) : r.defaut.filter(x => choix.includes(x) || !choix.length);
      else if (r.t === 'case') out[r.k] = typeof v === 'boolean' ? v : !!r.defaut;
      else if (r.t === 'texte') out[r.k] = typeof v === 'string' ? v : (r.defaut || '');
      else out[r.k] = choix.some(c => String(c) === String(v)) ? choix.find(c => String(c) === String(v)) : r.defaut;
    }
    if (TUILES[k] === TUILES.memo) out.texte = typeof t?.reglages?.texte === 'string' ? t.reglages.texte : '';
    return out;
  }
  const local = () => { try { const v = JSON.parse(localStorage.getItem(CLE_LOCAL) || 'null'); return v && typeof v === 'object' ? v : null; } catch { return null; } };
  const garderLocal = c => { try { if (c) localStorage.setItem(CLE_LOCAL, JSON.stringify(c)); else localStorage.removeItem(CLE_LOCAL); } catch { /* navigation privée */ } };
  const ecrirePref = async c => (await sb.from('crescite_preferences').upsert({ user_id: uid(), cle: CLE_PREF, valeur: c }, { onConflict: 'user_id,cle' })).error;
  // la disposition du compte, lue une fois par session (chargerTout l'attend : la page d'ouverture en dépend) ; sans le
  // script 6, celle de l'appareil, qui passe dans la base dès que le script est là
  function charger() {
    const u = uid();
    if (T.confDe !== u) Object.assign(T, { confDe: u, conf: null, lecture: null, prefs: null });
    if (!T.lecture) T.lecture = (async () => {
      const ici = local();
      if (!u) { T.conf = normaliser(ici); return; }
      const { data, error } = await sb.from('crescite_preferences').select('valeur').eq('user_id', u).eq('cle', CLE_PREF).maybeSingle();
      if (T.confDe !== u) return;
      if (error) { T.prefs = absent(error) ? 'absent' : 'erreur'; T.conf = normaliser(ici); return; }
      T.prefs = 'ok';
      // la base, sauf si l'appareil a une disposition plus récente qu'elle n'a pas reçue (une écriture coupée)
      if (data && data.valeur && typeof data.valeur === 'object' && !(ici && (Number(ici.modifie) || 0) > (Number(data.valeur.modifie) || 0))) { T.conf = normaliser(data.valeur); garderLocal(null); return; }
      T.conf = normaliser(ici);
      if (ici) ecrirePref(T.conf).then(err => { if (!err) garderLocal(null); }, () => {});
    })().catch(() => { if (!T.conf) T.conf = normaliser(local()); });
    return T.lecture;
  }
  // chaque changement s'enregistre, un peu après le dernier geste, dans l'ordre
  function garder(aussitot = false) {
    const c = conf();
    c.modifie = Date.now();
    garderLocal(c);          // sur l'appareil tout de suite ; la base un peu après le dernier geste
    clearTimeout(T.minuteur);
    T.minuteur = setTimeout(ecrireMaintenant, aussitot ? 0 : 700);
  }
  function ecrireMaintenant() {
    clearTimeout(T.minuteur); T.minuteur = null;
    const c = T.conf;
    if (!c) return;
    T.ecriture = T.ecriture.then(async () => {
      if (T.prefs === 'absent' || !uid()) return garderLocal(c);
      const err = await ecrirePref(c);
      if (!err) { T.prefs = 'ok'; garderLocal(null); return; }
      garderLocal(c);
      if (absent(err)) { T.prefs = 'absent'; return; }
      erreur(err, 'La disposition du tableau de bord n’est pas enregistrée dans votre compte (elle reste sur cet appareil)');
    }).catch(() => {});
  }
  window.addEventListener('pagehide', () => { if (T.minuteur) ecrireMaintenant(); });
  const depart = () => `#/${conf().depart === 'representations' ? 'representations' : 'accueil'}`;

  // ===================================================================================================== lire plus
  // le journal : ses dernières lignes, relues au plus toutes les cinq secondes (le temps réel ne porte pas le journal,
  // mais chaque changement d'une table fait rafraîchir la grille)
  function lireJournal(force = false) {
    if (T.journalLecture) return T.journalLecture;
    const attente = 5000 - (Date.now() - T.journalLu);
    if (!force && T.journal && attente > 0) {
      if (!T.journalDiffere) T.journalDiffere = setTimeout(() => { T.journalDiffere = null; if (location.hash === '#/accueil') { const p = lireJournal(true); if (p) p.then(() => { if (location.hash === '#/accueil') dessinerCorps('journal'); }); } }, attente);
      return null;
    }
    T.journalLecture = sb.from('crescite_journal').select('*').order('id', { ascending: false }).limit(20).then(({ data, error }) => {
      if (!error && data) { T.journal = data; T.journalLu = Date.now(); }
      else if (!T.journal) T.journal = [];
    }, () => { if (!T.journal) T.journal = []; }).finally(() => { T.journalLecture = null; });
    return T.journalLecture;
  }

  // ===================================================================================================== dessiner
  const visibles = () => conf().tuiles.filter(t => t.visible && dispo(t.k));
  const cachees = () => conf().tuiles.filter(t => !t.visible && dispo(t.k));
  function annoncerSr(texte) { const el = $('#tb-annonce'); if (el) { el.textContent = ''; setTimeout(() => { el.textContent = texte; }, 30); } }
  function formReglages(k) {
    const v = valeurs(k);
    return reglagesDe(k).map(r => {
      if (r.t === 'cases') return `<fieldset class="tb-cases"><legend>${esc(r.l)}</legend>${choixDe(r).map(([val, l]) => `<label class="case"><input type="checkbox" data-tb-reg="${esc(r.k)}" value="${esc(val)}"${v[r.k].includes(val) ? ' checked' : ''}> ${esc(l)}</label>`).join('')}</fieldset>`;
      if (r.t === 'case') return `<label class="case"><input type="checkbox" data-tb-reg="${esc(r.k)}"${v[r.k] ? ' checked' : ''}> ${esc(r.l)}</label>`;
      return `<label>${esc(r.l)} <select data-tb-reg="${esc(r.k)}">${choixDe(r).map(([val, l]) => `<option value="${esc(val)}"${String(v[r.k]) === String(val) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
    }).join('');
  }
  function corpsDe(k) {
    try { return TUILES[k].corps(valeurs(k)); } catch (e) { console.error(e); return { html: rien('Cette tuile n’a pas pu se dessiner.') }; }
  }
  function badgeDe(c) { return c.n ? `<span class="badge ${c.ok ? 'ok' : 'option'}">${c.n}</span>` : c.ok ? '<span class="badge ok">Rien</span>' : ''; }
  function htmlTuile(t, i, n) {
    const def = TUILES[t.k], c = corpsDe(t.k), lien = def.lien ? def.lien() : null, regl = reglagesDe(t.k), ouvert = T.ouverts.has(t.k);
    return `<section class="tb-tuile taille-${t.taille}${t.replie ? ' replie' : ''}" data-k="${t.k}" aria-labelledby="tb-t-${t.k}"${T.edition ? ' draggable="true"' : ''}>
      <header class="tb-tete"><h2 id="tb-t-${t.k}">${T.edition ? `<span class="tb-poignee" title="Glisser pour déplacer">${SVG.poignee}</span>` : ''}<span class="tb-ico-t" aria-hidden="true">${ICONES_TUILE[t.k] || ''}</span><span class="tb-titre">${esc(def.titre)}</span><span class="tb-badge">${badgeDe(c)}</span></h2>
        ${lien ? `<a class="tb-lien" href="${esc(lien[0])}" title="Ouvrir : ${esc(lien[1])}" aria-label="Ouvrir : ${esc(lien[1])}"><span class="mot">${esc(lien[1])}</span> →</a>` : ''}
        ${regl.length ? `<button type="button" class="tb-ico" data-tb-reglages aria-expanded="${ouvert}" aria-controls="tb-r-${t.k}" title="Réglages de la tuile" aria-label="Réglages : ${esc(def.titre)}">${SVG.reglages}</button>` : ''}
        <span class="tb-outils" role="group" aria-label="Disposition de la tuile">
          <button type="button" class="tb-ico" data-tb-deplacer="-1" title="Avancer" aria-label="Avancer : ${esc(def.titre)}"${i === 0 ? ' disabled' : ''}>←</button>
          <button type="button" class="tb-ico" data-tb-deplacer="1" title="Reculer" aria-label="Reculer : ${esc(def.titre)}"${i === n - 1 ? ' disabled' : ''}>→</button>
          <span class="seg" role="group" aria-label="Taille">${TAILLES.map(([k, l, titre]) => `<button type="button" data-tb-taille="${k}" aria-pressed="${t.taille === k}" title="${titre}" aria-label="${titre}">${l}</button>`).join('')}</span>
          <button type="button" class="tb-ico" data-tb-masquer title="Masquer la tuile" aria-label="Masquer : ${esc(def.titre)}">${SVG.croix}</button></span>
        <button type="button" class="tb-ico tb-replier" data-tb-replier aria-expanded="${!t.replie}" title="${t.replie ? 'Déployer' : 'Réduire'}" aria-label="${t.replie ? 'Déployer' : 'Réduire'} : ${esc(def.titre)}">${SVG.chevron}</button></header>
      ${regl.length ? `<div class="tb-reglages" id="tb-r-${t.k}"${ouvert ? '' : ' hidden'}>${formReglages(t.k)}</div>` : ''}
      <div class="tb-corps">${c.html}</div></section>`;
  }
  function panneau() {
    const c = conf(), xs = cachees();
    return `<div class="tb-pan-l"><span class="tb-pan-g"><span class="lib">Colonnes</span><span class="seg" role="group" aria-label="Colonnes de la grille">${[['auto', 'Auto'], ['2', '2'], ['3', '3'], ['4', '4']].map(([k, l]) => `<button type="button" data-tb-colonnes="${k}" aria-pressed="${c.colonnes === k}">${l}</button>`).join('')}</span></span>
      <span class="tb-pan-g"><span class="lib">À l’ouverture de l’administration</span><span class="seg" role="group" aria-label="Page d’ouverture">${[['accueil', 'Tableau de bord'], ['representations', 'Représentations']].map(([k, l]) => `<button type="button" data-tb-depart="${k}" aria-pressed="${c.depart === k}">${l}</button>`).join('')}</span></span>
      <span class="tb-pan-fin"><button type="button" class="btn petit" id="tb-reinit">Réinitialiser</button><button type="button" class="btn petit principal" id="tb-fini">Terminer</button></span></div>
      <div class="tb-pan-l"><span class="lib">Tuiles masquées</span>${xs.length ? xs.map(t => `<button type="button" class="puce" data-tb-montrer="${t.k}" title="${esc(TUILES[t.k].description)}">＋ ${esc(TUILES[t.k].titre)}</button>`).join('') : '<span class="compte">toutes les tuiles sont affichées</span>'}</div>
      <p class="aide">Glissez une tuile par son titre pour la déplacer, ou servez-vous des flèches ; chaque tuile se règle (le rouage), se réduit (le chevron), change de largeur (1, 2, ou toute la largeur) ou se masque (la croix). ${T.prefs === 'absent' ? 'La disposition est gardée sur cet appareil.' : 'La disposition est gardée avec votre compte, sur tous vos appareils.'}</p>`;
  }
  function dessiner() {
    const grille = $('#tb-grille');
    if (!grille) return;
    const xs = visibles();
    grille.dataset.colonnes = conf().colonnes;
    grille.classList.toggle('edition', T.edition);
    grille.innerHTML = xs.length ? xs.map((t, i) => htmlTuile(t, i, xs.length)).join('') : `<div class="bloc tb-vide">Toutes les tuiles sont masquées. ${T.edition ? 'Remettez-en depuis « Tuiles masquées », ci-dessus.' : '« Personnaliser » les remet.'}</div>`;
    const pan = $('#tb-panneau');
    if (pan) { pan.hidden = !T.edition; pan.innerHTML = T.edition ? panneau() + panneauVues() : ''; }
    const sel = $('#tb-vue'); if (sel) sel.outerHTML = htmlVues().replace(/^<label[^>]*>.*?<\/span>/, '').replace(/<\/label>$/, '');
    appliquerFiltre();
    $('#tb-personnaliser')?.setAttribute('aria-pressed', String(T.edition));
    const b = $('#tb-personnaliser'); if (b) b.textContent = T.edition ? 'Terminer' : 'Personnaliser';
  }
  // le corps d'une tuile (et son badge) : au temps réel, après un réglage ; le mémo en cours d'écriture n'est pas touché
  function dessinerCorps(k = null) {
    for (const t of visibles()) {
      if (k && t.k !== k) continue;
      const el = $(`.tb-tuile[data-k="${t.k}"]`);
      if (!el) continue;
      if (t.k === 'memo' && el.contains(document.activeElement)) continue;
      const c = corpsDe(t.k);
      $('.tb-corps', el).innerHTML = c.html;
      $('.tb-badge', el).innerHTML = badgeDe(c);
    }
    appliquerFiltre();
  }
  // ce que des tuiles doivent lire avant de se montrer : les propositions, le journal ; la tuile se redessine ensuite
  function preparer(force = false) {
    for (const t of visibles()) {
      const p = TUILES[t.k].lire ? TUILES[t.k].lire(force) : null;
      if (p && typeof p.then === 'function') p.then(() => { if (location.hash !== '#/accueil') return; if (!dispo(t.k) || T.edition) dessiner(); else dessinerCorps(); }, () => { if (location.hash === '#/accueil') dessinerCorps(t.k); });
    }
  }

  // ===================================================================================================== le bandeau du jour
  /* En haut du tableau : bonjour, le jour, ce qui attend une décision et la prochaine date, trois chiffres (à traiter, les
     dates sous sept jours, qui part sous quatorze), et une tentacule en filigrane. */
  const ORNEMENT = '<svg class="tb-salut-orne" viewBox="0 0 260 160" aria-hidden="true" focusable="false"><path d="M-10 150 C 40 150, 70 60, 130 50 C 185 41, 230 70, 232 110 C 234 140, 205 150, 195 132 C 186 116, 206 104, 214 118" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/><g fill="currentColor"><circle cx="48" cy="118" r="5"/><circle cx="72" cy="88" r="5"/><circle cx="100" cy="64" r="5"/><circle cx="135" cy="54" r="5"/><circle cx="170" cy="56" r="5"/><circle cx="203" cy="72" r="5"/><circle cx="224" cy="97" r="4.5"/><circle cx="222" cy="128" r="4"/></g></svg>';
  function bandeau(jour) {
    const h = new Date().getHours(), salut = h < 5 || h >= 18 ? 'Bonsoir' : 'Bonjour';
    const nom = (E.admins || []).find(a => a.user_id === uid())?.nom || '', prenom = String(nom).trim().split(/\s+/)[0] || '';
    let total = 0; try { total = urgences().total; } catch (e) { /* la tuile le dira */ }
    const semaine = E.dates.filter(d => d.statut !== 'annulee' && !sansJour(d) && (d.fin || d.debut) >= AUJ && d.debut <= plusJours(AUJ, 7));
    const partent = new Set();
    if (E.equipeInstallee) E.dates.filter(d => d.statut === 'confirmee' && aVenir(d) && !sansJour(d) && dansJours(d.debut) <= 14).forEach(d => { try { equipeDeLaDate(d).forEach(x => partent.add(x.personne_id)); } catch (e) { /* sans équipe */ } });
    const prochaine = E.dates.filter(d => aVenir(d) && d.statut !== 'annulee' && !sansJour(d)).sort(parDebut)[0];
    const phrase = total ? `${pl(total, 'chose attend', 'choses attendent')} votre décision` : 'Rien ne presse : tout est à jour';
    const suite = prochaine ? ` ; la prochaine date est ${dansTexte(prochaine.debut)}, ${titreDate(prochaine)}${lieu(prochaine.lieu_id) ? ` à ${ouDe(prochaine)}` : ''}.` : '.';
    return `<section class="tb-salut" aria-label="Aujourd’hui"><div class="tb-salut-corps"><h1>Tableau de bord</h1><p class="tb-bonjour">${salut}${prenom ? `, <b>${esc(prenom)}</b>` : ''}</p><p class="tb-salut-jour">${esc(jour)}</p><p class="tb-salut-sous">${esc(phrase + suite)}</p></div>
      <ul class="tb-salut-chiffres"><li><b>${total}</b><span>à traiter</span></li><li><b>${semaine.length}</b><span>${semaine.length > 1 ? 'dates' : 'date'} sous 7 jours</span></li>${E.equipeInstallee ? `<li><b>${partent.size}</b><span>${partent.size > 1 ? 'partent' : 'part'} sous 14 jours</span></li>` : ''}</ul>${ORNEMENT}</section>`;
  }
  // l'icône de chaque tuile (dans son en-tête)
  const ic = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICONES_TUILE = {
    actions: ic('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'), urgent: ic('<path d="M3 13h5l2 3h4l2-3h5"/><path d="M5 5h14l2 8v6H3v-6z"/>'),
    avant: ic('<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2"/><path d="m9 13 2 2 4-4"/>'), prochaines: ic('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
    chiffres: ic('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'), equipe: ic('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.5a5 5 0 0 1 6 5"/>'),
    diffusion: ic('<path d="M3 10v4h3l7 4V6l-7 4z"/><path d="M17 9a4 4 0 0 1 0 6"/>'), propositions: ic('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M10.5 14.5a1.7 1.7 0 1 1 2.3 1.6c-.6.3-.8.6-.8 1.2M12 19.5h.01"/>'),
    ateliers: ic('<path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z"/>'), journal: ic('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    spectacles: ic('<path d="M4 5h7v6a3.5 3.5 0 0 1-7 0z"/><path d="M13 9h7v6a3.5 3.5 0 0 1-7 0z"/><path d="M6 8h1M9 8h1M15 12h1M18 12h1"/>'), memo: ic('<path d="m4 20 4-1L19 8l-3-3L5 16z"/><path d="m14 7 3 3"/>'),
  };

  // ===================================================================================================== la vue
  function vue() {
    const jour = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    cadre('accueil', `${bandeau(jour[0].toUpperCase() + jour.slice(1))}<div class="tete tb-tete-page">
      ${htmlVues()}<button type="button" class="btn" id="tb-briefing" aria-haspopup="dialog" title="Le résumé de la semaine, à copier ou à imprimer">Briefing</button>
      <button type="button" class="btn" id="tb-personnaliser" aria-pressed="${T.edition}" aria-controls="tb-panneau">${T.edition ? 'Terminer' : 'Personnaliser'}</button></div>
      <p class="tb-filtre" id="tb-filtre" hidden></p>
      <div id="tb-panneau" class="bloc tb-panneau" hidden></div>
      <div class="tb-grille" id="tb-grille" data-liste aria-label="Tuiles du tableau de bord"></div>
      <p class="sr" id="tb-annonce" aria-live="polite"></p>`);
    const grille = $('#tb-grille');
    grille.rafraichir = () => { dessinerCorps(); preparer(); };
    vueAutomatique();
    dessiner();
    brancher();
    preparer();
  }
  function deplacer(k, sens) {
    const c = conf(), ordre = c.tuiles.map(t => t.k), vis = visibles().map(t => t.k), i = vis.indexOf(k), j = i + sens;
    if (i < 0 || j < 0 || j >= vis.length) return false;
    const a = ordre.indexOf(k), b = ordre.indexOf(vis[j]), t = c.tuiles[a];
    c.tuiles.splice(a, 1); c.tuiles.splice(b, 0, t);
    // (la tuile retirée puis remise à la place de sa voisine visible : les masquées entre les deux ne bougent pas de sens)
    return true;
  }
  function poser(k, avantK) {   // glisser-déposer : k vient juste avant avantK (null : à la fin)
    const c = conf(), t = tuile(k);
    if (!t || k === avantK) return;
    c.tuiles.splice(c.tuiles.indexOf(t), 1);
    const i = avantK ? c.tuiles.findIndex(x => x.k === avantK) : -1;
    if (i < 0) c.tuiles.push(t); else c.tuiles.splice(i, 0, t);
  }
  function brancher() {
    const vueEl = $('#vue');
    $('#tb-personnaliser').addEventListener('click', () => { T.edition = !T.edition; dessiner(); annoncerSr(T.edition ? 'Personnalisation : déplacez, redimensionnez, masquez les tuiles.' : 'Disposition enregistrée.'); });
    $('#tb-briefing')?.addEventListener('click', ouvrirBriefing);
    vueEl.addEventListener('change', e => {
      if (e.target.id !== 'tb-vue') return;
      const v = e.target.value;
      if (v === '+') { e.target.value = conf().vue || ''; formVue(null); return; }
      appliquerVue(v || null);
    });
    // survoler une date, un spectacle : ce qui les concerne s'allume ailleurs ; une ligne du fil montre son diff
    vueEl.addEventListener('mouseover', e => { const el = e.target.closest?.('#tb-grille [data-date], #tb-grille [data-sp]'); if (el) lier(el); const j = e.target.closest?.('#tb-grille a.tb-l[data-diff]'); if (j && !$('#tb-diff')) montrerDiff(j); });
    vueEl.addEventListener('mouseout', e => { const vers = e.relatedTarget; if (!vers || !vers.closest || !vers.closest('#tb-grille [data-date], #tb-grille [data-sp]')) delier(); if (!vers || !vers.closest || !vers.closest('#tb-grille a.tb-l[data-diff], #tb-diff')) cacherDiff(); });
    vueEl.addEventListener('focusin', e => { const el = e.target.closest?.('#tb-grille [data-date], #tb-grille [data-sp]'); if (el) lier(el); else delier(); });
    brancherGlisser(vueEl);
    vueEl.addEventListener('click', e => {
      const t = e.target.closest('[data-tb-reglages], [data-tb-replier], [data-tb-masquer], [data-tb-deplacer], [data-tb-taille], [data-tb-montrer], [data-tb-colonnes], [data-tb-depart], #tb-reinit, #tb-fini, [data-tb-action], [data-tb-sp], .tb-tel, [data-traiter], [data-tb-filtre], [data-tb-annuler], [data-tb-reportees], [data-tb-mois], [data-tb-vue-appliquer], [data-tb-vue-modifier], [data-tb-vue-nouvelle]');
      if (!t) return;
      const sec = t.closest('.tb-tuile'), k = sec?.dataset.k, tu = k && tuile(k);
      if (t.matches('[data-traiter]')) { T.fileIndex = lignesFile().indexOf(t.parentNode?.querySelector('a.tb-l')); traiter(t.dataset.traiter); }
      else if (t.matches('[data-tb-filtre]')) { filtrer(t.dataset.tbFiltre === '' || (T.filtre != null && Number(t.dataset.tbFiltre) === T.filtre) ? null : t.dataset.tbFiltre); }
      else if (t.matches('[data-tb-annuler]')) annulerJournal(t.dataset.tbAnnuler);
      else if (t.matches('[data-tb-reportees]')) { T.voirReportees = !T.voirReportees; dessinerCorps('urgent'); appliquerFiltre(); $('[data-tb-reportees]')?.focus(); }
      else if (t.matches('[data-tb-mois]')) chercherMois(t.dataset.tbMois);
      else if (t.matches('[data-tb-vue-appliquer]')) appliquerVue(conf().vue === t.dataset.tbVueAppliquer ? null : t.dataset.tbVueAppliquer);
      else if (t.matches('[data-tb-vue-modifier]')) formVue(vueNommee(t.dataset.tbVueModifier));
      else if (t.matches('[data-tb-vue-nouvelle]')) formVue(null);
      else if (t.matches('[data-tb-reglages]')) {
        const z = $('.tb-reglages', sec), ouvert = z.hidden;
        z.hidden = !ouvert; t.setAttribute('aria-expanded', String(ouvert));
        if (ouvert) { T.ouverts.add(k); $('select, input', z)?.focus(); } else T.ouverts.delete(k);
      } else if (t.matches('[data-tb-replier]')) {
        tu.replie = !tu.replie; sec.classList.toggle('replie', tu.replie);
        t.setAttribute('aria-expanded', String(!tu.replie)); t.title = tu.replie ? 'Déployer' : 'Réduire'; t.setAttribute('aria-label', `${t.title} : ${TUILES[k].titre}`);
        garder();
      } else if (t.matches('[data-tb-masquer]')) {
        tu.visible = false; garder(); dessiner();
        annoncerSr(`${TUILES[k].titre} masquée.`); ($(`[data-tb-montrer="${k}"]`) || $('#tb-personnaliser'))?.focus();
      } else if (t.matches('[data-tb-deplacer]')) {
        const sens = +t.dataset.tbDeplacer;
        if (deplacer(k, sens)) { garder(); dessiner(); $(`.tb-tuile[data-k="${k}"] [data-tb-deplacer="${sens}"]`)?.focus(); annoncerSr(`${TUILES[k].titre} ${sens < 0 ? 'avancée' : 'reculée'}.`); }
      } else if (t.matches('[data-tb-taille]')) {
        tu.taille = t.dataset.tbTaille; garder();
        TAILLES.forEach(([x]) => sec.classList.toggle(`taille-${x}`, x === tu.taille));
        $$('[data-tb-taille]', sec).forEach(b => b.setAttribute('aria-pressed', String(b === t)));
      } else if (t.matches('[data-tb-montrer]')) {
        const x = tuile(t.dataset.tbMontrer); if (x) { x.visible = true; garder(); dessiner(); preparer(); $(`.tb-tuile[data-k="${x.k}"] .tb-tete`)?.scrollIntoView({ block: 'nearest' }); annoncerSr(`${TUILES[x.k].titre} affichée.`); }
      } else if (t.matches('[data-tb-colonnes]')) {
        conf().colonnes = t.dataset.tbColonnes; garder(); $('#tb-grille').dataset.colonnes = conf().colonnes;
        $$('[data-tb-colonnes]').forEach(b => b.setAttribute('aria-pressed', String(b === t)));
      } else if (t.matches('[data-tb-depart]')) {
        conf().depart = t.dataset.tbDepart; garder();
        $$('[data-tb-depart]').forEach(b => b.setAttribute('aria-pressed', String(b === t)));
      } else if (t.id === 'tb-reinit') {
        if (!confirm('Revenir à la disposition d’origine du tableau de bord ? Les réglages des tuiles et le mémo seront effacés.')) return;
        T.conf = defauts(); T.ouverts.clear(); garder(true); dessiner(); preparer(); annoncerSr('Disposition d’origine remise.');
      } else if (t.id === 'tb-fini') {
        T.edition = false; dessiner(); $('#tb-personnaliser')?.focus();
      } else if (t.matches('[data-tb-action]')) {
        if (t.dataset.tbAction === 'recherche') ouvrirRecherche();
        else if (t.dataset.tbAction === 'prospect') { window.addEventListener('hashchange', () => requestAnimationFrame(() => $('#b-nouveau-prospect')?.click()), { once: true }); location.hash = '#/diffusion'; }
      } else if (t.matches('[data-tb-sp]')) {
        session.dates = Object.assign({ spectacle: '', public: '', statut: '', q: '', ouvertes: [] }, session.dates || {}, { spectacle: t.dataset.tbSp }); garderFiltres(); location.hash = '#/representations';
      } else if (t.matches('.tb-tel')) {
        e.preventDefault(); location.href = t.dataset.tel;
      }
    });
    // un réglage change : la tuile se redessine aussitôt, le choix est gardé
    vueEl.addEventListener('change', e => {
      const inp = e.target.closest('[data-tb-reg]');
      if (!inp) return;
      const sec = inp.closest('.tb-tuile'), k = sec.dataset.k, tu = tuile(k), r = reglagesDe(k).find(x => x.k === inp.dataset.tbReg);
      if (!tu || !r) return;
      tu.reglages = tu.reglages || {};
      if (r.t === 'cases') tu.reglages[r.k] = $$(`[data-tb-reg="${r.k}"]`, sec).filter(x => x.checked).map(x => choixDe(r).map(c => c[0]).find(c => String(c) === x.value)).filter(x => x !== undefined);
      else if (r.t === 'case') tu.reglages[r.k] = inp.checked;
      else tu.reglages[r.k] = choixDe(r).map(c => c[0]).find(c => String(c) === inp.value);
      garder(); dessinerCorps(k);
    });
    // le mémo s'enregistre en écrivant
    vueEl.addEventListener('input', e => {
      if (!e.target.matches('.tb-memo')) return;
      const tu = tuile('memo'); if (!tu) return;
      tu.reglages = tu.reglages || {}; tu.reglages.texte = e.target.value;
      const etat = $('.tb-memo-etat', e.target.parentNode); if (etat) etat.textContent = 'Enregistrement…';
      garder();
      clearTimeout(T.memoMinuteur);
      T.memoMinuteur = setTimeout(() => { T.ecriture.then(() => { const x = $('.tb-memo-etat'); if (x) x.textContent = T.prefs === 'absent' ? 'Gardé sur cet appareil' : 'Enregistré'; }); }, 900);
    });
    // glisser-déposer des tuiles (en personnalisation) : une tuile glissée se pose avant ou après celle qu'on survole
    vueEl.addEventListener('dragstart', e => {
      const sec = e.target.closest?.('.tb-tuile[draggable="true"]');
      if (!sec || !T.edition) return;
      T.glisse = sec.dataset.k; sec.classList.add('glisse');
      e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', sec.dataset.k); } catch { /* vieux navigateur */ }
    });
    vueEl.addEventListener('dragover', e => {
      const sec = e.target.closest?.('.tb-tuile');
      if (!T.glisse || !sec) return;
      e.preventDefault(); e.dataTransfer.dropEffect = 'move';
      $$('.tb-tuile.cible-avant, .tb-tuile.cible-apres').forEach(x => x.classList.remove('cible-avant', 'cible-apres'));
      if (sec.dataset.k === T.glisse) return;
      const r = sec.getBoundingClientRect(), apres = (e.clientX - r.left) / r.width > .5 && r.width < r.height * 6 ? true : (e.clientY - r.top) / r.height > .5 && r.width >= r.height * 6;
      sec.classList.add(apres ? 'cible-apres' : 'cible-avant');
    });
    vueEl.addEventListener('drop', e => {
      const sec = e.target.closest?.('.tb-tuile');
      if (!T.glisse) return;
      e.preventDefault();
      const k = T.glisse; T.glisse = null;
      if (sec && sec.dataset.k !== k) {
        const apres = sec.classList.contains('cible-apres'), vis = visibles().map(t => t.k), i = vis.indexOf(sec.dataset.k);
        poser(k, apres ? (vis[i + 1] === k ? vis[i + 2] : vis[i + 1]) || null : sec.dataset.k);
        garder(); dessiner(); annoncerSr(`${TUILES[k].titre} déplacée.`);
      }
      $$('.tb-tuile.glisse, .tb-tuile.cible-avant, .tb-tuile.cible-apres').forEach(x => x.classList.remove('glisse', 'cible-avant', 'cible-apres'));
    });
    vueEl.addEventListener('dragend', () => { T.glisse = null; $$('.tb-tuile.glisse, .tb-tuile.cible-avant, .tb-tuile.cible-apres').forEach(x => x.classList.remove('glisse', 'cible-avant', 'cible-apres')); });
  }
  // en quittant la page : la personnalisation se referme, et ce qui n'est pas encore écrit part
  window.addEventListener('hashchange', () => { if (location.hash !== '#/accueil') { T.edition = false; if (T.minuteur) ecrireMaintenant(); } });

  // ===================================================================================================== à traiter : l'ordre, les épingles, les reports
  /* Chaque ligne « à traiter » a une clé (catégorie:identifiant), un poids (ce que coûte le retard : un contrat non signé
     à la veille pèse plus qu'un portrait sans accord) et un facteur d'échéance (ce qui vient dans trois jours, ce qui
     attend depuis une semaine). Épinglée, elle passe en tête ; reportée (« me le rappeler lundi »), elle se cache jusqu'au
     jour dit. Épingles et reports sont gardés avec la disposition (conf().urgent). */
  const POIDS = { contrats: 5, heures: 4, options: 4, feuilles: 4, devis: 3, relances: 3, frais: 2, propositions: 2, pro: 2, portraits: 1 };
  const SUJETS = { devis: 'Devis', relances: 'Relance', frais: 'Frais', options: 'Option', heures: 'Horaire', contrats: 'Contrat', feuilles: 'Feuille', propositions: 'Proposition', pro: 'Invitation', portraits: 'Portrait' };
  const idLigne = x => { const m = /"(\d+)"/.exec(x.attrs || '') || /(\d+)(?:[?#]|$)/.exec(x.href || ''); return m ? +m[1] : null; };
  const texteDe = h => String(h || '').replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim();
  function facteur(x) {
    const j = /^\d{4}-\d{2}-\d{2}/.test(String(x.tri)) ? dansJours(String(x.tri).slice(0, 10)) : null;
    if (j == null) return 1;
    if (j >= 0) return j <= 0 ? 4 : j <= 3 ? 3 : j <= 7 ? 2 : j <= 14 ? 1.5 : 1;   // une échéance qui vient
    return -j >= 14 ? 2.5 : -j >= 7 ? 2 : -j >= 3 ? 1.5 : 1;                       // quelque chose qui attend
  }
  const urgentConf = () => { const c = conf(); if (!c.urgent || typeof c.urgent !== 'object') c.urgent = { epingles: [], reports: {} }; if (!Array.isArray(c.urgent.epingles)) c.urgent.epingles = []; if (!c.urgent.reports || typeof c.urgent.reports !== 'object') c.urgent.reports = {}; return c.urgent; };
  // les lignes à traiter, enrichies : clé, sujet, poids, épingle, report, spectacle et date (pour les tuiles qui se parlent)
  function urgences(r = valeurs('urgent')) {
    const u = urgentConf(), reports = u.reports, categories = [];
    let total = 0, reportees = 0;
    // un report passé s'oublie
    for (const [k, j] of Object.entries(reports)) if (!j || j <= AUJ) delete reports[k];
    for (const c of CATEGORIES) {
      if (!r.categories.includes(c.k) || (c.dispo && !c.dispo())) continue;
      const lignes = c.lignes().map(x => {
        const id = idLigne(x), cle = `${c.k}:${id}`, date = ['options', 'heures', 'contrats', 'feuilles'].includes(c.k) ? id : null, d = date ? E.dates.find(y => y.id === id) : null;
        const epingle = u.epingles.includes(cle), reporte = reports[cle] || null;
        return { ...x, k: c.k, id, cle, sujet: SUJETS[c.k] || c.titre, titreTexte: texteDe(x.titre), sp: d ? d.spectacle_id : (c.k === 'frais' ? (E.frais || []).find(f => f.id === id)?.date_id && E.dates.find(y => y.id === (E.frais || []).find(f => f.id === id).date_id)?.spectacle_id : null) || null,
          date, epingle, reporte, score: (POIDS[c.k] || 1) * facteur(x) + (epingle ? 100 : 0) };
      }).sort((a, b) => b.score - a.score || String(a.tri).localeCompare(String(b.tri)));
      lignes.forEach(x => { if (x.reporte) reportees++; else total++; });
      categories.push({ k: c.k, titre: c.titre, tout: c.tout, lignes });
    }
    const toutes = categories.flatMap(c => c.lignes).sort((a, b) => b.score - a.score || String(a.tri).localeCompare(String(b.tri)));
    return { categories, lignes: toutes, total, reportees };
  }
  function epingler(cle, oui = null) {
    const u = urgentConf(), deja = u.epingles.includes(cle);
    if (oui === null) oui = !deja;
    u.epingles = u.epingles.filter(k => k !== cle); if (oui) u.epingles.unshift(cle);
    garder(); dessinerCorps('urgent'); appliquerFiltre(); annoncerSr(oui ? 'Épinglée en haut.' : 'Désépinglée.');
  }
  function reporter(cle, jour) {
    const u = urgentConf();
    if (jour) u.reports[cle] = jour; else delete u.reports[cle];
    garder(); dessinerCorps('urgent'); appliquerFiltre(); annoncerSr(jour ? `Reportée au ${jourSansAn(jour)}.` : 'Report annulé.');
  }
  const lundiProchain = () => { const d = new Date(`${AUJ}T12:00:00`), n = (8 - d.getDay()) % 7 || 7; return plusJours(AUJ, n); };
  const REPORTS = () => [['demain', 'Demain', plusJours(AUJ, 1)], ['lundi', 'Lundi', lundiProchain()], ['semaine', 'Dans une semaine', plusJours(AUJ, 7)]];

  // ===================================================================================================== traiter sans quitter le tableau
  /* L'éclair d'une ligne (ou Entrée dans la file, ou « Traiter… » du menu) ouvre une feuille de modification en place
     (GESTES.formulaire) : confirmer une option, fixer un horaire, suivre un contrat, publier une feuille de route, valider
     une note de frais, répondre à un devis, relancer, clore une proposition, prolonger une invitation, noter un accord. La
     base écrite, l'état se relit (chargerTout) et le tableau se redessine ; dans la file, la ligne suivante prend le focus. */
  const G = () => (typeof GESTES !== 'undefined' && GESTES && typeof GESTES.formulaire === 'function' ? GESTES : null);
  const texteErreur = e => `${(e && e.message) || 'la base a refusé'}`;
  async function apresTraiter(message, cle = null) {
    try { await chargerTout(); } catch (e) { console.error(e); }
    if (location.hash === '#/accueil') { dessinerCorps(); preparer(); appliquerFiltre(); } else rafraichirListes();
    if (message) annoncer(message);
    if (cle) refocaliserFile(cle);
  }
  const dateDe = id => E.dates.find(x => x.id === Number(id));
  const titreDateLong = d => `${titreDate(d)} · ${jourCourt(d.debut)}${lieu(d.lieu_id) ? ` · ${ouDe(d)}` : ''}`;
  const TRAITER = {
    options: (id, cle) => { const d = dateDe(id), Gf = G(); if (!d || !Gf) return;
      Gf.formulaire({ titre: 'Confirmer la date ?', sousTitre: titreDateLong(d), champs: [
        { k: 'statut', t: 'choix', seg: true, l: 'Statut', choix: [['confirmee', 'Confirmée'], ['option', 'Toujours en option'], ['reportee', 'Reportée'], ['annulee', 'Annulée']], valeur: 'confirmee' },
        { k: 'visible', t: 'case', l: 'Publiée sur le site', valeur: d.visible !== false, aide: 'Une option ou une date annulée n’y va jamais.' },
      ], ok: 'Enregistrer', enregistrer: async v => {
        const { error } = await sb.from('crescite_dates').update({ statut: v.statut, visible: !!v.visible && v.statut === 'confirmee' }).eq('id', d.id);
        if (error) return texteErreur(error);
        await apresTraiter({ confirmee: 'Date confirmée.', option: 'Toujours en option.', reportee: 'Date reportée.', annulee: 'Date annulée.' }[v.statut], cle); return true;
      } }); },
    heures: (id, cle) => { const d = dateDe(id), Gf = G(); if (!d || !Gf) return;
      const reps = E.reps.filter(r => r.date_id === d.id).sort((a, b) => (a.jour + h5(a.heure)).localeCompare(b.jour + h5(b.heure))).map(r => ({ id: r.id, jour: r.jour, heure: h5(r.heure), fin: h5(r.fin), public: r.public || 'tout_public', annulee: !!r.annulee, note: r.note || '' }));
      const sco = d.public === 'scolaire' || d.public === 'mixte';
      Gf.formulaire({ titre: 'Les horaires', sousTitre: titreDateLong(d), champs: [
        { k: 'reps', t: 'groupe', l: 'Une ligne par séance', ajout: 'Séance', valeur: reps, neuf: () => ({ jour: reps.length ? reps[reps.length - 1].jour : d.debut, heure: '20:00', fin: '', public: sco ? 'scolaire' : 'tout_public', annulee: false, note: '' }),
          champs: [{ k: 'jour', t: 'date', l: 'Jour', requis: true }, { k: 'heure', t: 'heure', l: 'Heure' }, { k: 'fin', t: 'heure', l: 'Fin' },
            ...(sco ? [{ k: 'public', t: 'choix', l: 'Public', choix: [['tout_public', 'Tout public'], ['scolaire', 'Scolaire'], ['autre', 'Autre']] }] : []), { k: 'note', t: 'texte', l: 'Précision', ph: 'complet, audiodécrite…' }, { k: 'annulee', t: 'case', l: 'Annulée' }] },
      ], note: 'L’équipe de la date est prévenue des horaires changés.', enregistrer: async v => {
        const avant = new Map(reps.map(r => [String(r.id), r])), gardes = new Set(), requetes = [];
        for (const r of v.reps || []) {
          if (!r.jour) return 'Un jour pour chaque séance.';
          const l = { jour: r.jour, heure: r.heure || null, fin: r.fin || null, public: r.public || (sco ? 'scolaire' : 'tout_public'), annulee: !!r.annulee, note: (r.note || '').trim() || null };
          if (r.id && avant.has(String(r.id))) { gardes.add(String(r.id)); const a = avant.get(String(r.id));
            if (a.jour !== l.jour || a.heure !== (l.heure || '') || a.fin !== (l.fin || '') || a.public !== l.public || a.annulee !== l.annulee || (a.note || '') !== (l.note || '')) requetes.push(() => sb.from('crescite_representations').update(l).eq('id', Number(r.id))); }
          else requetes.push(() => sb.from('crescite_representations').insert({ ...l, date_id: d.id }));
        }
        const retirees = reps.filter(r => !gardes.has(String(r.id))).map(r => Number(r.id));
        if (retirees.length) requetes.push(() => sb.from('crescite_representations').delete().in('id', retirees));
        for (const q of requetes) { const { error } = await q(); if (error) return texteErreur(error); }
        await apresTraiter('Horaires enregistrés.', cle); return true;
      } }); },
    contrats: (id, cle) => { const d = dateDe(id), Gf = G(); if (!d || !Gf) return;
      const su = E.suivis.find(s => s.date_id === d.id) || {};
      Gf.formulaire({ titre: 'Le contrat', sousTitre: titreDateLong(d), champs: [
        { k: 'contrat', t: 'choix', seg: true, l: 'Contrat', choix: [['', '—'], ['à envoyer', 'À envoyer'], ['envoyé', 'Envoyé'], ['signé', 'Signé']], valeur: (su.contrat || '').trim() },
        { k: 'organisateur', t: 'texte', l: 'Organisateur', valeur: su.organisateur || '' }, { k: 'contact', t: 'texte', l: 'Contact', valeur: su.contact || '', ph: 'nom, téléphone, courriel' },
        { k: 'montant_cession', t: 'nombre', l: 'Montant de cession (€)', valeur: su.montant_cession ?? '', min: 0, pas: 0.01 },
        { k: 'notes', t: 'long', l: 'Notes', valeur: su.notes || '', lignes: 2 },
      ], enregistrer: async v => {
        const ligne = { date_id: d.id, contrat: v.contrat || null, organisateur: v.organisateur.trim() || null, contact: v.contact.trim() || null, notes: v.notes.trim() || null, ...(v.montant_cession == null || v.montant_cession === '' ? {} : { montant_cession: Number(v.montant_cession) }) };
        const { error } = await sb.from('crescite_dates_suivi').upsert(ligne, { onConflict: 'date_id' });
        if (error) return texteErreur(error);
        await apresTraiter(v.contrat === 'signé' ? 'Contrat signé : la date quitte « à traiter ».' : 'Suivi enregistré.', cle); return true;
      } }); },
    feuilles: (id, cle) => { const d = dateDe(id), Gf = G(); if (!d || !Gf) return;
      const f = E.feuilles.find(x => x.date_id === d.id), peutComposer = typeof composerPour === 'function' && typeof FEUILLE !== 'undefined';
      if (f) Gf.formulaire({ titre: 'Publier la feuille de route', sousTitre: titreDateLong(d), champs: [
          { k: 'maj', t: 'choix', seg: true, l: 'Avant de publier', choix: [['maj', 'Mettre à jour depuis la base'], ['telle', 'Telle quelle']], valeur: 'maj', aide: 'Horaires, lieu, équipe et contacts d’aujourd’hui ; ce qui a été écrit à la main ne change pas.' },
        ], ok: 'Publier', note: `Brouillon${f.version > 1 ? ` (version ${f.version})` : ''}${typeof aCompleter === 'function' && aCompleter(d.id) ? ` · ${pl(aCompleter(d.id), 'information à compléter', 'informations à compléter')}` : ''} : l’équipe recevra la feuille et en sera prévenue.`, enregistrer: async v => {
          let contenu = f.contenu;
          if (v.maj === 'maj' && peutComposer) { try { contenu = { ...FEUILLE.actualiser(FEUILLE.contenu(f, contexteFeuille(d)), composerPour(d)).contenu, format: 2 }; } catch (e) { console.error(e); } }
          const { error } = await sb.from('crescite_feuilles').update({ contenu, statut: 'publiee' }).eq('id', f.id);
          if (error) return texteErreur(error);
          await apresTraiter('Feuille de route publiée : l’équipe est prévenue.', cle); return true;
        } });
      else Gf.formulaire({ titre: 'Composer la feuille de route', sousTitre: titreDateLong(d), champs: [
          { k: 'statut', t: 'choix', seg: true, l: 'Puis', choix: [['publiee', 'La publier'], ['brouillon', 'La garder en brouillon']], valeur: 'publiee' },
        ], ok: 'Composer', note: 'Dans la forme des feuilles de la compagnie, avec tout ce que la base sait ; elle se complète ensuite dans « Feuilles de route ».', enregistrer: async v => {
          if (!peutComposer) return 'L’outil des feuilles de route n’est pas chargé.';
          let contenu; try { contenu = { ...composerPour(d), format: 2 }; } catch (e) { console.error(e); return `Composition impossible : ${texteErreur(e)}`; }
          const { error } = await sb.from('crescite_feuilles').insert({ date_id: d.id, titre: null, contenu, statut: v.statut });
          if (error) return texteErreur(error);
          await apresTraiter(v.statut === 'publiee' ? 'Feuille composée et publiée : l’équipe est prévenue.' : 'Feuille composée, en brouillon.', cle); return true;
        } }); },
    frais: (id, cle) => { const f = (E.frais || []).find(x => x.id === Number(id)), Gf = G(); if (!f || !Gf) return;
      const p = personne(f.personne_id);
      Gf.formulaire({ titre: 'Note de frais', sousTitre: `${p ? nomDe(p) : 'Une personne'} · ${CAT_FRAIS[f.categorie] || f.categorie} · ${euros(f.montant_ttc)}${f.date_depense ? ` · ${jourSansAn(f.date_depense)}` : ''}`, champs: [
        { k: 'decision', t: 'choix', seg: true, l: 'Décision', choix: [['valide', 'Valider'], ['refuse', 'Refuser'], ['attente', 'Plus tard']], valeur: 'valide' },
      ], note: f.commentaire ? `« ${f.commentaire} »` : '', enregistrer: async v => {
        if (v.decision === 'attente') return true;
        const maj = v.decision === 'valide' ? { statut: 'valide', valide_le: new Date().toISOString(), valide_par: uid() } : { statut: 'refuse' };
        const { error } = await sb.from('crescite_notes_frais').update(maj).eq('id', f.id);
        if (error) return texteErreur(error);
        await apresTraiter(v.decision === 'valide' ? 'Note de frais validée.' : 'Note de frais refusée.', cle); return true;
      } }); },
    devis: (id, cle) => { const v0 = (E.devis || []).find(x => x.id === Number(id)), Gf = G(); if (!v0 || !Gf) return;
      Gf.formulaire({ titre: 'Demande de devis', sousTitre: `${v0.structure_nom}${v0.commune ? ` · ${v0.commune}` : ''}${sp(v0.spectacle_id) ? ` · ${sp(v0.spectacle_id).titre}` : ''}`, champs: [
        { k: 'statut', t: 'choix', seg: true, l: 'Statut', choix: STATUTS_DEVIS.map(([k, l]) => [k, l]), valeur: v0.statut || 'nouveau' },
      ], note: [v0.contact_nom, v0.contact_email, v0.periode_souhaitee ? `période : ${v0.periode_souhaitee}` : '', v0.message ? `« ${String(v0.message).slice(0, 240)}${String(v0.message).length > 240 ? '…' : ''} »` : ''].filter(Boolean).join(' · '), enregistrer: async v => {
        if ((v.statut || 'nouveau') === (v0.statut || 'nouveau')) return true;
        const { error } = await sb.from('crescite_devis_demandes').update({ statut: v.statut }).eq('id', v0.id);
        if (error) return texteErreur(error);
        await apresTraiter(`Demande marquée « ${(STATUTS_DEVIS.find(s => s[0] === v.statut) || [])[1] || v.statut} ».`, cle); return true;
      } }); },
    relances: (id, cle) => { const p = (E.prospects || []).find(x => x.id === Number(id)), Gf = G(); if (!p || !Gf) return;
      const i = ETAPES_CRM.findIndex(e => e[0] === p.etape), suivante = ETAPES_CRM[i + 1];
      Gf.formulaire({ titre: 'Relance', sousTitre: `${p.structure}${p.commune ? ` · ${p.commune}` : ''}${sp(p.spectacle_id) ? ` · ${sp(p.spectacle_id).titre}` : ''}`, champs: [
        { k: 'quoi', t: 'choix', seg: true, l: 'Aujourd’hui', choix: [['faite', 'Relance faite'], ['reporter', 'Reporter d’une semaine'], ...(suivante ? [['etape', `Étape suivante : ${suivante[1].replace(/^\d\.\s*/, '')}`]] : [])], valeur: 'faite' },
        { k: 'notes', t: 'long', l: 'Note', valeur: '', lignes: 2, ph: 'ce qui s’est dit' },
      ], enregistrer: async v => {
        const notes = v.notes.trim() ? `${p.notes ? `${p.notes}\n` : ''}${jourSansAn(AUJ)} : ${v.notes.trim()}` : undefined;
        const maj = v.quoi === 'faite' ? { date_dernier_contact: AUJ, date_prochaine_relance: plusJours(AUJ, 7) } : v.quoi === 'reporter' ? { date_prochaine_relance: plusJours(p.date_prochaine_relance && p.date_prochaine_relance > AUJ ? p.date_prochaine_relance : AUJ, 7) } : { etape: suivante[0], date_dernier_contact: AUJ, date_prochaine_relance: plusJours(AUJ, 7) };
        const { error } = await sb.from('crescite_diffusion_prospects').update({ ...maj, ...(notes !== undefined ? { notes } : {}) }).eq('id', p.id);
        if (error) return texteErreur(error);
        await apresTraiter(v.quoi === 'faite' ? 'Relance notée, la prochaine dans 7 jours.' : v.quoi === 'reporter' ? 'Relance reportée d’une semaine.' : `Étape : ${suivante[1].replace(/^\d\.\s*/, '')}.`, cle); return true;
      } }); },
    propositions: (id, cle) => { const p = (E.propositions || []).find(x => +x.id === Number(id)), Gf = G(); if (!p || !Gf) return;
      const n = bilanDe(p);
      Gf.formulaire({ titre: 'Proposition de dates', sousTitre: p.titre, champs: [
        { k: 'quoi', t: 'choix', seg: true, l: 'Que faire', choix: [['suivi', 'Ouvrir le suivi'], ['clore', 'Clore sans créer de date']], valeur: 'suivi' },
      ], note: `${n.oui} disponible${n.oui > 1 ? 's' : ''}, ${n.non} pas disponible${n.non > 1 ? 's' : ''}, ${n.peut_etre} peut-être, ${n.attente} sans réponse.`, ok: 'Valider', enregistrer: async v => {
        if (v.quoi === 'suivi') { location.hash = `#/planning/proposition/${p.id}`; return true; }
        const { error } = await sb.from('crescite_propositions').update({ statut: 'close' }).eq('id', p.id);
        if (error) return texteErreur(error);
        if (typeof DISPONIBILITES !== 'undefined' && DISPONIBILITES.chargerPropositions) { E.propositionsLues = false; try { await DISPONIBILITES.chargerPropositions(); } catch (e) { /* la tuile le relira */ } }
        await apresTraiter('Proposition close.', cle); return true;
      } }); },
    pro: (id, cle) => { const a = (E.acces || []).find(x => x.id === Number(id)), Gf = G(); if (!a || !Gf) return;
      Gf.formulaire({ titre: 'Invitation pro', sousTitre: `${a.nom}${a.contact ? ` · ${a.contact}` : ''} · expire le ${jourSansAn(a.expire_le)}`, champs: [
        { k: 'quoi', t: 'choix', seg: true, l: 'Que faire', choix: [['30', 'Prolonger de 30 jours'], ['90', 'Prolonger de 90 jours'], ['fin', 'Laisser expirer (désactiver)']], valeur: '30' },
      ], ok: 'Valider', enregistrer: async v => {
        const maj = v.quoi === 'fin' ? { actif: false } : { expire_le: plusJours(a.expire_le > AUJ ? a.expire_le : AUJ, +v.quoi), actif: true };
        const { error } = await sb.from('crescite_acces_pro').update(maj).eq('id', a.id);
        if (error) return texteErreur(error);
        await apresTraiter(v.quoi === 'fin' ? 'Invitation désactivée.' : `Invitation prolongée jusqu’au ${jourSansAn(maj.expire_le)}.`, cle); return true;
      } }); },
    portraits: (id, cle) => { const p = (E.personnes || []).find(x => x.id === Number(id)), Gf = G(); if (!p || !Gf) return;
      Gf.formulaire({ titre: 'Portrait', sousTitre: nomDe(p), champs: [
        { k: 'accord', t: 'case', l: 'Accord de publication reçu : le portrait peut paraître sur le site', valeur: false },
      ], enregistrer: async v => {
        if (!v.accord) return true;
        const { error } = await sb.from('crescite_personnes').update({ photo_publique: true }).eq('id', p.id);
        if (error) return texteErreur(error);
        await apresTraiter('Accord noté : le portrait paraît.', cle); return true;
      } }); },
  };
  function traiter(cle) {
    const [k, id] = String(cle).split(':');
    if (!TRAITER[k]) return false;
    T.fileCle = cle;
    TRAITER[k](Number(id), cle);
    return true;
  }

  // ===================================================================================================== la file au clavier
  /* Sur le tableau de bord : J et K (ou ↓ ↑ sur une ligne) parcourent les lignes à traiter, Entrée ouvre la feuille de
     traitement de la ligne (sinon sa fiche), Échap la referme et rend le focus à la ligne. Une ligne traitée disparaît :
     la suivante prend le focus, pour vider la pile sans la souris. */
  const lignesFile = () => $$('#tb-grille .tb-tuile[data-k="urgent"] .tb-lt:not([hidden]) a.tb-l');
  function file(sens) {
    const xs = lignesFile(); if (!xs.length) return;
    const i = xs.indexOf(document.activeElement), j = i < 0 ? (sens > 0 ? 0 : xs.length - 1) : (i + sens + xs.length) % xs.length;
    xs[j].focus(); xs[j].scrollIntoView({ block: 'nearest' });
    T.fileCle = xs[j].dataset.cle || null;
  }
  function refocaliserFile(cle) {
    if (!cle || location.hash !== '#/accueil') return;
    const xs = lignesFile();
    if (!xs.length) { $('#tb-grille .tb-tuile[data-k="urgent"] .tb-rien')?.setAttribute('tabindex', '-1'); annoncerSr('Plus rien à traiter.'); return; }
    const i = Math.max(0, Math.min(xs.length - 1, T.fileIndex ?? 0));
    xs[i].focus({ preventScroll: false }); T.fileCle = xs[i].dataset.cle || null;
    annoncerSr(`${xs.length} à traiter.`);
  }
  function clavierFile(e) {
    if (location.hash !== '#/accueil' || T.edition) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (document.querySelector('[aria-modal="true"], dialog[open]')) return;
    const t = e.target;
    if (t && t.closest && t.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) return;
    if (e.key === 'j' || e.key === 'k') { e.preventDefault(); file(e.key === 'j' ? 1 : -1); return; }
    if (e.key === 'Enter' && t && t.matches && t.matches('#tb-grille a.tb-l[data-cle]')) {
      const b = t.parentNode?.querySelector('[data-traiter]');
      if (b) { e.preventDefault(); T.fileIndex = lignesFile().indexOf(t); traiter(b.dataset.traiter); }
      return;
    }
    if (e.key === 'Escape' && T.filtre != null) { filtrer(null); }
  }

  // ===================================================================================================== les tuiles qui se parlent
  /* Survoler une date met en lumière ce qui la concerne dans les autres tuiles (la même date, puis son spectacle) ; un
     spectacle survolé, ses dates. L'entonnoir d'un spectacle filtre tout le tableau sur lui : les lignes des autres
     spectacles se cachent, une pastille le dit, Échap ou sa croix lève le filtre. */
  function lier(el) {
    delier();
    if (!el) return;
    const date = el.dataset.date, spx = el.dataset.sp;
    if (date) $$(`#tb-grille [data-date="${CSS.escape(date)}"]`).forEach(x => { if (x !== el) x.classList.add('tb-lie'); });
    if (spx) $$(`#tb-grille [data-sp="${CSS.escape(spx)}"]`).forEach(x => { if (x !== el && !x.classList.contains('tb-lie')) x.classList.add('tb-lie-sp'); });
  }
  const delier = () => $$('#tb-grille .tb-lie, #tb-grille .tb-lie-sp').forEach(x => x.classList.remove('tb-lie', 'tb-lie-sp'));
  function filtrer(spId) {
    T.filtre = spId == null ? null : Number(spId);
    appliquerFiltre();
    const s = T.filtre != null && sp(T.filtre);
    annoncerSr(s ? `Tableau filtré sur ${s.titre}.` : 'Filtre levé.');
  }
  function appliquerFiltre() {
    const grille = $('#tb-grille'), chip = $('#tb-filtre'); if (!grille) return;
    const s = T.filtre != null ? sp(T.filtre) : null;
    grille.classList.toggle('filtre', !!s);
    $$('[data-sp]', grille).forEach(x => { const cache = !!s && Number(x.dataset.sp) !== s.id; const bloc = x.closest('.tb-lt') || x; bloc.hidden = cache; });
    $$('[data-tb-filtre]', grille).forEach(b => b.setAttribute('aria-pressed', String(!!s && Number(b.dataset.tbFiltre) === s.id)));
    if (chip) { chip.hidden = !s; chip.innerHTML = s ? `<span class="pastille" style="--c:${esc(couleurSp(s))}"></span>Filtré : <b>${esc(s.titre)}</b><button type="button" class="tb-ico" data-tb-filtre="" title="Lever le filtre (Échap)" aria-label="Lever le filtre">${SVG.croix}</button>` : ''; }
  }

  // ===================================================================================================== glisser-déposer entre tuiles
  /* Une personne de « Qui part bientôt » déposée sur une date l'y inscrit ; une proposition de dates déposée sur
     « Prochaines dates » ouvre « Créer la date » de son premier jour ; un fichier de l'ordinateur déposé sur un spectacle
     devient un document de son équipe (comme « Envoyer un fichier » de sa fiche). */
  async function inscrirePersonne(dateId, personneId) {
    const d = dateDe(dateId), p = personne(Number(personneId)); if (!d || !p) return;
    if (equipeDeLaDate(d).some(x => x.personne_id === p.id)) return annoncer(`${nomDe(p)} part déjà sur cette date.`);
    const { error } = await sb.from('crescite_equipes').upsert({ date_id: d.id, personne_id: p.id, present: true }, { onConflict: 'date_id,personne_id' });
    if (error) return erreur(error, 'Inscription impossible');
    await apresTraiter(`${nomDe(p)} part sur ${titreDate(d)}, le ${jourSansAn(d.debut)}.`);
  }
  const typeDeNom = n => (/dossier/i.test(n) ? 'dossier' : /fiche.?tech|technique|rider/i.test(n) ? 'fiche_technique' : /\bplans?\b|implantation|feu/i.test(n) ? 'plan' : /texte|script|brochure|pi[eè]ce/i.test(n) ? 'texte' : 'autre');
  async function deposerFichier(spId, f) {
    const s = sp(Number(spId)); if (!s || !f) return;
    const ext = (f.name.split('.').pop() || '').toLowerCase(), mimes = typeof MIMES_DOC !== 'undefined' ? MIMES_DOC : { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', txt: 'text/plain' };
    const type = mimes[ext] || f.type;
    if (!Object.values(mimes).includes(type)) return annoncer('Ce type de fichier n’est pas accepté : PDF, image, texte, ODT ou DOCX.', { erreur: true });
    if (f.size > 50 * 1024 * 1024) return annoncer('Fichier trop lourd : 50 Mo au plus.', { erreur: true });
    const base = f.name.replace(/\.[^.]+$/, ''), chemin = `${s.slug || slugifier(s.titre) || `spectacle-${s.id}`}/${Date.now().toString(36)}-${slugifier(base) || 'document'}.${ext}`;
    annoncer(`Envoi de « ${f.name} »…`);
    const up = await sb.storage.from('crescite-equipe').upload(chemin, f, { contentType: type, upsert: false });
    if (up.error) return erreur(up.error, 'Envoi impossible');
    const titre = base.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim(), ordre = Math.max(0, ...(E.documents || []).filter(x => x.spectacle_id === s.id).map(x => x.ordre || 0)) + 10;
    const { error } = await sb.from('crescite_documents').insert({ spectacle_id: s.id, type: typeDeNom(base), titre: titre ? titre[0].toUpperCase() + titre.slice(1) : 'Document', fichier: chemin, pour: 'equipe', ordre });
    if (error) { await sb.storage.from('crescite-equipe').remove([chemin]); return erreur(error, 'Document non enregistré'); }
    await apresTraiter(`« ${f.name} » rangé dans les fichiers de ${s.titre}, pour son équipe.`);
  }
  function brancherGlisser(vueEl) {
    const cibles = () => $$('#tb-grille .tb-cible').forEach(x => x.classList.remove('tb-cible'));
    vueEl.addEventListener('dragstart', e => {
      if (T.edition) return;
      const a = e.target.closest?.('a.tb-l[data-personne], a.tb-l[data-proposition]'); if (!a) return;
      T.glisseObjet = a.dataset.personne ? { type: 'personne', id: +a.dataset.personne } : { type: 'proposition', id: +a.dataset.proposition };
      try { e.dataTransfer.setData('text/plain', `${T.glisseObjet.type}:${T.glisseObjet.id}`); e.dataTransfer.effectAllowed = 'copyLink'; } catch (err) { /* vieux navigateur */ }
      a.classList.add('glisse');
    });
    const cibleDe = e => {
      if (T.glisseObjet?.type === 'personne') return e.target.closest?.('a.tb-l[data-date]');
      if (T.glisseObjet?.type === 'proposition') return e.target.closest?.('.tb-tuile[data-k="prochaines"]');
      if (!T.glisseObjet && e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files')) return e.target.closest?.('.tb-sp[data-sp]');
      return null;
    };
    vueEl.addEventListener('dragover', e => {
      if (T.edition || T.glisse) return;
      const c = cibleDe(e); cibles();
      if (!c) return;
      e.preventDefault(); e.dataTransfer.dropEffect = T.glisseObjet ? 'link' : 'copy'; c.classList.add('tb-cible');
    });
    vueEl.addEventListener('dragleave', e => { if (!e.relatedTarget || !vueEl.contains(e.relatedTarget)) cibles(); });
    vueEl.addEventListener('drop', e => {
      if (T.edition || T.glisse) return;
      const c = cibleDe(e); cibles();
      if (!c) return;
      e.preventDefault();
      const o = T.glisseObjet; T.glisseObjet = null; $$('#tb-grille .glisse').forEach(x => x.classList.remove('glisse'));
      if (o?.type === 'personne') return inscrirePersonne(+c.dataset.date, o.id);
      if (o?.type === 'proposition') { const p = (E.propositions || []).find(x => +x.id === o.id), j = p && (p.jours || [])[0]; if (!p) return; return allerEtCliquer(`#/planning/proposition/${p.id}`, j ? `[data-dp="creer-date"][data-jour="${j.id}"]` : '[data-dp="creer-date"]'); }
      const f = e.dataTransfer?.files?.[0]; if (f) deposerFichier(+c.dataset.sp, f);
    });
    vueEl.addEventListener('dragend', () => { T.glisseObjet = null; cibles(); $$('#tb-grille .glisse').forEach(x => x.classList.remove('glisse')); });
  }
  // aller à une page, puis cliquer un de ses boutons une fois qu'elle est là (menus.js a le même)
  function allerEtCliquer(href, sel) {
    const essayer = n => { const b = $(sel); if (b) { b.click(); return; } if (n > 0) requestAnimationFrame(() => essayer(n - 1)); };
    if (location.hash === href) return essayer(40);
    window.addEventListener('hashchange', () => setTimeout(() => essayer(40), 20), { once: true });
    location.hash = href;
  }

  // ===================================================================================================== le fil : annuler, voir le diff
  /* Une modification récente (moins d'un quart d'heure) a « Annuler » : la ligne revient comme avant (comme « Revenir »
     du journal). Survoler une ligne montre ce qui a changé, champ par champ. */
  const ANNULABLE = 15 * 60 * 1000;
  const recente = j => Date.now() - Date.parse(j.quand) < ANNULABLE;
  const diffDe = j => (j.operation === 'UPDATE' ? champsChanges(j).map(k => [k, valeurJournal(j.avant?.[k]), valeurJournal(j.apres?.[k])]) : []);
  async function annulerJournal(id) {
    const j = (T.journal || []).find(x => x.id === Number(id)); if (!j) return;
    const [, pk] = (typeof TABLES !== 'undefined' && TABLES[j.table_nom]) || (typeof TABLES_EQUIPE !== 'undefined' && TABLES_EQUIPE[j.table_nom]) || (typeof TABLES_IDEALE !== 'undefined' && TABLES_IDEALE[j.table_nom]) || [null, 'id'];
    const sans = o => { const x = { ...o }; delete x.modifie_le; delete x.modifie_par; return x; };
    const ligne = (q, o) => [].concat(pk).reduce((q2, c) => q2.eq(c, o[c]), q);
    const relire = () => { T.journalLu = 0; lireJournal(true)?.then(() => { if (location.hash === '#/accueil') dessinerCorps('journal'); }); };
    // sans confirmation : la ligne revient comme avant, et l'annonce porte « Rétablir » (corbeille.js) ; sans la corbeille, comme avant
    if (typeof CORBEILLE !== 'undefined') { await CORBEILLE.inverser(j, { apres: () => { relire(); if (location.hash === '#/accueil') { dessinerCorps(); preparer(); appliquerFiltre(); } } }); return; }
    let r;
    if (j.operation === 'INSERT') r = await ligne(sb.from(j.table_nom).delete(), j.apres);
    else if (j.operation === 'UPDATE') r = await ligne(sb.from(j.table_nom).update(sans(j.avant)), j.avant);
    else r = await sb.from(j.table_nom).insert(sans(j.avant));
    if (r.error) return erreur(r.error, 'Annulation impossible');
    T.journalLu = 0;
    await apresTraiter('Annulé : la ligne est revenue comme avant.');
    lireJournal(true)?.then(() => { if (location.hash === '#/accueil') dessinerCorps('journal'); });
  }
  function montrerDiff(el) {
    cacherDiff();
    let xs = []; try { xs = JSON.parse(el.dataset.diff || '[]'); } catch (e) { xs = []; }
    if (!xs.length) return;
    const box = document.createElement('div');
    box.className = 'tb-diff'; box.id = 'tb-diff'; box.setAttribute('role', 'tooltip');
    box.innerHTML = `<table>${xs.slice(0, 8).map(([k, a, b]) => `<tr><th>${esc(k)}</th><td><s>${esc(a || '—')}</s></td><td>${esc(b || '—')}</td></tr>`).join('')}${xs.length > 8 ? `<tr><td colspan="3">et ${xs.length - 8} autres</td></tr>` : ''}</table>`;
    document.body.append(box);
    const r = el.getBoundingClientRect(), w = box.offsetWidth, h = box.offsetHeight;
    let x = r.left, y = r.bottom + 6 + window.scrollY;
    if (x + w > window.innerWidth - 8) x = Math.max(8, window.innerWidth - w - 8);
    if (r.bottom + 6 + h > window.innerHeight) y = r.top - h - 6 + window.scrollY;
    box.style.left = `${Math.round(x)}px`; box.style.top = `${Math.round(y)}px`;
    el.setAttribute('aria-describedby', 'tb-diff');
  }
  const cacherDiff = () => { $('#tb-diff')?.remove(); $$('[aria-describedby="tb-diff"]').forEach(x => x.removeAttribute('aria-describedby')); };

  // ===================================================================================================== les vues du tableau
  /* Une vue : une disposition nommée (tuiles, ordre, tailles, réglages, colonnes), gardée avec le compte (conf().vues).
     On la choisit dans l'en-tête ; une vue peut être automatique : certains jours, le matin ou l'après-midi, ou quand une
     date est dans les trois jours (« Veille de tournée »). Le mémo ne change pas d'une vue à l'autre. */
  const JOURS_SEMAINE = [['1', 'lun.'], ['2', 'mar.'], ['3', 'mer.'], ['4', 'jeu.'], ['5', 'ven.'], ['6', 'sam.'], ['0', 'dim.']];
  const vuesDe = () => { const c = conf(); if (!Array.isArray(c.vues)) c.vues = []; return c.vues; };
  const vueNommee = nom => vuesDe().find(v => v.nom === nom) || null;
  const memoTexte = () => tuile('memo')?.reglages?.texte || '';
  function photoVue() { return { tuiles: clone(conf().tuiles).map(t => { if (t.k === 'memo' && t.reglages) { const r = { ...t.reglages }; delete r.texte; t.reglages = r; } return t; }), colonnes: conf().colonnes }; }
  function enregistrerVue(nom, { auto = null } = {}) {
    nom = String(nom || '').trim().slice(0, 40); if (!nom) return null;
    const vues = vuesDe(); let v = vueNommee(nom);
    if (!v) { v = { nom, auto: auto || { jours: [], periode: '', veille: false } }; vues.push(v); }
    Object.assign(v, photoVue()); if (auto) v.auto = auto;
    if (!conf().vue) conf().base = photoVue();
    conf().vue = nom; conf().manuelLe = Date.now();
    garder(true); return v;
  }
  function appliquerVue(nom, { auto = false } = {}) {
    const c = conf(), memo = memoTexte();
    if (!nom) {   // la vue par défaut : la disposition d'avant la première vue nommée
      if (c.base && Array.isArray(c.base.tuiles)) { c.tuiles = normaliser({ ...c, tuiles: clone(c.base.tuiles) }).tuiles; c.colonnes = ['auto', '2', '3', '4'].includes(String(c.base.colonnes)) ? String(c.base.colonnes) : c.colonnes; const m0 = tuile('memo'); if (m0) { m0.reglages = m0.reglages || {}; m0.reglages.texte = memo; } }
      c.vue = null; T.vueAuto = ''; if (!auto) c.manuelLe = Date.now(); garder(); dessiner(); preparer(); appliquerFiltre(); annoncerSr('Vue par défaut.'); return true;
    }
    const v = vueNommee(nom); if (!v) return false;
    if (!c.vue) c.base = photoVue();
    c.tuiles = normaliser({ ...c, tuiles: clone(v.tuiles) }).tuiles; c.colonnes = ['auto', '2', '3', '4'].includes(String(v.colonnes)) ? String(v.colonnes) : c.colonnes;
    const m = tuile('memo'); if (m) { m.reglages = m.reglages || {}; m.reglages.texte = memo; }
    c.vue = nom; T.vueAuto = auto ? nom : ''; if (!auto) c.manuelLe = Date.now();
    garder(); dessiner(); preparer(); appliquerFiltre();
    annoncerSr(`Vue « ${nom} »${auto ? ', automatique' : ''}.`);
    return true;
  }
  function supprimerVue(nom) {
    const c = conf(); c.vues = vuesDe().filter(v => v.nom !== nom);
    if (c.vue === nom) c.vue = null;
    garder(true); dessiner();
  }
  // la vue que le moment appelle : ses jours, sa période (matin, après-midi), la veille d'une date confirmée
  function vueDuMoment() {
    const d = new Date(), jour = String(d.getDay()), h = d.getHours();
    const veille = E.dates.some(x => x.statut === 'confirmee' && !sansJour(x) && x.debut >= AUJ && dansJours(x.debut) <= 3);
    return vuesDe().find(v => { const a = v.auto || {}; const jours = Array.isArray(a.jours) ? a.jours.map(String) : [];
      if (!jours.length && !a.periode && !a.veille) return false;
      if (jours.length && !jours.includes(jour)) return false;
      if (a.periode === 'matin' && h >= 13) return false; if (a.periode === 'apres' && h < 13) return false;
      if (a.veille && !veille) return false;
      return true; }) || null;
  }
  function vueAutomatique() {
    const c = conf(), v = vueDuMoment();
    if (!v || c.vue === v.nom) return;
    if (c.manuelLe && Date.now() - c.manuelLe < 6 * 3600e3) return;   // un choix fait à la main tient six heures
    appliquerVue(v.nom, { auto: true });
  }
  function formVue(v = null) {
    const Gf = G(); if (!Gf) return;
    const a = (v && v.auto) || { jours: [], periode: '', veille: false };
    Gf.formulaire({ titre: v ? `La vue « ${v.nom} »` : 'Enregistrer la vue actuelle', sousTitre: v ? 'son nom, quand elle s’ouvre d’elle-même' : 'les tuiles, leur ordre, leurs tailles et leurs réglages, tels qu’ils sont', champs: [
      { k: 'nom', t: 'texte', l: 'Nom', valeur: v ? v.nom : '', requis: true, ph: 'Lundi matin, Veille de tournée, Clôture de saison…' },
      { k: 'jours', t: 'cases', l: 'S’ouvre d’elle-même ces jours', choix: JOURS_SEMAINE, valeur: (a.jours || []).map(String) },
      { k: 'periode', t: 'choix', seg: true, l: 'À quel moment', choix: [['', 'Toute la journée'], ['matin', 'Le matin'], ['apres', 'L’après-midi']], valeur: a.periode || '' },
      { k: 'veille', t: 'case', l: 'Quand une date confirmée est dans les trois jours (veille de tournée)', valeur: !!a.veille },
      ...(v ? [{ k: 'maj', t: 'case', l: 'Remplacer sa disposition par celle du tableau actuel', valeur: false }] : []),
    ], ok: v ? 'Enregistrer' : 'Enregistrer la vue', danger: v ? { libelle: 'Supprimer', faire: () => { const copie = JSON.parse(JSON.stringify(v)); supprimerVue(v.nom); annoncer(`Vue supprimée : ${copie.nom}.`, { libelle: 'Annuler', delai: 8000, action: () => { const c = conf(); c.vues = [...vuesDe().filter(x => x.nom !== copie.nom), copie]; garder(true); dessiner(); annoncer('Vue rétablie.'); } }); } } : null, note: 'Sans jour ni moment ni veille, la vue ne s’ouvre qu’à la main.', enregistrer: async x => {
      const nom = String(x.nom || '').trim().slice(0, 40); if (!nom) return 'Un nom.';
      const auto = { jours: (x.jours || []).map(String), periode: x.periode || '', veille: !!x.veille };
      if (v) {
        if (nom !== v.nom && vueNommee(nom)) return 'Une autre vue porte ce nom.';
        if (conf().vue === v.nom) conf().vue = nom;
        v.nom = nom; v.auto = auto; if (x.maj) Object.assign(v, photoVue());
        garder(true); dessiner();
      } else { if (vueNommee(nom)) return 'Une vue porte déjà ce nom : choisissez-en un autre, ou modifiez-la depuis « Personnaliser ».'; enregistrerVue(nom, { auto }); dessiner(); }
      annoncerSr(`Vue « ${nom} » enregistrée.`);
      return true;
    } });
  }
  function htmlVues() {
    const c = conf(), vues = vuesDe();
    return `<label class="tb-vues"><span class="sr">Vue du tableau</span><select id="tb-vue" aria-label="Vue du tableau de bord"><option value=""${!c.vue ? ' selected' : ''}>Vue par défaut</option>${vues.map(v => `<option value="${esc(v.nom)}"${c.vue === v.nom ? ' selected' : ''}>${esc(v.nom)}${T.vueAuto === v.nom ? ' (automatique)' : ''}</option>`).join('')}<option value="+">Enregistrer la vue actuelle sous…</option></select></label>`;
  }
  function panneauVues() {
    const vues = vuesDe();
    return `<div class="tb-pan-l"><span class="lib">Vues</span>${vues.map(v => `<span class="tb-vue-puce"><button type="button" class="puce" data-tb-vue-appliquer="${esc(v.nom)}" aria-pressed="${conf().vue === v.nom}">${esc(v.nom)}</button><button type="button" class="tb-ico" data-tb-vue-modifier="${esc(v.nom)}" title="Modifier la vue (nom, ouverture automatique, disposition)" aria-label="Modifier la vue ${esc(v.nom)}">${SVG.reglages}</button></span>`).join('')}<button type="button" class="btn petit" data-tb-vue-nouvelle>＋ Enregistrer la vue actuelle</button>
      <span class="compte">Une vue peut s’ouvrir d’elle-même certains jours, le matin ou l’après-midi, ou la veille d’une tournée.</span></div>`;
  }

  // ===================================================================================================== les chiffres qui bougent
  /* Dans « La saison en chiffres » : mois par mois (de septembre à août), les représentations, les spectateurs et les
     recettes (le montant de cession du suivi), en barres ; un mois cliqué cherche ses dates. Et la saison d'avant au même
     point : ce qu'elle comptait à la même date. */
  const MOIS_SAISON = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8];
  const moisDe = (S, m) => { const a = +String(S).split('-')[0]; return `${m >= 9 ? a : a + 1}-${String(m).padStart(2, '0')}`; };
  function seriesSaison(S) {
    const confs = E.dates.filter(d => d.saison === S && (d.nature || 'representations') === 'representations' && d.statut === 'confirmee'), ids = new Set(confs.map(d => d.id));
    const reps = new Map(), spect = new Map(), recettes = new Map();
    const ajouter = (m, k, n) => m.set(k, (m.get(k) || 0) + n);
    for (const d of confs) {
      const rs = E.reps.filter(r => r.date_id === d.id && !r.annulee);
      if (rs.length) rs.forEach(r => ajouter(reps, String(r.jour).slice(0, 7), 1)); else ajouter(reps, d.debut.slice(0, 7), Math.max(1, d.nb_representations || 1));
      const c = E.chiffresInstalles ? (E.chiffres || []).find(x => x.date_id === d.id) : null; if (c && c.spectateurs != null) ajouter(spect, d.debut.slice(0, 7), Number(c.spectateurs) || 0);
      const su = E.suivis.find(x => x.date_id === d.id); if (su && su.montant_cession != null) ajouter(recettes, d.debut.slice(0, 7), Number(su.montant_cession) || 0);
    }
    const mois = MOIS_SAISON.map(m => moisDe(S, m));
    return { mois, reps: mois.map(k => reps.get(k) || 0), spect: mois.map(k => spect.get(k) || 0), recettes: mois.map(k => recettes.get(k) || 0), ids };
  }
  // ce que la saison comptait au même point : les représentations jouées jusqu'au jour de la saison équivalent à aujourd'hui
  function auMemePoint(S) {
    const debut = `${String(S).split('-')[0]}-09-01`, jours = Math.round((Date.parse(`${AUJ}T12:00:00Z`) - Date.parse(`${String(AGENDA.saisonDe(AUJ)).split('-')[0]}-09-01T12:00:00Z`)) / 864e5);
    const limite = plusJours(debut, jours);
    const confs = E.dates.filter(d => d.saison === S && (d.nature || 'representations') === 'representations' && d.statut === 'confirmee');
    return confs.reduce((n, d) => { const rs = E.reps.filter(r => r.date_id === d.id && !r.annulee && r.jour <= limite); return n + (rs.length ? rs.length : d.debut <= limite ? Math.max(1, d.nb_representations || 1) : 0); }, 0);
  }
  function courbe(titre, xs, mois, { format = entier, unite = '' } = {}) {
    const max = Math.max(1, ...xs), total = xs.reduce((a, b) => a + b, 0);
    if (!total) return '';
    return `<div class="tb-courbe"><span class="tb-courbe-t">${esc(titre)} <b>${format(total)}${unite}</b></span><span class="tb-barres" role="group" aria-label="${esc(`${titre}, mois par mois : ${xs.map((v, i) => `${MC[+mois[i].slice(5, 7) - 1]} ${format(v)}`).join(', ')}`)}">${xs.map((v, i) => `<button type="button" data-tb-mois="${esc(mois[i])}" style="--h:${Math.round(v / max * 100)}%" title="${esc(`${MC[+mois[i].slice(5, 7) - 1]} ${mois[i].slice(0, 4)} : ${format(v)}${unite}`)}" aria-label="${esc(`${MC[+mois[i].slice(5, 7) - 1]} ${mois[i].slice(0, 4)} : ${format(v)}${unite}, voir ses dates`)}"><i></i></button>`).join('')}</span><span class="tb-mois">${mois.map(k => `<small>${esc(MC[+k.slice(5, 7) - 1].replace('.', ''))}</small>`).join('')}</span></div>`;
  }
  function courbesSaison(S, c, p) {
    const s = seriesSaison(S), ici = auMemePoint(S), avant = auMemePoint(saisonDecalee(S, -1));
    const ecart = avant ? Math.round((ici - avant) / avant * 100) : null;
    const point = AGENDA.saisonDe(AUJ) === S && (ici || avant) ? `<p class="tb-note">Au même point la saison passée : <b>${entier(avant)}</b> représentation${avant > 1 ? 's' : ''} ; cette saison : <b>${entier(ici)}</b>${ecart != null && ecart !== 0 ? ` <span class="${ecart > 0 ? 'tb-plus-pc' : 'tb-moins-pc'}">(${ecart > 0 ? '+' : ''}${ecart} %)</span>` : ''}.</p>` : '';
    return `<div class="tb-courbes">${courbe('Représentations', s.reps, s.mois)}${E.chiffresInstalles ? courbe('Spectateurs', s.spect, s.mois) : ''}${courbe('Recettes', s.recettes, s.mois, { format: n => euros(n).replace(',00', ''), unite: '' })}</div>${point}`;
  }
  // un mois cliqué : la recherche rapide s'ouvre sur ses dates (« novembre 2026 »)
  function chercherMois(ym) {
    if (typeof ouvrirRecherche !== 'function') return;
    ouvrirRecherche();
    const q = $('#rch-q'); if (!q) return;
    q.value = `${AGENDA.MOIS[+ym.slice(5, 7) - 1]} ${ym.slice(0, 4)}`;
    if (typeof rendreRch === 'function') rendreRch();
  }

  // ===================================================================================================== le briefing
  /* Le résumé de la semaine, lisible : les dates des sept jours qui viennent (horaires, lieu, feuille de route), qui part,
     ce qui manque, les échéances ; à copier (texte), à imprimer. */
  function briefing(jours = 7) {
    const fin = plusJours(AUJ, jours), ds = E.dates.filter(d => d.statut !== 'annulee' && !sansJour(d) && (d.fin || d.debut) >= AUJ && d.debut <= fin).sort(parDebut);
    const dates = ds.map(d => { const reps = repsDe(d.id).filter(r => !r.annulee).sort((a, b) => (a.jour + h5(a.heure)).localeCompare(b.jour + h5(b.heure))), f = E.feuilles.find(x => x.date_id === d.id), l = lieu(d.lieu_id);
      return { d, titre: titreDate(d), quand: jourCourt(d.debut) + (d.fin && d.fin !== d.debut ? ` → ${jourCourt(d.fin)}` : ''), ou: ouDe(d), adresse: l && l.adresse ? `${l.adresse}, ${l.commune}` : '',
        heures: reps.map(r => `${reps.some(x => x.jour !== r.jour) ? `${jourSansAn(r.jour)} ` : ''}${r.heure ? AGENDA.heureTexte(h5(r.heure)) : 'heure ?'}${r.public === 'scolaire' ? ' (scolaire)' : ''}`).join(', ') || (d.nature && d.nature !== 'representations' ? (NATURES_DATE.find(x => x[0] === d.nature) || [])[1] || '' : 'horaires à fixer'),
        feuille: !E.equipeInstallee ? '' : f ? (f.statut === 'publiee' ? `feuille de route publiée (v${f.version})` : 'feuille de route en brouillon') : 'feuille de route à composer', statut: d.statut === 'option' ? 'option' : '',
        equipe: E.equipeInstallee ? equipeDeLaDate(d).map(x => { const p = personne(x.personne_id); return p ? `${nomDe(p)}${x.fonction ? ` (${x.fonction})` : ''}` : ''; }).filter(Boolean) : [] }; });
    const a = typeof aCompleterAvant === 'function' ? aCompleterAvant(jours) : { n: 0, pers: [], lieux: [], sansLieu: [], feuilles: [] };
    const manques = [...a.pers.map(x => `${nomDe(x.p)} : pas de téléphone`), ...a.lieux.map(x => `${x.l.nom || x.l.commune} : ${x.manque.map(m => `sans ${m}`).join(', ')}`), ...a.sansLieu.map(d => `${titreDate(d)} le ${jourSansAn(d.debut)} : lieu à préciser`), ...a.feuilles.map(x => `${titreDate(x.d)} le ${jourSansAn(x.d.debut)} : ${x.f ? 'feuille à compléter' : 'feuille à composer'}`)];
    const U = urgences(), echeances = U.lignes.filter(x => !x.reporte).slice(0, 12).map(x => `${x.sujet} : ${x.titreTexte}${texteDe(x.sous) ? ` — ${texteDe(x.sous)}` : ''}${texteDe(x.droite) ? ` (${texteDe(x.droite)})` : ''}`);
    const seances = E.seances.filter(s => s.jour >= AUJ && s.jour <= fin && s.statut !== 'annulee').sort((x, y) => x.jour.localeCompare(y.jour)).map(s => { const at = E.ateliers.find(x => x.id === s.atelier_id), l = lieu(s.lieu_id); return `${jourSansAn(s.jour)}${s.heure_debut ? ` ${AGENDA.heureTexte(h5(s.heure_debut))}` : ''} : ${at?.titre || 'séance d’atelier'}${l ? `, ${l.nom || l.commune}` : ''}${s.classe ? ` (${s.classe})` : ''}`; });
    return { du: AUJ, au: fin, dates, manques, echeances, seances };
  }
  function texteBriefing(b) {
    const L = [];
    L.push(`Briefing du ${jourCourt(b.du)} au ${jourCourt(b.au)}`, '');
    L.push(`DATES (${b.dates.length})`);
    if (!b.dates.length) L.push('Aucune date cette semaine.');
    b.dates.forEach(x => { L.push(`• ${x.quand} — ${x.titre}${x.statut ? ` (${x.statut})` : ''}`, `  ${x.ou}${x.adresse ? ` — ${x.adresse}` : ''}`, `  ${x.heures}${x.feuille ? ` · ${x.feuille}` : ''}`); if (x.equipe.length) L.push(`  Qui part : ${x.equipe.join(', ')}`); });
    if (b.seances.length) { L.push('', `SÉANCES D’ATELIER (${b.seances.length})`); b.seances.forEach(s => L.push(`• ${s}`)); }
    L.push('', `CE QUI MANQUE (${b.manques.length})`); if (!b.manques.length) L.push('Rien : téléphones, lieux et feuilles de route sont complets.'); b.manques.forEach(m => L.push(`• ${m}`));
    L.push('', `ÉCHÉANCES (${b.echeances.length})`); if (!b.echeances.length) L.push('Rien à traiter.'); b.echeances.forEach(m => L.push(`• ${m}`));
    return L.join('\n');
  }
  function htmlBriefing(b) {
    const liste = (xs, vide) => (xs.length ? `<ul>${xs.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : `<p class="compte">${esc(vide)}</p>`);
    return `<p class="tb-brief-sous">Du ${esc(jourCourt(b.du))} au ${esc(jourCourt(b.au))}</p>
      <h3>Dates <span class="badge">${b.dates.length}</span></h3>${b.dates.length ? `<ul class="tb-brief-dates">${b.dates.map(x => `<li style="--c:${esc(couleurDate(x.d))}"><b>${esc(x.quand)}</b> — <a href="#/representations/${x.d.id}">${esc(x.titre)}</a>${x.statut ? ` <span class="badge option">${esc(x.statut)}</span>` : ''}<br><span>${esc(x.ou)}${x.adresse ? ` — ${esc(x.adresse)}` : ''}</span><br><span>${esc(x.heures)}${x.feuille ? ` · <a href="#/feuilles/${x.d.id}">${esc(x.feuille)}</a>` : ''}</span>${x.equipe.length ? `<br><span class="compte">Qui part : ${esc(x.equipe.join(', '))}</span>` : ''}</li>`).join('')}</ul>` : '<p class="compte">Aucune date cette semaine.</p>'}
      ${b.seances.length ? `<h3>Séances d’atelier <span class="badge">${b.seances.length}</span></h3>${liste(b.seances, '')}` : ''}
      <h3>Ce qui manque <span class="badge${b.manques.length ? ' option' : ' ok'}">${b.manques.length}</span></h3>${liste(b.manques, 'Rien : téléphones, lieux et feuilles de route sont complets.')}
      <h3>Échéances <span class="badge${b.echeances.length ? ' option' : ' ok'}">${b.echeances.length}</span></h3>${liste(b.echeances, 'Rien à traiter.')}`;
  }
  function ouvrirBriefing() {
    let dlg = $('#tb-brief');
    if (!dlg) {
      dlg = document.createElement('dialog'); dlg.id = 'tb-brief'; dlg.className = 'tb-brief'; dlg.setAttribute('aria-labelledby', 'tb-brief-titre');
      document.body.append(dlg);
      dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); const b = e.target.closest('button, a'); if (!b) return;
        if (b.dataset.tbBriefFermer !== undefined) dlg.close();
        else if (b.dataset.tbBriefCopier !== undefined) { navigator.clipboard?.writeText(dlg.dataset.texte || '').then(() => annoncer('Briefing copié : à coller dans un message à l’équipe.'), () => annoncer('Copie impossible dans ce navigateur.', { erreur: true })); }
        else if (b.dataset.tbBriefImprimer !== undefined) { document.documentElement.classList.add('tb-impression'); const fin = () => { document.documentElement.classList.remove('tb-impression'); window.removeEventListener('afterprint', fin); }; window.addEventListener('afterprint', fin); window.print(); setTimeout(fin, 2000); }
        else if (b.matches('a[href^="#/"]')) dlg.close(); });
    }
    const b = briefing();
    dlg.dataset.texte = texteBriefing(b);
    dlg.innerHTML = `<div class="tb-brief-boite"><div class="tb-brief-tete"><h2 id="tb-brief-titre">Briefing de la semaine</h2><span class="tb-brief-boutons"><button type="button" class="btn petit" data-tb-brief-copier>Copier le texte</button><button type="button" class="btn petit" data-tb-brief-imprimer>Imprimer</button><button type="button" class="btn petit principal" data-tb-brief-fermer>Fermer</button></span></div><div class="tb-brief-corps">${htmlBriefing(b)}</div></div>`;
    if (!dlg.open) dlg.showModal();
    $('[data-tb-brief-fermer]', dlg)?.focus();
  }
  document.addEventListener('keydown', clavierFile);

  // ===================================================================================================== styles
  document.head.insertAdjacentHTML('beforeend', `<style id="styles-tableau">
/* le tableau de bord : la grille des tuiles (trois ou quatre colonnes sur un écran d'ordinateur, une au téléphone), chaque
   tuile avec son en-tête (titre, compte, lien, réglages, réduire), ses lignes qui mènent à la fiche, et le mode
   « Personnaliser » (poignée, flèches, taille, masquer, le panneau des réglages de la grille) */
.tb-tete-page .tb-jour { margin-right: auto; }
.tb-tete-page h1 { margin-right: 10px; }
.tb-grille { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 16px; align-items: start; }
.tb-grille[data-colonnes="2"] { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.tb-grille[data-colonnes="3"] { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.tb-grille[data-colonnes="4"] { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.tb-tuile { display: flex; flex-direction: column; min-width: 0; background: var(--carte); border: 1px solid var(--trait); border-radius: var(--rayon); box-shadow: var(--ombre); container-type: inline-size; }
.tb-tuile.taille-m { grid-column: span 2; }
.tb-tuile.taille-g { grid-column: 1 / -1; }
@media (max-width: 760px) { .tb-grille, .tb-grille[data-colonnes] { grid-template-columns: minmax(0, 1fr); } .tb-tuile.taille-m, .tb-tuile.taille-g { grid-column: auto; } }
@media (min-width: 761px) and (max-width: 1100px) { .tb-grille[data-colonnes="3"], .tb-grille[data-colonnes="4"] { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.tb-vide { grid-column: 1 / -1; text-align: center; color: var(--gris); }
.tb-tete { display: flex; align-items: center; gap: 4px; padding: 10px 8px 9px 14px; border-bottom: 1px solid var(--trait); }
.tb-tete h2 { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; margin: 0 4px 0 0; font-size: 15px; line-height: 1.25; }
.tb-tete h2 .tb-titre { min-width: 0; overflow-wrap: anywhere; }
.tb-tete .badge { font-size: 11px; }
.tb-tete .tb-badge:empty { display: none; }
.tb-lien { font-size: 13px; font-weight: 650; white-space: nowrap; text-decoration: none; padding: 2px 6px; border-radius: 6px; }
.tb-lien:hover { background: var(--doux); }
@container (max-width: 430px) { .tb-lien .mot { display: none; } .tb-lien { padding: 2px 4px; } }
.tb-ico { display: inline-grid; place-items: center; width: 28px; height: 28px; padding: 0; border: 1px solid transparent; border-radius: 7px; background: none; color: var(--gris); cursor: pointer; font-weight: 700; }
.tb-ico:hover, .tb-ico[aria-expanded="true"] { background: var(--doux); color: var(--encre); }
.tb-ico[disabled] { opacity: .35; cursor: default; background: none; }
.tb-replier svg { transition: transform .15s; }
.tb-tuile.replie .tb-replier svg { transform: rotate(-90deg); }
.tb-tuile.replie .tb-corps, .tb-tuile.replie .tb-reglages { display: none; }
.tb-corps { display: grid; gap: 6px; padding: 10px 12px 12px; }
.tb-reglages { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 18px; padding: 10px 14px; background: var(--doux); border-bottom: 1px solid var(--trait); font-size: 13.5px; }
.tb-reglages[hidden] { display: none; }
.tb-reglages label { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; color: var(--gris); }
.tb-reglages select { width: auto; min-height: 32px; padding: 3px 8px; font-size: 13.5px; }
.tb-reglages .case { font-size: 13.5px; color: var(--encre); font-weight: 600; }
.tb-reglages .case input { width: 16px; height: 16px; }
.tb-cases { display: flex; flex-wrap: wrap; gap: 6px 14px; margin: 0; padding: 6px 10px 8px; border: 1px solid var(--trait); border-radius: 9px; flex: 1 1 100%; }
.tb-cases legend { padding: 0 4px; font-size: 12.5px; font-weight: 700; color: var(--gris); }
.tb-l { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 2px 10px; align-items: center; padding: 7px 9px; border-radius: 9px; text-decoration: none; color: var(--encre); background: var(--doux); border-left: 3px solid var(--c, var(--trait)); }
.tb-l.sans-gauche { grid-template-columns: minmax(0, 1fr) auto; }
.tb-l:hover { background: color-mix(in srgb, var(--doux) 55%, var(--accent-doux)); }
.tb-jj { width: 38px; text-align: center; font-size: 11.5px; font-weight: 800; line-height: 1.15; color: var(--gris); }
.tb-jj b { display: block; font-size: 18px; color: var(--encre); }
.tb-l .avatar.petit { width: 32px; height: 32px; }
.tb-l-corps { display: grid; gap: 1px; min-width: 0; }
.tb-l-t { font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tb-l-s { color: var(--gris); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tb-l-s .reps { display: inline-flex; margin: 2px 0 0 6px; vertical-align: middle; }
.tb-l-s .dp-bilan { display: inline-flex; margin: 3px 0 0; }
.tb-l-d { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; font-size: 12.5px; color: var(--gris); white-space: nowrap; text-align: right; }
.tb-l-d .a-completer[hidden] { display: none; }
.tb-tel { font-weight: 700; color: var(--accent); }
.tb-tel:hover { text-decoration: underline; }
.tb-rien { margin: 4px 2px; color: var(--gris); font-size: 14px; }
.tb-rien.ok { color: var(--ok); font-weight: 600; }
.tb-note { margin: 2px 2px 0; font-size: 12.5px; color: var(--gris); }
.tb-cat { display: grid; gap: 5px; }
.tb-cat h3 { display: flex; align-items: center; gap: 8px; margin: 6px 2px 0; font-size: 12px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--gris); }
.tb-cat:first-child h3 { margin-top: 0; }
.tb-cat h3 a { color: inherit; text-decoration: none; }
.tb-cat h3 a:hover { text-decoration: underline; }
.tb-cat h3 .badge { font-size: 11px; letter-spacing: 0; }
.tb-plus { margin: 0 2px; font-size: 13px; font-weight: 650; }
.tb-actions { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; }
.tb-actions .btn { justify-content: flex-start; padding: 10px 12px; text-align: left; white-space: normal; }
.tb-bouton { justify-self: start; margin-top: 4px; }
.tb-saison { margin: 0 2px 2px; font-size: 13.5px; color: var(--gris); }
.tb-kpi { display: grid; grid-template-columns: repeat(auto-fit, minmax(135px, 1fr)); gap: 8px; }
.tb-kpi > * { display: grid; gap: 1px; align-content: start; padding: 10px 12px; border-radius: 10px; background: var(--doux); color: var(--encre); text-decoration: none; min-width: 0; }
.tb-kpi > a:hover { background: color-mix(in srgb, var(--doux) 55%, var(--accent-doux)); }
.tb-kpi span { font-size: 12.5px; font-weight: 650; color: var(--gris); }
.tb-kpi b { font-size: 22px; font-weight: 800; line-height: 1.15; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.tb-kpi > .ok b { color: var(--ok); }
.tb-kpi > .alerte b { color: var(--alerte); }
.tb-kpi small { font-size: 12px; color: var(--gris); }
.tb-pipe { display: flex; height: 10px; margin-top: 4px; border-radius: 999px; overflow: hidden; background: var(--doux); }
.tb-pipe span { display: block; min-width: 3px; }
.tb-legende { display: flex; flex-wrap: wrap; gap: 3px 12px; margin: 0; font-size: 12.5px; color: var(--gris); }
.tb-legende span { display: inline-flex; align-items: center; gap: 5px; }
.tb-legende i { width: 9px; height: 9px; border-radius: 50%; }
.tb-legende b { color: var(--encre); }
.tb-sp { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 6px 9px; border-radius: 9px; background: var(--doux); border-left: 3px solid var(--c, var(--trait)); }
.tb-sp .pastille { --c: inherit; }
.tb-sp a.tb-l-t { color: var(--encre); text-decoration: none; }
.tb-sp a.tb-l-t:hover { text-decoration: underline; }
.tb-memo { min-height: 150px; resize: vertical; line-height: 1.5; }
.tb-memo-etat { margin: 0; text-align: right; min-height: 1em; }
/* personnaliser */
.tb-panneau { display: grid; gap: 10px; margin-bottom: 14px; }
.tb-panneau[hidden] { display: none; }
.tb-panneau .aide { margin: 0; color: var(--gris); font-size: 13px; }
.tb-pan-l { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; }
.tb-pan-l .lib { font-size: 13px; font-weight: 650; color: var(--gris); }
.tb-pan-g { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; }
.tb-pan-fin { display: inline-flex; gap: 8px; margin-left: auto; }
.tb-outils { display: none; align-items: center; gap: 2px; }
.tb-outils .seg { margin: 0 2px; }
.tb-outils .seg button { padding: 2px 7px; font-size: 12px; min-width: 26px; }
.tb-poignee { display: inline-grid; place-items: center; width: 16px; color: var(--gris); cursor: grab; }
.tb-grille.edition .tb-outils { display: inline-flex; }
.tb-grille.edition .tb-lien, .tb-grille.edition [data-tb-reglages] { display: none; }
.tb-grille.edition .tb-tuile { outline: 2px dashed color-mix(in srgb, var(--accent) 45%, transparent); outline-offset: 2px; }
.tb-grille.edition .tb-tete { cursor: grab; }
.tb-grille.edition .tb-tete:active { cursor: grabbing; }
.tb-grille.edition .tb-corps { pointer-events: none; opacity: .75; }
.tb-tuile.glisse { opacity: .4; }
.tb-tuile.cible-avant { box-shadow: -5px 0 0 var(--accent); }
.tb-tuile.cible-apres { box-shadow: 5px 0 0 var(--accent); }
@media (max-width: 760px) { .tb-tuile.cible-avant { box-shadow: 0 -5px 0 var(--accent); } .tb-tuile.cible-apres { box-shadow: 0 5px 0 var(--accent); } .tb-pan-fin { margin-left: 0; } }
/* le bandeau du jour */
.tb-salut { position: relative; overflow: hidden; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px 24px; align-items: center; margin: 2px 0 14px; padding: 22px 26px; border-radius: var(--rayon, 16px); background: linear-gradient(120deg, color-mix(in srgb, var(--accent-doux, #ece5da) 85%, var(--carte, #fff)) 0%, var(--carte, #fff) 58%, color-mix(in srgb, var(--ambre-doux, var(--option-doux, #f8efd9)) 70%, var(--carte, #fff)) 100%); border: 1px solid var(--trait); box-shadow: var(--ombre); }
.tb-salut-corps { position: relative; min-width: 0; }
.tb-salut h1 { margin: 0 0 4px; font: 700 12px/1.3 var(--etiq, inherit); letter-spacing: .14em; text-transform: uppercase; color: var(--accent); }
.tb-bonjour { margin: 0; font: 700 clamp(26px, 3vw, 34px)/1.1 var(--titres, inherit); letter-spacing: -.01em; }
.tb-bonjour b { color: var(--accent); }
.tb-salut-jour { margin: 6px 0 0; font-size: 11px; color: var(--gris); }
.tb-salut-sous { margin: 6px 0 0; max-width: 60ch; font-size: 14.5px; color: var(--gris); }
.tb-salut-chiffres { position: relative; display: flex; gap: 10px; margin: 0; padding: 0; list-style: none; }
.tb-salut-chiffres li { display: grid; gap: 2px; min-width: 104px; padding: 10px 14px; border-radius: 12px; background: color-mix(in srgb, var(--carte, #fff) 72%, transparent); border: 1px solid var(--trait); text-align: center; }
.tb-salut-chiffres b { font: 700 28px/1.1 var(--titres, inherit); color: var(--encre); }
.tb-salut-chiffres li:first-child b { color: var(--corail, var(--accent)); }
.tb-salut-chiffres span { font-size: 10.5px; color: var(--gris); }
.tb-salut-orne { position: absolute; right: -36px; bottom: -44px; width: 250px; height: 154px; color: var(--accent); opacity: .18; pointer-events: none; }
.tb-tete-page { margin: 0 0 14px; justify-content: flex-end; }
.tb-ico-t { display: inline-grid; place-items: center; flex: none; width: 24px; height: 24px; border-radius: 7px; background: var(--doux); color: var(--accent); }
.tb-ico-t svg { width: 14px; height: 14px; }
.tb-ico-t:empty { display: none; }
@media (max-width: 760px) { .tb-salut { grid-template-columns: minmax(0, 1fr); padding: 18px 16px; } .tb-salut-orne { display: none; } .tb-salut-chiffres li { flex: 1 1 0; min-width: 0; padding: 8px 6px; } .tb-salut-chiffres b { font-size: 22px; } }
/* traiter sur place, la file, les épingles et les reports */
.tb-lt { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px; align-items: stretch; }
.tb-lt[hidden] { display: none; }
.tb-lt > .tb-l { min-width: 0; }
.tb-traiter { display: inline-grid; place-items: center; width: 34px; border: 1px solid var(--trait); border-radius: 9px; background: var(--carte); color: var(--accent); cursor: pointer; }
.tb-traiter:hover, .tb-traiter:focus-visible { background: var(--accent); color: var(--sur-accent, #fff); border-color: var(--accent); }
.tb-lt.epingle > .tb-l { background: color-mix(in srgb, var(--doux) 60%, var(--accent-doux)); }
.tb-lt.reportee > .tb-l { opacity: .65; }
.tb-epingle { font-size: 12px; }
.tb-cat-tag { display: inline-block; margin-right: 4px; padding: 0 6px; border-radius: 999px; background: var(--carte); border: 1px solid var(--trait); font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--gris); }
.tb-l:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
/* les tuiles qui se parlent, le filtre */
.tb-grille .tb-lie { box-shadow: 0 0 0 2px var(--accent); background: color-mix(in srgb, var(--doux) 40%, var(--accent-doux)); }
.tb-grille .tb-lie-sp { box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 45%, transparent); }
.tb-sp .tb-sp-boutons { display: inline-flex; align-items: center; gap: 4px; }
.tb-filtre { display: inline-flex; align-items: center; gap: 8px; margin: -6px 0 12px; padding: 6px 6px 6px 12px; border-radius: 999px; background: var(--accent-doux); color: var(--encre); font-size: 13.5px; }
.tb-filtre[hidden] { display: none; }
.tb-filtre .pastille { --c: var(--accent); }
.tb-ico[data-tb-filtre][aria-pressed="true"] { background: var(--accent); color: var(--sur-accent, #fff); }
/* glisser-déposer entre tuiles */
.tb-l[draggable="true"] { cursor: grab; }
.tb-l.glisse { opacity: .45; }
.tb-grille .tb-cible { outline: 2px dashed var(--accent); outline-offset: 2px; background: var(--accent-doux); }
/* le fil : annuler, le diff */
.tb-annuler { align-self: center; white-space: nowrap; }
.tb-diff { position: absolute; z-index: 60; max-width: min(520px, calc(100vw - 16px)); padding: 8px 10px; border: 1px solid var(--trait); border-radius: 10px; background: var(--carte); color: var(--encre); box-shadow: 0 12px 36px rgba(20, 10, 20, .22); font-size: 12.5px; }
.tb-diff table { border-collapse: collapse; }
.tb-diff th { text-align: left; padding: 2px 10px 2px 0; color: var(--gris); font-weight: 650; white-space: nowrap; }
.tb-diff td { padding: 2px 8px 2px 0; max-width: 220px; overflow-wrap: anywhere; }
.tb-diff s { color: var(--alerte); }
/* les vues */
.tb-vues select { min-height: 36px; padding: 4px 28px 4px 10px; font-size: 13.5px; }
.tb-vue-puce { display: inline-flex; align-items: center; gap: 2px; }
.tb-vue-puce .puce[aria-pressed="true"] { background: var(--accent); color: var(--sur-accent, #fff); border-color: var(--accent); }
/* les chiffres qui bougent */
.tb-courbes { display: grid; gap: 8px; margin-top: 8px; }
.tb-courbe { display: grid; gap: 2px; }
.tb-courbe-t { font-size: 12.5px; font-weight: 650; color: var(--gris); }
.tb-courbe-t b { color: var(--encre); margin-left: 4px; }
.tb-barres { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 3px; align-items: end; height: 44px; }
.tb-barres button { display: flex; align-items: flex-end; height: 100%; padding: 0; border: 0; background: none; cursor: pointer; }
.tb-barres button i { display: block; width: 100%; height: max(2px, var(--h)); border-radius: 3px 3px 0 0; background: color-mix(in srgb, var(--accent) 70%, var(--carte)); }
.tb-barres button:hover i, .tb-barres button:focus-visible i { background: var(--accent); }
.tb-mois { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 3px; font-size: 10px; color: var(--gris); text-align: center; }
.tb-plus-pc { color: var(--ok); font-weight: 700; }
.tb-moins-pc { color: var(--alerte); font-weight: 700; }
/* le briefing */
dialog.tb-brief { width: min(760px, calc(100% - 24px)); max-width: none; max-height: calc(100dvh - 24px); margin: auto; padding: 0; border: 1px solid var(--trait); border-radius: 14px; background: var(--carte); color: var(--encre); box-shadow: 0 18px 60px rgba(20, 10, 20, .3); }
dialog.tb-brief::backdrop { background: rgba(23, 15, 26, .4); }
.tb-brief-boite { display: flex; flex-direction: column; max-height: calc(100dvh - 26px); }
.tb-brief-tete { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 14px 18px; border-bottom: 1px solid var(--trait); }
.tb-brief-tete h2 { margin: 0 auto 0 0; font-size: 18px; }
.tb-brief-boutons { display: inline-flex; gap: 6px; }
.tb-brief-corps { overflow: auto; padding: 6px 18px 18px; }
.tb-brief-corps h3 { display: flex; align-items: center; gap: 8px; margin: 16px 0 6px; font-size: 14px; }
.tb-brief-corps ul { margin: 0; padding-left: 18px; }
.tb-brief-corps li { margin: 3px 0; }
.tb-brief-sous { margin: 10px 0 0; color: var(--gris); }
.tb-brief-dates { list-style: none; padding: 0 !important; display: grid; gap: 8px; }
.tb-brief-dates li { padding: 8px 12px; border-radius: 9px; background: var(--doux); border-left: 3px solid var(--c, var(--trait)); }
@media print { html.tb-impression body > :not(#tb-brief) { display: none !important; } html.tb-impression dialog.tb-brief { position: static; border: 0; box-shadow: none; max-height: none; width: auto; } html.tb-impression .tb-brief-boutons { display: none; } html.tb-impression .tb-brief-corps { overflow: visible; } }
@media (prefers-reduced-motion: reduce) { .tb-replier svg { transition: none; } }
</style>`);

  // une action rapide retirée depuis son menu (menus.js) : comme décochée dans les réglages
  function retirerAction(k) {
    const t = tuile('actions'); if (!t) return;
    t.reglages = t.reglages || {};
    t.reglages.actions = valeurs('actions').actions.filter(x => x !== k);
    garder(); dessinerCorps('actions'); annoncerSr('Action retirée.');
  }
  return { vue, charger, depart, TUILES, conf, normaliser, retirerAction, lienJournal, ACTIONS, CATEGORIES, urgences, traiter, epingler, reporter, REPORTS, vues: vuesDe, appliquerVue, formVue, ouvrirBriefing, briefing, texteBriefing, chercherMois, annulerJournal, recente, filtrer };
})();
// la route de la rubrique (admin/index.html)
function vueTableau() { return TABLEAU.vue(); }
