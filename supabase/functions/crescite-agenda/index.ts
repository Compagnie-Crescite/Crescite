// crescite-agenda : les agendas de l'équipe, dans les deux sens.
//
//   POST { synchro: true }, en-tête x-crescite-jeton (le secret « jeton_push ») : appelé toutes les heures par la base
//        (pg_cron, script SQL 5). Relit chaque agenda relié actif (crescite_agendas_lies, les plus anciens d'abord, 30 au
//        plus par passage, 4 à la fois) et en tire les indisponibilités de sa personne → { lus, erreurs }.
//   POST { synchro: true, agenda_id }, en-tête Authorization: Bearer <jeton de connexion de la personne> : la personne
//        relit son agenda tout de suite (juste après l'avoir relié, ou « Relire maintenant »). La personne est vérifiée
//        par l'authentification de Supabase (/auth/v1/user), et l'agenda doit être le sien. Une lecture réussie il y a
//        moins de 20 secondes n'est pas refaite. → { agenda: { id, actif, derniere_synchro, nb_evenements, erreur } }
//   GET  ?flux=<agenda_jeton> : le flux iCalendar (text/calendar) des dates Crescite de la personne, celles où elle part
//        (l'équipe de la date, ou sa distribution « en tournée ») : les représentations à leur heure, les répétitions avec
//        leur fin, le lieu, des UID stables. C'est l'adresse qu'on ajoute à Google Agenda (« À partir de l'URL »), à
//        Apple Calendrier ou à Outlook (webcal://…). Une clé inconnue (changée depuis) : 404.
//
// La lecture d'un agenda relié :
//   - l'adresse : https seulement (webcal:// devient https://) ; refusés : un hôte en adresse IP, localhost, un nom local
//     (.local, .internal…) ou qui pointe vers une plage privée, et chaque redirection est vérifiée de même (3 au plus) ;
//     15 secondes et 5 Mo au plus ;
//   - le flux est lu par ical.js : récurrences (RRULE, RDATE, EXDATE, RECURRENCE-ID), fuseaux (VTIMEZONE du flux, sinon le
//     nom IANA, ou Windows pour Outlook ; une heure flottante est à Paris), journées entières (de minuit à minuit, heure
//     de Paris, fin exclue) ;
//   - les événements « disponible » (TRANSP:TRANSPARENT) et annulés (STATUS:CANCELLED) ne comptent pas ;
//   - la fenêtre : de J-30 à J+400 ; chaque occurrence devient une indisponibilité (source 'agenda', agenda_id,
//     uid = « UID|début de l'occurrence »), et celles qui ont disparu de l'agenda dans la fenêtre sont retirées ;
//   - RIEN d'autre n'est gardé : ni titre, ni lieu, ni description, ni participants ; seulement les heures ;
//   - l'agenda note derniere_synchro (la dernière lecture réussie), nb_evenements, et erreur : une phrase en clair,
//     affichée telle quelle dans l'espace de l'équipe. Une lecture qui échoue ne retire rien.
//
// Déploiement, une fois : Supabase → Edge Functions → Deploy a new function → Via Editor, nom « crescite-agenda », coller
// ce fichier, Deploy ; puis, dans les réglages de la fonction, décocher « Verify JWT » : le flux s'ouvre sans compte (sa
// clé est dans l'adresse), la base s'annonce par son jeton, et la personne est vérifiée ici même. Aucun secret à saisir :
// SUPABASE_DB_URL, SUPABASE_URL et SUPABASE_ANON_KEY sont fournis par Supabase ; SITE_URL (facultatif, comme pour
// crescite-courriel) : l'adresse du site, pour les liens des événements du flux. Le script SQL 5 a posé la relecture
// horaire (pg_cron, tâche « crescite-agendas »).
import postgres from 'npm:postgres@3.4.5';
import ICAL from 'npm:ical.js@2.2.1';

const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { prepare: false, max: 4 });
const SUPABASE_URL = (Deno.env.get('SUPABASE_URL') || '').replace(/\/$/, '');
const ANON = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SITE = (Deno.env.get('SITE_URL') || 'https://adrienvada.fr/Crescite').replace(/\/$/, '');
const ZONE = 'Europe/Paris';
const JOUR = 86_400_000;
const AVANT = 30, APRES = 400;                 // la fenêtre lue : de J-30 à J+400
const DELAI = 15_000, TAILLE = 5 * 1024 * 1024, REDIRECTIONS = 3;
const MAX_PERIODES = 5000, MAX_PAS = 20_000;   // par agenda : occurrences gardées, pas d'itération d'une récurrence
const LOT = 30, ENSEMBLE = 4, BUDGET = 100_000; // le passage horaire : agendas lus, en même temps, temps (ms)
// Supabase arrête un appel vers deux secondes de calcul (erreur 546) : le passage horaire ne commence plus de lecture
// après 0,9 s de lecture ; les agendas qui restent passent à l'heure suivante (les moins récemment lus d'abord)
const CALCUL = 900;
let calcul = 0;
const RECENTE = 20_000;                        // une lecture réussie plus récente n'est pas refaite à la demande
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-crescite-jeton, authorization, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const texte = (t: string, status: number) => new Response(t, { status, headers: { ...CORS, 'Content-Type': 'text/plain; charset=utf-8' } });

// une erreur à montrer telle quelle à la personne (dans « Relier mon agenda »)
export class ErreurAgenda extends Error {}

type Periode = { uid: string; debut: string; fin: string; journee: boolean };
type Agenda = { id: string | number; personne_id: string | number; url: string; derniere_synchro?: Date | string | null };

