#!/usr/bin/env python3
"""Assemble les dix maquettes de la partie publique, la synthèse, et la planche qui les présente par onglets.

Chaque maquette est un fichier maquettes/src/mNN.html qui lit ses contenus dans l'objet D : le texte exact de
crescite.fr (D.site, D.shows, D.dates, D.saisons), le logo, les photos et la carte des tournées. Le script remplace
/*__DATA__*/null par ces données et ajoute juste après les outils communs (OUTILS) : les lignes d'agenda, les données
vivantes, la carte des tournées, l'ouverture sur le logo, l'édition sur place, le dossier PDF, les frises
chronologiques, le mouvement et les tentacules (maquettes/src/*.js).

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
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "maquettes" / "src"
DIST = ROOT / "maquettes" / "dist"
PRIVATE = ROOT / "private"
# la marque (le logo 2.0 et le tracé de ses bras) est versionnée dans marque/ : toute copie du dépôt (un agent, un autre
# poste) construit et publie le vrai logo. private/brand/ reste lu si marque/ manque.
MARQUE = ROOT / "marque"
LOGO = "crescite-logo-2.0.svg"


def fichier_marque(nom):
    """Un fichier de la marque : dans marque/, sinon dans private/brand/ ; None s'il n'est nulle part."""
    for d in (MARQUE, PRIVATE / "brand"):
        if (d / nom).exists():
            return d / nom
    return None


def fichier_photo(rel):
    """Une photo des spectacles : dans private/photos/, sinon parmi celles déjà publiées (docs/photos/, versionnées) ;
    None si elle n'est nulle part."""
    for d in (PRIVATE / "photos", ROOT / "docs" / "photos"):
        if (d / rel).exists():
            return d / rel
    return None

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


def _lum(h):
    h = h.lstrip("#")
    f = lambda c: c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4
    r, g, b = (f(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4))
    return .2126 * r + .7152 * g + .0722 * b


def theme():
    """Le thème du site (règle 22 du contrat) : la création la plus récente colore tout le site, logo compris (« le
    dernier spectacle de la saison colore le thème complet », Angelo Jossec ; aujourd'hui Cassandres). → {slug, couleur
    (assez sombre pour un texte sur fond clair et une pieuvre blanche dessus : la tache du logo), vive (sur fond sombre)}."""
    site = json.loads((ROOT / "data" / "site-crescite.json").read_text(encoding="utf-8"))
    cass = json.loads((ROOT / "data" / "cassandres.json").read_text(encoding="utf-8"))
    U = json.loads((ROOT / "data" / "univers-spectacles.json").read_text(encoding="utf-8"))["spectacles"]
    annees = {s: int(re.search(r"\d{4}", sp["creation"]).group()) for s, sp in site["spectacles"].items() if sp.get("creation")}
    annees["cassandres"] = int(re.search(r"\d{4}", cass["creation"]).group())
    slug = max((s for s in annees if s in U), key=lambda s: (annees[s], s))
    c = U[slug]["univers"]["couleurs"]
    contraste = lambda a: 1.05 / (_lum(a) + .05)                 # contre le blanc
    # la tache : l'accent s'il porte une pieuvre blanche (4,5:1), sinon la couleur du spectacle assombrie jusque-là
    couleur = c["accent"] if contraste(c["accent"]) >= 4.5 else None
    if couleur is None:
        h = c["scene"].lstrip("#"); rgb = [int(h[i:i + 2], 16) for i in (0, 2, 4)]
        k = 1.0
        while True:
            couleur = "#" + "".join(f"{round(v * k):02x}" for v in rgb)
            if contraste(couleur) >= 4.5 or k < .2: break
            k -= .02
    vive = next((x for x in (c["scene"], c["accent2"], c["accent"]) if (_lum(x) + .05) / (_lum("#14070f") + .05) >= 4.5), c["texte"])
    return {"slug": slug, "couleur": couleur, "vive": vive}


def logo_variants():
    path = fichier_marque(LOGO)
    if path:
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
    tache = theme()["couleur"]
    return {
        # les tracés de la pieuvre seule (coordonnées du dessin 1536 px), pour les maquettes qui la dessinent elles-mêmes
        "octopusPaths": [d_of(k) for k in ("tentacles-left", "head-left", "head-right", "tentacles-right")],
        # le mot « crescite » et la tache magenta, seuls (pour l'ouverture, qui les anime séparément)
        "motPath": word, "tachePath": blob,
        # la pieuvre seule, couleur du texte (CSS color)
        "octopus": svg("250 340 1042 576", f'<g fill="currentColor" fill-rule="evenodd">{octo}</g>', "Crescite"),
        # la pieuvre et le mot « crescite », couleur du texte
        "octopusWord": svg("250 340 1042 780", f'<g fill="currentColor" fill-rule="evenodd">{octo}<path d="{word}"/></g>', "Crescite"),
        # le logo complet : la tache (à la couleur du thème, règle 22 : plus de magenta), la pieuvre blanche, le mot
        "full": svg("63 65 1408 1405", f'<path class="logo-tache" fill="{tache}" d="{blob}"/><g fill="#fff" fill-rule="evenodd">{octo}<path d="{word}"/></g>', "Crescite"),
        # la marque : la tache et la pieuvre blanche, sans le mot (favicon, petit format)
        "mark": svg("63 65 1408 1405", f'<path class="logo-tache" fill="{tache}" d="{blob}"/><g fill="#fff" fill-rule="evenodd">{octo}</g>', "Crescite"),
    }


def arms_data():
    """Le tracé des huit bras (privé) ; sans lui, celui de la pieuvre de substitution."""
    f = fichier_marque("crescite-logo-2.0-arms.json")
    if f and fichier_marque(LOGO):
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
        out[slug] = (fichier_photo(f"{slug}.webp"), titre)
    for s in shows:
        for p in s["photos"]:
            out[p["cle"]] = (fichier_photo(f"{p['cle']}.webp"), s["titre"])
    for i in range(1, 5):
        out[f"actions-culturelles/g-{i}"] = (fichier_photo(f"actions-culturelles/g-{i}.webp"), "Actions culturelles")
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

