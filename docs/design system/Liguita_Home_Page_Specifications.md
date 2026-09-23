# LIGUITA — Spécifications UI/UX de la Home Page

> **J’ai trouvé. Tu as perdu. On se retrouve.**

## 1. Objectif

Créer une landing page moderne, minimaliste et rassurante pour Liguita,
plateforme tchadienne des objets perdus et retrouvés.

La Home doit permettre de comprendre immédiatement les deux actions
principales :

- **J’ai perdu un objet**
- **J’ai trouvé un objet**

Le moteur de recherche est le cœur de l’expérience.

## 2. Direction artistique

- Minimaliste
- Moderne
- SaaS premium
- Chaleureux
- Mobile-first
- Très lisible
- Beaucoup d’espace blanc
- Formes arrondies
- Peu d’ombres
- Rouge Liguita comme couleur d’accent
- Références visuelles discrètes au Tchad

**Impression recherchée :** simple, rapide, fiable et humain.

## 3. Couleurs

| Token          | HEX       | Utilisation                      |
|----------------|-----------|----------------------------------|
| Primary        | `#FF3330` | CTA, marque, actions principales |
| Primary Hover  | `#E52522` | Hover / pressed                  |
| Primary Light  | `#FFF0F0` | Fonds sélectionnés               |
| Text           | `#111827` | Titres et textes principaux      |
| Secondary Text | `#6B7280` | Textes secondaires               |
| Muted          | `#9CA3AF` | Informations secondaires         |
| Background     | `#F9FAFB` | Fond général                     |
| Surface        | `#FFFFFF` | Cartes et surfaces               |
| Border         | `#E5E7EB` | Bordures                         |
| Success        | `#16A36A` | Réussite / restitution           |
| Success Light  | `#EAF8F1` | Fond succès                      |
| Warning        | `#F59E0B` | En attente                       |
| Error          | `#EF4444` | Erreur                           |

Le rouge est réservé principalement au logo, CTA principaux, éléments
actifs et accents.

## 4. Typographie

**Police :** Plus Jakarta Sans  
**Fallback :** Inter, sans-serif

### Desktop

| Élément    |  Taille |   Poids |
|------------|--------:|--------:|
| Hero H1    | 58–68px | 700–800 |
| Section H2 | 32–40px |     700 |
| H3         | 20–24px | 600–700 |
| Body       | 16–18px |     400 |
| Small      |    14px | 400–500 |
| Caption    |    12px |     500 |

### Mobile

- H1 : 40–44px
- H2 : 28–32px
- Body : 15–16px

## 5. Layout

### Desktop

``` text
Max-width : 1200–1280px
Padding horizontal : 32–48px
```

### Mobile

``` text
Padding : 16px
```

Espacement vertical des sections :

``` text
Desktop : 80–120px
Mobile  : 56–80px
```

## 6. Header

### Desktop

``` text
Logo
Accueil
Rechercher
À propos
Entreprises
Aide
Connexion
```

Hauteur : `72–80px`

Navigation : 14px, poids 500, couleur `#374151`.

CTA connexion :

``` text
Background : #FF3330
Text       : #FFFFFF
Radius     : 999px
Height     : 44px
```

### Mobile

``` text
Logo                              ☰
```

## 7. Hero

Le Hero est la partie la plus importante.

### Structure desktop

``` text
┌─────────────────────────────────────────────────────┐
│                                                     │
│  TEXTE + RECHERCHE             VISUEL             │
│                                                     │
│  Eyebrow                         Personne          │
│  H1                              avec smartphone   │
│  Description                    + localisation     │
│  Search bar                                         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

Le texte occupe environ 50–55 % et le visuel 45–50 %.

### Eyebrow

``` text
PLATEFORME TCHADIENNE DES OBJETS PERDUS ET RETROUVÉS
```

12–13px, uppercase, letter-spacing 0.08em.

### H1

``` text
J'ai trouvé.
Tu as perdu.
On se retrouve.
```

Les deux premières lignes sont en `#111827`.  
La dernière ligne est en `#FF3330`.

### Description

> Liguita vous aide à retrouver vos objets perdus ou à déclarer ceux que
> vous avez trouvés. Simple, rapide et sécurisé.

Largeur : `480–520px`.

## 8. Recherche principale

``` text
┌─────────────────────────────────────────────────────┐
│ 🔍  Rechercher un objet...                       → │
└─────────────────────────────────────────────────────┘
```

``` text
Height : 56px
Radius : 999px
Background : #FFFFFF
Border : #E5E7EB
```

Shadow :

``` css
0 4px 20px rgba(17,24,39,0.06)
```

Bouton de recherche :

``` text
44 × 44px
Background : #FF3330
Radius : 999px
Icon : ArrowRight
```

## 9. Suggestions de recherche

