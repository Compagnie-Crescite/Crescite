'use strict';
/* L'habillage de l'administration : la même famille que le site (Ubuntu pour les titres, Open Sans pour le texte, Raleway
   pour les étiquettes en capitales espacées ; le papier chaud, le magenta de la compagnie), un en-tête de nuit, des cartes
   douces et colorées, des tuiles à icônes, des boutons en dégradé. Chargé en dernier : ses règles passent après celles
   d'index.html et des modules (equipe.js, planning.js, disponibilites.js, tableau.js, gestes.js, menus.js), qui gardent
   la structure et le comportement ; ici, rien que l'apparence, en clair comme en sombre, aux couleurs (--accent, --carte,
   --trait, --doux…) que tout le monde lit. Les polices viennent de Google Fonts (index.html) ; sans elles, le système. */
(() => {
  document.head.insertAdjacentHTML('beforeend', `<style id="styles-habillage">
/* ===================================================================================================== les couleurs */
:root {
  --police: "Open Sans", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --titres: "Ubuntu", "Open Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --etiq: "Raleway", "Open Sans", system-ui, sans-serif;
  --fond: #f5efe8; --carte: #fffdf9; --encre: #26191f; --gris: #6e6068; --trait: #e8ddd9; --doux: #f7f0ef;
  --accent: #bc3e80; --accent-fonce: #9a2d68; --accent-doux: #fae4ee;
  --prune: #6b2c64; --prune-doux: #f2e4f0; --corail: #d8573a; --corail-doux: #fbe7e1; --ambre: #c4861b; --ambre-doux: #fbf0d8;
  --sauge: #3a8a68; --sauge-doux: #e2f2ea; --indigo: #4456b2; --indigo-doux: #e6e9f8; --ciel: #2b7db5; --ciel-doux: #e1effa;
  --ok: #2b7f56; --ok-doux: #e1f3e8; --alerte: #b73226; --alerte-doux: #fbe6e3; --option: #8a6413; --option-doux: #f9efd6;
  --ombre: 0 1px 2px rgba(70, 30, 55, .05), 0 12px 32px -14px rgba(70, 30, 55, .22);
  --rayon: 16px;
  --barre-fond: linear-gradient(90deg, #2b1527 0%, #3d1c3a 55%, #4b2147 100%);
  --principal: linear-gradient(135deg, #bc3e80 0%, #6b2c64 120%);
  --pieuvre: #f08cc4;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --fond: #160f17; --carte: #221923; --encre: #f4edf2; --gris: #b6aab4; --trait: #3a2f3d; --doux: #2b2230;
    --accent: #e67ab2; --accent-fonce: #f39bcb; --accent-doux: #3b2134;
    --prune: #cf9bcb; --prune-doux: #33253a; --corail: #f28a6c; --corail-doux: #3d2621; --ambre: #e9b55c; --ambre-doux: #3a2d17;
    --sauge: #82d1aa; --sauge-doux: #1d3329; --indigo: #9cabf0; --indigo-doux: #232a44; --ciel: #7fc2ec; --ciel-doux: #1d2f3e;
    --ok: #6fd3a0; --ok-doux: #1d3329; --alerte: #ff8a80; --alerte-doux: #3a1f1d; --option: #e9c46a; --option-doux: #352b17;
    --ombre: 0 1px 2px rgba(0, 0, 0, .35), 0 12px 32px -14px rgba(0, 0, 0, .6);
    --barre-fond: linear-gradient(90deg, #120a13 0%, #221224 60%, #2c1530 100%);
    --pieuvre: #f29bcb;
  }
}
/* deux halos en haut de page (magenta à gauche, ambre à droite), une fois : sans répétition sous les pages courtes */
html { min-height: 100%; }
body { min-height: 100%; background: radial-gradient(1100px 540px at -5% -10%, color-mix(in srgb, var(--accent) 11%, transparent), transparent 60%), radial-gradient(900px 480px at 105% -5%, color-mix(in srgb, var(--ambre) 13%, transparent), transparent 55%), var(--fond); background-repeat: no-repeat; }

/* ===================================================================================================== l'en-tête */
.barre { background: var(--barre-fond); border-bottom: 0; color: #fff; box-shadow: 0 8px 28px -14px rgba(30, 10, 30, .55); }
.marque { color: #fff; font-family: var(--titres); font-weight: 700; }
.marque small { color: rgba(255, 255, 255, .72); font-family: var(--etiq); font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
.marque .pieuvre { color: var(--pieuvre); }
.nav a { color: rgba(255, 255, 255, .8); font-family: var(--etiq); font-size: 12px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; padding: 8px 12px; transition: background .15s, color .15s; }
.nav a:hover { background: rgba(255, 255, 255, .12); color: #fff; }
.nav a[aria-current="page"] { color: #fff; box-shadow: 0 6px 16px -6px rgba(188, 62, 128, .8); }
.qui { color: rgba(255, 255, 255, .72); }
.qui a { color: #fff; }
.barre .btn { background: rgba(255, 255, 255, .08); border-color: rgba(255, 255, 255, .22); color: #fff; }
.barre .btn:hover { background: rgba(255, 255, 255, .16); border-color: rgba(255, 255, 255, .45); }
.chercher { background: rgba(255, 255, 255, .09); border-color: rgba(255, 255, 255, .18); color: rgba(255, 255, 255, .86); }
.chercher:hover { background: rgba(255, 255, 255, .15); border-color: rgba(255, 255, 255, .5); color: #fff; }
.barre kbd { background: rgba(255, 255, 255, .12); border-color: rgba(255, 255, 255, .22); color: #fff; }
.direct::before { background: rgba(255, 255, 255, .35); }
.direct.on::before { background: #4fd68e; box-shadow: 0 0 0 3px rgba(79, 214, 142, .22); }
@media (max-width: 860px) { .nav { -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 32px), transparent); mask-image: linear-gradient(to right, #000 calc(100% - 32px), transparent); } }

/* ===================================================================================================== les titres, les étiquettes */
h1, h2, h3, .tete h1, .editeur h2, .bloc h3, .connexion h1, .fr-tete h1, dialog h2 { font-family: var(--titres); letter-spacing: -.01em; }
.tete h1 { font-size: 27px; font-weight: 700; }
.editeur h2 { font-size: 22px; }
.bloc h3 { font-size: 16px; }
.tb-cat h3, table.simple th, table.reps th, .crm-col-tete, .docs-titre, .rch-entete, .tb-pan-l .lib, .tb-kpi span, .tb-courbe-t, .dist-l.dist-entete, .tb-salut-jour, .tb-salut-chiffres span {
  font-family: var(--etiq); font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
.tb-cat h3 { font-size: 11px; }
table.simple th, table.reps th { font-size: 11px; }
.champ > label, .champ > .lib { font-weight: 700; color: var(--encre); }
.rch-type { font: 700 10px/1.5 var(--etiq); letter-spacing: .08em; text-transform: uppercase; padding: 2px 8px; border-radius: 999px; background: var(--doux); color: var(--gris); }

/* ===================================================================================================== les cartes, les lignes */
.bloc, .tb-tuile, .filtres, .crm-carte, .item, dialog.recherche, dialog.tab-dialogue, dialog.tb-brief, .gf-boite, .gm-boite { border-color: var(--trait); box-shadow: var(--ombre); }
.bloc, .filtres { border-radius: var(--rayon); }
.bloc + .bloc { margin-top: 18px; }
.ligne, .tb-l { background: var(--carte); border: 1px solid var(--trait); border-left: 4px solid var(--c, var(--trait)); box-shadow: 0 1px 2px rgba(60, 30, 50, .04); transition: transform .15s, box-shadow .15s, background .15s, border-color .15s; }
.ligne:hover, .tb-l:hover { transform: translateY(-1px); box-shadow: var(--ombre); border-color: var(--trait); border-left-color: var(--c, var(--accent)); background: color-mix(in srgb, var(--carte) 86%, var(--c, var(--accent))); }
.ligne[aria-current="true"] { background: color-mix(in srgb, var(--carte) 80%, var(--c, var(--accent))); box-shadow: 0 0 0 3px color-mix(in srgb, var(--c, var(--accent)) 30%, transparent); border-color: color-mix(in srgb, var(--c, var(--accent)) 55%, var(--trait)); }
.ligne .jj, .tb-jj { position: relative; width: 42px; padding: 7px 0 4px; border-radius: 9px; overflow: hidden; background: var(--doux); font-family: var(--etiq); font-weight: 700; font-size: 10px; letter-spacing: .04em; text-transform: uppercase; color: var(--gris); text-align: center; line-height: 1.15; }
.ligne .jj::before, .tb-jj::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 4px; background: var(--c, var(--accent)); }
.ligne .jj b, .tb-jj b { display: block; font: 700 19px/1.15 var(--titres); letter-spacing: 0; color: var(--encre); }
.tb-jj:empty { background: none; }
.tb-jj:empty::before { display: none; }
.ligne .t, .tb-l-t { font-weight: 700; }
.pastille { box-shadow: 0 0 0 2px color-mix(in srgb, var(--c, var(--accent)) 25%, transparent); }
.liste-simple li { background: var(--carte); border: 1px solid var(--trait); }
.vide, .tb-rien { font-family: var(--titres); font-size: 14.5px; font-weight: 500; }
.tb-rien.ok { color: var(--ok); }

/* ===================================================================================================== les boutons, les badges, les champs */
.btn { border-radius: 10px; border-color: var(--trait); background: var(--carte); font-weight: 600; transition: transform .12s, box-shadow .12s, border-color .12s, background .12s, filter .12s; }
.btn:hover { border-color: color-mix(in srgb, var(--accent) 45%, var(--trait)); background: color-mix(in srgb, var(--accent-doux) 55%, var(--carte)); }
.btn.principal, .gf-btn.principal, .seg button[aria-pressed="true"], .nav a[aria-current="page"], .puce[aria-pressed="true"]:not([style*="--c"]) { background: var(--principal); border-color: transparent; color: #fff; }
.btn.principal { box-shadow: 0 8px 18px -10px color-mix(in srgb, var(--accent) 80%, transparent); }
.btn.principal:hover, .gf-btn.principal:hover { background: var(--principal); filter: brightness(1.08); transform: translateY(-1px); color: #fff; }
.btn.danger:hover { border-color: var(--alerte); background: var(--alerte-doux); color: var(--alerte); }
.btn.lien { background: none; border-color: transparent; }
.btn.lien:hover { background: var(--accent-doux); border-color: transparent; }
.btn.petit { border-radius: 8px; }
.badge { font: 700 11px/1.5 var(--etiq); letter-spacing: .02em; }
.badge.sco { background: var(--indigo-doux); color: var(--indigo); }
.puce { border-radius: 999px; transition: background .12s, border-color .12s; }
.puce:hover { border-color: var(--accent); }
.seg { border-radius: 10px; }
.seg button { transition: background .12s, color .12s; }
.onglets-ed button[aria-selected="true"] { background: var(--encre); color: var(--carte); }
input[type=text], input[type=email], input[type=password], input[type=url], input[type=search], input[type=date], input[type=time], input[type=number], select, textarea, .riche { border-radius: 10px; background: var(--carte); border: 1px solid var(--trait); transition: border-color .12s, box-shadow .12s; }
input:focus, select:focus, textarea:focus, .riche:focus { border-color: var(--accent); box-shadow: 0 0 0 4px var(--accent-doux); }
.case input { accent-color: var(--accent); }
kbd { font-family: var(--etiq); }

/* ===================================================================================================== les tuiles du tableau de bord */
.tb-tuile { --tuile: var(--accent); --tuile-doux: var(--accent-doux); border-radius: var(--rayon); border-top: 3px solid var(--tuile); overflow: hidden; transition: box-shadow .2s; }
.tb-tuile:hover { box-shadow: 0 1px 2px rgba(70, 30, 55, .06), 0 18px 40px -18px rgba(70, 30, 55, .3); }
.tb-tuile[data-k="urgent"] { --tuile: var(--corail); --tuile-doux: var(--corail-doux); }
.tb-tuile[data-k="avant"] { --tuile: var(--ambre); --tuile-doux: var(--ambre-doux); }
.tb-tuile[data-k="prochaines"] { --tuile: var(--indigo); --tuile-doux: var(--indigo-doux); }
.tb-tuile[data-k="chiffres"] { --tuile: var(--sauge); --tuile-doux: var(--sauge-doux); }
.tb-tuile[data-k="equipe"] { --tuile: var(--prune); --tuile-doux: var(--prune-doux); }
.tb-tuile[data-k="diffusion"] { --tuile: var(--ciel); --tuile-doux: var(--ciel-doux); }
.tb-tuile[data-k="propositions"] { --tuile: var(--accent); --tuile-doux: var(--accent-doux); }
.tb-tuile[data-k="ateliers"] { --tuile: var(--ambre); --tuile-doux: var(--ambre-doux); }
.tb-tuile[data-k="journal"] { --tuile: var(--gris); --tuile-doux: var(--doux); }
.tb-tuile[data-k="spectacles"] { --tuile: var(--prune); --tuile-doux: var(--prune-doux); }
.tb-tuile[data-k="memo"] { --tuile: var(--ambre); --tuile-doux: var(--ambre-doux); }
.tb-tete { background: linear-gradient(to bottom, color-mix(in srgb, var(--tuile-doux) 65%, var(--carte)), var(--carte)); border-bottom-color: color-mix(in srgb, var(--trait) 70%, transparent); padding: 10px 8px 9px 12px; }
.tb-tete h2 { font-family: var(--titres); font-size: 15.5px; font-weight: 700; }
.tb-ico-t { display: inline-grid; place-items: center; flex: none; width: 26px; height: 26px; border-radius: 8px; background: var(--tuile-doux); color: var(--tuile); }
.tb-ico-t svg { width: 15px; height: 15px; }
.tb-lien { color: var(--tuile); }
.tb-lien:hover { background: var(--tuile-doux); }
.tb-tete .badge.option { background: var(--tuile); color: var(--carte); }
.tb-tete .badge.ok { background: var(--ok-doux); color: var(--ok); }
.tb-kpi > * { background: linear-gradient(135deg, color-mix(in srgb, var(--tuile-doux) 80%, var(--carte)), var(--carte)); border: 1px solid var(--trait); border-radius: 12px; }
.tb-kpi > a:hover { border-color: var(--tuile); background: var(--tuile-doux); }
.tb-kpi b { font-family: var(--titres); font-size: 26px; color: var(--tuile); }
.tb-kpi > .ok b { color: var(--ok); }
.tb-kpi > .alerte b { color: var(--alerte); }
.tb-actions .btn { border-radius: 12px; }
.tb-actions .btn.principal { background: var(--principal); }
.tb-ico[data-tb-filtre][aria-pressed="true"] { background: var(--accent); color: var(--carte); }
.tb-salut-chiffres li { background: color-mix(in srgb, var(--carte) 92%, transparent); }
.tb-cat h3 .badge { background: var(--tuile); color: var(--carte); letter-spacing: 0; }
.tb-cat-tag { font-family: var(--etiq); }
.tb-traiter { border-radius: 10px; color: var(--tuile); }
.tb-traiter:hover, .tb-traiter:focus-visible { background: var(--tuile); border-color: var(--tuile); color: var(--carte); }
.tb-lt.epingle > .tb-l { background: color-mix(in srgb, var(--carte) 75%, var(--tuile-doux)); }
.tb-sp { background: var(--carte); border: 1px solid var(--trait); border-left: 4px solid var(--c, var(--trait)); }
.tb-barres button i { background: color-mix(in srgb, var(--tuile) 65%, var(--carte)); }
.tb-barres button:hover i, .tb-barres button:focus-visible i { background: var(--tuile); }
.tb-pipe { background: var(--doux); }
.tb-memo { border-radius: 12px; background: color-mix(in srgb, var(--ambre-doux) 55%, var(--carte)); border-color: color-mix(in srgb, var(--ambre) 35%, var(--trait)); font-family: var(--police); }
.tb-filtre { background: var(--accent-doux); }
.tb-grille.edition .tb-tuile { outline-color: color-mix(in srgb, var(--accent) 45%, transparent); }
.tb-panneau { border-radius: var(--rayon); }
dialog.tb-brief { border-radius: var(--rayon); }
.tb-brief-dates li { border-radius: 10px; }

/* ===================================================================================================== la diffusion (Kanban), le journal, les annonces, les fenêtres */
.crm-colonne { background: color-mix(in srgb, var(--carte) 65%, var(--doux)); border-radius: var(--rayon); }
.crm-colonne:nth-child(1) { --col: var(--ciel); } .crm-colonne:nth-child(2) { --col: var(--indigo); } .crm-colonne:nth-child(3) { --col: var(--ambre); } .crm-colonne:nth-child(4) { --col: var(--sauge); } .crm-colonne:nth-child(5) { --col: var(--gris); }
.crm-col-tete { font-size: 11.5px; color: var(--col, var(--gris)); padding-bottom: 7px; border-bottom: 2px solid var(--col, var(--trait)); }
.crm-carte { border-radius: 12px; }
.crm-carte:hover { border-color: var(--accent); box-shadow: var(--ombre); }
.crm-carte-cession { color: var(--sauge); }
.journal-ligne:hover { background: color-mix(in srgb, var(--doux) 60%, var(--carte)); }
.journal-ligne .quand { font-family: var(--etiq); font-weight: 600; font-size: 12px; }
table.simple { border-radius: var(--rayon); }
table.simple tr.cliquable:hover td { background: color-mix(in srgb, var(--accent-doux) 55%, var(--carte)); }
.annonce { background: #2b1527; border-left: 4px solid var(--accent); border-radius: 12px; box-shadow: 0 16px 44px -12px rgba(30, 10, 30, .55); font-weight: 500; }
.annonce.erreur { background: #7d1d16; border-left-color: #ffb4ab; }
.annonce button { border-radius: 8px; }
dialog.recherche, dialog.tab-dialogue, dialog.tb-brief { border-radius: var(--rayon); }
.rch-tete { border-bottom-color: var(--trait); }
.rch-tete:focus-within { border-bottom-color: var(--accent); }
.rch-liste [role=option][aria-selected=true] { background: color-mix(in srgb, var(--accent-doux) 80%, var(--carte)); box-shadow: inset 3px 0 0 var(--accent); }
.gm-boite, .gf-boite { border-radius: 14px; }
.gf-tete h2 { font-family: var(--titres); }
.gf-seg button[aria-pressed="true"] { background: var(--principal); border-color: transparent; color: #fff; }
.avatar { background: linear-gradient(135deg, var(--accent-doux), var(--prune-doux)) center/cover no-repeat; color: var(--prune); font-family: var(--titres); box-shadow: 0 0 0 2px var(--carte), 0 0 0 3px color-mix(in srgb, var(--accent) 35%, transparent); }
.connexion form { border-top: 4px solid var(--accent); }
.connexion h1 { font-size: 26px; }
@media (prefers-reduced-motion: reduce) { .ligne, .tb-l, .btn, .tb-tuile { transition: none; } .ligne:hover, .tb-l:hover, .btn.principal:hover { transform: none; } }
</style>`);
})();
