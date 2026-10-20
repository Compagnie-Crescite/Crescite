#!/usr/bin/env python3
"""Assemble les dix maquettes de la partie publique, la synthèse, et la planche qui les présente par onglets.

Chaque maquette est un fichier maquettes/src/mNN.html qui lit ses contenus dans l'objet D : le texte exact de
crescite.fr (D.site, D.shows, D.dates, D.saisons), le logo, les photos et la carte des tournées. Le script remplace
/*__DATA__*/null par ces données et ajoute juste après les outils communs : la carte des tournées
(maquettes/src/carte.js) et l'ouverture sur le logo (maquettes/src/intro.js).

Usage :
  python3 maquettes/build.py              toutes les maquettes et la planche (maquettes/dist/)
  python3 maquettes/build.py m03          une seule maquette : maquettes/dist/m03.html
  python3 maquettes/build.py --captures   les maquettes, leurs captures (Playwright, maquettes/dist/shots/) et la planche
  python3 maquettes/build.py --pages      en plus, le site GitHub Pages dans docs/ (planche en index, une page par maquette)

Les fichiers privés (logo 2.0, photos) sont lus dans private/ ; sans eux, des substituts neutres.
"""
import base64
import importlib.util
import json
import re
import sys
from datetime import date
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "maquettes" / "src"
DIST = ROOT / "maquettes" / "dist"
PRIVATE = ROOT / "private"

_spec = importlib.util.spec_from_file_location("proto_build", ROOT / "prototype" / "build.py")
proto = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(proto)

MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
MOISC = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."]
JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
JOURSC = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."]


