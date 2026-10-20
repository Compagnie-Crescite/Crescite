// crescite-courriel : les courriels des propositions de dates, et les réponses d'un clic.
//
//   POST { destinataire_id }, en-tête x-crescite-jeton : appelé par la base (pg_net) quand l'administration propose des
//          dates. Envoie à la personne un courriel : la proposition, et pour chaque jour « Disponible », « Pas
//          disponible », « Peut-être ». Note le résultat (crescite_propositions_destinataires.courriel_statut).
//   POST { r }                     la proposition vue par la clé de la personne : { proposition, prenom, jours } (jamais
//                                  son adresse) ; 404 si la clé n'existe pas.
//   POST { r, j, c }               enregistre la réponse c (oui, non, peut_etre) pour le jour j, et rend la proposition à
//                                  jour avec { enregistre } ; rien ne s'enregistre sur une proposition close.
//   GET  ?r=<clé>[&j=&c=]          renvoie vers la page de réponse du site.
// Les liens des courriels mènent à la page de réponse du site, …/reponse/?r=<clé>&j=<jour>&c=<choix> : Supabase ne
// sert pas de page web depuis l'adresse d'une fonction (une réponse text/html y est montrée en texte brut). Un lien de
// courriel n'enregistre rien tout seul, la page fait confirmer d'un bouton : les messageries ouvrent les liens pour les
// vérifier.
//
// L'envoi passe par un service de courriel : Brevo (clé BREVO_API_KEY) ou Resend (RESEND_API_KEY), à mettre dans les
// secrets des fonctions (Edge Functions → Secrets). L'expéditeur : COURRIEL_EXPEDITEUR (contact@crescite.fr par défaut),
// à faire vérifier par le service. Sans clé, rien ne part : la proposition est notée « non_configure », et
// l'administration écrit elle-même depuis sa messagerie. SITE_URL : l'adresse du site (https://adrienvada.fr/Crescite).
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
async function envoyer(a: { email: string; nom: string }, sujet: string, html: string, texte: string): Promise<string> {
  if (BREVO) {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST', headers: { 'api-key': BREVO, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: { name: NOM, email: EXPEDITEUR }, to: [{ email: a.email, name: a.nom }], replyTo: { email: EXPEDITEUR, name: NOM },
                             subject: sujet, htmlContent: html, textContent: texte }),
    });
    return r.ok ? 'envoye' : `erreur : Brevo ${r.status} ${(await r.text()).slice(0, 160)}`;
  }
  if (RESEND) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `${NOM} <${EXPEDITEUR}>`, to: [a.email], reply_to: EXPEDITEUR, subject: sujet, html, text: texte }),
    });
    return r.ok ? 'envoye' : `erreur : Resend ${r.status} ${(await r.text()).slice(0, 160)}`;
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (req.method === 'GET') {
      // un lien vers la fonction elle-même : la page de réponse est sur le site
      const u = new URL(req.url), q = new URLSearchParams();
      for (const k of ['r', 'j', 'c']) { const x = u.searchParams.get(k); if (x) q.set(k, x); }
      const suite = q.toString();
      return new Response(null, { status: 302, headers: { Location: `${SITE}/reponse/${suite ? `?${suite}` : ''}`, 'Cache-Control': 'no-store' } });
    }
    if (req.method !== 'POST') return json({ erreur: 'méthode' }, 405);
    let corps: { destinataire_id?: number; r?: string; j?: number; c?: string };
    try { corps = await req.json(); } catch { return json({ erreur: 'requête' }, 400); }
    if (corps.destinataire_id != null) {
      // l'envoi, demandé par la base : il faut le jeton interne
      const [s] = await sql`select valeur from public.crescite_secrets where cle = 'jeton_push'`;
      if (!s || req.headers.get('x-crescite-jeton') !== s.valeur) return json({ erreur: 'refusé' }, 403);
      return json(await courriel(Number(corps.destinataire_id)));
    }
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
