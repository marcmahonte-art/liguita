# Liguita

**J'ai trouvé. Tu as perdu. On se retrouve.**

Plateforme tchadienne des objets perdus et retrouvés — particuliers et entreprises.
Un moteur de recherche pour retrouver les objets perdus, pas un site de petites annonces.

---

## Sommaire

- [En une phrase](#en-une-phrase)
- [Documentation](#documentation)
- [Architecture](#architecture)
- [Prérequis](#prérequis)
- [Démarrage](#démarrage)
- [Scripts](#scripts)
- [Conventions](#conventions)
- [État d'avancement](#état-davancement)

---

## En une phrase

L'utilisateur cherche un objet perdu → Liguita calcule les correspondances avec les objets
trouvés → il vérifie qu'il en est bien le propriétaire → il paie des **frais de mise en
relation** (300 à 3 000 FCFA selon la classe de l'objet) → il est mis en relation avec le
trouveur → il récupère son objet. Le trouveur reçoit une récompense d'environ un tiers des frais.

## Documentation

| Document | Rôle |
|---|---|
| [`docs/Liguita_Plan_Implementation_v2.md`](docs/Liguita_Plan_Implementation_v2.md) | Vision produit, modèle économique, parcours (59 sections) |
| [`docs/Liguita_Plan_Implementation_v3.md`](docs/Liguita_Plan_Implementation_v3.md) | **Plan d'exécution technique** — architecture, schéma SQL, moteurs, roadmap |
| [`docs/Liguita_Plan_Implementation_v3.html`](docs/Liguita_Plan_Implementation_v3.html) | Version lisible du plan technique (thème clair, imprimable) |
| [`docs/Liguita_Grille_Tarifaire.xlsx`](docs/Liguita_Grille_Tarifaire.xlsx) | **Source de vérité tarifaire** — calibrage sur le marché de N'Djamena |
| [`docs/design system/`](docs/design%20system/) | Boards du design system (fondations et composants) |
| [`docs/_build/md_to_html.py`](docs/_build/md_to_html.py) | Régénère le HTML depuis le Markdown |

## Architecture

Monorepo **pnpm workspaces**.

```text
liguita/
├── apps/
│   └── web/                Next.js 15 — public, /app, /business, /admin
├── packages/
│   ├── config/             Constantes : pays, villes, catégories, couleurs, i18n
│   ├── core/               Logique métier PURE, sans I/O (pricing, matching)
│   └── ui/                 Design system : tokens, preset Tailwind, composants
└── docs/                   Plans et sources
```

**Règle d'architecture** : `packages/core` ne fait aucun appel réseau et aucune requête base.
Il reçoit des données, retourne un résultat. C'est ce qui le rend testable en millisecondes et
réutilisable par le web, les workers, le bot WhatsApp et l'admin.

## Prérequis

- **Node.js** ≥ 20 (développé sur 22)
- **pnpm** ≥ 9 — `corepack enable` ou `npx pnpm@9`
- **Docker** (optionnel) — pour Supabase en local

## Démarrage

```bash
# 1. Dépendances
pnpm install

# 2. Tests (le moteur de tarification doit afficher 18/18)
pnpm test

# 3. Application web
pnpm dev
# → http://localhost:3000
# → http://localhost:3000/design-system  (catalogue du design system)
```

## Scripts

| Commande | Effet |
|---|---|
| `pnpm dev` | Démarre l'application web |
| `pnpm build` | Build de production de tous les paquets |
| `pnpm test` | Tests unitaires (Vitest) |
| `pnpm test:watch` | Tests en mode surveillance |
| `pnpm typecheck` | Vérification TypeScript stricte |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier |
| `pnpm docs:build` | Régénère le HTML du plan technique |

## Conventions

### Design system

- **Rouge de marque d'interface : `#E50F1A`** (contraste 4,76:1 avec le blanc — conforme WCAG AA).
  Le rouge brut du logo est `#F10F15` mais échoue au seuil AA (4,36:1) : il reste réservé à l'image.
- **Polices** : Plus Jakarta Sans (titres, interface) + Inter (corps, montants, tableaux).
- **Boutons en pilule**, champs 12 px, cartes 16 px.
- **Le rouge et le vert ne portent jamais seuls l'information** — toujours doubler d'une icône
  ou d'un libellé.
- **Touch target ≥ 48 px** sur tous les éléments interactifs.
- Aucune valeur de couleur, d'espacement ou de rayon écrite en dur dans un composant :
  tout vient de `packages/ui/src/tokens.ts`.

### Tarification

Les montants sont **toujours** calculés par `packages/core/src/pricing`, jamais à la main.
Toute modification de la grille exige une nouvelle version de `pricing_rules` en base et doit
faire passer les 18 cas de test dorés **sans en modifier aucun**.

| Classe | Base | Trouveur | Liguita |
|---|---:|---:|---:|
| C1 documents | 300 | 100 | 200 |
| C2 effets personnels | 700 | 250 | 450 |
| C3 électronique | 1 200 | 400 | 800 |
| C4 valeur élevée | 3 000 | 900 | 2 100 |
| C5 (> 1 M FCFA) | 1 % borné 5 000–25 000 | 30 % | 70 % |

### Code

- **TypeScript strict**, `noUncheckedIndexedAccess` activé.
- Messages de commit : [Conventional Commits](https://www.conventionalcommits.org/) —
  `feat(pricing): …`, `fix(matching): …`, `docs: …`, `chore: …`.
- Toute écriture en base passe par une migration versionnée ; aucune modification manuelle
  du schéma.
- Les tests RLS sont **bloquants** : une politique trop permissive est le risque de sécurité
  numéro un de ce produit.

### Langue

- Code, identifiants et commentaires techniques : **anglais** pour les identifiants,
  **français** pour les commentaires métier et les messages utilisateur.
- Interface : français au lancement, arabe en phase 2 (toutes les chaînes passent par un
  dictionnaire dès le départ).
- Montants : `1 200 FCFA` (espace insécable), jamais `1200FCFA` ni `XAF`.

## État d'avancement

| Phase | Périmètre | État |
|---|---|---|
| **Sprint 0** | Fondations : monorepo, design system, moteurs, socle web | ✅ |
| Sprint 1 | Authentification (téléphone + OTP) | ✅ |
| Sprint 2 | Objets perdus et trouvés | ✅ |
| Sprint 3 | Recherche | ✅ |
| Sprint 4 | Correspondance | ✅ |
| Sprint 5 | Vérification de propriété | 🚧 en cours |
| Sprint 6 | Tarification et paiement | ⬜ |
| Sprint 7 | Mise en relation et restitution | ⬜ |
| Sprint 8 | Console Business | ⬜ |
| Sprint 9 | Administration | ⬜ |
| Sprint 10 | Tests, sécurité, lancement | ⬜ |

Détail des tâches, critères d'acceptation et estimations : voir
[`docs/Liguita_Plan_Implementation_v3.md`](docs/Liguita_Plan_Implementation_v3.md) §16.

---

*Liguita — N'Djamena, Tchad · 2026*
