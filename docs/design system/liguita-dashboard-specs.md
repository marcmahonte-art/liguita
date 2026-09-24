# LIGUITA — Spécifications UI/UX du dashboard

Mise à jour : 24 septembre 2026
Surface concernée : espace connecté `/app`

## 1. Objectif

Le dashboard `/app` est le point d’entrée de l’espace personnel Liguita. Il permet à un utilisateur de :

- rechercher un objet perdu ou trouvé ;
- déclarer rapidement un objet trouvé ;
- suivre ses objets et ses correspondances ;
- consulter son portefeuille et ses transactions ;
- lire ses notifications ;
- revenir vers ses annonces et son profil.

La direction visuelle reste claire, légère et rassurante. L’interface doit privilégier l’action, la lecture rapide et la confiance, sans effets visuels inutiles ni données de démonstration présentées comme des données réelles.

## 2. État actuel

### Implémenté

- Shell `/app` avec sidebar desktop, top bar et navigation mobile basse.
- Page principale `/app` avec hero, portefeuille, statistiques, activités, transactions, notifications, bannière étiquettes et raccourcis.
- Routes `/app/annonces`, `/app/portefeuille` et `/app/transactions`.
- Recherche globale dans la top bar desktop.
- Authentification téléphone + OTP via Supabase.
- Protection de `/app/*` par le middleware.
- Tokens de design system dans `packages/ui/src/tokens.ts`.
- Données du dashboard actuellement centralisées dans `apps/web/src/lib/mock-data.ts`.

### À brancher ensuite

- Statistiques réelles agrégées depuis Supabase.
- Solde et transactions réels.
- Activités et notifications réelles.
- Illustrations et photos d’objets.
- Recherche globale côté client avec debounce, au lieu du formulaire GET actuel.
- Badge de notifications non lus.
- Sélecteur de langue et affichage du pays.
- États loading/error au niveau de la page complète.

## 3. Stack réelle

Le projet utilise les technologies suivantes :

- Next.js 15 avec App Router ;
- React 19 ;
- TypeScript strict ;
- Tailwind CSS 3 ;
- `lucide-react` pour les icônes ;
- `@liguita/ui` pour les composants et primitives visuelles ;
- Supabase Cloud pour Auth, PostgreSQL, RLS et données métier.

Le dashboard n’utilise pas actuellement shadcn/ui. Les composants génériques sont fournis par `packages/ui` : `Button`, `Card`, `Badge`, `Avatar`, `Skeleton`, `EmptyState`, `Input`, `Table`, `Alert` et autres.

Les propositions d’installation shadcn/ui contenues dans l’ancienne version du document ne sont pas une dépendance du projet.

## 4. Identité visuelle

- Marque : Liguita.
- Signature : `J’ai trouvé. Tu as perdu. On se retrouve.`
- Logo : réutiliser le composant `Logo` et les assets officiels existants.
- Police des titres et de la navigation : Plus Jakarta Sans.
- Police du corps, des montants et des tableaux : Inter.
- Rayon des cartes : 16 px.
- Rayon des champs : 12 px.
- Boutons : pilule.
- Cible tactile minimale : 48 px.

## 5. Couleurs et tokens

La source de vérité est `packages/ui/src/tokens.ts`. Les composants ne doivent pas répéter les hex codes.

### Rouge de marque

- `brand[500]` : `#E50F1A`, rouge principal pour les textes, boutons et actions.
- `brand[600]` : `#C70D17`, survol et états actifs.
- `brand[50]` : `#FDECEE`, fond rose léger.
- `brand[700]` : `#A30A12`, texte rose foncé.
- `BRAND_BRIGHT` : `#FF3330`, **décoratif uniquement** — aplats, gradients, points de couleur, sans aucun texte blanc par-dessus.
- `BRAND_BRIGHT_HOVER` : `#E52522`, survol de `BRAND_BRIGHT`.
- `LOGO_RED` : `#F10F15`, réservé au logo et aux images.

Le rouge vif de la maquette ne doit pas porter seul un texte blanc ou un texte de lien. Utiliser `brand[500]` pour les éléments qui portent du texte.

