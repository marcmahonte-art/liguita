# Liguita × Airtel Money Tchad — Plan d'implémentation du paiement
## Analyse + Plan d'implémentation + Checklist d'informations manquantes + Prompt d'exécution

**Date : 24 septembre 2026**
**Source : documentation officielle Airtel Money Tchad v3.0**, fichier `api airtel tchad.docx` (79 ko, 1934 lignes parsées)

> ⚠️ Note d'identification — Le fichier fourni est la documentation de l'API **Airtel Money Tchad** (et non Orange) : tous les endpoints et URL observés pointent sur `openapi.airtel.td` / `openapiuat.airtel.td`. Orange Money au Tchad n'est pas opérationnel comme marchand local (Orange n'y est pas opérateur mobile). Voir §0.

---

## 0. Identification du produit livré

| Caractéristique | Constat | Source (ligne dans la doc) |
|---|---|---|
| Nom produit | **Airtel Money Tchad** | Titre du document |
| Base URL UAT | `https://openapiuat.airtel.td` | §Authorization, ligne 3 |
| Base URL PRODUCTION | `https://openapi.airtel.td` | §Authorization, ligne 4 |
| Auth | OAuth2 (Client Credentials) | §OAuth2, lignes 6–43 |
| Versions observées | Encryption 2.0 · Disbursement 3.0 · Remittance 2–3 | Lignes 48, 552, 1331, 1400 |
| Devise | XAF (franc CFA BEAC) | Ligne 1796 |
| Country code | `TD` (cohérent dans la doc) — cf. anomalie §9 | Lignes 123, 1117, 1178, 1186 |
| Orange Money Tchad | Non disponible en API marchand local | (vérifié hors doc) |

---

## 1. Analyse verbatim de l'API

### 1.1 Authentification — `POST /auth/oauth2/token`

> « This API is used to get the bearer token. The output of this API contains access_token that will be used as bearer token for the API that we will be going to call. »
> « This is a common API to fetch access token for all the APIs listed in the documentation section. »

**Méthode :** POST
**Headers :** `Content-Type` (string, mandatory) · `Accept` (string, mandatory)
**Body :**

| Attribut | Type | Requis | Description |
|---|---|---|---|
| client_id | string | mandatory | « public identifier for apps. … equivalent to consumer key displayed under keys section of application listing. Example: c02e9e46-db9d-4faf-b91a-94f88bbe688c » |
| client_secret | string | mandatory | « secret known only to the application and the authorization server. … Example: ab672211-4197-4c11-ba79-b29ce2034ca2 » |
| grant_type | string | mandatory | « Client Credential grant type … Example: client_credentials » |

**Réponse :** `access_token` · `expires_in` · `token_type`

### 1.2 Récupération de la clé publique RSA — `GET /v1/rsa/encryption-keys`

> « For consuming this API consumer needs to add any of the below products in his account : Collection, Disbursement, Cash-In, Cash-Out, ATM Withdrawl. »

**Headers :** `Authorization: Bearer …` · `X-Country: TD` · `X-Currency: XAF`

### 1.3 Paiement (USSD Push) — `POST /merchant/v1/payments/`

> « USSD Push — request a payment from a consumer (Payer). The consumer will be asked to authorize the payment. After authorization, the transaction will be executed. »

> ⚠️ **« Do not send country code in msisdn. »** (ligne 150)

**Headers :**
- `Content-Type`
- `Accept`
- `X-Country: TD`
- `X-Currency: XAF`
- `Authorization: Bearer …`

**Body :**
```json
{
  "reference": "LG-PAY-00001",
  "subscriber": {
    "country": "TD",
    "currency": "XAF",
    "msisdn": "752604392"
  },
  "transaction": {
    "amount": 1200,
    "country": "TD",
    "currency": "XAF",
    "id": "LG-TXN-..."
  }
}
```

**Réponse :** `transaction.status` · `status.code` · `status.message` · `status.result_code` *(deprecated)* · `status.response_code` · `status.success`

### 1.4 Status (Enquiry) — `GET /standard/v1/payments/{id}`

> « at least three minutes after the payment API has been called »

**Réponse :** `transaction.airtel_money_id`, `transaction.status ∈ {TF, TS, TA, TIP, TE}`, `transaction.message`

### 1.5 Refund — `POST /standard/v1/payments/refund`

> « This API is used to make full refunds to Partners. »

**Body :**
```json
{ "transaction": { "airtel_money_id": "..." } }
```

**Réponse attendue :** `transaction.status = SUCCESS`

### 1.6 Callback (webhook statut final)

> « Partner Can Authenticate the response sent to them regarding the status of the transaction on the callback url. It can be configured in Application settings. Along with the callback request body a , hash message will be sent to user. User can hash the the callback request with the private key shown in application setting using HmacSHA256 algorithm, with output text format in Base64 and can match with it hash message sent if Callback authentication is enabled. »