def _lum(hexcol):
    r, g, b = (int(hexcol[i:i + 2], 16) / 255 for i in (1, 3, 5))
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def contrast(a, b):
    la, lb = sorted((_lum(a), _lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def for_light(hexcol, bg="#ffffff", target=4.6):
    """Assombrit une couleur jusqu'à ce qu'elle se lise en texte sur fond clair."""
    r, g, b = (int(hexcol[i:i + 2], 16) for i in (1, 3, 5))
    col = hexcol
    while contrast(col, bg) < target and (r + g + b) > 0:
        r, g, b = int(r * 0.92), int(g * 0.92), int(b * 0.92)
        col = f"#{r:02x}{g:02x}{b:02x}"
    return col


def logo_variants():
    path = PRIVATE / "brand" / "crescite-logo-2.0.svg"
    if path.exists():
        s = path.read_text(encoding="utf-8")
    else:
        s, _ = proto.fallback_logo_and_arms()
    paths = {k: v for k, v in re.findall(r'<path id="([^"]+)"([^>]*)/>', s)}
    def d_of(k):
        m = re.search(r'd="([^"]+)"', paths.get(k, ""))
        return m.group(1) if m else ""
    octo = "".join(f'<path d="{d_of(k)}"/>' for k in ("tentacles-left", "head-left", "head-right", "tentacles-right"))
    word = d_of("wordmark")
    blob = d_of("blob")
    svg = lambda vb, body, label: (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-label="{label}">{body}</svg>')
    return {
        # les tracés de la pieuvre seule (coordonnées du dessin 1536 px), pour les maquettes qui la dessinent elles-mêmes
        "octopusPaths": [d_of(k) for k in ("tentacles-left", "head-left", "head-right", "tentacles-right")],
        # le mot « crescite » et la tache magenta, seuls (pour l'ouverture, qui les anime séparément)
        "motPath": word, "tachePath": blob,
        # la pieuvre seule, couleur du texte (CSS color)
        "octopus": svg("250 340 1042 576", f'<g fill="currentColor" fill-rule="evenodd">{octo}</g>', "Crescite"),
        # la pieuvre et le mot « crescite », couleur du texte
        "octopusWord": svg("250 340 1042 780", f'<g fill="currentColor" fill-rule="evenodd">{octo}<path d="{word}"/></g>', "Crescite"),
        # le logo complet : la tache magenta, la pieuvre blanche, le mot
        "full": svg("63 65 1408 1405", f'<path fill="#BC3E80" d="{blob}"/><g fill="#fff" fill-rule="evenodd">{octo}<path d="{word}"/></g>', "Crescite"),
        # la marque : tache magenta et pieuvre blanche, sans le mot (favicon, petit format)
        "mark": svg("63 65 1408 1405", f'<path fill="#BC3E80" d="{blob}"/><g fill="#fff" fill-rule="evenodd">{octo}</g>', "Crescite"),
    }


def arms_data():
    """Le tracé des huit bras (privé) ; sans lui, celui de la pieuvre de substitution."""
    f = PRIVATE / "brand" / "crescite-logo-2.0-arms.json"
    if f.exists() and (PRIVATE / "brand" / "crescite-logo-2.0.svg").exists():
        a = json.loads(f.read_text(encoding="utf-8"))
        a.pop("_note", None)
    else:
        _, a = proto.fallback_logo_and_arms()
    a["armOf"] = proto.ARM_OF
    return a


def photo_files(shows):
    """Les photos (privées) : celle de chaque spectacle et de la page Actions culturelles (clé = slug), puis celles de
    l'univers de chaque spectacle (clé = slug/id, private/photos/<slug>/<id>.webp). Valeur : le fichier, ou None."""
    out = {}
    for slug, titre in [(s["slug"], s["titre"]) for s in shows] + [("actions-culturelles", "Actions culturelles")]:
        f = PRIVATE / "photos" / f"{slug}.webp"
        out[slug] = (f if f.exists() else None, titre)
    for s in shows:
        for p in s["photos"]:
            f = PRIVATE / "photos" / f"{p['cle']}.webp"
            out[p["cle"]] = (f if f.exists() else None, s["titre"])
    for i in range(1, 5):
        f = PRIVATE / "photos" / "actions-culturelles" / f"g-{i}.webp"
        out[f"actions-culturelles/g-{i}"] = (f if f.exists() else None, "Actions culturelles")
    return out


def photos(files, base=None):
    """En fichier : chaque photo en data URL (la maquette se lit seule). En ligne (base) : l'adresse de la photo publiée
    à côté des pages, pour ne pas la recopier dans chacune. Sans la photo : un substitut neutre."""
    out = {}
    for k, (f, titre) in files.items():
        if f is None:
            out[k] = proto.placeholder_photo(titre)
        elif base is not None:
            out[k] = f"{base}{k}.webp"
        else:
            out[k] = "data:image/webp;base64," + base64.b64encode(f.read_bytes()).decode()
    return out


# Les maquettes reprennent le texte exact de crescite.fr (data/site-crescite.json, relevé par data/site_crescite.py),
# plus Cassandres, création 2027 (data/cassandres.json), le dossier scolaire de Bérénice (data/berenice-dossier.json)
# et l'univers et l'action culturelle de chaque spectacle (data/univers-spectacles.json). Rien d'autre n'est écrit
# pour elles, hormis les quelques libellés de navigation de D.site.libelles ; la carte des tournées est tracée à
# partir des dates que le site publie.
ORDRE = ["cassandres", "cleophene", "ci-gisait-cyrano", "la-folle-idee", "berenice", "macbeth-fatum", "mon-royaume", "imaginaire-force"]

# Les communes des saisons anciennes absentes de la base des dates : coordonnées approchées, pour la carte seulement.
COMMUNES_EN_PLUS = {
    "Loiron|53": (48.067, -0.933), "Conches-en-Ouche|27": (48.958, 0.940), "Bellac|87": (46.122, 1.049),
    "Vitrolles|13": (43.460, 5.248), "Istres|13": (43.513, 4.988), "Grand-Quevilly|76": (49.409, 1.039),
    "Lunéville|54": (48.589, 6.496), "Cholet|49": (47.060, -0.879), "Hénin-Beaumont|62": (50.421, 2.951),
    "Mayenne|53": (48.303, -0.614), "Alençon|61": (48.432, 0.091), "Oissel|76": (49.342, 1.094),
    "Vernouillet|28": (48.721, 1.360), "Avignon|84": (43.949, 4.806), "Corbie|80": (49.909, 2.509),
    "Avranches|50": (48.684, -1.357), "Saint-Omer|62": (50.767, 2.265), "Gacé|61": (48.795, 0.296),
    "Pont-Audemer|27": (49.355, 0.515),
}

# Les trois entrées, la navigation première : le site se lit selon qui le visite. Chacune a sa page, et chaque page
# de spectacle se lit dans l'une des trois. L'espace pro à mot de passe disparaît : « Je souhaite programmer » le
# remplace, ouvert à tous ; les actions culturelles passent dans « Je représente un établissement scolaire ».
ENTREES = [
    {"cle": "voir", "texte": "Je viens voir un spectacle", "court": "Voir un spectacle", "href": "#/voir",
     "couleur": "#c2306f", "couleurVive": "#f07ab6"},
    {"cle": "programmer", "texte": "Je souhaite programmer", "court": "Programmer", "href": "#/programmer",
     "couleur": "#8a6410", "couleurVive": "#e8bc5c"},
    {"cle": "etablissement", "texte": "Je représente un établissement scolaire", "court": "Établissement scolaire",
     "href": "#/etablissement", "couleur": "#127a6a", "couleurVive": "#5fd0bd"},
]
# Le menu second : ce qui ne dépend pas de qui visite.
MENU = [
    {"id": "spectacles", "texte": "Spectacles", "href": "#/spectacles"},
    {"id": "compagnie", "texte": "La compagnie", "href": "#/compagnie"},
    {"id": "contact", "texte": "Contact", "href": "#/contact"},
]
# Les anciennes adresses, à rediriger : l'agenda vit dans « Je viens voir un spectacle ».
REDIRECTIONS = {"#/agenda": "#/voir", "#/espace-pro": "#/programmer", "#/actions-culturelles": "#/etablissement"}
# Les seuls libellés écrits pour les maquettes : la navigation et les intitulés de rubrique des trois entrées.
LIBELLES = {
    "enTournee": "EN TOURNÉE", "decouvrir": "découvrir", "actuellementEnTournee": "Actuellement en tournée",
    "menu": "Menu", "rechercher": "Rechercher …", "spectacles": "Spectacles", "saison": "Saison",
    "saisonsPrecedentes": "Saisons précédentes", "toutPublic": "Tout public", "scolaire": "Scolaire",
    "enEtablissement": "En établissement scolaire", "lieu": {"etablissement": "Dans l’établissement", "salle": "En salle"},
    "actionCulturelle": "Action culturelle", "aCompleter": "À compléter par la compagnie", "dispositifs": "Dispositifs",
    "public": "Public", "ateliers": "Ateliers", "duree": "Durée", "jauge": "Jauge", "format": "Format",
    "distribution": "Distribution", "representations": "Représentations", "lieuxDiffusion": "Lieux de diffusion",
    "ficheTechnique": "Fiche technique", "conditionsAccueil": "Conditions d’accueil", "bandeAnnonce": "Bande-annonce",
    "ecrire": "Écrire à la compagnie", "leSpectacle": "Le spectacle", "lesSpectacles": "Les spectacles",
    "ouverture": "Ouverture", "dates": "Dates", "photos": "Photos", "dossierScolaire": "Dossier scolaire",
    "modifierSite": "Modifier le site",
    # « Je souhaite programmer » : ce qu'il faut à un programmateur ou un directeur de salle
    "contactDiffusion": "Contact diffusion", "dossierPdf": "Dossier du spectacle (PDF)", "aTelecharger": "À télécharger",
    "conditionsFinancieres": "Conditions financières sur demande", "ficheTechniqueSurDemande": "Fiche technique sur demande",
    "documentsScolaires": "Documents pour les enseignants", "objetProgrammation": "Programmation",
}


def _norm(s):
    import unicodedata
    s = unicodedata.normalize("NFKD", (s or "").replace("’", "'").replace("\xa0", " "))
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def projection(places):
    """La projection de la carte : conique conforme de Lambert (parallèles 44° et 49°), recalée sur les communes connues."""
    import math
    f1, f2, f0 = map(math.radians, (44, 49, 46.5))
    n = math.log(math.cos(f1) / math.cos(f2)) / math.log(math.tan(math.pi / 4 + f2 / 2) / math.tan(math.pi / 4 + f1 / 2))
    F = math.cos(f1) * math.tan(math.pi / 4 + f1 / 2) ** n / n
    rho = lambda f: F / math.tan(math.pi / 4 + f / 2) ** n

    def lcc(lon, lat):
        r, th = rho(math.radians(lat)), n * math.radians(lon - 3)
        return r * math.sin(th), rho(f0) - r * math.cos(th)

    pts = [(lcc(p["lon"], p["lat"]), p["xy"]) for p in places if p.get("xy") and p.get("lat") is not None]
    # moindres carrés pour x = a·u + b·v + c et y = d·u + e·v + f
    def solve(target):
        M = [[0.0] * 3 for _ in range(3)]
        V = [0.0] * 3
        for (u, v), xy in pts:
            row = (u, v, 1.0)
            for i in range(3):
                V[i] += row[i] * xy[target]
                for j in range(3):
                    M[i][j] += row[i] * row[j]
        for i in range(3):                               # élimination de Gauss
            piv = max(range(i, 3), key=lambda r: abs(M[r][i]))
            M[i], M[piv], V[i], V[piv] = M[piv], M[i], V[piv], V[i]
            for r in range(i + 1, 3):
                k = M[r][i] / M[i][i]
                for c in range(i, 3):
                    M[r][c] -= k * M[i][c]
                V[r] -= k * V[i]
        x = [0.0] * 3
        for i in (2, 1, 0):
            x[i] = (V[i] - sum(M[i][c] * x[c] for c in range(i + 1, 3))) / M[i][i]
        return x
    cx, cy = solve(0), solve(1)
    projection.coefficients = {"cx": [round(v, 6) for v in cx], "cy": [round(v, 6) for v in cy]}
    return lambda lon, lat: [round(cx[0] * u + cx[1] * v + cx[2], 1), round(cy[0] * u + cy[1] * v + cy[2], 1)] if (u := lcc(lon, lat)[0]) is not None and (v := lcc(lon, lat)[1]) is not None else None


STOCKAGE = "https://omekkqjinvppadsoinvj.supabase.co/storage/v1/object/public/crescite"


def equipe_data():
    """Les personnes de l'équipe et la distribution de chaque spectacle (data/equipe.json), comme la base les donne au
    site : la photo d'une personne seulement si elle est montrée d'office (identité sûre dans le registre privé des photos,
    vrai portrait), servie par le stockage de la base, jamais copiée dans le dépôt."""
    E = json.loads((ROOT / "data" / "equipe.json").read_text(encoding="utf-8"))
    reg = PRIVATE / "photos" / "equipe" / "registre.json"
    sures = {}
    if reg.exists():
        sures = {r["slug"]: r.get("credit") for r in json.loads(reg.read_text(encoding="utf-8"))
                 if r.get("fichier") and r.get("confiance") == "sure" and r["slug"] not in E.get("photos_pas_publiees", {})}
    personnes = {p["slug"]: {"prenom": p["prenom"], "nom": p["nom"], "metiers": p["metiers"],
                             "photo": f"{STOCKAGE}/equipe/{p['slug']}.webp" if p["slug"] in sures else None,
                             "credit": f"© {sures[p['slug']]}" if sures.get(p["slug"]) else None} for p in E["personnes"]}
    equipes = {slug: [{"personne": x["personne"], "categorie": x["categorie"], "fonction": x.get("fonction", ""),
                       "role": x.get("role"), "alternance": x.get("alternance")} for x in lignes if x.get("publie", True)]
               for slug, lignes in E["distributions"].items()}
    return personnes, equipes


def build_data():
    site = json.loads((ROOT / "data" / "site-crescite.json").read_text(encoding="utf-8"))
    cass = json.loads((ROOT / "data" / "cassandres.json").read_text(encoding="utf-8"))
    dossier = json.loads((ROOT / "data" / "berenice-dossier.json").read_text(encoding="utf-8"))
    U = json.loads((ROOT / "data" / "univers-spectacles.json").read_text(encoding="utf-8"))
    rows = json.loads((ROOT / "data" / "representations-site-2016-2027.json").read_text(encoding="utf-8"))
    mp = json.loads((ROOT / "prototype" / "src" / "map.json").read_text(encoding="utf-8"))
    today = date.today().isoformat()
    proj = projection(mp["places"])

    # ---- les lieux : chaque commune déjà visitée, projetée sur la carte ----
    lieux, lindex = [], {}
    byname = {(_norm(p["c"]), p["dep"]): p for p in mp["places"] if p.get("xy")}

    def lieu(commune, dep, lat=None, lon=None):
        p = byname.get((_norm(commune), dep))
        xy = p["xy"] if p else (proj(lon, lat) if lat is not None else None)
        if not xy:
            return None
        k = f"{p['c'] if p else commune}|{dep}"
        if k not in lindex:
            lindex[k] = len(lieux)
            lieux.append({"c": p["c"] if p else commune, "dep": dep, "xy": xy})
        return lindex[k]

    def lieu_de_ligne(ligne, repli=None):
        """La commune d'une ligne qui n'est pas dans la base : « …, Duclair (76) » ; sinon le lieu du groupe."""
        for texte in (ligne, repli or ""):
            for name, dep in reversed(re.findall(r"([^,—–():]+?)\s*\((\d{2}|\d[AB])\)", texte)):
                words = re.split(r"\s+", re.sub(r"^.*(?:\b(?:de|du|à|au)\s+|\bd[’'])(?=[A-ZÉ])", "", name.strip()).strip())
                for i in range(len(words)):                       # « Scène conventionnée de Lunéville » → « Lunéville »
                    cand = " ".join(words[i:])
                    if (_norm(cand), dep) in byname:
                        return lieu(cand, dep)
                    hit = next((k for k in COMMUNES_EN_PLUS if _norm(k.split("|")[0]) == _norm(cand) and k.endswith("|" + dep)), None)
                    if hit:
                        lat, lon = COMMUNES_EN_PLUS[hit]
                        return lieu(hit.split("|")[0], dep, lat, lon)
        return None

    # ---- les saisons, telles que le site les publie ; chaque date reliée à la base (jour, commune) ----
    base = {}
    for r in rows:
        base.setdefault((r["saison"], _norm(r["intitule_original"])), r)
    slug_de = {}
    for slug, sp in site["spectacles"].items():
        slug_de[_norm(" ".join(sp["titreLignes"]))] = slug
    saisons = {}
    for saison, S in site["saisons"].items():
        groupes = []
        for g in S["spectacles"]:
            slug = (g["lien"] or "").replace("#/spectacle/", "") or slug_de.get(_norm(g["titre"]))
            if slug not in site["spectacles"]:
                slug = next((v for k, v in slug_de.items() if _norm(g["titre"]).startswith(k[:12])), None)
            dates = []
            for dt in g["dates"]:
                r = base.get((saison, _norm(dt["ligne"])))
                l = lieu(r["commune"], r["departement"], r["lat"], r["lon"]) if r and r["lat"] is not None else lieu_de_ligne(dt["ligne"], g["sousTitre"])
                lien = dt.get("lien") or next((x["lien"] for x in dt["details"] if x.get("lien")), None)
                texte = " ".join([dt["ligne"]] + [x["texte"] for x in dt["details"]])
                scolaire = r["type"] == "scolaire" if r else bool(re.search(r"scolaire|collège|lycée", texte, re.I))
                dates.append({"ligne": dt["ligne"], "details": dt["details"], "etat": dt.get("etat"), "lien": lien,
                              "iso": r["date_debut"] if r else None, "fin": r["date_fin"] if r else None,
                              "precision": r["precision"] if r else None, "scolaire": scolaire, "l": l})
            groupes.append({"titre": g["titre"], "sousTitre": g["sousTitre"], "creation": g["creation"], "slug": slug, "dates": dates})
        saisons[saison] = {"titre": S["titre"], "spectacles": groupes}

    # ---- les spectacles : le texte de leur page, leur univers (couleurs) et leur photo ----
    menu_sp = next(m for m in site["menu"] if m["texte"] == "Spectacles")["sous"][1:]
    titres_menu = dict(zip(site["spectacles"].keys(), menu_sp))
    en_tournee = {d["lien"].replace("#/spectacle/", "") for d in site["accueil"]["diaporama"] if d.get("lien")}
    sous_titres = {}
    for saison in saisons.values():                         # le sous-titre le plus récent de chaque spectacle
        for g in saison["spectacles"]:
            if g["slug"] and g["slug"] not in sous_titres and g["sousTitre"]:
                sous_titres[g["slug"]] = g["sousTitre"]
    a_venir = []
    for saison in (D_SAISON,):
        for g in saisons[saison]["spectacles"]:
            for dt in g["dates"]:
                if dt["fin"] and dt["fin"] >= today:
                    a_venir.append((g, dt))
    a_venir.sort(key=lambda gd: (gd[1]["iso"], ORDRE.index(gd[0]["slug"]) if gd[0]["slug"] in ORDRE else 99))

    def date_row(g, dt):
        date_txt, _, lieu_txt = dt["ligne"].partition(" — ")
        l = dt["l"]
        return {"slug": g["slug"], "titre": titres_menu.get(g["slug"], g["titre"]), "ligne": dt["ligne"],
                "ligneDate": date_txt.strip(), "ligneLieu": lieu_txt.strip(), "details": dt["details"], "lien": dt["lien"],
                "iso": dt["iso"], "fin": dt["fin"], "precision": dt["precision"], "scolaire": dt["scolaire"],
                "commune": lieux[l]["c"] if l is not None else None, "dep": lieux[l]["dep"] if l is not None else None,
                "xy": lieux[l]["xy"] if l is not None else None, "l": l}

    dates = [date_row(g, dt) for g, dt in a_venir]
    personnes, equipes = equipe_data()
    out_shows = []
    for slug in ORDRE:
        uv = U["spectacles"][slug]
        if slug == "cassandres":
            sp = cass
            extra = {"statut": cass["statut"], "genre": cass["genre"], "cadre": cass["cadre"], "extraits": cass["extraits"],
                     "tournee": cass["tournee"], "source": cass["source"], "sousTitre": cass["genre"],
                     "avec": None, "mentions": [], "duree": None, "production": [], "credit": None, "medias": []}
        else:
            sp = site["spectacles"][slug]
            extra = {"statut": None, "sousTitre": sous_titres.get(slug), "avec": sp["avec"], "mentions": sp["mentions"],
                     "duree": sp["duree"], "production": sp["production"], "credit": sp["credit"], "medias": sp["medias"],
                     "tournee": {"titre": sp["tournee"]["titre"] or "Actuellement en tournée", "texte": None}, "source": sp["url"]}
        if slug == "berenice":                              # la durée du dossier 2026 (1h25), plus récente que le site (1h20)
            extra["duree"] = uv["programmer"]["duree"].replace("Durée", "durée")
        u = uv["univers"]
        c = u["couleurs"]
        mine = [d for d in dates if d["slug"] == slug]
        video = uv["video"] or next(({"titre": m["titre"], "url": m["url"], "source": "site"} for m in extra["medias"]
                                     if m["type"] == "video"), None)
        out_shows.append(dict({
            "slug": slug, "titre": titres_menu.get(slug, sp["titreLignes"][0]), "titreLignes": sp["titreLignes"],
            "creation": sp["creation"], "annee": int(re.search(r"\d{4}", sp["creation"]).group()),
            "fiche": sp["fiche"], "texte": sp["texte"], "enTournee": slug in en_tournee,
            "prochaine": mine[0] if mine else None, "nbDates": len(mine),
            # l'univers : une couleur vive sur fond sombre, assombrie pour du texte sur fond clair, et un fond profond
            "couleur": c["scene"], "couleurTexteClair": for_light(c["scene"]), "fondSombre": c["fond"] if not u["clair"] else "#1a1016",
            "palette": c, "clair": u["clair"], "motif": u["motif"], "focale": 50,
            "univers": u, "lieuTemps": uv["lieuTemps"], "accroche": uv["accroche"], "affirmations": uv["affirmations"],
            "citations": uv["citations"], "video": video,
            "photo": f"{slug}.webp",
            "photos": [dict(p, cle=f"{slug}/{p['id']}", fichier=f"{slug}/{p['id']}.webp") for p in uv["photos"]], "creditPhotos": uv["credit"] or extra["credit"],
            "creditDossier": uv.get("creditDossier"),
            # une action culturelle vide ou « masquee » (pas encore construite, comme celle de Cassandres) n'est pas publiée :
            # null pour les maquettes, qui n'en montrent alors rien (règle 14 du contrat)
            "actionCulturelle": action_publiee(uv["actionCulturelle"]), "programmer": uv["programmer"],
            "dossier": "berenice" if (action_publiee(uv["actionCulturelle"]) or {}).get("dossier") else None,
            "equipe": equipes.get(slug, []),
        }, **extra))

    # ---- la carte : les communes, et les bras par saison, par spectacle, à venir ----
    def compte(items):
        n = {}
        for l in items:
            if l is not None:
                n[l] = n.get(l, 0) + 1
        return [[l, k] for l, k in sorted(n.items())]
    par_saison = {s: compte(dt["l"] for g in S["spectacles"] for dt in g["dates"]) for s, S in saisons.items()}
    par_spectacle = {}
    for sl in ORDRE:
        passe = [dt["l"] for S in saisons.values() for g in S["spectacles"] if g["slug"] == sl for dt in g["dates"]
                 if not (dt["fin"] and dt["fin"] >= today)]
        par_spectacle[sl] = {"passe": compte(passe), "aVenir": compte(d["l"] for d in dates if d["slug"] == sl)}
    # projection : de quoi placer une commune nouvelle (donnees.js) exactement comme celles du dépôt
    carte = {"viewBox": mp["viewBox"], "contour": mp["outline"], "belgique": mp["belgium"], "luxembourg": mp["lux"],
             "projection": projection.coefficients,
             "rouen": mp["rouen"], "lieux": lieux, "parSaison": par_saison, "parSpectacle": par_spectacle,
             "aVenir": compte(d["l"] for d in dates),
             "aVenirPublic": compte(d["l"] for d in dates if not d["scolaire"]),
             "aVenirScolaire": compte(d["l"] for d in dates if d["scolaire"]),
             "tout": compte(dt["l"] for S in saisons.values() for g in S["spectacles"] for dt in g["dates"])}

    a = site["accueil"]
    noms_saisons = next(m for m in site["menu"] if m["texte"].startswith("Saison"))["sous"]
    D = {
        "saison": D_SAISON, "aujourdhui": today,
        "site": {
            "nom": a["coordonnees"]["nom"], "titreSuffixe": "crescite", "accueil": "Accueil",
            "entrees": ENTREES, "menu": MENU, "redirections": REDIRECTIONS,
            "diaporama": [{"slug": d["lien"].replace("#/spectacle/", "") if d.get("lien") else None, "surtitre": d["surtitre"],
                           "titre": d["titre"], "bouton": d["bouton"], "credit": d["credit"], "href": d["lien"]} for d in a["diaporama"]],
            "donateurs": a["donateurs"][0] if a.get("donateurs") else None,
            # la compagnie : le texte du site, sa frise prolongée jusqu'à Cassandre(s) et le portrait du directeur
            # artistique, repris du dossier scolaire de Bérénice
            "compagnie": {"titre": a["presentationTitre"], "paragraphes": a["presentation"], "datesTitre": a["datesTitre"],
                          "dates": a["dates"] + [d for d in dossier["compagnie"]["dates"] if d["annee"] > a["dates"][-1]["annee"]],
                          # le portrait du dossier, dont la dernière phrase date la compagnie de 2011 : elle est reprise du
                          # dossier artistique 2027-2028, qui la date de 2012 comme le site
                          "directeur": dict(dossier["directeur"], paragraphes=dossier["directeur"]["paragraphes"][:3] + [
                              "En 2012, il crée la compagnie <em>Crescite</em> pour y mettre en scène ses spectacles dans lesquels il est également comédien."])},
            # les actions culturelles du site, lues dans « Je représente un établissement scolaire »
            "actions": {"titre": site["actions"]["blocs"][0]["titre"], "blocs": [h for b in site["actions"]["blocs"][1:] for h in b.get("html", [])],
                        "credit": site["actions"]["credit"]},
            "ecole": U["ecole"],
            "contact": site["contact"],
            # le contact des programmateurs : l'administratrice (nom et rôle publics : mentions légales, dossier artistique),
            # l'adresse publique de la compagnie ; le téléphone seulement si l'administration le saisit dans la base
            "programmation": {"contact": {"nom": "Barbara Daussy", "role": "Administratrice", "email": "contact@crescite.fr",
                                          "telephone": None}},
            "coordonnees": a["coordonnees"], "ecrire": {"texte": a["ecrire"]["texte"], "href": "#/contact"},
            "facebook": {"texte": a["facebook"]["texte"], "href": None} if a.get("facebook") else None,
            "partenaires": a["pied"]["partenaires"],
            "liensLegaux": [{"texte": "Mentions légales", "href": "#/mentions-legales"},
                            {"texte": "Politique de confidentialité", "href": "#/politique-de-confidentialite"}],
            # les mentions légales d'origine, sans le bloc de l'agence qui a conçu l'ancien site (comme son crédit en pied de page)
            "legal": {k: {"titre": site[k][0]["titre"], "blocs": [h for b in site[k][1:] for h in b.get("html", []) if "Conception et réalisation" not in h]}
                      for k in ("mentions-legales", "politique-de-confidentialite")},
            "libelles": LIBELLES,
            "saisons": [{"saison": s, "titre": saisons[s]["titre"], "menu": noms_saisons[i] if i < len(noms_saisons) else saisons[s]["titre"],
                         "href": "#/agenda" if s == D_SAISON else f"#/agenda/{s}"} for i, s in enumerate(saisons)],
        },
        "shows": out_shows,
        # le dossier scolaire de Bérénice, sans prix, téléphone ni adresse électronique ; sa présentation de la compagnie
        # et le portrait du directeur sont repris dans D.site.compagnie
        "dossiers": {"berenice": {k: v for k, v in dossier.items() if k not in ("_note", "compagnie", "directeur", "enTournee")}},
        "dates": dates,
        "saisons": saisons,
        "logo": logo_variants(),
        "arms": arms_data(),
        "carte": carte,
        "personnes": personnes,
        # les documents publics (dossier artistique, fiche technique, dossier pédagogique) : déposés dans la base par
        # l'administration ou par supabase/documents.py ; [{spectacle, type, titre, url, pour: 'pros'|'scolaires'}]
        "documents": documents_publics(),
    }
    return D, photo_files(out_shows)


D_SAISON = "2026-2027"


def documents_publics():
    """Les documents publics de data/documents.json (pour les pros et les scolaires), tels que la base les donnera une
    fois envoyés par supabase/documents.py. Avec le dossier privé (private/drive/), seulement ceux dont on a le fichier."""
    docs = json.loads((ROOT / "data" / "documents.json").read_text(encoding="utf-8"))["documents"]
    drive = PRIVATE / "drive"
    return [{"spectacle": d["spectacle"], "type": d["type"], "titre": d["titre"], "url": f"{STOCKAGE}/{quote(d['chemin'])}",
             "pour": d["pour"]} for d in sorted(docs, key=lambda d: d["ordre"])
            if d["pour"] in ("pros", "scolaires") and (not drive.exists() or (drive / d["source"]).exists())]


def action_publiee(a):
    """L'action culturelle d'un spectacle telle que le site la montre : None si elle est vide ou masquée (« masquee »)."""
    return a if a and not a.get("masquee") else None


DATA_LIGNE = "<script>const D = /*__DATA__*/null;</script>"


OUTILS = ("agenda.js", "donnees.js", "carte.js", "intro.js", "edition.js", "dossier.js", "tentacules.js")


def outils():
    """Les outils communs, dans l'ordre. dossier.js compose à la demande le dossier PDF d'un spectacle (pdfmake, chargé depuis
    admin/vendor/ au premier clic). tentacules.js (la pieuvre du logo guide chaque clic et chaque changement de page) vient
    en dernier ; ?anim=0 dans l'adresse l'éteint (captures, essais)."""
    return OUTILS


def avec_outils(name, src):
    """Ajoute, juste après les données D, les outils communs : les lignes d'agenda (agenda.js), les données vivantes
    (donnees.js), la carte des tournées (carte.js) et l'ouverture sur le logo (intro.js)."""
    if DATA_LIGNE not in src:
        raise SystemExit(f"{name}.html : la ligne {DATA_LIGNE} est absente")
    js = "".join(f"\n<script>\n{(SRC / f).read_text(encoding='utf-8')}</script>" for f in outils())
    return src.replace(DATA_LIGNE, DATA_LIGNE + js, 1)


def assemble(name, D, photo_urls):
    src = avec_outils(name, (SRC / f"{name}.html").read_text(encoding="utf-8"))
    data = dict(D, photos=photo_urls)
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    if "/*__DATA__*/null" not in src:
        raise SystemExit(f"{name}.html : le marqueur /*__DATA__*/null est absent")
    return src.replace("/*__DATA__*/null", payload)


def captures(names):
    """Photographie chaque maquette (accueil, page entière, page spectacle, téléphone) et range les captures en WebP."""
    import subprocess
    import tempfile
    from PIL import Image
    shots = DIST / "shots"
    shots.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(["node", str(ROOT / "maquettes" / "shoot.mjs"), tmp, *names], check=True)
        for n in names:
            for view, width in (("home", 1200), ("show", 1200), ("agenda", 1200), ("mobile", 390), ("mshow", 390), ("full", 640)):
                f = Path(tmp) / f"{n}-{view}.png"
                if not f.exists():
                    continue
                im = Image.open(f).convert("RGB")
                if im.width > width:
                    im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
                im.save(shots / f"{n}-{view}.webp", "WEBP", quality=80, method=6)
    print(f"captures : {len(names)} maquettes dans {shots.relative_to(ROOT)}")


# Les maquettes en ligne ne doivent pas apparaître dans les moteurs de recherche. GitHub Pages ne permet pas
# d'en-tête X-Robots-Tag, et un robots.txt dans un sous-dossier est ignoré (et bloquer l'exploration empêcherait
# les robots de lire la consigne) : la consigne passe donc par une balise meta, dans le HTML initial de chaque page.
NOINDEX = '<meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex">'


def admin(dest):
    """L'administration (admin/index.html, son client Supabase et l'outil des lignes d'agenda), à côté des maquettes."""
    import shutil
    (dest / "admin" / "vendor").mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ROOT / "admin" / "index.html", dest / "admin" / "index.html")
    for f in ("feuille.js", "equipe.js"):   # la feuille de route (commune avec equipe/) et l'équipe
        shutil.copyfile(ROOT / "admin" / f, dest / "admin" / f)
    for f in (ROOT / "admin" / "vendor").iterdir():
        shutil.copyfile(f, dest / "admin" / "vendor" / f.name)
    shutil.copyfile(SRC / "agenda.js", dest / "admin" / "agenda.js")
    shutil.copyfile(SRC / "tentacules.js", dest / "admin" / "tentacules.js")
    # le logo des feuilles de route (admin/feuille.js le lit à côté de lui) : la tache noire, la pieuvre et le mot en blanc,
    # tirés du logo privé (private/brand). Il ne va jamais dans le dépôt : il n'est écrit que dans une sortie que git
    # ignore (maquettes/dist) ; ailleurs (docs/, versionné) ou sans le logo privé, la feuille montre un badge à sa place.
    import subprocess
    logo = dest / "admin" / "logo-feuille.svg"
    try:
        ignore = subprocess.run(["git", "-C", str(ROOT), "check-ignore", "-q", str(logo)]).returncode == 0
    except OSError:
        ignore = False
    if ignore and (PRIVATE / "brand" / "crescite-logo-2.0.svg").exists():
        logo.write_text(logo_variants()["full"].replace('fill="#BC3E80"', 'fill="#1d1d1b"'), encoding="utf-8")
    elif logo.exists():
        logo.unlink()


def equipe(dest):
    """L'espace de l'équipe (equipe/ : la page personnelle de chaque personne), à côté de l'administration : il charge par
    ../admin/ le client Supabase, l'outil des lignes d'agenda, la feuille de route et les tentacules, que admin(dest) copie."""
    import shutil
    shutil.copytree(ROOT / "equipe", dest / "equipe", dirs_exist_ok=True, ignore=shutil.ignore_patterns(".*", "__pycache__"))


def pages(D, files, names):
    """Le site GitHub Pages (docs/) : la planche en index, chaque maquette en page à part, hors des moteurs de recherche,
    et les photos une seule fois dans docs/photos/, que les pages chargent au lieu de les embarquer chacune."""
    import shutil
    docs = ROOT / "docs"
    docs.mkdir(exist_ok=True)
    shutil.rmtree(docs / "photos", ignore_errors=True)
    for k, (f, _) in files.items():
        if f is not None:
            dest = docs / "photos" / f"{k}.webp"
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(f, dest)
    photo_urls = photos(files, base="photos/")
    for n in names:
        html = assemble(n, D, photo_urls).replace('<meta charset="utf-8">', '<meta charset="utf-8">\n' + NOINDEX, 1)
        (docs / f"{n}.html").write_text(html, encoding="utf-8")
    build_planche(D, photo_urls, names, web=True, dest=docs / "index.html")
    admin(docs)
    equipe(docs)
    (docs / ".nojekyll").write_text("", encoding="utf-8")
    size = sum(f.stat().st_size for f in docs.rglob("*") if f.is_file()) / 1024 / 1024
    print(f"pages : {len(names)} maquettes et la planche dans docs/ ({size:.1f} Mo)")


def main():
    D, files = build_data()
    photo_urls = photos(files)
    DIST.mkdir(parents=True, exist_ok=True)
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    names = args or sorted(p.stem for p in SRC.glob("m[0-9][0-9].html")) + (["synthese"] if (SRC / "synthese.html").exists() else [])
    for n in names:
        out = DIST / f"{n}.html"
        out.write_text(assemble(n, D, photo_urls), encoding="utf-8")
        print(f"wrote {out.relative_to(ROOT)} ({out.stat().st_size / 1024:.0f} Ko)")
    admin(DIST)
    equipe(DIST)
    (DIST / "data.json").write_text(json.dumps(dict(D, photos={k: f"[photo {k}]" for k in photo_urls}), ensure_ascii=False, indent=1), encoding="utf-8")
    if "--captures" in sys.argv:
        captures(names)
    planche = SRC / "planche.html"
    if not args and planche.exists():
        build_planche(D, photo_urls, names)
        if "--pages" in sys.argv:
            pages(D, files, names)


def build_planche(D, photo_urls, names, web=False, dest=None):
    """La planche : une barre d'onglets en haut, chaque maquette chargée en plein écran dessous.
    En fichier, elle embarque chaque maquette avec ses données ; en ligne (web), elle charge les pages publiées à côté d'elle."""
    html = (SRC / "planche.html").read_text(encoding="utf-8")
    if web:
        data = {"web": True, "pages": names}
    else:
        data = {"D": dict(D, photos=photo_urls), "sources": {n: avec_outils(n, (SRC / f"{n}.html").read_text(encoding="utf-8")) for n in names}}
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    html = html.replace("/*__PLANCHE__*/null", payload)
    if web:
        html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n' + NOINDEX, 1)
    out = dest or DIST / "maquettes.html"
    out.write_text(html, encoding="utf-8")
    print(f"wrote {out.relative_to(ROOT)} ({out.stat().st_size / 1024:.0f} Ko)")

if __name__ == "__main__":
    main()
