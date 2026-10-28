#!/usr/bin/env python3
"""Ranger dans le site les polices qu'il chargeait chez Google Fonts (site/polices/), une fois pour toutes.

    python3 scripts/polices.py            télécharge les polices de FAMILLES et leurs licences, écrit site/polices/polices.css

Le site, l'administration, l'espace de l'équipe, celui des salles et la page de réponse lisent alors leurs polices à côté
d'eux (polices/polices.css, que site/build.py copie dans site/dist/ et dans docs/) : aucune requête vers Google à la
visite, rien à attendre d'un autre service, et le site marche tel quel chez n'importe quel hébergeur.

Ne garde que l'alphabet latin et le latin étendu (le français, les noms propres d'Europe) : le reste (cyrillique, grec,
vietnamien) prend la police du système. Le navigateur ne télécharge un fichier que si la page s'en sert (unicode-range,
et seulement les familles et les graisses employées).

Une nouvelle police (un nouvel univers de spectacle : univers.polices.titre) : l'ajouter à FAMILLES, avec ses graisses,
relancer, puis python3 site/build.py. Sans elle dans FAMILLES, le titre prend la police de secours (var(--serif)).
Ce script est le seul à joindre Google Fonts ; le build, lui, n'a besoin d'aucun réseau.
"""
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / "site" / "polices"

# famille → ses graisses, au format de l'adresse de Google Fonts (css2), et le dossier de sa licence dans google/fonts.
# Les polices de la charte (Ubuntu, Open Sans, Raleway), puis la police de titre de chaque univers (data/univers-spectacles.json).
FAMILLES = {
    "Ubuntu": ("ital,wght@0,400;0,500;0,700;1,500", "ufl/ubuntu/UFL.txt"),
    "Open Sans": ("ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400", "ofl/opensans/OFL.txt"),
    "Raleway": ("wght@600;700;800", "ofl/raleway/OFL.txt"),
    "Space Grotesk": ("wght@500;600", "ofl/spacegrotesk/OFL.txt"),
    "Cormorant Garamond": ("wght@500;600", "ofl/cormorantgaramond/OFL.txt"),
    "Bodoni Moda": ("wght@700", "ofl/bodonimoda/OFL.txt"),
    "Anton": ("", "ofl/anton/OFL.txt"),
    "Grenze Gotisch": ("wght@600", "ofl/grenzegotisch/OFL.txt"),
    "IM Fell English": ("ital@0;1", "ofl/imfellenglish/OFL.txt"),
    "IM Fell French Canon": ("ital@0;1", "ofl/imfellfrenchcanon/OFL.txt"),
}
SOUS_ENSEMBLES = ("latin", "latin-ext")
# (Google Fonts ne sert le WOFF2 qu'à un navigateur récent)
NAVIGATEUR = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
LICENCES = "https://raw.githubusercontent.com/google/fonts/main/"


def lire(url, essais=4):
    req = urllib.request.Request(url, headers={"User-Agent": NAVIGATEUR})
    for n in range(essais):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except (OSError, ConnectionError) as e:
            # (une coupure du réseau : on attend 2, 4, puis 8 secondes ; une adresse fausse, elle, échoue aussitôt)
            if getattr(e, "code", None) or n == essais - 1:
                raise
            time.sleep(2 ** (n + 1))


def nom_court(famille):
    return re.sub(r"[^a-z0-9]+", "-", famille.lower()).strip("-")


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    (DEST / "licences").mkdir(exist_ok=True)
    anciens = {f for f in DEST.glob("*.woff2")}
    faits, css, poids = {}, [], 0
    for famille, (axes, licence) in FAMILLES.items():
        q = urllib.parse.quote(famille).replace("%20", "+") + (f":{axes}" if axes else "")
        feuille = lire(f"https://fonts.googleapis.com/css2?family={q}&display=swap").decode("utf-8")
        # chaque bloc : /* sous-ensemble */ @font-face { … }
        blocs = [(sous, bloc, re.search(r"url\((https://[^)]+\.woff2)\)", bloc).group(1))
                 for sous, bloc in re.findall(r"/\*\s*([a-z-]+)\s*\*/\s*(@font-face\s*\{[^}]*\})", feuille) if sous in SOUS_ENSEMBLES]
        if not blocs:
            sys.exit(f"{famille} : Google Fonts n'a rendu ni latin ni latin étendu")
        # une police variable sert plusieurs graisses d'un seul fichier : son nom dit la plage (open-sans-300-800-latin)
        graisses = {}
        for _, bloc, url in blocs:
            graisses.setdefault(url, []).append(int(re.search(r"font-weight:\s*(\d+)", bloc).group(1)))
        for sous, bloc, url in blocs:
            if url not in faits:
                g = graisses[url]
                style = re.search(r"font-style:\s*(\w+)", bloc).group(1)
                f = (f"{nom_court(famille)}-{min(g)}{f'-{max(g)}' if max(g) > min(g) else ''}"
                     f"{'-italique' if style == 'italic' else ''}-{sous}.woff2")
                octets = lire(url)
                (DEST / f).write_bytes(octets)
                anciens.discard(DEST / f)
                faits[url] = f
                poids += len(octets)
            css.append(f"/* {famille}, {sous} */\n" + bloc.replace(url, faits[url]).strip())
        (DEST / "licences" / f"{nom_court(famille)}.txt").write_bytes(lire(LICENCES + licence))
        print(f"{famille} : {sum(1 for f in faits.values() if f.startswith(nom_court(famille) + '-'))} fichier(s)")
    for f in anciens:
        f.unlink()
    (DEST / "polices.css").write_text(
        "/* Écrit par scripts/polices.py : les polices du site, rangées à côté de lui (aucune requête vers Google Fonts).\n"
        "   Latin et latin étendu seulement ; le navigateur ne télécharge que les fichiers dont la page se sert.\n"
        "   Licences : licences/ (SIL Open Font License 1.1 ; Ubuntu Font Licence 1.0 pour Ubuntu). */\n"
        + "\n".join(css) + "\n", encoding="utf-8")
    print(f"site/polices/ : {len(faits)} fichiers, {poids / 1024:.0f} Ko")


if __name__ == "__main__":
    main()
