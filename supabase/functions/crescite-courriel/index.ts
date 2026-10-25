// crescite-courriel : les courriels des propositions de dates et des alertes de tournée, et les réponses d'un clic.
//
// Les propositions de dates (cinquième script SQL) :
//   POST { destinataire_id }, en-tête x-crescite-jeton : appelé par la base (pg_net) quand l'administration propose des
//          dates. Envoie à la personne un courriel : la proposition, et pour chaque jour « Disponible », « Pas
//          disponible », « Peut-être ». Note le résultat (crescite_propositions_destinataires.courriel_statut).
//   POST { r }                     la proposition vue par la clé de la personne : { proposition, prenom, jours } (jamais
//                                  son adresse) ; 404 si la clé n'existe pas.
//   POST { r, j, c }               enregistre la réponse c (oui, non, peut_etre) pour le jour j, et rend la proposition à
//                                  jour avec { enregistre } ; rien ne s'enregistre sur une proposition close.
//   GET  ?r=<clé>[&j=&c=]          renvoie vers la page de réponse du site.
// Les alertes de tournée (onzième script SQL, 20261030_crescite_alertes.sql) :
//   POST { alerte_confirmation }, en-tête x-crescite-jeton : appelé par la base quand le public dépose une alerte : le
//          courriel qui la fait confirmer, avec toutes les alertes de l'adresse qui attendent leur confirmation (un seul
//          lien les confirme). Noté sur ces alertes (confirmation_statut, confirmation_le).
//   POST { alertes: true }, en-tête x-crescite-jeton : le passage du matin (pg_cron) : les alertes non confirmées depuis
//          30 jours s'effacent ; les confirmations qui attendent leur courriel partent (50 au plus : celles restées
//          « non_configure » dès qu'une clé d'envoi existe, une erreur, une alerte venue dans les 24 heures d'un autre
//          courriel) ; puis chaque alerte confirmée reçoit UN courriel avec les dates de son secteur qu'elle n'a pas encore
//          reçues (le premier : toutes les dates à venir). 200 courriels au plus par passage (Brevo gratuit : 300 par jour,
//          il en faut pour les propositions et les liens de connexion), le reste au passage suivant. Chaque date écrite est
//          notée (crescite_alertes_envois, une ligne par alerte et par date) : jamais deux fois la même.
//   POST { alerte }                l'alerte vue par son jeton : { alerte, attente, autres } (son secteur, jamais
//                                  l'adresse) ; 404 si le jeton n'existe pas.
//   POST { alerte, action }        'confirmer' : les alertes de l'adresse qui attendaient deviennent actives ; 'arreter' :
//                                  l'alerte s'efface (tout : true, toutes celles de l'adresse), avec ce qui lui a été écrit.
//   POST ?alerte=<jeton>&action=arreter, corps « List-Unsubscribe=One-Click » : le désabonnement d'un geste des
//                                  messageries (RFC 8058 : l'en-tête List-Unsubscribe-Post des courriels envoyés par
//                                  Resend). Brevo pose lui-même son en-tête List-Unsubscribe sur les courriels
//                                  transactionnels (son API n'accepte en « headers » que des en-têtes non standard) : on ne
//                                  le double pas ; chaque courriel d'alerte porte de toute façon son lien de désinscription.
//   GET  ?alerte=<jeton>&action=…  renvoie vers la page de réponse du site.
// Les liens des courriels mènent à la page de réponse du site, …/reponse/?r=<clé>&j=<jour>&c=<choix> ou
// …/reponse/?alerte=<jeton>&action=confirmer|arreter : Supabase ne sert pas de page web depuis l'adresse d'une fonction
// (une réponse text/html y est montrée en texte brut). Un lien de courriel n'enregistre rien tout seul, la page fait
// confirmer d'un bouton : les messageries ouvrent les liens pour les vérifier. Aucun suivi d'ouverture ni de clic n'est
// ajouté aux courriels.
//
// L'envoi passe par un service de courriel : Brevo (clé BREVO_API_KEY) ou Resend (RESEND_API_KEY), à mettre dans les
// secrets des fonctions (Edge Functions → Secrets). L'expéditeur : COURRIEL_EXPEDITEUR (contact@crescite.fr par défaut),
// à faire vérifier par le service. Sans clé, rien ne part : c'est noté « non_configure » (la proposition, l'alerte),
// l'administration écrit elle-même aux destinataires d'une proposition, et le passage du matin reprend les confirmations
// d'alertes dès qu'une clé existe. SITE_URL : l'adresse du site (https://adrienvada.fr/Crescite).
//
// Déploiement : Edge Functions → Deploy a new function → Via Editor, nom « crescite-courriel », coller ce fichier,
// décocher « Verify JWT » (la base l'appelle avec son seul jeton, la page de réponse sans compte), Deploy.
import postgres from 'npm:postgres@3.4.5';

