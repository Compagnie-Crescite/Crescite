#!/usr/bin/env python3
"""Relève le texte exact des pages publiques de crescite.fr dans data/site-crescite.json.

Usage :
  python3 data/site_crescite.py <dossier>   lit des pages déjà enregistrées : <dossier>/index.html et <dossier>/pages/<page>.html
  python3 data/site_crescite.py             télécharge les pages depuis https://crescite.fr/

Le texte est gardé tel quel, fautes et ponctuation comprises. Seules les balises de mise en forme
(em, strong, sup, br, listes, liens) sont conservées ; les liens internes deviennent des adresses
des maquettes (#/spectacle/berenice, #/agenda/2019-2020…).
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

from bs4 import BeautifulSoup, Comment, NavigableString, Tag

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "site-crescite.json"
SITE = "https://crescite.fr/"

# les spectacles : adresse sur crescite.fr → identifiant des maquettes
SPECTACLES = {
    "cleophene": "cleophene", "ci-gisait-cyrano": "ci-gisait-cyrano", "la-folle-idee": "la-folle-idee",
    "berenice": "berenice", "macbeth-fatum": "macbeth-fatum",
    "mon-royaume-pour-un-cheval-romeo-and-juliet": "mon-royaume", "l-imaginaire-force": "imaginaire-force",
}
# les saisons, dans l'ordre du menu d'origine : adresse sur crescite.fr → saison
SAISONS = {
    "saison-26-27": "2026-2027", "saison-25-26": "2025-2026", "saison-24-25": "2024-2025",
    "saison-2023-2024": "2023-2024", "saison-2022-2023": "2022-2023", "saison-2021-2022": "2021-2022",
    "saison-2020-2021": "2020-2021", "saison-2019-2020": "2019-2020", "saison-2018-2019": "2018-2019",
    "saison-2017-2018": "2017-2018", "saison-2016-2017": "2016-2017",
}
AUTRES = {"actions-culturelles": "#/actions-culturelles", "contact": "#/contact", "espace-pro": "#/espace-pro",
          "mentions-legales": "#/mentions-legales", "politique-de-confidentialite": "#/politique-de-confidentialite"}


def lire(dossier, page):
    if dossier:
        f = dossier / ("index.html" if page == "" else f"pages/{page}.html")
        return f.read_text(encoding="utf-8")
    req = urllib.request.Request(SITE + (page + "/" if page else ""), headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8")


def adresse(href):
    """Un lien de crescite.fr devient une adresse des maquettes ; un lien extérieur reste tel quel."""
    if not href:
        return None
    m = re.match(r"^(?:https?://(?:www\.)?crescite\.fr)?/([^/?#]+)/?$", href.strip())
    if not m:
        return href.strip() if href.strip().startswith(("http", "mailto:")) else None
    p = m.group(1)
    p = next((k for k in SPECTACLES if p.lower().startswith(k[:10])), p)
    if p in SPECTACLES:
        return "#/spectacle/" + SPECTACLES[p]
    if p in SAISONS:
        return "#/agenda/" + SAISONS[p]
    if p in AUTRES:
        return AUTRES[p]
    return None        # une page disparue (banquet-elisabethain…) : le texte reste, sans lien


GARDE = {"em", "strong", "sup", "br", "a", "ul", "ol", "li", "p", "h2", "h3", "h4", "h5", "h6"}


def nettoie(el):
    """Copie d'un élément réduite aux balises de mise en forme, espaces normalisés."""
    el = BeautifulSoup(str(el), "html.parser")
    for c in el.find_all(string=lambda s: isinstance(s, Comment)):
        c.extract()
    for t in el.find_all(["img", "iframe", "audio", "video", "script", "style", "noscript", "svg", "input", "button", "form", "hr"]):
        t.decompose()
    for t in el.find_all(True):
        if t.name == "b":
            t.name = "strong"
        elif t.name == "i":
            t.name = "em"
    for t in el.find_all(True):
        if t.name not in GARDE:
            t.unwrap()
            continue
        href = adresse(t.get("href")) if t.name == "a" else None
        t.attrs = {}
        if t.name == "a":
            if href:
                t["href"] = href
            else:
                t.unwrap()
    return el


