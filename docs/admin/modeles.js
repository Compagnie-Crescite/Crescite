'use strict';
/* Les documents générés depuis les fiches : un devis, un contrat de cession, une facture, une fiche technique d'accueil,
   produits à partir des modèles de la compagnie (Textes du site → « Modèle : devis »…, créés avec un texte de départ à la
   première demande), les champs remplis depuis la date (le spectacle, les séances, le lieu, l'équipe en tournée, le
   contact du suivi) ou depuis la piste de diffusion (la structure, le contact), le montant, la TVA (5,5 % pour un
   spectacle vivant) et les conditions demandés dans un formulaire. Numérotés (DEV-2026-003…), mis en page en A4 avec le
   logo et les coordonnées de la compagnie, imprimés ou enregistrés en PDF par le navigateur. Chaque document généré est
   gardé (crescite_textes, documents:generes : son numéro, ses champs) et se réimprime depuis la fiche. Les modèles sont
   un texte de départ : la compagnie les relit et les adapte dans Textes du site. Chargé après tiroir.js et selection.js.
   MODELES.generer({ date, prospect, type })   MODELES.bloc(el, { date, prospect })   MODELES.TYPES   MODELES.champs(ctx) */
const MODELES = (() => {
  const TYPES = {
    devis: { nom: 'Devis', prefixe: 'DEV', montant: true, validite: 'deux mois' },
    contrat: { nom: 'Contrat de cession', prefixe: 'CES', montant: true },
    facture: { nom: 'Facture', prefixe: 'FAC', montant: true },
    fiche_technique: { nom: 'Fiche technique d’accueil', prefixe: 'FT', montant: false },
  };
  const CLE_GENERES = 'documents:generes', TVA = 5.5;
  const CHAMPS = ['numero', 'date_du_jour', 'objet', 'compagnie', 'compagnie_adresse', 'compagnie_ville', 'compagnie_legal', 'contact_nom', 'contact_role', 'contact_email', 'contact_telephone',
    'structure', 'structure_adresse', 'structure_contact', 'spectacle', 'duree', 'genre', 'dates', 'premiere_date', 'nb_representations', 'lieu', 'jauge', 'plateau', 'equipe', 'equipe_nombre',
    'montant_ht', 'tva_taux', 'tva', 'montant_ttc', 'conditions', 'validite'];
  const DEFAUTS = {
    'modele:devis': { titre: 'Devis', objet: 'Cession du spectacle « {{spectacle}} »', conditions: 'Défraiements (transport, hébergement, repas de l’équipe en tournée) à la charge de l’organisateur, au tarif conventionnel en vigueur.',
      corps: `<p>Madame, Monsieur,</p><p>Suite à nos échanges, nous avons le plaisir de vous adresser notre proposition pour l’accueil du spectacle <strong>{{spectacle}}</strong> ({{duree}}) :</p>{{dates}}<p>Lieu : {{lieu}}.</p>
<p>Le prix de cession comprend les salaires et les charges de l’équipe artistique et technique en tournée ({{equipe_nombre}}). Les droits d’auteur et droits voisins restent à la charge de l’organisateur.</p><p>{{conditions}}</p><p>Ce devis est valable {{validite}}.</p>`,
      pied: '<p>Nous restons à votre disposition pour toute précision, et vous prions d’agréer, Madame, Monsieur, nos salutations les meilleures.</p><p>{{contact_nom}}, {{contact_role}}</p>' },
    'modele:contrat': { titre: 'Contrat de cession du droit d’exploitation d’un spectacle', objet: 'Cession du spectacle « {{spectacle}} »', conditions: 'Règlement à réception de facture, par virement, dans les trente jours suivant la dernière représentation.',
      corps: `<p>Entre les soussignés :</p><p><strong>{{compagnie}}</strong>, {{compagnie_adresse}} — {{compagnie_legal}}, représentée par {{contact_nom}}, {{contact_role}}, ci-après « le Producteur »,</p>
<p>et <strong>{{structure}}</strong>, {{structure_adresse}}, représenté par {{structure_contact}}, ci-après « l’Organisateur »,</p><p>il est convenu ce qui suit.</p>
<h3>Article 1 — Objet</h3><p>Le Producteur s’engage à donner, dans les conditions définies ci-après, {{nb_representations}} du spectacle <strong>{{spectacle}}</strong> ({{duree}}) :</p>{{dates}}<p>Lieu : {{lieu}}.</p>
<h3>Article 2 — Obligations du Producteur</h3><p>Le Producteur fournit le spectacle entièrement monté et assume la responsabilité artistique des représentations. Il est employeur du personnel artistique et technique attaché au spectacle ({{equipe_nombre}} en tournée) et règle les salaires, charges sociales et fiscales afférents. Il fournit la fiche technique et les éléments de communication.</p>
<h3>Article 3 — Obligations de l’Organisateur</h3><p>L’Organisateur fournit le lieu en ordre de marche, conforme à la fiche technique, avec le personnel d’accueil, de sécurité et de régie nécessaire. Il assure la billetterie, la promotion locale, et règle les droits d’auteur et droits voisins afférents aux représentations.</p>
<h3>Article 4 — Conditions financières</h3><p>En contrepartie, l’Organisateur versera au Producteur la somme de {{montant_ht}} HT, soit {{montant_ttc}} TTC (TVA {{tva_taux}} %). {{conditions}}</p>
<h3>Article 5 — Défraiements</h3><p>Les frais de transport, d’hébergement et de repas de l’équipe en tournée sont pris en charge par l’Organisateur, au tarif conventionnel en vigueur, sauf accord contraire précisé à l’article 4.</p>
<h3>Article 6 — Annulation</h3><p>En cas d’annulation du fait de l’une des parties, hors cas de force majeure, la partie défaillante devra à l’autre une indemnité égale au montant du présent contrat, sans préjudice des frais déjà engagés.</p>
<h3>Article 7 — Litiges</h3><p>Les parties s’engagent à rechercher une solution amiable à toute difficulté d’application du présent contrat, avant tout recours aux tribunaux compétents.</p>`,
      pied: '<p>Fait à {{compagnie_ville}}, le {{date_du_jour}}, en deux exemplaires.</p><table class="doc-signatures"><tr><td>Pour le Producteur<br><em>{{contact_nom}}</em></td><td>Pour l’Organisateur<br><em>{{structure_contact}}</em></td></tr></table>' },
    'modele:facture': { titre: 'Facture', objet: 'Cession du spectacle « {{spectacle}} »', conditions: 'Règlement à réception, par virement. Pas d’escompte pour paiement anticipé ; pénalités de retard au taux légal et indemnité forfaitaire de recouvrement de 40 € en cas de retard.',
      corps: '<p>Cession du spectacle <strong>{{spectacle}}</strong> à {{structure}} :</p>{{dates}}<p>Lieu : {{lieu}}.</p>', pied: '<p>{{conditions}}</p><p>TVA au taux réduit applicable aux spectacles vivants.</p>' },
    'modele:fiche_technique': { titre: 'Fiche technique d’accueil', objet: 'Accueil du spectacle « {{spectacle}} »', conditions: 'Plateau libre et en ordre de marche à l’arrivée de l’équipe ; loges chauffées avec miroirs, point d’eau et catering léger ; un régisseur du lieu présent du montage au démontage.',
      corps: `<p>Spectacle <strong>{{spectacle}}</strong> — {{duree}}{{genre}}.</p>{{dates}}<p>Lieu : {{lieu}} — jauge : {{jauge}} — plateau : {{plateau}}.</p><h3>Équipe en tournée</h3>{{equipe}}<h3>Conditions d’accueil</h3><p>{{conditions}}</p>`,
      pied: '<h3>Contact</h3><p>{{contact_nom}}, {{contact_role}} — {{contact_email}} — {{contact_telephone}}</p>' },
  };
  const SPEC_MODELE = [{ k: 'titre', t: 'texte', l: 'Titre du document' }, { k: 'objet', t: 'texte', l: 'Objet', aide: 'Proposé au moment de générer ; {{spectacle}} y est remplacé.' },
    { k: 'corps', t: 'html', l: 'Corps', aide: `Les champs entre doubles accolades sont remplis à la génération : ${CHAMPS.map(c => `{{${c}}}`).join(' ')}.` },
    { k: 'pied', t: 'html', l: 'Pied (après le tableau des montants)' }, { k: 'conditions', t: 'long', l: 'Conditions proposées', lignes: 3 }];
  if (typeof TEXTES !== 'undefined') Object.keys(DEFAUTS).forEach(k => { TEXTES[k] = [`Modèle : ${TYPES[k.slice(7)].nom.toLowerCase()}`, SPEC_MODELE]; });

  const texteDe = cle => (E.textes.find(t => t.cle === cle) || {}).valeur;
  async function modele(type) {
    const cle = `modele:${type}`;
    let v = texteDe(cle);
    if (v && typeof v === 'object' && v.corps) return v;
    v = clone(DEFAUTS[cle]);
    const { error } = await sb.from('crescite_textes').upsert({ cle, valeur: v }, { onConflict: 'cle' });
    if (error) console.error(error); else if (!E.textes.some(t => t.cle === cle)) E.textes.push({ cle, valeur: v });
    return v;
  }
  const generes = () => { const v = texteDe(CLE_GENERES); return Array.isArray(v) ? v : []; };
  async function garder(doc) {
    const xs = [doc, ...generes()].slice(0, 500);
    const { error } = await sb.from('crescite_textes').upsert({ cle: CLE_GENERES, valeur: xs }, { onConflict: 'cle' });
    if (error) { erreur(error, 'Document imprimé, mais pas gardé'); return; }
    const t = E.textes.find(x => x.cle === CLE_GENERES); if (t) t.valeur = xs; else E.textes.push({ cle: CLE_GENERES, valeur: xs });
  }
  const numero = type => { const an = AUJ.slice(0, 4), n = generes().filter(d => d.type === type && String(d.numero || '').includes(`-${an}-`)).length + 1; return `${TYPES[type].prefixe}-${an}-${String(n).padStart(3, '0')}`; };
  const euros = n => `${(Number(n) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  const lignes = xs => (Array.isArray(xs) ? xs : String(xs || '').split('\n')).map(x => String(x || '').trim()).filter(Boolean);
  const jourLong = j => (j ? new Date(`${j}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '');
  // les champs d'un document : la compagnie (Textes du site : coordonnées, le contact de « Je souhaite programmer »), puis la date ou la piste
  function champs({ date: d = null, prospect: p = null, valeurs: v = {} } = {}) {
    const co = texteDe('coordonnees') || {}, pr = (texteDe('programmation') || {}).contact || {};
    const sp = spectacle(d ? d.spectacle_id : p?.spectacle_id), l = d ? lieu(d.lieu_id) : null, su = d ? (E.suivis.find(x => x.date_id === d.id) || {}) : {}, ls = l ? (E.lieuxSuivi.find(x => x.lieu_id === l.id) || {}) : {};
    const reps = d ? repsDe(d.id).filter(r => !r.annulee) : [];
    const dates = reps.length ? `<ul>${reps.map(r => `<li>${esc(jourLong(r.jour))}${r.heure ? ` à ${esc(AGENDA.heureTexte(h5(r.heure)))}` : ''}${r.public === 'scolaire' ? ' (séance scolaire)' : ''}</li>`).join('')}</ul>`
      : d ? `<p>${esc(d.fin && d.fin !== d.debut ? `du ${jourLong(d.debut)} au ${jourLong(d.fin)}` : jourLong(d.debut))}${d.nb_representations ? ` (${d.nb_representations} représentations)` : ''}</p>` : p?.periode_souhaitee ? `<p>${esc(p.periode_souhaitee)}</p>` : '<p>Dates à convenir.</p>';
    let equipe = [];
    try { equipe = d && E.equipeInstallee ? equipeDeLaDate(d) : sp && E.equipeInstallee ? distributionDe(sp.id).filter(x => x.en_tournee).map(x => ({ personne_id: x.personne_id, fonction: fonctionDistribution(x) })) : []; } catch (e) { equipe = []; }
    const nomEq = x => { const q = personne(x.personne_id); return q ? `${nomDe(q)}${x.fonction ? ` — ${x.fonction}` : (q.metiers || [])[0] ? ` — ${(q.metiers || [])[0]}` : ''}` : ''; };
    const ht = Number(v.montant_ht) || 0, taux = v.tva_taux == null || v.tva_taux === '' ? TVA : Number(v.tva_taux) || 0, tva = Math.round(ht * taux) / 100, ttc = ht + tva;
    const n = reps.length || d?.nb_representations || 0;
    const c = {
      numero: v.numero || '', date_du_jour: jourLong(AUJ).replace(/^\w+ /, ''), objet: v.objet || '',
      compagnie: co.nom || 'Compagnie Crescite', compagnie_adresse: lignes(co.adresse).join(', '), compagnie_ville: (lignes(co.adresse).slice(-1)[0] || '').replace(/^\d{5}\s*/, '') || 'Rouen', compagnie_legal: lignes(co.legal).join(' — '),
      contact_nom: pr.nom || '', contact_role: pr.role || '', contact_email: pr.email || '', contact_telephone: pr.telephone || '',
      structure: v.structure || (p ? p.structure : l ? (l.nom || l.commune) : su.organisateur || ''), structure_adresse: v.structure_adresse || (p ? [p.commune, p.departement ? `(${p.departement})` : ''].filter(Boolean).join(' ') : l ? [l.adresse, l.commune].filter(Boolean).join(', ') : ''),
      structure_contact: v.structure_contact || (p ? p.contact_nom || '' : (su.contact || '').split(/[,·]/)[0].trim() || ls.contact || ''),
      spectacle: sp?.titre || '', duree: String(sp?.duree || '').replace(/^durée\s*:\s*/i, '') || 'durée à préciser', genre: sp?.genre ? ` — ${sp.genre}` : '', dates, premiere_date: reps[0] ? jourLong(reps[0].jour) : d ? jourLong(d.debut) : '',
      nb_representations: n ? `${n} représentation${n > 1 ? 's' : ''}` : 'les représentations', lieu: l ? `${l.nom ? `${l.nom}, ` : ''}${l.adresse ? `${l.adresse}, ` : ''}${l.commune}` : p ? [p.structure, p.commune].filter(Boolean).join(', ') : 'à préciser',
      jauge: ls.jauge ? `${ls.jauge} places` : 'à préciser', plateau: ls.plateau || 'à préciser',
      equipe: equipe.length ? `<ul>${equipe.map(x => `<li>${esc(nomEq(x))}</li>`).join('')}</ul>` : '<p>Équipe à préciser.</p>', equipe_nombre: `${equipe.length || '—'} personne${equipe.length > 1 ? 's' : ''}`,
      montant_ht: euros(ht), tva_taux: String(taux).replace('.', ','), tva: euros(tva), montant_ttc: euros(ttc), conditions: v.conditions || '', validite: v.validite || TYPES.devis.validite,
    };
    return { c, ht, tva, ttc, taux };
  }
  const remplir = (html, c) => String(html || '').replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (m, k) => (k in c ? (['dates', 'equipe'].includes(k) ? c[k] : esc(c[k])) : m));
  // la page A4 du document : le logo, la compagnie, le titre, le destinataire, le corps, les montants, le pied, les mentions
  function page(type, m, x) {
    const T = TYPES[type], c = x.c, logo = typeof FEUILLE !== 'undefined' ? FEUILLE.logoUrl() : '', polices = typeof FEUILLE !== 'undefined' ? FEUILLE.cssPolices() : '';
    const montants = T.montant ? `<table class="doc-montants"><tr><th>Désignation</th><th>Montant HT</th><th>TVA ${esc(c.tva_taux)} %</th><th>Montant TTC</th></tr><tr><td>${esc(c.objet)}</td><td>${esc(c.montant_ht)}</td><td>${esc(c.tva)}</td><td><strong>${esc(c.montant_ttc)}</strong></td></tr></table>` : '';
    return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(`${remplir(m.titre, c)} ${c.numero}`)}</title><style>${polices}