# Les communes des saisons anciennes et des tournées scolaires : coordonnées approchées, pour la carte.
COMMUNES_EN_PLUS = {
    "Loiron|53": (48.067, -0.933), "Conches-en-Ouche|27": (48.958, 0.940), "Bellac|87": (46.122, 1.049),
    "Vitrolles|13": (43.460, 5.248), "Istres|13": (43.513, 4.988), "Grand-Quevilly|76": (49.409, 1.039),
    "Lunéville|54": (48.589, 6.496), "Cholet|49": (47.060, -0.879), "Hénin-Beaumont|62": (50.421, 2.951),
    "Mayenne|53": (48.303, -0.614), "Alençon|61": (48.432, 0.091), "Oissel|76": (49.342, 1.094),
    "Vernouillet|28": (48.721, 1.360), "Avignon|84": (43.949, 4.806), "Corbie|80": (49.909, 2.509),
    "Avranches|50": (48.684, -1.357), "Saint-Omer|62": (50.767, 2.265), "Gacé|61": (48.795, 0.296),
    "Pont-Audemer|27": (49.355, 0.515),
    # Communes des tournées scolaires et historiques
    "Amfreville|76": (49.403, 1.130), "Amfreville-la-Mivoie|76": (49.403, 1.130),
    "Amiens|80": (49.894, 2.295), "Argences|14": (49.126, -0.167),
    "Argentan|61": (48.744, -0.018), "Arques|62": (50.733, 2.300),
    "Aunay sur Odon et Vieux|14": (49.020, -0.631), "Aunay-sur-Odon|14": (49.020, -0.631),
    "Beaumont-Hague|50": (49.664, -1.836), "Bocage Mayennais|53": (48.433, -0.617),
    "Bourgtheoulde|27": (49.299, 0.873), "Bourgtheoulde|76": (49.299, 0.873),
    "Bourgtheroulde|27": (49.299, 0.873), "Bourgtheroulede|27": (49.299, 0.873),
    "Grand-Bourgtheroulde|27": (49.299, 0.873),
    "Bussy St-Martin|77": (48.850, 2.688), "Chartres|28": (48.443, 1.489),
    "Cherbourg|50": (49.633, -1.622), "Château-Arnoux|04": (44.093, 6.009),
    "Compiègnes|60": (49.417, 2.826), "Compiègne|60": (49.417, 2.826),
    "Craon|53": (47.848, -0.954), "Elbeuf|76": (49.291, 1.008),
    "Evreux|27": (49.024, 1.150), "Fauville en Caux|76": (49.654, 0.589),
    "Franqueville St-Pierre|76": (49.401, 1.178), "Gaillon|27": (49.161, 1.332),
    "Gd-Quevilly|76": (49.409, 1.039), "Le Grand-Quevilly|76": (49.409, 1.039),
    "Gonfreville|76": (49.499, 0.231), "Granville et Coutance|50": (48.837, -1.597),
    "Grigny|91": (48.653, 2.383), "Harfleur|76": (49.507, 0.200),
    "Honfleur|14": (49.418, 0.233), "Hérouville Saint-Clair|14": (49.204, -0.326),
    "Isneauville|76": (49.498, 1.144), "La Réunion|97": (-20.882, 55.450),
    "Le Kef|99": (36.174, 8.705), "Le Pré-St-Gervais|93": (48.883, 2.404),
    "Le Sillon|76": (49.387, 1.054), "Le Tréport|76": (50.060, 1.372),
    "Les Andelys|27": (49.247, 1.424), "Leuze|99": (50.598, 3.619),
    "Lignières-Châtelain|80": (49.774, 1.862), "Lisieux|14": (49.145, 0.227),
    "Machecoul|44": (46.994, -1.821), "Manneville S/Risle|27": (49.356, 0.540),
    "Monfort-sur-Meu|35": (48.138, -1.956), "Monfort-sur-Risle|27": (49.298, 0.665),
    "Mézières-en-Vexin|27": (49.170, 1.503), "Passais Village|61": (48.518, -0.755),
    "Pré-en-Pail|53": (48.460, -0.202), "Saint Mars La Jaille|44": (47.525, -1.184),
    "Saint-Omer / Arques|62": (50.767, 2.265), "Saint-Sever|14": (48.841, -1.049),
    "Sainte-Adresse|76": (49.507, 0.082), "St-Etienne du Rouvray|76": (49.378, 1.104),
    "St-Romain de Colbosc|76": (49.530, 0.357), "St-Valéry en Caux|76": (49.870, 0.710),
    "Trun|61": (48.844, 0.033), "Val de Reuil|27": (49.273, 1.209),
    "Warneton|99": (50.752, 2.952), "Yerville|76": (49.648, 0.898),
    "Yverdon-les-Bains|99": (46.778, 6.641),
}

