# Changelog

Toutes les évolutions notables de ce projet sont consignées dans ce fichier.

Le format s'appuie sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
et ce projet adhère au [Versionnage sémantique](https://semver.org/lang/fr/).

## [Non publié]

### Ajouté

- Plafond de remise sur les devis : le total des remises (remises de ligne et
  remise grand compte) ne dépasse plus 15 % du montant brut. Si le plafond est
  atteint, c'est la remise grand compte qui est réduite (`remiseClient`), les
  remises de ligne restent inchangées.

### Modifié

- La remise sur quantité de 5 % s'applique désormais dès 10 unités par ligne
  (auparavant à partir de 11). Une ligne de 10 unités renvoie donc une
  `remise` non nulle et un `net` plus bas qu'avant.
- Pour un client grand compte commandant de fortes quantités, `remiseClient`
  peut être plus faible qu'avant, à cause du nouveau plafond de 15 %.

### Corrigé

- Arrondi au centime : les montants situés pile à mi-centime sont désormais
  arrondis au centime le plus proche (par exemple 1,005 € donne 1,01 € au lieu
  de 1,00 €). Les montants `net`, `totalHT`, `tva` et `totalTTC` concernés
  peuvent varier d'un centime par rapport à l'ancienne version.
