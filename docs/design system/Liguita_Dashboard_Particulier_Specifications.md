# LIGUITA — Spécifications complètes du Dashboard Particulier

> Version : 1.0  
> Type : Dashboard utilisateur particulier  
> Design : Minimaliste / SaaS / Tchad  
> Statut : Spécification UI/UX de référence

------------------------------------------------------------------------

# 1. Objectif du dashboard

Le dashboard Liguita doit fonctionner pour **deux profils dans un même
compte** :

1.  **Chercheur** — personne qui a perdu un objet.
2.  **Trouveur** — personne qui a trouvé un objet.

Un utilisateur peut être les deux simultanément.

Le dashboard ne doit donc pas être construit uniquement autour de la
recherche d’objets perdus.

L’utilisateur doit pouvoir :

- rechercher un objet perdu ;
- déclarer un objet perdu ;
- déclarer un objet trouvé ;
- suivre ses objets ;
- gérer ses annonces ;
- consulter les correspondances ;
- accéder à son portefeuille ;
- recevoir les récompenses de trouveur ;
- consulter ses transactions ;
- gérer ses notifications ;
- gérer son profil ;
- contacter le support.

------------------------------------------------------------------------

# 2. Principe UX central

Le dashboard doit toujours mettre en avant deux actions :

``` text
RECHERCHER UN OBJET
        +
DÉCLARER UN OBJET TROUVÉ
```

Le portefeuille est un élément permanent du compte.

### Logique

``` text
Utilisateur
    │
    ├── J'ai perdu
    │      └── Recherche
    │             └── Correspondance
    │                    └── Paiement 500 FCFA
    │
    └── J'ai trouvé
           └── Déclaration
                  └── Correspondance
                         └── Restitution
                                └── Récompense
                                       └── Portefeuille
```

------------------------------------------------------------------------

# 3. Canvas de référence

La maquette de référence est conçue sur un canvas large de type desktop.

### Référence visuelle

``` text
1536 × 1024 px
```

Cette dimension correspond à la maquette visuelle.

### Dimension d’implémentation recommandée

Le dashboard doit être responsive.

``` text
Desktop large : ≥ 1440px
Desktop       : 1280–1439px
Tablet        : 768–1279px
Mobile        : < 768px
```

------------------------------------------------------------------------

# 4. Structure globale desktop

Le dashboard est composé de :

``` text
┌─────────────────────────────────────────────────────────────┐
│                         TOPBAR                              │
├───────────────┬───────────────────────────────┬─────────────┤
│               │                               │             │
│   SIDEBAR     │       MAIN CONTENT            │   RIGHT     │
│               │                               │   COLUMN    │
│               │                               │             │
│               │                               │             │
│               │                               │             │
└───────────────┴───────────────────────────────┴─────────────┘
```

### Largeurs recommandées

``` text
Sidebar       : 240–260px
Main          : flexible
Right column  : 320–360px
Gap principal : 16–24px
```

Pour un viewport de 1536px :

``` text
Sidebar       ≈ 260px
Zone centrale ≈ 870px
Colonne droite ≈ 330px
Gaps          ≈ 24px
```

------------------------------------------------------------------------

# 5. Grille principale

``` css
.dashboard {
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr) 340px;
  gap: 24px;
}
```

À partir de 1440px :

``` text
248px + 24px + contenu central + 24px + 340px
```

Sur les écrans plus petits, la colonne droite doit passer sous le
contenu central.

------------------------------------------------------------------------

# 6. Topbar

## Dimensions

``` text
Height : 74px
Width  : 100%
```

### Structure

``` text
┌─────────────────────────────────────────────────────────────┐
│ Logo │ Search                             │ Bell │ Profile │
└─────────────────────────────────────────────────────────────┘
```

### Padding

``` text
Horizontal : 24–32px
```

### Border

``` text
1px solid #E5E7EB
```

### Background

``` text
#FFFFFF
```

------------------------------------------------------------------------

# 7. Logo

