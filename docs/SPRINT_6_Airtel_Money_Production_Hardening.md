# SPRINT 6 — AIRTEL MONEY PRODUCTION HARDENING

## 0. MISSION

Tu travailles sur le projet **Liguita**, un SaaS de gestion des objets perdus et trouvés au Tchad.

Le paiement particulier de Liguita fonctionne actuellement autour d'Airtel Money Tchad.

Le socle Airtel existe déjà, mais un audit technique a identifié plusieurs problèmes P0 qui empêchent de considérer le système comme suffisamment robuste pour des transactions réelles.

Ta mission est de réaliser le :

# SPRINT 6 — AIRTEL MONEY PRODUCTION HARDENING

Objectif principal :

> Rendre le flux de paiement Airtel Money robuste contre les doubles paiements, callbacks désordonnés, callbacks tardifs, erreurs réseau, retries et problèmes d'idempotence.

IMPORTANT :

- Ne casse PAS le flux Airtel actuellement fonctionnel.
- Ne remplace PAS l'intégration Airtel existante par une autre API.
- Ne modifie PAS arbitrairement les endpoints Airtel.
- Ne devine PAS les valeurs ou paramètres Airtel absents de la documentation.
- Ne passe PAS en production réelle.
- Le résultat doit être prêt pour une campagne UAT contrôlée.
- Les secrets Airtel ne doivent jamais apparaître dans le frontend, les logs, Git ou Supabase.
- Les statuts Airtel doivent être conservés tels quels.
- Les statuts internes Liguita doivent être séparés des statuts Airtel.

---

# 1. CONTEXTE AIRTEL DOCUMENTÉ

Pays : TD  
Devise : XAF

Environnement UAT :

`https://openapiuat.airtel.td`

Environnement production :

`https://openapi.airtel.td`

Application marchand :

`MA3XQHUG`

Mode actuel :

`TEST / UAT`

OAuth :

`Client Credentials`

Endpoint OAuth documenté :

`POST /auth/oauth2/token`

Endpoint de paiement actuellement utilisé :

`POST /merchant/v1/payments/`

Headers nécessaires :

`X-Country: TD`  
`X-Currency: XAF`  
`Authorization: Bearer <token>`

Le MSISDN consommateur doit être transmis au format local Airtel, sans `+235`.

---

# 2. DOCUMENTATION AIRTEL FOURNIE — RÈGLE ABSOLUE

Le projet dispose d'informations issues de la documentation Airtel Developer Portal.

Ne jamais inventer :

- un statut Airtel
- une valeur de wallet type
- une valeur de transaction type
- un endpoint
- un format de chiffrement
- un paramètre
- une règle métier Airtel

Si une information n'est pas documentée dans le projet, laisse un TODO explicite.

Ne remplace jamais une valeur inconnue par une valeur supposée.

---

# 3. STATUTS AIRTEL EXISTANTS

Le projet reconnaît actuellement notamment :

- TS
- TF
- TA
- TIP
- TE

Le mapping actuel existe déjà.

IMPORTANT :

Ne supprime pas ces statuts.

Conserve toujours le statut Airtel brut dans la transaction.

Exemple :

```ts
airtelStatus: "TS"
```

et séparément :

```ts
status: "successful"
```

Les deux ne doivent pas être confondus.

---

# 4. PROBLÈMES P0 À CORRIGER

## P0-1 — Double paiement possible

Une même quote peut créer plusieurs transactions avec des clés d'idempotence différentes.

Une clé déjà utilisée peut également déclencher un deuxième POST Airtel.

## P0-2 — Callback tardif rejeté

`mark_payment_paid` refuse actuellement un paiement confirmé après expiration de la quote.

Cela peut être dangereux si Airtel a déjà capté l'argent.

## P0-3 — Webhooks désordonnés

Un TF/TE reçu après TS peut actuellement faire passer une transaction déjà payée en échec.

## P0-4 — Erreur réseau traitée comme échec

Un 401, 429, 500, timeout ou autre erreur de communication pendant une enquiry peut être enregistré comme paiement échoué.

