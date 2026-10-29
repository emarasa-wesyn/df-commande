# Écarts à trancher

| Règle de la spec | Constat (comportement du code) | Question au métier |
|---|---|---|
| Règle 1 : seules les commandes livrées rapportent des points ; en préparation, expédiée ou annulée n’en rapportent aucun. | Seul le statut `annulee` est exclu : une commande `en_cours`, `en_preparation` ou `expediee` (ou tout autre statut) rapporte des points comme une commande livrée (100 € HT → 10 points au lieu de 0). | Les commandes en préparation ou expédiées doivent-elles rapporter des points dès maintenant, ou seulement une fois livrées comme le dit la spec ? |
| Règle 6 : de 500 à 1 999 points → Argent. | À exactement 500 points, le palier est Bronze (seuil Argent strict : plus de 500), y compris pour un grand compte à 500 points après doublement. Le seuil Or à 2 000 est bien inclusif. | Un client à 500 points pile doit-il être Argent (spec) ou Bronze (code actuel) ? |