// ================================================================================================ les fuseaux
const FORMATS = new Map<string, Intl.DateTimeFormat>();
function zoneValide(z: string): boolean {
  if (!z) return false;
  try { new Intl.DateTimeFormat('en-US', { timeZone: z }); return true; } catch { return false; }
}
// le décalage (ms) d'un fuseau à un instant donné
function decalage(t: number, zone: string): number {
  let f = FORMATS.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    FORMATS.set(zone, f);
  }
  const p: Record<string, string> = {};
  for (const x of f.formatToParts(new Date(t))) p[x.type] = x.value;
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - Math.floor(t / 1000) * 1000;
}
// une heure « au mur » dans un fuseau → l'instant (ms) ; les heures qui n'existent pas (passage à l'heure d'été) avancent
export function instantLocal(a: number, mo: number, j: number, h: number, mi: number, s: number, zone = ZONE): number {
  const mur = Date.UTC(a, mo - 1, j, h, mi, s);
  const t = mur - decalage(mur, zone);
  return mur - decalage(t, zone);
}
// les noms Windows qu'Outlook écrit parfois sans les définir
const WINDOWS: Record<string, string> = {
  'Romance Standard Time': 'Europe/Paris', 'W. Europe Standard Time': 'Europe/Berlin', 'Central Europe Standard Time': 'Europe/Budapest',
  'Central European Standard Time': 'Europe/Warsaw', 'GMT Standard Time': 'Europe/London', 'Greenwich Standard Time': 'Atlantic/Reykjavik',
  'E. Europe Standard Time': 'Europe/Chisinau', 'FLE Standard Time': 'Europe/Kiev', 'GTB Standard Time': 'Europe/Bucharest',
  'Russian Standard Time': 'Europe/Moscow', 'Morocco Standard Time': 'Africa/Casablanca', 'W. Central Africa Standard Time': 'Africa/Lagos',
  'Eastern Standard Time': 'America/New_York', 'Central Standard Time': 'America/Chicago', 'Mountain Standard Time': 'America/Denver',
  'Pacific Standard Time': 'America/Los_Angeles', 'Atlantic Standard Time': 'America/Halifax', 'SA Pacific Standard Time': 'America/Bogota',
  'E. South America Standard Time': 'America/Sao_Paulo', 'Tokyo Standard Time': 'Asia/Tokyo', 'China Standard Time': 'Asia/Shanghai',
  'India Standard Time': 'Asia/Kolkata', 'Arabian Standard Time': 'Asia/Dubai', 'AUS Eastern Standard Time': 'Australia/Sydney',
  'Mauritius Standard Time': 'Indian/Mauritius', 'UTC': 'UTC', 'Coordinated Universal Time': 'UTC',
};
// une heure ical.js → l'instant (ms) : le fuseau défini dans le flux, sinon son nom (IANA ou Windows), sinon Paris
// deno-lint-ignore no-explicit-any
function instant(t: any): number {
  const z = t.zone;
  if (z && z.tzid === 'UTC') return Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute, t.second);
  if (z && z.tzid && z.tzid !== 'floating' && z.component) return t.toUnixTime() * 1000;
  const nom = String(t.timezone || '').replace(/^"|"$/g, '').trim();
  const zone = zoneValide(nom) ? nom : WINDOWS[nom] || ZONE;
  return instantLocal(t.year, t.month, t.day, t.hour, t.minute, t.second, zone);
}
// deno-lint-ignore no-explicit-any
const ymd = (t: any) => `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`;
const iso = (ms: number) => new Date(ms).toISOString();

// ================================================================================================ lire un agenda
const PAS_ICAL = 'Cette adresse ne donne pas un agenda iCal. Copiez l’adresse « secrète au format iCal » (Google), ou le lien public du calendrier (Apple, Outlook) : elle finit souvent par .ics.';

// une période d'occurrence ; null si elle ne compte pas
// deno-lint-ignore no-explicit-any
function periode(debut: any, fin: any): { debut: number; fin: number; journee: boolean } | null {
  if (!debut) return null;
  if (debut.isDate) {
    const d = instantLocal(debut.year, debut.month, debut.day, 0, 0, 0);
    let f = fin && fin.isDate ? instantLocal(fin.year, fin.month, fin.day, 0, 0, 0) : NaN;
    if (!(f > d)) {
      const lendemain = new Date(Date.UTC(debut.year, debut.month - 1, debut.day + 1));
      f = instantLocal(lendemain.getUTCFullYear(), lendemain.getUTCMonth() + 1, lendemain.getUTCDate(), 0, 0, 0);
    }
    return { debut: d, fin: f, journee: true };
  }
  const d = instant(debut);
  let f = fin ? (fin.isDate ? instantLocal(fin.year, fin.month, fin.day, 0, 0, 0) : instant(fin)) : NaN;
  if (!(f > d)) f = d + 3_600_000;            // sans fin (ou fin avant le début) : une heure
  return { debut: d, fin: f, journee: false };
}
// deno-lint-ignore no-explicit-any
function compte(composant: any): boolean {
  const statut = String(composant.getFirstPropertyValue('status') || '').toUpperCase();
  const transp = String(composant.getFirstPropertyValue('transp') || '').toUpperCase();
  return statut !== 'CANCELLED' && transp !== 'TRANSPARENT';
}

/* Un agenda de plusieurs années pèse des mégaoctets, et Supabase ne donne qu'environ deux secondes de calcul par appel
   (au-delà : erreur 546). Avant ical.js, on retire donc du texte les événements qui ne peuvent pas toucher la fenêtre,
   d'après leurs lignes DTSTART, DTEND, RRULE et RECURRENCE-ID ; le reste du texte (les fuseaux) est gardé tel quel.
   Une série qui touche la fenêtre est gardée, et ses occurrences déplacées aussi quand elles ou leur date d'origine la
   touchent. Ce qui ne se lit pas ici est gardé : ical.js tranchera. */
