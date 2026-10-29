/* L'agenda de la compagnie, commun aux maquettes (donnees.js) et à l'administration : composer, à partir d'une date
   de la base et de ses représentations, la ligne d'agenda et ses précisions, dans le style du site d'origine.

   AGENDA.ligne(date, reps, lieu)        « 18 décembre 2026 — Pont-Audemer (27) » (ou date.intitule s'il est écrit)
   AGENDA.quand(date, jours)             « 19 et 20 novembre 2026 », « du 12 au 20 février 2027 », « mars 2027 »
   AGENDA.precisions(date, reps, lieu)   [{texte, lien}] : date.details, ou « 14h et 20h : représentations au Forum »
   AGENDA.chez(nom)                      « au Théâtre des Charmes », « à L’Eclat », « à la Ferme de Bel Ebat »
   AGENDA.saisonDe('2026-10-12')         « 2026-2027 » ; AGENDA.heureTexte('20:30') « 20h30 » ; AGENDA.iso(new Date())
   AGENDA.court('2026-12-18', noms)      { semaine: 'ven.', jour: '18', mois: 'déc.', an: '2026', texte: 'ven. 18 déc.' } : un
                                         bouton de date (réserver) ; noms = { semaine, mois } pour d'autres libellés (D.site.libelles)
                                         que AGENDA.SEMAINE (lun. … dim.) et AGENDA.MOIS_COURTS (janv. … déc.)
   date = {debut, fin, precision: 'jour'|'periode'|'mois'|'saison', intitule, details, lien, nb_representations, nature}
   reps = [{jour, heure, public, annulee}], lieu = {nom, commune, departement} */
