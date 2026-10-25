"""Les vraies tentacules du logo 2.0, prêtes à se déployer : écrit marque/crescite-logo-2.0-tentacules.json.

    python3 maquettes/pieuvre.py            refait le fichier (il faut numpy, scipy, scikit-image, Pillow)
    python3 maquettes/pieuvre.py --voir F   et une image de contrôle (la pieuvre, ses tentacules en couleur, leurs épines)

La pieuvre du logo est faite de quatre contours (tentacles-left, head-left, head-right, tentacles-right). Huit de ses
tentacules peuvent quitter le dessin pour aller chercher un spectacle, quatre de chaque côté : la queue de la
tentacule extérieure (avec sa boucle), la grande boucle en S, et les deux tentacules courtes sous la tête. Le reste (la
tête, l'œil, les grandes boucles du bas) ne bouge pas.

Pour chacune, on cherche l'axe médian de la forme (squelette d'une image du contour à 4 px par unité), le chemin de la
pointe jusqu'à sa racine, qu'on lisse : c'est son épine, de la racine (fixe) à la pointe, un point toutes les 2 unités.
Sa peau, c'est son propre contour, pris dans le dessin entre les deux coupes de la racine (là où la normale à l'épine
rencontre le contour) et prolongé de 6 unités dans le corps (les deux se recouvrent : pas de jour entre eux). Chaque
point de la peau est noté (s, t, d) : son abscisse sur l'épine, son décalage le long de la tangente et le long de la
normale. pieuvre.js déplace l'épine et y repose la peau : la tentacule garde son épaisseur, de la racine à la pointe.
Au repos, la peau retombe exactement sur le contour du logo (l'écart est vérifié ici, en unités du dessin).

Coordonnées : celles du dessin source (1536 px), comme D.logo.octopusPaths et D.arms.
"""
import heapq
import json
import math
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
from scipy.ndimage import gaussian_filter1d
from skimage.morphology import skeletonize

ROOT = Path(__file__).resolve().parent.parent
LOGO = ROOT / "marque" / "crescite-logo-2.0.svg"
SORTIE = ROOT / "marque" / "crescite-logo-2.0-tentacules.json"
PARTIES = ("tentacles-left", "head-left", "head-right", "tentacles-right")
PAS = 2.0          # un point de l'épine et de la peau toutes les 2 unités
DEBORD = 6.0       # la peau entre de 6 unités dans le corps, au-delà de la coupe
LISERE = 2.5       # le jour entre deux parties du logo qui passent l'une sur l'autre (comme D.arms.gap)

# (clé, contour, pointe, un point plus loin vers le corps, longueur de la racine à la pointe, bout aplati à retirer)
# Les longueurs sont prises le long du squelette depuis la pointe ; « plat » : le bout est coupé net (les deux
# tentacules courtes passent sous la grande boucle), on arrête l'épine 12 unités avant.
TENTACULES = [
    ("queueL", "tentacles-left", (263, 717), (420, 720), 450, 0),
    ("boucleL", "head-left", (525.5, 710.5), (640, 890), 480, 0),
    ("frangeHL", "head-left", (589, 730), (690, 640), 85, 12),
    ("frangeBL", "head-left", (587, 792), (700, 650), 160, 12),
    ("frangeBR", "head-right", (955, 792), (842, 650), 160, 12),
    ("frangeHR", "head-right", (953, 730), (852, 640), 85, 12),
    ("boucleR", "head-right", (1011, 710), (902, 890), 480, 0),
    ("queueR", "tentacles-right", (1279, 712), (1122, 720), 450, 0),
]


def chemins(svg):
    return {k: re.search(r'<path id="%s"[^>]*\sd="([^"]+)"' % k, svg).group(1) for k in PARTIES}


def reechantillonner(P, pas, ferme=False):
    Q = np.vstack([P, P[:1]]) if ferme else P
    cum = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(Q, axis=0).T))])
    n = max(2, int(round(cum[-1] / pas)))
    u = np.linspace(0, cum[-1], n, endpoint=not ferme)
    return np.stack([np.interp(u, cum, Q[:, 0]), np.interp(u, cum, Q[:, 1])], axis=1)


