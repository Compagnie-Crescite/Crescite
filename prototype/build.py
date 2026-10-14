#!/usr/bin/env python3
"""Assemble prototype/dist/index.html (single self-contained file) from prototype/src and data/.

Les fichiers privés de la compagnie (logo 2.0, photos) sont lus dans private/, dossier exclu du dépôt
public. S'ils manquent, le prototype est construit avec des substituts neutres. Toutes les dates viennent
du relevé public du site (data/).

Usage: python3 prototype/build.py            (version complète si private/ est présent)
       python3 prototype/build.py --public   (version du dépôt public, avec substituts)
"""
import base64
import json
import re
from pathlib import Path

import sys

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "prototype" / "src"
PUBLIC_ONLY = "--public" in sys.argv          # construit la version du dépôt public, même si private/ est là
PRIVATE = ROOT / ("private-absent" if PUBLIC_ONLY else "private")
OUT = ROOT / "prototype" / "dist" / ("index-public.html" if PUBLIC_ONLY else "index.html")

SHOW_ORDER = ["cleophene", "ci-gisait-cyrano", "berenice", "mon-royaume",
              "imaginaire-force", "la-folle-idee", "macbeth-fatum", "actions-culturelles"]
MAP_SHOWS = ["mon-royaume", "imaginaire-force", "ci-gisait-cyrano", "berenice", "cleophene"]

# Grandes villes pour « près de chez moi » (en plus des communes de tournée)
CITIES = [
    ("Paris", 48.8566, 2.3522), ("Lyon", 45.764, 4.8357), ("Marseille", 43.2965, 5.3698), ("Lille", 50.6292, 3.0573),
    ("Rennes", 48.1173, -1.6778), ("Nantes", 47.2184, -1.5536), ("Caen", 49.1829, -0.3707), ("Le Havre", 49.4944, 0.1079),
    ("Rouen", 49.4431, 1.0993), ("Amiens", 49.8941, 2.2958), ("Strasbourg", 48.5734, 7.7521), ("Bordeaux", 44.8378, -0.5792),
    ("Toulouse", 43.6047, 1.4442), ("Nice", 43.7102, 7.262), ("Montpellier", 43.6108, 3.8767), ("Dijon", 47.322, 5.0415),
    ("Reims", 49.2583, 4.0317), ("Orléans", 47.9029, 1.9093), ("Tours", 47.3941, 0.6848), ("Le Mans", 48.0061, 0.1996),
    ("Angers", 47.4784, -0.5632), ("Brest", 48.3904, -4.4861), ("Évreux", 49.0241, 1.1508), ("Cherbourg-en-Cotentin", 49.6337, -1.6222),
    ("Dieppe", 49.9229, 1.0775), ("Alençon", 48.4329, 0.0913), ("Saint-Lô", 49.1157, -1.0906), ("Laval", 48.0707, -0.7734),
    ("Metz", 49.1193, 6.1757), ("Nancy", 48.6921, 6.1844), ("Mulhouse", 47.7508, 7.3359), ("Grenoble", 45.1885, 5.7245),
    ("Clermont-Ferrand", 45.7772, 3.087), ("Limoges", 45.8336, 1.2611), ("Poitiers", 46.5802, 0.3404), ("Besançon", 47.2378, 6.0241),
    ("Saint-Étienne", 45.4397, 4.3872), ("Beauvais", 49.4295, 2.0807), ("Chartres", 48.4469, 1.4892), ("Lisieux", 49.1466, 0.2262),
    ("Bruxelles", 50.8467, 4.3525),
]