Une erreur de communication ne constitue PAS une confirmation d'échec du paiement.

## P0-5 — Retry Airtel incomplet

Le système actuel ne réalise pas l'enquiry selon la fréquence requise.

Le comportement cible demandé par l'audit est :

- attendre T+180 secondes
- puis enquiry toutes les 60 secondes
- pendant 15 minutes

Ne pas implémenter cette logique avec un `setInterval()` dans une fonction serverless.

---

# 5. AVANT DE MODIFIER LE CODE

Commence par analyser le repository.

Inspecte au minimum :

```text
packages/payments/
packages/payments/src/index.ts
supabase/
app/
```

Recherche :

```text
Airtel
airtel
quote
payment
idempotency
callback
webhook
enquiry
mark_payment_paid
TS
TF
TA
TIP
TE
```

Identifie précisément :

1. la création d'une quote
2. la création d'une transaction
3. la génération de l'idempotency key
4. l'appel POST Airtel
5. le callback
6. l'enquiry
7. `mark_payment_paid`
8. le mapping des statuts
9. le cache OAuth
10. les migrations Supabase existantes
11. les jobs/cron existants
12. les tests existants

Avant toute modification, produis une courte cartographie technique dans le rapport final.

---

# 6. RÈGLE D'ARCHITECTURE

Il faut séparer :

```text
QUOTE
PAYMENT TRANSACTION
AIRTEL EVENT
PAYMENT STATUS
AIRTEL STATUS
```

Architecture logique cible :

```text
Payment Quote
      │
      ▼
Payment Transaction
      │
      ├── Airtel API request
      ├── Airtel callback events
      └── Airtel enquiry
              │
              ▼
        Payment State Machine
              │
              ▼
       Liguita payment status
```

---

# 7. P0-1 — IDEMPOTENCE FORTE

Une quote donnée ne doit jamais provoquer deux paiements Airtel actifs.

Pour une quote donnée :

```text
1 quote
=
1 payment transaction active
```

Avant de créer une nouvelle transaction :

```text
chercher une transaction existante liée à la quote
```

Si elle existe :

```text
ne PAS créer une nouvelle transaction
ne PAS appeler Airtel une deuxième fois
```

Retourner la transaction existante.

---

# 8. CONTRAINTES BASE DE DONNÉES

Inspecte les migrations existantes.

Ajoute les contraintes nécessaires pour empêcher le double paiement au niveau DB.

Ne compte pas uniquement sur le code TypeScript.

La base doit empêcher les conditions de course.

Utilise une contrainte unique adaptée au modèle existant.

Par exemple, si compatible avec le schéma existant :

```text
quote_id + transaction active
```

Ne crée pas aveuglément une contrainte qui empêcherait les remboursements ou transactions historiques.

Adapte la migration au modèle existant.

---

# 9. TRANSACTION ATOMIQUE

Le flux doit être :

```text
Request
 ↓
Lock / vérification quote
 ↓
chercher payment transaction
 ↓
si existante → retourner existante
 ↓
sinon créer transaction
 ↓
commit
 ↓
appel Airtel
```

Deux requêtes simultanées doivent toujours aboutir à :

```text
1 transaction
```

et non :

```text
2 transactions
```

---

# 10. IDEMPOTENCY KEY

L'idempotency key Airtel doit être liée à la transaction Liguita.

Format recommandé :

```text
LIG-COL-{paymentTransactionId}
```

ou équivalent cohérent avec le système actuel.

Une nouvelle clé ne doit jamais être générée pour une même transaction existante.

La clé doit être persistée en DB.

---

# 11. P0-2 — CALLBACK TARDIF

Une expiration de quote ne signifie PAS automatiquement que le paiement Airtel a échoué.

Exemple :

```text
10:00 quote créée
10:05 quote expirée
10:07 Airtel TS
=> paiement confirmé
```

Le système doit pouvoir représenter :

```text
quote.status = expired
payment.status = successful
```

sans corruption financière.

---

# 12. SÉPARER QUOTE STATUS ET PAYMENT STATUS

Ne jamais faire :

```ts
if (quote.expired) {
  payment.failed = true;
}
```