# Les trois entrées, la navigation première : le site se lit selon qui le visite. Chacune a sa page, et chaque page
# de spectacle se lit dans l'une des trois. L'espace pro à mot de passe disparaît : « Je souhaite programmer » le
# remplace, ouvert à tous ; les actions culturelles passent dans « Je représente un établissement scolaire ».
# (v4, règle 21 du contrat) Les trois entrées ne sont plus la navigation : elles restent les trois onglets de la page d'un
# spectacle en tournée ; les pages générales « programmer » et « établissement » vivent dans l'espace pro, et « voir »
# dans les saisons.
ENTREES = [
    {"cle": "voir", "texte": "Je viens voir un spectacle", "court": "Voir un spectacle", "href": "#/saisons",
     "couleur": "#c2306f", "couleurVive": "#f07ab6"},
    {"cle": "programmer", "texte": "Je souhaite programmer", "court": "Programmer", "href": "#/espace-pro/programmer",
     "couleur": "#8a6410", "couleurVive": "#e8bc5c"},
    {"cle": "etablissement", "texte": "Je représente un établissement scolaire", "court": "Établissement scolaire",
     "href": "#/espace-pro/etablissement", "couleur": "#127a6a", "couleurVive": "#5fd0bd"},
]
# Le menu, toute la navigation première (règle 21) : les saisons, les spectacles, la compagnie, l'espace pro. « Contact »
# reste dans le pied de page (libelles.contact).
MENU = [
    {"cle": "saisons", "id": "saisons", "texte": "Saisons", "court": "Saisons", "href": "#/saisons"},
    {"cle": "spectacles", "id": "spectacles", "texte": "Les spectacles", "court": "Spectacles", "href": "#/spectacles"},
    {"cle": "compagnie", "id": "compagnie", "texte": "La compagnie", "court": "Compagnie", "href": "#/compagnie"},
    {"cle": "espacePro", "id": "espace-pro", "texte": "Espace pro", "court": "Espace pro", "href": "#/espace-pro"},
]
# Les anciennes adresses, à rediriger (#/agenda/<saison> mène à #/saisons/<saison>, par le code des maquettes).
REDIRECTIONS = {"#/voir": "#/saisons", "#/agenda": "#/saisons", "#/programmer": "#/espace-pro/programmer",
                "#/etablissement": "#/espace-pro/etablissement", "#/actions-culturelles": "#/espace-pro/etablissement"}