Logo Liguita rouge.

### Zone

``` text
Width : 200–220px
```

### Logo recommandé

``` text
Width  : 150–165px
Height : auto
```

Le logo ne doit pas être étiré.

------------------------------------------------------------------------

# 8. Barre de recherche globale

La recherche est disponible depuis le dashboard.

### Dimensions desktop

``` text
Width  : 480–610px
Height : 42–44px
Radius : 999px
```

### Placeholder

``` text
Rechercher un objet, une ville, un mot-clé...
```

### Style

``` text
Background : #FFFFFF
Border     : #E5E7EB
Text       : #64748B
Icon       : Search
```

### Icône

``` text
20 × 20px
```

### Focus

``` text
Border : #FF3330
Shadow : 0 0 0 3px rgba(255,51,48,.10)
```

------------------------------------------------------------------------

# 9. Notifications topbar

### Dimensions

``` text
Button : 42 × 42px
Icon   : 20–22px
Radius : 999px
```

### Badge

``` text
Width  : 18px
Height : 18px
Radius : 999px
Font   : 10–11px
```

Couleur :

``` text
#FF3330
```

Exemple :

``` text
🔔 3
```

------------------------------------------------------------------------

# 10. Profil utilisateur

Zone :

``` text
Avatar + Nom + statut + Chevron
```

### Avatar

``` text
40 × 40px
Radius : 999px
```

### Nom

``` text
Moussa Diallo
```

### Informations secondaires

``` text
+235 66 12 34 56
```

ou :

``` text
Utilisateur
```

### Menu

Chevron :

``` text
16 × 16px
```

------------------------------------------------------------------------

# 11. Sidebar

## Largeur

``` text
248px
```

## Padding

``` text
16px
```

## Navigation

Les éléments font environ :

``` text
Height : 44–48px
Radius : 12px
Padding : 0 14px
Gap : 12px
```

------------------------------------------------------------------------

# 12. Navigation sidebar

Ordre recommandé :

``` text
⌂ Tableau de bord

⌕ Rechercher un objet

▣ Mes objets

📣 Mes annonces

▣ Mon portefeuille

◷ Mes transactions

♧ Notifications

♙ Mon profil

──────────────

? Aide & support
```

### Navigation active

``` text
Background : #FFF0F0
Text       : #FF3330
Icon       : #FF3330
Radius     : 12px
```

### Navigation inactive

``` text
Text : #52657A
Icon : #52657A
```

------------------------------------------------------------------------

# 13. Sidebar — illustration

La partie basse de la sidebar peut contenir une illustration Liguita.

### Zone

``` text
Width : 208px
Height : 240–270px
```

### Direction artistique

- baobab ;
- pin de localisation ;
- silhouette urbaine tchadienne ;
- fond très léger ;
- rouge Liguita très discret.

### Texte

``` text
Ensemble, retrouvons
ce qui compte.
```

------------------------------------------------------------------------

# 14. Main content

Le contenu central doit rester la zone principale.

### Padding

``` text
Top    : 32px
Left   : 0
Right  : 0
Bottom : 40px
```

### Gap vertical

``` text
16–24px
```

------------------------------------------------------------------------

# 15. Hero Dashboard

## Dimensions

``` text
Height : 240–260px
Radius : 16–20px
```

### Background

Utiliser un fond très clair :

``` text
#FFF7F6
```

avec illustration sur la droite.

------------------------------------------------------------------------

# 16. Hero Dashboard — contenu

### H1

``` text
Bonjour Moussa 👋
```

### Taille

``` text
32–36px
```

### Poids

``` text
700–800
```

### Description

``` text
Vous pouvez à la fois rechercher un objet
et signaler un objet trouvé.
Chaque action compte !
```

Taille :

``` text
15–17px
```

------------------------------------------------------------------------

# 17. Hero — CTA

Deux boutons principaux.

## CTA 1

``` text
Rechercher un objet →
```

### Style