``` text
Exemples :
[ Carte nationale ]
[ Téléphone ]
[ Portefeuille ]
[ Clés ]
```

Petites pills blanches avec bordure légère.

## 10. Recherche naturelle

Exemple :

> J’ai perdu mon téléphone Samsung noir à l’aéroport hier.

Afficher éventuellement :

``` text
📱 Téléphone
Samsung
Noir
📍 Aéroport
📅 Hier
```

Puis :

``` text
[ Rechercher ]
```

## 11. Visuel Hero

Le visuel doit montrer une personne africaine / tchadienne utilisant son
smartphone.

Direction :

- personne naturelle ;
- smartphone visible ;
- environnement africain réaliste ;
- éléments de localisation ;
- références tchadiennes discrètes ;
- fond clair ;
- beaucoup d’espace négatif.

Éviter les rendus cinématiques, clichés touristiques et compositions
surchargées.

## 12. Badge Hero

``` text
Un objet perdu
peut toujours
être retrouvé.
```

Style :

``` text
Background : #FFFFFF
Radius : 14px
Shadow : légère
Padding : 14–16px
```

## 13. Deux actions principales

``` text
┌──────────────────────────────┐
│ 🔴                           │
│ J'ai perdu un objet          │
│ Déclarez votre objet perdu   │
│ et recevez des notifications │
│                         →    │
└──────────────────────────────┘

┌──────────────────────────────┐
│ 🟢                           │
│ J'ai trouvé un objet         │
│ Publiez l'objet que vous     │
│ avez trouvé              →   │
└──────────────────────────────┘
```

Carte perte : `#FFF4F3`  
Carte trouvé : `#F1FBF6`  
Radius : `20px`

## 14. Comment ça marche

Titre :

``` text
Comment ça marche ?
```

Sous-titre :

> En quelques étapes, votre objet retrouve son propriétaire.

Étapes :

``` text
01 Déclarez
02 Liguita cherche
03 Vérifiez
04 Payez
05 Récupérez
```

### 01 — Déclarez

> Décrivez ce que vous avez perdu ou trouvé.

### 02 — Liguita cherche

> Notre système trouve les correspondances entre les objets perdus et
> retrouvés.

### 03 — Vérifiez

> Répondez à quelques questions pour confirmer que l’objet vous
> appartient.

### 04 — Payez

> Frais de mise en relation de 500 FCFA.

### 05 — Récupérez

> Vous êtes mis en relation et organisez la restitution de l’objet.

Desktop : connecteurs horizontaux.  
Mobile : timeline verticale.

## 15. Section Entreprises

Eyebrow :

``` text
POUR LES ENTREPRISES
```

H2 :

``` text
Votre entreprise gère
des objets trouvés ?
```

Description :

> Aéroports, gares, hôtels, supermarchés, universités et autres
> établissements peuvent centraliser, suivre et retrouver plus
> rapidement les propriétaires avec Liguita Business.

CTA :

``` text
Découvrir Liguita Business →
```

### Visuel

Afficher un agent d’entreprise avec tablette / ordinateur et une mini
interface :

``` text
Aéroport International N'Djamena

Objets trouvés       17
En attente             9
Restitués               6
```

Les chiffres sont fictifs dans la maquette.

## 16. Entreprises ciblées

``` text
Aéroports
Gares
Hôtels
Supermarchés
Universités
Centres commerciaux
```

Utiliser Lucide Icons dans l’interface finale.

## 17. Section statistiques

H2 :

``` text
Ensemble, réduisons les pertes
```

Sous-titre :

> Des objets perdus peuvent retrouver leur propriétaire grâce à une
> communauté et à des entreprises mieux organisées.

Cartes de démonstration :

``` text
12 450+
Objets retrouvés
```

``` text
8 320+
Utilisateurs
```

``` text
120+
Entreprises partenaires
```

``` text
98%
Taux de restitution
```

**Important :** ces chiffres sont uniquement des exemples de maquette et
ne doivent pas être présentés comme des données réelles en production.

## 18. Identité tchadienne

Ajouter une section visuelle légère avec :

- baobab ;
- architecture sahélienne ;
- éléments urbains de N’Djamena ;
- carte stylisée du Tchad ;
- pin de localisation.

Message possible :

``` text
Pensé pour le Tchad.
Conçu pour rapprocher les personnes.
```

Ne pas surcharger avec des motifs culturels.

## 19. Footer

### Colonne marque

``` text
Logo Liguita
J'ai trouvé. Tu as perdu. On se retrouve.
```

### Particuliers

``` text
Rechercher
Déclarer une perte
Déclarer un objet trouvé
Comment ça marche
```

### Entreprises

``` text
Liguita Business
Tarifs
Fonctionnalités
Contact
```

### Aide & légal

``` text
Centre d'aide
Conditions d'utilisation
Politique de confidentialité
Cookies
```