const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { prepare: false, max: 2 });
const BREVO = Deno.env.get('BREVO_API_KEY');
const RESEND = Deno.env.get('RESEND_API_KEY');
const EXPEDITEUR = Deno.env.get('COURRIEL_EXPEDITEUR') || 'contact@crescite.fr';
const NOM = 'Compagnie Crescite';
const SITE = (Deno.env.get('SITE_URL') || 'https://adrienvada.fr/Crescite').replace(/\/$/, '');
// les pages du site où mènent les courriels d'alerte : les dates et les spectacles (la synthèse des maquettes)
const PAGES = `${SITE}/synthese.html`;
// l'adresse de cette fonction (le désabonnement d'un geste des messageries)
const FONCTION = `${(Deno.env.get('SUPABASE_URL') || '').replace(/\/$/, '')}/functions/v1/crescite-courriel`;
const PLAFOND = 200;                    // courriels par passage du matin, confirmations comprises
const PLAFOND_CONFIRMATIONS = 50;       // dont confirmations
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const CHOIX: Record<string, string> = { oui: 'Disponible', non: 'Pas disponible', peut_etre: 'Peut-être' };
const jourTexte = (debut: string, fin: string, journee: boolean) => {
  const d = new Date(debut), f = new Date(fin);
  const jour = (x: Date) => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' }).format(x);
  const heure = (x: Date) => new Intl.DateTimeFormat('fr-FR', { hour: 'numeric', minute: '2-digit', timeZone: 'Europe/Paris' }).format(x).replace(':', 'h').replace(/h00$/, 'h');
  const t = journee
    ? (() => { const dernier = new Date(f.getTime() - 86400e3); return dernier > d ? `du ${jour(d)} au ${jour(dernier)}` : jour(d); })()
    : `${jour(d)}, ${heure(d)} – ${heure(f)}`;
  return t.charAt(0).toUpperCase() + t.slice(1);
};

// ---------------------------------------------------------------------------------------------- envoyer
// entetes : des en-têtes du courriel (List-Unsubscribe), que seul Resend reçoit (Brevo pose les siens)
async function envoyer(a: { email: string; nom: string }, sujet: string, html: string, texte: string, entetes?: Record<string, string>): Promise<string> {
  try {
    if (BREVO) {
      const r = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST', headers: { 'api-key': BREVO, 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ sender: { name: NOM, email: EXPEDITEUR }, to: [a.nom ? { email: a.email, name: a.nom } : { email: a.email }],
                               replyTo: { email: EXPEDITEUR, name: NOM }, subject: sujet, htmlContent: html, textContent: texte }),
      });
      return r.ok ? 'envoye' : `erreur : Brevo ${r.status} ${(await r.text()).slice(0, 160)}`;
    }
    if (RESEND) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: `${NOM} <${EXPEDITEUR}>`, to: [a.email], reply_to: EXPEDITEUR, subject: sujet, html, text: texte,
                               ...(entetes ? { headers: entetes } : {}) }),
      });
      return r.ok ? 'envoye' : `erreur : Resend ${r.status} ${(await r.text()).slice(0, 160)}`;
    }
  } catch (e) {
    return `erreur : ${String((e as Error)?.message || e).slice(0, 160)}`;
  }
  return 'non_configure';
}

