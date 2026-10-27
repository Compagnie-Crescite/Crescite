'use strict';
/* Les documents générés depuis les fiches : un devis, un contrat de cession, une facture, une fiche technique d'accueil,
   produits à partir des modèles de la compagnie (Textes du site → « Modèle : devis »…, créés avec un texte de départ à la
   première demande), les champs remplis depuis la date (le spectacle, les séances, le lieu, l'équipe en tournée, le
   contact du suivi) ou depuis la piste de diffusion (la structure, le contact), le montant, la TVA (5,5 % pour un
   spectacle vivant) et les conditions demandés dans un formulaire. Numérotés (DEV-2026-003…), mis en page en A4 avec le
   logo et les coordonnées de la compagnie, imprimés ou enregistrés en PDF par le navigateur. Chaque document est émis par
   la base (crescite_documents_generes, le dix-neuvième script, réservé à l'administration) : elle donne le numéro, le
   suivant de l'année pour ce type, et garde la page telle qu'émise, que « Imprimer » reproduit à l'identique ; un
   document émis ne change plus, une facture ne se supprime pas. Sans le script, rien n'est émis (les documents ne vont
   plus dans les textes publics du site). Les modèles sont un texte de départ : la compagnie les relit et les adapte dans
   Textes du site. Chargé après tiroir.js et selection.js.
   MODELES.charger()   MODELES.generer({ date, prospect, type })   MODELES.bloc(el, { date, prospect })   MODELES.TYPES   MODELES.champs(ctx) */