def aplatir(d, pas=0.5):
    """Le contour fermé d'un tracé M/L/C absolu, un point toutes les `pas` unités."""
    toks = re.findall(r"[MLC]|-?\d*\.?\d+(?:e-?\d+)?", d)
    pts, i, cmd, cur = [], 0, None, None

    def num():
        nonlocal i
        i += 1
        return float(toks[i - 1])
    while i < len(toks):
        if toks[i] in "MLC":
            cmd = toks[i]
            i += 1
        if cmd in "ML":
            cur = (num(), num())
            pts.append(cur)
            cmd = "L"
        elif cmd == "C":
            p1, p2, p3 = (num(), num()), (num(), num()), (num(), num())
            for t in np.linspace(0, 1, 40)[1:]:
                a, b, c, e = (1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t * t, t ** 3
                pts.append((a * cur[0] + b * p1[0] + c * p2[0] + e * p3[0], a * cur[1] + b * p1[1] + c * p2[1] + e * p3[1]))
            cur = p3
        else:
            raise SystemExit(f"commande de tracé inattendue : {cmd}")
    P = np.array(pts)
    if np.hypot(*(P[0] - P[-1])) < 1e-6:
        P = P[:-1]
    return reechantillonner(P, pas, ferme=True)


class Partie:
    """Un contour du logo, son image (4 px par unité), sa distance au bord et son squelette."""
    K, X0, Y0, X1, Y1 = 4, 250, 330, 1300, 940

    def __init__(self, contour):
        self.O = contour
        im = Image.new("L", ((self.X1 - self.X0) * self.K, (self.Y1 - self.Y0) * self.K), 0)
        ImageDraw.Draw(im).polygon([((x - self.X0) * self.K, (y - self.Y0) * self.K) for x, y in contour], fill=1)
        m = np.array(im, dtype=bool)
        self.dist = ndi.distance_transform_edt(m) / self.K
        self.sk = skeletonize(m)
        voisins = np.ones((3, 3), int)
        voisins[1, 1] = 0
        self.nv = ndi.convolve(self.sk.astype(int), voisins, mode="constant") * self.sk

    def px(self, p):
        return int(round((p[1] - self.Y0) * self.K)), int(round((p[0] - self.X0) * self.K))

    def u(self, rc):
        return rc[1] / self.K + self.X0, rc[0] / self.K + self.Y0

    def proche(self, p, bout=False):
        cand = np.argwhere(self.nv == 1) if bout else np.argwhere(self.sk)
        r, c = self.px(p)
        return tuple(cand[np.argmin((cand[:, 0] - r) ** 2 + (cand[:, 1] - c) ** 2)])

    def rayon(self, p):
        r, c = self.px(p)
        return float(self.dist[min(max(r, 0), self.dist.shape[0] - 1), min(max(c, 0), self.dist.shape[1] - 1)])

    def chemin(self, a, b):
        """Le plus court chemin dans le squelette (8-connexe), de a à b, en unités du dessin."""
        dist, prev, tas = {a: 0.0}, {}, [(0.0, a)]
        while tas:
            d, x = heapq.heappop(tas)
            if x == b:
                break
            if d > dist.get(x, 1e18):
                continue
            for dr in (-1, 0, 1):
                for dc in (-1, 0, 1):
                    y = (x[0] + dr, x[1] + dc)
                    if (dr or dc) and 0 <= y[0] < self.sk.shape[0] and 0 <= y[1] < self.sk.shape[1] and self.sk[y]:
                        nd = d + (math.sqrt(2) if dr and dc else 1.0)
                        if nd < dist.get(y, 1e18):
                            dist[y], prev[y] = nd, x
                            heapq.heappush(tas, (nd, y))
        out = [b]
        while out[-1] != a:
            out.append(prev[out[-1]])
        return np.array([self.u(x) for x in reversed(out)])


def lisser(P, sigma):
    """Lissage gaussien d'une polyligne (sigma en points) ; les bouts tiennent (réflexion impaire)."""
    pad = int(3 * sigma) + 1
    Q = np.vstack([2 * P[0] - P[1:pad + 1][::-1], P, 2 * P[-1] - P[-pad - 1:-1][::-1]])
    Q = np.stack([gaussian_filter1d(Q[:, 0], sigma), gaussian_filter1d(Q[:, 1], sigma)], axis=1)
    return Q[pad:-pad]


def angles(E):
    """L'angle de la tangente en chaque point de l'épine : celui de son segment aux bouts, la moyenne des deux ailleurs
    (pieuvre.js fait de même)."""
    a = np.unwrap(np.arctan2(*np.diff(E, axis=0).T[::-1]))
    th = np.empty(len(E))
    th[0], th[-1] = a[0], a[-1]
    th[1:-1] = (a[:-1] + a[1:]) / 2
    return th


def cadre(E, th, h, s):
    """Le point et l'angle de l'épine à l'abscisse s : linéaires par morceaux, comme dans pieuvre.js."""
    n = len(E) - 1
    x = min(max(s / h, 0.0), float(n))
    i = min(int(x), n - 1)
    f = x - i
    return E[i] * (1 - f) + E[i + 1] * f, th[i] * (1 - f) + th[i + 1] * f


def tentacule(pa, pointe, vers, longueur, plat):
    Q = pa.chemin(pa.proche(pointe, bout=True), pa.proche(vers))
    cum = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(Q, axis=0).T))])
    E = Q[np.searchsorted(cum, plat):np.searchsorted(cum, longueur) + 1][::-1]        # de la racine à la pointe
    E = reechantillonner(lisser(reechantillonner(E, 0.5), 6.0), PAS)
    h = float(np.hypot(*np.diff(E, axis=0).T).mean())
    th = angles(E)
    # les deux coupes de la racine : là où sa normale rencontre le contour, de part et d'autre de l'épine
    O, n = pa.O, len(pa.O)
    T0 = np.array([math.cos(th[0]), math.sin(th[0])])
    N0 = np.array([-T0[1], T0[0]])
    le_long, travers = (O - E[0]) @ T0, (O - E[0]) @ N0
    cand = np.where((np.abs(le_long) < 0.6) & (np.abs(travers) < 2.2 * pa.rayon(E[0]) + 4))[0]
    g, dr = cand[travers[cand] > 0], cand[travers[cand] < 0]
    iG, iD = g[np.argmin(travers[g])], dr[np.argmax(travers[dr])]
    # le côté du contour qui va jusqu'à la pointe, prolongé dans le corps
    Tf = np.array([math.cos(th[-1]), math.sin(th[-1])])
    iT = int(np.argmin(np.hypot(*(O - (E[-1] + Tf * pa.rayon(E[-1]))).T)))
    arc = lambda a, b: [(a + j) % n for j in range((b - a) % n + 1)]
    chaine = arc(iG, iD) if iT in arc(iG, iD) else arc(iD, iG)
    k = int(round(DEBORD / 0.5))
    chaine = [(chaine[0] - j) % n for j in range(k, 0, -1)] + chaine + [(chaine[-1] + j) % n for j in range(1, k + 1)]
    V = reechantillonner(O[chaine], PAS)
    # la peau : chaque point projeté sur l'épine, en suivant le contour (fenêtre glissante : pas de saut d'une branche
    # de la boucle à l'autre)
    A, AB = E[:-1], np.diff(E, axis=0)
    l2 = (AB ** 2).sum(1)
    peau, prec = [], 0
    for j, v in enumerate(V):
        lo, hi = (0, min(len(A), 12)) if j == 0 else (max(0, prec - 8), min(len(A), prec + 9))
        f = np.clip(((v - A[lo:hi]) * AB[lo:hi]).sum(1) / l2[lo:hi], 0, 1)
        d = np.hypot(*(v - (A[lo:hi] + f[:, None] * AB[lo:hi])).T)
        i = lo + int(np.argmin(d))
        prec = i
        s = (i + f[i - lo]) * h
        C, a = cadre(E, th, h, s)
        peau.append((s, float((v - C) @ (math.cos(a), math.sin(a))), float((v - C) @ (-math.sin(a), math.cos(a)))))
    peau = np.round(np.array(peau), 2)
    # au repos, la peau reposée sur l'épine retombe sur le contour du logo
    R = []
    for s, t, d in peau:
        C, a = cadre(E, th, h, s)
        R.append(C + t * np.array([math.cos(a), math.sin(a)]) + d * np.array([-math.sin(a), math.cos(a)]))
    ecart = float(np.max(np.hypot(*(np.array(R) - V).T)))
    return E, h, peau, V, ecart


