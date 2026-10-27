#!/usr/bin/env bash
# Tous les bancs de l'administration, l'un après l'autre : le filet à passer avant de rendre un lot.
#   bash site/bancs-admin.sh            construit, vérifie les modules, lance les bancs de l'administration
#   bash site/bancs-admin.sh --tout     … et, toujours, ceux de l'espace de l'équipe (gestes-equipe, mouvement-equipe)
#   bash site/bancs-admin.sh --planche  réservée (la planche de contrôle du lot 17) : sans effet aujourd'hui
#   BASE=<réf> bash site/bancs-admin.sh la référence du diff (par défaut origin/ccr-ab0239c0-lqdc60)
#
# Ce que fait le script, dans l'ordre :
#   1. python3 site/build.py : la page servie aux bancs vient de site/dist/admin/index.html, jamais de admin/index.html ;
#   2. la vérification des modules : chaque <script src="x.js"> local d'admin/index.html doit exister dans docs/admin/
#      ET dans site/dist/admin/. Le harnais sert admin/*.js depuis les sources et ne verrait pas un module oublié du
#      tuple de site/build.py : sans cette vérification, docs/admin serait cassé sans qu'aucun banc ne rougisse
#      (le remède : ajouter le nom du module au tuple de la fonction admin(dest), puis python3 site/build.py --pages) ;
#   3. les bancs de la liste BANCS, dans cet ordre, l'un après l'autre (le banc du mouvement mesure des durées : jamais
#      en parallèle). Un banc rouge est relancé une fois ; s'il rougit encore, la chaîne s'arrête. Un banc listé mais
#      absent est rouge ;
#   4. les bancs de l'espace de l'équipe (BANCS_EQUIPE), quand le diff contre BASE touche admin/gestes.js,
#      admin/planning.js ou admin/feuille.js — modules que l'équipe partage — ou toujours avec --tout ;
#   5. un résumé : chaque banc, son compte, sa durée.
# Pour ajouter le banc d'un lot : une ligne dans BANCS (ou BANCS_EQUIPE), en queue de liste. Sort en erreur au premier banc
# rouge (après sa relance), ou si un module manque.
set -u
cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 2

# ---- la liste des bancs (site/<nom>.mjs) : les lots suivants y ajoutent les leurs
BANCS=(tableau niveau adresses-admin mouvement-admin prefs tableur code-salles)
# ---- ceux de l'espace de l'équipe, lancés quand un module partagé change
BANCS_EQUIPE=(gestes-equipe mouvement-equipe)
PARTAGES='^admin/(gestes|planning|feuille)\.js$'
BASE="${BASE:-origin/ccr-ab0239c0-lqdc60}"

TOUT=0
for arg in "$@"; do
  case "$arg" in
    --tout) TOUT=1 ;;
    --planche) echo "(--planche : réservée à la planche de contrôle, sans effet pour l'instant)" ;;
    -h|--aide) sed -n '2,21p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "option inconnue : $arg (voir --aide)" >&2; exit 2 ;;
  esac
done

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
RESUME=()      # une ligne par banc : nom, compte, durée
ROUGE=""      # le nom du banc rouge qui a arrêté la chaîne

titre() { printf '\n== %s\n' "$1"; }

# ---- 1. la construction
titre "construction (python3 site/build.py)"
if ! python3 site/build.py > "$TMP" 2>&1; then
  cat "$TMP"; echo "ROUGE : la construction a échoué" >&2; exit 1
fi
tail -n 1 "$TMP"

# ---- 2. chaque module chargé par la page existe dans docs/admin/ et dans site/dist/admin/
titre "modules chargés par admin/index.html"
MANQUES=0
NB=0
while IFS= read -r src; do
  [ -z "$src" ] && continue
  case "$src" in http:*|https:*|//*|/*|data:*) continue ;; esac
  f="${src%%\?*}"
  NB=$((NB + 1))
  for dossier in docs/admin site/dist/admin; do
    if [ ! -f "$dossier/$f" ]; then
      echo "  ✗ $f manque dans $dossier/"
      MANQUES=$((MANQUES + 1))
    fi
  done
done < <(grep -oE '<script[^>]* src="[^"]+"' admin/index.html | sed -E 's/.* src="([^"]+)"/\1/')
if [ "$MANQUES" -gt 0 ]; then
  echo "ROUGE : $MANQUES fichier(s) absent(s). Un module nouveau s'ajoute au tuple de la fonction admin(dest) de site/build.py, puis : python3 site/build.py --pages" >&2
  exit 1
fi
echo "  ✓ $NB modules, tous dans docs/admin/ et site/dist/admin/"

# ---- 3 et 4. les bancs
# lancer NOM : 0 si vert ; remplit RESUME ; un rouge est relancé une fois
lancer() {
  local nom="$1" fichier="site/$1.mjs" debut fin essai rc=1 relance=""
  titre "node $fichier"
  if [ ! -f "$fichier" ]; then
    echo "  ✗ $fichier est absent"
    RESUME+=("$(printf '%-18s %-34s %s' "$nom" "ABSENT" "-")")
    return 1
  fi
  debut=$(date +%s)
  for essai in 1 2; do
    node "$fichier" > "$TMP" 2>&1; rc=$?
    [ "$rc" -eq 0 ] && break
    if [ "$essai" -eq 1 ]; then echo "  rouge au premier passage, relancé une fois"; relance=" (relancé)"; grep -E '^\s+✗' "$TMP" | head -n 8; fi
  done
  fin=$(date +%s)
  local derniere; derniere="$(grep -v '^\s*$' "$TMP" | tail -n 1 | sed 's/ · captures dans.*//')"
  if [ "$rc" -ne 0 ]; then
    cat "$TMP"
    RESUME+=("$(printf '%-18s %-34s %ss' "$nom" "ROUGE : $derniere" "$((fin - debut))")")
    return 1
  fi
  echo "  ✓ $derniere"
  RESUME+=("$(printf '%-18s %-34s %ss%s' "$nom" "$derniere" "$((fin - debut))" "$relance")")
  return 0
}

LISTE=("${BANCS[@]}")
if [ "$TOUT" -eq 1 ]; then
  LISTE+=("${BANCS_EQUIPE[@]}")
elif git rev-parse --verify --quiet "$BASE" > /dev/null; then
  if git diff --name-only "$BASE" | grep -qE "$PARTAGES"; then
    echo; echo "(gestes.js, planning.js ou feuille.js changent par rapport à $BASE : les bancs de l'équipe suivent)"
    LISTE+=("${BANCS_EQUIPE[@]}")
  fi
else
  echo; echo "(la référence $BASE est introuvable : les bancs de l'équipe sont lancés par prudence ; BASE=… la désigne)"
  LISTE+=("${BANCS_EQUIPE[@]}")
fi

for nom in "${LISTE[@]}"; do
  if ! lancer "$nom"; then ROUGE="$nom"; break; fi
done

# ---- 5. le résumé
titre "résumé"
printf '%-18s %-34s %s\n' "banc" "compte" "durée"
for l in "${RESUME[@]}"; do echo "$l"; done
if [ -n "$ROUGE" ]; then
  echo; echo "ROUGE : la chaîne s'est arrêtée sur le banc « $ROUGE »." >&2
  exit 1
fi
echo; echo "VERT : ${#LISTE[@]} bancs."