const AGENDA = (() => {
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const saisonDe = j => { const a = +j.slice(0, 4), m = +j.slice(5, 7); return m >= 9 ? `${a}-${a + 1}` : `${a - 1}-${a}`; };
  const jourTexte = j => { const n = +j.slice(8, 10); return n === 1 ? '1er' : String(n); };
  const heureTexte = h => { if (!h) return ''; const [hh, mm] = h.split(':'); return `${+hh}h${mm !== '00' ? mm : ''}`; };
  // les noms courts d'un bouton de date (« ven. 18 déc. ») ; la semaine commence le lundi
  const SEMAINE = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];
  const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  function court(j, noms = {}) {
    const s = noms.semaine && noms.semaine.length === 7 ? noms.semaine : SEMAINE, m = noms.mois && noms.mois.length === 12 ? noms.mois : MOIS_COURTS;
    const w = (new Date(Date.UTC(+j.slice(0, 4), +j.slice(5, 7) - 1, +j.slice(8, 10))).getUTCDay() + 6) % 7;
    const x = { semaine: s[w], jour: jourTexte(j), mois: m[+j.slice(5, 7) - 1], an: j.slice(0, 4) };
    x.texte = `${x.semaine} ${x.jour} ${x.mois}`;
    return x;
  }
  const liste = xs => xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} et ${xs[xs.length - 1]}`;
  // « 18 décembre 2026 », « 19 et 20 novembre 2026 », « du 12 au 20 février 2027 », « mars 2027 », « 2014 »
  function quand(date, jours) {
    if (date.precision === 'mois') return `${MOIS[+date.debut.slice(5, 7) - 1]} ${date.debut.slice(0, 4)}`;
    // une date sans jour ni mois (les anciennes saisons du récapitulatif de la compagnie) : son année, rien de plus précis
    if (date.precision === 'saison') return date.debut.slice(0, 4);
    if (date.precision === 'periode' || !jours.length) {
      const a = date.debut, b = date.fin || date.debut;
      if (a === b) return `${jourTexte(a)} ${MOIS[+a.slice(5, 7) - 1]} ${a.slice(0, 4)}`;
      const memeAn = a.slice(0, 4) === b.slice(0, 4), memeMois = memeAn && a.slice(5, 7) === b.slice(5, 7);
      return `du ${jourTexte(a)}${memeMois ? '' : ` ${MOIS[+a.slice(5, 7) - 1]}${memeAn ? '' : ` ${a.slice(0, 4)}`}`} au ${jourTexte(b)} ${MOIS[+b.slice(5, 7) - 1]} ${b.slice(0, 4)}`;
    }
    const js = [...new Set(jours)].sort();
    const suivis = js.length >= 3 && js.every((j, i) => !i || (Date.parse(j) - Date.parse(js[i - 1])) === 864e5);
    if (suivis) return quand({ precision: 'periode', debut: js[0], fin: js[js.length - 1] }, []);
    // les jours, groupés par mois : « 30 janvier et 2 février 2027 »
    const groupes = [];
    js.forEach(j => { const k = j.slice(0, 7), g = groupes[groupes.length - 1]; if (g && g.k === k) g.j.push(j); else groupes.push({ k, j: [j] }); });
    const an = js[js.length - 1].slice(0, 4), memeAn = js[0].slice(0, 4) === an;
    const morceaux = groupes.map((g, i) => {
      const fin = i === groupes.length - 1;
      return `${liste(g.j.map(jourTexte))} ${MOIS[+g.k.slice(5, 7) - 1]}${!fin && !memeAn ? ` ${g.k.slice(0, 4)}` : ''}`;
    });
    return `${groupes.length > 1 ? liste(morceaux) : morceaux[0]} ${an}`;
  }
  const ou = lieu => lieu ? `${lieu.commune} (${lieu.departement})` : '';
  function ligne(date, reps = [], lieu = null) {
    if (date.intitule) return date.intitule;
    const q = quand(date, reps.map(r => r.jour));
    return lieu ? `${q} — ${ou(lieu)}` : q;
  }
  // « au Théâtre des Charmes », « à L’Eclat », « à la Ferme de Bel Ebat », « à l’Espace culturel »
  function chez(nom) {
    const n = (nom || '').trim();
    if (!n) return '';
    if (/^le\s/i.test(n)) return `au ${n.slice(3)}`;
    if (/^les\s/i.test(n)) return `aux ${n.slice(4)}`;
    if (/^(la\s|l[’'])/i.test(n)) return `à ${n}`;
    if (/^(théâtre|collège|lycée|centre|forum|relais|point|château|conservatoire|musée|cinéma|foyer|festival|domaine|cloître|palais|parc|quai|carré|siroco|sillon|moulin)\b/i.test(n)) return `au ${n}`;
    if (/^(salle|maison|ferme|scène|médiathèque|halle|chapelle|cité|grange|mairie|ville|communauté|chartreuse|comédie|commanderie|abbaye)\b/i.test(n)) return `à la ${n}`;
    if (/^[aeéèêiîoôuy]/i.test(n)) return `à l’${n}`;
    return `à ${n}`;
  }
  // les précisions sous la ligne, quand l'administration n'en a pas écrit : « 14h et 20h : représentations au Forum »
  function precisions(date, reps, lieu) {
    if (date.details && date.details.length) return date.details;
    // une semaine de résidence (nature « residence ») : ni séance ni représentation, le lieu qui l'accueille
    if (date.nature === 'residence') return [{ texte: `Résidence ${chez(lieu?.nom)}`.trim(), lien: date.lien || null }];
    const vivantes = reps.filter(r => !r.annulee);
    if (!vivantes.length && !lieu?.nom) return [];
    const avecHeure = vivantes.filter(r => r.heure);
    const jours = [...new Set(vivantes.map(r => r.jour))];
    let heures = '';
    if (avecHeure.length) {
      heures = jours.length === 1 ? liste(avecHeure.map(r => heureTexte(r.heure)))
        : liste(jours.map(j => { const h = avecHeure.filter(r => r.jour === j).map(r => heureTexte(r.heure)); return h.length ? `${jourTexte(j)} ${MOIS[+j.slice(5, 7) - 1]} à ${liste(h)}` : null; }).filter(Boolean));
    }
    const n = vivantes.length || date.nb_representations || 0;
    const scol = vivantes.length && vivantes.every(r => r.public === 'scolaire');
    const mot = `représentation${n > 1 ? 's' : ''}${scol ? ` scolaire${n > 1 ? 's' : ''}` : ''}`;
    const texte = heures ? `${heures} : ${mot} ${chez(lieu?.nom)}`.trim() : `${n > 1 ? `${n} ` : ''}${mot} ${chez(lieu?.nom)}`.trim();
    return [{ texte, lien: date.lien || null }];
  }

  // ---- la durée d'un spectacle : un seul champ (« Durée » de sa fiche dans l'administration, colonne duree), écrit de la
  // même façon partout. dureeMinutes lit ce qu'on a tapé (« 1h15 », « 1 h 15 », « durée : 1h15 », « 75 », « 55 minutes ») ;
  // dureeCanon le réécrit comme la base le garde (« durée : 1h15 », « durée : 55 minutes ») ; un texte qu'elle ne comprend
  // pas reste tel quel
  const dureeMinutes = t => {
    const s = String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/^\s*duree\s*:?\s*/, '').trim();
    let m = /^(\d+)\s*(?:h|heures?)\s*(\d{1,2})?\s*(?:min(?:ute)?s?|mn)?$/.exec(s);
    if (m) return +m[1] * 60 + (+m[2] || 0);
    m = /^(\d+)\s*(?:min(?:ute)?s?|mn)?$/.exec(s);
    return m && +m[1] > 0 ? +m[1] : null;
  };
  const dureeCourte = n => n < 60 ? `${n} minutes` : `${Math.floor(n / 60)}h${n % 60 ? String(n % 60).padStart(2, '0') : ''}`;
  const dureeCanon = t => { const n = dureeMinutes(t), v = String(t == null ? '' : t).trim(); return n ? `durée : ${dureeCourte(n)}` : v; };

  // la durée dans un texte du dossier scolaire (HTML) : « {{duree}} » la dit ; les textes écrits avant ce champ
  // (« Durée : <strong>1h25</strong> », « d'une durée de 1 h 25 ») la suivent aussi. duree : le champ du spectacle
  const dureeDans = (duree, h) => {
    const n = dureeMinutes(duree); if (!n) return h;
    const court = dureeCourte(n), lisible = n < 60 ? court : `${Math.floor(n / 60)} h${n % 60 ? ` ${String(n % 60).padStart(2, '0')}` : ''}`;
    return String(h).replace(/\{\{duree\}\}/g, court)
      .replace(/^(Durée\s*:\s*<strong>)(?:\d+\s*h(?:\s*\d{1,2})?|\d+\s*min(?:utes)?)(<\/strong>\s*)$/i, (_, a, z) => a + court + z)
      .replace(/(durée de\s+)\d+\s*h(?:\s*\d{1,2})?/i, (_, a) => a + lisible);
  };

  return { MOIS, SEMAINE, MOIS_COURTS, iso, saisonDe, jourTexte, heureTexte, court, liste, quand, ou, ligne, chez, precisions, dureeMinutes, dureeCourte, dureeCanon, dureeDans };
})();