async function courriel(destinataire: number) {
  const [d] = await sql`select jeton from public.crescite_propositions_destinataires where id = ${destinataire}`;
  if (!d) return { statut: 'inconnu' };
  const [{ r: v }] = await sql`select public.crescite_proposition_jeton(${d.jeton}) as r`;
  let statut: string;
  if (!v?.personne?.email) statut = 'sans_adresse';
  else {
    const p = v.proposition, jours = v.jours || [];
    const page = `${SITE}/reponse/?r=${d.jeton}`, appli = `${SITE}/equipe/#/proposition/${p.id}`;
    const sujet = `Crescite : des dates vous sont proposées · ${p.titre}`;
    const lignes = jours.map((j: { id: number; debut: string; fin: string; journee: boolean }) => {
      const boutons = Object.entries(CHOIX).map(([c, l]) =>
        `<a href="${page}&amp;j=${j.id}&amp;c=${c}" style="display:inline-block;margin:4px 6px 0 0;padding:8px 14px;border-radius:999px;text-decoration:none;font-weight:600;${c === 'oui' ? 'background:#a3306b;color:#fff' : 'background:#f3e7ee;color:#5a1d3d'}">${l}</a>`).join('');
      return `<tr><td style="padding:12px 0;border-top:1px solid #eee"><strong>${esc(jourTexte(j.debut, j.fin, j.journee))}</strong><br>${boutons}</td></tr>`;
    }).join('');
    const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#f7f4f6;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1d1720">
<table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;padding:28px 24px"><tr><td>
<p style="margin:0 0 4px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#a3306b;font-weight:700">Compagnie Crescite</p>
<h1 style="margin:0 0 14px;font-size:21px">${esc(p.titre)}</h1>
<p>Bonjour ${esc(v.personne.prenom || '')},</p>
<p>La compagnie vous propose ${jours.length > 1 ? 'ces dates' : 'cette date'}${p.spectacle ? ` pour <em>${esc(p.spectacle)}</em>` : ''}. Dites-nous d'un clic si vous êtes disponible :</p>
${p.message ? `<p style="padding:12px 14px;background:#f7f4f6;border-radius:8px">${esc(p.message).replace(/\n/g, '<br>')}</p>` : ''}
<table role="presentation" width="100%">${lignes}</table>
<p style="margin-top:18px">Vous pouvez aussi répondre dans votre espace : <a href="${appli}" style="color:#a3306b">${esc(appli)}</a></p>
<p style="color:#777;font-size:13px">Une question ? Répondez simplement à ce courriel.</p>
</td></tr></table></body></html>`;
    const texte = `${p.titre}\n\nBonjour ${v.personne.prenom || ''},\n\nLa compagnie vous propose ${jours.length > 1 ? 'ces dates' : 'cette date'}${p.spectacle ? ` pour ${p.spectacle}` : ''}.\n`
      + (p.message ? `\n${p.message}\n` : '')
      + jours.map((j: { id: number; debut: string; fin: string; journee: boolean }) => `\n- ${jourTexte(j.debut, j.fin, j.journee)} : répondre ${page}&j=${j.id}`).join('')
      + `\n\nOu dans votre espace : ${appli}\n`;
    statut = await envoyer({ email: v.personne.email, nom: `${v.personne.prenom || ''} ${v.personne.nom || ''}`.trim() }, sujet, html, texte);
  }
  await sql`update public.crescite_propositions_destinataires set courriel_statut = ${statut}, courriel_le = now() where id = ${destinataire}`;
  return { statut };
}

// ---------------------------------------------------------------------------------------------- la page de réponse
// ce que la page de réponse du site montre : la proposition, le prénom, les jours et les réponses (jamais l'adresse)
async function vue(cle: string) {
  const [{ r: v }] = await sql`select public.crescite_proposition_jeton(${cle}) as r`;
  return v ? { proposition: v.proposition, prenom: v.personne?.prenom || '', jours: v.jours || [] } : null;
}

// ---------------------------------------------------------------------------------------------- les alertes de tournée
type Secteur = { commune: string | null; code_postal: string | null; departement: string | null; rayon_km: number; geo: boolean;
                 spectacle: string | null; confirmee?: boolean; active?: boolean };
type DateAlerte = { id: number; debut: string; fin: string | null; precision: string; saison: string;
                    spectacle: { titre: string; slug: string; page: boolean }; lieu: { nom: string | null; commune: string; departement: string } | null;
                    seances: { jour: string; heure: string | null }[]; lien: string | null };

// le secteur d'une alerte, en mots : « Rouen, 40 km alentour » (une position), « Rouen, département 76 » (un code postal)
function secteurTexte(a: Secteur) {
  const ou = a.commune || a.code_postal || '';
  if (a.geo) return `${ou ? `${ou}, ` : 'Votre position, '}${a.rayon_km} km alentour`;
  return [ou, a.departement ? `département ${a.departement}` : ''].filter(Boolean).join(', ') || 'Secteur à préciser';
}
const quoiTexte = (a: Secteur) => `${secteurTexte(a)} · ${a.spectacle || 'tous les spectacles'}`;
const vueSecteur = (a: Secteur) => ({ secteur: secteurTexte(a), spectacle: a.spectacle || null, confirmee: !!a.confirmee, active: a.active !== false });

// les jours d'une date de l'agenda : « Vendredi 18 décembre 2026 à 20h30 », « Du jeudi 3 au samedi 5 décembre 2027 »,
// « Décembre 2026 », « Saison 2026-2027 » (des dates sans fuseau : lues à midi en temps universel)
const jourDe = (iso: string) => new Date(`${String(iso).slice(0, 10)}T12:00:00Z`);
const fr = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('fr-FR', { ...o, timeZone: 'UTC' });
const JOUR = fr({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), JOUR_SANS_AN = fr({ weekday: 'long', day: 'numeric', month: 'long' });
const QUANTIEME = fr({ day: 'numeric', month: 'long' }), QUANTIEME_AN = fr({ day: 'numeric', month: 'long', year: 'numeric' }), MOIS = fr({ month: 'long', year: 'numeric' });
const heureDe = (h: string | null) => (h ? String(h).slice(0, 5).replace(':', 'h').replace(/h00$/, 'h').replace(/^0(\d)/, '$1') : '');
const maj = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
function quandTexte(d: DateAlerte) {
  if (d.precision === 'saison') return `Saison ${d.saison}`;
  if (d.precision === 'mois') return maj(MOIS.format(jourDe(d.debut)));
  const fin = d.fin && d.fin.slice(0, 10) > d.debut.slice(0, 10) ? d.fin : null;
  if (d.precision === 'periode') return fin ? `Du ${QUANTIEME.format(jourDe(d.debut))} au ${QUANTIEME_AN.format(jourDe(fin))}` : maj(QUANTIEME_AN.format(jourDe(d.debut)));
  // le jour : ses séances tout public, jour par jour, avec leurs heures
  const parJour = new Map<string, string[]>();
  for (const s of d.seances || []) {
    const k = String(s.jour).slice(0, 10), h = heureDe(s.heure);
    if (!parJour.has(k)) parJour.set(k, []);
    if (h && !parJour.get(k)!.includes(h)) parJour.get(k)!.push(h);
  }
  if (parJour.size) return maj([...parJour].map(([j, hs]) => `${JOUR.format(jourDe(j))}${hs.length ? ` à ${hs.join(' et ')}` : ''}`).join(' ; '));
  return fin ? `Du ${JOUR_SANS_AN.format(jourDe(d.debut))} au ${JOUR.format(jourDe(fin))}` : maj(JOUR.format(jourDe(d.debut)));
}
const lieuTexte = (d: DateAlerte) => (d.lieu ? [d.lieu.nom, `${d.lieu.commune}${d.lieu.departement ? ` (${d.lieu.departement})` : ''}`].filter(Boolean).join(', ') : '');
const pageSpectacle = (d: DateAlerte) => (d.spectacle.page ? `${PAGES}#/spectacle/${encodeURIComponent(d.spectacle.slug)}/voir` : `${PAGES}#/saisons`);
const bouton = (href: string, texte: string) => `<a href="${esc(href)}" style="display:inline-block;margin-top:8px;padding:9px 16px;border-radius:999px;background:#a3306b;color:#fff;text-decoration:none;font-weight:600">${esc(texte)}</a>`;
const gabarit = (corps: string) => `<!doctype html><html lang="fr"><body style="margin:0;background:#f7f4f6;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1d1720">
<table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;padding:28px 24px"><tr><td>
<p style="margin:0 0 4px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#a3306b;font-weight:700">Compagnie Crescite</p>
${corps}
</td></tr></table></body></html>`;

// le courriel de confirmation d'une adresse : ses alertes qui attendent, et le lien qui les confirme toutes. Noté sur ces
// alertes (le compte des 24 heures et celui des 30 jours partent de là)
async function confirmation(id: number) {
  const [{ v }] = await sql`select public.crescite_alerte_courriel(${id}) as v`;
  if (!v) return { statut: 'inutile' };
  const lien = `${SITE}/reponse/?alerte=${v.jeton}&action=confirmer`;
  const xs: Secteur[] = v.attente || [], plus = xs.length > 1;
  const sujet = plus ? 'Crescite : confirmez vos alertes de tournée' : 'Crescite : confirmez votre alerte de tournée';
  const attente = plus ? 'Tant qu’elles ne sont pas confirmées, rien ne vous est envoyé ; sans confirmation, elles s’effaceront dans 30 jours.'
    : 'Tant qu’elle n’est pas confirmée, rien ne vous est envoyé ; sans confirmation, elle s’effacera dans 30 jours.';
  const html = gabarit(`<h1 style="margin:0 0 14px;font-size:21px">${plus ? 'Confirmez vos alertes' : 'Confirmez votre alerte'}</h1>
<p>Bonjour,</p>
<p>Vous avez demandé à être prévenu(e) par courriel des dates de la compagnie près de chez vous :</p>
<ul style="padding-left:20px">${xs.map(a => `<li style="margin:4px 0">${esc(quoiTexte(a))}</li>`).join('')}</ul>
<p>${bouton(lien, plus ? 'Confirmer mes alertes' : 'Confirmer mon alerte')}</p>
<p>${attente}</p>
<p style="color:#777;font-size:13px">Ce n’est pas vous ? Ignorez simplement ce courriel : sans confirmation, aucune alerte ne vous sera envoyée. Votre adresse ne sert qu’à ${plus ? 'ces alertes' : 'cette alerte'}.</p>`);
  const texte = `${plus ? 'Confirmez vos alertes' : 'Confirmez votre alerte'} de tournée\n\nBonjour,\n\nVous avez demandé à être prévenu(e) par courriel des dates de la compagnie près de chez vous :\n`
    + xs.map(a => `- ${quoiTexte(a)}\n`).join('')
    + `\n${plus ? 'Confirmer mes alertes' : 'Confirmer mon alerte'} : ${lien}\n\n${attente}\n`
    + `Ce n’est pas vous ? Ignorez simplement ce courriel. Votre adresse ne sert qu’à ${plus ? 'ces alertes' : 'cette alerte'}.\n`;
  const statut = await envoyer({ email: v.email, nom: '' }, sujet, html, texte);
  await sql`update public.crescite_alertes_tournee set confirmation_statut = ${statut}, confirmation_le = now()
            where lower(email) = ${v.email} and active and confirme_le is null`;
  return { statut };
}

// le courriel d'une alerte : les dates de son secteur qu'elle n'a pas encore reçues
async function ecrireAlerte(a: { id: number; email: string; jeton: string; secteur: Secteur; dates: DateAlerte[] }) {
  const dates = a.dates || [], n = dates.length, s = a.secteur, secteur = secteurTexte(s);
  const arret = `${SITE}/reponse/?alerte=${a.jeton}&action=arreter`, toutes = `${PAGES}#/saisons`;
  const d0 = dates[0];
  const sujet = (n === 1 ? `Crescite près de chez vous : ${d0.spectacle.titre}${d0.lieu ? `, ${d0.lieu.commune}` : ''}` : `Crescite près de chez vous : ${n} dates`)
    .replace(/\s+/g, ' ').trim();
  const intro = `${n > 1 ? `Voici les ${n} dates` : 'Voici la date'} de la compagnie ${n > 1 ? 'confirmées' : 'confirmée'} dans votre secteur (${secteur})`;
  const lignes = dates.map(d => `<tr><td style="padding:14px 0;border-top:1px solid #eee">
<strong><a href="${esc(pageSpectacle(d))}" style="color:#1d1720">${esc(d.spectacle.titre)}</a></strong><br>
${esc(quandTexte(d))}<br><span style="color:#5f565a">${esc(lieuTexte(d))}</span>${d.lien ? `<br>${bouton(d.lien, 'Réserver')}` : ''}</td></tr>`).join('');
  const html = gabarit(`<h1 style="margin:0 0 14px;font-size:21px">${n > 1 ? `${n} dates près de chez vous` : 'Une date près de chez vous'}</h1>
<p>Bonjour,</p>
<p>${esc(intro)}${s.spectacle ? ` pour <em>${esc(s.spectacle)}</em>` : ''} :</p>
<table role="presentation" width="100%">${lignes}</table>
<p style="margin-top:18px"><a href="${esc(toutes)}" style="color:#a3306b">Toutes les dates de la compagnie</a></p>
<p style="color:#777;font-size:13px">Vous recevez ce courriel parce que cette adresse a demandé une alerte de tournée (${esc(quoiTexte(s))}). Elle ne sert qu’à cela. <a href="${esc(arret)}" style="color:#777">Ne plus recevoir cette alerte</a>.</p>`);
  const texte = `${n > 1 ? `${n} dates près de chez vous` : 'Une date près de chez vous'}\n\nBonjour,\n\n${intro}${s.spectacle ? ` pour ${s.spectacle}` : ''} :\n`
    + dates.map(d => `\n${d.spectacle.titre}\n${quandTexte(d)}\n${lieuTexte(d)}\n${d.lien ? `Réserver : ${d.lien}\n` : ''}${pageSpectacle(d)}\n`).join('')
    + `\nToutes les dates de la compagnie : ${toutes}\n\nVous recevez ce courriel parce que cette adresse a demandé une alerte de tournée (${quoiTexte(s)}).\nNe plus recevoir cette alerte : ${arret}\n`;
  const unClic = `${FONCTION}?alerte=${encodeURIComponent(a.jeton)}&action=arreter`;
  return envoyer({ email: a.email, nom: '' }, sujet, html, texte,
    /^https:\/\//.test(FONCTION) ? { 'List-Unsubscribe': `<${unClic}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } : undefined);
}

// quelques envois à la fois (le passage tient ainsi dans le temps d'une fonction)
async function parQuatre<T>(xs: T[], f: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(4, xs.length) }, async () => { while (i < xs.length) await f(xs[i++]); }));
}