Sans auth (par défaut) :
- Body : `{ transaction: { id, message, status_code (TF|TS), airtel_money_id } }`

Avec auth activée :
- Même body **+ header `hash`** (HMAC-SHA256 Base64, calculé avec la clé privée présente dans Application Settings)

**Étapes d'activation (« Steps to enable callback authentication ») :**
1. Step 2 : Enable callback authentication
2. Step 3 : Copy Private key to encrypt using HMAC algorithm

### 1.7 Disbursement v3 — `POST /standard/v3/disbursements`

**Description :** sert à **payer le trouveur** (récompense Liguita).

**Payload signé — Message Signing (lignes 119–127) :**
> « Partner needs to encrypt the payload using a randomly generated AES key iv pair. Encrypt the key iv using a RSA key and add both encrypted key and encrypted signature to the request as headers. At the server side we use private RSA key to decrypt the AES key iv and encrypt the payload with this key and iv. We match this generated encrypted payload to the signature received to ensure that there is no change in the payload sent by the partner and payload received. »

**STEPS :**
1. (1) Générer une clé AES + IV (Base64).
2. (2) Récupérer la clé publique RSA via `GET /v1/rsa/encryption-keys`.
3. (3) Chiffrer le payload avec AES → `x-signature`.
4. (4) Chiffrer `key:iv` avec RSA publique → `x-key`.
5. (5) Envoyer payload + headers `x-key` + `x-signature`.

**Headers spécifiques :**
- `X-Key` : key:iv chiffré via RSA
- `X-Signature` : payload chiffré via AES

**Body requis (champs Liguita) :**
- `payee.msisdn` (numéro du trouveur)
- `payee.wallet_type`
- `transaction.amount`
- `transaction.id` (unique)
- `pinstring` *(chiffré en RSA 2048)* — **PIN du compte marchand Liguita**

### 1.8 Chiffrement sensible (PIN)

> « RSA encryption strategy with mode ECB, padding OAEPWithSHA-256AndMGF1Padding and KeyLength 2048 is used to encrypt data at client side. »

- Algorithme : **RSA 2048**
- Mode : ECB
- Padding : OAEPWithSHA-256AndMGF1Padding
- Application : PIN payeur (collect) + PIN compte Liguita (disbursement)

### 1.9 Codes d'erreur (extraits de la doc)

**Router / Encryption :**
- `DP02010001000` Error while fetching encryption key
- `DP02010001001` Successfully fetched encryption key

**Router (à exposer dans le ledger) :**
- `ROUTER001` Wallet non configuré — bloquer côté Liguita, alerter admin
- `ROUTER005` Country route non configurée — gate métier
- `ROUTER006` Pays invalide — anomalie probable du controller Airtel
- `ROUTER114–116` PIN / encrypted PIN incorrect
- `ROUTER117` Request Timeout → bascule sur `GET /standard/v1/payments/{id}`

**Payment :**
- `DP00800001000` Ambiguous → bascule enquiry
- `DP00800001007` Not enough balance → user-friendly
- `DP00800001024` Transaction Timed Out → enquête différée
- `DP00800001025` Transaction Not Found
- `DP00900001017` DUPLICATE_TX (idempotence)

**Statuts transaction :** `TF` Failed · `TS` Success · `TA` Ambiguous · `TIP` In Progress · `TE` Expired

### 1.10 Account Balance — `GET /standard/v2/users/balance`

**Paramètre `type` ∈ {DISB, COLL, CASHIN, CASHOUT}** — sert à la réconciliation quotidienne des fonds Liguita.

**Réponse :** `data.balance` · `data.currency` · `data.account_status` · `status.code` · `status.message` · `status.result_code` · `status.response_code` · `status.success`

---

## 2. Stack Berlin Liguita × Architecture cible

