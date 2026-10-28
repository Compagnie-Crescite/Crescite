'use strict';
/* L'équipe dans l'administration. Chargé après le script principal d'index.html, dont il utilise l'état (E), le client
   (sb) et les outils (cadre, champ, relier, pied, annoncer, optimiser, envoyerPhoto…), et après feuille.js (FEUILLE).
   - la rubrique Équipe : une fiche par personne (fiche publique, coordonnées jamais publiées, accès à son espace, notes
     de suivi, ses spectacles et ses prochaines dates) et les documents de toute la compagnie ;
   - dans chaque spectacle : la distribution, le déroulé type d'une journée de représentation, les documents ;
   - dans chaque date : son équipe (la distribution « en tournée », moins qui ne part pas, plus remplaçants et renforts),
     avec le téléphone de chacun (« téléphone ? » mène à sa fiche) ;
   - la rubrique Feuilles de route : composer depuis la base, compléter bloc par bloc, publier pour l'équipe, PDF ;
     « À compléter » : ce que la feuille demande encore (le gris), en une liste qu'on remplit sans viser la page ;
     « n à compléter » (aCompleter, resteFeuille) se lit dans la liste des feuilles, sur le bouton « Feuille de route »
     d'une date, dans les prochaines dates d'une personne et les dates d'un lieu, tenu à jour par le temps réel
     (majACompleter). L'hébergement se reprend d'une autre feuille du lieu (ou de la commune) : la dernière écrite par
     défaut, une autre d'un geste (« Hébergement : … », au-dessus de la page). La mémoire des feuilles : ce qu'on écrit
     dans une feuille à la place d'une information de la base (ou là où elle manque) va dans la bonne fiche à
     l'enregistrement, avec « Annuler » ; MEMOIRE relie la clé de chaque ligne composée à sa fiche et à son champ ; la
     fiche dit ensuite d'où vient la valeur ;
   - la rubrique Espace pro : les invitations des salles (pro/), leur lien, leur journal ; et dans chaque spectacle, les
     documents réservés aux salles (captations, photos, fichiers non publics).
   Tant que la base n'a pas l'équipe (supabase/migrations/20261021_crescite_equipe.sql), ces écrans le disent et le
   reste de l'administration marche comme avant. De même sans l'espace pro (20261023_crescite_pro.sql). */

// ===================================================================================================== état et chargement
Object.assign(E, { personnes: [], privees: [], suiviPersonnes: [], distributions: [], equipes: [], documents: [], feuilles: [], equipeInstallee: null, equipeErreur: '',
  acces: [], sql4: false, sql4Erreur: '' });
// le temps réel des tables de l'équipe (sur son propre canal : la base peut ne pas encore les avoir)
const TABLES_EQUIPE = {
  crescite_personnes: ['personnes', 'id'], crescite_distributions: ['distributions', 'id'], crescite_equipes: ['equipes', ['date_id', 'personne_id']],
  crescite_documents: ['documents', 'id'], crescite_feuilles: ['feuilles', 'id'],
};
// le trajet de chaque feuille de route se compte depuis Rouen, d'où part la compagnie
const DEPART = { commune: 'Rouen', latitude: 49.443232, longitude: 1.099971 };
const CATEGORIES = [['jeu', 'Jeu'], ['creation', 'Création'], ['technique', 'Technique'], ['production', 'Production']];
const TYPES_DOC = [['texte', 'Texte'], ['dossier', 'Dossier'], ['fiche_technique', 'Fiche technique'], ['plan', 'Plan'], ['autre', 'Autre']];
const MIMES_DOC = { pdf: 'application/pdf', webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', txt: 'text/plain',
  odt: 'application/vnd.oasis.opendocument.text', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
const ONGLETS_EQUIPE = ['Distribution', 'Déroulé type', 'Documents', 'Matériel'];

async function chargerEquipe() {
  // le troisième script SQL (nature des dates, heure de fin des séances, documents publics, notifications) : passé ou
  // pas ; sans lui, l'administration ne propose rien de ce qu'il ajoute. Une date suffit à le savoir, sans erreur ; une
  // base sans aucune date pose la question à la colonne elle-même.
  const sonde = sb.from('crescite_dates').select('*').limit(1).then(async r => {
    if (r.error) return false;
    if (r.data?.length) return 'nature' in r.data[0];
    return !(await sb.from('crescite_dates').select('nature').limit(1)).error;
  }, () => false);
  const pro = chargerAcces(true);
  try {
    const [pe, pr, su, di, eq, dc, fe] = await Promise.all([tout('crescite_personnes', 'nom'), tout('crescite_personnes_privees'), tout('crescite_personnes_suivi'),
      tout('crescite_distributions', 'ordre'), tout('crescite_equipes'), tout('crescite_documents', 'ordre'), tout('crescite_feuilles')]);
    Object.assign(E, { personnes: pe, privees: pr, suiviPersonnes: su, distributions: di, equipes: eq, documents: dc, feuilles: fe, equipeInstallee: true, equipeErreur: '' });
  } catch (e) {
    E.equipeInstallee = false;
    E.equipeErreur = /PGRST205|42P01|does not exist|schema cache/i.test(`${e?.code || ''} ${e?.message || ''}`) ? '' : (e?.message || String(e));
  }
  E.sql3 = await sonde;
  await pro;
}
// les invitations des salles (quatrième script SQL) : leur table répond, ou pas encore (avant le script, cette seule
// requête reçoit un 404 ; l'onglet Espace pro le dit et rien d'autre ne change). Rechargées à chaque ouverture de
// l'onglet : les visites s'y comptent sans passer par le temps réel.
async function chargerAcces(sonde = false) {
  const { data, error } = await sb.from('crescite_acces_pro').select('*').order('cree_le', { ascending: false });
  if (!error) { Object.assign(E, { acces: data, sql4: true, sql4Erreur: '' }); return true; }
  if (sonde) { E.sql4 = false; E.sql4Erreur = /PGRST205|42P01|does not exist|schema cache/i.test(`${error.code || ''} ${error.message || ''}`) ? '' : (error.message || String(error)); }
  return false;
}
function ecouterEquipe() {
  if (!E.equipeInstallee) return;
  const ch = sb.channel('crescite-admin-equipe');
  Object.keys(TABLES_EQUIPE).forEach(t => ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, p => changement(t, p)));
  ch.subscribe();
}
const equipeAbsente = () => E.equipeErreur
  ? `<div class="bloc"><h3>L’équipe n’a pas pu être chargée</h3><p>${esc(E.equipeErreur)}</p><p class="aide">Rechargez la page dans un moment.</p></div>`
  : `<div class="bloc"><h3>La base de l’équipe n’est pas encore installée</h3><p>Exécutez <code>supabase/migrations/20261021_crescite_equipe.sql</code> dans Supabase (SQL Editor → New query → coller le fichier → Run), puis rechargez cette page.</p><p class="aide">Le reste de l’administration marche comme avant.</p></div>`;

// ===================================================================================================== outils
const personne = id => E.personnes.find(p => p.id === id);
const nomDe = p => p ? [p.prenom, p.nom].filter(Boolean).join(' ') : '';
const priveeDe = id => E.privees.find(x => x.personne_id === id) || null;
const remplacerLigne = (coll, row, pk = 'id') => { const i = coll.findIndex(x => x[pk] === row[pk]); if (i >= 0) coll[i] = row; else coll.push(row); };
const sansMeta = o => { const x = { ...o }; delete x.modifie_le; delete x.modifie_par; return x; };
const initiales = p => `${(p?.prenom || '').trim()[0] || ''}${(p?.nom || '').trim()[0] || ''}`.toUpperCase();
const avatar = (p, petit = false) => `<span class="avatar${petit ? ' petit' : ''}"${p?.photo && !portraitPrive(p.photo) ? ` style="background-image:url('${photoUrl(p.photo)}')"` : ''} aria-hidden="true">${p?.photo && !portraitPrive(p.photo) ? '' : esc(initiales(p))}</span>`;
const rangCategorie = c => Math.max(0, CATEGORIES.findIndex(x => x[0] === c));
const libelleCategorie = c => (CATEGORIES.find(x => x[0] === c) || [c, c])[1];
const distributionDe = spId => E.distributions.filter(x => x.spectacle_id === spId).sort((a, b) => rangCategorie(a.categorie) - rangCategorie(b.categorie) || a.ordre - b.ordre || a.id - b.id);
const fonctionDistribution = x => x.categorie === 'jeu' ? `${x.fonction || 'Jeu'}${x.role ? ` (${x.role})` : ''}` : x.fonction || libelleCategorie(x.categorie);
const slugPersonne = texte => { const b = slugifier(texte) || 'personne'; let s = b, n = 2; while (E.personnes.some(p => p.slug === s)) s = `${b}-${n++}`; return s; };
const copier = async (texte, quoi, message) => {
  try { await navigator.clipboard.writeText(texte); }
  catch { const t = document.createElement('textarea'); t.value = texte; t.style.cssText = 'position:fixed;opacity:0'; document.body.append(t); t.select(); document.execCommand('copy'); t.remove(); }
  annoncer(message || `${quoi} copiée : ${texte}`);
};
// l'équipe d'une date : la distribution « en tournée » du spectacle, moins qui ne part pas, plus remplaçants et renforts
function equipeDate(spectacleId, ecarts) {
  const retires = new Set(ecarts.filter(x => !x.present).map(x => x.personne_id)), out = [];
  distributionDe(spectacleId).filter(x => x.en_tournee && !retires.has(x.personne_id)).forEach(x => {
    const o = out.find(y => y.personne_id === x.personne_id), f = fonctionDistribution(x);
    if (o) { if (!o.fonction.split(', ').includes(f)) o.fonction += `, ${f}`; } else out.push({ personne_id: x.personne_id, fonction: f, ajout: false });
  });
  ecarts.filter(x => x.present).forEach(x => {
    const o = out.find(y => y.personne_id === x.personne_id);
    if (o) { if (x.fonction) o.fonction = x.fonction; } else out.push({ personne_id: x.personne_id, fonction: x.fonction || '', ajout: true });
  });
  return out;
}
const equipeDeLaDate = d => equipeDate(d.spectacle_id, E.equipes.filter(x => x.date_id === d.id));
// créer une fiche au vol (« Jean-Marc Talbot » : prénom, puis nom) avec sa fiche privée, vide
async function creerPersonne(texte, metiers = []) {
  const mots = texte.trim().split(/\s+/), prenom = mots.length > 1 ? mots.shift() : null, nom = mots.join(' ');
  const { data, error } = await sb.from('crescite_personnes').insert({ slug: slugPersonne(texte), prenom, nom, metiers, ordre: Math.max(0, ...E.personnes.map(p => p.ordre || 0)) + 10 }).select().single();
  if (error) throw error;
  E.personnes.push(data);
  const r = await sb.from('crescite_personnes_privees').insert({ personne_id: data.id }).select().single();
  if (!r.error) E.privees.push(r.data);
  return data;
}
// un champ de saisie qui propose les personnes de l'équipe, et crée une fiche au besoin
function comboPersonne(zone, { placeholder = 'Nom de la personne…', creer = false, avant = [], exclure = () => false, onChoix, onCreer }) {
  zone.innerHTML = `<div class="combo"><input type="search" placeholder="${esc(placeholder)}" aria-label="${esc(placeholder)}" autocomplete="off"><div class="suggestions" hidden></div></div>`;
  const inp = $('input', zone), sug = $('.suggestions', zone);
  const montrer = () => {
    const q = norm(inp.value).trim();
    const xs = E.personnes.filter(p => !exclure(p.id) && (!q || norm(`${nomDe(p)} ${(p.metiers || []).join(' ')}`).includes(q)))
      .sort((a, b) => (avant.includes(b.id) - avant.includes(a.id)) || norm(a.nom).localeCompare(norm(b.nom))).slice(0, 8);
    sug.innerHTML = xs.map(p => `<button type="button" data-p="${p.id}">${esc(nomDe(p))} <small>${esc((p.metiers || []).slice(0, 3).join(', '))}${avant.includes(p.id) ? ' · distribution' : ''}</small></button>`).join('')
      + (creer && inp.value.trim() ? `<button type="button" data-creer>＋ Nouvelle fiche « ${esc(inp.value.trim())} »</button>` : '') || '<button type="button" disabled>Tapez un nom</button>';
    sug.hidden = false;
  };
  inp.addEventListener('focus', montrer);
  inp.addEventListener('input', montrer);
  inp.addEventListener('keydown', e => {
    if (e.key === 'Escape') sug.hidden = true;
    if (e.key === 'ArrowDown') { e.preventDefault(); sug.querySelector('button:not([disabled])')?.focus(); }
    if (e.key === 'Enter') { e.preventDefault(); sug.querySelector('button:not([disabled])')?.click(); }
  });
  sug.addEventListener('keydown', e => { if (e.key === 'ArrowDown') { e.preventDefault(); document.activeElement.nextElementSibling?.focus(); } if (e.key === 'ArrowUp') { e.preventDefault(); (document.activeElement.previousElementSibling || inp).focus(); } });
  sug.addEventListener('mousedown', e => e.preventDefault());
  zone.addEventListener('focusout', () => setTimeout(() => { if (!zone.contains(document.activeElement)) sug.hidden = true; }, 120));
  sug.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    const texte = inp.value.trim();
    sug.hidden = true; inp.value = '';
    if (b.dataset.p) onChoix(+b.dataset.p); else if (b.dataset.creer !== undefined && onCreer) onCreer(texte);
  });
}
// un lien vers un onglet du spectacle (Distribution, Déroulé type…) : l'éditeur du spectacle s'ouvre sur lui
document.addEventListener('click', e => { const a = e.target.closest('[data-onglet-sp]'); if (a) try { sessionStorage.setItem('crescite-onglet-sp', a.dataset.ongletSp); } catch { /* navigation privée */ } }, true);

// ===================================================================================================== rubrique Équipe
function vueEquipe(param) {
  const docs = param === 'documents', frais = param === 'frais';
  // les notes de frais : seulement quand la base a leur table (le script « Compagnie Idéale ») ; sinon elles se masquent
  if (frais && !E.ideale) { location.replace('#/equipe'); return; }
  const tete = `<div class="tete"><h1>Équipe</h1><div class="seg" role="group" aria-label="Partie">
    <button type="button" data-eq-partie="" aria-pressed="${!docs && !frais}">Personnes</button>
    ${E.ideale ? `<button type="button" data-eq-partie="frais" aria-pressed="${frais}">Notes de frais</button>` : ''}
    <button type="button" data-eq-partie="documents" aria-pressed="${docs}">Documents de la compagnie</button>
  </div>
    ${docs || frais || !E.equipeInstallee ? '' : '<a class="btn principal" href="#/equipe/nouvelle">＋ Nouvelle fiche</a>'}</div>`;
  const parties = () => $$('[data-eq-partie]').forEach(b => b.addEventListener('click', () => { location.hash = '#/equipe' + (b.dataset.eqPartie ? '/' + b.dataset.eqPartie : ''); }));
  if (!E.equipeInstallee) { cadre('equipe', tete + equipeAbsente()); parties(); return; }
  if (frais) { vueEquipeFrais(tete, parties); return; }
  if (docs) {
    cadre('equipe', `${tete}<div class="bloc eq-docs-compagnie"><h3>Documents de toute la compagnie</h3><p class="aide">Pour toute l’équipe, quel que soit le spectacle : charte d’accueil, livret, contacts utiles… Les documents d’un spectacle (le texte, le dossier, la fiche technique) se rangent dans son onglet Documents.</p><div id="docs-compagnie"></div></div>`);
    parties(); documentsEditeur($('#docs-compagnie'), null); return;
  }
  const f = session.equipe = Object.assign({ q: '', categorie: '' }, session.equipe || {});
  cadre('equipe', `${tete}<div class="deux${param ? ' edition' : ''}"><div class="liste"><div class="filtres">
      <input type="search" id="eq-q" placeholder="Chercher un nom, un métier, un spectacle" value="${esc(f.q)}" aria-label="Chercher">
      <select id="eq-cat" aria-label="Catégorie"><option value="">Toutes les catégories</option>${CATEGORIES.map(([k, l]) => `<option value="${k}"${f.categorie === k ? ' selected' : ''}>${l}</option>`).join('')}<option value="aucune"${f.categorie === 'aucune' ? ' selected' : ''}>Dans aucune distribution</option><option value="sans-tel"${f.categorie === 'sans-tel' ? ' selected' : ''}>Sans téléphone</option></select>
      <span class="compte" id="eq-compte"></span></div><div data-liste id="l-equipe"></div></div>
    <section class="editeur" id="ed-personne">${param ? '' : '<div class="vide bloc">Une fiche par personne : jeu, création, technique, production. La fiche publique va sur les pages de spectacle ; les coordonnées restent ici et dans l’espace de la personne.</div>'}</section></div>`);
  parties();
  const zone = $('#l-equipe');
  zone.rafraichir = () => listePersonnes(zone, param);
  zone.rafraichir();
  $('#eq-q').addEventListener('input', e => { f.q = e.target.value; garderFiltres(); zone.rafraichir(); });
  $('#eq-cat').addEventListener('change', e => { f.categorie = e.target.value; garderFiltres(); zone.rafraichir(); });
  if (param) editeurPersonne(param === 'nouvelle' ? null : +param);
}
function listePersonnes(zone, actif) {
  const f = session.equipe, q = norm(f.q).trim();
  const xs = E.personnes.filter(p => {
    const ds = E.distributions.filter(x => x.personne_id === p.id);
    if (f.categorie === 'sans-tel' ? (priveeDe(p.id)?.telephone || '').trim() : f.categorie === 'aucune' ? ds.length : f.categorie && !ds.some(x => x.categorie === f.categorie)) return false;
    if (!q) return true;
    const pr = priveeDe(p.id);
    return norm(`${nomDe(p)} ${(p.metiers || []).join(' ')} ${ds.map(x => spectacle(x.spectacle_id)?.titre || '').join(' ')} ${pr?.email || ''} ${pr?.ville || ''}`).includes(q);
  }).sort((a, b) => norm(a.nom).localeCompare(norm(b.nom)) || norm(a.prenom).localeCompare(norm(b.prenom)));
  $('#eq-compte').textContent = `${xs.length} personne${xs.length > 1 ? 's' : ''}`;
  zone.innerHTML = xs.map(p => {
    const sps = [...new Set(E.distributions.filter(x => x.personne_id === p.id).map(x => x.spectacle_id))].map(spectacle).filter(Boolean);
    const pr = priveeDe(p.id);
    return `<a class="ligne personne" href="#/equipe/${p.id}"${String(actif) === String(p.id) ? ' aria-current="true"' : ''}>${avatar(p)}
      <span class="corps"><span class="t">${esc(nomDe(p))}</span><span class="ou">${esc((p.metiers || []).join(', ') || 'Métier à préciser')}</span>
      ${sps.length ? `<span class="pastilles">${sps.map(s => `<span><span class="pastille" style="--c:${couleurSp(s)}"></span>${esc(s.titre.split(' – ')[0])}</span>`).join('')}</span>` : ''}</span>
      <span class="badges">${pr?.user_id ? '<span class="badge ok">Compte</span>' : ''}${p.publie ? '' : '<span class="badge masquee">Non publiée</span>'}</span></a>`;
  }).join('') || listeVide(!!(q || f.categorie), { rien: 'Personne ne correspond.', aucun: 'Aucune fiche pour l’instant.', ajouter: ['#/equipe/nouvelle', '＋ Nouvelle fiche'] });
}

const SPEC_PERSONNE = [
  { k: 'prenom', t: 'texte', l: 'Prénom' }, { k: 'nom', t: 'texte', l: 'Nom' },
  { k: 'metiers', t: 'lignes', l: 'Métiers', aide: 'Un par ligne : Jeu, Mise en scène, Régie générale, Administration…' },
  { k: 'bio', t: 'long', l: 'Bio', lignes: 4, aide: 'Quelques lignes, si on veut les publier.' },
];
const SPEC_PHOTO_PERSONNE = [
  { k: 'photo_credit', t: 'texte', l: 'Crédit', ph: '© Prénom Nom' },
  { k: 'photo_source', t: 'texte', l: 'Source', aide: 'D’où vient la photo (page web, dossier…) : pour l’administration.' },
  { k: 'photo_publique', t: 'case', l: 'Accord pour publier la photo', aide: 'Sans cet accord, le site ne montre pas la photo.' },
];
const SPEC_PUBLIE_PERSONNE = { k: 'publie', t: 'case', l: 'Fiche publiée', aide: 'Son nom et sa fiche apparaissent sur les pages de spectacle.' };
const SPEC_COORD = [
  { k: 'email', t: 'texte', l: 'Adresse électronique du compte', aide: 'La personne se connecte à son espace avec cette adresse.' },
  { k: 'telephone', t: 'texte', l: 'Téléphone' }, { k: 'ville', t: 'texte', l: 'Ville de départ', ph: 'Rouen' },
  { k: 'regime', t: 'texte', l: 'Régime alimentaire', ph: 'Végétarien, sans gluten…' }, { k: 'urgence', t: 'texte', l: 'En cas d’urgence, prévenir', ph: 'Nom, lien, téléphone' },
];
function editeurPersonne(id) {
  const zone = zoneNeuve('#ed-personne');
  const etat = { p0: id ? personne(id) : null };
  if (id && !etat.p0) { zone.innerHTML = '<div class="vide bloc">Cette fiche n’existe plus.</div>'; return; }
  requestAnimationFrame(() => tt('ouvrir', zone, { sens: 'gauche' }));
  const p0 = etat.p0, pr0 = p0 ? priveeDe(p0.id) : null;
  const F = p0 ? clone(p0) : { prenom: '', nom: '', metiers: [], bio: '', photo: null, photo_credit: '', photo_source: '', photo_publique: false, publie: true };
  ['prenom', 'bio', 'photo_credit', 'photo_source'].forEach(k => { F[k] = F[k] || ''; });
  const P = Object.fromEntries(SPEC_COORD.map(c => [c.k, pr0?.[c.k] || '']));
  const N = { notes: (p0 && E.suiviPersonnes.find(x => x.personne_id === p0.id)?.notes) || '' };
  nChamp = 0;
  zone.innerHTML = `<div class="titre-ed"><a class="btn petit" data-tt="retour" href="#/equipe" title="Retour à la liste">←</a><h2>${esc(p0 ? nomDe(p0) : 'Nouvelle fiche')}</h2></div>
    <div class="bloc" id="pe-public"><h3>Fiche publique</h3><div class="rangee">${champ(SPEC_PERSONNE[0], F)}${champ(SPEC_PERSONNE[1], F)}</div>${champ(SPEC_PERSONNE[2], F)}${champ(SPEC_PERSONNE[3], F)}
      <div class="photo-fiche"><figure id="pe-photo"></figure><div class="photo-champs">${SPEC_PHOTO_PERSONNE.map(c => champ(c, F)).join('')}</div></div>${champ(SPEC_PUBLIE_PERSONNE, F)}</div>
    <div class="bloc" id="pe-coord"><h3>Coordonnées (jamais publiées)</h3><div class="rangee">${SPEC_COORD.slice(0, 3).map(c => champ(c, P)).join('')}</div>${SPEC_COORD.slice(3).map(c => champ(c, P)).join('')}</div>
    <div class="bloc" id="pe-acces"></div>
    <div class="bloc" id="pe-suivi"><h3>Notes de suivi <span class="aide" style="font-weight:400">— jamais lues par la personne</span></h3>${champ({ k: 'notes', t: 'long', lignes: 4, ph: 'Contrats, disponibilités…' }, N)}</div>
    ${p0 ? '<div class="bloc" id="pe-spectacles"></div><div class="bloc" id="pe-dates"></div>' : ''}${p0 && typeof NOTES !== 'undefined' ? '<div class="bloc" id="pe-notes"></div>' : ''}
    ${pied(p0 ? 'Tout est enregistré' : 'Nouvelle fiche', p0 ? '<button type="button" class="btn danger" id="pe-suppr">Supprimer</button>' : '')}`;
  $('[data-chemin="email"]', zone).type = 'email';
  $('[data-chemin="telephone"]', zone).type = 'tel';
  if (p0) { sousChamp($('[data-chemin="telephone"]', zone), v => mentionAppris('crescite_personnes_privees', p0.id, 'telephone', v)); sousChamp($('[data-chemin="email"]', zone)); sousChamp($('[data-chemin="urgence"]', zone)); }
  $('[data-chemin="notes"]', zone).setAttribute('aria-label', 'Notes de suivi');
  relier($('#pe-public', zone), F, [...SPEC_PERSONNE, ...SPEC_PHOTO_PERSONNE, SPEC_PUBLIE_PERSONNE]);
  relier($('#pe-coord', zone), P, SPEC_COORD);
  relier($('#pe-suivi', zone), N, [{ k: 'notes', t: 'long' }]);
  if (p0 && typeof NOTES !== 'undefined') NOTES.bloc($('#pe-notes', zone), 'crescite_personnes', p0.id, { titre: 'Notes internes', aide: 'Jamais lues par la personne ; une mention la prévient dans son espace.' });
  const dessinerPhoto = () => {
    $('#pe-photo', zone).innerHTML = `${F.photo ? `<img${portraitPrive(F.photo) ? '' : ` src="${photoUrl(F.photo)}"`} alt="Photo de ${esc(nomDe(F))}">` : `<div class="sans">${avatar(F)}</div>`}
      <figcaption>${F.photo ? (F.photo_publique ? 'Publiée sur le site' : 'Pas publiée : accord à cocher') : 'Pas de photo'}</figcaption>
      <div class="photo-outils"><label class="btn petit">${F.photo ? 'Remplacer' : 'Envoyer une photo'}<input type="file" accept="image/*" id="pe-fichier" hidden></label>${F.photo ? '<button type="button" class="btn petit danger" id="pe-sans-photo">Retirer</button>' : ''}</div>`;
    if (F.photo && portraitPrive(F.photo)) {
      const p = F.photo;
      sb.storage.from(PORTRAITS).createSignedUrl(p, 3600).then(({ data }) => { const im = $('#pe-photo img', zone); if (im && F.photo === p && data?.signedUrl) im.src = data.signedUrl; });
    }
  };
  const dessinerAcces = () => {
    const p = etat.p0, pr = p ? priveeDe(p.id) : null, mel = (pr?.email || '').trim();
    const espace = new URL('../equipe/', location.href).href;
    $('#pe-acces', zone).innerHTML = `<h3>Accès à son espace</h3>${!p ? '<p class="aide">Enregistrez d’abord la fiche, avec son adresse électronique.</p>'
      : pr?.user_id ? `<p class="acces"><span class="badge ok">Compte rattaché</span><span>La personne se connecte avec ${esc(mel || 'son adresse')} ; elle y trouve sa tournée, les horaires, les documents et les feuilles de route.</span></p>
        <p class="acces"><button type="button" class="btn petit" id="pe-detacher">Détacher ce compte</button><span class="aide">Si le compte n’est pas le bon : la prochaine connexion avec l’adresse de la fiche le rattachera.</span></p>`
      : mel ? `<p>Créer son accès : Supabase → Authentication → Users → Invite user, avec cette adresse.</p>
        <p class="acces"><code>${esc(mel)}</code><button type="button" class="btn petit" id="pe-copier">Copier l’adresse</button><a class="btn petit" href="https://supabase.com/dashboard/project/${BASE.split('//')[1].split('.')[0]}/auth/users" target="_blank" rel="noopener">Ouvrir Supabase ↗</a></p>
        <p class="aide">Le compte se rattache tout seul à la première connexion de la personne.</p>`
      : '<p class="aide">Indiquez son adresse électronique dans les coordonnées, puis enregistrez : on pourra lui créer son accès.</p>'}
      ${p ? `<p class="aide acces">Son espace : <a href="${esc(espace)}" target="_blank" rel="noopener">${esc(espace)}</a><button type="button" class="btn lien petit" id="pe-copier-lien">Copier le lien</button></p>` : ''}`;
  };
  // ses spectacles : une ligne par place dans une distribution (✕ l'en retire), et l'ajout à un autre spectacle, ici
  // même ; c'est la même ligne que dans l'onglet Distribution du spectacle, enregistrée aussitôt
  const dessinerSpectacles = () => {
    const el = $('#pe-spectacles', zone); if (!el) return;
    const p = etat.p0, ds = E.distributions.filter(x => x.personne_id === p.id).sort((a, b) => (spectacle(a.spectacle_id)?.ordre ?? 0) - (spectacle(b.spectacle_id)?.ordre ?? 0) || rangCategorie(a.categorie) - rangCategorie(b.categorie));
    const sps = [...E.spectacles].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0)), cat = categorieProbable(p);
    el.innerHTML = `<h3>Ses spectacles</h3>${ds.length ? `<ul class="liste-simple pe-dist">${ds.map(x => { const s = spectacle(x.spectacle_id); return s ? `<li><span class="pastille" style="--c:${couleurSp(s)}"></span><a href="#/spectacles/${esc(s.slug)}" data-onglet-sp="Distribution" title="Ouvrir la distribution du spectacle">${esc(s.titre)}</a>
      <span class="compte">${libelleCategorie(x.categorie)}${x.categorie === 'jeu' ? (x.role ? ` (${esc(x.role)})` : '') : x.fonction ? ` : ${esc(x.fonction)}` : ''}${x.en_tournee ? '' : ', ne part pas en tournée'}</span>
      <button type="button" class="btn petit danger" data-pe-retirer="${x.id}" title="Retirer de la distribution" aria-label="Retirer de la distribution de ${esc(s.titre)}">✕</button></li>` : ''; }).join('')}</ul>`
      : '<p class="aide">Dans aucune distribution pour l’instant.</p>'}
      ${(() => {
        // les périodes où elle a joué, spectacle par spectacle (d'après l'équipe de chaque date) ; « Régler » mène à l'onglet
        const joues = [...E.spectacles].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0)).map(s => ({ s, pers: periodesDe(p.id, presences(s.id)) })).filter(x => x.pers.length);
        return joues.length ? `<h4 class="pe-joue-t">A joué</h4><ul class="liste-simple pe-joue">${joues.map(({ s, pers }) => `<li><span class="pastille" style="--c:${couleurSp(s)}"></span><a href="#/spectacles/${esc(s.slug)}" data-onglet-sp="Distribution" title="Régler ses périodes dans « Qui a joué quand »">${esc(s.titre)}</a>
          <span class="compte">${esc(pers.map(periodeTexte).join(' ; '))}</span></li>`).join('')}</ul>` : '';
      })()}
      <div class="pe-dist-ajout"><select id="pe-dist-sp" aria-label="Spectacle"><option value="">Ajouter à un spectacle…</option>${sps.map(s => `<option value="${s.id}">${esc(s.titre)}</option>`).join('')}</select>
        <select id="pe-dist-cat" aria-label="Catégorie">${CATEGORIES.map(([k, l]) => `<option value="${k}"${k === cat ? ' selected' : ''}>${l}</option>`).join('')}</select>
        <button type="button" class="btn petit" id="pe-dist-ok">＋ Ajouter</button></div>
      <p class="aide">Enregistré aussitôt, sans « Enregistrer » : c’est la même distribution que dans l’onglet Distribution du spectacle, où l’on précise son rôle, sa fonction, s’il part en tournée.</p>`;
  };
  const dessinerDates = () => {
    const el = $('#pe-dates', zone); if (!el) return;
    const xs = E.dates.filter(d => (d.fin || d.debut) >= AUJ && d.statut !== 'annulee' && equipeDeLaDate(d).some(x => x.personne_id === etat.p0.id)).sort((a, b) => a.debut < b.debut ? -1 : a.debut > b.debut ? 1 : 0);
    el.innerHTML = `<h3>Ses prochaines dates <span class="compte">${xs.length || ''}</span></h3>${xs.length ? `<ul class="liste-simple">${xs.slice(0, 20).map(d => `<li><b class="eq-jour">${esc(jourCourt(d.debut))}</b><a href="#/representations/${d.id}">${esc(spectacle(d.spectacle_id)?.titre || '?')}</a>
      <span class="compte">${esc(lieuTexte(lieu(d.lieu_id)) || 'Lieu à préciser')}</span>${d.statut === 'option' ? '<span class="badge option">Option</span>' : ''}<a href="#/feuilles/${d.id}" class="eq-feuille" data-viser="#fr-manques"><span class="sr">Feuille de route du ${esc(jourCourt(d.debut))} : </span>${badgeFeuille(d.id)}${resteFeuille(d.id)}</a></li>`).join('')}</ul>${xs.length > 20 ? `<p class="aide">Et ${xs.length - 20} autres.</p>` : ''}`
      : '<p class="aide">Aucune date à venir.</p>'}`;
  };
  dessinerPhoto(); dessinerAcces(); dessinerSpectacles(); dessinerDates();
  zone.addEventListener('change', async e => {
    if (e.target.id !== 'pe-fichier') return;
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    const slug = etat.p0?.slug || slugifier(`${F.prenom} ${F.nom}`) || 'personne';
    annoncer('Envoi de la photo…');
    try {
      F.photo = await envoyerPortrait(new File([f], `${slug}.${(f.name.split('.').pop() || 'jpg').toLowerCase()}`, { type: f.type }), !!F.photo_publique);
      marquerSale(); dessinerPhoto(); annoncer('Photo envoyée : enregistrez la fiche pour la garder.');
    } catch (err) { erreur(err, 'Envoi impossible'); }
  });
  zone.addEventListener('input', e => { if (e.target.dataset.chemin === 'photo_publique') dessinerPhoto(); });
  zone.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'pe-sans-photo') { F.photo = null; marquerSale(); dessinerPhoto(); return; }
    if (b.id === 'pe-dist-ok') {
      const sp = +$('#pe-dist-sp', zone).value, cat = $('#pe-dist-cat', zone).value;
      if (!sp) { $('#pe-dist-sp', zone).focus(); return annoncer('Choisissez d’abord le spectacle.', { erreur: true }); }
      const x = await ajouterADistribution(sp, etat.p0.id, cat);
      if (!x) return;
      dessinerSpectacles(); dessinerDates();
      const s = spectacle(sp);
      const avant = x.en_tournee && comptePassees(sp, x.personne_id);
      annoncer(`Ajouté à la distribution de ${s?.titre || 'ce spectacle'} (${libelleCategorie(cat)}).${avant ? ' Il compte aussi sur ses dates passées : sa période se règle dans « Qui a joué quand ».' : ''}`, { libelle: 'Voir la distribution', delai: avant ? 9000 : 5000, action: () => { try { sessionStorage.setItem('crescite-onglet-sp', 'Distribution'); } catch { /* navigation privée */ } location.hash = `#/spectacles/${s.slug}`; } });
      $('#pe-dist-ok', zone)?.focus();
      return;
    }
    if (b.dataset.peRetirer) {
      const x = E.distributions.find(y => y.id === +b.dataset.peRetirer);
      if (x) await retirerAvecHistoire(x, () => { if (zone.isConnected) { dessinerSpectacles(); dessinerDates(); } }, b);
      return;
    }
    if (b.id === 'pe-copier') return copier((priveeDe(etat.p0.id)?.email || '').trim(), 'Adresse');
    if (b.id === 'pe-copier-lien') return copier(new URL('../equipe/', location.href).href, 'Adresse de son espace');
    // détacher le compte : tout de suite, sans question ; l'annonce porte « Annuler », qui le rattache de nouveau
    if (b.id === 'pe-detacher') {
      const p0 = etat.p0, avant = priveeDe(p0.id)?.user_id;
      const ecrireCompte = v => sb.from('crescite_personnes_privees').update({ user_id: v }).eq('personne_id', p0.id).select().single();
      const { data, error } = await ecrireCompte(null);
      if (error) return erreur(error);
      remplacerLigne(E.privees, data, 'personne_id'); dessinerAcces();
      annoncer(`Compte détaché : ${nomDe(p0)} ne verra plus son espace tant qu’un compte ne s’y rattache pas de nouveau.`, { libelle: 'Annuler', delai: 8000, action: avant ? async () => {
        const r = await ecrireCompte(avant);
        if (r.error) return erreur(r.error, 'Rattachement impossible');
        remplacerLigne(E.privees, r.data, 'personne_id');
        if (zone.isConnected && etat.p0 === p0) dessinerAcces();
        annoncer('Compte rattaché de nouveau.');
      } : null });
      return;
    }
    if (b.id === 'pe-suppr') return supprimerPersonne(etat.p0);
    if (!b.matches('[data-enregistrer]')) return;
    if (!(F.nom || '').trim()) return annoncer('Le nom est nécessaire.', { erreur: true });
    const mel = (P.email || '').trim();
    if (mel && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mel)) return annoncer('L’adresse électronique ne semble pas valide.', { erreur: true });
    if (mel && E.privees.some(x => x.personne_id !== etat.p0?.id && norm(x.email) === norm(mel))) return annoncer('Cette adresse est déjà celle d’une autre fiche.', { erreur: true });
    b.disabled = true;
    const nouvelle = !etat.p0;
    try {
      await enregistrerPersonne(etat, F, P, N);
      E.sale = false;
      annoncer(nouvelle ? 'Fiche créée.' : 'Fiche enregistrée.');
      if (nouvelle) remplacerAdresse(`#/equipe/${etat.p0.id}`);
      redessinerFiche(vueEquipe, etat.p0.id);
      bravo();
    } catch (err) {
      // la fiche est peut-être déjà créée : on reste sur elle, la saisie intacte
      if (nouvelle && etat.p0) remplacerAdresse(`#/equipe/${etat.p0.id}`);
      erreur(err, err?.code === '23505' ? 'Cette adresse est déjà celle d’une autre fiche' : 'L’enregistrement a échoué');
    } finally { b.disabled = false; }
  });
}
// Les portraits : avec l'accord de publication, dans le stockage public (« crescite », equipe/…) ; sans, dans le stockage
// privé de l'équipe (« crescite-equipe », portraits/…), que seuls les administrateurs lisent : un portrait qui attend son
// accord ne se télécharge pas, même si l'on connaît son chemin. Il passe de l'un à l'autre quand l'accord change ; un
// portrait remplacé ou retiré est effacé (une fois la fiche enregistrée).
const PORTRAITS = 'crescite-equipe';
const portraitPrive = p => /^portraits\//.test(p || '');
async function envoyerPortrait(fichier, publique) {
  if (publique) return envoyerPhoto(fichier, 'equipe');
  const blob = await optimiser(fichier);
  const ext = blob.type === 'image/webp' ? 'webp' : (fichier.name.split('.').pop() || 'jpg').toLowerCase();
  const chemin = `portraits/${Date.now().toString(36)}-${slugifier(fichier.name.replace(/\.[^.]+$/, '')) || 'photo'}.${ext}`;
  const { error } = await sb.storage.from(PORTRAITS).upload(chemin, blob, { contentType: blob.type || fichier.type, upsert: false });
  if (error) throw error;
  return chemin;
}
async function rangerPortrait(chemin, publique) {
  if (!chemin || portraitPrive(chemin) !== publique) return chemin;   // déjà à sa place
  const de = publique ? PORTRAITS : 'crescite', vers = publique ? 'crescite' : PORTRAITS;
  const nom = chemin.split('/').pop(), dest = publique ? `equipe/${nom}` : `portraits/${nom}`;
  const { data, error } = await sb.storage.from(de).download(chemin);
  if (error) throw error;
  const r = await sb.storage.from(vers).upload(dest, data, { contentType: data.type || 'image/webp', upsert: true, ...(publique ? { cacheControl: '31536000' } : {}) });
  if (r.error) throw r.error;
  return dest;
}
async function effacerPortrait(chemin) {
  if (!chemin) return;
  const { error } = await sb.storage.from(portraitPrive(chemin) ? PORTRAITS : 'crescite').remove([chemin]);
  if (error) console.warn('portrait non effacé', chemin, error.message);
}
async function enregistrerPersonne(etat, F, P, N) {
  const avant = etat.p0?.photo || null;
  F.photo = await rangerPortrait(F.photo || null, !!F.photo_publique);
  const ligne = { prenom: F.prenom.trim() || null, nom: F.nom.trim(), metiers: (F.metiers || []).map(x => x.trim()).filter(Boolean), bio: F.bio.trim() || null,
    photo: F.photo || null, photo_credit: F.photo_credit.trim() || null, photo_source: F.photo_source.trim() || null, photo_publique: !!F.photo_publique, publie: !!F.publie };
  const r = etat.p0 ? await sb.from('crescite_personnes').update(ligne).eq('id', etat.p0.id).select().single()
    : await sb.from('crescite_personnes').insert({ ...ligne, slug: slugPersonne(`${ligne.prenom || ''} ${ligne.nom}`), ordre: Math.max(0, ...E.personnes.map(p => p.ordre || 0)) + 10 }).select().single();
  if (r.error) throw r.error;
  remplacerLigne(E.personnes, r.data); etat.p0 = r.data;
  // l'ancien portrait (remplacé, retiré, ou passé dans l'autre stockage) ne reste nulle part
  if (avant && avant !== r.data.photo) effacerPortrait(avant);
  const pid = r.data.id;
  const coord = Object.fromEntries(SPEC_COORD.map(c => [c.k, (P[c.k] || '').trim() || null]));
  const r2 = await sb.from('crescite_personnes_privees').upsert({ personne_id: pid, ...coord }, { onConflict: 'personne_id' }).select().single();
  if (r2.error) throw r2.error;
  remplacerLigne(E.privees, r2.data, 'personne_id');
  const s0 = E.suiviPersonnes.find(x => x.personne_id === pid);
  if ((N.notes || '').trim() !== (s0?.notes || '')) {
    const r3 = await sb.from('crescite_personnes_suivi').upsert({ personne_id: pid, notes: (N.notes || '').trim() || null }, { onConflict: 'personne_id' }).select().single();
    if (r3.error) throw r3.error;
    remplacerLigne(E.suiviPersonnes, r3.data, 'personne_id');
  }
}
async function supprimerPersonne(p) {
  const ds = E.distributions.filter(x => x.personne_id === p.id), eqs = E.equipes.filter(x => x.personne_id === p.id);
  const sort = [ds.length && `de ${ds.length} ligne${ds.length > 1 ? 's' : ''} de distribution`, eqs.length && `de ${eqs.length} équipe${eqs.length > 1 ? 's' : ''} de date`].filter(Boolean).join(' et ');
  const copie = { p: clone(p), pr: clone(priveeDe(p.id)), su: clone(E.suiviPersonnes.find(x => x.personne_id === p.id) || null), ds: clone(ds), eqs: clone(eqs) };
  const { error } = await sb.from('crescite_personnes').delete().eq('id', p.id);
  if (error) return erreur(error, 'Suppression impossible');
  E.personnes = E.personnes.filter(x => x.id !== p.id); E.privees = E.privees.filter(x => x.personne_id !== p.id); E.suiviPersonnes = E.suiviPersonnes.filter(x => x.personne_id !== p.id);
  E.distributions = E.distributions.filter(x => x.personne_id !== p.id); E.equipes = E.equipes.filter(x => x.personne_id !== p.id);
  E.sale = false;
  quitterFiche('#/equipe');
  if (typeof rafraichirListes === 'function') rafraichirListes();
  annoncer(`Fiche supprimée : ${nomDe(p)}${sort ? `, sortie ${sort}` : ''}.`, { libelle: 'Annuler', delai: 9000, action: async () => {
    let r = await sb.from('crescite_personnes').insert(sansMeta(copie.p));
    if (!r.error && copie.pr) r = await sb.from('crescite_personnes_privees').insert(sansMeta(copie.pr));
    if (!r.error && copie.su) r = await sb.from('crescite_personnes_suivi').insert(sansMeta(copie.su));
    if (!r.error && copie.ds.length) r = await sb.from('crescite_distributions').insert(copie.ds.map(sansMeta));
    if (!r.error && copie.eqs.length) r = await sb.from('crescite_equipes').insert(copie.eqs.map(sansMeta));
    if (r.error) return erreur(r.error, 'Rétablissement impossible');
    await chargerEquipe();
    annoncer('Fiche rétablie.');
    location.hash = `#/equipe/${copie.p.id}`;
  } });
}

// ===================================================================================================== les onglets d'un spectacle
// Distribution et Documents s'enregistrent à chaque changement ; le déroulé type va avec le reste de la fiche (Enregistrer)
function ongletEquipe(onglet, zone, F, s0) {
  if (!E.equipeInstallee) { zone.innerHTML = equipeAbsente() + pied(); return; }
  zone.innerHTML = `<div id="eq-onglet"></div>${pied()}`;
  const z = $('#eq-onglet', zone);
  if (onglet === 'Distribution') ongletDistribution(z, s0);
  else if (onglet === 'Déroulé type') ongletDeroule(z, F);
  else if (onglet === 'Matériel') ongletMateriel(z, s0);
  else { z.innerHTML = `<div class="bloc"><h3>${E.sql3 || E.sql4 ? 'Documents' : 'Documents de l’équipe'}</h3><p class="aide">Le texte, le dossier, la fiche technique… pour l’équipe du spectacle, dans son espace et ses feuilles de route ; « Administration seulement » les garde ici. Chaque changement est enregistré aussitôt.</p><div id="docs-sp"></div></div>`; documentsEditeur($('#docs-sp', z), s0); }
}

// ———— la distribution, des deux côtés : l'onglet Distribution d'un spectacle et la fiche d'une personne (« Ses spectacles »)
// lisent et écrivent la même ligne (crescite_distributions). Ajouter quelqu'un d'un côté le montre aussitôt de l'autre, sur
// la page du spectacle (« publiée ») et dans l'équipe des dates (« en tournée »).
const A_CATEGORIE = { jeu: 'au jeu', creation: 'à la création', technique: 'à la technique', production: 'à la production' };
// les métiers qui vont d'habitude avec chaque catégorie (sans accents, comme norm) : ceux-là passent en tête quand on choisit
const METIERS_CATEGORIE = {
  jeu: /\bjeu\b|comedi|acteur|actrice|interpret|chant|dans/,
  creation: /mise en scene|metteu|creat|scenograph|costum|choregraph|auteur|autrice|adapt|musique|compos|dramaturg|assistan/,
  technique: /regi|techni|plateau|machin|\bson\b|lumiere|eclairag/,
  production: /produc|admin|diffus|communic|mediat|charge|presse/,
};
const pourCategorie = (p, cat) => (p?.metiers || []).some(m => METIERS_CATEGORIE[cat]?.test(norm(m)));
const categorieProbable = p => (CATEGORIES.find(([k]) => pourCategorie(p, k)) || CATEGORIES[0])[0];
const spectaclesDe = pid => [...new Set(E.distributions.filter(x => x.personne_id === pid).map(x => x.spectacle_id))].map(spectacle).filter(Boolean);
// l'ordre : par catégorie, puis la place de chacun ; on le réécrit en entier pour que site et administration s'accordent
async function renumeroterDistribution(xs) {
  const changes = xs.map((x, i) => [x, (i + 1) * 10]).filter(([x, o]) => x.ordre !== o);
  const rs = await Promise.all(changes.map(([x, o]) => sb.from('crescite_distributions').update({ ordre: o }).eq('id', x.id)));
  const r = rs.find(x => x.error); if (r) throw r.error;
  changes.forEach(([x, o]) => { x.ordre = o; });
}
// ajouter quelqu'un à la distribution d'un spectacle, au bout de sa catégorie (sa fonction tirée de ses métiers, hors jeu ;
// en tournée pour le jeu et la technique) → la ligne, ou null (déjà là, ou refusé par la base)
async function ajouterADistribution(spId, pid, cat) {
  const p = personne(pid);
  if (E.distributions.some(y => y.spectacle_id === spId && y.personne_id === pid && y.categorie === cat)) { annoncer(`${nomDe(p)} est déjà dans la distribution (${libelleCategorie(cat)}).`, { erreur: true }); return null; }
  const fonction = cat === 'jeu' ? '' : ((p?.metiers || []).find(m => !/^jeu$/i.test(m.trim())) || '');
  const xs = distributionDe(spId), dernier = [...xs].reverse().find(x => rangCategorie(x.categorie) <= rangCategorie(cat));
  const enTournee = cat === 'jeu' || cat === 'technique';
  // qui part en tournée compte sur les dates du spectacle : une seule boîte dit lesquelles changent (et propose de n'en rien
  // changer avant aujourd'hui) avant qu'on écrive
  const choix = enTournee ? await DISTRIBUTION.impact(spId, { pid, sens: 'ajout', geste: 'ajouter' }) : { limiter: false, passees: [] };
  if (!choix) return null;
  const { data, error } = await sb.from('crescite_distributions').insert({ spectacle_id: spId, personne_id: pid, categorie: cat, fonction, en_tournee: enTournee, publie: true, ordre: (dernier?.ordre || 0) + 5 }).select().single();
  if (error) { erreur(error, 'Ajout impossible'); return null; }
  E.distributions.push(data);
  // (la distribution d'abord, les écarts ensuite : il ne partait pas, il ne compte pas sur les dates d'avant)
  if (choix.limiter && choix.passees.length) { try { await ecrireEcarts(pid, new Map(choix.passees.map(d => [d.id, false])), { dansDist: true }); } catch (e) { erreur(e, 'Dates passées non écrites'); } }
  try { await renumeroterDistribution(distributionDe(spId)); } catch (e) { erreur(e, 'Ordre non enregistré'); }
  return data;
}
// retirer une ligne, tout de suite ; l'annonce porte « Annuler », qui la remet ; apres() redessine
async function retirerDeDistribution(x, apres, defaireAussi = null) {
  const { error } = await sb.from('crescite_distributions').delete().eq('id', x.id);
  if (error) return erreur(error, 'Retrait impossible');
  E.distributions = E.distributions.filter(y => y.id !== x.id);
  apres();
  annoncer(`Retiré de la distribution de ${spectacle(x.spectacle_id)?.titre || 'ce spectacle'} : ${nomDe(personne(x.personne_id))}${defaireAussi ? ' (ses dates passées le gardent)' : ''}.`, { libelle: 'Annuler', action: async () => {
    const r = await sb.from('crescite_distributions').insert(sansMeta(x)).select().single();
    if (r.error) return erreur(r.error, 'Rétablissement impossible');
    E.distributions.push(r.data);
    if (defaireAussi) await defaireAussi();
    apres();
  } });
}
// « Ajouter à la distribution » : toute la troupe (les fiches de la rubrique Équipe), à chercher par nom, métier ou
// spectacle, ceux dont le métier va avec la catégorie en tête. Un geste ajoute ; la fenêtre reste ouverte pour en ajouter
// d'autres, et qui y est déjà est coché. Une personne qui n'a pas encore de fiche : on la crée au vol. Avec onChoix,
// on choisit seulement quelqu'un (sans catégorie, sans l'ajouter) : la fenêtre se ferme et onChoix(id) suit.
function choisirDansLaTroupe(s, { categorie = 'jeu', declencheur = null, apres = () => {}, titre = null, aide = null, onChoix = null } = {}) {
  $('#troupe-choix')?.remove();
  let cat = categorie, q = '';
  const ajoutes = [];
  const dlg = document.createElement('dialog');
  dlg.id = 'troupe-choix'; dlg.className = 'tab-dialogue large troupe-choix'; dlg.setAttribute('aria-labelledby', 'tc-titre');
  dlg.innerHTML = `<div class="tab-dialogue-boite">
      <div class="tc-tete"><h2 id="tc-titre">${esc(titre || `Ajouter à la distribution de ${s.titre}`)}</h2><button type="button" class="btn ${onChoix ? '' : 'principal '}petit" data-tc-fermer>${onChoix ? 'Fermer' : 'Terminé'}</button></div>
      ${onChoix ? '' : `<div class="tc-cat"><span id="tc-cat-lib">Pour</span><div class="seg" role="group" aria-labelledby="tc-cat-lib">${CATEGORIES.map(([k, l]) => `<button type="button" data-tc-cat="${k}" aria-pressed="${k === cat}">${l}</button>`).join('')}</div></div>`}
      <input type="search" id="tc-q" placeholder="Rechercher dans la troupe : nom, métier, spectacle…" aria-label="Rechercher dans la troupe" autocomplete="off">
      <ul class="tc-liste" id="tc-liste"></ul>
      <p class="tc-msg" role="status" aria-live="polite"></p>
      <p class="aide">${esc(aide || 'Chaque personne a une seule fiche, dans la rubrique Équipe : l’ajouter ici l’inscrit aussitôt dans « Ses spectacles » sur sa fiche, sur la page du spectacle, et dans l’équipe des dates si elle part en tournée.')}</p>
    </div>`;
  const liste = $('#tc-liste', dlg), champ = $('#tc-q', dlg), msg = $('.tc-msg', dlg);
  const dessiner = () => {
    const nq = norm(q).trim(), ici = pid => E.distributions.filter(x => x.spectacle_id === s.id && x.personne_id === pid);
    const xs = E.personnes.filter(p => !nq || norm(`${nomDe(p)} ${(p.metiers || []).join(' ')} ${spectaclesDe(p.id).map(t => t.titre).join(' ')}`).includes(nq))
      .sort((a, b) => pourCategorie(b, cat) - pourCategorie(a, cat) || norm(a.nom).localeCompare(norm(b.nom)) || norm(a.prenom).localeCompare(norm(b.prenom)));
    const creer = q.trim() && !E.personnes.some(p => norm(nomDe(p)) === nq);
    liste.innerHTML = xs.map(p => {
      const ds = ici(p.id), deja = !onChoix && ds.some(x => x.categorie === cat), sps = spectaclesDe(p.id);
      return `<li><button type="button" class="tc-p" data-p="${p.id}"${deja ? ' aria-disabled="true"' : ''}>${avatar(p, true)}<span class="tc-nom"><b>${esc(nomDe(p))}</b>
        <small>${esc((p.metiers || []).join(', ') || 'Métier à préciser')}${sps.length ? ` · ${esc(sps.map(t => t.titre.split(' – ')[0]).join(', '))}` : ''}</small></span>
        <span class="tc-etat">${onChoix ? 'Choisir' : deja ? `✓ ${esc(libelleCategorie(cat))}` : `＋ Ajouter${ds.length ? `<small>déjà : ${esc(ds.map(x => libelleCategorie(x.categorie)).join(', '))}</small>` : ''}`}</span></button></li>`;
    }).join('') + (creer ? `<li><button type="button" class="tc-p tc-creer" data-tc-creer><span class="avatar petit" aria-hidden="true">＋</span><span class="tc-nom"><b>Nouvelle fiche : ${esc(q.trim())}</b><small>créée dans Équipe${onChoix ? '' : `, puis ajoutée ${A_CATEGORIE[cat]}`}</small></span><span class="tc-etat">＋ Créer</span></button></li>` : '')
      || `<li class="aide tc-vide">${E.personnes.length ? 'Personne ne correspond.' : 'La troupe est vide pour l’instant : tapez un nom pour créer la première fiche.'}</li>`;
  };
  const ajouter = async b => {
    if (b.getAttribute('aria-disabled') === 'true') { msg.textContent = `${b.querySelector('b').textContent} est déjà ${A_CATEGORIE[cat].replace(/^au /, 'dans le ').replace(/^à la /, 'dans la ')}.`; return; }
    if (b.dataset.occupe) return;
    b.dataset.occupe = '1';
    let pid = +b.dataset.p;
    if (b.dataset.tcCreer !== undefined) {
      try { pid = (await creerPersonne(q.trim(), cat === 'jeu' ? ['Jeu'] : [])).id; } catch (e) { delete b.dataset.occupe; return erreur(e, 'Fiche non créée'); }
      q = ''; champ.value = '';
    }
    if (onChoix) { delete b.dataset.occupe; dlg.close(); onChoix(pid); return; }
    const x = await ajouterADistribution(s.id, pid, cat);
    delete b.dataset.occupe;
    if (!x) return;
    ajoutes.push(x); apres(x);
    const avant = x.en_tournee && comptePassees(s.id, pid);
    msg.textContent = `Ajouté ${A_CATEGORIE[cat]} : ${nomDe(personne(pid))}. Sa fiche est à jour.${avant ? ' Elle compte aussi sur les dates passées : sa période se règle dans « Qui a joué quand ».' : ''}`;
    dessiner();
    ($(`.tc-p[data-p="${pid}"]`, liste) || champ).focus();
  };
  const boutons = () => $$('.tc-p', liste);
  champ.addEventListener('input', () => { q = champ.value; dessiner(); });
  champ.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); boutons()[0]?.focus(); }
    if (e.key === 'Enter') { e.preventDefault(); const b = boutons().find(x => x.getAttribute('aria-disabled') !== 'true'); if (b && champ.value.trim()) ajouter(b); }
  });
  liste.addEventListener('keydown', e => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const bs = boutons(), i = bs.indexOf(document.activeElement), j = i + (e.key === 'ArrowDown' ? 1 : -1);
    (j < 0 ? champ : bs[Math.min(j, bs.length - 1)])?.focus();
  });
  dlg.addEventListener('click', e => {
    if (e.target === dlg || e.target.closest('[data-tc-fermer]')) { dlg.close(); return; }
    const c = e.target.closest('[data-tc-cat]');
    if (c) { cat = c.dataset.tcCat; $$('[data-tc-cat]', dlg).forEach(x => x.setAttribute('aria-pressed', x === c)); msg.textContent = ''; dessiner(); return; }
    const b = e.target.closest('.tc-p'); if (b) ajouter(b);
  });
  dlg.addEventListener('close', () => {
    dlg.remove();
    if (declencheur?.isConnected) declencheur.focus();
    if (ajoutes.length === 1) { const pid = ajoutes[0].personne_id; annoncer(`Ajouté à la distribution : ${nomDe(personne(pid))}. Sa fiche est à jour.`, { libelle: 'Voir sa fiche', action: () => { location.hash = `#/equipe/${pid}`; } }); }
    else if (ajoutes.length > 1) annoncer(`${ajoutes.length} personnes ajoutées à la distribution : leurs fiches sont à jour.`);
  });
  document.body.append(dlg);
  dessiner();
  dlg.showModal();
  champ.focus();
}

// ———— qui a joué quand : l'équipe de chaque date du spectacle (la distribution « en tournée », corrigée date par date dans
// crescite_equipes), lue en périodes. Une période se règle d'un coup : on écrit, date par date, les écarts qu'elle change
// (comme l'import de l'historique, supabase/equipe.py) ; rien d'autre ne change dans la base, et tout ce qui lit l'équipe
// d'une date (feuilles de route, espace de l'équipe, notifications, agendas) suit.
// (ce qu'on a joué : les représentations confirmées ; ni les options, ni les reports, ni les répétitions ou résidences)
const datesDuSpectacle = spId => E.dates.filter(d => d.spectacle_id === spId && d.statut === 'confirmee' && (d.nature || 'representations') === 'representations').sort((a, b) => a.debut < b.debut ? -1 : a.debut > b.debut ? 1 : a.id - b.id);
const finDe = d => d.fin || d.debut;
const jourEntier = j => { if (!j) return ''; const d = new Date(`${j}T12:00:00`); return `${d.getDate() === 1 ? '1er' : d.getDate()} ${MC[d.getMonth()]} ${d.getFullYear()}`; };
// les dates du spectacle et, pour chacune, qui en est
function presences(spId) {
  const ds = datesDuSpectacle(spId);
  return { ds, qui: ds.map(d => new Set(equipeDeLaDate(d).map(x => x.personne_id))) };
}
// les périodes d'une personne : ses dates consécutives (dans l'ordre des dates du spectacle) → [{ du, au, n, aVenir }]
function periodesDe(pid, P) {
  const out = []; let cur = null;
  P.ds.forEach((d, i) => {
    if (!P.qui[i].has(pid)) { cur = null; return; }
    if (!cur) out.push(cur = { du: d.debut, au: finDe(d), n: 0, aVenir: 0 });
    cur.au = finDe(d); cur.n++; if (finDe(d) >= AUJ) cur.aVenir++;
  });
  return out;
}
const periodeTexte = p => `${p.du === p.au ? `le ${jourEntier(p.du)}` : `du ${jourEntier(p.du)} au ${jourEntier(p.au)}`} · ${p.n} date${p.n > 1 ? 's' : ''}${p.aVenir ? ` (dont ${p.aVenir} à venir)` : ''}`;
const enTourneeDans = (spId, pid) => E.distributions.some(x => x.spectacle_id === spId && x.personne_id === pid && x.en_tournee);
// la personne compte-t-elle sur une date passée du spectacle ? (« Il compte aussi sur ses dates passées », après un ajout
// qu'on n'a pas limité à partir d'aujourd'hui)
const comptePassees = (spId, pid) => datesDuSpectacle(spId).some(d => finDe(d) < AUJ && equipeDeLaDate(d).some(y => y.personne_id === pid));
// écrire la présence voulue d'une personne sur des dates (Map date_id → vrai/faux), en écarts à la distribution : rien
// pour qui suit la distribution, present: vrai pour qui s'y ajoute, faux pour qui n'en est pas. → les lignes d'avant, pour
// « Annuler » (retablirEcarts)
async function ecrireEcarts(pid, voulu, { dansDist, fonction = '' }) {
  const avant = clone(E.equipes.filter(x => x.personne_id === pid && voulu.has(x.date_id)));
  const aSupprimer = [], aEcrire = [];
  voulu.forEach((la, dateId) => {
    const e = E.equipes.find(x => x.date_id === dateId && x.personne_id === pid);
    if (la === dansDist) { if (e && !(la && e.present)) aSupprimer.push(dateId); }   // la distribution suffit (une fonction propre à la date reste)
    else if (!e || e.present !== la) aEcrire.push({ date_id: dateId, personne_id: pid, present: la, fonction: la ? (e?.fonction || fonction || null) : null, note: e?.note ?? null });
  });
  for (let i = 0; i < aSupprimer.length; i += 200) { const { error } = await sb.from('crescite_equipes').delete().eq('personne_id', pid).in('date_id', aSupprimer.slice(i, i + 200)); if (error) throw error; }
  for (let i = 0; i < aEcrire.length; i += 200) { const { error } = await sb.from('crescite_equipes').upsert(aEcrire.slice(i, i + 200), { onConflict: 'date_id,personne_id' }); if (error) throw error; }
  await relireEcarts(pid);
  return { avant, dates: [...voulu.keys()] };
}
async function relireEcarts(pid) {
  const { data, error } = await sb.from('crescite_equipes').select('*').eq('personne_id', pid);
  if (error) throw error;
  E.equipes = E.equipes.filter(x => x.personne_id !== pid).concat(data);
}
async function retablirEcarts(pid, { avant, dates }) {
  for (let i = 0; i < dates.length; i += 200) { const { error } = await sb.from('crescite_equipes').delete().eq('personne_id', pid).in('date_id', dates.slice(i, i + 200)); if (error) throw error; }
  if (avant.length) { const { error } = await sb.from('crescite_equipes').insert(avant.map(sansMeta)); if (error) throw error; }
  await relireEcarts(pid);
}
// « Régler sa période » : la personne compte sur les dates du … au … (vide : depuis la première, jusqu'à la dernière, à
// venir comprises), et sur aucune autre. L'aperçu dit ce qui change avant d'appliquer ; « Annuler » remet tout.
function reglerPeriode(s, pid, { declencheur = null, apres = () => {} } = {}) {
  $('#periode-choix')?.remove();
  const p = personne(pid), P = presences(s.id), pers = periodesDe(pid, P), dist = E.distributions.filter(x => x.spectacle_id === s.id && x.personne_id === pid);
  const dansDist = enTourneeDans(s.id, pid), derniere = P.ds[P.ds.length - 1];
  const du0 = pers[0]?.du || '', au0 = pers.length && finDe(derniere) !== pers[pers.length - 1].au ? pers[pers.length - 1].au : '';
  const fonction0 = dist[0] ? fonctionDistribution(dist[0]) : (p?.metiers || [])[0] || '';
  const dlg = document.createElement('dialog');
  dlg.id = 'periode-choix'; dlg.className = 'tab-dialogue periode-choix'; dlg.setAttribute('aria-labelledby', 'pp-titre');
  dlg.innerHTML = `<form method="dialog" class="tab-dialogue-boite">
      <h2 id="pp-titre">${esc(nomDe(p))} dans ${esc(s.titre)}</h2>
      <p class="aide">Aujourd’hui : ${pers.length ? esc(pers.map(periodeTexte).join(' ; ')) : 'sur aucune date'}${dansDist ? ' · dans la distribution actuelle' : ''}.</p>
      <div class="pp-dates"><label>A joué à partir du<input type="date" id="pp-du" value="${esc(du0)}"></label><label>jusqu’au<input type="date" id="pp-au" value="${esc(au0)}"></label></div>
      <p class="aide">Vide : depuis la toute première date, ou jusqu’à la dernière (à venir comprises). Hors de cette période, ${P.ds.length > 1 ? `les ${P.ds.length} dates du spectacle ne la comptent plus` : 'la date du spectacle ne la compte plus'} ; une date se corrige encore à la main, dans Représentations.</p>
      ${dansDist ? '' : `<label class="pp-fonction">Ce qu’elle y faisait<input type="text" id="pp-fonction" value="${esc(fonction0)}" placeholder="Jeu (rôle), Régie générale…"></label>`}
      ${dansDist ? '<label class="case pp-quitter"><input type="checkbox" id="pp-quitter"> Elle ne fait plus partie de la distribution : la retirer (les prochaines dates ne la compteront plus ; ses dates de la période la gardent)</label>' : ''}
      <p class="pp-apercu" aria-live="polite"></p>
      <div class="fm-boutons"><button type="submit" class="btn principal" id="pp-ok">Appliquer</button><button type="button" class="btn" data-pp-fermer>Fermer</button></div>
    </form>`;
  const du = $('#pp-du', dlg), au = $('#pp-au', dlg), quitter = $('#pp-quitter', dlg), apercu = $('.pp-apercu', dlg), ok = $('#pp-ok', dlg);
  const voulu = () => new Map(P.ds.map(d => [d.id, (!du.value || finDe(d) >= du.value) && (!au.value || d.debut <= au.value)]));
  const changements = () => { const v = voulu(); return P.ds.filter((d, i) => v.get(d.id) !== P.qui[i].has(pid)); };
  const montrer = () => {
    if (du.value && au.value && au.value < du.value) { apercu.textContent = 'La fin vient avant le début.'; return; }
    const v = voulu(), n = [...v.values()].filter(Boolean).length, ch = changements(), futurs = ch.filter(d => finDe(d) >= AUJ).length;
    const prochaines = dansDist && !(quitter && quitter.checked) && au.value && au.value < finDe(derniere);
    apercu.textContent = `Elle comptera sur ${n} des ${P.ds.length} date${P.ds.length > 1 ? 's' : ''} du spectacle. ${ch.length ? `${ch.length} date${ch.length > 1 ? 's changent' : ' change'}${futurs ? `, dont ${futurs} à venir : elle en sera prévenue si elle a un compte` : ''}.` : 'Rien ne change.'}${prochaines ? ' Encore dans la distribution, elle comptera sur les dates créées plus tard : cochez la case pour la retirer.' : ''}`;
  };
  // (un champ de date rempli au sélecteur, sur l'iPhone, ne dit que « change » ; « Appliquer » reste toujours actif)
  dlg.addEventListener('input', montrer);
  dlg.addEventListener('change', montrer);
  dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('[data-pp-fermer]')) dlg.close(); });
  dlg.addEventListener('close', () => { dlg.remove(); if (declencheur?.isConnected) declencheur.focus(); });
  $('form', dlg).addEventListener('submit', async e => {
    e.preventDefault();
    if (du.value && au.value && au.value < du.value) { montrer(); au.focus(); return; }
    if (!changements().length && !(quitter && quitter.checked)) { dlg.close(); annoncer(`Rien ne change : ${nomDe(p)} comptait déjà sur ces dates.`); return; }
    ok.disabled = true; ok.textContent = 'Un instant…';
    const sort = quitter && quitter.checked, fonction = ($('#pp-fonction', dlg)?.value || fonction0).trim();
    const v = voulu(), retires = sort ? clone(dist) : [];
    // sans la distribution, chaque date de la période doit la porter elle-même
    const cible = sort ? new Map(P.ds.map(d => [d.id, v.get(d.id)])) : new Map(changements().map(d => [d.id, v.get(d.id)]));
    let trace;
    try {
      trace = await ecrireEcarts(pid, cible, { dansDist: dansDist && !sort, fonction });
      if (sort) {
        const { error } = await sb.from('crescite_distributions').delete().eq('spectacle_id', s.id).eq('personne_id', pid);
        if (error) throw error;
        E.distributions = E.distributions.filter(x => !(x.spectacle_id === s.id && x.personne_id === pid));
      }
    } catch (err) { ok.disabled = false; ok.textContent = 'Appliquer'; return erreur(err, 'Période non enregistrée'); }
    dlg.close();
    apres();
    annoncer(`Période de ${nomDe(p)} enregistrée${sort ? ', et retirée de la distribution' : ''}.`, { libelle: 'Annuler', delai: 9000, action: async () => {
      try {
        if (retires.length) { const r = await sb.from('crescite_distributions').insert(retires.map(sansMeta)).select(); if (r.error) throw r.error; E.distributions.push(...r.data); }
        await retablirEcarts(pid, trace);
        apres();
      } catch (err) { erreur(err, 'Rétablissement impossible'); }
    } });
  });
  document.body.append(dlg);
  montrer();
  dlg.showModal();
  du.focus();
}
// le bloc « Qui a joué quand » de l'onglet Distribution
function blocHistorique(s) {
  const P = presences(s.id);
  const ids = new Set(P.qui.flatMap(x => [...x]));
  distributionDe(s.id).filter(x => x.en_tournee).forEach(x => ids.add(x.personne_id));
  const gens = [...ids].map(pid => ({ pid, p: personne(pid), pers: periodesDe(pid, P) })).filter(x => x.p)
    .sort((a, b) => (a.pers[0]?.du || '9') < (b.pers[0]?.du || '9') ? -1 : (a.pers[0]?.du || '9') > (b.pers[0]?.du || '9') ? 1 : norm(a.p.nom).localeCompare(norm(b.p.nom)));
  const etendue = P.ds.length ? `${P.ds.length} date${P.ds.length > 1 ? 's' : ''}, du ${jourEntier(P.ds[0].debut)} au ${jourEntier(finDe(P.ds[P.ds.length - 1]))}` : 'aucune date pour l’instant';
  return `<div class="bloc dist-histo"><div class="dist-tete"><h3>Qui a joué quand</h3><button type="button" class="btn" data-histo-ajouter>＋ Quelqu’un qui a joué avant</button></div>
    <p class="aide">D’après l’équipe de chaque date (${esc(etendue)}). Quand la distribution a changé, réglez la période de chacun : « Régler sa période » écrit d’un coup les dates qu’elle change. Le détail d’une date se corrige dans Représentations.</p>
    ${gens.length ? `<ul class="histo-l">${gens.map(({ pid, p, pers }) => `<li data-histo="${pid}">${avatar(p, true)}<span class="dist-nom"><a href="#/equipe/${pid}" title="Ouvrir sa fiche">${esc(nomDe(p))}</a><small>${enTourneeDans(s.id, pid) ? 'Distribution actuelle' : 'Ne fait plus partie de la distribution'}</small></span>
      <span class="histo-periodes">${pers.length ? pers.map(x => `<span class="histo-periode">${esc(periodeTexte(x))}</span>`).join('') : '<span class="aide">Sur aucune date</span>'}</span>
      <button type="button" class="btn petit" data-histo-regler="${pid}">Régler sa période</button></li>`).join('')}</ul>` : '<p class="aide">Personne pour l’instant.</p>'}</div>`;
}
// retirer quelqu'un de la distribution : une seule boîte (DISTRIBUTION.impact) dit les dates à venir qui changent d'équipe
// et propose, coché d'office, de limiter le retrait à partir d'aujourd'hui (il a joué, il ne joue plus : ses dates passées
// le gardent) ; sans date qui change, tout de suite. Les écarts d'abord, la distribution ensuite : le déclencheur calcule la
// présence par défaut depuis crescite_distributions au moment d'écrire, l'inverse enverrait « Vous partez » à tort
async function retirerAvecHistoire(x, apres, declencheur = null) {
  const pid = x.personne_id;
  const choix = await DISTRIBUTION.impact(x.spectacle_id, { pid, sens: 'retrait', ligne: x, geste: 'retirer', declencheur });
  if (!choix) return;
  if (!choix.limiter || !choix.passees.length) return retirerDeDistribution(x, apres);
  let trace;
  try { trace = await ecrireEcarts(pid, new Map(choix.passees.map(d => [d.id, true])), { dansDist: false, fonction: fonctionDistribution(x) }); }
  catch (err) { return erreur(err, 'Retrait impossible'); }
  await retirerDeDistribution(x, apres, async () => { try { await retablirEcarts(pid, trace); } catch (err) { erreur(err, 'Dates passées non rétablies'); } });
}

function ongletDistribution(z, s) {
  const etat = t => { const el = $('#dist-etat', z); if (el) el.textContent = t; };
  const renumeroter = renumeroterDistribution;
  const ligne = (x, i, n) => {
    const p = personne(x.personne_id);
    return `<div class="dist-l" data-di="${x.id}">${avatar(p, true)}<span class="dist-nom"><a href="#/equipe/${x.personne_id}" title="Ouvrir sa fiche">${esc(nomDe(p) || '?')}</a><small>${esc((p?.metiers || []).slice(0, 2).join(', '))}</small></span>
      <span class="dist-champs"><input type="text" data-dc="fonction" value="${esc(x.fonction || '')}" placeholder="${x.categorie === 'jeu' ? 'Fonction' : 'Régie générale…'}" title="${x.categorie === 'jeu' ? 'Vide pour le jeu, d’habitude' : 'Ce que la personne fait dans ce spectacle'}" aria-label="Fonction">
        <input type="text" data-dc="role" value="${esc(x.role || '')}" placeholder="Rôle" aria-label="Rôle"><input type="text" data-dc="alternance" value="${esc(x.alternance || '')}" placeholder="En alternance avec…" aria-label="Alternance">
        <select data-dc="categorie" aria-label="Catégorie">${CATEGORIES.map(([k, l]) => `<option value="${k}"${x.categorie === k ? ' selected' : ''}>${l}</option>`).join('')}</select></span>
      <span class="dist-cases"><label class="case"><input type="checkbox" data-dc="en_tournee"${x.en_tournee ? ' checked' : ''}> en tournée</label><label class="case"><input type="checkbox" data-dc="publie"${x.publie ? ' checked' : ''}> publiée</label></span>
      <span class="dist-outils"><button type="button" class="btn petit" data-dm="-1" title="Monter" aria-label="Monter ${esc(nomDe(p))}"${i ? '' : ' disabled'}>↑</button><button type="button" class="btn petit" data-dm="1" title="Descendre" aria-label="Descendre ${esc(nomDe(p))}"${i < n - 1 ? '' : ' disabled'}>↓</button><button type="button" class="btn petit danger" data-dr title="Retirer de la distribution" aria-label="Retirer ${esc(nomDe(p))}">✕</button></span></div>`;
  };
  const dessiner = () => {
    const xs = distributionDe(s.id);
    z.innerHTML = `<div class="bloc"><div class="dist-tete"><h3>Distribution</h3><button type="button" class="btn principal" data-dist-ajouter="">＋ Ajouter quelqu’un de la troupe</button></div>
      <p class="aide">Qui fait quoi dans ce spectacle, choisi parmi les fiches de la troupe (rubrique Équipe) : chacun y retrouve ce spectacle dans « Ses spectacles ». « En tournée » : la personne part sur chaque date (l’équipe se règle ensuite date par date, dans Représentations). « Publiée » : elle apparaît sur la page du spectacle. Chaque changement est enregistré aussitôt. <span id="dist-etat" class="dist-etat" aria-live="polite"></span></p>
      <div class="dist-l dist-entete" aria-hidden="true"><span></span><span></span><span class="dist-champs"><span>Fonction</span><span>Rôle</span><span>Alternance</span><span>Catégorie</span></span><span class="dist-cases"><span>Part en tournée, apparaît sur le site</span></span><span class="dist-outils"><span>Ordre</span></span></div>
      ${CATEGORIES.map(([k, l]) => { const ys = xs.filter(x => x.categorie === k); return `<div class="dist-cat" data-cat="${k}"><h4>${l}${ys.length ? ` <span class="badge">${ys.length}</span>` : ''}</h4>${ys.map((x, i) => ligne(x, i, ys.length)).join('') || '<p class="aide dist-vide">Personne pour l’instant.</p>'}
        <button type="button" class="btn lien petit dist-ajouter-cat" data-dist-ajouter="${k}">＋ Ajouter ${A_CATEGORIE[k]}</button></div>`; }).join('')}</div>
      ${blocHistorique(s)}`;
  };
  const ouvrirChoix = b => choisirDansLaTroupe(s, { categorie: b.dataset.distAjouter || 'jeu', declencheur: b,
    apres: x => { dessiner(); const l = $(`[data-di="${x.id}"]`, z); if (l) tt('ajouter', l); } });
  z.addEventListener('change', async e => {
    const t = e.target, l = t.closest('[data-di]'); if (!l || !t.dataset.dc) return;
    const x = E.distributions.find(y => y.id === +l.dataset.di); if (!x) return;
    const k = t.dataset.dc, v = t.type === 'checkbox' ? t.checked : k === 'fonction' || k === 'categorie' ? t.value.trim() : t.value.trim() || null;
    const remettre = () => { if (t.type === 'checkbox') t.checked = !t.checked; else t.value = x[k] ?? ''; };
    if ((k === 'fonction' || k === 'categorie') && E.distributions.some(y => y.id !== x.id && y.spectacle_id === x.spectacle_id && y.personne_id === x.personne_id
      && y.categorie === (k === 'categorie' ? v : x.categorie) && (y.fonction || '') === (k === 'fonction' ? v : x.fonction || ''))) { remettre(); return annoncer('Cette personne a déjà cette ligne dans la distribution.', { erreur: true }); }
    // « en tournée » (cochée ou décochée) change l'équipe de toutes les dates sans écart, à venir comme passées : la boîte
    // d'impact avant d'écrire, et l'on renonce en remettant la case
    let choix = null, trace = null;
    if (k === 'en_tournee') {
      choix = await DISTRIBUTION.impact(s.id, { pid: x.personne_id, sens: v ? 'ajout' : 'retrait', ligne: x, geste: v ? 'cocher' : 'decocher', declencheur: t });
      if (!choix) { remettre(); return; }
      // (la personne s'en va : ses dates passées la gardent d'abord ; elle arrive : les écarts viennent après la distribution)
      if (!v && choix.limiter && choix.passees.length) {
        try { trace = await ecrireEcarts(x.personne_id, new Map(choix.passees.map(d => [d.id, true])), { dansDist: false, fonction: fonctionDistribution(x) }); }
        catch (err) { remettre(); return erreur(err, 'Dates passées non gardées'); }
      }
    }
    const { data, error } = await sb.from('crescite_distributions').update({ [k]: v }).eq('id', x.id).select().single();
    if (error) { remettre(); if (trace) { try { await retablirEcarts(x.personne_id, trace); } catch (err) { erreur(err, 'Dates passées non rétablies'); } } return erreur(error); }
    remplacerLigne(E.distributions, data);
    if (v && choix?.limiter && choix.passees.length) { try { await ecrireEcarts(x.personne_id, new Map(choix.passees.map(d => [d.id, false])), { dansDist: true }); } catch (err) { erreur(err, 'Dates passées non écrites'); } }
    if (k === 'categorie') { try { await renumeroter(distributionDe(s.id)); } catch (err) { erreur(err, 'Ordre non enregistré'); } dessiner(); }
    etat(`Enregistré à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')}.`);
  });
  z.addEventListener('click', async e => {
    const a = e.target.closest('[data-dist-ajouter]');
    if (a) { ouvrirChoix(a); return; }
    const h = e.target.closest('[data-histo-regler]');
    if (h) { reglerPeriode(s, +h.dataset.histoRegler, { declencheur: h, apres: () => { if (z.isConnected) dessiner(); } }); return; }
    if (e.target.closest('[data-histo-ajouter]')) {
      const b0 = e.target.closest('[data-histo-ajouter]');
      choisirDansLaTroupe(s, { declencheur: b0, titre: `Qui a joué ${s.titre} ?`, aide: 'Choisissez la personne, puis la période où elle a joué : ses dates la compteront, sans l’ajouter à la distribution actuelle.',
        onChoix: pid => reglerPeriode(s, pid, { apres: () => { if (z.isConnected) dessiner(); } }) });
      return;
    }
    const b = e.target.closest('button'), l = b?.closest('[data-di]'); if (!l) return;
    const x = E.distributions.find(y => y.id === +l.dataset.di); if (!x) return;
    const p = personne(x.personne_id);
    if (b.dataset.dm) {
      const xs = distributionDe(s.id), ys = xs.filter(y => y.categorie === x.categorie), i = ys.indexOf(x), j = i + +b.dataset.dm;
      if (j < 0 || j >= ys.length) return;
      const a = xs.indexOf(ys[i]), c = xs.indexOf(ys[j]);
      [xs[a], xs[c]] = [xs[c], xs[a]];
      try { await renumeroter(xs); } catch (err) { return erreur(err, 'Ordre non enregistré'); }
      dessiner(); etat('Ordre enregistré.');
      $(`[data-di="${x.id}"] [data-dm="${b.dataset.dm}"]:not([disabled])`, z)?.focus();
      return;
    }
    if (b.dataset.dr !== undefined) await retirerAvecHistoire(x, () => { if (z.isConnected) dessiner(); }, b);
  });
  dessiner();
}

// le déroulé type : des étapes « X h Y avant le lever de rideau » ou « après la fin », posées autour des représentations
function ongletDeroule(z, F) {
  if (!Array.isArray(F.feuille_modele)) F.feuille_modele = [];
  const exemples = { un: [{ heure: '20:00' }], matin: [{ heure: '10:00', public: 'scolaire' }], deux: [{ heure: '10:20', public: 'scolaire' }, { heure: '14:10', public: 'scolaire' }], trois: [0, 1, 2].map(i => ({ jour: i, heure: '20:00' })) };
  let exemple = 'un';
  const rang = e => FEUILLE.estApres(e) ? 1e5 + Math.abs(+e.avant_min || 0) : -(+e.avant_min || 0);
  const trierModele = () => F.feuille_modele.sort((a, b) => rang(a) - rang(b));
  const ligne = (e, i) => {
    const m = Math.abs(Math.round(+e.avant_min || 0)), apres = FEUILLE.estApres(e);
    return `<div class="fm-l" data-fm="${i}"><span class="fm-temps"><input type="number" min="0" max="48" data-fk="h" value="${Math.floor(m / 60)}" aria-label="Heures"><span>h</span><input type="number" min="0" max="59" step="5" data-fk="m" value="${String(m % 60).padStart(2, '0')}" aria-label="Minutes">
      <select data-fk="sens" aria-label="Avant ou après"><option value="avant"${apres ? '' : ' selected'}>avant le lever de rideau</option><option value="apres"${apres ? ' selected' : ''}>après la fin</option></select></span>
      <input type="text" data-fk="quoi" value="${esc(e.quoi || '')}" placeholder="Quoi : raccords, repas…" aria-label="Quoi">
      <input type="text" data-fk="qui" value="${esc(e.qui || '')}" placeholder="Qui" aria-label="Qui">
      <select data-fk="jours" aria-label="Sur plusieurs jours de suite">${[['premier', 'le premier jour'], ['tous', 'chaque jour'], ['dernier', 'le dernier jour']].map(([k, l]) => `<option value="${k}"${FEUILLE.joursEtape(e) === k ? ' selected' : ''}>${l}</option>`).join('')}</select>
      <button type="button" class="btn petit danger" data-fm-retirer title="Retirer cette étape" aria-label="Retirer cette étape">✕</button></div>`;
  };
  const dessinerExemple = () => {
    const reps = exemples[exemple].map(r => ({ jour: AGENDA.iso(new Date(Date.now() + 864e5 * (7 + (r.jour || 0)))), heure: r.heure, public: r.public || 'tout_public' }));
    const pl = FEUILLE.etapes({ spectacle: { duree: F.duree, feuille_modele: F.feuille_modele }, representations: reps });
    const jours = [...new Set(pl.map(r => r.jour))], veilles = new Set(pl.filter(r => r.veille).map(r => r.jour));
    let n = 0;
    const libelle = j => veilles.has(j) ? 'La veille' : `${['Premier', 'Deuxième', 'Troisième'][n++] || ''} jour`;
    $('#fm-exemple', z).innerHTML = pl.length ? jours.map(j => `${jours.length > 1 ? `<p class="fm-jour">${libelle(j)}</p>` : ''}<ul class="liste-simple fm-ex">${pl.filter(r => r.jour === j).map(r => `<li${r.rep ? ' class="fm-rep-ex"' : ''}><b>${esc(FEUILLE.heure(r.heure) || '–')}</b><span>${esc(r.quoi)}${r.fin ? ` <span class="compte">jusqu’à ${esc(FEUILLE.heure(r.fin))}</span>` : ''}${r.estime ? ' <span class="compte">(à vérifier)</span>' : ''}</span>${r.qui ? `<span class="compte">${esc(r.qui)}</span>` : ''}</li>`).join('')}</ul>`).join('') : '<p class="aide">Rien à montrer.</p>';
  };
  const dessiner = () => {
    const xs = F.feuille_modele, duree = FEUILLE.dureeMinutes(F.duree);
    const rangs = xs.map((e, i) => [e, i]).sort((a, b) => rang(a[0]) - rang(b[0]));
    const avant = rangs.filter(([e]) => !FEUILLE.estApres(e)), apres = rangs.filter(([e]) => FEUILLE.estApres(e));
    z.innerHTML = `<div class="bloc"><h3>Déroulé type d’une journée de représentation</h3>
      <p class="aide">Chaque feuille de route le pose autour des représentations de sa date : les étapes « avant » avant la première représentation du jour, les étapes « après » après la dernière. Plusieurs jours de suite au même lieu : chaque étape a lieu le premier jour, chaque jour ou le dernier (le montage le premier, le démontage le dernier).</p>
      <p class="aide">Rien ne se fait la nuit : le montage qui tomberait avant 8h passe la veille (à partir de 9h, ou de 14h s’il tient dans l’après-midi), et le jour même commence par l’arrivée de l’équipe, vers 8h au plus tôt et au moins une heure avant la représentation ; les raccords suivent l’arrivée. Un repas ne s’écrit qu’aux heures des repas (11h30-14h, 18h30-21h) ; une représentation le matin et une l’après-midi : le déjeuner entre les deux.</p>
      ${xs.length ? `<div class="fm-lignes"><div class="fm-l fm-entete" aria-hidden="true"><span>Quand</span><span>Quoi</span><span>Qui</span><span>Sur plusieurs jours</span><span></span></div>${avant.map(([e, i]) => ligne(e, i)).join('')}
        <div class="fm-rep"><b>Lever de rideau</b> : la représentation${duree ? `, ${esc(FEUILLE.dureeTexte(duree))} d’après la durée du spectacle` : ' (durée inconnue : indiquez-la dans l’onglet Général)'}</div>
        ${apres.map(([e, i]) => ligne(e, i)).join('')}</div>` : '<p>Aucun déroulé type : la feuille de route de chaque date ne contiendra que les représentations.</p>'}
      <div class="fm-boutons"><button type="button" class="btn petit" data-fm-ajout="avant">＋ Étape avant</button><button type="button" class="btn petit" data-fm-ajout="apres">＋ Étape après la fin</button>${xs.length ? '' : '<button type="button" class="btn petit principal" data-fm-proposer>Proposer un déroulé type</button>'}</div></div>
      <div class="bloc"><h3>Ce que donne le planning</h3><div class="seg" role="group" aria-label="Exemple">${[['un', 'Une représentation à 20h'], ['matin', 'À 10h'], ['deux', 'À 10h20 et 14h10'], ['trois', 'Trois soirs de suite']].map(([k, l]) => `<button type="button" data-fm-ex="${k}" aria-pressed="${k === exemple}">${l}</button>`).join('')}</div><div id="fm-exemple" style="margin-top:12px"></div></div>`;
    dessinerExemple();
  };
  const lireLigne = l => {
    const i = +l.dataset.fm, val = k => $(`[data-fk="${k}"]`, l).value;
    const minutes = (Math.max(0, +val('h') || 0)) * 60 + Math.max(0, +val('m') || 0), apres = val('sens') === 'apres';
    F.feuille_modele[i] = { avant_min: apres ? -minutes : minutes, quoi: val('quoi'), qui: val('qui'), jours: val('jours'), ...(apres ? { fin: true } : {}) };
  };
  z.addEventListener('input', e => { const l = e.target.closest('[data-fm]'); if (!l) return; lireLigne(l); marquerSale(); dessinerExemple(); });
  z.addEventListener('change', e => {
    const l = e.target.closest('[data-fm]'); if (!l) return;
    lireLigne(l); marquerSale();
    if (['h', 'm', 'sens'].includes(e.target.dataset.fk)) {
      const garde = F.feuille_modele[+l.dataset.fm];
      trierModele(); dessiner();
      $(`[data-fm="${F.feuille_modele.indexOf(garde)}"] [data-fk="quoi"]`, z)?.focus();
    }
  });
  z.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.fmEx) { exemple = b.dataset.fmEx; $$('[data-fm-ex]', z).forEach(x => x.setAttribute('aria-pressed', x === b)); dessinerExemple(); return; }
    if (b.dataset.fmProposer !== undefined) { F.feuille_modele = clone(FEUILLE.DEROULE); marquerSale(); dessiner(); annoncer('Déroulé type proposé : ajustez-le, puis enregistrez.'); return; }
    if (b.dataset.fmAjout) {
      const neuf = b.dataset.fmAjout === 'apres' ? { avant_min: -30, quoi: '', qui: '', jours: 'dernier', fin: true } : { avant_min: 90, quoi: '', qui: '', jours: 'premier' };
      F.feuille_modele.push(neuf); trierModele(); marquerSale(); dessiner();
      const l = $(`[data-fm="${F.feuille_modele.indexOf(neuf)}"]`, z); if (l) { tt('ajouter', l); $('[data-fk="quoi"]', l)?.focus(); }
      return;
    }
    if (b.dataset.fmRetirer !== undefined) { F.feuille_modele.splice(+b.closest('[data-fm]').dataset.fm, 1); marquerSale(); dessiner(); }
  });
  dessiner();
  // les horaires habituels du spectacle (series.js), enregistrés à part, sous le déroulé
  if (typeof SERIES !== 'undefined' && F.id) { const md = document.createElement('div'); md.id = 'modele-date'; md.style.marginTop = '16px'; z.append(md); SERIES.blocModele(md, F); }
}

// les documents d'un spectacle (s) ou de toute la compagnie (s = null) : un fichier du stockage privé, ou un lien
// Les documents publics (pour les programmateurs, pour les établissements scolaires) sont dans le stockage public
// « crescite », sous documents/<spectacle>/ : le site les propose en téléchargement (troisième script SQL). Ceux de
// l'équipe restent privés, dans « crescite-equipe ». Ceux des salles (quatrième script SQL) aussi, dans « crescite-pro »
// sous <spectacle>/ : seul l'espace pro (pro/) les ouvre, aux salles invitées, par un lien d'une heure.
const POUR_PUBLIC = [
  ['pros', 'Pour les programmateurs'],
  ['scolaires', 'Pour les établissements scolaires'],
  ['tous', 'Pour les deux (programmateurs et scolaires)'],
];
const estPros = d => d.pour === 'pros' || d.pour === 'tous' || d.pour === 'pros_scolaires';
const estScolaires = d => d.pour === 'scolaires' || d.pour === 'tous' || d.pour === 'pros_scolaires';
const estPublic = d => estPros(d) || estScolaires(d);
const estSalles = d => d.pour === 'salles';
const stockageDe = d => estSalles(d) ? 'crescite-pro' : estPublic(d) ? 'crescite' : 'crescite-equipe';
const urlPublique = chemin => sb.storage.from('crescite').getPublicUrl(chemin).data.publicUrl;
const PARTAGE_JOURS = 30;
// ce que « crescite-pro » accepte (le type vient de l'extension : un ZIP n'a pas le même type sous Windows)
const MIMES_SALLES = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', mp4: 'video/mp4', zip: 'application/zip' };
const MO_SALLES = 50;
let nDocsEditeurs = 0;
function documentsEditeur(z, s) {
  const dossier = s ? s.slug : 'compagnie';
  const tous = () => E.documents.filter(d => (s ? d.spectacle_id === s.id : d.spectacle_id == null)).sort((a, b) => a.ordre - b.ordre || a.id - b.id);
  const docs = () => tous().filter(d => !estPublic(d) && !estSalles(d)), publics = () => tous().filter(estPublic), salles = () => tous().filter(estSalles);
  const groupe = d => estSalles(d) ? salles() : estPublic(d) ? publics() : docs();
  const avecSalles = !!(s && E.sql4);
  const hote = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
  const acceptDe = d => estSalles(d)
    ? '.pdf,.jpg,.jpeg,.png,.webp,.mp4,.zip,application/pdf,image/jpeg,image/png,image/webp,video/mp4,application/zip'
    : estPublic(d)
      ? '.pdf,application/pdf'
      : '.pdf,.odt,.docx,.txt,image/*';
  const ligne = (d, i, n) => `<div class="doc-l" data-doc="${d.id}"><select data-dk="type" aria-label="Type">${TYPES_DOC.map(([k, l]) => `<option value="${k}"${d.type === k ? ' selected' : ''}>${l}</option>`).join('')}</select>
    <span class="doc-titre"><input type="text" data-dk="titre" value="${esc(d.titre)}" aria-label="Titre du document"><small>${d.fichier ? `Fichier : ${esc(d.fichier.split('/').pop())}` : `Lien : ${esc(hote(d.url))}`}</small></span>
    ${estSalles(d) ? '<span class="doc-pour" title="Seules les salles invitées le voient, dans l’espace pro">Salles invitées</span>' : `<select data-dk="pour" aria-label="Pour qui">${(estPublic(d) ? POUR_PUBLIC : [['equipe', 'Pour l’équipe'], ['administration', 'Administration seulement']]).map(([k, l]) => `<option value="${k}"${(d.pour === k || (k === 'tous' && d.pour === 'pros_scolaires')) ? ' selected' : ''}>${l}</option>`).join('')}</select>`}
    <span class="dist-outils"><button type="button" class="btn petit" data-doc-ouvrir>Ouvrir</button><label class="btn petit" tabindex="0" role="button" title="Mettre à jour ce document (écrase la version précédente)">Remplacer<input type="file" data-doc-remplacer accept="${acceptDe(d)}" hidden></label>${estSalles(d) ? '' : estPublic(d) ? '<button type="button" class="btn petit" data-doc-copier title="Copier l’adresse publique du document">Copier le lien</button>' : d.fichier ? `<button type="button" class="btn petit" data-doc-partager title="Copier une adresse à envoyer, valable ${PARTAGE_JOURS} jours (une fiche technique pour un lieu, par exemple)">Lien ${PARTAGE_JOURS} jours</button>` : ''}<button type="button" class="btn petit" data-doc-dm="-1" title="Monter" aria-label="Monter"${i ? '' : ' disabled'}>↑</button><button type="button" class="btn petit" data-doc-dm="1" title="Descendre" aria-label="Descendre"${i < n - 1 ? '' : ' disabled'}>↓</button><button type="button" class="btn petit danger" data-doc-suppr title="Supprimer" aria-label="Supprimer ce document">✕</button></span></div>`;
  // la boîte d'un lien à ajouter, pour l'équipe, pour le public (programmateurs) ou pour les salles invitées
  const uid = ++nDocsEditeurs;
  const boiteLien = genre => `<div class="item doc-lien" data-genre="${genre}" hidden><div class="rangee"><div class="champ"><label for="doc-url-${uid}-${genre}">Adresse du lien</label><input type="url" id="doc-url-${uid}-${genre}" data-doc-url placeholder="https://…"></div><div class="champ"><label for="doc-titre-${uid}-${genre}">Titre${genre === 'salles' ? ' (celui que la salle voit)' : ''}</label><input type="text" id="doc-titre-${uid}-${genre}" data-doc-titre placeholder="${{ equipe: 'Le texte sur Wikisource', public: 'Le dossier de diffusion', salles: 'La captation intégrale' }[genre]}"></div></div>
        <div class="fm-boutons" style="margin:0 0 10px"><button type="button" class="btn principal petit" data-doc-lien-ok>Ajouter le lien</button><button type="button" class="btn petit" data-doc-lien-non>Annuler</button></div></div>`;
  const dessiner = () => {
    const xs = docs(), ps = publics(), ss = salles();
    z.innerHTML = `${E.sql3 || avecSalles ? '<h4 class="docs-titre">Pour l’équipe</h4>' : ''}${xs.length ? `<div class="docs">${xs.map((d, i) => ligne(d, i, xs.length)).join('')}</div>` : '<p class="aide">Aucun document.</p>'}
      <div class="docs-ajout"><label class="btn" tabindex="0" role="button">＋ Envoyer un fichier<input type="file" data-doc-fichier accept=".pdf,.odt,.docx,.txt,image/*" hidden></label><button type="button" class="btn" data-doc-lien>＋ Coller un lien</button></div>
      ${boiteLien('equipe')}
      <p class="aide">Fichiers : PDF, image, texte, ODT ou DOCX, 50 Mo au plus. Ils restent privés : on les ouvre par un lien signé, valable une heure. « Lien ${PARTAGE_JOURS} jours » copie une adresse à envoyer hors de l’équipe (une fiche technique pour un lieu).</p>
      ${E.sql3 ? `<h4 class="docs-titre">Pour les programmateurs et les établissements scolaires <span class="badge">publics</span></h4>
      <p class="aide">Ils se téléchargent sur le site : ceux des programmateurs dans « Je souhaite programmer », ceux des établissements dans « Je représente un établissement scolaire ».</p>
      ${ps.length ? `<div class="docs">${ps.map((d, i) => ligne(d, i, ps.length)).join('')}</div>` : '<p class="aide">Aucun document public.</p>'}
      <div class="docs-ajout"><label class="btn" tabindex="0" role="button">＋ Envoyer un PDF public<input type="file" data-doc-fichier-public accept=".pdf,application/pdf" hidden></label><button type="button" class="btn" data-doc-lien-public>＋ Coller un lien public</button></div>
      ${boiteLien('public')}
      <p class="aide">PDF de 25 Mo au plus, rangés dans le stockage public du site.</p>` : ''}
      ${avecSalles ? `<h4 class="docs-titre">Réservé aux salles (sur invitation) <span class="badge">privés</span></h4>
      <p class="aide">Captations, photos en haute définition, fiche technique détaillée : seules les salles invitées les voient, dans l’espace pro (rubrique <a href="#/pro">Espace pro</a>), avec les dossiers et fiches techniques des programmateurs.</p>
      ${ss.length ? `<div class="docs">${ss.map((d, i) => ligne(d, i, ss.length)).join('')}</div>` : '<p class="aide">Aucun document réservé aux salles.</p>'}
      <div class="docs-ajout"><label class="btn" tabindex="0" role="button">＋ Déposer un fichier<input type="file" data-doc-fichier-salles accept=".pdf,.jpg,.jpeg,.png,.webp,.mp4,.zip,application/pdf,image/jpeg,image/png,image/webp,video/mp4,application/zip" hidden></label><button type="button" class="btn" data-doc-lien-salles>＋ Ajouter un lien (une captation)</button></div>
      <p class="aide docs-envoi" data-envoi-salles role="status" hidden></p>
      ${boiteLien('salles')}
      <p class="aide">PDF, image (JPEG, PNG, WebP), vidéo MP4 ou ZIP, ${MO_SALLES} Mo au plus, dans un stockage privé. Une captation plus lourde se partage en lien : Vimeo, YouTube non répertorié, Drive…</p>` : ''}`;
  };
  const renumeroter = async xs => {
    const changes = xs.map((x, i) => [x, (i + 1) * 10]).filter(([x, o]) => x.ordre !== o);
    const rs = await Promise.all(changes.map(([x, o]) => sb.from('crescite_documents').update({ ordre: o }).eq('id', x.id)));
    const r = rs.find(x => x.error); if (r) throw r.error;
    changes.forEach(([x, o]) => { x.ordre = o; });
  };
  const ordreSuivant = (xs = docs()) => Math.max(0, ...xs.map(d => d.ordre || 0)) + 10;
  const typeDe = n => /dossier/i.test(n) ? 'dossier' : /fiche.?tech|technique|rider/i.test(n) ? 'fiche_technique' : /\bplans?\b|implantation/i.test(n) ? 'plan' : /texte|script|brochure|pi[eè]ce/i.test(n) ? 'texte' : 'autre';
  const titreDe = n => { const t = n.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim(); return t ? t[0].toUpperCase() + t.slice(1) : 'Document'; };
  // le titre d'un fichier des salles : l'espace pro choisit son icône sur le titre (une vidéo, des photos), qui le dit donc
  const titreSalles = (n, ext) => {
    const t = titreDe(n);
    if (ext === 'mp4' && !/captation|vid[ée]o|film|teaser|bande.?annonce|extrait/i.test(t)) return `Vidéo : ${t}`;
    if (/^(jpe?g|png|webp)$/.test(ext) && !/photo|image|visuel/i.test(t)) return `Photo : ${t}`;
    return t;
  };
  const mo = n => (n / 1024 / 1024).toLocaleString('fr-FR', { maximumFractionDigits: 1 });
  async function inserer(ligneDoc) {
    const { data, error } = await sb.from('crescite_documents').insert(ligneDoc).select().single();
    if (error) throw error;
    E.documents.push(data); dessiner();
    const l = $(`[data-doc="${data.id}"]`, z); if (l) { tt('ajouter', l); $('[data-dk="titre"]', l)?.focus(); }
    return data;
  }
  // « Envoyer un fichier » au clavier : l'étiquette prend le focus, Entrée ou Espace ouvre le choix du fichier
  z.addEventListener('keydown', e => {
    const l = e.target.closest?.('label.btn[role="button"]');
    if (l && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); $('input[type=file]', l)?.click(); }
  });
  z.addEventListener('change', async e => {
    e.stopPropagation();   // dans l'éditeur du spectacle, ce fichier n'est pas une photo
    const t = e.target;
    if (t.matches('[data-doc-remplacer]')) {
      const f = t.files[0]; t.value = ''; if (!f) return;
      const l = t.closest('[data-doc]'); if (!l) return;
      const d = E.documents.find(x => x.id === +l.dataset.doc); if (!d) return;
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      const base = f.name.replace(/\.[^.]+$/, '');
      const pub = estPublic(d), sal = estSalles(d);
      if (pub) {
        if (ext !== 'pdf' && f.type !== 'application/pdf') return annoncer('Un document public est un PDF.', { erreur: true });
        if (f.size > 25 * 1024 * 1024) return annoncer('Fichier trop lourd : 25 Mo au plus.', { erreur: true });
      } else if (sal) {
        const typeSal = MIMES_SALLES[ext];
        if (!typeSal || !f.name.includes('.')) return annoncer('Ce type de fichier n’est pas accepté ici : PDF, image (JPEG, PNG, WebP), vidéo MP4 ou ZIP.', { erreur: true });
        if (f.size > MO_SALLES * 1024 * 1024) return annoncer(`« ${f.name} » pèse ${mo(f.size)} Mo : ${MO_SALLES} Mo au plus.`, { erreur: true });
      } else {
        const typeDoc = MIMES_DOC[ext] || f.type;
        if (!Object.values(MIMES_DOC).includes(typeDoc)) return annoncer('Ce type de fichier n’est pas accepté : PDF, image, texte, ODT ou DOCX.', { erreur: true });
        if (f.size > 50 * 1024 * 1024) return annoncer('Fichier trop lourd : 50 Mo au plus.', { erreur: true });
      }
      const bucket = stockageDe(d);
      const mime = sal ? MIMES_SALLES[ext] : pub ? 'application/pdf' : (MIMES_DOC[ext] || f.type);
      const chemin = pub
        ? `documents/${dossier}/${Date.now().toString(36)}-${slugifier(base) || 'document'}.pdf`
        : `${dossier}/${Date.now().toString(36)}-${slugifier(base) || 'document'}.${ext}`;
      annoncer(`Envoi de la nouvelle version « ${f.name} »…`);
      const { error: errUp } = await sb.storage.from(bucket).upload(chemin, f, { contentType: mime, upsert: true, cacheControl: '3600' });
      if (errUp) return erreur(errUp, 'Envoi de la nouvelle version impossible');
      const ancien = d.fichier;
      const { data, error: errDb } = await sb.from('crescite_documents').update({ fichier: chemin, url: null }).eq('id', d.id).select().single();
      if (errDb) {
        await sb.storage.from(bucket).remove([chemin]);
        return erreur(errDb, 'Mise à jour impossible');
      }
      if (ancien && ancien !== chemin) {
        const partage = pub && E.documents.some(x => x.id !== d.id && x.fichier === ancien && estPublic(x));
        if (!partage) {
          const r = await sb.storage.from(bucket).remove([ancien]);
          if (r.error) console.warn('Ancienne version non supprimée:', r.error);
        }
      }
      remplacerLigne(E.documents, data);
      dessiner();
      annoncer(`Document « ${data.titre} » mis à jour avec « ${f.name} » (version précédente écrasée).`);
      return;
    }
    if (t.matches('[data-doc-fichier-public]')) {
      const f = t.files[0]; t.value = ''; if (!f) return;
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      if (ext !== 'pdf' && f.type !== 'application/pdf') return annoncer('Un document public est un PDF.', { erreur: true });
      if (f.size > 25 * 1024 * 1024) return annoncer('Fichier trop lourd : 25 Mo au plus.', { erreur: true });
      const base = f.name.replace(/\.[^.]+$/, ''), chemin = `documents/${dossier}/${Date.now().toString(36)}-${slugifier(base) || 'document'}.pdf`;
      annoncer(`Envoi de « ${f.name} »…`);
      const { error } = await sb.storage.from('crescite').upload(chemin, f, { contentType: 'application/pdf', upsert: false, cacheControl: '3600' });
      if (error) return erreur(error, /mime|type/i.test(error.message || '') ? 'Le stockage public n’accepte pas encore les PDF (troisième script SQL)' : 'Envoi impossible');
      try { await inserer({ spectacle_id: s ? s.id : null, type: typeDe(base), titre: titreDe(base), fichier: chemin, pour: /scolaire|p[ée]dagog/i.test(base) ? 'scolaires' : 'pros', ordre: ordreSuivant() }); annoncer('Document public ajouté : vérifiez son titre et pour qui il est.'); }
      catch (err) { await sb.storage.from('crescite').remove([chemin]); erreur(err, 'Document non enregistré'); }
      return;
    }
    if (t.matches('[data-doc-fichier-salles]')) {
      const f = t.files[0]; t.value = ''; if (!f) return;
      const ext = (f.name.split('.').pop() || '').toLowerCase(), type = MIMES_SALLES[ext];
      if (!type || !f.name.includes('.')) return annoncer('Ce type de fichier n’est pas accepté ici : PDF, image (JPEG, PNG, WebP), vidéo MP4 ou ZIP.', { erreur: true });
      if (f.size > MO_SALLES * 1024 * 1024) return annoncer(`« ${f.name} » pèse ${mo(f.size)} Mo : ${MO_SALLES} Mo au plus. Pour une captation, ajoutez plutôt un lien (Vimeo, YouTube non répertorié, Drive).`, { erreur: true });
      const base = f.name.replace(/\.[^.]+$/, ''), chemin = `${dossier}/${Date.now().toString(36)}-${slugifier(base) || 'document'}.${ext}`;
      const envoi = $('[data-envoi-salles]', z);
      if (envoi) { envoi.textContent = `Envoi de « ${f.name} » (${mo(f.size)} Mo)…`; envoi.hidden = false; }
      const { error } = await sb.storage.from('crescite-pro').upload(chemin, f, { contentType: type, upsert: false });
      if (error) {
        if (envoi) envoi.hidden = true;
        const m = `${error.message || ''} ${error.statusCode || ''}`;
        return erreur(error, /size|large|exceed|413/i.test(m) ? `Fichier refusé par le stockage (${MO_SALLES} Mo au plus)` : /mime|type/i.test(m) ? 'Le stockage des salles n’accepte pas ce type de fichier' : 'Envoi impossible');
      }
      try { await inserer({ spectacle_id: s.id, type: typeDe(base), titre: titreSalles(base, ext), fichier: chemin, pour: 'salles', ordre: ordreSuivant(salles()) }); annoncer('Fichier déposé : vérifiez son titre, c’est celui que la salle voit.'); }
      catch (err) { if (envoi) envoi.hidden = true; await sb.storage.from('crescite-pro').remove([chemin]); erreur(err, 'Document non enregistré'); }
      return;
    }
    if (t.matches('[data-doc-fichier]')) {
      const f = t.files[0]; t.value = ''; if (!f) return;
      const ext = (f.name.split('.').pop() || '').toLowerCase(), type = MIMES_DOC[ext] || f.type;
      if (!Object.values(MIMES_DOC).includes(type)) return annoncer('Ce type de fichier n’est pas accepté : PDF, image, texte, ODT ou DOCX.', { erreur: true });
      if (f.size > 50 * 1024 * 1024) return annoncer('Fichier trop lourd : 50 Mo au plus.', { erreur: true });
      const base = f.name.replace(/\.[^.]+$/, ''), chemin = `${dossier}/${Date.now().toString(36)}-${slugifier(base) || 'document'}.${ext}`;
      annoncer(`Envoi de « ${f.name} »…`);
      const { error } = await sb.storage.from('crescite-equipe').upload(chemin, f, { contentType: type, upsert: false });
      if (error) return erreur(error, 'Envoi impossible');
      try { await inserer({ spectacle_id: s ? s.id : null, type: typeDe(base), titre: titreDe(base), fichier: chemin, pour: 'equipe', ordre: ordreSuivant() }); annoncer('Document ajouté : vérifiez son titre et son type.'); }
      catch (err) { await sb.storage.from('crescite-equipe').remove([chemin]); erreur(err, 'Document non enregistré'); }
      return;
    }
    const l = t.closest('[data-doc]'); if (!l || !t.dataset.dk) return;
    const d = E.documents.find(x => x.id === +l.dataset.doc); if (!d) return;
    const v = t.value.trim();
    if (t.dataset.dk === 'titre' && !v) { t.value = d.titre; return annoncer('Un document a besoin d’un titre.', { erreur: true }); }
    const { data, error } = await sb.from('crescite_documents').update({ [t.dataset.dk]: v }).eq('id', d.id).select().single();
    if (error) { t.value = d[t.dataset.dk]; return erreur(error); }
    remplacerLigne(E.documents, data);
  });
  z.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.docLien !== undefined || b.dataset.docLienPublic !== undefined || b.dataset.docLienSalles !== undefined) {
      const genre = b.dataset.docLienPublic !== undefined ? 'public' : b.dataset.docLienSalles !== undefined ? 'salles' : 'equipe';
      const boite = $(`.doc-lien[data-genre="${genre}"]`, z); boite.hidden = false; $('[data-doc-url]', boite).focus(); return;
    }
    if (b.dataset.docLienNon !== undefined) { b.closest('.doc-lien').hidden = true; return; }
    if (b.dataset.docLienOk !== undefined) {
      const boite = b.closest('.doc-lien'), genre = boite.dataset.genre;
      const url = $('[data-doc-url]', boite).value.trim(), titre = $('[data-doc-titre]', boite).value.trim();
      if (!/^https?:\/\//i.test(url)) return annoncer('Collez une adresse qui commence par https://', { erreur: true });
      // la salle ne voit que le titre : pour elle, il en faut un
      if (genre === 'salles' && !titre) { $('[data-doc-titre]', boite).focus(); return annoncer('Donnez un titre au lien : c’est ce que la salle voit (« La captation intégrale »).', { erreur: true }); }
      const pour = { equipe: 'equipe', public: 'pros', salles: 'salles' }[genre];
      try { await inserer({ spectacle_id: s ? s.id : null, type: /wikisource|texte/i.test(url + titre) ? 'texte' : /fiche.?tech/i.test(url + titre) ? 'fiche_technique' : /dossier/i.test(url + titre) ? 'dossier' : 'autre', titre: titre || hote(url), url, pour, ordre: ordreSuivant(genre === 'salles' ? salles() : docs()) }); annoncer({ equipe: 'Lien ajouté.', public: 'Lien public ajouté.', salles: 'Lien ajouté : les salles invitées le trouvent dans l’espace pro.' }[genre]); }
      catch (err) { erreur(err, 'Lien non ajouté'); }
      return;
    }
    const l = b.closest('[data-doc]'); if (!l) return;
    const d = E.documents.find(x => x.id === +l.dataset.doc); if (!d) return;
    if (b.dataset.docOuvrir !== undefined) {
      if (d.url) { window.open(d.url, '_blank', 'noopener'); return; }
      if (estPublic(d)) { window.open(urlPublique(d.fichier), '_blank', 'noopener'); return; }
      const w = window.open('', '_blank');
      const { data, error } = await sb.storage.from(stockageDe(d)).createSignedUrl(d.fichier, 3600);
      if (error) { w?.close(); return erreur(error, 'Ouverture impossible'); }
      if (w) { w.opener = null; w.location.href = data.signedUrl; } else location.href = data.signedUrl;
      return;
    }
    if (b.dataset.docCopier !== undefined) return copier(d.url || urlPublique(d.fichier), 'Adresse du document');
    if (b.dataset.docPartager !== undefined) {
      const { data, error } = await sb.storage.from('crescite-equipe').createSignedUrl(d.fichier, PARTAGE_JOURS * 86400);
      if (error) return erreur(error, 'Lien impossible');
      return copier(data.signedUrl, `Adresse de partage (valable ${PARTAGE_JOURS} jours)`);
    }
    if (b.dataset.docDm) {
      const xs = groupe(d), i = xs.indexOf(d), j = i + +b.dataset.docDm; if (j < 0 || j >= xs.length) return;
      [xs[i], xs[j]] = [xs[j], xs[i]];
      try { await renumeroter(xs); } catch (err) { return erreur(err, 'Ordre non enregistré'); }
      dessiner(); return;
    }
    if (b.dataset.docSuppr !== undefined) {
      // sans confirmation : « Annuler » remet le document ; son fichier ne s'efface du stockage qu'une fois l'annonce passée
      let annule = false;
      await CORBEILLE.ligne({ table: 'crescite_documents', ligne: d, quoi: `Document supprimé : ${d.titre}.${estSalles(d) ? ' Les salles invitées ne le voient plus.' : ''}`, retabli: 'Document rétabli.',
        apres: () => { E.documents = E.documents.filter(x => x.id !== d.id); dessiner(); }, apresRetour: x => { annule = true; E.documents.push(x); dessiner(); } });
      setTimeout(async () => {
        if (annule || !d.fichier) return;
        // un fichier public peut servir deux documents (programmateurs et scolaires) : il reste tant que l'autre est là
        const partage = estPublic(d) && E.documents.some(x => x.fichier === d.fichier && estPublic(x));
        if (!partage) { const r = await sb.storage.from(stockageDe(d)).remove([d.fichier]); if (r.error) erreur(r.error, 'Document retiré, mais le fichier reste dans le stockage'); }
      }, 9000);
    }
  });
  dessiner();
}

// ===================================================================================================== l'équipe d'une date
// le téléphone d'une personne de l'équipe, à appeler d'un geste ; sans lui, « téléphone ? » mène à sa fiche
const telEquipe = pid => { const t = priveeDe(pid)?.telephone; const n = nomDe(personne(pid));
  return t ? `<a class="coord" href="${esc(FEUILLE.telLien(t))}" aria-label="Appeler ${esc(n)} : ${esc(FEUILLE.telTexte(t))}">${esc(FEUILLE.telTexte(t))}</a>` : `<a class="manque-tel" href="#/equipe/${pid}" title="Compléter sa fiche">téléphone ?</a>`; };
// F.equipe ne garde que les écarts avec la distribution « en tournée » : qui ne part pas (present: false), qui s'ajoute
const ecartsDate = dateId => E.equipes.filter(x => x.date_id === dateId).map(x => ({ personne_id: x.personne_id, present: x.present, fonction: x.fonction || '', note: x.note ?? null }));
function blocEquipeDate(zone, F, changer) {
  const el = $('#d-equipe', zone); if (!el) return;
  if (!E.equipeInstallee) { el.innerHTML = `<h3>Équipe de cette date</h3><p class="aide">La base de l’équipe n’est pas encore installée (supabase/migrations/20261021_crescite_equipe.sql).</p>`; return; }
  F.equipe = F.equipe || [];
  const ecart = pid => F.equipe.find(x => x.personne_id === pid);
  const enlever = x => F.equipe.splice(F.equipe.indexOf(x), 1);
  let dernierAbsent = null;   // la dernière personne décochée ici : « Remplace … » la vise
  // qui sera prévenu si l'on enregistre : la règle du déclencheur, la même que partout (DISTRIBUTION.prevenus)
  const resume = () => {
    const p = $('#eqd-prevenus', el); if (!p) return;
    const js = (F.representations || []).filter(r => r.jour).map(r => r.jour).sort();   // (les jours des séances, sinon ceux de la date)
    p.textContent = DISTRIBUTION.phrase(DISTRIBUTION.prevenus({ id: F.id, spectacle_id: +F.spectacle_id, debut: js[0] || F.debut, fin: js.length ? js[js.length - 1] : F.fin }, equipeVoulue(F) || []));
  };
  const dessiner = () => {
    const sp = +F.spectacle_id, tournee = [];
    distributionDe(sp).filter(x => x.en_tournee).forEach(x => { const f = fonctionDistribution(x) + (x.alternance ? `, ${x.alternance}` : ''), o = tournee.find(y => y.personne_id === x.personne_id); if (o) o.fonctions.push(f); else tournee.push({ personne_id: x.personne_id, fonctions: [f] }); });
    const ids = new Set(tournee.map(x => x.personne_id));
    const ajouts = F.equipe.filter(x => x.present && !ids.has(x.personne_id));
    const absents = tournee.filter(x => ecart(x.personne_id)?.present === false);
    // « Remplace X » vise la personne décochée à l'instant, sinon la première absente
    const cible = absents.some(x => x.personne_id === dernierAbsent) ? dernierAbsent : absents[0]?.personne_id;
    // (la tournée est déjà rangée par métier : jeu, création, technique, production ; chacun porte le liseré de son métier)
    const avatarDe = (pid, fonction = '') => `<span class="eq-av m-${DISTRIBUTION.metier(sp, pid, fonction) || 'neutre'}">${avatar(personne(pid), true)}</span>`;
    el.innerHTML = `<h3>Équipe de cette date</h3>
      ${tournee.length ? `<p class="aide">La distribution « en tournée » part sur chaque date : décochez qui ne vient pas.</p><ul class="eq-date">${tournee.map(x => { const e = ecart(x.personne_id), part = e?.present !== false, nom = nomDe(personne(x.personne_id)); return `<li${part ? '' : ' class="absent"'}>${avatarDe(x.personne_id)}<label class="case"><input type="checkbox" data-eqd-part="${x.personne_id}"${part ? ' checked' : ''}> ${esc(nom)}</label><span class="compte eq-badge">${esc(x.fonctions.join(', '))}${part ? '' : ' · ne part pas sur cette date'}</span>${part ? telEquipe(x.personne_id) : ''}${part ? `<input type="text" class="eq-fonction" data-eqd-fonction-membre="${x.personne_id}" value="${esc(e?.fonction || '')}" placeholder="Fonction sur cette date (sinon celle de la distribution)" aria-label="Fonction de ${esc(nom)} sur cette date"><input type="text" class="eq-note" data-eqd-note="${x.personne_id}" value="${esc(e?.note || '')}" placeholder="Note pour cette date (train de 14h12, dort sur place…)" aria-label="Note pour ${esc(nom)} sur cette date">` : ''}</li>`; }).join('')}</ul>`
        : `<p class="aide">${spectacle(sp) ? 'Personne n’est « en tournée » dans la distribution de ce spectacle (Spectacles → Distribution).' : 'Choisissez d’abord le spectacle.'}</p>`}
      ${ajouts.length ? `<div class="eq-ajouts"><span class="lib">Remplaçants et renforts</span>${ajouts.map(x => `<div class="eq-ajout" data-eqd-ajout="${x.personne_id}">${avatarDe(x.personne_id, x.fonction)}<a class="eq-nom" href="#/equipe/${x.personne_id}" title="Sa fiche">${esc(nomDe(personne(x.personne_id)))}</a>
        <span class="eq-fonction-zone"><input type="text" data-eqd-fonction value="${esc(x.fonction || '')}" placeholder="Renfort régie, remplaçant…" aria-label="Fonction sur cette date">${cible ? `<button type="button" class="btn lien petit eq-remplace" data-eqd-remplace="${cible}"${(x.fonction || '').trim() ? ' hidden' : ''}>Remplace ${esc(nomDe(personne(cible)))}</button>` : ''}</span>
        <input type="text" class="eq-note" data-eqd-note="${x.personne_id}" value="${esc(x.note || '')}" placeholder="Note (train, hébergement…)" aria-label="Note pour cette date">
        <button type="button" class="btn petit danger" data-eqd-retirer title="Retirer de cette date" aria-label="Retirer de cette date">✕</button></div>`).join('')}</div>` : ''}
      <p class="aide eq-prevenus" id="eqd-prevenus" aria-live="polite"></p>
      <div class="champ eq-ajouter"><span class="lib">Ajouter quelqu’un</span><div id="eqd-combo"></div><span class="aide">Un remplaçant ou un renfort, pour cette date seulement, avec sa fonction.</span></div>`;
    comboPersonne($('#eqd-combo', el), { placeholder: 'Nom de la personne…', creer: true, avant: distributionDe(sp).map(x => x.personne_id),
      exclure: pid => (ids.has(pid) && ecart(pid)?.present !== false) || ajouts.some(x => x.personne_id === pid),
      onChoix: pid => ajouter(pid), onCreer: async texte => { try { const p = await creerPersonne(texte); ajouter(p.id); annoncer(`Fiche créée pour ${nomDe(p)} : complétez-la dans Équipe.`); } catch (e) { erreur(e, 'Fiche non créée'); } } });
    resume();
  };
  // ajouter quelqu'un à la date, avec sa fonction quand on la connaît
  const ajouter = (pid, fonction = '') => {
    const x = ecart(pid);
    if (x && x.present === false) { enlever(x); if (fonction) F.equipe.push({ personne_id: pid, present: true, fonction, note: x.note ?? null }); }   // quelqu'un de la distribution qu'on avait retiré : il repart
    else if (!x) F.equipe.push({ personne_id: pid, present: true, fonction, note: null });
    dessiner(); changer();
    const l = $(`[data-eqd-ajout="${pid}"]`, el); if (l) { tt('ajouter', l); $('input', l).focus(); }
  };
  el.addEventListener('change', e => {
    const t = e.target; if (!t.dataset.eqdPart) return;
    const pid = +t.dataset.eqdPart, x = ecart(pid);
    if (t.checked) { if (x && ((x.note || '').trim() || (x.fonction || '').trim())) x.present = true; else if (x) enlever(x); }
    else { dernierAbsent = pid; if (x) x.present = false; else F.equipe.push({ personne_id: pid, present: false, fonction: '', note: null }); }
    dessiner(); changer();
    $(`[data-eqd-part="${pid}"]`, el)?.focus();
  });
  // la note d'une personne sur cette date (crescite_equipes.note, que son espace montre) : pour la distribution, une ligne
  // « présente » qui ne porte que la note ; vidée, la ligne s'en va
  el.addEventListener('input', e => {
    const t = e.target; if (t.dataset.eqdNote === undefined) return;
    const pid = +t.dataset.eqdNote, v = t.value; let x = ecart(pid);
    if (!x && v.trim()) { x = { personne_id: pid, present: true, fonction: '', note: v }; F.equipe.push(x); }
    else if (x) { x.note = v; if (!v.trim() && x.present && !(x.fonction || '').trim() && distributionDe(+F.spectacle_id).some(y => y.en_tournee && y.personne_id === pid)) enlever(x); }
    changer();
  });
  // la fonction d'un membre de la tournée sur cette date (elle remplace celle de la distribution) : comme la note, une ligne
  // « présente » qui ne porte que la fonction ; vidée, et sans note, la ligne s'en va. Le renfort a son champ plus bas
  el.addEventListener('input', e => {
    const t = e.target; if (t.dataset.eqdFonctionMembre === undefined) return;
    const pid = +t.dataset.eqdFonctionMembre, v = t.value; let x = ecart(pid);
    if (!x && v.trim()) { x = { personne_id: pid, present: true, fonction: v, note: null }; F.equipe.push(x); }
    else if (x) { x.fonction = v; if (!v.trim() && x.present && !(x.note || '').trim()) enlever(x); }
    changer();
  });
  el.addEventListener('input', e => {
    const t = e.target; if (t.dataset.eqdFonction === undefined) return;
    const l = t.closest('[data-eqd-ajout]'), x = ecart(+l.dataset.eqdAjout);
    if (x) { x.fonction = t.value; changer(); }
    const lien = $('[data-eqd-remplace]', l); if (lien) lien.hidden = !!t.value.trim();
  });
  el.addEventListener('click', e => {
    const r = e.target.closest('[data-eqd-remplace]');
    if (r) {   // « Remplace X » remplit la fonction du renfort et vise la personne décochée
      const l = r.closest('[data-eqd-ajout]'), x = ecart(+l.dataset.eqdAjout), champ = $('[data-eqd-fonction]', l);
      if (x) { x.fonction = `Remplace ${nomDe(personne(+r.dataset.eqdRemplace))}`; champ.value = x.fonction; r.hidden = true; changer(); champ.focus(); }
      return;
    }
    const b = e.target.closest('[data-eqd-retirer]'); if (!b) return;
    const x = ecart(+b.closest('[data-eqd-ajout]').dataset.eqdAjout); if (x) enlever(x); dessiner(); changer();
  });
  $('#d-sp', zone)?.addEventListener('change', () => setTimeout(dessiner, 0));
  // (les jours de la date décident si une présence prévient : le résumé se relit quand autre chose que l'équipe change)
  zone.addEventListener('change', e => { if (!el.contains(e.target)) resume(); });
  dessiner();
}
// la distribution voulue pour une date : les écarts de la fiche (F.equipe) réduits à une ligne par personne (la dernière
// l'emporte), en ne gardant que les présentes et celles de la distribution en tournée du spectacle, chaque ligne nette
// ({ personne_id, present, fonction, note } ; vide : null) ; null quand la base n'a pas l'équipe ou que F n'en dit rien.
// C'est le seul calcul de ce que doit devenir l'équipe : enregistrerEquipeDate (écritures séparées) et chargeDate (la
// charge de crescite_enregistrer_date en version 3, qui l'écrit dans le même appel) s'en servent toutes deux
function equipeVoulue(F) {
  if (!E.equipeInstallee || !Array.isArray(F.equipe)) return null;
  const tournee = new Set(distributionDe(+F.spectacle_id).filter(x => x.en_tournee).map(x => x.personne_id));
  const voulus = [];
  F.equipe.forEach(x => { if (x.present || tournee.has(x.personne_id)) { const i = voulus.findIndex(y => y.personne_id === x.personne_id); if (i >= 0) voulus.splice(i, 1); voulus.push(x); } });
  return voulus.map(v => ({ personne_id: v.personne_id, present: !!v.present, fonction: (v.fonction || '').trim() || null, note: (v.note || '').trim() || null }));
}
// après crescite_enregistrer_date, quand la base n'a pas le vingt-quatrième script (sinon la date porte son équipe) : on écrit
// les écarts (et seulement eux) ; vrai si tout est passé
async function enregistrerEquipeDate(dateId, F) {
  const voulus = equipeVoulue(F);
  if (!voulus) return true;
  const actuels = E.equipes.filter(x => x.date_id === dateId);
  const aRetirer = actuels.filter(a => !voulus.some(v => v.personne_id === a.personne_id)).map(a => a.personne_id);
  const aEcrire = voulus.filter(v => { const a = actuels.find(x => x.personne_id === v.personne_id); return !a || a.present !== v.present || (a.fonction || '') !== (v.fonction || '') || (a.note || '') !== (v.note || ''); })
    .map(v => ({ date_id: dateId, ...v }));
  try {
    if (aRetirer.length) { const { error } = await sb.from('crescite_equipes').delete().eq('date_id', dateId).in('personne_id', aRetirer); if (error) throw error; }
    if (aEcrire.length) { const { error } = await sb.from('crescite_equipes').upsert(aEcrire, { onConflict: 'date_id,personne_id' }); if (error) throw error; }
    if (aRetirer.length || aEcrire.length) {
      const { data, error } = await sb.from('crescite_equipes').select('*').eq('date_id', dateId);
      if (error) throw error;
      E.equipes = E.equipes.filter(x => x.date_id !== dateId).concat(data);
    }
    return true;
  } catch (e) {
    erreur(e, 'La date est enregistrée, mais pas son équipe');
    return false;
  }
}
// la suppression d'une date emporte son équipe et sa feuille de route : de quoi les rétablir
const copieEquipeDate = dateId => ({ equipes: clone(E.equipes.filter(x => x.date_id === dateId)), feuille: clone(E.feuilles.find(x => x.date_id === dateId) || null) });
async function retablirEquipeDate(c) {
  if (!c) return null;
  let r = { error: null };
  if (c.equipes?.length) r = await sb.from('crescite_equipes').insert(c.equipes.map(sansMeta));
  if (!r.error && c.feuille) r = await sb.from('crescite_feuilles').insert(sansMeta(c.feuille));
  if (r.error) return r.error;
  await chargerEquipe();
  return null;
}
const avecFeuille = dateId => E.feuilles.some(x => x.date_id === dateId);
// prévenir l'équipe d'une date : une notification dans l'espace de chacun, et sur son téléphone s'il s'est abonné
// (crescite_prevenir_equipe, troisième script SQL)
const boutonPrevenir = dateId => E.sql3 && E.equipeInstallee ? '<button type="button" class="btn" id="d-prevenir" aria-expanded="false">Prévenir l’équipe</button>' : '';
function panneauPrevenir(zone, d) {
  if (!d) return;
  const ouvert = $('#d-prevenir-zone', zone);
  if (ouvert) { ouvert.remove(); $('#d-prevenir', zone)?.setAttribute('aria-expanded', 'false'); $('#d-prevenir', zone)?.removeAttribute('aria-controls'); return; }
  const s = spectacle(d.spectacle_id), n = equipeDeLaDate(d).length;
  const p = document.createElement('div');
  p.className = 'bloc ad-neuf'; p.id = 'd-prevenir-zone';
  p.innerHTML = `<h3>Prévenir l’équipe</h3>
    <p class="aide">Une notification à ${n ? `chacune des ${n} personnes de l’équipe de cette date` : 'l’équipe de cette date (personne pour l’instant)'} : dans son espace, et sur son téléphone si elle s’y est abonnée.</p>
    <div class="champ"><label for="pv-titre">Titre</label><input type="text" id="pv-titre" maxlength="120" value="${esc(`${s?.titre || 'Date'} · ${jourCourt(d.debut)}`)}"></div>
    <div class="champ"><label for="pv-texte">Message</label><textarea id="pv-texte" rows="3" maxlength="600" placeholder="La représentation de jeudi commence à 20h30 au lieu de 20h."></textarea><span class="aide">Facultatif : sans message, la notification donne la date et le lieu.</span></div>
    <div class="fm-boutons"><button type="button" class="btn principal" id="pv-envoyer"${n ? '' : ' disabled'}>Envoyer</button><button type="button" class="btn" id="pv-annuler">Annuler</button></div>`;
  ($('#d-equipe', zone) || $('.pied-ed', zone)).after(p);
  $('#d-prevenir', zone)?.setAttribute('aria-expanded', 'true'); $('#d-prevenir', zone)?.setAttribute('aria-controls', 'd-prevenir-zone');
  p.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  $('#pv-texte', p).focus();
  $('#pv-annuler', p).addEventListener('click', () => { p.remove(); $('#d-prevenir', zone)?.setAttribute('aria-expanded', 'false'); $('#d-prevenir', zone)?.removeAttribute('aria-controls'); $('#d-prevenir', zone)?.focus(); });
  $('#pv-envoyer', p).addEventListener('click', async e => {
    const titre = $('#pv-titre', p).value.trim(), texte = $('#pv-texte', p).value.trim();
    if (!titre) return annoncer('Donnez un titre à la notification.', { erreur: true });
    e.target.disabled = true;
    const { data, error } = await sb.rpc('crescite_prevenir_equipe', { d: d.id, titre_: titre, texte_: texte || null });
    e.target.disabled = false;
    if (error) {
      if (/PGRST202|42883|Could not find the function|does not exist/i.test(`${error.code || ''} ${error.message || ''}`)) return annoncer('Les notifications ne sont pas encore installées : il manque le troisième script SQL.', { erreur: true });
      return erreur(error, 'Notification non envoyée');
    }
    p.remove(); $('#d-prevenir', zone)?.setAttribute('aria-expanded', 'false'); $('#d-prevenir', zone)?.removeAttribute('aria-controls');
    const b = $('#d-prevenir', zone); if (b && +data) { b.classList.add('sonne'); setTimeout(() => b.classList.remove('sonne'), 900); }   // la cloche sonne
    annoncer(+data ? `Notification envoyée à ${+data} personne${+data > 1 ? 's' : ''}.` : 'Personne à prévenir : l’équipe de cette date est vide.');
  });
}

// ===================================================================================================== feuilles de route
// ce qu'une feuille de route demande encore (ses amorces qui posent une question)
const aCompleter = dateId => { const f = E.feuilles.find(x => x.date_id === dateId); if (!f) return 0; try { return FEUILLE.manques(FEUILLE.contenu(f).blocs).length; } catch { return 0; } };
// « n à compléter » : le même compte partout où une date mène à sa feuille (la liste des feuilles, le bouton « Feuille de
// route » d'une date, les prochaines dates d'une personne, les dates d'un lieu) ; le lien ouvre la feuille sur sa liste
// « À compléter » (data-viser). forme 'nombre' : le chiffre seul (le bouton « Plus » du téléphone). majACompleter les tient
// à jour quand une feuille change (le temps réel, un enregistrement).
const texteACompleter = (n, forme) => (n ? (forme === 'nombre' ? String(n) : `${n} à compléter`) : '');
const resteFeuille = (dateId, forme = 'texte') => { const n = E.equipeInstallee ? aCompleter(dateId) : 0;
  return `<span class="badge option a-completer${forme === 'nombre' ? ' nombre' : ''}" data-a-completer="${dateId}" data-forme="${forme}"${forme === 'nombre' ? ' aria-hidden="true"' : ''}${n ? '' : ' hidden'}>${texteACompleter(n, forme)}</span>`; };
function majACompleter() {
  $$('[data-a-completer]').forEach(el => {
    const n = aCompleter(+el.dataset.aCompleter), t = texteACompleter(n, el.dataset.forme);
    if (!el.hidden && el.textContent !== t) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }   // le compte saute
    el.hidden = !n; el.textContent = t;
  });
  $$('[data-statut-feuille]').forEach(el => { const f = E.feuilles.find(x => x.date_id === +el.dataset.statutFeuille); el.textContent = f ? (f.statut === 'publiee' ? `v${f.version}` : 'brouillon') : ''; });
  ajusterPied();
}
const badgeFeuille = dateId => {
  const f = E.feuilles.find(x => x.date_id === dateId);
  return !f ? '<span class="badge">Aucune</span>' : f.statut === 'publiee' ? `<span class="badge ok">Publiée v${f.version}</span>` : '<span class="badge option">Brouillon</span>';
};
const boutonFeuille = dateId => {
  if (!E.equipeInstallee) return '';
  const f = E.feuilles.find(x => x.date_id === dateId);
  return `<a class="btn" href="#/feuilles/${dateId}" id="d-feuille" data-viser="#fr-manques">Feuille de route <span class="compte" data-statut-feuille="${dateId}">${f ? (f.statut === 'publiee' ? `v${f.version}` : 'brouillon') : ''}</span>${resteFeuille(dateId)}</a>`;
};
function vueFeuilles(param) {
  if (param) return editeurFeuille(+param);
  if (!E.equipeInstallee) { cadre('feuilles', `<div class="tete"><h1>Feuilles de route</h1></div>${equipeAbsente()}`); return; }
  const f = session.feuilles = Object.assign({ q: '', etat: '', ouvertes: [] }, session.feuilles || {});
  cadre('feuilles', `<div class="tete"><h1>Feuilles de route</h1><span class="compte">Une par date : composée depuis la base, complétée, puis publiée pour l’équipe.</span></div>
    <div class="fr-liste"><div class="filtres"><input type="search" id="fr-q" placeholder="Chercher un lieu, une commune, un spectacle" value="${esc(f.q)}" aria-label="Chercher">
      <div class="seg" role="group" aria-label="État">${[['', 'Toutes'], ['aucune', 'Sans feuille'], ['brouillon', 'Brouillons'], ['publiee', 'Publiées']].map(([k, l]) => `<button type="button" data-fr-etat="${k}" aria-pressed="${f.etat === k}">${l}</button>`).join('')}</div>
      <span class="compte" id="fr-compte"></span></div><div data-liste id="l-feuilles"></div></div>`);
  const zone = $('#l-feuilles');
  zone.rafraichir = () => listeFeuilles(zone);
  zone.rafraichir();
  $('#fr-q').addEventListener('input', e => { f.q = e.target.value; garderFiltres(); zone.rafraichir(); });
  $$('[data-fr-etat]').forEach(b => b.addEventListener('click', () => { f.etat = b.dataset.frEtat; $$('[data-fr-etat]').forEach(x => x.setAttribute('aria-pressed', x === b)); garderFiltres(); zone.rafraichir(); }));
}
function listeFeuilles(zone) {
  const f = session.feuilles, q = norm(f.q).trim(), cherche = !!(q || f.etat);
  const etatDe = d => { const x = E.feuilles.find(y => y.date_id === d.id); return x ? x.statut : 'aucune'; };
  const xs = E.dates.filter(d => {
    if (f.etat && etatDe(d) !== f.etat) return false;
    if (q) { const s = spectacle(d.spectacle_id), l = lieu(d.lieu_id); if (!norm(`${s?.titre} ${l?.nom} ${l?.commune} ${d.intitule || ''}`).includes(q)) return false; }
    return true;
  });
  const avenir = xs.filter(d => (d.fin || d.debut) >= AUJ).sort((a, b) => a.debut < b.debut ? -1 : a.debut > b.debut ? 1 : a.id - b.id);
  const passees = xs.filter(d => (d.fin || d.debut) < AUJ).sort((a, b) => a.debut < b.debut ? 1 : a.debut > b.debut ? -1 : b.id - a.id);
  const n = k => xs.filter(d => etatDe(d) === k).length;
  $('#fr-compte').textContent = `${avenir.length} à venir · ${passees.length} passée${passees.length > 1 ? 's' : ''} · ${n('publiee')} publiée${n('publiee') > 1 ? 's' : ''}, ${n('brouillon')} brouillon${n('brouillon') > 1 ? 's' : ''}`;
  const ligne = d => {
    const s = spectacle(d.spectacle_id), l = lieu(d.lieu_id), reps = repsDe(d.id), jours = [...new Set(reps.map(r => r.jour))], manque = aCompleter(d.id);
    return `<a class="ligne" href="#/feuilles/${d.id}" style="--c:${couleurSp(s)}"${manque ? ' data-viser="#fr-manques"' : ''}><span class="jj"><b>${+d.debut.slice(8, 10)}</b>${MC[+d.debut.slice(5, 7) - 1]}${d.fin && d.fin !== d.debut ? `<br>→ ${+d.fin.slice(8, 10)}` : ''}</span>
      <span class="corps"><span class="t">${esc(s?.titre || '?')}</span><span class="ou">${esc(l ? lieuTexte(l) : (d.intitule || '').split(' — ')[1] || 'Lieu à préciser')}</span>
      ${reps.length ? `<span class="reps">${reps.slice(0, 6).map(r => `<span class="rep${r.public === 'scolaire' ? ' sco' : ''}${r.annulee ? ' ann' : ''}">${jours.length > 1 ? `${+r.jour.slice(8, 10)}/${+r.jour.slice(5, 7)} ` : ''}${r.heure ? AGENDA.heureTexte(h5(r.heure)) : 'heure ?'}</span>`).join('')}${reps.length > 6 ? `<span class="rep">+${reps.length - 6}</span>` : ''}</span>` : ''}</span>
      <span class="badges">${badgeFeuille(d.id)}${resteFeuille(d.id)}${d.statut === 'option' ? '<span class="badge option">Option</span>' : d.statut === 'annulee' ? '<span class="badge annulee">Annulée</span>' : d.statut === 'reportee' ? '<span class="badge option">Reportée</span>' : ''}</span></a>`;
  };
  // les dates rangées par mois, comme Représentations : l'en-tête du mois reste en vue pendant qu'on fait défiler ses dates
  const parMois = ds => { let m = '', h = ''; ds.forEach(d => { const k = d.debut.slice(0, 7); if (k !== m) { m = k; h += `<div class="mois">${AGENDA.MOIS[+k.slice(5) - 1]} ${k.slice(0, 4)}</div>`; } h += ligne(d); }); return h; };
  const saisons = [...new Set(passees.map(d => d.saison))].sort().reverse(), enCours = AGENDA.saisonDe(AUJ);
  if (!xs.length) { zone.innerHTML = listeVide(cherche, { rien: 'Aucune date ne correspond à ces filtres.', aucun: 'Aucune date pour l’instant.', ajouter: ['#/representations/nouvelle', '＋ Nouvelle date'] }); return; }
  zone.innerHTML = `<h2 class="mois" style="font-size:13px;color:var(--accent)">À venir</h2>${avenir.length ? parMois(avenir) : '<p class="vide">Aucune date à venir.</p>'}
    <h2 class="mois" style="font-size:13px;color:var(--accent);margin-top:24px">Dates passées</h2>
    ${saisons.map(sa => `<details class="saison-ad" data-saison="${sa}"${cherche || sa === enCours || f.ouvertes.includes(sa) ? ' open' : ''}><summary class="ligne" style="grid-template-columns:1fr auto;cursor:pointer;border-left-color:var(--trait)"><span class="t">Saison ${sa}</span><span class="badge">${passees.filter(d => d.saison === sa).length}</span></summary><div class="contenu-saison"></div></details>`).join('') || '<p class="vide">Aucune date passée.</p>'}`;
  const remplir = det => { const c = $('.contenu-saison', det); if (det.open && !c.innerHTML) c.innerHTML = parMois(passees.filter(d => d.saison === det.dataset.saison)); };
  $$('details.saison-ad', zone).forEach(det => { remplir(det); det.addEventListener('toggle', () => { const sa = det.dataset.saison; f.ouvertes = det.open ? [...new Set([...f.ouvertes, sa])] : f.ouvertes.filter(x => x !== sa); garderFiltres(); remplir(det); }); });
}

// ce que la base sait d'une date, pour composer sa feuille ; et ce que la feuille montre autour de son contenu
const METIERS_CONTACT = /administrat|r[ée]gie\s+g[ée]n[ée]rale|r[ée]gisseu(?:r|se)\s+g[ée]n[ée]ral/i;
const REGIE = /r[ée]gi(?:e|sseu(?:r|se))\s+g[ée]n[ée]ral/i;
// les catégories d'une personne dans la distribution du spectacle (jeu, technique…) ; sans elles, feuille.js les devine
const categoriesDe = (spId, pid) => [...new Set(E.distributions.filter(x => x.spectacle_id === spId && x.personne_id === pid).map(x => x.categorie).filter(Boolean))];
function sourcesFeuille(d) {
  const tel = id => priveeDe(id)?.telephone || '', mel = id => priveeDe(id)?.email || '';
  const equipe = equipeDeLaDate(d).map(x => { const p = personne(x.personne_id); return { personne_id: x.personne_id, prenom: p?.prenom || '', nom: nomDe(p), fonction: x.fonction, categories: categoriesDe(d.spectacle_id, x.personne_id), telephone: tel(x.personne_id) }; });
  // l'administration de la compagnie, et la régie générale : celle de l'équipe de la date, sinon celle de la distribution
  // du spectacle, sinon toute personne dont c'est le métier
  const avecMetier = re => E.personnes.filter(p => (p.metiers || []).some(m => re.test(m)));
  const regieDate = equipe.filter(x => REGIE.test(x.fonction || '')).map(x => personne(x.personne_id));
  const regieDist = distributionDe(d.spectacle_id).filter(x => REGIE.test(x.fonction || '')).map(x => personne(x.personne_id));
  const regie = (regieDate.length ? regieDate : regieDist.length ? regieDist : avecMetier(REGIE)).filter(Boolean);
  const compagnie = [...avecMetier(/administrat/i), ...regie].filter((p, i, xs) => xs.indexOf(p) === i);
  const contacts = compagnie.map(p => ({ personne_id: p.id, nom: nomDe(p), prenom: p.prenom || '', role: (p.metiers || []).find(m => METIERS_CONTACT.test(m)) || 'Régie générale', telephone: tel(p.id), email: mel(p.id) }));
  // les feuilles des autres dates : repas, transports, hébergement s'en recopient
  const anterieures = E.feuilles.filter(f => f.date_id !== d.id && f.contenu).map(f => {
    const x = E.dates.find(y => y.id === f.date_id);
    return x && x.statut !== 'annulee' && { contenu: f.contenu, debut: x.debut, lieu_id: x.lieu_id, spectacle_id: x.spectacle_id, lieu: lieu(x.lieu_id) || null, date_id: f.date_id, ecrit_le: f.modifie_le || null };
  }).filter(Boolean);
  return { date: d, spectacle: spectacle(d.spectacle_id), lieu: lieu(d.lieu_id), representations: repsDe(d.id), equipe, contacts, depart: departDe(d),
    suivi: { ...(E.suivis.find(x => x.date_id === d.id) || {}), lieu: E.lieuxSuivi.find(x => x.lieu_id === d.lieu_id) || {} },
    documents: E.documents.filter(x => (x.spectacle_id === d.spectacle_id || x.spectacle_id == null) && x.pour === 'equipe'), anterieures,
    carnet: typeof CARNET !== 'undefined' ? CARNET.pourFeuille(d) : null };
}
// d'où part l'équipe : du lieu de la date de la veille quand deux dates du spectacle s'enchaînent (la tournée), sinon de Rouen
function departDe(d) {
  const veille = E.dates.filter(x => x.id !== d.id && x.spectacle_id === d.spectacle_id && x.statut === 'confirmee' && (x.fin || x.debut) < d.debut
    && (x.fin || x.debut) >= plusJours(d.debut, -1) && lieu(x.lieu_id)?.latitude != null).sort((a, b) => ((a.fin || a.debut) < (b.fin || b.debut) ? 1 : -1))[0];
  const l = veille ? lieu(veille.lieu_id) : null;
  return l && l.id !== d.lieu_id ? { commune: l.commune, latitude: l.latitude, longitude: l.longitude, veille: true } : DEPART;
}
// les régimes alimentaires de l'équipe de la date, à transmettre à l'accueil (fiches privées : jamais dans la feuille publiée)
function regimesDe(d) {
  const par = new Map();
  equipeDeLaDate(d).forEach(x => { const r = (priveeDe(x.personne_id)?.regime || '').trim(); if (!r) return; const k = norm(r); if (!par.has(k)) par.set(k, { r, qui: [] }); par.get(k).qui.push(personne(x.personne_id)); });
  return [...par.values()];
}
const contexteFeuille = d => {
  const s = spectacle(d.spectacle_id) || {};
  return { date: d, spectacle: { titre: s.titre, slug: s.slug, univers: s.univers, duree: s.duree }, lieu: lieu(d.lieu_id) || null,
    representations: repsDe(d.id).map(r => ({ jour: r.jour, heure: h5(r.heure), fin: h5(r.fin), public: r.public, annulee: r.annulee, note: r.note })),
    documents: E.documents.filter(x => (x.spectacle_id === d.spectacle_id || x.spectacle_id == null) && x.pour === 'equipe').map(x => ({ id: x.id, titre: x.titre, url: x.url || '' })) };
};
const composerPour = d => FEUILLE.composer(sourcesFeuille(d));
// les prénoms à surligner : l'équipe de la date
const nomsDeLaDate = d => [...new Set(equipeDeLaDate(d).map(x => personne(x.personne_id)?.prenom).filter(Boolean))];
// (l'heure de fin compte aussi, pour les feuilles composées depuis qu'elle est gardée : une répétition « 9h-18h »)
const horairesChanges = (d, c) => {
  if (!Array.isArray(c?.instantane) || !c.instantane.length) return false;
  const avecFin = c.instantane.some(r => 'fin' in r), cle = r => `${r.jour} ${h5(r.heure)}${avecFin ? ` ${h5(r.fin)}` : ''} ${!!r.annulee}`;
  return c.instantane.map(cle).sort().join('|') !== repsDe(d.id).map(cle).sort().join('|');
};
const feuilleVersForm = (f, d) => ({ titre: f.titre || '', contenu: FEUILLE.contenu(f, contexteFeuille(d)), statut: f.statut, version: f.version, publiee_le: f.publiee_le });
const signatureFeuille = F => F ? JSON.stringify([F.titre, F.contenu.blocs, F.contenu.composees]) : 'null';

function editeurFeuille(dateId) {
  cadre('feuilles', '<div class="tete fr-tete"><a class="btn petit" data-tt="retour" href="#/feuilles" title="Toutes les feuilles de route">←</a><h1>Feuille de route</h1></div><section class="editeur fr-editeur" id="ed-feuille"></section>');
  const d = E.dates.find(x => x.id === dateId);
  if (!E.equipeInstallee) { $('#ed-feuille').innerHTML = equipeAbsente(); return; }
  if (!d) { $('#ed-feuille').innerHTML = '<div class="vide bloc">Cette date n’existe plus.</div>'; return; }
  const s = spectacle(d.spectacle_id), l = lieu(d.lieu_id);
  $('.fr-tete h1').innerHTML = `Feuille de route · ${esc(s?.titre || '?')}<small>${esc(jourCourt(d.debut))}${d.fin && d.fin !== d.debut ? ` → ${esc(jourCourt(d.fin))}` : ''} · ${esc(lieuTexte(l) || 'lieu à préciser')}</small>`;
  $('.fr-tete').insertAdjacentHTML('beforeend', `<a class="btn" href="#/representations/${d.id}">Ouvrir la date</a>`);
  const f0 = E.feuilles.find(x => x.date_id === dateId) || null;
  const etat = { d, f0, F: f0 ? feuilleVersForm(f0, d) : null, vue: 'page', editeur: null };
  etat.initial = signatureFeuille(etat.F);
  etat.lu = lignesLues(etat.F?.contenu.blocs);
  dessinerFeuille(etat);
}
const feuilleCourante = etat => {
  if (etat.editeur) { etat.F.contenu.blocs = etat.editeur.blocs(); etat.F.contenu.pages = etat.editeur.pages(); }
  return { titre: etat.F.titre, contenu: { ...etat.F.contenu, format: 2 }, statut: etat.F.statut, version: etat.F.version, publiee_le: etat.F.publiee_le };
};
function alertesFeuille(d, F) {
  const s = spectacle(d.spectacle_id), out = [];
  if (d.statut === 'annulee') out.push('Cette date est annulée.');
  if (d.statut === 'option') out.push('Cette date est encore une option.');
  if (!repsDe(d.id).length) out.push('Cette date n’a pas de représentation détaillée (jour et heure) : le planning restera vide.');
  if (s && (d.nature || 'representations') === 'representations' && !FEUILLE.dureeMinutes(s.duree)) out.push(`La durée du spectacle n’est pas indiquée (<a href="#/spectacles/${esc(s.slug)}" data-onglet-sp="Général">Spectacles → Général → Durée</a>) : les étapes d’après le spectacle (démontage) restent sans heure.`);
  if (s && (d.nature || 'representations') === 'representations' && !(s.feuille_modele || []).length) out.push(`${esc(s.titre)} n’a pas de déroulé type (<a href="#/spectacles/${esc(s.slug)}" data-onglet-sp="Déroulé type">Spectacles → Déroulé type</a>) : le planning ne contient que les représentations.`);
  // les conflits d'équipe de la date (gardefous.js) : quelqu'un indisponible ou déjà sur une autre date
  if (typeof GARDEFOUS !== 'undefined' && typeof dateVersForm === 'function') {
    try { GARDEFOUS.alertes(dateVersForm(d), d).filter(a => a.niveau === 'alerte' && !/contrat|accueille/i.test(a.texte)).forEach(a => out.push(`${esc(a.texte)} <a href="${esc(a.href || `#/representations/${d.id}`)}">${esc(a.lien || 'Voir')}</a>`)); } catch (e) { /* rien */ }
  }
  // les régimes : à dire à l'accueil, pas à écrire dans la feuille que toute l'équipe lit
  const rg = regimesDe(d);
  if (rg.length) out.push(`À transmettre à l’accueil pour les repas (fiches privées, pas dans la feuille) : ${rg.map(x => `${esc(x.r)} (${x.qui.map(p => esc(p?.prenom || nomDe(p))).join(', ')})`).join(' · ')}.`);
  if (F && horairesChanges(d, F.contenu)) out.push('Les horaires de la date ont changé depuis la composition de cette feuille. <button type="button" class="btn lien" data-fr-maj>Mettre à jour depuis la base</button>');
  // ce qui manque (en gris) et que la base sait maintenant : un téléphone gardé depuis une autre feuille, une adresse…
  const avant = F ? FEUILLE.manques(F.contenu.blocs) : [];
  if (avant.length) {
    const apres = FEUILLE.actualiser(F.contenu, composerPour(d)).contenu.blocs;
    const n = avant.filter(m => { const b = apres.find(x => x.id === m.id); return b && !(b.segments || []).some(x => x.amorce && x.texte.trim() === m.texte); }).length;
    if (n) out.push(`La base sait maintenant ${n > 1 ? `${n} informations qui manquent` : 'une information qui manque'} à cette feuille (en gris). <button type="button" class="btn lien" data-fr-maj>Mettre à jour depuis la base</button>`);
  }
  return out.map(x => `<p class="fr-alerte">${x}</p>`).join('');
}
function dessinerFeuille(etat) {
  if (etat.editeur) { etat.editeur.detruire(); etat.editeur = null; }
  const zone = zoneNeuve('#ed-feuille');
  const { d } = etat;
  if (!etat.F) {
    zone.innerHTML = `<div class="bloc fr-accueil"><h3>Pas encore de feuille de route pour cette date</h3>
      <p>« Composer » écrit la feuille sur sa page A4, dans la forme habituelle : l’en-tête (le spectacle, l’équipe, les dates, le lieu), le planning jour par jour, les repas, transports et hébergement repris de la feuille précédente, les adresses et les contacts. Il ne reste qu’à relire et compléter : ce qui manque est écrit en gris, cliquez dessus pour l’écrire.</p>
      ${alertesFeuille(d, null)}<p class="fm-boutons"><button type="button" class="btn principal" id="fr-composer">Composer la feuille</button><button type="button" class="btn" id="fr-vide">Partir d’une page blanche</button></p></div>`;
    const commencer = contenu => { etat.F = { titre: '', contenu, statut: 'brouillon', version: 1, publiee_le: null }; etat.lu = lignesLues(contenu.blocs); dessinerFeuille(etat); };
    $('#fr-composer', zone).addEventListener('click', () => { commencer(composerPour(d)); annoncer('Feuille composée : relisez, complétez ce qui est en gris, puis enregistrez.'); });
    $('#fr-vide', zone).addEventListener('click', () => commencer({ format: 2, blocs: [{ type: 'entete', segments: [{ texte: 'FEUILLE DE ROUTE', gras: true, italique: true }] }, { type: 'ligne', segments: [] }], composees: [], pages: [], instantane: [] }));
    return;
  }
  const F = etat.F, pub = F.statut === 'publiee';
  const sale = () => signatureFeuille(etat.F) !== etat.initial;
  const quand = x => { const t = new Date(x); return isNaN(t) ? '' : `le ${t.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} à ${t.getHours()}h${String(t.getMinutes()).padStart(2, '0')}`; };
  const badge = pub ? `<span class="badge ok">Publiée v${F.version}</span><span class="compte">${esc(quand(F.publiee_le))} : l’équipe de la date la voit dans son espace</span>`
    : etat.f0 ? `<span class="badge option">Brouillon</span><span class="compte">l’équipe ne la voit pas encore${etat.f0.publiee_le ? ` (la version ${etat.f0.version} a été retirée)` : ''}</span>` : '<span class="badge option">Pas encore enregistrée</span>';
  const bouton = (cmd, lib, titre, extra = '') => `<button type="button" class="a4-b" data-a4="${cmd}" title="${esc(titre)}"${extra}>${lib}</button>`;
  zone.innerHTML = `<div class="bloc fr-etat"><div class="fr-etat-l"><span class="fr-badge">${badge}</span>
      <span class="fr-actions"><button type="button" class="btn petit" id="fr-maj" title="L’en-tête, les horaires, l’équipe, les contacts : ce qui vient de la base et n’a pas été retouché. Ce que vous avez écrit ne change pas.">Mettre à jour depuis la base</button><button type="button" class="btn petit" id="fr-pdf"><svg class="ic-btn" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"/><path d="M5 19.5h14"/></svg>Télécharger le PDF</button><button type="button" class="btn petit" id="fr-imprimer">Imprimer</button></span></div>
      ${alertesFeuille(d, F)}<p class="fr-reprise" id="fr-reprise" hidden></p></div>
    <div class="bloc fr-manques" id="fr-manques" hidden></div><p class="sr" id="fr-m-annonce" role="status"></p>
    <div class="a4-outils" role="toolbar" aria-label="Mise en forme de la feuille" aria-controls="a4-doc">
      <span class="a4-groupe" role="group" aria-label="Type de ligne">${bouton('type', 'Rubrique', 'Un titre de rubrique : Planning, Repas, Transports…', ' data-type="rubrique" aria-pressed="false"')}${bouton('type', 'Jour', 'Un jour du planning : « mardi 16 décembre »', ' data-type="jour" aria-pressed="false"')}${bouton('type', 'Ligne', 'Une ligne ordinaire', ' data-type="ligne" aria-pressed="false"')}${bouton('type', '• Puce', 'Une liste à puces', ' data-type="puce" aria-pressed="false"')}</span>
      <span class="a4-groupe" role="group" aria-label="Mise en valeur">${bouton('gras', '<b>Gras</b>', 'Gras (Ctrl+B)', ' aria-pressed="false"')}${bouton('rouge', '<span class="a4-rouge">Rouge</span>', 'Rouge : ce qu’il ne faut pas oublier', ' aria-pressed="false"')}${bouton('surligne', '<span class="a4-jaune">Surligner</span>', 'Surligner : pour qui c’est', ' aria-pressed="false"')}${bouton('noms', 'Surligner les noms', 'Surligne d’un coup, dans le planning, les prénoms de l’équipe et « tout le monde »')}</span>
      <span class="a4-groupe" role="group" aria-label="Page">${bouton('saut', 'Saut de page', 'Commencer une nouvelle page ici (Ctrl+Entrée)')}</span>
      <span class="a4-groupe" role="group" aria-label="Historique">${bouton('annuler', '↶ Annuler', 'Annuler (Ctrl+Z)')}${bouton('retablir', '↷ Rétablir', 'Rétablir (Ctrl+Y)')}</span>
      <span class="a4-groupe a4-zoom" role="group" aria-label="Zoom de la page">${bouton('zoom-moins', '−', 'Réduire la page de 10 % (Ctrl + molette vers le bas)', ' aria-label="Réduire le zoom"')}${bouton('zoom-cent', '100 %', 'Revenir à 100 %', ' aria-pressed="false"')}${bouton('zoom-plus', '+', 'Agrandir la page de 10 % (Ctrl + molette vers le haut)', ' aria-label="Agrandir le zoom"')}${bouton('zoom-auto', 'Ajuster', 'Ajuster la page à la largeur disponible', ' aria-pressed="true"')}<span class="a4-zoom-val" id="a4-zoom-val" role="status" aria-live="polite"></span></span>
      <span class="seg a4-vues" role="group" aria-label="Affichage"><button type="button" data-fr-vue="page" aria-pressed="${etat.vue === 'page'}">Page A4</button><button type="button" data-fr-vue="tel" aria-pressed="${etat.vue === 'tel'}">Vue de l’équipe</button></span>
    </div>
    <p class="aide a4-aide" id="a4-aide">Écrivez directement sur la page. Les mots en gris manquent encore : cliquez dessus pour les écrire (ils ne sont jamais imprimés). Un trait bleu dans la marge : la ligne vient de la base, « Mettre à jour depuis la base » la tient à jour tant que vous ne la retouchez pas.</p>
    <div id="fr-vue"></div>
    <div class="pied-ed"><span class="etat-ed"></span>
      ${pub ? '<button type="button" class="btn" id="fr-brouillon">Repasser en brouillon</button>' : '<button type="button" class="btn" id="fr-publier">Publier pour l’équipe</button>'}
      <button type="button" class="btn principal" data-enregistrer>${pub ? 'Publier la mise à jour' : 'Enregistrer le brouillon'}</button></div>`;
  const outils = $('.a4-outils', zone);
  const majEtat = () => {
    const x = sale(); marquerSale(x);
    const el = $('.etat-ed', zone);
    if (!x) el.textContent = pub ? `Publiée : l’équipe voit la version ${F.version}` : etat.f0 ? 'Brouillon enregistré' : 'Pas encore enregistrée';
    else if (pub) el.textContent = `Modifications non publiées : l’équipe voit encore la version ${F.version}`;
    const b = $('[data-enregistrer]', zone); if (b) b.disabled = pub && !x;
  };
  const majOutils = e => {
    $$('[data-a4="type"]', outils).forEach(b => b.setAttribute('aria-pressed', String(!!e && e.type === b.dataset.type)));
    ['gras', 'rouge', 'surligne'].forEach(k => $(`[data-a4="${k}"]`, outils).setAttribute('aria-pressed', String(!!e?.[k])));
    $('[data-a4="annuler"]', outils).disabled = !e?.annuler;
    $('[data-a4="retablir"]', outils).disabled = !e?.retablir;
  };
  // le zoom de la page : l'état des boutons, et « Zoom 125 % » dit aux lecteurs d'écran (pas à l'ouverture de la page)
  const majZoom = (z, { dire = true } = {}) => {
    $('[data-a4="zoom-cent"]', outils).setAttribute('aria-pressed', String(!z.auto && z.pourcent === 100));
    $('[data-a4="zoom-auto"]', outils).setAttribute('aria-pressed', String(z.auto));
    $('[data-a4="zoom-moins"]', outils).disabled = etat.vue !== 'page' || z.pourcent <= 50;
    $('[data-a4="zoom-plus"]', outils).disabled = etat.vue !== 'page' || z.pourcent >= 200;
    const v = $('#a4-zoom-val', outils); if (v) v.textContent = dire ? `Zoom ${z.pourcent} %${z.auto ? ' (ajusté)' : ''}` : '';
  };
  // ---- à compléter : ce que la feuille demande encore (les amorces en gris qui posent une question), en une liste qu'on
  // remplit sans viser la page (petite, au téléphone). Ce qu'on y écrit prend la place de l'amorce, comme un clic sur elle
  // (« Annuler » de la barre le reprend) ; un téléphone, un contact, l'adresse du lieu iront dans leur fiche à l'enregistrement.
  const pm = $('#fr-manques', zone);
  let signatureManques = null, manquesPrevus = 0, nbManquesAvant = null;
  const blocsCourants = () => (etat.editeur ? etat.editeur.blocs() : F.contenu.blocs);
  const contexteManque = m => [m.jour, m.ligne.replace(/^[\s:–—-]+|[\s:–—-]+$/g, '') || m.rubrique].filter(Boolean).join(' · ');
  const exempleManque = m => /^téléphone/.test(m.texte) ? 'le numéro' : /^contact sur place/.test(m.texte) ? 'nom et numéro' : /^adresse/.test(m.texte) ? 'numéro, rue, code postal'
    : /^heure/.test(m.texte) ? 'l’heure : 9h30' : '';
  const gardeDe = m => {
    const e = memoireDe(m.cle).find(x => x.table);
    const ligne = e && /téléphone|adresse|contact/.test(m.texte) ? e.ligne(m.cle.match(e.cle), d) : null;
    return ligne == null ? '' : e.ou === 'sa fiche' ? `ira dans la fiche de ${nomDe(personne(ligne))}` : `ira dans ${e.ou === 'son suivi' ? 'le suivi de la date' : e.ou}`;
  };
  function dessinerManques(focus = null) {
    const xs = FEUILLE.manques(blocsCourants()), sig = JSON.stringify(xs.map(m => [m.id, m.k, m.texte, m.ligne]));
    if (sig === signatureManques && focus === null) return;
    signatureManques = sig;
    // ce qui est déjà tapé dans la liste, et le champ où l'on tape, restent
    const saisies = new Map($$('li[data-m] input', pm).map(i => [i.closest('li').dataset.m, i.value]));
    const actif = pm.contains(document.activeElement) && document.activeElement.matches('input') ? { m: document.activeElement.closest('li').dataset.m, i: document.activeElement.selectionStart } : null;
    pm.hidden = !xs.length;
    pm.innerHTML = xs.length ? `<details${etat.manquesFermes ? '' : ' open'}><summary><span class="fr-m-titre">À compléter</span><span class="badge option">${xs.length}</span><span class="aide">ce qui est encore en gris sur la page</span></summary>
      <ul class="fr-m-liste">${xs.map((m, i) => { const g = gardeDe(m), cle = `${m.id}|${m.k}`; return `<li data-m="${esc(cle)}"><label for="fr-m-${i}"><span class="fr-m-ctx">${esc(contexteManque(m))}</span> <span class="fr-m-q">${esc(m.texte)}</span>${g ? `<small class="fr-m-garde">${esc(g)}</small>` : ''}</label>
        <span class="fr-m-saisie"><input id="fr-m-${i}" type="${/^téléphone/.test(m.texte) ? 'tel' : 'text'}" autocomplete="off" enterkeyhint="done" value="${esc(saisies.get(cle) || '')}" placeholder="${esc(exempleManque(m))}"><button type="button" class="btn petit" data-m-ok>Écrire</button></span></li>`; }).join('')}</ul></details>` : '';
    if (nbManquesAvant !== null && xs.length < nbManquesAvant) $('summary .badge', pm)?.classList.add('pop');   // le compte saute quand il baisse
    nbManquesAvant = xs.length;
    if (focus !== null) { const ins = $$('li[data-m] input', pm); (ins[Math.min(focus, ins.length - 1)] || $('[data-enregistrer]', zone))?.focus(); }
    else if (actif) { const i = $$('li[data-m]', pm).find(li => li.dataset.m === actif.m)?.querySelector('input'); if (i) { i.focus(); i.setSelectionRange(actif.i, actif.i); } }
  }
  const ecrireManque = li => {
    const inp = $('input', li), v = inp.value.replace(/\s+/g, ' ').trim();
    if (!v) { inp.focus(); return; }
    const [id, k] = li.dataset.m.split('|'), rang = $$('li[data-m]', pm).indexOf(li);
    const blocs = blocsCourants().map(b => (b.id === id ? FEUILLE.remplirAmorce(b, +k, v) : b));
    if (etat.editeur) etat.editeur.remplacer(blocs);
    else { F.contenu.blocs = blocs; majEtat(); montrer(); }
    const reste = FEUILLE.manques(blocsCourants()).length;
    $('#fr-m-annonce', zone).textContent = `Écrit dans la feuille : ${v}. ${reste ? `Encore ${reste} à compléter.` : 'Tout est complété : il reste à enregistrer.'}`;
    dessinerManques(rang);
  };
  pm.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('.fr-m-saisie input')) { e.preventDefault(); ecrireManque(e.target.closest('li')); } });
  pm.addEventListener('click', e => { const b = e.target.closest('[data-m-ok]'); if (b) ecrireManque(b.closest('li')); });
  // l'amorce visée depuis la liste s'allume sur la page (au survol, ou quand on écrit dans son champ) : le bloc par son id,
  // l'amorce par son rang parmi les amorces du bloc (k : le rang du segment)
  const amorceDe = li => {
    const [id, k] = (li.dataset.m || '').split('|'), b = blocsCourants().find(x => x.id === id), el = $(`#a4-doc [data-id="${CSS.escape(id)}"]`);
    if (!b || !el || !Array.isArray(b.segments)) return null;
    return $$('.amorce', el)[b.segments.slice(0, +k).filter(s => s.amorce).length] || null;
  };
  const eteindreAmorce = () => $$('#a4-doc .amorce.visee').forEach(a => a.classList.remove('visee'));
  const allumerAmorce = (e, defiler) => {
    const li = e.target.closest && e.target.closest('li[data-m]');
    eteindreAmorce();
    const a = li && amorceDe(li);
    if (!a) return;
    a.classList.add('visee');
    if (defiler) a.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };
  pm.addEventListener('mouseover', e => allumerAmorce(e, false));
  pm.addEventListener('mouseleave', eteindreAmorce);
  pm.addEventListener('focusin', e => allumerAmorce(e, true));
  pm.addEventListener('focusout', e => { if (!e.relatedTarget || !pm.contains(e.relatedTarget)) eteindreAmorce(); });
  pm.addEventListener('toggle', e => { if (e.target.tagName === 'DETAILS') etat.manquesFermes = !e.target.open; }, true);
  // ---- l'hébergement : de quelle feuille le reprendre (au même lieu, à défaut dans la même commune ; par défaut, la
  // dernière écrite : FEUILLE.hebergements). Le choix se lit dans la page (FEUILLE.origineHebergement) : un autre choix
  // remplace la rubrique (« Annuler » le reprend) ; retouchée à la main, la liste le dit.
  const hebs = FEUILLE.hebergements(sourcesFeuille(d)), pr = $('#fr-reprise', zone);
  const ecriteLe = x => (x.ecrit_le && !isNaN(new Date(x.ecrit_le)) ? `, écrite le ${new Date(x.ecrit_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}` : '');
  const libelleHeb = x => x.carnet ? `du carnet du lieu : ${x.nom}${x.memeLieu ? '' : ` (${x.lieu?.nom || x.lieu?.commune || 'un autre lieu'})`}` : `repris de la feuille du ${FEUILLE.jourLong(x.debut)}${x.memeLieu ? '' : ` (${x.lieu?.nom || x.lieu?.commune || 'un autre lieu'})`}${ecriteLe(x)}`;
  let repriseVue = null;
  function dessinerReprise() {
    if (!hebs.length) return;
    const o = FEUILLE.origineHebergement(blocsCourants(), hebs), v = typeof o === 'number' ? String(hebs[o].date_id) : o === 'aucune' ? 'aucune' : o;
    if (v === repriseVue) return;
    const focus = document.activeElement?.id === 'fr-heb';
    repriseVue = v;
    pr.hidden = false;
    pr.innerHTML = `<label for="fr-heb">Hébergement</label><select id="fr-heb">${v === 'ecrit' || v === 'absente' ? `<option value="" selected>${v === 'absente' ? 'pas encore dans cette feuille' : 'écrit dans cette feuille'}</option>` : ''}${hebs.map(x => `<option value="${x.date_id}"${String(x.date_id) === v ? ' selected' : ''}>${esc(libelleHeb(x))}</option>`).join('')}<option value="aucune"${v === 'aucune' ? ' selected' : ''}>à écrire : ne rien reprendre</option></select>`;
    if (focus) $('#fr-heb', pr).focus();
  }
  pr.addEventListener('change', e => {
    if (e.target.id !== 'fr-heb' || !e.target.value) return;
    const x = e.target.value === 'aucune' ? null : hebs.find(h => String(h.date_id) === e.target.value);
    const avant = blocsCourants().map(b => ({ ...b }));
    const poser = blocs => { if (etat.editeur) etat.editeur.remplacer(blocs); else { F.contenu.blocs = blocs; majEtat(); montrer(); } dessinerReprise(); dessinerManques(); };
    poser(FEUILLE.reprendreHebergement(avant, x));
    annoncer(x ? `Hébergement ${libelleHeb(x).replace(/, écrite le .*$/, '')} : à vérifier.` : 'Hébergement à écrire : la rubrique attend l’hôtel (en gris).', { libelle: 'Annuler', delai: 10000, action: () => poser(avant) });
  });
  // la liste suit la page (ce qu'on y écrit, « Annuler », « Mettre à jour depuis la base »), sans perdre une saisie en cours
  const manquesBientot = () => { clearTimeout(manquesPrevus); manquesPrevus = setTimeout(() => { if (pm.isConnected) { dessinerManques(); dessinerReprise(); } }, 300); };
  dessinerManques();
  // la barre d'outils colle sous l'en-tête de l'administration
  const barre = $('.barre');
  const hauteurBarre = () => (typeof poserHautBarre === 'function' ? poserHautBarre(false) : document.documentElement.style.setProperty('--haut-barre', `${barre ? barre.offsetHeight : 0}px`));
  hauteurBarre();
  const montrer = () => {
    const z = $('#fr-vue', zone);
    $$('[data-a4]', outils).forEach(b => { b.disabled = etat.vue !== 'page'; });
    if (etat.vue === 'tel') {
      if (etat.editeur) { feuilleCourante(etat); etat.editeur.detruire(); etat.editeur = null; }
      z.innerHTML = `<div class="a4-tel" aria-label="La feuille telle que l’équipe la lit sur un téléphone">${FEUILLE.html(feuilleCourante(etat), { ...contexteFeuille(d), moi: null })}</div>`;
      return;
    }
    etat.editeur = editeurA4(z, { blocs: F.contenu.blocs, noms: nomsDeLaDate(d), ref: repsDe(d.id)[0]?.jour || d.debut,
      quandChange: () => { F.contenu.blocs = etat.editeur.blocs(); F.contenu.pages = etat.editeur.pages(); majEtat(); manquesBientot(); },
      quandEtat: majOutils, quandZoom: majZoom,
      extra: { lire: () => ({ composees: F.contenu.composees || [], instantane: F.contenu.instantane || [], compose_le: F.contenu.compose_le || null }), ecrire: v => Object.assign(F.contenu, v) } });
    F.contenu.pages = etat.editeur.pages();
  };
  montrer();
  majEtat();
  dessinerReprise();
  window.addEventListener('resize', hauteurBarre);
  const quitter = () => { if (location.hash !== `#/feuilles/${d.id}`) { etat.nettoyer(); if (etat.editeur) { etat.editeur.detruire(); etat.editeur = null; } } };
  etat.nettoyer = () => { window.removeEventListener('resize', hauteurBarre); window.removeEventListener('hashchange', quitter); };
  window.addEventListener('hashchange', quitter);
  // les boutons de la barre gardent la sélection de la page
  outils.addEventListener('mousedown', e => { if (e.target.closest('[data-a4]')) e.preventDefault(); });
  outils.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.frVue) { if (etat.vue !== b.dataset.frVue) { etat.vue = b.dataset.frVue; $$('[data-fr-vue]', outils).forEach(x => x.setAttribute('aria-pressed', String(x === b))); montrer(); } return; }
    const ed = etat.editeur; if (!ed || !b.dataset.a4) return;
    const c = b.dataset.a4;
    if (c === 'type') ed.type(b.dataset.type);
    else if (c === 'noms') { const n = ed.surlignerNoms(); annoncer(n ? `${n} nom${n > 1 ? 's' : ''} surligné${n > 1 ? 's' : ''} dans le planning.` : 'Aucun nom de plus à surligner dans le planning.'); }
    else if (c === 'annuler') ed.annuler();
    else if (c === 'retablir') ed.retablir();
    else if (c === 'saut') ed.saut();
    else if (c === 'zoom-moins') ed.zoomPas(-10);
    else if (c === 'zoom-plus') ed.zoomPas(10);
    else if (c === 'zoom-cent') ed.zoom(100);
    else if (c === 'zoom-auto') ed.ajuster();
    else ed.basculer(c);
  });
  const mettreAJour = () => {
    if (!etat.editeur) { etat.vue = 'page'; $$('[data-fr-vue]', outils).forEach(x => x.setAttribute('aria-pressed', String(x.dataset.frVue === 'page'))); montrer(); }
    const r = FEUILLE.actualiser(feuilleCourante(etat).contenu, composerPour(d));
    etat.editeur.remplacer(r.contenu.blocs);
    Object.assign(F.contenu, { composees: r.contenu.composees, instantane: r.contenu.instantane, compose_le: r.contenu.compose_le });
    delete F.contenu.ancien;
    F.contenu.blocs = etat.editeur.blocs(); F.contenu.pages = etat.editeur.pages();
    majEtat();
    $$('.fr-alerte', zone).forEach(x => { if (x.querySelector('[data-fr-maj]')) x.remove(); });
    const n = r.ajoutes + r.modifies + r.retires + r.remplies, pl = (k, un, des) => `${k} ${k > 1 ? des : un}`;
    annoncer(n ? `Mise à jour depuis la base : ${[r.modifies && pl(r.modifies, 'ligne changée', 'lignes changées'), r.ajoutes && pl(r.ajoutes, 'ajoutée', 'ajoutées'), r.retires && pl(r.retires, 'retirée', 'retirées'),
      r.remplies && pl(r.remplies, 'information qui manquait', 'informations qui manquaient')].filter(Boolean).join(', ')}. Ce que vous avez écrit n’a pas changé.` : 'Rien n’a changé dans la base depuis la composition.',
      n ? { libelle: 'Annuler', delai: 12000, action: () => etat.editeur && etat.editeur.annuler() } : {});
  };
  zone.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b || outils.contains(b)) return;
    if (b.id === 'fr-maj' || b.dataset.frMaj !== undefined) return mettreAJour();
    if (b.id === 'fr-pdf') {
      const lib = b.innerHTML; b.disabled = true; b.textContent = 'Préparation du PDF…';
      try { await FEUILLE.telecharger(feuilleCourante(etat), contexteFeuille(d)); annoncer(sale() ? 'PDF téléchargé (avec les modifications pas encore enregistrées).' : 'PDF téléchargé.'); }
      catch (err) { erreur(err, 'PDF impossible'); }
      finally { b.disabled = false; b.innerHTML = lib; }
      return;
    }
    if (b.id === 'fr-imprimer') return imprimerFeuille(feuilleCourante(etat), contexteFeuille(d));
    if (b.id === 'fr-publier') return enregistrerFeuille(etat, 'publiee', b);
    if (b.id === 'fr-brouillon') return enregistrerFeuille(etat, 'brouillon', b);
    if (b.matches('[data-enregistrer]')) return enregistrerFeuille(etat, pub ? 'publiee' : 'brouillon', b);
  });
}
async function enregistrerFeuille(etat, statut, bouton) {
  const { d } = etat, avant = etat.f0, f = feuilleCourante(etat);
  // la mémoire : ce qui a été écrit depuis l'ouverture et va dans les fiches ; la feuille en garde la trace (contenu.appris)
  const lecons = lecturesFeuille(etat, f.contenu);
  if (lecons.aGarder.length) f.contenu = { ...f.contenu, appris: avecAppris(f.contenu.appris, lecons.aGarder) };
  const ligne = { titre: (f.titre || '').trim() || null, contenu: f.contenu, statut };
  bouton.disabled = true;
  const r = avant ? await sb.from('crescite_feuilles').update(ligne).eq('id', avant.id).select().single()
    : await sb.from('crescite_feuilles').insert({ ...ligne, date_id: d.id }).select().single();
  bouton.disabled = false;
  if (r.error) return erreur(r.error);
  remplacerLigne(E.feuilles, r.data);
  etat.f0 = r.data; etat.F = feuilleVersForm(r.data, d); etat.initial = signatureFeuille(etat.F);
  etat.lu = lignesLues(etat.F.contenu.blocs);
  E.sale = false;
  if (etat.nettoyer) etat.nettoyer();
  dessinerFeuille(etat);
  if (statut === 'publiee') $('.fr-badge .badge')?.classList.add('pop');
  annoncer(statut === 'publiee' ? (avant?.statut === 'publiee' ? `Mise à jour publiée : l’équipe voit la version ${r.data.version}.` : `Publiée pour l’équipe : version ${r.data.version}.`)
    : avant?.statut === 'publiee' ? 'Repassée en brouillon : l’équipe ne la voit plus.' : 'Brouillon enregistré : l’équipe ne le voit pas encore.');
  bravo();
  if (lecons.aGarder.length || lecons.refus.length) await memoriser(etat, lecons);
}
// imprimer la feuille telle qu'elle est sur ses pages A4 (dans un cadre caché, sans fenêtre de plus)
async function imprimerFeuille(feuille, contexte) {
  const logo = await FEUILLE.logo();
  const f = document.createElement('iframe');
  f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  f.srcdoc = FEUILLE.impression(feuille, contexte, { logo: !!logo });
  f.addEventListener('load', async () => {
    try { await f.contentDocument.fonts.ready; f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { erreur(e, 'Impression impossible'); }
    setTimeout(() => f.remove(), 60000);
  }, { once: true });
  document.body.append(f);
}

// ===================================================================================================== la mémoire des feuilles
// Ce qu'on écrit dans une feuille de route à la place d'une information de la base, ou là où elle manque (le téléphone
// d'une personne, un contact, l'adresse d'un lieu…), va dans la bonne fiche quand on enregistre la feuille : les feuilles
// suivantes le trouvent tout prêt, l'espace de l'équipe aussi. Chaque ligne que la base a composée porte une clé
// (feuille.js) ; MEMOIRE dit ce que chaque clé apprend, et où. N'est relu que ce qui a été écrit depuis l'ouverture de la
// feuille (etat.lu). Rien n'est deviné : deux numéros, pas de numéro reconnaissable, une personne ou un contact qu'on ne
// retrouve plus, et rien ne s'enregistre (une phrase le dit) ; ce qu'on efface dans la feuille n'efface pas la fiche.
// La feuille garde la trace de ce qu'elle a appris (contenu.appris : [{table, ligne, champ, le}], rien de la valeur) : la
// fiche dit d'où vient sa valeur tant que la ligne de la feuille la dit encore.
const RANGS = { crescite_personnes_privees: ['privees', 'personne_id'], crescite_dates_suivi: ['suivis', 'date_id'], crescite_lieux_suivi: ['lieuxSuivi', 'lieu_id'], crescite_lieux: ['lieux', 'id'] };
const rangee = (table, ligne) => { const [k, pk] = RANGS[table]; return E[k].find(x => x[pk] === ligne) || null; };
// « du Théâtre des Essais », « de l’Espace Modèle », « d’Évreux »
const duLieu = l => (l?.nom ? FEUILLE.aLieu(l.nom) : `à ${l?.commune || 'ce lieu'}`).replace(/^au /, 'du ').replace(/^aux /, 'des ').replace(/^à la /, 'de la ').replace(/^à l’/, 'de l’').replace(/^à /, 'de ').replace(/^de ([aeiouyàâéèêëîïôöùûü])/i, 'd’$1');
const personneDeCle = k => { const xs = E.personnes.filter(p => FEUILLE.cleMot(nomDe(p)) === k); return xs.length === 1 ? xs[0] : null; };
const numero = t => String(t || '').replace(/[^\d+]/g, '').replace(/^\+33/, '0');
const tousDans = (re, t) => String(t || '').match(new RegExp(re.source, 'g')) || [];
// des chiffres qui ressemblent à un numéro sans en être un (trop courts, d'un autre pays) : rien de reconnaissable, sauf
// s'ils sont ceux que la fiche a déjà (un numéro étranger, que la feuille montre tel quel)
const chiffresSansNumero = (t, actuel = '') => { const c = String(t || '').replace(new RegExp(FEUILLE.RE_MEL.source, 'g'), ' ').replace(new RegExp(FEUILLE.RE_TEL.source, 'g'), ' ').replace(/\D/g, '');
  return c.length >= 8 && !(numero(actuel).replace(/\D/g, '').length >= 8 && c.includes(numero(actuel).replace(/\D/g, ''))); };

// ----------------------------------------------------------------------------------------------- lire ce qui est écrit
// chaque lecture rend { valeur } (ce que la fiche apprend), { refus } (ambigu : rien ne s'enregistre) ou null (rien à apprendre)
// le téléphone d'une personne : la ligne la nomme toujours (« Camille 06 00 00 00 00 »), et n'a qu'un numéro, reconnu
function lireTelephone(texte, actuel, { personne: p }) {
  const prenom = p?.prenom || nomDe(p).split(' ')[0];
  if (!norm(texte).startsWith(norm(prenom))) return { refus: `la ligne ne nomme plus ${prenom}` };
  const c = FEUILLE.lireContact(texte);
  if (c.telephones.length > 1) return { refus: 'deux numéros dans la ligne' };
  if (!c.telephones.length) return chiffresSansNumero(texte, actuel) ? { refus: 'pas de numéro reconnaissable' } : null;
  return numero(c.telephone) === numero(actuel) ? null : { valeur: c.telephone };
}
// un contact du suivi (organisateur, contact de la date, contact du lieu) : un texte libre, que la feuille complète ou corrige
// sans le réécrire (un numéro ou une adresse électronique s'y ajoutent ; un numéro changé y remplace l'ancien), tant que la
// ligne nomme le même contact ; vide, il prend la ligne entière, si elle a de quoi joindre ce contact
const ROLE_LIGNE = /,\s*(organisateur|contact de la date|contact du lieu)(\s*\([^)]*\))?\s*:/i;
function lireContactSuivi(texte, actuel) {
  const brut = texte.replace(ROLE_LIGNE, ' :').replace(/\s+/g, ' ').trim();
  const tels = tousDans(FEUILLE.RE_TEL, brut), mels = tousDans(FEUILLE.RE_MEL, brut);
  if (tels.length > 1) return { refus: 'deux numéros dans la ligne' };
  if (mels.length > 1) return { refus: 'deux adresses électroniques dans la ligne' };
  if (!tels.length && !mels.length) return chiffresSansNumero(brut, actuel) ? { refus: 'pas de numéro reconnaissable' } : null;
  const nomSeul = t => FEUILLE.lireContact(t.replace(new RegExp(FEUILLE.RE_TEL.source, 'g'), ' ').replace(new RegExp(FEUILLE.RE_MEL.source, 'g'), ' ')).nom;
  const propre = t => norm(t).replace(/[^a-z0-9]+/g, ' ').replace(/\b(ou|et|sinon|puis)\b/g, ' ').replace(/\s+/g, ' ').trim();   // « 02… ou 02… » : « ou » n'est pas un nom
  const a = String(actuel || '').trim();
  if (!a) return { valeur: tels.reduce((t, x) => t.replace(x, FEUILLE.telTexte(x)), brut).replace(/^[\s:,;–—-]+|[\s:,;–—-]+$/g, '') };
  // le même contact ? (un nom écrit dans la ligne et dans la fiche : l'un contient l'autre)
  const n1 = propre(nomSeul(brut)), n2 = propre(nomSeul(a));
  if (n1 && n2 && !n1.includes(n2) && !n2.includes(n1)) return { refus: 'un autre nom que dans la fiche' };
  let v = a;
  const ajouter = x => { v = `${v.replace(/[\s,;:]+$/, '')}, ${x}`; };
  if (tels.length) {
    const deja = tousDans(FEUILLE.RE_TEL, a);
    if (!deja.some(x => numero(x) === numero(tels[0]))) {
      if (deja.length > 1) return { refus: 'plusieurs numéros dans la fiche' };
      if (deja.length) v = v.replace(deja[0], FEUILLE.telTexte(tels[0])); else ajouter(FEUILLE.telTexte(tels[0]));
    }
  }
  if (mels.length) {
    const deja = tousDans(FEUILLE.RE_MEL, a);
    if (!deja.some(x => norm(x) === norm(mels[0]))) {
      if (deja.length > 1) return { refus: 'plusieurs adresses électroniques dans la fiche' };
      if (deja.length) v = v.replace(deja[0], mels[0]); else ajouter(mels[0]);
    }
  }
  return v === a ? null : { valeur: v };
}
// l'adresse du lieu, seulement si sa fiche n'en a pas : ce qui suit son nom (« Théâtre des Essais : 12 rue … »), qui
// ressemble à une adresse (une voie ou un code postal, un numéro), sans la commune que la composition ajoute
const VOIE = /\b(rue|avenue|av\.|bd|boulevard|place|pl\.|chemin|all[ée]e|impasse|quai|route|rte|cours|square|esplanade|parvis|rond-point|voie|passage|sentier|hameau|lieu-dit|r[ée]sidence|zone|za|zi|zac|parc|promenade|mail|faubourg|cit[ée]|domaine|lotissement)\b|\b\d{5}\b/i;
function lireAdresse(texte, actuel, { lieu: l }) {
  const i = texte.indexOf(':');
  if (i < 0) return null;
  const tete = texte.slice(0, i), commune = String(l?.commune || '').trim();
  if (!norm(tete).includes(norm(l?.nom || commune))) return { refus: 'la ligne ne nomme plus le lieu' };
  let a = texte.slice(i + 1).replace(/\s+/g, ' ').trim();
  // « 12 rue de l’Exemple, Évreux » : la commune que la composition ajoute s'en va ; « …, 27000 Évreux » reste entier
  if (commune && norm(a).endsWith(norm(commune)) && !/\d{5}\s*$/.test(a.slice(0, a.length - commune.length))) a = a.slice(0, a.length - commune.length).replace(/[\s,]+$/, '');
  if (!a) return null;
  if (!/\d/.test(a) || !VOIE.test(a) || a.length > 150 || /@/.test(a)) return { refus: 'pas une adresse reconnaissable' };
  if (String(actuel || '').trim()) return norm(actuel).replace(/\s+/g, ' ') === norm(a) ? null : { refus: 'la fiche du lieu en a déjà une' };
  return { valeur: a };
}
// la jauge et le plateau du lieu, dans « Jauge : 300 places ; plateau : 9 m × 7 m »
function lireJauge(texte, actuel) {
  const m = /jauge\s*:?\s*(\d[\d\s.]{0,7})/i.exec(texte);
  if (!m) return null;
  const v = +m[1].replace(/[\s.]/g, '');
  if (!(v >= 10 && v <= 100000)) return { refus: 'une jauge peu vraisemblable' };
  return v === +actuel ? null : { valeur: v };
}
function lirePlateau(texte, actuel) {
  const m = /plateau\s*:\s*([^;]+)/i.exec(texte);
  const v = m ? m[1].replace(/[\s.]+$/, '').trim() : '';
  if (!v || v.length > 80) return null;
  return norm(v) === norm(actuel) ? null : { valeur: v };
}
// une ligne qui donne le même contact pour deux champs du suivi : on ne sait pas lequel corriger
function lireContactDouble(texte, actuel, { avant }) {
  const c = FEUILLE.lireContact(texte), b = FEUILLE.lireContact(avant || '');
  const memes = (x, y) => x.length === y.length && x.every((v, i) => numero(v) === numero(y[i]));
  return memes(c.telephones, b.telephones) && c.emails.join() === b.emails.join() ? null : { refus: 'il vient de deux champs du suivi, à corriger dans la date' };
}

// ----------------------------------------------------------------------------------------------- la table de correspondances
//   cle      la clé de la ligne composée (feuille.js)
//   table, champ, ligne(m, d)   la fiche où va ce qu'elle apprend : sa table, son champ, sa ligne (null : introuvable)
//   lire(texte, valeur actuelle, x)   ce que la ligne écrite en apprend (plus haut)
//   quoi(ligne, d), elle (féminin), ou   pour le dire : « le téléphone de Camille Témoin est gardé dans sa fiche »
const MEMOIRE = [
  { cle: /^cie:(\d+)$/, table: 'crescite_personnes_privees', champ: 'telephone', ligne: m => personne(+m[1])?.id ?? null,
    lire: (t, v, x) => lireTelephone(t, v, { personne: personne(x.ligne) }), quoi: id => `le téléphone de ${nomDe(personne(id))}`, ou: 'sa fiche' },
  { cle: /^cie:(?!\d+$)([a-z0-9-]+)$/, table: 'crescite_personnes_privees', champ: 'telephone', ligne: m => personneDeCle(m[1])?.id ?? null,
    lire: (t, v, x) => lireTelephone(t, v, { personne: personne(x.ligne) }), quoi: id => `le téléphone de ${nomDe(personne(id))}`, ou: 'sa fiche', introuvable: 'un téléphone de la compagnie' },
  { cle: /^contact:organisateur$/, table: 'crescite_dates_suivi', champ: 'organisateur', ligne: (m, d) => d.id,
    lire: lireContactSuivi, quoi: () => 'l’organisateur de la date', ou: 'son suivi' },
  { cle: /^contact:date$/, table: 'crescite_dates_suivi', champ: 'contact', ligne: (m, d) => d.id,
    lire: lireContactSuivi, quoi: () => 'le contact de la date', ou: 'son suivi' },
  { cle: /^contact:lieu$/, table: 'crescite_lieux_suivi', champ: 'contact', ligne: (m, d) => d.lieu_id ?? null,
    lire: lireContactSuivi, quoi: id => `le contact ${duLieu(lieu(id))}`, ou: 'la fiche du lieu' },
  { cle: /^contact:[a-z]+\+/, table: null, quoi: () => 'le contact', lire: lireContactDouble },
  { cle: /^lieu$/, table: 'crescite_lieux', champ: 'adresse', ligne: (m, d) => d.lieu_id ?? null,
    lire: (t, v, x) => lireAdresse(t, v, { lieu: lieu(x.ligne) }), quoi: id => `l’adresse ${duLieu(lieu(id))}`, elle: true, ou: 'la fiche du lieu' },
  { cle: /^lieu:precisions$/, table: 'crescite_lieux_suivi', champ: 'jauge', ligne: (m, d) => d.lieu_id ?? null,
    lire: lireJauge, quoi: id => `la jauge ${duLieu(lieu(id))}`, elle: true, ou: 'la fiche du lieu' },
  { cle: /^lieu:precisions$/, table: 'crescite_lieux_suivi', champ: 'plateau', ligne: (m, d) => d.lieu_id ?? null,
    lire: lirePlateau, quoi: id => `le plateau ${duLieu(lieu(id))}`, ou: 'la fiche du lieu' },
];
const memoireDe = cle => MEMOIRE.filter(e => e.cle.test(cle || ''));
// ce que chaque ligne composée dit, sans ses amorces, à l'ouverture de la feuille ou à son dernier enregistrement
const lignesLues = blocs => new Map((blocs || []).filter(b => b.cle && Array.isArray(b.segments)).map(b => [b.cle, FEUILLE.texteBloc(b)]));

// ce que la feuille apprend : { aGarder: [{e, ligne, avant, valeur}], refus: [{e, ligne, pourquoi}] }
function lecturesFeuille(etat, c) {
  const { d } = etat, out = { aGarder: [], refus: [] };
  (c.blocs || []).forEach(b => {
    if (!b.cle || b.source === 'base' || !Array.isArray(b.segments)) return;
    const texte = FEUILLE.texteBloc(b);
    if (etat.lu && etat.lu.has(b.cle) && etat.lu.get(b.cle) === texte) return;   // rien d'écrit depuis
    memoireDe(b.cle).forEach(e => {
      if (!e.table) { const x = e.lire(texte.trim(), null, { avant: etat.lu?.get(b.cle) }); if (x?.refus) out.refus.push({ e, ligne: null, pourquoi: x.refus }); return; }
      const ligne = e.ligne(b.cle.match(e.cle), d);
      if (ligne == null) { if (e.introuvable && /\d/.test(texte)) out.refus.push({ e, ligne, pourquoi: 'personne de ce nom dans l’équipe', quoi: e.introuvable }); return; }
      const avant = rangee(e.table, ligne)?.[e.champ] ?? null;
      const x = e.lire(texte.trim(), avant, { ligne });
      if (x?.refus) out.refus.push({ e, ligne, pourquoi: x.refus });
      else if (x) out.aGarder.push({ e, ligne, avant, valeur: x.valeur });
    });
  });
  return out;
}
const memeAppris = (a, x) => a.table === x.e.table && String(a.ligne) === String(x.ligne) && a.champ === x.e.champ;
// la trace dans la feuille : une entrée par fiche et par champ, la dernière
function avecAppris(appris, xs) {
  const le = new Date().toISOString(), neufs = xs.map(x => ({ table: x.e.table, ligne: x.ligne, champ: x.e.champ, le }));
  return [...(appris || []).filter(a => !neufs.some(n => n.table === a.table && String(n.ligne) === String(a.ligne) && n.champ === a.champ)), ...neufs].slice(-40);
}
// une ligne de la base, d'un champ ou de plusieurs (une fiche privée, un suivi : créés au besoin ; un lieu : modifié)
async function ecrireRangee(table, ligne, champs) {
  const [k, pk] = RANGS[table];
  const r = table === 'crescite_lieux' ? await sb.from(table).update(champs).eq('id', ligne).select().single()
    : await sb.from(table).upsert({ [pk]: ligne, ...champs }, { onConflict: pk }).select().single();
  if (r.error) throw r.error;
  remplacerLigne(E[k], r.data, pk);
  return r.data;
}
const quoiDe = (x, d) => x.quoi || x.e.quoi(x.ligne, d);
const maj1 = s => (s ? s[0].toUpperCase() + s.slice(1) : '');
// « Le téléphone de Camille Témoin est gardé dans sa fiche. » ; « Gardés dans les fiches : … » ; « … reste dans la feuille : deux numéros dans la ligne. »
function phraseMemoire(faits, refus, d) {
  const out = [];
  if (faits.length === 1) out.push(`${maj1(quoiDe(faits[0], d))} est gardé${faits[0].e.elle ? 'e' : ''} dans ${faits[0].e.ou}.`);
  else if (faits.length) out.push(`Gardés dans les fiches : ${listeEt(faits.map(x => quoiDe(x, d)))}.`);
  if (refus.length === 1) out.push(`${maj1(quoiDe(refus[0], d))} reste dans la feuille : ${refus[0].pourquoi}.`);
  else if (refus.length) out.push(`Restent dans la feuille : ${refus.map(x => `${quoiDe(x, d)} (${x.pourquoi})`).join(', ')}.`);
  return out.join(' ');
}
// après l'enregistrement de la feuille : les fiches apprennent, une phrase le dit, « Annuler » remet leurs valeurs d'avant
async function memoriser(etat, { aGarder, refus }) {
  const faits = [], rates = [...refus];
  for (const x of aGarder) {
    try { await ecrireRangee(x.e.table, x.ligne, { [x.e.champ]: x.valeur }); faits.push(x); }
    catch (err) { console.error(err); rates.push({ ...x, pourquoi: `la base l’a refusé (${err?.message || err})` }); }
  }
  // ce qui ne s'est pas écrit sort de la trace (la base l'oubliera au prochain enregistrement de la feuille)
  if (faits.length < aGarder.length && etat.F?.contenu?.appris) etat.F.contenu.appris = etat.F.contenu.appris.filter(a => !aGarder.some(x => !faits.includes(x) && memeAppris(a, x)));
  const phrase = phraseMemoire(faits, rates, etat.d);
  if (!phrase) return;
  annoncer(phrase, faits.length ? { libelle: 'Annuler', delai: 15000, action: () => oublier(etat, faits) } : { delai: 9000 });
  revoirFiches();
}
async function oublier(etat, faits) {
  try { for (const x of faits) await ecrireRangee(x.e.table, x.ligne, { [x.e.champ]: x.avant ?? null }); }
  catch (err) { return erreur(err, 'Retour impossible'); }
  if (etat.F?.contenu?.appris) etat.F.contenu.appris = etat.F.contenu.appris.filter(a => !faits.some(x => memeAppris(a, x)));
  annoncer(faits.length > 1 ? 'Les fiches ont repris leurs valeurs d’avant.' : `${maj1(quoiDe(faits[0], etat.d))} a repris sa valeur d’avant dans ${faits[0].e.ou}.`);
  revoirFiches();
}
// une fiche ouverte (personne, lieu, date) se redessine avec ce que la base a appris, si rien n'y attend d'être enregistré
const revoirFiches = () => { if (!E.sale && /^#\/(equipe|lieux|representations)\/\d+$/.test(location.hash)) router(); };

// ----------------------------------------------------------------------------------------------- d'où vient une valeur
// la ligne de la feuille dit-elle (encore) la valeur de la fiche ? un numéro, une adresse électronique, une adresse…
const motsDe = t => norm(t).replace(/[^a-z0-9]+/g, ' ').trim();
function ligneDit(champ, texte, valeur) {
  if (valeur == null || String(valeur).trim() === '') return false;
  if (champ === 'telephone') return FEUILLE.lireContact(texte).telephones.some(t => numero(t) === numero(valeur));
  if (champ === 'jauge') return lireJauge(texte, null)?.valeur === +valeur;
  if (champ === 'contact' || champ === 'organisateur') {
    const c = FEUILLE.lireContact(texte), v = FEUILLE.lireContact(valeur);
    return c.telephones.some(t => v.telephones.some(x => numero(x) === numero(t))) || c.emails.some(m => v.emails.some(x => norm(x) === norm(m)));
  }
  return motsDe(texte).includes(motsDe(valeur));
}
// la feuille dont une valeur de fiche a été apprise, tant que sa ligne la dit encore : { feuille, date, le } ou null
function apprisDe(table, ligne, champ, valeur) {
  let mieux = null;
  E.feuilles.forEach(f => (f.contenu?.appris || []).forEach(a => {
    if (a.table !== table || String(a.ligne) !== String(ligne) || a.champ !== champ || (mieux && a.le <= mieux.le)) return;
    const d = E.dates.find(x => x.id === f.date_id), blocs = f.contenu.blocs || [];
    const b = d && MEMOIRE.filter(e => e.table === table && e.champ === champ).map(e => blocs.find(x => e.cle.test(x.cle || '') && String(e.ligne(x.cle.match(e.cle), d)) === String(ligne))).find(Boolean);
    if (b && ligneDit(champ, FEUILLE.texteBloc(b), valeur)) mieux = { feuille: f, le: a.le, date: d };
  }));
  return mieux;
}
// sous le champ d'une fiche : « Appris de la feuille de route du jeu. 17 déc. 2026 (La Pièce d’essai), le 21 oct. »
function mentionAppris(table, ligne, champ, valeur) {
  const x = apprisDe(table, ligne, champ, valeur);
  if (!x) return '';
  const quand = new Date(x.le), s = spectacle(x.date?.spectacle_id);
  return `<span class="appris">Appris de la <a href="#/feuilles/${x.feuille.date_id}">feuille de route ${x.date ? `du ${esc(jourCourt(x.date.debut))}` : ''}</a>${s ? ` (${esc(s.titre)})` : ''}${isNaN(quand) ? '' : `, le ${esc(quand.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }))}`}</span>`;
}
// le journal : ce qu'une feuille enregistrée a appris aux fiches (« le téléphone de Camille Témoin »)
function apprisDuJournal(j) {
  if (j.table_nom !== 'crescite_feuilles') return [];
  const avant = j.avant?.contenu?.appris || [], d = E.dates.find(x => x.id === (j.apres || j.avant)?.date_id) || {};
  return (j.apres?.contenu?.appris || []).filter(a => !avant.some(b => b.le === a.le && b.table === a.table && b.champ === a.champ && String(b.ligne) === String(a.ligne)))
    .map(a => { const e = MEMOIRE.find(x => x.table === a.table && x.champ === a.champ); return e ? e.quoi(a.ligne, d) : a.champ; });
}

// ===================================================================================================== l'éditeur A4
// La feuille s'écrit directement sur ses pages A4 : une colonne éditable (contenteditable) posée sur des feuilles
// blanches, avec la mise en page du PDF (FEUILLE.MISE, FEUILLE.cssPage). Les blocs (le modèle) font foi : la frappe
// ordinaire passe par le navigateur, puis le bloc touché est relu et remis au propre ; le reste (Entrée, effacer d'un
// bloc à l'autre, coller, gras, rouge, surligner, types de ligne, saut de page, annuler) passe par le modèle, puis la page
// est redessinée. Un bloc qui ne tient plus sur sa page passe à la suivante (un titre part avec ce qui le suit) ; les
// débuts de page (pages()) vont avec la feuille, et le PDF coupe aux mêmes endroits.
const PX_MM = 96 / 25.4;
const TITRES_A4 = new Set(['rubrique', 'jour', 'sous-titre']);
function stylesA4() {
  if ($('#styles-a4')) return;
  const M = FEUILLE.MISE;
  const s = document.createElement('style');
  s.id = 'styles-a4';
  s.textContent = `${FEUILLE.cssPolices()}
${FEUILLE.cssPage('.a4-doc')}
.a4-outils { position: sticky; top: var(--haut-barre, 0px); z-index: 6; display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; margin: 12px 0 0; padding: 8px 10px; background: var(--carte); border: 1px solid var(--trait); border-radius: 12px; box-shadow: 0 4px 14px rgba(0,0,0,.06); }
.a4-groupe { display: inline-flex; flex-wrap: wrap; gap: 4px; }
.a4-b { border: 1px solid var(--trait); background: var(--carte); color: var(--encre); border-radius: 8px; padding: 6px 10px; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; line-height: 1.2; }
.a4-b:hover:not(:disabled) { border-color: var(--gris); }
.a4-b[aria-pressed="true"] { background: var(--accent-doux); border-color: var(--accent); color: var(--accent-fonce); }
.a4-b:disabled { opacity: .45; cursor: default; }
.a4-b .a4-rouge { color: ${M.rouge}; }
.a4-b .a4-jaune { background: ${M.surligne}; color: #000; padding: 0 3px; border-radius: 2px; }
.a4-zoom { align-items: center; }
@media not all and (min-width: 641px) and (pointer: fine) { .a4-zoom { display: none; } }
.a4-zoom-val { min-width: 8.5em; margin-left: 4px; font-size: 13px; color: var(--gris); }
.a4-vues { margin-left: auto; }
.a4-aide { margin: 8px 2px 0; }
.a4-bureau { margin: 10px 0 0; padding: 22px 16px 26px; background: #8e8a8f; border-radius: 12px; overflow: auto; }
.a4-bureau:focus-within { box-shadow: 0 0 0 3px var(--accent-doux), 0 0 0 4px var(--accent); }
.a4-echelle { margin: 0 auto; }
.a4-pile { position: relative; width: ${M.largeur}mm; transform-origin: 0 0; }
.a4-feuilles { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
.a4-feuille { position: absolute; left: 0; width: ${M.largeur}mm; height: ${M.hauteur}mm; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.25), 0 8px 22px rgba(0,0,0,.18); }
.a4-logo { position: absolute; left: ${M.gauche}mm; top: ${M.haut}mm; width: ${M.logo}mm; height: ${M.logo}mm; object-fit: contain; }
.a4-badge { display: flex; align-items: center; justify-content: center; border-radius: 50%; background: #1d1d1b; color: #fff; font: 700 15pt "FdR Sans", Carlito, Calibri, sans-serif; }
.a4-num { position: absolute; right: ${M.droite}mm; top: ${M.hauteur - M.bas + M.surete + 2.1}mm; font: 8pt/1.2 "FdR Sans", Carlito, Calibri, sans-serif; color: ${M.gris}; }
.a4-doc { position: relative; z-index: 1; box-sizing: border-box; width: ${M.largeur}mm; padding: ${M.haut}mm ${M.droite}mm 0 ${M.gauche}mm; outline: none; caret-color: #000; background: transparent; }
.a4-doc .b.base { position: relative; }
.a4-doc .b.base::after { content: ""; position: absolute; left: -7mm; top: .25em; bottom: .25em; width: 2px; border-radius: 2px; background: #7eaee0; }
.a4-doc .b-entete.base::after { display: none; }
.a4-doc .amorce { color: #7c7c7c; font-style: italic; font-weight: 400; background: #eeeeee; border-radius: 3px; padding: 0 2px; cursor: pointer; user-select: none; -webkit-user-select: none; }
.a4-doc .amorce:hover { background: #e0e0e0; color: #444; }
.a4-doc .amorce.visee { background: var(--accent-doux); color: var(--accent); outline: 2px solid var(--accent); outline-offset: 1px; }   /* visée depuis « À compléter » */
.a4-doc .b-saut { display: flex; align-items: center; gap: 8px; min-height: 0; height: 16px; color: #9a9a9a; font: 700 8pt/1 system-ui, sans-serif; letter-spacing: .08em; text-transform: uppercase; user-select: none; -webkit-user-select: none; white-space: nowrap; }
.a4-doc .b-saut::before, .a4-doc .b-saut::after { content: ""; flex: 1; border-top: 1px dashed #bdbdbd; }
.a4-doc .b-tableau td { outline: none; }
.a4-doc .b-tableau td:focus { box-shadow: inset 0 0 0 1px #7eaee0; }
.a4-doc ::selection { background: #b6d4f5; }
.a4-tel { max-width: 400px; margin: 12px auto 0; border: 10px solid #2b282c; border-radius: 30px; background: #fff; overflow: hidden; max-height: 78vh; overflow-y: auto; }
.a4-tel .fdr { border: 0; border-radius: 0; box-shadow: none; }
@media (max-width: 700px) { .a4-vues { margin-left: 0; } .a4-bureau { padding: 12px 6px 16px; } .a4-b { padding: 6px 8px; font-size: 13.5px; } }
`;
  document.head.append(s);
}
// extra : {lire, ecrire}, ce qui va avec les blocs dans l'historique (les clés composées d'une feuille : annuler une mise à
// jour depuis la base les rend aussi)
function editeurA4(hote, { blocs = [], noms = [], ref = '', quandChange = () => {}, quandEtat = () => {}, quandZoom = () => {}, extra = null } = {}) {
  stylesA4();
  const M = FEUILLE.MISE;
  const PAGE = M.hauteur * PX_MM, ECART = 10 * PX_MM, PAS = PAGE + ECART, LARGE = M.largeur * PX_MM;
  const HAUT = M.haut * PX_MM, BAS = (M.hauteur - M.bas) * PX_MM, UTILE = BAS - HAUT, SOUS_LOGO = (M.haut + M.logo + M.sousLogo) * PX_MM;
  hote.innerHTML = `<div class="a4-bureau"><div class="a4-echelle"><div class="a4-pile"><div class="a4-feuilles"></div>
    <div class="a4-doc" id="a4-doc" contenteditable="true" spellcheck="true" lang="fr" role="textbox" aria-multiline="true" aria-label="La feuille de route, sur sa page A4" aria-describedby="a4-aide"></div></div></div></div>`;
  const bureau = $('.a4-bureau', hote), echelle = $('.a4-echelle', hote), pile = $('.a4-pile', hote), feuilles = $('.a4-feuilles', hote), doc = $('.a4-doc', hote);
  let B = (blocs.length ? blocs : [{ type: 'ligne', segments: [] }]).map(b => FEUILLE.bloc(b));
  // le zoom de la page : 'auto' (« Ajuster » : la largeur disponible, sans jamais dépasser 100 %) ou un pourcentage de 50 à 200, gardé avec
  // le compte (fenetres.a4-zoom, une seule clé pour toutes les feuilles). Sous un zoom fixe, l'échelle est celle-là, telle quelle : le
  // bureau gris défile quand la page le dépasse. La pagination mesure par offsetTop / offsetHeight, que l'échelle ne change pas.
  // Le téléphone et le doigt n'ont pas ce zoom (FENETRES.actif) : la page y reste ajustée, sans groupe de zoom dans la barre ni Ctrl + molette.
  const zoomLibre = () => typeof FENETRES !== 'undefined' && FENETRES.actif();
  let zoom = (zoomLibre() && FENETRES.taille('a4-zoom')) || 'auto', echelleVue = null, rangement = 0, molette = 0, cumulMolette = 0;
  let debuts = [], logo = null, enAttente = null, attenteOu = '', compose = false, derniere = null, vivant = true, nPages = 0, prevu = 0;
  const H = { avant: [], apres: [], t: 0, dernier: '' };

  // ---------------------------------------------------------------------------------------------- texte et segments
  const T = b => FEUILLE.texteBloc(b);
  const dansCellule = p => p && p.r != null;
  const segsDe = (b, p) => dansCellule(p) ? (b.lignes[p.r] || [])[p.c] || [] : b.segments || [];
  const poserSegs = (b, p, xs) => { if (dansCellule(p)) b.lignes[p.r][p.c] = FEUILLE.segments(xs); else b.segments = FEUILLE.segments(xs); };
  const longueur = (b, p) => segsDe(b, p).filter(s => !s.amorce).reduce((n, s) => n + s.texte.length, 0);
  // couper des segments à un rang ; une amorce compte pour zéro et reste avec ce qui la précède (sauf au tout début)
  function couper(xs, o) {
    const g = [], d = [];
    let n = 0;
    for (const s of xs) {
      if (s.amorce) { (o > 0 && n <= o ? g : d).push({ ...s }); continue; }
      const L = s.texte.length;
      if (n + L <= o) g.push({ ...s });
      else if (n >= o) d.push({ ...s });
      else { g.push({ ...s, texte: s.texte.slice(0, o - n) }); d.push({ ...s, texte: s.texte.slice(o - n) }); }
      n += L;
    }
    return [g, d];
  }
  // la mise en forme à un rang : celle du caractère d'avant (ou d'après, au début)
  function marquesA(xs, o) {
    let n = 0, avant = null, apres = null;
    for (const s of xs) {
      if (s.amorce) continue;
      const L = s.texte.length;
      if (n < o && n + L >= o) avant = s;
      if (!apres && n <= o && n + L > o) apres = s;
      n += L;
    }
    const s = avant || apres || {};
    return { gras: !!s.gras, italique: !!s.italique, rouge: !!s.rouge, surligne: !!s.surligne };
  }
  function marquer(xs, de, a, k, v) {
    const [g, reste] = couper(xs, de), [m, d] = couper(reste, a - de);
    return [...g, ...m.map(s => (s.amorce ? s : { ...s, [k]: v })), ...d];
  }
  const aMarque = (xs, de, a, k) => { const [, reste] = couper(xs, de), [m] = couper(reste, a - de); const t = m.filter(s => !s.amorce && s.texte); return t.length > 0 && t.every(s => s[k]); };
  // le mot autour d'un rang, pour mettre en gras sans sélection
  function motAutour(xs, o) {
    const t = xs.filter(s => !s.amorce).map(s => s.texte).join(''), lettre = c => !!c && /[\p{L}\p{N}'’-]/u.test(c);
    if (!lettre(t[o - 1]) || !lettre(t[o])) return null;
    let a = o, b = o;
    while (a > 0 && lettre(t[a - 1])) a--;
    while (b < t.length && lettre(t[b])) b++;
    return [a, b];
  }

  // ---------------------------------------------------------------------------------------------- le DOM
  function element(b) {
    const t = document.createElement('template');
    t.innerHTML = b.type === 'saut' ? '<div class="b b-saut" contenteditable="false">Saut de page</div>' : FEUILLE.htmlBloc(b, { amorces: true });
    const el = t.content.firstElementChild;
    el.dataset.id = b.id;
    if (b.source === 'base') el.classList.add('base');
    if (b.type === 'tableau') { el.contentEditable = 'false'; el.querySelectorAll('td').forEach(td => { td.contentEditable = 'true'; }); }
    return el;
  }
  function toutRendre() { doc.replaceChildren(...B.map(element)); paginerBientot(); }
  function rendre(i) { const el = doc.children[i], n = element(B[i]); if (el) el.replaceWith(n); else doc.append(n); }
  const TYPES_CLASSE = ['entete', 'rubrique', 'sous-titre', 'jour', 'ligne', 'puce', 'alerte'];
  // les segments écrits dans un élément (les marques viennent de nos classes, ou des balises et styles qu'un navigateur
  // ajoute parfois en cours de frappe)
  function lireSegments(racine) {
    const out = [];
    const marche = (n, m) => {
      if (n.nodeType === 3) { if (n.data) out.push({ texte: n.data.replace(/\u200b/g, ''), ...m }); return; }
      if (n.nodeType !== 1) return;
      if (n.classList.contains('amorce')) { out.push({ texte: n.dataset.amorce || n.textContent, amorce: true }); return; }
      if (n.tagName === 'BR') return;
      const x = marquesElement(n, m);
      n.childNodes.forEach(c => marche(c, x));
    };
    racine.childNodes.forEach(c => marche(c, {}));
    return FEUILLE.segments(out);
  }
  function lireBloc(n, ancien) {
    if (n.nodeType !== 1) return FEUILLE.bloc({ type: 'ligne', segments: [{ texte: n.textContent || '' }] });
    if (n.classList.contains('b-saut')) return FEUILLE.bloc({ ...(ancien || {}), type: 'saut' });
    if (n.classList.contains('b-tableau') || n.querySelector('table')) return FEUILLE.bloc({ ...(ancien || {}), type: 'tableau', lignes: [...n.querySelectorAll('tr')].map(tr => [...tr.children].map(td => lireSegments(td))) });
    const type = ancien && !['saut', 'tableau'].includes(ancien.type) ? ancien.type : TYPES_CLASSE.find(t => n.classList.contains('b-' + t)) || 'ligne';
    return FEUILLE.bloc({ ...(ancien || {}), type, segments: lireSegments(n) });
  }
  const memeTexte = (a, b) => JSON.stringify([a.type, a.segments, a.lignes]) === JSON.stringify([b.type, b.segments, b.lignes]);
  const retouche = b => { delete b.source; if (b.type === 'jour') { const j = FEUILLE.dateDuTexte(T(b), ref); if (j) b.date = j; } };
  // après une frappe : le modèle relu dans la page, et la page remise au propre là où le navigateur a improvisé
  function synchroniser() {
    const sel = lireSelection();
    const parId = new Map(B.map(b => [b.id, b])), vus = new Set();
    const noeuds = [...doc.childNodes].filter(n => n.nodeType === 1 || (n.nodeType === 3 && n.data.trim()));
    let structure = noeuds.length !== doc.childNodes.length;
    let nouveaux = noeuds.map(n => {
      let id = n.nodeType === 1 ? n.dataset.id : null;
      const ancien = id && !vus.has(id) ? parId.get(id) : null;
      if (!ancien) { structure = true; id = FEUILLE.nouvelId(); }
      vus.add(id);
      const b = lireBloc(n, ancien);
      b.id = id;
      if (!ancien) { delete b.cle; delete b.source; delete b.origine; }
      else if (!memeTexte(ancien, b)) retouche(b);
      return b;
    });
    if (!nouveaux.length) { nouveaux = [FEUILLE.bloc({ type: 'ligne', segments: [] })]; structure = true; }
    B = nouveaux;
    if (structure) { toutRendre(); if (sel) placer(sel); }
    else {
      let redessine = false;
      B.forEach((b, i) => { const el = doc.children[i], c = element(b); if (el.className !== c.className || el.innerHTML !== c.innerHTML) { el.replaceWith(c); redessine = true; } });
      if (redessine && sel) placer(sel);
    }
    change();
  }

  // ---------------------------------------------------------------------------------------------- la sélection
  const enfants = () => [...doc.children];
  function decalage(conteneur, node, offset) {
    const r = document.createRange();
    r.setStart(conteneur, 0); r.setEnd(node, offset);
    const f = r.cloneContents();
    f.querySelectorAll('.amorce').forEach(x => x.remove());
    return f.textContent.length;
  }
  function pos(node, offset) {
    if (node === doc) {
      const xs = enfants();
      if (!xs.length) return null;
      if (offset < xs.length) return { i: offset, o: 0 };
      return { i: xs.length - 1, o: longueur(B[xs.length - 1]) };
    }
    let el = node.nodeType === 1 ? node : node.parentNode;
    while (el && el.parentNode !== doc) el = el.parentNode;
    if (!el) return null;
    const i = enfants().indexOf(el);
    if (i < 0 || !B[i]) return null;
    if (B[i].type === 'saut') return { i, o: 0 };
    if (B[i].type === 'tableau') {
      const td = (node.nodeType === 1 ? node : node.parentNode).closest('td');
      if (!td || !el.contains(td)) return { i, r: 0, c: 0, o: 0 };
      const tr = td.parentNode;
      return { i, r: [...tr.parentNode.children].indexOf(tr), c: [...tr.children].indexOf(td), o: decalage(td, node, offset) };
    }
    return { i, o: decalage(el, node, offset) };
  }
  function point(p) {
    const el = doc.children[p.i];
    if (!el) return null;
    let conteneur = el;
    if (B[p.i]?.type === 'tableau') { const td = el.querySelectorAll('tr')[p.r || 0]?.children[p.c || 0]; if (!td) return { node: el, offset: 0 }; conteneur = td; }
    if (B[p.i]?.type === 'saut') return { node: doc, offset: p.i };
    let reste = p.o || 0, dernier = null, t;
    const w = document.createTreeWalker(conteneur, NodeFilter.SHOW_TEXT, { acceptNode: x => (x.parentNode.closest('.amorce') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    while ((t = w.nextNode())) { if (reste <= t.data.length) return { node: t, offset: reste }; reste -= t.data.length; dernier = t; }
    if (dernier) return { node: dernier, offset: dernier.data.length };
    const br = [...conteneur.childNodes].findIndex(n => n.nodeName === 'BR');
    return { node: conteneur, offset: br >= 0 ? br : conteneur.childNodes.length };
  }
  function lireSelection() {
    const s = document.getSelection();
    if (!s || !s.rangeCount) return null;
    const r = s.getRangeAt(0);
    if (!doc.contains(r.startContainer) || !doc.contains(r.endContainer)) return null;
    const a = pos(r.startContainer, r.startOffset), b = r.collapsed ? a : pos(r.endContainer, r.endOffset);
    return a && b ? { a, b } : null;
  }
  function placer(sel) {
    if (!sel || !vivant) return;
    const a = point(sel.a), b = sel.b ? point(sel.b) : a;
    if (!a || !b) return;
    const hoteFocus = (a.node.nodeType === 1 ? a.node : a.node.parentNode).closest('td[contenteditable="true"]') || doc;
    if (document.activeElement !== hoteFocus) hoteFocus.focus({ preventScroll: true });
    try { document.getSelection().setBaseAndExtent(a.node, a.offset, b.node, b.offset); } catch (e) { /* une position qui n'existe plus */ }
    derniere = { a: sel.a, b: sel.b || sel.a };
  }
  const cmp = (x, y) => x.i - y.i || (x.r ?? -1) - (y.r ?? -1) || (x.c ?? -1) - (y.c ?? -1) || x.o - y.o;
  const ordonner = sel => cmp(sel.a, sel.b) <= 0 ? { a: sel.a, b: sel.b } : { a: sel.b, b: sel.a };
  const vide = sel => cmp(sel.a, sel.b) === 0;
  const memeConteneur = (x, y) => x.i === y.i && (x.r ?? -1) === (y.r ?? -1) && (x.c ?? -1) === (y.c ?? -1);
  const cleOu = p => p ? `${p.i}.${p.r ?? ''}.${p.c ?? ''}.${p.o}` : '';

  // ---------------------------------------------------------------------------------------------- l'historique
  function noter(fort = false) {
    const t = Date.now();
    if (!fort && H.dernier === 'frappe' && t - H.t < 1200) { H.t = t; return; }
    H.avant.push({ blocs: clone(B), sel: lireSelection() || derniere, extra: extra ? clone(extra.lire()) : null });
    if (H.avant.length > 300) H.avant.shift();
    H.apres = [];
    H.t = t; H.dernier = fort ? 'action' : 'frappe';
  }
  function revenir(de, vers) {
    if (!de.length) return;
    vers.push({ blocs: clone(B), sel: lireSelection() || derniere, extra: extra ? clone(extra.lire()) : null });
    const x = de.pop();
    B = x.blocs.map(b => FEUILLE.bloc(b));
    if (extra && x.extra) extra.ecrire(x.extra);
    toutRendre();
    if (x.sel && B[x.sel.a.i] && B[(x.sel.b || x.sel.a).i]) placer(x.sel);
    H.dernier = '';
    change();
  }
  const annuler = () => revenir(H.avant, H.apres), retablir = () => revenir(H.apres, H.avant);

  // ---------------------------------------------------------------------------------------------- les opérations
  function change() { paginerBientot(); quandChange(); signaler(); }
  // effacer une plage (sur un ou plusieurs blocs) ; renvoie où mettre le curseur
  function effacerPlage(sel) {
    let { a, b } = ordonner(sel);
    if (memeConteneur(a, b)) {
      const x = B[a.i];
      if (x.type === 'saut') { B.splice(a.i, 1); if (!B.length) B.push(FEUILLE.bloc({ type: 'ligne' })); return { i: Math.min(a.i, B.length - 1), o: 0 }; }
      const xs = segsDe(x, a), [g] = couper(xs, a.o), [, d] = couper(xs, b.o);
      poserSegs(x, a, [...g, ...d]); retouche(x);
      return a;
    }
    if (a.i === b.i && B[a.i].type === 'tableau') {
      // d'une cellule à l'autre du même tableau : les cellules entre les deux se vident
      const x = B[a.i], ordre = (r, c) => r * 1000 + c;
      x.lignes.forEach((l, r) => l.forEach((cel, c) => {
        const k = ordre(r, c), ka = ordre(a.r, a.c), kb = ordre(b.r, b.c);
        if (k < ka || k > kb) return;
        const [g] = couper(cel, k === ka ? a.o : 0), [, d] = couper(cel, k === kb ? b.o : Infinity);
        x.lignes[r][c] = FEUILLE.segments(k === ka && k === kb ? [...g, ...d] : k === ka ? g : k === kb ? d : []);
      }));
      return a;
    }
    // d'un bloc à l'autre : le début du premier et la fin du dernier se rejoignent ; un tableau touché part en entier.
    // Effacé depuis le tout début du premier, c'est le dernier qui reste (son type, sa ligne d'origine)
    const A = B[a.i], Z = B[b.i], texte = x => !['saut', 'tableau'].includes(x.type);
    const gauche = texte(A) ? couper(A.segments, a.o)[0] : [];
    const droite = texte(Z) ? couper(Z.segments, b.o)[1] : [];
    let garde;
    if (gauche.some(s => s.texte || s.amorce)) { garde = A; A.segments = FEUILLE.segments([...gauche, ...droite]); retouche(A); }
    else if (texte(Z)) { garde = Z; if (b.o > 0) { Z.segments = FEUILLE.segments(droite); retouche(Z); } }
    else garde = FEUILLE.bloc({ type: 'ligne', segments: [] });
    B.splice(a.i, b.i - a.i + 1, garde);
    return { i: a.i, o: garde === A ? a.o : 0 };
  }
  function insererTexte(p, texte, marques) {
    const x = B[p.i];
    if (!x || x.type === 'saut') return p;
    const xs = segsDe(x, p), [g, d] = couper(xs, p.o), m = marques || marquesA(xs, p.o);
    const propre = String(texte).replace(/\r\n?|\n|\t/g, ' ');
    poserSegs(x, p, [...g, { texte: propre, ...m }, ...d]); retouche(x);
    return { ...p, o: p.o + propre.length };
  }
  function remplacerPlage(sel, texte) {
    noter(true);
    let p = effacerPlage(sel);
    if (texte) p = insererTexte(p, texte, enAttente && attenteOu === cleOu(sel.a) ? enAttente : null);
    enAttente = null;
    toutRendre(); placer({ a: p, b: p }); change();
  }
  // Entrée : le bloc se coupe en deux ; après un titre, une ligne ; une puce vide redevient une ligne
  function entree(sel) {
    noter(true);
    let p = vide(sel) ? sel.a : effacerPlage(sel);
    const x = B[p.i];
    if (x.type === 'tableau') {
      const r = (p.r ?? x.lignes.length - 1) + 1;
      x.lignes.splice(r, 0, x.lignes[0].map(() => []));
      toutRendre(); placer({ a: { i: p.i, r, c: 0, o: 0 } }); change(); return;
    }
    if (x.type === 'saut') { B.splice(p.i + 1, 0, FEUILLE.bloc({ type: 'ligne' })); toutRendre(); placer({ a: { i: p.i + 1, o: 0 } }); change(); return; }
    if (x.type === 'puce' && !T(x).trim()) { x.type = 'ligne'; delete x.source; rendre(p.i); placer({ a: { i: p.i, o: 0 } }); change(); return; }
    const suite = x.type === 'entete' ? (B[p.i + 1]?.type === 'entete' ? 'entete' : 'ligne') : x.type === 'puce' ? 'puce' : 'ligne';
    if (p.o === 0 && T(x).length) {
      // au début d'une ligne : une ligne vide se glisse avant, la ligne reste entière
      B.splice(p.i, 0, FEUILLE.bloc({ type: x.type === 'puce' ? 'puce' : x.type === 'entete' ? 'entete' : 'ligne', petit: x.petit }));
      toutRendre(); placer({ a: { i: p.i + 1, o: 0 } }); change(); return;
    }
    const [g, d] = couper(x.segments, p.o);
    x.segments = FEUILLE.segments(g);
    if (d.some(s => !s.amorce && s.texte)) retouche(x);
    B.splice(p.i + 1, 0, FEUILLE.bloc({ type: suite, segments: d, petit: suite === 'entete' && x.petit }));
    toutRendre(); placer({ a: { i: p.i + 1, o: 0 } }); change();
  }
  // effacer au début d'un bloc : une puce redevient une ligne ; sinon le bloc rejoint le précédent
  function effacerAvant(i) {
    const x = B[i], p = B[i - 1];
    if (x.type === 'puce') { noter(true); x.type = 'ligne'; delete x.source; rendre(i); placer({ a: { i, o: 0 } }); change(); return; }
    if (!p) return;
    if (p.type === 'tableau') { placer({ a: { i: i - 1, r: p.lignes.length - 1, c: p.lignes[0].length - 1, o: longueur(p, { r: p.lignes.length - 1, c: p.lignes[0].length - 1 }) } }); return; }
    noter(true);
    if (p.type === 'saut' || !FEUILLE.texteBloc(p, true).length) { B.splice(i - 1, 1); toutRendre(); placer({ a: { i: i - 1, o: 0 } }); change(); return; }
    const o = longueur(p);
    p.segments = FEUILLE.segments([...p.segments, ...x.segments]);
    if (FEUILLE.texteBloc(x, true).length) retouche(p);
    B.splice(i, 1);
    toutRendre(); placer({ a: { i: i - 1, o } }); change();
  }
  // effacer à la fin d'un bloc : le suivant le rejoint (un saut de page s'efface)
  function effacerApres(i) {
    const x = B[i], n = B[i + 1];
    if (!n || n.type === 'tableau') return;
    noter(true);
    if (n.type === 'saut') { B.splice(i + 1, 1); toutRendre(); placer({ a: { i, o: longueur(x) } }); change(); return; }
    if (!FEUILLE.texteBloc(x, true).length) { B.splice(i, 1); toutRendre(); placer({ a: { i, o: 0 } }); change(); return; }
    const o = longueur(x);
    x.segments = FEUILLE.segments([...x.segments, ...n.segments]);
    if (FEUILLE.texteBloc(n, true).length) retouche(x);
    B.splice(i + 1, 1);
    toutRendre(); placer({ a: { i, o } }); change();
  }
  // coller des blocs au curseur : au bout d'une ligne, ils viennent dessous ; au début, dessus (la ligne reste entière) ;
  // sur une ligne vide, à sa place ; au milieu, la ligne se coupe et ses deux morceaux encadrent ce qui est collé
  function insererBlocs(p, xs) {
    const x = B[p.i];
    if (dansCellule(p) || x.type === 'tableau') { const q = insererTexte(p, xs.map(T).filter(Boolean).join(' '), null); rendre(p.i); placer({ a: q }); change(); return; }
    if (x.type === 'saut') { B.splice(p.i + 1, 0, FEUILLE.bloc({ type: 'ligne' })); p = { i: p.i + 1, o: 0 }; }
    const y = B[p.i];
    const [g, d] = couper(y.segments, p.o);
    const rien = segs => !segs.some(s => s.amorce || s.texte), texte = b => !['tableau', 'saut'].includes(b.type);
    if (xs.length === 1 && texte(xs[0])) {
      y.segments = FEUILLE.segments([...g, ...xs[0].segments, ...d]);
      if (rien(g) && rien(d) && xs[0].type !== 'ligne') y.type = xs[0].type;
      retouche(y);
      rendre(p.i); placer({ a: { i: p.i, o: p.o + T(xs[0]).length } }); change(); return;
    }
    const colles = xs.map(b => FEUILLE.bloc({ ...b, id: null, cle: null, source: null, origine: null }));
    const fin = b => ({ i: B.indexOf(b), o: texte(b) ? longueur(b) : 0 });
    // collés en lignes entières : sans espace au bord
    const ras = () => colles.forEach(b => { if (!texte(b) || !b.segments.length) return; b.segments[0].texte = b.segments[0].texte.replace(/^[\s\u00a0]+/, ''); const z = b.segments[b.segments.length - 1]; z.texte = z.texte.replace(/[\s\u00a0]+$/, ''); b.segments = FEUILLE.segments(b.segments); });
    let caret;
    if (rien(g) || rien(d)) ras();
    if (rien(g) && rien(d)) { B.splice(p.i, 1, ...colles); caret = fin(colles[colles.length - 1]); }
    else if (rien(g)) { B.splice(p.i, 0, ...colles); caret = { i: p.i + colles.length, o: 0 }; }
    else if (rien(d)) { B.splice(p.i + 1, 0, ...colles); caret = fin(colles[colles.length - 1]); }
    else {
      const typeY = y.type, petitY = !!y.petit;
      let suite = colles;
      if (texte(colles[0])) { y.segments = FEUILLE.segments([...g, ...colles[0].segments]); suite = colles.slice(1); } else y.segments = FEUILLE.segments(g);
      retouche(y);
      let dernier = suite[suite.length - 1];
      if (!dernier || !texte(dernier)) { dernier = FEUILLE.bloc({ type: typeY, segments: [] }); suite = [...suite, dernier]; }
      const o = longueur(dernier);
      dernier.segments = FEUILLE.segments([...dernier.segments, ...d]);
      dernier.type = typeY; if (petitY) dernier.petit = true;
      B.splice(p.i + 1, 0, ...suite);
      caret = { i: p.i + suite.length, o };
    }
    if (caret.i < 0) caret = { i: Math.min(p.i, B.length - 1), o: 0 };
    toutRendre(); placer({ a: caret }); change();
  }

  // ---------------------------------------------------------------------------------------------- les commandes
  function basculer(k) {
    let sel = lireSelection() || derniere;
    if (!sel) return;
    let garder = null;
    if (vide(sel)) {
      const x = B[sel.a.i];
      if (!x || x.type === 'saut') return;
      const mot = motAutour(segsDe(x, sel.a), sel.a.o);
      if (!mot) {
        // rien de sélectionné : ce qu'on va écrire prendra la marque
        const m = enAttente && attenteOu === cleOu(sel.a) ? enAttente : marquesA(segsDe(x, sel.a), sel.a.o);
        enAttente = { ...m, [k]: !m[k] }; attenteOu = cleOu(sel.a);
        placer(sel); signaler(); return;
      }
      garder = sel;
      sel = { a: { ...sel.a, o: mot[0] }, b: { ...sel.a, o: mot[1] } };
    }
    const { a, b } = ordonner(sel);
    const morceaux = [];
    for (let i = a.i; i <= b.i; i++) {
      const x = B[i];
      if (x.type === 'saut') continue;
      if (x.type === 'tableau') {
        x.lignes.forEach((l, r) => l.forEach((cel, c) => {
          const p = { i, r, c }, apresA = i > a.i || (r * 1000 + c) >= ((a.r ?? 0) * 1000 + (a.c ?? 0)), avantB = i < b.i || (r * 1000 + c) <= ((b.r ?? 1e6) * 1000 + (b.c ?? 0));
          if (apresA && avantB) morceaux.push({ p, de: i === a.i && r === a.r && c === a.c ? a.o : 0, a: i === b.i && r === b.r && c === b.c ? b.o : longueur(x, p) });
        }));
        continue;
      }
      morceaux.push({ p: { i }, de: i === a.i ? a.o : 0, a: i === b.i ? b.o : longueur(x) });
    }
    const utiles = morceaux.filter(m => m.a > m.de);
    if (!utiles.length) return;
    noter(true);
    const deja = utiles.every(m => aMarque(segsDe(B[m.p.i], m.p), m.de, m.a, k));
    utiles.forEach(m => { const x = B[m.p.i]; poserSegs(x, m.p, marquer(segsDe(x, m.p), m.de, m.a, k, !deja)); retouche(x); });
    [...new Set(utiles.map(m => m.p.i))].forEach(rendre);
    placer(garder || sel); change();
  }
  function changerType(type) {
    const sel = lireSelection() || derniere;
    if (!sel) return;
    const { a, b } = ordonner(sel), idx = [];
    for (let i = a.i; i <= b.i; i++) if (!['saut', 'tableau'].includes(B[i].type)) idx.push(i);
    if (!idx.length) return;
    noter(true);
    const cible = type === 'puce' && idx.every(i => B[i].type === 'puce') ? 'ligne' : type;
    idx.forEach(i => { const x = B[i]; if (x.type === cible) return; x.type = cible; delete x.petit; delete x.date; retouche(x); rendre(i); });
    placer(sel); change();
  }
  function saut() {
    let sel = lireSelection() || derniere;
    if (!sel) return;
    noter(true);
    let p = vide(sel) ? sel.a : effacerPlage(sel);
    const x = B[p.i];
    let k;
    if (['tableau', 'saut'].includes(x.type)) k = p.i + 1;
    else if (p.o === 0 && T(x).length) k = p.i;
    else if (p.o >= longueur(x)) k = p.i + 1;
    else {
      const [g, d] = couper(x.segments, p.o);
      x.segments = FEUILLE.segments(g); retouche(x);
      B.splice(p.i + 1, 0, FEUILLE.bloc({ type: x.type === 'puce' ? 'puce' : 'ligne', segments: d }));
      k = p.i + 1;
    }
    B.splice(k, 0, FEUILLE.bloc({ type: 'saut' }));
    if (!B[k + 1]) B.push(FEUILLE.bloc({ type: 'ligne' }));
    toutRendre(); placer({ a: { i: k + 1, o: 0 } }); change();
  }
  // les prénoms de l'équipe et « tout le monde », surlignés d'un coup dans le planning (sinon dans toute la feuille)
  function surlignerNoms() {
    const plat = s => s.split('').map(c => (norm(c)[0] || c)).join('').replace(/’/g, "'");
    const mots = [...new Set([...noms, 'tout le monde', 'toute l’équipe'].map(x => plat(String(x).trim())).filter(Boolean))].sort((x, y) => y.length - x.length);
    let de = B.findIndex(x => x.type === 'rubrique' && /planning/.test(norm(T(x)))), fin = B.length;
    if (de >= 0) { const k = B.findIndex((x, i) => i > de && x.type === 'rubrique'); if (k > 0) fin = k; } else de = B.findIndex(x => x.type !== 'entete') - 1;
    const touches = [];
    let n = 0, note = false;
    for (let i = de + 1; i < fin; i++) {
      const x = B[i];
      if (!['ligne', 'puce', 'alerte', 'jour'].includes(x.type)) continue;
      const t = plat(T(x));
      let xs = x.segments, change_ = false;
      mots.forEach(m => {
        let k = 0;
        while ((k = t.indexOf(m, k)) >= 0) {
          const av = t[k - 1], ap = t[k + m.length];
          if ((!av || !/[a-z0-9]/.test(av)) && (!ap || !/[a-z0-9]/.test(ap)) && !aMarque(xs, k, k + m.length, 'surligne')) {
            if (!note) { noter(true); note = true; }
            xs = marquer(xs, k, k + m.length, 'surligne', true); change_ = true; n++;
          }
          k += m.length;
        }
      });
      if (change_) { x.segments = FEUILLE.segments(xs); retouche(x); touches.push(i); }
    }
    if (touches.length) { const sel = lireSelection() || derniere; touches.forEach(rendre); if (sel) placer(sel); change(); }
    return n;
  }

  // ---------------------------------------------------------------------------------------------- coller
  function couleur(c) {
    c = String(c || '').trim().toLowerCase();
    if (!c || ['transparent', 'inherit', 'initial', 'auto', 'windowtext', 'none', 'currentcolor'].includes(c)) return null;
    const noms = { red: [255, 0, 0], darkred: [139, 0, 0], crimson: [220, 20, 60], firebrick: [178, 34, 34], yellow: [255, 255, 0], white: [255, 255, 255], black: [0, 0, 0],
      lime: [0, 255, 0], green: [0, 128, 0], cyan: [0, 255, 255], aqua: [0, 255, 255], magenta: [255, 0, 255], fuchsia: [255, 0, 255], blue: [0, 0, 255], gray: [128, 128, 128], grey: [128, 128, 128], orange: [255, 165, 0], darkyellow: [128, 128, 0], lightgray: [211, 211, 211] };
    if (noms[c]) return noms[c];
    let m = /^#([0-9a-f]{3})$/.exec(c);
    if (m) return m[1].split('').map(x => parseInt(x + x, 16));
    m = /^#([0-9a-f]{6})/.exec(c);
    if (m) return [0, 2, 4].map(k => parseInt(m[1].slice(k, k + 2), 16));
    m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+)(%?))?/.exec(c);
    if (m) return m[4] != null && parseFloat(m[4]) === 0 ? null : [+m[1], +m[2], +m[3]];
    return null;
  }
  const estRouge = c => { const x = couleur(c); return !!x && x[0] >= 150 && x[1] <= 110 && x[2] <= 110; };
  const estFond = c => { const x = couleur(c); return !!x && !(x[0] >= 235 && x[1] >= 235 && x[2] >= 235); };
  // les marques d'un élément : nos classes, les balises (b, i, mark, font) et les styles de Word, Writer ou Google Docs
  function marquesElement(n, m) {
    const x = { ...m }, tag = n.tagName.toUpperCase(), cl = n.classList, st = n.style || {}, brut = (n.getAttribute('style') || '').toLowerCase();
    if (tag === 'B' || tag === 'STRONG' || cl.contains('g')) x.gras = true;
    if (tag === 'I' || tag === 'EM' || cl.contains('i')) x.italique = true;
    if (tag === 'MARK' || cl.contains('s')) x.surligne = true;
    if (cl.contains('r')) x.rouge = true;
    const fw = st.fontWeight;
    if (fw) x.gras = fw === 'bold' || fw === 'bolder' || +fw >= 600;
    const fs = st.fontStyle;
    if (fs) x.italique = fs === 'italic' || fs === 'oblique';
    const col = st.color || (tag === 'FONT' ? n.getAttribute('color') : '');
    if (col) x.rouge = estRouge(col);
    const fond = st.backgroundColor || (/mso-highlight\s*:\s*([^;]+)/.exec(brut) || [])[1];
    if (fond) x.surligne = estFond(fond);
    if (st.fontSize) { const v = parseFloat(st.fontSize); if (!isNaN(v)) x.taille = /px/.test(st.fontSize) ? v * 0.75 : /pt/.test(st.fontSize) ? v : x.taille; }
    if (n.dataset?.doc) x.doc = /^\d+$/.test(n.dataset.doc) ? +n.dataset.doc : n.dataset.doc;
    if (n.dataset?.lien) x.lien = n.dataset.lien;
    return x;
  }
  const BLOCS_HTML = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'PRE', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'ADDRESS', 'DT', 'DD', 'UL', 'OL', 'DL', 'CENTER', 'FIGURE', 'TR', 'TBODY', 'THEAD']);
  const PUCE_TEXTE = /^\s*(?:[•·▪◦‣○●■□➢➤►▸–—-]|\*|o(?=\s))\s+/;
  // du HTML collé (Word, Writer, Google Docs, une page web, cette page) → des blocs, ramenés aux formes de la feuille
  function depuisHtml(html) {
    const d = new DOMParser().parseFromString(html, 'text/html');
    d.querySelectorAll('style, script, meta, link, title, xml, template, noscript, .amorce').forEach(x => x.remove());
    [...d.body.getElementsByTagName('*')].forEach(x => { if (/^o:p$/i.test(x.tagName) || /mso-list\s*:\s*ignore/i.test(x.getAttribute('style') || '')) x.remove(); });
    const sortie = [];
    let cur = null, attente = 'ligne';
    const texte = (t, m) => {
      if (!cur) { if (!t.replace(/[\s\u00a0]/g, '')) return; cur = { type: attente, segments: [], tailles: [] }; sortie.push(cur); }
      cur.segments.push({ texte: t, gras: m.gras, italique: m.italique, rouge: m.rouge, surligne: m.surligne, doc: m.doc, lien: m.lien });
      if (m.taille) cur.tailles.push(m.taille);
    };
    const typeHtml = (n, tag) => {
      const t = TYPES_CLASSE.find(k => n.classList.contains('b-' + k));
      if (t) return t;
      if (tag === 'LI') return 'puce';
      if (tag === 'H1' || tag === 'H2') return 'rubrique';
      if (/^H[3-6]$/.test(tag)) return 'sous-titre';
      if (/MsoListParagraph/i.test(n.className) || /mso-list\s*:/i.test(n.getAttribute('style') || '')) return 'puce';
      return 'ligne';
    };
    // le texte d'une cellule de tableau, sur une ligne
    const cellules = (n, m) => {
      const out = [];
      const sous = (x, mm) => {
        if (x.nodeType === 3) { out.push({ texte: x.data.replace(/[ \t\r\n\f\u200b]+/g, ' '), ...mm }); return; }
        if (x.nodeType !== 1) return;
        if (x.tagName === 'BR' || BLOCS_HTML.has(x.tagName)) out.push({ texte: ' ' });
        const m2 = marquesElement(x, mm);
        delete m2.taille;
        x.childNodes.forEach(c => sous(c, m2));
      };
      n.childNodes.forEach(c => sous(c, m));
      const xs = FEUILLE.segments(out);
      if (xs.length) { xs[0].texte = xs[0].texte.replace(/^\s+/, ''); xs[xs.length - 1].texte = xs[xs.length - 1].texte.replace(/\s+$/, ''); }
      return FEUILLE.segments(xs);
    };
    const marche = (n, m, pre, parent = 'ligne') => {
      if (n.nodeType === 3) { const t = pre ? n.data.replace(/\n/g, ' ') : n.data.replace(/[ \t\r\n\f\u200b]+/g, ' '); if (t) texte(t, m); return; }
      if (n.nodeType !== 1) return;
      const tag = n.tagName.toUpperCase();
      if (tag === 'BR') { if (cur) { cur = null; attente = 'ligne'; } else sortie.push({ type: 'ligne', segments: [] }); return; }
      if (n.classList.contains('b-saut')) { cur = null; sortie.push({ type: 'saut' }); attente = 'ligne'; return; }
      if (tag === 'TABLE') {
        cur = null;
        const lignes = [...n.rows].slice(0, 60).map(tr => [...tr.cells].slice(0, 8).map(td => cellules(td, {})));
        const large = Math.max(1, ...lignes.map(l => l.length));
        if (lignes.length) sortie.push({ type: 'tableau', lignes: lignes.map(l => [...l, ...Array(large - l.length).fill([])]) });
        attente = 'ligne';
        return;
      }
      const m2 = marquesElement(n, m);
      if (BLOCS_HTML.has(tag)) {
        cur = null;
        if (['UL', 'OL', 'DL', 'TBODY', 'THEAD', 'TR'].includes(tag)) { n.childNodes.forEach(c => marche(c, m2, pre, parent)); cur = null; attente = 'ligne'; return; }
        const avant = sortie.length, t = typeHtml(n, tag);
        attente = t === 'ligne' && parent !== 'ligne' ? parent : t;
        const ici = attente;
        n.childNodes.forEach(c => marche(c, m2, pre || tag === 'PRE', ici));
        if (sortie.length === avant && (tag === 'P' || tag === 'DIV') && !n.querySelector('*:not(br)')) sortie.push({ type: 'ligne', segments: [] });
        cur = null; attente = 'ligne';
        return;
      }
      n.childNodes.forEach(c => marche(c, m2, pre, parent));
    };
    d.body.childNodes.forEach(c => marche(c, {}, false));
    return nettoyerColles(sortie);
  }
  function depuisTexte(t) {
    return nettoyerColles(String(t || '').replace(/\r\n?/g, '\n').split('\n').map(l => ({ type: 'ligne', segments: [{ texte: l.replace(/\t/g, ' ') }] })));
  }
  function nettoyerColles(xs) {
    let out = xs.map((b, k) => {
      if (b.type === 'saut' || b.type === 'tableau') return FEUILLE.bloc(b);
      const segs = FEUILLE.segments(b.segments);
      // les espaces au bord d'un paragraphe s'en vont, sauf au tout début et à la toute fin de ce qui est collé
      if (segs.length && k > 0) segs[0].texte = segs[0].texte.replace(/^[\s\u00a0]+/, '');
      if (segs.length && k < xs.length - 1) segs[segs.length - 1].texte = segs[segs.length - 1].texte.replace(/[\s\u00a0]+$/, '');
      let type = b.type;
      const x = FEUILLE.segments(segs), t = x.map(s => s.texte).join('');
      if (type === 'ligne' && x.length && PUCE_TEXTE.test(t)) { type = 'puce'; x[0].texte = x[0].texte.replace(PUCE_TEXTE, ''); }
      const pleins = x.filter(s => s.texte.trim()), gras = pleins.length > 0 && pleins.every(s => s.gras);
      if (type === 'ligne' && gras && t.length <= 60) {
        const grand = Math.max(0, ...(b.tailles || [])) >= 13;
        if (FEUILLE.dateDuTexte(t, ref) && t.length <= 40 && !FEUILLE.lireHeure(t)) type = 'jour';
        else if (grand || (t === t.toUpperCase() && /[A-ZÀ-Ý]{3}/.test(t) && t.length <= 40)) type = 'rubrique';
      }
      // un titre ne garde pas un gras qui est déjà le sien
      const y = TITRES_A4.has(type) ? x.map(s => ({ ...s, gras: false })) : x;
      return FEUILLE.bloc({ type, segments: y, date: type === 'jour' ? FEUILLE.dateDuTexte(t, ref) : undefined });
    });
    const vide = b => b.type !== 'saut' && b.type !== 'tableau' && !T(b).trim();
    out = out.filter((b, i) => !(vide(b) && i > 0 && vide(out[i - 1])));
    while (out.length && vide(out[0])) out.shift();
    while (out.length && vide(out[out.length - 1])) out.pop();
    return out;
  }

  // ---------------------------------------------------------------------------------------------- les événements
  const surBeforeInput = e => {
    if (!vivant) return;
    const t = e.inputType;
    if (t === 'historyUndo') { e.preventDefault(); annuler(); return; }
    if (t === 'historyRedo') { e.preventDefault(); retablir(); return; }
    if (t === 'formatBold') { e.preventDefault(); basculer('gras'); return; }
    if (t === 'formatItalic') { e.preventDefault(); basculer('italique'); return; }
    if (t.startsWith('format') || t === 'insertFromDrop' || t === 'deleteByDrag' || t === 'insertLink' || t === 'insertHorizontalRule' || t === 'insertOrderedList' || t === 'insertUnorderedList') { e.preventDefault(); return; }
    if (t === 'insertFromPaste' || t === 'insertFromPasteAsQuotation' || t === 'insertFromYank') return;
    const sel = lireSelection();
    if (!sel) return;
    if (t === 'insertParagraph' || t === 'insertLineBreak') { e.preventDefault(); entree(sel); return; }
    const plusieurs = !memeConteneur(sel.a, sel.b) || B[sel.a.i]?.type === 'saut';
    if (plusieurs && (t.startsWith('insert') || t.startsWith('delete'))) {
      e.preventDefault();
      remplacerPlage(sel, t === 'insertText' || t === 'insertReplacementText' ? (e.data ?? e.dataTransfer?.getData('text/plain') ?? '') : '');
      return;
    }
    if (vide(sel)) {
      const x = B[sel.a.i], cellule = dansCellule(sel.a);
      if (/^delete.*Backward$/.test(t) && sel.a.o === 0) { e.preventDefault(); if (!cellule) effacerAvant(sel.a.i); return; }
      if (/^delete.*Forward$/.test(t) && sel.a.o >= longueur(x, sel.a)) { e.preventDefault(); if (!cellule) effacerApres(sel.a.i); return; }
      if (t === 'insertText' && enAttente && attenteOu === cleOu(sel.a)) {
        e.preventDefault(); noter(true);
        const p = insererTexte(sel.a, e.data || '', enAttente);
        enAttente = null; rendre(sel.a.i); placer({ a: p }); change(); return;
      }
    }
    noter();
  };
  const surInput = e => { if (!vivant || compose || e.isComposing) return; synchroniser(); };
  const surPaste = e => {
    if (!vivant) return;
    e.preventDefault();
    const dt = e.clipboardData;
    if (!dt) return;
    const html = dt.getData('text/html'), texte = dt.getData('text/plain');
    let xs = html ? depuisHtml(html) : depuisTexte(texte);
    if (!xs.length && texte) xs = depuisTexte(texte);
    if (!xs.length) return;
    let sel = lireSelection() || derniere;
    if (!sel) return;
    noter(true);
    let p = vide(sel) ? sel.a : effacerPlage(sel);
    // une ligne de texte simple : telle quelle, avec la mise en forme du curseur
    if (!html && !/[\r\n]/.test(texte.replace(/[\r\n]+$/, ''))) { const q = insererTexte(p, texte.replace(/[\r\n]+$/, ''), null); toutRendre(); placer({ a: q }); change(); return; }
    insererBlocs(p, xs);
  };
  const surKeydown = e => {
    if (!vivant) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && !e.altKey) {
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); annuler(); return; }
      if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); retablir(); return; }
      if (k === 'b') { e.preventDefault(); basculer('gras'); return; }
      if (k === 'i') { e.preventDefault(); basculer('italique'); return; }
      if (k === 'u') { e.preventDefault(); return; }
      if (e.key === 'Enter') { e.preventDefault(); saut(); return; }
    }
    if (e.key === 'Tab') {
      const sel = lireSelection();
      if (sel && dansCellule(sel.a)) {
        e.preventDefault();
        const x = B[sel.a.i], nl = x.lignes.length, nc = x.lignes[0].length;
        let k = sel.a.r * nc + sel.a.c + (e.shiftKey ? -1 : 1);
        if (k >= nl * nc) { noter(true); x.lignes.push(x.lignes[0].map(() => [])); rendre(sel.a.i); }
        k = Math.max(0, k);
        placer({ a: { i: sel.a.i, r: Math.floor(k / nc), c: k % nc, o: 0 } });
      }
    }
  };
  const surMousedown = e => {
    const a = e.target.closest?.('.amorce');
    if (!a || !doc.contains(a)) return;
    e.preventDefault();
    const el = a.closest('[data-id]'), i = enfants().indexOf(el);
    if (i < 0) return;
    const td = a.closest('td'), p = td ? { i, r: [...td.parentNode.parentNode.children].indexOf(td.parentNode), c: [...td.parentNode.children].indexOf(td) } : { i };
    const k = [...(td || el).querySelectorAll('.amorce')].indexOf(a);
    noter(true);
    const x = B[i];
    let n = 0, vu = -1, o = 0;
    const reste = segsDe(x, p).filter(s => { if (s.amorce) { vu++; if (vu === k) { o = n; return false; } return true; } n += s.texte.length; return true; });
    // « heure ? : départ » → le curseur au début, prêt pour l'heure
    poserSegs(x, p, reste);
    rendre(i); placer({ a: { ...p, o } }); change();
  };
  const surSelection = () => {
    if (!vivant) return;
    const s = lireSelection();
    if (!s) return;
    if (enAttente && attenteOu !== cleOu(s.a)) enAttente = null;
    derniere = s;
    signaler();
  };
  const empecher = e => e.preventDefault();
  doc.addEventListener('beforeinput', surBeforeInput);
  doc.addEventListener('input', surInput);
  doc.addEventListener('compositionstart', () => { compose = true; });
  doc.addEventListener('compositionend', () => { compose = false; synchroniser(); });
  doc.addEventListener('paste', surPaste);
  doc.addEventListener('keydown', surKeydown);
  doc.addEventListener('mousedown', surMousedown);
  doc.addEventListener('dragstart', empecher);
  doc.addEventListener('drop', empecher);
  document.addEventListener('selectionchange', surSelection);

  // ---------------------------------------------------------------------------------------------- l'état (barre d'outils)
  function etat() {
    const sel = derniere, x = sel ? B[sel.a.i] : null;
    const e = { type: x?.type || '', annuler: H.avant.length > 0, retablir: H.apres.length > 0 };
    if (!x || x.type === 'saut') return e;
    if (vide(sel)) return { ...e, ...(enAttente && attenteOu === cleOu(sel.a) ? enAttente : marquesA(segsDe(x, sel.a), sel.a.o)) };
    const { a, b } = ordonner(sel);
    ['gras', 'rouge', 'surligne'].forEach(k => {
      const xs = [];
      for (let i = a.i; i <= b.i; i++) if (!['saut', 'tableau'].includes(B[i].type)) xs.push([i, i === a.i ? a.o : 0, i === b.i ? b.o : longueur(B[i])]);
      const pleins = xs.filter(([, de, fin]) => fin > de);
      e[k] = pleins.length > 0 && pleins.every(([i, de, fin]) => aMarque(B[i].segments, de, fin, k));
    });
    return e;
  }
  const signaler = () => quandEtat(etat());

  // ---------------------------------------------------------------------------------------------- les pages
  function marque() { return logo ? `<img class="a4-logo" src="${esc(FEUILLE.logoUrl())}" alt="">` : '<span class="a4-logo a4-badge">crescite</span>'; }
  function dessinerFeuilles(n) {
    if (n !== nPages) {
      feuilles.innerHTML = Array.from({ length: n }, (_, k) => `<div class="a4-feuille" style="top:${k * PAS}px">${k === 0 ? marque() : ''}${n > 1 ? `<span class="a4-num">${k + 1} / ${n}</span>` : ''}</div>`).join('');
      nPages = n;
    }
    pile.style.height = `${n * PAS - ECART}px`;
    doc.style.minHeight = `${n * PAS - ECART}px`;
    ajusterEchelle();
  }
  function ajusterEchelle() {
    const dispo = bureau.clientWidth - 2 * (bureau.clientWidth < 500 ? 6 : 16);
    const fixe = zoom !== 'auto' && zoomLibre();
    const s = fixe ? zoom / 100 : Math.min(1, Math.max(0.2, dispo / LARGE));
    pile.style.transform = s !== 1 ? `scale(${s})` : '';
    echelle.style.width = `${LARGE * s}px`;
    echelle.style.height = `${pile.offsetHeight * s}px`;
    if (s !== echelleVue) { echelleVue = s; quandZoom({ pourcent: Math.round(s * 100), auto: !fixe }, { dire: false }); }
  }
  // le zoom voulu (un pourcentage, ou 'auto') : montré tout de suite, annoncé, gardé une fois qu'on s'arrête (la molette en donne vite plusieurs)
  function regler(v) {
    if (!zoomLibre()) return;
    const z = v === 'auto' ? 'auto' : Math.max(50, Math.min(200, Math.round(+v)));
    if (z === zoom) return;
    zoom = z; ajusterEchelle();
    quandZoom({ pourcent: Math.round(echelleVue * 100), auto: zoom === 'auto' });
    clearTimeout(rangement);
    rangement = setTimeout(() => { rangement = 0; if (typeof FENETRES !== 'undefined') FENETRES.garder('a4-zoom', zoom); }, 400);
  }
  // « Disposition d'origine » (ou son « Annuler », fenetres.js) : la page reprend le zoom gardé, ou « Ajuster », sans rien réécrire
  const surRemise = () => {
    if (!vivant || !zoomLibre()) return;
    clearTimeout(rangement); rangement = 0;
    const z = FENETRES.taille('a4-zoom') || 'auto';
    if (z !== zoom) { zoom = z; ajusterEchelle(); quandZoom({ pourcent: Math.round(echelleVue * 100), auto: zoom === 'auto' }, { dire: false }); }
  };
  document.addEventListener('fenetres:remises', surRemise);
  const zoomPas = d => {
    const base = Math.round((echelleVue || 1) * 10) * 10;
    if (zoom === 'auto' && base + d < 50) return;      // (une page ajustée très petite : « − » n'a rien à faire)
    regler(base + d);
  };
  // Ctrl + molette sur le bureau gris (pas ailleurs : le zoom du navigateur reste à lui) ; le pincement d'un pavé tactile en donne
  // beaucoup, de petites valeurs : un pas tous les 40 de défilement cumulé
  bureau.addEventListener('wheel', e => {
    if (!e.ctrlKey || !zoomLibre()) return;
    e.preventDefault();
    cumulMolette += e.deltaY; clearTimeout(molette); molette = setTimeout(() => { cumulMolette = 0; }, 300);
    if (Math.abs(cumulMolette) >= 40) { zoomPas(cumulMolette < 0 ? 10 : -10); cumulMolette = 0; }
  }, { passive: false });
  // un bloc qui dépasse le bas de sa page passe en haut de la suivante (un titre part avec ce qui le suit) ; après un
  // saut de page, le bloc suivant commence une page ; sur la première page, le corps commence sous le logo
  function paginer() {
    prevu = 0;
    if (!vivant) return;
    const els = enfants();
    if (!els.length) return;
    const tops = els.map(el => el.offsetTop), hs = els.map(el => el.offsetHeight), anciens = els.map(el => el._pousse || 0);
    let cumul = 0;
    const nat = tops.map((t, i) => { cumul += anciens[i]; return t - cumul; });
    const pousse = new Array(els.length).fill(0), decalAvant = [];
    const ds = [];
    const corps = B.findIndex(x => x.type !== 'entete');
    let decal = 0, i = 0, forcer = false;
    while (i < els.length) {
      decalAvant[i] = decal;
      const top = nat[i] + decal, h = hs[i], page = Math.max(0, Math.floor(top / PAS)), y = top - page * PAS;
      let p = 0;
      if (i === corps && page === 0 && top < SOUS_LOGO) p = SOUS_LOGO - top;
      else if (forcer) { p = (page + 1) * PAS + HAUT - top; ds.push(i); }
      else if (B[i]?.type !== 'saut' && y + h > BAS + 0.5 && y > HAUT + 0.5 && h <= UTILE) {
        // un titre (ou deux) juste avant part avec le bloc
        let k = i;
        while (k - 1 >= 0 && TITRES_A4.has(B[k - 1]?.type) && !ds.includes(k - 1) && k - 1 !== corps) {
          const tk = nat[k - 1] + decalAvant[k - 1];
          if (Math.floor(tk / PAS) !== page || tk - page * PAS <= HAUT + 0.5) break;
          k--;
        }
        if (k < i) {
          decal = decalAvant[k];
          for (let j = k; j < i; j++) pousse[j] = 0;
          const tk = nat[k] + decal;
          pousse[k] = (page + 1) * PAS + HAUT - tk; decal += pousse[k]; ds.push(k);
          i = k + 1; forcer = false;
          continue;
        }
        p = (page + 1) * PAS + HAUT - top; ds.push(i);
      }
      pousse[i] = p; decal += p;
      forcer = B[i]?.type === 'saut';
      i++;
    }
    els.forEach((el, k) => { if ((el._pousse || 0) !== pousse[k]) { el.style.marginTop = pousse[k] ? `${pousse[k]}px` : ''; el._pousse = pousse[k]; } });
    const fin = nat[els.length - 1] + decal + hs[els.length - 1];
    dessinerFeuilles(Math.max(1, Math.floor(Math.max(0, fin - 1) / PAS) + 1));
    debuts = [...new Set(ds)].sort((x, y) => x - y).map(k => B[k]?.id).filter(Boolean);
  }
  function paginerBientot() { if (!prevu) prevu = requestAnimationFrame(paginer); }
  const observateur = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { ajusterEchelle(); }) : null;
  if (observateur) observateur.observe(bureau);
  toutRendre();
  paginer();
  FEUILLE.logo().then(svg => { logo = svg; nPages = 0; if (vivant) paginer(); });
  if (document.fonts) {
    Promise.all(['400 11pt', '700 11pt', 'italic 400 11pt', 'italic 700 11pt'].map(f => document.fonts.load(`${f} "FdR Sans"`))).catch(() => null).then(() => { if (vivant) paginer(); });
    document.fonts.addEventListener?.('loadingdone', paginerBientot);
  }
  signaler();

  return {
    blocs: () => clone(B), pages: () => [...debuts],
    remplacer(xs) { noter(true); B = (xs.length ? xs : [{ type: 'ligne' }]).map(b => FEUILLE.bloc(b)); toutRendre(); change(); },
    type: changerType, basculer, saut, annuler, retablir, surlignerNoms, paginer,
    zoom: regler, zoomPas, ajuster: () => regler('auto'), echelle: () => echelleVue,
    focus() { placer(derniere || { a: { i: 0, o: 0 } }); },
    detruire() {
      vivant = false;
      document.removeEventListener('selectionchange', surSelection);
      document.removeEventListener('fenetres:remises', surRemise);
      document.fonts?.removeEventListener?.('loadingdone', paginerBientot);
      if (observateur) observateur.disconnect();
      if (prevu) cancelAnimationFrame(prevu);
      if (rangement) { clearTimeout(rangement); rangement = 0; if (typeof FENETRES !== 'undefined') FENETRES.garder('a4-zoom', zoom); }
    },
  };
}

// ===================================================================================================== l'espace pro
// Les invitations des salles (quatrième script SQL) : une structure, son contact, les spectacles qu'on lui ouvre et une
// date de fin. Le lien envoyé, …/pro/#<jeton>, ouvre l'espace des salles (pro/) : la fonction crescite-pro y vérifie le
// jeton, donne les documents, et note les visites et les ouvertures, que le journal de chaque invitation montre ici.
// Le jeton ne se choisit pas : la base le tire au hasard (64 caractères).
const DUREES_PRO = [30, 90, 180];
const PROLONGER_PRO = 90;
const MOIS_LONGS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const jourLong = j => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(j || ''); return m ? `${+m[3] === 1 ? '1er' : +m[3]} ${MOIS_LONGS[+m[2] - 1]} ${m[1]}` : ''; };
const jourMoyen = j => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(j || ''); return m ? `${+m[3]} ${MC[+m[2] - 1]} ${m[1]}` : ''; };
const plusJours = (j, n) => { const d = new Date(`${j}T12:00:00`); d.setDate(d.getDate() + n); return AGENDA.iso(d); };
const quandTexte = q => new Date(q).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
// le lien de l'invitation : l'espace des salles est publié à côté de l'administration
const lienPro = a => `${new URL('../pro/', location.href).href}#${a.jeton}`;
// le code court de l'invitation (le dix-neuvième script : dix caractères sans lettre ambiguë), qu'on lit, qu'on dicte et
// qu'on tape dans « Code d'accès » de l'espace des salles ; montré en deux groupes de cinq
const adressePro = () => new URL('../pro/', location.href).href;
const codeLisible = c => c ? `${c.slice(0, 5)}-${c.slice(5)}` : '';
// le message tout prêt, pour un SMS, une messagerie ou le partage du téléphone
const messageCode = a => [`Compagnie Crescite : votre code d’accès à l’espace des salles est ${codeLisible(a.code)}`,
  `À saisir sur ${adressePro()} (« Code d’accès »), ou directement : ${lienPro(a)}`,
  `Valable jusqu’au ${jourLong(a.expire_le)}.`].join('\n');
const titreCourt = s => String(s?.titre || '').split(' – ')[0];
const listeEt = xs => xs.length > 1 ? `${xs.slice(0, -1).join(', ')} et ${xs[xs.length - 1]}` : xs.join('');
// les spectacles qu'une invitation ouvre : ceux qu'elle nomme ; sinon, tous ceux qui ont des documents réservés aux salles
const aDesSalles = id => E.documents.some(d => d.spectacle_id === id && estSalles(d));
const spectaclesAcces = a => (a.spectacles || []).length ? a.spectacles.map(x => spectacle(+x)).filter(Boolean) : E.spectacles.filter(s => aDesSalles(s.id)).sort((x, y) => x.ordre - y.ordre);
const etatAcces = a => !a.actif ? { ouverte: false, classe: 'masquee', texte: 'Désactivée' }
  : a.expire_le < AUJ ? { ouverte: false, classe: 'option', texte: `Échue le ${jourMoyen(a.expire_le)}` }
  : { ouverte: true, classe: 'ok', texte: `Ouverte jusqu’au ${jourMoyen(a.expire_le)}` };
const visitesTexte = a => a.visites ? `${a.visites} visite${a.visites > 1 ? 's' : ''}${a.derniere_visite ? `, la dernière le ${new Date(a.derniere_visite).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}` : 'Pas encore ouverte';
const compteDocsSalles = id => {
  const ds = E.documents.filter(d => d.spectacle_id === id), n = ds.filter(estSalles).length, p = ds.filter(estPros).length;
  return `${n ? `${n} document${n > 1 ? 's' : ''} réservé${n > 1 ? 's' : ''} aux salles` : 'rien de réservé aux salles'}${p ? `, ${p} pour les programmateurs` : ''}`;
};
// « Écrire » : un courriel court, avec le lien et la date de fin, signé de l'administrateur connecté
function courrielAcces(a) {
  const sps = spectaclesAcces(a).map(titreCourt), moi = E.admins.find(x => x.user_id === E.session?.user?.id)?.nom;
  const corps = [`Bonjour${a.contact ? ` ${a.contact}` : ''},`, '',
    `Voici le lien de votre espace, où vous trouverez les captations et les documents ${sps.length ? `que nous vous ouvrons pour ${listeEt(sps)}` : 'de nos spectacles'} :`, lienPro(a), '',
    ...(a.code ? [`Vous pouvez aussi y entrer depuis ${adressePro()} avec votre code d’accès : ${codeLisible(a.code)}`, ''] : []),
    `Il reste ouvert jusqu’au ${jourLong(a.expire_le)}. Ce lien vous est réservé : merci de ne pas le transférer.`, '',
    'Bien à vous,', ...(moi ? [moi] : []), 'Compagnie Crescite'].join('\r\n');
  return `mailto:${a.courriel ? encodeURIComponent(a.courriel.trim()).replace(/%40/g, '@') : ''}?subject=${encodeURIComponent('Compagnie Crescite : captations et documents')}&body=${encodeURIComponent(corps)}`;
}
const SPEC_ACCES = [
  { k: 'nom', t: 'texte', l: 'Structure', ph: 'Théâtre de…, Festival…' },
  { k: 'contact', t: 'texte', l: 'Contact', ph: 'Prénom Nom', aide: 'La personne invitée : l’espace l’accueille par son nom.' },
  { k: 'courriel', t: 'texte', l: 'Courriel', ph: 'programmation@…' },
  { k: 'notes', t: 'long', l: 'Notes', lignes: 3, aide: 'Pour l’administration seulement : la salle ne les voit jamais.' },
];

function vueEspacePro(param) {
  const tete = `<div class="tete"><h1>Espace pro</h1>${E.sql4 ? '<a class="btn principal" href="#/pro/nouvelle">＋ Nouvelle invitation</a>' : ''}</div>`;
  if (!E.sql4) {
    cadre('pro', `${tete}<div class="bloc pro-absent"><p>${E.sql4Erreur ? `L’espace pro n’a pas pu être chargé (${esc(E.sql4Erreur)}) : rechargez la page dans un moment.`
      : 'L’espace pro n’est pas encore installé : exécutez <code>supabase/migrations/20261023_crescite_pro.sql</code> dans Supabase (SQL Editor) et déployez la fonction <code>crescite-pro</code>, puis rechargez cette page.'}</p></div>`);
    return;
  }
  const f = session.pro = Object.assign({ q: '', etat: '' }, session.pro || {});
  cadre('pro', `${tete}<div class="deux${param ? ' edition' : ''}"><div class="liste"><div class="filtres">
      <input type="search" id="pro-q" placeholder="Chercher une structure, un contact, un spectacle" value="${esc(f.q)}" aria-label="Chercher">
      <select id="pro-etat" aria-label="État">${[['', 'Toutes les invitations'], ['ouvertes', 'Ouvertes'], ['closes', 'Échues ou désactivées']].map(([k, l]) => `<option value="${k}"${f.etat === k ? ' selected' : ''}>${l}</option>`).join('')}</select>
      <span class="compte" id="pro-compte"></span></div><div data-liste id="l-pro"></div></div>
    <section class="editeur" id="ed-pro">${param ? '' : accueilPro()}</section></div>`);
  const zone = $('#l-pro');
  zone.rafraichir = () => listeAcces(zone, param);
  zone.rafraichir();
  $('#pro-q').addEventListener('input', e => { f.q = e.target.value; garderFiltres(); zone.rafraichir(); });
  $('#pro-etat').addEventListener('change', e => { f.etat = e.target.value; garderFiltres(); zone.rafraichir(); });
  if (param) editeurAcces(param === 'nouvelle' ? null : +param);
  // les visites ont pu changer depuis le chargement : la liste et l'état de la fiche ouverte se mettent à jour
  chargerAcces().then(ok => { if (ok && zone.isConnected) { zone.rafraichir(); $('#pro-actions')?.rafraichir?.(); } });
}
function listeAcces(zone, actif) {
  const f = session.pro, q = norm(f.q).trim();
  const xs = E.acces.filter(a => {
    const ouverte = etatAcces(a).ouverte;
    if ((f.etat === 'ouvertes' && !ouverte) || (f.etat === 'closes' && ouverte)) return false;
    return !q || norm(`${a.nom} ${a.contact || ''} ${a.courriel || ''} ${spectaclesAcces(a).map(s => s.titre).join(' ')}`).includes(q);
  }).sort((a, b) => (etatAcces(b).ouverte - etatAcces(a).ouverte) || String(b.cree_le).localeCompare(String(a.cree_le)));
  $('#pro-compte').textContent = `${xs.length} invitation${xs.length > 1 ? 's' : ''}`;
  zone.innerHTML = xs.map(a => {
    const st = etatAcces(a), sps = (a.spectacles || []).length ? spectaclesAcces(a).map(titreCourt).join(', ') : 'Tous les spectacles';
    return `<a class="ligne acces-l${st.ouverte ? '' : ' close'}" href="#/pro/${a.id}"${String(actif) === String(a.id) ? ' aria-current="true"' : ''}>
      <span class="corps"><span class="t">${esc(a.nom)}</span><span class="ou">${esc([a.contact, sps].filter(Boolean).join(' · '))}</span><span class="vu">${esc(visitesTexte(a))}</span></span>
      <span class="badges"><span class="badge ${st.classe}">${esc(st.texte)}</span></span></a>`;
  }).join('') || listeVide(E.acces.length > 0, { rien: 'Aucune invitation ne correspond.', aucun: 'Aucune invitation pour l’instant.', ajouter: ['#/pro/nouvelle', '＋ Nouvelle invitation'] });
}
// sans invitation choisie : ce qu'est l'espace pro, et ce que chaque spectacle y montre
function accueilPro() {
  const sps = E.spectacles.filter(s => s.page || E.documents.some(d => d.spectacle_id === s.id && (estSalles(d) || estPros(d)))).sort((a, b) => (b.page - a.page) || a.ordre - b.ordre);
  return `<div class="bloc"><h3 aria-level="2">Inviter une salle</h3><p>Une invitation ouvre à une salle ou à un festival l’espace pro : les captations et les documents des spectacles choisis, jusqu’à une date. On lui envoie son lien ; chaque visite et chaque document ouvert s’inscrivent dans son journal.</p>
      <p class="aide">Le lien mène à pro/, une page du site qui demande les documents à la fonction <code>crescite-pro</code> de Supabase (supabase/functions/crescite-pro) : elle doit y être déployée.</p></div>
    <div class="bloc"><h3 aria-level="2">Ce que les salles y trouvent</h3>${sps.length ? `<ul class="liste-simple pro-docs">${sps.map(s => `<li><span class="pastille" style="--c:${couleurSp(s)}"></span><b>${esc(s.titre)}</b><span class="compte">${esc(compteDocsSalles(s.id))}</span><a href="#/spectacles/${esc(s.slug)}" data-onglet-sp="Documents">Documents</a></li>`).join('')}</ul>` : '<p class="aide">Aucun spectacle.</p>'}
      <p class="aide">Les documents réservés aux salles se déposent dans chaque spectacle, onglet Documents ; les dossiers et fiches techniques des programmateurs s’y ajoutent.</p></div>`;
}
function editeurAcces(id) {
  const zone = $('#ed-pro');
  const cur = () => (id ? E.acces.find(x => x.id === id) : null) || null;
  const a0 = cur();
  if (id && !a0) { zone.innerHTML = '<div class="vide bloc">Cette invitation n’existe plus.</div>'; return; }
  const F = a0 ? { nom: a0.nom || '', contact: a0.contact || '', courriel: a0.courriel || '', spectacles: (a0.spectacles || []).map(Number), expire_le: a0.expire_le, notes: a0.notes || '', prospect_id: a0.prospect_id ?? null }
    : { nom: '', contact: '', courriel: '', spectacles: [], expire_le: plusJours(AUJ, 90), notes: '', prospect_id: null };
  // la piste de diffusion de cette salle (le vingt-deuxième script) : ses visites remontent dans la piste, sa relance donne ce lien
  const pistes = E.diffusionReliee ? (E.prospects || []).filter(p => p.etape !== 'refus' || p.id === F.prospect_id).sort((x, y) => norm(x.structure).localeCompare(norm(y.structure))) : [];
  const choix = E.spectacles.filter(s => s.page || F.spectacles.includes(s.id) || E.documents.some(d => d.spectacle_id === s.id && (estSalles(d) || estPros(d)))).sort((a, b) => (b.page - a.page) || a.ordre - b.ordre);
  nChamp = 0;
  zone.innerHTML = `<div class="titre-ed"><a class="btn petit" data-tt="retour" href="#/pro" aria-label="Retour aux invitations">←</a><h2>${esc(a0 ? a0.nom : 'Nouvelle invitation')}</h2></div>
    ${a0 ? '<div class="bloc pro-actions" id="pro-actions"></div>' : ''}
    <div class="bloc" id="pro-f">
      ${champ(SPEC_ACCES[0], F)}
      <div class="rangee">${champ(SPEC_ACCES[1], F)}${champ(SPEC_ACCES[2], F)}</div>
      <fieldset class="champ pro-sps"><legend>Spectacles ouverts</legend>
        <div class="pro-sps-l">${choix.map(s => `<label class="case"><input type="checkbox" data-sp="${s.id}"${F.spectacles.includes(s.id) ? ' checked' : ''}><span class="pastille" style="--c:${couleurSp(s)}"></span><span>${esc(s.titre)}<small>${esc(compteDocsSalles(s.id))}</small></span></label>`).join('') || '<p class="aide">Aucun spectacle.</p>'}</div>
        <span class="aide" id="pro-sps-aide"></span></fieldset>
      <div class="champ"><label for="pro-fin">Accès ouvert jusqu’au</label>
        <div class="pro-duree"><input type="date" id="pro-fin" value="${esc(F.expire_le)}" min="${AUJ}"><div class="seg" role="group" aria-label="Durée à partir d’aujourd’hui">${DUREES_PRO.map(n => `<button type="button" data-jours="${n}">${n} jours</button>`).join('')}</div></div>
        <span class="aide">Une durée à partir d’aujourd’hui, ou une date. Ensuite, le lien ne s’ouvre plus.</span></div>
      ${E.diffusionReliee ? `<div class="champ"><label for="pro-piste">Piste de diffusion</label><select id="pro-piste"><option value="">— Aucune —</option>${pistes.map(p => `<option value="${p.id}"${F.prospect_id === p.id ? ' selected' : ''}>${esc(`${p.structure} · ${p.commune}`)}</option>`).join('')}</select>
        <span class="aide">Ses visites et les documents ouverts apparaissent dans la piste ; la relance de la piste donne ce lien.</span></div>` : ''}
      ${champ(SPEC_ACCES[3], F)}
    </div>
    ${a0 ? `<div class="bloc"><div class="pro-journal-tete"><h3 aria-level="2">Journal</h3><button type="button" class="btn petit" id="pro-actualiser">Actualiser</button></div><div id="pro-journal">${typeof attenteLignes === 'function' ? attenteLignes(3, 44) : '<p class="aide">Chargement…</p>'}</div></div>` : ''}
    ${pied(a0 ? 'Tout est enregistré' : 'Nouvelle invitation', a0 ? '<button type="button" class="btn danger" id="pro-suppr">Supprimer</button>' : '')}`;
  const courriel = $('[data-chemin="courriel"]', zone);
  if (courriel) { courriel.type = 'email'; courriel.autocomplete = 'off'; }
  relier($('#pro-f', zone), F, SPEC_ACCES);
  const majSps = () => {
    const tous = E.spectacles.filter(s => aDesSalles(s.id)).sort((x, y) => x.ordre - y.ordre).map(titreCourt);
    $('#pro-sps-aide', zone).textContent = F.spectacles.length
      ? 'La salle voit leurs documents réservés aux salles, et leurs dossiers et fiches techniques pour les programmateurs.'
      : `Aucun coché : tous les spectacles qui ont des documents réservés aux salles (${tous.length ? `aujourd’hui : ${listeEt(tous)}` : 'aucun pour l’instant'}).`;
  };
  const majDuree = () => $$('[data-jours]', zone).forEach(b => b.setAttribute('aria-pressed', String(F.expire_le === plusJours(AUJ, +b.dataset.jours))));
  majSps(); majDuree();
  $('#pro-f', zone).addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.sp) { const v = +t.dataset.sp; F.spectacles = t.checked ? [...new Set([...F.spectacles, v])] : F.spectacles.filter(x => x !== v); majSps(); marquerSale(); }
    if (t.id === 'pro-fin') { F.expire_le = t.value; majDuree(); marquerSale(); }
    if (t.id === 'pro-piste') { F.prospect_id = t.value ? +t.value : null; marquerSale(); }
  });
  $('#pro-f', zone).addEventListener('click', e => {
    const b = e.target.closest('[data-jours]'); if (!b) return;
    F.expire_le = plusJours(AUJ, +b.dataset.jours); $('#pro-fin', zone).value = F.expire_le; majDuree(); marquerSale();
  });

  // le lien et les actions immédiates (copier, écrire, prolonger, désactiver) : ce qui est enregistré
  const actions = () => {
    const a = cur(); if (!a) return '';
    const st = etatAcces(a);
    // le code en grand, d'abord (s'il existe : le dix-neuvième script le donne), et de quoi le transmettre d'un geste
    const code = a.code ? `<div class="pro-code" role="group" aria-labelledby="pro-code-t">
        <p class="pro-code-t" id="pro-code-t">Code d’accès</p>
        <p class="pro-code-v"><span aria-hidden="true">${esc(codeLisible(a.code))}</span><span class="sr">${esc(a.code.split('').join(' '))}</span></p>
        <p class="pro-code-ou">À saisir sur <b>${esc(adressePro().replace(/^https?:\/\//, ''))}</b>, dans « Code d’accès ».</p>
        <div class="fm-boutons"><button type="button" class="btn principal" data-pro="copier-code">Copier le code</button><button type="button" class="btn" data-pro="copier-message">Copier le message</button>${navigator.share ? '<button type="button" class="btn" data-pro="partager">Partager…</button>' : ''}<a class="btn pro-sms" data-pro="sms" href="${esc(`sms:?&body=${encodeURIComponent(messageCode(a))}`)}">Par SMS</a></div>
      </div>` : '';
    return `<div class="pro-etat-l"><span class="badge ${st.classe}">${esc(st.texte)}</span><span class="compte">${esc(visitesTexte(a))}</span></div>
      ${code}
      <div class="acces"><code id="pro-url">${esc(lienPro(a))}</code></div>
      <div class="fm-boutons"><button type="button" class="btn${a.code ? '' : ' principal'}" data-pro="copier">Copier le lien</button><a class="btn" data-pro="ecrire" href="${esc(courrielAcces(a))}">Écrire${a.courriel ? '' : ' (sans adresse)'}</a><button type="button" class="btn" data-pro="prolonger" title="${PROLONGER_PRO} jours de plus, après la date de fin (ou après aujourd’hui si elle est passée)">Prolonger de ${PROLONGER_PRO} jours</button><button type="button" class="btn" data-pro="actif">${a.actif ? 'Désactiver' : 'Réactiver'}</button></div>
      <p class="aide">« Écrire » prépare un courriel au contact, avec le lien${a.code ? ', le code' : ''} et la date de fin. ${a.actif ? 'Désactivée, l’invitation garde son lien et son journal, mais le lien ne s’ouvre plus.' : 'Tant qu’elle est désactivée, le lien ne s’ouvre plus.'}</p>`;
  };
  const dessinerActions = () => { const el = $('#pro-actions', zone); if (el) el.innerHTML = actions(); };
  if (a0) { dessinerActions(); $('#pro-actions', zone).rafraichir = dessinerActions; }
  async function majAcces(champs, message, apres = () => {}) {
    const { data, error } = await sb.from('crescite_acces_pro').update(champs).eq('id', id).select().single();
    if (error) return erreur(error);
    remplacerLigne(E.acces, data); apres();
    dessinerActions(); $('#l-pro')?.rafraichir?.();
    annoncer(message);
  }
  zone.addEventListener('click', e => {
    const b = e.target.closest('[data-pro]'); if (!b) return;
    const a = cur(); if (!a) return;
    const k = b.dataset.pro;
    if (k === 'copier') return copier(lienPro(a), 'Adresse de l’invitation');
    if (k === 'copier-code') return copier(codeLisible(a.code), 'Code', `Code d’accès copié : ${codeLisible(a.code)}`);
    if (k === 'copier-message') return copier(messageCode(a), 'Message', 'Message copié : le code, l’adresse de l’espace et la date de fin.');
    if (k === 'partager') {
      if (E.sale) return annoncer('Enregistrez d’abord l’invitation : le message reprend ce qui est enregistré.', { erreur: true });
      return navigator.share({ title: 'Espace des salles · Compagnie Crescite', text: messageCode(a) }).catch(() => {});
    }
    if (k === 'sms' && E.sale) { e.preventDefault(); return annoncer('Enregistrez d’abord l’invitation : le message reprend ce qui est enregistré.', { erreur: true }); }
    if (k === 'ecrire') {
      if (E.sale) { e.preventDefault(); return annoncer('Enregistrez d’abord l’invitation : le courriel reprend ce qui est enregistré.', { erreur: true }); }
      b.href = courrielAcces(a);   // le logiciel de courriel s'ouvre sur ce brouillon
      return;
    }
    if (k === 'prolonger') {
      const fin = plusJours(a.expire_le > AUJ ? a.expire_le : AUJ, PROLONGER_PRO);
      return majAcces({ expire_le: fin }, `Accès prolongé jusqu’au ${jourLong(fin)}.${a.actif ? '' : ' L’invitation reste désactivée.'}`, () => { F.expire_le = fin; $('#pro-fin', zone).value = fin; majDuree(); });
    }
    if (k === 'actif') return majAcces({ actif: !a.actif }, a.actif ? 'Invitation désactivée : son lien ne s’ouvre plus.' : 'Invitation réactivée.');
  });

  // le journal : les visites et les documents ouverts, du plus récent au plus ancien
  const journal = async () => {
    const el = $('#pro-journal', zone); if (!el) return;
    const { data, error } = await sb.from('crescite_acces_pro_journal').select('*').eq('acces_id', id).order('quand', { ascending: false }).limit(200);
    if (!el.isConnected) return;
    if (error) { el.innerHTML = `<p class="aide">Le journal ne se lit pas pour le moment : ${esc(error.message)}</p>`; return; }
    const doc = j => E.documents.find(d => d.id === j.document_id);
    const ouverts = new Set(data.filter(j => j.quoi === 'ouverture').map(j => j.document_id ?? `x${j.id}`));
    const visites = data.filter(j => j.quoi === 'visite').length;
    el.innerHTML = data.length ? `<p class="pro-resume">${visites} visite${visites > 1 ? 's' : ''} · ${ouverts.size} document${ouverts.size > 1 ? 's' : ''} ouvert${ouverts.size > 1 ? 's' : ''}</p>
      <ol class="pro-journal">${data.map(j => { const d = doc(j); return `<li class="${j.quoi === 'visite' ? 'visite' : 'ouverture'}"><time datetime="${esc(j.quand)}">${esc(quandTexte(j.quand))}</time><span>${j.quoi === 'visite' ? 'Visite de l’espace' : d ? `A ouvert « ${esc(d.titre)} »${d.spectacle_id ? ` <small>${esc(titreCourt(spectacle(d.spectacle_id)))}</small>` : ''}` : 'A ouvert un document retiré depuis'}</span></li>`; }).join('')}</ol>
      ${data.length >= 200 ? '<p class="aide">Les 200 derniers passages.</p>' : ''}` : '<p class="aide">Personne n’a encore ouvert ce lien.</p>';
  };
  if (a0) {
    journal();
    $('#pro-actualiser', zone).addEventListener('click', async () => { if (await chargerAcces()) { dessinerActions(); $('#l-pro')?.rafraichir?.(); } journal(); });
    $('#pro-suppr', zone).addEventListener('click', async () => {
      const a = cur(); if (!a) return;
      CORBEILLE.ligne({ table: 'crescite_acces_pro', ligne: a, quoi: `Invitation supprimée : ${a.nom}. Son lien ne s’ouvre plus.`, retabli: 'Invitation rétablie (son journal de visites est reparti de zéro).',
        apres: () => { E.acces = E.acces.filter(x => x.id !== id); E.sale = false; location.hash = '#/pro'; }, apresRetour: async () => { await chargerAcces(); location.hash = `#/pro/${id}`; } });
    });
  }
  $('[data-enregistrer]', zone).addEventListener('click', async e => {
    const nom = (F.nom || '').trim(), mel = (F.courriel || '').trim();
    if (!nom) { $('[data-chemin="nom"]', zone)?.focus(); return annoncer('Indiquez la structure invitée.', { erreur: true }); }
    if (mel && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mel)) { courriel?.focus(); return annoncer('Ce courriel n’a pas l’air complet.', { erreur: true }); }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(F.expire_le || '')) { $('#pro-fin', zone).focus(); return annoncer('Choisissez la date de fin de l’accès.', { erreur: true }); }
    const ordre = x => E.spectacles.findIndex(s => s.id === x);
    const ligneA = { nom, contact: (F.contact || '').trim() || null, courriel: mel || null, spectacles: F.spectacles.length ? [...F.spectacles].sort((x, y) => ordre(x) - ordre(y)) : null,
      expire_le: F.expire_le, notes: (F.notes || '').trim() || null, ...(E.diffusionReliee ? { prospect_id: F.prospect_id } : {}) };
    e.target.disabled = true;
    const r = a0 ? await sb.from('crescite_acces_pro').update(ligneA).eq('id', id).select().single() : await sb.from('crescite_acces_pro').insert(ligneA).select().single();
    e.target.disabled = false;
    if (r.error) return erreur(r.error);
    remplacerLigne(E.acces, r.data);
    E.sale = false; marquerSale(false);
    annoncer(a0 ? 'Invitation enregistrée.' : 'Invitation créée : copiez son lien, ou écrivez au contact.');
    if (!a0) location.hash = `#/pro/${r.data.id}`; else vueEspacePro(id);
    bravo();
  });
}

// ===================================================================================================== journal
const RESUMES_EQUIPE = {
  crescite_personnes: x => nomDe(x),
  crescite_distributions: x => `${spectacle(x.spectacle_id)?.titre || 'Spectacle'} · ${nomDe(personne(x.personne_id)) || 'une personne'}${x.fonction ? ` · ${x.fonction}` : x.role ? ` · ${x.role}` : ''}`,
  crescite_equipes: x => { const d = E.dates.find(y => y.id === x.date_id); return `${spectacle(d?.spectacle_id)?.titre || 'Date'} · ${jourCourt(d?.debut)} · ${nomDe(personne(x.personne_id)) || 'une personne'}${x.present ? ' (s’ajoute)' : ' (ne part pas)'}`; },
  crescite_documents: x => `${x.titre}${x.spectacle_id ? ` · ${spectacle(x.spectacle_id)?.titre || ''}` : ' · compagnie'}`,
  crescite_feuilles: x => { const d = E.dates.find(y => y.id === x.date_id); return `${spectacle(d?.spectacle_id)?.titre || 'Date'} · ${jourCourt(d?.debut)} · ${x.statut === 'publiee' ? `publiée v${x.version}` : 'brouillon'}`; },
  crescite_notes_frais: x => `Note de frais · ${x.montant_ttc} € · ${x.categorie || ''}`,
  crescite_materiel: x => `Matériel · ${x.intitule || ''} (${x.malle || ''})`,
  crescite_diffusion_prospects: x => `Diffusion · ${x.structure || ''} (${x.commune || ''})`,
};

// ===================================================================================================== notes de frais (admin)
// Une note garde le chemin de son justificatif dans le stockage privé « crescite-frais » (<personne_id>/<horodatage>_<nom>,
// déposé par l'espace de l'équipe). Ses liens signés (une heure) se demandent par lot, à l'affichage, et se gardent un peu
// moins longtemps ; l'export garde le chemin, qui ne périme pas.
const CAT_FRAIS = { repas: 'Repas', transport: 'Péage / Transport', hebergement: 'Hébergement', autre: 'Achat / Autre' };
const STATUT_FRAIS = { en_attente: 'En attente', valide: 'Validée', rembourse: 'Remboursée', refuse: 'Refusée' };
const LIENS_FRAIS = new Map();
// une note écrite par une version d'avant de l'espace de l'équipe pouvait garder une adresse entière : son chemin
const cheminJustificatif = v => { const m = /\/crescite-frais\/([^?#]+)/.exec(String(v || '')); return m ? decodeURIComponent(m[1]) : String(v || ''); };
async function signerJustificatifs(chemins) {
  const t = Date.now(), manque = [...new Set(chemins)].filter(c => !(LIENS_FRAIS.get(c)?.quand > t - 50 * 60000));
  if (manque.length) {
    const { data, error } = await sb.storage.from('crescite-frais').createSignedUrls(manque, 3600);
    if (error) throw error;
    (data || []).forEach(x => { if (x && x.signedUrl && !x.error) LIENS_FRAIS.set(x.path, { url: x.signedUrl, quand: t }); });
  }
  return LIENS_FRAIS;
}
// les cases [data-justif] du tableau : la vignette (une photo) ou un lien (un PDF), sinon ce qui manque
function poserJustificatifs(zone) {
  const cases = $$('[data-justif]', zone);
  if (!cases.length) return;
  signerJustificatifs(cases.map(c => c.dataset.justif)).then(liens => cases.forEach(c => {
    if (!c.isConnected) return;
    const l = liens.get(c.dataset.justif);
    if (!l) { c.textContent = 'Fichier introuvable'; return; }
    c.innerHTML = /\.pdf$/i.test(c.dataset.justif)
      ? `<a class="btn petit" href="${esc(l.url)}" target="_blank" rel="noopener">PDF<span class="sr"> : ${esc(c.dataset.nom)} (nouvel onglet)</span></a>`
      : `<a href="${esc(l.url)}" target="_blank" rel="noopener"><img src="${esc(l.url)}" class="frais-table-photo" alt="${esc(c.dataset.nom)} (nouvel onglet)"></a>`;
  }), e => cases.forEach(c => { if (c.isConnected) c.textContent = `Non lu : ${e?.message || 'erreur'}`; }));
}
function vueEquipeFrais(tete, parties) {
  const frais = E.frais || [];
  let attente = 0, valide = 0, rembourse = 0;
  frais.forEach(x => {
    const m = Number(x.montant_ttc) || 0;
    if (x.statut === 'en_attente') attente += m;
    else if (x.statut === 'valide') valide += m;
    else if (x.statut === 'rembourse') rembourse += m;
  });

  const html = `
    ${tete}
    <div class="crm-kpi">
      <div class="crm-kpi-boite"><span>À valider</span><b style="color:var(--option)">${attente.toFixed(2).replace('.', ',')} €</b></div>
      <div class="crm-kpi-boite"><span>Validé à rembourser</span><b style="color:var(--accent)">${valide.toFixed(2).replace('.', ',')} €</b></div>
      <div class="crm-kpi-boite"><span>Total remboursé</span><b style="color:var(--ok)">${rembourse.toFixed(2).replace('.', ',')} €</b></div>
    </div>
    <div class="bloc">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
        <h3 style="margin:0" aria-level="2">Notes de frais soumises par l’équipe</h3>
        <button type="button" class="btn principal" id="btn-export-csv-frais">📥 Exporter en CSV comptable</button>
      </div>
      <div class="frais-defile" data-defile tabindex="0" role="region" aria-label="Notes de frais (le tableau défile de côté)">
      <table class="simple" id="table-frais">
        <thead>
          <tr>
            <th>Date</th>
            <th>Bénéficiaire</th>
            <th>Catégorie</th>
            <th>Spectacle / Date</th>
            <th>Montant TTC</th>
            <th>Justificatif</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${frais.length ? frais.map(f => {
            const p = E.personnes.find(x => x.id === f.personne_id);
            const d = f.date_id ? E.dates.find(x => x.id === f.date_id) : null;
            const sp = d ? spectacle(d.spectacle_id) : null;
            const jour = f.date_depense || (f.cree_le || '').slice(0, 10);       // le jour de la dépense, sinon du dépôt
            const dateStr = jour ? jour.split('-').reverse().join('/') : '';
            const nomJustif = `Justificatif de ${p ? nomDe(p) : 'la note'}, ${CAT_FRAIS[f.categorie] || f.categorie || ''}, ${dateStr}`;
            return `
              <tr data-frais-id="${f.id}">
                <td><b>${esc(dateStr)}</b></td>
                <td>${esc(p ? nomDe(p) : 'Personne inconnue')}</td>
                <td>${esc(CAT_FRAIS[f.categorie] || f.categorie || '')}</td>
                <td>${sp ? esc(sp.titre) : 'Général'}</td>
                <td><b>${(Number(f.montant_ttc) || 0).toFixed(2).replace('.', ',')} €</b></td>
                <td>${f.photo_url ? `<span class="frais-justif" data-justif="${esc(cheminJustificatif(f.photo_url))}" data-nom="${esc(nomJustif)}">Lecture…</span>` : '<span style="color:var(--gris)">Sans reçu</span>'}</td>
                <td><span class="badge ${f.statut === 'valide' || f.statut === 'rembourse' ? 'ok' : f.statut === 'refuse' ? 'annulee' : 'option'}">${esc(STATUT_FRAIS[f.statut] || f.statut || STATUT_FRAIS.en_attente)}</span></td>
                <td>
                  <div class="frais-table-actions">
                    ${f.statut === 'en_attente' ? `<button type="button" class="btn petit" data-valider-frais="${f.id}" title="Valider">Valider</button><button type="button" class="btn petit danger" data-refuser-frais="${f.id}" title="Refuser">Refuser</button>` : ''}
                    ${f.statut === 'valide' ? `<button type="button" class="btn petit" data-rembourser-frais="${f.id}" title="Marquer remboursée">Rembourser</button>` : ''}
                  </div>
                </td>
              </tr>
            `;
          }).join('') : '<tr><td colspan="8" class="vide">Aucune note de frais enregistrée.</td></tr>'}
        </tbody>
      </table>
      </div>
    </div>
  `;
  cadre('equipe', html);
  parties();
  brancherFraisAdmin();
  poserJustificatifs($('#table-frais'));
}

// la note de frais dont le statut vient de changer : son badge saute, une fois la liste redessinée
const sauterStatutFrais = id => requestAnimationFrame(() => $(`[data-frais-id="${id}"] .badge`)?.classList.add('pop'));
function brancherFraisAdmin() {
  $('#btn-export-csv-frais')?.addEventListener('click', exporterCsvFrais);

  $$('[data-valider-frais]').forEach(b => {
    b.addEventListener('click', async () => {
      const id = +b.dataset.validerFrais;
      b.disabled = true;
      try {
        const { error } = await sb.from('crescite_notes_frais').update({
          statut: 'valide',
          valide_le: new Date().toISOString(),
          valide_par: E.session.user.id
        }).eq('id', id);
        if (error) throw error;
        const f = E.frais.find(x => x.id === id);
        if (f) { f.statut = 'valide'; f.valide_le = new Date().toISOString(); }
        annoncer('Note de frais validée.');
        vueEquipe('frais'); sauterStatutFrais(id);
      } catch (err) {
        erreur(err, 'Validation impossible');
        b.disabled = false;
      }
    });
  });

  $$('[data-rembourser-frais]').forEach(b => {
    b.addEventListener('click', async () => {
      const id = +b.dataset.rembourserFrais;
      b.disabled = true;
      try {
        const { error } = await sb.from('crescite_notes_frais').update({
          statut: 'rembourse',
          rembourse_le: new Date().toISOString()
        }).eq('id', id);
        if (error) throw error;
        const f = E.frais.find(x => x.id === id);
        if (f) { f.statut = 'rembourse'; f.rembourse_le = new Date().toISOString(); }
        annoncer('Note de frais marquée remboursée.');
        vueEquipe('frais'); sauterStatutFrais(id);
      } catch (err) {
        erreur(err, 'Modification impossible');
        b.disabled = false;
      }
    });
  });

  $$('[data-refuser-frais]').forEach(b => {
    b.addEventListener('click', async () => {
      const id = +b.dataset.refuserFrais;
      b.disabled = true;
      try {
        const { error } = await sb.from('crescite_notes_frais').update({ statut: 'refuse' }).eq('id', id);
        if (error) throw error;
        const f = E.frais.find(x => x.id === id);
        if (f) f.statut = 'refuse';
        // sans confirmation : « Annuler » la remet en attente
        annoncer('Note de frais refusée.', { libelle: 'Annuler', delai: 8000, action: async () => {
          const r = await sb.from('crescite_notes_frais').update({ statut: 'en_attente' }).eq('id', id);
          if (r.error) return erreur(r.error, 'Retour impossible');
          if (f) f.statut = 'en_attente'; annoncer('Note de frais de nouveau en attente.'); if (location.hash === '#/equipe/frais') { vueEquipe('frais'); sauterStatutFrais(id); }
        } });
        vueEquipe('frais'); sauterStatutFrais(id);
      } catch (err) {
        erreur(err, 'Refus impossible');
        b.disabled = false;
      }
    });
  });
}

function exporterCsvFrais() {
  const frais = E.frais || [];
  const lignes = [
    ['Date', 'Beneficiaire', 'Categorie', 'Spectacle', 'Date_tournee', 'Montant_TTC', 'Statut', 'Justificatif_chemin', 'Commentaire']
  ];
  frais.forEach(f => {
    const p = E.personnes.find(x => x.id === f.personne_id);
    const d = f.date_id ? E.dates.find(x => x.id === f.date_id) : null;
    const sp = d ? spectacle(d.spectacle_id) : null;
    const dateStr = f.date_depense || (f.cree_le ? f.cree_le.slice(0, 10) : '');
    lignes.push([
      dateStr,
      p ? nomDe(p) : '',
      f.categorie || '',
      sp ? sp.titre : '',
      d ? d.debut : '',
      (Number(f.montant_ttc) || 0).toFixed(2),
      f.statut || 'en_attente',
      f.photo_url ? cheminJustificatif(f.photo_url) : '',       // le chemin dans « crescite-frais » : un lien signé périmerait
      (f.commentaire || '').replace(/[\r\n]+/g, ' ')
    ]);
  });
  // (une case qui commence par = + - @ part précédée d'une apostrophe : un commentaire ne doit rien calculer dans le tableur)
  const sansFormule = v => (/^[=+\-@\t\r]/.test(v) ? `'${v}` : v);
  const csvContent = '\uFEFF' + lignes.map(r => r.map(cell => `"${sansFormule(String(cell)).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `crescite_notes_frais_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ===================================================================================================== matériel de tournée
function ongletMateriel(z, s0) {
  const dessiner = () => {
    const items = (E.materiel || []).filter(m => m.spectacle_id === s0.id);
    const malles = new Map();
    items.forEach(m => {
      const malleNom = m.malle || 'Général / Non classé';
      if (!malles.has(malleNom)) malles.set(malleNom, []);
      malles.get(malleNom).push(m);
    });

    z.innerHTML = `
      <div class="bloc">
        <h3>Matériel de tournée & Malle camion</h3>
        <p class="aide">Ce matériel alimente automatiquement la checklist camion de l’équipe de ce spectacle pour chaque date.</p>
        <form id="f-ajout-materiel" style="margin:16px 0 20px;padding:14px;border:1px solid var(--trait);border-radius:10px;background:var(--doux)">
          <div style="font-weight:700;margin-bottom:8px">Ajouter un élément de matériel</div>
          <div class="rangee">
            <div class="champ">
              <label for="mat-intitule">Intitulé du matériel *</label>
              <input type="text" id="mat-intitule" placeholder="Ex: Micro HF serre-tête" required>
            </div>
            <div class="champ">
              <label for="mat-malle">Malle / Emplacement *</label>
              <input type="text" id="mat-malle" placeholder="Ex: Fly Son 1" required>
            </div>
            <div class="champ">
              <label for="mat-cat">Catégorie</label>
              <select id="mat-cat">
                <option value="son">Son</option>
                <option value="lumiere">Lumière</option>
                <option value="decor">Décor</option>
                <option value="costumes">Costumes</option>
                <option value="accessoires">Accessoires</option>
                <option value="regie">Régie</option>
              </select>
            </div>
            <div class="champ">
              <label for="mat-qte">Quantité</label>
              <input type="number" id="mat-qte" value="1" min="1" style="width:80px">
            </div>
          </div>
          <div class="rangee">
            <div class="champ" style="grid-column:span 2">
              <label for="mat-notes">Notes / Consignes particulières</label>
              <input type="text" id="mat-notes" placeholder="Ex: Piles 9V neuves nécessaires, fragile">
            </div>
            <div class="champ" style="align-self:end">
              <button type="submit" class="btn principal">＋ Ajouter au matériel</button>
            </div>
          </div>
        </form>

        <div id="liste-malles-zone">
          ${malles.size ? [...malles.entries()].map(([malleNom, xs]) => `
            <div class="mat-groupe">
              <h4>📦 ${esc(malleNom)} (${xs.length})</h4>
              <table class="simple">
                <thead>
                  <tr>
                    <th>Élément</th>
                    <th>Catégorie</th>
                    <th>Quantité</th>
                    <th>Notes</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${xs.map(x => `
                    <tr>
                      <td><b>${esc(x.intitule)}</b></td>
                      <td><span class="badge">${esc(x.categorie)}</span></td>
                      <td>${x.quantite || 1}</td>
                      <td><small style="color:var(--gris)">${esc(x.notes || '')}</small></td>
                      <td><button type="button" class="btn petit danger" data-suppr-mat="${x.id}">✕</button></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `).join('') : '<p class="vide">Aucun matériel enregistré pour ce spectacle pour le moment.</p>'}
        </div>
      </div>
    `;

    $('#f-ajout-materiel', z)?.addEventListener('submit', async e => {
      e.preventDefault();
      const intitule = ($('#mat-intitule', z).value || '').trim();
      const malle = ($('#mat-malle', z).value || '').trim();
      const cat = $('#mat-cat', z).value;
      const qte = parseInt($('#mat-qte', z).value, 10) || 1;
      const notes = ($('#mat-notes', z).value || '').trim();
      if (!intitule || !malle) return;

      try {
        const { data, error } = await sb.from('crescite_materiel').insert({
          spectacle_id: s0.id,
          intitule,
          malle,
          categorie: cat,
          quantite: qte,
          notes: notes || null
        }).select();
        if (error) throw error;
        if (data && data.length) {
          E.materiel.push(data[0]);
          dessiner();
          annoncer('Matériel ajouté.');
        }
      } catch (err) {
        erreur(err, 'Ajout impossible');
      }
    });

    $$('[data-suppr-mat]', z).forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = +btn.dataset.supprMat, m = E.materiel.find(x => x.id === id);
        if (!m) return;
        try {
          await CORBEILLE.ligne({ table: 'crescite_materiel', ligne: m, quoi: `Matériel retiré : ${m.intitule || 'un élément'}.`, retabli: 'Matériel remis.',
            apres: () => { const idx = E.materiel.findIndex(x => x.id === id); if (idx >= 0) E.materiel.splice(idx, 1); dessiner(); }, apresRetour: x => { E.materiel.push(x); dessiner(); } });
        } catch (err) {
          erreur(err, 'Suppression impossible');
        }
      });
    });
  };
  dessiner();
}

// ===================================================================================================== styles
document.head.insertAdjacentHTML('beforeend', `<style id="styles-equipe">
/* les aides, hors des champs : le gris discret de l'administration */
#eq-onglet .aide, #ed-feuille .aide, #ed-personne .aide, #d-equipe .aide, .eq-docs-compagnie .aide { color: var(--gris); font-size: 13px; }
input[type=tel] { width: 100%; padding: var(--pad-champ, 8px) 10px; border: 1px solid var(--trait); border-radius: 8px; background: var(--carte); min-height: var(--h-champ, 38px); }
input[type=tel]:focus { border-color: var(--accent); outline: none; box-shadow: 0 0 0 3px var(--accent-doux); }
.avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--doux) center/cover no-repeat; display: inline-grid; place-items: center; flex: none; font-size: 13px; font-weight: 800; color: var(--gris); border: 1px solid var(--trait); }
.avatar.petit { width: 30px; height: 30px; font-size: 11px; }
.ligne.personne { grid-template-columns: 40px minmax(0, 1fr) auto; align-items: center; border-left: 1px solid var(--trait); }
.ligne.personne:hover { border-left-color: var(--gris); }
.pastilles { display: flex; flex-wrap: wrap; gap: 3px 10px; margin-top: 4px; font-size: 12.5px; color: var(--gris); }
.pastilles > span { display: inline-flex; align-items: center; gap: 5px; }
.photo-fiche { display: flex; flex-wrap: wrap; gap: 6px 18px; align-items: flex-start; margin-bottom: 4px; }
.photo-fiche figure { margin: 0 0 12px; width: 150px; }
.photo-fiche img, .photo-fiche .sans { display: grid; place-items: center; width: 150px; height: 180px; object-fit: cover; border-radius: 10px; background: var(--doux); border: 1px solid var(--trait); }
.photo-fiche .sans .avatar { width: 64px; height: 64px; font-size: 20px; }
.photo-fiche figcaption { margin-top: 5px; font-size: 12.5px; color: var(--gris); }
.photo-outils { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.photo-champs { flex: 1 1 240px; min-width: 0; }
.acces { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 8px 0 0; }
.acces code { padding: 5px 9px; border-radius: 7px; background: var(--doux); border: 1px solid var(--trait); font-size: 13.5px; word-break: break-all; }
.acces a { word-break: break-all; }
.liste-simple { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
.liste-simple li { display: flex; flex-wrap: wrap; align-items: baseline; gap: 3px 10px; padding: 8px 11px; border-radius: 9px; background: var(--doux); }
.liste-simple .pastille { align-self: center; }
.eq-jour { min-width: 9.5em; }
.eq-feuille { margin-left: auto; text-decoration: none; display: inline-flex; flex-wrap: wrap; gap: 4px; justify-content: flex-end; }
.a-completer[hidden] { display: none; }
#d-feuille .a-completer { margin-left: 2px; }
.dist-cat { margin-top: 16px; }
.eq-date li .eq-note, .eq-ajout .eq-note { flex: 1 1 220px; min-height: 32px; padding: 4px 8px; font-size: 13px; }
.dist-l.dist-entete { margin: 12px 0 -8px; padding-top: 0; padding-bottom: 0; border: 0; background: none; font-size: 11.5px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--gris); }
.dist-entete .dist-champs > span { padding-left: 9px; }
.dist-entete .dist-cases, .dist-entete .dist-outils { font-size: 10.5px; letter-spacing: 0; text-transform: none; line-height: 1.2; }
.dist-cat h4 .badge { font-size: 10.5px; padding: 1px 7px; vertical-align: 1px; letter-spacing: 0; }
.dist-cat h4 { margin: 0 0 8px; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: var(--gris); }
.dist-vide { margin: 0 0 4px; }
.dist-etat { color: var(--ok); font-weight: 600; }
.dist-l { display: grid; grid-template-columns: 30px minmax(130px, 170px) minmax(0, 1fr) 196px 104px; grid-template-areas: "av nom champs cases outils"; gap: 8px 10px; align-items: center; padding: 8px 10px; margin-bottom: 6px; border: 1px solid var(--trait); border-radius: 10px; background: var(--carte); }
.dist-l > .avatar { grid-area: av; }
.dist-l > .dist-nom { grid-area: nom; } .dist-l > .dist-champs { grid-area: champs; } .dist-l > .dist-cases { grid-area: cases; } .dist-l > .dist-outils { grid-area: outils; }
.dist-nom { min-width: 0; line-height: 1.25; }
.dist-nom a { font-weight: 700; color: var(--encre); text-decoration: none; }
.dist-nom a:hover { text-decoration: underline; }
.dist-nom small { display: block; color: var(--gris); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dist-champs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) minmax(100px, auto); gap: 6px; min-width: 0; }
.dist-champs input, .dist-champs select { min-height: 34px; padding: 6px 8px; }
.dist-cases { display: flex; flex-wrap: wrap; gap: 4px 12px; }
.dist-cases .case { font-size: 13px; gap: 6px; white-space: nowrap; }
.dist-cases .case input { width: 16px; height: 16px; }
.dist-outils { display: flex; gap: 4px; justify-content: flex-end; }
.dist-tete { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 14px; margin-bottom: 8px; }
.dist-tete h3 { margin: 0; }
.dist-ajouter-cat { margin: 2px 0 0; }
/* la troupe, pour choisir qui ajouter (choisirDansLaTroupe) */
dialog.troupe-choix { max-height: min(720px, calc(100dvh - 24px)); }
dialog.troupe-choix[open] { display: flex; }
.troupe-choix .tab-dialogue-boite { grid-template-rows: auto auto auto minmax(0, 1fr) auto auto; width: 100%; min-height: 0; }
.tc-tete { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.tc-cat { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; font-weight: 650; font-size: 13.5px; }
.tc-cat .seg { flex-wrap: wrap; }
#tc-q { width: 100%; min-height: 42px; }
.tc-liste { list-style: none; margin: 0; padding: 2px; display: grid; gap: 4px; overflow: auto; min-height: 120px; align-content: start; }
.tc-p { display: grid; grid-template-columns: 30px minmax(0, 1fr) auto; align-items: center; gap: 10px; width: 100%; min-height: 48px; padding: 7px 10px; border: 1px solid var(--trait); border-radius: 10px; background: var(--carte); color: var(--encre); font: inherit; text-align: left; cursor: pointer; }
.tc-p:hover, .tc-p:focus-visible { border-color: var(--accent); background: var(--accent-doux); }
.tc-p[aria-disabled="true"] { cursor: default; background: var(--doux); border-color: transparent; }
.tc-p[aria-disabled="true"] .tc-etat { color: var(--ok); }
.tc-nom { min-width: 0; line-height: 1.25; }
.tc-nom small { display: block; color: var(--gris); font-size: 12.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tc-etat { font-weight: 700; font-size: 13px; color: var(--accent); text-align: right; white-space: nowrap; }
.tc-etat small { display: block; font-weight: 500; color: var(--gris); font-size: 11.5px; }
.tc-creer .avatar { display: grid; place-items: center; font-weight: 700; }
.tc-msg { min-height: 1.3em; color: var(--ok); font-weight: 650; }
.tc-msg:empty { min-height: 0; }
.pe-dist li { display: grid; grid-template-columns: auto minmax(0, auto) minmax(0, 1fr) auto; align-items: center; }
.pe-dist li > button { justify-self: end; }
.dist-histo { margin-top: 14px; }
.histo-l { list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 6px; }
.histo-l li { display: grid; grid-template-columns: 30px minmax(130px, 200px) minmax(0, 1fr) auto; gap: 8px 10px; align-items: center; padding: 8px 10px; border: 1px solid var(--trait); border-radius: 10px; background: var(--carte); }
.histo-periodes { display: flex; flex-wrap: wrap; gap: 4px 6px; min-width: 0; }
.histo-periode { padding: 3px 9px; border-radius: 999px; background: var(--accent-doux); color: var(--encre); font-size: 12.5px; font-weight: 600; }
@media (max-width: 760px) { .histo-l li { grid-template-columns: 30px minmax(0, 1fr) auto; } .histo-periodes { grid-column: 1 / -1; } }
.periode-choix .pp-dates { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.periode-choix label { display: grid; gap: 4px; font-weight: 650; font-size: 13.5px; }
.periode-choix label.case { display: flex; align-items: flex-start; gap: 8px; font-weight: 500; }
.periode-choix input[type="date"], .periode-choix input[type="text"] { min-height: 40px; }
.pp-apercu { padding: 9px 12px; border-radius: 10px; background: var(--doux); font-weight: 600; }
.pe-joue-t { margin: 14px 0 6px; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: var(--gris); }
@media (max-width: 560px) { .periode-choix .pp-dates { grid-template-columns: 1fr; } }
.pe-dist-ajout { display: grid; grid-template-columns: minmax(0, 2fr) minmax(110px, 1fr) auto; gap: 8px; margin-top: 10px; }
@media (max-width: 560px) {
  .pe-dist-ajout { grid-template-columns: 1fr 1fr; } .pe-dist-ajout #pe-dist-sp { grid-column: 1 / -1; }
  dialog.troupe-choix { width: 100%; max-height: calc(100dvh - 12px); margin: auto auto 0; border-radius: 16px 16px 0 0; }
  .troupe-choix .tab-dialogue-boite { padding: 14px; }
  .tc-tete h2 { font-size: 16px; }
}
@media (max-width: 1250px) { .dist-l { grid-template-columns: 30px minmax(0, 1fr) auto; grid-template-areas: "av nom outils" "champs champs champs" "cases cases cases"; } .dist-champs { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); } .dist-l.dist-entete { display: none; } }
.fm-lignes { display: grid; gap: 6px; }
.fm-l.fm-entete { padding-top: 0; padding-bottom: 0; border: 0; background: none; font-size: 11.5px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--gris); }
@media (max-width: 1000px) { .fm-l.fm-entete { display: none; } }
.fm-l { display: grid; grid-template-columns: 340px minmax(0, 2fr) minmax(0, 1fr) 150px 32px; gap: 8px; align-items: center; padding: 7px 9px; border: 1px solid var(--trait); border-radius: 10px; background: var(--carte); }
.fm-temps { display: flex; align-items: center; gap: 5px; white-space: nowrap; color: var(--gris); font-size: 13.5px; }
.fm-temps input[type=number] { width: 58px; flex: none; padding: 6px; min-height: 34px; text-align: right; }
.fm-temps select { flex: 1; min-width: 0; min-height: 34px; padding: 6px 8px; } .fm-l > select { min-height: 34px; padding: 6px 8px; }
.fm-l > input { min-height: 34px; padding: 6px 8px; }
.fm-rep { padding: 9px 12px; border-radius: 10px; background: var(--accent-doux); border-left: 4px solid var(--accent); font-size: 14px; }
.fm-boutons { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.fm-jour { margin: 12px 0 6px; font-weight: 800; font-size: 13px; }
.fm-ex b { min-width: 4.5em; font-variant-numeric: tabular-nums; }
.fm-ex li.fm-rep-ex { background: var(--accent-doux); }
@media (max-width: 1000px) { .fm-l { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; } .fm-temps { grid-column: 1 / -1; flex-wrap: wrap; } .fm-l > select { grid-column: 1 / 3; } }
@media (max-width: 520px) { .fm-l { grid-template-columns: minmax(0, 1fr) auto; } .fm-l > input { grid-column: 1 / -1; } .fm-l > select { grid-column: 1; } }
.docs { display: grid; gap: 6px; margin-bottom: 12px; }
.doc-l { display: grid; grid-template-columns: minmax(110px, 150px) minmax(0, 1fr) minmax(150px, 200px) auto; gap: 8px; align-items: center; padding: 8px 10px; border: 1px solid var(--trait); border-radius: 10px; background: var(--carte); }
.doc-l select, .doc-l input { min-height: 34px; padding: 6px 8px; }
.doc-titre { display: grid; gap: 2px; min-width: 0; }
.doc-titre small { color: var(--gris); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.docs-ajout { display: flex; flex-wrap: wrap; gap: 8px; margin: 4px 0 10px; }
.docs-titre { margin: 18px 0 8px; font-size: 14.5px; display: flex; align-items: center; gap: 8px; }
.docs-titre:first-child { margin-top: 0; }
.doc-lien { margin-top: 4px; }
@media (max-width: 900px) { .doc-l { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } .doc-titre { grid-column: 1 / -1; grid-row: 1; } .doc-l .dist-outils { grid-column: 1 / -1; justify-content: flex-start; } }
.eq-date { display: grid; gap: 4px; margin: 0 0 6px; padding: 0; list-style: none; }
.eq-date li { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 10px; padding: 6px 10px; border-radius: 9px; background: var(--doux); }
.eq-date li.absent .case { color: var(--gris); text-decoration: line-through; }
.eq-date li.absent .compte { color: var(--option); font-weight: 600; }
.eq-ajouts { display: grid; gap: 6px; margin: 12px 0 0; }
.eq-ajouts .lib { font-weight: 650; font-size: 13.5px; }
.eq-ajout { display: grid; grid-template-columns: 30px auto minmax(0, 1fr) auto; gap: 8px; align-items: center; }
@media (max-width: 520px) { .eq-ajout { grid-template-columns: 30px minmax(0, 1fr) auto; } .eq-ajout input { grid-column: 1 / -1; grid-row: 2; } }
.eq-ajouter { margin: 14px 0 0; }
.fr-liste { max-width: 920px; }
.fr-editeur { max-width: 1240px; }
.fr-tete h1 small { display: block; margin-top: 3px; font-size: 14px; font-weight: 500; color: var(--gris); }
.fr-etat-l { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; }
.fr-badge { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; }
.fr-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.fr-alerte { margin: 10px 0 0; padding: 8px 12px; border-radius: 9px; background: var(--option-doux); color: var(--option); font-size: 13.5px; font-weight: 600; }
.fr-alerte a, .fr-alerte .btn.lien { color: inherit; text-decoration: underline; padding: 0; font-weight: 700; }
.fr-reprise { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; margin: 12px 0 0; font-size: 14px; }
.fr-reprise label { font-weight: 700; }
.fr-reprise select { flex: 0 1 auto; width: auto; min-width: 0; max-width: 100%; min-height: 34px; padding: 4px 8px; }
.fr-accueil p { max-width: 760px; }
.fr-etat .fr-actions { margin-top: 0; }
/* à compléter : ce que la feuille demande encore */
.bloc.fr-manques { padding: 0; }
.fr-manques > details > summary { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; padding: 12px 18px; cursor: pointer; list-style: none; }
.fr-manques > details > summary::-webkit-details-marker { display: none; }
.fr-manques > details > summary::before { content: ""; width: 7px; height: 7px; border: solid var(--gris); border-width: 0 2px 2px 0; transform: rotate(-45deg); transition: transform .15s; margin-right: 2px; }
.fr-manques > details[open] > summary::before { transform: rotate(45deg); }
.fr-m-titre { font-weight: 750; }
.fr-m-liste { list-style: none; margin: 0; padding: 0 18px 14px; display: grid; gap: 6px; }
.fr-m-liste li { display: grid; grid-template-columns: minmax(0, 1fr) minmax(220px, 360px); gap: 6px 12px; align-items: center; padding: 7px 10px; border-radius: 9px; background: var(--doux); }
.fr-m-liste label { display: flex; flex-wrap: wrap; align-items: baseline; gap: 1px 8px; min-width: 0; font-size: 14px; }
.fr-m-ctx { font-weight: 650; overflow-wrap: anywhere; }
.fr-m-q { color: var(--gris); font-style: italic; }
.fr-m-garde { flex-basis: 100%; color: var(--ok); font-size: 12.5px; }
.fr-m-saisie { display: flex; gap: 6px; min-width: 0; }
.fr-m-saisie input { flex: 1; min-width: 0; min-height: 34px; padding: 6px 8px; }
@media (max-width: 700px) { .fr-m-liste li { grid-template-columns: minmax(0, 1fr); } .fr-manques > details > summary { padding: 12px 14px; } .fr-m-liste { padding: 0 10px 12px; } }
/* les coordonnées de l'équipe d'une date */
.eq-date .coord, .eq-date .manque-tel { margin-left: auto; font-size: 13px; font-weight: 600; white-space: nowrap; }
.eq-date .manque-tel { color: var(--gris); font-style: italic; font-weight: 500; }
.eq-ajout .eq-nom { font-weight: 700; color: var(--encre); text-decoration: none; }
.eq-ajout .eq-nom:hover { text-decoration: underline; }
/* la fiche d'une date : chacun porte le liseré de son métier (jeu prune, création indigo, technique ambre, production sauge) */
.eq-av { display: inline-flex; flex: none; align-self: center; border-radius: 50%; box-shadow: 0 0 0 2px var(--carte), 0 0 0 4px var(--m, var(--gris)); margin: 0 6px 0 3px; }
.eq-ajout .eq-av { margin: 0; }
.eq-date li .eq-fonction { flex: 1 1 200px; min-height: 32px; padding: 4px 8px; font-size: 13px; }
.eq-date .eq-badge { font-size: 12.5px; }
.eq-fonction-zone { display: grid; gap: 2px; min-width: 0; }
.eq-remplace { justify-self: start; font-size: 12.5px; }
.eq-remplace[hidden] { display: none; }
.eq-prevenus:empty { display: none; }
.eq-prevenus { margin: 10px 0 0; }
#pe-coord .rangee > .champ { align-content: start; }
/* l'espace pro : les invitations des salles, leur lien, leur journal ; les documents réservés aux salles */
#ed-pro .aide, #l-pro .aide { color: var(--gris); font-size: 13px; }
#ed-pro .bloc > p + p { margin-top: 8px; }
.pro-absent p { margin: 0; }
#pro-f .rangee { grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); }
#pro-f .rangee > .champ { align-content: start; }
.ligne.acces-l { grid-template-columns: minmax(0, 1fr) auto; }
.ligne.acces-l.close { border-left-color: var(--trait); }
.ligne.acces-l.close .t { color: var(--gris); }
.ligne .vu { display: block; margin-top: 2px; color: var(--gris); font-size: 12.5px; }
.pro-etat-l { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; }
.pro-actions .acces { margin: 10px 0 0; }
/* le code d'accès en grand : il se lit d'un coup d'œil, se dicte au téléphone et se recopie sans erreur */
.pro-code { margin: 12px 0 4px; padding: 16px 18px 14px; border: 1px solid color-mix(in srgb, var(--accent) 45%, var(--trait)); border-radius: var(--rayon); background: color-mix(in srgb, var(--accent) 10%, var(--carte)); }
.pro-code-t { margin: 0; color: var(--gris); font: 700 11.5px/1.3 var(--etiq); letter-spacing: .12em; text-transform: uppercase; }
.pro-code-v { margin: 6px 0 4px; color: var(--encre); font: 700 clamp(30px, 7vw, 46px)/1.1 var(--titres); letter-spacing: .1em; font-variant-numeric: tabular-nums; white-space: nowrap; user-select: all; }
.pro-code-ou { margin: 0; color: var(--gris); font-size: 13px; }
.pro-code-ou b { color: var(--encre); font-weight: 600; overflow-wrap: anywhere; }
.pro-code .fm-boutons { margin-top: 12px; }
/* le SMS n'a de sens que sur un appareil qui en envoie */
@media (hover: hover) and (pointer: fine) { .pro-sms { display: none; } }
@media (pointer: coarse) { .pro-actions .btn { min-height: 44px; } }
.pro-actions .acces code { font-size: 12.5px; line-height: 1.45; }
.pro-actions .fm-boutons { margin-top: 10px; }
.pro-actions .aide { margin: 10px 0 0; }
fieldset.champ { border: 0; padding: 0; min-width: 0; }
fieldset.champ > legend { padding: 0; margin-bottom: 6px; font-weight: 650; font-size: 13.5px; }
.pro-sps-l { display: grid; gap: 6px; }
.pro-sps-l .case { align-items: flex-start; gap: 9px; padding: 8px 11px; border: 1px solid var(--trait); border-radius: 9px; background: var(--carte); font-weight: 650; }
.pro-sps-l .case:has(input:checked) { border-color: var(--accent); background: var(--accent-doux); }
.pro-sps-l .case input { margin-top: 2px; flex: none; }
.pro-sps-l .case .pastille { margin-top: 6px; }
.pro-sps-l .case small { display: block; font-weight: 500; font-size: 12.5px; color: var(--gris); }
.pro-duree { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; }
.pro-duree input[type=date] { width: auto; flex: 0 1 190px; min-width: 0; }
.pro-journal-tete { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
.pro-journal-tete h3 { margin: 0; }
.pro-resume { margin: 0 0 8px; font-weight: 650; font-size: 13.5px; }
.pro-journal { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.pro-journal li { display: grid; grid-template-columns: 158px minmax(0, 1fr); gap: 10px; align-items: baseline; padding: 6px 10px; border-radius: 8px; background: var(--doux); font-size: 14px; }
.pro-journal li.visite span { color: var(--gris); }
.pro-journal time { color: var(--gris); font-size: 13px; font-variant-numeric: tabular-nums; }
.pro-journal small { margin-left: 6px; color: var(--gris); font-size: 12.5px; }
.pro-docs li { align-items: center; }
.pro-docs li .compte { flex: 1 1 auto; }
.pro-docs li a { margin-left: auto; font-weight: 600; font-size: 13.5px; }
.doc-pour { font-size: 13px; font-weight: 650; color: var(--gris); padding: 0 4px; }
.docs-envoi { margin: 0 0 10px; font-weight: 600; }
@media (max-width: 520px) { .pro-journal li { grid-template-columns: 1fr; gap: 0; } .pro-duree input[type=date] { flex: 1 1 100%; } }
</style>`);