// le passage du matin : effacer, confirmer, écrire
async function passage() {
  const bilan = { effacees: 0, confirmations: 0, alertes: 0, dates: 0, envoyes: 0, reste: false };
  const [{ n }] = await sql`select public.crescite_alertes_purger() as n`;
  bilan.effacees = Number(n) || 0;
  const ids = await sql`select x as id from public.crescite_alertes_confirmations(${PLAFOND_CONFIRMATIONS}) x`;
  for (const { id } of ids) {
    const { statut } = await confirmation(Number(id));
    bilan.confirmations++;
    if (statut === 'envoye') bilan.envoyes++;
  }
  const [{ v: lot }] = await sql`select public.crescite_alertes_lot(${PLAFOND - ids.length}) as v`;
  await parQuatre(lot?.alertes || [], async (a: { id: number; email: string; jeton: string; secteur: Secteur; dates: DateAlerte[] }) => {
    const statut = await ecrireAlerte(a);
    const dates = `{${(a.dates || []).map(d => Number(d.id)).join(',')}}`;
    await sql`update public.crescite_alertes_envois set statut = ${statut}, envoye_le = now()
              where alerte_id = ${a.id} and date_id = any (${dates}::bigint[])`;
    if (statut === 'envoye') {
      await sql`update public.crescite_alertes_tournee set derniere_notification_le = now() where id = ${a.id}`;
      bilan.envoyes++;
    }
    bilan.alertes++;
    bilan.dates += (a.dates || []).length;
  });
  bilan.reste = !!lot?.reste;
  return bilan;
}