### 2.1 Architecture cible

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         LIGUITA PAYMENT SERVICE                         │
│                                                                          │
│  ┌──────────────────────────┐         ┌──────────────────────────────┐  │
│  │   CLIENT (Next.js PWA)   │  ───A──>│   ORDER / PRICE-QUOTE        │  │
│  │   - widget OTP Airtel    │         │   (grille variable C1–C5)    │  │
│  │   - dev / credit display │         └──────────────┬───────────────┘  │
│  └──────────────────────────┘                        │                   │
│                                                       ▼                   │
│       ┌─────────────────────────────────────────────────────────────┐    │
│       │   payment_intent table → payment_events (Supabase)         │    │
│       └─────────────────────────────────────────────────────────────┘    │
│                                                                          │
│   SERVER-SIDE (Next route / Supabase Edge Function — clés secrètes)      │
│       ┌─────────────────────────────────────────────────────────────┐    │
│       │  1. token cache  → POST /auth/oauth2/token (refresh -60s)   │    │
│       │  2. rsa-key cache → GET  /v1/rsa/encryption-keys            │    │
│       │  3. encrypt PIN  (RSA 2048 OAEP-SHA256-MGF1, 4 digits)      │    │
│       │  4. encrypt payload (AES/CBC, sign v3) + RSA x-key           │    │
│       │  5. collect     POST /merchant/v1/payments/  (USSD Push)    │    │
│       │  6. wait cb  → POST callback  GUARDS  HMAC optional         │    │
│       │  7. enquiry  → GET /standard/v1/payments/{id}  T+180s       │    │
│       └─────────────────────────────────────────────────────────────┘    │
│                                                                          │
│   ┌───────────────────────────┐    ┌──────────────────────────────────┐  │
│   │   AIRTEL MONEY API        │    │   POST-DISBURSEMENT              │  │
│   │   ◦ USSD Push (collect)   │    │   POST /standard/v3/disbursements│  │
│   │   ◦ Disbursements v3      │    │   payload signé AES + RSA        │  │
│   │   ◦ Callback (HMAC)       │    │   payee = MSISDN du trouveur     │  │
│   │   ◦ Enquiry / Refund      │    │   ledger ← part C1–C4            │  │
│   └───────────────────────────┘    └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Machine d'état d'un paiement Liguita

```text
INIT → QUOTED → PUSH_SENT → USSD_OK → CAPTURING → CAPTURED (TS)
                                                │
                                                ▼
                                          CALLBACK_HIT → RELEASED/CLOSED_OK
                                                │
                                                ▼
                                          REWARD_DISB_INIT → REWARD_DISB_TS → CLOSED_OK
                                                │
                                                ▼
                                          REWARD_DISB_TF → REWARD_RETRY → CLOSED_FAIL

           TA/TIP → ENQUIRY_SCHEDULED → RECONCILED_OK / RECONCILED_FAIL
           TF    → USER_RETRY → CAPTURING
           TIMEOUT → REFUND_REQUESTED → REFUNDED
```

### 2.3 Modèle de données

```sql
-- déjà dans le plan v2.0
pricing_rules  ( country, class, base_fee, reward_share, c5_rate, floor_fee, ceiling_fee )
price_quotes   ( id, item_class, declared_value, options[], base_fee, options_fee,
                 reward_amount, liguita_commission, total, currency, expires_at )

-- à créer (paiement)
payments       ( id, price_quote_id, match_id, payer_msisdn,
                 amount, currency='XAF', country='TD',
                 airtel_money_id, airtel_status, airtel_response_code,
                 internal_status, idempotency_key UNIQUE,
                 retry_count, last_error_code,
                 callback_received_at, captured_at, refunded_at, created_at )

payment_events ( id, payment_id, event_type, payload jsonb, at )
-- Types: PUSH_SENT, CALLBACK_HIT, ENQUIRY_RESPONSE, REFUND_SENT,
--        REWARD_DISB_INIT, REWARD_DISB_TS, REWARD_DISB_TF

disbursements  ( id, payment_id, payee_msisdn, amount, status,
                 airtel_money_id, x_signature_hash, idempotency_key UNIQUE,
                 sign_reason, error_code, at )

reconciliation_jobs ( id, run_date, totals_collect, totals_disb,
                      airtel_balance_disb, airtel_balance_coll,
                      diff_collect, diff_disb, mismatches jsonb, at )
```

---

## 3. Plan d'implémentation

### 3.1 P0 — Contrat marchand (S0–S1)

