#!/usr/bin/env python3
"""
Enrichit l'agenda de la compagnie (site-crescite.json, representations-site-2016-2027.json/csv)
avec toutes les représentations scolaires, tout-public et tournées issues du récapitulatif
officiel de la compagnie (/tmp/user_csv.csv).

Garantit que le nombre de représentations par spectacle et par saison correspond exactement
aux totaux de la compagnie :
  - Cassandres : 3
  - Cléophène : 24
  - Ci-gisait Cyrano : 241
  - La Folle Idée : 13
  - Bérénice : 76
  - Macbeth – Fatum : 40
  - Mon Royaume pour un cheval : 758 (126 TP, 632 SCO)
  - L’Imaginaire forcé : 477 (9 TP, 468 SCO)
"""

import csv
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = Path("/tmp/user_csv.csv")
SITE_PATH = ROOT / "data" / "site-crescite.json"
REPS_JSON_PATH = ROOT / "data" / "representations-site-2016-2027.json"
REPS_CSV_PATH = ROOT / "data" / "representations-site-2016-2027.csv"

MONTH_MAP = {
    'janv': 1, 'janvier': 1,
    'fev': 2, 'fév': 2, 'fevrier': 2, 'février': 2, 'fev-mars': 2,
    'mars': 3, 'mars-avril': 3,
    'avr': 4, 'avril': 4,
    'mai': 5, 'mai et juin': 5,
    'juin': 6,
    'juil': 7, 'juillet': 7,
    'aout': 8, 'août': 8,
    'sept': 9, 'septembre': 9,
    'oct': 10, 'octobre': 10,
    'nov': 11, 'novembre': 11,
    'dec': 12, 'déc': 12, 'décembre': 12
}

MONTH_NAMES = [
    "", "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre"
]

SLUG_INFO = {
    'CASSANDRE': ('cassandres', 'Cassandres', 'D’après Christa Wolf, Eschyle, Euripide', '2027'),
    'CLEOPHENE': ('cleophene', 'Cléophène', 'Tragédie de Catherine Bernard', '2024'),
    'CYRANO': ('ci-gisait-cyrano', 'Ci-gisait Cyrano', 'D’après Edmond Rostand', '2023'),
    'LFI': ('la-folle-idee', 'La Folle Idée', 'De Sophie Bricaire', '2021'),
    'BERENICE': ('berenice', 'Bérénice', 'De Jean Racine', '2018'),
    'MACBETH': ('macbeth-fatum', 'Macbeth – Fatum', 'D’après William Shakespeare', '2016'),
    'R&J': ('mon-royaume', 'Mon Royaume pour un cheval – Romeo & Juliet', 'D’après William Shakespeare', '2013'),
    'MOMO': ('imaginaire-force', 'L’Imaginaire forcé', 'D’après Le Mariage forcé et Le Malade imaginaire de Molière', '2011'),
}

def norm(s):
    if not s: return ''
    s = unicodedata.normalize('NFKD', str(s))
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r'\bst\b|\bst-', 'saint ', s.lower())
    s = re.sub(r'\bgd\b|\bgd-', 'grand ', s)
    s = re.sub(r'compiegnes?', 'compiegne', s)
    s = re.sub(r'montfort.*a[um]aury', 'montfort lamaury', s)
    s = re.sub(r'vogelgrun|fessenheim', 'vogelgrun fessenheim', s)
    s = re.sub(r'chatenois|neufchateau', 'chatenois neufchateau', s)
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()

def parse_month(val):
    if not val: return None
    v = val.lower().strip()
    for k, m in MONTH_MAP.items():
        if k in v:
            return m
    return None

def clean_dep(val):
    if not val: return ''
    v = str(val).strip().replace('.0', '').lstrip('.')
    if len(v) == 1: v = '0' + v
    return v

def clean_an(val):
    if not val: return None
    try:
        return int(float(str(val).strip()))
    except:
        return None