> **Arbitrage « Hybride » (septembre 2026).** La maquette d'origine utilisait `#FF3330` comme rouge
> d'interface et `#16B879` comme vert. Mesurés :
>
> | Couleur | Avec texte blanc | Verdict |
> |---|---:|---|
> | `#FF3330` | 3,64:1 | échoue AA (4,5:1) |
> | `#E50F1A` (`brand[500]`) | 4,76:1 | **conforme** |
> | `#16B879` | 2,57:1 | échoue même le seuil 3:1 des grands textes |
> | `success[700]` `#166534` | 7,13:1 | **conforme** |
>
> Décision : `#FF3330` est conservé pour l'identité visuelle (aplats décoratifs), `brand[500]` porte
> tous les éléments qui contiennent du texte. Le vert de la maquette est remplacé par la rampe
> `success` du design system. Aucun compromis d'accessibilité n'est nécessaire pour retrouver
> l'allure de la maquette.

### Surfaces

Les fonds de cartes et de sections ont leurs propres jetons, pour qu'aucun composant n'ait à
écrire un hex code ni à emprunter un pas de la rampe `ink` pour un usage sémantique.

- `surface.page` : `ink[50]` — fond général de l'application.
- `surface.card` : `ink[0]` — cartes et surfaces élevées.
- `surface.muted` : `ink[100]` — zones discrètes, en-têtes de tableau.
- `surface.lost` : `#FFF0F0` — teinte de fond des cartes « objet perdu ».
- `surface.found` : `#EAF8F1` — teinte de fond des cartes « objet trouvé ».

> ⚠️ `brand[500]` sur `surface.lost` ne mesure que **4,30:1** — sous le seuil AA. Un lien posé sur
> un fond `lost` doit utiliser `brand[700]` (7,27:1). Cette contrainte est vérifiée par les tests
> de parité.

### Neutres

- `ink[0]` : `#FFFFFF`, cartes et surfaces.
- `ink[50]` : `#F7F8FA`, fond général.
- `ink[100]` : `#EEF1F5`, séparateurs et fonds discrets.
- `ink[200]` : `#DEE3EA`, bordures décoratives.
- `ink[400]` : `#8A929E`, bordure interactive minimale.
- `ink[500]` : `#5B6470`, texte secondaire.
- `ink[700]` : `#2A2F38`, texte principal secondaire.
- `ink[900]` : `#0E1116`, texte principal fort.
- `ink[950]` : `#0E1116`, texte des titres de widgets.

> ⚠️ `ink[950]` a été ajouté pour réparer un défaut silencieux : `text-ink-950` était utilisé dans
> six composants alors que la rampe s'arrêtait à `900`. Tailwind **ignore** une classe non définie
> sans erreur ni avertissement — les titres concernés héritaient simplement de la couleur du
> parent. Idem pour `text-2xs`, `text-body-sm` et `shadow-xs`, désormais définis.
>
> `ink[400]` sur `surface.page` ne mesure que **2,96:1**, sous le seuil 3:1 exigé pour les
> composants d'interface. Un champ de saisie doit donc toujours porter son propre fond blanc et sa
> propre bordure, et ne jamais se reposer sur le fond de la page.

### Couleurs sémantiques

- Succès : `success[50]`, `success[500]`, `success[700]`.
- Attente : `warning[50]`, `warning[500]`, `warning[700]`.
- Information : `info[50]`, `info[500]`, `info[700]`.
- Erreur : `danger[50]`, `danger[500]`, `danger[700]`.

Le vert signale un objet trouvé ou une opération réussie. Le violet est réservé au matching. Le rouge est réservé aux actions et aux alertes importantes.

## 6. Structure du projet

Les chemins de référence sont relatifs à `apps/web/src` :

```text
app/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── annonces/page.tsx
│   ├── portefeuille/page.tsx
│   └── transactions/page.tsx
├── api/cron/
└── ...

components/app/
├── AppSidebar.tsx
├── AppTopBar.tsx
├── AppBottomNav.tsx
└── dashboard/
    ├── HeroBanner.tsx
    ├── WalletWidget.tsx
    ├── StatsWidget.tsx
    ├── RecentActivities.tsx
    ├── RecentTransactions.tsx
    ├── NotificationsWidget.tsx
    ├── LiguitaTagsBanner.tsx
    └── DashboardQuickNav.tsx

lib/
├── auth/auth-context.tsx
├── mock-data.ts
├── navigation.ts
└── supabase/

```

