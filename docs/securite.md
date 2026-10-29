➜  df-commandes-fuite git:(main) gitleaks git -v .

    ○
    │╲
    │ ○
    ○ ░
    ░    gitleaks

Finding:     DF_TRANSPORTEUR_API_KEY=dftr_live_R713KRpj65mfjxzZEKk6swxD3kADMjyz
Secret:      dftr_live_R713KRpj65mfjxzZEKk6swxD3kADMjyz
RuleID:      generic-api-key
Entropy:     4.802916
File:        .env
Line:        2
Commit:      1ddf3b056cbc863c3ffe033f88d139f1ee4ecb60
Author:      Néotis
Email:       dev@neotis.example
Date:        2023-05-11T15:48:00Z
Fingerprint: 1ddf3b056cbc863c3ffe033f88d139f1ee4ecb60:.env:generic-api-key:2
Link:        https://github.com/alexxzee/df-commandes-fuite/blob/1ddf3b056cbc863c3ffe033f88d139f1ee4ecb60/.env#L2

Finding:     const TRANSPORTEUR_API_KEY = 'dftr_live_R713KRpj65mfjxzZEKk6swxD3kADMjyz'
Secret:      dftr_live_R713KRpj65mfjxzZEKk6swxD3kADMjyz
RuleID:      generic-api-key
Entropy:     4.802916
File:        src/config.js
Line:        4
Commit:      91f09550e599ff25bed3c7d827f368c4782fdf09
Author:      Néotis
Email:       dev@neotis.example
Date:        2023-05-12T07:05:00Z
Fingerprint: 91f09550e599ff25bed3c7d827f368c4782fdf09:src/config.js:generic-api-key:4
Link:        https://github.com/alexxzee/df-commandes-fuite/blob/91f09550e599ff25bed3c7d827f368c4782fdf09/src/config.js#L4

1:56PM INF 17 commits scanned.
1:56PM INF scanned ~147958 bytes (147.96 KB) in 72.6ms
1:56PM WRN leaks found: 2



# Fuite de la clé du transporteur
## Ce qui a fui
| Fuite                   | Fichier        | Commit                                    | Fichier encore présent ? |
|-------------------------|----------------|-------------------------------------------|--------------------------|
| DF_TRANSPORTEUR_API_KEY | .env           | 1ddf3b056cbc863c3ffe033f88d139f1ee4ecb60  | non                      |
| TRANSPORTEUR_API_KEY    | src/config.js  | 91f09550e599ff25bed3c7d827f368c4782fdf09  | oui                      |


## Ce qu’on fait, dans l’ordre
1. Révoquer la clé chez le transporteur et en émettre une nouvelle : c’est la seule étape
   qui rend la fuite inoffensive.
2. Ranger la nouvelle clé dans .env en local et dans les secrets du dépôt pour la CI.
3. Prévenir la récidive : clé lue dans l’environnement, .env ignoré, hook gitleaks, règle
   dans les instructions de l’assistant.

Le hook n’a pas vu : MOT_DE_PASSE_BASE (ligne 2 de piege.js), parce que le mot de passe est trop basique.