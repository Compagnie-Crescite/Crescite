#!/usr/bin/env python3
"""Assemble les dix maquettes de la partie publique et la planche qui les compare.

Chaque maquette est un fichier maquettes/src/mNN.html qui lit ses contenus dans l'objet D (spectacles,
dates, portes, compagnie, logo, photos). Le script remplace /*__DATA__*/null par ces données.

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


def photos(shows):
    out = {}
    for s in shows:
        f = PRIVATE / "photos" / s["photo"]
        out[s["slug"]] = ("data:image/webp;base64," + base64.b64encode(f.read_bytes()).decode()) if f.exists() else proto.placeholder_photo(s["titre"])
    return out


# La diffusion, d'après le dossier artistique 2027-2028 de la compagnie (chiffres au 31 juillet 2026).
# Le site ne publie qu'une partie des dates (environ un tiers) : ses lignes servent à la carte, pas aux totaux.
DIFFUSION = {
    "depuis": 2011, "representations": 1500, "texte": "plus de 1\u202f500", "court": "1\u202f500+",
    "parAnMin": 86, "parAnDepuis": 2014, "pays": ["France", "Belgique", "Suisse", "Tunisie"],
    "heuresEACAn": 200, "source": "dossier artistique 2027-2028, au 31 juillet 2026",
    "parSpectacle": {
        "imaginaire-force": (492, "au 31 juillet 2026"), "mon-royaume": (779, "au 31 juillet 2026"),
        "macbeth-fatum": (40, "jusqu’en mai 2019"), "berenice": (67, "au 31 juillet 2026"),
        "la-folle-idee": (13, "jusqu’en mars 2023"), "ci-gisait-cyrano": (176, "au 31 juillet 2026"),
        "cleophene": (16, "au 31 juillet 2026"),
    },
}


def build_data():
    shows = json.loads((ROOT / "prototype" / "src" / "shows.json").read_text(encoding="utf-8"))
    shows.sort(key=lambda s: proto.SHOW_ORDER.index(s["slug"]))
    rows = json.loads((ROOT / "data" / "representations-site-2016-2027.json").read_text(encoding="utf-8"))
    perf = [r for r in rows if r["type"] in ("scolaire", "tout_public") and r["lat"] is not None]
    today = date.today().isoformat()
    season = sorted([r for r in perf if r["saison"] == "2026-2027" and r["date_fin"] >= today], key=lambda r: (r["date_debut"], r["id"]))
    titles = {s["slug"]: s["titre"] for s in shows}

    def date_row(r):
        y, m, d = map(int, r["date_debut"].split("-"))
        wd = date(y, m, d).weekday()
        return {
            "slug": r["spectacle_slug"], "titre": titles.get(r["spectacle_slug"], r["spectacle_slug"]),
            "iso": r["date_debut"], "fin": r["date_fin"], "jour": d, "mois": MOISC[m - 1], "moisLong": MOIS[m - 1], "annee": y,
            "joursem": JOURSC[wd], "joursemLong": JOURS[wd], "precision": r["precision"],
            "label": r["intitule_original"].split("—")[0].strip() if r["precision"] != "month" else f"{MOIS[m - 1]} {y}, jour à préciser",
            "commune": r["commune"], "dep": r["departement"], "lieu": (r["lieu"] or "").split(" : ")[0] or None,
            "public": "Scolaire" if r["type"] == "scolaire" else "Tout public", "lien": (r["liens"] or [None])[0],
        }

    dates = [date_row(r) for r in season]
    # la carte des tournées : le contour de la France, Rouen, et chaque commune déjà visitée (coordonnées projetées)
    mp = json.loads((ROOT / "prototype" / "src" / "map.json").read_text(encoding="utf-8"))
    places = mp["places"]
    pindex = {p["k"]: i for i, p in enumerate(places)}
    key = lambda r: pindex.get(f'{r["commune"]}|{r["departement"]}')
    for d, r in zip(dates, season):
        k = key(r)
        d["xy"] = places[k]["xy"] if k is not None else None
    counts, by_show = {}, {}
    for r in perf:
        k = key(r)
        if k is None or not places[k]["xy"] or r["date_debut"] >= today:
            continue                    # les années passées seulement : la saison à venir a ses propres traits
        counts[k] = counts.get(k, 0) + 1
        by_show.setdefault(r["spectacle_slug"], {}).setdefault(k, 0)
        by_show[r["spectacle_slug"]][k] += 1
    order = sorted(counts)
    lieux = [{"c": places[k]["c"], "dep": places[k]["dep"], "xy": places[k]["xy"], "n": counts[k]} for k in order]
    li = {k: i for i, k in enumerate(order)}
    carte = {"viewBox": mp["viewBox"], "contour": mp["outline"], "belgique": mp["belgium"], "luxembourg": mp["lux"], "rouen": mp["rouen"],
             "lieux": lieux, "parSpectacle": {slug: [[li[k], n] for k, n in sorted(v.items())] for slug, v in by_show.items()}}
    out_shows = []
    for s in shows:
        c = s["univers"]["couleurs"]
        nxt = next((d for d in dates if d["slug"] == s["slug"]), None)
        out_shows.append({
            "slug": s["slug"], "titre": s["titre"], "sousTitre": s["sous_titre"], "annee": s.get("annee"), "duree": s.get("duree"),
            "accroche": s["accroche"], "texte": s["texte"], "distribution": s.get("distribution") or [], "equipe": s.get("equipe") or [],
            "coproduction": s.get("copro"), "soutiens": s.get("soutiens"), "credit": s.get("credit"), "video": s.get("video"),
            "passCulture": bool(s.get("pass_culture")), "cred76": s.get("cred76"), "noteScolaire": s.get("scolaire_note"),
            "etablissement": s.get("etablissement"),
            # une couleur par spectacle : vive sur fond sombre, assombrie pour du texte sur fond clair, et un fond profond
            "couleur": c["scene"], "couleurTexteClair": for_light(c["scene"]), "fondSombre": c["fond"] if not s["univers"].get("clair") else "#1a1016",
            "focale": s["univers"].get("focale", 50),
            # l'univers complet, pour les maquettes qui le mettent en scène : palette, motif et texte de l'effet signature
            "palette": c, "clair": bool(s["univers"].get("clair")), "motif": s["univers"]["motif"], "signature": s["univers"]["signature"],
            "prochaine": nxt, "nbDates": sum(1 for d in dates if d["slug"] == s["slug"]),
            "representations": dict(zip(("n", "quand"), DIFFUSION["parSpectacle"][s["slug"]])) if s["slug"] in DIFFUSION["parSpectacle"] else None,
        })
    D = {
        "company": {
            "nom": "Compagnie Crescite", "ville": "Rouen", "depuis": 2012, "adresse": "72 boulevard d’Orléans, 76100 Rouen",
            "email": "contact@crescite.fr", "siret": "749 941 761 00035", "licence": "L-R-24-002837",
            "presentation": "Compagnie de théâtre implantée à Rouen, conventionnée par la Ville de Rouen. Elle joue autant dans les théâtres que dans les collèges et les lycées.",
            "intention": "Des spectacles comme des tentacules : ils partent de Rouen et vont chercher leur public, en salle comme dans les classes.",
            "miseEnScene": "Angelo Jossec",
            "partenaires": ["Ville de Rouen", "DRAC Normandie", "Région Normandie", "Département de Seine-Maritime", "ODIA Normandie"],
        },
        "doors": [
            {"key": "voir", "titre": "Je viens voir", "texte": "Une date près de chez moi, un lieu, une réservation.", "couleur": "#c2306f", "couleurVive": "#f07ab6"},
            {"key": "programmer", "titre": "Je programme", "texte": "Le répertoire, les fiches techniques, le calendrier de tournée.", "couleur": "#8a6410", "couleurVive": "#e8bc5c"},
            {"key": "etablissement", "titre": "Je fais venir dans mon établissement", "texte": "Les spectacles qui se déplacent, les ateliers, le Pass Culture.", "couleur": "#127a6a", "couleurVive": "#5fd0bd"},
        ],
        "shows": out_shows,
        "dates": dates,
        # dates, communes, départements : ce que le site publie depuis 2016 (pour la carte) ;
        # representations…, parAnMin, pays : la diffusion réelle, d'après le dossier de la compagnie
        "stats": {"dates": len(perf), "communes": len({(r["commune"], r["departement"]) for r in perf}),
                  "departements": len({r["departement"] for r in perf if r["departement"] != "BE"}), "heuresEAC": 260,
                  "datesSaison": len(dates),
                  "representations": DIFFUSION["representations"], "representationsTexte": DIFFUSION["texte"],
                  "representationsCourt": DIFFUSION["court"], "depuis": DIFFUSION["depuis"],
                  "parAnMin": DIFFUSION["parAnMin"], "parAnDepuis": DIFFUSION["parAnDepuis"],
                  "pays": len(DIFFUSION["pays"]), "paysListe": DIFFUSION["pays"], "heuresEACAn": DIFFUSION["heuresEACAn"],
                  "source": DIFFUSION["source"]},
        "saison": "2026-2027",
        "logo": logo_variants(),
        "arms": arms_data(),
        "carte": carte,
    }
    return D, photos(shows)


def assemble(name, D, photo_urls):
    src = (SRC / f"{name}.html").read_text(encoding="utf-8")
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
            for view, width in (("home", 1200), ("show", 1200), ("mobile", 390), ("mshow", 390), ("full", 640)):
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


def pages(D, photo_urls, names):
    """Le site GitHub Pages (docs/) : la planche en index, et chaque maquette en page à part, hors des moteurs de recherche."""
    docs = ROOT / "docs"
    docs.mkdir(exist_ok=True)
    for n in names:
        html = assemble(n, D, photo_urls).replace('<meta charset="utf-8">', '<meta charset="utf-8">\n' + NOINDEX, 1)
        (docs / f"{n}.html").write_text(html, encoding="utf-8")
    build_planche(D, photo_urls, names, web=True, dest=docs / "index.html")
    (docs / ".nojekyll").write_text("", encoding="utf-8")
    size = sum(f.stat().st_size for f in docs.iterdir()) / 1024 / 1024
    print(f"pages : {len(names)} maquettes et la planche dans docs/ ({size:.1f} Mo)")


def main():
    D, photo_urls = build_data()
    DIST.mkdir(parents=True, exist_ok=True)
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    names = args or sorted(p.stem for p in SRC.glob("m[0-9][0-9].html")) + (["synthese"] if (SRC / "synthese.html").exists() else [])
    for n in names:
        out = DIST / f"{n}.html"
        out.write_text(assemble(n, D, photo_urls), encoding="utf-8")
        print(f"wrote {out.relative_to(ROOT)} ({out.stat().st_size / 1024:.0f} Ko)")
    (DIST / "data.json").write_text(json.dumps(dict(D, photos={k: f"[photo {k}]" for k in photo_urls}), ensure_ascii=False, indent=1), encoding="utf-8")
    if "--captures" in sys.argv:
        captures(names)
    planche = SRC / "planche.html"
    if not args and planche.exists():
        build_planche(D, photo_urls, names)
        if "--pages" in sys.argv:
            pages(D, photo_urls, names)


def build_planche(D, photo_urls, names, web=False, dest=None):
    """La planche : les dix maquettes côte à côte, captures comprises, chacune ouvrable en grand.
    En fichier, elle embarque chaque maquette ; en ligne (web), elle ouvre les pages publiées à côté d'elle."""
    from PIL import Image
    shots = DIST / "shots"
    sources, images, sizes = {}, {}, {}
    for n in names:
        sources[n] = (SRC / f"{n}.html").read_text(encoding="utf-8")
        for f in sorted(shots.glob(f"{n}-*.webp")):
            images[f.stem] = "data:image/webp;base64," + base64.b64encode(f.read_bytes()).decode()
            sizes[f.stem] = list(Image.open(f).size)
    html = (SRC / "planche.html").read_text(encoding="utf-8")
    data = {"web": True, "pages": names} if web else {"D": dict(D, photos=photo_urls), "sources": sources}
    payload = json.dumps(dict(data, images=images, sizes=sizes), ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    html = html.replace("/*__PLANCHE__*/null", payload)
    if web:
        html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n' + NOINDEX, 1)
    out = dest or DIST / "maquettes.html"
    out.write_text(html, encoding="utf-8")
    print(f"wrote {out.relative_to(ROOT)} ({out.stat().st_size / 1024:.0f} Ko), {len(images)} captures")


if __name__ == "__main__":
    main()
