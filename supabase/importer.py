"""Remplit la base de la compagnie (tables crescite_ du projet Supabase) à partir du dépôt.

    python3 supabase/importer.py --essai              ce qui serait écrit, sans rien écrire (détail dans maquettes/dist/)
    python3 supabase/importer.py                      écrit tout, si la base est vide
    python3 supabase/importer.py --photos             envoie aussi les photos (private/photos) dans le stockage
    python3 supabase/importer.py --admin <courriel>   donne les droits d'administration à un compte existant

Ce qu'il importe : les huit spectacles et ceux des saisons passées (contenu, univers, action culturelle), les lieux,
toutes les lignes d'agenda publiées sur crescite.fr depuis 2016 avec leurs représentations (jours et heures quand le
site les donne), les quatre ateliers du dossier scolaire de Bérénice, et les autres textes du site. Chaque ligne d'agenda
garde son texte d'origine (champ intitule), pour que le site reste mot pour mot celui d'aujourd'hui.

L'écriture passe par l'API du projet avec une clé de service (variable SUPABASE_CLE_SERVICE, ou ajoutée par le proxy de
la session de travail). La base ne doit être remplie qu'une fois : le script refuse si elle contient déjà des spectacles.
"""
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "maquettes"))
import build  # noqa: E402  (les données du site, telles que les maquettes les reçoivent)

URL = os.environ.get("SUPABASE_URL", "https://omekkqjinvppadsoinvj.supabase.co")
CLE = os.environ.get("SUPABASE_CLE_SERVICE")
MOIS = {m: i + 1 for i, m in enumerate(build.MOIS)}
MOIS.update({"janv": 1, "févr": 2, "fév": 2, "avr": 4, "juil": 7, "sept": 9, "oct": 10, "nov": 11, "déc": 12})
RE_MOIS = "|".join(sorted(MOIS, key=len, reverse=True))


# ---------------------------------------------------------------------------------------------------- l'API

class ErreurAPI(Exception):
    pass