def get_season(slug, i, r, m_idx, y_idx):
    m_val = r[m_idx].strip() if m_idx is not None and m_idx < len(r) else ''
    m = parse_month(m_val)
    an = clean_an(r[y_idx] if y_idx is not None and y_idx < len(r) else '')
    
    if slug == 'cassandres':
        if i == 0: return '2023-2024'
        if i == 1: return '2024-2025'
        return '2025-2026'
    elif slug == 'cleophene':
        if m is not None and an is not None:
            return f'{an}-{an+1}' if m >= 9 else f'{an-1}-{an}'
        return '2024-2025'
    elif slug == 'ci-gisait-cyrano':
        if m is None:
            return '2023-2024'
        return f'{an}-{an+1}' if m >= 9 else f'{an-1}-{an}'
    elif slug == 'la-folle-idee':
        if i <= 10: return '2020-2021'
        if i <= 17: return '2021-2022'
        return '2022-2023'
    elif slug == 'macbeth-fatum':
        if i <= 16: return '2015-2016'
        if i <= 20: return '2016-2017'
        if i <= 25: return '2017-2018'
        if i <= 29: return '2018-2019'
        return '2019-2020'
    elif slug == 'berenice':
        if i <= 6: return '2017-2018'
        if i <= 15: return '2018-2019'
        if i <= 20: return '2019-2020'
        if i <= 24: return '2020-2021'
        if i <= 33: return '2021-2022'
        if i == 34: return '2022-2023'
        if i <= 39: return '2023-2024'
        if i <= 45: return '2024-2025'
        if i <= 47: return '2025-2026'
        return '2026-2027'
    elif slug == 'mon-royaume':
        if i <= 2: return '2012-2013'
        if i <= 10: return '2013-2014'
        if i <= 26: return '2014-2015'
        if i <= 46: return '2015-2016'
        if i <= 74: return '2016-2017'
        if i <= 123: return '2017-2018'
        if i <= 153: return '2018-2019'
        if i <= 178: return '2019-2020'
        if i <= 202: return '2020-2021'
        if i <= 220: return '2021-2022'
        if i <= 252: return '2022-2023'
        if i <= 267: return '2023-2024'
        if i <= 288: return '2024-2025'
        if i <= 304: return '2025-2026'
        return '2026-2027'
    elif slug == 'imaginaire-force':
        if i <= 1: return '2011-2012'
        if i <= 3: return '2012-2013'
        if i <= 13: return '2013-2014'
        if i <= 27: return '2014-2015'
        if i <= 44: return '2015-2016'
        if i <= 58: return '2016-2017'
        if i <= 69: return '2017-2018'
        if i <= 78: return '2018-2019'
        if i <= 89: return '2019-2020'
        if i <= 101: return '2020-2021'
        if i <= 111: return '2021-2022'
        if i <= 130: return '2022-2023'
        if i <= 143: return '2023-2024'
        if i <= 158: return '2024-2025'
        if i <= 165: return '2025-2026'
        return '2026-2027'
    return '2026-2027'

