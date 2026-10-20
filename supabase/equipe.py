"""Remplit l'équipe dans la base (après 20261021_crescite_equipe.sql) à partir du dépôt et du dossier privé.

    python3 supabase/equipe.py --essai       ce qui serait écrit, sans rien écrire (détail dans maquettes/dist/)
    python3 supabase/equipe.py               les fiches, les distributions, les déroulés types et les liens vers les textes
    python3 supabase/equipe.py --photos      aussi les photos de private/photos/equipe (registre.json), stockage « crescite »
    python3 supabase/equipe.py --dossiers    aussi le dossier scolaire de Bérénice, dans le stockage privé « crescite-equipe »

Ce qu'il importe : data/equipe.json (les personnes et la distribution de chaque spectacle, d'après les fiches de
crescite.fr et, pour Cassandres, le dossier artistique), un déroulé type de journée de représentation pour chaque
spectacle qui n'en a pas, et pour chaque spectacle tiré d'un texte du domaine public un lien vers ce texte sur
Wikisource. Il n'écrase rien : une fiche, une distribution, un déroulé ou un document déjà là reste tel quel (le travail
de l'administration prime). Les photos ne remplacent pas une photo déjà choisie.

Coordonnées (adresse, téléphone) : jamais ici. L'administration les saisit dans la rubrique Équipe.
"""
import json
import sys
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from importer import ErreurAPI, api  # noqa: E402

EQUIPE = json.loads((ROOT / "data" / "equipe.json").read_text(encoding="utf-8"))
PHOTOS = ROOT / "private" / "photos" / "equipe"
DOSSIERS = ROOT / "private" / "dossiers"

# le déroulé type d'une journée de représentation : minutes avant le lever de rideau (négatif : après la fin)
DEROULE = [
    {"avant_min": 480, "quoi": "Arrivée de la régie, déchargement et montage", "qui": "Technique"},
    {"avant_min": 240, "quoi": "Arrivée de l’équipe artistique", "qui": "Jeu"},
    {"avant_min": 180, "quoi": "Raccords", "qui": "Toute l’équipe"},
    {"avant_min": 120, "quoi": "Repas", "qui": "Toute l’équipe"},
    {"avant_min": 60, "quoi": "Préparation : habillage, maquillage, échauffement", "qui": "Jeu"},
    {"avant_min": 30, "quoi": "Ouverture des portes", "qui": ""},
    {"avant_min": -15, "quoi": "Démontage et chargement", "qui": "Technique"},
]

# les textes d'origine, du domaine public
TEXTES = {
    "berenice": ("Bérénice, de Racine", "https://fr.wikisource.org/wiki/Bérénice_(Racine)"),
    "cleophene": ("Rodogune, de Corneille", "https://fr.wikisource.org/wiki/Rodogune"),
    "ci-gisait-cyrano": ("Cyrano de Bergerac, d’Edmond Rostand", "https://fr.wikisource.org/wiki/Cyrano_de_Bergerac_(Rostand)"),
    "imaginaire-force": ("Le Mariage forcé, de Molière", "https://fr.wikisource.org/wiki/Le_Mariage_forcé"),
    "macbeth-fatum": ("Macbeth, de Shakespeare (traductions)", "https://fr.wikisource.org/wiki/Macbeth"),
    "mon-royaume": ("Roméo et Juliette, de Shakespeare (traductions)", "https://fr.wikisource.org/wiki/Roméo_et_Juliette"),
}

# les dossiers de la compagnie destinés à l'équipe : (spectacle, fichier privé, chemin dans le stockage, titre)
DOSSIERS_EQUIPE = [("berenice", "Dossier_BERENICE_scolaire_2026.pdf", "berenice/dossier-scolaire-2026.pdf", "Dossier scolaire 2026")]


def lignes_equipe(spectacles):
    """Les fiches et les distributions à écrire, d'après data/equipe.json (spectacle : slug → identifiant)."""
    personnes = [{"slug": p["slug"], "prenom": p["prenom"], "nom": p["nom"], "metiers": p["metiers"], "ordre": (i + 1) * 10}
                 for i, p in enumerate(EQUIPE["personnes"])]
    distributions = []
    for slug, lignes in EQUIPE["distributions"].items():
        if slug not in spectacles:
            print(f"  (spectacle absent de la base : {slug})")
            continue
        for i, x in enumerate(lignes):
            distributions.append({"spectacle_id": spectacles[slug], "_personne": x["personne"], "categorie": x["categorie"],
                                  "fonction": x.get("fonction", ""), "alternance": x.get("alternance"),
                                  "en_tournee": x.get("en_tournee", True), "publie": x.get("publie", True), "ordre": (i + 1) * 10})
    return personnes, distributions