# Les seuls libellés écrits pour les maquettes : la navigation et les intitulés de rubrique des trois entrées.
LIBELLES = {
    "enTournee": "EN TOURNÉE", "decouvrir": "découvrir", "actuellementEnTournee": "Actuellement en tournée",
    "menu": "Menu", "rechercher": "Rechercher …", "spectacles": "Spectacles", "saison": "Saison", "contact": "Contact",
    # les saisons (règle 21) et la page d'un spectacle qui n'est plus en tournée
    "saisonEnCours": "La saison en cours", "prochainesDates": "Les prochaines dates", "toutesLesDates": "Toutes les dates",
    "saisonsPassees": "Les saisons passées", "bilan": "Le bilan des dates passées",
    "actionsMenees": "Les actions culturelles menées",
    # les chiffres du bilan (le nombre de dates : « dates », de communes, de saisons)
    "communes": "Communes", "saisons": "Saisons",
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
    # les frises chronologiques (règle 15) : le repère du jour
    "aujourdhui": "Aujourd’hui",
    # réserver une date (règle 17, RESERVER) : la carte de réservation, et les noms courts des boutons de date
    # (« ven. 18 déc. », comme AGENDA.court)
    "reserver": "Réserver", "surLeSiteDuLieu": "sur le site du lieu", "horaireAPreciser": "horaire à préciser",
    "reservationAupresDuLieu": "Réservation auprès du lieu", "choisirUneDate": "Choisir une date",
    "joursCourts": JOURSC, "moisCourts": MOISC,
    # les vidéos lues dans le site (règle 18, LECTEUR)
    "lire": "Lire la vidéo", "pleinEcran": "Plein écran", "assombrir": "Assombrir", "rallumer": "Rallumer", "fermer": "Fermer",
    # le jour et la nuit (règle 19, THEME) : le nom du bouton du menu (lecteurs d'écran, bulle), et les deux thèmes
    "modeNuit": "Mode nuit", "jour": "Jour", "nuit": "Nuit",
    "pause": "Pause",   # le bouton qui arrête ce qui bouge de lui-même (l'accueil de la synthèse : les photos, la pieuvre)
    # alertes de proximité (chantier 1)
    "alerteTournee": "Être prévenu du prochain passage",
    "alerteTourneeDesc": "Recevez un courriel dès qu’une représentation est confirmée près de chez vous.",
    "meGeolocaliser": "Me géolocaliser",
    "codePostalOuCommune": "Code postal ou ville",
    "rayonKm": "Rayon",
    "mInscrire": "M’inscrire à l’alerte",
    "tousSpectacles": "Tous les spectacles",
    # ce que l'alerte et la demande de devis répondent : enregistrées dans la base, ou pas (alors on écrit au contact
    # diffusion, D.site.programmation.contact) ; {adresse}, {secteur}, {lien} : ce que la page y met. Une alerte ne compte
    # qu'une fois confirmée depuis le courriel envoyé à l'adresse (onzième script SQL) : la page le dit, rien de plus
    "alerteInscrite": "Alerte enregistrée. Elle s’activera quand vous l’aurez confirmée depuis le courriel envoyé à {adresse} ; vous recevrez alors les dates confirmées dans votre secteur ({secteur}).",
    "alerteNonEnregistree": "Votre inscription n’a pas pu être enregistrée. Écrivez-nous directement :",
    "alerteUsage": "Votre adresse ne sert qu’à cette alerte, et chaque courriel contient un lien pour vous désinscrire.",
    "alerteSecteurInconnu": "Ce secteur est introuvable : indiquez un code postal (5 chiffres), ou utilisez « Me géolocaliser ».",
    "demandeTransmise": "Demande transmise avec succès !",
    "recapitulatifMessagerie": "Vous pouvez également {lien} avec le récapitulatif.",
    "ouvrirMessagerie": "ouvrir votre messagerie",
    "demandeNonEnregistree": "Votre demande n’a pas pu être enregistrée. Écrivez-nous directement, le récapitulatif est prêt :",
    # simulateur de faisabilité & devis (chantier 2)
    "simulateurAccueil": "Simulateur d’accueil & Devis",
    "simulateurDesc": "Testez la faisabilité technique de votre lieu et préparez votre demande de cession en un clic.",
    "faisabilitePlateau": "Faisabilité du plateau",
    "demandeDevis": "Demander une proposition de cession",
    "envoyerDemande": "Envoyer la demande",
    # la demande de proposition de cession (la synthèse) : le spectacle, le lieu et son plateau, les conditions d'accueil du
    # spectacle telles que D les donne, puis le formulaire ; aucun prix, aucun chiffre inventé (les codes des types de lieu
    # sont ceux qu'enregistre la base)
    "devisTitre": "Accueillir un spectacle",
    "devisDesc": "Choisissez un spectacle, décrivez votre lieu, puis demandez une proposition de cession.",
    "devisBadge": "Programmation",
    "devisSpectacle": "Spectacle envisagé", "devisLieu": "Type de lieu",
    "typesLieu": {"theatre": "Théâtre ou scène équipée", "polyvalente": "Salle polyvalente",
                  "etablissement": "Établissement scolaire", "exterieur": "Lieu en extérieur", "autre": "Autre lieu"},
    "devisOuverture": "Ouverture (m)", "devisProfondeur": "Profondeur (m)", "devisHauteur": "Hauteur sous gril (m)",
    "demandeCession": "Demande de proposition de cession",
    "devisStructure": "Structure et ville", "devisContact": "Nom du contact", "devisCourriel": "Courriel",
    "devisTelephone": "Téléphone", "devisPeriode": "Période ou saison envisagée", "devisPrecisions": "Précisions",
    # la convention d'action culturelle (chantier 4)
    "genererConvention": "Convention d'action culturelle (PDF)",
}
# La troupe (règle 20, TROUPE) : toutes les personnes publiées de l'équipe, sur la page de la compagnie, rangées par
# catégories de métiers. Chaque personne paraît dans chaque catégorie de ses métiers. Un métier absent de ces listes (les
# métiers se saisissent librement dans l'administration) est rangé par TROUPE : par ses mots en commun avec les métiers
# connus (les plus rares comptent le plus), puis par les alias (jamais affichés), sinon dans la catégorie « defaut » :
# rien ne se perd. Les titres s'éditent sur place (site.troupe.titre, site.troupe.categories.<i>.titre).
TROUPE = {
    "titre": "La troupe", "defaut": "production",
    "categories": [
        {"cle": "jeu", "titre": "Le jeu", "metiers": ["Jeu"],
         "alias": ["comédien", "comédienne", "acteur", "actrice", "interprète", "chant", "chanteur", "chanteuse", "danse", "marionnette"]},
        {"cle": "mise-en-scene", "titre": "La mise en scène",
         "metiers": ["Mise en scène", "Direction artistique", "Assistanat à la mise en scène", "Collaboration artistique", "Conseil artistique"],
         "alias": ["metteur", "metteuse", "chorégraphie", "regard extérieur", "assistant", "assistante", "direction"]},
        {"cle": "ecriture", "titre": "L’écriture", "metiers": ["Texte", "Traduction"],
         "alias": ["écriture", "auteur", "autrice", "adaptation", "dramaturgie", "dramaturge", "traducteur", "traductrice"]},
        {"cle": "decors", "titre": "Les décors, costumes et accessoires",
         "metiers": ["Scénographie", "Construction des décors", "Accessoires", "Costumes", "Maquillage"],
         "alias": ["décor", "scénographe", "costumière", "costumier", "habillage", "perruques", "coiffure", "construction", "plasticien", "plasticienne"]},
        {"cle": "lumiere-son", "titre": "La lumière et le son",
         "metiers": ["Création lumières", "Régie générale", "Régie", "Régie son", "Création sonore et musicale"],
         "alias": ["lumière", "éclairagiste", "son", "sonore", "musique", "musicien", "musicienne", "vidéo", "régisseur", "régisseuse", "technique", "machiniste"]},
        {"cle": "production", "titre": "La production", "metiers": ["Administration", "Action culturelle"],
         "alias": ["production", "diffusion", "communication", "médiation", "administrateur", "administratrice", "chargé", "chargée", "presse"]},
    ],
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
BASE = "https://omekkqjinvppadsoinvj.supabase.co"
CLE_PUBLIQUE = "sb_publishable_TODW6NdmDly8eR9UxjG-6g_eyAa4gjB"     # la clé publique du site (lecture de ce qui est publié)


def photos_de_la_base():
    """Les photos publiées des personnes, telles que la base les donne au site : {slug: (chemin, crédit)}. Une photo déposée
    par l'administration y a son propre nom de fichier ; None si la base ne répond pas (on garde alors le registre privé)."""
    req = Request(f"{BASE}/rest/v1/crescite_personnes?select=slug,photo,photo_credit&photo_publique=is.true&photo=not.is.null",
                  headers={"apikey": CLE_PUBLIQUE, "Authorization": f"Bearer {CLE_PUBLIQUE}", "Accept": "application/json"})
    for essai in range(3):                                   # un réseau qui hoquette : on réessaie avant de se rabattre
        try:
            with urlopen(req, timeout=30) as r:
                return {x["slug"]: (x["photo"], x.get("photo_credit")) for x in json.loads(r.read().decode())}
        except Exception as e:                               # hors ligne, ou la base refuse : le registre suffit
            erreur = e
    print(f"ATTENTION photos de l'équipe : la base ne répond pas ({erreur}) ; le registre privé sert, ses chemins peuvent être anciens")
    return None


def equipe_data():
    """Les personnes de l'équipe et la distribution de chaque spectacle (data/equipe.json), comme la base les donne au
    site : la photo d'une personne seulement si la base la publie (son chemin et son crédit, lus dans la base au moment de
    construire) ; hors ligne, si elle est montrée d'office (identité sûre dans le registre privé des photos, vrai portrait).
    Elle est servie par le stockage de la base, jamais copiée dans le dépôt."""
    E = json.loads((ROOT / "data" / "equipe.json").read_text(encoding="utf-8"))
    reg = PRIVATE / "photos" / "equipe" / "registre.json"
    sures = {}
    if reg.exists():
        sures = {r["slug"]: r.get("credit") for r in json.loads(reg.read_text(encoding="utf-8"))
                 if r.get("fichier") and r.get("confiance") == "sure" and r["slug"] not in E.get("photos_pas_publiees", {})}
    photos = {slug: (f"equipe/{slug}.webp", f"© {c}" if c else None) for slug, c in sures.items()}
    base = photos_de_la_base()
    if base is not None:                                     # la base décide : une photo déposée, retirée ou rendue privée
        photos = base
    personnes = {p["slug"]: {"prenom": p["prenom"], "nom": p["nom"], "metiers": p["metiers"],
                             "photo": f"{STOCKAGE}/{quote(photos[p['slug']][0])}" if p["slug"] in photos else None,
                             "credit": photos[p["slug"]][1] if p["slug"] in photos else None} for p in E["personnes"]}
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
            if slug not in ORDRE and slug not in site["spectacles"]:
                slug = next((v for k, v in slug_de.items() if _norm(g["titre"]).startswith(k[:12])), None)
            dates = []
            for dt in g["dates"]:
                r = base.get((saison, _norm(dt["ligne"])))
                l = lieu(r["commune"], r["departement"], r["lat"], r["lon"]) if r and r["lat"] is not None else lieu_de_ligne(dt["ligne"], g["sousTitre"])
                lien = dt.get("lien") or next((x["lien"] for x in dt["details"] if x.get("lien")), None)
                texte = " ".join([dt["ligne"]] + [x["texte"] for x in dt["details"]])
                scolaire = dt["scolaire"] if "scolaire" in dt else (r["type"] == "scolaire" if r else bool(re.search(r"scolaire|collège|lycée", texte, re.I)))
                nb_reps = dt.get("nb_representations")
                if nb_reps is None:
                    nb_reps = (r and r.get("nb_representations")) or 0
                dates.append({"ligne": dt["ligne"], "details": dt["details"], "etat": dt.get("etat"), "lien": lien,
                              "iso": r["date_debut"] if r else None, "fin": r["date_fin"] if r else None,
                              "precision": r["precision"] if r else None, "scolaire": scolaire, "l": l,
                              "nb_representations": nb_reps})
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
                "nb_representations": dt.get("nb_representations", 1),
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
    th = theme()
    D = {
        "saison": D_SAISON, "aujourdhui": today,
        "site": {
            "nom": a["coordonnees"]["nom"], "titreSuffixe": "crescite", "accueil": "Accueil",
            "entrees": [dict(e, couleur=th["couleur"], couleurVive=th["vive"]) if e["cle"] == "voir" else e for e in ENTREES],
            "menu": MENU, "redirections": REDIRECTIONS,
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
            # le thème de la saison (règle 22) : les couleurs de la création la plus récente (aujourd'hui Cassandres) ;
            # « couleur » sur fond clair, en texte et sous la pieuvre blanche du logo, « vive » sur fond sombre
            "couleurSaison": th,
            "programmation": {"contact": {"nom": "Barbara Daussy", "role": "Administratrice", "email": "contact@crescite.fr",
                                          "telephone": None}},
            # l'espace pro (#/espace-pro, dans le menu) : trois portes vers les espaces réservés, hors des maquettes
            # (href relatifs au site publié : equipe/, admin/ et pro/ sont à côté des maquettes dans docs/)
            "espacePro": {"titre": "Espace pro", "texte": "Les espaces réservés de la compagnie.", "portes": [
                {"cle": "equipe", "titre": "Comédiens et techniciens", "href": "equipe/",
                 "texte": "Votre tournée, vos horaires, vos feuilles de route et vos documents."},
                {"cle": "salles", "titre": "Programmateurs et directeurs de salle", "href": "pro/",
                 "texte": "Les captations et les documents que la compagnie vous a ouverts."},
                {"cle": "admin", "titre": "Administration", "href": "admin/",
                 "texte": "La gestion du site, des dates, de l’équipe et des feuilles de route."}]},
            # la troupe (#/compagnie, règle 20) : le titre de la section et les catégories de métiers (TROUPE)
            "troupe": TROUPE,
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
                         "href": "#/saisons" if s == D_SAISON else f"#/saisons/{s}"} for i, s in enumerate(saisons)],
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
            if d["pour"] in ("pros", "scolaires", "tous", "pros_scolaires") and (not drive.exists() or (drive / d["source"]).exists())]