def html(el):
    """Le contenu d'un élément nettoyé, en une ligne, sans sa balise extérieure."""
    doc = nettoie(el)
    tops = [c for c in doc.contents if not (isinstance(c, NavigableString) and not c.strip())]
    contents = tops[0].contents if len(tops) == 1 and isinstance(tops[0], Tag) and tops[0].name != "a" else doc.contents
    s = "".join(str(c) for c in contents)
    s = re.sub(r"[ \t\r\n]+", " ", s)
    s = re.sub(r"\xa0(?= )| (?=\xa0)", "", s)          # « mot\xa0 mot » : un reste de justification, une seule espace
    s = re.sub(r"\s*<br/>\s*", "<br/>", s)
    s = re.sub(r"(<br/>)+$", "", s.strip())
    s = re.sub(r"^(<br/>)+", "", s)
    return s.strip()


def texte(el):
    t = el.get_text(" ", strip=True) if isinstance(el, Tag) else str(el)
    t = re.sub(r"[ \t\r\n]+", " ", t)
    return re.sub(r"\xa0(?= )| (?=\xa0)", "", t).strip()


def paragraphes(el):
    """Les paragraphes d'un bloc : chaque <p> (ou <li>…) devient une chaîne HTML ; les vides sont ignorés."""
    el = nettoie(el)
    out = []
    for p in el.find_all(["p", "h2", "h3", "h4", "ul", "ol"], recursive=True):
        if p.find_parent(["ul", "ol"]) or (p.name == "p" and p.find_parent("p")):
            continue
        h = html(p)
        if not re.sub(r"<br/>|&nbsp;|\xa0|\s", "", h):
            continue
        out.append(h if p.name == "p" else f"<{p.name}>{h}</{p.name}>")
    if not out:                       # un bloc sans <p> : le texte brut
        h = html(el)
        if h:
            out.append(h)
    return out


def modules(soup):
    main = soup.find(id="main-content")
    for m in main.select(".et_pb_module"):
        if m.find_parent(class_="et_pb_module"):
            continue
        kind = next((c for c in m.get("class", []) if re.match(r"et_pb_(text|toggle|video|audio|gallery|image|divider|cta|contact_form|button|nextend)", c)), "")
        yield kind.split("_")[2] if kind.startswith("et_pb_") else "", m


def interieur(m):
    return m.select_one(".et_pb_text_inner") or m.select_one(".et_pb_promo_description") or m


def lignes_fiche(p):
    """Une fiche « <strong>Rôle :</strong> Nom<br/>… » en paires (libellé, valeur)."""
    h = html(p)
    out = []
    for ligne in h.split("<br/>"):
        ligne = ligne.strip()
        if not ligne:
            continue
        m = re.match(r"^((?:<strong>[^<]*</strong>\s*)+)(.*)$", ligne)
        if m:
            label = re.sub(r"\s+", " ", re.sub(r"</?strong>", "", m.group(1))).strip()
            label = re.sub(r"\s+:", " :", label)
            out.append({"libelle": label, "valeur": m.group(2).strip()})
        else:
            out.append({"libelle": None, "valeur": ligne})
    return out