const jourIcal = (ligne: string | undefined): number | null => {
  const m = ligne && ligne.match(/:(\d{4})(\d{2})(\d{2})/);
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null;
};
function garder(bloc: string, debutF: number, finF: number): boolean {
  const deplie = bloc.replace(/\r?\n[ \t]/g, '');            // les lignes repliées
  const prop = (nom: string) => deplie.match(new RegExp(`^${nom}[;:][^\\r\\n]*`, 'mi'))?.[0];
  const marge = 2 * JOUR;                                     // une date lue sans son fuseau peut glisser d'un jour
  const debut = jourIcal(prop('DTSTART'));
  if (debut == null) return true;
  const rrule = prop('RRULE');
  if (rrule || prop('RDATE')) {
    const u = rrule && rrule.match(/UNTIL=(\d{4})(\d{2})(\d{2})/);
    if (u && Date.UTC(+u[1], +u[2] - 1, +u[3]) < debutF - marge) return false;     // la série finit avant la fenêtre
    return debut <= finF + marge;                                                  // ... ou commence après
  }
  const fin = jourIcal(prop('DTEND')) ?? debut + 32 * JOUR;  // sans DTEND (une DURATION) : de la marge
  const touche = fin >= debutF - marge && debut <= finF + marge;
  const origine = jourIcal(prop('RECURRENCE-ID'));
  if (origine != null) return touche || (origine >= debutF - marge && origine <= finF + marge);
  if (!touche) return false;
  // un événement seul, annulé ou « disponible », ne compte pas (une occurrence déplacée, si : elle retire l'occurrence)
  return !/^STATUS:CANCELLED\s*$/mi.test(deplie) && !/^TRANSP:TRANSPARENT\s*$/mi.test(deplie);
}
export function prefiltrer(contenu: string, debutF: number, finF: number): string {
  const morceaux: string[] = [];
  const debutBloc = /\r?\nBEGIN:VEVENT\r?\n/g, finBloc = /\r?\nEND:VEVENT[ \t]*(?=\r?\n|$)/g;
  let curseur = 0;
  for (let m = debutBloc.exec(contenu); m; m = debutBloc.exec(contenu)) {
    finBloc.lastIndex = m.index + m[0].length;
    const f = finBloc.exec(contenu);
    if (!f) break;
    const finIndex = f.index + f[0].length;
    morceaux.push(contenu.slice(curseur, m.index));
    if (garder(contenu.slice(m.index, finIndex), debutF, finF)) morceaux.push(contenu.slice(m.index, finIndex));
    curseur = finIndex;
    debutBloc.lastIndex = finIndex;
  }
  morceaux.push(contenu.slice(curseur));
  return morceaux.join('');
}

/* Une série sans COUNT commencée des années avant la fenêtre se parcourt depuis un départ « aligné » juste avant elle :
   son début avancé d'un nombre entier de périodes (jours, semaines, mois ou années, fois INTERVAL), qui donne les mêmes
   occurrences sans parcourir des années d'occurrences (et leurs calculs de fuseau). null : depuis son vrai début. */
// deno-lint-ignore no-explicit-any
function departAligne(ev: any, exceptions: any[], debutF: number): any {
  const regles = ev.component.getAllProperties('rrule');
  if (regles.length !== 1 || ev.component.hasProperty('rdate')) return null;
  const r = regles[0].getFirstValue();
  if (r.count) return null;
  const d0 = ev.startDate, cible = debutF - 40 * JOUR;
  const t0 = Date.UTC(d0.year, d0.month - 1, d0.day);
  if (t0 > cible - 366 * JOUR) return null;                 // une série récente : rien à gagner
  const n = Math.max(1, r.interval || 1), c = new Date(cible);
  const depart = d0.clone();
  if (r.freq === 'DAILY' || r.freq === 'WEEKLY') {
    const pas = r.freq === 'DAILY' ? 1 : 7;
    const jours = Math.floor((cible - t0) / (pas * JOUR) / n) * n * pas;
    if (jours <= 0) return null;
    depart.adjust(jours, 0, 0, 0);
  } else if (r.freq === 'MONTHLY' || r.freq === 'YEARLY') {
    if (d0.day > 28) return null;                          // un 29, 30 ou 31 ne tombe pas chaque mois
    const ecart = (c.getUTCFullYear() - d0.year) * 12 + c.getUTCMonth() + 1 - d0.month - 1;
    const mois = r.freq === 'MONTHLY' ? Math.floor(ecart / n) * n : Math.floor(ecart / 12 / n) * n * 12;
    if (mois <= 0) return null;
    const total = d0.month - 1 + mois;
    depart.year = d0.year + Math.floor(total / 12);
    depart.month = total % 12 + 1;
  } else return null;
  // une occurrence d'avant le départ, déplacée jusque dans la fenêtre, ne serait plus vue : alors depuis le vrai début
  const tDepart = Date.UTC(depart.year, depart.month - 1, depart.day);
  for (const x of exceptions) {
    const rid = x.getFirstPropertyValue('recurrence-id'), dt = x.getFirstPropertyValue('dtstart');
    if (rid && dt && Date.UTC(rid.year, rid.month - 1, rid.day) < tDepart && Date.UTC(dt.year, dt.month - 1, dt.day) >= debutF - 31 * JOUR) return null;
  }
  return depart;
}

/* Le cœur : le texte d'un agenda iCal → ses indisponibilités dans la fenêtre (de J-30 à J+400 autour de maintenant).
   Rien d'autre que les heures : { periodes: [{uid, debut, fin, journee}], tronque }. Lève ErreurAgenda si le texte
   n'est pas un agenda. */