def action_publiee(a):
    """L'action culturelle d'un spectacle telle que le site la montre : None si elle est vide ou masquée (« masquee »)."""
    return a if a and not a.get("masquee") else None


DATA_LIGNE = "<script>const D = /*__DATA__*/null;</script>"


OUTILS = ("agenda.js", "donnees.js", "carte.js", "intro.js", "edition.js", "dossier.js", "frise.js", "mouvement.js", "reserver.js", "lecteur.js", "troupe.js", "tentacules.js")
# reserver.js (RESERVER, règle 17) : les dates où réserver, leur bande de boutons, la carte de réservation, le clavier ;
# lecteur.js (LECTEUR, règle 18) : les vidéos lues dans le site, au geste, en plein écran ou la page assombrie.
# Les outils de <head>, avant toute feuille de style : theme.js (THEME) pose le jour ou la nuit sur <html> avant le
# premier dessin (règle 19 : pas d'éclair) ; il ne lit rien de D.
OUTILS_TETE = ("theme.js",)


def outils():
    """Les outils communs, dans l'ordre. dossier.js compose à la demande le dossier PDF d'un spectacle (pdfmake, chargé depuis
    admin/vendor/ au premier clic). frise.js (FRISE) rend les calendriers en frises chronologiques, mouvement.js (MOUVEMENT)
    donne les transitions de page, les apparitions, le FLIP, les chiffres qui comptent et la pression (règle 15).
    troupe.js (TROUPE) range les personnes de l'équipe par catégories de métiers (D.site.troupe), relie les places d'une même
    personne et dessine les icônes des catégories (règle 20). tentacules.js vient en dernier : la pieuvre et ses tentacules,
    des moments que la maquette joue à la main (plus aucune réaction automatique par défaut). ?anim=0 dans l'adresse éteint
    tout mouvement (captures, essais). theme.js (THEME, règle 19) va à part, dans <head> (OUTILS_TETE)."""
    return OUTILS