Le paiement doit avoir sa propre machine d'état.

Exemple :

```text
created
processing
unknown
successful
failed
refunded
```

Adapte aux enums existants du projet.

---

# 13. mark_payment_paid

Refactorise `mark_payment_paid` pour vérifier :

1. transaction valide
2. montant
3. référence
4. transaction Airtel correspondante
5. statut Airtel
6. idempotence
7. intégrité financière

Mais ne rejette pas simplement le paiement parce que :

```text
quote.expired = true
```

Si Airtel confirme réellement le paiement, la transaction doit pouvoir passer en succès.

---

# 14. P0-3 — MACHINE À ÉTATS

Implémente une transition d'état explicite.

NE PAS faire :

```ts
payment.status = mappedStatus;
```

sans vérifier l'état précédent.

Créer une fonction centralisée, par exemple :

```ts
transitionPaymentState(...)
```

ou équivalent adapté à l'architecture.

---

# 15. TRANSITIONS

Définis explicitement les transitions autorisées.

Exemple conceptuel :

```text
created
   ↓
processing
   ↓
successful
```

et :

```text
processing
   ↓
failed
```

Une transaction `successful` ne doit pas devenir automatiquement `failed` parce qu'un événement tardif TF/TE arrive.

---

# 16. CALLBACKS DÉSORDONNÉS

Cas de test obligatoire :

```text
TS
TF
TE
```

ou :

```text
TF
TS
```

ou :

```text
TS
TS
TS
```

Chaque callback doit :

1. être authentifié
2. être enregistré
3. être dédupliqué
4. être interprété
5. être appliqué seulement si la transition est valide

---

# 17. TABLE D'ÉVÉNEMENTS

Si elle n'existe pas déjà, créer une table permettant de conserver les événements Airtel.

Exemple :

```text
airtel_payment_events
```

Champs à adapter :

```text
id
payment_transaction_id
event_type
airtel_status
airtel_transaction_id
airtel_money_id
payload
signature
received_at
processed_at
processing_status
```

IMPORTANT :

Ne jamais stocker de PIN.

Ne jamais stocker de secret OAuth.

Ne jamais logger de credentials.

---

# 18. DÉDUPLICATION CALLBACK

Un callback Airtel identique reçu 2, 10 ou 5 000 fois doit être traité de manière idempotente.

Résultat attendu :

```text
1 paiement
1 déblocage
1 écriture financière
```

Créer une clé de déduplication fiable à partir des identifiants Airtel disponibles.

NE PAS inventer un identifiant si Airtel fournit déjà un identifiant de transaction.

---

# 19. P0-4 — ERREURS RÉSEAU

Distinguer strictement :

### Paiement échoué confirmé par Airtel

et :

### Impossible de connaître l'état du paiement

Exemples :

```text
401
429
500
502
503
timeout
ECONNRESET
DNS
network error
```

NE PAS automatiquement faire :

```text
payment.status = failed
```

---

# 20. ÉTAT UNKNOWN

Si le système ne peut pas déterminer l'état Airtel :

```text
payment.status = unknown
```

ou utiliser l'état équivalent déjà présent.

Puis programmer une nouvelle enquiry.

---

# 21. CAS PARTICULIER DU 401

Le 401 peut indiquer un problème de token.

Le système doit distinguer :

```text
Airtel payment result
```

de :

```text
Airtel API authentication error
```

Si nécessaire :

1. invalider le token
2. récupérer un nouveau token
3. refaire l'appel approprié
4. si l'état reste inconnu → retry/enquiry

Ne jamais recréer un paiement Airtel simplement parce que le token est expiré.

---

# 22. 429

Pour `429`, respecter le mécanisme de retry existant ou ajouter un backoff approprié.

Mais ne jamais créer un deuxième paiement.

---

# 23. 500 / TIMEOUT

```text
Airtel API inaccessible
≠
paiement Airtel échoué
```

Le paiement passe en :

```text
unknown
```

ou état équivalent.

---

# 24. P0-5 — ENQUIRY

Implémente le retry métier demandé par l'audit :