La navigation shared est définie dans `apps/web/src/lib/navigation.ts`. Ne pas recréer les listes de liens dans les composants.

## 7. Shell de l’espace connecté

`apps/web/src/app/app/layout.tsx` fournit la structure commune :

- sidebar sticky sur desktop ;
- top bar sticky ;
- contenu principal centré dans `max-w-5xl` ;
- padding horizontal `px-4` sur mobile, `px-6` puis `px-8` sur écran large ;
- padding inférieur supplémentaire sur mobile pour laisser la place à la navigation basse.

Le dashboard est protégé contre l’indexation par :

```ts
robots: { index: false, follow: false }
```

## 8. Sidebar desktop

Fichier : `apps/web/src/components/app/AppSidebar.tsx`

- Visible à partir de `lg` (`1024px`).
- Largeur : `w-64`, soit **256 px**.
- Fond blanc.
- Bordure droite `border-ink-200`.
- Logo dans l’en-tête de la sidebar.
- Navigation principale : `APP_NAV`.
- Entrée active : fond `bg-brand-50`, texte `text-brand-700`.
- Chaque cible interactive a une hauteur minimale de 48 px.
- Une entrée `Modération` est ajoutée pour les profils `MODERATOR` et `ADMIN`.
- Le bloc inférieur contient `Déclarer une perte` et la signature `Ensemble, retrouvons ce qui compte.`

> **Largeur tranchée.** Le document indiquait `w-60` (240 px) en §8 et 248 px en §12 : deux valeurs
> pour une seule décision. Le code utilise `w-64` (256 px), qui laisse la place aux libellés longs
> de `APP_NAV` (« Mes transactions », « Aide & support ») sans troncature. C'est cette valeur qui
> fait foi ; §12 a été corrigé.

Ordre de navigation actuel :

1. Tableau de bord — `/app`
2. Rechercher un objet — `/rechercher`
3. Mes objets — `/app/objets`
4. Mes annonces — `/app/annonces`
5. Mon portefeuille — `/app/portefeuille`
6. Mes transactions — `/app/transactions`
7. Notifications — `/app/notifications`
8. Mon profil — `/app/profil`
9. Aide & support — `/help`

La sidebar desktop est masquée sur mobile. Elle ne doit pas être dupliquée dans un second composant de navigation.

## 9. Top bar

Fichier : `apps/web/src/components/app/AppTopBar.tsx`

- Hauteur : 72 px.
- Position sticky en haut.
- Fond blanc translucide avec `backdrop-blur-sm`.
- Bordure inférieure `border-ink-200`.
- Recherche globale desktop : formulaire GET vers `/rechercher`, champ `q`, icône `Search`.
- Notifications : bouton icon-only vers `/app/notifications` avec `aria-label`.
- Profil : lien vers `/app/profil`.
- Déconnexion : action visible lorsque l’utilisateur est connecté.
- Sur mobile : bouton menu, titre `Mon espace` et menu dépliable.

La future recherche interactive devra conserver le même point d’entrée et ajouter un debounce de 250 à 300 ms. Le pays et le sélecteur de langue restent à ajouter.

> **Hauteur tranchée.** Le brief de refonte demandait une top bar entre 72 et 80 px, ce document
> indiquait 64 px. Le code est à 72 px, la borne basse du brief — valeur retenue comme source de
> vérité. À 64 px, la recherche globale et le bloc profil se retrouvaient comprimés.

## 10. Navigation mobile

Fichier : `apps/web/src/components/app/AppBottomNav.tsx`

- Cinq entrées maximum définies dans `APP_BOTTOM_NAV`.
- Visible uniquement sous `lg`.
- Barre fixe en bas.
- Hauteur de cible : 56 px.
- Icône Lucide de 20 px et libellé textuel.
- L’entrée active utilise `text-brand-700` et `aria-current="page"`.
- Le contenu principal reçoit un padding inférieur pour éviter le chevauchement.

## 11. Composition de la page `/app`

Fichier : `apps/web/src/app/app/page.tsx`

Ordre des sections :