def avec_outils(name, src):
    """Ajoute, juste après les données D, les outils communs : les lignes d'agenda (agenda.js), les données vivantes
    (donnees.js), la carte des tournées (carte.js) et l'ouverture sur le logo (intro.js)."""
    if DATA_LIGNE not in src:
        raise SystemExit(f"{name}.html : la ligne {DATA_LIGNE} est absente")
    js = "".join(f"\n<script>\n{(SRC / f).read_text(encoding='utf-8')}</script>" for f in outils())
    src = src.replace(DATA_LIGNE, DATA_LIGNE + js, 1)
    # theme.js dans <head>, juste après les balises meta du début (avant les feuilles de style, qu'un script attendrait)
    tete = "".join(f"\n<script>\n{(SRC / f).read_text(encoding='utf-8')}</script>" for f in OUTILS_TETE)
    m = re.search(r'<meta name="viewport"[^>]*>', src) or re.search(r"<meta charset=[^>]*>", src) or re.search(r"<head[^>]*>", src)
    return src[:m.end()] + tete + src[m.end():] if m else src.replace(DATA_LIGNE, DATA_LIGNE + tete, 1)


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
    """L'administration (admin/index.html, son client Supabase et l'outil des lignes d'agenda), à côté des maquettes, avec
    les outils communs qu'elle charge ou chargera : tentacules.js, frise.js (FRISE) et mouvement.js (MOUVEMENT)."""
    import shutil
    (dest / "admin" / "vendor").mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ROOT / "admin" / "index.html", dest / "admin" / "index.html")
    # la feuille de route et le planning (communs avec equipe/), l'équipe, la rubrique Planning (propositions de dates)
    for f in ("feuille.js", "equipe.js", "planning.js", "disponibilites.js"):
        shutil.copyfile(ROOT / "admin" / f, dest / "admin" / f)
    for f in (ROOT / "admin" / "vendor").iterdir():
        shutil.copyfile(f, dest / "admin" / "vendor" / f.name)
    shutil.copyfile(SRC / "agenda.js", dest / "admin" / "agenda.js")
    shutil.copyfile(SRC / "tentacules.js", dest / "admin" / "tentacules.js")
    # le logo 2.0 pour l'administration et l'espace de l'équipe, qui n'ont pas les données D des maquettes : la pieuvre de
    # leur en-tête et ses vrais bras, que tentacules.js y pose et anime (CRESCITE_LOGO ; sans ce fichier, un dessin neutre)
    v = logo_variants()
    partage = {"logo": {"octopus": v["octopus"], "octopusPaths": v["octopusPaths"]}, "arms": arms_data()}
    (dest / "admin" / "logo.js").write_text(
        "/* Écrit par maquettes/build.py (admin) : le logo 2.0 (sa pieuvre, ses quatre tracés, ses bras) pour l'administration\n"
        "   et l'espace de l'équipe ; tentacules.js le pose dans l'en-tête (data-pieuvre). */\n"
        f"self.CRESCITE_LOGO = {json.dumps(partage, ensure_ascii=False, separators=(',', ':'))};\n", encoding="utf-8")
    # la pieuvre de l'en-tête à la couleur du thème (règle 22), comme dans l'espace de l'équipe
    try:
        th, page = theme(), dest / "admin" / "index.html"
        html = page.read_text(encoding="utf-8")
        page.write_text(html.replace("</head>", f"<style>:root {{ --pieuvre: {th['couleur']}; }} "
                                     f"@media (prefers-color-scheme: dark) {{ :root {{ --pieuvre: {th['vive']}; }} }}</style>\n</head>", 1), encoding="utf-8")
    except Exception as e:
        print(f"admin : pieuvre au magenta (couleur du thème non posée : {e})")
    # les frises et le mouvement (règle 15) : l'administration et l'espace de l'équipe s'en serviront
    for f in ("frise.js", "mouvement.js"):
        shutil.copyfile(SRC / f, dest / "admin" / f)
    # le logo des feuilles de route (admin/feuille.js le lit à côté de lui) : la tache noire, la pieuvre et le mot en blanc,
    # tirés du logo privé (private/brand). Sa source ne va jamais dans le dépôt ; le dessin produit à la construction va,
    # comme le logo des maquettes, dans maquettes/dist et dans le site publié (docs/ : publication décidée par la
    # compagnie). Sans le logo privé, la feuille montre un badge à sa place.
    logo = dest / "admin" / "logo-feuille.svg"
    if fichier_marque(LOGO):
        logo.write_text(re.sub(r'class="logo-tache" fill="#[0-9a-fA-F]{6}"', 'class="logo-tache" fill="#1d1d1b"', logo_variants()["full"]), encoding="utf-8")
    elif logo.exists() and dest != ROOT / "docs":
        logo.unlink()


