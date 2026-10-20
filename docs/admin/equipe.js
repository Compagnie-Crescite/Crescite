'use strict';
/* L'équipe dans l'administration. Chargé après le script principal d'index.html, dont il utilise l'état (E), le client
   (sb) et les outils (cadre, champ, relier, pied, annoncer, optimiser, envoyerPhoto…), et après feuille.js (FEUILLE).
   - la rubrique Équipe : une fiche par personne (fiche publique, coordonnées jamais publiées, accès à son espace, notes
     de suivi, ses spectacles et ses prochaines dates) et les documents de toute la compagnie ;
   - dans chaque spectacle : la distribution, le déroulé type d'une journée de représentation, les documents ;
   - dans chaque date : son équipe (la distribution « en tournée », moins qui ne part pas, plus remplaçants et renforts) ;
   - la rubrique Feuilles de route : composer depuis la base, compléter bloc par bloc, publier pour l'équipe, PDF.
   Tant que la base n'a pas l'équipe (supabase/migrations/20261021_crescite_equipe.sql), ces écrans le disent et le
   reste de l'administration marche comme avant. */

// ===================================================================================================== état et chargement
Object.assign(E, { personnes: [], privees: [], suiviPersonnes: [], distributions: [], equipes: [], documents: [], feuilles: [], equipeInstallee: null, equipeErreur: '' });
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
const ONGLETS_EQUIPE = ['Distribution', 'Déroulé type', 'Documents'];