@page{size:A4;margin:0} html,body{margin:0;background:#fff;color:#111;font:11pt/1.4 "FdR Sans",Carlito,Calibri,"Segoe UI",Arial,sans-serif}
.doc{position:relative;width:210mm;min-height:297mm;padding:16mm 20mm 18mm;box-sizing:border-box}
.doc-tete{display:flex;justify-content:space-between;align-items:flex-start;gap:12mm;margin-bottom:10mm}
.doc-logo{width:30mm;height:auto} .doc-compagnie{font-size:9.5pt;color:#444;white-space:pre-line}
.doc-titre h1{margin:0;font-size:18pt} .doc-titre p{margin:1mm 0 0;color:#444}
.doc-dest{margin:0 0 8mm auto;width:75mm;padding:4mm 5mm;border:1px solid #ccc;border-radius:2mm;font-size:10.5pt}
.doc-dest b{display:block}
.doc-corps h3{font-size:11.5pt;margin:5mm 0 1.5mm} .doc-corps p{margin:0 0 2.5mm} .doc-corps ul{margin:0 0 2.5mm;padding-left:6mm}
.doc-montants{width:100%;border-collapse:collapse;margin:5mm 0;font-size:10.5pt} .doc-montants th,.doc-montants td{border:1px solid #bbb;padding:2mm 3mm;text-align:left} .doc-montants th{background:#f1ecf0}
.doc-montants td:nth-child(n+2),.doc-montants th:nth-child(n+2){text-align:right;white-space:nowrap}
.doc-signatures{width:100%;margin-top:12mm;border-collapse:collapse} .doc-signatures td{width:50%;height:30mm;vertical-align:top;padding:2mm}
.doc-pied{position:absolute;left:20mm;right:20mm;bottom:10mm;font-size:8.5pt;color:#666;border-top:1px solid #ddd;padding-top:2mm;text-align:center}
*{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body><section class="doc">
<div class="doc-tete"><div>${logo ? `<img class="doc-logo" src="${esc(logo)}" alt="">` : ''}<div class="doc-compagnie"><b>${esc(c.compagnie)}</b>\n${esc(lignes((texteDe('coordonnees') || {}).adresse).join('\n'))}${c.contact_email ? `\n${esc(c.contact_email)}` : ''}${c.contact_telephone ? ` · ${esc(c.contact_telephone)}` : ''}</div></div>
<div class="doc-titre"><h1>${esc(remplir(m.titre, c))}</h1><p>N° ${esc(c.numero)} · ${esc(c.date_du_jour)}</p></div></div>
<div class="doc-dest"><b>${esc(c.structure)}</b>${c.structure_adresse ? `${esc(c.structure_adresse)}<br>` : ''}${c.structure_contact ? esc(c.structure_contact) : ''}</div>
<div class="doc-corps">${c.objet && type !== 'facture' ? `<p><strong>Objet :</strong> ${esc(c.objet)}</p>` : ''}${remplir(m.corps, c)}${montants}${remplir(m.pied, c)}</div>
<div class="doc-pied">${esc(c.compagnie)}${c.compagnie_adresse ? ` — ${esc(c.compagnie_adresse)}` : ''}${c.compagnie_legal ? ` — ${esc(c.compagnie_legal)}` : ''}</div></section></body></html>`;
  }
  function imprimer(html) {
    const f = document.createElement('iframe');
    f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1; f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    f.srcdoc = html;
    f.addEventListener('load', async () => { try { await f.contentDocument.fonts.ready; f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { erreur(e, 'Impression impossible'); } setTimeout(() => f.remove(), 60000); }, { once: true });
    document.body.append(f);
  }
  function ouvrir(html) { const u = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' })); window.open(u, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(u), 60000); }
  // produire un document : le formulaire (le type, le destinataire, l'objet, le montant, les conditions), la page, l'impression, la trace
  async function generer({ date: d = null, prospect: p = null, type = 'devis', apres = null } = {}) {
    const m0 = await modele(type), x0 = champs({ date: d, prospect: p });
    const v = await GESTES.formulaire({ titre: 'Générer un document', sousTitre: d ? `${x0.c.spectacle} · ${jourCourt(d.debut)}` : p ? p.structure : '', champs: [
      { k: 'type', t: 'choix', seg: true, l: 'Document', choix: Object.entries(TYPES).map(([k, t]) => [k, t.nom]), valeur: type },
      { k: 'structure', t: 'texte', l: 'Destinataire', valeur: x0.c.structure, requis: true }, { k: 'structure_contact', t: 'texte', l: 'Son représentant', valeur: x0.c.structure_contact }, { k: 'structure_adresse', t: 'texte', l: 'Son adresse', valeur: x0.c.structure_adresse, large: true },
      { k: 'objet', t: 'texte', l: 'Objet', valeur: remplir(m0.objet, x0.c), large: true },
      { k: 'montant_ht', t: 'nombre', l: 'Montant HT (€)', valeur: p?.montant_estime || '', pas: 0.01 }, { k: 'tva_taux', t: 'nombre', l: 'TVA (%)', valeur: TVA, pas: 0.1 },
      { k: 'conditions', t: 'long', l: 'Conditions', valeur: m0.conditions || '', lignes: 3, large: true },
    ], ok: 'Générer et imprimer', note: 'Les modèles se relisent et se modifient dans Textes du site (« Modèle : devis »…). Le navigateur imprime ou enregistre en PDF.',
    enregistrer: async y => { if (!String(y.structure || '').trim()) return 'Un destinataire.'; if (TYPES[y.type]?.montant && !(Number(y.montant_ht) > 0)) return 'Un montant HT.'; return y; } });
    if (!v) return null;
    const m = await modele(v.type), num = numero(v.type), valeurs = { ...v, numero: num };
    const x = champs({ date: d, prospect: p, valeurs }), html = page(v.type, m, x);
    const doc = { numero: num, type: v.type, le: new Date().toISOString(), date_id: d ? d.id : null, prospect_id: p ? p.id : null, structure: x.c.structure, montant_ttc: TYPES[v.type].montant ? x.ttc : null, valeurs };
    imprimer(html);
    await garder(doc);
    annoncer(`${TYPES[v.type].nom} ${num} : imprimé (ou enregistré en PDF).`);
    if (apres) apres(doc);
    return doc;
  }
  // le bloc « Documents » d'une fiche : ceux déjà générés pour cette date ou cette piste, et les générer
  function bloc(el, { date: d = null, prospect: p = null } = {}) {
    if (!el) return;
    const miens = generes().filter(x => (d && x.date_id === d.id) || (p && x.prospect_id === p.id));
    const quand = t => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    el.innerHTML = `<h3>Documents <span class="aide" style="font-weight:400">— devis, contrat, facture, fiche technique</span></h3>
      ${miens.length ? `<ul class="liste-simple doc-liste">${miens.map(x => `<li><b>${esc(x.numero)}</b> ${esc(TYPES[x.type]?.nom || x.type)}${x.montant_ttc != null ? ` · ${esc(euros(x.montant_ttc))} TTC` : ''} <span class="compte">· ${esc(quand(x.le))}</span>
        <span class="doc-outils"><button type="button" class="btn petit" data-doc-imprimer="${esc(x.numero)}">Imprimer</button><button type="button" class="btn petit" data-doc-ouvrir="${esc(x.numero)}">Ouvrir</button></span></li>`).join('')}</ul>` : '<p class="aide">Aucun document généré pour l’instant.</p>'}
      <div class="doc-boutons">${Object.entries(TYPES).map(([k, t]) => `<button type="button" class="btn petit" data-doc-generer="${k}">${esc(t.nom)}…</button>`).join('')}</div>`;
    if (el.dataset.docRelie) return;
    el.dataset.docRelie = '1';
    el.addEventListener('click', async e => {
      const b = e.target.closest('[data-doc-generer], [data-doc-imprimer], [data-doc-ouvrir]'); if (!b) return;
      if (b.dataset.docGenerer) { await generer({ date: d, prospect: p, type: b.dataset.docGenerer, apres: () => bloc(el, { date: d, prospect: p }) }); return; }
      const x = generes().find(y => y.numero === (b.dataset.docImprimer || b.dataset.docOuvrir)); if (!x) return;
      const m = await modele(x.type), html = page(x.type, m, champs({ date: d, prospect: p, valeurs: x.valeurs || { numero: x.numero } }));
      if (b.dataset.docImprimer) imprimer(html); else ouvrir(html);
    });
  }
  if (typeof SELECTION !== 'undefined') SELECTION.ajouterAction('date', { libelle: 'Devis…', faire: ds => generer({ date: ds[0], type: 'devis' }) });
  const style = document.createElement('style');
  style.textContent = `.doc-boutons { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; } .doc-liste li { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; } .doc-outils { display: inline-flex; gap: 4px; margin-left: auto; }`;
  document.head.append(style);
  return { generer, bloc, TYPES, champs, modele, generes, page };
})();