// une alerte vue par son jeton : son secteur et son état, celles de l'adresse qui attendent, combien elle en a d'autres
async function vueAlerte(jeton: string) {
  const [{ v }] = await sql`select public.crescite_alerte_jeton(${jeton}) as v`;
  return v ? { alerte: vueSecteur(v.alerte), attente: (v.attente || []).map(vueSecteur), autres: Number(v.autres) || 0 } : null;
}
async function alerte(corps: { alerte?: unknown; action?: unknown; tout?: unknown }) {
  const jeton = String(corps.alerte || '');
  if (jeton.length < 32 || jeton.length > 128) return json({ erreur: 'lien' }, 404);
  if (corps.action === 'arreter') {
    const [{ n }] = await sql`select public.crescite_alerte_arreter(${jeton}, ${corps.tout === true}) as n`;
    return n == null ? json({ erreur: 'lien' }, 404) : json({ enregistre: Number(n) > 0, arretees: Number(n) });
  }
  if (corps.action === 'confirmer') {
    const [{ n }] = await sql`select public.crescite_alerte_confirmer(${jeton}) as n`;
    if (n == null) return json({ erreur: 'lien' }, 404);
    return json({ ...(await vueAlerte(jeton)), enregistre: Number(n) > 0, confirmees: Number(n) });
  }
  const v = await vueAlerte(jeton);
  return v ? json(v) : json({ erreur: 'lien' }, 404);
}