```text
T+180 secondes
```

puis :

```text
1 enquiry toutes les 60 secondes
```

pendant :

```text
15 minutes
```

Ne pas utiliser `setInterval()` dans une fonction serverless.

---

# 25. JOB MODEL

Créer ou adapter un système de jobs persistants.

Exemple :

```text
payment_enquiry_jobs
```

avec :

```text
id
payment_transaction_id
attempt
next_attempt_at
started_at
completed_at
status
last_error
created_at
updated_at
```

Noms à adapter à l'architecture existante.

---

# 26. TIMING

Le système doit permettre :

```text
payment created
      ↓
wait 180 sec
      ↓
enquiry #1
      ↓
wait 60 sec
      ↓
enquiry #2
      ↓
wait 60 sec
      ↓
enquiry #3
...
      ↓
15 minutes
```

Le nombre exact de tentatives doit être calculé à partir de ces règles.

---

# 27. FIN DE LA FENÊTRE

À la fin :

si Airtel confirme :

```text
successful
```

si Airtel confirme explicitement :

```text
failed
```

alors :

```text
failed
```

si l'état reste inconnu :

```text
unknown
```

ou le statut interne équivalent.

Ne jamais transformer un état inconnu en échec simplement parce que le délai est terminé.

---

# 28. CALLBACK ET ENQUIRY DOIVENT ÊTRE CONCURRENTS SANS CONFLIT

Il peut arriver :

```text
enquiry → TS
```

pendant que :

```text
callback → TS
```

arrive presque simultanément.

Les deux doivent être idempotents.

Résultat :

```text
successful
```

une seule fois.

---

# 29. CALLBACK HMAC

Le callback actuel utilise :

```text
HMAC-SHA256
Base64
```

et ce mécanisme fonctionne déjà selon l'audit.

NE PAS le casser.

Centraliser néanmoins la vérification dans une fonction dédiée :

```text
verifyAirtelCallbackSignature()
```

La comparaison de signature doit être sécurisée.

Ne jamais logger le secret HMAC.

---

# 30. AUCUNE DONNÉE SENSIBLE DANS LES LOGS

Interdire les logs contenant :

```text
AIRTEL_CLIENT_SECRET
OAuth token
HMAC secret
PIN
encrypted PIN
Authorization header complet
```

Si un Authorization header doit apparaître dans un debug :

```text
Bearer ***
```

uniquement.

---

# 31. CACHE OAUTH

L'audit indique que le provider est créé à chaque requête, donc le cache OAuth n'est pas réellement partagé entre les appels Vercel.

Corriger l'architecture.

Ne pas supposer qu'une variable mémoire globale est un cache partagé fiable dans Vercel/serverless.

Créer une abstraction :

```text
AirtelTokenCache
```

et utiliser un stockage partagé compatible avec le projet.

Avant d'ajouter une nouvelle dépendance :

- inspecter les dépendances existantes
- réutiliser une solution déjà présente si elle existe
- ne pas ajouter Redis/Upstash/etc. sans nécessité et sans vérifier l'architecture actuelle

Le token doit être stocké avec :

```text
access_token
expires_at
```

et réutilisé tant qu'il est valide.

---

# 32. EXPIRATION PROACTIVE

Le cache doit continuer à utiliser l'expiration proactive déjà implémentée.

Ne jamais attendre exactement `expires_at` pour considérer le token utilisable.

Conserver une marge de sécurité.

Ne change pas arbitrairement cette marge si elle est déjà définie dans le code.

---

# 33. NE PAS CRÉER UN PROVIDER À CHAQUE REQUEST

Inspecte :

```text
packages/payments/src/index.ts
```

et le système actuel.

Refactorise afin que :

```text
AirtelProvider
```

soit suffisamment découplé du request lifecycle.

Le token cache doit être externe au provider si nécessaire.

---

# 34. PAYMENT LOCKING

Deux requêtes concurrentes ne doivent pas pouvoir faire :

```text
Request A → payment absent
Request B → payment absent
Request A → create
Request B → create
```

Utiliser les mécanismes de concurrence disponibles dans Supabase/PostgreSQL :

