#!/usr/bin/env python3
"""Publier le site de la compagnie (docs/) sur Cloudflare Pages, sans passer par GitHub.

    python3 scripts/cloudflare.py            publie docs/ en production, puis vérifie que l'accueil servi, sur l'adresse
                                             du projet et sur chacun de ses domaines, est bien celui de docs/
    python3 scripts/cloudflare.py --essai    montre le projet, sa branche de production et ses domaines, sans rien envoyer

La clé vient de l'environnement, jamais du dépôt ni d'une conversation : CLOUDFLARE_API_TOKEN (une clé du compte de la
compagnie, « Cloudflare Pages : Modifier ») et CLOUDFLARE_ACCOUNT_ID. Le projet est le seul du compte, ou celui que nomme
CLOUDFLARE_PROJET. Les adresses ne sont écrites nulle part ici : elles viennent du projet lui-même.

L'envoi passe par wrangler, à une version fixée (WRANGLER). Il se fait sur la branche de production du projet, lue dans
le projet : sur une autre branche, ce ne serait qu'un aperçu. Les en-têtes (docs/_headers, écrit par site/build.py)
partent avec le site.
"""
import hashlib
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
WRANGLER = "wrangler@4.149.0"
API = "https://api.cloudflare.com/client/v4"


def api(chemin):
    req = urllib.request.Request(API + chemin, headers={"Authorization": f"Bearer {os.environ['CLOUDFLARE_API_TOKEN']}"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            d = json.load(r)
    except urllib.error.HTTPError as e:
        try:
            d = json.load(e)
        except ValueError:
            sys.exit(f"Cloudflare : réponse {e.code}")
    if not d.get("success"):
        erreurs = d.get("errors", [])
        # (6003, 6111, 9106 : ce qui est dans CLOUDFLARE_API_TOKEN n'a pas la forme d'une clé)
        forme = any(x.get("code") in (6003, 6111, 9106) for x in erreurs)
        sys.exit("Cloudflare refuse : " + "; ".join(f"{x.get('message')} ({x.get('code')})" for x in erreurs)
                 + ("\n(une clé Cloudflare fait une quarantaine de caractères : c'est sa valeur, montrée une seule fois à"
                    " sa création, qui va dans CLOUDFLARE_API_TOKEN, pas son nom)" if forme else ""))
    return d["result"]


def empreinte(octets):
    return hashlib.md5(octets).hexdigest()


def servi(url):
    try:
        # (Cloudflare répond 403 au User-Agent par défaut de Python)
        req = urllib.request.Request(url, headers={"Cache-Control": "no-cache", "User-Agent": "crescite-publication"})
        with urllib.request.urlopen(req, timeout=30) as r:
            return empreinte(r.read())
    except Exception as e:
        return f"injoignable ({e})"


def main():
    essai = "--essai" in sys.argv[1:]
    manque = [v for v in ("CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID") if not os.environ.get(v)]
    if manque:
        sys.exit(f"Manque dans l'environnement : {', '.join(manque)} (réglages de l'environnement, jamais la conversation)")
    if not (DOCS / "index.html").exists() or not (DOCS / "_headers").exists():
        sys.exit("docs/ n'est pas construit : python3 site/build.py --pages")
    compte = os.environ["CLOUDFLARE_ACCOUNT_ID"]
    projets = api(f"/accounts/{compte}/pages/projects")
    nom = os.environ.get("CLOUDFLARE_PROJET") or (projets[0]["name"] if len(projets) == 1 else None)
    if not nom:
        sys.exit(f"{len(projets)} projets dans le compte : nommer le bon dans CLOUDFLARE_PROJET")
    p = api(f"/accounts/{compte}/pages/projects/{nom}")
    branche, adresses = p["production_branch"], [p["subdomain"], *p.get("domains", [])]
    print(f"projet : {nom} | branche de production : {branche} | adresses : {', '.join(dict.fromkeys(adresses))}")
    if essai:
        print(f"docs/ : {sum(1 for f in DOCS.rglob('*') if f.is_file())} fichiers ; rien n'est envoyé (--essai)")
        return
    tete = subprocess.run(["git", "-C", str(ROOT), "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
    sujet = subprocess.run(["git", "-C", str(ROOT), "log", "-1", "--format=%s"], capture_output=True, text=True).stdout.strip()
    env = {**os.environ, "WRANGLER_SEND_METRICS": "false"}
    r = subprocess.run(["npx", "--yes", WRANGLER, "pages", "deploy", str(DOCS), f"--project-name={nom}", f"--branch={branche}",
                        f"--commit-hash={tete}", f"--commit-message={sujet[:300]}", "--commit-dirty=true"], env=env)
    if r.returncode:
        sys.exit(f"wrangler a échoué ({r.returncode})")
    attendu = empreinte((DOCS / "index.html").read_bytes())
    for a in dict.fromkeys(adresses):
        e = servi(f"https://{a}/")
        print(f"{a} : {'à jour' if e == attendu else e if e.startswith('injoignable') else 'autre version (cache : réessayer)'}")


if __name__ == "__main__":
    main()