1. `HeroBanner`
2. `WalletWidget`
3. `StatsWidget`
4. `RecentActivities`
5. `RecentTransactions`
6. `NotificationsWidget`
7. `LiguitaTagsBanner`
8. `DashboardQuickNav`

Grille desktop actuelle :

```tsx
<div className="grid gap-6 lg:grid-cols-[1fr_260px_220px]">
  <HeroBanner />
  <WalletWidget wallet={wallet} />
  <StatsWidget stats={MOCK_STATS} />
</div>

<div className="grid gap-6 lg:grid-cols-[1fr_1fr_300px]">
  <RecentActivities items={MOCK_ITEMS.slice(0, 4)} />
  <RecentTransactions transactions={MOCK_TRANSACTIONS.slice(0, 5)} />
  <div className="flex flex-col gap-6">
    <NotificationsWidget notifications={MOCK_NOTIFICATIONS.slice(0, 4)} />
    <LiguitaTagsBanner />
  </div>
</div>

<DashboardQuickNav />
```

Sous `lg`, les sections passent en une colonne. Les espacements utilisent `gap-6` et les cartes restent lisibles sur mobile.

## 12. Hero

Fichier : `apps/web/src/components/app/dashboard/HeroBanner.tsx`

- Carte avec gradient rose très léger.
- Rayon `rounded-2xl`.
- Nom affiché depuis le profil Supabase.
- Texte de bienvenue : `Bonjour {name}`.
- CTA principal vers `/rechercher` : `Rechercher un objet`.
- CTA secondaire vers `/declarer/trouve` : `+ Déclarer un objet trouvé`.
- Illustration de localisation actuellement représentée par un élément décoratif ; la future illustration SVG devra être optimisée.
- Le composant est client car il utilise `useAuth()`.

## 13. Portefeuille

Fichier : `apps/web/src/components/app/dashboard/WalletWidget.tsx`

- Affiche `wallet.totalXaf`.
- Le solde peut être masqué avec les boutons `Eye` et `EyeOff`.
- Le lien principal mène vers `/app/transactions`.
- Deux sous-indices : `En attente` et `Disponible`.
- Le widget reçoit un objet `Wallet` par props.
- Le solde provient actuellement de `buildWallet(MOCK_TRANSACTIONS)` et doit être branché sur les données réelles.
- Les montants suivent le format `1 200 FCFA`, avec espace insécable dans les composants de production.

## 14. Statistiques

Fichier : `apps/web/src/components/app/dashboard/StatsWidget.tsx`

Quatre lignes actuelles :

- Objets trouvés — `/app/objets`
- Objets perdus — `/app/objets`
- Mises en relation — `/app/transactions`
- Ma note — `/app/profil`

Chaque ligne possède une valeur, un libellé et un lien `→ Voir`. Les valeurs sont fournies par `DashboardStats`; ne pas les écrire directement dans le composant.

## 15. Activités récentes

Fichier : `apps/web/src/components/app/dashboard/RecentActivities.tsx`

- Affiche quatre éléments maximum.
- Les éléments sont reçus via props sous forme de `Item[]`.
- Chaque ligne contient un badge de type, un badge de statut, le titre, la localisation et la date.
- Le lien « Voir tout » mène à `/app/objets`.
- L’état vide doit être affiché si aucun élément n’est disponible.
- ✅ **Les emojis ont été supprimés** (voir §31). Chaque ligne affiche désormais l’icône Lucide de la
  catégorie de l’objet, résolue par `categoryIcon()` depuis `apps/web/src/lib/icons.ts`, avec
  `Package` en repli pour toute catégorie non listée. Le libellé catégorie reste affiché en texte :
  l’icône accélère la lecture, elle ne la remplace pas.

Statuts visuels :

- Objet trouvé : vert.
- Objet perdu : rouge.
- Correspondance : violet.
- En vérification : ambre.
- Payé ou restitué : vert.
- Expiré ou fermé : neutre.

## 16. Transactions récentes

Fichier : `apps/web/src/components/app/dashboard/RecentTransactions.tsx`

- Affiche cinq transactions maximum sur le dashboard.
- La page `/app/transactions` affiche l’historique complet.
- Chaque transaction contient une icône Lucide, un libellé, une date et un montant.
- ⚠️ **La couleur d’une transaction reflète sa NATURE, pas son signe.** Une récompense trouveur est
  verte, une mise en relation rouge de marque, un rechargement bleu, un retrait neutre, un bonus
  communautaire ambre — voir `TRANSACTION_META` dans `icons.ts`.
