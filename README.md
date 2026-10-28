# D&F Commandes

## Présentation

API de devis et de commandes de Delmas & Fournier, maintenue par Néotis (version 1.4.2).

Elle permet de consulter les clients et les produits, de calculer et d'enregistrer des devis, de transformer un devis en commande, d'annoncer l'expédition d'une commande et d'exporter les commandes au format CSV.

Toutes les clés et tous les mots de passe présents dans ce dépôt, y compris dans son historique, sont fictifs et invalides.

## Prérequis

- Node.js 22.13 ou plus récent (champ `engines` de `package.json`).
- npm.
- Base de données : à compléter (type, création du schéma, jeu de données initial).

## Installation et lancement

```
npm install
npm start
```

`npm start` lance `src/server.js`. Le serveur écoute sur le port `3000` par défaut (voir `PORT` ci-dessous).

Pour lancer le serveur avec les variables d'un fichier `.env` à la racine :

```
npm run start:local
```

Contenu attendu du fichier `.env` : à compléter.

## Variables d'environnement

| Variable | Rôle | Valeur par défaut |
|---|---|---|
| `PORT` | Port d'écoute du serveur HTTP | `3000` |
| `DF_TRANSPORTEUR_API_KEY` | Clé de l'API du transporteur, utilisée pour annoncer les expéditions | Une clé écrite en dur dans `src/config.js` (voir « Limites connues ») |

L'URL de l'API du transporteur est fixée dans `src/config.js` et ne se règle pas par variable d'environnement.

Autres variables éventuelles : à compléter.

## Points d'entrée

Tous les corps de requête et de réponse sont en JSON, sauf l'export CSV. En cas d'erreur, la réponse contient un champ `erreur`. Une erreur non prévue renvoie `500` avec `{ "erreur": "Erreur interne" }`.

| Méthode | Chemin | Rôle | Réponses |
|---|---|---|---|
| `GET` | `/sante` | Vérifie que le service répond | `200` `{ "statut": "ok" }` |
| `GET` | `/clients` | Liste les clients, triés par nom | `200` |
| `GET` | `/clients/:id` | Renvoie un client | `200`, `404` client introuvable |
| `GET` | `/produits` | Liste les produits, triés par référence ; filtre facultatif `?categorie=` | `200` |
| `GET` | `/produits/:reference` | Renvoie un produit | `200`, `404` produit introuvable |
| `POST` | `/devis` | Calcule et enregistre un devis | `201`, `400`, `404` |
| `GET` | `/devis/:id` | Renvoie un devis enregistré | `200`, `404` devis introuvable |
| `POST` | `/commandes` | Crée une commande à partir d'un devis, au statut `en_preparation` | `201`, `404` devis introuvable |
| `POST` | `/commandes/:id/expedition` | Passe la commande au statut `expediee` et renvoie l'annonce destinée au transporteur | `200`, `404` commande introuvable |
| `GET` | `/export/commandes` | Exporte les commandes en CSV ; filtre facultatif `?depuis=AAAA-MM-JJ` (par défaut `2000-01-01`) | `200` `text/csv` |

### `POST /devis`

Corps :

```json
{
  "clientId": 1,
  "lignes": [{ "reference": "REF-PRODUIT", "quantite": 10 }]
}
```

Réponse `201` : `id`, `clientId`, `date`, puis le détail du devis (`lignes`, `totalBrut`, `remiseClient`, `port`, `totalHT`, `tva`, `totalTTC`). Les règles de calcul sont décrites dans `docs/regles-remises.md`.

Erreurs :
- `404` si le client ou un produit est introuvable ;
- `400` si `lignes` n'est pas une liste, si elle est vide ou si une quantité est invalide.

### `POST /commandes`

Corps : `{ "devisId": 1 }`. Réponse `201` : `{ "id": …, "statut": "en_preparation" }`.

## Développement

| Commande | Rôle |
|---|---|
| `npm test` | Lance tous les tests (`node --test`) |
| `npm run test:couverture` | Lance les tests avec la couverture de `src/` |
| `npm run test:caracterisation` | Lance les tests de `test/caracterisation/` |
| `npm run lint` | Lance ESLint sur tout le dépôt |
| `npm run bench` | Mesure les performances de l'export (`scripts/bench-export.js`) |

Organisation du code :
- `src/app.js` : création de l'application Express et montage des routes ;
- `src/routes/` : une route par ressource (`clients`, `produits`, `devis`, `commandes`, `export`) ;
- `src/devis/calcul.js` : calcul des devis ;
- `src/legacy/export-commandes.js` : génération du CSV d'export ;
- `src/config.js` : configuration (port, transporteur).

Conventions de contribution, CI, procédure de livraison : à compléter.

## Limites connues

- **Clé du transporteur écrite en dur** : `src/config.js` contient une clé de repli, utilisée si `DF_TRANSPORTEUR_API_KEY` n'est pas définie. Une clé ne doit pas être versionnée : définir la variable d'environnement et retirer cette valeur par défaut.
- **Expédition non transmise** : `POST /commandes/:id/expedition` ne contacte pas le transporteur. La route change le statut et renvoie l'annonce qui serait envoyée, avec la clé masquée. Le code indique que l'appel réel est désactivé hors production ; le comportement en production est à compléter.
- **Pas d'authentification** : aucune route ne contrôle l'identité de l'appelant dans les fichiers de `src/routes/`.
- **Création de commande non transactionnelle** : `POST /commandes` insère la commande puis ses lignes sans transaction. Si un produit du devis n'existe plus, la requête échoue en `500` et laisse une commande sans toutes ses lignes.
- **Pas de contrôle de doublon** : un même devis peut être transformé plusieurs fois en commande.
- **Expédition sans contrôle de statut** : une commande peut être expédiée quel que soit son statut actuel.
- **Paramètre `depuis` non validé** : `GET /export/commandes` transmet la valeur telle quelle au module d'export.

## Pour la formation

1. Sur https://github.com/alexxzee/df-commandes : **Use this template**, **Create a new repository**, dépôt **privé** nommé `df-commandes`, sur votre compte.
2. Dans votre dépôt : **Settings**, **Collaborators** : ajoutez le compte GitHub du formateur.
3. Clonez votre dépôt et `df-verifications` côte à côte, puis `npm install`, et rendez votre travail par un push en fin de journée : détail dans `FORMATION.md`.