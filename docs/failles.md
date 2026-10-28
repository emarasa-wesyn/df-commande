<!-- À compléter pendant l’exercice. -->

# Grille des cinq failles : `exercices/failles/import-clients.js`

Une ligne du tableau par faille trouvée : le numéro de ligne affiché par VS Code, la catégorie recopiée telle quelle, et ce que fait la ligne, en quelques mots.

Les cinq catégories : Secret en dur ; Requête construite à la main ; Exécution de donnée ; Vérification désactivée ; Journal trop bavard.

| Ligne | Catégorie                    | Ce que fait la ligne                                                                          |
|-------|------------------------------|-----------------------------------------------------------------------------------------------|
| 8     | Secret en dur                | Mot de passe en clair dans une constante                                                      |
| 33    | Journal trop bavard          | Log du server /user / mdp de la bdd                                                           |
| 15    | Vérification désactivée      | rejectUnauthorized false                                                                      |
| 39    | Requête construite à la main | on met dans la requête sql : WHERE nom = '${client.nom}' qui provient du fichier csv d'entrée |
| 41    | Exécution de donnée          | eval sur grandCompte du fichier csv                                                           |
 