- Le signe comptable est porté **séparément**, par le montant lui-même (`+` / `−`, en `tabular`).
  Colorer selon le signe — vert pour tout crédit — rendrait indistinguables une récompense et un
  rechargement, deux opérations qui n’ont pourtant rien à voir.
- Les montants sont formatés en `fr-FR` avec le suffixe `FCFA`.
- Les données sont reçues via props `Transaction[]`.

Types prévus :

- récompense trouveur ;
- frais de mise en relation ;
- recharge portefeuille ;
- paiement ou retrait ;
- bonus communautaire.

## 17. Notifications

Fichier : `apps/web/src/components/app/dashboard/NotificationsWidget.tsx`

- Affiche quatre notifications maximum.
- Le lien « Voir tout » mène à `/app/notifications`.
- Une notification non lue est visuellement différenciée par `bg-brand-50/40` et `border-brand-200`, **et par le texte explicite « · Non lue »**. Le fond seul ne suffit pas : il ne dit rien à un lecteur d’écran, et beaucoup d’utilisateurs ne perçoivent pas la nuance.
- Le temps est rendu de façon relative : moins d’une heure, heures ou jours.
- Les données sont reçues via `AppNotification[]`.
- Le composant ne doit jamais exposer de données sensibles de vérification.
- La pastille de chaque notification est colorée **selon sa nature** via `notificationMeta()` — voir §31.

## 18. Bannière étiquettes

Fichier : `apps/web/src/components/app/dashboard/LiguitaTagsBanner.tsx`

- Message : les étiquettes Liguita protègent les objets contre la perte.
- fond **vert très clair** (`success-50`) ;
- CTA vers l’offre ou la commande ;
- illustration remplacée plus tard par un SVG optimisé ;
- aucune photo utilisateur avant activation du stockage.

> ⚠️ **Correction apportée.** La bannière était sur `bg-brand-50` — un fond rose. Or c’est un produit
> de *protection* : le rose y lit comme une alerte ou une perte, exactement l’inverse du message.
> Elle est passée en `success-50`, conformément à la ligne « fond vert très clair » ci-dessus, qui
> était déjà la règle mais que le code ne respectait pas.

## 19. Navigation rapide

Fichier : `apps/web/src/components/app/dashboard/DashboardQuickNav.tsx`

Quatre raccourcis :

- Mon portefeuille — `/app/portefeuille`
- Mes annonces — `/app/annonces`
- Mes paiements — `/app/paiements`
- Mes récompenses — `/app/recompenses`

La grille utilise deux colonnes sur mobile et quatre colonnes à partir de `sm`. Chaque lien a une cible suffisamment grande et un libellé textuel.

## 20. Routes de l’espace connecté

### `/app` — espace particulier

| Route | Rôle | État |
|---|---|---|
| `/app` | Tableau de bord | Implémenté, données mock |
| `/app/objets` | Mes objets | Fonctionnel |
| `/app/annonces` | Mes annonces et recherches sauvegardées | Implémenté |
| `/app/portefeuille` | Solde et historique court | Implémenté, données mock |
| `/app/transactions` | Historique des transactions | Implémenté, données mock |
| `/app/correspondances` | Correspondances | Fonctionnel |
| `/app/correspondances/[id]` | Détail d’une correspondance | Fonctionnel |
| `/app/correspondances/[id]/verification` | Vérification par questions | Fonctionnel |
| `/app/messages` | Messages | Fonctionnel |
| `/app/notifications` | Notifications | Fonctionnel |
| `/app/profil` | Profil | Fonctionnel |
| `/app/perdus` | Mes déclarations de perte | Fonctionnel |
| `/app/trouves` | Mes déclarations d’objet trouvé | Fonctionnel |
| `/app/recherche` | Recherche interne | Fonctionnel |
| `/app/alertes` | Alertes sauvegardées | Fonctionnel |
| `/app/avis` | Avis et évaluations | Fonctionnel |
| `/app/securite` | Sécurité du compte | Fonctionnel |
| `/app/paiements` | Paiements | Fonctionnel |
| `/app/recompenses` | Récompenses | Fonctionnel |
| `/app/moderation` | Modération staff | Fonctionnel selon rôle |