- unique constraint
- transaction
- upsert
- row lock
- RPC transactionnelle

selon l'architecture existante.

Ne pas simuler un verrou uniquement avec du JavaScript.

---

# 35. QUOTE EXPIRATION

L'expiration doit empêcher :

```text
création d'un nouveau paiement
```

mais ne doit pas annuler rétroactivement :

```text
paiement Airtel déjà envoyé
```

Exemple :

```text
Quote expired
Payment already processing
```

doit rester traçable.

---

# 36. PAYMENT CREATION FLOW CIBLE

```text
POST /payment
        ↓
validate user
        ↓
validate quote
        ↓
check existing payment
        ↓
existing?
  ├── YES → return existing payment
  │
  └── NO
       ↓
create payment transaction
       ↓
persist idempotency key
       ↓
commit
       ↓
call Airtel
       ↓
persist Airtel response
       ↓
payment = processing / appropriate state
```

---

# 37. IMPORTANT — SI L'APPEL AIRTEL ÉCHOUE

Si la requête Airtel échoue au niveau réseau après que Liguita a envoyé la requête :

NE PAS supposer que la transaction Airtel n'existe pas.

Exemple :

```text
Liguita → Airtel
       ↓
Airtel reçoit
       ↓
paiement créé
       ↓
réponse perdue
```

Liguita voit :

```text
timeout
```

mais Airtel peut avoir encaissé.

Donc :

```text
unknown
```

puis :

```text
enquiry
```

---

# 38. QUOTE + PAYMENT

Ne supprime jamais automatiquement la transaction parce que la quote expire.

Conserver l'historique.

---

# 39. AUDIT LOG

Pour chaque paiement, pouvoir retrouver :

```text
quote
payment transaction
idempotency key
Airtel transaction ID
Airtel Money ID
Airtel status
internal status
callbacks
enquiries
errors
timestamps
```

---

# 40. TESTS OBLIGATOIRES

Créer/adapter des tests automatisés.

## TEST 1 — Double clic

Simuler deux requêtes simultanées.

Attendu :

```text
1 quote
1 payment
1 Airtel call
```

## TEST 2 — 10 requêtes simultanées

Même quote.

Attendu :

```text
1 transaction
```

## TEST 3 — Idempotency key différente

Même quote :

```text
KEY-A
KEY-B
```

Attendu :

```text
1 payment
```

## TEST 4 — Rejeu callback 5 000 fois

Attendu :

```text
1 successful transition
1 unlock
1 ledger action
```

## TEST 5 — TS puis TF

Attendu :

```text
successful
```

et non :

```text
failed
```

## TEST 6 — TF puis TS

Le résultat doit suivre la machine à états définie et les informations Airtel disponibles.

Ne pas inventer une priorité non documentée.

Le système doit au minimum éviter les transitions incohérentes.

## TEST 7 — TS puis TE

Même principe.

## TEST 8 — Timeout

Attendu :

```text
unknown / retry
```

et non :

```text
failed
```

## TEST 9 — HTTP 500

Attendu :

```text
unknown / retry
```

## TEST 10 — HTTP 429

Attendu :

```text
unknown / retry
```

avec mécanisme de retry.

## TEST 11 — HTTP 401

Attendu :

```text
refresh token
```

ou traitement d'authentification approprié.

Ne jamais créer une seconde transaction Airtel.

## TEST 12 — Callback après expiration quote

```text
quote expired
+
Airtel TS
```

Attendu :

```text
payment successful
```

si toutes les informations Airtel concordent.

## TEST 13 — Callback + enquiry simultanés

Les deux confirment TS.

Attendu :

```text
1 paiement successful
```

## TEST 14 — Enquiry toutes les 60 secondes

Vérifier le scheduler et les `next_attempt_at`.

## TEST 15 — Fin des 15 minutes

Vérifier que le job ne continue pas indéfiniment.

---

# 41. TESTS FINANCIERS

Vérifier qu'un callback répété ne crée jamais :

```text
500
500
500
500
```

dans le ledger.

