# LIGUITA — Plan d'implémentation technique

**Plateforme tchadienne des objets perdus et retrouvés**

**Version 3.0 — Septembre 2026**
**Document de référence pour l'exécution : architecture, design system, modèle de données, tarification, roadmap P0 → P3**

> Ce document **complète** `Liguita_Plan_Implementation_v2.md` (vision produit, modèle économique, parcours).
> Il ne le remplace pas : il le rend **exécutable**. Là où le v2 dit « prévoir un moteur de matching », le v3 donne la fonction de score, la requête SQL et le critère d'acceptation.

---

## 0. Comment lire ce document

| Si vous êtes… | Lisez en priorité |
|---|---|
| Développeur frontend | §2 (design system), §7 (écrans), §8 (routes), §15 (tests) |
| Développeur backend | §4 (schéma), §5 (pricing), §6 (matching), §9 (paiement) |
| Fondateur / produit | §1 (audit), §16 (roadmap), §14 (KPI), §17 (risques) |
| Juridique / conformité | §11 (sécurité, loi 007/PR/2015), §4.7 (rétention) |
| Design | §2 en entier, §2.11 (do/don't) |

**Convention de priorité** utilisée dans tout le document :

```text
P0  = MVP, bloquant pour le lancement      — Sprint 0 à 10
P1  = lancement commercial                 — après validation du parcours P0
P2  = croissance                           — après premiers revenus
P3  = différenciation long terme
```

**Convention d'estimation** : `j` = jour-homme d'un développeur full-stack confirmé, hors revue de code et hors attente externe (validation d'un opérateur mobile money, devis partenaire, etc.). Ces attentes sont listées séparément en §16.6 car elles sont souvent le vrai chemin critique au Tchad.

---

## 1. Synthèse de l'audit

### 1.1 Ce qui existe réellement dans le dépôt

| Chemin | Nature | État |
|---|---|---|
| `docs/Liguita_Plan_Implementation_v2.md` | Plan produit complet, 59 sections | **Complet et de bonne qualité** — sert de base stratégique |
| `docs/Newwwww Liguita_Plan_Implementation_v2.txt` | Copie **strictement identique** du `.md` (vérifié par `diff`) | **Redondant — à supprimer** |
| `docs/Nouveau document texte.txt` | Contient uniquement `https://github.com/marcmahonte-art/liguita.git` | À transformer en `README.md` |
| `docs/Liguita_Grille_Tarifaire.xlsx` | 4 onglets : grille, calibrage marché sourcé, paramètres, exemples chiffrés | **Le document le plus précieux du dépôt** |
| `docs/design system/board_foundations.html` | Design system codé : palette, typo, espacement, rayons, ombres | Référence technique |
| `docs/design system/board_components.html` | Design system codé : hero, boutons, inputs, badges, cartes, devis, tableau | Référence technique |
| `docs/design system/ChatGPT Image ...19_10_34.png` | Planche de style concurrente : logo, palette, icônes, composants, états | **Conflit avec les boards** |
| `docs/design system/ChatGPT Image ...19_25_47.png` | Maquette de page d'accueil desktop | Conflit partiel |
| `docs/design system/sdddd.png` | Visuel d'illustration (jeune femme + pin rouge + toukoul) | Bon pour le Hero |
| `logo/liguita.png`, `petit logo.png` | Logo principal (1536×1024, fond transparent) | Exploitable |
| `logo/liguita noir.png` | Version monochrome | Exploitable |

**Aucun code n'existe.** Pas de `package.json`, pas de `.git` initialisé localement. Le dépôt GitHub distant n'est pas cloné. Le projet en est exactement à l'étape « Sprint 0 » du plan v2.

### 1.2 Contradictions détectées entre les documents

Ce sont les points qui, laissés tels quels, produiraient un produit incohérent. Chacun est **arbitré** dans la colonne de droite ; la justification détaillée suit.

| # | Contradiction | Sources en conflit | Arbitrage retenu |
|---|---|---|---|
| C1 | **Couleur de marque** : `#E50F1A` vs `#FF3830` | boards HTML vs planche ChatGPT | **`#E50F1A`** |
| C2 | **Police** : Inter vs Plus Jakarta Sans | boards HTML vs planche ChatGPT | **Plus Jakarta Sans**, Inter en repli |
| C3 | **Forme des boutons** : rayon 12 px vs pilule | boards vs maquettes | **Pilule** sur CTA/boutons |
| C4 | **Frais C1** : 300 FCFA vs 500 FCFA | grille xlsx vs maquette d'accueil | **300 FCFA** |
| C5 | **Répartition C1** : 100/200 vs 100/400 | grille xlsx vs maquette d'accueil | **100 trouveur / 200 Liguita** |
| C6 | **Nombre d'étapes du parcours** : 4 vs 5 | boards (Recherchez/Vérifiez/Payez/Retrouvez) vs maquette (Déclarez/Liguita cherche/Vérifiez/Payez/Récupérez) | **5 étapes** |
| C7 | **Routes de recherche** : `/search/*` vs `/rechercher` | §14 vs §48 du plan v2 | **`/rechercher/*`** (français) |
| C8 | **Table des avis de recherche** : `saved_searches` listée en P0 (§57) mais innovation #2 | §57 vs §59 | **P0 confirmé** |
| C9 | **`pricing_rules`** citée §2.7 et §33 mais jamais modélisée | §2.7, §33 | **Modélisée en §5.4** |
| C10 | **`payments` + `transactions` + `rewards`** : trois tables sans relation définie | §33 | **Rôles clarifiés en §5.6** |

### 1.3 Justification des arbitrages (ADR)

#### ADR-001 — Le rouge de marque est `#E50F1A`, pas `#FF3830`

J'ai échantillonné les pixels opaques de `logo/liguita.png` : le rouge réel du logo est **`#F10F15`** (moyenne sur 80 785 pixels rouges). Aucun des deux candidats n'est exact ; les deux sont des approximations du logo.

Le choix se fait donc sur un critère objectif, le contraste WCAG 2.2 :

| Couleur | Contraste avec blanc | Texte blanc dessus | Verdict |
|---|---:|---:|---|
| `#F10F15` (logo brut) | 4,36:1 | 4,36:1 | ✗ Échoue AA texte normal (seuil 4,5:1) |
| **`#E50F1A`** (boards) | **4,76:1** | **4,76:1** | ✓ **Passe AA** |
| `#C70D17` (hover) | 6,00:1 | 6,00:1 | ✓ Passe AA large marge |
| `#FF3830` (ChatGPT) | 3,58:1 | 3,58:1 | ✗ Échoue AA (texte normal **et** bouton blanc) |

**Conséquence concrète** : avec `#FF3830`, un bouton « Payer 1 200 FCFA » en blanc sur rouge serait **non conforme** — or c'est le bouton le plus critique du produit, celui qui encaisse. `#E50F1A` est par ailleurs déjà câblé dans les deux boards HTML (variables CSS, états hover/active/disabled) et se situe à une distance colorimétrique imperceptible du logo.

> **Règle** : `#E50F1A` est le rouge **d'interface**. Le logo raster conserve son rouge d'origine (`#F10F15`) car un logo est une image de marque, pas du texte. Si un jour le logo est vectorisé, le pin peut être recoloré en `#E50F1A` sans perte perceptible.

#### ADR-002 — Plus Jakarta Sans, Inter en repli

La planche ChatGPT spécifie Plus Jakarta Sans avec une échelle typographique explicite (H1 32/Semibold, H2 24/Semibold, H3 18/Medium, corps 16/Regular, secondaire 14/Regular). Les boards spécifient Inter.

Plus Jakarta Sans est retenue parce qu'elle **partage l'ADN formel du logo** : terminaisons arrondies, contreformes ouvertes, `g` à queue simple — exactement ce que le logotype « liguita » exprime. Inter, grotesque neutre, est excellente pour les données et les interfaces denses mais crée une rupture stylistique avec le logotype.

**Implémentation hybride** : Plus Jakarta Sans pour titres, boutons, libellés et navigation ; Inter pour les **montants, tableaux et identifiants** (meilleur chiffre tabulaire, `tabular-nums`). Les deux sont chargées en `woff2` auto-hébergées via `next/font/local` — pas de Google Fonts CDN, qui est lent depuis N'Djamena.

L'échelle des boards (display 64 px) est conservée pour le desktop ; l'échelle de la maquette (H1 32 px) devient l'échelle mobile. Une échelle fluide `clamp()` réconcilie les deux (§2.3).

#### ADR-003 — Boutons en pilule

Les boards prescrivent 12 px, les maquettes des pilules. Les pilules gagnent : elles prolongent la rondeur du logo, et surtout elles rendent le CTA visuellement distinct des champs de saisie (12 px) et des cartes (16 px), ce qui réduit l'ambiguïté sur mobile. Les champs, cartes et modales gardent 12/16 px.

#### ADR-004 — 300 FCFA et 100/200

La grille xlsx est **sourcée** : coût réel de remplacement d'une CNI (5 000–10 000 FCFA), SMIG (60 000 FCFA/mois), prix des téléphones relevés en boutique à N'Djamena. La maquette d'accueil affiche « à partir de 500 FCFA » et une répartition 100/400 sans aucune source. **La grille sourcée fait foi.** La maquette d'accueil doit être corrigée (§18.3).

Par ailleurs, « à partir de 500 FCFA » est faux : le plancher réel de la grille est 300 FCFA. Communiquer un prix d'appel supérieur au prix réel est une erreur commerciale dans un marché sensible au prix.

#### ADR-005 — Cinq étapes, formulation « Liguita cherche »

Les boards décrivent 4 étapes, la maquette 5. La version à 5 étapes est retenue car elle rend visible **le travail de la plateforme** (« Liguita cherche »), ce qui est précisément l'argument du positionnement « moteur de recherche » et non « site de petites annonces » (§52 du plan v2).

```text
01 Déclarez      02 Liguita cherche      03 Vérifiez      04 Payez      05 Récupérez
```

---

## 2. Design System canonique — « Liguita DS v2 »

> **Source de vérité unique.** Les fichiers `board_foundations.html` et `board_components.html` deviennent des **rendus de démonstration** de ce design system, pas sa définition. La définition vit dans `packages/ui/tokens.ts` et se propage à Tailwind et au CSS. Toute valeur écrite en dur dans un composant est un bug.

### 2.1 Principes directeurs

1. **Un seul accent.** Le rouge est réservé à l'action principale et à la sémantique « perdu ». Il ne décore jamais. Sur un écran, un seul bouton rouge plein.
2. **Neutre et haute lisibilité.** Le fond est blanc ou `ink-50`. Pas de dégradés, pas d'ombres colorées, pas de verre dépoli.
3. **Le rouge et le vert ne portent jamais seuls l'information.** Toujours doubler d'une icône et d'un libellé (daltonisme rouge/vert : environ 8 % des hommes).
4. **Mobile d'abord, réseau faible d'abord.** Chaque composant est conçu à 360 px de large et testé en 3G simulée avant d'être considéré terminé.
5. **Touch target ≥ 48 px.** Y compris les icônes de barre d'action et les cases à cocher.
6. **Le prix est un composant de premier plan.** Le montant à payer n'est jamais un texte gris 12 px.

### 2.2 Tokens — Couleur

#### Échelle de marque

| Token | Hex | Usage |
|---|---|---|
| `brand.50` | `#FDECEE` | Fond de badge « perdu », fond d'icône |
| `brand.100` | `#FBD5D9` | Fond d'alerte douce, survol de ligne |
| `brand.200` | `#F4A5AD` | Bordure de badge, bouton désactivé |
| `brand.300` | `#EC6E7A` | État pressé sur fond clair |
| `brand.400` | `#E53947` | Survol de lien rouge |
| **`brand.500`** | **`#E50F1A`** | **Primaire — boutons, liens, pin. Contraste 4,76:1** |
| `brand.600` | `#C70D17` | `:hover` — contraste 6,00:1 |
| `brand.700` | `#A30A12` | `:active`, texte rouge sur fond clair — 8,05:1 |
| `brand.800` | `#7E070E` | Texte sur fond `brand.50` |
| `brand.900` | `#56040A` | Réservé illustrations |

#### Neutres (`ink`)

| Token | Hex | Usage |
|---|---|---|
| `ink.0` | `#FFFFFF` | Surface principale |
| `ink.50` | `#F7F8FA` | Fond de page, survol de tableau, champs désactivés |
| `ink.100` | `#EEF1F5` | Séparateur doux, fond de puce |
| `ink.200` | `#DEE3EA` | Bordure **décorative** — séparateurs, contours de carte, connecteurs d'étapes |
| `ink.300` | `#B7BEC9` | **Décoratif uniquement — 1,87:1.** Ne peut pas porter un composant interactif |
| `ink.400` | `#8A929E` | **Bordure de composant interactif — 3,14:1**, et état désactivé |
| `ink.500` | `#5B6470` | **Texte secondaire et placeholder — 6,00:1** |
| `ink.700` | `#2A2F38` | Libellés de champ, titres de tableau |
| `ink.900` | `#0E1116` | **Texte principal — 18,91:1**, fond de bloc sombre |

> **Arbitrage — correction apportée au plan.** La version initiale de ce tableau désignait `ink.300` (`#B7BEC9`) comme « bordure de champ de saisie », alors que le §2.10 exige un contraste ≥ 3:1 pour les composants d'interface (WCAG 2.2 SC 1.4.11, niveau AA). Les deux prescriptions sont **incompatibles** : mesuré sur fond blanc, `ink.300` atteint 1,87:1. `ink.400` est le premier pas conforme de la rampe, à 3,14:1 — c'est donc lui qui porte les bordures de champ, de bouton secondaire, de badge contour et de case OTP.
>
> Deux conséquences en cascade, également arbitrées : `ink.400` ne peut pas servir de couleur de placeholder (3,14:1 < 4,5:1 exigé pour du texte) — le placeholder passe à `ink.500` ; et l'état **désactivé** conserve `ink.400`, les composants inactifs étant explicitement exemptés d'exigence de contraste par la SC 1.4.3.
>
> Ces valeurs ne sont pas laissées à la discipline : `packages/ui/src/__tests__/tokens-parity.test.ts` mesure les ratios et échoue si l'une d'elles repasse sous son seuil.


> La planche ChatGPT utilisait `#111827` / `#6B7280` / `#F3F4F6` (gris Tailwind). Ils sont écartés au profit de l'échelle `ink` qui est une **vraie rampe continue à 9 pas**, nécessaire pour les états de survol, de désactivation et les bordures. Les valeurs sont assez proches pour que l'écart ne soit pas perçu.

#### Sémantique

| Token | Hex | Contraste | Règle d'usage |
|---|---|---:|---|
| `success.500` | `#16A34A` | 3,30:1 | **Icônes et fonds uniquement** — jamais du texte |
| `success.700` | `#166534` | 7,13:1 | Texte de succès |
| `success.50` | `#DCFCE7` | — | Fond de badge « Restitué » |
| `warning.500` | `#F59E0B` | 2,15:1 | Icônes, barres, fonds |
| `warning.700` | `#92400E` | 7,09:1 | Texte d'avertissement |
| `warning.50` | `#FEF3C7` | — | Fond de badge « En attente » |
| `danger.500` | `#DC2626` | 4,83:1 | Bouton de destruction |
| `danger.700` | `#991B1B` | 7,6:1 | Texte d'erreur |
| `danger.50` | `#FEE2E2` | — | Fond de message d'erreur |
| `info.500` | `#2563EB` | 5,17:1 | Liens informatifs, aide |

**Sémantique métier Liguita** — à utiliser partout plutôt que les noms de couleur :

| Token métier | = | Sens |
|---|---|---|
| `semantic.lost` | `brand.500` | Perdu, action principale |
| `semantic.found` | `success.700` / `success.50` | Trouvé, restitution réussie |
| `semantic.pending` | `warning.700` / `warning.50` | En attente, correspondance possible |
| `semantic.settled` | `ink.500` / `ink.50` | Archivé, clos |
| `semantic.money` | `ink.900` | Montants |

### 2.3 Tokens — Typographie

**Familles**

```css
--font-display: "Plus Jakarta Sans", "Inter", system-ui, sans-serif;
--font-body:    "Inter", "Plus Jakarta Sans", system-ui, sans-serif;
--font-mono:    ui-monospace, "SF Mono", "Cascadia Mono", Menlo, monospace;
```

#### Échelle fluide

Les valeurs desktop viennent des boards, les valeurs mobiles de la maquette. `clamp()` interpole entre les deux : un seul token, aucune media query typographique.

| Token | Mobile | Desktop | Poids | Interlettrage | Interligne | Police |
|---|---:|---:|---:|---:|---:|---|
| `display` | 40 px | 64 px | 800 | −0.02em | 1.05 | display |
| `h1` | 28 px | 40 px | 800 | −0.015em | 1.10 | display |
| `h2` | 22 px | 28 px | 700 | −0.01em | 1.20 | display |
| `h3` | 18 px | 20 px | 700 | −0.005em | 1.30 | display |
| `body-lg` | 16 px | 18 px | 400 | 0 | 1.50 | body |
| `body` | 15 px | 16 px | 400 | 0 | 1.50 | body |
| `caption` | 12 px | 13 px | 400 | 0 | 1.40 | body |
| `overline` | 11 px | 11 px | 700 | +0.12em, majuscules | 1.40 | body |
| `money-lg` | 32 px | 44 px | 800 | −0.02em | 1.00 | body, `tabular-nums` |
| `money` | 18 px | 24 px | 800 | −0.01em | 1.20 | body, `tabular-nums` |
| `label` | 13 px | 13 px | 700 | 0 | 1.40 | body |

> **`tabular-nums` obligatoire sur tout montant.** Sans cela, la largeur des chiffres varie et la colonne « Frais » d'un tableau danse. C'est un détail qui fait la différence entre un produit artisanal et un produit fini.

#### Règles rédactionnelles

- Montants : espace insécable comme séparateur de milliers, `FCFA` après un espace insécable. `1 200 FCFA`, jamais `1200FCFA`.
- Devise : toujours `FCFA` en clair (pas `XAF`, pas `₣`). Le public cible ne lit pas les codes ISO.
- Titres : phrase, pas de majuscules décoratives. « Recherchez un objet retrouvé », pas « Recherchez Un Objet Retrouvé ».
- Boutons : verbe à l'infinitif, 1 à 3 mots. « Payer 1 200 FCFA », « Voir le détail ».

### 2.4 Tokens — Espacement, grille, points de rupture

**Espacement** (base 4 px, comme les boards)

| Token | Valeur | Usage type |
|---|---:|---|
| `space.1` | 4 px | Écart icône/texte |
| `space.2` | 8 px | Écart entre libellé et champ |
| `space.3` | 12 px | Padding interne de puce |
| `space.4` | 16 px | Padding de carte compacte, gouttière mobile |
| `space.6` | 24 px | Padding de carte, écart entre sections mobiles |
| `space.8` | 32 px | Écart entre blocs desktop |
| `space.12` | 48 px | Marge de section mobile |
| `space.16` | 64 px | Marge de section desktop |
| `space.24` | 96 px | Séparation de chapitres marketing |

**Grille** : conteneur max `1200px`, gouttière `16px` mobile / `24px` desktop, 12 colonnes.

**Points de rupture** (alignés Tailwind par défaut) : `sm 640` · `md 768` · `lg 1024` · `xl 1280`.

**Règle mobile** : `max-width: 100%`, padding latéral `16px`, aucune table large sans conteneur à défilement horizontal. Les tableaux de la console admin/business passent en **cartes empilées** sous 768 px.

### 2.5 Tokens — Rayons, bordures, ombres

**Rayons**

| Token | Valeur | Application |
|---|---:|---|
| `radius.none` | 0 | Tableaux pleine largeur |
| `radius.sm` | 4 px | Badges carrés, `kbd` |
| `radius.md` | 8 px | Boutons compacts, puces |
| `radius.lg` | 12 px | **Champs de saisie, boutons standards** |
| `radius.xl` | 16 px | **Cartes, modales, panneaux** |
| `radius.2xl` | 24 px | Bloc Hero, bloc devis |
| `radius.full` | 999 px | **Boutons CTA, badges, avatars** (ADR-003) |

**Bordures** : épaisseur `1px` par défaut, couleur `ink.200`. `2px` uniquement pour l'état sélectionné (bordure `brand.500`).

**Ombres**

| Token | Valeur | Application |
|---|---|---|
| `shadow.100` | `0 1px 2px rgba(14,17,22,.06), 0 1px 1px rgba(14,17,22,.04)` | Carte au repos |
| `shadow.200` | `0 4px 12px rgba(14,17,22,.08), 0 2px 4px rgba(14,17,22,.04)` | Carte survolée, popover |
| `shadow.300` | `0 12px 32px rgba(14,17,22,.10), 0 4px 8px rgba(14,17,22,.05)` | Modale, tiroir |
| `shadow.overlay` | `0 20px 60px rgba(14,17,22,.18), 0 8px 16px rgba(14,17,22,.08)` | Feuille plein écran mobile |

**Focus** — obligatoire sur tout élément interactif, jamais supprimé :

```css
--focus-ring: 0 0 0 4px rgba(14,17,22,.08);
--focus-ring-danger: 0 0 0 4px rgba(229,15,26,.18);
--focus-ring-inverse: 0 0 0 4px rgba(255,255,255,.35); /* sur fond sombre */
```

### 2.6 Iconographie

- **Bibliothèque** : Lucide React, contour `1.75`, terminaisons arrondies — cohérent avec le logo.
- **Tailles** : `16` (dans un texte), `20` (bouton), `24` (barre d'action), `32` (état vide), `48` (illustration).
- **Icônes métier imposées** :

| Concept | Icône | Couleur |
|---|---|---|
| Perdu | `search-x` ou `circle-alert` | `brand.500` |
| Trouvé | `circle-check` ou `package-search` | `success.700` |
| Correspondance | `sparkles` / `git-compare` | `warning.700` |
| Vérification | `shield-check` | `ink.700` |
| Paiement | `credit-card` / `wallet` | `ink.900` |
| Mise en relation | `messages-square` | `ink.700` |
| Restitution | `handshake` / `package-check` | `success.700` |
| Récompense | `gift` / `award` | `warning.700` |
| Emplacement | `map-pin` | `brand.500` |

- **Catégories d'objets** (reprises de la maquette, à conserver telles quelles) :
  `Téléphone` · `Carte` · `Sac` · `Clés` · `Ordinateur` · `Autre`
  Chaque catégorie reçoit une icône **et** un libellé — jamais l'icône seule.

### 2.7 Inventaire des composants

Les boards définissent déjà : Hero, Boutons (6 variantes × 3 tailles), Champs (normal/erreur/désactivé/recherche), Badges (6 styles), Cartes objet, Bloc devis, Tableau de données. Le plan v3 ajoute les composants manquants, indispensables au parcours réel.

#### `packages/ui` — composants primitifs

| Composant | Variantes | Notes d'implémentation |
|---|---|---|
| `Button` | `primary` `secondary` `outline` `ghost` `danger` `success` × `sm` `md` `lg` × `block` | Pilule, `min-height: 48px` en `md`/`lg`. `loading` avec spinner inline et libellé conservé (pas de bouton qui rétrécit) |
| `Input` | `text` `tel` `number` `currency` | `InputCurrency` : suffixe `FCFA` non modifiable, formatage à la frappe, `inputMode="numeric"` |
| `PhoneInput` | — | Indicatif `+235` préfixé et verrouillé (multi-pays en P2 : sélecteur) |
| `SearchInput` | `md` `lg` (Hero) | `type="search"`, `enterKeyHint="search"` |
| `Select` | `native` (mobile) / `custom` (desktop) | Sur mobile, **toujours** le sélecteur natif : il est plus rapide et plus fiable |
| `Combobox` | Ville, Quartier, Catégorie | Recherche par trigramme côté client sur une liste mise en cache |
| `Badge` | `lost` `found` `pending` `neutral` `dark` `outline` | Toujours avec point coloré ou icône |
| `Card` | `flat` `elevated` `interactive` | `interactive` = survol `shadow.200` + `translateY(-2px)` |
| `ItemCard` | `found` `lost` `match` | Carte de résultat anonymisée |
| `PriceQuoteCard` | `light` `dark` | Bloc devis ; la variante `dark` est celle du board |
| `Money` | `sm` `md` `lg` `xl` | **Toujours** `tabular-nums`, formatage `Intl.NumberFormat('fr-FR')` + ` FCFA` |
| `Stepper` | `horizontal` `vertical` | Les 5 étapes ; état `done`/`current`/`todo` |
| `ProgressBar` | — | Progression de restitution |
| `Modal` / `Sheet` | — | `Sheet` (bas d'écran) sur mobile, `Modal` sur desktop |
| `Toast` | `info` `success` `error` | Empilables, fermeture manuelle, `role="status"` |
| `Alert` | `info` `success` `warning` `danger` | Icône + titre + texte, jamais la couleur seule |
| `EmptyState` | — | Illustration 48 px + titre + action |
| `Skeleton` | `text` `card` `table` | **Obligatoire** sur tout écran qui charge des données |
| `Table` | `data` | En-têtes majuscules 11 px, chiffres alignés à droite, tri accessible |
| `Tabs` | `underline` | `role="tablist"` complet |
| `Avatar` | `sm` `md` `lg` | Initiales en repli, jamais d'image cassée |
| `QRCode` | — | `qrcode` en client, SVG, correction d'erreur `M` |
| `FileDrop` | `image` | Compression côté client **avant** envoi (§12) |
| `OTPInput` | `4` `6` | Collage pris en charge, autofocus, renvoi avec compte à rebours |
| `MapPicker` | — | Position approximative ; optionnel, jamais bloquant |
| `Timer` | — | Expiration du devis, SLA de remboursement |

#### États obligatoires par composant

Tout composant qui consomme des données doit traiter : `loading` · `empty` · `error` · `success` · `disabled` · `offline`. Un composant livré sans ces états est refusé en revue.

### 2.8 Configuration Tailwind

```ts
// packages/ui/tailwind.preset.ts
import type { Config } from 'tailwindcss';

export const liguitaPreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        brand: {
          50:'#FDECEE',100:'#FBD5D9',200:'#F4A5AD',300:'#EC6E7A',400:'#E53947',
          500:'#E50F1A',600:'#C70D17',700:'#A30A12',800:'#7E070E',900:'#56040A',
          DEFAULT:'#E50F1A',
        },
        ink: {
          0:'#FFFFFF',50:'#F7F8FA',100:'#EEF1F5',200:'#DEE3EA',300:'#B7BEC9',
          400:'#8A929E',500:'#5B6470',700:'#2A2F38',900:'#0E1116',
        },
        success: { 50:'#DCFCE7',500:'#16A34A',700:'#166534' },
        warning: { 50:'#FEF3C7',500:'#F59E0B',700:'#92400E' },
        danger:  { 50:'#FEE2E2',500:'#DC2626',700:'#991B1B' },
        info:    { 500:'#2563EB' },
      },
      fontFamily: {
        display: ['var(--font-plus-jakarta)','Inter','system-ui','sans-serif'],
        body:    ['var(--font-inter)','system-ui','sans-serif'],
        mono:    ['ui-monospace','SFMono-Regular','Menlo','monospace'],
      },
      fontSize: {
        display: ['clamp(2.5rem,6vw,4rem)',   { lineHeight:'1.05', letterSpacing:'-0.02em',  fontWeight:'800' }],
        h1:      ['clamp(1.75rem,4vw,2.5rem)',{ lineHeight:'1.10', letterSpacing:'-0.015em', fontWeight:'800' }],
        h2:      ['clamp(1.375rem,3vw,1.75rem)',{ lineHeight:'1.20', letterSpacing:'-0.01em', fontWeight:'700' }],
        h3:      ['clamp(1.125rem,2vw,1.25rem)',{ lineHeight:'1.30', letterSpacing:'-0.005em',fontWeight:'700' }],
        'body-lg':['clamp(1rem,1.6vw,1.125rem)',{ lineHeight:'1.5' }],
        body:    ['clamp(0.9375rem,1.4vw,1rem)',{ lineHeight:'1.5' }],
        caption: ['clamp(0.75rem,1.2vw,0.8125rem)',{ lineHeight:'1.4' }],
        overline:['0.6875rem',{ lineHeight:'1.4', letterSpacing:'0.12em', fontWeight:'700' }],
        money:   ['clamp(1.125rem,2.4vw,1.5rem)',{ lineHeight:'1.2', letterSpacing:'-0.01em', fontWeight:'800' }],
        'money-lg':['clamp(2rem,5vw,2.75rem)',{ lineHeight:'1', letterSpacing:'-0.02em', fontWeight:'800' }],
      },
      borderRadius: { none:'0', sm:'4px', md:'8px', lg:'12px', xl:'16px', '2xl':'24px', full:'999px' },
      boxShadow: {
        '100':'0 1px 2px rgba(14,17,22,.06), 0 1px 1px rgba(14,17,22,.04)',
        '200':'0 4px 12px rgba(14,17,22,.08), 0 2px 4px rgba(14,17,22,.04)',
        '300':'0 12px 32px rgba(14,17,22,.10), 0 4px 8px rgba(14,17,22,.05)',
        overlay:'0 20px 60px rgba(14,17,22,.18), 0 8px 16px rgba(14,17,22,.08)',
        focus:'0 0 0 4px rgba(14,17,22,.08)',
        'focus-danger':'0 0 0 4px rgba(229,15,26,.18)',
      },
      spacing: { 1:'4px',2:'8px',3:'12px',4:'16px',6:'24px',8:'32px',12:'48px',16:'64px',24:'96px' },
      maxWidth: { container: '1200px' },
      screens: { sm:'640px', md:'768px', lg:'1024px', xl:'1280px' },
    },
  },
};
```

### 2.9 Variables CSS globales

```css
/* packages/ui/globals.css */
@layer base {
  :root {
    --brand:        #E50F1A;
    --brand-hover:  #C70D17;
    --brand-active: #A30A12;
    --surface:      #FFFFFF;
    --surface-alt:  #F7F8FA;
    --border:       #DEE3EA;
    --text:         #0E1116;
    --text-muted:   #5B6470;
    --success:      #166534;
    --success-bg:   #DCFCE7;
    --warning:      #92400E;
    --warning-bg:   #FEF3C7;
    --danger:       #DC2626;
    --danger-bg:    #FEE2E2;
  }

  html { -webkit-text-size-adjust: 100%; }

  body {
    font-family: var(--font-inter), system-ui, sans-serif;
    font-size: 16px;
    line-height: 1.5;
    color: var(--text);
    background: var(--surface);
    -webkit-font-smoothing: antialiased;
  }

  /* Accessibilité : anneau de focus unique et visible */
  :focus-visible {
    outline: none;
    box-shadow: var(--tw-shadow, 0 0 0 4px rgba(14,17,22,.08));
    border-radius: 8px;
  }

  /* Respect des préférences système */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
  }
}
```

### 2.10 Accessibilité — exigences vérifiables

| Exigence | Critère de recette |
|---|---|
| Contraste texte | ≥ 4,5:1 — vérifié automatiquement par `axe-core` en CI |
| Contraste texte large (≥ 24 px ou 19 px gras) | ≥ 3:1 |
| Contraste composant d'interface (bordures de champ, icônes actives) | ≥ 3:1 |
| Focus visible | Sur **tous** les éléments interactifs, sans exception |
| Touch target | ≥ 48 × 48 px, y compris liens de pied de page sur mobile |
| Information non portée par la couleur seule | Test manuel : passer l'écran en niveaux de gris, tout doit rester compréhensible |
| Navigation clavier | Parcours complet perdu → paiement réalisable au clavier seul |
| Lecteur d'écran | `VoiceOver` (iOS) et `TalkBack` (Android) : parcours de déclaration testé |
| Langue | `<html lang="fr">`, attribut `lang="ar"` sur les contenus arabes (P2) |
| Zoom | Utilisable à 200 % sans perte de contenu |

### 2.11 Do / Don't

| ✅ À faire | ❌ À éviter |
|---|---|
| Un seul bouton rouge plein par écran | Plusieurs CTA rouges concurrents |
| `Payer 1 200 FCFA` (montant dans le bouton) | `Payer` puis découvrir le montant |
| Icône + libellé pour « perdu »/« trouvé » | Pastille rouge vs verte seule |
| `shadow.100` au repos, `shadow.200` au survol | Ombres colorées, halos rouges |
| Montants en `tabular-nums` | Chiffres à largeur variable dans un tableau |
| `Sheet` bas d'écran sur mobile | Modale centrée sur un écran de 360 px |
| Squelettes de chargement | Écran blanc pendant 3 s sur réseau 3G |
| Libellé de champ visible | Placeholder utilisé comme libellé |

---

## 3. Architecture technique

### 3.1 Stack retenue

Le plan v2 prescrit Next.js + TypeScript + Tailwind + shadcn/ui côté front, et Supabase côté back. Ce choix est confirmé : il est pertinent pour un contexte tchadien (hébergement managé, pas d'administration serveur, coût initial nul, RLS native pour le cloisonnement particulier/business).

| Couche | Technologie | Version cible | Justification |
|---|---|---|---|
| Framework | Next.js App Router | 15.x | Rendu serveur (SEO des annonces publiques), routes API, PWA |
| Langage | TypeScript strict | 5.x | `strict: true`, `noUncheckedIndexedAccess: true` |
| Style | Tailwind CSS | 4.x | Avec le preset `packages/ui` |
| Primitives UI | Radix UI + composants maison | — | shadcn/ui **copié** dans `packages/ui`, pas en dépendance (contrôle total du style) |
| Base de données | PostgreSQL (Supabase) | 15+ | `pg_trgm`, `unaccent`, `pgcrypto`, `pg_cron`, plus tard `pgvector` |
| Auth | Supabase Auth | — | OTP téléphone (SMS) + mot de passe ; RLS adossée à `auth.uid()` |
| Stockage | Supabase Storage | — | Buckets `items`, `documents`, `org-logos` avec politiques d'accès |
| Temps réel | Supabase Realtime | — | Messagerie de mise en relation, statut de restitution |
| Recherche P0/P1 | PostgreSQL FTS + `pg_trgm` | — | Suffisant jusqu'à ~500 000 annonces |
| Recherche P3 | `pgvector` + embeddings | — | Matching sémantique |
| Paiement | Service interne `LiguitaPay` + adaptateurs | — | Airtel Money, Moov Money, GIMAC, Cash Liguita |
| Notifications | Adaptateurs SMS / WhatsApp / e-mail / Web Push | — | Un adaptateur par canal, interface commune |
| Fichiers hors-ligne | Service worker (Serwist) | — | PWA installable, file d'attente d'upload |
| Hébergement | Vercel (web) + Supabase (données) + Supabase Cron (workers) | — | Pas de serveur à administrer |
| Supervision | Sentry + Vercel Analytics + table `analytics_events` | — | Erreurs, Web Vitals, funnel métier |
| Tests | Vitest + Testing Library + Playwright + axe-core | — | Unitaires, intégration, E2E, accessibilité |

### 3.2 Organisation du code

**Monorepo pnpm.** Recommandé malgré l'apparente lourdeur, pour trois raisons concrètes :

1. Le **moteur de tarification** doit être exécuté par le web, par le worker de matching, par le bot WhatsApp (P1) et par l'admin. Une seule implémentation, testée une fois.
2. Le **worker de correspondances** ne peut pas tourner dans une fonction serverless à durée limitée : il lui faut un processus séparé (Supabase Cron + Edge Function, ou un petit service).
3. Le **design system** doit être consommé par le web, l'admin et, plus tard, un back-office partenaire.

> **Alternative si l'équipe est d'une seule personne et veut aller vite** : une seule application Next.js, avec `src/lib/pricing`, `src/lib/matching`, `src/components/ui` comme dossiers. La migration vers le monorepo est mécanique et peut se faire en P1. Ce document décrit la structure cible ; la variante minimale est acceptable pour le Sprint 0.

```text
liguita/
├── apps/
│   ├── web/                        # Next.js — public, /app, /business, /admin
│   ├── workers/                    # Supabase Edge Functions + tâches planifiées
│   │   ├── match-sweep/            # Recalcul des correspondances
│   │   ├── saved-search-alerts/    # Alertes des recherches sauvegardées (P0)
│   │   ├── notify-dispatch/        # Envoi multi-canal
│   │   ├── payment-reconcile/      # Rapprochement des paiements
│   │   └── retention-purge/        # Purge selon durées de conservation
│   └── whatsapp-bot/               # P1
├── packages/
│   ├── ui/                         # Design system : tokens, Tailwind preset, composants
│   ├── core/                       # Logique métier pure, sans I/O
│   │   ├── pricing/                # Moteur de tarification (§5)
│   │   ├── matching/               # Moteur de correspondance (§6)
│   │   ├── verification/           # Génération/notation des questions de propriété
│   │   └── validation/             # Schémas Zod partagés
│   ├── db/                         # Migrations SQL, types générés, seed
│   ├── payments/                   # Adaptateurs opérateurs (§9)
│   ├── notifications/              # Adaptateurs canaux (§10)
│   └── config/                     # Constantes : pays, villes, catégories, i18n
├── docs/                           # Ce document et les plans produit
├── .github/workflows/              # CI
├── pnpm-workspace.yaml
└── turbo.json
```

**Règle d'architecture** : `packages/core` ne fait **aucun** appel réseau ni requête base. Il reçoit des données, retourne un résultat. C'est ce qui le rend testable en millisecondes et réutilisable partout.

### 3.3 Arborescence de l'application web

```text
apps/web/src/
├── app/
│   ├── (public)/                   # Vitrine, SEO, accessible sans compte
│   │   ├── page.tsx                # Accueil
│   │   ├── rechercher/
│   │   ├── objets-trouves/
│   │   ├── comment-ca-marche/
│   │   ├── entreprises/
│   │   ├── tarifs/
│   │   ├── securite/
│   │   └── aide/
│   ├── (auth)/
│   │   ├── connexion/
│   │   ├── inscription/
│   │   └── otp/
│   ├── (app)/                      # Espace particulier — authentifié
│   │   ├── tableau-de-bord/
│   │   ├── recherche/
│   │   ├── perdus/                 # + /nouveau + /[id]
│   │   ├── trouves/                # + /nouveau + /[id]
│   │   ├── correspondances/        # + /[id] → vérification → devis → paiement
│   │   ├── messages/               # + /[id]
│   │   ├── paiements/
│   │   ├── recompenses/
│   │   ├── notifications/
│   │   ├── profil/
│   │   └── securite/
│   │   ├── (business)/business/    # Console entreprise
│   │   └── (admin)/admin/          # Console d'administration
│   ├── api/                        # Route handlers
│   │   ├── pricing/quote/
│   │   ├── matching/run/
│   │   ├── payments/initiate/
│   │   ├── payments/webhook/[provider]/
│   │   ├── uploads/sign/
│   │   └── qr/[code]/
│   ├── manifest.ts                 # PWA
│   ├── sitemap.ts
│   ├── robots.ts
│   └── layout.tsx
├── components/
│   ├── items/                      # ItemCard, ItemForm, CategoryPicker…
│   ├── match/                      # MatchCard, VerificationWizard, PriceQuote
│   ├── payment/                    # PaymentMethodPicker, PaymentStatus
│   ├── messaging/                  # ConversationView, MessageComposer
│   └── layout/                     # Header, Footer, BottomNav, Stepper
├── lib/
│   ├── supabase/                   # Clients browser / server / admin
│   ├── auth/                       # Garde de session, helpers de rôle
│   ├── offline/                    # File d'attente IndexedDB, reprise d'upload
│   └── analytics/                  # Émission d'événements typés
└── middleware.ts                   # Rafraîchissement de session + gardes de route
```

### 3.4 Environnements et configuration

Trois environnements : `local` (Supabase local via CLI), `staging` (projet Supabase de test + déploiement Vercel de préproduction), `production`.

```bash
# .env.local — jamais commité
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # serveur uniquement, jamais exposé au client
NEXT_PUBLIC_SITE_URL=https://liguita.td
NEXT_PUBLIC_DEFAULT_COUNTRY=TD
NEXT_PUBLIC_DEFAULT_CURRENCY=XAF
NEXT_PUBLIC_DEFAULT_PHONE_PREFIX=+235

# Paiement
AIRTEL_CLIENT_ID=
AIRTEL_CLIENT_SECRET=
AIRTEL_MERCHANT_CODE=
MOOV_MERCHANT_ID=
MOOV_API_KEY=
PAYMENT_WEBHOOK_SECRET=

# Notifications
SMS_PROVIDER_API_KEY=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=

# Observabilité
SENTRY_DSN=
```

**Règle de sécurité non négociable** : `SUPABASE_SERVICE_ROLE_KEY` n'est importée que dans les route handlers serveur et les workers. Toute PR qui l'importe dans un composant client est refusée. Un test automatisé vérifie l'absence de cette clé dans le bundle client.

### 3.5 Intégration et déploiement continus

Pipeline GitHub Actions, quatre étapes bloquantes :

```text
1. lint + typecheck            → ESLint, tsc --noEmit
2. tests unitaires             → Vitest (couverture packages/core ≥ 90 %)
3. tests d'intégration         → RLS + moteurs, sur Supabase local en conteneur
4. build + E2E + a11y          → Playwright (parcours P0) + axe-core
```

Puis : prévisualisation Vercel par PR, migration base **manuelle et revue** sur production, tag de version. Aucun déploiement en production un vendredi, aucune migration sans script de retour arrière.

---

## 4. Modèle de données

### 4.1 Principes

1. **Multi-pays dès le départ.** Toute entité métier porte `country_code`. Aucune valeur de ville, de devise ou d'indicatif n'est écrite en dur.
2. **Séparation perdu / trouvé.** Deux tables distinctes (`lost_items`, `found_items`) plutôt qu'une table avec un `type`. Les champs, les cycles de vie et les politiques RLS diffèrent trop.
3. **Immuabilité financière.** Une fois payé, un `price_quote` et une `transaction` ne sont plus modifiables. Les corrections passent par des écritures compensatoires.
4. **Traçabilité.** `audit_logs` journalise toute action sensible ; `item_status_history` journalise tout changement de statut d'objet.
5. **Identifiants publics lisibles.** Les objets business portent une référence du type `LG-2026-000291` (séquence annuelle), les transactions `LG-PAY-00001`. Les UUID restent internes.
6. **Pas de suppression physique** sur les objets et les paiements : `deleted_at` (suppression logique) ou statut `ARCHIVED`.

### 4.2 Types énumérés

```sql
-- Extensions nécessaires
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";
create extension if not exists "unaccent";
create extension if not exists "pgcrypto";
create extension if not exists "pg_cron";

-- Classification tarifaire (grille §2 du plan v2, onglet « Parametres » du xlsx)
create type pricing_class as enum ('C1','C2','C3','C4','C5');

-- Cycle de vie d'un objet trouvé
create type item_status as enum (
  'FOUND','IN_INVENTORY','MATCH_POSSIBLE','OWNER_IDENTIFIED',
  'RETURN_IN_PROGRESS','RETURNED','ARCHIVED'
);

-- Cycle de vie d'une déclaration de perte
create type lost_status as enum (
  'DECLARED','SEARCHING','MATCH_FOUND','VERIFYING','PAID','RETURNED','CLOSED','EXPIRED'
);

-- Correspondance
create type match_level as enum ('VERY_LIKELY','POSSIBLE','WEAK');
create type match_status as enum ('NEW','SEEN','CLAIMED','REJECTED','EXPIRED','CONVERTED');

-- Vérification de propriété
create type claim_status as enum (
  'DRAFT','QUESTIONS_SENT','ANSWERS_SUBMITTED','UNDER_REVIEW',
  'APPROVED','REJECTED','DISPUTED','EXPIRED'
);

-- Options payantes (grille §2.3)
create type pricing_option as enum ('URGENT','CONCIERGERIE','DELIVERY','COMMUNITY_BONUS');

-- Transaction
create type payment_status as enum (
  'INITIATED','PENDING','PAID','FAILED','CANCELLED','REFUNDED','PARTIALLY_REFUNDED'
);
create type reward_status as enum ('PENDING','RESERVED','RELEASED','FORFEITED','DONATED');

-- Rôles
create type org_role as enum ('OWNER','ADMIN','MANAGER','AGENT','READONLY');
create type app_role as enum ('USER','BUSINESS','MODERATOR','ADMIN');

-- Souscription
create type subscription_status as enum ('TRIAL','ACTIVE','PAST_DUE','CANCELLED','EXPIRED');

-- Signalements
create type report_reason as enum (
  'FAKE_FOUND_ITEM','FAKE_OWNER','FAKE_PAYMENT','DUPLICATE_CLAIM',
  'OFF_PLATFORM_SOLICITATION','INAPPROPRIATE_CONTENT','OTHER'
);
```

### 4.3 Schéma P0 — DDL

#### Référentiels

```sql
-- ---------- Pays, villes, quartiers (§38 du plan v2) ----------
create table countries (
  code            char(2) primary key,               -- 'TD'
  name            text not null,
  currency        char(3) not null,                  -- 'XAF'
  phone_prefix    text not null,                     -- '+235'
  languages       text[] not null default '{fr}',
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create table cities (
  id              uuid primary key default gen_random_uuid(),
  country_code    char(2) not null references countries(code),
  name            text not null,
  slug            text not null,
  lat             numeric(9,6),
  lng             numeric(9,6),
  is_active       boolean not null default true,
  unique (country_code, slug)
);

create table neighborhoods (
  id              uuid primary key default gen_random_uuid(),
  city_id         uuid not null references cities(id) on delete cascade,
  name            text not null,
  slug            text not null,
  unique (city_id, slug)
);

-- Lieux typés (§5 du plan v2) : aéroport, gare, taxi, marché…
create table place_types (
  code            text primary key,                  -- 'airport','station','taxi'…
  label_fr        text not null,
  label_ar        text,
  icon            text
);

-- Lieux nommés et réutilisables (ex. « Aéroport International N'Djamena »)
create table places (
  id              uuid primary key default gen_random_uuid(),
  city_id         uuid not null references cities(id),
  neighborhood_id uuid references neighborhoods(id),
  place_type      text not null references place_types(code),
  name            text not null,
  organization_id uuid,                              -- si lieu géré par une entreprise
  lat             numeric(9,6),
  lng             numeric(9,6),
  is_verified     boolean not null default false
);

-- ---------- Catégories d'objets (§4.3 et grille tarifaire) ----------
create table item_categories (
  id              uuid primary key default gen_random_uuid(),
  parent_id       uuid references item_categories(id),
  code            text not null unique,              -- 'phone','id_card','bag'…
  label_fr        text not null,
  label_ar        text,
  icon            text,
  default_class   pricing_class not null,            -- classement automatique (§2.2)
  min_value_xaf   bigint,
  max_value_xaf   bigint,
  is_sensitive    boolean not null default false,     -- → floutage obligatoire (§12 du v2)
  sort_order      int not null default 0
);

create table item_types (
  id              uuid primary key default gen_random_uuid(),
  category_id     uuid not null references item_categories(id) on delete cascade,
  code            text not null,
  label_fr        text not null,
  label_ar        text,
  default_class   pricing_class,
  unique (category_id, code)
);
```

#### Utilisateurs et organisations

```sql
-- Miroir applicatif de auth.users
create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  phone           text not null,
  phone_verified  boolean not null default false,
  full_name       text,
  display_name    text,
  avatar_url      text,
  country_code    char(2) not null default 'TD' references countries(code),
  city_id         uuid references cities(id),
  locale          text not null default 'fr',
  app_role        app_role not null default 'USER',
  trust_score     int not null default 50 check (trust_score between 0 and 100),
  is_samaritan    boolean not null default false,     -- badge « Samaritain » (§10 du v2)
  is_blocked      boolean not null default false,
  blocked_reason  text,
  last_seen_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create table organizations (
  id              uuid primary key default gen_random_uuid(),
  country_code    char(2) not null default 'TD' references countries(code),
  name            text not null,
  slug            text not null unique,
  logo_url        text,
  phone           text,
  email           text,
  address         text,
  city_id         uuid references cities(id),
  sector          text,                               -- 'airport','hotel','retail'…
  tax_id          text,
  is_verified     boolean not null default false,
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create table organization_locations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,                      -- « N'Djamena Centre »
  city_id         uuid references cities(id),
  neighborhood_id uuid references neighborhoods(id),
  address         text,
  lat             numeric(9,6),
  lng             numeric(9,6),
  opening_hours   jsonb,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create table organization_users (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  location_id     uuid references organization_locations(id),  -- null = tous les sites
  role            org_role not null default 'AGENT',
  invited_by      uuid references profiles(id),
  accepted_at     timestamptz,
  created_at      timestamptz not null default now(),
  unique (organization_id, user_id, location_id)
);
```

#### Objets

```sql
-- ---------- Objets perdus ----------
create table lost_items (
  id                  uuid primary key default gen_random_uuid(),
  public_ref          text not null unique,          -- 'LG-L-2026-000123'
  owner_id            uuid not null references profiles(id) on delete cascade,

  category_id         uuid not null references item_categories(id),
  item_type_id        uuid references item_types(id),
  title               text not null,                 -- « Carte d'identité »
  description         text,
  brand               text,
  model               text,
  color               text,
  distinctive_marks   text,

  -- Localisation
  country_code        char(2) not null default 'TD' references countries(code),
  city_id             uuid references cities(id),
  neighborhood_id     uuid references neighborhoods(id),
  place_id            uuid references places(id),
  place_type          text references place_types(code),
  lat                 numeric(9,6),
  lng                 numeric(9,6),

  lost_at             timestamptz not null,
  lost_precision      text,                          -- 'day' | 'morning' | 'approx'

  -- Tarification
  declared_value_xaf  bigint check (declared_value_xaf >= 0),
  pricing_class       pricing_class not null,        -- calculé au moment de la déclaration
  class_source        text not null default 'CATEGORY', -- 'CATEGORY' | 'DECLARED_VALUE' | 'MANUAL'

  status              lost_status not null default 'DECLARED',
  is_public           boolean not null default true,
  contact_phone       text,                          -- jamais exposé publiquement
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);

create index lost_items_owner_idx    on lost_items (owner_id) where deleted_at is null;
create index lost_items_city_idx     on lost_items (city_id, lost_at desc) where deleted_at is null;
create index lost_items_category_idx on lost_items (category_id);
create index lost_items_status_idx   on lost_items (status) where deleted_at is null;
create index lost_items_title_trgm   on lost_items using gin (title gin_trgm_ops);
create index lost_items_desc_trgm    on lost_items using gin (description gin_trgm_ops);

-- ---------- Objets trouvés ----------
create table found_items (
  id                  uuid primary key default gen_random_uuid(),
  public_ref          text not null unique,          -- 'LG-2026-000291'
  finder_id           uuid references profiles(id),  -- null si déclaré par une organisation
  organization_id     uuid references organizations(id),
  location_id         uuid references organization_locations(id),

  category_id         uuid not null references item_categories(id),
  item_type_id        uuid references item_types(id),
  title               text not null,
  description         text,
  brand               text,
  model               text,
  color               text,
  distinctive_marks   text,

  country_code        char(2) not null default 'TD' references countries(code),
  city_id             uuid references cities(id),
  neighborhood_id     uuid references neighborhoods(id),
  place_id            uuid references places(id),
  place_type          text references place_types(code),
  lat                 numeric(9,6),
  lng                 numeric(9,6),

  found_at            timestamptz not null,

  -- Stockage physique (§22 du plan v2)
  building            text,
  floor               text,
  storage_zone        text,
  cabinet             text,
  locker              text,
  internal_ref        text,
  internal_notes      text,                          -- jamais visible du public

  status              item_status not null default 'FOUND',
  pricing_class       pricing_class not null,
  is_public           boolean not null default true,
  is_sensitive_doc    boolean not null default false,
  qr_code             text unique,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz,

  constraint found_item_origin check (finder_id is not null or organization_id is not null)
);

create index found_items_org_idx      on found_items (organization_id, status) where deleted_at is null;
create index found_items_city_idx     on found_items (city_id, found_at desc) where deleted_at is null;
create index found_items_category_idx on found_items (category_id);
create index found_items_status_idx   on found_items (status) where deleted_at is null;
create index found_items_title_trgm   on found_items using gin (title gin_trgm_ops);

-- ---------- Photos ----------
create table item_photos (
  id              uuid primary key default gen_random_uuid(),
  item_kind       text not null check (item_kind in ('lost','found')),
  item_id         uuid not null,
  storage_path    text not null,                     -- bucket 'items'
  width           int,
  height          int,
  bytes           int,
  blurhash        text,                              -- affichage progressif sur réseau faible
  is_blurred      boolean not null default false,    -- floutage automatique (§12 du v2)
  blur_regions    jsonb,                             -- [{x,y,w,h,label}]
  position        int not null default 0,
  created_at      timestamptz not null default now()
);
create index item_photos_item_idx on item_photos (item_kind, item_id, position);

-- ---------- Attributs libres ----------
create table item_attributes (
  id              uuid primary key default gen_random_uuid(),
  item_kind       text not null check (item_kind in ('lost','found')),
  item_id         uuid not null,
  key             text not null,
  value           text,
  is_private      boolean not null default false      -- sert à la vérification, jamais publié
);
create index item_attributes_item_idx on item_attributes (item_kind, item_id);

-- ---------- Historique de statut ----------
create table item_status_history (
  id              bigserial primary key,
  item_kind       text not null check (item_kind in ('lost','found')),
  item_id         uuid not null,
  from_status     text,
  to_status       text not null,
  actor_id        uuid references profiles(id),
  note            text,
  created_at      timestamptz not null default now()
);
```

#### Correspondances et vérification

```sql
create table matches (
  id                  uuid primary key default gen_random_uuid(),
  lost_item_id        uuid not null references lost_items(id) on delete cascade,
  found_item_id       uuid not null references found_items(id) on delete cascade,

  score               numeric(5,2) not null check (score between 0 and 100),
  level               match_level not null,
  breakdown           jsonb not null,                -- {type:0.30, place:0.25, date:0.15, …}
  algorithm_version   text not null default 'v1',

  status              match_status not null default 'NEW',
  notified_owner_at   timestamptz,
  notified_finder_at  timestamptz,
  expires_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  unique (lost_item_id, found_item_id)
);

create index matches_lost_idx   on matches (lost_item_id, score desc);
create index matches_found_idx  on matches (found_item_id, score desc);
create index matches_status_idx on matches (status, created_at desc);

-- Questions de vérification de propriété (§7 du plan v2)
create table verification_questions (
  id              uuid primary key default gen_random_uuid(),
  category_id     uuid references item_categories(id),
  code            text not null,                     -- 'wallet_contents','id_birthdate'…
  label_fr        text not null,
  label_ar        text,
  input_type      text not null default 'text',      -- 'text' | 'date' | 'choice' | 'photo'
  choices         jsonb,
  weight          int not null default 1,
  is_required     boolean not null default false,
  unique (category_id, code)
);

create table claims (
  id                  uuid primary key default gen_random_uuid(),
  match_id            uuid not null references matches(id) on delete cascade,
  claimant_id         uuid not null references profiles(id),
  status              claim_status not null default 'DRAFT',
  score               int not null default 0,        -- 0..100, calculé depuis les réponses
  reviewed_by         uuid references profiles(id),
  reviewed_at         timestamptz,
  rejection_reason    text,
  attempt_count       int not null default 0,        -- anti-fraude : limite les essais
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (match_id, claimant_id)
);

create table verification_answers (
  id              uuid primary key default gen_random_uuid(),
  claim_id        uuid not null references claims(id) on delete cascade,
  question_id     uuid not null references verification_questions(id),
  answer          text,
  answer_photo    text,
  is_correct      boolean,                           -- évalué par le trouveur ou un modérateur
  points_awarded  int not null default 0,
  created_at      timestamptz not null default now()
);
```

#### Paiement, tarification, registre

```sql
-- ---------- Règles de prix versionnées (§2.7 du plan v2, onglet « Parametres ») ----------
create table pricing_rules (
  id                  uuid primary key default gen_random_uuid(),
  country_code        char(2) not null references countries(code),
  currency            char(3) not null default 'XAF',
  version             int not null,
  is_active           boolean not null default false,

  -- Frais de base par classe
  fee_c1              int not null default 300,
  fee_c2              int not null default 700,
  fee_c3              int not null default 1200,
  fee_c4              int not null default 3000,
  -- C5 : pourcentage borné
  fee_c5_rate         numeric(5,4) not null default 0.0100,
  fee_c5_floor        int not null default 5000,
  fee_c5_ceiling      int not null default 25000,

  -- Récompense trouveur
  reward_c1           int not null default 100,
  reward_c2           int not null default 250,
  reward_c3           int not null default 400,
  reward_c4           int not null default 900,
  reward_c5_rate      numeric(5,4) not null default 0.3000,

  -- Options
  urgent_rate         numeric(5,4) not null default 0.5000,  -- +50 % des frais de base
  conciergerie_fee    int not null default 1000,
  delivery_fee        int not null default 2500,             -- proxy — à confirmer par devis
  delivery_is_proxy   boolean not null default true,

  -- Fiscalité
  vat_rate            numeric(5,4) not null default 0.1800,  -- 18 % — à valider par un comptable
  commission_is_ht    boolean not null default true,

  -- Bornes de classe par valeur déclarée
  class_upgrade_thresholds jsonb not null default
    '{"C5": 1000000}'::jsonb,

  effective_from      timestamptz not null default now(),
  effective_to        timestamptz,
  created_by          uuid references profiles(id),
  created_at          timestamptz not null default now(),

  unique (country_code, version)
);

-- Une seule version active par pays
create unique index pricing_rules_one_active
  on pricing_rules (country_code) where is_active;

-- ---------- Devis figé (immuable) ----------
create table price_quotes (
  id                  uuid primary key default gen_random_uuid(),
  public_ref          text not null unique,          -- 'LG-Q-00091'
  claim_id            uuid references claims(id),
  match_id            uuid references matches(id),
  payer_id            uuid not null references profiles(id),

  pricing_rule_id     uuid not null references pricing_rules(id),
  pricing_rule_version int not null,

  pricing_class       pricing_class not null,
  declared_value_xaf  bigint,

  base_fee            int not null,
  urgent_fee          int not null default 0,
  conciergerie_fee    int not null default 0,
  delivery_fee        int not null default 0,
  community_bonus     int not null default 0,
  total_amount        int not null,
  currency            char(3) not null default 'XAF',

  reward_amount       int not null,
  liguita_commission  int not null,
  delivery_payout     int not null default 0,
  vat_amount          int not null default 0,

  options             pricing_option[] not null default '{}',
  breakdown           jsonb not null,                -- détail ligne à ligne pour l'affichage
  covered_by_org_id   uuid references organizations(id),  -- restitutions « frais offerts » (P1)

  status              text not null default 'OPEN',  -- 'OPEN' | 'CONSUMED' | 'EXPIRED' | 'VOID'
  expires_at          timestamptz not null,
  created_at          timestamptz not null default now(),
  consumed_at         timestamptz
);
create index price_quotes_payer_idx on price_quotes (payer_id, created_at desc);

-- ---------- Transactions ----------
create table transactions (
  id                  uuid primary key default gen_random_uuid(),
  public_ref          text not null unique,          -- 'LG-PAY-00001'
  quote_id            uuid not null references price_quotes(id),
  payer_id            uuid not null references profiles(id),
  match_id            uuid references matches(id),

  amount              int not null,
  currency            char(3) not null default 'XAF',
  provider            text not null,                 -- 'airtel','moov','gimac','cash'
  provider_reference  text,
  provider_payload    jsonb,

  status              payment_status not null default 'INITIATED',
  failure_reason      text,
  idempotency_key     text not null unique,

  initiated_at        timestamptz not null default now(),
  completed_at        timestamptz,
  refunded_at         timestamptz,
  refund_amount       int not null default 0,

  -- Répartition figée au paiement
  reward_amount       int not null,
  liguita_commission  int not null,
  delivery_payout     int not null default 0,

  created_at          timestamptz not null default now()
);
create index transactions_payer_idx  on transactions (payer_id, created_at desc);
create index transactions_status_idx on transactions (status, created_at desc);

-- ---------- Récompenses ----------
create table rewards (
  id                  uuid primary key default gen_random_uuid(),
  transaction_id      uuid not null references transactions(id) on delete cascade,
  beneficiary_id      uuid not null references profiles(id),
  amount              int not null,
  currency            char(3) not null default 'XAF',
  status              reward_status not null default 'PENDING',
  mode                text not null default 'STANDARD', -- 'STANDARD' | 'SOLIDAIRE' | 'CREDIT'
  donation_org_id     uuid references organizations(id),
  payout_provider     text,
  payout_reference    text,
  reserved_at         timestamptz,
  released_at         timestamptz,
  created_at          timestamptz not null default now()
);
create index rewards_beneficiary_idx on rewards (beneficiary_id, status);

-- ---------- Écritures comptables (ledger append-only, §32 du plan v2) ----------
create table ledger_entries (
  id                  bigserial primary key,
  transaction_id      uuid references transactions(id),
  account             text not null,                 -- 'CUSTOMER','LIGUITA','FINDER','PARTNER','VAT'
  direction           text not null check (direction in ('DEBIT','CREDIT')),
  amount              int not null check (amount > 0),
  currency            char(3) not null default 'XAF',
  label               text not null,
  created_at          timestamptz not null default now()
);
create index ledger_transaction_idx on ledger_entries (transaction_id);

-- ---------- Abonnements (P1) ----------
create table subscription_plans (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,              -- 'STARTER','BUSINESS','ENTERPRISE'
  name            text not null,
  price_monthly   int,                               -- null = sur devis
  currency        char(3) not null default 'XAF',
  max_users       int,
  max_locations   int,
  max_items       int,
  included_returns int,                              -- restitutions « frais offerts » (§25 du v2)
  features        jsonb not null default '{}'::jsonb,
  is_active       boolean not null default true
);

create table subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references organizations(id) on delete cascade,
  plan_id             uuid not null references subscription_plans(id),
  status              subscription_status not null default 'TRIAL',
  period_start        date not null,
  period_end          date not null,
  returns_used        int not null default 0,
  provider            text,
  provider_reference  text,
  created_at          timestamptz not null default now()
);
```

#### Mise en relation, notifications, modération

```sql
create table conversations (
  id                  uuid primary key default gen_random_uuid(),
  match_id            uuid not null references matches(id) on delete cascade,
  owner_id            uuid not null references profiles(id),
  finder_id           uuid not null references profiles(id),
  transaction_id      uuid references transactions(id),
  status              text not null default 'OPEN',  -- 'OPEN' | 'RETURN_PENDING' | 'RETURNED' | 'CLOSED' | 'DISPUTED'
  return_place        text,
  return_scheduled_at timestamptz,
  returned_at         timestamptz,
  owner_confirmed_at  timestamptz,
  finder_confirmed_at timestamptz,
  created_at          timestamptz not null default now(),
  unique (match_id)
);

create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id       uuid not null references profiles(id),
  body            text not null,
  attachment_path text,
  is_system       boolean not null default false,    -- messages automatiques Liguita
  flagged         boolean not null default false,    -- tentative de sortie de plateforme
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index messages_conversation_idx on messages (conversation_id, created_at);

create table notifications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  kind            text not null,                     -- 'MATCH_FOUND','PAYMENT_CONFIRMED'…
  channel         text not null,                     -- 'WEB','SMS','WHATSAPP','EMAIL','PUSH'
  title           text not null,
  body            text,
  payload         jsonb,
  sent_at         timestamptz,
  read_at         timestamptz,
  error           text,
  created_at      timestamptz not null default now()
);
create index notifications_user_idx on notifications (user_id, created_at desc);

-- Recherches sauvegardées + alertes (Innovation #2, P0)
create table saved_searches (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references profiles(id) on delete cascade,
  label               text,
  query               text,
  filters             jsonb not null default '{}'::jsonb,
  category_id         uuid references item_categories(id),
  city_id             uuid references cities(id),
  neighborhood_id     uuid references neighborhoods(id),
  date_from           date,
  date_to             date,
  channels            text[] not null default '{WEB}',
  is_active           boolean not null default true,
  last_run_at         timestamptz,
  last_notified_at    timestamptz,
  created_at          timestamptz not null default now()
);
create index saved_searches_active_idx on saved_searches (is_active, last_run_at);

create table reports (
  id              uuid primary key default gen_random_uuid(),
  reporter_id     uuid not null references profiles(id),
  target_kind     text not null,                     -- 'item','user','message','transaction'
  target_id       uuid not null,
  reason          report_reason not null,
  details         text,
  status          text not null default 'OPEN',      -- 'OPEN','REVIEWING','RESOLVED','DISMISSED'
  resolved_by     uuid references profiles(id),
  resolution      text,
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz
);

create table fraud_cases (
  id              uuid primary key default gen_random_uuid(),
  subject_user_id uuid references profiles(id),
  kind            report_reason,
  signals         jsonb not null default '{}'::jsonb,
  risk_score      int not null default 0,
  status          text not null default 'OPEN',
  assigned_to     uuid references profiles(id),
  resolution      text,
  created_at      timestamptz not null default now(),
  closed_at       timestamptz
);

create table audit_logs (
  id              bigserial primary key,
  actor_id        uuid references profiles(id),
  actor_role      app_role,
  action          text not null,                     -- 'payment.refund','item.blur'…
  target_kind     text,
  target_id       uuid,
  before          jsonb,
  after           jsonb,
  ip              inet,
  user_agent      text,
  created_at      timestamptz not null default now()
);
create index audit_logs_actor_idx on audit_logs (actor_id, created_at desc);
create index audit_logs_target_idx on audit_logs (target_kind, target_id);

-- Consentements et journal des traitements (conformité loi 007/PR/2015)
create table consents (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  purpose         text not null,                     -- 'MATCHING','NOTIFICATIONS','MARKETING'
  granted         boolean not null default false,
  policy_version  text not null,
  ip              inet,
  created_at      timestamptz not null default now()
);

create table data_access_logs (
  id              bigserial primary key,
  actor_id        uuid references profiles(id),
  subject_id      uuid references profiles(id),
  data_kind       text not null,                     -- 'ID_DOCUMENT','PHONE','ADDRESS'
  reason          text,
  created_at      timestamptz not null default now()
);

-- Événements analytiques (funnel produit)
create table analytics_events (
  id              bigserial primary key,
  user_id         uuid references profiles(id),
  anonymous_id    text,
  name            text not null,
  properties      jsonb not null default '{}'::jsonb,
  session_id      text,
  created_at      timestamptz not null default now()
);
create index analytics_events_name_idx on analytics_events (name, created_at desc);
```

### 4.4 Extensions prévues (P1 → P3)

| Priorité | Tables à ajouter | Objet |
|---|---|---|
| P1 | `qr_codes`, `qr_scans` | QR Business et QR personnels (§23, §28 du v2) |
| P1 | `restitution_certificates` | Attestation numérique de restitution (Innovation #3) |
| P1 | `trust_events`, `badges`, `user_badges` | Score de confiance et badges (Innovation #4) |
| P1 | `whatsapp_sessions`, `whatsapp_messages` | Bot WhatsApp officiel (Innovation #5) |
| P1 | `subscription_invoices` | Facturation des abonnements |
| P1 | `delivery_partners`, `deliveries`, `pickup_points` | Livraison et points relais (§27, Innovation #9) |
| P2 | `vault_items`, `vault_photos` | Coffre Liguita — inventaire préventif (Innovation #8) |
| P2 | `conciergerie_cases` | Conciergerie documents (Innovation #10) |
| P2 | `api_keys`, `api_request_logs` | API Business (§46 du v2) |
| P3 | `item_embeddings` (`vector(1536)`) | Matching sémantique (§30 du v2) |
| P3 | `photo_hashes`, `photo_embeddings` | Appariement visuel (Phase 3) |
| P3 | `ussd_sessions`, `voice_logs` | Canaux hors internet (Innovation #11) |

### 4.5 Sécurité au niveau des lignes (RLS)

RLS activée sur **toutes** les tables. Principes :

1. Par défaut, **aucun accès**. Chaque politique est explicite.
2. Un particulier ne voit ses `lost_items` que s'il en est le propriétaire. Un objet trouvé est visible par tous **via une vue anonymisée**, jamais via la table.
3. Les données sensibles (téléphone, documents) ne sont **jamais** dans la vue publique.
4. Un utilisateur business ne voit que les objets de ses établissements, selon son rôle.
5. Le service role contourne RLS : il n'est utilisé que dans les workers et l'admin serveur, avec journalisation obligatoire.

```sql
-- ---------- Vue publique anonymisée : seule surface exposée au grand public ----------
create view public_found_items as
select
  f.id,
  f.public_ref,
  f.category_id,
  f.title,
  f.brand,
  f.color,
  f.city_id,
  f.neighborhood_id,
  f.place_type,
  f.found_at,
  f.status,
  f.pricing_class,
  (select count(*) from item_photos p where p.item_kind='found' and p.item_id=f.id) as photo_count,
  -- Aucune donnée personnelle, aucun emplacement physique, aucune note interne
  null::text as description_preview
from found_items f
where f.deleted_at is null
  and f.is_public
  and f.status <> 'ARCHIVED';

-- ---------- RLS lost_items ----------
alter table lost_items enable row level security;

create policy lost_select_own on lost_items
  for select using (
    owner_id = auth.uid()
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.app_role in ('MODERATOR','ADMIN')
    )
  );

create policy lost_insert_own on lost_items
  for insert with check (owner_id = auth.uid());

create policy lost_update_own on lost_items
  for update using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy lost_delete_own on lost_items
  for delete using (owner_id = auth.uid() and status in ('DECLARED','SEARCHING'));

-- ---------- RLS found_items ----------
alter table found_items enable row level security;

-- Lecture : le trouveur, l'organisation propriétaire, les modérateurs.
-- Le public passe par la vue public_found_items.
create policy found_select_scoped on found_items
  for select using (
    finder_id = auth.uid()
    or exists (
      select 1 from organization_users ou
      where ou.organization_id = found_items.organization_id
        and ou.user_id = auth.uid()
        and ou.accepted_at is not null
    )
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.app_role in ('MODERATOR','ADMIN')
    )
  );

create policy found_insert_self on found_items
  for insert with check (finder_id = auth.uid());

create policy found_insert_org on found_items
  for insert with check (
    exists (
      select 1 from organization_users ou
      where ou.organization_id = found_items.organization_id
        and ou.user_id = auth.uid()
        and ou.role in ('OWNER','ADMIN','MANAGER','AGENT')
        and ou.accepted_at is not null
        and (ou.location_id is null or ou.location_id = found_items.location_id)
    )
  );

-- ---------- RLS matches ----------
alter table matches enable row level security;

create policy match_select_parties on matches
  for select using (
    exists (select 1 from lost_items l where l.id = matches.lost_item_id and l.owner_id = auth.uid())
    or exists (select 1 from found_items f where f.id = matches.found_item_id and f.finder_id = auth.uid())
    or exists (
      select 1 from organization_users ou
      join found_items f on f.id = matches.found_item_id
      where ou.organization_id = f.organization_id
        and ou.user_id = auth.uid() and ou.accepted_at is not null
    )
    or exists (select 1 from profiles p where p.id = auth.uid() and p.app_role in ('MODERATOR','ADMIN'))
  );

-- ---------- RLS transactions : lecture seule pour le payeur ----------
alter table transactions enable row level security;

create policy tx_select_own on transactions
  for select using (
    payer_id = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.app_role in ('MODERATOR','ADMIN'))
  );
-- Aucune politique INSERT/UPDATE/DELETE : seules les fonctions serveur écrivent.

-- ---------- RLS profiles ----------
alter table profiles enable row level security;

create policy profile_select_self on profiles
  for select using (
    id = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.app_role in ('MODERATOR','ADMIN'))
  );

create policy profile_update_self on profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and app_role = (select app_role from profiles where id = auth.uid()));
-- ↑ empêche un utilisateur de s'octroyer le rôle ADMIN

-- ---------- RLS organizations ----------
alter table organizations enable row level security;

create policy org_select_members on organizations
  for select using (
    exists (
      select 1 from organization_users ou
      where ou.organization_id = organizations.id
        and ou.user_id = auth.uid() and ou.accepted_at is not null
    )
    or exists (select 1 from profiles p where p.id = auth.uid() and p.app_role in ('MODERATOR','ADMIN'))
  );
```

**Tests RLS obligatoires en CI.** Un jeu de tests crée trois utilisateurs (propriétaire A, propriétaire B, agent d'organisation) et vérifie qu'aucun ne peut lire les données d'un autre. Ces tests sont **bloquants** : une politique RLS trop permissive est le risque de sécurité numéro un de ce produit.

### 4.6 Index et performance

| Table | Index | Raison |
|---|---|---|
| `found_items` | `(city_id, found_at desc)` partiel sur `deleted_at is null` | Requête principale de la page `/rechercher` |
| `found_items` | GIN trigramme sur `title`, `description` | Recherche floue « carte » → « carte nationale » |
| `lost_items` | `(owner_id)` partiel | Tableau de bord « mes objets perdus » |
| `matches` | `(lost_item_id, score desc)` | Affichage des correspondances triées |
| `saved_searches` | `(is_active, last_run_at)` | Balayage des alertes |
| `analytics_events` | `(name, created_at desc)` | Calcul du funnel |
| `transactions` | `(status, created_at desc)` | Rapprochement et supervision |

**Recherche plein texte.** En complément du trigramme, une colonne générée :

```sql
alter table found_items
  add column search_vector tsvector
  generated always as (
    to_tsvector('french',
      coalesce(title,'') || ' ' || coalesce(description,'') || ' ' ||
      coalesce(brand,'') || ' ' || coalesce(color,''))
  ) stored;

create index found_items_search_idx on found_items using gin (search_vector);
```

`french` est la configuration de recherche à utiliser pour la langue principale ; `simple` sera utilisée pour l'arabe en P2 (pas de stemming arabe natif dans PostgreSQL).

### 4.7 Durées de conservation et purge

Conformément à la loi tchadienne n° 007/PR/2015 et à son décret n° 075/PR/2019 (§35 du plan v2), la minimisation et la limitation de durée sont des obligations, pas des options.

| Donnée | Durée | Action à l'échéance |
|---|---|---|
| Objet perdu non résolu | 12 mois après `lost_at` | Statut `EXPIRED`, données personnelles anonymisées, ligne conservée pour statistiques |
| Objet trouvé non restitué | 12 mois après `found_at` | Statut `ARCHIVED`, photo conservée sans données personnelles |
| Photos d'objets | 12 mois après clôture | Suppression du stockage |
| Pièces justificatives de vérification | 3 mois après clôture du dossier | Suppression |
| Messages de conversation | 24 mois | Anonymisation du contenu, conservation des métadonnées |
| Transactions et écritures comptables | **10 ans** (obligation comptable) | Conservation |
| Journaux d'audit | 5 ans | Conservation |
| Journaux d'accès aux données sensibles | 3 ans | Conservation |
| Événements analytiques | 25 mois | Agrégation puis suppression |
| Comptes inactifs | 24 mois | Notification puis suppression |
| Consentements | Durée du compte + 5 ans | Conservation (preuve) |

**Implémentation** : tâche planifiée `retention-purge` quotidienne (`pg_cron`), qui écrit dans `audit_logs` chaque purge effectuée. Un test vérifie que la tâche est idempotente.

**Droits des personnes** : depuis `/compte/securite`, l'utilisateur peut demander l'export de ses données (JSON, généré sous 30 jours) et la suppression de son compte. La suppression est **logique** pendant 30 jours (fenêtre de rétractation), puis physique, sauf pour les transactions comptables.

---

## 5. Moteur de tarification

> **Principe fondateur (§2.1 et §52 du plan v2) :** le montant est **toujours** affiché avant le paiement, figé dans un devis immuable, et **jamais** dissuasif au point de décourager une restitution.

### 5.1 Grille canonique

Cette grille est la **référence unique**. Elle remplace toute autre valeur trouvée dans les maquettes (cf. ADR-004).

| Classe | Types d'objets | Frais de base | Récompense trouveur | Commission Liguita |
|---|---|---:|---:|---:|
| **C1** | CNI, passeport, permis, carte d'étudiant, carte professionnelle, diplômes, carnets de santé | **300 FCFA** | 100 FCFA | 200 FCFA |
| **C2** | Portefeuille, sac, clés, lunettes, vêtements, livres, bijoux fantaisie | **700 FCFA** | 250 FCFA | 450 FCFA |
| **C3** | Téléphone entrée/milieu de gamme, tablette, ordinateur, écouteurs, montre connectée, appareil photo, vélo | **1 200 FCFA** | 400 FCFA | 800 FCFA |
| **C4** | Smartphone haut de gamme, bijoux précieux, sacs de marque, matériel professionnel, instruments | **3 000 FCFA** | 900 FCFA | 2 100 FCFA |
| **C5** | Valeur déclarée > 1 000 000 FCFA, véhicules, lots d'entreprise | **1 % de la valeur déclarée**, borné à **5 000 – 25 000 FCFA** | 30 % des frais | 70 % des frais |

**Options**

| Option | Montant | Destinataire du montant |
|---|---|---|
| Traitement urgent | **+50 % des frais de base** | **Liguita** (la récompense du trouveur reste celle de sa classe) |
| Conciergerie documents | **1 000 FCFA** | Liguita |
| Livraison urbaine | **2 500 FCFA** (proxy — à confirmer par devis partenaire) | Partenaire de livraison |
| Bonus communautaire | montant libre saisi par le propriétaire | **100 % au trouveur**, aucune commission Liguita |

> ⚠️ **Point à trancher avant le Sprint 6** : le montant de livraison (2 500 FCFA) est un **proxy**, explicitement signalé comme tel dans l'onglet « Calibrage marché » du xlsx. Il doit être remplacé par un devis réel de Nimvi Express, Kimre ou Speed Delivery. Tant que ce n'est pas fait, l'option livraison reste désactivée en production.

### 5.2 Classement automatique

```text
1. classe = item_categories.default_class          (ex. « Téléphone entrée de gamme » → C3)
2. si valeur déclarée > 1 000 000 FCFA            → C5
3. sinon, tant que valeur déclarée > item_categories.max_value_xaf
   et classe ≠ C5                                  → classe = classe + 1
4. jamais de déclassement automatique
5. cas ambigu → classe par défaut de la catégorie (la plus basse)
6. déclassement manuel possible uniquement par un modérateur, avec motif journalisé
```

La règle 3 s'appuie sur `max_value_xaf` **par catégorie**, et non sur une borne globale : le calibrage tchadien montre que la frontière C3→C4 est à ~200 000 FCFA pour un smartphone mais à ~600 000 FCFA pour un ordinateur portable. Une borne unique serait fausse dans les deux cas.

### 5.3 Algorithme exact

**Politique d'arrondi** — tous les montants sont des entiers de FCFA :

| Élément | Arrondi |
|---|---|
| C1 à C4 | Aucun (constantes) |
| Frais C5 | Au multiple de 100 FCFA le plus proche |
| Récompense C5 | Au multiple de 100 FCFA le plus proche |
| Supplément urgence | Au multiple de 50 FCFA le plus proche |
| TVA extraite | À l'entier le plus proche |

**Formules**

```text
base            = classe = C5
                    ? clamp(round100(valeur_déclarée × 1 %), 5 000, 25 000)
                    : frais_de_base[classe]

urgence         = option_urgente ? round50(base × 50 %) : 0
conciergerie    = option_conciergerie ? 1 000 : 0
livraison       = option_livraison ? frais_livraison_pays : 0
bonus           = bonus_communautaire_saisi   (0 par défaut)

total_à_payer   = base + urgence + conciergerie + livraison + bonus

récompense      = classe = C5
                    ? round100(base × 30 %)
                    : récompense_de_base[classe]

commission_liguita = base + urgence + conciergerie − récompense
partenaire         = livraison
versement_trouveur = récompense + bonus

TVA_extraite    = commission_liguita − round(commission_liguita ÷ 1,18)
```

**Vérification d'invariants** — assertion à exécuter après chaque calcul, en production :

```text
commission_liguita ≥ 0
versement_trouveur + commission_liguita + partenaire = total_à_payer
récompense > 0
```

Si une assertion échoue, la transaction est bloquée et une alerte est levée. Une commission négative signifierait qu'une option mal configurée fait payer Liguita pour le compte du trouveur — c'est un bug critique, pas un cas limite.

### 5.4 Implémentation TypeScript

`packages/core/src/pricing/` — **aucune dépendance à Supabase, aucune I/O, 100 % testable.**

```ts
// packages/core/src/pricing/types.ts
export type PricingClass = 'C1' | 'C2' | 'C3' | 'C4' | 'C5';
export type PricingOptionCode = 'URGENT' | 'CONCIERGERIE' | 'DELIVERY';

export interface PricingRule {
  id: string;
  version: number;
  countryCode: string;
  currency: string;
  fees: Record<PricingClass, number>;
  rewards: Record<PricingClass, number>;
  c5: { rate: number; floor: number; ceiling: number; rewardRate: number };
  urgentRate: number;
  conciergerieFee: number;
  deliveryFee: number;
  deliveryIsProxy: boolean;
  vatRate: number;
  commissionIsHt: boolean;
  classUpgradeThresholds: Record<PricingClass, number>;
}

export interface CategoryRef {
  id: string;
  defaultClass: PricingClass;
  maxValueXaf: number | null;
}

export interface FeeInput {
  rule: PricingRule;
  category: CategoryRef;
  declaredValueXaf?: number | null;
  options?: PricingOptionCode[];
  communityBonusXaf?: number;
}

export interface FeeBreakdown {
  pricingClass: PricingClass;
  classSource: 'CATEGORY' | 'DECLARED_VALUE' | 'MANUAL';
  baseFee: number;
  urgentFee: number;
  conciergerieFee: number;
  deliveryFee: number;
  communityBonus: number;
  totalAmount: number;
  rewardAmount: number;
  liguitaCommission: number;
  deliveryPayout: number;
  vatAmount: number;
  currency: string;
  ruleId: string;
  ruleVersion: number;
  lines: Array<{ code: string; labelFr: string; amount: number; payee: 'LIGUITA' | 'FINDER' | 'PARTNER' }>;
}
```

```ts
// packages/core/src/pricing/round.ts
const roundTo = (value: number, step: number): number =>
  Math.round(value / step) * step;

export const round100 = (v: number) => roundTo(v, 100);
export const round50  = (v: number) => roundTo(v, 50);
```

```ts
// packages/core/src/pricing/classify.ts
import type { CategoryRef, PricingClass, PricingRule } from './types';

const ORDER: PricingClass[] = ['C1', 'C2', 'C3', 'C4', 'C5'];
const next = (c: PricingClass): PricingClass => ORDER[Math.min(ORDER.indexOf(c) + 1, 4)];

export function resolveClass(
  category: CategoryRef,
  declaredValueXaf: number | null | undefined,
  rule: PricingRule,
): { pricingClass: PricingClass; classSource: 'CATEGORY' | 'DECLARED_VALUE' } {
  if (declaredValueXaf == null || declaredValueXaf <= 0) {
    return { pricingClass: category.defaultClass, classSource: 'CATEGORY' };
  }

  // Règle 2 : seuil C5 absolu
  const c5Threshold = rule.classUpgradeThresholds.C5 ?? 1_000_000;
  if (declaredValueXaf > c5Threshold) {
    return { pricingClass: 'C5', classSource: 'DECLARED_VALUE' };
  }

  // Règle 3 : montée de classe tant que la valeur dépasse le plafond de la catégorie
  let cls = category.defaultClass;
  let upgraded = false;
  while (
    cls !== 'C5' &&
    category.maxValueXaf != null &&
    declaredValueXaf > category.maxValueXaf
  ) {
    cls = next(cls);
    upgraded = true;
  }

  return { pricingClass: cls, classSource: upgraded ? 'DECLARED_VALUE' : 'CATEGORY' };
}
```

```ts
// packages/core/src/pricing/compute.ts
import { resolveClass } from './classify';
import { round50, round100 } from './round';
import type { FeeBreakdown, FeeInput } from './types';

export function computeFee(input: FeeInput): FeeBreakdown {
  const { rule, category, declaredValueXaf, options = [], communityBonusXaf = 0 } = input;
  const has = (o: string) => options.includes(o as never);

  const { pricingClass, classSource } = resolveClass(category, declaredValueXaf, rule);

  // --- Frais de base ---
  let baseFee: number;
  if (pricingClass === 'C5') {
    if (declaredValueXaf == null || declaredValueXaf <= 0) {
      throw new PricingError('C5_REQUIRES_DECLARED_VALUE');
    }
    const raw = declaredValueXaf * rule.c5.rate;
    baseFee = Math.min(Math.max(round100(raw), rule.c5.floor), rule.c5.ceiling);
  } else {
    baseFee = rule.fees[pricingClass];
  }

  // --- Options ---
  const urgentFee = has('URGENT') ? round50(baseFee * rule.urgentRate) : 0;
  const conciergerieFee = has('CONCIERGERIE') ? rule.conciergerieFee : 0;
  const deliveryFee = has('DELIVERY') ? rule.deliveryFee : 0;
  const communityBonus = Math.max(0, Math.trunc(communityBonusXaf));

  // --- Récompense du trouveur ---
  const rewardAmount =
    pricingClass === 'C5'
      ? round100(baseFee * rule.c5.rewardRate)
      : rule.rewards[pricingClass];

  // --- Répartition ---
  const totalAmount = baseFee + urgentFee + conciergerieFee + deliveryFee + communityBonus;
  const liguitaCommission = baseFee + urgentFee + conciergerieFee - rewardAmount;
  const deliveryPayout = deliveryFee;
  const vatAmount = rule.commissionIsHt
    ? liguitaCommission - Math.round(liguitaCommission / (1 + rule.vatRate))
    : 0;

  // --- Invariants : un échec ici est un bug bloquant, pas un cas limite ---
  if (liguitaCommission < 0) throw new PricingError('NEGATIVE_COMMISSION');
  if (rewardAmount <= 0) throw new PricingError('NON_POSITIVE_REWARD');
  if (rewardAmount + communityBonus + liguitaCommission + deliveryPayout !== totalAmount) {
    throw new PricingError('BREAKDOWN_MISMATCH');
  }

  const currency = rule.currency;
  const lines: FeeBreakdown['lines'] = [
    { code: 'BASE',        labelFr: `Classe ${pricingClass} — frais de mise en relation`, amount: baseFee,        payee: 'LIGUITA' },
    ...(urgentFee       ? [{ code: 'URGENT',        labelFr: 'Traitement urgent (+50 %)',  amount: urgentFee,        payee: 'LIGUITA' as const }] : []),
    ...(conciergerieFee ? [{ code: 'CONCIERGERIE',  labelFr: 'Conciergerie documents',      amount: conciergerieFee,  payee: 'LIGUITA' as const }] : []),
    ...(deliveryFee     ? [{ code: 'DELIVERY',      labelFr: 'Livraison',                   amount: deliveryFee,      payee: 'PARTNER' as const }] : []),
    ...(communityBonus  ? [{ code: 'COMMUNITY',     labelFr: 'Bonus communautaire',         amount: communityBonus,   payee: 'FINDER'  as const }] : []),
    { code: 'REWARD', labelFr: 'Dont récompense du trouveur', amount: rewardAmount, payee: 'FINDER' },
  ];

  return {
    pricingClass, classSource,
    baseFee, urgentFee, conciergerieFee, deliveryFee, communityBonus,
    totalAmount, rewardAmount, liguitaCommission, deliveryPayout, vatAmount,
    currency, ruleId: rule.id, ruleVersion: rule.version, lines,
  };
}

export class PricingError extends Error {
  constructor(public code: string) { super(code); this.name = 'PricingError'; }
}
```

### 5.5 Versionnement et immuabilité

- Les règles vivent dans `pricing_rules`, **une seule version active par pays** (index unique partiel).
- Chaque `price_quote` référence `pricing_rule_id` **et** `pricing_rule_version` : même si la grille change demain, un devis émis hier reste auditable et défendable.
- Un `price_quote` passe à `CONSUMED` au paiement. **Aucun `UPDATE` sur les colonnes de montant n'est autorisé** après création — une contrainte de déclencheur le garantit :

```sql
create or replace function prevent_quote_mutation() returns trigger as $$
begin
  if old.base_fee <> new.base_fee
     or old.total_amount <> new.total_amount
     or old.reward_amount <> new.reward_amount
     or old.liguita_commission <> new.liguita_commission then
    raise exception 'Un devis est immuable (price_quotes.id=%)', old.id;
  end if;
  return new;
end; $$ language plpgsql;

create trigger trg_quote_immutable
  before update on price_quotes
  for each row execute function prevent_quote_mutation();
```

- Le devis expire (`expires_at`, 30 minutes par défaut). À expiration, il faut relancer le calcul — ce qui protège contre un utilisateur qui rejouerait un devis ancien après une hausse de tarif.

### 5.6 Rôles des trois tables financières

Le plan v2 (§33) listait `payments`, `transactions` et `rewards` sans définir leur articulation. Clarification retenue :

| Table | Rôle | Cardinalité |
|---|---|---|
| `price_quotes` | **Ce qui est dû.** Devis figé, non payé. | 1 par dossier de réclamation |
| `transactions` | **Ce qui est payé.** Encaissement réel chez un opérateur. | 0..n par devis (un échec puis un succès) |
| `rewards` | **Ce qui revient au trouveur.** Droit de créance, versé après restitution. | 1 par transaction |
| `ledger_entries` | **Écritures comptables.** Append-only, jamais modifié. | n par transaction (partie double) |

Une transaction réussie produit **quatre écritures** :

```text
Transaction #LG-PAY-00001 — classe C3, standard

DEBIT   CUSTOMER      1 200   Frais de mise en relation
CREDIT  LIGUITA         800   Commission
CREDIT  FINDER          400   Récompense réservée
```

Avec traitement urgent :

```text
Transaction #LG-PAY-00002 — classe C3, urgent

DEBIT   CUSTOMER      1 800
CREDIT  LIGUITA       1 400   (800 commission + 600 supplément urgence)
CREDIT  FINDER          400   (inchangé : la récompense suit la classe)
```

Avec livraison :

```text
Transaction #LG-PAY-00003 — classe C3, urgent + livraison

DEBIT   CUSTOMER      4 300
CREDIT  LIGUITA       1 400
CREDIT  FINDER          400
CREDIT  PARTNER       2 500   Partenaire de livraison
```

Avec bonus communautaire de 1 000 FCFA :

```text
Transaction #LG-PAY-00004 — classe C1, bonus 1 000

DEBIT   CUSTOMER      1 300
CREDIT  LIGUITA         200   Aucune commission sur le bonus
CREDIT  FINDER          100   Récompense
CREDIT  FINDER        1 000   Bonus communautaire
```

### 5.7 Tests dorés

Ces 18 cas constituent la **suite de tests de référence**. Toute modification du moteur doit les faire passer sans en modifier aucun. Les valeurs sont dérivées de l'onglet « Exemples chiffrés » du classeur tarifaire.

| # | Classe | Valeur déclarée | Options | Base | Urgence | Concierg. | Livraison | **Total** | Récompense | **Commission** | TVA |
|---|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | C1 | — | — | 300 | 0 | 0 | 0 | **300** | 100 | **200** | 31 |
| 2 | C1 | — | URGENT | 300 | 150 | 0 | 0 | **450** | 100 | **350** | 53 |
| 3 | C1 | — | CONCIERGERIE | 300 | 0 | 1 000 | 0 | **1 300** | 100 | **1 200** | 183 |
| 4 | C1 | — | bonus 1 000 | 300 | 0 | 0 | 0 | **1 300** | 100 | **200** | 31 |
| 5 | C2 | — | — | 700 | 0 | 0 | 0 | **700** | 250 | **450** | 69 |
| 6 | C2 | — | URGENT | 700 | 350 | 0 | 0 | **1 050** | 250 | **800** | 122 |
| 7 | C3 | — | — | 1 200 | 0 | 0 | 0 | **1 200** | 400 | **800** | 122 |
| 8 | C3 | — | URGENT | 1 200 | 600 | 0 | 0 | **1 800** | 400 | **1 400** | 214 |
| 9 | C3 | — | CONCIERGERIE | 1 200 | 0 | 1 000 | 0 | **2 200** | 400 | **1 800** | 275 |
| 10 | C3 | — | DELIVERY | 1 200 | 0 | 0 | 2 500 | **3 700** | 400 | **800** | 122 |
| 11 | C3 | — | URGENT + DELIVERY | 1 200 | 600 | 0 | 2 500 | **4 300** | 400 | **1 400** | 214 |
| 12 | C4 | — | — | 3 000 | 0 | 0 | 0 | **3 000** | 900 | **2 100** | 320 |
| 13 | C4 | — | URGENT | 3 000 | 1 500 | 0 | 0 | **4 500** | 900 | **3 600** | 549 |
| 14 | C5 | 1 500 000 | — | 15 000 | 0 | 0 | 0 | **15 000** | 4 500 | **10 500** | 1 602 |
| 15 | C5 | 1 500 000 | URGENT | 15 000 | 7 500 | 0 | 0 | **22 500** | 4 500 | **18 000** | 2 746 |
| 16 | C5 | 200 000 | — | 5 000 *(plancher)* | 0 | 0 | 0 | **5 000** | 1 500 | **3 500** | 534 |
| 17 | C5 | 5 000 000 | — | 25 000 *(plafond)* | 0 | 0 | 0 | **25 000** | 7 500 | **17 500** | 2 669 |
| 18 | C5 | 1 500 000 | URGENT + CONCIERGERIE + DELIVERY | 15 000 | 7 500 | 1 000 | 2 500 | **26 000** | 4 500 | **19 000** | 2 898 |

**Lecture des cas 8 et 11** : le supplément d'urgence alimente **la commission Liguita**, pas la récompense du trouveur. C'est la règle explicite de l'onglet « Exemples chiffrés ». La récompense suit la classe de l'objet, jamais les options.

**Lecture des cas 16 et 17** : le plancher et le plafond C5 protègent les deux parties — sans plancher, un lot d'entreprise à 200 000 FCFA paierait 2 000 FCFA, moins qu'un téléphone ; sans plafond, un véhicule à 50 000 000 FCFA paierait 500 000 FCFA, ce qui dissuaderait la restitution, contrairement au principe de la §2.2.

---

## 6. Moteur de correspondance

### 6.1 Signaux et pondérations

Repris de la §6 du plan v2, complétés par les règles de traitement des données manquantes.

| Signal | Poids | Justification |
|---|---:|---|
| **Type d'objet** | 30 | Le discriminant le plus fort. Un téléphone ne correspond pas à un portefeuille. |
| **Lieu** | 25 | À N'Djamena, la zone est un indice très fiable. |
| **Date** | 15 | Fenêtre naturelle : un objet trouvé l'est rarement longtemps après la perte. |
| **Couleur** | 10 | Signal fort mais souvent non renseigné. |
| **Marque** | 10 | Très discriminant quand renseigné, souvent absent. |
| **Description** | 10 | Bruité, mais capte les détails inhabituels. |

> **Règle des données manquantes.** Un champ non renseigné vaut **0,5 (neutre)**, jamais 0. Sinon, une annonce pauvre en informations serait mécaniquement pénalisée, alors que c'est le cas le plus fréquent sur le terrain. Une annonce complète doit gagner, pas une annonce vide perdre.

### 6.2 Fonctions de similarité

```text
s_type
  item_type_id identiques                        → 1,00
  category_id identiques                         → 0,60
  catégories sœurs (même parent_id)              → 0,30
  sinon                                          → 0,00

s_lieu
  place_id identiques                            → 1,00
  neighborhood_id identiques                     → 0,70
  city_id identiques                             → 0,40
  même pays, villes différentes                  → 0,10
  sinon                                          → 0,00
  (si les deux lieux sont inconnus              → 0,50)

s_date
  trouvé avant la perte (found_at < lost_at − 1j) → 0,00   (impossible)
  Δ = |jours(found_at − lost_at)|
  max(0, 1 − Δ / 30)                                      (fenêtre 30 jours, paramétrable)

s_couleur
  normalisées identiques                         → 1,00
  l'une des deux inconnue                        → 0,50
  différentes                                    → 0,00

s_marque
  similarity() pg_trgm ≥ 0,80                    → 1,00
  0,50 ≤ similarity() < 0,80                     → 0,60
  l'une des deux inconnue                        → 0,50
  sinon                                          → 0,00

s_description
  les deux vides                                 → 0,50
  l'une vide                                     → 0,30
  sinon max( similarity_trigramme ,
             indice_de_Jaccard(mots_significatifs) )
```

**Normalisation de la couleur.** Une table de correspondance ramène « noir », « Noir », « noire », « black » vers un code canonique (`BLACK`). Sans cela, `s_couleur` est inutilisable. La liste canonique : `BLACK`, `WHITE`, `GREY`, `RED`, `BLUE`, `GREEN`, `YELLOW`, `ORANGE`, `BROWN`, `PINK`, `PURPLE`, `GOLD`, `SILVER`, `BEIGE`, `MULTICOLOR`, `UNKNOWN`.

### 6.3 Calcul du score

```text
score = 100 × Σ ( poids_i × s_i ) / Σ poids_i
```

Les poids somment déjà à 100, donc `score = Σ (poids_i × s_i)`.

| Niveau | Plage | Comportement |
|---|---|---|
| `VERY_LIKELY` | 90 – 100 | Notification immédiate au propriétaire **et** au trouveur |
| `POSSIBLE` | 70 – 89 | Notification immédiate au propriétaire ; au trouveur si l'objet est en stock depuis plus de 7 jours |
| `WEAK` | 55 – 69 | Persisté, visible dans la liste des correspondances, **aucune notification** |
| — | < 55 | **Non persisté** (bruit) |

Le score exact reste **invisible** pour l'utilisateur, conformément à la §6 du plan v2. L'interface affiche un libellé (« Correspondance très probable ») et un badge de pourcentage arrondi à la dizaine — jamais « 92,47 % ».

### 6.4 Implémentation

**Séparation des responsabilités** : le pré-filtrage SQL réduit l'espace de recherche ; le score est calculé en TypeScript, dans `packages/core`, où il est testable sans base de données.

```sql
-- Pré-filtrage : candidats pour un objet trouvé nouvellement publié
create or replace function match_candidates_for_found(p_found_id uuid, p_window_days int default 90)
returns table (lost_item_id uuid)
language sql stable as $$
  select l.id
  from lost_items l
  join found_items f on f.id = p_found_id
  where l.deleted_at is null
    and l.status in ('DECLARED','SEARCHING')
    and l.country_code = f.country_code
    and (l.category_id = f.category_id or l.item_type_id = f.item_type_id)
    and l.lost_at between f.found_at - (p_window_days || ' days')::interval
                      and f.found_at + interval '1 day'
    and not exists (
      select 1 from matches m
      where m.lost_item_id = l.id and m.found_item_id = f.id
    );
$$;
```

Le même pré-filtrage existe en miroir pour un objet perdu nouvellement déclaré (`match_candidates_for_lost`). La logique de filtrage est volontairement **symétrique** : un objet trouvé publié après une perte et un objet perdu déclaré après une trouvaille doivent produire la même correspondance.

```ts
// packages/core/src/matching/score.ts
import type { MatchBreakdown, MatchLevel } from './types';

export const WEIGHTS = {
  type: 30, place: 25, date: 15, color: 10, brand: 10, description: 10,
} as const;

export const NEUTRAL = 0.5;
const DATE_WINDOW_DAYS = 30;

export interface LostSide {
  itemTypeId: string | null; categoryId: string; parentCategoryId: string | null;
  placeId: string | null; neighborhoodId: string | null; cityId: string | null; countryCode: string;
  lostAt: Date; colorCode: string | null; brand: string | null; description: string | null;
}
export interface FoundSide extends Omit<LostSide, 'lostAt'> { foundAt: Date }

export function scoreMatch(lost: LostSide, found: FoundSide): { score: number; level: MatchLevel; breakdown: MatchBreakdown } {
  const type = sType(lost, found);
  const place = sPlace(lost, found);
  const date = sDate(lost.lostAt, found.foundAt);
  const color = sColor(lost.colorCode, found.colorCode);
  const brand = sBrand(lost.brand, found.brand);
  const description = sDescription(lost.description, found.description);

  const breakdown: MatchBreakdown = { type, place, date, color, brand, description };

  const score = Math.round(
    (WEIGHTS.type * type + WEIGHTS.place * place + WEIGHTS.date * date +
     WEIGHTS.color * color + WEIGHTS.brand * brand + WEIGHTS.description * description) * 100
  ) / 100;

  const level: MatchLevel = score >= 90 ? 'VERY_LIKELY' : score >= 70 ? 'POSSIBLE' : 'WEAK';
  return { score, level, breakdown };
}

export function sType(l: LostSide, f: FoundSide): number {
  if (l.itemTypeId && l.itemTypeId === f.itemTypeId) return 1;
  if (l.categoryId === f.categoryId) return 0.6;
  if (l.parentCategoryId && l.parentCategoryId === f.parentCategoryId) return 0.3;
  return 0;
}

export function sPlace(l: LostSide, f: FoundSide): number {
  if (!l.placeId && !f.placeId && !l.neighborhoodId && !f.neighborhoodId) return NEUTRAL;
  if (l.placeId && l.placeId === f.placeId) return 1;
  if (l.neighborhoodId && l.neighborhoodId === f.neighborhoodId) return 0.7;
  if (l.cityId && l.cityId === f.cityId) return 0.4;
  if (l.countryCode === f.countryCode) return 0.1;
  return 0;
}

export function sDate(lostAt: Date, foundAt: Date): number {
  const days = (foundAt.getTime() - lostAt.getTime()) / 86_400_000;
  if (days < -1) return 0;                       // trouvé avant la perte : impossible
  return Math.max(0, 1 - Math.abs(days) / DATE_WINDOW_DAYS);
}

export function sColor(a: string | null, b: string | null): number {
  if (!a || !b) return NEUTRAL;
  return a === b ? 1 : 0;
}

export function sBrand(a: string | null, b: string | null): number {
  if (!a || !b) return NEUTRAL;
  const s = trigramSimilarity(normalize(a), normalize(b));
  if (s >= 0.8) return 1;
  if (s >= 0.5) return 0.6;
  return 0;
}

export function sDescription(a: string | null, b: string | null): number {
  const hasA = !!a && a.trim().length > 0;
  const hasB = !!b && b.trim().length > 0;
  if (!hasA && !hasB) return NEUTRAL;
  if (!hasA || !hasB) return 0.3;
  return Math.max(trigramSimilarity(normalize(a!), normalize(b!)), jaccard(tokens(a!), tokens(b!)));
}
```

`trigramSimilarity`, `jaccard`, `normalize` et `tokens` sont implémentés dans `packages/core/src/matching/text.ts` et **reproduisent exactement** le comportement de `similarity()` de `pg_trgm`, afin que le score calculé hors base soit identique au score calculé en base. Un test de parité compare les deux implémentations sur un corpus de 200 paires.

### 6.5 Déclenchement

Trois déclencheurs, du plus rapide au plus sûr :

| Déclencheur | Moment | Périmètre | Latence cible |
|---|---|---|---|
| **Synchrone** | À la création d'un `lost_item` ou `found_item` | Candidats du même jour et de la même ville | < 800 ms |
| **Balayage** (`match-sweep`) | Toutes les 15 minutes | Tous les objets des 90 derniers jours non encore appariés | — |
| **À la demande** | Bouton « Rechercher des correspondances » | Un objet précis | < 2 s |

Le déclencheur synchrone donne la réactivité perçue ; le balayage garantit qu'aucune correspondance n'est perdue à cause d'une erreur transitoire — ce qui arrive sur un réseau instable.

```text
Algorithme du worker match-sweep
1. Sélectionner les objets perdus DECLARED/SEARCHING des 90 derniers jours,
   sans correspondance créée depuis plus de 24 h
2. Pour chacun, appeler match_candidates_for_lost()
3. Calculer scoreMatch() pour chaque paire
4. Filtrer score < 55
5. Upsert dans matches (ON CONFLICT (lost_item_id, found_item_id) DO UPDATE
   SET score, level, breakdown, updated_at — sans toucher au statut)
6. Pour les matchs ≥ 70 nouvellement créés ou dont le score a franchi le seuil :
   mettre à jour lost_items.status = 'MATCH_FOUND' et empiler une notification
7. Journaliser : nombre de paires évaluées, retenues, durée
```

**Point d'attention** : l'étape 5 ne doit **jamais** écraser le statut d'un match (`CLAIMED`, `REJECTED`). Un balayage ne ressuscite pas un match que l'utilisateur a rejeté.

### 6.6 Recherches sauvegardées et alertes (Innovation #2 — P0)

```text
Algorithme du worker saved-search-alerts (toutes les 30 minutes)
1. Sélectionner les saved_searches actives dont last_run_at < now() − 30 min
2. Pour chacune : exécuter la requête correspondante sur public_found_items,
   filtrée par created_at > last_run_at
3. Exclure les objets déjà notifiés à cet utilisateur (table notifications)
4. Si au moins un résultat : créer une notification par canal demandé
5. Mettre à jour last_run_at et last_notified_at
6. Limiter à 3 alertes par utilisateur et par jour (anti-spam)
```

Le dédoublonnage de l'étape 3 est indispensable : sans lui, une recherche sauvegardée « téléphone / N'Djamena » notifierait le même objet à chaque exécution.

### 6.7 Tests de référence

| Scénario | Attendu |
|---|---|
| Même type, même lieu, même jour, même couleur, même marque, descriptions proches | score ≥ 95 → `VERY_LIKELY` |
| Même catégorie, même quartier, 3 jours d'écart, couleur différente | ~60 → `WEAK` |
| Catégories différentes, villes différentes | < 30 → non persisté |
| Objet trouvé 5 jours **avant** la perte déclarée | 0 sur le signal date → rejeté |
| Tous les champs optionnels vides des deux côtés | ~50 → `WEAK`, pas de notification |
| Téléphone / Tecno Pop 8 noir perdu à Farcha le 19/09 vs trouvé à Farcha le 19/09 | ≥ 90 → `VERY_LIKELY` |
| Carte d'identité perdue à Moursal le 21/09 vs trouvée à Moursal le 21/09 | ≥ 90 → `VERY_LIKELY` |

---

## 7. Parcours et écrans

Chaque écran est décrit par : objectif, contenu, états à traiter, critère d'acceptation. Un écran livré sans ses états `loading` / `empty` / `error` / `offline` est refusé en revue.

### 7.1 Accueil — `/`

**Objectif** : faire comprendre en 5 secondes qu'on peut chercher un objet déjà trouvé, sans créer de compte.

```text
┌─ HEADER ─────────────────────────────────────────────────────────┐
│ 🔴 liguita   Rechercher  Comment ça marche  Entreprises  Aide    │
│                                        [ 🇹🇩 Tchad ]  [ Se connecter ] │
└──────────────────────────────────────────────────────────────────┘

┌─ HERO ───────────────────────────────────────────────────────────┐
│ PLATEFORME TCHADIENNE DES OBJETS PERDUS ET RETROUVÉS             │
│                                                                  │
│ J'ai trouvé.          [ illustration : personne + pin rouge       │
│ Tu as perdu.            + toukoul ]                              │
│ On se retrouve.  ← « On se retrouve. » en brand.500              │
│                                                                  │
│ ┌──────────────────────────────────────────────┐                │
│ │ 🔎 Rechercher un objet (ex. carte, téléphone) │  ← 64 px      │
│ └──────────────────────────────────────────────┘                │
│ Exemples : [Carte nationale] [Téléphone] [Portefeuille] [Clés]  │
└──────────────────────────────────────────────────────────────────┘

┌─ DEUX CHEMINS ───────────────────────────────────────────────────┐
│ ┌────────────────────────────┐  ┌────────────────────────────┐  │
│ │ 🔴 J'ai perdu un objet     │  │ 🟢 J'ai trouvé un objet    │  │
│ │ Déclarez votre perte et    │  │ Publiez l'objet que vous   │  │
│ │ recevez des alertes.       │  │ avez trouvé.               │  │
│ └────────────────────────────┘  └────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘

┌─ COMMENT ÇA MARCHE ? ────────────────────────────────────────────┐
│ ① Déclarez  →  ② Liguita cherche  →  ③ Vérifiez  →  ④ Payez  →  ⑤ Récupérez │
│   Dites-nous    Notre système       Répondez à      Frais de     Vous êtes  │
│   ce que vous   trouve les          quelques        mise en      mis en     │
│   avez perdu.   correspondances.    questions.      relation,    relation.  │
│                                                     à partir de              │
│                                                     300 FCFA.    ← corrigé  │
└──────────────────────────────────────────────────────────────────┘

┌─ OBJETS RÉCEMMENT TROUVÉS ───────────────────────────────────────┐
│ [ 3 à 6 ItemCard issues de public_found_items ]                  │
│ [ Voir tous les objets trouvés → ]                               │
└──────────────────────────────────────────────────────────────────┘

┌─ POUR LES ENTREPRISES ───────────────────────────────────────────┐
│ Aéroports · Gares · Hôtels · Supermarchés · Universités · Centres │
│ [ Découvrir Liguita Business → ]                                  │
└──────────────────────────────────────────────────────────────────┘

┌─ CONFIANCE ──────────────────────────────────────────────────────┐
│ 🔒 Sécurisé  ·  ⚡ Simple  ·  📍 Local  ·  🚀 Rapide             │
└──────────────────────────────────────────────────────────────────┘

FOOTER : Logo · liens · mentions légales · politique de confidentialité · 🇹🇩 Tchad
```

| Élément | Spécification |
|---|---|
| Hero | Bloc `ink.900`, rayon `2xl`, illustration à droite, masquée sous `md` |
| Champ de recherche | `SearchInput lg` — 64 px de hauteur, fond blanc, rayon `full` sur desktop, `lg` sur mobile |
| Boutons | `primary` (rechercher), `outline` inversé (« J'ai perdu »), `ghost` inversé (« J'ai trouvé ») |
| Étapes | 5 pastilles reliées, numéros `overline`, icône `24 px` |
| Frais affichés | **« à partir de 300 FCFA »** — jamais 500 (ADR-004) |

**Critères d'acceptation**

1. La recherche est utilisable sans compte : taper `carte` + Entrée mène à `/rechercher?q=carte`.
2. LCP < 2,5 s en 3G simulée (`Slow 3G`, 400 kbps, 400 ms RTT).
3. L'illustration du Hero est servie en AVIF/WebP avec `width`/`height` explicites (aucun décalage de mise en page).
4. Sur mobile 360 px : un seul bouton rouge plein visible à l'écran.
5. Test axe-core : 0 violation de niveau `serious` ou `critical`.

### 7.2 Recherche — `/rechercher`

**Objectif** : le cœur du produit. Trouver un objet en moins de 30 secondes sur mobile.

```text
┌─ BARRE DE RECHERCHE (collante) ──────────────────────────────────┐
│ 🔎 carte nationale                              [ ⚙ Filtres (2) ] │
└──────────────────────────────────────────────────────────────────┘

┌─ FILTRES (repliés par défaut sur mobile) ────────────────────────┐
│ Catégorie ▾   Ville ▾   Quartier / zone ▾   Lieu ▾               │
│ Date ▾        Couleur ▾  Marque              [ Réinitialiser ]   │
└──────────────────────────────────────────────────────────────────┘

┌─ RÉSULTATS — 12 objets trouvés ──────────────────────────────────┐
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ 🪪  Carte trouvée                            [ Classe C1 ]   │ │
│ │     N'Djamena · Moursal                                      │ │
│ │     Trouvée le 21 septembre                                  │ │
│ │     🟠 Correspondance probable                               │ │
│ │                              [ VOIR LA CORRESPONDANCE → ]    │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ 📱  Téléphone trouvé                         [ Classe C3 ]   │ │
│ │     N'Djamena · Farcha                                       │ │
│ │     Trouvé le 19 septembre                                   │ │
│ │     🔴 Correspondance très probable                          │ │
│ │                              [ VOIR LA CORRESPONDANCE → ]    │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                        [ Afficher plus ]                          │
└──────────────────────────────────────────────────────────────────┘
```

**Anonymisation obligatoire.** La carte de résultat n'affiche **jamais** : description complète, photo nette d'un document, numéro partiel, nom du trouveur, coordonnées, emplacement physique. Elle affiche : catégorie, ville, quartier, date, classe tarifaire, et — si l'utilisateur est connecté et qu'un match existe — le badge de correspondance.

| État | Rendu |
|---|---|
| Aucun résultat | `EmptyState` + « Enregistrer cette recherche » (→ `saved_searches`) |
| Chargement | 4 `Skeleton card` |
| Erreur réseau | `Alert` + bouton « Réessayer » + résultats en cache si disponibles |
| Hors ligne | Bandeau « Mode hors ligne — résultats en cache » + file d'attente |
| Filtres actifs | Puce supprimable par filtre + compteur sur le bouton Filtres |

**Critères d'acceptation**

1. La requête `carte` remonte « Carte nationale » (correspondance floue via `pg_trgm`).
2. Les filtres sont reflétés dans l'URL (`?q=carte&ville=ndjamena&categorie=id_card`) et partageables.
3. Pagination par curseur, 20 résultats par page, jamais de `OFFSET` sur de grandes tables.
4. Une recherche sans résultat propose systématiquement l'enregistrement de l'alerte.
5. Aucune donnée personnelle dans la réponse réseau (vérifié par un test qui inspecte le JSON).

### 7.3 « J'ai perdu un objet » — `/app/perdus/nouveau`

**Objectif** : déclarer une perte en moins de 2 minutes, même sur réseau instable.

```text
Étape 1/3 — L'objet
  Catégorie *            [ grille d'icônes : Téléphone · Carte · Sac · Clés · Ordinateur · Autre ]
  Type d'objet *         [ Combobox alimentée par la catégorie ]
  Titre *                [ « Carte nationale » ]
  Description            [ zone de texte, 500 caractères max ]
  Marque / Modèle        [ ex. Tecno Pop 8 ]
  Couleur *              [ 16 pastilles + libellé — jamais la couleur seule ]
  Signes distinctifs     [ « rayure sur l'écran, coque bleue » ]

Étape 2/3 — Où et quand
  Ville *                [ N'Djamena ]
  Quartier / zone *      [ Farcha ]
  Lieu                  [ Aéroport · Gare · Taxi · Marché · Supermarché · Restaurant ·
                           Hôtel · École · Université · Rue · Maison · Bureau · Autre ]
  Date de perte *        [ sélecteur, précision : jour / matin / après-midi / approximatif ]
  Photo (facultative)    [ 📷 glisser-déposer, 3 max, compression automatique ]

Étape 3/3 — Valeur et contact
  Valeur déclarée (facultative)   [ ____ FCFA ]
  ℹ️ Au-delà de 1 000 000 FCFA, l'objet passe en classe C5.
  ℹ️ Votre objet est classé C3 — Électronique : frais de mise en relation 1 200 FCFA.
  Téléphone de contact              [ +235 __ __ __ __ ]  (jamais affiché publiquement)
  ☑ Je certifie être le propriétaire de cet objet

  [ PUBLIER MA DÉCLARATION ]
```

**Affichage du prix dès la déclaration.** Le montant estimé apparaît à l'étape 3, en direct, dès que la catégorie et la valeur sont connues. L'utilisateur sait **avant** de publier ce qu'il paiera s'il y a correspondance. C'est un choix produit : il vaut mieux qu'une personne renonce dès la déclaration que de découvrir le montant au moment du paiement, après avoir espéré.

**Résilience réseau** — exigence non négociable dans le contexte tchadien :

- Le brouillon est sauvegardé dans `localStorage` à chaque changement de champ (débounce 500 ms).
- En cas de coupure, un bandeau « Connexion perdue — votre brouillon est conservé » remplace le bouton.
- À la reconnexion, l'envoi reprend automatiquement.
- Les photos sont compressées côté client (max 1600 px de côté, qualité 0,8, cible < 300 ko) **avant** l'envoi.

**Critères d'acceptation**

1. Un formulaire complet est soumis en 3G simulée sans échec, y compris avec une coupure simulée de 10 s au milieu.
2. La catégorie « Carte » déclenche `is_sensitive = true` → la photo est floutée automatiquement (§11.6).
3. Le prix estimé est calculé côté client **et** recalculé côté serveur ; toute divergence bloque la publication (le client ne fait jamais foi en matière de prix).
4. Un brouillon abandonné est repris intact après fermeture du navigateur.

### 7.4 « J'ai trouvé un objet » — `/app/trouves/nouveau`

**Principe** : le plus court possible (§11 du plan v2). Trois champs obligatoires seulement.

```text
📷  AJOUTER UNE PHOTO            ← pré-remplit automatiquement la catégorie (P3)

Catégorie *      [ Téléphone · Carte · Sac · Clés · Ordinateur · Autre ]
Couleur *        [ pastilles ]
Ville *          [ N'Djamena ]
Quartier / zone  [ Farcha ]
Lieu             [ Aéroport · Gare · Taxi · Marché · … ]
Date de trouvaille *
Description      [ facultatif ]

[ PUBLIER L'OBJET ]

── Juste après ──
✅ Votre objet a bien été déclaré !
   Nous vous notifierons dès qu'une correspondance est trouvée.
   💰 Si une mise en relation aboutit, une récompense de 400 FCFA
      vous sera versée (classe C3 — Électronique).
   [ Partager sur WhatsApp ]   [ Déclarer un autre objet ]
```

**Notification de récompense dès la publication.** Le trouveur doit savoir, **au moment où il publie**, qu'il sera récompensé et de combien. C'est le principal levier de volume d'objets trouvés, donc de valeur du produit.

**Critères d'acceptation**

1. Le formulaire compte 3 champs obligatoires (catégorie, couleur, ville) — vérifié par test.
2. Le montant de la récompense affiché correspond à `rewards[pricing_class]` de la règle active.
3. Un objet trouvé déclaré par un agent d'organisation alimente l'inventaire de son établissement sans action supplémentaire.
4. Le floutage automatique s'applique si `item_categories.is_sensitive`.

### 7.5 Vérification de propriété — `/app/correspondances/[id]/verification`

**Objectif** : empêcher qu'un tiers récupère l'objet d'autrui, sans décourager le vrai propriétaire.

```text
🔒 Vérification de propriété

Pour vous mettre en relation avec la personne qui a trouvé cet objet,
répondez à quelques questions. Ces réponses ne sont pas publiques.

1. Quelle est la couleur exacte de l'objet ?              [ choix ]
2. Que contenait-il ? (détail précis)                     [ texte ]
3. Un signe distinctif ? (rayure, autocollant, gravure)   [ texte ]
4. Numéro partiellement visible sur le document ?         [ texte ]
5. Date de naissance figurant sur le document ?           [ date ]

   [ ENVOYER MES RÉPONSES ]

ℹ️ 3 tentatives maximum. Toute tentative frauduleuse est signalée.
```

**Barème de notation** (configurable dans `verification_questions.weight`)

| Résultat | Action |
|---|---|
| Score ≥ 80 | Vérification **approuvée** → accès au devis et au paiement |
| 50 – 79 | Revue manuelle par un modérateur sous 24 h |
| < 50 | **Refusé**, `attempt_count` incrémenté |
| 3 refus | Correspondance verrouillée, signalement automatique dans `fraud_cases` |

**Accélération par le Coffre Liguita (P2)** : si l'objet est pré-enregistré avec IMEI ou numéro de série, la vérification devient quasi instantanée par comparaison automatique (§7 de la Innovation #8).

**Critères d'acceptation**

1. Les questions sont **générées depuis la catégorie** : une carte d'identité ne pose pas de question sur l'IMEI.
2. Aucune réponse n'est jamais renvoyée au client après soumission, ni au trouveur, ni dans les journaux.
3. Les 3 tentatives sont comptées côté serveur (jamais côté client).
4. Un refus ne révèle jamais la bonne réponse.

### 7.6 Devis et paiement — `/app/correspondances/[id]/paiement`

**Objectif** : encaisser sans ambiguïté. C'est l'écran le plus important du produit.

```text
┌─ BLOC DEVIS (variante dark du design system) ────────────────────┐
│ DEVIS #LG-Q-00091                                                │
│                                                                  │
│ 1 200 FCFA                          ← money-lg, 44 px            │
│                                                                  │
│ Classe C3 — Électronique                    1 200 FCFA           │
│ Traitement urgent                            +600 FCFA           │
│ Conciergerie documents                              —            │
│ Livraison                                           —            │
│ ─────────────────────────────────────────────────────            │
│ TOTAL                                       1 800 FCFA           │
│                                                                  │
│ [ 🔴 À payer maintenant ]  [ Dont 400 FCFA réservés au trouveur ]│
└──────────────────────────────────────────────────────────────────┘

Options à cocher (avant validation) :
  ☐ Traitement urgent — +50 % — alerte immédiate au trouveur   [+600 FCFA]
  ☐ Conciergerie documents — accompagnement des démarches       [+1 000 FCFA]
  ☐ Livraison à domicile — sur devis partenaire                 [+2 500 FCFA]
  ☐ Bonus communautaire pour le trouveur — montant libre        [____ FCFA]
     ℹ️ Liguita ne prélève aucune commission sur ce bonus.

Moyen de paiement
  ● Airtel Money      ○ Moov Money      ○ Cash Liguita

[ PAYER 1 800 FCFA ]

🔒 Remboursement intégral si aucune mise en relation sous 7 jours.
   Le numéro du trouveur n'est jamais communiqué : Liguita assure
   l'intermédiaire.
```

**Règles d'interface**

1. Le total est **recalculé à chaque changement d'option**, en direct, avec la même fonction que le serveur (le paquet `packages/core` est partagé).
2. Le devis est **créé côté serveur** au premier affichage, puis relu à chaque modification d'option (nouveau devis, l'ancien est `VOID`).
3. Le libellé du bouton contient **toujours** le montant : `Payer 1 800 FCFA`.
4. Aucune mention de « vente de coordonnées » : la formulation est « frais de mise en relation », conformément à la §2.5 du plan v2.
5. Le devis expire en 30 minutes : un `Timer` visible l'indique.

**Critères d'acceptation**

1. Le montant affiché côté client est **toujours** identique au montant du devis serveur. Un test E2E compare les deux à chaque combinaison d'options.
2. Un devis expiré ne peut pas être payé : le bouton bascule sur « Recalculer le montant ».
3. Un double clic sur « Payer » ne crée qu'une transaction (`idempotency_key`).
4. Le remboursement sous 7 jours est affiché **avant** le paiement, pas seulement dans les conditions générales.

### 7.7 Mise en relation — `/app/messages/[id]`

```text
┌─ EN-TÊTE ────────────────────────────────────────────────────────┐
│ Objet : Carte nationale (LG-2026-000291)                         │
│ Statut : 🟠 Mise en relation en cours      [ Voir le dossier ]   │
└──────────────────────────────────────────────────────────────────┘

┌─ FIL ────────────────────────────────────────────────────────────┐
│ [Liguita] Paiement confirmé. 400 FCFA sont réservés pour le      │
│           trouveur. Vous pouvez organiser la remise.             │
│                                                                  │
│ Vous      Bonjour, je suis disponible demain matin au marché     │
│           central. Ça vous convient ?                            │
│                                                                  │
│ Trouveur  Oui, 9 h devant l'entrée principale.                   │
└──────────────────────────────────────────────────────────────────┘

┌─ COMPOSEUR ──────────────────────────────────────────────────────┐
│ [ Écrire un message… ]                                  [ Envoyer ]│
└──────────────────────────────────────────────────────────────────┘

Actions du dossier : [ Confirmer la restitution ]  [ Signaler un problème ]
```

**Détection de sortie de plateforme.** Un filtre signale (sans bloquer) les messages contenant un numéro de téléphone ou une invitation à se retrouver hors plateforme. Le message est marqué `flagged` et visible par la modération. Il n'est **pas** bloqué automatiquement : les faux positifs sont nombreux (adresses, références de dossier) et un blocage injustifié détruit la confiance.

**Critères d'acceptation**

1. Aucun numéro de téléphone n'est transmis par Liguita. Le trouveur choisit lui-même de le communiquer ou non.
2. Les messages arrivent en temps réel via Supabase Realtime ; en cas de coupure, un `refetch` au retour de focus restaure l'état.
3. L'historique est conservé 24 mois puis anonymisé.
4. Un message système automatique est inséré à chaque changement de statut du dossier.

### 7.8 Restitution et récompense

```text
Propriétaire                              Trouveur
     │                                        │
     │ [ Confirmer la restitution ]           │
     │                                        │
     ▼                                        │
  owner_confirmed_at                          │
     │                                        │
     ├──── notification « Confirmez-vous ? ───►
     │                                        │
     │                        [ Oui, j'ai remis l'objet ]
     │                                        ▼
     │                              finder_confirmed_at
     │                                        │
     ▼                                        ▼
  ┌────────────────────────────────────────────────┐
  │  ✅ Restitution confirmée                      │
  │  400 FCFA versés au trouveur                   │
  │  [ Télécharger l'attestation de restitution ]  │  ← P1
  └────────────────────────────────────────────────┘
```

**Double confirmation obligatoire.** La récompense n'est versée que si **les deux parties** confirment. En cas de désaccord, le dossier passe en `DISPUTED` et la récompense reste bloquée jusqu'à arbitrage — exactement la règle de la §2.5 du plan v2.

**Mode solidaire.** Le trouveur peut, au moment du versement, choisir : recevoir, **donner à une association partenaire**, ou **convertir en crédits Liguita** (étiquettes QR). Dans les deux derniers cas, il reçoit le badge « Samaritain » (`profiles.is_samaritan`).

**Critères d'acceptation**

1. La récompense n'est jamais versée sur une simple confirmation du propriétaire.
2. Une restitution confirmée génère une entrée `ledger_entries` de sortie et une mise à jour de `rewards.status = 'RELEASED'`.
3. Le versement effectif passe par l'opérateur ; en cas d'échec, le statut reste `RESERVED` et une alerte est levée. **L'argent n'est jamais marqué versé sans référence opérateur.**
4. Un remboursement intégral est déclenchable automatiquement au bout de 7 jours sans mise en relation effective.

### 7.9 Console Business — `/business`

```text
┌──────────────────────────────────────────────────────────────────┐
│ LIGUITA BUSINESS — Aéroport International N'Djamena              │
│ [ N'Djamena Centre ▾ ]                            👤 Ali (Manager)│
├──────────────────────────────────────────────────────────────────┤
│  Objets trouvés     247   │  En attente        82                │
│  Correspondances     46   │  Restitués        119                │
├──────────────────────────────────────────────────────────────────┤
│  [ + Ajouter un objet ]   [ 🔎 Rechercher ]   [ 📦 Inventaire ]   │
│  [ 🤝 Correspondances ]   [ 👥 Équipe ]       [ 📊 Statistiques ] │
│  [ 💳 Abonnement ]        [ ⚙️ Paramètres ]                        │
└──────────────────────────────────────────────────────────────────┘
```

**Fiche objet business**

```text
Objet #LG-2026-000291
Catégorie     Carte d'identité          Classe  C1
Photo         [ photo ]                  Floutée  oui
Découvert le  21 septembre 2026          Lieu     Terminal 1 — Bureau objets trouvés
Agent         Ali M.                     Statut   EN INVENTAIRE
Localisation  Bâtiment A · Étage 0 · Zone inventaire · Armoire B · Casier 04
Notes internes (jamais publiques)
[ QR Code ]
```

**Règle d'affichage par rôle** — appliquée côté serveur, pas seulement dans l'interface :

| Rôle | Voit | Peut faire |
|---|---|---|
| `OWNER` | Tout, tous les sites | Tout, y compris supprimer l'organisation |
| `ADMIN` | Tout, tous les sites | Gérer sites, équipe, abonnement |
| `MANAGER` | Uniquement ses sites | Ajouter, modifier, restituer |
| `AGENT` | Uniquement son site | Ajouter et modifier les objets |
| `READONLY` | Statistiques agrégées | Rien |

**Critères d'acceptation**

1. Un `AGENT` du site A ne voit **aucun** objet du site B (test RLS bloquant).
2. Les tableaux passent en cartes empilées sous 768 px.
3. L'ajout d'un objet par un agent déclenche le matching immédiatement.
4. Les statistiques ne sont jamais calculées côté client sur des données non filtrées.

### 7.10 Console Admin — `/admin`

Sections : Utilisateurs · Objets · Correspondances · Transactions · Réclamations · Signalements · Entreprises · Abonnements · Fraudes · Journaux · Paramètres de tarification.

**Fonction indispensable** : l'éditeur de `pricing_rules`. Il permet de créer une nouvelle version de la grille, de la **simuler** sur des cas types (les 18 tests dorés de §5.7), puis de l'activer. Un changement de tarif ne doit jamais nécessiter un redéploiement.

**Critères d'acceptation**

1. Toute action de modération écrit dans `audit_logs` avec l'acteur, l'avant et l'après.
2. Un remboursement exige un motif et crée une écriture compensatoire ; il ne modifie jamais la transaction d'origine.
3. L'activation d'une nouvelle grille désactive atomiquement l'ancienne (transaction SQL unique).
4. Aucun écran admin n'est accessible sans `app_role IN ('MODERATOR','ADMIN')`, vérifié côté serveur **et** par RLS.

---

## 8. Architecture des routes

Convention : français pour les routes publiques et l'espace particulier (public non anglophone), anglais pour les points d'API et les consoles internes.

### Public

| Route | Rendu | Priorité |
|---|---|---|
| `/` | Statique + ISR 5 min | P0 |
| `/rechercher` | Dynamique (recherche) | P0 |
| `/objets-trouves` | ISR 2 min | P0 |
| `/comment-ca-marche` | Statique | P0 |
| `/entreprises` | Statique | P0 |
| `/tarifs` | ISR 1 h (lit `pricing_rules` actif) | P0 |
| `/securite` | Statique | P1 |
| `/aide` | Statique + FAQ | P1 |
| `/cgu`, `/confidentialite`, `/mentions-legales` | Statique | **P0 — obligatoire pour le paiement** |

> **Correction d'une incohérence du plan v2** : la §14 proposait `/search/*` et la §48 `/rechercher`. Une seule convention est retenue : `/rechercher`.

### Authentification

| Route | Rôle |
|---|---|
| `/connexion` | Téléphone + mot de passe |
| `/inscription` | Téléphone → OTP → profil |
| `/otp` | Saisie et renvoi du code |
| `/mot-de-passe-oublie` | Réinitialisation par SMS |

### Espace particulier (`/app`, authentifié)

| Route | Contenu |
|---|---|
| `/app` | Tableau de bord : compteurs, dernières correspondances |
| `/app/recherche` | Recherche avec historique |
| `/app/perdus` · `/app/perdus/nouveau` · `/app/perdus/[id]` | Mes objets perdus |
| `/app/trouves` · `/app/trouves/nouveau` · `/app/trouves/[id]` | Mes objets trouvés |
| `/app/correspondances` · `/app/correspondances/[id]` | Correspondances |
| `/app/correspondances/[id]/verification` | Vérification de propriété |
| `/app/correspondances/[id]/paiement` | Devis et paiement |
| `/app/messages` · `/app/messages/[id]` | Conversations |
| `/app/paiements` | Historique des transactions |
| `/app/recompenses` | Récompenses reçues et dues |
| `/app/alertes` | Recherches sauvegardées |
| `/app/notifications` | Centre de notifications |
| `/app/profil` · `/app/securite` | Profil, sécurité, RGPD/loi 007 |

### Business (`/business`)

| Route | Contenu |
|---|---|
| `/business` | Tableau de bord |
| `/business/objets` · `/nouveau` · `/[id]` | Inventaire |
| `/business/objets/import` | Import CSV (P1) |
| `/business/matchs` | Correspondances |
| `/business/restitutions` | Restitutions en cours |
| `/business/sites` | Établissements |
| `/business/equipe` | Utilisateurs et rôles |
| `/business/statistiques` | Statistiques et export |
| `/business/abonnement` | Plan, quotas, facturation (P1) |
| `/business/parametres` | Organisation, logo, secteur |

### Admin (`/admin`)

`/admin` · `/admin/utilisateurs` · `/admin/objets` · `/admin/correspondances` · `/admin/transactions` · `/admin/reclamations` · `/admin/signalements` · `/admin/entreprises` · `/admin/abonnements` · `/admin/fraudes` · `/admin/tarification` · `/admin/journaux` · `/admin/parametres`

### API

| Route | Méthode | Rôle |
|---|---|---|
| `/api/pricing/quote` | POST | Crée un `price_quote` (recalcul serveur, jamais de montant venant du client) |
| `/api/pricing/options` | POST | Recalcule un devis après changement d'option |
| `/api/matching/run` | POST | Relance le matching pour un objet |
| `/api/uploads/sign` | POST | URL signée pour l'envoi vers Supabase Storage |
| `/api/payments/initiate` | POST | Crée la transaction, retourne l'URL de l'opérateur |
| `/api/payments/webhook/[provider]` | POST | Callback opérateur (signature vérifiée) |
| `/api/payments/[id]/status` | GET | Interrogation de secours (polling) |
| `/api/qr/[code]` | GET | Résolution d'un QR (P1) |
| `/api/cron/match-sweep` | POST | Déclencheur planifié |
| `/api/cron/saved-search-alerts` | POST | Déclencheur planifié |
| `/api/cron/retention-purge` | POST | Purge selon les durées de conservation |
| `/api/health` | GET | Sonde de supervision |

Toutes les routes `cron` exigent l'en-tête `Authorization: Bearer ${CRON_SECRET}` et rejettent toute autre origine.

---

## 9. Paiement

### 9.1 Abstraction `LiguitaPay`

Le plan v2 (§31) l'exige : la logique métier ne doit dépendre d'aucun opérateur. Interface unique, quatre adaptateurs.

```ts
// packages/payments/src/types.ts
export interface PaymentProvider {
  readonly code: string;                       // 'airtel' | 'moov' | 'gimac' | 'cash'
  readonly supportsRefund: boolean;

  initiate(input: {
    amount: number;
    currency: string;
    payerPhone: string;
    reference: string;                         // transaction.public_ref
    idempotencyKey: string;
    description: string;
  }): Promise<{ providerReference: string; status: 'PENDING' | 'PAID'; redirectUrl?: string }>;

  checkStatus(providerReference: string): Promise<{
    status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
    failureReason?: string;
    paidAt?: Date;
  }>;

  refund?(input: {
    providerReference: string;
    amount: number;
    reason: string;
  }): Promise<{ refundReference: string }>;

  verifyWebhook(rawBody: string, headers: Record<string, string>): boolean;
}
```

**Sélection de l'opérateur** : l'utilisateur choisit, mais le système filtre selon `country_code` et `currency` via une table `payment_providers` (P1). En P0, `cash` (Cash Liguita, règlement en espèces via un agent partenaire) sert de filet de sécurité si un opérateur est indisponible — indispensable au Tchad, où une panne d'opérateur ne doit pas bloquer une restitution.

### 9.2 Opérateurs cibles (Tchad)

| Opérateur | Frais observés | Impact sur la grille |
|---|---|---|
| Airtel Money | ≤ 3 % du montant | 9 à 90 FCFA sur un paiement de 300 à 3 000 FCFA — négligeable devant la commission |
| Moov Money | 0,70 % (promo) à 5 % | Négocier un tarif marchand, nettement inférieur au tarif de retrait |
| GIMAC | Interopérabilité, tranches non publiées | À surveiller : un paiement de 300–3 000 reste dans les tranches basses |
| Cash Liguita | — | Agent partenaire, reçu imprimé avec code de mise en relation |

**Action commerciale à mener en parallèle du Sprint 6** : obtenir un contrat marchand Airtel et Moov avec un tarif d'encaissement fixe (idéalement < 1 %). Les frais d'encaissement sont un poste de coût direct qui rogne la commission Liguita.

### 9.3 Cycle de vie d'une transaction

```text
1. POST /api/payments/initiate
   ├─ Vérifier que le claim est APPROVED et que le quote est OPEN et non expiré
   ├─ Créer transactions (status INITIATED, idempotency_key)
   ├─ Appeler provider.initiate()
   └─ Retourner { providerReference, redirectUrl }

2. Utilisateur valide sur son téléphone (USSD opérateur)
   ├─ Webhook → provider.verifyWebhook() → marquer PAID
   └─ OU polling → provider.checkStatus() → marquer PAID

3. Sur PAID (transaction atomique SQL)
   ├─ transactions.status = 'PAID', completed_at = now()
   ├─ price_quotes.status = 'CONSUMED'
   ├─ rewards : créer avec status = 'RESERVED'
   ├─ ledger_entries : 4 écritures (partie double)
   ├─ conversations : créer la mise en relation
   ├─ notifications : propriétaire + trouveur
   └─ analytics_events : 'payment_completed'
```

L'étape 3 doit être **une seule transaction PostgreSQL**. Si la création de la conversation échoue, l'argent ne doit pas être encaissé sans contrepartie — ou plus exactement, l'état doit rester cohérent et réparable. Un job de réconciliation (`payment-reconcile`) détecte les transactions `PAID` sans conversation et les répare.

### 9.4 Idempotence et webhooks

- `idempotency_key` unique en base : un double clic ne crée jamais deux transactions.
- Les webhooks opérateurs arrivent parfois **en double** ou **dans le désordre**. Le traitement est idempotent : un `PAID` reçu deux fois ne produit qu'une seule série d'écritures.
- Un webhook reçu pour une transaction déjà `PAID` avec un montant différent est **rejeté et signalé** (tentative de fraude possible).
- Signature vérifiée systématiquement. Un webhook non signé est ignoré, jamais traité « au cas où ».
- Rejeu de webhooks : la table `provider_payload` conserve la charge utile brute pour audit.

### 9.5 Remboursements

Déclencheurs (§2.5 du plan v2) :

| Motif | Délai | Automatique |
|---|---|---|
| Aucune mise en relation effective | 7 jours après paiement | **Oui** |
| Trouveur injoignable | 72 h après 3 relances | Non — validation modérateur |
| Objet déjà restitué | Immédiat | Non |
| Fraude avérée | Immédiat | Non — validation modérateur |

Un remboursement crée une **écriture compensatoire** dans `ledger_entries` ; la transaction d'origine n'est jamais modifiée. Si la récompense a déjà été versée, elle est récupérée sur le compte Liguita du trouveur (crédit négatif) ou transformée en litige si le montant est significatif.

---

## 10. Notifications

### 10.1 Adaptateurs

| Canal | Usage | Priorité | Contrainte |
|---|---|---|---|
| **Web (in-app)** | Toujours | P0 | Aucune |
| **SMS** | Critique (paiement, correspondance) | P0 | Coût par SMS — à budgéter |
| **WhatsApp** | Canal n°1 au Tchad | P1 | Nécessite un compte WhatsApp Business validé |
| **E-mail** | Reçus, attestations | P1 | Adoption faible au Tchad |
| **Web Push** | Réengagement | P1 | Nécessite l'installation PWA |
| **USSD / vocal** | Inclusion | P3 | Accords opérateurs |

**Règle de coût** : un SMS coûte de l'argent réel. Chaque événement est classé `CRITIQUE` (SMS systématique), `IMPORTANT` (SMS si l'utilisateur ne s'est pas connecté sous 6 h) ou `INFORMATIF` (web uniquement). Sans cette discipline, les coûts SMS dépasseront la commission sur les classes C1 et C2.

### 10.2 Matrice événement × canal

| Événement | Web | SMS | WhatsApp | E-mail | Classe |
|---|:--:|:--:|:--:|:--:|---|
| `MATCH_FOUND` (≥ 70) | ✔ | ✔ | ✔ | — | CRITIQUE |
| `PAYMENT_CONFIRMED` | ✔ | ✔ | ✔ | ✔ | CRITIQUE |
| `REWARD_RESERVED` | ✔ | ✔ | ✔ | — | IMPORTANT |
| `REWARD_RELEASED` | ✔ | ✔ | ✔ | ✔ | IMPORTANT |
| `RETURN_CONFIRMED` | ✔ | ✔ | ✔ | ✔ | IMPORTANT |
| `MESSAGE_RECEIVED` | ✔ | — | ✔ | — | INFORMATIF |
| `SAVED_SEARCH_ALERT` | ✔ | ✔ | ✔ | — | IMPORTANT |
| `ITEM_FOUND_NEARBY` | ✔ | — | ✔ | — | INFORMATIF |
| `SUBSCRIPTION_RENEWAL` (P1) | ✔ | ✔ | — | ✔ | IMPORTANT |
| `VERIFICATION_REJECTED` | ✔ | ✔ | — | — | CRITIQUE |

### 10.3 Implémentation

Table `notifications` comme file d'attente persistante, worker `notify-dispatch` toutes les minutes :

```text
1. Sélectionner les notifications non envoyées (sent_at is null, error is null)
2. Grouper par utilisateur et par canal pour éviter le spam
3. Appliquer les préférences utilisateur (table à ajouter en P1 : notification_preferences)
4. Envoyer via l'adaptateur, avec 3 tentatives et repli exponentiel
5. Renseigner sent_at ou error
6. Un échec définitif sur un canal CRITIQUE lève une alerte de supervision
```

**Préférences utilisateur obligatoires** : un utilisateur doit pouvoir refuser les SMS promotionnels tout en conservant les SMS transactionnels. C'est une exigence de la loi 007/PR/2015 (§11.4).

---

## 11. Sécurité, vie privée et conformité

### 11.1 Authentification

| Mécanisme | Détail | Priorité |
|---|---|---|
| **OTP par SMS** | 6 chiffres, validité 5 minutes, 3 renvois maximum par heure et par numéro | P0 |
| **Mot de passe / PIN** | 6 chiffres minimum, hachage `bcrypt` géré par Supabase Auth | P0 |
| **Sessions** | Jeton de rafraîchissement, expiration 30 jours, révocation à la déconnexion | P0 |
| **Limitation de débit** | 5 tentatives OTP par numéro et par heure, 20 par IP et par heure | P0 |
| **Passkeys / WebAuthn** | Option, plus tard | P3 |
| **Double facteur Business** | Obligatoire pour les rôles `OWNER` et `ADMIN` d'organisation | P1 |

**Règle** : le numéro de téléphone est l'identifiant principal (le taux de pénétration du mobile est très supérieur à celui de l'e-mail au Tchad). L'e-mail est **optionnel** partout, jamais obligatoire.

### 11.2 Cloisonnement des données

Trois mondes étanches : **particulier** / **business** / **admin**.

```text
Particulier   →  ne voit que ses propres déclarations et les objets trouvés anonymisés
Business      →  ne voit que les objets de ses établissements, selon son rôle
Modérateur    →  voit tout, chaque accès journalisé dans data_access_logs
Admin         →  accès complet, chaque action dans audit_logs
```

**Le service role n'est jamais utilisé côté client.** Trois barrières :

1. La clé n'est importée que dans les modules serveur (`'server-only'`).
2. Un test analyse le bundle client et échoue si la clé apparaît.
3. Une revue de code obligatoire sur toute PR touchant `lib/supabase/admin.ts`.

### 11.3 Anti-fraude

Le plan v2 (§36) liste les cas. Voici les **signaux** et les **réponses automatiques** à implémenter en P0.

| Cas de fraude | Signaux détectés | Réponse automatique |
|---|---|---|
| **Faux objet trouvé** | Même utilisateur publie > 5 objets en 24 h ; photos identiques à un autre objet (hachage perceptuel) ; objet jamais restitué après 3 mises en relation | Mise en quarantaine, revue manuelle, score de confiance −15 |
| **Faux propriétaire** | 3 échecs de vérification ; réponses génériques ; même IP que le trouveur | Correspondance verrouillée, dossier `fraud_cases` ouvert |
| **Faux paiement** | Webhook non signé ; montant incohérent avec le devis ; référence opérateur inconnue | Rejet, transaction `FAILED`, alerte |
| **Multiples réclamations** | > 1 `claim` sur le même `match` | Première réclamation prioritaire, les autres en attente de revue |
| **Escroquerie / sortie de plateforme** | Numéro de téléphone détecté dans un message ; motifs « envoie l'argent d'abord » | Message marqué `flagged`, modération notifiée, **pas de blocage automatique** |
| **Collusion trouveur / propriétaire** | Même appareil, même IP, mise en relation sans correspondance réelle | Dossier de fraude, blocage de la récompense |

**Score de confiance** (`profiles.trust_score`, 0–100, initial 50) :

```text
+10  première restitution confirmée par les deux parties
+5   par restitution supplémentaire (plafonné à +25)
+8   compte vérifié (numéro actif depuis plus de 30 jours)
−15  échec de vérification répété
−20  dossier de fraude confirmé
−50  blocage
```

Un `trust_score` < 20 bloque la publication de nouveaux objets et l'accès au paiement. Le score est visible dans le profil et explicable : l'utilisateur doit comprendre pourquoi il a baissé.

**Limitation de débit** — indispensable en P0 :

| Action | Limite |
|---|---|
| Création d'objet perdu | 10 / jour / utilisateur |
| Création d'objet trouvé | 10 / jour / utilisateur |
| Création de correspondance | 20 / jour / utilisateur |
| Envoi de messages | 60 / heure / conversation |
| Tentative de vérification | 3 / correspondance |
| Tentative de paiement | 5 / heure / utilisateur |
| Recherche | 120 / heure / IP |

### 11.4 Conformité — loi tchadienne n° 007/PR/2015

Cadre : loi n° 007/PR/2015 portant protection des données à caractère personnel, décret d'application n° 075/PR/2019. La conformité n'est pas un chantier de fin de projet : chaque obligation ci-dessous a une **implémentation technique** dans ce plan.

| Obligation | Implémentation | Où |
|---|---|---|
| **Registre des traitements** | Table `data_access_logs` + document de registre maintenu dans `docs/` | §4.3, §18.2 |
| **Minimisation** | Seules les données nécessaires au matching sont collectées. Pas de date de naissance obligatoire, pas d'adresse postale, pas de pièce d'identité à l'inscription | §7.3, §7.4 |
| **Limitation des finalités** | Table `consents` : `MATCHING`, `NOTIFICATIONS`, `MARKETING` séparés. Un refus de marketing n'empêche pas l'usage du service | §4.3 |
| **Durées de conservation** | Tâche `retention-purge` quotidienne, durées documentées | §4.7 |
| **Droit d'accès** | Export JSON depuis `/app/securite`, généré sous 30 jours | §4.7 |
| **Droit de rectification** | Modification directe de tous les champs de profil et de déclaration | §7.3 |
| **Droit à l'effacement** | Suppression logique 30 jours puis physique, sauf obligations comptables | §4.7 |
| **Sécurité et confidentialité** | RLS sur toutes les tables, chiffrement en transit, chiffrement au repos (Supabase), journalisation des accès sensibles | §4.5, §11.2 |
| **Notification de violation** | Procédure documentée, délai de 72 h, contact de l'autorité de protection identifié | §18.2 |
| **Transferts hors du pays** | **Point de vigilance** : Supabase héberge par défaut dans l'Union européenne. Un transfert hors Tchad doit être justifié et encadré | §17 |

> ⚠️ **Point juridique à valider par un conseil tchadien avant le lancement.** L'hébergement des données de résidents tchadiens hors du territoire national est le principal risque de conformité du projet. Trois options : (a) démontrer que le transfert est autorisé et encadré par des garanties appropriées ; (b) héberger dans une région africaine si Supabase en propose une à proximité ; (c) prévoir une migration vers un hébergeur local pour les données sensibles. **À trancher avant l'ouverture au public, pas après.**

### 11.5 Registre des traitements — trame

| Traitement | Finalité | Base légale | Données | Destinataires | Durée |
|---|---|---|---|---|---|
| Gestion des comptes | Fournir le service | Contrat | Téléphone, nom, ville | Interne | Durée du compte + 30 j |
| Correspondance d'objets | Retrouver les objets | Contrat | Objet, lieu, date, description | Autres utilisateurs (anonymisé) | 12 mois |
| Vérification de propriété | Prévenir la fraude | Intérêt légitime | Réponses aux questions | Propriétaire, modérateur | 3 mois |
| Mise en relation | Organiser la restitution | Contrat | Messages, statut | Les deux parties | 24 mois |
| Paiement | Encaisser et reverser | Contrat + obligation légale | Montant, référence opérateur | Opérateur, comptabilité | 10 ans |
| Notifications | Informer | Contrat / consentement | Téléphone, préférences | Opérateur SMS | Durée du compte |
| Anti-fraude | Sécuriser la plateforme | Intérêt légitime | Signaux comportementaux, IP | Interne, modération | 5 ans |
| Statistiques | Piloter le produit | Intérêt légitime | Données agrégées et pseudonymisées | Interne | 25 mois |

### 11.6 Floutage automatique des documents

Exigence de la §12 du plan v2, à implémenter **avant** toute mise en ligne d'une photo de document.

```text
Pipeline de traitement d'une photo (route serveur, après envoi)

1. Vérifier le type MIME réel (magic bytes), pas seulement l'extension
2. Redimensionner : max 1600 px de côté
3. Générer trois variantes : miniature 200 px, affichage 800 px, originale (privée)
4. Convertir en WebP (qualité 82) + AVIF pour les navigateurs compatibles
5. Calculer un blurhash pour l'affichage progressif
6. Si item_categories.is_sensitive = true :
   a. Détection de zones (OCR + heuristique de mise en page de document)
   b. Appliquer un flou gaussien (rayon ≥ 20) ou un masque opaque sur :
      numéro complet, date de naissance, adresse, photo d'identité, MRZ
   c. Marquer is_blurred = true et enregistrer blur_regions
7. Stocker l'originale dans un bucket privé accessible uniquement au propriétaire
   et à un modérateur (jamais au trouveur, jamais au public)
```

**Règle de repli** : si la détection échoue, **l'image entière est floutée** jusqu'à validation humaine. Le principe est de ne jamais publier involontairement les données d'un document — c'est le comportement par défaut en cas de doute.

**Critère d'acceptation** : un test téléverse 10 photos de documents réels (CNI, passeport, permis) et vérifie qu'aucun numéro complet n'est lisible sur la variante publique.

---

## 12. Performance et résilience réseau

Le Tchad est traité comme un environnement à connectivité **variable**, pas simplement « mobile ». Les taux de pénétration d'Internet y sont faibles (de l'ordre de 17 à 22 % selon la Banque mondiale et l'étude CRASH/USIP citée dans le plan v2) et les coupures sont fréquentes. Les contraintes ci-dessous ne sont pas des optimisations : ce sont des exigences fonctionnelles.

### 12.1 Budget de performance

| Métrique | Cible (4G) | Cible (3G) | Mesure |
|---|---:|---:|---|
| LCP | < 1,8 s | < 3,5 s | Lighthouse CI, bloquant |
| INP | < 200 ms | < 500 ms | Vercel Speed Insights |
| CLS | < 0,05 | < 0,1 | Lighthouse CI |
| Poids de la page d'accueil | < 250 ko | < 250 ko | Analyse de bundle |
| Poids JS initial | < 120 ko compressé | < 120 ko | Analyse de bundle |
| Première recherche affichée | < 1 s | < 3 s | Mesure applicative |

### 12.2 Règles d'implémentation

**Images**
- `next/image` partout, jamais de `<img>` nu.
- Formats AVIF puis WebP, `sizes` explicites, `placeholder="blur"` avec `blurhash`.
- `loading="lazy"` sauf pour l'image du Hero.
- Compression côté client avant envoi : max 1600 px, qualité 0,8, cible < 300 ko.

**JavaScript**
- Aucune bibliothèque de plus de 30 ko sans justification écrite en revue.
- `next/dynamic` pour tout composant lourd hors du chemin critique (carte, éditeur, QR).
- Pas de polyfill inutile : `browserslist` cible les navigateurs réellement utilisés au Tchad.

**Réseau**
- `stale-while-revalidate` sur toutes les données publiques.
- Pagination par curseur, 20 éléments.
- Les listes longues sont virtualisées.
- Requêtes de recherche **débouncées** à 300 ms, annulées si une nouvelle frappe survient.

**Formulaires résilients**
- Brouillon en `localStorage` (débounce 500 ms).
- File d'attente d'envoi en IndexedDB pour les photos.
- Reprise automatique à la reconnexion, avec indicateur d'état visible.
- Aucune perte de saisie en cas de coupure, vérifié par test.

### 12.3 PWA

| Fonction | Priorité | Note |
|---|---|---|
| Manifest + icônes | P0 | Nom court « Liguita », thème `#E50F1A` |
| Installation sur l'écran d'accueil | P0 | Invitation après la 2ᵉ visite |
| Service worker (cache applicatif) | P0 | Serwist |
| Page hors ligne | P0 | « Vous êtes hors ligne — vos brouillons sont conservés » |
| Accès caméra | P0 | `getUserMedia` avec repli `<input type="file" capture>` |
| Notifications push | P1 | Nécessite l'installation |
| Synchronisation en arrière-plan | P1 | File d'attente des photos |

L'application Android native (P3) n'est envisagée qu'après validation de l'usage réel de la PWA. La PWA couvre 95 % du besoin pour 10 % du coût.

---

## 13. Internationalisation

- **Langue de lancement** : français.
- **Préparation technique dès le P0** : tous les textes passent par un dictionnaire (`next-intl`), aucune chaîne en dur dans les composants. Les routes restent en français (langue par défaut, sans préfixe).
- **Arabe en P2** : `/ar/*`, support `dir="rtl"`, police arabe (Noto Sans Arabic ou IBM Plex Sans Arabic). Les composants du design system doivent utiliser des propriétés logiques (`margin-inline-start` et non `margin-left`) **dès le P0** — c'est gratuit maintenant, coûteux après.
- **Langues locales (P3)** : arabe tchadien, sara, kanembou — uniquement si la demande est démontrée.

| Élément | P0 | P2 |
|---|---|---|
| Textes d'interface | Dictionnaire `fr.json` | `fr.json` + `ar.json` |
| Format des montants | `Intl.NumberFormat('fr-FR')` | Idem + `ar-TD` |
| Format des dates | `Intl.DateTimeFormat('fr-FR')` | Idem + `ar-TD` |
| Attribut `lang` | `fr` | `fr` / `ar` |
| Direction | LTR | LTR + RTL |
| Champs de base | `label_fr`, `label_ar` déjà présents | Remplissage |
| Recherche plein texte | Configuration `french` | `french` + `simple` |

---

## 14. Observabilité et indicateurs

### 14.1 Événements analytiques

Table `analytics_events`. Convention de nommage `objet_action` en anglais, au passé.

| Événement | Propriétés | Question à laquelle il répond |
|---|---|---|
| `search_performed` | `query`, `filters`, `result_count`, `duration_ms` | Que cherche-t-on ? Trouve-t-on ? |
| `search_zero_results` | `query`, `filters` | Qu'est-ce qui manque dans le stock ? |
| `saved_search_created` | `filters` | L'alerte est-elle adoptée ? |
| `lost_item_declared` | `category`, `class`, `has_value`, `has_photo` | Le formulaire est-il trop long ? |
| `found_item_declared` | `category`, `class`, `origin` | Les trouveurs publient-ils ? |
| `match_created` | `score`, `level`, `category` | Le moteur est-il pertinent ? |
| `match_viewed` | `score`, `level` | Les correspondances sont-elles consultées ? |
| `verification_started` | `category` | Le parcours de vérification rebute-t-il ? |
| `verification_passed` | `attempts`, `score` | Combien d'essais faut-il ? |
| `verification_failed` | `attempts`, `reason` | Fraude ou ergonomie ? |
| `quote_created` | `class`, `options`, `total_amount` | Quel est le panier moyen ? |
| `quote_option_toggled` | `option`, `enabled` | Les options sont-elles achetées ? |
| `payment_initiated` | `provider`, `amount` | Quel opérateur est choisi ? |
| `payment_completed` | `provider`, `amount`, `class`, `duration_s` | Le tunnel convertit-il ? |
| `payment_failed` | `provider`, `reason` | Pourquoi les paiements échouent-ils ? |
| `conversation_opened` | — | La mise en relation est-elle utilisée ? |
| `restitution_confirmed` | `days_since_payment`, `both_confirmed` | Le taux de restitution réel |
| `reward_released` | `amount`, `mode` | Le mode solidaire est-il adopté ? |
| `refund_triggered` | `reason`, `days` | Le remboursement est-il fréquent ? |

### 14.2 Tableaux de bord

**Funnel produit (hebdomadaire)** — c'est le tableau de bord qui compte :

```text
Recherches
    ↓  taux de conversion
Déclarations (perdu ou trouvé)
    ↓
Correspondances créées (score ≥ 70)
    ↓  taux de consultation
Correspondances consultées
    ↓  taux de démarrage
Vérifications lancées
    ↓  taux de réussite
Vérifications réussies
    ↓  taux de paiement
Paiements réussis
    ↓  taux de restitution
Restitutions confirmées
    ↓
Récompenses versées
```

Un décrochage net sur une marche indique exactement où travailler. C'est plus utile que n'importe quel KPI isolé.

**KPI de pilotage** (repris et complétés de la §47 du plan v2)

| Famille | Indicateur | Cible de lancement |
|---|---|---|
| Particuliers | Taux de correspondance (recherches → match) | > 15 % |
| Particuliers | Taux de restitution (match → restitué) | > 40 % |
| Particuliers | Délai médian perte → restitution | < 10 jours |
| Particuliers | Taux de réussite de vérification au 1ᵉʳ essai | > 70 % |
| Monétisation | Panier moyen par restitution | 1 200 FCFA |
| Monétisation | Taux d'acceptation du traitement urgent | > 10 % |
| Monétisation | Revenus Liguita mensuels | à définir avec les fondateurs |
| Business | Nombre d'organisations actives | 10 à 6 mois |
| Business | Objets enregistrés par organisation | > 100 |
| Business | Taux de restitution Business | > 50 % |
| Qualité | Taux d'échec de paiement | < 10 % |
| Qualité | Délai de revue manuelle de vérification | < 24 h |
| Coût | Coût SMS par restitution | < 150 FCFA |
| Coût | Coût d'encaissement / commission | < 15 % |

---

## 15. Stratégie de tests

### 15.1 Pyramide

| Niveau | Outil | Périmètre | Couverture cible |
|---|---|---|---|
| Unitaires | Vitest | `packages/core` : pricing, matching, classification, validation | **≥ 95 %** |
| Unitaires UI | Vitest + Testing Library | Composants du design system, états | ≥ 80 % |
| Intégration | Vitest + Supabase local | RLS, déclencheurs, fonctions SQL, workers | Politiques RLS : **100 %** |
| Bout en bout | Playwright | Les 6 parcours critiques | 100 % des parcours |
| Accessibilité | axe-core (dans Playwright) | Toutes les pages publiques et du parcours | 0 violation `serious`/`critical` |
| Performance | Lighthouse CI | Accueil, recherche, paiement | Budgets §12.1 |
| Visuel | Playwright snapshots | Design system, 2 thèmes de largeur | Revue manuelle |

### 15.2 Les 6 parcours de bout en bout bloquants

```text
E2E-1  Recherche sans compte
       Accueil → taper « carte » → résultats → ouvrir une correspondance
       Attendu : résultats en < 3 s en 3G simulée, aucune donnée personnelle exposée

E2E-2  Perte → restitution complète (parcours roi)
       Inscription OTP → déclarer une perte (C1) → un objet trouvé correspondant
       est publié → correspondance créée → vérification réussie → devis 300 FCFA
       → paiement → conversation → double confirmation → récompense 100 FCFA
       Attendu : chaque étape franchie, montants exacts à chaque affichage

E2E-3  Trouvé → récompense
       Déclarer un objet trouvé (C3) → correspondance → paiement par le propriétaire
       → restitution → récompense de 400 FCFA versée

E2E-4  Options tarifaires
       Pour chaque option (urgent, conciergerie, livraison, bonus), vérifier que le
       total affiché correspond exactement au total du devis serveur

E2E-5  Échec et remboursement
       Paiement réussi → aucune mise en relation sous 7 jours → remboursement
       intégral automatique → écritures comptables compensatoires correctes

E2E-6  Cloisonnement Business
       Un AGENT du site A ne peut pas lire ni modifier un objet du site B
       (test négatif : tentative d'accès direct à l'URL et à l'API)
```

### 15.3 Tests dorés du moteur de tarification

Les 18 cas de §5.7 sont encodés comme un tableau de données. **Toute modification du moteur doit les faire passer sans qu'aucun cas ne soit modifié.** Si un cas doit changer, c'est une décision produit qui exige une validation explicite et une nouvelle version de `pricing_rules` — jamais un ajustement silencieux du test.

### 15.4 Tests de non-régression à surveiller

| Test | Ce qu'il protège |
|---|---|
| Parité trigramme TS ↔ `pg_trgm` | Cohérence du score de matching entre calcul hors base et en base |
| Bundle client sans `SERVICE_ROLE_KEY` | Fuite de privilèges |
| Montants client = montants serveur | Manipulation de prix côté client |
| Immuabilité de `price_quotes` | Modification a posteriori d'un devis payé |
| Idempotence des webhooks | Double encaissement |
| RLS par rôle | Fuite de données entre utilisateurs et entre établissements |
| Purge selon les durées de conservation | Conformité loi 007/PR/2015 |
| Aucun numéro de téléphone dans les réponses publiques | Vie privée |

---

## 16. Roadmap d'implémentation

### 16.1 Vue d'ensemble

| Phase | Contenu | Durée estimée | Critère de sortie |
|---|---|---|---|
| **P0 — MVP** | Sprints 0 à 10 | ~120 j-h de développement | Le parcours roi fonctionne de bout en bout avec un vrai paiement |
| **P1 — Commercial** | Lots B1 à B8 | ~70 j-h | Premières organisations payantes, WhatsApp actif |
| **P2 — Croissance** | Lots C1 à C8 | ~90 j-h | IA, livraison, Coffre Liguita, API |
| **P3 — Écosystème** | Lots D1 à D4 | à cadrer | Android, USSD, vocal multilingue |

Avec une équipe de **2 développeurs full-stack + 1 designer à temps partiel**, le P0 représente environ **14 à 16 semaines calendaires** (le cumul des jours-hommes n'est pas linéaire : revues, attentes externes et imprévus s'ajoutent). Les attentes externes listées en §16.6 peuvent décaler le lancement de plusieurs semaines si elles ne sont pas lancées dès le Sprint 0.

### 16.2 P0 — Sprints détaillés

#### Sprint 0 — Fondations · 10 j

**Objectif** : disposer d'un socle sur lequel tout le reste s'appuie sans devoir être repris.

| # | Tâche | Livrable | j |
|---|---|---|---:|
| 0.1 | Initialiser le monorepo pnpm + Turborepo, TypeScript strict, ESLint, Prettier, Husky | Dépôt qui build à vide | 1 |
| 0.2 | Implémenter `packages/ui` : tokens, preset Tailwind, variables CSS, `Button`, `Input`, `Badge`, `Card`, `Money` | Storybook ou page `/design-system` | 3 |
| 0.3 | Charger Plus Jakarta Sans + Inter en auto-hébergé via `next/font/local` | Polices servies, aucun appel externe | 0,5 |
| 0.4 | Créer le projet Supabase, la chaîne de migrations, les types générés | `pnpm db:reset` fonctionne | 1 |
| 0.5 | Migrations : référentiels (pays, villes, quartiers, catégories, types, lieux) + seed N'Djamena | Base peuplée | 2 |
| 0.6 | `pricing_rules` v1 + `packages/core/pricing` + les 18 tests dorés | Tests verts | 1,5 |
| 0.7 | Rédiger les documents légaux (CGU, confidentialité, mentions) | Pages publiées | 0,5 (rédaction externe) |
| 0.8 | CI GitHub Actions (lint, typecheck, tests) | Pipeline vert sur PR | 0,5 |

**Definition of Done** : `pnpm dev` démarre, `/design-system` affiche les tokens, `pnpm test` passe, la base locale contient les 22 quartiers de N'Djamena et les 6 catégories d'objets.

> **Décision à prendre pendant ce sprint** : le nom de domaine. `liguita.td` ou `liguita.com` ? Le `.td` renforce l'ancrage local mais son obtention auprès de l'autorité tchadienne peut prendre du temps. À lancer immédiatement.

#### Sprint 1 — Authentification · 8 j

| # | Tâche | j |
|---|---|---:|
| 1.1 | Inscription par téléphone + OTP SMS (Supabase Auth + adaptateur SMS) | 2 |
| 1.2 | Connexion par mot de passe, réinitialisation, session | 1,5 |
| 1.3 | Middleware de session + gardes de route (`/app`, `/business`, `/admin`) | 1 |
| 1.4 | Création automatique de `profiles` au premier login (déclencheur SQL) | 0,5 |
| 1.5 | Limitation de débit sur l'OTP | 1 |
| 1.6 | Écrans `/connexion`, `/inscription`, `/otp` conformes au design system | 1,5 |
| 1.7 | Tests RLS de base (3 utilisateurs, cloisonnement) | 0,5 |

**DoD** : un utilisateur s'inscrit, se déconnecte, se reconnecte. Un test vérifie qu'un utilisateur A ne peut pas lire le profil de B.

#### Sprint 2 — Objets · 12 j

| # | Tâche | j |
|---|---|---:|
| 2.1 | Migrations `lost_items`, `found_items`, `item_photos`, `item_attributes`, `item_status_history` + RLS | 2 |
| 2.2 | Envoi de photos : URL signée, compression client, 3 variantes, blurhash | 2,5 |
| 2.3 | Formulaire « J'ai perdu » en 3 étapes avec brouillon `localStorage` | 3 |
| 2.4 | Formulaire « J'ai trouvé » en 3 champs obligatoires | 1,5 |
| 2.5 | Floutage automatique des documents sensibles | 2 |
| 2.6 | `Combobox` ville / quartier / catégorie avec données mises en cache | 1 |

**DoD** : les deux formulaires fonctionnent, un brouillon survit à une coupure, une photo de CNI est publiée floutée.

#### Sprint 3 — Recherche · 10 j

| # | Tâche | j |
|---|---|---:|
| 3.1 | Vue `public_found_items` + politiques RLS associées | 1 |
| 3.2 | Recherche plein texte `tsvector` + `pg_trgm` | 2 |
| 3.3 | Page `/rechercher` : champ, filtres, résultats, pagination par curseur | 3 |
| 3.4 | `ItemCard` anonymisée + badges de correspondance | 1 |
| 3.5 | Page `/objets-trouves` (ISR) | 1 |
| 3.6 | États vides, chargement, erreur, hors ligne | 1 |
| 3.7 | Test : aucune donnée personnelle dans la réponse réseau | 1 |

**DoD** : rechercher « carte » remonte « Carte nationale ». La réponse JSON ne contient aucun téléphone, nom ni adresse.

#### Sprint 4 — Correspondance · 10 j

| # | Tâche | j |
|---|---|---:|
| 4.1 | `packages/core/matching` + tests unitaires + parité trigramme | 2,5 |
| 4.2 | Migration `matches` + RLS | 1 |
| 4.3 | Fonctions SQL `match_candidates_for_found` / `match_candidates_for_lost` | 1,5 |
| 4.4 | Matching synchrone à la création d'un objet | 1 |
| 4.5 | Worker `match-sweep` (15 min) | 2 |
| 4.6 | Écran `/app/correspondances` + détail | 1,5 |
| 4.7 | `saved_searches` + worker d'alertes | 1,5 |

**DoD** : publier un objet trouvé correspondant à une perte existante crée une correspondance en moins de 2 s et notifie le propriétaire.

#### Sprint 5 — Vérification · 8 j

| # | Tâche | j |
|---|---|---:|
| 5.1 | Migrations `verification_questions`, `claims`, `verification_answers` + RLS | 1,5 |
| 5.2 | Seed des questions par catégorie (au moins les 6 catégories du lancement) | 1 |
| 5.3 | Générateur de questions + barème de notation | 1,5 |
| 5.4 | Assistant de vérification (mobile d'abord) | 2 |
| 5.5 | Limitation à 3 tentatives + ouverture automatique d'un dossier de fraude | 1 |
| 5.6 | Écran de revue manuelle côté modération | 1 |

**DoD** : une bonne réponse approuve, trois mauvaises verrouillent la correspondance et créent un dossier de fraude.

#### Sprint 6 — Tarification et paiement · 14 j

| # | Tâche | j |
|---|---|---:|
| 6.1 | Migration `price_quotes` + déclencheur d'immuabilité | 1 |
| 6.2 | Route `POST /api/pricing/quote` + `POST /api/pricing/options` | 1,5 |
| 6.3 | Bloc devis (variante sombre) + sélecteur d'options en direct | 2 |
| 6.4 | `packages/payments` : interface + adaptateur `cash` (Cash Liguita) | 2 |
| 6.5 | Adaptateur Airtel Money + webhook signé | 3 |
| 6.6 | Adaptateur Moov Money + webhook signé | 2 |
| 6.7 | Migrations `transactions`, `rewards`, `ledger_entries` + écritures comptables | 1,5 |
| 6.8 | Idempotence, rejeu de webhooks, gestion des échecs | 1 |
| 6.9 | Worker `payment-reconcile` | 1 |

**DoD** : un paiement réel de bout en bout sur un montant de test, avec écritures comptables correctes et double clic sans double débit.

> ⚠️ **Le Sprint 6 est le plus risqué du projet.** Il dépend d'accords avec Airtel et Moov, d'une documentation d'API parfois incomplète et de délais de validation commerciale. Il doit démarrer **en parallèle du Sprint 3**, pas après. Voir §16.6.

#### Sprint 7 — Mise en relation et restitution · 12 j

| # | Tâche | j |
|---|---|---:|
| 7.1 | Migrations `conversations`, `messages` + RLS + Realtime | 2 |
| 7.2 | Interface de conversation + messages système | 2,5 |
| 7.3 | Détection de sortie de plateforme (marquage, pas blocage) | 1 |
| 7.4 | Dossier de restitution : lieu, date, double confirmation | 2 |
| 7.5 | Versement de la récompense + mode solidaire + badge Samaritain | 2 |
| 7.6 | Worker `notify-dispatch` + `notifications` | 2 |
| 7.7 | Remboursement automatique à 7 jours | 1,5 |

**DoD** : le parcours complet perte → restitution → récompense fonctionne, avec double confirmation et écritures comptables.

#### Sprint 8 — Business · 14 j

| # | Tâche | j |
|---|---|---:|
| 8.1 | Migrations `organizations`, `organization_locations`, `organization_users` + RLS par rôle | 2,5 |
| 8.2 | Création d'organisation + invitation d'équipe + acceptation | 2 |
| 8.3 | Console `/business` : tableau de bord, compteurs | 2 |
| 8.4 | Inventaire : liste, filtres, ajout rapide, import CSV | 3 |
| 8.5 | Localisation physique (bâtiment, étage, zone, armoire, casier) | 1 |
| 8.6 | QR code par objet + scan | 1,5 |
| 8.7 | Restitutions depuis la console | 2 |

**DoD** : une organisation, deux établissements, trois rôles, cloisonnement vérifié par test négatif.

#### Sprint 9 — Administration · 10 j

| # | Tâche | j |
|---|---|---:|
| 9.1 | Console `/admin` : utilisateurs, objets, correspondances | 2,5 |
| 9.2 | Transactions, remboursements, rapprochement | 2 |
| 9.3 | Signalements, réclamations, dossiers de fraude | 2 |
| 9.4 | Éditeur de `pricing_rules` avec simulation sur les 18 cas dorés | 2,5 |
| 9.5 | `audit_logs` + `data_access_logs` + consultation | 1 |

**DoD** : un modérateur peut traiter un signalement, rembourser une transaction et publier une nouvelle grille tarifaire sans redéploiement.

#### Sprint 10 — Tests, sécurité, lancement · 12 j

| # | Tâche | j |
|---|---|---:|
| 10.1 | Les 6 parcours E2E Playwright | 3 |
| 10.2 | Audit d'accessibilité axe-core + corrections | 2 |
| 10.3 | Optimisation des budgets de performance (§12.1) | 2 |
| 10.4 | PWA : manifest, service worker, page hors ligne | 1,5 |
| 10.5 | Tâche `retention-purge` + vérification de conformité | 1 |
| 10.6 | Sentry, supervision, alertes | 1 |
| 10.7 | Tests utilisateurs réels à N'Djamena (10 personnes) | 1,5 |

**DoD de lancement** : voir la checklist §18.2.

### 16.3 P1 — Lots de lancement commercial

| Lot | Contenu | j | Dépend de |
|---|---|---:|---|
| **B1** | Abonnements : `subscription_plans`, `subscriptions`, facturation, quotas de restitutions « frais offerts » | 12 | Sprint 8 |
| **B2** | Multi-sites avancé : bascule de site, statistiques par site, rôles fins | 6 | B1 |
| **B3** | Bot WhatsApp officiel : déclarer, chercher, suivre l'état, notifier | 18 | Sprint 4, Sprint 7 |
| **B4** | SMS : canal complet, préférences, gestion du coût | 5 | Sprint 7 |
| **B5** | Statistiques Business : tableaux de bord, export CSV/Excel | 8 | B1 |
| **B6** | Attestation numérique de restitution (Innovation #3) | 4 | Sprint 7 |
| **B7** | Score de confiance et badges (Innovation #4) | 6 | Sprint 9 |
| **B8** | Anti-fraude avancé : hachage perceptuel des photos, détection de collusion | 8 | Sprint 9 |
| **B9** | QR Business complet : étiquettes imprimables, lot, scan agent | 6 | Sprint 8 |

### 16.4 P2 — Lots de croissance

| Lot | Contenu | j |
|---|---|---:|
| **C1** | Coffre Liguita — inventaire préventif chiffré (Innovation #8) | 14 |
| **C2** | Recherche en langage naturel (extraction catégorie / ville / zone / date) | 10 |
| **C3** | Matching sémantique `pgvector` + embeddings | 12 |
| **C4** | Analyse photo : catégorisation automatique, appariement visuel | 16 |
| **C5** | Livraison : partenaires, tarifs réels, suivi, points relais (Innovation #9) | 14 |
| **C6** | Conciergerie documents (Innovation #10) | 8 |
| **C7** | API Business publique : clés, quotas, documentation, webhooks | 14 |
| **C8** | Application Android native (si la PWA ne suffit pas) | 25 |
| **C9** | QR personnel : étiquettes, porte-clés, packs (P1 dans le plan v2, ici en P2) | 10 |
| **C10** | Internationalisation arabe + RTL | 10 |

### 16.5 P3 — Lots de différenciation

| Lot | Contenu | Note |
|---|---|---|
| **D1** | Canaux hors internet : USSD opérateur, ligne vocale (Innovation #11) | Nécessite des accords Airtel et Moov — délai d'obtention long |
| **D2** | Déclaration vocale multilingue (Innovation #12) | Français, arabe, langues locales |
| **D3** | Marketplace de tags et d'étiquettes Liguita | Produit complémentaire (§28 du plan v2) |
| **D4** | Extension multi-pays (Cameroun, Niger, Gabon) | L'architecture multi-pays est prête dès le P0 ; il ne reste que les référentiels, la devise et les opérateurs |

### 16.6 Chemin critique et attentes externes

Ces éléments **ne dépendent pas du développement** et sont souvent les vrais goulots d'étranglement au Tchad. Ils doivent être lancés **dès le Sprint 0**.

| # | Attente externe | Impact si retardé | À lancer |
|---|---|---|---|
| A1 | **Accord marchand Airtel Money** (tarif d'encaissement) | Bloque le Sprint 6, donc tout le paiement | Sprint 0 |
| A2 | **Accord marchand Moov Money** | Réduit les options de paiement à un seul opérateur | Sprint 0 |
| A3 | **Validation des documents légaux** par un conseil tchadien | Bloque l'ouverture au public | Sprint 0 |
| A4 | **Avis juridique sur l'hébergement hors Tchad** | Risque de conformité loi 007/PR/2015 | Sprint 0 |
| A5 | **Devis de livraison urbaine** (Nimvi, Kimre, Speed Delivery) | Bloque l'option livraison | Sprint 3 |
| A6 | **Fournisseur SMS** avec couverture Tchad et tarif au volume | Bloque l'OTP, donc toute l'authentification | Sprint 0 |
| A7 | **Obtention du domaine** (`liguita.td` ou `.com`) | Bloque le lancement | Sprint 0 |
| A8 | **Compte WhatsApp Business validé** | Bloque le lot B3 | Sprint 6 |
| A9 | **Identification du délégué à la protection des données** | Bloque la conformité | Sprint 4 |
| A10 | **Validation du taux de TVA** par un comptable | Risque fiscal sur la commission | Sprint 4 |

**Chemin critique technique** : `Sprint 0 → Sprint 2 (objets) → Sprint 4 (matching) → Sprint 5 (vérification) → Sprint 6 (paiement) → Sprint 7 (restitution)`. Toute dérive sur le Sprint 2 ou le Sprint 6 se répercute intégralement sur la date de lancement.

**Optimisation recommandée** : les Sprints 8 (Business) et 9 (Admin) peuvent se dérouler **en parallèle** du Sprint 7 par une seconde personne, et le Sprint 10 en parallèle de la fin du Sprint 8. Cela ramène le P0 d'environ 16 semaines à environ 13.

### 16.7 Definition of Done — globale

Une fonctionnalité n'est terminée que si **tous** ces points sont satisfaits :

```text
☐ Le comportement est implémenté côté serveur (jamais seulement côté client)
☐ Les politiques RLS sont écrites et couvertes par un test
☐ Les états loading / empty / error / offline sont traités
☐ Le composant respecte les tokens du design system (aucune valeur en dur)
☐ L'accessibilité est vérifiée (clavier, lecteur d'écran, contraste, axe-core)
☐ Les tests unitaires couvrent la logique métier (≥ 90 % sur packages/core)
☐ Le parcours correspondant est couvert par un test E2E
☐ Les événements analytiques sont émis
☐ Les textes passent par le dictionnaire i18n
☐ Le budget de performance est respecté
☐ La documentation est à jour
☐ La revue de code est approuvée par une seconde personne
```

---

## 17. Risques et mitigations

### 17.1 Risques de conformité et juridiques

| # | Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **Hébergement des données hors du Tchad non conforme** à la loi 007/PR/2015 | Moyenne | **Élevé** | Avis juridique dès le Sprint 0 (A4). Prévoir une stratégie de migration vers un hébergement régional ou local pour les données sensibles |
| R2 | **TVA mal appliquée** sur la commission | Moyenne | Moyen | Validation comptable avant le Sprint 6 (A10). Le champ `vat_rate` est paramétrable en base, sans redéploiement |
| R3 | **Qualification juridique des frais** contestée (« vente de coordonnées ») | Faible | Élevé | Formulation systématique « frais de mise en relation ». CGU rédigées en conséquence. Le numéro du trouveur n'est jamais transmis par Liguita |
| R4 | **Absence de registre des traitements** en cas de contrôle | Moyenne | Moyen | `data_access_logs` implémenté dès le Sprint 0, registre documenté en §11.5 |

### 17.2 Risques techniques

| # | Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|---|
| R5 | **Score de matching peu pertinent** sur les premières données réelles | Élevée | Élevé | Les poids sont en base et ajustables sans redéploiement. Prévoir une revue du moteur après 1 000 correspondances. Journaliser `breakdown` pour analyser les faux positifs |
| R6 | **Échec des paiements mobiles** (opérateur indisponible, USSD expiré) | Élevée | Élevé | Adaptateur `cash` en repli, polling de secours, réconciliation automatique, messages d'erreur explicites en français |
| R7 | **API opérateur mal documentée ou instable** | Élevée | Élevé | L'abstraction `LiguitaPay` permet de changer d'opérateur sans toucher au métier. Prévoir 3 jours de marge par adaptateur |
| R8 | **Coût des SMS supérieur à la commission** sur les classes C1/C2 | Moyenne | Moyen | Classification des notifications en CRITIQUE / IMPORTANT / INFORMATIF (§10.1). Mesure du coût SMS par restitution (KPI §14.2) |
| R9 | **Fuite de données via RLS mal configurée** | Moyenne | **Critique** | Tests RLS bloquants en CI, 100 % des politiques couvertes. Revue obligatoire sur toute migration |
| R10 | **Bande passante insuffisante** pour les photos | Moyenne | Moyen | Compression client obligatoire, 3 variantes, WebP/AVIF, blurhash, file d'attente IndexedDB |
| R11 | **Sous-estimation du Sprint 6** (paiement) | Élevée | Élevé | Démarrer les accords opérateurs au Sprint 0. Réduire le périmètre P0 à un seul opérateur + cash si nécessaire |

### 17.3 Risques produit et marché

| # | Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|---|
| R12 | **Stock d'objets trouvés insuffisant** au lancement → aucune correspondance | **Élevée** | **Critique** | C'est le risque numéro un. Le produit n'a de valeur que s'il y a des objets à trouver. **Amorcer le stock avant l'ouverture** : partenariats avec les aéroports, gares, hôtels et supermarchés de N'Djamena, saisie manuelle des registres existants. Objectif : 500 objets trouvés avant le lancement public |
| R13 | **Les trouveurs ne publient pas** (pas d'incitation) | Élevée | Élevé | Afficher la récompense **dès la publication** (§7.4). Paiement mobile immédiat après restitution. Badge Samaritain |
| R14 | **Contournement de la plateforme** (les parties se retrouvent sans payer) | Élevée | Moyen | Détection (non blocage) des numéros dans les messages. Valeur ajoutée réelle : vérification de propriété, tiers de confiance, attestation. Acceptable dans une certaine mesure |
| R15 | **Faible taux d'acceptation du paiement** | Moyenne | Élevé | Prix calibrés sur le marché réel (300–3 000 FCFA ≈ 0,5 à 5 % du SMIG). Paiement affiché avant l'engagement. Option solidaire pour les cas sensibles |
| R16 | **Concurrence par un acteur informel** (groupes WhatsApp, Facebook) | Moyenne | Moyen | Se différencier par la vérification, la sécurité et la traçabilité — pas par la publication |
| R17 | **Les organisations ne paient pas l'abonnement** | Moyenne | Moyen | Commencer par des pilotes gratuits avec 3 établissements, mesurer le taux de restitution, puis facturer sur la valeur démontrée. Les plans 25 000 / 50 000 FCFA sont **indicatifs** et doivent être validés auprès des premiers clients |

### 17.4 Décisions en suspens à trancher

| # | Décision | Échéance | Impact si non tranchée |
|---|---|---|---|
| D1 | Hébergement des données : UE, région africaine ou local | Sprint 0 | Bloque la conformité et le lancement |
| D2 | Nom de domaine : `.td` ou `.com` | Sprint 0 | Bloque le lancement |
| D3 | Nombre d'opérateurs de paiement au lancement (1 ou 2 + cash) | Sprint 0 | Bloque le Sprint 6 |
| D4 | Prix des abonnements Business : confirmer 25 000 / 50 000 FCFA | Sprint 8 | Impacte la proposition commerciale |
| D5 | Tarif de livraison réel (remplacer le proxy de 2 500 FCFA) | Sprint 3 | Bloque l'option livraison |
| D6 | Quota de restitutions « frais offerts » par plan | Sprint 8 | Impacte la marge sur le B2B |
| D7 | Taux de TVA applicable à la commission | Sprint 4 | Risque fiscal |
| D8 | Faut-il appliquer la TVA en sus du total ou l'extraire de la commission ? | Sprint 6 | Impacte le montant payé par l'utilisateur |

---

## 18. Annexes

### 18.1 Grille tarifaire canonique — fiche de référence

```text
╔══════════════════════════════════════════════════════════════════════╗
║  LIGUITA — FRAIS DE MISE EN RELATION · Version 1 · Septembre 2026    ║
║  Devise : FCFA (XAF) · Pays : Tchad (TD)                             ║
╠══════════════════════════════════════════════════════════════════════╣
║  CLASSE   TYPES D'OBJETS                        BASE    TROUVEUR  LIGUITA
║  ────────────────────────────────────────────────────────────────────
║  C1       Documents & cartes                    300 F    100 F    200 F
║           CNI, passeport, permis, diplômes,
║           carte d'étudiant, carnet de santé
║  ────────────────────────────────────────────────────────────────────
║  C2       Effets personnels courants            700 F    250 F    450 F
║           Portefeuille, sac, clés, lunettes,
║           vêtements, livres, bijoux fantaisie
║  ────────────────────────────────────────────────────────────────────
║  C3       Électronique & valeur moyenne       1 200 F    400 F    800 F
║           Téléphone entrée/milieu de gamme,
║           tablette, ordinateur, écouteurs,
║           montre connectée, appareil photo, vélo
║  ────────────────────────────────────────────────────────────────────
║  C4       Valeur élevée                       3 000 F    900 F  2 100 F
║           Smartphone haut de gamme, bijoux
║           précieux, sac de marque, matériel
║           professionnel, instrument
║  ────────────────────────────────────────────────────────────────────
║  C5       Cas spéciaux                   1 % de la valeur déclarée
║           Valeur > 1 000 000 FCFA,            plancher  5 000 F
║           véhicule, lot d'entreprise          plafond  25 000 F
║                                               trouveur  30 %  ·  Liguita 70 %
╠══════════════════════════════════════════════════════════════════════╣
║  OPTIONS                                                             ║
║  Traitement urgent        +50 % des frais de base  → Liguita         ║
║  Conciergerie documents   1 000 F                  → Liguita         ║
║  Livraison urbaine        2 500 F (proxy, à confirmer) → Partenaire  ║
║  Bonus communautaire      montant libre            → 100 % trouveur  ║
╠══════════════════════════════════════════════════════════════════════╣
║  RÈGLES                                                              ║
║  · La classe découle de la catégorie, puis de la valeur déclarée     ║
║  · Valeur déclarée > 1 000 000 FCFA → classe C5                      ║
║  · Jamais de déclassement automatique                                ║
║  · Cas ambigu → classe la plus basse (ne jamais dissuader)           ║
║  · Montant toujours affiché avant paiement, figé dans un devis       ║
║  · Commission affichée hors taxes · TVA 18 % à valider               ║
╚══════════════════════════════════════════════════════════════════════╝
```

### 18.2 Checklist de lancement

**Juridique et conformité**

```text
☐ CGU publiées et validées par un conseil tchadien
☐ Politique de confidentialité publiée
☐ Mentions légales publiées
☐ Registre des traitements constitué
☐ Avis sur l'hébergement hors Tchad obtenu et documenté
☐ Délégué à la protection des données identifié
☐ Taux de TVA validé par un comptable
☐ Procédure de notification de violation rédigée (délai 72 h)
☐ Durées de conservation implémentées et testées
☐ Droits d'accès, de rectification et d'effacement opérationnels depuis /app/securite
```

**Technique**

```text
☐ Les 6 parcours E2E passent
☐ 100 % des politiques RLS couvertes par des tests
☐ Aucune violation axe-core serious ou critical
☐ Budgets de performance respectés en 3G simulée
☐ PWA installable, page hors ligne fonctionnelle
☐ Sentry actif, alertes configurées
☐ Sauvegardes base de données automatiques + restauration testée
☐ Bundle client sans SERVICE_ROLE_KEY (test automatisé)
☐ Webhooks opérateurs signés et idempotents (test de rejeu)
☐ Remboursement automatique à 7 jours testé
☐ Tâche retention-purge testée et idempotente
☐ Domaine configuré, HTTPS forcé, en-têtes de sécurité en place
```

**Contenu et stock**

```text
☐ Au moins 500 objets trouvés saisis (risque R12)
☐ 3 établissements pilotes ont publié leur registre existant
☐ 6 catégories avec icônes et questions de vérification renseignées
☐ 22 quartiers de N'Djamena + villes secondaires (Moundou, Abéché, Sarh)
☐ Grille tarifaire v1 active en base
☐ Textes de toutes les pages relus
```

**Opérations**

```text
☐ 2 modérateurs formés au traitement des signalements et des vérifications manuelles
☐ Procédure de remboursement documentée
☐ Procédure de blocage de compte documentée
☐ Canal de support ouvert (WhatsApp ou téléphone)
☐ Astreinte définie pour les incidents de paiement
☐ 10 tests utilisateurs réalisés à N'Djamena, retours intégrés
```

### 18.3 Fichiers du dépôt à corriger ou créer

| Fichier | Action | Raison |
|---|---|---|
| `docs/Newwwww Liguita_Plan_Implementation_v2.txt` | **Supprimer** | Copie strictement identique du `.md` (vérifié par `diff`) |
| `docs/Nouveau document texte.txt` | **Supprimer**, remplacer par `README.md` | Ne contient que l'URL du dépôt GitHub |
| `README.md` | **Créer** | Présentation du projet, installation, structure, liens vers les plans |
| `docs/Liguita_Plan_Implementation_v2.md` | **Conserver**, annoter | Sert de base stratégique ; ajouter un renvoi vers ce document en tête |
| `docs/Liguita_Plan_Implementation_v3.md` | **Ce document** | Plan d'exécution technique |
| `docs/Liguita_Plan_Implementation_v3.html` | Généré depuis le `.md` | Version lisible et imprimable |
| `docs/design system/board_foundations.html` | **Mettre à jour** | Aligner les tokens sur le design system canonique (§2) : police, rayon des boutons, sémantique |
| `docs/design system/board_components.html` | **Mettre à jour** | Idem + corriger le devis (300 FCFA, pas 500) |
| `docs/design system/ChatGPT Image ...19_10_34.png` | **Conserver comme référence** | Palette à corriger : `#FF3830` → `#E50F1A`, police → Plus Jakarta Sans |
| `docs/design system/ChatGPT Image ...19_25_47.png` | **Corriger la maquette** | « à partir de 500 FCFA » → « à partir de 300 FCFA » ; répartition 100/400 → 100/200 |
| `docs/design system/sdddd.png` | Conserver | Illustration du Hero |
| `docs/Liguita_Grille_Tarifaire.xlsx` | **Conserver — source de vérité tarifaire** | Ajouter un onglet « Historique des versions » |
| `logo/*.png` | Conserver | Export SVG recommandé pour l'usage web |
| `.workbuddy-ai/` | **Créer** | Mémoire du projet |
| `.gitignore`, `package.json`, `pnpm-workspace.yaml` | **Créer** | Le dépôt n'est pas initialisé |

**Rappel** : `git` n'est **pas** initialisé localement dans `C:\Users\Lenovo\Desktop\liguita`. Le premier geste technique du Sprint 0 est :

```bash
cd "C:/Users/Lenovo/Desktop/liguita"
git init
git remote add origin https://github.com/marcmahonte-art/liguita.git
git add .
git commit -m "chore: initialisation du dépôt — plans et design system"
git push -u origin main
```

### 18.4 Glossaire

| Terme | Définition |
|---|---|
| **Classe tarifaire** | Catégorie normalisée (C1 à C5) déterminant les frais de mise en relation |
| **Correspondance** (`match`) | Rapprochement calculé entre un objet perdu et un objet trouvé |
| **Devis** (`price_quote`) | Montant figé et immuable présenté avant paiement |
| **Établissement** (`location`) | Site physique d'une organisation (aéroport, gare, hôtel…) |
| **Ledger** | Registre comptable en partie double, en ajout seul |
| **Mise en relation** | Conversation sécurisée entre propriétaire et trouveur, via Liguita |
| **Organisation** | Entreprise cliente de Liguita Business |
| **Récompense** | Part des frais reversée au trouveur |
| **Restitution** | Remise effective de l'objet, confirmée par les deux parties |
| **RLS** | Row Level Security — cloisonnement des données au niveau de la base |
| **Trouveur** | Personne ayant déclaré un objet trouvé |
| **Vérification de propriété** | Questions permettant de confirmer que le réclamant est bien le propriétaire |

---

## Conclusion

Ce document transforme une vision produit solide en un plan exécutable. Trois idées le structurent :

**1. Le stock d'objets trouvés est le vrai problème, pas la technique.**
Toute l'ingénierie décrite ici ne vaut que s'il y a des objets à trouver. Le risque R12 — un lancement sans stock — est plus dangereux que n'importe quel risque technique. **La campagne d'amorçage auprès des aéroports, gares, hôtels et supermarchés de N'Djamena doit démarrer au Sprint 0, en parallèle du développement.**

**2. Le prix doit être juste, pas maximal.**
La grille calibrée sur le marché réel (300 FCFA ≈ 3 à 6 % du coût de remplacement d'une CNI ; 3 000 FCFA ≈ 5 % d'un SMIG mensuel) n'est pas une contrainte subie, c'est l'argument commercial : un prix que personne ne conteste, donc un taux de restitution élevé, donc un volume qui rend le modèle viable. Les 18 cas de test de la §5.7 protègent cette justesse contre les dérives.

**3. La conformité et la vie privée sont des fonctionnalités, pas des obligations subies.**
Le floutage automatique des documents, l'anonymisation des résultats de recherche et la non-transmission des coordonnées du trouveur ne sont pas seulement des exigences de la loi 007/PR/2015 : ce sont exactement ce qui distingue Liguita d'un groupe Facebook. La confiance est le produit.

> **Liguita — J'ai trouvé. Tu as perdu. On se retrouve.**

---

*Document généré le 23 septembre 2026 — Version 3.0*
*Complète `Liguita_Plan_Implementation_v2.md` (vision produit) et `Liguita_Grille_Tarifaire.xlsx` (source tarifaire).*
