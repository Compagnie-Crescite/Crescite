#!/usr/bin/env python3
"""Assemble prototype/dist/index.html (single self-contained file) from prototype/src and data/.

Les fichiers privés de la compagnie (logo 2.0, photos) sont lus dans private/, dossier exclu du dépôt
public. S'ils manquent, le prototype est construit avec des substituts neutres. Toutes les dates viennent
du relevé public du site (data/).

Usage: python3 prototype/build.py
"""
import base64
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "prototype" / "src"
PRIVATE = ROOT / "private"
OUT = ROOT / "prototype" / "dist" / "index.html"

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


FALLBACK_LOGO = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-labelledby="t"><title id="t">Crescite</title>'
                 '<path id="blob" fill="#BC3E80" d="M200 16c104 0 184 78 184 182s-82 186-186 186S16 304 16 198 96 16 200 16z"/>'
                 '<path id="wordmark" fill="#fff" d="M0 0"/><text x="200" y="222" text-anchor="middle" font-family="sans-serif" '
                 'font-size="64" font-weight="600" fill="#fff">crescite</text></svg>')


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
    data = {
        "shows": shows, "photos": photos, "season": season, "tour": tour,
        "places": [{"c": p["c"], "dep": p["dep"], "x": p["xy"][0] if p["xy"] else None,
                    "y": p["xy"][1] if p["xy"] else None, "lat": p["lat"], "lon": p["lon"]} for p in places],
        "map": mp, "troupe": troupe, "cities": CITIES, "venues": venues, "mapShows": MAP_SHOWS,
        "builtFrom": "crescite.fr, relevé du 13 octobre 2026",
    }

    logo_path = PRIVATE / "brand" / "crescite-logo-2.0.svg"
    logo_src = logo_path.read_text(encoding="utf-8") if logo_path.exists() else FALLBACK_LOGO
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
    mode = "complet" if (logo_path.exists() and not missing) else "public (substituts)"
    print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size / 1024:.0f} Ko), version {mode} : "
          f"{len(season)} dates de saison, {len(tour)} dates de carte, {len(troupe)} dates troupe, {missing} photo(s) manquante(s)")


if __name__ == "__main__":
    main()