def equipe(dest):
    """L'espace de l'équipe (equipe/), une application installable, à côté de l'administration : il charge par ../admin/ le
    client Supabase, l'outil des lignes d'agenda, la feuille de route et les tentacules, que admin(dest) copie.
    En plus de la copie, trois choses écrites dans dest seulement (jamais dans equipe/) :
      carte.js   la France, la Belgique, le Luxembourg, Rouen et la projection des maquettes (prototype/src/map.json), pour
                 la carte de la tournée ;
      icones/    les icônes de l'application (192, 512, 512 « maskable », 180 pour l'iPhone, et le badge des notifications),
                 tirées du logo 2.0 dès que sa source privée est là (private/brand), quel que soit dest : la source ne va
                 jamais dans le dépôt, le dessin produit va, comme le logo des maquettes, dans maquettes/dist et dans le
                 site publié (docs/, publication décidée par la compagnie). Sans la source privée, la pieuvre de
                 substitution. SVG → PNG par cairosvg, rsvg-convert ou Chromium (Playwright : PLAYWRIGHT_MODULE,
                 CHROMIUM), gardées dans le dossier temporaire tant que le logo ne change pas ; sans aucun d'eux, une
                 pastille unie ;
      sw.js      sa VERSION : une empreinte de tout ce que le service de l'application garde (une nouvelle version s'annonce
                 alors dans l'application).
    Rien de cela n'arrête la construction : en cas d'échec, un avertissement, et l'espace marche sans."""
    import hashlib
    import shutil
    import struct
    import subprocess
    import tempfile
    import zlib
    out = dest / "equipe"
    shutil.copytree(ROOT / "equipe", out, dirs_exist_ok=True, ignore=shutil.ignore_patterns(".*", "__pycache__"))

    def avertir(quoi, e):
        print(f"equipe : {quoi} ({type(e).__name__} : {e}) ; l'espace de l'équipe marche sans")

    # ———— la pieuvre à la couleur du thème (règle 22 du contrat), comme les icônes : --pieuvre, sombre sur le papier,
    # vive la nuit (la page la lit, sinon garde le magenta)
    try:
        th, page = theme(), out / "index.html"
        style = (f"<style>:root {{ --pieuvre: {th['couleur']}; }} "
                 f"@media (prefers-color-scheme: dark) {{ :root {{ --pieuvre: {th['vive']}; }} }}</style>\n</head>")
        html = page.read_text(encoding="utf-8")
        if "</head>" not in html:
            raise ValueError("pas de </head>")
        page.write_text(html.replace("</head>", style, 1), encoding="utf-8")
    except Exception as e:
        avertir("pieuvre au magenta (couleur du thème non posée)", e)

    # ———— la carte de la tournée
    try:
        mp = json.loads((ROOT / "prototype" / "src" / "map.json").read_text(encoding="utf-8"))
        projection(mp["places"])
        carte = {"viewBox": mp["viewBox"], "contour": mp["outline"], "belgique": mp["belgium"], "luxembourg": mp["lux"],
                 "rouen": mp["rouen"], "projection": projection.coefficients}
        (out / "carte.js").write_text(
            "/* Écrit par maquettes/build.py (equipe) : la France et Rouen, pour la carte de la tournée de l'espace de l'équipe. */\n"
            f"self.CRESCITE_CARTE = {json.dumps(carte, ensure_ascii=False, separators=(',', ':'))};\n", encoding="utf-8")
    except Exception as e:
        avertir("carte de la tournée non écrite", e)

    # ———— les icônes
    def png_uni(f, n, rond, couleur=(188, 62, 128)):
        """Une pastille (ronde) ou un carré, d'une couleur, en PNG : le dernier recours, sans aucun convertisseur."""
        lignes = []
        for y in range(n):
            ligne = bytearray([0])
            for x in range(n):
                dedans = not rond or (x - n / 2 + .5) ** 2 + (y - n / 2 + .5) ** 2 <= (n * .46) ** 2
                ligne += bytes(couleur + (255,)) if dedans else b"\0\0\0\0"
            lignes.append(bytes(ligne))
        bloc = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
        f.write_bytes(b"\x89PNG\r\n\x1a\n" + bloc(b"IHDR", struct.pack(">IIBBBBB", n, n, 8, 6, 0, 0, 0))
                      + bloc(b"IDAT", zlib.compress(b"".join(lignes), 9)) + bloc(b"IEND", b""))

    def icones(dossier):
        # logo_variants() lit le logo 2.0 s'il est là, sinon la pieuvre de substitution
        prive = fichier_marque(LOGO) is not None
        v = logo_variants()
        tache, bras = v["tachePath"], v["octopusPaths"]
        pieuvre = "".join(f'<path d="{d}"/>' for d in bras if d)
        carre = lambda cx, cy, c: f"{cx - c / 2:.1f} {cy - c / 2:.1f} {c:.1f} {c:.1f}"
        svg = lambda vb, corps: f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{{n}}" height="{{n}}">{corps}</svg>'
        # la marque (tache magenta, pieuvre blanche) sur fond transparent ; la pieuvre blanche sur un carré magenta plein
        # (dans la zone sûre des icônes « maskable » : 62 % de la largeur) ; la pieuvre seule, blanche, pour le badge
        coul = theme()["couleur"]
        marque = svg(carre(767, 767.5, 1408 * 1.06), f'<path fill="{coul}" d="{tache}"/><g fill="#fff" fill-rule="evenodd">{pieuvre}</g>')
        pleine = lambda part: svg(carre(771, 628, 1042 / part), f'<rect x="-2000" y="-2000" width="6000" height="6000" fill="{coul}"/><g fill="#fff" fill-rule="evenodd">{pieuvre}</g>')
        badge = svg(carre(771, 628, 1042 / .94), f'<g fill="#fff" fill-rule="evenodd">{pieuvre}</g>')
        travaux = [("192.png", 192, marque, True), ("512.png", 512, marque, True), ("masquable-512.png", 512, pleine(.62), False),
                   ("180.png", 180, pleine(.66), False), ("badge.png", 96, badge, True)]
        cle = hashlib.sha256(json.dumps([(f, n, s) for f, n, s, _ in travaux]).encode()).hexdigest()[:16]
        garde = Path(tempfile.gettempdir()) / "crescite-icones" / cle
        dossier.mkdir(parents=True, exist_ok=True)
        if not all((garde / f).exists() for f, *_ in travaux):
            garde.mkdir(parents=True, exist_ok=True)
            fait = None
            try:
                import cairosvg
                for f, n, s, _ in travaux:
                    cairosvg.svg2png(bytestring=s.replace("{n}", str(n)).encode(), write_to=str(garde / f), output_width=n, output_height=n)
                fait = "cairosvg"
            except Exception:
                pass
            if not fait and shutil.which("rsvg-convert"):
                try:
                    for f, n, s, _ in travaux:
                        source = garde / (f + ".svg")
                        source.write_text(s.replace("{n}", str(n)), encoding="utf-8")
                        subprocess.run(["rsvg-convert", "-w", str(n), "-h", str(n), "-o", str(garde / f), str(source)], check=True, timeout=60)
                        source.unlink()
                    fait = "rsvg-convert"
                except Exception:
                    pass
            if not fait and shutil.which("node"):
                with tempfile.TemporaryDirectory() as tmp:
                    liste = Path(tmp) / "icones.json"
                    liste.write_text(json.dumps([{"svg": s.replace("{n}", str(n)), "taille": n, "fichier": str(garde / f)} for f, n, s, _ in travaux]), encoding="utf-8")
                    script = Path(tmp) / "icones.mjs"
                    script.write_text("""import { readFileSync, existsSync } from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright/index.mjs');
const exe = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const navigateur = await chromium.launch({ args: ['--no-sandbox'], ...(existsSync(exe) ? { executablePath: exe } : {}) });
const page = await navigateur.newPage({ deviceScaleFactor: 1 });
for (const t of JSON.parse(readFileSync(process.argv[2], 'utf8'))) {
  await page.setViewportSize({ width: t.taille, height: t.taille });
  await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">${t.svg}</body></html>`);
  await page.screenshot({ path: t.fichier, omitBackground: true, clip: { x: 0, y: 0, width: t.taille, height: t.taille } });
}
await navigateur.close();
""", encoding="utf-8")
                    try:
                        subprocess.run(["node", str(script), str(liste)], check=True, timeout=120, capture_output=True)
                        fait = "Chromium"
                    except Exception:
                        pass
            if not fait:
                for f, n, _, rond in travaux:
                    png_uni(garde / f, n, rond, (255, 255, 255) if f == "badge.png" else (188, 62, 128))
                fait = "pastilles unies (aucun convertisseur SVG)"
            print(f"equipe : icônes de l'application faites par {fait}{'' if prive else ', d’après la pieuvre de substitution'}")
        for f, *_ in travaux:
            shutil.copyfile(garde / f, dossier / f)

    try:
        icones(out / "icones")
    except Exception as e:
        avertir("icônes de l'application non faites", e)

    # ———— la version du service de l'application : tout ce qu'il garde, l'administration comprise
    try:
        sw = out / "sw.js"
        h = hashlib.sha256()
        fichiers = sorted(f for f in out.rglob("*") if f.is_file() and f != sw)
        fichiers += [dest / "admin" / x for x in ("vendor/supabase.js", "agenda.js", "feuille.js", "tentacules.js", "planning.js", "logo.js")]
        for f in fichiers:
            if f.is_file():
                h.update(str(f.relative_to(dest)).encode())
                h.update(f.read_bytes())
        h.update(sw.read_bytes())
        sw.write_text(sw.read_text(encoding="utf-8").replace("__VERSION__", h.hexdigest()[:12]), encoding="utf-8")
    except Exception as e:
        avertir("version du service de l'application non posée", e)