export function lireAgenda(contenu: string, maintenant = Date.now()): { periodes: Periode[]; tronque: boolean } {
  if (!/BEGIN:VCALENDAR/i.test(contenu)) throw new ErreurAgenda(PAS_ICAL);
  const debutF = maintenant - AVANT * JOUR, finF = maintenant + APRES * JOUR;
  // deno-lint-ignore no-explicit-any
  let jcal: any;
  try { jcal = ICAL.parse(prefiltrer(contenu.replace(/^\uFEFF/, ''), debutF, finF)); } catch (e) {
    throw new ErreurAgenda(`L’agenda est illisible (format iCal invalide : ${String((e as Error)?.message || e).slice(0, 90)}).`);
  }
  // deno-lint-ignore no-explicit-any
  const calendriers: any[] = (Array.isArray(jcal) && Array.isArray(jcal[0]) ? jcal : [jcal]).map((x: unknown) => new ICAL.Component(x as never));
  // les fuseaux définis par le flux, et seulement eux (ceux d'un autre agenda ne restent pas)
  ICAL.TimezoneService.reset();
  for (const cal of calendriers) {
    for (const vtz of cal.getAllSubcomponents('vtimezone')) {
      try { const tz = new ICAL.Timezone(vtz); if (tz.tzid && !ICAL.TimezoneService.has(tz.tzid)) ICAL.TimezoneService.register(tz, tz.tzid); } catch { /* fuseau illisible : le nom servira */ }
    }
  }
  // deno-lint-ignore no-explicit-any
  const groupes = new Map<string, { maitre: any; exceptions: any[] }>();
  for (const cal of calendriers) {
    for (const ve of cal.getAllSubcomponents('vevent')) {
      const dt = ve.getFirstProperty('dtstart');
      if (!dt) continue;
      const uid = String(ve.getFirstPropertyValue('uid') || `sans-uid-${dt.toICALString()}`).trim();
      let g = groupes.get(uid);
      if (!g) groupes.set(uid, g = { maitre: null, exceptions: [] });
      if (ve.hasProperty('recurrence-id')) g.exceptions.push(ve);
      else if (!g.maitre) g.maitre = ve;
    }
  }
  const sortie = new Map<string, Periode>();
  let tronque = false;
  // deno-lint-ignore no-explicit-any
  const ajouter = (uid: string, composant: any, debut: any, fin: any, nominal: any) => {
    if (!compte(composant)) return;
    const p = periode(debut, fin);
    if (!p || p.fin <= debutF || p.debut >= finF) return;
    const n = nominal || debut;
    const cle = `${uid}|${n.isDate ? ymd(n) : iso(instant(n))}`;
    if (sortie.has(cle)) return;
    if (sortie.size >= MAX_PERIODES) { tronque = true; return; }
    sortie.set(cle, { uid: cle, debut: iso(p.debut), fin: iso(p.fin), journee: p.journee });
  };
  for (const [uid, g] of groupes) {
    try {
      if (!g.maitre) {                       // des exceptions seules (une occurrence d'une série qu'on ne voit pas)
        for (const x of g.exceptions) {
          const ev = new ICAL.Event(x);
          ajouter(uid, x, ev.startDate, ev.endDate, ev.recurrenceId);
        }
        continue;
      }
      const ev = new ICAL.Event(g.maitre);
      for (const x of g.exceptions) { try { ev.relateException(x); } catch { /* exception étrangère à la série */ } }
      if (!ev.isRecurring()) { ajouter(uid, g.maitre, ev.startDate, ev.endDate, null); continue; }
      const it = ev.iterator(departAligne(ev, g.exceptions, debutF) || undefined);
      let pas = 0;
      // deno-lint-ignore no-explicit-any
      const deplacees = (ev as any).exceptions || {};
      const vues = new Set<string>();
      for (let t = it.next(); t; t = it.next()) {
        if (++pas > MAX_PAS) { tronque = true; break; }
        // la date « au mur » suffit à situer l'occurrence (à un jour près, d'où la marge) : pas de calcul de fuseau ici
        const tn = Date.UTC(t.year, t.month - 1, t.day, t.hour || 0, t.minute || 0);
        if (tn > finF + 31 * JOUR) break;    // au-delà de la fenêtre (une exception peut avancer une occurrence : de la marge)
        // loin avant la fenêtre : on avance sans détailler l'occurrence, sauf si elle a été déplacée
        const id = t.toString();
        if (deplacees[id]) vues.add(id);
        if (tn < debutF - 31 * JOUR && !deplacees[id]) continue;
        const det = ev.getOccurrenceDetails(t);
        ajouter(uid, det.item.component, det.startDate, det.endDate, det.recurrenceId);
      }
      // une occurrence déplacée que la série ne donne plus (la série a été raccourcie ou changée depuis) : Google Agenda
      // la montre toujours, la personne est donc prise ; elle compte telle quelle
      for (const x of g.exceptions) {
        const e2 = new ICAL.Event(x);
        if (e2.recurrenceId && !vues.has(e2.recurrenceId.toString())) ajouter(uid, x, e2.startDate, e2.endDate, e2.recurrenceId);
      }
    } catch (e) {
      console.warn('crescite-agenda : événement illisible', uid.slice(0, 40), String((e as Error)?.message || e).slice(0, 120));
    }
  }
  const periodes = [...sortie.values()].sort((a, b) => (a.debut < b.debut ? -1 : a.debut > b.debut ? 1 : 0));
  return { periodes, tronque };
}

