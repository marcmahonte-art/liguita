# Plan d'implémentation — Dashboard `/app` (Tableau de bord)

## Analyse comparative : Image de référence vs `/app` actuel

### Ce qui EXISTE déjà dans le code
| Section | Route | Statut |
|---------|-------|--------|
| Sidebar (logo, nav, liens) | `AppSidebar.tsx` | ✅ Existe |
| Top bar (notifications, profil) | `AppTopBar.tsx` | ✅ Existe |
| Mes correspondances | `/app/correspondances` | ✅ Fonctionnel |
| Messages | `/app/messages` | ✅ Existe |
| Mes objets | `/app/objets` | ✅ Existe |
| Mes avis de recherche | `/app/avis` | ✅ Fonctionnel |
| Notifications | `/app/notifications` | ✅ Fonctionnel |
| Mon profil | `/app/profil` | ✅ Existe (basique) |
| Mes paiements | `/app/paiements` | ⚠️ ComingSoon placeholder |
| Mes récompenses | `/app/recompenses` | ⚠️ ComingSoon placeholder |

### Ce qui MANQUE (comparé à l'image de référence)

#### 🔴 MANQUANT CRITIQUE — La page `/app` (Tableau de bord principal)
Actuellement `/app` redirige vers `/app/correspondances`.  
L'image montre un **vrai tableau de bord** avec 6 sections :

| Section manquante | Description dans l'image |
|---|---|
| **1. Bannière Hero** | Salutation personnalisée ("Bonjour Moussa 👋"), sous-titre, 2 CTAs (Rechercher + Déclarer trouvé) + photo |
| **2. Mon portefeuille (widget)** | Solde total (2 350 FCFA), œil masquer, lien transactions, En attente + Disponible |
| **3. Mes statistiques (widget)** | Objets trouvés (3), Objets perdus (5), Mises en relation (2), Ma note (4.8) avec liens "→ Voir" |
| **4. Mes dernières activités** | Liste 4 items avec image, badge statut coloré, titre objet, ville, date — lien "Voir tout" |
| **5. Transactions récentes** | Liste transactions avec icône, label, date, type objet, montant coloré (+ vert / - rouge) |
| **6. Notifications (widget)** | 4 dernières notifs avec icône colorée, titre, corps, temps relatif — lien "Voir tout" |
| **7. Bannière Étiquettes Liguita** | Promo QR code anti-perte avec bouton Commander |
| **8. Barre rapide bas** | 4 shortcuts : Mon portefeuille, Mes annonces, Mes paiements, Mes récompenses |

#### 🟡 MANQUANT SIDEBAR
| Élément manquant | Détail |
|---|---|
| **"Tableau de bord"** actif | Le lien `/app` existe dans APP_NAV mais redirige ailleurs |
| **"Rechercher un objet"** | Absent de APP_NAV (existe dans PUBLIC_NAV seulement) |
| **"Mes annonces"** | Absent de APP_NAV |
| **"Mon portefeuille"** | Absent de APP_NAV |
| **"Mes transactions"** | Absent de APP_NAV |
| **"Aide & support"** | Absent de APP_NAV (dans DASHBOARD_SUPPORT_NAV legacy) |
| Illustration "baobab" en bas de sidebar | Décoration visuelle absente |

#### 🟡 MANQUANT TOP BAR
| Élément manquant | Détail |
|---|---|
| **Barre de recherche globale** | Champ "Rechercher un objet, une ville, un mot-clé..." central |
| **Sélecteur de pays** | Drapeau + "Tchad" + chevron |
| Le logo est dans la sidebar mais pas dans la top bar | (OK sur desktop) |

---

## Plan d'implémentation (sans rien casser)

### Étape 1 — Créer la vraie page Tableau de bord

**Fichier :** `apps/web/src/app/app/page.tsx`  
Remplacer le `redirect` par un vrai composant de tableau de bord.

```tsx
// apps/web/src/app/app/page.tsx
// Supprimer le redirect, créer DashboardPage
```

**Sous-composants à créer dans** `apps/web/src/components/app/dashboard/` :