// ce que la base demande (un courriel, le passage du matin) : il faut son jeton interne
async function parLaBase(req: Request) {
  const [s] = await sql`select valeur from public.crescite_secrets where cle = 'jeton_push'`;
  return !!s && req.headers.get('x-crescite-jeton') === s.valeur;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const u = new URL(req.url);
    if (req.method === 'GET') {
      // un lien vers la fonction elle-même : la page de réponse est sur le site
      const q = new URLSearchParams();
      for (const k of ['r', 'j', 'c', 'alerte', 'action']) { const x = u.searchParams.get(k); if (x) q.set(k, x); }
      const suite = q.toString();
      return new Response(null, { status: 302, headers: { Location: `${SITE}/reponse/${suite ? `?${suite}` : ''}`, 'Cache-Control': 'no-store' } });
    }
    if (req.method !== 'POST') return json({ erreur: 'méthode' }, 405);
    // le désabonnement d'un geste d'une messagerie (List-Unsubscribe-Post) : l'alerte s'efface, la réponse est vide
    if (u.searchParams.get('alerte') && u.searchParams.get('action') === 'arreter' && !/json/i.test(req.headers.get('content-type') || '')) {
      const corps = await req.text();
      const jeton = u.searchParams.get('alerte')!;
      if (!/List-Unsubscribe=One-Click/i.test(corps) || jeton.length < 32 || jeton.length > 128) return json({ erreur: 'requête' }, 400);
      await sql`select public.crescite_alerte_arreter(${jeton}, false)`;
      return new Response(null, { status: 200, headers: { ...CORS, 'Cache-Control': 'no-store' } });
    }
    let corps: { destinataire_id?: number; alerte_confirmation?: number; alertes?: unknown; r?: string; j?: number; c?: string; alerte?: string; action?: string; tout?: boolean };
    try { corps = await req.json(); } catch { return json({ erreur: 'requête' }, 400); }
    if (corps.destinataire_id != null || corps.alerte_confirmation != null || corps.alertes != null) {
      if (!(await parLaBase(req))) return json({ erreur: 'refusé' }, 403);
      if (corps.destinataire_id != null) return json(await courriel(Number(corps.destinataire_id)));
      if (corps.alerte_confirmation != null) return json(await confirmation(Number(corps.alerte_confirmation)));
      return json(await passage());
    }
    if (corps.alerte != null) return await alerte(corps);
    const cle = String(corps.r || '');
    if (cle.length < 32 || cle.length > 128) return json({ erreur: 'lien' }, 404);
    const v = await vue(cle);
    if (!v) return json({ erreur: 'lien' }, 404);
    if (corps.j == null) return json(v);
    const c = String(corps.c || '');
    if (v.proposition.statut === 'close' || !Object.hasOwn(CHOIX, c)) return json({ ...v, enregistre: false });
    const [{ r }] = await sql`select public.crescite_repondre_jeton(${cle}, ${Number(corps.j)}, ${c}) as r`;
    return json({ ...(await vue(cle)), enregistre: r === true });
  } catch (e) {
    console.error('crescite-courriel', e);
    return json({ erreur: 'base' }, 500);
  }
});
