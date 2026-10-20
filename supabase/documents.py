"""Range dans la base les documents de la compagnie copiés depuis son Google Drive (data/documents.json).

    python3 supabase/documents.py --essai     ce qui serait envoyé, sans rien écrire
    python3 supabase/documents.py             envoie les fichiers et inscrit les documents

Chaque document de data/documents.json désigne un fichier de private/drive/ (copié depuis le dossier « CRESCITE
SPECTACLES » du Drive, jamais versionné) :
  - pour = 'pros' ou 'scolaires' : un fichier public (stockage « crescite », sous documents/), que le site propose en
    téléchargement sur la page « Je souhaite programmer » ou sur celle des établissements. Il faut pour cela le
    troisième script SQL (20261022_crescite_notifications.sql : le stockage public accepte les PDF, et les documents
    peuvent être pour les pros ou les scolaires) ; tant qu'il n'est pas passé, ces documents attendent ;
  - pour = 'equipe' : un fichier privé (stockage « crescite-equipe »), lu par l'équipe du spectacle seulement.
Un fichier déjà envoyé est remplacé (nouvelle version) ; un document déjà inscrit n'est pas inscrit deux fois, et son
titre n'est pas réécrit (l'administration a pu le changer). Un fichier absent de private/drive/ est signalé et sauté.
"""
import json
import sys
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from importer import ErreurAPI, api  # noqa: E402

DOCUMENTS = json.loads((ROOT / "data" / "documents.json").read_text(encoding="utf-8"))["documents"]
DRIVE = ROOT / "private" / "drive"
PUBLICS = ("pros", "scolaires")


def stockage(d):
    """Le dossier de stockage d'un document : public pour les pros et les scolaires, privé pour l'équipe."""
    return "crescite" if d["pour"] in PUBLICS else "crescite-equipe"


def publics_acceptes():
    """Le troisième script SQL est passé : le stockage public accepte les PDF."""
    try:
        b = api("GET", "/storage/v1/bucket/crescite")
    except ErreurAPI:
        return False
    return "application/pdf" in (b.get("allowed_mime_types") or [])


def main():
    essai = "--essai" in sys.argv
    spectacles = {s["slug"]: s["id"] for s in api("GET", "/rest/v1/crescite_spectacles?select=id,slug")}
    publics = publics_acceptes()
    if not publics:
        print("Le stockage public n'accepte pas encore les PDF : lancer d'abord le troisième script SQL "
              "(20261022_crescite_notifications.sql). Les documents publics attendent ; ceux de l'équipe passent.")
    envoyes, inscrits, attente = set(), 0, 0
    for d in DOCUMENTS:
        f = DRIVE / d["source"]
        if d["spectacle"] not in spectacles:
            print(f"spectacle inconnu dans la base : {d['spectacle']} ({d['titre']})")
            continue
        if not f.exists():
            print(f"absent de private/drive/ : {d['source']} ({d['spectacle']}, {d['titre']})")
            continue
        if d["pour"] in PUBLICS and not publics:
            attente += 1
            continue
        bucket, chemin = stockage(d), d["chemin"]
        if essai:
            print(f"{bucket}/{chemin}  ←  {d['source']}  [{d['pour']}, {d['type']}] « {d['titre']} »")
            continue
        if (bucket, chemin) not in envoyes:      # un même fichier peut servir deux documents (pros et scolaires)
            api("POST", f"/storage/v1/object/{bucket}/{quote(chemin)}", f.read_bytes(),
                {"Content-Type": "application/pdf", "x-upsert": "true", "Cache-Control": "max-age=3600"})
            envoyes.add((bucket, chemin))
        deja = api("GET", f"/rest/v1/crescite_documents?select=id&spectacle_id=eq.{spectacles[d['spectacle']]}"
                          f"&fichier=eq.{quote(chemin)}&pour=eq.{d['pour']}")
        if not deja:
            api("POST", "/rest/v1/crescite_documents",
                {"spectacle_id": spectacles[d["spectacle"]], "type": d["type"], "titre": d["titre"], "fichier": chemin,
                 "pour": d["pour"], "ordre": d["ordre"]}, {"Prefer": "return=minimal"})
            inscrits += 1
    if not essai:
        print(f"{len(envoyes)} fichiers envoyés, {inscrits} documents inscrits"
              + (f", {attente} documents publics en attente du troisième script SQL" if attente else ""))


if __name__ == "__main__":
    try:
        main()
    except ErreurAPI as e:
        sys.exit(f"La base a refusé : {e}")