1. Initier le dossier **KYC marchand Airtel Money Tchad** (registre commerce + RIB + pièce d'identité responsable).
2. Activer les produits : Collection, Disbursement.
3. Récupérer les identifiants **UAT** et **PRODUCTION** séparément.
4. Configurer l'URL de callback : `https://liguita.td/api/airtel/callback`.
5. Activer l'authentification HMAC-SHA256 callback ; copier la **Private key** dans un secret manager.
6. Épingler le **MSISDN** du compte marchand Liguita + définir son **PIN** (4 chiffres).
7. Activer les IPs de sortie du backend Liguita en whitelist si requis.

### 3.2 P1 — Intégration sandbox (S2–S3)

1. Implémenter `airtel/auth.ts` — `POST /auth/oauth2/token` + cache `expires_in - 60s`.
2. Implémenter `airtel/rsa.ts` — `GET /v1/rsa/encryption-keys` + cache par `X-Country`.
3. Implémenter `airtel/encryption.ts` — RSA 2048 OAEP-SHA256-MGF1 (PIN) ; AES/CBC/PKCS5 + RSA wrap (sign v3).
4. Implémenter `airtel/collect.ts` — `POST /merchant/v1/payments/` (USSD Push).
5. Implémenter `airtel/enquiry.ts` — `GET /standard/v1/payments/{id}` (retry 60 s × 15).
6. Implémenter `airtel/refund.ts` — `POST /standard/v1/payments/refund`.
7. Implémenter `airtel/callback.ts` — POST handler, HMAC verify (toggle), 200 ack < 2 s.

### 3.3 P2 — Disbursement (récompense, S4)

1. `airtel/disbursement.ts` — `POST /standard/v3/disbursements` + Message Signing complet (AES + RSA x-key).
2. Pagination + idempotency: `idempotency_key=hash(quote_id+trouveur+amount+day)`.
3. Retry policy : 3 tentatives avec backoff exponentiel 30 s → 5 min.

### 3.4 P3 — Réconciliation (S5)

1. `airtel/summary.ts` — `GET /merchant/v1/transactions?from=...&to=...&limit=200&offset=0` paginé (à confirmer la limite — voir checklist).
2. `airtel/balance.ts` — `GET /standard/v2/users/balance?type=DISB|COLL`.
3. Cron quotidien à 02:00 N'Djamena : compare `sum(TS)` + balance + ledger Liguita.

### 3.5 P4 — UX (S3–S4)

Implémenté avec les tokens du design system v3.0 (#FF3B30 CTA, #111827 texte, #6B7280 secondaire, #F3F4F6 fond).

Écrans (Figma → PNG) :
1. Récapitulatif **devis** avant USSD Push — bouton primaire « Payer X FCFA ».
2. **Saisie numéro** Airtel — input `66 XX XX XX` (format local, pas de `+235`).
3. **Confirm OTP** optionnelle (réutilisable).
4. **Statut pending** — illustration pin, copie « En attente de confirmation Airtel Money… ».
5. **Succès (`TS`)** — pastille verte `#E6F9EC / #166534`, H1 « Paiement confirmé ».
6. **Solde insuffisant (`DP00800001007`)** — bandeau alerte `#FFF4E5 / #92400E`.
7. **Ambiguous (`TA`/`TIP`)** — bandeau gris « Transaction en cours de traitement ».
8. **Erreur (`TF`)** — bandeau rouge `#FFECEC`, bouton « Réessayer ».
9. **Liste transactions particulier** (`/app/paiements`) — table data.
10. **Dashboard Business — onglet Paiements**.

### 3.6 P5 — Tests E2E pré-prod (S6)

| Type | Détail | Critère de succès |
|---|---|---|
| Unit | mock AES/RSA, payer/refund/disbursement | Couverture 100 % sur 4 endpoints |
| Intégration | sandbox `openapiuat.airtel.td` avec 5 numéros tests | Reproduire TS / TF / TA / TIP |
| Charge | 200 paiements simultanés, p95 < 4 s | 100 tx consécutives passent |
| Sécurité | rejouer 5 000 requêtes identiques | `DP00900001017` retourné, 0 double débit |
| UX | 10 utilisateurs à N'Djamena en beta | 100 % paient au 1er essai |

### 3.7 P6 — Pilote N'Djamena (S7–S8)

- 100 utilisateurs particuliers + 5 marchands B2B.
- Active `https://openapi.airtel.td` le jour J.
- Monitoring 24/7 sur les KPIs (p50 < 30 s, p95 < 120 s).

### 3.8 P7 — Post-launch (S10+)

- Onboarder **Moov Money Tchad** (même forme OAuth2 + USSD Push attendue).
- Étudier **Stripe / cartes** pour la phase multi-pays.

### 3.9 KPIs paiement à instrumenter

- Taux d'attrition `TA`/`TIP` — **objectif < 1 %**
- Temps moyen `PUSH_SENT → TS` — **objectif p50 < 30 s, p95 < 120 s**
- Taux de succès `TS / total PUSH_SENT` — **objectif > 95 %**
- Délai disbursement (`TS_payer_cloturé → TS_payee_reçu`) — **objectif < 2 min**
- Frais Airtel vs commission Liguita (marge nette) — **alerte si négatif**

---

## 4. Sécurité

| Risque | Mitigation Liguita |
|---|---|
| Clés API leaking | Secret manager (Supabase Vault ou env chiffré). Jamais côté client. |
| Replay attack | `idempotency_key UNIQUE` côté Supabase avant tout POST. |
| Callback spoofing | HMAC-SHA256 activée, clé privée dans secret manager. |
| PIN sniffing | Chiffrement RSA côté serveur ; PIN jamais loggué, jamais en clair. |
| Man-in-the-middle | HTTPS uniquement, certificats renouvelés. |
| Time-out abuse | Cron `ENQUIRY_SCHEDULED` au lieu de re-pousser un paiement capturé. |
| Pays-non-routé (Tchad → autre) | Vérif `X-Country=TD` à l'entrée ; refuser si différent. |
| Wallet marchand indisponible | Test `ROUTER001` → alerte admin, pause les paiements sortants. |

---

## 5. Anomalie à corriger côté Liguita

À la ligne 1797, la **table References du document** indique `SC` comme country code du Tchad alors que **toutes les sections techniques du même document utilisent `TD`** (ISO-3166-1 alpha-2 officiel du Tchad). À implémenter : utiliser systématiquement `X-Country: TD`, ignorer la table References. Si Airtel renvoie néanmoins `ROUTER006 ROUTER106 « invalid country »`, ouvrir un ticket vers le support Airtel Tchad.

---

## 6. Informations manquantes pour la mise en production (checklist)

### 6.1 Identifiants Airtel (à fournir par Airtel Tchad)

- [ ] **Client_id UAT**
- [ ] **Client_secret UAT**
- [ ] **Client_id PRODUCTION**
- [ ] **Client_secret PRODUCTION**
- [ ] **MSISDN compte marchand Liguita** (format local `66XXXXXXX` ou `75XXXXXXX` — à confirmer)
- [ ] **PIN compte marchand Liguita** (4 chiffres ; conservé uniquement côté serveur)
- [ ] **Statut activation des produits** : Collection ✅ / Disbursement ✅ / Cash-In ✅ / Cash-Out ✅ / ATM Withdrawl ✅
- [ ] **URL callback Liguita** configurée dans Application Settings : `https://liguita.td/api/airtel/callback`
- [ ] **Authentification callback activée** : oui / non
- [ ] **Clé privée HMAC-SHA256** (à stocker dans secret manager, jamais commit)

### 6.2 Paramètres régionaux

- [ ] `X-Country` confirmée = `TD`
- [ ] `X-Currency` confirmée = `XAF`
- [ ] Format `msisdn` payable — pas de `+235`, pas d'espaces
- [ ] Confirmation que le système accepte les transactions `DT-DC` (Même pays, pas de cross-border)
- [ ] Timezone backend Liguita alignée sur WAT (UTC+1, N'Djamena)

### 6.3 Données de test sandbox

- [ ] **Au moins 5 numéros Airtel tests UAT** (payer mock + beneficiary mock)
- [ ] **Compte merchant UAT** pour invoquer `POST /merchant/v1/payments/`
- [ ] **Compte merchant DISB UAT** pour invoquer `POST /standard/v3/disbursements/`
- [ ] Acronyme validation : sandbox opérationnel 24/7 ou sur horaires ?
- [ ] VPN requis ?

### 6.4 Limites opérationnelles

- [ ] **Taux de plafonds** : montant max par transaction, montant max cumulatif mensuel marchand
- [ ] **Rate limits** par endpoint (par minute, par heure, par jour)
- [ ] **Limites de pagination** de `GET /merchant/v1/transactions` (la doc ne précise pas le `limit` max)
- [ ] **Délais** de pay-out disbursement (instantané ou batch journalier ?)
- [ ] **Liste complète des `status.response_code`** (la doc liste ~30 codes — demander la table exhaustive)
- [ ] **Liste des pays valides** dans `X-Country` (la doc a une erreur TD/SC — demander la liste formelle)

### 6.5 Conformité & contrats

- [ ] **Contrat marchand Airtel Money Tchad** signé (TOS, commissions, litiges)
- [ ] **Politique RGPD / protection données** alignée sur la **loi n° 007/PR/2015** du Tchad
- [ ] **RIB** enregistré côté Airtel pour les payouts
- [ ] **Procédure de réclamation** documentée côté Liguita
- [ ] **KYC utilisateur final** : alignement sur `KYC User Enquiry` — `is_pin_set`, `is_barred`, `first_name`, `last_name`

### 6.6 Stack Liguita

- [ ] Repo GitHub / GitLab + accès CI
- [ ] Service runtime cible : Next.js route handlers OU Supabase Edge Function
- [ ] Bibliothèques chiffrement dispo : `crypto-js`, `node:crypto`, spécialisé RSA-OAEP ?
- [ ] Secret manager : Supabase Vault ✓ OU Vault HashiCorp OU AWS Secrets Manager ?
- [ ] URL staging public (accessible depuis UAT Airtel pour callback)
- [ ] Cron scheduler : Supabase pg_cron ✓ OU GitHub Actions ✓ OU Vercel cron ?
- [ ] Logger structuré (Sentry + table `payment_events`) ✓
- [ ] Monitoring (uptime check sur `/api/airtel/health`) ✓

---

## 7. Prompt d'exécution (à coller dans un agent d'implémentation)

Le prompt ci-dessous est conçu pour être passé à un agent d'implémentation autonome (Claude Code, GPT-Engineer, etc.). Les blocs `[REMPLIR_PAR_LE_USER]` sont les valeurs à fournir ; les champs marqués `optionnel` peuvent rester vides en attendant la réponse d'Airtel Tchad.

```text
# TACHE : Implémenter le module de paiement Liguita × Airtel Money Tchad

## Contexte
Liguita est un SaaS tchadien d'objets perdus et retrouvés. Le paiement se fait en
XAF via Airtel Money Tchad. La grille tarifaire est variable (classes C1–C5,
300 à 3 000 FCFA ; C5 = 1 % de la valeur déclarée, plancher 5 000 / plafond
25 000 FCFA). Le plan d'implémentation complet est :
/home/user/liguita/Liguita_Paiement_AirtelTchad.md

Le document source de l'API Airtel Money Tchad (officiel, 8 endpoints, 16 codes
erreur) est : /home/user/liguita/api_raw.txt (extrait de `api airtel tchad.docx`).

## Endpoints à implémenter (extraits verbatim du document source)

| # | Endpoint | Méthode | Lines doc |
|---|----|----|----|
| 1 | /auth/oauth2/token | POST | 7 |
| 2 | /v1/rsa/encryption-keys | GET | 92 |
| 3 | /merchant/v1/payments/ | POST | 149 |
| 4 | /standard/v1/payments/{id} | GET | (Enquiry) |
| 5 | /standard/v1/payments/refund | POST | (Refund) |
| 6 | /standard/v3/disbursements | POST | 557 |
| 7 | /standard/v2/users/balance | GET | 1861 |
| 8 | {callback_path} (configurable) | POST (webhook) | 360–423 |

## Spec critique (verbatim doc)

- Base URL UAT : https://openapiuat.airtel.td
- Base URL PROD : https://openapi.airtel.td
- Auth : OAuth2 Client Credentials → POST /auth/oauth2/token
  (Body : client_id, client_secret, grant_type=client_credentials)
- USSD Push (paiement) : POST /merchant/v1/payments/
  ⚠️ « Do not send country code in msisdn. » (ligne 150)
- Enquiry minimum : « at least three minutes after the payment API has been called »
- Statut transaction : TF | TS | TA | TIP | TE
- Chiffrement PIN : RSA 2048, mode ECB, padding OAEPWithSHA-256AndMGF1Padding
- Message Signing v3 (disbursement) :
  payload chiffré AES → x-signature
  key:iv chiffré RSA → x-key
- Callback :
  - HMAC-SHA256 Base64 optionnel (clé privée dans Application Settings)
  - Répondre 200 en < 2 s, traitement arrière-plan
  - Sinon : GET /standard/v1/payments/{id} à T+180s
- Country code Tchad = TD (la table References du doc contient une erreur
  « SC » à ignorer — utiliser TD systématiquement)
- Currency = XAF

## Variables d'environnement (à charger via secret manager)

```
# UAT
AIRTEL_TD_UAT_BASE_URL=https://openapiuat.airtel.td
AIRTEL_TD_UAT_CLIENT_ID=[REMPLIR_PAR_LE_USER]
AIRTEL_TD_UAT_CLIENT_SECRET=[REMPLIR_PAR_LE_USER]

# PRODUCTION
AIRTEL_TD_PROD_BASE_URL=https://openapi.airtel.td
AIRTEL_TD_PROD_CLIENT_ID=[REMPLIR_PAR_LE_USER]
AIRTEL_TD_PROD_CLIENT_SECRET=[REMPLIR_PAR_LE_USER]

# Wallet marchand
AIRTEL_TD_MERCHANT_MSISDN=[REMPLIR_PAR_LE_USER]
AIRTEL_TD_MERCHANT_PIN=[REMPLIR_PAR_LE_USER - 4 chiffres]

# Callback
LIGUITA_AIRTEL_CALLBACK_URL=https://liguita.td/api/airtel/callback
AIRTEL_TD_HMAC_PRIVATE_KEY=[REMPLIR_PAR_LE_USER - clé HMAC-SHA256 Base64]

# Politiques
AIRTEL_TD_X_COUNTRY=TD
AIRTEL_TD_X_CURRENCY=XAF
LIGUITA_AIRTEL_ENV=uat  # ou prod
```

## Étapes à exécuter (dans l'ordre)

### Étape 1 — Bootstrap
Créer l'arborescence :
  src/lib/payments/
                 provider-airtel-td/
                    auth.ts
                    rsa.ts
                    encryption.ts
                    signature.ts        # AES+RSA v3
                    collect.ts          # POST /merchant/v1/payments/
                    enquiry.ts          # GET /standard/v1/payments/{id}
                    refund.ts           # POST /standard/v1/payments/refund
                    disbursement.ts     # POST /standard/v3/disbursements
                    balance.ts          # GET /standard/v2/users/balance
                    callback.ts         # POST handler HMAC-SHA256
                    types.ts            # interfaces TS et zod schemas
                    tests/
                      auth.test.ts
                      encryption.test.ts   # utiliser crypto-js ou node:crypto
                      signature.test.ts
                      collect.test.ts
                      disbursement.test.ts
                      callback.test.ts  # HMAC verify
  src/app/api/airtel/
                     callback/route.ts   # POST handler Next.js

### Étape 2 — Auth + cache
Implémenter `auth.ts` (lib/payments/provider-airtel-td/auth.ts) :
  - POST /auth/oauth2/token
  - Headers : Content-Type, Accept
  - Body : { client_id, client_secret, grant_type: 'client_credentials' }
  - Cache mémoire LRU :
      key = base_url
      value = { access_token, expires_at }
      TTL = expires_in - 60 secondes
  - Refresh proactif 60 s avant expiration
  - Tests : mock fetch ; vérifier que le cache sert les requêtes suivantes

### Étape 3 — Récupération clé RSA
Implémenter `rsa.ts` :
  - GET /v1/rsa/encryption-keys
  - Headers : Authorization: Bearer …, X-Country: TD, X-Currency: XAF
  - Cache mémoire LRU `key={base_url}` TTL 1 heure ou par âge de la clé
  - Stocker la clé publique comme `Buffer` (2048 bits, format PEM ou MIGfMA0…)
  - Tests : mock fetch avec une clé factice

### Étape 4 — Chiffrement PIN
Implémenter `encryption.ts` en utilisant `node:crypto` (préféré) ou `crypto-js` :
  - encryptPin(plain: string, publicKey: string) → base64
      Algorithme : RSA 2048
      Mode : ECB (padding-only)
      Padding : OAEPWithSHA-256AndMGF1Padding
      Entrée = PIN 4 chiffres (le client payeur ou le PIN du compte marchand)
  - Tests : vecteur connu, comparer ciphertext

### Étape 5 — Signature Disbursement v3
Implémenter `signature.ts` :
  - Générer clé AES-256 + IV-128 aléatoires (Crypto.randomBytes)
  - Chiffrer le payload JSON avec AES-256-CBC + PKCS5Padding
  - Chiffrer la paire key:iv avec RSA-OAEP SHA-256 contre la clé publique
  - Output :
      x-key    = base64(RSA(key:iv))
      x-signature = base64(AES(payload))
  - Tests : générer un payload, chiffrer, déchiffrer manuellement pour vérifier

### Étape 6 — Collect (USSD Push)
Implémenter `collect.ts` :
  - POST /merchant/v1/payments/
  - Headers : Content-Type, Accept, X-Country: TD, X-Currency: XAF,
              Authorization: Bearer …
  - Body :
      {
        reference: quote_id,
        subscriber: { country: 'TD', currency: 'XAF', msisdn: '...' },
        transaction: { amount, country: 'TD', currency: 'XAF', id: lg_txn_id }
      }
  - ⚠️ msisdn SANS '235' (pas de country code dans le MSISDN)
  - lg_txn_id = hash(quote_id + msisdn + amount + day) — idempotency_key
  - Vérifier l'idempotency_key côté Supabase avant POST (évite DP00900001017)
  - Tests : mock fetch TS et TF

### Étape 7 — Callback
Implémenter `src/app/api/airtel/callback/route.ts` (Next.js) :
  - POST handler
  - Si AIRTEL_TD_HMAC_PRIVATE_KEY défini :
      - Lire header `hash`
      - Recalculer HMAC-SHA256([body JSON], private_key, Base64)
      - Comparer en constant time
      - Si non-match → return 401
  - Toujours répondre 200 en < 2 s (ack rapide)
  - En parallèle : insérer payment_event, mettre à jour payment.status
  - Tests : mock POST avec/sans hash valide/invalide

### Étape 8 — Enquiry (3 min fallback)
Implémenter `enquiry.ts` :
  - GET /standard/v1/payments/{id}
  - Scheduler : toutes les 60 s pendant 15 min max, à partir de T+180 s
  - Si status ∈ {TS, TF, TE} → CLOSED_OK ou RELEASED
  - Si status ∈ {TA, TIP} → continuer l'enquiry
  - Stopper à TE après expiration

### Étape 9 — Refund
Implémenter `refund.ts` :
  - POST /standard/v1/payments/refund
  - Body : { transaction: { airtel_money_id: '...' } }
  - Restreindre à : disputes validés humainement (statut Dispute)

### Étape 10 — Disbursement v3 (récompense)
Implémenter `disbursement.ts` :
  - POST /standard/v3/disbursements
  - Headers STANDARDS : X-Country: TD, X-Currency: XAF, Authorization, Accept,
                       Content-Type
  - Headers SPÉCIFIQUES : X-Key, X-Signature (depuis signature.ts)
  - Body (chiffré en partie, mais pinstring = RSA-encrypted PIN) :
      {
        payee: { msisdn: '66XXXXXXX', wallet_type: 'SALARIED' },
        transaction: { amount, id: lg_disb_id }
      }
    + champ `pinstring` = RSA(PIN marchand Liguita)
  - lg_disb_id = hash(payment_id + trouveur_msisdn + amount + day)
  - Vérifier idempotency_key côté DB avant POST
  - Tests : signer un payload connu et inspecter headers

### Étape 11 — Balance (réconciliation)
Implémenter `balance.ts` :
  - GET /standard/v2/users/balance?type=DISB  (payouts)
  - GET /standard/v2/users/balance?type=COLL  (encaissements)
  - Cron quotidien 02:00 N'Djamena → comparer avec ledger

### Étape 12 — Schema DB
Migrations Supabase :
  CREATE TABLE pricing_rules (...)         -- déjà existant
  CREATE TABLE price_quotes (...)          -- déjà existant
  CREATE TABLE payments (...);
  CREATE TABLE payment_events (...);
  CREATE TABLE disbursements (...);
  CREATE TABLE reconciliation_jobs (...);
  Contraintes : UNIQUE(idempotency_key)
  Index : payments(payer_msisdn, created_at), payments(internal_status)

### Étape 13 — UI
Screens (Figma → React) avec le design system Liguita v3.0 :
  - Récapitulatif devis → bouton primaire #FF3B30 « Payer X FCFA »
  - Confirmation Airtel Money (USSD Push)
  - Statut pending / TS / TA / TF / solde insuffisant
  - Liste transactions /app/paiements
  - Dashboard B2B : KPI, export CSV

### Étape 14 — Tests E2E (UAT)
  - 5 numéros tests (à obtenir d'Airtel)
  - Reproduire TS, TF, TA, TIP, solde insuffisant (DP00800001007)
  - Test de charge : 200 paiements simultanés, p95 < 4 s
  - Test idempotence : rejouer 5 000 fois, vérifier DP00900001017

## Critères de succès
  - ✅ 100 % paiements UAT passent par les 8 endpoints
  - ✅ 0 double-débit sur 5 000 rejouages
  - ✅ Callback signé vérifié en constant time
  - ✅ Disbursement v3 signe correctement payload + headers
  - ✅ RLS Supabase sur payments (line particulier, line business, line admin)
  - ✅ Test charge : p95 < 4 s
  - ✅ Conformité loi n° 007/PR/2015 (Tchad) sur les données collectées

## Ce qui reste à fournir (Airtel)
  - Client_id / Client_secret UAT + PROD
  - MSISDN + PIN du compte marchand
  - 5 numéros tests UAT
  - Confirmation de X-Country=TD, X-Currency=XAF
  - Activation des produits : Collection / Disbursement / Cash-In / Cash-Out
  - URL callback : https://liguita.td/api/airtel/callback
  - Clé privée HMAC (optionnelle mais recommandé)
  - Limites : montant max par transaction, plafonds cumulés, rate limits

## Hors-périmètre MVP
  - Moov Money Tchad (P1 futur — onboarder en parallèle)
  - Stripe / cartes (v2 multi-pays)
  - USSD non-/light-customers
```


---

## 8. Glossaire (termes officiels doc)

| Acronyme | Signification |
|---|---|
| USSD Push | Notification push GSM/USSD qui invite l'utilisateur à confirmer le paiement |
| HMAC-SHA256 | Signature symétrique : hash des données + clé partagée, format Base64 |
| OAEPWithSHA-256AndMGF1Padding | Padding optimal pour RSA, recommandé depuis la v2.0 |
| `x-key` / `x-signature` | Headers de signature du payload Disbursement v3 |
| `TF/TS/TA/TIP/TE` | Transaction Failed / Successful / Ambiguous / In Progress / Expired |
| `PIN User` | Code secret 4 chiffres du payeur (chiffré via RSA) |
| `DUPLICATE_TX` | Code d'idempotence Airtel : `DP00900001017` |

---

## 9. Hash du contenu livré

- Doc source lue et parsée : **1933 paragraphes** (55 ko de texte utile)
- Endpoints identifiés : **8** (`token`, `rsa-keys`, `payments`, `payments/{id}`, `payments/refund`, `callback`, `disbursements`, `users/balance`)
- Codes erreur archivés : **16** (router + payment + encryption)
- Lignes de Message Signing reproduites intégralement

---

*Fin du document*