def page_spectacle(soup):
    sp = {"titreLignes": [], "creation": None, "fiche": [], "avec": None, "mentions": [], "duree": None,
          "production": [], "texte": [], "credit": None, "medias": [], "tournee": {"titre": None, "dates": []}}
    teaser = None
    for kind, m in modules(soup):
        if kind == "text":
            inner = interieur(m)
            t = texte(inner)
            if inner.find("h1"):
                h1 = nettoie(inner.find("h1"))
                for s in h1.find_all("span"):
                    s.unwrap()
                parts = re.split(r"<br/>", html(inner.find("h1")))
                sp["titreLignes"] = [re.sub(r"<[^>]+>", "", p).strip() for p in parts if p.strip()]
                if len(sp["titreLignes"]) == 1:          # « Macbeth <span>Fatum</span> » : le second mot à part
                    spans = inner.find("h1").find_all("span")
                    if spans:
                        tail = texte(spans[-1])
                        sp["titreLignes"] = [texte(inner.find("h1"))[: -len(tail)].strip(), tail]
                cr = inner.find("p")
                sp["creation"] = texte(cr) if cr else None
            elif "Actuellement en tournée" in t:
                sp["tournee"]["titre"] = t
            elif "Siret" in t:
                continue
            elif inner.find("h2") and texte(inner.find("h2")) == "Teasers":
                teaser = "Teasers"
            elif re.match(r"^[©@]", t) and len(t) < 120:
                sp["credit"] = t
            elif "spectacle disponible" in t:
                sp["mentions"] = paragraphes(inner)
            elif "durée" in t[:40] or re.match(r"^Production\s*:", t):
                pars = paragraphes(inner)
                sp["duree"] = next((re.sub(r"<[^>]+>", "", p).strip() for p in pars if "durée" in p), None)
                sp["production"] = [p for p in pars if "durée" not in p]
            elif re.search(r"avec\s*:", t) and (inner.find("strong") or inner.find("b")):
                for p in (inner.find_all("p") or [inner]):
                    if re.match(r"^\s*avec\s*:", texte(p)):
                        h = html(p)
                        sp["avec"] = {"libelle": "avec :", "valeur": re.sub(r"^<strong>\s*avec\s*:\s*</strong>\s*", "", h).strip()}
                    else:
                        sp["fiche"] += lignes_fiche(p)
                if not inner.find("p"):
                    pass
                elif inner.find(string=re.compile(r"\S")) and not inner.find_all("p", recursive=False):
                    pass
                # La Folle Idée : la fiche n'est pas dans un <p>, seul « avec » l'est
                if not sp["fiche"]:
                    loose = BeautifulSoup(str(inner), "html.parser")
                    for p in loose.find_all("p"):
                        p.decompose()
                    sp["fiche"] = lignes_fiche(loose)
            else:
                sp["texte"] += paragraphes(inner)
        elif kind == "toggle":
            h4 = m.find(["h5", "h4"])
            det = m.select_one(".et_pb_toggle_content") or m
            details = []
            for p in det.find_all("p"):
                a = p.find("a")
                if not texte(p):
                    continue
                details.append({"texte": texte(p), "lien": lien_sur(a.get("href")) if a else None})
            sp["tournee"]["dates"].append({"ligne": texte(h4), "details": details})
        elif kind == "video":
            f = m.find("iframe")
            if f:
                sp["medias"].append({"type": "video", "url": f.get("src", "").split("?")[0], "titre": f.get("title"), "groupe": teaser})
        elif kind == "audio":
            sp["medias"].append({"type": "audio", "titre": texte(m.find("h2")) if m.find("h2") else None,
                                 "par": texte(m.find("p")) if m.find("p") else None,
                                 "url": (m.find("source") or {}).get("src")})
    return sp


def lien_sur(href):
    """Un lien extérieur valide, ou rien (le site d'origine contient quelques liens cassés)."""
    href = (href or "").strip()
    return href if re.match(r"^https?://[^\s<>\"]+$", href) else None