``` text
Background : #FF3330
Text       : #FFFFFF
Height     : 48px
Padding    : 0 22px
Radius     : 999px
```

## CTA 2

``` text
+ Déclarer un objet trouvé →
```

### Style

``` text
Background : #16B879
Text       : #FFFFFF
Height     : 48px
Radius     : 999px
```

Le vert sert ici à différencier clairement l’action « trouver ».

------------------------------------------------------------------------

# 18. Hero — illustration

La partie droite du Hero doit représenter :

- utilisateur avec smartphone ;
- pin de localisation ;
- baobab ou environnement africain ;
- formes organiques très légères.

### Zone

``` text
Width : 40–45%
```

L’image ne doit jamais recouvrir les CTA.

------------------------------------------------------------------------

# 19. Bloc portefeuille

Le portefeuille doit être visible directement dans le dashboard.

## Carte principale

``` text
Width : 100%
Height : 250–270px
Radius : 16–20px
```

### Contenu

``` text
Mon portefeuille

2 350 FCFA

Voir mes transactions →
```

### Icône

Wallet.

``` text
44 × 44px
```

------------------------------------------------------------------------

# 20. Solde portefeuille

### Montant

``` text
2 350 FCFA
```

Taille :

``` text
28–32px
```

Poids :

``` text
700–800
```

### Couleur

``` text
#102A43
```

------------------------------------------------------------------------

# 21. Sous-cartes portefeuille

Deux mini cartes :

``` text
┌──────────────────┐
│ 100 FCFA         │
│ En attente       │
│ restitution      │
└──────────────────┘

┌──────────────────┐
│ 1 250 FCFA       │
│ Disponible       │
└──────────────────┘
```

### Dimensions

``` text
Height : 105–120px
Radius : 14px
```

------------------------------------------------------------------------

# 22. Logique financière

Il faut distinguer :

### Solde disponible

Argent pouvant être utilisé ou retiré.

### Solde en attente

Récompenses bloquées jusqu’à confirmation de la restitution.

### Exemple

``` text
Disponible       1 250 FCFA
En attente         100 FCFA
```

Ne pas mélanger ces deux montants.

------------------------------------------------------------------------

# 23. Règle de récompense

Lorsqu’un utilisateur trouve un objet et que celui-ci est restitué :

``` text
Récompense trouveur
        ↓
+100 FCFA
        ↓
Portefeuille
```

Le montant doit apparaître dans les transactions.

------------------------------------------------------------------------

# 24. Section statistiques

Carte :

``` text
Mes statistiques
```

Afficher :

``` text
3    Objets trouvés
5    Objets perdus
2    Mises en relation
4,8  Ma note
```

### Chaque ligne

``` text
Height : 52–58px
```

avec :

``` text
Icon + valeur + label + Voir →
```

------------------------------------------------------------------------

# 25. Couleurs statistiques

### Objets trouvés

``` text
Green
#16B879
```

### Objets perdus

``` text
Red
#FF3330
```

### Mises en relation

``` text
Blue
#3B82F6
```

### Note

``` text
Orange
#F59E0B
```

------------------------------------------------------------------------

# 26. Section « Mes dernières activités »

### Header

``` text
Mes dernières activités          Voir tout →
```

### H2

``` text
20–22px
```

### Liste

Chaque ligne est une carte.

------------------------------------------------------------------------

# 27. Carte activité

Dimensions :

``` text
Height : 110–125px
Radius : 14–16px
Padding : 16px
```

Structure :

``` text
[Image]
[Badge]
[Titre]
[Localisation]
[Date]
                     [Statut]
                     [→]
```

------------------------------------------------------------------------

# 28. Exemple objet trouvé

``` text
Portefeuille noir

📍 N'Djamena — Moursal
📅 21 sept. 2025

Objet trouvé
En attente de confirmation
```

------------------------------------------------------------------------

# 29. Exemple objet perdu

``` text
iPhone 13

📍 N'Djamena — Farcha
📅 18 sept. 2025

Objet perdu
Recherche en cours
```

