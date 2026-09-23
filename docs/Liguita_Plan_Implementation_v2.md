# LIGUITA — Plan d'implémentation SaaS
## Plateforme tchadienne des objets perdus et retrouvés

**Version : 2.0 — Septembre 2026**

> **Révision 2.0** — Remplacement du forfait unique de mise en relation par une **grille tarifaire variable** (classe de l'objet, valeur déclarée, options), ajout d'une section **Innovations proposées** (section 59), ajout de la conformité à la loi tchadienne n° 007/PR/2015 et des canaux hors internet.

---

## 1. Vision du produit

**Liguita** est une plateforme SaaS permettant aux particuliers et aux entreprises de déclarer, rechercher, retrouver et restituer des objets perdus.

Le produit est conçu d'abord pour le **Tchad**, avec une architecture permettant ensuite un déploiement dans d'autres pays africains.

### Promesse

> **Liguita — J'ai trouvé. Tu as perdu. On se retrouve.**

Le produit repose sur cinq étapes :

```text
RECHERCHER
    ↓
TROUVER UNE CORRESPONDANCE
    ↓
VÉRIFIER LA PROPRIÉTÉ
    ↓
PAYER LES FRAIS (grille variable — section 2)
    ↓
ÊTRE MIS EN RELATION ET RESTITUER
```

---

# 2. Modèle économique

## 2.1 Principe : des frais variables, pas un forfait

Le montant des frais de mise en relation n'est **pas fixe**. Il dépend :

- de la **classe tarifaire** de l'objet (catégorie normalisée) ;
- de la **valeur déclarée** par le propriétaire (facultative) ;
- d'**options** choisies (traitement urgent, conciergerie, livraison).

```text
FRAIS = FRAIS_DE_BASE(classe)
      + SUPPLÉMENT_URGENCE (optionnel : +50 %)
      + CONCIERGERIE (optionnel : 1 000 FCFA)
      + LIVRAISON (optionnel : barème partenaire)
```

Le montant exact est **toujours affiché avant le paiement** et figé dans un devis (`price_quote`) au moment de la transaction.

Logique marché : les services internationaux d'objets trouvés appliquent déjà des frais de restitution variables selon l'objet (Uber 6 EUR ; SNCF 5–10 EUR ; Air France 12–15 EUR, dont le tarif supérieur pour l'électronique ; Préfecture de Police de Paris 11 EUR de frais de garde — sources en 2.6). Liguita adapte cette logique au pouvoir d'achat tchadien.

## 2.2 Grille tarifaire — particuliers

| Classe | Types d'objets | Frais de base | Récompense trouveur (≈ 1/3) | Part Liguita |
|---|---|---:|---:|---:|
| **C1 — Documents & cartes** | CNI, passeport, permis, carte d'étudiant, carte professionnelle, diplômes, carnets | 300 FCFA | 100 FCFA | 200 FCFA |
| **C2 — Effets personnels courants** | Portefeuille, sac, clés, lunettes, vêtements, livres, bijoux fantaisie | 700 FCFA | 250 FCFA | 450 FCFA |
| **C3 — Électronique & valeur moyenne** | Téléphone, tablette, ordinateur, écouteurs, montre connectée, appareil photo | 1 200 FCFA | 400 FCFA | 800 FCFA |
| **C4 — Valeur élevée** | Bijoux précieux, sacs/articles de marque, matériel professionnel, instruments | 3 000 FCFA | 900 FCFA | 2 100 FCFA |
| **C5 — Cas spéciaux** | Valeur déclarée supérieure à 1 000 000 FCFA, véhicules, lots d'entreprise | 1 % de la valeur déclarée (plancher 5 000 FCFA, plafond 25 000 FCFA) | 30 % des frais | 70 % des frais |

### Règles de classement

- La classe est déterminée **automatiquement par la catégorie** de l'objet.
- Si le propriétaire **déclare une valeur** qui place l'objet dans une classe supérieure, la classe supérieure s'applique.
- Si aucune valeur n'est déclarée, la classe de la catégorie par défaut s'applique.
- Les cas ambigus (ex. téléphone ancien de faible valeur) sont traités à la classe inférieure — principe : **ne jamais dissuader la restitution par le prix**.

## 2.3 Options payantes

| Option | Prix | Effet |
|---|---|---|
| Traitement urgent | +50 % des frais de base (ex. C1 : 300 → 450 FCFA) | Alerte immédiate au trouveur, file prioritaire, mise en relation express |
| Conciergerie documents | 1 000 FCFA | Accompagnement aux démarches de remplacement (CNI, passeport, permis…) |
| Livraison | Barème partenaire (indicatif : 2 000 à 5 000 FCFA selon la ville) | Remise à domicile ou en point relais |

## 2.4 Récompense du trouveur

- La récompense est **proportionnelle aux frais payés** (environ un tiers).
- **Récompense communautaire (optionnelle)** : le propriétaire peut ajouter un montant libre ; Liguita ne prélève **aucune commission** sur ce bonus.
- **Mode solidaire** : le trouveur peut renoncer à sa récompense → versement à une association partenaire ou conversion en crédits (étiquettes QR), avec badge « Samaritain ».

## 2.5 Protection du payeur

- Affichage du montant **avant** toute confirmation, avec détail (base + options + récompense incluse).
- **Remboursement intégral** si : aucune mise en relation effective sous 7 jours ; trouveur injoignable ; objet déjà restitué ; fraude avérée.
- En cas de litige, la récompense reste bloquée jusqu'à résolution.
- Le paiement est présenté comme un **frais de mise en relation/restitution**, et non comme la vente des coordonnées personnelles du trouveur.

## 2.6 Références marché

| Service | Frais de restitution | Source |
|---|---|---|
| Uber | 6 EUR (forfait) | [Uber — Frais de restitution](https://help.uber.com/fr-FR/riders/article/frais-de-restitution-des-objets-perdus?nodeId=633c684e-1d4b-426a-bd4f-6bee488dac6a) |
| SNCF — Gares & Connexions | 5 EUR (objets courants) / 10 EUR (objets spécifiques) | [Gares & Connexions](https://www.garesetconnexions.sncf/fr/faq/objets-trouves/quoi-consistent-frais-restitution-000001202) |
| Air France Objets Trouvés | 12 EUR / 15 EUR (électronique) | [Air France — Frais de mise en relation](https://airfrance.franceobjetstrouves.fr/frais) |
| Préfecture de Police (Paris) | 11 EUR (frais de garde) | [Préfecture de Police](https://www.prefecturedepolice.interieur.gouv.fr/demarches/le-service-des-objets-trouves) |
| FindMyLost (Italie) | Frais de récupération variables par objet | [FindMyLost — Business](https://www.findmylost.it/en/company/business.html) |

## 2.7 Gouvernance tarifaire

- Les règles de prix vivent en base (table `pricing_rules`) : pays, classe, frais de base, part récompense, plancher/plafond, options.
- Chaque paiement fige un `price_quote` (montants détaillés) → auditabilité et stabilité juridique.
- La grille est **multi-pays** (déjà prévu : country / business rules) et ajustable sans redéploiement.
- Tests A/B possibles sur les seuils de classe, avec validation commerciale.
- La page `/tarifs` (section 15) affiche la grille publique.

### Règle importante

Le numéro personnel du trouveur ne doit pas être exposé directement.

Liguita sert d'intermédiaire.

---

# 3. Deux produits dans une même plateforme

## LIGUITA PARTICULIER

Pour :

- déclarer un objet perdu ;
- déclarer un objet trouvé ;
- rechercher un objet ;
- recevoir des correspondances ;
- prouver la propriété ;
- payer les frais de mise en relation ;
- communiquer avec le trouveur ;
- confirmer la restitution.

## LIGUITA BUSINESS

Pour :

- aéroports ;
- gares ;
- supermarchés ;
- hôtels ;
- restaurants ;
- universités ;
- écoles ;
- centres commerciaux ;
- administrations ;
- entreprises ;
- événements ;
- transports.

Fonctions :

- gestion des objets trouvés ;
- inventaire ;
- employés ;
- plusieurs établissements ;
- matching ;
- notifications ;
- restitution ;
- statistiques ;
- abonnements.

---

# 4. Principe UX principal

La page d'accueil doit immédiatement proposer trois actions :

```text
┌─────────────────────────────────────────┐
│                                         │
│             LIGUITA                     │
│                                         │
│       Vous avez perdu quelque chose ?   │
│                                         │
│ [ 🔎 RECHERCHER UN OBJET ]              │
│                                         │
│ [ 🔴 J'AI PERDU UN OBJET ]              │
│ [ 🟢 J'AI TROUVÉ UN OBJET ]             │
│                                         │
└─────────────────────────────────────────┘
```

La **recherche** doit être l'action principale.

---

# 5. Parcours particulier — Objet perdu

## Étape 1 — Recherche rapide

L'utilisateur écrit naturellement :

> carte

ou :

> j'ai perdu une carte d'identité à N'Djamena

Le système extrait éventuellement :

- catégorie ;
- type d'objet ;
- ville ;
- zone ;
- date ;
- lieu.

---

## Étape 2 — Filtres

```text
Objet
Ville
Quartier / zone
Lieu
Date
Catégorie
Couleur
Marque
```

Exemples de lieux :

- aéroport ;
- gare ;
- taxi ;
- marché ;
- supermarché ;
- restaurant ;
- hôtel ;
- école ;
- université ;
- rue ;
- maison ;
- bureau ;
- autre.

---

## Étape 3 — Résultats anonymisés

Exemple :

```text
🪪 Carte trouvée

N'Djamena · Moursal
Trouvée le 21 septembre

Correspondance probable

[ VOIR LA CORRESPONDANCE ]
```

Les informations sensibles restent masquées.

---

# 6. Système de matching

Le moteur compare les déclarations perdues et trouvées.

### Données comparées

```text
Catégorie
Type
Marque
Modèle
Couleur
Ville
Zone
Lieu
Date
Description
Photo
Informations spécifiques
```

### Score interne initial

```text
Type d'objet       30 %
Lieu               25 %
Date               15 %
Couleur            10 %
Marque             10 %
Description        10 %
```

Le score pourra évoluer après analyse des données réelles.

### Niveaux

```text
90–100 % → Correspondance très probable
70–89 %  → Correspondance possible
<70 %    → Correspondance faible
```

Le score exact peut rester invisible pour l'utilisateur.

---

# 7. Vérification de propriété

Avant de permettre la mise en relation, Liguita doit vérifier que la personne est réellement propriétaire.

Exemples :

- nom ;
- date de naissance ;
- couleur ;
- contenu du portefeuille ;
- détail particulier ;
- numéro partiellement visible ;
- photo personnelle de l'objet ;
- marque/modèle ;
- informations non publiées dans l'annonce.

### Accélération par le Coffre Liguita

Si l'objet a été pré-enregistré dans le **Coffre Liguita** (inventaire préventif — Innovation #8), la vérification peut devenir quasi instantanée : numéro de série, IMEI, photo pré-enregistrée comparée automatiquement.

### Pour les documents sensibles

Ne jamais afficher publiquement :

- numéro complet ;
- date de naissance complète ;
- adresse ;
- photo complète ;
- numéro de téléphone ;
- données personnelles inutiles.

---

# 8. Paiement

Une fois la correspondance suffisamment vérifiée, le montant est calculé selon la grille tarifaire (section 2) et affiché avant toute confirmation :

```text
Votre objet semble correspondre.

Mise en relation sécurisée

Catégorie : Téléphone — classe C3
Frais de mise en relation : 1 200 FCFA
  dont récompense trouveur : 400 FCFA

[ VOIR LE DÉTAIL ]   [ PAYER ]
```

Après paiement :

```text
Paiement confirmé

 400 FCFA → réservés pour le trouveur
 800 FCFA → Liguita

[ OUVRIR LA MISE EN RELATION ]
```

Le montant est figé dans un devis (`price_quote`) : il ne change plus après confirmation.

---

# 9. Mise en relation sécurisée

Ne pas exposer automatiquement les numéros personnels.

Créer une conversation :

```text
Propriétaire
      ↕
  LIGUITA
      ↕
  Trouveur
```

Fonctions :

- messages ;
- statut de restitution ;
- lieu de remise ;
- confirmation ;
- signalement ;
- historique.

---

# 10. Récompense du trouveur

Le trouveur voit :

> Une récompense de 400 FCFA est réservée pour vous.

Le montant varie selon la classe de l'objet (grille, section 2).

Le versement est déclenché après :

```text
Paiement
   ↓
Mise en relation
   ↓
Restitution
   ↓
Confirmation du propriétaire
   ↓
Récompense versée
```

S'y ajoutent :

- **bonus communautaire** : récompense additionnelle choisie par le propriétaire, sans commission Liguita ;
- **mode solidaire** : le trouveur peut renoncer à sa récompense (don à une association partenaire ou crédits) et recevoir un badge « Samaritain ».

Prévoir un système anti-fraude et un mécanisme de litige.

---

# 11. Parcours "J'ai trouvé"

Le formulaire doit être extrêmement rapide.

## Étape 1

```text
[ 📷 AJOUTER UNE PHOTO ]
```

## Étape 2

```text
Catégorie
Type
Couleur
Marque
Ville
Zone
Lieu
Date
Description
```

## Étape 3

```text
[ PUBLIER L'OBJET ]
```

### Principe

Plus le formulaire est court, plus les utilisateurs auront tendance à publier les objets trouvés.

---

# 12. Protection des objets sensibles

Pour :

- cartes bancaires ;
- cartes d'identité ;
- passeports ;
- documents administratifs ;
- cartes professionnelles ;

les photos doivent être automatiquement floutées ou masquées sur les zones sensibles.

L'utilisateur ne doit jamais pouvoir publier involontairement toutes les données d'un document.

---

# 13. Recherche intelligente

## Recherche classique

```text
carte
```

## Recherche naturelle

```text
J'ai perdu ma carte d'identité hier à Farcha.
```

Le moteur peut transformer cela en :

```text
Catégorie : Carte d'identité
Ville : N'Djamena
Zone : Farcha
Date : hier
```

### Évolution future

Utiliser une couche IA/NLP pour améliorer :

- compréhension des descriptions ;
- synonymes ;
- fautes d'orthographe ;
- langues ;
- descriptions longues ;
- matching sémantique.

---

# 14. Application de recherche

URL proposée :

```text
/recherche
```

Structure :

```text
/search
/search/results
/search/item/[id]
/search/matches/[id]
```

---

# 15. Pages publiques principales

```text
/
├── rechercher
├── objets-trouves
├── comment-ca-marche
├── entreprises
├── tarifs
├── securite
├── aide
├── connexion
└── inscription
```

---

# 16. Espace particulier

```text
/compte
├── tableau-de-bord
├── mes-objets-perdus
├── mes-objets-trouves
├── mes-correspondances
├── mes-conversations
├── mes-paiements
├── mes-recompenses
├── notifications
├── profil
└── securite
```

### Dashboard

```text
Mes recherches
3 objets perdus

Correspondances
2

Objets trouvés
1

Mises en relation
1
```

---

# 17. LIGUITA BUSINESS

## Cibles

Priorité initiale :

1. Aéroports
2. Gares
3. Supermarchés
4. Hôtels
5. Centres commerciaux

Puis :

- universités ;
- écoles ;
- restaurants ;
- événements ;
- transports ;
- administrations ;
- entreprises.

---

# 18. Création d'une organisation

```text
Entreprise
Nom
Logo
Téléphone
Email
Adresse
Ville
Secteur
```

Une entreprise peut posséder plusieurs établissements.

Exemple :

```text
Entreprise X

├── N'Djamena Centre
├── N'Djamena Sud
├── Moundou
└── Abéché
```

---

# 19. Rôles Business

### Owner

Accès complet.

### Admin

Gestion de l'organisation.

### Manager

Gestion d'un établissement.

### Agent

Ajout et gestion des objets trouvés.

### Lecture seule

Consultation/statistiques.

---
# 20. Dashboard Business

```text
┌──────────────────────────────────────────┐
│ LIGUITA BUSINESS                         │
├──────────────────────────────────────────┤
│                                          │
│ Objets trouvés          247              │
│ En attente               82              │
│ Correspondances          46              │
│ Restitués               119              │
│                                          │
├──────────────────────────────────────────┤
│ + Ajouter un objet                       │
│ 🔎 Rechercher                             │
│ 📦 Inventaire                             │
│ 🤝 Correspondances                        │
│ 👥 Équipe                                 │
│ 📊 Statistiques                           │
│ 💳 Abonnement                             │
│ ⚙️ Paramètres                             │
└──────────────────────────────────────────┘
```

---

# 21. Gestion des objets Business

Chaque objet reçoit un identifiant unique :

```text
LG-2026-000291
```

Informations :

```text
ID
Catégorie
Photo
Date de découverte
Lieu
Établissement
Agent
Statut
Emplacement physique
Notes internes
```

### Statuts

```text
TROUVÉ
EN INVENTAIRE
MATCH POSSIBLE
PROPRIÉTAIRE IDENTIFIÉ
RESTITUTION EN COURS
RESTITUÉ
ARCHIVÉ
```

---

# 22. Localisation physique des objets

Pour les entreprises, ajouter :

```text
Bâtiment
Étage
Zone
Armoire
Casier
Sac
Référence interne
```

Exemple :

```text
Aéroport
Terminal 1
Bureau objets trouvés
Casier B
Compartiment 04
```

Cela facilite énormément la restitution.

---

# 23. QR Code Business

Chaque objet peut générer :

```text
LIGUITA

Objet #LG-2026-000291

[ QR CODE ]
```

Le QR permet à un agent autorisé de retrouver immédiatement la fiche.

---

# 24. Multi-sites

Architecture :

```text
Organization
    │
    ├── Locations
    │       ├── Location A
    │       ├── Location B
    │       └── Location C
    │
    └── Users
```

Un utilisateur ne doit voir que les données autorisées par son rôle.

---

# 25. Abonnement Business

Proposer initialement trois niveaux à tester commercialement.

## Starter

Pour petites structures.

Exemple :

```text
25 000 FCFA / mois
```

## Business

Pour structures moyennes.

Exemple :

```text
50 000 FCFA / mois
```

## Enterprise

Pour grandes organisations / réseaux.

```text
Sur devis
```

Les prix sont indicatifs et doivent être validés auprès des premiers clients.

### Restitutions « frais offerts » (proposition à tester)

Les plans peuvent inclure un quota mensuel de restitutions dont les frais de mise en relation sont **offerts au client final** de l'établissement :

```text
Starter    → 15 restitutions / mois
Business   → 50 restitutions / mois
Enterprise → illimité
```

Argument commercial : « Vos clients récupèrent leurs objets gratuitement chez vous. » Au-delà du quota, les frais s'appliquent (ou facturation sur devis).

---

# 26. Fonctionnalités Premium Business

Selon le plan :

- nombre d'utilisateurs ;
- nombre d'établissements ;
- nombre d'objets ;
- quota de restitutions « frais offerts » ;
- statistiques ;
- export ;
- API ;
- intégration ;
- support prioritaire ;
- personnalisation ;
- domaine/sous-domaine ;
- SLA.

---

# 27. Livraison

Phase 2.

Lorsqu'un objet est retrouvé :

```text
Récupération sur place
OU
Livraison
```

Exemple :

```text
Objet : téléphone
Lieu : Aéroport N'Djamena

Livraison vers :
N'Djamena Centre

Frais :
2 000 FCFA (indicatif, selon partenaire)
```

La livraison peut être gérée par un partenaire. Les frais de livraison s'ajoutent aux frais de mise en relation (grille, section 2).

---

# 28. QR personnel

Créer un produit complémentaire :

```text
Étiquette Liguita

[ QR CODE ]

Si trouvé,
scannez-moi.
```

Le QR ouvre une page permettant de signaler que l'objet a été trouvé sans révéler immédiatement les données du propriétaire.

Produits possibles :

- stickers ;
- porte-clés ;
- étiquettes bagages ;
- étiquettes sacs ;
- cartes QR ;
- étiquettes scolaires.

### Monétisation

- vente de packs (stickers, porte-clés, étiquettes) ;
- abonnement Premium optionnel : assistance prioritaire, alertes SMS illimitées, services associés.

---

# 29. Notifications

Canaux :

```text
Notification web
WhatsApp
SMS
Email (optionnel)
USSD / ligne vocale (phase 2+ — Innovation #11)
```

Événements :

- nouvelle correspondance ;
- paiement confirmé ;
- message reçu ;
- objet trouvé ;
- restitution ;
- récompense ;
- abonnement ;
- alerte entreprise ;
- alerte de recherche sauvegardée (Innovation #2).

---

# 30. Architecture technique recommandée

## Frontend

```text
Next.js
TypeScript
Tailwind CSS
shadcn/ui
```

## Backend

```text
Supabase
PostgreSQL
Supabase Auth
Supabase Storage
Supabase Realtime
Row Level Security
```

## Recherche

Phase 1 :

```text
PostgreSQL
Full Text Search
trigram
filtres
```

Phase 2 :

```text
pgvector
embeddings
matching sémantique
```

Phase 3 :

```text
IA multimodale
analyse photo
matching avancé
```

---

# 31. Architecture paiement

Ne pas coder directement toute la logique métier autour d'un seul opérateur.

Créer une couche :

```text
Liguita Payment Service
        │
        ├── Provider A
        ├── Provider B
        ├── Provider C
        └── Provider D
```

Chaque transaction possède :

```text
payment_id
user_id
match_id
pricing_rule_id
breakdown            (frais de base, options, récompense, part Liguita)
amount
currency
provider
status
reference
created_at
completed_at
```

---

# 32. Ledger financier

Créer un véritable registre des transactions.

Exemple — classe C3 (téléphone) :

```text
Transaction #LG-PAY-00001

Catégorie : C3 — Électronique
Frais de base : 1 200 FCFA
Options : aucune
Total : 1 200 FCFA

Liguita : 800 FCFA
Trouveur : 400 FCFA

Statuts :
PAID
REWARD_PENDING
REWARD_RELEASED
```

Exemple — classe C1 (carte d'identité) :

```text
Transaction #LG-PAY-00002

Frais de base : 300 FCFA
Liguita : 200 FCFA
Trouveur : 100 FCFA
```

Les options (urgence, conciergerie, livraison) apparaissent comme des lignes séparées du registre.

Cela facilite :

- comptabilité ;
- remboursements ;
- audits ;
- litiges ;
- statistiques.

---

# 33. Base de données

Tables principales :

```text
users
profiles

organizations
organization_locations
organization_users

lost_items
found_items
item_categories
item_photos
item_attributes

locations

matches
claims
verification_questions
verification_answers

conversations
messages

payments
transactions
rewards
pricing_rules
price_quotes

notifications
saved_searches

subscriptions
subscription_plans

qr_codes

reports
fraud_cases
audit_logs
```

---

# 34. Relations essentielles

```text
USER
 │
 ├── lost_items
 ├── found_items
 ├── claims
 ├── payments
 ├── conversations
 └── notifications

ORGANIZATION
 │
 ├── locations
 ├── employees
 ├── found_items
 ├── subscriptions
 └── statistics

LOST_ITEM
 │
 └── MATCH
       │
       └── FOUND_ITEM
              │
              └── CLAIM
                    │
                    └── PAYMENT
                          │
                          └── RESTITUTION
```

---

# 35. Sécurité

## Authentification

- OTP téléphone ;
- mot de passe/PIN ;
- sessions sécurisées ;
- éventuellement passkeys plus tard.

## Données

- chiffrement en transit ;
- contrôle d'accès ;
- RLS Supabase ;
- séparation particulier/business ;
- logs d'audit.

## Vie privée

Ne jamais exposer publiquement :

- numéro de téléphone ;
- adresse personnelle ;
- document complet ;
- données sensibles ;
- coordonnées exactes du trouveur.

## Conformité — Tchad

Cadre : loi n° 007/PR/2015 portant protection des données à caractère personnel et son décret d'application n° 075/PR/2019 [Source](https://www.africadataprotection.org/pays/tchad.html).

À mettre en place :

- registre des traitements ;
- minimisation (ne collecter que les données nécessaires au matching) ;
- durées de conservation et purge ;
- droits d'accès, de rectification et de suppression ;
- floutage automatique des documents (section 12) ;
- journalisation des accès aux données sensibles.

---

# 36. Anti-fraude

Prévoir dès le MVP :

```text
Rate limiting
OTP
Détection d'abus
Historique des comptes
Signalement
Blocage
Audit logs
Vérification manuelle
```

Cas à gérer :

### Faux objet trouvé

Un utilisateur publie un objet qu'il ne possède pas.

### Faux propriétaire

Une personne tente de réclamer l'objet de quelqu'un d'autre.

### Faux paiement

Paiement simulé.

### Multiples réclamations

Plusieurs utilisateurs revendiquent le même objet.

### Escroquerie

Tentative de sortir la conversation de Liguita.

---

# 37. Modération Admin

Dashboard :

```text
Utilisateurs
Objets
Correspondances
Paiements
Réclamations
Signalements
Entreprises
Abonnements
Transactions
Fraudes
```

Actions :

```text
Voir
Bloquer
Suspendre
Masquer
Restaurer
Rembourser
Marquer fraude
Résoudre litige
```

---

# 38. Administration des villes

Le système doit être multi-pays dès la conception.

```text
Country
Currency
Phone prefix
Cities
Neighborhoods
Payment providers
Languages
Business rules
```

Premier pays :

```text
TD — Tchad
XAF
+235
```

---

# 39. Internationalisation

Prévoir :

```text
Français
Arabe
```

Dès que possible.

L'interface peut commencer en français, mais la base technique doit supporter plusieurs langues.

---

# 40. Mobile-first

Priorité :

```text
Téléphone
   ↓
Tablette
   ↓
Desktop
```

Le particulier utilisera majoritairement son téléphone.

Le dashboard Business sera optimisé pour desktop/tablette.

---

# 41. PWA

Avant de développer immédiatement une application native :

Créer une **PWA**.

Avantages :

- installation sur téléphone ;
- accès caméra ;
- notifications ;
- faible coût ;
- une seule base de code.

Application Android native ensuite si l'usage le justifie.

---
# 42. Performance

Le Tchad doit être traité comme un environnement à connectivité variable.

Prévoir :

- images compressées ;
- WebP/AVIF ;
- lazy loading ;
- pages légères ;
- cache ;
- pagination ;
- uploads optimisés ;
- formulaires résistants aux coupures ;
- sauvegarde automatique des brouillons.

---

# 43. MVP — Phase 1

## Objectif

Valider que les utilisateurs arrivent à :

```text
Chercher
↓
Trouver
↓
Vérifier
↓
Payer
↓
Être mis en relation
↓
Récupérer
```

### Particulier

- inscription téléphone ;
- OTP ;
- recherche ;
- filtres ;
- déclaration perdu ;
- déclaration trouvé ;
- photos ;
- matching ;
- vérification ;
- paiement (grille variable) ;
- conversation ;
- notification ;
- restitution ;
- récompense.

### Business

- inscription entreprise ;
- établissement ;
- employés ;
- ajout objet ;
- inventaire ;
- recherche ;
- matching ;
- restitution.

### Admin

- gestion utilisateurs ;
- objets ;
- entreprises ;
- paiements ;
- matchs ;
- signalements.

---

# 44. Phase 2 — Produit commercial

Ajouter :

- abonnements ;
- multi-sites ;
- QR codes ;
- WhatsApp ;
- SMS ;
- statistiques ;
- export ;
- livraison ;
- réputation ;
- badges ;
- gestion avancée des équipes ;
- recherches sauvegardées et alertes (Innovation #2) ;
- attestation de restitution (Innovation #3) ;
- score de confiance (Innovation #4).

---

# 45. Phase 3 — Intelligence

Ajouter :

- recherche en langage naturel ;
- matching sémantique ;
- analyse photo ;
- reconnaissance de catégorie ;
- extraction automatique des informations ;
- suggestions ;
- détection d'anomalies ;
- scoring anti-fraude ;
- déclaration vocale multilingue (Innovation #12).

---

# 46. Phase 4 — Écosystème

Ajouter :

- application Android ;
- API Business ;
- intégrations aéroport ;
- intégrations gare ;
- intégrations hôtels ;
- partenaires de livraison ;
- QR personnels ;
- marketplace de tags ;
- assurance partenaire ;
- canaux USSD / ligne vocale (Innovation #11).

---

# 47. KPI à suivre

## Particuliers

```text
Nombre de recherches
Nombre de pertes
Nombre d'objets trouvés
Nombre de matchs
Taux de match
Taux de restitution
Temps moyen de récupération
Nombre de paiements
```

## Business

```text
Objets enregistrés
Matchs
Restitutions
Temps moyen de traitement
Objets encore en stock
Employés actifs
Établissements actifs
```

## Business model

```text
GMV
Revenus Liguita
Récompenses distribuées
ARPU
Panier moyen par restitution (par classe tarifaire)
MRR
Nombre d'entreprises abonnées
Churn
Coût d'acquisition
```

---

# 48. Architecture des routes

## Public

```text
/
 /rechercher
 /objets-trouves
 /comment-ca-marche
 /entreprises
 /tarifs
 /aide
```

## Auth

```text
/auth/connexion
/auth/inscription
/auth/otp
```

## Particulier

```text
/app
/app/recherche
/app/perdus
/app/perdus/nouveau
/app/trouves
/app/trouves/nouveau
/app/matchs
/app/matchs/[id]
/app/messages
/app/paiements
/app/profil
```

## Business

```text
/business
/business/objets
/business/objets/nouveau
/business/matchs
/business/restitutions
/business/sites
/business/equipe
/business/statistiques
/business/abonnement
/business/parametres
```

## Admin

```text
/admin
/admin/users
/admin/items
/admin/matches
/admin/payments
/admin/business
/admin/fraud
/admin/reports
/admin/settings
```

---

# 49. Plan de développement recommandé

## Sprint 0 — Conception

- architecture ;
- UX ;
- design system ;
- base de données ;
- règles métier ;
- grille tarifaire et `pricing_rules` ;
- paiement ;
- sécurité.

## Sprint 1 — Authentification

- inscription ;
- OTP ;
- profils ;
- rôles.

## Sprint 2 — Objets

- perdu ;
- trouvé ;
- photos ;
- catégories ;
- lieux.

## Sprint 3 — Recherche

- moteur ;
- filtres ;
- résultats ;
- pages objet.

## Sprint 4 — Matching

- scoring ;
- correspondances ;
- notifications ;
- recherches sauvegardées et alertes (Innovation #2).

## Sprint 5 — Vérification

- questions ;
- claims ;
- validation.

## Sprint 6 — Paiement

- grille tarifaire variable (classement automatique, devis) ;
- transactions ;
- répartition ;
- récompense.

## Sprint 7 — Mise en relation

- conversations ;
- notifications ;
- restitution ;
- attestation de restitution (Innovation #3).

## Sprint 8 — Business

- organisations ;
- établissements ;
- employés ;
- inventaire.

## Sprint 9 — Admin

- modération ;
- paiements ;
- fraude ;
- statistiques.

## Sprint 10 — Tests et lancement

- sécurité ;
- performance ;
- mobile ;
- tests utilisateurs ;
- monitoring ;
- déploiement.

---

# 50. Design System Liguita

Le logo fourni sert de direction artistique.

### Direction

- formes arrondies ;
- symbole de localisation ;
- typographie douce ;
- identité accessible ;
- aspect moderne SaaS ;
- forte lisibilité mobile.

### Couleur principale

Le rouge du logo peut servir de couleur de marque.

À définir précisément dans le design system :

```text
Primary
Primary Hover
Primary Light
Background
Surface
Text
Muted
Success
Warning
Danger
```

### Deux couleurs fonctionnelles

Rouge :

> Perdu / action principale

Vert :

> Trouvé / restitution / succès

Attention : le rouge et le vert ne doivent pas être les seuls indicateurs ; utiliser également icônes et textes pour l'accessibilité.

---

# 51. Page d'accueil MVP

Structure :

```text
HEADER
Logo
Rechercher
Comment ça marche
Entreprises
Connexion
[ J'ai trouvé ]

HERO

Vous avez perdu quelque chose ?

Recherchez parmi les objets retrouvés.

[ 🔎 Rechercher un objet ]

[ J'ai perdu ]
[ J'ai trouvé ]

SECTION
Comment ça marche ?

01 Recherchez
02 Vérifiez
03 Payez
04 Retrouvez

SECTION
Objets récemment trouvés

SECTION
Pour les entreprises

Aéroports
Gares
Supermarchés
Hôtels

[ Découvrir Liguita Business ]

SECTION
Pourquoi Liguita ?

Sécurisé
Simple
Rapide
Local

FOOTER
```

---

# 52. Principe produit fondamental

Liguita ne doit pas être présenté comme :

> "Un site où l'on publie des objets perdus."

Il faut le présenter comme :

> **"Un moteur de recherche pour retrouver les objets perdus."**

La différence est importante.

Le premier modèle attend que l'utilisateur publie une perte.

Le deuxième donne une raison de venir immédiatement sur Liguita :

```text
J'ai perdu quelque chose
        ↓
Je cherche
        ↓
Liguita trouve des correspondances
        ↓
Je vérifie
        ↓
Je paie les frais (300 à 3 000 FCFA selon l'objet)
        ↓
Je suis mis en relation
        ↓
Je récupère mon objet
```

---

# 53. Règle métier centrale à implémenter

```text
IF
    matching_score >= seuil
AND
    ownership_verification = passed
THEN
    compute_fee(category_class, declared_value, options)
    display_fee_before_payment
END

IF
    payment = confirmed
THEN
    create_secure_conversation
    reserve_reward(reward_share_of_fee)
END

IF
    restitution = confirmed
THEN
    release_reward(reward_share_of_fee)
    close_case
END
```

---

# 54. Architecture finale

```text
                         LIGUITA
                            │
             ┌──────────────┴──────────────┐
             │                             │
       PARTICULIERS                    BUSINESS
             │                             │
       Recherche                      Dashboard
       Perdu                           Inventaire
       Trouvé                          Employés
       Match                           Multi-sites
       Vérification                    Statistiques
       Paiement                        Abonnement
       Conversation                    API
             │                             │
             └──────────────┬──────────────┘
                            │
                     MATCHING ENGINE
                            │
                  ┌─────────┴─────────┐
                  │                   │
             SEARCH ENGINE         IA LATER
                  │                   │
                  └─────────┬─────────┘
                            │
                  PRICING + PAYMENT LAYER
                            │
                 ┌──────────┼──────────┐
                 │          │          │
              Provider   Provider   Provider
                            │
                       NOTIFICATIONS
                            │
                  ┌─────────┼─────────┐
                  │         │         │
               WhatsApp    SMS       Web
```

---

# 55. Priorité absolue

Ne pas commencer par :

- application mobile native ;
- IA complexe ;
- QR personnel ;
- livraison ;
- dizaines de catégories ;
- fonctionnalités sociales.

Commencer par rendre **parfait** ce parcours :

```text
RECHERCHE
    ↓
CORRESPONDANCE
    ↓
VÉRIFICATION
    ↓
PAIEMENT (grille variable)
    ↓
MISE EN RELATION
    ↓
RESTITUTION
    ↓
RÉCOMPENSE
```

Puis construire Liguita Business autour du même moteur.

---

# 56. Résultat attendu du MVP

À la fin du MVP, un utilisateur doit pouvoir :

> "J'ai perdu ma carte."

→ rechercher **carte**

→ filtrer **N'Djamena**

→ trouver une annonce correspondante

→ répondre aux questions de vérification

→ payer **300 FCFA** (classe C1 — documents)

→ être mis en relation

→ récupérer sa carte

→ confirmer la restitution

→ déclencher la récompense de **100 FCFA**.

Une entreprise doit pouvoir :

> "Nous avons trouvé 30 objets à l'aéroport."

→ créer son établissement

→ ajouter les objets

→ les organiser

→ permettre à Liguita de les matcher avec les recherches des particuliers

→ gérer les restitutions depuis son dashboard.

---

# 57. Ordre de construction recommandé

### PRIORITÉ P0 — indispensable

- Auth téléphone/OTP
- Recherche
- Perdu
- Trouvé
- Photos
- Catégories
- Lieux
- Matching
- Vérification
- Grille tarifaire + devis (`pricing_rules`, `price_quotes`)
- Paiement
- Mise en relation
- Restitution
- Admin
- Recherches sauvegardées + alertes (Innovation #2)

### PRIORITÉ P1 — lancement commercial

- Business
- Abonnements (avec restitutions « frais offerts » — Innovation #7)
- Multi-sites
- WhatsApp (bot officiel — Innovation #5)
- SMS
- QR Business
- Statistiques
- Récompenses (bonus communautaire + mode solidaire — Innovation #6)
- Anti-fraude
- Attestation de restitution (Innovation #3)
- Score de confiance (Innovation #4)

### PRIORITÉ P2 — croissance

- IA
- Recherche naturelle
- Matching photo
- Livraison (+ points relais — Innovation #9)
- QR personnel
- Android
- API
- intégrations partenaires
- Coffre Liguita (Innovation #8)
- Conciergerie documents (Innovation #10)
- Canaux USSD / ligne vocale (Innovation #11)

---

# 58. Vision à long terme

Liguita peut évoluer d'une plateforme d'objets perdus vers une **infrastructure africaine de gestion des objets retrouvés**.

Le même moteur peut être utilisé par :

```text
Aéroports
Gares
Hôtels
Supermarchés
Universités
Écoles
Entreprises
Événements
Transports
Administrations
```

Le cœur technologique reste le même :

**Search → Match → Verify → Connect → Return**

Le lancement doit toutefois rester focalisé sur le Tchad et sur un MVP simple afin de valider l'usage, les paiements, le taux de restitution et l'acquisition des premiers utilisateurs avant d'étendre le périmètre.

---

# 59. Innovations proposées

Ces innovations complètent le plan sans en modifier le socle. Elles sont numérotées pour être référencées dans les priorités (section 57).

| # | Innovation | Idée en une ligne | Gain attendu | Effort | Priorité |
|---|---|---|---|---|---|
| 1 | Grille tarifaire variable | Frais selon la classe et la valeur de l'objet (section 2) | Monétisation équitable et juste | Réalisé | P0 |
| 2 | Recherches sauvegardées + alertes | Prévenir l'utilisateur dès qu'un objet correspondant est publié | Rétention + taux de match | Faible | P0 |
| 3 | Attestation numérique de restitution | Reçu horodaté et signé électroniquement | Confiance, litiges, documents | Faible | P1 |
| 4 | Score de confiance et badges | Réputation des trouveurs et des entreprises | Anti-fraude, qualité de service | Faible | P1 |
| 5 | Bot WhatsApp officiel | Déclarer, chercher, payer et suivre directement sur WhatsApp | Canal n°1 au Tchad | Moyen | P1 |
| 6 | Récompense communautaire + mode solidaire | Bonus libre sans commission ; don de la récompense | Générosité, image de marque | Faible | P1 |
| 7 | Restitution incluse (B2B) | L'établissement offre les frais de mise en relation à ses clients | Différenciateur B2B | Faible | P1 |
| 8 | Coffre Liguita (inventaire préventif) | Pré-enregistrer ses objets précieux (photos, IMEI, numéros de série) | Vérification de propriété instantanée | Moyen | P2 |
| 9 | Points relais de restitution | Retrait sécurisé en boutiques partenaires avec code à usage unique | Logistique + sécurité des rencontres | Moyen | P2 |
| 10 | Conciergerie documents | Aide aux démarches de remplacement (CNI, passeport, permis…) | Revenu additionnel | Moyen | P2 |
| 11 | Canaux hors internet (USSD, SMS, ligne vocale) | Utiliser Liguita sans smartphone ni data | Inclusion maximale | Élevé | P2 |
| 12 | Déclaration vocale multilingue | IA vocale : français, arabe, langues locales | Accessibilité | Élevé | P3 |

### #2 Recherches sauvegardées et alertes automatiques

L'utilisateur enregistre sa recherche (objet + zone + période). Dès qu'un objet trouvé correspondant est publié, il reçoit une alerte (web, WhatsApp, SMS). C'est le pont entre « moteur de recherche » et « réseau de veille » : l'utilisateur revient sans refaire sa recherche.

Implémentation : table `saved_searches` + worker de matching périodique.

### #3 Attestation numérique de restitution

Reçu horodaté, signé électroniquement, résumant : objet, date de perte, date de restitution, parties (identités vérifiées), lieu. Utile pour déclarer la restitution d'un document auprès des administrations et pour la preuve en cas de litige.

### #8 Coffre Liguita

Espace privé et chiffré où l'utilisateur pré-enregistre ses objets précieux (photos, numéros de série, IMEI, factures). En cas de perte : vérification de propriété quasi instantanée et matching renforcé. Base de données et confiance — le puits de données propriétaire de Liguita.

### #11 Canaux hors internet

Le taux de pénétration d'Internet au Tchad reste faible (environ 17 à 22 % de la population selon les sources [Banque mondiale](https://donnees.banquemondiale.org/indicateur/IT.NET.USER.ZS?locations=TD) ; [étude CRASH/USIP](https://www.alwihdainfo.com/Evolution-de-l-acces-au-numerique-au-Tchad-Rapport-d-etude-du-CRASH-en-collaboration-avec-l-USIP_a133673.html)), tandis que le téléphone mobile est largement répandu. Un code USSD opérateur + une ligne vocale permettant de « déclarer / rechercher / recevoir des alertes » rendent Liguita accessible sans smartphone ni forfait data. Nécessite des accords avec Airtel et Moov.

### Intégration

Toutes ces innovations s'appuient sur le même socle : **Search → Match → Verify → Connect → Return**. Aucune ne remet en cause l'architecture (section 30) ni l'ordre de construction (section 57).

---

*Liguita — J'ai trouvé. Tu as perdu. On se retrouve.*
