"""Écrire dans la base de la compagnie, et seulement là : les tables crescite_… et les stockages de la compagnie.

C'est l'outil par lequel Claude met à jour la base quand on le lui demande (une distribution, une photo, une date) ; la
règle qui l'y autorise est dans .claude/settings.json. Les tables personnelles du projet (celles d'adrienvada.fr) sont
hors d'atteinte, et rien ne se modifie ni ne se retire sans filtre.

    python3 supabase/ecrire.py modifier <table> "<filtre>" '<json>'          modifier des lignes
    python3 supabase/ecrire.py ajouter  <table> '<json ou liste>' [colonnes]  ajouter des lignes ; avec des colonnes
                                                                            (« spectacle_id,personne_id »), une ligne
                                                                            qui existe déjà est mise à jour
    python3 supabase/ecrire.py retirer  <table> "<filtre>"                   retirer des lignes
    python3 supabase/ecrire.py envoyer  <stockage> <chemin> <fichier>        déposer un fichier (remplace l'ancien)
    python3 supabase/ecrire.py appeler  <fonction> '<json>'                  appeler une fonction crescite_ de la base

Le filtre s'écrit comme dans l'API du projet : « id=eq.88 », « slug=eq.imaginaire-force&categorie=eq.jeu ».
--essai montre la requête sans l'envoyer. La clé vient de SUPABASE_CLE_SERVICE, ou du proxy de la session de travail.
"""
import json
import mimetypes
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import quote

URL = os.environ.get("SUPABASE_URL", "https://omekkqjinvppadsoinvj.supabase.co")
CLE = os.environ.get("SUPABASE_CLE_SERVICE")
TABLE = re.compile(r"^crescite_[a-z0-9_]+$")
STOCKAGES = {"crescite", "crescite-equipe", "crescite-pro"}
FILTRE = re.compile(r"^[a-z0-9_]+=(not\.)?(eq|neq|gt|gte|lt|lte|like|ilike|is|in|cs|cd)\.[^&]+(&[a-z0-9_]+=(not\.)?(eq|neq|gt|gte|lt|lte|like|ilike|is|in|cs|cd)\.[^&]+)*$")


def refuser(message):
    sys.exit(f"refusé : {message}")


def lire_json(texte):
    try:
        return json.loads(texte)
    except json.JSONDecodeError as e:
        refuser(f"JSON illisible ({e})")


def table(nom):
    if not TABLE.match(nom):
        refuser(f"« {nom} » n'est pas une table de la compagnie (crescite_…)")
    return nom


def filtre(f):
    if not FILTRE.match(f):
        refuser(f"filtre « {f} » : il en faut un, de la forme colonne=eq.valeur")
    return f


def envoyer(methode, chemin, corps=None, entetes=None, essai=False):
    h = {"Content-Type": "application/json", "Accept": "application/json", "Prefer": "return=representation"}
    if CLE:
        h.update({"apikey": CLE, "Authorization": f"Bearer {CLE}"})
    h.update(entetes or {})
    data = corps if isinstance(corps, (bytes, type(None))) else json.dumps(corps, ensure_ascii=False).encode()
    if essai:
        apercu = f"{len(data)} octets" if isinstance(corps, bytes) else (data or b"").decode()[:600]
        print(f"essai, rien n'est envoyé : {methode} {chemin}\n{apercu}")
        return None
    req = urllib.request.Request(URL + chemin, data=data, method=methode, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            txt = r.read().decode()
    except urllib.error.HTTPError as e:
        sys.exit(f"{methode} {chemin} : {e.code} {e.read().decode()[:600]}")
    reponse = json.loads(txt) if txt.strip() else None
    if isinstance(reponse, list):
        print(f"{methode} {chemin} : {len(reponse)} ligne{'s' if len(reponse) > 1 else ''}")
    print(json.dumps(reponse, ensure_ascii=False, indent=1)[:4000] if reponse is not None else "fait")
    return reponse


def main(args):
    essai = "--essai" in args
    a = [x for x in args if x != "--essai"]
    if not a:
        sys.exit(__doc__)
    action, reste = a[0], a[1:]
    if action == "modifier" and len(reste) == 3:
        corps = lire_json(reste[2])
        if not isinstance(corps, dict) or not corps:
            refuser("modifier attend un objet JSON, avec au moins un champ")
        return envoyer("PATCH", f"/rest/v1/{table(reste[0])}?{filtre(reste[1])}", corps, essai=essai)
    if action == "ajouter" and len(reste) in (2, 3):
        corps = lire_json(reste[1])
        if not isinstance(corps, (dict, list)) or not corps:
            refuser("ajouter attend un objet JSON ou une liste")
        chemin, entetes = f"/rest/v1/{table(reste[0])}", None
        if len(reste) == 3:
            if not re.match(r"^[a-z0-9_]+(,[a-z0-9_]+)*$", reste[2]):
                refuser(f"colonnes « {reste[2]} » : des noms séparés par des virgules")
            chemin += f"?on_conflict={reste[2]}"
            entetes = {"Prefer": "return=representation,resolution=merge-duplicates"}
        return envoyer("POST", chemin, corps, entetes, essai=essai)
    if action == "retirer" and len(reste) == 2:
        return envoyer("DELETE", f"/rest/v1/{table(reste[0])}?{filtre(reste[1])}", essai=essai)
    if action == "envoyer" and len(reste) == 3:
        stockage, chemin, fichier = reste
        if stockage not in STOCKAGES:
            refuser(f"« {stockage} » n'est pas un stockage de la compagnie ({', '.join(sorted(STOCKAGES))})")
        if ".." in chemin.split("/") or chemin.startswith("/"):
            refuser(f"chemin « {chemin} »")
        f = Path(fichier)
        if not f.is_file():
            refuser(f"fichier introuvable : {fichier}")
        type_ = mimetypes.guess_type(f.name)[0] or "application/octet-stream"
        return envoyer("POST", f"/storage/v1/object/{stockage}/{quote(chemin)}", f.read_bytes(),
                       {"Content-Type": type_, "x-upsert": "true", "Cache-Control": "max-age=3600"}, essai=essai)
    if action == "appeler" and len(reste) == 2:
        if not TABLE.match(reste[0]):
            refuser(f"« {reste[0]} » n'est pas une fonction de la compagnie (crescite_…)")
        return envoyer("POST", f"/rest/v1/rpc/{reste[0]}", lire_json(reste[1]), essai=essai)
    sys.exit(__doc__)


if __name__ == "__main__":
    main(sys.argv[1:])
