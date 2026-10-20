// crescite-push : les notifications de l'équipe sur les téléphones et les ordinateurs (Web Push).
//
//   GET   → { cle_publique } : la clé publique VAPID, que l'espace de l'équipe donne au navigateur pour s'abonner.
//           Les clés sont créées au premier appel et rangées dans crescite_secrets (jamais lisibles par l'API).
//   POST  { notification_id }, en-tête x-crescite-jeton : appelé par la base (pg_net) à chaque notification nouvelle
//           d'une personne abonnée ; envoie la notification à tous ses appareils, retire les abonnements périmés.
//
// Déploiement, une fois : Supabase → Edge Functions → Deploy a new function → Via Editor, nom « crescite-push »,
// coller ce fichier, puis dans les réglages de la fonction décocher « Verify JWT » (la base s'annonce par son jeton,
// l'espace de l'équipe n'a besoin que de la clé publique). Aucun secret à saisir : la fonction lit la base par
// SUPABASE_DB_URL, fourni par Supabase.
import postgres from 'npm:postgres@3.4.5';
import webpush from 'npm:web-push@3.6.7';

const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { prepare: false, max: 2 });
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-crescite-jeton, authorization, apikey',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

async function secret(cle: string): Promise<string | null> {
  const r = await sql`select valeur from public.crescite_secrets where cle = ${cle}`;
  return r[0]?.valeur ?? null;
}

// la paire VAPID : créée une fois ; si deux appels se croisent, la première écrite gagne
async function cles() {
  let pub = await secret('vapid_publique'), priv = await secret('vapid_privee');
  if (!pub || !priv) {
    const k = webpush.generateVAPIDKeys();
    await sql`insert into public.crescite_secrets (cle, valeur) values ('vapid_publique', ${k.publicKey}), ('vapid_privee', ${k.privateKey})
              on conflict (cle) do nothing`;
    pub = await secret('vapid_publique'); priv = await secret('vapid_privee');
  }
  return { pub: pub!, priv: priv! };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const { pub, priv } = await cles();
    if (req.method === 'GET') return json({ cle_publique: pub });
    if (req.method !== 'POST') return json({ erreur: 'méthode' }, 405);
    const jeton = await secret('jeton_push');
    if (!jeton || req.headers.get('x-crescite-jeton') !== jeton) return json({ erreur: 'refusé' }, 403);
    const { notification_id } = await req.json();
    const [n] = await sql`select id, personne_id, type, titre, texte, lien, date_id from public.crescite_notifications where id = ${Number(notification_id)}`;
    if (!n) return json({ envoyees: 0 });
    const abonnements = await sql`select id, endpoint, p256dh, auth from public.crescite_abonnements where personne_id = ${n.personne_id}`;
    webpush.setVapidDetails('mailto:contact@crescite.fr', pub, priv);
    const charge = JSON.stringify({ id: n.id, type: n.type, titre: n.titre, texte: n.texte, lien: n.lien, date_id: n.date_id });
    let envoyees = 0, retirees = 0;
    for (const a of abonnements) {
      try {
        await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, charge,
          { TTL: 60 * 60 * 24, urgency: n.type === 'horaires' || n.type === 'message' ? 'high' : 'normal', topic: `n${n.date_id ?? n.id}` });
        envoyees++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) { await sql`delete from public.crescite_abonnements where id = ${a.id}`; retirees++; }
      }
    }
    return json({ envoyees, retirees });
  } catch (e) {
    return json({ erreur: String((e as Error)?.message ?? e) }, 500);
  }
});