def main():
    svg = LOGO.read_text(encoding="utf-8")
    parties = {k: Partie(aplatir(d)) for k, d in chemins(svg).items()}
    bras, controle = [], []
    for cle, partie, pointe, vers, longueur, plat in TENTACULES:
        E, h, peau, V, ecart = tentacule(parties[partie], pointe, vers, longueur, plat)
        if ecart > 0.05:
            raise SystemExit(f"{cle} : la peau ne retombe pas sur le logo (écart {ecart:.3f})")
        bras.append({"cle": cle, "cote": cle[-1], "plat": bool(plat), "pas": round(h, 5),
                     "epine": [round(float(x), 2) for x in E.ravel()], "peau": [float(x) for x in peau.ravel()]})
        controle.append((V, E))
        print(f"{cle:9s} {h * (len(E) - 1):6.1f} unités, {len(peau):4d} points de peau, écart {ecart:.4f}")
    out = {"_note": "Les huit tentacules du logo 2.0 qui vont chercher les spectacles : épine (de la racine à la pointe) "
                    "et peau (s, t, d le long de l'épine), coordonnées du dessin source. Fait par maquettes/pieuvre.py.",
           "lisere": LISERE, "bras": bras}
    SORTIE.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"écrit {SORTIE.relative_to(ROOT)} ({SORTIE.stat().st_size // 1024} Ko)")
    if "--voir" in sys.argv:
        f = sys.argv[sys.argv.index("--voir") + 1]
        vx, vy, vw, vh = 250, 340, 1050, 600
        k = 1400 / vw
        im = Image.new("RGB", (1400, int(vh * k)), (34, 34, 34))
        dr = ImageDraw.Draw(im)
        P = lambda p: ((p[0] - vx) * k, (p[1] - vy) * k)
        for pa in parties.values():
            dr.polygon([P(p) for p in pa.O], fill=(80, 80, 80))
        for (V, E), c in zip(controle, [(230, 80, 80), (80, 200, 120), (90, 150, 255), (240, 200, 60)] * 2):
            dr.polygon([P(p) for p in V], fill=tuple(int(x * .6) for x in c), outline=c)
            dr.line([P(p) for p in E], fill=(255, 255, 255), width=1)
        im.save(f)


if __name__ == "__main__":
    main()