def ligne_date(bloc):
    """Une date d'une saison ancienne : la ligne, ses précisions, et son état (« date annulée »…)."""
    etat = []
    for sp in bloc.find_all("span", style=re.compile("color")):
        etat.append(texte(sp))
        sp.decompose()
    lignes = []
    for part in re.split(r"<br[^>]*>|</p>", str(bloc)):
        b = BeautifulSoup(part, "html.parser")
        t = texte(b)
        if t:
            a = b.find("a")
            lignes.append({"texte": t, "lien": lien_sur(a.get("href")) if a else None})
    if not lignes:
        return None
    first = lignes[0]
    return {"ligne": first["texte"], "lien": first["lien"], "details": lignes[1:], "etat": " ".join(e for e in etat if e) or None}


def page_saison(soup):
    titre, groupes, courant = None, [], None
    for kind, m in modules(soup):
        if kind == "text":
            inner = interieur(m)
            t = texte(inner)
            if inner.find("h1"):
                titre = texte(inner.find("h1"))
                continue
            if "Siret" in t or "¦" in t:          # le pied de page, la navigation entre saisons
                continue
            if inner.find("h2"):
                h2 = inner.find("h2")
                a = h2.find("a")
                cr = inner.find("p")
                courant = {"titre": texte(h2), "lien": adresse(a.get("href")) if a else None,
                           "sousTitre": html(inner.find("h4")) if inner.find("h4") else None,
                           "creation": texte(cr) if cr else None, "dates": []}
                groupes.append(courant)
                continue
            # les saisons anciennes : des dates séparées par des filets <hr/>
            for morceau in re.split(r"<hr[^>]*>", str(inner)):
                d = ligne_date(BeautifulSoup(morceau, "html.parser"))
                if d and courant is not None:
                    courant["dates"].append(d)
        elif kind == "toggle" and courant is not None:
            h4 = m.find(["h5", "h4"])
            det = m.select_one(".et_pb_toggle_content") or m
            details = []
            for p in det.find_all("p"):
                if texte(p):
                    a = p.find("a")
                    details.append({"texte": texte(p), "lien": lien_sur(a.get("href")) if a else None})
            courant["dates"].append({"ligne": texte(h4), "lien": None, "details": details, "etat": None})
    return {"titre": titre, "spectacles": groupes}


def page_simple(soup):
    blocs = []
    for kind, m in modules(soup):
        if kind == "text":
            inner = interieur(m)
            if "Siret" in texte(inner):
                continue
            h1 = inner.find("h1")
            if h1:
                blocs.append({"titre": texte(h1)})
                h1.decompose()
            pars = paragraphes(inner)
            if pars:
                blocs.append({"html": pars})
    return blocs


def accueil(soup):
    # le diaporama : pour chaque diapositive, ses textes dans l'ordre (surtitre, titre, bouton, crédit)
    diapos = []
    for sl in soup.select(".n2-ss-slide"):
        feuilles = [re.sub(r"\s+", " ", x).strip() for x in sl.find_all(string=True)
                    if not isinstance(x, Comment) and x.strip() and not x.find_parent(attrs={"role": "note"})]
        a = sl.find("a", href=True)
        if feuilles:
            d = {"textes": feuilles, "lien": adresse(a["href"]) if a else None, "href": a["href"] if a else None}
            d["surtitre"] = next((f for f in feuilles if f.isupper()), None)
            d["bouton"] = next((f for f in feuilles if f == "découvrir"), None)
            d["credit"] = next((f for f in feuilles if f[:1] in "©@"), None)
            d["titre"] = [f for f in feuilles if f not in (d["surtitre"], d["bouton"], d["credit"])]
            diapos.append(d)
    out = {"diaporama": diapos}
    for kind, m in modules(soup):
        if kind == "cta":
            out["donateurs"] = paragraphes(m)
        elif kind == "text":
            inner = interieur(m)
            t = texte(inner)
            if inner.find("h1"):
                out["presentationTitre"] = texte(inner.find("h1"))
            elif "En quelques dates" in t:
                out["datesTitre"] = texte(inner.find(["h2", "h3"]))
                items = []
                for p in inner.find_all("p"):
                    an = p.find("span")
                    if not an:
                        continue
                    annee = texte(an)
                    an.extract()
                    items.append({"annee": annee, "titre": html(p)})
                out["dates"] = items
            elif "Siret" in t:
                nom = inner.find("h4")
                adr = inner.find("p")
                leg = inner.find("h6")
                out["coordonnees"] = {"nom": texte(nom), "adresse": [s.strip() for s in html(adr).split("<br/>")],
                                      "legal": [s.strip() for s in html(leg).split("<br/>")]}
            elif "naît en" in t:
                out["presentation"] = paragraphes(inner)
        elif kind == "button":
            out["ecrire"] = {"texte": texte(m), "lien": adresse(m.find("a").get("href"))}
    foot = soup.find(id="footer-info")
    lignes = [s.strip() for s in html(foot).split("<br/>") if s.strip()]
    out["pied"] = {"partenaires": " ".join(lignes[:-1]).replace(", le", ",<br/>le", 1) if len(lignes) > 1 else lignes[0],
                   "credits": lignes[-1]}
    fb = soup.select_one(".et-social-facebook a")
    out["facebook"] = {"texte": texte(fb), "lien": fb.get("href")} if fb else None
    return out


