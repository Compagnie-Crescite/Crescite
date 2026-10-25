/* Le thème du site public (règle 19 du contrat) : la nuit, et elle seule. La compagnie a retiré le jour du site public
   (octobre 2026) : plus de bouton, plus de bascule. Le jour et la nuit restent à l'administration et aux espaces
   personnels (équipe, salles), qui suivent le réglage de l'appareil. La bascule d'avant (le cercle depuis le bouton,
   l'icône soleil et lune, le choix gardé) est dans l'historique du dépôt, si on la veut un jour ailleurs.

   build.py ajoute ce fichier dans <head>, avant toute feuille de style : data-theme="nuit" est posé sur <html> avant le
   premier dessin (pas d'éclair), quel que soit le réglage de l'appareil ou un choix gardé d'une visite d'avant (la clé
   « crescite-theme » est effacée). Chaque maquette garde ses palettes (html[data-theme="nuit"] …, color-scheme compris) ;
   seule la nuit sert.

   THEME.actuel()                 'nuit'
   THEME.seul                     true : le site n'a qu'un thème, une maquette n'a pas de place à prévoir pour un bouton
   THEME.bouton(), THEME.icone()  '' : les appels d'avant ne dessinent plus rien
   THEME.choisir(), basculer()    sans effet (une promesse résolue)
   THEME.surChangement(fn)        accepté, jamais appelé : le thème ne change pas */
const THEME = (() => {
  'use strict';
  document.documentElement.dataset.theme = 'nuit';         // avant le premier dessin : pas d'éclair
  try { localStorage.removeItem('crescite-theme'); } catch (e) { /* stockage indisponible : rien à effacer */ }
  const rien = () => Promise.resolve();
  return { actuel: () => 'nuit', seul: true, choisir: rien, basculer: rien, bouton: () => '', icone: () => '', surChangement: () => {} };
})();