def pro(dest):
    """L'espace des salles (pro/ : les programmateurs et les directeurs de salle invités y trouvent captations et
    documents), à côté de l'administration : son logo est celui des feuilles de route, ../admin/logo-feuille.svg."""
    import shutil
    shutil.copytree(ROOT / "pro", dest / "pro", dirs_exist_ok=True, ignore=shutil.ignore_patterns(".*", "__pycache__"))


def reponse(dest):
    """La page de réponse aux propositions de dates (reponse/), où mènent les liens des courriels : Supabase ne sert pas
    de page web depuis l'adresse d'une fonction, la page lit et enregistre par la fonction crescite-courriel."""
    import shutil
    shutil.copytree(ROOT / "reponse", dest / "reponse", dirs_exist_ok=True, ignore=shutil.ignore_patterns(".*", "__pycache__"))


def pages(D, files, names):
    """Le site GitHub Pages (docs/) : la planche en index, chaque maquette en page à part, hors des moteurs de recherche,
    et les photos une seule fois dans docs/photos/, que les pages chargent au lieu de les embarquer chacune."""
    import shutil
    # jamais de site publié avec la pieuvre de substitution à la place du vrai logo
    if not fichier_marque(LOGO):
        sys.exit(f"pages : le logo 2.0 manque ({MARQUE.relative_to(ROOT)}/{LOGO}) ; rien n'est publié dans docs/.")
    docs = ROOT / "docs"
    docs.mkdir(exist_ok=True)
    # (les photos sont lues avant d'effacer docs/photos/ : sans private/, c'est de là qu'elles viennent)
    contenus = {k: f.read_bytes() for k, (f, _) in files.items() if f is not None}
    shutil.rmtree(docs / "photos", ignore_errors=True)
    for k, octets in contenus.items():
        dest = docs / "photos" / f"{k}.webp"
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(octets)
    photo_urls = photos(files, base="photos/")
    for n in names:
        html = assemble(n, D, photo_urls).replace('<meta charset="utf-8">', '<meta charset="utf-8">\n' + NOINDEX, 1)
        (docs / f"{n}.html").write_text(html, encoding="utf-8")
    build_planche(D, photo_urls, names, web=True, dest=docs / "index.html")
    admin(docs)
    equipe(docs)
    pro(docs)
    reponse(docs)
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
    pro(DIST)
    reponse(DIST)
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
    html = html.replace("</head>", f"<style>:root {{ --saison: {theme()['couleur']}; }}</style>\n</head>", 1)
    if web:
        html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n' + NOINDEX, 1)
    out = dest or DIST / "maquettes.html"
    out.write_text(html, encoding="utf-8")
    print(f"wrote {out.relative_to(ROOT)} ({out.stat().st_size / 1024:.0f} Ko)")

if __name__ == "__main__":
    main()