- `HeroBanner.tsx` — Bannière salutation + 2 CTAs
- `WalletWidget.tsx` — Widget portefeuille (solde, en attente, disponible)
- `StatsWidget.tsx` — 4 statistiques avec liens
- `RecentActivities.tsx` — Liste des 4 dernières activités  
- `RecentTransactions.tsx` — 5 dernières transactions
- `NotificationsWidget.tsx` — 4 dernières notifications
- `LiguitaTagsBanner.tsx` — Bannière promo étiquettes
- `DashboardQuickNav.tsx` — Barre de navigation rapide (4 liens)

### Étape 2 — Mettre à jour la navigation sidebar

**Fichier :** `apps/web/src/lib/navigation.ts`

Ajouter dans `APP_NAV` :
```ts
{ href: '/rechercher', label: 'Rechercher un objet', icon: Search },
{ href: '/app/annonces', label: 'Mes annonces', icon: Megaphone },
{ href: '/app/portefeuille', label: 'Mon portefeuille', icon: Wallet },
{ href: '/app/transactions', label: 'Mes transactions', icon: ArrowLeftRight },
{ href: '/help', label: 'Aide & support', icon: LifeBuoy },
```

Réorganiser dans l'ordre de l'image :
1. Tableau de bord → `/app`
2. Rechercher un objet → `/rechercher`
3. Mes objets → `/app/objets`
4. Mes annonces → `/app/annonces` (nouvelle route)
5. Mon portefeuille → `/app/portefeuille` (nouvelle route)
6. Mes transactions → `/app/transactions` (nouvelle route)
7. Notifications → `/app/notifications`
8. Mon profil → `/app/profil`
9. Aide & support → `/help`

### Étape 3 — Nouvelles routes à créer (placeholders)

| Route | Fichier | Note |
|---|---|---|
| `/app/annonces` | `app/app/annonces/page.tsx` | Alias de `/app/avis` ou nouvelle page |
| `/app/portefeuille` | `app/app/portefeuille/page.tsx` | Widget solde + recharge |
| `/app/transactions` | `app/app/transactions/page.tsx` | Historique transactions |

### Étape 4 — Améliorer AppTopBar

**Fichier :** `apps/web/src/components/app/AppTopBar.tsx`

Ajouter (desktop uniquement, `hidden lg:flex`) :
- Input de recherche globale centré avec icône Search
- Optionnel : sélecteur pays

### Étape 5 — Améliorer AppSidebar

**Fichier :** `apps/web/src/components/app/AppSidebar.tsx`

Ajouter :
- Illustration "baobab" au bas de la sidebar (`<img>` ou `<svg>`)
- Texte "Ensemble, retrouvons ce qui compte."

---

## Données nécessaires pour le dashboard

Le tableau de bord a besoin de données réelles. Ces appels Supabase sont à créer :

### Actions server à créer dans `apps/web/src/app/app/actions/`

```ts
// dashboard.ts
export async function getDashboardStats() {
  // COUNT objets trouvés par le user
  // COUNT objets perdus par le user
  // COUNT mises en relation actives
  // AVG note du user
}

export async function getWalletSummary() {
  // Solde disponible depuis profiles.wallet_balance ou table wallets
  // Montant en attente
}

export async function getRecentActivities(limit = 4) {
  // JOIN items + status, triés par updated_at DESC
}

export async function getRecentTransactions(limit = 5) {
  // FROM transactions ORDER BY created_at DESC
}
```

---

## Ordre d'exécution recommandé

```
1. [navigation.ts]      Ajouter les items manquants dans APP_NAV
2. [app/page.tsx]       Remplacer redirect par DashboardPage basique
3. [dashboard/]         Créer les sous-composants (HeroBanner en premier)
4. [nouvelles routes]   annonces, portefeuille, transactions (placeholders)
5. [AppTopBar.tsx]      Ajouter la barre de recherche
6. [AppSidebar.tsx]     Ajouter illustration + support link
7. [actions/dashboard]  Brancher les vraies données
```

> [!IMPORTANT]
> Ne pas toucher aux composants existants fonctionnels (correspondances, messages, notifications, avis).
> Toutes les nouvelles sections doivent démarrer avec des données mockées/statiques avant d'être branchées à Supabase.

> [!NOTE]  
> Le `/app` actuel redirige vers `/app/correspondances`. Supprimer ce redirect est la seule modification à un fichier existant qui a un impact fonctionnel.