------------------------------------------------------------------------

# 30. Exemple correspondance

``` text
Carte nationale

📍 N'Djamena — Centre-ville
📅 15 sept. 2025

Objet trouvé
Correspondance possible
```

------------------------------------------------------------------------

# 31. Statuts

Les statuts doivent être visuellement différenciés.

### Recherche active

``` text
Background : #FFF0F0
Text       : #FF3330
```

### Correspondance

``` text
Background : #EAF8F1
Text       : #16A36A
```

### Vérification

``` text
Background : #EFF6FF
Text       : #3B82F6
```

### Restitué

``` text
Background : #EAF8F1
Text       : #16A36A
```

------------------------------------------------------------------------

# 32. Colonne « Transactions récentes »

## Dimensions

``` text
Width : 320–340px
```

### Header

``` text
Transactions récentes      Voir tout →
```

------------------------------------------------------------------------

# 33. Transaction positive

``` text
🎁 Récompense trouveur

21 sept. 2025 · Objet : Portefeuille

                         +100 FCFA
```

### Couleur

``` text
#16A36A
```

------------------------------------------------------------------------

# 34. Transaction négative

``` text
↗ Frais de mise en relation

21 sept. 2025 · Objet : Portefeuille

                         -500 FCFA
```

### Couleur

``` text
#FF3330
```

------------------------------------------------------------------------

# 35. Recharge portefeuille

Exemple :

``` text
Recharge portefeuille

10 sept. 2025 · Mobile Money

                         +2 000 FCFA
```

------------------------------------------------------------------------

# 36. Moyens de paiement

Le système doit pouvoir supporter les moyens de paiement utilisés au
Tchad.

Prévoir une architecture permettant notamment :

``` text
Mobile Money
Orange Money
Moov Money
Airtel Money
```

Les moyens réellement disponibles doivent être configurables côté
administration.

------------------------------------------------------------------------

# 37. Notifications

Carte :

``` text
Notifications
Voir tout →
```

### Largeur

``` text
320–360px
```

### Chaque notification

``` text
Icon
Titre
Description
Temps
Chevron
```

------------------------------------------------------------------------

# 38. Notification — correspondance

``` text
Votre objet a été retrouvé !

Un portefeuille trouvé correspond
à votre recherche.

Il y a 2h
```

------------------------------------------------------------------------

# 39. Notification — mise en relation

``` text
Mise en relation activée

Vous pouvez maintenant échanger
avec le trouveur.

Il y a 5h
```

------------------------------------------------------------------------

# 40. Notification — paiement

``` text
Votre paiement a été confirmé

500 FCFA pour la mise en relation.

Il y a 1j
```

------------------------------------------------------------------------

# 41. Notification — nouvelle correspondance

``` text
Nouvelle correspondance

Un objet pourrait correspondre
à votre recherche.

Il y a 2j
```

------------------------------------------------------------------------

# 42. Section « Comment ça marche ? »

Cette section peut rester visible dans la colonne droite.

### Étapes

``` text
1 Déclarez
2 Liguita cherche
3 Vérifiez
4 Payez
5 Récupérez
```

------------------------------------------------------------------------

# 43. Timeline

### Desktop

``` text
●
│
●
│
●
│
●
│
●
```

### Cercle

``` text
32 × 32px
```

### Ligne

``` text
2px
```

Couleur :

``` text
#E5E7EB
```

------------------------------------------------------------------------

# 44. Texte des étapes

### Déclarez

> Votre objet perdu ou trouvé.

### Liguita cherche

> Notre système trouve les correspondances.

### Vérifiez

> Répondez à quelques questions.

### Payez

> 500 FCFA pour accéder à la mise en relation.

### Récupérez

> Contactez le trouveur et récupérez votre objet.

------------------------------------------------------------------------

# 45. Banner « Étiquettes Liguita »

Carte promotionnelle facultative :

``` text
Étiquettes Liguita

Protégez vos objets avec nos
QR codes anti-perte.

[ Commander → ]
```