### Bas

``` text
© 2026 Liguita. Tous droits réservés.
```

## 20. Responsive mobile

Ordre :

``` text
Header
↓
Hero
↓
Recherche
↓
J'ai perdu / J'ai trouvé
↓
Comment ça marche
↓
Business
↓
Statistiques
↓
Identité tchadienne
↓
Footer
```

Le visuel Hero passe sous le contenu textuel.

## 21. Micro-interactions

Animations rapides et discrètes.

``` text
Boutons : 150–200ms
Cards hover : translateY(-2px)
Search focus : bordure rouge + ombre légère
```

Éviter les animations longues.

## 22. Architecture des composants

``` text
HomePage
│
├── Header
│
├── HeroSection
│   ├── HeroCopy
│   ├── SearchBar
│   ├── SearchSuggestions
│   └── HeroVisual
│
├── LostFoundActions
│   ├── LostObjectCard
│   └── FoundObjectCard
│
├── HowItWorks
│   └── StepCard × 5
│
├── BusinessSection
│   ├── BusinessCopy
│   ├── BusinessVisual
│   └── BusinessFeatures
│
├── StatsSection
│   ├── StatCard × 4
│   └── ChadVisual
│
├── ChadIdentitySection
│
└── Footer
```

## 23. Composants réutilisables

``` text
Button
Input
SearchBar
Badge
Card
StatCard
StepCard
ObjectCard
BusinessCard
IconButton
Modal
Toast
Skeleton
```

## 24. Stack recommandée

``` text
Next.js
TypeScript
Tailwind CSS
shadcn/ui
Lucide Icons
Supabase
```

La Home doit rester légère et rapide.

## 25. Performance

- Images WebP / AVIF
- Lazy loading sous le Hero
- SVG pour les icônes
- Pas de vidéo lourde en arrière-plan
- Animations limitées
- `next/image`
- Hero chargé en priorité

## 26. SEO

### Title

``` text
Liguita — Retrouvez vos objets perdus au Tchad
```

### Meta description

``` text
Liguita vous aide à retrouver vos objets perdus ou à déclarer ceux que vous avez trouvés au Tchad.
```

### H1

``` text
J'ai trouvé. Tu as perdu. On se retrouve.
```

### H2

``` text
Comment ça marche ?
Votre entreprise gère des objets trouvés ?
Ensemble, réduisons les pertes
```

## 27. Accessibilité

Respecter :

- contraste WCAG AA ;
- navigation clavier ;
- focus visible ;
- `aria-label` sur les icônes seules ;
- boutons minimum 44×44px ;
- labels explicites ;
- textes alternatifs ;
- ne pas utiliser uniquement la couleur pour indiquer un statut.

## 28. Les 3 questions auxquelles la Home doit répondre

### Qu’est-ce que Liguita ?

> Une plateforme pour retrouver les objets perdus et gérer les objets
> trouvés.

### Que puis-je faire ?

> Rechercher un objet perdu ou déclarer un objet trouvé.

### Pourquoi utiliser Liguita ?

> Recherche automatisée, vérification, paiement sécurisé et mise en
> relation protégée.

## 29. CTA prioritaires

``` text
Rechercher un objet
J'ai perdu un objet
J'ai trouvé un objet
Découvrir Liguita Business
```

Ne pas multiplier les CTA concurrents dans le Hero.

## 30. Flux principal

``` text
HOME
  ↓
Recherche
  ↓
Correspondances
  ↓
Vérification
  ↓
Paiement 500 FCFA
  ↓
Mise en relation
  ↓
Restitution
```

## 31. Confidentialité

La Home ne doit jamais afficher de données personnelles réelles.

Les exemples de cartes, noms, lieux et objets doivent utiliser des
données fictives.

Le contact direct du trouveur ne doit pas être exposé avant la mise en
relation autorisée.

## 32. Règles visuelles à ne pas violer

### À faire

- beaucoup d’espace blanc ;
- boutons arrondis ;
- hiérarchie claire ;
- textes courts ;
- rouge comme accent ;
- cartes simples ;
- icônes outline ;
- mobile-first ;
- feedback immédiat.

### À éviter

- gradients agressifs ;
- glassmorphism excessif ;
- grosses ombres ;
- trop de couleurs ;
- cartes surchargées ;
- animations longues ;
- texte minuscule ;
- rouge partout ;
- photos génériques sans contexte africain.

## 33. Résultat attendu

La Home doit donner l’impression d’un :

> **SaaS africain moderne, simple et fiable, construit pour les réalités
> du Tchad.**

Elle doit combiner :

``` text
Minimalisme
+
Confiance
+
Technologie
+
Identité tchadienne
+
Simplicité
```

### Signature

**Liguita = Localisation + confiance + simplicité + restitution.**