// ================================================================================================ télécharger, prudemment
// les plages d'adresses privées, locales ou réservées (IPv4, IPv6)
export function ipPrivee(ip: string): boolean {
  let a = ip.toLowerCase().trim().replace(/^\[|\]$/g, '');
  const mappee = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mappee) a = mappee[1];
  const v4 = a.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [x, y, z] = [+v4[1], +v4[2], +v4[3]];
    return x === 0 || x === 10 || x === 127 || x >= 224
      || (x === 100 && y >= 64 && y <= 127)                 // partage d'opérateur (CGNAT)
      || (x === 169 && y === 254)                           // lien local (dont les métadonnées des nuages)
      || (x === 172 && y >= 16 && y <= 31) || (x === 192 && y === 168)
      || (x === 192 && y === 0 && (z === 0 || z === 2))     // IETF, documentation
      || (x === 198 && (y === 18 || y === 19))              // bancs d'essai
      || (x === 198 && y === 51 && z === 100) || (x === 203 && y === 0 && z === 113);
  }
  if (!a.includes(':')) return true;                        // ni IPv4 ni IPv6 : refusé par prudence
  if (a.startsWith('::') || /^64:ff9b:/.test(a) || /^2001:0?db8:/.test(a)) return true;   // ::, ::1, IPv4 cachées, NAT64, documentation
  const premier = parseInt(a.split(':')[0], 16) || 0;
  return (premier & 0xfe00) === 0xfc00 || (premier & 0xffc0) === 0xfe80 || (premier & 0xff00) === 0xff00;   // fc00::/7, fe80::/10, ff00::/8
}
// l'adresse elle-même : null si elle est acceptable, sinon la raison
export function adresseRefusee(u: URL): string | null {
  if (u.protocol !== 'https:') return 'Seules les adresses https:// (ou webcal://) sont lues.';
  if (u.username || u.password) return 'Une adresse avec identifiant et mot de passe n’est pas acceptée : utilisez le lien secret ou public de l’agenda.';
  if (u.port && u.port !== '443') return 'Cette adresse utilise un port inhabituel : elle n’est pas acceptée.';
  const h = u.hostname.toLowerCase().replace(/\.$/, '');
  if (!h) return 'Adresse incomplète.';
  if (h.startsWith('[') || /^\d+(\.\d+){3}$/.test(h)) return 'Une adresse IP n’est pas acceptée : il faut le nom de domaine de l’agenda.';
  if (h === 'localhost' || !h.includes('.') || /\.(localhost|local|localdomain|internal|intranet|lan|home|corp|arpa)$/.test(h)) {
    return 'Cette adresse est locale ou privée : elle n’est pas acceptée.';
  }
  return null;
}
// le nom de domaine ne doit pas mener à une adresse privée (quand le système sait le résoudre)
async function verifierNom(hote: string): Promise<void> {
  const resoudre = (Deno as unknown as { resolveDns?: (h: string, t: string) => Promise<string[]> }).resolveDns;
  if (typeof resoudre !== 'function') return;
  const ips: string[] = [];
  let introuvable = 0;
  for (const type of ['A', 'AAAA']) {
    try { ips.push(...await resoudre(hote, type)); } catch (e) {
      const nom = (e as Error)?.name || '';
      if (nom === 'NotFound') introuvable++;
      else return;                               // la résolution n'est pas permise ici : la vérification du nom suffit
    }
  }
  if (!ips.length && introuvable === 2) throw new ErreurAgenda('L’adresse est introuvable : ce nom de domaine n’existe pas. Vérifiez qu’elle est complète.');
  if (ips.some(ipPrivee)) throw new ErreurAgenda('Cette adresse mène à un réseau privé : elle n’est pas acceptée.');
}
const MESSAGES_HTTP: Record<number, string> = {
  401: 'L’agenda demande un mot de passe : il faut son adresse secrète (Google : « Adresse secrète au format iCal ») ou un lien public.',
  403: 'L’agenda refuse la lecture : il faut son adresse secrète (Google : « Adresse secrète au format iCal ») ou un lien public.',
  404: 'L’adresse ne répond plus (404) : l’agenda a peut-être été supprimé, ou son adresse secrète a changé. Recopiez-la.',
  410: 'L’adresse ne répond plus (410) : l’agenda a été supprimé, ou son adresse secrète a changé. Recopiez-la.',
  429: 'L’agenda demande d’attendre (trop de lectures) : la prochaine lecture réessaiera.',
};
const messageHttp = (s: number) => MESSAGES_HTTP[s] || (s >= 500 ? `Le service de l’agenda est en panne pour le moment (erreur ${s}) : la prochaine lecture réessaiera.` : `L’agenda a répondu par une erreur (${s}).`);

/* Télécharge un agenda : https seulement, chaque adresse vérifiée (redirections comprises), 15 s et 5 Mo au plus.
   f : la fonction fetch (les essais en donnent une autre). Lève ErreurAgenda avec une phrase claire. */
