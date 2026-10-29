/* Le dossier d'un spectacle, en PDF, composé à la demande depuis les données du site (D). Le site ne le propose plus
   (29 octobre 2026) : le dossier d'un spectacle est celui que l'administration dépose. Reste DOSSIER.charger, qui charge
   pdfmake pour la convention des établissements. build.py l'ajoute aux outils communs ;
   pdfmake (admin/vendor/, publié avec le site) n'est chargé qu'au premier clic.

   DOSSIER.charger()           charge pdfmake (une fois) ; rend une promesse
   DOSSIER.telecharger(slug)   compose le PDF du spectacle et le télécharge (« dossier-<slug>.pdf ») ; rend une promesse
   DOSSIER.pdf(slug)           la même chose, rendue en Blob
   DOSSIER.vendor              le dossier de pdfmake (par défaut admin/vendor/, à côté des maquettes)

   Ce qu'il contient, tiré de D : la couverture (titre, sous-titre, création, photo, couleur de l'univers), le spectacle
   (sa présentation), la distribution (D.shows[].equipe ou « avec », puis la fiche), les conditions d'accueil (format,
   durée, jauge, équipe, et la fiche technique quand le dossier du spectacle l'a), la diffusion (représentations, lieux),
   la production, et le contact diffusion (D.site.programmation). Aucun texte n'est inventé : seuls les intitulés
   viennent de D.site.libelles. */
