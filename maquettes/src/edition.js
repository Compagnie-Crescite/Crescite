/* L'édition sur place, commune aux maquettes : la compagnie modifie le site en le regardant, comme dans WordPress.
   Chaque enregistrement va dans la base ; toutes les pages ouvertes se mettent à jour (donnees.js, temps réel).

   Ce que la maquette fournit :
   - un lien ou un bouton qui appelle EDITION.ouvrir(), avec le libellé D.site.libelles.modifierSite (pied de page) ;
   - data-edit="<chemin dans D>" sur chaque texte qui vient de D, son contenu étant exactement la valeur de D :
       shows.<slug>.<champ>[.<suite>]   un spectacle   (shows.berenice.texte.0, shows.berenice.accroche)
       site.<clé>[.<suite>]             un texte du site (site.compagnie.paragraphes.2, site.ecole.texte)
       dossiers.<clé>.<suite>           un dossier scolaire (dossiers.berenice.pourquoi.sections.0.texte)
     un chemin qui finit par un rang (…texte.0) est un élément de liste : on peut ajouter un paragraphe après lui, ou le
     retirer, et la maquette se redessine (DONNEES.surChangement) ;
   - data-edit-photo="shows.<slug>.photo" ou "shows.<slug>.photos.<rang>" sur une photo : on la remplace ;
   - data-date-id="<id>" sur chaque ligne d'agenda (D.dates[].id, et l'id des dates de D.saisons) : on la modifie,
     même passée ; data-agenda sur chaque liste de dates (data-agenda="<slug>" pour celle d'un spectacle) : on en ajoute ;
   - les variables CSS --ed-fond, --ed-encre, --ed-accent, --ed-sur-accent, --ed-police, --ed-rayon, --ed-trait : la
     barre et les panneaux prennent le style de la maquette (et des règles .ed-… pour aller plus loin).
   L'édition demande la base (DONNEES.etat === 'base') et un compte inscrit dans crescite_admins ; la session est celle
   de l'administration (admin/index.html), sur la même origine.

   EDITION.ouvrir()   connexion si besoin, puis mode édition        EDITION.actif   vrai en mode édition */