def main():
    essai = "--essai" in sys.argv
    try:
        sp = api("GET", "/rest/v1/crescite_spectacles?select=id,slug,feuille_modele,page&order=ordre")
    except ErreurAPI:
        if not essai:
            raise SystemExit("la base n'a pas encore l'équipe : exécuter d'abord supabase/migrations/20261021_crescite_equipe.sql")
        sp = api("GET", "/rest/v1/crescite_spectacles?select=id,slug,page&order=ordre")
    spectacles = {s["slug"]: s["id"] for s in sp}
    personnes, distributions = lignes_equipe(spectacles)
    deroules = [s["slug"] for s in sp if s["page"] and not s.get("feuille_modele")]
    docs = [{"spectacle_id": spectacles[k], "type": "texte", "titre": f"Le texte d’origine : {t} (Wikisource)", "url": u,
             "pour": "equipe", "ordre": 10} for k, (t, u) in TEXTES.items() if k in spectacles]
    registre = json.loads((PHOTOS / "registre.json").read_text(encoding="utf-8")) if (PHOTOS / "registre.json").exists() else []
    photos = [r for r in registre if r.get("fichier") and (PHOTOS / Path(r["fichier"]).name).exists()]
    if essai:
        out = ROOT / "maquettes" / "dist" / "import-equipe.json"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps({"personnes": personnes, "distributions": distributions, "deroules": deroules,
                                   "documents": docs, "photos": photos}, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"essai : {len(personnes)} fiches, {len(distributions)} lignes de distribution, {len(deroules)} déroulés types, "
              f"{len(docs)} liens vers les textes, {len(photos)} photos ; rien n'est écrit, détail dans {out.relative_to(ROOT)}")
        return

    # les fiches : seulement celles qui manquent
    api("POST", "/rest/v1/crescite_personnes?on_conflict=slug", personnes, {"Prefer": "resolution=ignore-duplicates,return=minimal"})
    ids = {p["slug"]: p["id"] for p in api("GET", "/rest/v1/crescite_personnes?select=id,slug")}
    # une fiche privée vide pour chacune (l'administration y mettra l'adresse et le téléphone)
    api("POST", "/rest/v1/crescite_personnes_privees?on_conflict=personne_id", [{"personne_id": i} for i in ids.values()],
        {"Prefer": "resolution=ignore-duplicates,return=minimal"})
    lignes = [{k: v for k, v in d.items() if k != "_personne"} | {"personne_id": ids[d["_personne"]]} for d in distributions]
    api("POST", "/rest/v1/crescite_distributions?on_conflict=spectacle_id,personne_id,categorie,fonction", lignes,
        {"Prefer": "resolution=ignore-duplicates,return=minimal"})
    for slug in deroules:
        api("PATCH", f"/rest/v1/crescite_spectacles?slug=eq.{slug}", {"feuille_modele": DEROULE}, {"Prefer": "return=minimal"})
    deja = {(d["spectacle_id"], d["url"]) for d in api("GET", "/rest/v1/crescite_documents?select=spectacle_id,url")}
    nouveaux = [d for d in docs if (d["spectacle_id"], d["url"]) not in deja]
    if nouveaux:
        api("POST", "/rest/v1/crescite_documents", nouveaux, {"Prefer": "return=minimal"})
    print(f"{len(ids)} fiches, {len(lignes)} lignes de distribution, {len(deroules)} déroulés types, {len(nouveaux)} liens vers les textes")

    if "--photos" in sys.argv:
        actuelles = {p["slug"]: p["photo"] for p in api("GET", "/rest/v1/crescite_personnes?select=slug,photo")}
        n = 0
        for r in photos:
            if r["slug"] not in ids or actuelles.get(r["slug"]):
                continue
            f = PHOTOS / Path(r["fichier"]).name
            chemin = f"equipe/{r['slug']}.webp"
            api("POST", f"/storage/v1/object/crescite/{chemin}", f.read_bytes(),
                {"Content-Type": "image/webp", "x-upsert": "true", "Cache-Control": "max-age=3600"})
            credit = f"© {r['credit']}" if r.get("credit") else None
            # montrée sur le site seulement si l'identité est sûre (la page source cite la compagnie ou un de ses
            # spectacles) et si c'est un vrai portrait ; les autres attendent l'accord de l'administration
            publique = r.get("confiance") == "sure" and r["slug"] not in EQUIPE.get("photos_pas_publiees", {})
            api("PATCH", f"/rest/v1/crescite_personnes?slug=eq.{r['slug']}",
                {"photo": chemin, "photo_credit": credit, "photo_source": r.get("page_source"), "photo_publique": publique},
                {"Prefer": "return=minimal"})
            n += 1
        print(f"{n} photos envoyées dans le stockage « crescite » (equipe/)")

    if "--dossiers" in sys.argv:
        for slug, fichier, chemin, titre in DOSSIERS_EQUIPE:
            f = DOSSIERS / fichier
            if not f.exists() or slug not in spectacles:
                continue
            api("POST", f"/storage/v1/object/crescite-equipe/{quote(chemin)}", f.read_bytes(),
                {"Content-Type": "application/pdf", "x-upsert": "true"})
            if not api("GET", f"/rest/v1/crescite_documents?select=id&fichier=eq.{quote(chemin)}"):
                api("POST", "/rest/v1/crescite_documents", {"spectacle_id": spectacles[slug], "type": "dossier", "titre": titre,
                                                            "fichier": chemin, "pour": "equipe", "ordre": 20}, {"Prefer": "return=minimal"})
            print(f"dossier envoyé : {chemin}")


if __name__ == "__main__":
    try:
        main()
    except ErreurAPI as e:
        raise SystemExit(str(e))