export async function telecharger(adresse: string, f: typeof fetch = fetch): Promise<string> {
  let u: URL;
  try { u = new URL(String(adresse).trim().replace(/^webcals?:\/\//i, 'https://')); } catch { throw new ErreurAgenda('Adresse d’agenda invalide.'); }
  for (let saut = 0; ; saut++) {
    const refus = adresseRefusee(u);
    if (refus) throw new ErreurAgenda(refus);
    await verifierNom(u.hostname);
    const ctrl = new AbortController();
    const minuteur = setTimeout(() => ctrl.abort(), DELAI);
    try {
      let r: Response;
      try {
        r = await f(u.href, { redirect: 'manual', signal: ctrl.signal,
          headers: { accept: 'text/calendar, text/plain;q=0.8, */*;q=0.5', 'user-agent': 'Crescite-agenda/1.0 (+https://adrienvada.fr/Crescite)' } });
      } catch (e) {
        if (ctrl.signal.aborted) throw new ErreurAgenda('L’agenda n’a pas répondu en 15 secondes : la prochaine lecture réessaiera.');
        throw new ErreurAgenda(`L’agenda est injoignable (${String((e as Error)?.message || e).slice(0, 80)}).`);
      }
      if (r.status >= 300 && r.status < 400 && r.status !== 304) {
        const loc = r.headers.get('location');
        try { await r.body?.cancel(); } catch { /* rien */ }
        if (!loc) throw new ErreurAgenda(`L’agenda a répondu par une redirection sans adresse (${r.status}).`);
        if (saut >= REDIRECTIONS) throw new ErreurAgenda('L’agenda renvoie de redirection en redirection : il n’est pas lu.');
        u = new URL(loc, u);
        continue;
      }
      if (!r.ok) { try { await r.body?.cancel(); } catch { /* rien */ } throw new ErreurAgenda(messageHttp(r.status)); }
      const annonce = Number(r.headers.get('content-length') || 0);
      if (annonce > TAILLE) { try { await r.body?.cancel(); } catch { /* rien */ } throw new ErreurAgenda('L’agenda est trop gros (plus de 5 Mo) pour être lu.'); }
      const morceaux: Uint8Array[] = [];
      let total = 0;
      if (r.body) {
        const lecteur = r.body.getReader();
        try {
          for (;;) {
            const { done, value } = await lecteur.read();
            if (done) break;
            total += value.byteLength;
            if (total > TAILLE) { ctrl.abort(); throw new ErreurAgenda('L’agenda est trop gros (plus de 5 Mo) pour être lu.'); }
            morceaux.push(value);
          }
        } catch (e) {
          if (e instanceof ErreurAgenda) throw e;
          if (ctrl.signal.aborted) throw new ErreurAgenda('L’agenda n’a pas répondu en 15 secondes : la prochaine lecture réessaiera.');
          throw new ErreurAgenda(`La lecture de l’agenda a été interrompue (${String((e as Error)?.message || e).slice(0, 80)}).`);
        }
      }
      const tout = new Uint8Array(total);
      let i = 0;
      for (const m of morceaux) { tout.set(m, i); i += m.byteLength; }
      return new TextDecoder('utf-8').decode(tout);
    } finally {
      clearTimeout(minuteur);
    }
  }
}

// ================================================================================================ la base
async function secret(cle: string): Promise<string | null> {
  const r = await sql`select valeur from public.crescite_secrets where cle = ${cle}`;
  return r[0]?.valeur ?? null;
}

// écrit les indisponibilités d'un agenda, retire celles qui ont disparu dans la fenêtre, note la lecture
async function ecrire(agenda: Agenda, periodes: Periode[], maintenant: number, tronque: boolean) {
  // du texte JSON, que la base lit comme du texte avant d'en faire du jsonb : un paramètre vu comme jsonb serait encodé
  // une seconde fois par postgres.js (une chaîne, et non plus une liste)
  const lignes = JSON.stringify(periodes);
  const uids = JSON.stringify(periodes.map(p => p.uid));
  const debutF = iso(maintenant - AVANT * JOUR), finF = iso(maintenant + APRES * JOUR);
  const note = tronque ? `Agenda très chargé : seuls les ${MAX_PERIODES.toLocaleString('fr-FR')} premiers événements de la période sont lus.` : null;
  await sql.begin(async (tx) => {
    if (periodes.length) {
      await tx`insert into public.crescite_indisponibilites (personne_id, debut, fin, journee, source, agenda_id, uid, maj_le)
               select ${agenda.personne_id}::bigint, x.debut, x.fin, x.journee, 'agenda', ${agenda.id}::bigint, x.uid, now()
               from jsonb_to_recordset(${lignes}::text::jsonb) as x(uid text, debut timestamptz, fin timestamptz, journee boolean)
               on conflict (agenda_id, uid) do update set debut = excluded.debut, fin = excluded.fin, journee = excluded.journee, maj_le = now()
               where (crescite_indisponibilites.debut, crescite_indisponibilites.fin, crescite_indisponibilites.journee)
                     is distinct from (excluded.debut, excluded.fin, excluded.journee)`;
    }
    await tx`delete from public.crescite_indisponibilites
             where agenda_id = ${agenda.id}::bigint and source = 'agenda' and debut < ${finF}::timestamptz and fin > ${debutF}::timestamptz
               and uid not in (select jsonb_array_elements_text(${uids}::text::jsonb))`;
    await tx`update public.crescite_agendas_lies set derniere_synchro = now(), erreur = ${note}, nb_evenements = ${periodes.length}
             where id = ${agenda.id}::bigint`;
  });
}

// lit un agenda et range ce qu'il donne ; une erreur est notée (en clair) et ne retire rien
export async function synchroniser(agenda: Agenda, f: typeof fetch = fetch, maintenant = Date.now()): Promise<{ id: string | number; nb_evenements?: number; erreur: string | null }> {
  try {
    const contenu = await telecharger(agenda.url, f);
    const t = performance.now();
    const { periodes, tronque } = lireAgenda(contenu, maintenant);
    calcul += performance.now() - t;
    await ecrire(agenda, periodes, maintenant, tronque);
    return { id: agenda.id, nb_evenements: periodes.length, erreur: null };
  } catch (e) {
    const message = e instanceof ErreurAgenda ? e.message : `La lecture a échoué (${String((e as Error)?.message || e).slice(0, 120)}).`;
    if (!(e instanceof ErreurAgenda)) console.error('crescite-agenda', agenda.id, e);
    await sql`update public.crescite_agendas_lies set erreur = ${message} where id = ${agenda.id}`;
    return { id: agenda.id, erreur: message };
  }
}

// le passage horaire : les agendas actifs, les moins récemment lus d'abord
async function synchroTout() {
  const debut = Date.now();
  calcul = 0;
  const agendas = await sql`select id, personne_id, url from public.crescite_agendas_lies where actif
                            order by derniere_synchro asc nulls first, id limit ${LOT}` as unknown as Agenda[];
  let i = 0, erreurs = 0, lus = 0;
  const ouvrier = async () => {
    while (i < agendas.length && Date.now() - debut < BUDGET && calcul < CALCUL) {
      const a = agendas[i++];
      const r = await synchroniser(a);
      lus++;
      if (r.erreur) erreurs++;
    }
  };
  await Promise.all(Array.from({ length: Math.min(ENSEMBLE, agendas.length) }, ouvrier));
  return { lus, erreurs };
}

// la personne qui appelle, d'après son jeton de connexion (vérifié par l'authentification de Supabase)
async function personneAppelante(req: Request): Promise<string | null> {
  const a = req.headers.get('authorization') || '';
  if (!/^Bearer\s+\S+$/i.test(a) || !SUPABASE_URL) return null;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: a, apikey: ANON || a.replace(/^Bearer\s+/i, '') } });
  if (!r.ok) return null;
  const u = await r.json().catch(() => null);
  if (!u?.id) return null;
  const [p] = await sql`select personne_id from public.crescite_personnes_privees where user_id = ${u.id}`;
  return p ? String(p.personne_id) : null;
}
async function etatAgenda(id: string | number) {
  const [x] = await sql`select id, actif, derniere_synchro, nb_evenements, erreur from public.crescite_agendas_lies where id = ${id}`;
  return x || null;
}
async function synchroPersonne(req: Request, agendaId: unknown) {
  const personne = await personneAppelante(req);
  if (!personne) return json({ erreur: 'Connectez-vous de nouveau pour relire votre agenda.' }, 401);
  const id = Number(agendaId);
  if (!Number.isSafeInteger(id) || id <= 0) return json({ erreur: 'Agenda inconnu.' }, 400);
  const [a] = await sql`select id, personne_id, url, actif, derniere_synchro, erreur from public.crescite_agendas_lies where id = ${id}`;
  if (!a || String(a.personne_id) !== personne) return json({ erreur: 'Cet agenda n’est pas le vôtre.' }, 403);
  if (!a.actif) return json({ agenda: await etatAgenda(id) });
  // une lecture réussie il y a moins de 20 secondes n'est pas refaite (après une erreur, on relit tout de suite)
  const recente = !a.erreur && a.derniere_synchro && Date.now() - new Date(a.derniere_synchro).getTime() < RECENTE;
  if (!recente) await synchroniser(a as unknown as Agenda);
  return json({ agenda: await etatAgenda(id) });
}