def contact(soup):
    form = soup.select_one(".et_pb_contact_form_container") or soup
    champs = [texte(l) for l in form.find_all("label") if texte(l) and "politique" not in texte(l)]
    rgpd = next((texte(l) for l in form.find_all("label") if "politique" in texte(l)), None)
    cap = form.select_one(".et_pb_contact_captcha_question")
    titre = next((texte(interieur(m).find("h1")) for k, m in modules(soup) if k == "text" and interieur(m).find("h1")), None)
    return {"titre": titre, "champs": champs, "consentement": rgpd,
            "calcul": texte(cap) + " =" if cap else None, "bouton": texte(form.find("button")) if form.find("button") else None}


def espace_pro(soup):
    box = soup.select_one(".et_password_protected_form")
    return {"titre": texte(box.find("h1")), "texte": texte(box.find("p")),
            "champ": texte(box.find("label")), "bouton": texte(box.find("button"))}


def menu(soup):
    nav = soup.select_one("#top-menu") or soup.find("nav")
    items = []
    for li in nav.find_all("li", recursive=False):
        a = li.find("a")
        sous = [texte(x) for x in li.select("ul a")]
        items.append({"texte": texte(a), "sous": sous})
    return items


def main():
    dossier = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    home = BeautifulSoup(lire(dossier, ""), "html.parser")
    data = {"source": SITE, "menu": menu(home), "accueil": accueil(home), "spectacles": {}, "saisons": {}}
    for page, slug in SPECTACLES.items():
        data["spectacles"][slug] = dict(page_spectacle(BeautifulSoup(lire(dossier, page), "html.parser")), url=SITE + page + "/")
    for page, saison in SAISONS.items():
        data["saisons"][saison] = dict(page_saison(BeautifulSoup(lire(dossier, page), "html.parser")), url=SITE + page + "/")
    ac = BeautifulSoup(lire(dossier, "actions-culturelles"), "html.parser")
    data["actions"] = {"blocs": page_simple(ac), "credit": next((b["html"][0] for b in page_simple(ac) if "html" in b and b["html"][0].startswith("©")), None)}
    data["actions"]["blocs"] = [b for b in data["actions"]["blocs"] if not ("html" in b and b["html"][0].startswith("©"))]
    data["contact"] = contact(BeautifulSoup(lire(dossier, "contact"), "html.parser"))
    data["espacePro"] = espace_pro(BeautifulSoup(lire(dossier, "espace-pro"), "html.parser"))
    for page in ("mentions-legales", "politique-de-confidentialite"):
        data[page] = page_simple(BeautifulSoup(lire(dossier, page), "html.parser"))
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"écrit {OUT.relative_to(ROOT)} : {len(data['spectacles'])} spectacles, {len(data['saisons'])} saisons")


if __name__ == "__main__":
    main()
