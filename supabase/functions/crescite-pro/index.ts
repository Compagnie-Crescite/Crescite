// crescite-pro : l'espace des programmateurs et des directeurs de salle (pro/), sur invitation.
//
//   POST { jeton }                  → { acces: {nom, contact, expire_le}, spectacles: [{…, documents: [{id, type, titre, pour, lien}]}] }
//                                     ou 404 si l'invitation n'existe pas, est échue ou désactivée. La visite est notée.
//   POST { jeton, document_id }     → { url } : le lien du document (une captation en ligne), ou un lien de téléchargement
//                                     d'une heure pour un fichier du stockage privé « crescite-pro » ; 404 sinon.
//                                     L'ouverture est notée au journal (l'administration voit qui a ouvert quoi).
// Le jeton est la seule clé : il est dans le lien envoyé à la salle (…/pro/#<jeton>), jamais dans une adresse de requête.
//
// Déploiement, une fois : Supabase → Edge Functions → Deploy a new function → Via Editor, nom « crescite-pro », coller ce
// fichier, Deploy. « Verify JWT » peut rester coché : la page pro/ s'annonce avec la clé publique du projet. Aucun secret à
// saisir : SUPABASE_DB_URL, SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournis par Supabase.
import postgres from 'npm:postgres@3.4.5';

const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { prepare: false, max: 2 });
const BASE = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const chemin = (p: string) => p.split('/').map(encodeURIComponent).join('/');

// un lien de téléchargement d'une heure pour un fichier du stockage privé
async function signer(stockage: string, fichier: string): Promise<string | null> {
  const r = await fetch(`${BASE}/storage/v1/object/sign/${stockage}/${chemin(fichier)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SERVICE}`, apikey: SERVICE, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: 3600 }),
  });
  if (!r.ok) return null;
  const { signedURL } = await r.json();
  return signedURL ? `${BASE}/storage/v1${signedURL}` : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ erreur: 'méthode' }, 405);
  let corps: { jeton?: string; document_id?: number };
  try { corps = await req.json(); } catch { return json({ erreur: 'requête' }, 400); }
  const jeton = String(corps.jeton || '');
  if (jeton.length < 32 || jeton.length > 128) return json({ erreur: 'acces' }, 404);
  try {
    if (corps.document_id == null) {
      const [{ r }] = await sql`select public.crescite_pro_ouvrir(${jeton}) as r`;
      return r ? json(r) : json({ erreur: 'acces' }, 404);
    }
    const [{ r }] = await sql`select public.crescite_pro_document(${jeton}, ${Number(corps.document_id)}) as r`;
    if (!r) return json({ erreur: 'document' }, 404);
    if (r.url) return json({ url: r.url, titre: r.titre });
    if (!r.fichier) return json({ erreur: 'document' }, 404);
    // un document des pros est public ; un document des salles se télécharge par un lien signé
    const url = r.stockage === 'crescite'
      ? `${BASE}/storage/v1/object/public/crescite/${chemin(r.fichier)}`
      : await signer(r.stockage, r.fichier);
    return url ? json({ url, titre: r.titre }) : json({ erreur: 'fichier' }, 404);
  } catch (e) {
    console.error('crescite-pro', e);
    return json({ erreur: 'base' }, 500);
  }
});