# Assignation des spectacles aux huit bras de la pieuvre (voir la scène dans app.js)
ARM_OF = {
    "cleophene": "A1outerL", "ci-gisait-cyrano": "A1outerR",
    "imaginaire-force": "A1innerL", "la-folle-idee": "A1innerR",
    "macbeth-fatum": "A2L", "actions-culturelles": "A2R",
    "berenice": "C1L", "mon-royaume": "C1R",
}
# Sorties des bras (coordonnées du dessin 1536 px) : seules valeurs nécessaires au substitut public
FALLBACK_EXITS = {
    "A1outerL": ((257, 715), (-0.949, -0.316)), "A1outerR": ((1284, 708), (0.876, -0.483)),
    "A1innerL": ((325, 778), (-0.5, 0.866)), "A1innerR": ((1211, 778), (0.5, 0.866)),
    "A2L": ((536, 882), (-0.05, 1.0)), "A2R": ((1000, 882), (0.05, 1.0)),
    "C1L": ((615, 916), (0.04, 1.0)), "C1R": ((921, 916), (-0.04, 1.0)),
}


def _poly(points):
    return "M " + " L ".join(f"{x:.1f} {y:.1f}" for x, y in points) + " Z"


def fallback_logo_and_arms():
    """Pieuvre de substitution (dépôt public, sans le logo 2.0) : une tête et huit bras simples."""
    import math
    head = [(771 + 150 * math.cos(a / 40 * 2 * math.pi), 560 + 205 * math.sin(a / 40 * 2 * math.pi)) for a in range(40)]
    arms, groups = {}, {"tentacles-left": [], "head-left": [_poly(head)], "head-right": [], "tentacles-right": []}
    for key, ((ex, ey), (dx, dy)) in FALLBACK_EXITS.items():
        left = key.endswith("L")
        bx, by = (720 if left else 822), 700
        cx_, cy_ = (bx + ex) / 2 + (-60 if left else 60), max(by, ey) + 60
        tx, ty = ex - dx * 26, ey - dy * 26          # le bras dessiné s'arrête un peu avant la sortie
        cl = []
        for i in range(31):
            t = i / 30
            x = (1 - t) ** 2 * bx + 2 * (1 - t) * t * cx_ + t * t * tx
            y = (1 - t) ** 2 * by + 2 * (1 - t) * t * cy_ + t * t * ty
            cl.append((x, y))
        L, R = [], []
        for i, (x, y) in enumerate(cl):
            a, b = cl[max(0, i - 1)], cl[min(30, i + 1)]
            nx, ny = -(b[1] - a[1]), b[0] - a[0]
            n = math.hypot(nx, ny) or 1
            w = (34 * (1 - i / 30) + 7 * (i / 30)) / 2
            L.append((x + nx / n * w, y + ny / n * w)); R.append((x - nx / n * w, y - ny / n * w))
        groups["tentacles-left" if left else "tentacles-right"].append(_poly(L + R[::-1]))
        pts = [(tx - dx * 10 + dx * k * 2, ty - dy * 10 + dy * k * 2) for k in range(24)]
        arms[key] = {"pts": [[round(x, 1), round(y, 1)] for x, y in pts], "own": 6, "exitdir": [dx, dy]}
    paths = "".join(f'<path id="{gid}" fill="#fff" d="{" ".join(ds)}"/>' for gid, ds in groups.items())
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="63 65 1408 1405" role="img" aria-labelledby="t"><title id="t">Crescite</title>'
           '<path id="blob" fill="#BC3E80" d="M767 75c387 0 697 310 697 697s-310 697-697 697S70 1159 70 772 380 75 767 75z"/>'
           + paths + '<path id="wordmark" fill="#fff" d="M0 0"/></svg>')
    return svg, {"box": [263, 351, 1279, 903], "width": 6.5, "gap": 2.5, "arms": arms}


def placeholder_photo(title: str) -> str:
    """Neutral stand-in when the company photos are not available (public repository)."""
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 750"><defs><radialGradient id="g" cx="50%" cy="40%" r="75%">'
           f'<stop offset="0" stop-color="#5c1640"/><stop offset="1" stop-color="#13080e"/></radialGradient></defs>'
           f'<rect width="1200" height="750" fill="url(#g)"/><text x="600" y="400" text-anchor="middle" font-family="serif" '
           f'font-style="italic" font-size="84" fill="#f7ecf1" opacity=".55">{title}</text></svg>')
    return "data:image/svg+xml;base64," + base64.b64encode(svg.encode("utf-8")).decode()


