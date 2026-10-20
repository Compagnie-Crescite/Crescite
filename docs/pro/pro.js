/* L'espace des salles (pro/) : un programmateur ou un directeur de salle invité par la compagnie y trouve les captations
   et les documents des spectacles qu'on lui ouvre. Le lien reçu est …/pro/#<jeton> : le jeton est lu dans l'adresse, puis
   gardé pour la session (un rechargement marche) et retiré de la barre d'adresse. Il ne voyage que dans le corps des
   requêtes, jamais dans une adresse.

   La page ne lit rien d'autre de la base que le contact diffusion (crescite_textes 'programmation', public) : la fonction
   « crescite-pro » (supabase/functions/crescite-pro) vérifie l'invitation, donne les spectacles et leurs documents, et
   pour chaque document son lien (une captation en ligne) ou un lien de téléchargement d'une heure. Elle note les visites
   et les ouvertures, que l'administration retrouve dans l'onglet « Espace pro ».

   Sans jeton, ou avec un jeton refusé : un champ « Code d'accès » et « Demander un accès ». ?anim=0 dans l'adresse
   (essais, captures) coupe le mouvement, comme le réglage « moins d'animations » de l'appareil. */
(() => {
  'use strict';
  const BASE = 'https://omekkqjinvppadsoinvj.supabase.co';
  const CLE = 'sb_publishable_TODW6NdmDly8eR9UxjG-6g_eyAa4gjB';   // la clé publique du projet (celle du site)
  const FONCTION = `${BASE}/functions/v1/crescite-pro`;
  const PUBLIC = `${BASE}/storage/v1/object/public/crescite`;
  const SESSION = 'crescite-pro-jeton';
  const CONTACT_DEFAUT = { nom: '', role: '', email: 'contact@crescite.fr', telephone: null };
  const $ = (s, r = document) => r.querySelector(s);
  const main = $('#contenu');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const txt = v => String(v ?? '').trim();
  const maj = s => s ? s[0].toUpperCase() + s.slice(1) : '';
  // un sous-titre de la base peut porter de l'italique (« d'après <em>Rodogune</em> ») : seulement ces balises-là
  const riche = s => esc(s).replace(/&lt;(\/?)(em|i|strong|b)&gt;/g, '<$1$2>').replace(/&lt;br\s*\/?&gt;/g, ' ');
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const dateLongue = j => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(j || ''); return m ? `${+m[3] === 1 ? '1er' : +m[3]} ${MOIS[+m[2] - 1]} ${m[1]}` : ''; };
  if (new URLSearchParams(location.search).get('anim') === '0') document.documentElement.classList.add('sans-mouvement');
  const annoncer = m => { const a = $('#annonce'); a.textContent = ''; setTimeout(() => { a.textContent = m; }, 30); };

  // ---------------------------------------------------------------------------------------------- le logo
  const logo = $('.logo');
  const badge = () => { const b = document.createElement('span'); b.className = 'logo badge-logo'; b.setAttribute('aria-hidden', 'true'); b.textContent = 'crescite'; logo.replaceWith(b); };
  if (logo.complete && !logo.naturalWidth) badge(); else logo.addEventListener('error', badge, { once: true });

  // ---------------------------------------------------------------------------------------------- le jeton
  // un code collé tel quel, ou le lien entier
  const jetonDe = t => { const s = txt(t), m = /#([A-Za-z0-9_-]{32,128})$/.exec(s) || /^([A-Za-z0-9_-]{32,128})$/.exec(s); return m ? m[1] : null; };
  const lireSession = () => { try { return sessionStorage.getItem(SESSION); } catch (e) { return null; } };
  const garder = j => { try { if (j) sessionStorage.setItem(SESSION, j); else sessionStorage.removeItem(SESSION); } catch (e) { /* navigation privée */ } };
  let jeton = null;
  const duLien = jetonDe(location.hash.slice(1));
  if (duLien) { jeton = duLien; garder(jeton); history.replaceState(null, '', location.pathname + location.search); }
  else jeton = lireSession();

  // ---------------------------------------------------------------------------------------------- la fonction, le contact
  async function appeler(corps) {
    const r = await fetch(FONCTION, { method: 'POST', cache: 'no-store', referrerPolicy: 'no-referrer',
      headers: { apikey: CLE, Authorization: `Bearer ${CLE}`, 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
    let x = null;
    try { x = await r.json(); } catch (e) { /* pas de JSON */ }
    return { statut: r.status, x };
  }
  // le contact diffusion de la compagnie (celui de la page « Je souhaite programmer »)
  const contact = (async () => {
    try {
      const r = await fetch(`${BASE}/rest/v1/crescite_textes?select=valeur&cle=eq.programmation`, { headers: { apikey: CLE, Accept: 'application/json' }, cache: 'no-store' });
      if (r.ok) { const c = (await r.json())?.[0]?.valeur?.contact; if (c && (txt(c.email) || txt(c.nom))) return { ...CONTACT_DEFAUT, ...c, email: txt(c.email) || CONTACT_DEFAUT.email }; }
    } catch (e) { /* hors ligne : le courriel de la compagnie */ }
    return CONTACT_DEFAUT;
  })();
  const mailto = (c, sujet, corps) => `mailto:${encodeURIComponent(c.email).replace(/%40/g, '@')}?subject=${encodeURIComponent(sujet)}${corps ? `&body=${encodeURIComponent(corps)}` : ''}`;
  contact.then(c => { const a = $('#ecrire'); a.href = mailto(c, 'Espace des salles : une question'); a.hidden = false; });

  // ---------------------------------------------------------------------------------------------- les icônes
  const trace = d => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICONES = {
    video: trace('<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m10 9 5 3-5 3z" fill="currentColor"/>'),
    images: trace('<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>'),
    dossier: trace('<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2h7.5A2.5 2.5 0 0 1 21 9.5v8A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z"/>'),
    fiche_technique: trace('<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'),
    plan: trace('<path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z"/><path d="M9 4v13.5M15 6.5V20"/>'),
    texte: trace('<path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>'),
    autre: trace('<path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M14 3v5h5"/>'),
    aller: trace('<path d="M14 5h5v5M19 5l-8 8M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>'),
    telecharger: trace('<path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14"/>'),
    attente: trace('<path d="M12 3a9 9 0 1 0 9 9" />'),
  };
  // le genre d'un document : son type, et son titre pour ce que les types ne disent pas (une captation, des photos)
  function genre(d) {
    const t = txt(d.titre).toLowerCase();
    if (/captation|vid[ée]o|film|teaser|bande[- ]annonce|extrait/.test(t)) return { icone: 'video', mot: d.lien ? 'Vidéo en ligne' : 'Vidéo' };
    if (/photo|image|visuel/.test(t)) return { icone: 'images', mot: d.lien ? 'Photos en ligne' : 'Photos' };
    const mots = { dossier: 'Dossier', fiche_technique: 'Fiche technique', plan: 'Plan', texte: 'Texte' };
    return { icone: ICONES[d.type] ? d.type : 'autre', mot: mots[d.type] || 'Document' };
  }

  // ---------------------------------------------------------------------------------------------- les couleurs d'univers
  const hexa = c => /^#[0-9a-f]{6}$/i.test(c || '');
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const lum = h => { const [r, g, b] = rgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const contraste = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  // la même teinte, assombrie ou éclaircie jusqu'à se lire sur le fond
  function lisible(c, fond) {
    if (contraste(c, fond) >= 4.6) return c;
    const sombre = lum(fond) < 0.3, [r, g, b] = rgb(c);
    for (let k = 0.04; k <= 1; k += 0.04) {
      const x = '#' + [r, g, b].map(v => Math.round(sombre ? v + (255 - v) * k : v * (1 - k)).toString(16).padStart(2, '0')).join('');
      if (contraste(x, fond) >= 4.6) return x;
    }
    return sombre ? '#ffffff' : '#1d1418';
  }
  const couleurs = s => { const c = s?.univers?.couleurs || {}, u = [c.scene, c.accent, c.texte].find(hexa) || '#a3306b'; return `--ul:${lisible(u, '#fffdf9')};--us:${lisible(u, '#1f1921')}`; };
  // la police du titre (celle de son univers), chargée pour ce seul titre
  function police(s) {
    const p = s?.univers?.polices, fam = txt(p?.titre);
    if (!fam || !/^[A-Za-z0-9 -]{2,40}$/.test(fam) || !s.titre) return '';
    const g = [100, 200, 300, 400, 500, 600, 700, 800, 900].includes(+p.titreGraisse) ? +p.titreGraisse : 600;
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.crossOrigin = 'anonymous';
    l.href = `https://fonts.googleapis.com/css2?family=${fam.replace(/ /g, '+')}:wght@${g}&display=swap&text=${encodeURIComponent([...new Set(String(s.titre))].join(''))}`;
    document.head.append(l);
    return `font-family:'${fam}', var(--serif);font-weight:${g}`;
  }
  const photo = f => f ? `${PUBLIC}/${String(f).split('/').map(encodeURIComponent).join('/')}` : '';

  // ---------------------------------------------------------------------------------------------- les vues
  function montrer(html, focus = false) {
    main.innerHTML = html;
    if (focus) main.focus({ preventScroll: true });
  }
  // sans code, ou un code refusé
  async function porte(refuse = false, panne = false) {
    const c = await contact;
    const demande = mailto(c, 'Demande d’accès à l’espace des salles', 'Bonjour,\n\nJe souhaiterais accéder à l’espace des salles de la compagnie Crescite.\nStructure : \nSpectacle(s) : \n\nMerci.');
    montrer(`<section class="porte parait" aria-labelledby="titre-porte">
      <p class="sur">Compagnie Crescite</p>
      <h1 id="titre-porte">Espace des salles</h1>
      <p>Les captations et les documents de nos spectacles, pour les salles et les festivals que nous invitons.</p>
      ${refuse ? '<p class="message" role="alert" style="margin-top:14px">Ce lien n’est plus valable : écrivez-nous pour le renouveler.</p>' : ''}
      ${panne ? '<p class="message neutre" role="alert" style="margin-top:14px">L’espace ne répond pas pour le moment. Réessayez dans un instant.</p>' : ''}
      <form id="form-code" novalidate>
        <label for="code">Code d’accès</label>
        <div class="ligne"><input id="code" name="code" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="text" aria-describedby="code-aide"><button class="bouton" type="submit">Entrer</button></div>
        <p class="aide" id="code-aide">Il est dans le lien que nous vous avons envoyé : collez le lien entier ou le code seul.</p>
        <p class="message" id="code-erreur" role="alert" hidden></p>
      </form>
      <div class="demander"><p>Pas encore d’accès ?</p><a class="bouton second" href="${esc(demande)}">Demander un accès</a></div>
    </section>`, refuse || panne);
    const form = $('#form-code');
    form.addEventListener('submit', e => {
      e.preventDefault();
      const j = jetonDe($('#code').value);
      const err = $('#code-erreur');
      if (!j) { err.textContent = 'Ce code n’est pas complet : vérifiez qu’il est bien collé en entier.'; err.hidden = false; $('#code').focus(); return; }
      jeton = j; garder(j); ouvrirEspace(true);
    });
    if (!refuse && !panne) $('#code').focus({ preventScroll: true });
  }

  let espace = null;
  async function ouvrirEspace(focus = false) {
    if (!jeton) return porte();
    montrer('<p class="chargement" role="status">Ouverture de votre espace…</p>');
    let r;
    try { r = await appeler({ jeton }); } catch (e) { return porte(false, true); }
    if (r.statut === 404 && r.x?.erreur === 'acces') { jeton = null; garder(null); return porte(true); }
    if (r.statut !== 200 || !r.x || !Array.isArray(r.x.spectacles)) return porte(false, true);
    espace = r.x;
    rendre(espace, await contact, focus);
  }

  function rendre(x, c, focus) {
    const a = x.acces || {}, fin = dateLongue(a.expire_le);
    const bloc = (s, i) => {
      const docs = Array.isArray(s.documents) ? s.documents : [];
      const salles = docs.filter(d => d.pour === 'salles'), pros = docs.filter(d => d.pour !== 'salles');
      const liste = (titre, xs) => xs.length ? `<div class="groupe"><h3>${esc(titre)}</h3><ul class="docs">${xs.map(d => {
        const g = genre(d);
        return `<li><button type="button" class="doc" data-doc="${esc(d.id)}"><span class="pastille">${ICONES[g.icone]}</span><span class="texte"><span class="titre">${esc(d.titre)}</span><span class="genre">${esc(g.mot)}${d.lien ? ' · s’ouvre en ligne' : ' · à télécharger'}</span></span><span class="aller">${d.lien ? ICONES.aller : ICONES.telecharger}</span><span class="sr"> (${esc(s.titre)}, nouvel onglet)</span></button><div class="secours" hidden></div></li>`;
      }).join('')}</ul></div>` : '';
      return `<article class="spectacle parait" style="--i:${i};${couleurs(s)}" aria-labelledby="sp-${esc(s.id)}">
        <div class="photo">${s.photo ? `<img src="${esc(photo(s.photo))}" alt="" loading="${i < 2 ? 'eager' : 'lazy'}" decoding="async">` : ''}</div>
        <div class="corps"><h2 id="sp-${esc(s.id)}" style="${police(s)}">${esc(s.titre)}</h2>
          ${txt(s.sous_titre) ? `<p class="sous">${riche(s.sous_titre)}</p>` : ''}${txt(s.creation) ? `<p class="creation">${esc(maj(txt(s.creation)))}</p>` : ''}
          ${liste('Réservé aux salles', salles)}${liste('Dossiers et fiches techniques', pros)}
          ${docs.length ? '' : '<p class="vide">Aucun document pour l’instant.</p>'}</div></article>`;
    };
    const tel = txt(c.telephone);
    montrer(`<section class="accueil parait" aria-labelledby="bonjour">
        <p class="sur">Espace des salles</p>
        <h1 id="bonjour">Bonjour${txt(a.contact) ? ` ${esc(a.contact)}` : ''}</h1>
        ${txt(a.nom) ? `<p class="structure">${esc(a.nom)}</p>` : ''}
        ${fin ? `<p class="fin">Accès ouvert jusqu’au ${esc(fin)}</p>` : ''}
        <p class="intro">Voici les captations et les documents des spectacles que nous vous ouvrons. Chaque document s’ouvre dans un nouvel onglet.</p>
      </section>
      ${x.spectacles.length ? `<div class="spectacles">${x.spectacles.map(bloc).join('')}</div>` : '<p class="vide">Aucun spectacle n’est ouvert pour l’instant : écrivez-nous.</p>'}
      <section class="contact parait" style="--i:${x.spectacles.length + 1}" aria-labelledby="titre-contact">
        <h2 id="titre-contact">Une question, une date ?</h2>
        <p>${txt(c.nom) ? `${esc(c.nom)}${txt(c.role) ? `, ${esc(txt(c.role).toLowerCase())}` : ''}` : 'La compagnie'}</p>
        <p class="coords"><a href="${esc(mailto(c, `${txt(a.nom) || 'Espace des salles'} : une question`))}">${esc(c.email)}</a>${tel ? `<a href="tel:${esc(tel.replace(/[^\d+]/g, '').replace(/^0(\d{9})$/, '+33$1'))}">${esc(tel)}</a>` : ''}</p>
        <p class="reserve">Ces documents vous sont réservés : merci de ne pas les diffuser.</p>
      </section>`, focus);
    document.title = `Crescite · Espace des salles${txt(a.nom) ? ` · ${a.nom}` : ''}`;
  }

  // ---------------------------------------------------------------------------------------------- ouvrir un document
  // L'onglet s'ouvre dans le geste lui-même (sinon un bloqueur de fenêtres l'arrête) : vide d'abord, il reçoit le lien
  // dès que la fonction le donne. Si le navigateur l'a bloqué quand même, un lien prend sa place dans la page.
  main.addEventListener('click', async e => {
    const b = e.target.closest('button.doc');
    if (!b || b.getAttribute('aria-busy') === 'true') return;
    const id = +b.dataset.doc, secours = b.parentNode.querySelector('.secours');
    let w = null;
    try { w = window.open('', '_blank'); } catch (err) { w = null; }
    if (w) { try { w.document.title = 'Ouverture…'; w.document.body.innerHTML = '<p style="font:16px/1.5 system-ui,sans-serif;padding:2rem;color:#5f565a">Ouverture du document…</p>'; } catch (err) { /* rien */ } }
    b.setAttribute('aria-busy', 'true');
    const aller = b.querySelector('.aller'), avant = aller.innerHTML;
    aller.innerHTML = ICONES.attente;
    secours.hidden = true;
    annoncer('Ouverture du document…');
    const fermer = () => { try { if (w && !w.closed) w.close(); } catch (err) { /* rien */ } };
    try {
      const r = await appeler({ jeton, document_id: id });
      if (r.statut === 200 && r.x?.url && /^https?:\/\//i.test(r.x.url)) {
        if (w && !w.closed) { try { w.opener = null; } catch (err) { /* rien */ } w.location.replace(r.x.url); annoncer(`« ${r.x.titre || 'Le document'} » s’ouvre dans un nouvel onglet.`); }
        else { secours.innerHTML = `<a href="${esc(r.x.url)}" target="_blank" rel="noopener noreferrer">Ouvrir « ${esc(r.x.titre || 'le document')} »</a>`; secours.hidden = false; $('a', secours).focus(); }
      } else if (r.statut === 404 && r.x?.erreur === 'acces') {
        fermer(); jeton = null; garder(null); porte(true);
      } else {
        fermer();
        secours.innerHTML = '<span class="message">Ce document ne s’ouvre pas pour le moment. Réessayez, ou écrivez-nous.</span>'; secours.hidden = false;
        annoncer('Ce document ne s’ouvre pas pour le moment.');
      }
    } catch (err) {
      fermer();
      secours.innerHTML = '<span class="message">L’espace ne répond pas pour le moment. Réessayez dans un instant.</span>'; secours.hidden = false;
    } finally {
      if (b.isConnected) { b.removeAttribute('aria-busy'); aller.innerHTML = avant; }
    }
  });

  // un lien reçu alors que la page est déjà ouverte (un autre lien collé dans l'adresse)
  window.addEventListener('hashchange', () => {
    const j = jetonDe(location.hash.slice(1));
    if (!j) return;
    jeton = j; garder(j); history.replaceState(null, '', location.pathname + location.search); ouvrirEspace(true);
  });

  ouvrirEspace();
})();