### `/business` — espace professionnel

11 routes (tableau de bord, objets trouvés, annonces, statistiques, facturation, profil, etc.).
Documenté séparément.

### `/admin` — administration

18 routes (utilisateurs, transactions, signalements, fraude, tarification, référentiel, etc.).
Documenté séparément.

### `/dashboard` — non implémenté, et volontairement

Le brief de refonte (§23) listait `/dashboard` et ses sous-routes. **Cette surface n’existe pas et
ne doit pas être créée comme alias.** La surface officielle est `/app`, et le document l’affirmait
déjà avant le brief.

Créer `/dashboard` comme simple redirection vers `/app` aurait un coût réel : deux URL pour un même
contenu, donc deux entrées d’indexation à gérer, deux cibles de redirection après connexion, et une
ambiguïté permanente dans le code et les tests. La décision est de conserver `/app` seul et de
corriger le brief, pas de dupliquer la surface.

## 21. Authentification

Le dashboard dépend de l’authentification téléphone + OTP.

- `AuthProvider` charge la session Supabase.
- Les numéros sont normalisés au format E.164 `+235XXXXXXXX`.
- `signInWithOtp` utilise le canal SMS.
- `verifyOtp` vérifie le token SMS côté client Supabase.
- Le profil métier est relu dans `profiles` après connexion.
- Le middleware protège `/app`, `/business` et `/admin`.
- Les clés Supabase ne doivent jamais être écrites dans le dépôt.

La configuration SMS Twilio et les paramètres du projet sont gérés dans Supabase Cloud, pas dans le code du dashboard.

## 22. Données réelles

Le dashboard ne doit pas confondre données mock et données persistées.

Données actuellement mockées dans `apps/web/src/lib/mock-data.ts` :

- `MOCK_ITEMS` ;
- `MOCK_STATS` ;
- `MOCK_NOTIFICATIONS` ;
- `MOCK_TRANSACTIONS` ;
- `buildWallet`.

Avant de remplacer les mocks, créer des actions server dans `apps/web/src/app/actions/` :

- `getDashboardStats` ;
- `getWalletSummary` ;
- `getRecentActivities` ;
- `getRecentTransactions` ;
- `getRecentNotifications`.

Règles :

- lire avec la session utilisateur lorsque possible ;
- utiliser le client service_role uniquement pour une opération serveur explicitement justifiée ;
- respecter les policies RLS ;
- ne jamais envoyer les réponses de vérification au claimant ;
- limiter les requêtes aux données nécessaires au dashboard.

## 23. Responsive

### Desktop

- Sidebar visible à partir de 1024 px.
- Top bar complète avec recherche.
- Première rangée en trois zones : hero, portefeuille, statistiques.
- Deuxième rangée en trois zones : activités, transactions, colonne notifications.
- Contenu limité par le layout à `max-w-5xl`.

### Tablette

- Sidebar masquée sous `lg`.
- Menu mobile disponible dans la top bar.
- Grilles progressivement réduites par les breakpoints Tailwind.

### Mobile

- Une colonne.
- Carte pleine largeur.
- Navigation basse fixe.
- Boutons et cibles tactiles d’au moins 48 px.
- Textes longs tronqués avec `truncate` ou `line-clamp`.
- Pas de tableau horizontal critique sur la page principale.

## 24. Accessibilité

- `Link` pour la navigation.
- `button` pour les actions.
- `aria-label` sur les boutons icon-only.
- `aria-current="page"` sur les entrées actives.
- `aria-expanded` sur le menu mobile.
- `aria-label` sur les zones de navigation.
- Contraste WCAG AA pour les textes.
- Focus visible sur les éléments interactifs.
- Aucun `<div>` cliquable.
- **Aucun emoji n’est utilisé comme icône dans l’espace connecté** (voir §31). Cette règle remplace
  la précédente, qui tolérait des emojis décoratifs masqués par `aria-hidden`.
- Une icône qui porte une information sans texte visible — par exemple l’approbation d’une réponse de
  vérification en modération — doit fournir un libellé aux lecteurs d’écran via `sr-only`. Une icône
  seule est un pictogramme, pas une information.