MOIS_RE = "janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre"


def times_of(details: str):
    """Horaires cités dans le texte d'une date : par jour (« 29 janvier à 14h ») ou communs (« 14h et 20h »)."""
    head = details.split(" : ")[0]
    per_day = {int(d): f"{int(h):02d}h{m or '00'}" for d, h, m in
               re.findall(rf"(\d{{1,2}})(?:er)?\s+(?:{MOIS_RE})\s+à\s+(\d{{1,2}})h(\d{{2}})?", head)}
    if per_day:
        return {d: [t] for d, t in per_day.items()}, []
    return {}, [f"{int(h):02d}h{m or '00'}" for h, m in re.findall(r"\b(\d{1,2})h(\d{2})?\b", head)]


def main():
    shows = json.loads((SRC / "shows.json").read_text(encoding="utf-8"))
    shows.sort(key=lambda s: SHOW_ORDER.index(s["slug"]))
    rows = json.loads((ROOT / "data" / "representations-site-2016-2027.json").read_text(encoding="utf-8"))
    mp = json.loads((SRC / "map.json").read_text(encoding="utf-8"))
    photos, missing = {}, 0
    for s in shows:
        f = PRIVATE / "photos" / s["photo"]
        if f.exists():
            photos[s["slug"]] = "data:image/webp;base64," + base64.b64encode(f.read_bytes()).decode()
        else:
            missing += 1
            photos[s["slug"]] = placeholder_photo(s["titre"])

    places = mp.pop("places")
    pindex = {p["k"]: i for i, p in enumerate(places)}
    perf = [r for r in rows if r["type"] in ("scolaire", "tout_public") and r["lat"] is not None]

    season = []
    for r in perf:
        if r["saison"] != "2026-2027":
            continue
        season.append({
            "id": r["id"], "slug": r["spectacle_slug"], "start": r["date_debut"], "end": r["date_fin"],
            "days": r["jours"], "precision": r["precision"], "time": r["heure"],
            "commune": r["commune"], "dep": r["departement"], "lat": r["lat"], "lon": r["lon"],
            "venue": (r["lieu"] or "").split(" : ")[0] or None, "type": r["type"], "details": r["details"], "links": r["liens"],
            "label": r["intitule_original"].split("—")[0].strip(), "n": r["nb_representations"],
            "xy": places[pindex[f'{r["commune"]}|{r["departement"]}']]["xy"],
        })

    tour = []
    for r in perf:
        key = f'{r["commune"]}|{r["departement"]}'
        slug = r["spectacle_slug"] if r["spectacle_slug"] in MAP_SHOWS else "autres"
        tour.append([slug, int(r["saison"][:4]), "S" if r["type"] == "scolaire" else "P", pindex[key], r["date_debut"]])

    # Espace troupe (exemple) : les dates publiées des spectacles, une ligne par jour et par horaire
    troupe = []
    for r in season:
        per_day, times = times_of(r["details"] or "")
        for day in (r["days"] or [r["start"]]):
            hours = per_day.get(int(day[-2:]), []) if per_day else times
            for h in (hours or [None]):
                troupe.append({"id": r["id"], "slug": r["slug"], "lieu": f'{r["venue"] or r["commune"]}, {r["commune"]} ({r["dep"]})',
                               "ville": r["commune"], "jour": day, "heure": h, "scolaire": r["type"] == "scolaire",
                               "precision": r["precision"], "url": (r["links"] or [None])[0]})

    venues = sorted({f'{r["lieu"]}|{r["commune"]}|{r["departement"]}' for r in perf if r["lieu"]})

    # Lieux d'accueil depuis 2016 : théâtres d'un côté, établissements scolaires de l'autre
    school_re = re.compile(r"\b(coll[eè]ge|lyc[eé]e|LP|LEGT|LGT|[ée]cole|EREA|MFR|SEGPA)\b", re.I)
    counts = {}
    for r in perf:
        lieu = (r["lieu"] or "").split(" : ")[0].strip()
        if not lieu:
            continue
        k = (lieu, r["commune"], r["departement"])
        counts[k] = counts.get(k, 0) + 1
    ranked = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0][0]))
    venues_pro = [[l, c, d, n] for (l, c, d), n in ranked if not school_re.search(l)][:36]
    venues_schools = [[l, c, d, n] for (l, c, d), n in ranked if school_re.search(l)][:36]
    stats = {
        "dates": len(perf),
        "communes": len({(r["commune"], r["departement"]) for r in perf}),
        "deps": len({r["departement"] for r in perf if r["departement"] != "BE"}),
        "saisons": len({r["saison"] for r in perf}),
        "scolaires": sum(1 for r in perf if r["type"] == "scolaire"),
    }
    data = {
        "shows": shows, "photos": photos, "season": season, "tour": tour,
        "places": [{"c": p["c"], "dep": p["dep"], "x": p["xy"][0] if p["xy"] else None,
                    "y": p["xy"][1] if p["xy"] else None, "lat": p["lat"], "lon": p["lon"]} for p in places],
        "map": mp, "troupe": troupe, "cities": CITIES, "venues": venues, "mapShows": MAP_SHOWS,
        "venuesPro": venues_pro, "venuesSchools": venues_schools, "stats": stats, "armOf": ARM_OF,
        "builtFrom": "crescite.fr, relevé du 13 octobre 2026",
    }

    logo_path = PRIVATE / "brand" / "crescite-logo-2.0.svg"
    arms_path = PRIVATE / "brand" / "crescite-logo-2.0-arms.json"
    if logo_path.exists() and arms_path.exists():
        logo_src = logo_path.read_text(encoding="utf-8")
        data["arms"] = json.loads(arms_path.read_text(encoding="utf-8"))
        data["arms"].pop("_note", None)
    else:
        logo_src, data["arms"] = fallback_logo_and_arms()
    logo = logo_src
    logo = re.sub(r"<title[^>]*>.*?</title>", "", logo, flags=re.S)
    logo = logo.replace(' role="img" aria-labelledby="t"', ' aria-hidden="true" focusable="false"')
    for i, gid in enumerate(["tentacles-left", "head-left", "head-right", "tentacles-right"], 1):
        logo = logo.replace(f'<path id="{gid}"', f'<path id="{gid}" class="t-group tg-{i}"')
    mark = logo_src
    mark = re.sub(r"<title[^>]*>.*?</title>", "", mark, flags=re.S)
    mark = mark.replace(' role="img" aria-labelledby="t"', ' aria-hidden="true" focusable="false"')
    mark = re.sub(r'<path id="wordmark"[^>]*/>', "", mark)
    mark = re.sub(r'\sid="[^"]+"', "", mark)  # the mark is inserted twice: no duplicate ids

    html = (SRC / "template.html").read_text(encoding="utf-8")
    app = (SRC / "app.js").read_text(encoding="utf-8")
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    html = html.replace("<!--LOGO_SVG-->", logo).replace("<!--MARK_SVG-->", mark)
    html = html.replace("/*__DATA__*/null", payload).replace("/*__APP__*/", app)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding="utf-8")
    mode = "complet" if (logo_path.exists() and arms_path.exists() and not missing) else "public (substituts)"
    print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size / 1024:.0f} Ko), version {mode} : "
          f"{len(season)} dates de saison, {len(tour)} dates de carte, {len(troupe)} dates troupe, {missing} photo(s) manquante(s)")


if __name__ == "__main__":
    main()