const EDITION = (() => {
  const BASE = 'https://omekkqjinvppadsoinvj.supabase.co';
  const CLE = 'sb_publishable_TODW6NdmDly8eR9UxjG-6g_eyAa4gjB';
  const STOCK = 'crescite-admin';
  const ADMIN = 'admin/index.html';
  const moi = { actif: false };
  const modifies = new Set();
  let session = null, observateur = null, barre = null, outils = null, outilPhoto = null, listes = null;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = o => JSON.parse(JSON.stringify(o ?? null));
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  // ----------------------------------------------------------------------------------------------- styles
  const STYLE = `
  :root { --ed-fond-d: var(--ed-fond, #fff); --ed-encre-d: var(--ed-encre, #1d1720); --ed-accent-d: var(--ed-accent, #a8306f);
    --ed-sur-d: var(--ed-sur-accent, #fff); --ed-police-d: var(--ed-police, system-ui, sans-serif); --ed-rayon-d: var(--ed-rayon, 12px);
    --ed-trait-d: var(--ed-trait, rgba(0, 0, 0, .16)); }
  .ed-actif [data-edit] { outline: 1.5px dashed color-mix(in srgb, var(--ed-accent-d) 55%, transparent); outline-offset: 3px; cursor: text; border-radius: 2px; }
  .ed-actif [data-edit]:hover { outline-style: solid; }
  .ed-actif [data-edit]:focus { outline: 2px solid var(--ed-accent-d); background: color-mix(in srgb, var(--ed-accent-d) 7%, transparent); }
  .ed-actif [data-edit].ed-modifie { outline-color: var(--ed-accent-d); outline-style: solid; }
  .ed-actif [data-edit]:empty::before { content: '…'; opacity: .5; }
  .ed-actif [data-date-id] { outline: 1.5px dashed color-mix(in srgb, var(--ed-accent-d) 55%, transparent); outline-offset: 2px; cursor: pointer; }
  .ed-actif [data-date-id]:hover { outline-style: solid; }
  .ed-actif [data-edit-photo] { outline: 2px dashed var(--ed-accent-d); outline-offset: -4px; cursor: pointer; }
  .ed-boite, .ed-boite * { box-sizing: border-box; }
  .ed-boite { font: 15px/1.45 var(--ed-police-d); color: var(--ed-encre-d); }
  .ed-boite button, .ed-boite input, .ed-boite select, .ed-boite textarea { font: inherit; color: inherit; }
  .ed-barre { position: fixed; z-index: 2147483000; right: 16px; bottom: 16px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; max-width: calc(100vw - 32px);
    padding: 9px 10px 9px 14px; background: var(--ed-fond-d); border: 1px solid var(--ed-trait-d); border-radius: 999px; box-shadow: 0 10px 34px rgba(0, 0, 0, .28); }
  @media (max-width: 760px) { .ed-barre { left: 8px; right: 8px; bottom: calc(76px + env(safe-area-inset-bottom)); border-radius: var(--ed-rayon-d); } }
  .ed-barre .ed-etat { font-weight: 700; margin-right: 4px; }
  .ed-barre .ed-etat::before { content: ''; display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: var(--ed-accent-d); margin-right: 7px; vertical-align: 1px; }
  .ed-barre .ed-nb { opacity: .72; font-size: 13px; }
  .ed-bt { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--ed-trait-d); background: var(--ed-fond-d); color: var(--ed-encre-d); border-radius: 999px; padding: 6px 13px; cursor: pointer; font-weight: 650; text-decoration: none; white-space: nowrap; }
  .ed-bt:hover { border-color: var(--ed-encre-d); }
  .ed-bt.ed-plein { background: var(--ed-accent-d); border-color: var(--ed-accent-d); color: var(--ed-sur-d); }
  .ed-bt.ed-danger { color: #b3261e; }
  .ed-bt[disabled] { opacity: .45; cursor: default; }
  .ed-outils { position: fixed; z-index: 2147483001; display: flex; gap: 3px; padding: 4px; background: var(--ed-encre-d); border-radius: 9px; box-shadow: 0 6px 22px rgba(0, 0, 0, .3); }
  .ed-outils button { border: 0; background: none; color: var(--ed-fond-d); padding: 4px 9px; border-radius: 6px; cursor: pointer; font: 600 13px/1.2 var(--ed-police-d); }
  .ed-outils button:hover { background: rgba(255, 255, 255, .16); }
  .ed-voile { position: fixed; inset: 0; z-index: 2147483002; background: rgba(10, 6, 12, .48); display: grid; place-items: center; padding: 16px; }
  .ed-panneau { width: min(760px, 100%); max-height: calc(100vh - 32px); overflow: auto; background: var(--ed-fond-d); color: var(--ed-encre-d); border-radius: var(--ed-rayon-d); border: 1px solid var(--ed-trait-d); box-shadow: 0 24px 70px rgba(0, 0, 0, .4); }
  .ed-panneau.ed-petit { width: min(420px, 100%); }
  .ed-tete { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; gap: 10px; padding: 14px 18px; background: var(--ed-fond-d); border-bottom: 1px solid var(--ed-trait-d); }
  .ed-tete h2 { margin: 0; font-size: 18px; flex: 1; font-family: var(--ed-police-d); }
  .ed-corps { padding: 16px 18px 6px; }
  .ed-pied { position: sticky; bottom: 0; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 12px 18px; background: var(--ed-fond-d); border-top: 1px solid var(--ed-trait-d); }
  .ed-pied .ed-note { margin-right: auto; font-size: 13px; opacity: .75; }
  .ed-champ { display: grid; gap: 5px; margin-bottom: 13px; }
  .ed-champ > span, .ed-champ > label { font-weight: 700; font-size: 13px; }
  .ed-aide { font-size: 12.5px; opacity: .72; }
  .ed-boite input[type=text], .ed-boite input[type=email], .ed-boite input[type=password], .ed-boite input[type=url], .ed-boite input[type=search],
  .ed-boite input[type=date], .ed-boite input[type=time], .ed-boite input[type=number], .ed-boite select, .ed-boite textarea, .ed-boite .ed-riche {
    width: 100%; min-height: 38px; padding: 7px 10px; border: 1px solid var(--ed-trait-d); border-radius: 8px; background: var(--ed-fond-d); color: var(--ed-encre-d); }
  .ed-boite textarea { min-height: 70px; resize: vertical; }
  .ed-boite :focus-visible { outline: 2px solid var(--ed-accent-d); outline-offset: 1px; }
  .ed-rangee { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
  .ed-seg { display: inline-flex; flex-wrap: wrap; border: 1px solid var(--ed-trait-d); border-radius: 9px; overflow: hidden; }
  .ed-seg button { border: 0; background: none; padding: 6px 11px; cursor: pointer; font-weight: 650; }
  .ed-seg button[aria-pressed="true"] { background: var(--ed-accent-d); color: var(--ed-sur-d); }
  .ed-reps { width: 100%; border-collapse: separate; border-spacing: 0 6px; }
  .ed-reps td { padding: 0 3px; vertical-align: middle; }
  @media (max-width: 640px) { .ed-reps tr { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 8px; border: 1px solid var(--ed-trait-d); border-radius: 9px; margin-bottom: 8px; } .ed-reps td { padding: 0; } }
  .ed-apercu { padding: 11px 13px; border-radius: 9px; border: 1px dashed var(--ed-trait-d); background: color-mix(in srgb, var(--ed-accent-d) 6%, var(--ed-fond-d)); margin-bottom: 12px; }
  .ed-apercu b { display: block; }
  .ed-combo { position: relative; }
  .ed-sugg { position: absolute; z-index: 5; left: 0; right: 0; top: calc(100% + 3px); background: var(--ed-fond-d); border: 1px solid var(--ed-trait-d); border-radius: 9px; box-shadow: 0 10px 26px rgba(0, 0, 0, .2); max-height: 260px; overflow: auto; }
  .ed-sugg button { display: block; width: 100%; text-align: left; border: 0; background: none; padding: 7px 11px; cursor: pointer; }
  .ed-sugg button:hover, .ed-sugg button:focus { background: color-mix(in srgb, var(--ed-accent-d) 12%, var(--ed-fond-d)); }
  .ed-item { border: 1px solid var(--ed-trait-d); border-radius: 9px; padding: 8px 10px; margin-bottom: 8px; }
  .ed-annonces { position: fixed; z-index: 2147483003; left: 50%; top: 16px; transform: translateX(-50%); display: grid; gap: 8px; width: min(460px, calc(100% - 24px)); }
  .ed-annonce { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 11px; background: #1d1720; color: #fff; box-shadow: 0 8px 28px rgba(0, 0, 0, .3); font: 14px/1.4 var(--ed-police-d); }
  .ed-annonce.ed-erreur { background: #8c1d16; }
  .ed-annonce button { margin-left: auto; border: 1px solid rgba(255, 255, 255, .45); background: none; color: #fff; border-radius: 7px; padding: 3px 10px; cursor: pointer; font-weight: 700; }
  .ed-ajout { margin: 10px 0; }`;
  function styles() { if ($('#ed-styles')) return; const s = document.createElement('style'); s.id = 'ed-styles'; s.textContent = STYLE; document.head.append(s); }

  function annoncer(msg, { erreur = false, action = null, libelle = 'Annuler', delai = 5500 } = {}) {
    styles();
    let zone = $('.ed-annonces');
    if (!zone) { zone = document.createElement('div'); zone.className = 'ed-annonces ed-boite'; zone.setAttribute('aria-live', 'polite'); document.body.append(zone); }
    const el = document.createElement('div');
    el.className = 'ed-annonce' + (erreur ? ' ed-erreur' : '');
    el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button">${esc(libelle)}</button>` : ''}`;
    if (action) $('button', el).addEventListener('click', () => { el.remove(); action(); });
    zone.append(el);
    setTimeout(() => el.remove(), erreur ? 9000 : delai);
  }

  // un HTML propre : gras, italique, liens, retours à la ligne, intertitres et listes ; rien d'autre (comme l'administration)
  function propre(html) {
    const t = document.createElement('template');
    t.innerHTML = html || '';
    const sortie = n => {
      if (n.nodeType === 3) return esc(n.textContent).replace(/&#39;/g, '’');
      if (n.nodeType !== 1) return '';
      const tag = n.tagName.toLowerCase(), d = [...n.childNodes].map(sortie).join('');
      if (tag === 'b' || tag === 'strong') return d.trim() ? `<strong>${d}</strong>` : d;
      if (tag === 'i' || tag === 'em') return d.trim() ? `<em>${d}</em>` : d;
      if (tag === 'br') return '<br/>';
      if (['h2', 'h3', 'ul', 'ol', 'li'].includes(tag)) return `<${tag}>${d}</${tag}>`;
      if (tag === 'a') { const h = n.getAttribute('href') || ''; return /^(https?:|mailto:|#\/)/.test(h) ? `<a href="${esc(h)}">${d}</a>` : d; }
      if (tag === 'div' || tag === 'p') return d + '<br/>';
      return d;
    };
    return [...t.content.childNodes].map(sortie).join('').replace(/(<br\/>\s*)+$/, '').replace(/&nbsp;/g, ' ').trim();
  }

  // ----------------------------------------------------------------------------------------------- session
  const lireSession = () => { try { return JSON.parse(localStorage.getItem(STOCK) || 'null'); } catch { return null; } };
  const garderSession = s => { try { if (s) localStorage.setItem(STOCK, JSON.stringify(s)); else localStorage.removeItem(STOCK); } catch { /* navigation privée */ } };
  async function auth(type, corps) {
    const r = await fetch(`${BASE}/auth/v1/token?grant_type=${type}`, { method: 'POST', headers: { apikey: CLE, 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error_description || j.msg || j.message || 'Connexion refusée');
    return { ...j, expires_at: j.expires_at || Math.floor(Date.now() / 1000) + (j.expires_in || 3600) };
  }
  async function jeton() {
    session = session || lireSession();
    if (!session) throw new Error('Connexion nécessaire');
    if (session.expires_at - 60 < Date.now() / 1000) { session = await auth('refresh_token', { refresh_token: session.refresh_token }); garderSession(session); }
    return session.access_token;
  }
  async function requete(methode, chemin, corps, entetes = {}) {
    const r = await fetch(`${BASE}${chemin}`, { method: methode, headers: { apikey: CLE, Authorization: `Bearer ${await jeton()}`, 'Content-Type': 'application/json', ...entetes },
      body: corps === undefined ? undefined : (corps instanceof Blob ? corps : JSON.stringify(corps)) });
    const txt = await r.text();
    let j = null; try { j = txt ? JSON.parse(txt) : null; } catch { j = txt; }
    if (!r.ok) throw new Error((j && (j.message || j.msg || j.error)) || `erreur ${r.status}`);
    return j;
  }
  async function estAdmin() {
    try { const uid = session?.user?.id; if (!uid) return false; const r = await requete('GET', `/rest/v1/crescite_admins?select=user_id&user_id=eq.${uid}`); return Array.isArray(r) && r.length > 0; }
    catch { return false; }
  }

  // ----------------------------------------------------------------------------------------------- chemins dans D et dans la base
  function resoudre(chemin) {
    let x = D, parent = null, cle = null;
    for (let k of chemin.split('.')) {
      if (x === D.shows) k = String(D.shows.findIndex(s => s.slug === k));
      parent = x; cle = k; x = x == null ? undefined : x[k];
    }
    return { parent, cle, valeur: x };
  }
  const ecrireD = (chemin, v) => { const r = resoudre(chemin); if (r.parent != null) r.parent[r.cle] = v; };
  const COLONNES = { titreLignes: 'titre_lignes', sousTitre: 'sous_titre', lieuTemps: 'lieu_temps', creditPhotos: 'credit_photos',
    creditDossier: 'credit_dossier', actionCulturelle: 'action_culturelle', enTournee: 'en_tournee' };
  const ateliersDe = cleDossier => { const s = D.shows.find(x => x.dossier === cleDossier); return (D.ateliers || []).filter(a => s && a.slug === s.slug); };
  // où va un chemin de D dans la base : {table, filtre, colonne, valeur()}
  function versBase(chemin) {
    const k = chemin.split('.');
    if (k[0] === 'shows' && k[2]) {
      const champ = k[2];
      return { rangee: `crescite_spectacles?slug=eq.${encodeURIComponent(k[1])}`, colonne: COLONNES[champ] || champ,
        valeur: () => { const v = clone(resoudre(`shows.${k[1]}.${champ}`).valeur); if (champ === 'photos' && Array.isArray(v)) v.forEach(p => delete p.cle); return v; } };
    }
    if (k[0] === 'site' && k[1]) return { rangee: `crescite_textes?cle=eq.${encodeURIComponent(k[1])}`, colonne: 'valeur', valeur: () => clone(D.site[k[1]]) };
    if (k[0] === 'dossiers' && k[1]) {
      if (k[2] === 'ateliers' && k[3] === 'liste' && k[5]) {
        const at = ateliersDe(k[1])[+k[4]];
        return at ? { rangee: `crescite_ateliers?id=eq.${at.id}`, colonne: k[5], valeur: () => clone(D.dossiers[k[1]].ateliers.liste[+k[4]][k[5]]) } : null;
      }
      return { rangee: `crescite_textes?cle=eq.${encodeURIComponent('dossier:' + k[1])}`, colonne: 'valeur',
        valeur: () => { const v = clone(D.dossiers[k[1]]); if (v.ateliers) v.ateliers = { titre: v.ateliers.titre }; return v; } };
    }
    return null;
  }
  // un champ de texte riche (paragraphes) ou simple (titres) : riche s'il contient déjà des balises, ou s'il est dans une liste de paragraphes
  const RICHE = /(^|\.)(texte|paragraphes|blocs|mentions|production|dispositifs|textes|sections|points|etapes|valeur|sousTitre|donateurs|partenaires|chapeau|apres|intro|atelier|alerte|lignes|axes)(\.|$)/;
  const estRiche = (chemin, v) => /<[a-z]/i.test(String(v || '')) || RICHE.test(chemin);

  // ----------------------------------------------------------------------------------------------- le mode édition
  function armer(el) {
    if (el.dataset.edArme) return;
    const v = resoudre(el.dataset.edit).valeur;
    if (typeof v !== 'string' && v != null) return;          // seulement les textes
    el.dataset.edArme = '1';
    el.dataset.edRiche = estRiche(el.dataset.edit, v) ? '1' : '';
    // le contenu exact de D (sans les découpages en lettres ou en mots des animations)
    if (!modifies.has(el.dataset.edit)) el.innerHTML = el.dataset.edRiche ? (v || '') : esc(v || '');
    el.contentEditable = 'true';
    el.spellcheck = true;
  }
  function armerTout() { if (moi.actif) $$('[data-edit]').forEach(armer); }
  function desarmerTout() { $$('[data-edit]').forEach(el => { delete el.dataset.edArme; el.removeAttribute('contenteditable'); el.classList.remove('ed-modifie'); }); }
  function majBarre() {
    if (!barre) return;
    const n = modifies.size;
    $('.ed-nb', barre).textContent = n ? `${n} modification${n > 1 ? 's' : ''} à enregistrer` : 'Cliquez un texte pour l’écrire, une date pour la modifier';
    $('[data-ed="enregistrer"]', barre).disabled = !n;
    $('[data-ed="annuler"]', barre).disabled = !n;
  }
  function entrer() {
    styles();
    moi.actif = true;
    document.documentElement.classList.add('ed-actif');
    barre = document.createElement('div');
    barre.className = 'ed-barre ed-boite';
    barre.setAttribute('role', 'region');
    barre.setAttribute('aria-label', 'Édition du site');
    barre.innerHTML = `<span class="ed-etat">Édition</span><span class="ed-nb"></span>
      <button type="button" class="ed-bt" data-ed="ajouter-date">＋ Date</button>
      <button type="button" class="ed-bt ed-plein" data-ed="enregistrer">Enregistrer</button>
      <button type="button" class="ed-bt" data-ed="annuler">Annuler</button>
      <a class="ed-bt" href="${ADMIN}" target="_blank" rel="noopener" title="Ateliers, lieux, journal…">Administration ↗</a>
      <button type="button" class="ed-bt" data-ed="quitter">Quitter</button>`;
    document.body.append(barre);
    barre.addEventListener('click', e => {
      const b = e.target.closest('[data-ed]'); if (!b) return;
      if (b.dataset.ed === 'enregistrer') enregistrer();
      if (b.dataset.ed === 'annuler') abandonner();
      if (b.dataset.ed === 'quitter') quitter();
      if (b.dataset.ed === 'ajouter-date') ouvrirDate(null);
    });
    majBarre();
    armerTout();
    boutonsAgenda();
    observateur = new MutationObserver(() => { cancelAnimationFrame(observateur.raf); observateur.raf = requestAnimationFrame(() => { armerTout(); boutonsAgenda(); }); });
    observateur.observe(document.body, { childList: true, subtree: true });
    annoncer('Mode édition : cliquez un texte pour l’écrire. Enregistrer publie aussitôt.');
  }
  function quitter() {
    if (modifies.size && !confirm('Des modifications ne sont pas enregistrées. Quitter l’édition quand même ?')) return;
    if (modifies.size) { modifies.clear(); DONNEES.suspendre(false); DONNEES.recharger({ force: true }); }
    moi.actif = false;
    observateur?.disconnect();
    barre?.remove(); barre = null; outils?.remove(); outils = null; outilPhoto?.remove(); outilPhoto = null;
    $$('.ed-ajout').forEach(b => b.remove());
    desarmerTout();
    document.documentElement.classList.remove('ed-actif');
    DONNEES.prevenir();
  }
  function abandonner() {
    if (!modifies.size || !confirm('Abandonner les modifications non enregistrées ?')) return;
    modifies.clear(); majBarre();
    desarmerTout();
    DONNEES.suspendre(false);
    DONNEES.recharger({ force: true }).then(() => { DONNEES.prevenir(); armerTout(); });
  }
  function noter(chemin) {
    modifies.add(chemin);
    DONNEES.suspendre(true);
    majBarre();
  }
  async function enregistrer() {
    if (!modifies.size) return;
    const rangees = new Map();
    for (const ch of modifies) {
      const b = versBase(ch);
      if (!b) continue;
      if (!rangees.has(b.rangee)) rangees.set(b.rangee, new Map());
      rangees.get(b.rangee).set(b.colonne, b.valeur);
    }
    const bt = $('[data-ed="enregistrer"]', barre); if (bt) bt.disabled = true;
    try {
      for (const [rangee, colonnes] of rangees) {
        const corps = Object.fromEntries([...colonnes].map(([c, f]) => [c, f()]));
        const r = await requete('PATCH', `/rest/v1/${rangee}`, corps, { Prefer: 'return=representation' });
        if (!Array.isArray(r) || !r.length) throw new Error('la base n’a rien modifié (droits du compte ?)');
      }
      modifies.clear();
      $$('.ed-modifie').forEach(el => el.classList.remove('ed-modifie'));
      majBarre();
      DONNEES.suspendre(false);
      await DONNEES.recharger({ force: true });
      annoncer('Enregistré : le site est à jour.');
    } catch (e) {
      if (bt) bt.disabled = false;
      annoncer(`L’enregistrement a échoué : ${e.message}`, { erreur: true });
    }
  }

  // la petite barre de mise en forme, au-dessus du texte qu'on écrit
  function montrerOutils(el) {
    styles();
    if (!outils) {
      outils = document.createElement('div');
      outils.className = 'ed-outils ed-boite';
      outils.addEventListener('mousedown', e => e.preventDefault());
      outils.addEventListener('click', e => {
        const b = e.target.closest('button'), cible = outils.cible; if (!b || !cible) return;
        if (b.dataset.cmd === 'createLink') { const u = prompt('Adresse du lien (https://…)'); if (u) document.execCommand('createLink', false, u); }
        else if (b.dataset.cmd) document.execCommand(b.dataset.cmd);
        else if (b.dataset.liste === 'ajouter') return ajouterApres(cible.dataset.edit);
        else if (b.dataset.liste === 'retirer') return retirer(cible.dataset.edit);
        saisir(cible);
      });
      document.body.append(outils);
    }
    outils.cible = el;
    const liste = /\.\d+$/.test(el.dataset.edit) && Array.isArray(resoudre(el.dataset.edit.replace(/\.\d+$/, '')).valeur);
    outils.innerHTML = (el.dataset.edRiche ? '<button type="button" data-cmd="bold" title="Gras"><b>G</b></button><button type="button" data-cmd="italic" title="Italique"><i>I</i></button><button type="button" data-cmd="createLink" title="Lien">lien</button>' : '')
      + (liste ? '<button type="button" data-liste="ajouter" title="Ajouter un paragraphe après celui-ci">＋ après</button><button type="button" data-liste="retirer" title="Retirer ce paragraphe">✕</button>' : '');
    outils.hidden = !outils.innerHTML;
    const r = el.getBoundingClientRect();
    outils.style.left = `${Math.max(8, Math.min(innerWidth - 260, r.left))}px`;
    outils.style.top = `${r.top > 52 ? r.top - 44 : r.bottom + 8}px`;
  }
  function saisir(el) {
    const v = el.dataset.edRiche ? propre(el.innerHTML) : el.textContent.replace(/\s+/g, ' ').trim();
    if (v === resoudre(el.dataset.edit).valeur) return;
    ecrireD(el.dataset.edit, v);
    el.classList.add('ed-modifie');
    noter(el.dataset.edit);
  }
  const vider = o => typeof o === 'string' ? '' : Array.isArray(o) ? [] : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, vider(v)])) : o;
  function ajouterApres(chemin) {
    const i = +chemin.split('.').pop(), parent = chemin.replace(/\.\d+$/, ''), arr = resoudre(parent).valeur;
    if (!Array.isArray(arr)) return;
    arr.splice(i + 1, 0, vider(clone(arr[i])));
    noter(`${parent}.${i + 1}`);
    if (document.activeElement?.blur) document.activeElement.blur();
    DONNEES.prevenir();
    // la maquette s'est redessinée : on écrit aussitôt dans le nouveau paragraphe
    const viser = () => { armerTout(); const n = $(`[data-edit="${CSS.escape(`${parent}.${i + 1}`)}"]`); if (n) { n.classList.add('ed-modifie'); n.focus(); } return !!n; };
    if (!viser()) requestAnimationFrame(viser);
  }
  function retirer(chemin) {
    const i = +chemin.split('.').pop(), parent = chemin.replace(/\.\d+$/, ''), arr = resoudre(parent).valeur;
    if (!Array.isArray(arr) || !confirm('Retirer ce paragraphe ?')) return;
    arr.splice(i, 1);
    noter(parent + '.0');
    if (outils) outils.hidden = true;
    DONNEES.prevenir();
    requestAnimationFrame(armerTout);
  }

  // les photos : on clique, on choisit, elle est allégée puis envoyée
  async function optimiser(f) {
    try {
      const img = await createImageBitmap(f), k = Math.min(1, 2000 / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const b = await new Promise(r => c.toBlob(r, 'image/webp', 0.84));
      return b && b.size < f.size ? b : f;
    } catch { return f; }
  }
  function changerPhoto(el) {
    const chemin = el.dataset.editPhoto, k = chemin.split('.');
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.addEventListener('change', async () => {
      const f = inp.files[0]; if (!f) return;
      annoncer('Envoi de la photo…');
      try {
        const blob = await optimiser(f);
        const nom = `${k[1]}/${Date.now().toString(36)}-${norm(f.name.replace(/\.[^.]+$/, '')).replace(/[^a-z0-9]+/g, '-').slice(0, 40) || 'photo'}.${blob.type === 'image/webp' ? 'webp' : (f.name.split('.').pop() || 'jpg')}`;
        await requete('POST', `/storage/v1/object/crescite/${nom.split('/').map(encodeURIComponent).join('/')}`, blob, { 'Content-Type': blob.type || f.type, 'x-upsert': 'false', 'cache-control': '31536000' });
        const url = `${BASE}/storage/v1/object/public/crescite/${nom.split('/').map(encodeURIComponent).join('/')}`;
        const cle = nom.replace(/\.[a-z0-9]+$/i, '');
        if (k[2] === 'photo') { ecrireD(`shows.${k[1]}.photo`, nom); D.photos[k[1]] = url; noter(`shows.${k[1]}.photo`); }
        else { const p = resoudre(chemin).valeur; if (p) { p.fichier = nom; p.cle = cle; D.photos[cle] = url; noter(`shows.${k[1]}.photos`); } }
        DONNEES.prevenir();
        annoncer('Photo remplacée : enregistrez pour la publier.');
      } catch (e) { annoncer(`Envoi impossible : ${e.message}`, { erreur: true }); }
    });
    inp.click();
  }

  // ----------------------------------------------------------------------------------------------- les dates
  function boutonsAgenda() {
    if (!moi.actif) return;
    $$('[data-agenda]').forEach(z => {
      if (z.querySelector(':scope > .ed-ajout')) return;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'ed-bt ed-plein ed-ajout ed-boite'; b.textContent = '＋ Ajouter une date';
      b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); ouvrirDate(null, z.dataset.agenda || null); });
      z.prepend(b);
    });
  }
  async function listes_() {
    if (listes) return listes;
    const [sp, li] = await Promise.all([requete('GET', '/rest/v1/crescite_spectacles?select=id,slug,titre,page,ordre&order=ordre'),
      requete('GET', '/rest/v1/crescite_lieux?select=id,nom,commune,departement,type,latitude,longitude&order=commune&limit=2000')]);
    listes = { sp, li };
    return listes;
  }
  const lieuTexte = l => l ? `${l.nom ? l.nom + ' — ' : ''}${l.commune} (${l.departement})` : '';
  async function ouvrirDate(id, slug = null, depart = null) {
    if (!moi.actif) return;
    let L, d = null, reps = [], suivi = {};
    try {
      L = await listes_();
      if (id) {
        const [a, b, c] = await Promise.all([requete('GET', `/rest/v1/crescite_dates?id=eq.${id}&select=*`),
          requete('GET', `/rest/v1/crescite_representations?date_id=eq.${id}&select=*&order=jour,heure`),
          requete('GET', `/rest/v1/crescite_dates_suivi?date_id=eq.${id}&select=*`)]);
        d = a[0]; reps = b; suivi = c[0] || {};
        if (!d) return annoncer('Cette date n’existe plus.', { erreur: true });
      }
    } catch (e) { return annoncer(`Lecture impossible : ${e.message}`, { erreur: true }); }
    const spSlug = slug && L.sp.find(s => s.slug === slug);
    const F = depart ? depart : d ? { ...clone(d), lien: d.lien || '', representations: reps.map(r => ({ id: r.id, jour: r.jour, heure: (r.heure || '').slice(0, 5), public: r.public, annulee: r.annulee, lien: r.lien || '', note: r.note || '' })),
      suivi: { organisateur: suivi.organisateur || '', contact: suivi.contact || '', contrat: suivi.contrat || '', notes: suivi.notes || '' } }
      : { id: null, spectacle_id: (spSlug || L.sp.find(s => s.page) || {}).id, lieu_id: null, debut: '', fin: '', precision: 'jour', public: 'tout_public', statut: 'confirmee', visible: true,
        intitule: null, details: [], lien: '', nb_representations: null, representations: [{ jour: '', heure: '20:00', public: 'tout_public', annulee: false, lien: '', note: '' }], suivi: {} };
    let libre = !!F.intitule;
    const voile = document.createElement('div');
    voile.className = 'ed-voile ed-boite';
    voile.innerHTML = `<div class="ed-panneau" role="dialog" aria-modal="true" aria-labelledby="ed-d-titre">
      <div class="ed-tete"><h2 id="ed-d-titre">${d ? 'Modifier la date' : 'Nouvelle date'}</h2><button type="button" class="ed-bt" data-x="fermer">Fermer</button></div>
      <div class="ed-corps">
        <div class="ed-apercu" id="ed-d-apercu"></div>
        <div class="ed-rangee"><label class="ed-champ"><span>Spectacle</span><select id="ed-d-sp">${L.sp.slice().sort((a, b) => (b.page - a.page) || a.ordre - b.ordre).map(s => `<option value="${s.id}"${s.id === F.spectacle_id ? ' selected' : ''}>${esc(s.titre)}${s.page ? '' : ' (ancien)'}</option>`).join('')}</select></label>
          <div class="ed-champ"><span>Statut</span><div class="ed-seg">${[['option', 'Option'], ['confirmee', 'Confirmée'], ['annulee', 'Annulée'], ['reportee', 'Reportée']].map(([k, l]) => `<button type="button" data-statut="${k}" aria-pressed="${F.statut === k}">${l}</button>`).join('')}</div></div></div>
        <div class="ed-champ"><span>Lieu</span><div class="ed-combo"><input type="search" id="ed-d-lieu" placeholder="Nom du lieu ou commune" autocomplete="off" value="${esc(lieuTexte(L.li.find(l => l.id === F.lieu_id)))}"><div class="ed-sugg" hidden></div></div>
          <div id="ed-d-nv" hidden></div></div>
        <div class="ed-champ"><span>Représentations</span><table class="ed-reps"><tbody id="ed-d-reps"></tbody></table>
          <div style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" class="ed-bt" data-x="meme-jour">＋ Le même jour</button><button type="button" class="ed-bt" data-x="lendemain">＋ Le lendemain</button><button type="button" class="ed-bt" data-x="vide">＋ Représentation</button></div></div>
        <div id="ed-d-sans"></div>
        <label class="ed-champ" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="ed-d-visible"${F.visible ? ' checked' : ''}> <span>Publiée sur le site</span></label>
        <label class="ed-champ" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="ed-d-libre"${libre ? ' checked' : ''}> <span>Écrire la ligne moi-même</span></label>
        <div class="ed-champ" id="ed-d-int-z"${libre ? '' : ' hidden'}><input type="text" id="ed-d-int" value="${esc(F.intitule || '')}" aria-label="Ligne affichée"></div>
        <div class="ed-champ"><span>Précisions sous la ligne</span><div id="ed-d-det"></div><span class="ed-aide">Vide : le site écrit lui-même « 14h et 20h : représentations au … ».</span></div>
        <label class="ed-champ"><span>Lien (billetterie ou page du lieu)</span><input type="url" id="ed-d-lien" value="${esc(F.lien)}" placeholder="https://…"></label>
        <details><summary style="cursor:pointer;font-weight:700;margin-bottom:10px">Suivi interne (jamais publié)</summary><div class="ed-rangee">
          <label class="ed-champ"><span>Organisateur</span><input type="text" id="ed-s-org" value="${esc(F.suivi.organisateur || '')}"></label>
          <label class="ed-champ"><span>Contrat</span><select id="ed-s-contrat">${['', 'à envoyer', 'envoyé', 'signé'].map(x => `<option${(F.suivi.contrat || '') === x ? ' selected' : ''}>${x}</option>`).join('')}</select></label></div>
          <label class="ed-champ"><span>Contact</span><input type="text" id="ed-s-contact" value="${esc(F.suivi.contact || '')}"></label>
          <label class="ed-champ"><span>Notes</span><textarea id="ed-s-notes">${esc(F.suivi.notes || '')}</textarea></label></details>
      </div>
      <div class="ed-pied"><span class="ed-note" id="ed-d-note">${d ? (d.source ? 'Ligne reprise de l’ancien site.' : '') : 'Nouvelle date'}</span>
        ${d ? '<button type="button" class="ed-bt" data-x="dupliquer">Dupliquer</button><button type="button" class="ed-bt ed-danger" data-x="supprimer">Supprimer</button>' : ''}
        <button type="button" class="ed-bt ed-plein" data-x="enregistrer">Enregistrer</button></div></div>`;
    document.body.append(voile);
    const P = voile.querySelector('.ed-panneau');
    const q = s => $(s, P);
    let sale = false;
    const lieuDe = () => L.li.find(l => l.id === F.lieu_id) || null;
    const apercu = () => {
      const rs = F.representations.filter(r => r.jour), js = rs.map(r => r.jour).sort();
      const dd = { ...F, debut: js[0] || F.debut, fin: js[js.length - 1] || F.fin || F.debut, precision: rs.length ? 'jour' : F.precision, intitule: libre ? F.intitule : null, details: (F.details || []).filter(x => (x.texte || '').trim()) };
      if (!dd.debut) { q('#ed-d-apercu').innerHTML = '<span class="ed-aide">Indiquez au moins un jour.</span>'; return; }
      const lg = AGENDA.ligne(dd, rs, lieuDe()), pr = AGENDA.precisions(dd, rs, lieuDe());
      q('#ed-d-apercu').innerHTML = `<b>${esc(lg)}</b>${pr.map(p => `<div>${p.texte}</div>`).join('')}<div class="ed-aide">Saison ${esc(AGENDA.saisonDe(dd.debut))}${F.statut === 'option' || !F.visible ? ' · n’apparaît pas sur le site' : ''}</div>`;
      if (!libre) q('#ed-d-int').value = AGENDA.ligne({ ...dd, intitule: null }, rs, lieuDe());
    };
    const reps_ = () => {
      q('#ed-d-reps').innerHTML = F.representations.map((r, i) => `<tr data-i="${i}"><td><input type="date" data-r="jour" value="${esc(r.jour)}" aria-label="Jour"></td>
        <td><input type="time" data-r="heure" value="${esc(r.heure)}" step="300" aria-label="Heure"></td>
        <td><select data-r="public" aria-label="Public"><option value="tout_public"${r.public === 'tout_public' ? ' selected' : ''}>Tout public</option><option value="scolaire"${r.public === 'scolaire' ? ' selected' : ''}>Scolaire</option><option value="autre"${r.public === 'autre' ? ' selected' : ''}>Autre</option></select></td>
        <td><input type="text" data-r="note" value="${esc(r.note)}" placeholder="complet…" aria-label="Précision"></td>
        <td style="white-space:nowrap"><label style="font-size:12px"><input type="checkbox" data-r="annulee"${r.annulee ? ' checked' : ''}> annulée</label></td>
        <td><button type="button" class="ed-bt ed-danger" data-retirer="${i}" title="Retirer">✕</button></td></tr>`).join('');
      q('#ed-d-sans').innerHTML = F.representations.length ? '' : `<div class="ed-rangee"><label class="ed-champ"><span>Début</span><input type="date" id="ed-d-debut" value="${esc(F.debut || '')}"></label>
        <label class="ed-champ"><span>Fin</span><input type="date" id="ed-d-fin" value="${esc(F.fin || '')}"></label>
        <label class="ed-champ"><span>Précision</span><select id="ed-d-prec">${[['jour', 'Jour'], ['periode', 'Période'], ['mois', 'Mois']].map(([k, l]) => `<option value="${k}"${F.precision === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label></div>`;
    };
    const details_ = () => {
      F.details = F.details || [];
      q('#ed-d-det').innerHTML = F.details.map((x, i) => `<div class="ed-item"><div class="ed-riche" contenteditable="true" data-det="${i}">${x.texte || ''}</div>
        <div style="display:flex;gap:6px;margin-top:6px"><input type="url" data-det-lien="${i}" value="${esc(x.lien || '')}" placeholder="Lien (facultatif)" aria-label="Lien"><button type="button" class="ed-bt ed-danger" data-det-suppr="${i}">✕</button></div></div>`).join('')
        + '<div style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" class="ed-bt" data-x="det-plus">＋ Précision</button><button type="button" class="ed-bt" data-x="det-auto">Proposer d’après les représentations</button></div>';
    };
    const changer = () => { sale = true; apercu(); };
    reps_(); details_(); apercu();
    // le lieu : chercher, ou créer (commune trouvée par geo.api.gouv.fr)
    const inp = q('#ed-d-lieu'), sug = $('.ed-sugg', P);
    const montrer = () => {
      const t = norm(inp.value).trim();
      const xs = L.li.filter(l => !t || norm(`${l.nom || ''} ${l.commune} ${l.departement}`).includes(t)).slice(0, 8);
      sug.innerHTML = xs.map(l => `<button type="button" data-id="${l.id}">${esc(lieuTexte(l))}</button>`).join('') + `<button type="button" data-nouveau>＋ Nouveau lieu${inp.value.trim() ? ` « ${esc(inp.value.trim())} »` : ''}</button>`;
      sug.hidden = false;
    };
    inp.addEventListener('focus', montrer); inp.addEventListener('input', montrer);
    sug.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      sug.hidden = true;
      if (b.dataset.id) { F.lieu_id = +b.dataset.id; inp.value = lieuTexte(lieuDe()); changer(); return; }
      const nv = q('#ed-d-nv'); nv.hidden = false;
      nv.innerHTML = `<div class="ed-item"><div class="ed-rangee"><label class="ed-champ"><span>Nom du lieu</span><input type="text" data-n="nom" value="${esc(inp.value.trim())}"></label>
        <label class="ed-champ"><span>Commune</span><input type="search" data-n="commune" autocomplete="off" placeholder="Eu, Falaise…"></label>
        <label class="ed-champ"><span>Département</span><input type="text" data-n="dep" placeholder="76"></label></div><div class="ed-sugg" data-n="sugg" hidden style="position:static"></div>
        <button type="button" class="ed-bt ed-plein" data-n="creer">Créer le lieu</button></div>`;
      let geo = null, t = null;
      const n = s => $(`[data-n="${s}"]`, nv);
      n('commune').addEventListener('input', () => {
        clearTimeout(t); geo = null;
        t = setTimeout(async () => {
          const v = n('commune').value.trim(); if (v.length < 2) return;
          try {
            const r = await fetch(`https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(v)}&fields=nom,code,codeDepartement,centre&boost=population&limit=6`);
            const xs = r.ok ? await r.json() : [];
            n('sugg').innerHTML = xs.map((c, i) => `<button type="button" data-i="${i}">${esc(c.nom)} (${esc(c.codeDepartement)})</button>`).join('');
            n('sugg').hidden = !xs.length;
            n('sugg').onclick = ev => { const x = ev.target.closest('[data-i]'); if (!x) return; geo = xs[+x.dataset.i]; n('commune').value = geo.nom; n('dep').value = geo.codeDepartement; n('sugg').hidden = true; };
          } catch { /* hors connexion */ }
        }, 250);
      });
      n('creer').addEventListener('click', async () => {
        const l = { nom: n('nom').value.trim() || null, commune: n('commune').value.trim(), departement: n('dep').value.trim(), code_insee: geo?.code || null,
          latitude: geo?.centre?.coordinates?.[1] ?? null, longitude: geo?.centre?.coordinates?.[0] ?? null, type: /coll[eè]ge|lyc[ée]e|[ée]cole/i.test(n('nom').value) ? 'etablissement' : 'salle' };
        if (!l.commune || !l.departement) return annoncer('Indiquez la commune et le département.', { erreur: true });
        try {
          const [cree] = await requete('POST', '/rest/v1/crescite_lieux', l, { Prefer: 'return=representation' });
          L.li.push(cree); F.lieu_id = cree.id; inp.value = lieuTexte(cree); nv.hidden = true; nv.innerHTML = ''; changer();
        } catch (e) { annoncer(`Lieu non créé : ${e.message}`, { erreur: true }); }
      });
      n('nom').focus();
    });
    const fermer = () => { if (sale && !confirm('Fermer sans enregistrer ?')) return; voile.remove(); };
    voile.addEventListener('mousedown', e => { if (e.target === voile) fermer(); });
    voile.addEventListener('keydown', e => { if (e.key === 'Escape') fermer(); });
    P.addEventListener('input', e => {
      const t = e.target, tr = t.closest('tr[data-i]');
      if (tr && t.dataset.r) F.representations[+tr.dataset.i][t.dataset.r] = t.type === 'checkbox' ? t.checked : t.value;
      else if (t.id === 'ed-d-int') F.intitule = t.value;
      else if (t.id === 'ed-d-lien') F.lien = t.value;
      else if (t.id === 'ed-d-debut') F.debut = t.value;
      else if (t.id === 'ed-d-fin') F.fin = t.value;
      else if (t.dataset.det !== undefined) F.details[+t.dataset.det].texte = propre(t.innerHTML);
      else if (t.dataset.detLien !== undefined) F.details[+t.dataset.detLien].lien = t.value;
      else if (t.id === 'ed-s-org') F.suivi.organisateur = t.value;
      else if (t.id === 'ed-s-contact') F.suivi.contact = t.value;
      else if (t.id === 'ed-s-notes') F.suivi.notes = t.value;
      else return;
      changer();
    });
    P.addEventListener('change', e => {
      const t = e.target, tr = t.closest('tr[data-i]');
      if (tr && t.dataset.r) F.representations[+tr.dataset.i][t.dataset.r] = t.type === 'checkbox' ? t.checked : t.value;
      else if (t.id === 'ed-d-sp') F.spectacle_id = +t.value;
      else if (t.id === 'ed-d-visible') F.visible = t.checked;
      else if (t.id === 'ed-d-prec') F.precision = t.value;
      else if (t.id === 'ed-s-contrat') F.suivi.contrat = t.value;
      else if (t.id === 'ed-d-libre') { libre = t.checked; q('#ed-d-int-z').hidden = !libre; F.intitule = libre ? q('#ed-d-int').value : null; }
      else return;
      changer();
    });
    P.addEventListener('click', async e => {
      const t = e.target, x = t.closest('[data-x]')?.dataset.x;
      const st = t.closest('[data-statut]');
      if (st) { F.statut = st.dataset.statut; $$('[data-statut]', P).forEach(b => b.setAttribute('aria-pressed', b === st)); return changer(); }
      if (t.dataset.retirer !== undefined) { F.representations.splice(+t.dataset.retirer, 1); reps_(); return changer(); }
      if (t.dataset.detSuppr !== undefined) { F.details.splice(+t.dataset.detSuppr, 1); details_(); return changer(); }
      if (!x) return;
      if (x === 'fermer') return fermer();
      const der = F.representations[F.representations.length - 1];
      if (x === 'meme-jour' || x === 'lendemain' || x === 'vide') {
        let jour = der?.jour || '', heure = '';
        if (x === 'lendemain' && jour) { const j = new Date(jour + 'T12:00:00'); j.setDate(j.getDate() + 1); jour = AGENDA.iso(j); heure = der.heure; }
        if (x === 'vide') { jour = ''; heure = '20:00'; }
        F.representations.push({ jour, heure, public: der?.public || 'tout_public', annulee: false, lien: '', note: '' });
        reps_(); changer();
        $(`#ed-d-reps tr:last-child [data-r="${x === 'vide' ? 'jour' : 'heure'}"]`, P)?.focus();
        return;
      }
      if (x === 'det-plus') { F.details.push({ texte: '', lien: null }); details_(); return changer(); }
      if (x === 'det-auto') { F.details = AGENDA.precisions({ ...F, details: [] }, F.representations.filter(r => r.jour), lieuDe()).map(p => ({ texte: p.texte, lien: null })); details_(); return changer(); }
      if (x === 'dupliquer') {
        voile.remove(); const G = clone(F); G.id = null; G.intitule = null; G.representations.forEach(r => delete r.id);
        annoncer('Copie prête : changez les jours ou le lieu, puis enregistrez.');
        return ouvrirDate(null, null, G);
      }
      if (x === 'supprimer') {
        if (!confirm('Supprimer cette date et ses représentations ?')) return;
        try {
          await requete('DELETE', `/rest/v1/crescite_dates?id=eq.${d.id}`, undefined, { Prefer: 'return=minimal' });
          voile.remove(); await DONNEES.recharger({ force: true });
          annoncer('Date supprimée.', { action: async () => {
            const sans = o => { const y = { ...o }; delete y.modifie_le; delete y.modifie_par; return y; };
            try {
              await requete('POST', '/rest/v1/crescite_dates', sans(d), { Prefer: 'return=minimal' });
              if (reps.length) await requete('POST', '/rest/v1/crescite_representations', reps.map(sans), { Prefer: 'return=minimal' });
              if (suivi.date_id) await requete('POST', '/rest/v1/crescite_dates_suivi', sans(suivi), { Prefer: 'return=minimal' });
              await DONNEES.recharger({ force: true }); annoncer('Date rétablie.');
            } catch (er) { annoncer(`Rétablissement impossible : ${er.message}`, { erreur: true }); }
          }, delai: 9000 });
        } catch (er) { annoncer(`Suppression impossible : ${er.message}`, { erreur: true }); }
        return;
      }
      if (x === 'enregistrer') {
        const rs = F.representations.filter(r => r.jour);
        if (F.representations.some(r => !r.jour)) return annoncer('Chaque représentation a besoin de son jour (ou retirez la ligne vide).', { erreur: true });
        const js = rs.map(r => r.jour).sort(), debut = js[0] || F.debut;
        if (!debut) return annoncer('Indiquez au moins un jour.', { erreur: true });
        const ps = new Set(rs.map(r => r.public));
        const charge = { id: F.id, spectacle_id: +F.spectacle_id, lieu_id: F.lieu_id, debut, fin: js[js.length - 1] || F.fin || debut, precision: rs.length ? 'jour' : F.precision,
          saison: d && d.debut === debut ? d.saison : null, public: ps.size > 1 ? 'mixte' : ps.size ? [...ps][0] : (F.public || 'tout_public'), statut: F.statut, visible: F.visible,
          intitule: libre ? (F.intitule || '').trim() || null : null, details: (F.details || []).filter(y => (y.texte || '').replace(/<[^>]+>/g, '').trim()).map(y => ({ texte: y.texte, lien: y.lien || null })),
          lien: (F.lien || '').trim() || null, nb_representations: rs.length ? null : F.nb_representations,
          representations: rs.map(r => ({ id: r.id, jour: r.jour, heure: r.heure || null, public: r.public, annulee: !!r.annulee, lien: (r.lien || '').trim() || null, note: (r.note || '').trim() || null })), suivi: F.suivi };
        t.disabled = true;
        try {
          await requete('POST', '/rest/v1/rpc/crescite_enregistrer_date', { d: charge });
          voile.remove(); await DONNEES.recharger({ force: true });
          annoncer(F.statut === 'option' || !F.visible ? 'Enregistré (non publié sur le site).' : 'Enregistré : le site est à jour.');
        } catch (er) { t.disabled = false; annoncer(`L’enregistrement a échoué : ${er.message}`, { erreur: true }); }
      }
    });
    if (depart) sale = true;
    (d ? q('#ed-d-sp') : q('#ed-d-lieu')).focus();
  }

  // ----------------------------------------------------------------------------------------------- écouteurs, en mode édition
  document.addEventListener('click', e => {
    if (!moi.actif) return;
    if (e.target.closest('.ed-boite')) return;
    const ed = e.target.closest('[data-edit]');
    if (ed) { e.preventDefault(); e.stopPropagation(); return; }                 // on écrit, on ne suit pas les liens
    const ph = e.target.closest('[data-edit-photo]');
    if (ph) { e.preventDefault(); e.stopPropagation(); return changerPhoto(ph); }
    const dt = e.target.closest('[data-date-id]');
    if (dt && dt.dataset.dateId) { e.preventDefault(); e.stopPropagation(); return ouvrirDate(+dt.dataset.dateId); }
  }, true);
  document.addEventListener('focusin', e => { if (moi.actif && e.target.closest?.('[data-edit]')) montrerOutils(e.target.closest('[data-edit]')); });
  document.addEventListener('focusout', e => { const el = e.target.closest?.('[data-edit]'); if (moi.actif && el) { saisir(el); setTimeout(() => { if (outils && !outils.contains(document.activeElement) && !document.activeElement?.closest?.('[data-edit]')) outils.hidden = true; }, 120); } });
  document.addEventListener('input', e => { const el = e.target.closest?.('[data-edit]'); if (moi.actif && el) { el.classList.add('ed-modifie'); noter(el.dataset.edit); } });
  document.addEventListener('keydown', e => {
    if (!moi.actif) return;
    const el = e.target.closest?.('[data-edit]');
    if (el && e.key === 'Escape') el.blur();
    if (el && e.key === 'Enter' && !el.dataset.edRiche) { e.preventDefault(); el.blur(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (el) saisir(el); enregistrer(); }
  }, true);
  document.addEventListener('paste', e => {
    const el = e.target.closest?.('[data-edit], .ed-riche');
    if (!moi.actif || !el) return;
    e.preventDefault();
    document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
  }, true);
  window.addEventListener('beforeunload', e => { if (moi.actif && modifies.size) { e.preventDefault(); e.returnValue = ''; } });

  // ----------------------------------------------------------------------------------------------- connexion
  function ecranConnexion() {
    styles();
    const voile = document.createElement('div');
    voile.className = 'ed-voile ed-boite';
    voile.innerHTML = `<form class="ed-panneau ed-petit" role="dialog" aria-modal="true" aria-labelledby="ed-c-titre">
      <div class="ed-tete"><h2 id="ed-c-titre">Modifier le site</h2><button type="button" class="ed-bt" data-x="fermer">Fermer</button></div>
      <div class="ed-corps"><p class="ed-aide" style="margin:0 0 12px">Réservé à la compagnie : connectez-vous avec le compte de l’administration.</p>
        <label class="ed-champ"><span>Adresse électronique</span><input type="email" id="ed-c-mel" autocomplete="username" required></label>
        <label class="ed-champ"><span>Mot de passe</span><input type="password" id="ed-c-mdp" autocomplete="current-password" required></label>
        <p class="ed-aide" id="ed-c-err" role="alert" style="color:#b3261e;margin:0 0 8px"></p></div>
      <div class="ed-pied"><a class="ed-note" href="${ADMIN}" target="_blank" rel="noopener">Mot de passe oublié ?</a><button type="submit" class="ed-bt ed-plein">Se connecter</button></div></form>`;
    document.body.append(voile);
    $('#ed-c-mel', voile).focus();
    $('[data-x="fermer"]', voile).addEventListener('click', () => voile.remove());
    voile.addEventListener('keydown', e => { if (e.key === 'Escape') voile.remove(); });
    $('form', voile).addEventListener('submit', async e => {
      e.preventDefault();
      const b = $('button[type=submit]', voile); b.disabled = true;
      try {
        session = await auth('password', { email: $('#ed-c-mel', voile).value.trim(), password: $('#ed-c-mdp', voile).value });
        garderSession(session);
        if (!(await estAdmin())) throw new Error('Ce compte n’administre pas le site de la compagnie.');
        voile.remove(); entrer();
      } catch (err) { b.disabled = false; $('#ed-c-err', voile).textContent = /invalid/i.test(err.message) ? 'Adresse ou mot de passe incorrect.' : err.message; }
    });
  }
  moi.ouvrir = async () => {
    if (moi.actif) return;
    styles();
    if (typeof DONNEES === 'undefined' || DONNEES.etat !== 'base') {
      if (typeof DONNEES !== 'undefined' && DONNEES.etat === 'instantane') await DONNEES.recharger();
      if (typeof DONNEES === 'undefined' || DONNEES.etat !== 'base') return annoncer('La base de la compagnie ne répond pas : la modification est impossible pour l’instant.', { erreur: true });
    }
    session = lireSession();
    if (session) { try { await jeton(); if (await estAdmin()) return entrer(); } catch { session = null; garderSession(null); } }
    ecranConnexion();
  };
  // #edition dans l'adresse (lien depuis l'administration) ouvre directement l'édition
  if (/[?&]edition\b/.test(location.search)) setTimeout(() => moi.ouvrir(), 600);
  return moi;
})();