// ================================================================================================ le flux des dates Crescite
const FUSEAU = ['BEGIN:VTIMEZONE', 'TZID:Europe/Paris', 'X-LIC-LOCATION:Europe/Paris',
  'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
  'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
  'END:VTIMEZONE'];
const texteIcs = (s: unknown) => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
// une ligne de plus de 75 octets se plie (RFC 5545, 3.1), sans couper un caractère
function plier(ligne: string): string {
  const enc = new TextEncoder();
  if (enc.encode(ligne).length <= 75) return ligne;
  const morceaux: string[] = [];
  let cur = '', n = 0, max = 75;
  for (const c of ligne) {
    const k = enc.encode(c).length;
    if (n + k > max) { morceaux.push(cur); cur = ''; n = 0; max = 74; }
    cur += c; n += k;
  }
  morceaux.push(cur);
  return morceaux.join('\r\n ');
}
const deux = (n: number) => String(n).padStart(2, '0');
const lendemain = (j: string) => new Date(Date.UTC(+j.slice(0, 4), +j.slice(5, 7) - 1, +j.slice(8, 10) + 1)).toISOString().slice(0, 10);
const minutesDe = (h: string) => +h.slice(0, 2) * 60 + +h.slice(3, 5);
function plusMinutes(jour: string, heure: string, n: number): string {
  let t = minutesDe(heure) + n, j = jour;
  while (t >= 1440) { t -= 1440; j = lendemain(j); }
  return `${j.replace(/-/g, '')}T${deux(Math.floor(t / 60))}${deux(t % 60)}00`;
}
function dureeMinutes(t: unknown): number {
  const s = String(t || '').toLowerCase();
  let m = s.match(/(\d+)\s*h\s*(\d{1,2})?/);
  if (m) return +m[1] * 60 + (+m[2] || 0);
  m = s.match(/(\d+)\s*min/);
  return m ? +m[1] : 0;
}
const heureTexte = (h: string) => { const [hh, mm] = h.split(':'); return `${+hh}h${mm !== '00' ? mm : ''}`; };
const NATURES: Record<string, string> = { repetitions: 'répétition', residence: 'résidence', autre: 'rendez-vous' };
const PUBLICS: Record<string, string> = { scolaire: 'représentation scolaire', tout_public: 'représentation tout public', mixte: 'représentation', autre: 'représentation' };
function quoiSeance(n: number, pub: string, nature: string): string {
  if (nature === 'repetitions') return n > 1 ? `${n} répétitions` : 'répétition';
  if (nature === 'residence') return n > 1 ? `${n} journées de résidence` : 'résidence';
  if (nature === 'autre') return n > 1 ? `${n} rendez-vous` : 'rendez-vous';
  if (n > 1) return `${n} représentations${pub === 'scolaire' ? ' scolaires' : pub === 'tout_public' ? ' tout public' : ''}`;
  return PUBLICS[pub] || 'représentation';
}
type Seance = { id: number | string; jour: string; heure: string | null; fin: string | null; public: string; annulee: boolean; note: string | null };
type DateFlux = {
  id: number | string; debut: string; fin: string | null; precision: string; statut: string; nature: string | null; public: string | null;
  details: { texte?: string }[] | null; titre: string; slug: string; duree: string | null;
  lieu_nom: string | null; adresse: string | null; commune: string | null; departement: string | null;
  seances: Seance[];
};

/* Le flux iCalendar des dates d'une personne (pur : les essais l'appellent directement). personne = {prenom} ;
   dates : comme la requête de flux() les donne ; maintenant : pour DTSTAMP. */