### Background

``` text
#EFF9F2
```

### Radius

``` text
16px
```

------------------------------------------------------------------------

# 46. QR Code / étiquette

Le produit peut permettre :

``` text
Objet
 ↓
QR Liguita
 ↓
Scan
 ↓
Déclaration
 ↓
Propriétaire contacté
```

Le QR code ne doit jamais révéler directement les informations
personnelles du propriétaire.

------------------------------------------------------------------------

# 47. Banner trouveur

Le dashboard doit rappeler régulièrement au trouveur qu’il peut être
récompensé.

Message :

``` text
Vous êtes trouveur ?

Recevez votre récompense facilement
et en toute sécurité.
```

CTA :

``` text
Mon portefeuille →
```

------------------------------------------------------------------------

# 48. Raccourcis

En bas de la zone centrale :

``` text
Mon portefeuille
Mes annonces
Mes paiements
Mes récompenses
```

### Icônes

``` text
Wallet
Megaphone
CreditCard
Gift
```

------------------------------------------------------------------------

# 49. Support

Carte :

``` text
Besoin d'aide ?

Notre équipe est là pour vous accompagner.

[ Contacter le support → ]
```

### Background

``` text
#FFF4F3
```

------------------------------------------------------------------------

# 50. Système de spacing

Utiliser une échelle cohérente :

``` text
4px
8px
12px
16px
20px
24px
32px
40px
48px
64px
```

### Règles

``` text
Card padding : 20–24px
Card gap     : 16px
Section gap  : 24px
Grid gap     : 16–24px
```

------------------------------------------------------------------------

# 51. Border radius

``` text
Button pill      : 999px
Input            : 999px
Navigation       : 12px
Small card       : 12–14px
Standard card    : 16px
Large hero       : 20px
Modal            : 20px
Avatar           : 999px
```

------------------------------------------------------------------------

# 52. Ombres

Le design doit rester très léger.

### Card

``` css
box-shadow: 0 2px 12px rgba(15, 23, 42, 0.04);
```

### Hover

``` css
box-shadow: 0 8px 24px rgba(15, 23, 42, 0.07);
```

Éviter les grosses ombres.

------------------------------------------------------------------------

# 53. Bordures

``` text
Default : #E5E7EB
Hover   : #D1D5DB
Active  : #FF3330
```

Épaisseur :

``` text
1px
```

------------------------------------------------------------------------

# 54. Icônes

Utiliser :

``` text
Lucide Icons
```

Style :

``` text
Outline
Stroke : 1.8–2px
```

Tailles :

``` text
Navigation : 20px
Card       : 20–24px
Hero       : 24px
Button     : 18–20px
```

------------------------------------------------------------------------

# 55. Boutons

## Primary

``` text
Background : #FF3330
Text : #FFFFFF
```

## Secondary

``` text
Background : #FFFFFF
Border : #E5E7EB
Text : #102A43
```

## Success

``` text
Background : #16B879
Text : #FFFFFF
```

## Ghost

``` text
Background : transparent
Text : #FF3330
```

------------------------------------------------------------------------

# 56. États interactifs

Chaque composant doit avoir :

``` text
Default
Hover
Focus
Active
Disabled
Loading
Success
Error
```

### Exemple bouton

``` text
Default  → #FF3330
Hover    → #E52522
Active   → #C91F1D
Disabled → #FCA5A5
```

------------------------------------------------------------------------

# 57. Responsive — tablette

À partir de :

``` text
< 1200px
```

La colonne droite peut devenir une deuxième ligne.

``` text
Sidebar | Main
        |
        └── Right content
```

------------------------------------------------------------------------

# 58. Responsive — petit écran

À partir de :

``` text
< 900px
```

Masquer la sidebar permanente.

Utiliser :

``` text
Hamburger
+
Drawer
```

------------------------------------------------------------------------

# 59. Responsive — mobile

À partir de :

``` text
< 768px
```

Structure :