Un paiement doit générer une seule écriture financière correspondant à son événement métier.

---

# 42. PAS ENCORE DE PRODUCTION

Pendant ce Sprint :

NE PAS :

- passer automatiquement en production
- remplacer les credentials UAT
- supprimer les protections
- désactiver la vérification HMAC
- accepter des certificats invalides
- ignorer les erreurs Airtel
- ajouter des fallbacks dangereux

---

# 43. ENVIRONNEMENT

Conserver :

```env
AIRTEL_BASE_URL=https://openapiuat.airtel.td
```

pour UAT.

Production devra utiliser :

```env
AIRTEL_BASE_URL=https://openapi.airtel.td
```

mais cette migration n'est PAS à faire automatiquement dans ce Sprint.

---

# 44. HORS SCOPE PRINCIPAL DU SPRINT 6

Ne pas transformer ce Sprint en refonte complète du paiement.

Les sujets suivants peuvent être préparés mais ne doivent pas détourner le Sprint :

- décaissement v3
- balance COLL/DISB
- réconciliation financière complète
- refund opérateur complet
- RSA/AES complet
- production credentials
- intégration enterprise

Ils seront traités dans les sprints suivants, sauf si une modification minimale est nécessaire pour ne pas casser l'architecture.

---

# 45. NE PAS MODIFIER INUTILEMENT

Avant de modifier un fichier :

1. comprendre son rôle
2. vérifier ses imports
3. vérifier les appels existants
4. vérifier les tests
5. modifier le minimum nécessaire

Ne fais pas de refactor massif.

Ne change pas les routes publiques sans nécessité.

Ne renomme pas les tables existantes sans nécessité.

Ne supprime pas les colonnes existantes.

Si une migration est nécessaire :

```text
supabase/migrations/
```

avec un nom horodaté cohérent.

---

# 46. MIGRATIONS SUPABASE

Une migration existante :

```text
20260923001900
```

est déjà appliquée.

Ne la modifie pas rétroactivement.

Créer une nouvelle migration.

Avant d'écrire une migration :

- inspecter le schéma actuel
- vérifier les contraintes existantes
- vérifier les index
- vérifier les RLS
- vérifier les triggers

---

# 47. RLS / SÉCURITÉ

Toutes les nouvelles tables sensibles doivent respecter le modèle RLS existant.

Un utilisateur ne doit pas pouvoir consulter :

```text
airtel callback payload
Airtel secrets
transactions d'un autre utilisateur
```

Les opérations système doivent passer par les mécanismes serveur appropriés.

---

# 48. FRONTEND

Ne refais pas toute l'interface.

Mais vérifie les états :

```text
processing
unknown
successful
failed
```

Le frontend ne doit jamais afficher :

```text
Échec
```

uniquement parce qu'une requête backend a timeout.

Afficher plutôt :

```text
Vérification en cours
```

lorsque l'état est inconnu.

Message important :

```text
Ne relancez pas le paiement.
Nous vérifions votre transaction Airtel Money.
```

Cela évite un double paiement par l'utilisateur.

---

# 49. RÈGLE UX CRITIQUE

Si :

```text
payment.status = processing
```

ou :

```text
payment.status = unknown
```

le bouton :

```text
Payer
```

ne doit pas permettre de créer une nouvelle transaction pour la même quote.

Il doit afficher :

```text
Vérification en cours
```

ou récupérer la transaction existante.

---

# 50. API RESPONSE

Les endpoints de paiement doivent retourner une information suffisamment claire au frontend.

Exemple conceptuel :

```json
{
  "paymentId": "...",
  "status": "processing",
  "amount": 500,
  "currency": "XAF"
}
```

Ne pas exposer :

```text
Airtel access token
HMAC secret
client secret
internal error stack
```

---

# 51. OBSERVABILITÉ

Ajouter des logs structurés sans données sensibles.

Exemple :

```text
payment.created
payment.airtel.requested
payment.airtel.response
payment.callback.received
payment.callback.processed
payment.enquiry.started
payment.enquiry.result
payment.state.changed
payment.retry.scheduled
```

Chaque log doit contenir un identifiant corrélable :