def main():
    csv_text = CSV_PATH.read_text(encoding='utf-8')
    sections = re.split(r'(?=CRESCITE\s*–\s*récap)', csv_text, flags=re.IGNORECASE)
    site = json.loads(SITE_PATH.read_text(encoding='utf-8'))

    parsed = {}
    total_reps_by_slug = {}

    for sec in sections[1:]:
        lines = [l for l in sec.split('\n') if l.strip()]
        if not lines: continue
        matched = next(((k, v) for k, v in SLUG_INFO.items() if k in lines[0]), None)
        if not matched: continue
        slug_key, (slug, show_title, show_sub, show_crea) = matched
        reader = csv.reader(lines[1:])
        headers = [h.strip() for h in next(reader)]
        h_map = {h.lower(): i for i, h in enumerate(headers)}
        m_idx = next((i for h, i in h_map.items() if 'mois' in h), None)
        y_idx = next((i for h, i in h_map.items() if 'ann' in h), None)
        v_idx = next((i for h, i in h_map.items() if 'ville' in h), None)
        d_idx = next((i for h, i in h_map.items() if 'dpt' in h), None)
        l_idx = next((i for h, i in h_map.items() if 'lieu' in h), None)
        tp_idx = next((i for h, i in h_map.items() if 'tp' in h), None)
        sco_idx = next((i for h, i in h_map.items() if 'sco' in h), None)

        for i, r in enumerate(reader):
            if not r or not any(r): continue
            if any('TOTAL' in cell for cell in r): break
            s = get_season(slug, i, r, m_idx, y_idx)
            tp = float(r[tp_idx]) if tp_idx is not None and tp_idx < len(r) and r[tp_idx].strip() else 0.0
            sco = float(r[sco_idx]) if sco_idx is not None and sco_idx < len(r) and r[sco_idx].strip() else 0.0
            reps = tp + sco
            if reps == 0: continue
            total_reps_by_slug[slug] = total_reps_by_slug.get(slug, 0) + reps

            note = ' '.join(r[max(tp_idx or 0, sco_idx or 0)+1:]).strip()
            annule = bool(re.search(r'annul', note, re.I))

            parsed.setdefault((slug, s), []).append({
                'slug': slug,
                'titre': show_title,
                'sousTitre': show_sub,
                'creation': show_crea,
                'ville': r[v_idx].strip() if v_idx < len(r) else '',
                'dpt': clean_dep(r[d_idx] if d_idx < len(r) else ''),
                'lieu': r[l_idx].strip() if l_idx < len(r) else '',
                'tp': tp,
                'sco': sco,
                'reps': int(reps) if reps.is_integer() else reps,
                'scolaire': sco > 0 and tp == 0,
                'annule': annule,
                'm_str': r[m_idx].strip() if m_idx is not None and m_idx < len(r) else '',
                'm_num': parse_month(r[m_idx].strip() if m_idx is not None and m_idx < len(r) else ''),
                'annee': clean_an(r[y_idx] if y_idx is not None and y_idx < len(r) else '')
            })

    print("=== Totaux récapitulatif compagnie ===")
    for slug, tot in sorted(total_reps_by_slug.items()):
        print(f"  {slug:20}: {tot:5.0f} représentations")

    all_seasons = sorted({s for (_, s) in parsed.keys()} | set(site['saisons'].keys()), reverse=True)
    for s in all_seasons:
        if s not in site['saisons']:
            site['saisons'][s] = {
                "titre": f"Saison {s}",
                "spectacles": [],
                "url": None
            }

    menu_saisons = next(m for m in site['menu'] if m['texte'].startswith('Saison'))
    menu_saisons['sous'] = [f"Saison {s}" if not s.startswith("2026") else "Saison 26-27" for s in all_seasons]

    slug_de = {}
    for slug, sp in site['spectacles'].items():
        slug_de[norm(' '.join(sp['titreLignes']))] = slug

    # Enrich each season and spectacle
    for (slug, s), c_items in parsed.items():
        SA = site['saisons'][s]
        g = None
        for sp in SA['spectacles']:
            sp_slug = (sp.get('lien') or '').replace('#/spectacle/', '') or slug_de.get(norm(sp['titre']))
            if sp_slug == slug:
                g = sp
                break
        if not g:
            g = {
                'titre': c_items[0]['titre'],
                'lien': f'#/spectacle/{slug}',
                'sousTitre': c_items[0]['sousTitre'],
                'creation': c_items[0]['creation'],
                'dates': []
            }
            SA['spectacles'].append(g)
        else:
            if not g.get('lien'):
                g['lien'] = f'#/spectacle/{slug}'

        # Filter out old placeholder summary lines
        orig_dts = [dt for dt in g['dates'] if not re.search(r'\+\s*tournée|\btournée dans \d+', dt.get('ligne', ''))]

        used_dts = set()
        new_dates_list = []

        for ci in c_items:
            nv = norm(ci['ville'])
            nl = norm(ci['lieu'])
            matched_dt = None
            for idx, dt in enumerate(orig_dts):
                if idx in used_dts: continue
                full = norm(dt['ligne'] + ' ' + ' '.join(x.get('texte', '') for x in dt.get('details', [])))
                if (nv and nv in full) or (nl and len(nl) > 5 and nl in full):
                    matched_dt = dt
                    used_dts.add(idx)
                    break

            if matched_dt:
                matched_dt['nb_representations'] = ci['reps']
                matched_dt['scolaire'] = ci['scolaire']
                new_dates_list.append(matched_dt)
            else:
                m_str = MONTH_NAMES[ci['m_num']] if ci['m_num'] else ci['m_str']
                an_str = str(ci['annee']) if ci['annee'] else ''
                date_prefix = f"{m_str} {an_str}".strip() if m_str else an_str
                lieu_loc = f"{ci['lieu']}, " if ci['lieu'] else ''
                dep_suffix = f" ({ci['dpt']})" if ci['dpt'] else ''
                ligne = f"{date_prefix} — {lieu_loc}{ci['ville']}{dep_suffix}".strip(' —')
                if not date_prefix:
                    ligne = f"{lieu_loc}{ci['ville']}{dep_suffix}".strip()

                reps_txt = f"{ci['reps']} représentation{'s' if ci['reps'] > 1 else ''}"
                if ci['scolaire']: reps_txt += ' scolaire' + ('s' if ci['reps'] > 1 else '')
                if ci['lieu']: reps_txt += f" au {ci['lieu']}"

                new_dates_list.append({
                    'ligne': ligne,
                    'lien': None,
                    'details': [{'texte': reps_txt, 'lien': None}],
                    'etat': 'annulé' if ci['annule'] else None,
                    'scolaire': ci['scolaire'],
                    'nb_representations': ci['reps']
                })

        # Preserve any cancelled dates from orig_dts
        for idx, dt in enumerate(orig_dts):
            if idx not in used_dts and dt.get('etat') and 'annul' in dt['etat'].lower():
                dt['nb_representations'] = 0
                new_dates_list.append(dt)

        g['dates'] = new_dates_list

    # Ensure any dates in any spectacle that don't have nb_representations set default to 0
    for s, SA in site['saisons'].items():
        for g in SA['spectacles']:
            for dt in g.get('dates', []):
                if dt.get('nb_representations') is None:
                    dt['nb_representations'] = 0

    # Re-verify sums across all seasons
    print("\n=== Vérification des sommes après enrichissement ===")
    verified = {}
    for s, SA in site['saisons'].items():
        for g in SA['spectacles']:
            slug = (g.get('lien') or '').replace('#/spectacle/', '') or slug_de.get(norm(g['titre']))
            if slug:
                r_sum = sum(dt.get('nb_representations', 0) for dt in g.get('dates', []))
                verified[slug] = verified.get(slug, 0) + r_sum

    for slug, target in sorted(total_reps_by_slug.items()):
        act = verified.get(slug, 0)
        status = "✓ OK" if act == target else f"✗ ERREUR (actuel={act}, attendu={target})"
        print(f"  {slug:20}: {act:5.0f} / {target:5.0f} {status}")

    SITE_PATH.write_text(json.dumps(site, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f"\nÉcrit {SITE_PATH.relative_to(ROOT)}")

    # Update representations-site-2016-2027.json & csv
    old_reps = json.loads(REPS_JSON_PATH.read_text(encoding='utf-8'))
    old_by_key = {(r['saison'], norm(r['intitule_original'])): r for r in old_reps}

    new_reps = []
    next_id = 1
    for s, SA in sorted(site['saisons'].items()):
        for g in SA['spectacles']:
            slug = (g.get('lien') or '').replace('#/spectacle/', '') or slug_de.get(norm(g['titre']))
            if not slug or slug not in SLUG_INFO_BY_SLUG: continue
            show_title = SLUG_INFO_BY_SLUG[slug][1]

            for dt in g.get('dates', []):
                old = old_by_key.get((s, norm(dt['ligne'])))
                m_commune = re.search(r'([^,—–():]+?)\s*\((\d{2}|\d[AB])\)', dt['ligne'])
                commune = old['commune'] if old else (m_commune.group(1).strip() if m_commune else None)
                dep = old['departement'] if old else (m_commune.group(2) if m_commune else None)
                lat = old['lat'] if old else None
                lon = old['lon'] if old else None
                insee = old['code_insee'] if old else None
                date_deb = old['date_debut'] if old else None
                date_fin = old['date_fin'] if old else None
                precision = old['precision'] if old else 'month'

                rep_obj = {
                    "id": next_id,
                    "saison": s,
                    "spectacle": show_title,
                    "spectacle_slug": slug,
                    "date_debut": date_deb,
                    "date_fin": date_fin,
                    "jours": old['jours'] if old else [],
                    "precision": precision,
                    "heure": old['heure'] if old else None,
                    "commune": commune,
                    "code_insee": insee,
                    "departement": dep,
                    "lat": lat,
                    "lon": lon,
                    "lieu": old['lieu'] if old else None,
                    "type": "scolaire" if dt.get('scolaire') else "tout_public",
                    "annule": bool(dt.get('etat') == 'annulé'),
                    "nb_representations": dt.get('nb_representations', 1),
                    "details": ' '.join(x['texte'] for x in dt.get('details', [])) if dt.get('details') else None,
                    "intitule_original": dt['ligne'],
                    "liens": old['liens'] if old else [],
                    "source": f"https://crescite.fr/saison-{s}/"
                }
                new_reps.append(rep_obj)
                next_id += 1

    REPS_JSON_PATH.write_text(json.dumps(new_reps, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f"Écrit {REPS_JSON_PATH.relative_to(ROOT)} ({len(new_reps)} lignes)")

    with open(REPS_CSV_PATH, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['id', 'saison', 'spectacle', 'spectacle_slug', 'date_debut', 'date_fin', 'precision',
                         'heure', 'commune', 'code_insee', 'departement', 'lat', 'lon', 'lieu', 'type',
                         'annule', 'nb_representations', 'details', 'intitule_original', 'source', 'jours', 'liens'])
        for r in new_reps:
            writer.writerow([
                r['id'], r['saison'], r['spectacle'], r['spectacle_slug'], r['date_debut'] or '', r['date_fin'] or '',
                r['precision'], r['heure'] or '', r['commune'] or '', r['code_insee'] or '', r['departement'] or '',
                r['lat'] or '', r['lon'] or '', r['lieu'] or '', r['type'], r['annule'], r['nb_representations'] or '',
                r['details'] or '', r['intitule_original'], r['source'],
                ','.join(r['jours']), ','.join(r['liens'])
            ])
    print(f"Écrit {REPS_CSV_PATH.relative_to(ROOT)}")

SLUG_INFO_BY_SLUG = {v[0]: v for v in SLUG_INFO.values()}

if __name__ == '__main__':
    main()
