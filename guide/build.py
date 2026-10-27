#!/usr/bin/env python3
"""Assemble La Générale, le guide de l'espace de l'équipe.

La source (guide/src/la-generale.html) est une page d'artefact : sans doctype, ni <html>, ni <body>, que l'hébergeur
enveloppe à la publication. Le script remplace <!--PIEUVRE--> par la pieuvre du logo 2.0 (marque/), en symbole SVG, et
écrit guide/dist/la-generale.html (non versionné). Avec --page, il ajoute l'enveloppe pour l'ouvrir telle quelle dans un
navigateur (guide/dist/la-generale-page.html).

Usage :
  python3 guide/build.py
  python3 guide/build.py --page
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "guide" / "src" / "la-generale.html"
DIST = ROOT / "guide" / "dist"
LOGO = ROOT / "marque" / "crescite-logo-2.0-magenta.svg"
# le cadre de la pieuvre seule dans le logo (sans le nom), mesuré par getBBox() sur #octopus
CADRE = "263 351 1017 552"


def symbole():
    svg = LOGO.read_text(encoding="utf-8")
    chemins = re.findall(r'<path id="(?:tentacles|head)-[a-z]+" d="[^"]+"\s*/>', svg)
    if len(chemins) != 4:
        sys.exit(f"le logo n'a pas ses quatre tracés de pieuvre ({len(chemins)} trouvés)")
    chemins = [re.sub(r' id="[^"]+"', "", c) for c in chemins]
    return ('<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>'
            f'<symbol id="pieuvre" viewBox="{CADRE}"><g fill-rule="evenodd">{"".join(chemins)}</g></symbol></defs></svg>')


def main():
    page = SRC.read_text(encoding="utf-8").replace("<!--PIEUVRE-->", symbole(), 1)
    DIST.mkdir(exist_ok=True)
    (DIST / "la-generale.html").write_text(page, encoding="utf-8")
    print(DIST / "la-generale.html")
    if "--page" in sys.argv:
        enveloppe = ('<!doctype html><html lang="fr"><head><meta charset="utf-8">'
                     '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
                     '<style>:root{padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}'
                     'body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style></head><body>')
        (DIST / "la-generale-page.html").write_text(enveloppe + page + "</body></html>", encoding="utf-8")
        print(DIST / "la-generale-page.html")


if __name__ == "__main__":
    main()