```text
paymentId
```

mais jamais un secret.

---

# 52. MÉTRIQUES UTILES

Si le système possède déjà un mécanisme de monitoring, suivre :

```text
airtel_payment_success
airtel_payment_failure
airtel_payment_unknown
airtel_payment_timeout
airtel_payment_duplicate_callback
airtel_payment_duplicate_request
airtel_enquiry_count
airtel_auth_refresh
```

Ne pas ajouter un service externe juste pour cela si aucun système de monitoring n'existe.

---

# 53. CRITÈRES D'ACCEPTATION P0

Le Sprint 6 est considéré comme réussi uniquement si :

### A — Double paiement

Impossible pour une même quote de créer deux paiements Airtel actifs.

### B — Idempotence

Une même transaction Liguita réutilise toujours la même référence/idempotency key.

### C — Callback tardif

Un paiement Airtel confirmé après expiration de quote n'est pas rejeté simplement à cause de l'expiration.

### D — Callback désordonné

Un événement tardif ne peut pas écraser aveuglément un état final.

### E — Erreur réseau

Timeout/500/429/etc. ne deviennent pas automatiquement `failed`.

### F — Retry

Une enquête peut être planifiée à :

```text
T+180
```

puis :

```text
+60 secondes
```

pendant :

```text
15 minutes
```

### G — Double callback

5 000 callbacks identiques ne créent qu'un seul effet financier.

### H — OAuth

Le token est correctement mutualisé/caché selon l'architecture serverless.

### I — Sécurité

Aucun secret ou PIN dans les logs.

### J — Tests

Tous les tests P0 passent.

---

# 54. CHECK FINAL AVANT DE DIRE "DONE"

Exécuter :

```bash
npm run typecheck
```

ou l'équivalent réel du projet.

Puis :

```bash
npm run lint
```

Puis :

```bash
npm test
```

Puis les tests spécifiques payments.

Si certaines commandes n'existent pas :

- identifier les scripts disponibles
- utiliser les commandes réellement présentes
- ne pas inventer un résultat

---

# 55. VÉRIFICATION GIT

Avant de terminer :

```bash
git diff
```

Vérifier :

- aucun secret
- aucun token Airtel
- aucune clé privée
- aucune clé HMAC réelle
- aucune modification inutile
- aucune suppression accidentelle

Ne jamais commit de :

```text
.env
.env.local
credentials
tokens
private keys
```

---

# 56. RAPPORT FINAL OBLIGATOIRE

À la fin, donne un rapport structuré :

## 1. P0 corrigés

Liste précisément :

```text
P0-1 :
P0-2 :
P0-3 :
P0-4 :
P0-5 :
```

## 2. Fichiers modifiés

```text
file
raison
```

## 3. Migrations créées

```text
nom
objectif
```

## 4. Tests ajoutés

Lister chaque test.

## 5. Tests exécutés

Donner les vraies commandes et les vrais résultats.

## 6. Risques restants

Lister uniquement les problèmes réellement restants.

## 7. Airtel

Indiquer :

```text
UAT
```

et confirmer qu'aucune migration automatique vers production n'a été effectuée.

## 8. Hors scope

Indiquer les sujets non traités :

- décaissement v3
- COLL/DISB
- réconciliation
- refund opérateur
- etc.

---

# 57. RÈGLE FINALE

Ne considère PAS le Sprint terminé parce que :

```text
POST Airtel = HTTP 200
```

Le vrai critère est :

```text
Payment lifecycle fiable
+
idempotence
+
résistance aux callbacks désordonnés
+
gestion correcte des erreurs réseau
+
retry enquiry
+
sécurité
+
tests de concurrence
```

Le but est de rendre le paiement Airtel de Liguita suffisamment robuste pour passer à une phase **UAT contrôlée**, pas de prétendre qu'il est déjà certifié ou prêt pour la production réelle.

Commence maintenant par auditer le code existant, puis implémente les corrections P0 une par une.

NE PAS attendre une validation intermédiaire après chaque fichier.

À la fin, présente le rapport complet demandé ci-dessus.