def api(methode, chemin, corps=None, entetes=None):
    h = {"Content-Type": "application/json", "Accept": "application/json"}
    if CLE:
        h.update({"apikey": CLE, "Authorization": f"Bearer {CLE}"})
    h.update(entetes or {})
    data = corps if isinstance(corps, (bytes, type(None))) else json.dumps(corps).encode()
    req = urllib.request.Request(URL + chemin, data=data, method=methode, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            txt = r.read().decode()
            return json.loads(txt) if txt.strip() else None
    except urllib.error.HTTPError as e:
        raise ErreurAPI(f"{methode} {chemin} : {e.code} {e.read().decode()[:600]}")


# l'API veut les mêmes clés dans chaque ligne d'un envoi groupé : les absentes prennent la valeur par défaut de la table
DEFAUTS = {"fiche": [], "mentions": [], "production": [], "texte": [], "medias": [], "extraits": [], "affirmations": [],
           "citations": [], "photos": [], "titre_lignes": [], "details": [], "paragraphes": [], "etapes": [], "points": [],
           "univers": {}, "action_culturelle": {}, "programmer": {}, "en_tournee": False, "publie": True, "page": True}


def inserer(table, lignes, retour=True):
    cles = sorted({k for x in lignes for k in x})
    lignes = [{k: x.get(k, DEFAUTS.get(k)) for k in cles} for x in lignes]
    out = []
    for i in range(0, len(lignes), 200):
        r = api("POST", f"/rest/v1/{table}", lignes[i:i + 200], {"Prefer": "return=representation" if retour else "return=minimal"})
        out += r or []
    return out


# ---------------------------------------------------------------------------------------------------- lecture des lignes d'agenda

def heures(txt):
    """Les heures d'un texte : « 14h et 20h30 » → ['14:00', '20:30']."""
    return [f"{int(h):02d}:{int(m or 0):02d}" for h, m in re.findall(r"(?<![\d,.])(\d{1,2})\s*h\s*(\d{2})?(?![\d])", txt)
            if int(h) < 24]


def jours_de_ligne(ligne):
    """Les jours d'une ligne d'agenda qui n'est pas dans le relevé : (jours, debut, fin, precision, heures)."""
    partie = re.split(r"\s+[—:]\s+", ligne.replace("\xa0", " "), maxsplit=1)[0]
    hs = heures(partie.split(" à ", 1)[1]) if " à " in partie else []
    iso = lambda a, m, j: f"{int(a):04d}-{MOIS[m]:02d}-{int(j):02d}"
    m = re.match(rf"(\d{{1,2}})(?:er)?\s+({RE_MOIS})\.?\s*[–-]\s*(\d{{1,2}})(?:er)?\s+({RE_MOIS})\.?\s+(\d{{4}})", partie)
    if m:                                     # « 26 sept – 4 oct 2016 »
        return [], iso(m[5], m[2], m[1]), iso(m[5], m[4], m[3]), "periode", hs
    m = re.match(rf"(?:du\s+)?(\d{{1,2}})(?:er)?(?:\s+({RE_MOIS}))?\s+au\s+(\d{{1,2}})(?:er)?\s+({RE_MOIS})\s+(\d{{4}})", partie)
    if m:
        return [], iso(m[5], m[2] or m[4], m[1]), iso(m[5], m[4], m[3]), "periode", hs
    m = re.match(rf"(\d{{1,2}})(?:er)?-(\d{{1,2}})(?:er)?\s+({RE_MOIS})\s+(\d{{4}})", partie)
    if m:
        return [], iso(m[4], m[3], m[1]), iso(m[4], m[3], m[2]), "periode", hs
    m = re.match(rf"((?:\d{{1,2}}(?:er)?(?:\s*,\s*|\s+et\s+))+\d{{1,2}}(?:er)?)\s+({RE_MOIS})\s+(\d{{4}})", partie)
    if m:
        js = [iso(m[3], m[2], j) for j in re.findall(r"\d{1,2}", m[1])]
        return js, js[0], js[-1], "jour", hs
    m = re.match(rf"(\d{{1,2}})(?:er)?\s+({RE_MOIS})\s+(\d{{4}})", partie)
    if m:
        j = iso(m[3], m[2], m[1])
        return [j], j, j, "jour", hs
    m = re.match(rf"({RE_MOIS})\s+(\d{{4}})", partie)
    if m:
        return [], iso(m[2], m[1], 1), None, "mois", hs
    return [], None, None, "saison", hs


def seances(jours, texte, heure, nb, public):
    """Les représentations d'une ligne : [(jour, heure, public)]. Les heures viennent du texte de la ligne et de ses
    précisions (« 29 janvier à 10h et 30 janvier à 18h », « 14h et 20h : … »), sinon de l'heure du relevé."""
    if not jours:
        return []
    par_jour = {}
    for m in re.finditer(rf"(\d{{1,2}})(?:er)?\s+({RE_MOIS})(?:\s+\d{{4}})?\s+(?:à|:)\s*((?:\d{{1,2}}\s*h\s*(?:\d{{2}})?(?:\s*(?:et|,)\s*)?)+)", texte):
        for d in jours:
            if int(d[8:10]) == int(m[1]) and int(d[5:7]) == MOIS[m[2]]:
                par_jour.setdefault(d, []).extend(heures(m[3]))
    # « le 12 octobre en scolaire » : ce jour-là est scolaire, les autres tout public
    en_scolaire = {d for m in re.finditer(rf"(\d{{1,2}})(?:er)?\s+({RE_MOIS})\s+en\s+scolaire", texte) for d in jours
                   if int(d[8:10]) == int(m[1]) and int(d[5:7]) == MOIS[m[2]]}
    if en_scolaire:
        pub = lambda d, i: "scolaire" if d in en_scolaire else "tout_public"
    else:
        # « (1 scolaire et 1 Tout Public) » : les premières séances scolaires, les suivantes tout public
        m = re.search(r"(\d)\s+scolaires?\s+et\s+(\d)\s+tout\s+public", texte, re.I)
        pub = (lambda d, i: "scolaire" if i < int(m[1]) else "tout_public") if m else (lambda d, i: public)
    if par_jour:
        out = [(d, h) for d in jours for h in (par_jour.get(d) or [None])]
        return [(d, h, pub(d, i)) for i, (d, h) in enumerate(out)]
    hs = heures(texte) or ([heure[:5]] if heure else [])
    if len(jours) == 1:
        n = max(len(hs), nb or 1)
        return [(jours[0], hs[i] if i < len(hs) else None, pub(jours[0], i)) for i in range(n)]
    par = max(1, (nb or len(jours)) // len(jours))
    reste = max(0, (nb or 0) - par * len(jours))
    out = []
    for i, d in enumerate(jours):
        k = par + (1 if i < reste else 0)
        for x in range(k):
            out.append((d, hs[0] if len(hs) == 1 else (hs[x] if len(hs) == k else None), pub(d, len(out))))
    return out


def type_de_lieu(nom):
    n = (nom or "").lower()
    if re.search(r"coll[eè]ge|lyc[ée]e|[ée]cole|institut|maison familiale|mfr|universit|conservatoire", n):
        return "etablissement"
    if "festival" in n:
        return "festival"
    return "salle"


# ---------------------------------------------------------------------------------------------------- les lignes à écrire

def preparer():
    D, fichiers = build.build_data()
    rows = json.loads((ROOT / "data" / "representations-site-2016-2027.json").read_text(encoding="utf-8"))
    mp = json.loads((ROOT / "prototype" / "src" / "map.json").read_text(encoding="utf-8"))
    base = {(r["saison"], build._norm(r["intitule_original"])): r for r in rows}
    places = {(build._norm(p["c"]), p["dep"]): p for p in mp["places"]}
    en_plus = {(build._norm(k.split("|")[0]), k.split("|")[1]): v for k, v in build.COMMUNES_EN_PLUS.items()}

    # ---- les spectacles : les huit du site, puis ceux qui ne vivent plus que dans les saisons passées
    spectacles = []
    for i, s in enumerate(D["shows"]):
        spectacles.append({
            "slug": s["slug"], "ordre": (i + 1) * 10, "publie": True, "page": True, "titre": s["titre"],
            "titre_lignes": s["titreLignes"], "sous_titre": s["sousTitre"], "creation": s["creation"], "statut": s["statut"],
            "genre": s.get("genre"), "en_tournee": s["enTournee"], "duree": s["duree"], "fiche": s["fiche"], "avec": s["avec"],
            "mentions": s["mentions"], "production": s["production"], "texte": s["texte"], "credit": s["credit"],
            "medias": s["medias"], "tournee": s["tournee"], "source": s["source"], "cadre": s.get("cadre"),
            "extraits": s.get("extraits") or [], "univers": s["univers"], "lieu_temps": s["lieuTemps"], "accroche": s["accroche"],
            "affirmations": s["affirmations"], "citations": s["citations"], "video": s["video"], "photo": f"{s['slug']}.webp",
            "photos": [{k: v for k, v in dict(p, fichier=f"{p['cle']}.webp").items() if k != "cle"} for p in s["photos"]],
            "credit_photos": s["creditPhotos"], "credit_dossier": s["creditDossier"],
            "action_culturelle": s["actionCulturelle"], "programmer": s["programmer"],
            "dossier": f"dossier:{s['dossier']}" if s["dossier"] else None,
        })
    slugs = {s["slug"] for s in spectacles}
    anciens = {}
    for saison, S in D["saisons"].items():
        for g in S["spectacles"]:
            if g["slug"] in slugs:
                continue
            slug = None
            for dt in g["dates"]:
                r = base.get((saison, build._norm(dt["ligne"])))
                if r and r["spectacle_slug"] and r["spectacle_slug"] not in slugs:
                    slug = r["spectacle_slug"]
            slug = slug or re.sub(r"[^a-z0-9]+", "-", build._norm(g["titre"])).strip("-")
            if slug in anciens and anciens[slug]["titre"] != g["titre"]:
                slug = re.sub(r"[^a-z0-9]+", "-", build._norm(g["titre"])).strip("-")
            anciens.setdefault(slug, {"slug": slug, "ordre": 100 + len(anciens) * 10, "publie": True, "page": False,
                                      "titre": g["titre"], "titre_lignes": [g["titre"]], "sous_titre": g["sousTitre"],
                                      "creation": g["creation"]})
            g["_slug"] = slug
    spectacles += list(anciens.values())

    # ---- les lieux et les dates
    lieux, lindex = [], {}

    def lieu(nom, commune, dep, insee=None, lat=None, lon=None):
        nom = re.sub(r"\s*ANNULATION\s*$", "", nom or "").strip(" *") or None
        p = places.get((build._norm(commune), dep))
        commune = p["c"] if p else commune
        if lat is None:
            if p:
                lat, lon = p["lat"], p["lon"]
            elif (build._norm(commune), dep) in en_plus:
                lat, lon = en_plus[(build._norm(commune), dep)]
        k = (build._norm(nom or ""), build._norm(commune), dep)
        if k not in lindex:
            lindex[k] = len(lieux)
            lieux.append({"nom": nom, "type": type_de_lieu(nom), "commune": commune, "departement": dep, "code_insee": insee,
                          "pays": "FR", "latitude": lat, "longitude": lon})
        return lindex[k]

    dates = []
    for saison, S in D["saisons"].items():
        for g in S["spectacles"]:
            slug = g["slug"] if g["slug"] in slugs else g["_slug"]
            for dt in g["dates"]:
                r = base.get((saison, build._norm(dt["ligne"])))
                texte = " ".join([dt["ligne"]] + [x["texte"] for x in dt["details"]])
                if r:
                    li = lieu(r["lieu"], r["commune"], r["departement"], r["code_insee"], r["lat"], r["lon"])
                    jours, debut, fin = r["jours"], r["date_debut"], r["date_fin"]
                    precision = {"day": "jour", "range": "periode", "month": "mois"}[r["precision"]]
                    public = {"scolaire": "scolaire", "tout_public": "tout_public"}.get(r["type"], "autre")
                    heure, nb, annule = r["heure"], r["nb_representations"], r["annule"]
                else:
                    jours, debut, fin, precision, _ = jours_de_ligne(dt["ligne"])
                    l = dt["l"]
                    li = None
                    if l is not None:
                        c = D["carte"]["lieux"][l]
                        m = re.search(r"[—:]\s+(.+?),\s*[^,()]+\(\s*(?:\d{2,3}|2A|2B)\s*\)", dt["ligne"])
                        li = lieu(m[1] if m else None, c["c"], c["dep"])
                    public = "scolaire" if dt["scolaire"] else "tout_public"
                    heure, nb, annule = None, None, False
                if debut is None:                     # une ligne sans date : à la suite de la précédente du même spectacle
                    prec = next((x for x in reversed(dates) if x["_slug"] == slug and x["saison"] == saison), None)
                    debut = prec["debut"] if prec else f"{saison[:4]}-09-01"
                    fin, precision = debut, "periode"     # son texte d'origine (intitule) reste celui qu'on affiche
                public_reps = public if public in ("scolaire", "tout_public") else "autre"
                reps = seances(jours if precision == "jour" else [], texte, heure, nb, public_reps)
                if len({p for _, _, p in reps}) > 1:
                    public = "mixte"
                dates.append({
                    "_slug": slug, "_lieu": li, "debut": debut, "fin": fin, "precision": precision, "saison": saison,
                    "public": public, "statut": "annulee" if (annule or dt["etat"]) else "confirmee", "visible": True,
                    "intitule": dt["ligne"], "details": dt["details"], "lien": dt["lien"], "nb_representations": nb,
                    "source": f"crescite.fr, {S['titre']}",
                    "_reps": reps,
                })

    # ---- les ateliers du dossier scolaire de Bérénice
    dos = D["dossiers"]["berenice"]
    ateliers = [{"_slug": "berenice", "ordre": (i + 1) * 10, "publie": True, "titre": re.sub(r"<[^>]+>", "", a["titre"]),
                 "duree": (re.search(r"(\d+\s*h\d*)\s*$", a["titre"]) or [None, None])[1],
                 "obligatoire": "obligatoire" in a["titre"], "public": "À partir de la seconde",
                 "paragraphes": a.get("paragraphes", []), "etapes": a.get("etapes", []), "points": a.get("points", [])}
                for i, a in enumerate(dos["ateliers"]["liste"])]

    # ---- les autres textes du site (la navigation reste dans le code des maquettes)
    site = D["site"]
    textes = [{"cle": k, "valeur": site[k]} for k in ("nom", "diaporama", "donateurs", "compagnie", "actions", "ecole", "contact",
                                                       "coordonnees", "ecrire", "facebook", "partenaires", "liensLegaux", "legal")]
    textes.append({"cle": "dossier:berenice", "valeur": dict(dos, ateliers={"titre": dos["ateliers"]["titre"]})})
    return spectacles, lieux, dates, ateliers, textes, fichiers


def main():
    essai = "--essai" in sys.argv
    if "--admin" in sys.argv:
        courriel = sys.argv[sys.argv.index("--admin") + 1]
        users = api("GET", "/auth/v1/admin/users?per_page=200")["users"]
        u = next((u for u in users if u["email"] == courriel), None)
        if not u:
            raise SystemExit(f"aucun compte {courriel} dans le projet")
        api("POST", "/rest/v1/crescite_admins", {"user_id": u["id"], "nom": courriel},
            {"Prefer": "resolution=ignore-duplicates,return=minimal"})
        print(f"{courriel} administre désormais le site de la compagnie")
        return

    spectacles, lieux, dates, ateliers, textes, fichiers = preparer()
    nreps = sum(len(d["_reps"]) for d in dates)
    print(f"{len(spectacles)} spectacles, {len(lieux)} lieux, {len(dates)} dates, {nreps} représentations, "
          f"{len(ateliers)} ateliers, {len(textes)} textes, {sum(1 for f, _ in fichiers.values() if f)} photos")
    if essai:
        out = ROOT / "maquettes" / "dist" / "import-base.json"      # hors du dépôt (dist/ n'est pas versionné)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps({"spectacles": spectacles, "lieux": lieux, "dates": dates, "ateliers": ateliers,
                                   "textes": textes}, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"essai : rien n'est écrit ; détail dans {out.relative_to(ROOT)}")
        return

    deja = api("GET", "/rest/v1/crescite_spectacles?select=id&limit=1")
    if deja:
        raise SystemExit("la base contient déjà des spectacles : import refusé (il écraserait le travail fait depuis)")
    ids_sp = {r["slug"]: r["id"] for r in inserer("crescite_spectacles", spectacles)}
    ids_li = [r["id"] for r in inserer("crescite_lieux", lieux)]
    lignes = [{k: v for k, v in d.items() if not k.startswith("_")} | {"spectacle_id": ids_sp[d["_slug"]],
              "lieu_id": ids_li[d["_lieu"]] if d["_lieu"] is not None else None} for d in dates]
    ids_da = [r["id"] for r in inserer("crescite_dates", lignes)]
    reps = [{"date_id": ids_da[i], "jour": j, "heure": h, "public": p} for i, d in enumerate(dates) for j, h, p in d["_reps"]]
    inserer("crescite_representations", reps, retour=False)
    # la saison et les bornes d'origine priment : les déclencheurs ont pu les recalculer d'après les représentations
    inserer("crescite_ateliers", [{k: v for k, v in a.items() if k != "_slug"} | {"spectacle_id": ids_sp[a["_slug"]]} for a in ateliers], retour=False)
    api("POST", "/rest/v1/crescite_textes", textes, {"Prefer": "resolution=merge-duplicates,return=minimal"})
    print("base remplie")
    if "--photos" in sys.argv:
        for k, (f, _) in fichiers.items():
            if f:
                api("POST", f"/storage/v1/object/crescite/{k}.webp", f.read_bytes(),
                    {"Content-Type": "image/webp", "x-upsert": "true", "Cache-Control": "max-age=3600"})
        print("photos envoyées dans le stockage « crescite »")


if __name__ == "__main__":
    try:
        main()
    except ErreurAPI as e:
        raise SystemExit(str(e))