export function composerFlux(personne: { prenom?: string | null }, dates: DateFlux[], maintenant = new Date()): string {
  const stamp = maintenant.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Compagnie Crescite//Dates de l equipe//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${texteIcs(`Crescite${personne?.prenom ? ` · ${personne.prenom}` : ''}`)}`,
    `X-WR-CALDESC:${texteIcs('Vos dates avec la compagnie Crescite : représentations, répétitions, résidences. Mis à jour automatiquement.')}`,
    'X-WR-TIMEZONE:Europe/Paris', 'X-PUBLISHED-TTL:PT1H', 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', ...FUSEAU];
  for (const d of dates) {
    if (d.precision === 'mois' || d.precision === 'saison') continue;      // pas de jour précis : rien à mettre dans un agenda
    const nature = d.nature || 'representations', option = d.statut === 'option';
    const duree = dureeMinutes(d.duree) || 90;
    const ou = d.lieu_nom || d.commune ? [d.lieu_nom, d.adresse, d.commune ? `${d.commune}${d.departement ? ` (${d.departement})` : ''}` : null].filter(Boolean).join(', ') : '';
    const page = `${SITE}/equipe/#/date/${d.id}`;
    const precisions = (Array.isArray(d.details) ? d.details : []).map(x => x && x.texte).filter(Boolean) as string[];
    const seances = (d.seances || []).filter(s => !s.annulee);
    if ((d.seances || []).length && !seances.length) continue;             // toutes les séances annulées
    const evenements: { uid: string; debut: string; fin: string; date: boolean; quoi: string; detail: string; note?: string | null }[] = [];
    if (!seances.length) {
      evenements.push({ uid: `crescite-date-${d.id}`, debut: d.debut, fin: lendemain(d.fin || d.debut), date: true,
        quoi: nature !== 'representations' ? NATURES[nature] || '' : d.public === 'scolaire' ? 'représentations scolaires' : '', detail: 'Horaires pas encore indiqués' });
    } else {
      const journees = new Map<string, { s: Seance; n: number }>();
      for (const s of seances) {
        const h = s.heure ? s.heure.slice(0, 5) : '';
        if (h) {
          const fin = s.fin ? s.fin.slice(0, 5) : '';
          const finTexte = fin ? plusMinutes(s.jour, fin, minutesDe(fin) <= minutesDe(h) ? 1440 : 0) : plusMinutes(s.jour, h, duree);
          const quoi = quoiSeance(1, s.public, nature);
          evenements.push({ uid: `crescite-representation-${s.id}`, debut: plusMinutes(s.jour, h, 0), fin: finTexte, date: false, quoi,
            detail: `${quoi[0].toUpperCase()}${quoi.slice(1)}, ${fin ? `de ${heureTexte(h)} à ${heureTexte(fin)}` : `à ${heureTexte(h)}`}`, note: s.note });
          continue;
        }
        const k = `${s.jour}|${s.public}`;
        const x = journees.get(k);
        if (x) x.n++; else journees.set(k, { s, n: 1 });
      }
      for (const { s, n } of journees.values()) {
        const quoi = quoiSeance(n, s.public, nature);
        evenements.push({ uid: `crescite-representation-${s.id}`, debut: s.jour, fin: lendemain(s.jour), date: true, quoi,
          detail: `${quoi[0].toUpperCase()}${quoi.slice(1)}, ${n > 1 ? 'heures à préciser' : 'heure à préciser'}`, note: s.note });
      }
    }
    for (const e of evenements) {
      L.push('BEGIN:VEVENT', `UID:${e.uid}@crescite.fr`, `DTSTAMP:${stamp}`);
      if (e.date) L.push(`DTSTART;VALUE=DATE:${e.debut.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${e.fin.replace(/-/g, '')}`);
      else L.push(`DTSTART;TZID=Europe/Paris:${e.debut}`, `DTEND;TZID=Europe/Paris:${e.fin}`);
      L.push(`SUMMARY:${texteIcs(`${option ? 'Option · ' : ''}${d.titre}${e.quoi ? ` — ${e.quoi}` : ''}`)}`);
      // le lieu par son nom, son adresse et sa commune ; jamais de GEO : les coordonnées des lieux ne sont que le centre de
      // leur commune (bonnes pour la carte et les distances, pas pour s'y rendre)
      if (ou) L.push(`LOCATION:${texteIcs(ou)}`);
      const desc = [`${d.titre}${option ? ' (option, pas encore confirmée)' : ''}`, e.detail, e.note, ...precisions, ou,
        nature === 'representations' && d.duree ? `Durée du spectacle : ${String(d.duree).replace(/^durée\s*:\s*/i, '')}` : null,
        `La feuille de route, l’équipe et les documents : ${page}`].filter(Boolean).join('\n');
      L.push(`DESCRIPTION:${texteIcs(desc)}`, `STATUS:${option ? 'TENTATIVE' : 'CONFIRMED'}`, `URL:${page}`, 'TRANSP:OPAQUE', 'END:VEVENT');
    }
  }
  L.push('END:VCALENDAR');
  return L.map(plier).join('\r\n') + '\r\n';
}

async function flux(jeton: string, tete: boolean): Promise<Response> {
  if (!/^[a-z0-9]{32,128}$/i.test(jeton)) return texte('Lien d’agenda inconnu.', 404);
  const [p] = await sql`select v.personne_id, pe.prenom from public.crescite_personnes_privees v
                        join public.crescite_personnes pe on pe.id = v.personne_id where v.agenda_jeton = ${jeton}`;
  if (!p) return texte('Ce lien d’agenda ne marche plus : sa clé a été changée. Reprenez le nouveau lien dans l’espace de l’équipe (Moi → Mes agendas).', 404);
  const moi = p.personne_id;
  const dates = await sql`
    select d.id, d.debut::text as debut, d.fin::text as fin, d.precision, d.statut, d.nature, d.public, d.details,
           s.titre, s.slug, s.duree, l.nom as lieu_nom, l.adresse, l.commune, l.departement,
           coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'jour', r.jour, 'heure', r.heure, 'fin', r.fin, 'public', r.public,
                                                         'annulee', r.annulee, 'note', r.note) order by r.jour, r.heure nulls last)
                     from public.crescite_representations r where r.date_id = d.id), '[]'::jsonb) as seances
    from public.crescite_dates d
    join public.crescite_spectacles s on s.id = d.spectacle_id
    left join public.crescite_lieux l on l.id = d.lieu_id
    where coalesce(d.fin, d.debut) >= current_date - 120 and d.statut not in ('annulee', 'reportee')
      and (exists (select 1 from public.crescite_equipes e where e.date_id = d.id and e.personne_id = ${moi} and e.present)
           or (exists (select 1 from public.crescite_distributions di where di.spectacle_id = d.spectacle_id and di.personne_id = ${moi} and di.en_tournee)
               and not exists (select 1 from public.crescite_equipes e where e.date_id = d.id and e.personne_id = ${moi} and not e.present)))
    order by d.debut, d.id`;
  const corps = composerFlux({ prenom: p.prenom }, dates as unknown as DateFlux[]);
  return new Response(tete ? null : corps, { headers: { ...CORS, 'Content-Type': 'text/calendar; charset=utf-8',
    'Cache-Control': 'private, max-age=900', 'Content-Disposition': 'inline; filename="crescite.ics"' } });
}

// ================================================================================================ le service
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const url = new URL(req.url);
  try {
    if (req.method === 'GET' || req.method === 'HEAD') {
      const jeton = url.searchParams.get('flux');
      if (jeton != null) return await flux(jeton, req.method === 'HEAD');
      return json({ service: 'crescite-agenda', usage: 'GET ?flux=<clé> ; POST {synchro: true}' });
    }
    if (req.method !== 'POST') return json({ erreur: 'méthode' }, 405);
    const corps = await req.json().catch(() => null) as { synchro?: boolean; agenda_id?: unknown } | null;
    if (!corps || corps.synchro !== true) return json({ erreur: 'demande inconnue' }, 400);
    if (corps.agenda_id != null) return await synchroPersonne(req, corps.agenda_id);
    const jeton = await secret('jeton_push');
    if (!jeton || req.headers.get('x-crescite-jeton') !== jeton) return json({ erreur: 'refusé' }, 403);
    return json(await synchroTout());
  } catch (e) {
    console.error('crescite-agenda', e);
    return json({ erreur: 'erreur interne' }, 500);
  }
});