const MODELES = (() => {
  const TYPES = {
    devis: { nom: 'Devis', prefixe: 'DEV', montant: true, validite: 'deux mois' },
    contrat: { nom: 'Contrat de cession', prefixe: 'CES', montant: true },
    facture: { nom: 'Facture', prefixe: 'FAC', montant: true },
    fiche_technique: { nom: 'Fiche technique d’accueil', prefixe: 'FT', montant: false },
  };
  const TVA = 5.5, SCRIPT = '20261107_crescite_documents_generes.sql';
  // les documents émis, sans leur page (lue à la demande) : E.docsGeneres ; E.docsInstalles faux tant que le script manque
  const COLS = 'id,type,annee,rang,numero,date_id,dates,prospect_id,demande_id,structure,montant_ht,montant_ttc,valeurs,emis_le,echeance,paye_le,annule_le,note';
  async function charger() {
    const out = [];
    for (let a = 0; ; a += 1000) {
      const { data, error } = await sb.from('crescite_documents_generes').select(COLS).order('id', { ascending: false }).range(a, a + 999);
      if (error) { E.docsGeneres = []; E.docsInstalles = false; return false; }
      out.push(...data);
      if (data.length < 1000) break;
    }
    E.docsGeneres = out; E.docsInstalles = true;
    return true;
  }
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
  const generes = () => (Array.isArray(E.docsGeneres) ? E.docsGeneres : []).slice().sort((a, b) => b.id - a.id);
  const absent = () => annoncer(`Les documents ne s’émettent plus tant que le dix-neuvième script manque : exécutez ${SCRIPT} dans Supabase (SQL Editor), puis rechargez la page.`, { erreur: true, delai: 15000 });
  // la page telle qu'émise ; un document repris de l'ancienne liste n'en a pas : elle est recomposée (et le dit)
  async function pageEmise(x, ctx) {
    const { data, error } = await sb.from('crescite_documents_generes').select('html').eq('id', x.id).single();
    if (error) { erreur(error, 'Document introuvable'); return null; }
    if (data.html) return data.html;
    annoncer('Ce document date d’avant le dix-neuvième script : sa page est recomposée d’après la base d’aujourd’hui.');
    return page(x.type, await modele(x.type), champs({ ...ctx, valeurs: x.valeurs || { numero: x.numero } }));
  }
  const euros = n => `${(Number(n) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  const lignes = xs => (Array.isArray(xs) ? xs : String(xs || '').split('\n')).map(x => String(x || '').trim()).filter(Boolean);
  const jourLong = j => (j ? new Date(`${j}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '');
  // les champs d'un document : la compagnie (Textes du site : coordonnées, le contact de « Je souhaite programmer »), puis la date ou la piste
  // (dates : un document pour plusieurs dates, une tournée ; demande : une demande de devis déposée sur le site)
  const datesDe = (date, dates) => (dates && dates.length ? dates : date ? [date] : []).slice().sort((a, b) => (a.debut < b.debut ? -1 : a.debut > b.debut ? 1 : a.id - b.id));
  function champs({ date = null, dates: dsIn = null, prospect: p = null, demande: q = null, valeurs: v = {} } = {}) {
    const co = texteDe('coordonnees') || {}, pr = (texteDe('programmation') || {}).contact || {};
    const ds = datesDe(date, dsIn), d = ds[0] || null, plusieurs = ds.length > 1, lieux = [...new Set(ds.map(x => x.lieu_id).filter(x => x != null))];
    const sp = spectacle(d ? d.spectacle_id : p?.spectacle_id ?? q?.spectacle_id), l = d && lieux.length <= 1 ? lieu(d.lieu_id) : null, su = d ? (E.suivis.find(x => x.date_id === d.id) || {}) : {}, ls = l ? (E.lieuxSuivi.find(x => x.lieu_id === l.id) || {}) : {};
    const lieuCourt = x => { const y = lieu(x.lieu_id); return y ? `${y.nom ? `${y.nom}, ` : ''}${y.commune}` : ''; };
    const reps = ds.flatMap(x => repsDe(x.id).filter(r => !r.annulee).map(r => ({ ...r, _d: x })));
    const ou = r => (lieux.length > 1 && lieuCourt(r._d) ? ` — ${esc(lieuCourt(r._d))}` : '');
    const dates = reps.length ? `<ul>${reps.map(r => `<li>${esc(jourLong(r.jour))}${r.heure ? ` à ${esc(AGENDA.heureTexte(h5(r.heure)))}` : ''}${r.public === 'scolaire' ? ' (séance scolaire)' : ''}${ou(r)}</li>`).join('')}</ul>`
      : ds.length ? `<ul>${ds.map(x => `<li>${esc(x.fin && x.fin !== x.debut ? `du ${jourLong(x.debut)} au ${jourLong(x.fin)}` : jourLong(x.debut))}${x.nb_representations ? ` (${x.nb_representations} représentations)` : ''}${lieux.length > 1 && lieuCourt(x) ? ` — ${esc(lieuCourt(x))}` : ''}</li>`).join('')}</ul>`
      : p?.periode_souhaitee || q?.periode_souhaitee ? `<p>${esc(p?.periode_souhaitee || q.periode_souhaitee)}</p>` : '<p>Dates à convenir.</p>';
    let equipe = [];
    try { equipe = d && E.equipeInstallee ? equipeDeLaDate(d) : sp && E.equipeInstallee ? distributionDe(sp.id).filter(x => x.en_tournee).map(x => ({ personne_id: x.personne_id, fonction: fonctionDistribution(x) })) : []; } catch (e) { equipe = []; }
    const nomEq = x => { const q = personne(x.personne_id); return q ? `${nomDe(q)}${x.fonction ? ` — ${x.fonction}` : (q.metiers || [])[0] ? ` — ${(q.metiers || [])[0]}` : ''}` : ''; };
    const ht = Number(v.montant_ht) || 0, taux = v.tva_taux == null || v.tva_taux === '' ? TVA : Number(v.tva_taux) || 0, tva = Math.round(ht * taux) / 100, ttc = ht + tva;
    const n = reps.length || ds.reduce((t, x) => t + (Number(x.nb_representations) || 0), 0);
    const c = {
      numero: v.numero || '', date_du_jour: jourLong(AUJ).replace(/^\w+ /, ''), objet: v.objet || '',
      compagnie: co.nom || 'Compagnie Crescite', compagnie_adresse: lignes(co.adresse).join(', '), compagnie_ville: (lignes(co.adresse).slice(-1)[0] || '').replace(/^\d{5}\s*/, '') || 'Rouen', compagnie_legal: lignes(co.legal).join(' — '),
      contact_nom: pr.nom || '', contact_role: pr.role || '', contact_email: pr.email || '', contact_telephone: pr.telephone || '',
      structure: v.structure || (p ? p.structure : q ? q.structure_nom || '' : su.organisateur || (l ? (l.nom || l.commune) : '')),
      structure_adresse: v.structure_adresse || (p || q ? [(p || q).commune, (p || q).departement ? `(${(p || q).departement})` : ''].filter(Boolean).join(' ') : l ? [l.adresse, l.commune].filter(Boolean).join(', ') : ''),
      structure_contact: v.structure_contact || (p ? p.contact_nom || '' : q ? q.contact_nom || '' : (su.contact || '').split(/[,·]/)[0].trim() || ls.contact || ''),
      spectacle: sp?.titre || '', duree: String(sp?.duree || '').replace(/^durée\s*:\s*/i, '') || 'durée à préciser', genre: sp?.genre ? ` — ${sp.genre}` : '', dates, premiere_date: reps[0] ? jourLong(reps[0].jour) : d ? jourLong(d.debut) : '',
      nb_representations: n ? `${n} représentation${n > 1 ? 's' : ''}` : 'les représentations',
      lieu: lieux.length > 1 ? 'plusieurs lieux, précisés pour chaque date' : l ? `${l.nom ? `${l.nom}, ` : ''}${l.adresse ? `${l.adresse}, ` : ''}${l.commune}` : p ? [p.structure, p.commune].filter(Boolean).join(', ') : q ? [q.structure_nom, q.commune].filter(Boolean).join(', ') : 'à préciser',
      jauge: ls.jauge ? `${ls.jauge} places` : q?.jauge_estimee ? `${q.jauge_estimee} places` : 'à préciser', plateau: ls.plateau || q?.dimensions_plateau || 'à préciser',
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
  async function generer({ date = null, dates = null, prospect: p = null, demande: q = null, type = 'devis', apres = null } = {}) {
    const ds = datesDe(date, dates), d = ds[0] || null;
    const m0 = await modele(type), x0 = champs({ dates: ds, prospect: p, demande: q });
    // le montant : celui des dates (leur cession HT, additionnée pour une tournée), sinon l'estimation de la piste
    const cessions = ds.map(x => E.suivis.find(s => s.date_id === x.id)?.montant_cession).filter(m => m != null && m !== '');
    const montant0 = cessions.length ? cessions.reduce((t, m) => t + Number(m), 0) : p?.montant_estime || '';
    const v = await GESTES.formulaire({ titre: 'Générer un document', sousTitre: ds.length > 1 ? `${x0.c.spectacle} · ${ds.length} dates, du ${jourCourt(ds[0].debut)} au ${jourCourt(ds[ds.length - 1].fin || ds[ds.length - 1].debut)}` : d ? `${x0.c.spectacle} · ${jourCourt(d.debut)}` : p ? p.structure : q ? q.structure_nom : '', champs: [
      { k: 'type', t: 'choix', seg: true, l: 'Document', choix: Object.entries(TYPES).map(([k, t]) => [k, t.nom]), valeur: type },
      { k: 'structure', t: 'texte', l: 'Destinataire', valeur: x0.c.structure, requis: true }, { k: 'structure_contact', t: 'texte', l: 'Son représentant', valeur: x0.c.structure_contact }, { k: 'structure_adresse', t: 'texte', l: 'Son adresse', valeur: x0.c.structure_adresse, large: true },
      { k: 'objet', t: 'texte', l: 'Objet', valeur: remplir(m0.objet, x0.c), large: true },
      { k: 'montant_ht', t: 'nombre', l: 'Montant HT (€)', valeur: montant0, pas: 0.01 }, { k: 'tva_taux', t: 'nombre', l: 'TVA (%)', valeur: TVA, pas: 0.1 },
      { k: 'conditions', t: 'long', l: 'Conditions', valeur: m0.conditions || '', lignes: 3, large: true },
      { k: 'echeance', t: 'date', l: 'Échéance (facture)', valeur: AGENDA.iso(new Date(Date.now() + 30 * 864e5)) },
    ], ok: 'Générer et imprimer', note: 'Les modèles se relisent et se modifient dans Textes du site (« Modèle : devis »…). Le navigateur imprime ou enregistre en PDF.',
    enregistrer: async y => { if (!String(y.structure || '').trim()) return 'Un destinataire.'; if (TYPES[y.type]?.montant && !(Number(y.montant_ht) > 0)) return 'Un montant HT.'; return y; } });
    if (!v) return null;
    if (!E.docsInstalles && !(await charger())) { absent(); return null; }
    // la page porte {{numero}} : la base le remplace par le numéro qu'elle donne
    const m = await modele(v.type), valeurs = { ...v, numero: '{{numero}}' };
    const x = champs({ dates: ds, prospect: p, demande: q, valeurs }), avecMontant = TYPES[v.type].montant;
    const { data: doc, error } = await sb.rpc('crescite_emettre_document', { type_: v.type, html_: page(v.type, m, x), valeurs_: { ...v, numero: undefined },
      date_: d ? d.id : null, dates_: ds.map(y => y.id), prospect_: p ? p.id : null, demande_: q ? q.id : null, structure_: x.c.structure,
      ht: avecMontant ? x.ht : null, ttc: avecMontant ? x.ttc : null, echeance_: v.type === 'facture' && v.echeance ? v.echeance : null });
    if (error) { erreur(error, 'Document non émis'); return null; }
    imprimer(doc.html);
    const { html, ...sansPage } = doc;
    remplacerDoc(sansPage);
    const suites = await suivre(sansPage, { ds, p, q, ht: avecMontant ? x.ht : null });
    annoncer(`${TYPES[v.type].nom} ${doc.numero} : émis, imprimé (ou enregistré en PDF).${suites.length ? ` ${suites.join(' ; ')}.` : ''}`, { delai: suites.length ? 9000 : 5000 });
    if (apres) apres(sansPage);
    return sansPage;
  }
  // ce qu'un document émis change ailleurs, sans rien écraser : la cession d'une date seule encore vide, un contrat à envoyer
  // qui part (« envoyé »), une piste au premier contact dont on envoie le devis (« Dossier / Devis ») et sans estimation,
  // une demande du site qui a son devis. → les phrases à annoncer
  async function suivre(doc, { ds, p, q, ht }) {
    const dit = [];
    for (const d of ds) {
      const su = E.suivis.find(s => s.date_id === d.id) || {}, maj = {};
      if (ds.length === 1 && ht != null && ht > 0 && (su.montant_cession == null || su.montant_cession === '') && ['devis', 'contrat', 'facture'].includes(doc.type)) maj.montant_cession = ht;
      if (doc.type === 'contrat' && ['', 'à envoyer'].includes((su.contrat || '').trim())) maj.contrat = 'envoyé';
      if (!Object.keys(maj).length) continue;
      const { error } = await sb.from('crescite_dates_suivi').upsert({ date_id: d.id, ...maj }, { onConflict: 'date_id' });
      if (error) { erreur(error, 'Le suivi de la date n’a pas suivi'); continue; }
      const i = E.suivis.findIndex(s => s.date_id === d.id); if (i >= 0) Object.assign(E.suivis[i], maj); else E.suivis.push({ date_id: d.id, ...maj });
      if (maj.contrat) dit.push(`contrat « envoyé » pour le ${jourCourt(d.debut)}`);
      if (maj.montant_cession) dit.push('cession notée dans la date');
    }
    if (p) {
      const maj = {};
      if (doc.type === 'devis' && p.etape === 'contact_pris') maj.etape = 'dossier_envoye';
      if (ht != null && ht > 0 && (p.montant_estime == null || p.montant_estime === '')) maj.montant_estime = ht;
      if (Object.keys(maj).length) {
        maj.date_dernier_contact = AUJ;
        const { error } = await sb.from('crescite_diffusion_prospects').update(maj).eq('id', p.id);
        if (error) erreur(error, 'La piste n’a pas suivi'); else { Object.assign(p, maj); if (maj.etape) dit.push('piste passée à « Dossier / Devis »'); }
      }
    }
    if (q && doc.type === 'devis' && ['nouveau', 'en_cours', '', null, undefined].includes(q.statut)) {
      const { error } = await sb.from('crescite_devis_demandes').update({ statut: 'devis_envoye' }).eq('id', q.id);
      if (error) erreur(error, 'La demande n’a pas suivi'); else { q.statut = 'devis_envoye'; dit.push('demande « Devis envoyé »'); }
    }
    return dit;
  }
  const remplacerDoc = x => { if (!Array.isArray(E.docsGeneres)) E.docsGeneres = []; const i = E.docsGeneres.findIndex(y => y.id === x.id); if (i >= 0) E.docsGeneres[i] = x; else E.docsGeneres.push(x); };
  // le bloc « Documents » d'une fiche : ceux déjà générés pour cette date ou cette piste, et les générer
  const etat = x => x.annule_le ? '<span class="badge annulee">annulé</span>' : x.type !== 'facture' ? '' : x.paye_le ? `<span class="badge ok">payée le ${esc(jourCourt(x.paye_le))}</span>`
    : x.echeance && x.echeance < AUJ ? `<span class="badge alerte">en retard · échue le ${esc(jourCourt(x.echeance))}</span>` : x.echeance ? `<span class="badge option">à payer avant le ${esc(jourCourt(x.echeance))}</span>` : '<span class="badge option">à payer</span>';
  const concerne = (x, { date: d, prospect: p, demande: q }) => (d && (x.date_id === d.id || (x.dates || []).map(Number).includes(Number(d.id)))) || (p && x.prospect_id === p.id) || (q && x.demande_id === q.id);
  async function noter(x, maj, dire) {
    const { data, error } = await sb.from('crescite_documents_generes').update(maj).eq('id', x.id).select(COLS).single();
    if (error) { erreur(error); return false; }
    remplacerDoc(data); annoncer(dire); return true;
  }
  function bloc(el, { date: d = null, prospect: p = null, demande: q = null } = {}) {
    if (!el) return;
    const ctx = { date: d, prospect: p, demande: q };
    const miens = generes().filter(x => concerne(x, ctx));
    const quand = t => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    el.innerHTML = `<h3>Documents <span class="aide" style="font-weight:400">— devis, contrat, facture, fiche technique</span></h3>
      ${miens.length ? `<ul class="liste-simple doc-liste">${miens.map(x => `<li><b>${esc(x.numero)}</b> ${esc(TYPES[x.type]?.nom || x.type)}${x.montant_ttc != null ? ` · ${esc(euros(x.montant_ttc))} TTC` : ''} <span class="compte">· ${esc(quand(x.emis_le))}${(x.dates || []).length > 1 ? ` · ${x.dates.length} dates` : ''}</span> ${etat(x)}
        <span class="doc-outils"><button type="button" class="btn petit" data-doc-imprimer="${x.id}">Imprimer</button><button type="button" class="btn petit" data-doc-ouvrir="${x.id}">Ouvrir</button>${!x.annule_le && x.type === 'facture' && !x.paye_le ? `<button type="button" class="btn petit" data-doc-paye="${x.id}">Payée…</button>` : ''}${!x.annule_le ? `<button type="button" class="btn petit" data-doc-annuler="${x.id}" title="Le document reste, numéroté, marqué annulé">Annuler…</button>` : ''}</span></li>`).join('')}</ul>`
        : E.docsInstalles === false ? `<p class="aide">Les documents ne s’émettent pas encore : exécutez <code>${SCRIPT}</code> dans Supabase.</p>` : '<p class="aide">Aucun document généré pour l’instant.</p>'}
      <div class="doc-boutons">${Object.entries(TYPES).map(([k, t]) => `<button type="button" class="btn petit" data-doc-generer="${k}">${esc(t.nom)}…</button>`).join('')}</div>`;
    if (el.dataset.docRelie) return;
    el.dataset.docRelie = '1';
    el.addEventListener('click', async e => {
      const b = e.target.closest('[data-doc-generer], [data-doc-imprimer], [data-doc-ouvrir], [data-doc-paye], [data-doc-annuler]'); if (!b) return;
      if (b.dataset.docGenerer) { await generer({ date: d, prospect: p, demande: q, type: b.dataset.docGenerer, apres: () => bloc(el, ctx) }); return; }
      const x = generes().find(y => String(y.id) === (b.dataset.docImprimer || b.dataset.docOuvrir || b.dataset.docPaye || b.dataset.docAnnuler)); if (!x) return;
      if (b.dataset.docPaye) {
        const v = await GESTES.formulaire({ titre: `Facture ${x.numero} payée`, champs: [{ k: 'paye_le', t: 'date', l: 'Payée le', valeur: AUJ, requis: true }], ok: 'Noter le paiement',
          enregistrer: async y => (y.paye_le ? y : 'Une date.') });
        if (v && await noter(x, { paye_le: v.paye_le }, `Facture ${x.numero} : payée le ${jourCourt(v.paye_le)}.`)) bloc(el, ctx);
        return;
      }
      if (b.dataset.docAnnuler) {
        if (!(await confirmerAction({ titre: `Annuler ${TYPES[x.type]?.nom.toLowerCase() || 'le document'} ${x.numero} ?`, texte: 'Il reste numéroté, dans la liste, marqué annulé (un numéro émis ne se réutilise pas). Pour une facture, émettez un avoir si elle a été envoyée.', ok: 'Annuler le document' }))) return;
        if (await noter(x, { annule_le: new Date().toISOString() }, `${x.numero} : annulé.`)) bloc(el, ctx);
        return;
      }
      const html = await pageEmise(x, ctx); if (!html) return;
      if (b.dataset.docImprimer) imprimer(html); else ouvrir(html);
    });
  }
  // une sélection de dates : un seul devis (ou contrat) pour toute la tournée, une ligne par date
  if (typeof SELECTION !== 'undefined') SELECTION.ajouterAction('date', { libelle: 'Devis…', faire: ds => generer({ dates: ds, type: 'devis' }) });
  const style = document.createElement('style');
  style.textContent = `.badge.alerte { background: var(--alerte-doux); color: var(--alerte); } .doc-boutons { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; } .doc-liste li { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; } .doc-outils { display: inline-flex; gap: 4px; margin-left: auto; }`;
  document.head.append(style);
  // les factures émises, non payées, non annulées (le tableau de bord, le parcours) ; en retard : l'échéance passée
  const aEncaisser = () => generes().filter(x => x.type === 'facture' && !x.annule_le && !x.paye_le);
  const enRetard = () => aEncaisser().filter(x => x.echeance && x.echeance < AUJ);
  return { charger, generer, bloc, TYPES, champs, modele, generes, page, aEncaisser, enRetard, etat };
})();
