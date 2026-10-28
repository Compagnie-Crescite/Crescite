#!/usr/bin/env python3
"""Réduire les portraits publiés de l'équipe déjà déposés dans le stockage (« crescite », equipe/…) à 800 px.

Ils ont été déposés à 2 000 px (1 493 × 2 000, 270 Ko chacun) et ne s'affichent jamais à plus de 250 px. Chaque visite du
site les télécharge chez Supabase : une visite complète en tirait 7 Mo, et le plan gratuit compte cette bande passante
(octobre 2026 : le quota de l'organisation dépassé). L'administration les envoie désormais à 800 px (PORTRAIT_PX) ; ce
script fait de même pour ceux qui y sont déjà.

    python3 supabase/portraits.py --essai     montre ce qui serait fait (télécharge et réduit, n'envoie rien)
    python3 supabase/portraits.py             dépose chaque portrait réduit sous un nouveau nom, puis y fait pointer la fiche
    python3 supabase/portraits.py --effacer   en plus, efface l'ancien fichier (seulement une fois le site republié :
                                              l'instantané de docs/ pointe encore vers les anciens noms)

Un nouveau nom plutôt que le même : le CDN de Supabase garde l'ancien fichier une heure sous son adresse. Les écritures
passent par supabase/ecrire.py (ses contrôles, sa clé : SUPABASE_CLE_SERVICE, ou celle que le proxy de la session ajoute) ;
à la première erreur, tout s'arrête, et
une fiche ne pointe vers le nouveau fichier qu'une fois celui-ci déposé.
"""
import io
import json
import sys
import tempfile
import time
import urllib.request
from pathlib import Path
from urllib.parse import quote

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ecrire  # noqa: E402

BASE = ecrire.URL
CLE_PUBLIQUE = "sb_publishable__SvO0qVI2BvcBK5vYgxjZQ_U-evgPKD"     # la clé publique du site (lecture de ce qui est publié)
PX = 800                                                            # PORTRAIT_PX de l'administration (admin/index.html)
QUALITE = 84                                                        # comme l'administration (toBlob, 0,84)


def lire(url, json_=False):
    req = urllib.request.Request(url, headers={"apikey": CLE_PUBLIQUE, "Authorization": f"Bearer {CLE_PUBLIQUE}"})
    with urllib.request.urlopen(req, timeout=60) as r:
        corps = r.read()
    return json.loads(corps) if json_ else corps


def base36(n):
    s = ""
    while n:
        n, r = divmod(n, 36)
        s = "0123456789abcdefghijklmnopqrstuvwxyz"[r] + s
    return s or "0"


def main(args):
    essai, effacer = "--essai" in args, "--effacer" in args
    personnes = lire(f"{BASE}/rest/v1/crescite_personnes?select=id,slug,photo&photo_publique=is.true"
                     "&photo=like.equipe/*&order=id.asc", json_=True)
    avant = apres = 0
    with tempfile.TemporaryDirectory() as tmp:
        for p in personnes:
            ancien = p["photo"]
            octets = lire(f"{BASE}/storage/v1/object/public/crescite/{quote(ancien)}")
            img = Image.open(io.BytesIO(octets))
            if max(img.size) <= PX * 1.25:                  # (800 × 1 000 : le gain ne vaut pas un nouveau fichier)
                print(f"{p['slug']} : déjà {img.size[0]} × {img.size[1]}, inchangé")
                continue
            k = PX / max(img.size)
            petit = img.convert("RGB").resize((round(img.size[0] * k), round(img.size[1] * k)), Image.LANCZOS)
            sortie = io.BytesIO()
            petit.save(sortie, "WEBP", quality=QUALITE, method=6)
            nouveau = f"equipe/{base36(int(time.time() * 1000))}-{p['slug']}.webp"
            avant += len(octets)
            apres += sortie.tell()
            print(f"{p['slug']} : {img.size[0]} × {img.size[1]}, {len(octets) // 1024} Ko → {petit.size[0]} × {petit.size[1]}, "
                  f"{sortie.tell() // 1024} Ko ({ancien} → {nouveau})")
            if essai:
                continue
            f = Path(tmp) / Path(nouveau).name
            f.write_bytes(sortie.getvalue())
            ecrire.main(["envoyer", "crescite", nouveau, str(f)])
            ecrire.main(["modifier", "crescite_personnes", f"id=eq.{p['id']}", json.dumps({"photo": nouveau})])
            if effacer:
                ecrire.main(["effacer", "crescite", ancien])
            time.sleep(0.01)                                  # (deux noms jamais pris dans la même milliseconde)
    if avant:
        print(f"\n{avant / 1e6:.1f} Mo → {apres / 1e6:.1f} Mo pour une visite qui les montre tous"
              + (" (essai : rien n'est envoyé)" if essai else ""))


if __name__ == "__main__":
    main(sys.argv[1:])