async function chargerEquipe() {
  try {
    const [pe, pr, su, di, eq, dc, fe] = await Promise.all([tout('crescite_personnes', 'nom'), tout('crescite_personnes_privees'), tout('crescite_personnes_suivi'),
      tout('crescite_distributions', 'ordre'), tout('crescite_equipes'), tout('crescite_documents', 'ordre'), tout('crescite_feuilles')]);
    Object.assign(E, { personnes: pe, privees: pr, suiviPersonnes: su, distributions: di, equipes: eq, documents: dc, feuilles: fe, equipeInstallee: true, equipeErreur: '' });
  } catch (e) {
    E.equipeInstallee = false;
    E.equipeErreur = /PGRST205|42P01|does not exist|schema cache/i.test(`${e?.code || ''} ${e?.message || ''}`) ? '' : (e?.message || String(e));
  }
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
const avatar = (p, petit = false) => `<span class="avatar${petit ? ' petit' : ''}"${p?.photo ? ` style="background-image:url('${photoUrl(p.photo)}')"` : ''} aria-hidden="true">${p?.photo ? '' : esc(initiales(p))}</span>`;
const rangCategorie = c => Math.max(0, CATEGORIES.findIndex(x => x[0] === c));
const libelleCategorie = c => (CATEGORIES.find(x => x[0] === c) || [c, c])[1];
const distributionDe = spId => E.distributions.filter(x => x.spectacle_id === spId).sort((a, b) => rangCategorie(a.categorie) - rangCategorie(b.categorie) || a.ordre - b.ordre || a.id - b.id);
const fonctionDistribution = x => x.categorie === 'jeu' ? `${x.fonction || 'Jeu'}${x.role ? ` (${x.role})` : ''}` : x.fonction || libelleCategorie(x.categorie);
const slugPersonne = texte => { const b = slugifier(texte) || 'personne'; let s = b, n = 2; while (E.personnes.some(p => p.slug === s)) s = `${b}-${n++}`; return s; };
const copier = async (texte, quoi) => {
  try { await navigator.clipboard.writeText(texte); }
  catch { const t = document.createElement('textarea'); t.value = texte; t.style.cssText = 'position:fixed;opacity:0'; document.body.append(t); t.select(); document.execCommand('copy'); t.remove(); }
  annoncer(`${quoi} copiée : ${texte}`);
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
  const docs = param === 'documents';
  const tete = `<div class="tete"><h1>Équipe</h1><div class="seg" role="group" aria-label="Partie"><button type="button" data-eq-partie="" aria-pressed="${!docs}">Personnes</button><button type="button" data-eq-partie="documents" aria-pressed="${docs}">Documents de la compagnie</button></div>
    ${docs || !E.equipeInstallee ? '' : '<a class="btn principal" href="#/equipe/nouvelle">＋ Nouvelle fiche</a>'}</div>`;
  const parties = () => $$('[data-eq-partie]').forEach(b => b.addEventListener('click', () => { location.hash = '#/equipe' + (b.dataset.eqPartie ? '/' + b.dataset.eqPartie : ''); }));
  if (!E.equipeInstallee) { cadre('equipe', tete + equipeAbsente()); parties(); return; }
  if (docs) {
    cadre('equipe', `${tete}<div class="bloc eq-docs-compagnie"><h3>Documents de toute la compagnie</h3><p class="aide">Pour toute l’équipe, quel que soit le spectacle : charte d’accueil, livret, contacts utiles… Les documents d’un spectacle (le texte, le dossier, la fiche technique) se rangent dans son onglet Documents.</p><div id="docs-compagnie"></div></div>`);
    parties(); documentsEditeur($('#docs-compagnie'), null); return;
  }
  const f = session.equipe = Object.assign({ q: '', categorie: '' }, session.equipe || {});
  cadre('equipe', `${tete}<div class="deux${param ? ' edition' : ''}"><div class="liste"><div class="filtres">
      <input type="search" id="eq-q" placeholder="Chercher un nom, un métier, un spectacle" value="${esc(f.q)}" aria-label="Chercher">
      <select id="eq-cat" aria-label="Catégorie"><option value="">Toutes les catégories</option>${CATEGORIES.map(([k, l]) => `<option value="${k}"${f.categorie === k ? ' selected' : ''}>${l}</option>`).join('')}<option value="aucune"${f.categorie === 'aucune' ? ' selected' : ''}>Dans aucune distribution</option></select>
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
    if (f.categorie === 'aucune' ? ds.length : f.categorie && !ds.some(x => x.categorie === f.categorie)) return false;
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
  }).join('') || '<p class="vide">Personne ne correspond.</p>';
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
    ${p0 ? '<div class="bloc" id="pe-spectacles"></div><div class="bloc" id="pe-dates"></div>' : ''}
    ${pied(p0 ? 'Tout est enregistré' : 'Nouvelle fiche', p0 ? '<button type="button" class="btn danger" id="pe-suppr">Supprimer</button>' : '')}`;
  $('[data-chemin="email"]', zone).type = 'email';
  $('[data-chemin="telephone"]', zone).type = 'tel';
  $('[data-chemin="notes"]', zone).setAttribute('aria-label', 'Notes de suivi');
  relier($('#pe-public', zone), F, [...SPEC_PERSONNE, ...SPEC_PHOTO_PERSONNE, SPEC_PUBLIE_PERSONNE]);
  relier($('#pe-coord', zone), P, SPEC_COORD);
  relier($('#pe-suivi', zone), N, [{ k: 'notes', t: 'long' }]);
  const dessinerPhoto = () => {
    $('#pe-photo', zone).innerHTML = `${F.photo ? `<img src="${photoUrl(F.photo)}" alt="Photo de ${esc(nomDe(F))}">` : `<div class="sans">${avatar(F)}</div>`}
      <figcaption>${F.photo ? (F.photo_publique ? 'Publiée sur le site' : 'Pas publiée : accord à cocher') : 'Pas de photo'}</figcaption>
      <div class="photo-outils"><label class="btn petit">${F.photo ? 'Remplacer' : 'Envoyer une photo'}<input type="file" accept="image/*" id="pe-fichier" hidden></label>${F.photo ? '<button type="button" class="btn petit danger" id="pe-sans-photo">Retirer</button>' : ''}</div>`;
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
  const dessinerSpectacles = () => {
    const el = $('#pe-spectacles', zone); if (!el) return;
    const ds = E.distributions.filter(x => x.personne_id === etat.p0.id), sps = [...new Set(ds.map(x => x.spectacle_id))].map(spectacle).filter(Boolean);
    el.innerHTML = `<h3>Ses spectacles</h3>${sps.length ? `<ul class="liste-simple">${sps.map(s => `<li><span class="pastille" style="--c:${couleurSp(s)}"></span><a href="#/spectacles/${esc(s.slug)}" data-onglet-sp="Distribution">${esc(s.titre)}</a>
      <span class="compte">${ds.filter(x => x.spectacle_id === s.id).map(x => `${libelleCategorie(x.categorie)}${x.categorie === 'jeu' ? (x.role ? ` (${esc(x.role)})` : '') : x.fonction ? ` : ${esc(x.fonction)}` : ''}${x.en_tournee ? '' : ', ne part pas en tournée'}`).join(' ; ')}</span></li>`).join('')}</ul>`
      : '<p class="aide">Dans aucune distribution pour l’instant : on l’ajoute depuis l’onglet Distribution d’un spectacle.</p>'}`;
  };
  const dessinerDates = () => {
    const el = $('#pe-dates', zone); if (!el) return;
    const xs = E.dates.filter(d => (d.fin || d.debut) >= AUJ && d.statut !== 'annulee' && equipeDeLaDate(d).some(x => x.personne_id === etat.p0.id)).sort((a, b) => a.debut < b.debut ? -1 : a.debut > b.debut ? 1 : 0);
    el.innerHTML = `<h3>Ses prochaines dates <span class="compte">${xs.length || ''}</span></h3>${xs.length ? `<ul class="liste-simple">${xs.slice(0, 20).map(d => `<li><b class="eq-jour">${esc(jourCourt(d.debut))}</b><a href="#/representations/${d.id}">${esc(spectacle(d.spectacle_id)?.titre || '?')}</a>
      <span class="compte">${esc(lieuTexte(lieu(d.lieu_id)) || 'Lieu à préciser')}</span>${d.statut === 'option' ? '<span class="badge option">Option</span>' : ''}<a href="#/feuilles/${d.id}" class="eq-feuille">${badgeFeuille(d.id)}</a></li>`).join('')}</ul>${xs.length > 20 ? `<p class="aide">Et ${xs.length - 20} autres.</p>` : ''}`
      : '<p class="aide">Aucune date à venir.</p>'}`;
  };
  dessinerPhoto(); dessinerAcces(); dessinerSpectacles(); dessinerDates();
  zone.addEventListener('change', async e => {
    if (e.target.id !== 'pe-fichier') return;
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    const slug = etat.p0?.slug || slugifier(`${F.prenom} ${F.nom}`) || 'personne';
    annoncer('Envoi de la photo…');
    try {
      F.photo = await envoyerPhoto(new File([f], `${slug}.${(f.name.split('.').pop() || 'jpg').toLowerCase()}`, { type: f.type }), 'equipe');
      marquerSale(); dessinerPhoto(); annoncer('Photo envoyée : enregistrez la fiche pour la garder.');
    } catch (err) { erreur(err, 'Envoi impossible'); }
  });
  zone.addEventListener('input', e => { if (e.target.dataset.chemin === 'photo_publique') dessinerPhoto(); });
  zone.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'pe-sans-photo') { F.photo = null; marquerSale(); dessinerPhoto(); return; }
    if (b.id === 'pe-copier') return copier((priveeDe(etat.p0.id)?.email || '').trim(), 'Adresse');
    if (b.id === 'pe-copier-lien') return copier(new URL('../equipe/', location.href).href, 'Adresse de son espace');
    if (b.id === 'pe-detacher') {
      if (!confirm(`Détacher le compte de ${nomDe(etat.p0)} ? ${nomDe(etat.p0)} ne verra plus son espace tant qu’un compte ne s’y rattache pas de nouveau.`)) return;
      const { data, error } = await sb.from('crescite_personnes_privees').update({ user_id: null }).eq('personne_id', etat.p0.id).select().single();
      if (error) return erreur(error);
      remplacerLigne(E.privees, data, 'personne_id'); dessinerAcces(); annoncer('Compte détaché.'); return;
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
      if (nouvelle) { history.replaceState(null, '', `#/equipe/${etat.p0.id}`); E.hash = location.hash; }
      vueEquipe(etat.p0.id);
      bravo();
    } catch (err) {
      // la fiche est peut-être déjà créée : on reste sur elle, la saisie intacte
      if (nouvelle && etat.p0) { history.replaceState(null, '', `#/equipe/${etat.p0.id}`); E.hash = location.hash; }
      erreur(err, err?.code === '23505' ? 'Cette adresse est déjà celle d’une autre fiche' : 'L’enregistrement a échoué');
    } finally { b.disabled = false; }
  });
}
async function enregistrerPersonne(etat, F, P, N) {
  const ligne = { prenom: F.prenom.trim() || null, nom: F.nom.trim(), metiers: (F.metiers || []).map(x => x.trim()).filter(Boolean), bio: F.bio.trim() || null,
    photo: F.photo || null, photo_credit: F.photo_credit.trim() || null, photo_source: F.photo_source.trim() || null, photo_publique: !!F.photo_publique, publie: !!F.publie };
  const r = etat.p0 ? await sb.from('crescite_personnes').update(ligne).eq('id', etat.p0.id).select().single()
    : await sb.from('crescite_personnes').insert({ ...ligne, slug: slugPersonne(`${ligne.prenom || ''} ${ligne.nom}`), ordre: Math.max(0, ...E.personnes.map(p => p.ordre || 0)) + 10 }).select().single();
  if (r.error) throw r.error;
  remplacerLigne(E.personnes, r.data); etat.p0 = r.data;
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
  if (!confirm(`Supprimer la fiche de ${nomDe(p)} ?${sort ? ` Elle sort ${sort}.` : ''} Ses coordonnées et ses notes sont effacées ; son compte de connexion, s’il existe, reste dans Supabase.`)) return;
  const copie = { p: clone(p), pr: clone(priveeDe(p.id)), su: clone(E.suiviPersonnes.find(x => x.personne_id === p.id) || null), ds: clone(ds), eqs: clone(eqs) };
  const { error } = await sb.from('crescite_personnes').delete().eq('id', p.id);
  if (error) return erreur(error, 'Suppression impossible');
  E.personnes = E.personnes.filter(x => x.id !== p.id); E.privees = E.privees.filter(x => x.personne_id !== p.id); E.suiviPersonnes = E.suiviPersonnes.filter(x => x.personne_id !== p.id);
  E.distributions = E.distributions.filter(x => x.personne_id !== p.id); E.equipes = E.equipes.filter(x => x.personne_id !== p.id);
  E.sale = false;
  location.hash = '#/equipe';
  annoncer('Fiche supprimée.', { libelle: 'Annuler', delai: 9000, action: async () => {
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
  else { z.innerHTML = `<div class="bloc"><h3>Documents de l’équipe</h3><p class="aide">Le texte, le dossier, la fiche technique… pour l’équipe du spectacle, dans son espace et ses feuilles de route ; « Administration seulement » les garde ici. Chaque changement est enregistré aussitôt.</p><div id="docs-sp"></div></div>`; documentsEditeur($('#docs-sp', z), s0); }
}

function ongletDistribution(z, s) {
  const etat = t => { const el = $('#dist-etat', z); if (el) el.textContent = t; };
  // l'ordre : par catégorie, puis la place de chacun ; on le réécrit en entier pour que site et administration s'accordent
  const renumeroter = async xs => {
    const changes = xs.map((x, i) => [x, (i + 1) * 10]).filter(([x, o]) => x.ordre !== o);
    const rs = await Promise.all(changes.map(([x, o]) => sb.from('crescite_distributions').update({ ordre: o }).eq('id', x.id)));
    const r = rs.find(x => x.error); if (r) throw r.error;
    changes.forEach(([x, o]) => { x.ordre = o; });
  };
  const ligne = (x, i, n) => {
    const p = personne(x.personne_id);
    return `<div class="dist-l" data-di="${x.id}">${avatar(p, true)}<span class="dist-nom"><a href="#/equipe/${x.personne_id}">${esc(nomDe(p) || '?')}</a><small>${esc((p?.metiers || []).slice(0, 2).join(', '))}</small></span>
      <span class="dist-champs"><input type="text" data-dc="fonction" value="${esc(x.fonction || '')}" placeholder="${x.categorie === 'jeu' ? 'Fonction' : 'Régie générale…'}" title="${x.categorie === 'jeu' ? 'Vide pour le jeu, d’habitude' : 'Ce que la personne fait dans ce spectacle'}" aria-label="Fonction">
        <input type="text" data-dc="role" value="${esc(x.role || '')}" placeholder="Rôle" aria-label="Rôle"><input type="text" data-dc="alternance" value="${esc(x.alternance || '')}" placeholder="En alternance avec…" aria-label="Alternance">
        <select data-dc="categorie" aria-label="Catégorie">${CATEGORIES.map(([k, l]) => `<option value="${k}"${x.categorie === k ? ' selected' : ''}>${l}</option>`).join('')}</select></span>
      <span class="dist-cases"><label class="case"><input type="checkbox" data-dc="en_tournee"${x.en_tournee ? ' checked' : ''}> en tournée</label><label class="case"><input type="checkbox" data-dc="publie"${x.publie ? ' checked' : ''}> publiée</label></span>
      <span class="dist-outils"><button type="button" class="btn petit" data-dm="-1" title="Monter" aria-label="Monter ${esc(nomDe(p))}"${i ? '' : ' disabled'}>↑</button><button type="button" class="btn petit" data-dm="1" title="Descendre" aria-label="Descendre ${esc(nomDe(p))}"${i < n - 1 ? '' : ' disabled'}>↓</button><button type="button" class="btn petit danger" data-dr title="Retirer de la distribution" aria-label="Retirer ${esc(nomDe(p))}">✕</button></span></div>`;
  };
  const dessiner = () => {
    const xs = distributionDe(s.id);
    z.innerHTML = `<div class="bloc"><h3>Distribution</h3><p class="aide">Qui fait quoi dans ce spectacle. « En tournée » : la personne part sur chaque date (l’équipe se règle ensuite date par date, dans Représentations). « Publiée » : elle apparaît sur la page du spectacle. Chaque changement est enregistré aussitôt. <span id="dist-etat" class="dist-etat" aria-live="polite"></span></p>
      <div class="dist-l dist-entete" aria-hidden="true"><span></span><span></span><span class="dist-champs"><span>Fonction</span><span>Rôle</span><span>Alternance</span><span>Catégorie</span></span><span class="dist-cases"><span>Part en tournée, apparaît sur le site</span></span><span class="dist-outils"><span>Ordre</span></span></div>
      ${CATEGORIES.map(([k, l]) => { const ys = xs.filter(x => x.categorie === k); return `<div class="dist-cat" data-cat="${k}"><h4>${l}${ys.length ? ` <span class="badge">${ys.length}</span>` : ''}</h4>${ys.map((x, i) => ligne(x, i, ys.length)).join('') || '<p class="aide dist-vide">Personne.</p>'}</div>`; }).join('')}
      <div class="dist-ajout"><span class="lib">Ajouter à la distribution</span><div class="dist-ajout-l"><div id="dist-combo"></div><select id="dist-cat" aria-label="Catégorie de la personne ajoutée">${CATEGORIES.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div>
        <span class="aide">Une personne de l’équipe, ou une nouvelle fiche créée au vol (on la complète ensuite dans Équipe).</span></div></div>`;
    comboPersonne($('#dist-combo', z), { placeholder: 'Nom de la personne…', creer: true, onChoix: ajouter,
      onCreer: async texte => {
        try { const cat = $('#dist-cat', z).value, p = await creerPersonne(texte, cat === 'jeu' ? ['Jeu'] : []); await ajouter(p.id); annoncer(`Fiche créée pour ${nomDe(p)} : complétez-la dans Équipe.`, { action: () => { location.hash = `#/equipe/${p.id}`; }, libelle: 'Ouvrir' }); }
        catch (e) { erreur(e, 'Fiche non créée'); }
      } });
  };
  async function ajouter(pid) {
    const cat = $('#dist-cat', z).value, p = personne(pid);
    const fonction = cat === 'jeu' ? '' : ((p?.metiers || []).find(m => !/^jeu$/i.test(m.trim())) || '');
    if (E.distributions.some(y => y.spectacle_id === s.id && y.personne_id === pid && y.categorie === cat && (y.fonction || '') === fonction)) return annoncer(`${nomDe(p)} est déjà dans la distribution (${libelleCategorie(cat)}).`, { erreur: true });
    const xs = distributionDe(s.id), dernier = [...xs].reverse().find(x => rangCategorie(x.categorie) <= rangCategorie(cat));
    const { data, error } = await sb.from('crescite_distributions').insert({ spectacle_id: s.id, personne_id: pid, categorie: cat, fonction, en_tournee: cat === 'jeu' || cat === 'technique', publie: true, ordre: (dernier?.ordre || 0) + 5 }).select().single();
    if (error) return erreur(error, 'Ajout impossible');
    E.distributions.push(data);
    try { await renumeroter(distributionDe(s.id)); } catch (e) { erreur(e, 'Ordre non enregistré'); }
    dessiner();
    annoncer(`Ajouté à la distribution : ${nomDe(p)} (${libelleCategorie(cat)}).`);
    const l = $(`[data-di="${data.id}"]`, z); if (l) { tt('ajouter', l); $('[data-dc="fonction"]', l)?.focus(); }
  }
  z.addEventListener('change', async e => {
    const t = e.target, l = t.closest('[data-di]'); if (!l || !t.dataset.dc) return;
    const x = E.distributions.find(y => y.id === +l.dataset.di); if (!x) return;
    const k = t.dataset.dc, v = t.type === 'checkbox' ? t.checked : k === 'fonction' || k === 'categorie' ? t.value.trim() : t.value.trim() || null;
    const remettre = () => { if (t.type === 'checkbox') t.checked = !t.checked; else t.value = x[k] ?? ''; };
    if ((k === 'fonction' || k === 'categorie') && E.distributions.some(y => y.id !== x.id && y.spectacle_id === x.spectacle_id && y.personne_id === x.personne_id
      && y.categorie === (k === 'categorie' ? v : x.categorie) && (y.fonction || '') === (k === 'fonction' ? v : x.fonction || ''))) { remettre(); return annoncer('Cette personne a déjà cette ligne dans la distribution.', { erreur: true }); }
    const { data, error } = await sb.from('crescite_distributions').update({ [k]: v }).eq('id', x.id).select().single();
    if (error) { remettre(); return erreur(error); }
    remplacerLigne(E.distributions, data);
    if (k === 'categorie') { try { await renumeroter(distributionDe(s.id)); } catch (err) { erreur(err, 'Ordre non enregistré'); } dessiner(); }
    etat(`Enregistré à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')}.`);
  });
  z.addEventListener('click', async e => {
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
    if (b.dataset.dr !== undefined) {
      if (!confirm(`Retirer ${nomDe(p)} de la distribution${x.fonction ? ` (${x.fonction})` : x.role ? ` (${x.role})` : ''} ?`)) return;
      const { error } = await sb.from('crescite_distributions').delete().eq('id', x.id);
      if (error) return erreur(error, 'Retrait impossible');
      E.distributions = E.distributions.filter(y => y.id !== x.id);
      dessiner();
      annoncer(`Retiré de la distribution : ${nomDe(p)}.`, { libelle: 'Annuler', action: async () => {
        const r = await sb.from('crescite_distributions').insert(sansMeta(x)).select().single();
        if (r.error) return erreur(r.error, 'Rétablissement impossible');
        E.distributions.push(r.data); dessiner();
      } });
    }
  });
  dessiner();
}

// le déroulé type : des étapes « X h Y avant le lever de rideau » ou « après la fin », posées autour des représentations
function ongletDeroule(z, F) {
  if (!Array.isArray(F.feuille_modele)) F.feuille_modele = [];
  const exemples = { un: [{ heure: '20:00' }], deux: [{ heure: '14:00', public: 'scolaire' }, { heure: '20:00' }], trois: [0, 1, 2].map(i => ({ jour: i, heure: '20:00' })) };
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
    const pl = FEUILLE.composer({ spectacle: { duree: F.duree, feuille_modele: F.feuille_modele }, representations: reps }).planning;
    const jours = [...new Set(pl.map(r => r.jour))];
    $('#fm-exemple', z).innerHTML = pl.length ? jours.map((j, n) => `${jours.length > 1 ? `<p class="fm-jour">${['Premier', 'Deuxième', 'Troisième'][n] || ''} jour</p>` : ''}<ul class="liste-simple fm-ex">${pl.filter(r => r.jour === j).map(r => `<li${r.rep ? ' class="fm-rep-ex"' : ''}><b>${esc(FEUILLE.heure(r.heure) || '–')}</b><span>${esc(r.quoi)}${r.fin ? ` <span class="compte">jusqu’à ${esc(FEUILLE.heure(r.fin))}</span>` : ''}</span>${r.qui ? `<span class="compte">${esc(r.qui)}</span>` : ''}</li>`).join('')}</ul>`).join('') : '<p class="aide">Rien à montrer.</p>';
  };
  const dessiner = () => {
    const xs = F.feuille_modele, duree = FEUILLE.dureeMinutes(F.duree);
    const rangs = xs.map((e, i) => [e, i]).sort((a, b) => rang(a[0]) - rang(b[0]));
    const avant = rangs.filter(([e]) => !FEUILLE.estApres(e)), apres = rangs.filter(([e]) => FEUILLE.estApres(e));
    z.innerHTML = `<div class="bloc"><h3>Déroulé type d’une journée de représentation</h3>
      <p class="aide">Chaque feuille de route le pose autour des représentations de sa date : les étapes « avant » avant la première représentation du jour, les étapes « après » après la dernière ; entre deux représentations éloignées de plus de trois heures, un repas. Plusieurs jours de suite au même lieu : chaque étape a lieu le premier jour, chaque jour ou le dernier (le montage le premier, le démontage le dernier).</p>
      ${xs.length ? `<div class="fm-lignes"><div class="fm-l fm-entete" aria-hidden="true"><span>Quand</span><span>Quoi</span><span>Qui</span><span>Sur plusieurs jours</span><span></span></div>${avant.map(([e, i]) => ligne(e, i)).join('')}
        <div class="fm-rep"><b>Lever de rideau</b> : la représentation${duree ? `, ${esc(FEUILLE.dureeTexte(duree))} d’après la durée du spectacle` : ' (durée inconnue : indiquez-la dans l’onglet Général)'}</div>
        ${apres.map(([e, i]) => ligne(e, i)).join('')}</div>` : '<p>Aucun déroulé type : la feuille de route de chaque date ne contiendra que les représentations.</p>'}
      <div class="fm-boutons"><button type="button" class="btn petit" data-fm-ajout="avant">＋ Étape avant</button><button type="button" class="btn petit" data-fm-ajout="apres">＋ Étape après la fin</button>${xs.length ? '' : '<button type="button" class="btn petit principal" data-fm-proposer>Proposer un déroulé type</button>'}</div></div>
      <div class="bloc"><h3>Ce que donne le planning</h3><div class="seg" role="group" aria-label="Exemple">${[['un', 'Une représentation à 20h'], ['deux', 'À 14h et à 20h'], ['trois', 'Trois soirs de suite']].map(([k, l]) => `<button type="button" data-fm-ex="${k}" aria-pressed="${k === exemple}">${l}</button>`).join('')}</div><div id="fm-exemple" style="margin-top:12px"></div></div>`;
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
}

// les documents d'un spectacle (s) ou de toute la compagnie (s = null) : un fichier du stockage privé, ou un lien
function documentsEditeur(z, s) {
  const dossier = s ? s.slug : 'compagnie';
  const docs = () => E.documents.filter(d => (s ? d.spectacle_id === s.id : d.spectacle_id == null)).sort((a, b) => a.ordre - b.ordre || a.id - b.id);
  const hote = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
  const ligne = (d, i, n) => `<div class="doc-l" data-doc="${d.id}"><select data-dk="type" aria-label="Type">${TYPES_DOC.map(([k, l]) => `<option value="${k}"${d.type === k ? ' selected' : ''}>${l}</option>`).join('')}</select>
    <span class="doc-titre"><input type="text" data-dk="titre" value="${esc(d.titre)}" aria-label="Titre du document"><small>${d.fichier ? `Fichier : ${esc(d.fichier.split('/').pop())}` : `Lien : ${esc(hote(d.url))}`}</small></span>
    <select data-dk="pour" aria-label="Pour qui"><option value="equipe"${d.pour === 'equipe' ? ' selected' : ''}>Pour l’équipe</option><option value="administration"${d.pour === 'administration' ? ' selected' : ''}>Administration seulement</option></select>
    <span class="dist-outils"><button type="button" class="btn petit" data-doc-ouvrir>Ouvrir</button><button type="button" class="btn petit" data-doc-dm="-1" title="Monter" aria-label="Monter"${i ? '' : ' disabled'}>↑</button><button type="button" class="btn petit" data-doc-dm="1" title="Descendre" aria-label="Descendre"${i < n - 1 ? '' : ' disabled'}>↓</button><button type="button" class="btn petit danger" data-doc-suppr title="Supprimer" aria-label="Supprimer ce document">✕</button></span></div>`;
  const dessiner = () => {
    const xs = docs();
    z.innerHTML = `${xs.length ? `<div class="docs">${xs.map((d, i) => ligne(d, i, xs.length)).join('')}</div>` : '<p class="aide">Aucun document.</p>'}
      <div class="docs-ajout"><label class="btn">＋ Envoyer un fichier<input type="file" data-doc-fichier accept=".pdf,.odt,.docx,.txt,image/*" hidden></label><button type="button" class="btn" data-doc-lien>＋ Coller un lien</button></div>
      <div class="item doc-lien" hidden><div class="rangee"><div class="champ"><label>Adresse du lien</label><input type="url" data-doc-url placeholder="https://…"></div><div class="champ"><label>Titre</label><input type="text" data-doc-titre placeholder="Le texte sur Wikisource"></div></div>
        <div class="fm-boutons" style="margin:0 0 10px"><button type="button" class="btn principal petit" data-doc-lien-ok>Ajouter le lien</button><button type="button" class="btn petit" data-doc-lien-non>Annuler</button></div></div>
      <p class="aide">Fichiers : PDF, image, texte, ODT ou DOCX, 50 Mo au plus. Ils restent privés : on les ouvre par un lien signé, valable une heure.</p>`;
  };
  const renumeroter = async xs => {
    const changes = xs.map((x, i) => [x, (i + 1) * 10]).filter(([x, o]) => x.ordre !== o);
    const rs = await Promise.all(changes.map(([x, o]) => sb.from('crescite_documents').update({ ordre: o }).eq('id', x.id)));
    const r = rs.find(x => x.error); if (r) throw r.error;
    changes.forEach(([x, o]) => { x.ordre = o; });
  };
  const ordreSuivant = () => Math.max(0, ...docs().map(d => d.ordre || 0)) + 10;
  const typeDe = n => /dossier/i.test(n) ? 'dossier' : /fiche.?tech|technique|rider/i.test(n) ? 'fiche_technique' : /\bplans?\b|implantation/i.test(n) ? 'plan' : /texte|script|brochure|pi[eè]ce/i.test(n) ? 'texte' : 'autre';
  const titreDe = n => { const t = n.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim(); return t ? t[0].toUpperCase() + t.slice(1) : 'Document'; };
  async function inserer(ligneDoc) {
    const { data, error } = await sb.from('crescite_documents').insert(ligneDoc).select().single();
    if (error) throw error;
    E.documents.push(data); dessiner();
    const l = $(`[data-doc="${data.id}"]`, z); if (l) { tt('ajouter', l); $('[data-dk="titre"]', l)?.focus(); }
    return data;
  }
  z.addEventListener('change', async e => {
    e.stopPropagation();   // dans l'éditeur du spectacle, ce fichier n'est pas une photo
    const t = e.target;
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
    const boite = $('.doc-lien', z);
    if (b.dataset.docLien !== undefined) { boite.hidden = false; $('[data-doc-url]', boite).focus(); return; }
    if (b.dataset.docLienNon !== undefined) { boite.hidden = true; return; }
    if (b.dataset.docLienOk !== undefined) {
      const url = $('[data-doc-url]', boite).value.trim(), titre = $('[data-doc-titre]', boite).value.trim();
      if (!/^https?:\/\//i.test(url)) return annoncer('Collez une adresse qui commence par https://', { erreur: true });
      try { await inserer({ spectacle_id: s ? s.id : null, type: /wikisource|texte/i.test(url + titre) ? 'texte' : 'autre', titre: titre || hote(url), url, pour: 'equipe', ordre: ordreSuivant() }); annoncer('Lien ajouté.'); }
      catch (err) { erreur(err, 'Lien non ajouté'); }
      return;
    }
    const l = b.closest('[data-doc]'); if (!l) return;
    const d = E.documents.find(x => x.id === +l.dataset.doc); if (!d) return;
    if (b.dataset.docOuvrir !== undefined) {
      if (d.url) { window.open(d.url, '_blank', 'noopener'); return; }
      const w = window.open('', '_blank');
      const { data, error } = await sb.storage.from('crescite-equipe').createSignedUrl(d.fichier, 3600);
      if (error) { w?.close(); return erreur(error, 'Ouverture impossible'); }
      if (w) { w.opener = null; w.location.href = data.signedUrl; } else location.href = data.signedUrl;
      return;
    }
    if (b.dataset.docDm) {
      const xs = docs(), i = xs.indexOf(d), j = i + +b.dataset.docDm; if (j < 0 || j >= xs.length) return;
      [xs[i], xs[j]] = [xs[j], xs[i]];
      try { await renumeroter(xs); } catch (err) { return erreur(err, 'Ordre non enregistré'); }
      dessiner(); return;
    }
    if (b.dataset.docSuppr !== undefined) {
      if (!confirm(`Supprimer « ${d.titre} » ?${d.fichier ? ' Le fichier est effacé du stockage.' : ''}`)) return;
      const { error } = await sb.from('crescite_documents').delete().eq('id', d.id);
      if (error) return erreur(error, 'Suppression impossible');
      E.documents = E.documents.filter(x => x.id !== d.id);
      if (d.fichier) { const r = await sb.storage.from('crescite-equipe').remove([d.fichier]); if (r.error) erreur(r.error, 'Document retiré, mais le fichier reste dans le stockage'); }
      dessiner(); annoncer('Document supprimé.');
    }
  });
  dessiner();
}

// ===================================================================================================== l'équipe d'une date
// F.equipe ne garde que les écarts avec la distribution « en tournée » : qui ne part pas (present: false), qui s'ajoute
const ecartsDate = dateId => E.equipes.filter(x => x.date_id === dateId).map(x => ({ personne_id: x.personne_id, present: x.present, fonction: x.fonction || '', note: x.note ?? null }));
function blocEquipeDate(zone, F, changer) {
  const el = $('#d-equipe', zone); if (!el) return;
  if (!E.equipeInstallee) { el.innerHTML = `<h3>Équipe de cette date</h3><p class="aide">La base de l’équipe n’est pas encore installée (supabase/migrations/20261021_crescite_equipe.sql).</p>`; return; }
  F.equipe = F.equipe || [];
  const ecart = pid => F.equipe.find(x => x.personne_id === pid);
  const enlever = x => F.equipe.splice(F.equipe.indexOf(x), 1);
  const dessiner = () => {
    const sp = +F.spectacle_id, tournee = [];
    distributionDe(sp).filter(x => x.en_tournee).forEach(x => { const f = fonctionDistribution(x) + (x.alternance ? `, ${x.alternance}` : ''), o = tournee.find(y => y.personne_id === x.personne_id); if (o) o.fonctions.push(f); else tournee.push({ personne_id: x.personne_id, fonctions: [f] }); });
    const ids = new Set(tournee.map(x => x.personne_id));
    const ajouts = F.equipe.filter(x => x.present && !ids.has(x.personne_id));
    const absents = tournee.filter(x => ecart(x.personne_id)?.present === false);
    el.innerHTML = `<h3>Équipe de cette date</h3>
      ${tournee.length ? `<p class="aide">La distribution « en tournée » part sur chaque date : décochez qui ne vient pas.</p><ul class="eq-date">${tournee.map(x => { const part = ecart(x.personne_id)?.present !== false; return `<li${part ? '' : ' class="absent"'}><label class="case"><input type="checkbox" data-eqd-part="${x.personne_id}"${part ? ' checked' : ''}> ${esc(nomDe(personne(x.personne_id)))}</label><span class="compte">${esc(x.fonctions.join(', '))}${part ? '' : ' · ne part pas sur cette date'}</span></li>`; }).join('')}</ul>`
        : `<p class="aide">${spectacle(sp) ? 'Personne n’est « en tournée » dans la distribution de ce spectacle (Spectacles → Distribution).' : 'Choisissez d’abord le spectacle.'}</p>`}
      ${ajouts.length ? `<div class="eq-ajouts"><span class="lib">Remplaçants et renforts</span>${ajouts.map(x => `<div class="eq-ajout" data-eqd-ajout="${x.personne_id}">${avatar(personne(x.personne_id), true)}<b>${esc(nomDe(personne(x.personne_id)))}</b>
        <input type="text" data-eqd-fonction value="${esc(x.fonction || '')}" placeholder="${esc(absents.length ? `Remplace ${nomDe(personne(absents[0].personne_id))}` : 'Renfort régie, remplaçant…')}" aria-label="Fonction sur cette date">
        <button type="button" class="btn petit danger" data-eqd-retirer title="Retirer de cette date" aria-label="Retirer de cette date">✕</button></div>`).join('')}</div>` : ''}
      <div class="champ eq-ajouter"><span class="lib">Ajouter quelqu’un</span><div id="eqd-combo"></div><span class="aide">Un remplaçant ou un renfort, pour cette date seulement, avec sa fonction.</span></div>`;
    comboPersonne($('#eqd-combo', el), { placeholder: 'Nom de la personne…', creer: true, avant: distributionDe(sp).map(x => x.personne_id),
      exclure: pid => (ids.has(pid) && ecart(pid)?.present !== false) || ajouts.some(x => x.personne_id === pid),
      onChoix: ajouter, onCreer: async texte => { try { const p = await creerPersonne(texte); ajouter(p.id); annoncer(`Fiche créée pour ${nomDe(p)} : complétez-la dans Équipe.`); } catch (e) { erreur(e, 'Fiche non créée'); } } });
  };
  const ajouter = pid => {
    const x = ecart(pid);
    if (x && x.present === false) enlever(x);   // quelqu'un de la distribution qu'on avait retiré : il repart
    else if (!x) F.equipe.push({ personne_id: pid, present: true, fonction: '', note: null });
    dessiner(); changer();
    const l = $(`[data-eqd-ajout="${pid}"]`, el); if (l) { tt('ajouter', l); $('input', l).focus(); }
  };
  el.addEventListener('change', e => {
    const t = e.target; if (!t.dataset.eqdPart) return;
    const pid = +t.dataset.eqdPart, x = ecart(pid);
    if (t.checked) { if (x) enlever(x); } else if (x) x.present = false; else F.equipe.push({ personne_id: pid, present: false, fonction: '', note: null });
    dessiner(); changer();
    $(`[data-eqd-part="${pid}"]`, el)?.focus();
  });
  el.addEventListener('input', e => { const t = e.target; if (t.dataset.eqdFonction === undefined) return; const x = ecart(+t.closest('[data-eqd-ajout]').dataset.eqdAjout); if (x) { x.fonction = t.value; changer(); } });
  el.addEventListener('click', e => { const b = e.target.closest('[data-eqd-retirer]'); if (!b) return; const x = ecart(+b.closest('[data-eqd-ajout]').dataset.eqdAjout); if (x) enlever(x); dessiner(); changer(); });
  $('#d-sp', zone)?.addEventListener('change', () => setTimeout(dessiner, 0));
  dessiner();
}
// après crescite_enregistrer_date : on écrit les écarts (et seulement eux) ; vrai si tout est passé
async function enregistrerEquipeDate(dateId, F) {
  if (!E.equipeInstallee || !Array.isArray(F.equipe)) return true;
  const tournee = new Set(distributionDe(+F.spectacle_id).filter(x => x.en_tournee).map(x => x.personne_id));
  const voulus = [];
  F.equipe.forEach(x => { if (x.present || tournee.has(x.personne_id)) { const i = voulus.findIndex(y => y.personne_id === x.personne_id); if (i >= 0) voulus.splice(i, 1); voulus.push(x); } });
  const actuels = E.equipes.filter(x => x.date_id === dateId);
  const aRetirer = actuels.filter(a => !voulus.some(v => v.personne_id === a.personne_id)).map(a => a.personne_id);
  const aEcrire = voulus.filter(v => { const a = actuels.find(x => x.personne_id === v.personne_id); return !a || a.present !== !!v.present || (a.fonction || '') !== (v.fonction || '').trim(); })
    .map(v => ({ date_id: dateId, personne_id: v.personne_id, present: !!v.present, fonction: (v.fonction || '').trim() || null, note: v.note ?? null }));
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

// ===================================================================================================== feuilles de route
const badgeFeuille = dateId => {
  const f = E.feuilles.find(x => x.date_id === dateId);
  return !f ? '<span class="badge">Aucune</span>' : f.statut === 'publiee' ? `<span class="badge ok">Publiée v${f.version}</span>` : '<span class="badge option">Brouillon</span>';
};
const boutonFeuille = dateId => {
  if (!E.equipeInstallee) return '';
  const f = E.feuilles.find(x => x.date_id === dateId);
  return `<a class="btn" href="#/feuilles/${dateId}" id="d-feuille">Feuille de route${f ? ` <span class="compte">${f.statut === 'publiee' ? `v${f.version}` : 'brouillon'}</span>` : ''}</a>`;
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
    const s = spectacle(d.spectacle_id), l = lieu(d.lieu_id), reps = repsDe(d.id), jours = [...new Set(reps.map(r => r.jour))];
    return `<a class="ligne" href="#/feuilles/${d.id}" style="--c:${couleurSp(s)}"><span class="jj"><b>${+d.debut.slice(8, 10)}</b>${MC[+d.debut.slice(5, 7) - 1]}${d.fin && d.fin !== d.debut ? `<br>→ ${+d.fin.slice(8, 10)}` : ''}</span>
      <span class="corps"><span class="t">${esc(s?.titre || '?')}</span><span class="ou">${esc(l ? lieuTexte(l) : (d.intitule || '').split(' — ')[1] || 'Lieu à préciser')}</span>
      ${reps.length ? `<span class="reps">${reps.slice(0, 6).map(r => `<span class="rep${r.public === 'scolaire' ? ' sco' : ''}${r.annulee ? ' ann' : ''}">${jours.length > 1 ? `${+r.jour.slice(8, 10)}/${+r.jour.slice(5, 7)} ` : ''}${r.heure ? AGENDA.heureTexte(h5(r.heure)) : 'heure ?'}</span>`).join('')}${reps.length > 6 ? `<span class="rep">+${reps.length - 6}</span>` : ''}</span>` : ''}</span>
      <span class="badges">${badgeFeuille(d.id)}${d.statut === 'option' ? '<span class="badge option">Option</span>' : d.statut === 'annulee' ? '<span class="badge annulee">Annulée</span>' : d.statut === 'reportee' ? '<span class="badge option">Reportée</span>' : ''}</span></a>`;
  };
  const saisons = [...new Set(passees.map(d => d.saison))].sort().reverse(), enCours = AGENDA.saisonDe(AUJ);
  zone.innerHTML = `<h2 class="mois" style="font-size:13px;color:var(--accent)">À venir</h2>${avenir.map(ligne).join('') || '<p class="vide">Aucune date à venir.</p>'}
    <h2 class="mois" style="font-size:13px;color:var(--accent);margin-top:24px">Dates passées</h2>
    ${saisons.map(sa => `<details class="saison-ad" data-saison="${sa}"${cherche || sa === enCours || f.ouvertes.includes(sa) ? ' open' : ''}><summary class="ligne" style="grid-template-columns:1fr auto;cursor:pointer;border-left-color:var(--trait)"><span class="t">Saison ${sa}</span><span class="badge">${passees.filter(d => d.saison === sa).length}</span></summary><div class="contenu-saison"></div></details>`).join('') || '<p class="vide">Aucune date passée.</p>'}`;
  const remplir = det => { const c = $('.contenu-saison', det); if (det.open && !c.innerHTML) c.innerHTML = passees.filter(d => d.saison === det.dataset.saison).map(ligne).join(''); };
  $$('details.saison-ad', zone).forEach(det => { remplir(det); det.addEventListener('toggle', () => { const sa = det.dataset.saison; f.ouvertes = det.open ? [...new Set([...f.ouvertes, sa])] : f.ouvertes.filter(x => x !== sa); garderFiltres(); remplir(det); }); });
}

// ce que la base sait d'une date, pour composer sa feuille ; et ce que la feuille montre autour de son contenu
const METIERS_CONTACT = /administrat|r[ée]gie\s+g[ée]n[ée]rale|r[ée]gisseu(?:r|se)\s+g[ée]n[ée]ral/i;
function sourcesFeuille(d) {
  const tel = id => priveeDe(id)?.telephone || '', mel = id => priveeDe(id)?.email || '';
  const equipe = equipeDeLaDate(d).map(x => ({ personne_id: x.personne_id, nom: nomDe(personne(x.personne_id)), fonction: x.fonction, telephone: tel(x.personne_id) }));
  // l'administration de la compagnie, et la régie générale : celle de l'équipe de la date, sinon celle de la distribution
  // du spectacle, sinon toute personne dont c'est le métier
  const REGIE = /r[ée]gi(?:e|sseu(?:r|se))\s+g[ée]n[ée]ral/i;
  const avecMetier = re => E.personnes.filter(p => (p.metiers || []).some(m => re.test(m)));
  const regieDate = equipe.filter(x => REGIE.test(x.fonction || '')).map(x => personne(x.personne_id));
  const regieDist = distributionDe(d.spectacle_id).filter(x => REGIE.test(x.fonction || '')).map(x => personne(x.personne_id));
  const regie = (regieDate.length ? regieDate : regieDist.length ? regieDist : avecMetier(REGIE)).filter(Boolean);
  const compagnie = [...avecMetier(/administrat/i), ...regie].filter((p, i, xs) => xs.indexOf(p) === i);
  const contacts = compagnie.map(p => ({ nom: nomDe(p), role: (p.metiers || []).find(m => METIERS_CONTACT.test(m)) || 'Régie générale', telephone: tel(p.id), email: mel(p.id) }));
  return { date: d, spectacle: spectacle(d.spectacle_id), lieu: lieu(d.lieu_id), representations: repsDe(d.id), equipe, contacts, depart: DEPART,
    suivi: { ...(E.suivis.find(x => x.date_id === d.id) || {}), lieu: E.lieuxSuivi.find(x => x.lieu_id === d.lieu_id) || {} },
    documents: E.documents.filter(x => (x.spectacle_id === d.spectacle_id || x.spectacle_id == null) && x.pour === 'equipe') };
}
const contexteFeuille = d => {
  const s = spectacle(d.spectacle_id) || {};
  return { date: d, spectacle: { titre: s.titre, slug: s.slug, univers: s.univers, duree: s.duree }, lieu: lieu(d.lieu_id) || null,
    representations: repsDe(d.id).map(r => ({ jour: r.jour, heure: h5(r.heure), public: r.public, annulee: r.annulee, note: r.note })),
    documents: E.documents.filter(x => (x.spectacle_id === d.spectacle_id || x.spectacle_id == null) && x.pour === 'equipe').map(x => ({ id: x.id, titre: x.titre, url: x.url || '' })) };
};
const composerPour = d => FEUILLE.fusionner(null, FEUILLE.composer(sourcesFeuille(d)), 'remplacer').contenu;
// une feuille complète : chaque bloc de FEUILLE.SECTIONS a sa place, même vide
function completerContenu(c) {
  FEUILLE.SECTIONS.forEach(s => {
    if (s.forme === 'fiche') { c[s.k] = c[s.k] && typeof c[s.k] === 'object' && !Array.isArray(c[s.k]) ? c[s.k] : {}; s.champs.forEach(ch => { if (!(ch.k in c[s.k])) c[s.k][ch.k] = ch.t === 'case' ? false : ch.t === 'nombre' ? null : ''; }); }
    else if (s.forme === 'texte') c[s.k] = typeof c[s.k] === 'string' ? c[s.k] : '';
    else c[s.k] = Array.isArray(c[s.k]) ? c[s.k] : [];
  });
  return c;
}
const feuilleVersForm = f => ({ titre: f.titre || '', contenu: completerContenu(clone(f.contenu || {})), statut: f.statut, version: f.version, publiee_le: f.publiee_le });
const contenuRempli = c => FEUILLE.SECTIONS.some(s => { const v = c?.[s.k]; return s.forme === 'fiche' ? Object.entries(v || {}).some(([k, x]) => k !== 'estime' && x !== null && String(x).trim() !== '') : s.forme === 'texte' ? !!String(v || '').trim() : (v || []).length > 0; });
const horairesChanges = (d, c) => Array.isArray(c?.representations) && c.representations.length > 0
  && c.representations.map(r => `${r.jour} ${h5(r.heure)} ${!!r.annulee}`).sort().join('|') !== repsDe(d.id).map(r => `${r.jour} ${h5(r.heure)} ${!!r.annulee}`).sort().join('|');
const AIDES_FEUILLE = {
  representations: 'Les horaires viennent de la date : changez-les dans Représentations, puis recomposez.',
  lieu: 'D’après la fiche du lieu ; jauge et plateau viennent de son suivi.',
  trajet: 'Depuis Rouen : à vol d’oiseau × 1,3, et une durée estimée. À vérifier.',
  planning: 'Le déroulé type du spectacle, posé autour des représentations. Une heure inhabituelle (avant 6h) est signalée.',
  equipe: 'L’équipe de la date (la distribution en tournée, avec remplaçants et renforts), avec les téléphones des fiches.',
  contacts: 'L’organisateur et le contact de la date, le contact du lieu, puis l’administration et la régie générale de la compagnie.',
  transport: 'Qui part quand, et comment : camion, train, voitures.',
  documents: 'Les documents de l’équipe que la feuille cite : ceux du spectacle et ceux de toute la compagnie.',
};

function editeurFeuille(dateId) {
  cadre('feuilles', '<div class="tete fr-tete"><a class="btn petit" data-tt="retour" href="#/feuilles" title="Toutes les feuilles de route">←</a><h1>Feuille de route</h1></div><section class="editeur fr-editeur" id="ed-feuille"></section>');
  const d = E.dates.find(x => x.id === dateId);
  if (!E.equipeInstallee) { $('#ed-feuille').innerHTML = equipeAbsente(); return; }
  if (!d) { $('#ed-feuille').innerHTML = '<div class="vide bloc">Cette date n’existe plus.</div>'; return; }
  const s = spectacle(d.spectacle_id), l = lieu(d.lieu_id);
  $('.fr-tete h1').innerHTML = `Feuille de route · ${esc(s?.titre || '?')}<small>${esc(jourCourt(d.debut))}${d.fin && d.fin !== d.debut ? ` → ${esc(jourCourt(d.fin))}` : ''} · ${esc(lieuTexte(l) || 'lieu à préciser')}</small>`;
  $('.fr-tete').insertAdjacentHTML('beforeend', `<a class="btn" href="#/representations/${d.id}">Ouvrir la date</a>`);
  const f0 = E.feuilles.find(x => x.date_id === dateId) || null;
  const etat = { d, f0, F: f0 ? feuilleVersForm(f0) : null, mode: 'edition' };
  etat.initial = JSON.stringify(etat.F);
  dessinerFeuille(etat);
}
const feuilleCourante = etat => ({ titre: etat.F.titre, contenu: etat.F.contenu, statut: etat.F.statut, version: etat.F.version, publiee_le: etat.F.publiee_le });
function entreeFeuille(c, v, attrs) {
  switch (c.t) {
    case 'jour': return `<input type="date" ${attrs} value="${esc(v || '')}">`;
    case 'heure': return `<input type="time" step="300" ${attrs} value="${esc(h5(v))}">`;
    case 'nombre': return `<input type="number" min="0" ${attrs} value="${esc(v ?? '')}">`;
    case 'case': return `<input type="checkbox" ${attrs}${v ? ' checked' : ''}>`;
    case 'choix': return `<select ${attrs}>${c.choix.map(([k, l]) => `<option value="${esc(k)}"${String(v ?? '') === k ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    case 'long': return `<textarea ${attrs} rows="2"${c.ph ? ` placeholder="${esc(c.ph)}"` : ''}>${esc(v ?? '')}</textarea>`;
    case 'tel': case 'email': case 'url': return `<input type="${c.t}" ${attrs} value="${esc(v ?? '')}"${c.t === 'url' ? ' placeholder="https://…"' : ''}>`;
    default: return `<input type="text" ${attrs} value="${esc(v ?? '')}"${c.ph ? ` placeholder="${esc(c.ph)}"` : ''}>`;
  }
}
const heureInhabituelle = (sec, r) => sec.k === 'planning' && /^0[0-5]:/.test(h5(r.heure));
function blocSection(sec, c, d) {
  const v = c[sec.k];
  let corps = '';
  if (sec.forme === 'fiche') corps = `<div class="rangee fr-fiche">${sec.champs.map(ch => ch.t === 'case'
    ? `<div class="champ large"><label class="case"><input type="checkbox" data-fs="${sec.k}" data-fc="${ch.k}"${v[ch.k] ? ' checked' : ''}> ${esc(ch.l)}</label>${ch.aide ? `<span class="aide">${esc(ch.aide)}</span>` : ''}</div>`
    : `<div class="champ${ch.t === 'long' || ch.t === 'url' ? ' large' : ''}"><label for="fr-${sec.k}-${ch.k}">${esc(ch.l)}</label>${entreeFeuille(ch, v[ch.k], `id="fr-${sec.k}-${ch.k}" data-fs="${sec.k}" data-fc="${ch.k}"`)}${ch.aide ? `<span class="aide">${esc(ch.aide)}</span>` : ''}</div>`).join('')}</div>`;
  else if (sec.forme === 'liste') corps = `${v.length ? `<div class="table-defile"><table class="reps fr-table" data-section="${sec.k}"><thead><tr>${sec.colonnes.map(ch => `<th>${esc(ch.l)}</th>`).join('')}<th></th></tr></thead><tbody>
      ${v.map((r, i) => `<tr data-fl="${i}"${heureInhabituelle(sec, r) ? ' class="inhabituel" title="Heure inhabituelle : à vérifier"' : ''}>${sec.colonnes.map(ch => `<td${ch.large ? ' class="large"' : ''}>${entreeFeuille(ch, r[ch.k], `data-fs="${sec.k}" data-fi="${i}" data-fc="${ch.k}" aria-label="${esc(ch.l)}"`)}</td>`).join('')}
        <td class="fr-outils"><button type="button" class="btn petit" data-fr-l="monter" data-fs="${sec.k}" data-fi="${i}" title="Monter" aria-label="Monter"${i ? '' : ' disabled'}>↑</button><button type="button" class="btn petit" data-fr-l="descendre" data-fs="${sec.k}" data-fi="${i}" title="Descendre" aria-label="Descendre"${i < v.length - 1 ? '' : ' disabled'}>↓</button><button type="button" class="btn petit danger" data-fr-l="retirer" data-fs="${sec.k}" data-fi="${i}" title="Retirer la ligne" aria-label="Retirer la ligne">✕</button></td></tr>`).join('')}
      </tbody></table></div>` : '<p class="aide fr-vide">Rien pour l’instant.</p>'}<button type="button" class="btn petit" data-fr-ajout="${sec.k}">＋ ${esc(sec.ajout || 'Ligne')}</button>${sec.k === 'planning' && v.length > 1 ? ' <button type="button" class="btn petit" data-fr-trier>Remettre dans l’ordre des heures</button>' : ''}`;
  else if (sec.forme === 'texte') corps = `<textarea data-fs="${sec.k}" rows="5" aria-label="${esc(sec.titre)}" placeholder="Ce qu’il faut savoir d’autre : matériel à apporter, consignes du lieu…">${esc(v)}</textarea>`;
  else if (sec.forme === 'documents') {
    const docs = E.documents.filter(x => (x.spectacle_id === d.spectacle_id || x.spectacle_id == null) && x.pour === 'equipe').sort((a, b) => (a.spectacle_id == null) - (b.spectacle_id == null) || a.ordre - b.ordre);
    corps = docs.length ? `<div class="fr-docs">${docs.map(x => `<label class="case"><input type="checkbox" data-fdoc="${x.id}"${(v || []).includes(x.id) ? ' checked' : ''}> ${esc(x.titre)}${x.spectacle_id == null ? ' <span class="compte">(compagnie)</span>' : ''}</label>`).join('')}</div>`
      : '<p class="aide">Aucun document pour l’équipe : Spectacles → Documents, ou Équipe → Documents de la compagnie.</p>';
  }
  return `<div class="bloc fr-sec" id="fr-${sec.k}"><h3>${esc(sec.titre)}${sec.base ? ' <span class="aide fr-source">· depuis la base</span>' : ''}</h3>${AIDES_FEUILLE[sec.k] ? `<p class="aide">${esc(AIDES_FEUILLE[sec.k])}</p>` : ''}${corps}</div>`;
}
function alertesFeuille(d, F) {
  const s = spectacle(d.spectacle_id), out = [];
  if (d.statut === 'annulee') out.push('Cette date est annulée.');
  if (d.statut === 'option') out.push('Cette date est encore une option.');
  if (!repsDe(d.id).length) out.push('Cette date n’a pas de représentation détaillée (jour et heure) : le planning restera vide.');
  if (s && !FEUILLE.dureeMinutes(s.duree)) out.push(`La durée du spectacle n’est pas indiquée (<a href="#/spectacles/${esc(s.slug)}" data-onglet-sp="Général">Spectacles → Général → Durée</a>) : la fin des représentations et les étapes d’après restent sans heure.`);
  if (s && !(s.feuille_modele || []).length) out.push(`${esc(s.titre)} n’a pas de déroulé type (<a href="#/spectacles/${esc(s.slug)}" data-onglet-sp="Déroulé type">Spectacles → Déroulé type</a>) : le planning ne contient que les représentations.`);
  if (F && horairesChanges(d, F.contenu)) out.push('Les horaires de la date ont changé depuis la composition de cette feuille. <button type="button" class="btn lien" data-fr-recomposer>Recomposer</button>');
  return out.map(x => `<p class="fr-alerte">${x}</p>`).join('');
}
function dessinerFeuille(etat) {
  const zone = zoneNeuve('#ed-feuille');
  const { d } = etat;
  if (!etat.F) {
    zone.innerHTML = `<div class="bloc"><h3>Pas encore de feuille de route pour cette date</h3>
      <p>« Composer » la remplit avec ce que la base sait : le lieu et son itinéraire, le trajet depuis Rouen, les représentations, le planning tiré du déroulé type du spectacle, l’équipe de la date avec ses téléphones, les contacts. Restent à remplir : transport, hébergement, repas, notes.</p>
      ${alertesFeuille(d, null)}<p class="fm-boutons"><button type="button" class="btn principal" id="fr-composer">Composer la feuille</button><button type="button" class="btn" id="fr-vide">Partir d’une feuille vide</button></p></div>`;
    $('#fr-composer', zone).addEventListener('click', () => { etat.F = { titre: '', contenu: completerContenu(composerPour(d)), statut: 'brouillon', version: 1, publiee_le: null }; dessinerFeuille(etat); annoncer('Feuille composée : vérifiez, complétez, puis enregistrez.'); });
    $('#fr-vide', zone).addEventListener('click', () => { etat.F = { titre: '', contenu: completerContenu({}), statut: 'brouillon', version: 1, publiee_le: null }; dessinerFeuille(etat); });
    return;
  }
  const F = etat.F, pub = F.statut === 'publiee';
  const sale = () => JSON.stringify(etat.F) !== etat.initial;
  const quand = x => { const t = new Date(x); return isNaN(t) ? '' : `le ${t.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} à ${t.getHours()}h${String(t.getMinutes()).padStart(2, '0')}`; };
  const badge = pub ? `<span class="badge ok">Publiée v${F.version}</span><span class="compte">${esc(quand(F.publiee_le))} : l’équipe de la date la voit dans son espace</span>`
    : etat.f0 ? `<span class="badge option">Brouillon</span><span class="compte">l’équipe ne la voit pas encore${etat.f0.publiee_le ? ` (la version ${etat.f0.version} a été retirée)` : ''}</span>` : '<span class="badge option">Pas encore enregistrée</span>';
  zone.innerHTML = `<div class="bloc fr-etat"><div class="fr-etat-l"><span class="fr-badge">${badge}</span><div class="seg" role="group" aria-label="Affichage"><button type="button" data-fr-mode="edition" aria-pressed="${etat.mode === 'edition'}">Édition</button><button type="button" data-fr-mode="apercu" aria-pressed="${etat.mode === 'apercu'}">Aperçu</button></div></div>
    <div class="fr-actions"><button type="button" class="btn petit" id="fr-recomposer" title="Remettre à jour ce qui vient de la base : horaires, lieu, équipe, contacts">Recomposer</button><button type="button" class="btn petit" id="fr-pdf">Télécharger le PDF</button><button type="button" class="btn petit" id="fr-imprimer">Imprimer</button></div>
    ${alertesFeuille(d, F)}<div id="fr-recompo"></div></div>
    ${etat.mode === 'apercu' ? `<div class="fr-apercu" aria-label="Aperçu de la feuille de route">${FEUILLE.html(feuilleCourante(etat), contexteFeuille(d))}</div>`
      : `<div class="bloc"><div class="champ" style="margin:0"><label for="fr-titre">Titre <span class="aide" style="font-weight:400">(facultatif : une ligne sous le nom du spectacle)</span></label><input type="text" id="fr-titre" value="${esc(F.titre)}" placeholder="Tournée en Normandie, semaine 51"></div></div>
        ${FEUILLE.SECTIONS.map(sec => blocSection(sec, F.contenu, d)).join('')}`}
    <div class="pied-ed"><span class="etat-ed"></span>
      ${pub ? '<button type="button" class="btn" id="fr-brouillon">Repasser en brouillon</button>' : '<button type="button" class="btn" id="fr-publier">Publier pour l’équipe</button>'}
      <button type="button" class="btn principal" data-enregistrer>${pub ? 'Publier la mise à jour' : 'Enregistrer le brouillon'}</button></div>`;
  const majEtat = () => {
    const x = sale(); marquerSale(x);
    const el = $('.etat-ed', zone);
    if (!x) el.textContent = pub ? `Publiée : l’équipe voit la version ${F.version}` : etat.f0 ? 'Brouillon enregistré' : 'Pas encore enregistrée';
    else if (pub) el.textContent = `Modifications non publiées : l’équipe voit encore la version ${F.version}`;
    const b = $('[data-enregistrer]', zone); if (b) b.disabled = pub && !x;
  };
  majEtat();
  const sectionDe = k => FEUILLE.SECTIONS.find(x => x.k === k);
  const redessinerSection = (k, focus) => {
    const b = $(`#fr-${k}`, zone); if (!b) return;
    b.outerHTML = blocSection(sectionDe(k), F.contenu, d);
    if (focus) $(focus, zone)?.focus();
  };
  const lireChampFeuille = t => {
    if (t.id === 'fr-titre') { F.titre = t.value; return majEtat(); }
    if (t.dataset.fdoc) { const id = +t.dataset.fdoc; F.contenu.documents = t.checked ? [...new Set([...(F.contenu.documents || []), id])] : (F.contenu.documents || []).filter(x => x !== id); return majEtat(); }
    const k = t.dataset.fs; if (!k || t.dataset.frL) return;
    const sec = sectionDe(k), c = t.dataset.fc, col = (sec.champs || sec.colonnes || []).find(x => x.k === c);
    const v = t.type === 'checkbox' ? t.checked : col?.t === 'nombre' ? (t.value === '' ? null : +t.value) : t.value;
    if (sec.forme === 'texte') F.contenu[k] = v;
    else if (sec.forme === 'fiche') {
      F.contenu[k][c] = v;
      // une distance ou une durée corrigée à la main n'est plus une estimation
      if (k === 'trajet' && (c === 'distance_km' || c === 'duree_min') && F.contenu.trajet.estime) { F.contenu.trajet.estime = false; const x = $('[data-fs="trajet"][data-fc="estime"]', zone); if (x) x.checked = false; }
    } else {
      F.contenu[k][+t.dataset.fi][c] = v;
      if (c === 'heure') t.closest('tr')?.classList.toggle('inhabituel', heureInhabituelle(sec, F.contenu[k][+t.dataset.fi]));
    }
    majEtat();
  };
  zone.addEventListener('input', e => lireChampFeuille(e.target));
  zone.addEventListener('change', e => lireChampFeuille(e.target));
  zone.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.frMode) { etat.mode = b.dataset.frMode; dessinerFeuille(etat); return; }
    if (b.dataset.frAjout) {
      const k = b.dataset.frAjout, sec = sectionDe(k), premier = repsDe(d.id)[0]?.jour || d.debut;
      const neuve = Object.fromEntries(sec.colonnes.map(c => [c.k, c.t === 'case' ? false : c.t === 'choix' ? c.choix[0][0] : c.k === 'jour' ? premier : '']));
      if (sec.cle) neuve[sec.cle] = null;
      F.contenu[k].push(neuve); majEtat();
      redessinerSection(k, `#fr-${k} tr[data-fl="${F.contenu[k].length - 1}"] input:not([type=date]), #fr-${k} tr[data-fl="${F.contenu[k].length - 1}"] select`);
      tt('ajouter', $(`#fr-${k} tr[data-fl="${F.contenu[k].length - 1}"]`, zone));
      return;
    }
    if (b.dataset.frL) {
      const k = b.dataset.fs, xs = F.contenu[k], i = +b.dataset.fi;
      if (b.dataset.frL === 'retirer') xs.splice(i, 1);
      if (b.dataset.frL === 'monter' && i > 0) [xs[i - 1], xs[i]] = [xs[i], xs[i - 1]];
      if (b.dataset.frL === 'descendre' && i < xs.length - 1) [xs[i + 1], xs[i]] = [xs[i], xs[i + 1]];
      majEtat();
      const j = b.dataset.frL === 'monter' ? i - 1 : b.dataset.frL === 'descendre' ? i + 1 : -1;
      redessinerSection(k, j >= 0 ? `#fr-${k} [data-fr-l="${b.dataset.frL}"][data-fi="${j}"]:not([disabled])` : null);
      return;
    }
    if (b.dataset.frTrier !== undefined) { F.contenu.planning = FEUILLE.trier(F.contenu.planning); majEtat(); redessinerSection('planning'); return; }
    if (b.id === 'fr-recomposer' || b.dataset.frRecomposer !== undefined) return demanderRecomposition(etat, zone);
    if (b.id === 'fr-pdf') {
      const lib = b.textContent; b.disabled = true; b.textContent = 'Préparation du PDF…';
      try { await FEUILLE.telecharger(feuilleCourante(etat), contexteFeuille(d)); annoncer(sale() ? 'PDF téléchargé (avec les modifications pas encore enregistrées).' : 'PDF téléchargé.'); }
      catch (err) { erreur(err, 'PDF impossible'); }
      finally { b.disabled = false; b.textContent = lib; }
      return;
    }
    if (b.id === 'fr-imprimer') return imprimerFeuille(feuilleCourante(etat), contexteFeuille(d));
    if (b.id === 'fr-publier') return enregistrerFeuille(etat, 'publiee', b);
    if (b.id === 'fr-brouillon') return enregistrerFeuille(etat, 'brouillon', b);
    if (b.matches('[data-enregistrer]')) return enregistrerFeuille(etat, pub ? 'publiee' : 'brouillon', b);
  });
}
// recomposer une feuille déjà remplie : on demande quoi faire de ce qui a été saisi à la main
function demanderRecomposition(etat, zone) {
  const appliquer = mode => {
    const avant = clone(etat.F.contenu);
    const { contenu, gardes } = FEUILLE.fusionner(etat.F.contenu, FEUILLE.composer(sourcesFeuille(etat.d)), mode);
    etat.F.contenu = completerContenu(contenu);
    dessinerFeuille(etat);
    const n = gardes.reduce((a, g) => a + g.n, 0);
    annoncer(mode === 'garder' && n ? `Recomposée. Gardé de vos saisies : ${gardes.map(g => `${g.section.toLowerCase()} (${g.n})`).join(', ')}. Enregistrez pour garder.` : 'Recomposée depuis la base. Enregistrez pour garder.',
      { libelle: 'Annuler', delai: 12000, action: () => { etat.F.contenu = avant; dessinerFeuille(etat); annoncer('Recomposition annulée : la feuille est comme avant.'); } });
  };
  if (!contenuRempli(etat.F.contenu)) return appliquer('remplacer');
  const z = $('#fr-recompo', zone);
  z.innerHTML = `<div class="item fr-choix" role="group" aria-label="Recomposer la feuille"><p><b>Recomposer depuis la base.</b> Cette feuille a déjà été remplie : que faire de ce qui a été saisi à la main ?</p>
    <label class="case"><input type="radio" name="fr-mode-recompo" value="garder" checked> Le garder : seul ce qui vient de la base est mis à jour</label>
    <label class="case"><input type="radio" name="fr-mode-recompo" value="remplacer"> Repartir de la base pour le lieu, le trajet, les représentations, le planning, l’équipe et les contacts</label>
    <p class="aide">Transport, hébergement, repas et notes ne changent jamais. Rien n’est enregistré avant « ${etat.F.statut === 'publiee' ? 'Publier la mise à jour' : 'Enregistrer le brouillon'} », et « Annuler » revient en arrière.</p>
    <div class="fm-boutons"><button type="button" class="btn principal petit" id="fr-recompo-ok">Recomposer</button><button type="button" class="btn petit" id="fr-recompo-non">Annuler</button></div></div>`;
  z.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  $('#fr-recompo-ok', z).focus();
  $('#fr-recompo-ok', z).addEventListener('click', () => appliquer($('input[name="fr-mode-recompo"]:checked', z).value));
  $('#fr-recompo-non', z).addEventListener('click', () => { z.innerHTML = ''; });
}
async function enregistrerFeuille(etat, statut, bouton) {
  const { d, F } = etat, avant = etat.f0;
  const ligne = { titre: (F.titre || '').trim() || null, contenu: F.contenu, statut };
  bouton.disabled = true;
  const r = avant ? await sb.from('crescite_feuilles').update(ligne).eq('id', avant.id).select().single()
    : await sb.from('crescite_feuilles').insert({ ...ligne, date_id: d.id }).select().single();
  bouton.disabled = false;
  if (r.error) return erreur(r.error);
  remplacerLigne(E.feuilles, r.data);
  etat.f0 = r.data; etat.F = feuilleVersForm(r.data); etat.initial = JSON.stringify(etat.F);
  E.sale = false;
  dessinerFeuille(etat);
  annoncer(statut === 'publiee' ? (avant?.statut === 'publiee' ? `Mise à jour publiée : l’équipe voit la version ${r.data.version}.` : `Publiée pour l’équipe : version ${r.data.version}.`)
    : avant?.statut === 'publiee' ? 'Repassée en brouillon : l’équipe ne la voit plus.' : 'Brouillon enregistré : l’équipe ne le voit pas encore.');
  bravo();
}
// imprimer la feuille seule, telle que l'équipe la voit (dans un cadre caché, sans fenêtre de plus)
function imprimerFeuille(feuille, contexte) {
  const titre = `Feuille de route · ${contexte.spectacle?.titre || ''} · ${jourCourt(contexte.date?.debut)}`;
  const f = document.createElement('iframe');
  f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  f.srcdoc = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(titre)}</title><style>html,body{margin:0;background:#fff}</style></head><body>${FEUILLE.html(feuille, contexte)}</body></html>`;
  f.addEventListener('load', () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { erreur(e, 'Impression impossible'); } setTimeout(() => f.remove(), 60000); }, { once: true });
  document.body.append(f);
}

// ===================================================================================================== journal
const RESUMES_EQUIPE = {
  crescite_personnes: x => nomDe(x),
  crescite_distributions: x => `${spectacle(x.spectacle_id)?.titre || 'Spectacle'} · ${nomDe(personne(x.personne_id)) || 'une personne'}${x.fonction ? ` · ${x.fonction}` : x.role ? ` · ${x.role}` : ''}`,
  crescite_equipes: x => { const d = E.dates.find(y => y.id === x.date_id); return `${spectacle(d?.spectacle_id)?.titre || 'Date'} · ${jourCourt(d?.debut)} · ${nomDe(personne(x.personne_id)) || 'une personne'}${x.present ? ' (s’ajoute)' : ' (ne part pas)'}`; },
  crescite_documents: x => `${x.titre}${x.spectacle_id ? ` · ${spectacle(x.spectacle_id)?.titre || ''}` : ' · compagnie'}`,
  crescite_feuilles: x => { const d = E.dates.find(y => y.id === x.date_id); return `${spectacle(d?.spectacle_id)?.titre || 'Date'} · ${jourCourt(d?.debut)} · ${x.statut === 'publiee' ? `publiée v${x.version}` : 'brouillon'}`; },
};

// ===================================================================================================== styles
document.head.insertAdjacentHTML('beforeend', `<style id="styles-equipe">
/* les aides, hors des champs : le gris discret de l'administration */
#eq-onglet .aide, #ed-feuille .aide, #ed-personne .aide, #d-equipe .aide, .eq-docs-compagnie .aide { color: var(--gris); font-size: 13px; }
input[type=tel] { width: 100%; padding: 8px 10px; border: 1px solid var(--trait); border-radius: 8px; background: var(--carte); min-height: 38px; }
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
.eq-feuille { margin-left: auto; text-decoration: none; }
.dist-cat { margin-top: 16px; }
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
.dist-ajout { margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--trait); display: grid; gap: 6px; }
.dist-ajout .lib { font-weight: 650; font-size: 13.5px; }
.dist-ajout-l { display: grid; grid-template-columns: minmax(0, 2fr) minmax(130px, 1fr); gap: 8px; }
@media (max-width: 1250px) { .dist-l { grid-template-columns: 30px minmax(0, 1fr) auto; grid-template-areas: "av nom outils" "champs champs champs" "cases cases cases"; } .dist-champs { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); } .dist-l.dist-entete { display: none; } }
@media (max-width: 560px) { .dist-ajout-l { grid-template-columns: 1fr; } }
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
.fr-choix { margin-top: 12px; padding: 12px 14px 8px; background: var(--accent-doux); border-color: var(--accent); }
.fr-choix p { margin: 0 0 8px; }
.fr-choix .case { font-weight: 500; margin: 6px 0; align-items: flex-start; }
.fr-choix .case input { margin-top: 2px; flex: none; }
.fr-sec h3 .fr-source { font-size: 12px; }
.fr-fiche { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.fr-fiche .large { grid-column: 1 / -1; }
.fr-fiche textarea { min-height: 60px; }
.table-defile { overflow-x: auto; margin-bottom: 8px; }
table.fr-table { min-width: 640px; }
table.fr-table td.large { width: 34%; min-width: 200px; }
table.fr-table input[type=time] { min-width: 96px; }
table.fr-table input[type=date] { min-width: 138px; }
table.fr-table input[type=checkbox] { width: 18px; height: 18px; accent-color: var(--accent); }
table.fr-table .fr-outils { white-space: nowrap; width: 1%; }
table.fr-table tr.inhabituel input[type=time] { border-color: var(--option); background: var(--option-doux); }
.fr-vide { margin: 0 0 8px; }
.fr-docs { display: grid; gap: 6px; }
.fr-docs .case { font-weight: 500; }
.fr-apercu { margin: 16px 0; }
@media (max-width: 700px) { .fr-fiche { grid-template-columns: minmax(0, 1fr); } table.fr-table { min-width: 0; } table.fr-table td.large { min-width: 0; grid-column: 1 / -1; } table.fr-table .fr-outils { grid-column: 1 / -1; } .table-defile { overflow: visible; } }
</style>`);
