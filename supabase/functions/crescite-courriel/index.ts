// crescite-courriel : les courriels des propositions de dates, et les réponses d'un clic.
//
//   POST { destinataire_id }, en-tête x-crescite-jeton : appelé par la base (pg_net) quand l'administration propose des
//          dates. Envoie à la personne un courriel : la proposition, et pour chaque jour « Disponible », « Pas
//          disponible », « Peut-être ». Note le résultat (crescite_propositions_destinataires.courriel_statut).
//   GET  ?r=<clé>                      la page de réponse : les jours proposés et les réponses de la personne
//   GET  ?r=<clé>&j=<jour>&c=<choix>   la même page, ce choix prêt à confirmer d'un bouton. Un lien de courriel n'enregistre
//                                      rien tout seul : les messageries ouvrent les liens pour les vérifier.
//   POST ?r=<clé> (formulaire j, c)    enregistre la réponse, puis montre la page.
//
// L'envoi passe par un service de courriel : Brevo (clé BREVO_API_KEY) ou Resend (RESEND_API_KEY), à mettre dans les
// secrets des fonctions (Edge Functions → Secrets). L'expéditeur : COURRIEL_EXPEDITEUR (contact@crescite.fr par défaut),
// à faire vérifier par le service. Sans clé, rien ne part : la proposition est notée « non_configure », et
// l'administration écrit elle-même depuis sa messagerie. SITE_URL : l'adresse du site (https://adrienvada.fr/Crescite).
//
// Déploiement : Edge Functions → Deploy a new function → Via Editor, nom « crescite-courriel », coller ce fichier,
// décocher « Verify JWT » (les liens des courriels s'ouvrent sans compte), Deploy.
import postgres from 'npm:postgres@3.4.5';

