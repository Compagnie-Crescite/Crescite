/* Les données vivantes, communes aux maquettes (build.py l'ajoute après les données D, avant la carte).
   D est d'abord l'instantané du dépôt, pour un premier affichage immédiat ; quand la base de la compagnie répond, D est
   remplacé EN PLACE par son contenu (mêmes objets de premier niveau : D.site, D.shows, D.dates, D.saisons, D.carte…),
   puis de nouveau à chaque enregistrement fait dans l'administration (temps réel).

   DONNEES.surChangement(fn)   fn() est appelée après chaque mise à jour de D : refais la vue courante en place, sans
                               remonter en haut, sans voler le focus, sans rejouer l'ouverture ni les animations d'entrée.
                               Le rendu de chaque vue relit donc D à chaque fois (aucune copie figée au chargement).
   DONNEES.etat                'instantane' (données du dépôt), 'base' (à jour avec la base) ou 'hors-ligne'.

   Version provisoire : la connexion à la base arrive ensuite ; l'interface ci-dessus ne changera pas. */
const DONNEES = (() => {
  const abonnes = [];
  const surChangement = fn => { if (typeof fn === 'function') abonnes.push(fn); };
  const prevenir = () => abonnes.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
  return { surChangement, prevenir, etat: 'instantane' };
})();