- Les couleurs sont toujours doublées d’un texte ou d’une icône.

## 25. Images et photos

Les photos d’objets sont reportées.

En attendant :

- ne pas afficher de photo cassée ;
- utiliser des placeholders cohérents ;
- prévoir une taille fixe pour éviter les décalages de mise en page ;
- ne pas exposer de données EXIF ;
- utiliser `next/image` dès activation du stockage ;
- conserver les URLs privées hors des données publiques.

## 26. États UI

Chaque futur composant connected doit prévoir :

- `Skeleton` pendant le chargement ;
- `EmptyState` quand aucune donnée n’est disponible ;
- message d’erreur actionnable ;
- état désactivé pendant une soumission ;
- état de succès après une action.

Ne pas afficher de données mock lorsqu’une erreur de production est détectée. Afficher l’état d’erreur et conserver le mock uniquement dans un environnement explicitement hors production.

## 27. Performance

- Server Components par défaut.
- `use client` uniquement pour les composants interactifs ou dépendants de l’auth.
- Éviter de transformer toute la page en Client Component lors du branchement des données.
- Limiter les requêtes dashboard.
- Utiliser des listes avec des clés stables.
- Optimiser les futures images avec `next/image`.
- Éviter les animations lourdes.

## 28. Dépendances autorisées

Utiliser :

- composants et tokens de `@liguita/ui` ;
- `lucide-react` pour les nouvelles icônes ;
- classes Tailwind et tokens Liguita ;
- composants React/Next.js déjà présents.

Ne pas introduire une deuxième bibliothèque d’icônes, une seconde palette ou un nouveau design system sans mise à jour de `packages/ui/src/tokens.ts` et de ses tests de parité.

> **Pourquoi cette règle est formulée ainsi.** Trois problèmes de ce type ont été trouvés dans le
> code et sont documentés en §31. Dans chaque cas, l’écart n’avait produit ni erreur de build, ni
> échec de test, ni avertissement à l’exécution — il se manifestait uniquement comme « le design ne
> ressemble pas à la maquette ». Le garde-fou est donc un test, pas une intention.

## 29. Checklist de l’implémentation actuelle

### Shell

- [x] Sidebar desktop.
- [x] Top bar sticky.
- [x] Recherche globale GET.
- [x] Navigation mobile basse.
- [x] Auth téléphone + OTP.
- [x] Protection `/app/*`.
- [x] Metadata sans indexation.

### Dashboard

- [x] Hero personnalisé.
- [x] Widget portefeuille.
- [x] Statistiques.
- [x] Activités récentes.
- [x] Transactions récentes.
- [x] Notifications.
- [x] Bannière étiquettes.
- [x] Navigation rapide.
- [x] Routes annonces, portefeuille et transactions.

### Données

- [x] Props et données mock centralisées.
- [ ] Statistiques Supabase.
- [ ] Portefeuille Supabase.
- [ ] Transactions Supabase.
- [ ] Activités Supabase.
- [ ] Notifications Supabase.
- [ ] États loading/error de la page.

### UX complémentaire

- [x] Icônes Lucide à la place des emojis (voir §31).
- [x] Palette unifiée — plus aucune couleur hors jetons.
- [x] Jetons Tailwind manquants réparés (`ink-950`, `2xs`, `body-sm`, `shadow-xs`).
- [x] Contraste du variant `success` du bouton corrigé.
- [ ] Illustrations SVG finales.
- [ ] Photos d’objets.
- [ ] Badge de notifications non lus.
- [ ] Sélecteur pays/langue.
- [ ] Recherche globale avec debounce.
- [ ] Tests E2E du parcours OTP.

## 31. Corrections appliquées — septembre 2026

Cette section documente des défauts réels trouvés dans le code, leur cause, et le garde-fou posé.
Elle existe parce qu’aucun de ces problèmes ne se signalait de lui-même.

### 31.1 Les emojis utilisés comme icônes

L’espace connecté affichait des emojis partout : 👛 📱 🪪 🔑 📦 pour les catégories d’objets, 🎁 🤝 💳
📤 🌟 pour les transactions, ✅ 📦 🔗 💚 🌟 📣 pour les notifications, et même un 🌳 de 72 px dans la
sidebar. Trois tables d’emojis coexistaient, une par widget, avec chacune sa convention.