const DOSSIER = (() => {
  'use strict';
  const L = () => (D.site && D.site.libelles) || {};
  const ENCRE = '#1d1720', GRIS = '#5f5763', TRAIT = '#dcd5db', LARGEUR = 595.28 - 2 * 52;
  let chargement = null;
  const script = src => new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => ko(new Error(`impossible de charger ${src}`)); document.head.append(s); });
  function charger() {
    if (typeof pdfMake !== 'undefined' && pdfMake.vfs && pdfMake.vfs['Roboto-Regular.ttf']) return Promise.resolve();
    if (!chargement) {
      const dossier = String(api.vendor).replace(/\/?$/, '/');
      chargement = (typeof pdfMake !== 'undefined' ? Promise.resolve() : script(dossier + 'pdfmake.min.js'))
        .then(() => (pdfMake.vfs && pdfMake.vfs['Roboto-Regular.ttf'] ? null : script(dossier + 'vfs_fonts.js')))
        .catch(e => { chargement = null; throw e; });
    }
    return chargement;
  }
  // la police du PDF (Roboto) n'a pas certains signes : on les remplace
  const pt = s => String(s ?? '').replace(/ /g, ' ').replace(/[→⟶]/g, '–');
  // du HTML des sources vers des morceaux de texte pdfmake : italique, gras, retours à la ligne
  function morceaux(html) {
    const doc = new DOMParser().parseFromString(`<div>${String(html ?? '')}</div>`, 'text/html');
    const out = [];
    const marcher = (n, st) => {
      if (n.nodeType === 3) { if (n.textContent) out.push({ text: pt(n.textContent), ...st }); return; }
      if (n.nodeType !== 1) return;
      const t = n.tagName.toLowerCase();
      if (t === 'br') { out.push({ text: '\n' }); return; }
      const s2 = { ...st, ...(t === 'em' || t === 'i' ? { italics: true } : {}), ...(t === 'strong' || t === 'b' ? { bold: true } : {}) };
      n.childNodes.forEach(c => marcher(c, s2));
      if (t === 'p' || t === 'li') out.push({ text: '\n' });
    };
    doc.body.firstChild.childNodes.forEach(c => marcher(c, {}));
    while (out.length && out[out.length - 1].text === '\n') out.pop();
    return out.length ? out : [{ text: '' }];
  }
  const brut = html => morceaux(html).map(x => x.text).join('').trim();
  const maj = t => pt(t).charAt(0).toUpperCase() + pt(t).slice(1);
  // une photo en JPEG (pdfmake ne lit ni le WebP ni les adresses), recadrée au centre : au rapport largeur/hauteur « ratio »,
  // ou au moins « large » (une photo en hauteur ne mange pas la couverture) ; rien si elle ne se charge pas
  async function image(url, { max = 1400, ratio = 0, large = 0 } = {}) {
    if (!url) return null;
    try {
      const r = await fetch(url, { mode: 'cors' });
      if (!r.ok) return null;
      const bmp = await createImageBitmap(await r.blob());
      let sx = 0, sy = 0, sl = bmp.width, sh = bmp.height;
      const voulu = ratio || (large && sl / sh < large ? large : 0);
      if (voulu && sl / sh > voulu) { sl = Math.round(sh * voulu); sx = Math.round((bmp.width - sl) / 2); }
      else if (voulu) { sh = Math.round(sl / voulu); sy = Math.round((bmp.height - sh) / 2); }
      const k = Math.min(1, max / Math.max(sl, sh));
      const c = document.createElement('canvas'); c.width = Math.round(sl * k); c.height = Math.round(sh * k);
      c.getContext('2d').drawImage(bmp, sx, sy, sl, sh, 0, 0, c.width, c.height);
      return { data: c.toDataURL('image/jpeg', 0.86), l: c.width, h: c.height };
    } catch { return null; }
  }
  const titreSection = (t, couleur) => ({ intitule: true, stack: [{ text: pt(t).toUpperCase(), fontSize: 8.5, bold: true, characterSpacing: 1.3, color: couleur },
    { canvas: [{ type: 'line', x1: 0, y1: 3, x2: LARGEUR, y2: 3, lineWidth: 0.6, lineColor: TRAIT }] }], margin: [0, 20, 0, 6] });
  const sobre = { hLineWidth: (i, n) => (i === 0 || i === n.table.body.length ? 0 : 0.5), vLineWidth: () => 0, hLineColor: () => TRAIT,
    paddingLeft: i => (i === 0 ? 0 : 10), paddingRight: () => 0, paddingTop: () => 4, paddingBottom: () => 4 };

  async function definition(slug) {
    const s = (D.shows || []).find(x => x.slug === slug);
    if (!s) throw new Error(`spectacle inconnu : ${slug}`);
    const lib = L(), couleur = s.couleurTexteClair || s.couleur || '#a3306b';
    const nom = (D.site && D.site.nom) || 'Compagnie Crescite';
    const photos = D.photos || {};
    const [principale, ...galerie] = await Promise.all([image(photos[s.slug], { max: 1600, large: 1.4 }),
      ...(s.photos || []).slice(0, 2).map(p => image(photos[p.cle], { max: 1000, ratio: 3 / 2 }))]);
    const contenu = [];
    // la couverture
    contenu.push({ canvas: [{ type: 'rect', x: 0, y: 0, w: LARGEUR, h: 5, color: couleur }] });
    contenu.push({ text: pt(nom).toUpperCase(), fontSize: 8.5, bold: true, characterSpacing: 1.4, color: GRIS, margin: [0, 14, 0, 0] });
    contenu.push({ text: pt((s.titreLignes || [s.titre]).join(' ')), fontSize: 30, bold: true, color: couleur, margin: [0, 8, 0, 0], lineHeight: 1.02 });
    if (s.sousTitre) contenu.push({ text: morceaux(s.sousTitre), fontSize: 12.5, color: ENCRE, margin: [0, 4, 0, 0] });
    const sous = [s.creation, s.duree].filter(Boolean).map(x => maj(brut(x))).join('   ·   ');
    if (sous) contenu.push({ text: pt(sous), fontSize: 10, color: GRIS, margin: [0, 8, 0, 0] });
    if (principale) contenu.push({ image: principale.data, width: LARGEUR, margin: [0, 16, 0, 0] });
    if (s.credit) contenu.push({ text: morceaux(s.credit), fontSize: 7.5, color: GRIS, alignment: 'right', margin: [0, 3, 0, 0] });
    if (s.accroche) contenu.push({ text: morceaux(s.accroche), fontSize: 13, italics: true, margin: [0, 16, 0, 0], lineHeight: 1.3 });
    // le spectacle
    if ((s.texte || []).length) {
      contenu.push(titreSection(lib.leSpectacle || 'Le spectacle', couleur));
      s.texte.forEach((p, i) => contenu.push({ text: morceaux(p), margin: [0, i ? 6 : 0, 0, 0], alignment: 'justify' }));
    }
    if (galerie.filter(Boolean).length) {
      const g = galerie.filter(Boolean), l = (LARGEUR - 10 * (g.length - 1)) / g.length;
      contenu.push({ columns: g.map(x => ({ image: x.data, width: l })), columnGap: 10, margin: [0, 14, 0, 0] });
    }
    // la distribution
    const equipe = s.equipe || [], P = D.personnes || {};
    const nomDe = x => { const p = P[x.personne] || {}; return [p.prenom, p.nom].filter(Boolean).join(' '); };
    // (sans ceux qui ne partent plus en tournée, quand d'autres comédiens partent : la distribution d'aujourd'hui)
    const partent = equipe.some(x => x.categorie === 'jeu' && x.enTournee !== false), sesLignes = x => equipe.filter(y => y.personne === x.personne);
    const jeu = equipe.filter(x => x.categorie === 'jeu' && !(partent && sesLignes(x).every(y => y.enTournee === false)));
    // un spectacle en création n'a parfois que l'équipe de création annoncée (« Mise en scène : … ») : elle remplace la fiche
    const creation = (s.programmer && s.programmer.equipeCreation) || [];
    const fiche = (s.fiche || []).filter(f => f.valeur && (f.libelle || !creation.length));
    if (jeu.length || s.avec || fiche.length || creation.length) {
      contenu.push(titreSection(lib.distribution || 'Distribution', couleur));
      if (jeu.length) contenu.push({ text: jeu.map((x, i) => [{ text: (i ? ', ' : '') + pt(nomDe(x)), bold: true }, ...(x.alternance ? [{ text: pt(` (${x.alternance})`), color: GRIS }] : [])]).flat(), margin: [0, 0, 0, 6] });
      else if (s.avec) contenu.push({ text: [{ text: pt(brut(s.avec.libelle)) + ' ', color: GRIS }, ...morceaux(s.avec.valeur)], margin: [0, 0, 0, 6] });
      creation.forEach(x => { const [l, ...v] = brut(x).split(' : ');
        contenu.push({ text: v.length ? [{ text: pt(l) + ' : ', color: GRIS }, { text: pt(v.join(' : ')) }] : pt(l), margin: [0, 0, 0, 3] }); });
      const avecLibelle = fiche.filter(f => f.libelle), sans = fiche.filter(f => !f.libelle);
      if (avecLibelle.length) contenu.push({ table: { widths: [150, '*'], body: avecLibelle.map(f => [{ text: pt(brut(f.libelle)), color: GRIS }, { text: morceaux(f.valeur) }]) }, layout: sobre });
      sans.forEach(f => contenu.push({ text: morceaux(f.valeur), margin: [0, 2, 0, 0] }));
    }
    // les conditions d'accueil
    const pr = s.programmer || {}, accueil = s.dossier && D.dossiers && D.dossiers[s.dossier] && D.dossiers[s.dossier].accueil;
    // la fiche technique du dossier reprend déjà la durée, la jauge et l'équipe : on ne les écrit pas deux fois
    const lignes = (accueil ? [pr.format] : [pr.format, s.duree, pr.jauge, pr.equipe]).filter(Boolean);
    if (lignes.length || accueil) {
      contenu.push(titreSection(lib.conditionsAccueil || 'Conditions d’accueil', couleur));
      lignes.forEach((x, i) => contenu.push({ text: maj(brut(x)), bold: i === 0 && x === pr.format, margin: [0, 0, 0, 3] }));
      // chaque bloc de la fiche technique (« PLATEAU : », « MATÉRIEL… ») reste d'un seul tenant
      if (accueil) (accueil.blocs || []).forEach(b => contenu.push({ unbreakable: true, stack: [
        ...(b.titre ? [{ text: pt(brut(b.titre)), bold: true, fontSize: 9.5, margin: [0, 8, 0, 2] }] : []),
        ...(b.lignes || []).map(x => ({ text: morceaux(AGENDA.dureeDans(s.duree, x)), margin: [0, 0, 0, 2] }))] }));
      if (lib.conditionsFinancieres) contenu.push({ text: pt(lib.conditionsFinancieres), color: GRIS, margin: [0, 8, 0, 0] });
    }
    // la diffusion
    if (pr.representations || pr.lieux || pr.actualite) {
      contenu.push(titreSection(lib.representations || 'Représentations', couleur));
      if (pr.representations) contenu.push({ text: maj(brut(pr.representations)), bold: true, margin: [0, 0, 0, 4] });
      if (pr.actualite) contenu.push({ text: maj(brut(pr.actualite)), margin: [0, 0, 0, 4] });
      if (pr.lieux) contenu.push({ text: [{ text: pt(lib.lieuxDiffusion || '') + (lib.lieuxDiffusion ? ' : ' : ''), color: GRIS }, ...morceaux(pr.lieux)] });
    }
    // la production
    if ((s.production || []).length) {
      contenu.push(titreSection(lib.production || 'Production', couleur));
      s.production.forEach(x => contenu.push({ text: morceaux(x), fontSize: 9, margin: [0, 0, 0, 3] }));
    }
    // le contact
    const c = (D.site && D.site.programmation && D.site.programmation.contact) || {};
    if (c.nom || c.email) {
      contenu.push(titreSection(lib.contactDiffusion || 'Contact', couleur));
      contenu.push({ text: [{ text: pt(c.nom || ''), bold: true }, ...(c.role ? [{ text: pt(`, ${c.role}`), color: GRIS }] : [])] });
      if (c.email) contenu.push({ text: pt(c.email), link: `mailto:${c.email}`, color: couleur });
      if (c.telephone) contenu.push({ text: pt(c.telephone), link: `tel:${String(c.telephone).replace(/[^\d+]/g, '')}` });
      const co = D.site.coordonnees || {};
      const adresse = [co.nom, ...(co.adresse || [])].filter(Boolean).map(brut);
      if (adresse.length) contenu.push({ text: pt(adresse.join(' · ')), color: GRIS, fontSize: 8.5, margin: [0, 6, 0, 0] });
    }
    // un intitulé de section n'est jamais seul en bas de page : il part avec l'élément qui le suit
    for (let i = contenu.length - 2; i >= 0; i--) {
      if (contenu[i].intitule) contenu.splice(i, 2, { unbreakable: true, stack: [contenu[i], contenu[i + 1]] });
    }
    return {
      pageSize: 'A4', pageMargins: [52, 54, 52, 50],
      info: { title: pt(`${s.titre} · ${nom}`), author: pt(nom) },
      defaultStyle: { font: 'Roboto', fontSize: 9.8, lineHeight: 1.28, color: ENCRE },
      header: page => (page === 1 ? null : { margin: [52, 24, 52, 0], columns: [
        { text: pt(nom), fontSize: 7.5, color: GRIS }, { text: pt(s.titre), fontSize: 7.5, color: GRIS, alignment: 'right' }] }),
      footer: (page, pages) => ({ margin: [52, 18, 52, 0], columns: [
        { text: pt(`${nom} · ${s.titre}`), fontSize: 7.5, color: GRIS }, { text: `${page} / ${pages}`, fontSize: 7.5, color: GRIS, alignment: 'right' }] }),
      content: contenu,
    };
  }
  async function pdf(slug) {
    await charger();
    const dd = await definition(slug);
    return new Promise((ok, ko) => { try { pdfMake.createPdf(dd).getBlob(ok); } catch (e) { ko(e); } });
  }
  async function telecharger(slug) {
    const blob = await pdf(slug);
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = `dossier-${slug}.pdf`; a.rel = 'noopener';
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return blob;
  }
  const api = { charger, telecharger, pdf, definition, vendor: 'admin/vendor/' };
  return api;
})();