``` text
Topbar
↓
Hero
↓
Wallet
↓
Stats
↓
Activities
↓
Transactions
↓
Notifications
↓
Support
```

------------------------------------------------------------------------

# 60. Navigation mobile

Bottom navigation recommandée :

``` text
Accueil
Rechercher
Objets
Portefeuille
Profil
```

### Hauteur

``` text
64–72px
```

Position :

``` text
fixed bottom: 0
```

------------------------------------------------------------------------

# 61. Mobile wallet

Sur mobile, le portefeuille doit apparaître très haut.

``` text
Mon portefeuille

2 350 FCFA

[ Voir mes transactions ]
```

Puis :

``` text
Disponible
1 250 FCFA

En attente
100 FCFA
```

------------------------------------------------------------------------

# 62. Mobile Hero

Le Hero doit être simplifié.

``` text
Bonjour Moussa 👋

Vous pouvez rechercher un objet
ou déclarer un objet trouvé.

[ Rechercher un objet ]

[ + Déclarer un objet trouvé ]
```

L’image peut être réduite ou supprimée sur les très petits écrans.

------------------------------------------------------------------------

# 63. Architecture fonctionnelle

``` text
/dashboard
│
├── /search
│
├── /lost
│
├── /found
│
├── /objects
│   ├── /lost
│   ├── /found
│   └── /:id
│
├── /announcements
│
├── /wallet
│
├── /transactions
│
├── /notifications
│
├── /profile
│
└── /support
```

------------------------------------------------------------------------

# 64. Modèle utilisateur

Un seul compte doit pouvoir avoir :

``` text
role:
  seeker: true
  finder: true
```

Mais il n’est pas nécessaire de créer deux comptes.

### Exemple

``` json
{
  "user": "Moussa Diallo",
  "roles": {
    "seeker": true,
    "finder": true
  }
}
```

------------------------------------------------------------------------

# 65. Modèle portefeuille

``` json
{
  "balance": 1250,
  "pending_balance": 100,
  "currency": "XAF"
}
```

------------------------------------------------------------------------

# 66. Modèle transaction

``` json
{
  "type": "reward",
  "amount": 100,
  "currency": "XAF",
  "status": "completed",
  "object_id": "OBJ-001",
  "created_at": "..."
}
```

Types :

``` text
reward
connection_fee
wallet_topup
withdrawal
refund
adjustment
```

------------------------------------------------------------------------

# 67. Statuts objets

### Objet perdu

``` text
draft
published
searching
possible_match
match_confirmed
contact_unlocked
recovered
closed
```

### Objet trouvé

``` text
draft
published
verification
owner_found
contact_unlocked
returned
reward_pending
reward_available
closed
```

------------------------------------------------------------------------

# 68. Sécurité du portefeuille

Le dashboard ne doit jamais afficher :

- numéro complet d’un moyen de paiement ;
- informations bancaires sensibles ;
- token ;
- secret ;
- données de paiement internes.

Afficher uniquement des informations masquées.

Exemple :

``` text
Orange Money
+235 ** ** 45 67
```

------------------------------------------------------------------------

# 69. Protection du trouveur

Le trouveur ne doit pas être obligé d’exposer son numéro de téléphone
publiquement.

Le système doit utiliser :

``` text
Liguita
   ↓
Mise en relation
   ↓
Messagerie / contact sécurisé
```

Le contact réel peut être partagé uniquement lorsque les conditions de
mise en relation sont remplies.

------------------------------------------------------------------------

# 70. Logique des 500 FCFA

Lorsqu’une personne recherche un objet correspondant :

``` text
Correspondance
     ↓
Vérification
     ↓
500 FCFA
     ↓
Mise en relation
```

Le dashboard doit afficher clairement :

``` text
Frais de mise en relation
500 FCFA
```

------------------------------------------------------------------------

# 71. Logique des 100 FCFA

Lorsqu’un trouveur restitue un objet et que la récompense est validée :

