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
    edition: false, journal: null, journalLu: 0, journalLecture: null, journalDiffere: null, propLecture: null, ouverts: new Set(), glisse: null, memoMinuteur: null };
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
  const nomAdmin = id => { const a = E.admins.find(x => x.user_id === id); return a?.nom || (id === uid() ? E.session.user.email : id ? 'un administrateur' : 'import'); };
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
      lignes: () => (E.prospects || []).filter(p => p.date_prochaine_relance && p.date_prochaine_relance <= AUJ && !['bilan', 'refus', 'converti_en_date'].includes(p.etape)).map(p => ({ tri: p.date_prochaine_relance, href: '#/diffusion', attrs: `data-prospect="${p.id}"`, couleur: sp(p.spectacle_id) ? couleurSp(sp(p.spectacle_id)) : 'var(--alerte)',
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
    urgent: { titre: 'À traiter', description: 'Ce qui attend une réponse ou une décision : devis, relances, notes de frais, options, horaires, contrats, feuilles, propositions, invitations.', taille: 'm', lien: () => null,
      reglages: [{ k: 'categories', t: 'cases', l: 'Ce que la tuile suit', choix: () => CATEGORIES.filter(c => !c.dispo || c.dispo()).map(c => [c.k, c.titre]), defaut: CATEGORIES_DEFAUT },
        { k: 'max', t: 'choix', l: 'Lignes par sujet', choix: [[3, '3'], [5, '5'], [10, '10']], defaut: 5 }],
      corps: r => {
        let total = 0;
        const parties = CATEGORIES.filter(c => r.categories.includes(c.k) && (!c.dispo || c.dispo())).map(c => {
          const xs = c.lignes().sort((a, b) => String(a.tri).localeCompare(String(b.tri)));
          total += xs.length;
          return xs.length ? `<section class="tb-cat"><h3><a href="${esc(c.tout)}">${esc(c.titre)}</a><span class="badge option">${xs.length}</span></h3>${xs.slice(0, r.max).map(ligne).join('')}${plus(xs.length - r.max, c.tout)}</section>` : '';
        }).join('');
        return { n: total, ok: !total, html: parties || rien('Rien à traiter : tout est à jour.', true) };
      } },
    avant: { titre: 'À compléter avant la tournée', description: 'Pour les dates confirmées qui viennent : les téléphones de l’équipe, les adresses et contacts des lieux, les feuilles de route.', taille: 'p', lien: () => ['#/representations', 'Représentations'],
      reglages: [{ k: 'jours', t: 'choix', l: 'Les dates confirmées des', choix: [[30, '30 prochains jours'], [60, '60 prochains jours'], [90, '90 prochains jours']], defaut: 60 }],
      corps: r => {
        const a = aCompleterAvant(r.jours);
        const quand = ds => `${ds.length > 1 ? 'les' : 'le'} ${ds.slice(0, 2).map(d => jourSansAn(d.debut)).join(', ')}${ds.length > 2 ? ` et ${ds.length - 2 > 1 ? `${ds.length - 2} autres` : 'une autre'}` : ''}`;
        const section = (titre, xs) => (xs.length ? `<section class="tb-cat"><h3>${titre}<span class="badge option">${xs.length}</span></h3>${xs.join('')}</section>` : '');
        const html = a.n ? section('Téléphones', a.pers.map(x => ligne({ href: `#/equipe/${x.p.id}`, viser: 'telephone', couleur: 'var(--option)', titre: esc(nomDe(x.p)), sous: `pas de téléphone · part ${esc(quand(x.dates))}` })))
          + section('Lieux', [...a.lieux.map(x => ligne({ href: `#/lieux/${x.l.id}`, viser: x.manque[0], couleur: 'var(--option)', titre: esc(x.l.nom ? `${x.l.nom}, ${x.l.commune}` : x.l.commune), sous: `${x.manque.map(m => `sans ${m}`).join(', ')} · ${esc(quand(x.dates))}` })),
            ...a.sansLieu.map(d => ligne({ href: `#/representations/${d.id}`, viser: '#d-lieu input', couleur: couleurDate(d), titre: 'Lieu à préciser', sous: `${esc(titreDate(d))} · le ${esc(jourSansAn(d.debut))}` }))])
          + section('Feuilles de route', a.feuilles.map(x => ligne({ href: `#/feuilles/${x.d.id}`, viser: x.f ? '#fr-manques' : '#fr-composer', couleur: couleurDate(x.d), titre: `${esc(jourSansAn(x.d.debut))} · ${esc(ouDe(x.d))}`, sous: esc(titreDate(x.d)), droite: x.f ? `<span class="badge option">${x.n} à compléter</span>` : '<span class="badge">à composer</span>' })))
          : rien(a.ds.length ? `Rien ne manque pour ${pl(a.ds.length, 'date confirmée')} : téléphones, lieux et feuilles de route sont complets.` : 'Aucune date confirmée dans cette période.', !!a.ds.length);
        return { n: a.n, ok: !a.n, html };
      } },
    prochaines: { titre: 'Prochaines dates', description: 'Les dates qui viennent, avec leurs horaires, leur lieu et l’état de leur feuille de route.', taille: 'p', lien: () => ['#/representations', 'Représentations'],
      reglages: [{ k: 'n', t: 'choix', l: 'Montrer', choix: [[5, '5 dates'], [8, '8 dates'], [12, '12 dates'], [20, '20 dates']], defaut: 8 }, { k: 'options', t: 'case', l: 'Les options aussi', defaut: true }, { k: 'autres', t: 'case', l: 'Répétitions, résidences et autres dates', defaut: true }],
      corps: r => {
        const xs = E.dates.filter(d => aVenir(d) && d.statut !== 'annulee' && (r.options || d.statut !== 'option') && (r.autres || (d.nature || 'representations') === 'representations')).sort(parDebut);
        return { html: xs.length ? xs.slice(0, r.n).map(d => ligne({ href: `#/representations/${d.id}`, attrs: `data-date="${d.id}"`, couleur: couleurDate(d), gauche: jj(d.debut), titre: esc(titreDate(d)), sous: `${esc(ouDe(d))}${d.fin && d.fin !== d.debut ? ` · jusqu’au ${esc(jourSansAn(d.fin))}` : ''}${heuresDe(d)}`,
          droite: `<span class="compte">${esc(dansTexte(d.debut))}</span>${badgesDate(d)}${E.equipeInstallee ? resteFeuille(d.id) : ''}` })).join('') + plus(xs.length - r.n, '#/representations') : rien('Aucune date à venir.') };
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
        </div>` };
      } },
    equipe: { titre: 'Qui part bientôt', description: 'Les personnes de l’équipe en tournée dans les jours qui viennent, avec leur téléphone.', taille: 'p', dispo: () => E.equipeInstallee, lien: () => ['#/equipe', 'Équipe'],
      reglages: [{ k: 'jours', t: 'choix', l: 'Dans les', choix: JOURS.slice(0, 3), defaut: 14 }],
      corps: r => {
        const ds = E.dates.filter(d => d.statut === 'confirmee' && aVenir(d) && !sansJour(d) && dansJours(d.debut) <= r.jours).sort(parDebut);
        const pers = new Map();
        ds.forEach(d => equipeDeLaDate(d).forEach(x => { const p = personne(x.personne_id); if (!p) return; if (!pers.has(p.id)) pers.set(p.id, { p, fonctions: new Set(), dates: [] }); const o = pers.get(p.id); if (x.fonction) o.fonctions.add(x.fonction); o.dates.push(d); }));
        const xs = [...pers.values()].sort((a, b) => parDebut(a.dates[0], b.dates[0]) || norm(nomDe(a.p)).localeCompare(norm(nomDe(b.p))));
        return { n: xs.length, html: xs.length ? xs.map(x => { const tel = (priveeDe(x.p.id)?.telephone || '').trim(), href = tel ? (jetonsContact(tel).find(j => j.genre === 'tel') || {}).href : '';
          return ligne({ href: `#/equipe/${x.p.id}`, viser: tel ? '' : 'telephone', attrs: `data-personne="${x.p.id}"`, couleur: couleurDate(x.dates[0]), gauche: avatar(x.p, true), titre: esc(nomDe(x.p)), sous: `${esc([...x.fonctions].join(', ') || (x.p.metiers || []).join(', '))}${x.fonctions.size || (x.p.metiers || []).length ? ' · ' : ''}${esc(x.dates.slice(0, 3).map(d => `${jourSansAn(d.debut)} ${ouDe(d).split(',').pop().trim()}`).join(', '))}${x.dates.length > 3 ? ` +${x.dates.length - 3}` : ''}`,
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
        return { n: xs.length, html: (xs.length ? xs.slice(0, r.n).map(p => { const j0 = (p.jours || [])[0]; return ligne({ href: `#/planning/proposition/${p.id}`, couleur: sp(p.spectacle_id) ? couleurSp(sp(p.spectacle_id)) : 'var(--accent)', gauche: jj(j0 ? String(j0.debut).slice(0, 10) : ''), titre: esc(p.titre),
          sous: `${esc(pl((p.destinataires || []).length, 'personne'))}${(p.jours || []).length > 1 ? ` · ${pl(p.jours.length, 'jour')}` : ''}${sp(p.spectacle_id) ? ` · ${esc(titreCourt(sp(p.spectacle_id)))}` : ''}<span class="dp-bilan">${bilanHtml(bilanDe(p))}</span>` }); }).join('') + plus(xs.length - r.n, '#/planning/propositions')
          : rien('Aucune proposition ouverte.')) + bouton };
      } },
    ateliers: { titre: 'Séances d’atelier à venir', description: 'Les séances menées dans les établissements dans les semaines qui viennent.', taille: 'p', lien: () => ['#/ateliers/seances', 'Ateliers'],
      reglages: [{ k: 'jours', t: 'choix', l: 'Dans les', choix: JOURS.slice(1, 4), defaut: 30 }],
      corps: r => {
        const xs = E.seances.filter(s => s.jour >= AUJ && dansJours(s.jour) <= r.jours && s.statut !== 'annulee').sort((a, b) => (a.jour < b.jour ? -1 : a.jour > b.jour ? 1 : String(a.heure_debut || '').localeCompare(String(b.heure_debut || ''))));
        const heures = xs.reduce((n, s) => n + heuresSeance(s), 0);
        return { n: xs.length, html: xs.length ? xs.slice(0, 8).map(s => { const a = E.ateliers.find(x => x.id === s.atelier_id), l = lieu(s.lieu_id), spx = sp(s.spectacle_id || a?.spectacle_id);
          return ligne({ href: `#/ateliers/seances/${s.id}`, attrs: `data-seance="${s.id}"`, couleur: couleurSp(spx), gauche: jj(s.jour), titre: esc(a?.titre || spx?.titre || 'Séance d’atelier'), sous: esc([l ? (l.nom || l.commune) : s.etablissement, s.classe, s.niveau, s.nb_eleves ? pl(s.nb_eleves, 'élève') : ''].filter(Boolean).join(' · ')),
            droite: `<span class="compte">${s.heure_debut ? esc(AGENDA.heureTexte(h5(s.heure_debut)) + (s.heure_fin ? `–${AGENDA.heureTexte(h5(s.heure_fin))}` : '')) : 'heure ?'}</span>${s.statut === 'option' ? '<span class="badge option">Option</span>' : ''}` }); }).join('')
          + plus(xs.length - 8, '#/ateliers/seances') + `<p class="tb-note">${pl(xs.length, 'séance')}${heures ? ` · ${entier(Math.round(heures * 10) / 10)} h d’éducation artistique` : ''}</p>` : rien('Aucune séance d’atelier dans cette période.') };
      } },
    journal: { titre: 'Dernières modifications', description: 'Ce qui vient de changer dans la base, par qui ; chaque ligne mène à la fiche.', taille: 'p', lien: () => ['#/journal', 'Journal'],
      reglages: [{ k: 'n', t: 'choix', l: 'Montrer', choix: [[5, '5 modifications'], [8, '8 modifications'], [15, '15 modifications']], defaut: 8 }],
      lire: () => lireJournal(),
      corps: r => {
        if (!T.journal) return { html: '<p class="tb-rien" role="status">Lecture du journal…</p>' };
        const xs = T.journal.filter(j => j.operation !== 'UPDATE' || champsChanges(j).length).slice(0, r.n);
        return { html: xs.length ? xs.map(j => { const ch = champsChanges(j); return ligne({ href: lienJournal(j), couleur: j.operation === 'DELETE' ? 'var(--alerte)' : j.operation === 'INSERT' ? 'var(--ok)' : 'var(--trait)', titre: `${OPS_JOURNAL[j.operation] || j.operation} · ${esc(NOMS_TABLES[j.table_nom] || j.table_nom)}`,
          sous: `${esc(resumeJournal(j))}${ch.length ? ` — ${esc(ch.slice(0, 4).join(', '))}${ch.length > 4 ? '…' : ''}` : ''}`, droite: `<span class="compte">${esc(depuisTexte(j.quand))}</span><span class="compte">${esc(nomAdmin(j.qui))}</span>` }); }).join('') : rien('Rien encore.') };
      } },
    spectacles: { titre: 'Spectacles', description: 'Chaque spectacle, ses dates à venir et la prochaine ; sa fiche et ses dates en un clic.', taille: 'p', visible: false, lien: () => ['#/spectacles', 'Spectacles'],
      corps: () => {
        const xs = E.spectacles.filter(s => s.page).sort((a, b) => a.ordre - b.ordre);
        return { html: xs.length ? xs.map(s => { const ds = E.dates.filter(d => d.spectacle_id === s.id && aVenir(d) && d.statut !== 'annulee' && (d.nature || 'representations') === 'representations').sort(parDebut), confirmees = ds.filter(d => d.statut === 'confirmee'), d0 = ds[0];
          return `<div class="tb-sp" style="--c:${esc(couleurSp(s))}"><span class="pastille"></span><span class="tb-l-corps"><a class="tb-l-t" href="#/spectacles/${esc(s.slug)}">${esc(s.titre)}</a><span class="tb-l-s">${d0 ? `${esc(jourSansAn(d0.debut))} · ${esc(ouDe(d0))}${d0.statut === 'option' ? ' (option)' : ''}` : 'aucune date à venir'}${s.publie ? '' : ' · non publié'}</span></span>
            <button type="button" class="btn petit" data-tb-sp="${s.id}" aria-label="Les dates de ${esc(s.titre)}">${confirmees.length}${ds.length > confirmees.length ? ` + ${ds.length - confirmees.length} opt.` : ''} date${confirmees.length > 1 ? 's' : ''}</button></div>`; }).join('') : rien('Aucun spectacle.') };
      } },
    memo: { titre: 'Mémo', description: 'Un bloc-notes à vous : à rappeler, à ne pas oublier. Gardé avec votre compte.', taille: 'p', visible: false, lien: () => null,
      corps: r => ({ html: `<textarea class="tb-memo" aria-label="Mémo" placeholder="À rappeler, à ne pas oublier…" rows="7">${esc(r.texte || '')}</textarea><p class="tb-memo-etat compte" aria-live="polite"></p>` }) },
  };
  const reglagesDe = k => (TUILES[k].reglages || []).filter(r => !r.dispo || r.dispo());
  const choixDe = r => (typeof r.choix === 'function' ? r.choix() : r.choix || []);
  const dispo = k => !!TUILES[k] && (!TUILES[k].dispo || TUILES[k].dispo());

  // ===================================================================================================== la disposition
  const defauts = () => ({ v: VERSION, modifie: 0, colonnes: 'auto', depart: 'accueil', tuiles: Object.entries(TUILES).map(([k, t]) => ({ k, visible: t.visible !== false, taille: t.taille || 'p', replie: false, reglages: {} })) });
  // une disposition lue (de la base, de l'appareil, d'une autre version) remise d'équerre : les tuiles connues dans l'ordre
  // donné, les nouvelles ajoutées à la fin avec leurs défauts
  function normaliser(c) {
    const d = defauts(), vues = new Set();
    const out = { v: VERSION, modifie: Number(c?.modifie) || 0, colonnes: ['auto', '2', '3', '4'].includes(String(c?.colonnes)) ? String(c.colonnes) : 'auto', depart: c?.depart === 'representations' ? 'representations' : 'accueil', tuiles: [] };
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
      <header class="tb-tete"><h2 id="tb-t-${t.k}">${T.edition ? `<span class="tb-poignee" title="Glisser pour déplacer">${SVG.poignee}</span>` : ''}<span class="tb-titre">${esc(def.titre)}</span><span class="tb-badge">${badgeDe(c)}</span></h2>
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
    if (pan) { pan.hidden = !T.edition; pan.innerHTML = T.edition ? panneau() : ''; }
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
  }
  // ce que des tuiles doivent lire avant de se montrer : les propositions, le journal ; la tuile se redessine ensuite
  function preparer(force = false) {
    for (const t of visibles()) {
      const p = TUILES[t.k].lire ? TUILES[t.k].lire(force) : null;
      if (p && typeof p.then === 'function') p.then(() => { if (location.hash !== '#/accueil') return; if (!dispo(t.k) || T.edition) dessiner(); else dessinerCorps(); }, () => { if (location.hash === '#/accueil') dessinerCorps(t.k); });
    }
  }

  // ===================================================================================================== la vue
  function vue() {
    const jour = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    cadre('accueil', `<div class="tete tb-tete-page"><h1>Tableau de bord</h1><span class="compte tb-jour">${esc(jour[0].toUpperCase() + jour.slice(1))}</span>
      <button type="button" class="btn" id="tb-personnaliser" aria-pressed="${T.edition}" aria-controls="tb-panneau">${T.edition ? 'Terminer' : 'Personnaliser'}</button></div>
      <div id="tb-panneau" class="bloc tb-panneau" hidden></div>
      <div class="tb-grille" id="tb-grille" data-liste aria-label="Tuiles du tableau de bord"></div>
      <p class="sr" id="tb-annonce" aria-live="polite"></p>`);
    const grille = $('#tb-grille');
    grille.rafraichir = () => { dessinerCorps(); preparer(); };
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
    vueEl.addEventListener('click', e => {
      const t = e.target.closest('[data-tb-reglages], [data-tb-replier], [data-tb-masquer], [data-tb-deplacer], [data-tb-taille], [data-tb-montrer], [data-tb-colonnes], [data-tb-depart], #tb-reinit, #tb-fini, [data-tb-action], [data-tb-sp], .tb-tel');
      if (!t) return;
      const sec = t.closest('.tb-tuile'), k = sec?.dataset.k, tu = k && tuile(k);
      if (t.matches('[data-tb-reglages]')) {
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
@media (prefers-reduced-motion: reduce) { .tb-replier svg { transition: none; } }
</style>`);

  // une action rapide retirée depuis son menu (menus.js) : comme décochée dans les réglages
  function retirerAction(k) {
    const t = tuile('actions'); if (!t) return;
    t.reglages = t.reglages || {};
    t.reglages.actions = valeurs('actions').actions.filter(x => x !== k);
    garder(); dessinerCorps('actions'); annoncerSr('Action retirée.');
  }
  return { vue, charger, depart, TUILES, conf, normaliser, retirerAction, lienJournal };
})();
// la route de la rubrique (admin/index.html)
function vueTableau() { return TABLEAU.vue(); }