const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { prepare: false, max: 2 });
const BREVO = Deno.env.get('BREVO_API_KEY');
const RESEND = Deno.env.get('RESEND_API_KEY');
const EXPEDITEUR = Deno.env.get('COURRIEL_EXPEDITEUR') || 'contact@crescite.fr';
const NOM = 'Compagnie Crescite';
const SITE = (Deno.env.get('SITE_URL') || 'https://adrienvada.fr/Crescite').replace(/\/$/, '');
const ICI = `${(Deno.env.get('SUPABASE_URL') || '').replace(/\/$/, '')}/functions/v1/crescite-courriel`;

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const CHOIX: Record<string, string> = { oui: 'Disponible', non: 'Pas disponible', peut_etre: 'Peut-être' };
const jourTexte = (debut: string, fin: string, journee: boolean) => {
  const d = new Date(debut), f = new Date(fin);
  const jour = (x: Date) => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' }).format(x);
  const heure = (x: Date) => new Intl.DateTimeFormat('fr-FR', { hour: 'numeric', minute: '2-digit', timeZone: 'Europe/Paris' }).format(x).replace(':', 'h').replace(/h00$/, 'h');
  if (journee) {
    const dernier = new Date(f.getTime() - 86400e3);
    return dernier > d ? `du ${jour(d)} au ${jour(dernier)}` : jour(d);
  }
  return `${jour(d)}, ${heure(d)} – ${heure(f)}`;
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
    const page = `${ICI}?r=${d.jeton}`, appli = `${SITE}/equipe/#/proposition/${p.id}`;
    const sujet = `Crescite : des dates vous sont proposées · ${p.titre}`;
    const lignes = jours.map((j: { id: number; debut: string; fin: string; journee: boolean }) => {
      const boutons = Object.entries(CHOIX).map(([c, l]) =>
        `<a href="${page}&amp;j=${j.id}&amp;c=${c}" style="display:inline-block;margin:4px 6px 0 0;padding:8px 14px;border-radius:999px;text-decoration:none;font-weight:600;${c === 'oui' ? 'background:#a3306b;color:#fff' : 'background:#f3e7ee;color:#5a1d3d'}">${l}</a>`).join('');
      return `<tr><td style="padding:12px 0;border-top:1px solid #eee"><strong style="text-transform:capitalize">${esc(jourTexte(j.debut, j.fin, j.journee))}</strong><br>${boutons}</td></tr>`;
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
function page(cle: string, v: any, propose: { j?: string; c?: string }, message = '') {
  const jours = v?.jours || [];
  const corps = !v ? `<h1>Ce lien n'est plus valable</h1><p>Écrivez-nous pour recevoir de nouveau la proposition : <a href="mailto:${EXPEDITEUR}">${EXPEDITEUR}</a>.</p>`
    : `<p class="sur">Compagnie Crescite</p><h1>${esc(v.proposition.titre)}</h1>
       ${v.proposition.spectacle ? `<p class="sp">${esc(v.proposition.spectacle)}</p>` : ''}
       ${v.proposition.message ? `<p class="msg">${esc(v.proposition.message).replace(/\n/g, '<br>')}</p>` : ''}
       ${message ? `<p class="ok" role="status">${esc(message)}</p>` : ''}
       ${v.proposition.statut === 'close' ? '<p class="msg">Cette proposition est close : merci.</p>' : ''}
       <ul>${jours.map((j: any) => `<li${String(j.id) === propose.j ? ' class="vise"' : ''}><span class="j">${esc(jourTexte(j.debut, j.fin, j.journee))}</span>
         <form method="post" action="${ICI}?r=${esc(cle)}">${Object.entries(CHOIX).map(([c, l]) =>
           `<button name="c" value="${c}" class="${j.reponse === c ? 'pris' : ''}${String(j.id) === propose.j && propose.c === c && j.reponse !== c ? ' propose' : ''}"${v.proposition.statut === 'close' ? ' disabled' : ''}>${l}</button>`).join('')}
           <input type="hidden" name="j" value="${j.id}"></form></li>`).join('')}</ul>
       <p class="pied">Vous pouvez aussi répondre dans votre espace : <a href="${SITE}/equipe/#/proposition/${v.proposition.id}">l'application de l'équipe</a>.</p>`;
  return new Response(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Crescite · ${esc(v?.proposition?.titre || 'Proposition')}</title><style>
:root{color-scheme:light dark;--a:#a3306b;--f:#fff;--t:#1d1720;--l:#f3e7ee}@media (prefers-color-scheme:dark){:root{--f:#151015;--t:#f4eef2;--l:#2a1c25}}
body{margin:0;background:var(--f);color:var(--t);font:16px/1.5 -apple-system,Segoe UI,Roboto,sans-serif}main{max-width:560px;margin:0 auto;padding:32px 18px}
.sur{margin:0;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--a);font-weight:700}h1{margin:4px 0 6px;font-size:24px}.sp{margin:0 0 12px;opacity:.75}
.msg{padding:12px 14px;background:var(--l);border-radius:10px}.ok{padding:10px 14px;border-left:4px solid var(--a);background:var(--l)}
ul{list-style:none;padding:0;margin:18px 0}li{padding:14px 0;border-top:1px solid color-mix(in srgb,var(--t) 12%,transparent)}li.vise{background:var(--l);margin:0 -10px;padding:14px 10px;border-radius:10px}
.j{display:block;font-weight:650;text-transform:capitalize;margin-bottom:8px}form{display:flex;flex-wrap:wrap;gap:8px}
button{font:inherit;font-weight:600;padding:9px 15px;border-radius:999px;border:1.5px solid var(--a);background:transparent;color:inherit;cursor:pointer;transition:transform .12s}
button:active{transform:scale(.96)}button.pris{background:var(--a);color:#fff}button.propose{box-shadow:0 0 0 3px color-mix(in srgb,var(--a) 35%,transparent)}
button:disabled{opacity:.5;cursor:default}.pied{font-size:14px;opacity:.8}a{color:var(--a)}</style></head><body><main>${corps}</main></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const cle = url.searchParams.get('r') || '';
  try {
    if (req.method === 'POST' && !cle) {
      // l'envoi, demandé par la base : il faut le jeton interne
      const [s] = await sql`select valeur from public.crescite_secrets where cle = 'jeton_push'`;
      if (!s || req.headers.get('x-crescite-jeton') !== s.valeur) return new Response('interdit', { status: 403 });
      const { destinataire_id } = await req.json();
      return Response.json(await courriel(Number(destinataire_id)));
    }
    if (cle.length < 32 || cle.length > 128) return page(cle, null, {});
    let message = '';
    if (req.method === 'POST') {
      const f = await req.formData();
      const j = Number(f.get('j')), c = String(f.get('c') || '');
      const [{ r }] = await sql`select public.crescite_repondre_jeton(${cle}, ${j}, ${c}) as r`;
      message = r ? `C'est noté : ${CHOIX[c].toLowerCase()}. Merci !` : 'Cette réponse n’a pas pu être enregistrée.';
    }
    const [{ r: v }] = await sql`select public.crescite_proposition_jeton(${cle}) as r`;
    return page(cle, v, { j: url.searchParams.get('j') || undefined, c: url.searchParams.get('c') || undefined }, message);
  } catch (e) {
    console.error('crescite-courriel', e);
    return new Response('erreur', { status: 500 });
  }
});