``` text
Récompense
100 FCFA
     ↓
Solde en attente
     ↓
Validation
     ↓
Solde disponible
```

La transaction doit apparaître avec :

``` text
+100 FCFA
Récompense trouveur
```

------------------------------------------------------------------------

# 72. Important — séparation comptable

Les montants suivants doivent rester séparés :

``` text
Paiement du chercheur
500 FCFA
```

et :

``` text
Récompense du trouveur
100 FCFA
```

Le dashboard ne doit pas donner l’impression que les 500 FCFA sont
entièrement reversés au trouveur.

------------------------------------------------------------------------

# 73. Accessibilité

Respecter :

- WCAG AA ;
- contraste suffisant ;
- navigation clavier ;
- focus visible ;
- labels explicites ;
- `aria-label` pour les icônes seules ;
- boutons minimum 44 × 44px ;
- texte alternatif des images.

------------------------------------------------------------------------

# 74. Performance

Objectifs :

``` text
LCP < 2.5s
CLS < 0.1
INP < 200ms
```

Recommandations :

- `next/image`
- WebP / AVIF
- lazy loading ;
- SVG ;
- pas de vidéo lourde ;
- composants chargés à la demande ;
- skeleton loading pour les données.

------------------------------------------------------------------------

# 75. Stack recommandée

``` text
Next.js
TypeScript
Tailwind CSS
shadcn/ui
Lucide React
Supabase
```

------------------------------------------------------------------------

# 76. Design tokens CSS

``` css
:root {
  --liguita-primary: #FF3330;
  --liguita-primary-hover: #E52522;
  --liguita-primary-light: #FFF0F0;

  --liguita-text: #111827;
  --liguita-text-secondary: #6B7280;
  --liguita-text-muted: #9CA3AF;

  --liguita-background: #F9FAFB;
  --liguita-surface: #FFFFFF;
  --liguita-border: #E5E7EB;

  --liguita-success: #16B879;
  --liguita-success-light: #EAF8F1;

  --liguita-warning: #F59E0B;
  --liguita-error: #EF4444;

  --radius-sm: 12px;
  --radius-md: 16px;
  --radius-lg: 20px;
  --radius-pill: 999px;
}
```

------------------------------------------------------------------------

# 77. Résumé de la hiérarchie

``` text
TOPBAR
│
├── Recherche globale
├── Notifications
└── Profil

SIDEBAR
│
├── Tableau de bord
├── Rechercher
├── Mes objets
├── Mes annonces
├── Portefeuille
├── Transactions
├── Notifications
├── Profil
└── Support

MAIN
│
├── Hero
│   ├── Rechercher
│   └── Déclarer trouvé
│
├── Activités
│
├── Transactions
│
└── Raccourcis

RIGHT
│
├── Portefeuille
├── Statistiques
├── Notifications
├── Comment ça marche
├── Étiquettes
└── Support
```

------------------------------------------------------------------------

# 78. Principe final

Le dashboard Liguita ne doit pas être pensé comme :

> « le dashboard de quelqu’un qui a perdu quelque chose ».

Il doit être pensé comme :

> **« le compte Liguita d’une personne qui peut chercher, trouver,
> restituer et être récompensée. »**

Le portefeuille devient donc un élément de premier niveau au même titre
que :

``` text
Recherche
Objets
Annonces
Notifications
```

Cela permet de créer un produit réellement **bidirectionnel** :

``` text
                    LIGUITA
                       │
          ┌────────────┴────────────┐
          │                         │
       CHERCHEUR                 TROUVEUR
          │                         │
    Perd un objet             Trouve un objet
          │                         │
      Recherche              Publie l'objet
          │                         │
    Correspondance            Propriétaire trouvé
          │                         │
      500 FCFA                 Restitution
          │                         │
   Mise en relation            +100 FCFA
          │                         │
          └───────────┬─────────────┘
                      │
                 PORTEFEUILLE
```

**Le même compte peut donc passer d’un rôle à l’autre sans changer
d’espace.**