Le problème n’est pas esthétique. Un emoji est rendu par le **système d’exploitation** : le même 👛
ne ressemble pas à la même chose sur iOS, sur Android et sur Windows. Sur un téléphone d’entrée de
gamme — le matériel que vise réellement Liguita — ils sont souvent méconnaissables. Et ils ne
peuvent pas hériter d’une couleur du design system.

**Correction.** Un fichier unique, `apps/web/src/lib/icons.ts`, remplace les trois tables :
`CATEGORY_ICONS` / `categoryIcon()`, `KIND_META`, `STATUS_META`, `TRANSACTION_META` /
`transactionMeta()`, `NOTIFICATION_META` / `notificationMeta()`, et `TONES`. Toutes les fonctions de
résolution ont un repli explicite (`?? Package`, `?? Megaphone`), de sorte qu’une valeur inconnue
produit une icône générique correcte plutôt qu’un rendu vide.

Les icônes Lucide sont des SVG, rendues identiquement partout, et héritent de `currentColor`.

### 31.2 Jetons Tailwind inexistants

Quatre classes étaient utilisées dans tout le code alors qu’elles n’étaient définies nulle part :

| Classe | Occurrences | Conséquence |
|---|---:|---|
| `text-body-sm` | 59 | Corps de texte à la taille héritée |
| `text-2xs` | 30 | Idem |
| `text-ink-950` | 6 | Titres à la couleur héritée du parent |
| `shadow-xs` | tous les widgets | Aucune ombre |

**Tailwind ignore silencieusement une classe non définie.** Pas d’erreur de build, pas
d’avertissement au lint, pas d’échec de test, pas de trace à l’exécution — la classe ne produit
simplement aucun CSS. Le symptôme se réduit à « ça ne ressemble pas à la maquette », ce qui est
précisément le genre de défaut qu’on attribue à tort à un problème de goût.

**Correction.** Ajout des jetons dans `tokens.ts` **et** dans `tailwind.preset.cjs`, plus quatre
tests de régression — dont un garde-fou général qui parcourt toutes les couleurs du preset et
échoue si l’une d’elles référence un pas absent de la rampe. Le fichier de preset est maintenu en
parité stricte avec les jetons par les tests.

### 31.3 Couleurs hors palette

`emerald-*`, `amber-600`, `sky-50`, `pink-*`, `red-600` et `ink-800` étaient utilisés directement,
en violation de la règle « ne pas introduire une seconde palette ». Une pastille de notification
était même `bg-emerald-100` quelle que soit la nature de la notification : une correspondance, un
paiement et une récompense avaient exactement la même apparence.

**Correction.** Tout passe par `TONES`. Le violet est conservé pour le seul usage que la §5 lui
réserve — la correspondance. Les statuts qui n’étaient spécifiés nulle part (« Publié ») sont passés
en bleu d’information plutôt qu’en violet, pour ne pas diluer cette réservation.

### 31.4 Contraste : deux défauts préexistants

- Le variant `success` du bouton posait du blanc sur `success[500]` (`#16A34A`), soit **3,30:1** —
  sous le seuil AA de 4,5:1. Corrigé vers `success[700]` (**7,13:1**).
- La bannière étiquettes était sur un fond rose alors que c’est un message de protection (§18).

### 31.5 Le garde-fou

`packages/ui/src/__tests__/tokens-parity.test.ts` est passé de 19 à **30 tests**. Il vérifie la
parité jetons ↔ preset, la définition de chaque classe utilisée, et mesure les ratios de contraste
réels sur les paires de couleurs effectivement employées dans l’interface.

Le test de contraste réimplémente volontairement la formule de luminance au lieu d’importer
`packages/ui/src/lib/contrast.ts` : une fonction de mesure qui se vérifie elle-même ne vérifie rien.

## 30. Priorités produit

1. Rechercher ou déclarer un objet.
2. Comprendre ses objets et leurs correspondances.
3. Vérifier une correspondance.
4. Suivre son portefeuille.
5. Comprendre ses transactions.
6. Lire les notifications importantes.

La prochaine itération doit remplacer les données mock par des actions server Supabase, en conservant la composition visuelle actuelle et les règles d’accessibilité.
