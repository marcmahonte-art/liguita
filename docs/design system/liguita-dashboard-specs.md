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
- `BRAND_BRIGHT` : `#FF3330`, réservé aux aplats décoratifs et aux gradients sans texte blanc.
- `LOGO_RED` : `#F10F15`, réservé au logo et aux images.

Le rouge vif de la maquette ne doit pas porter seul un texte blanc ou un texte de lien. Utiliser `brand[500]` pour les éléments qui portent du texte.

### Neutres

- `ink[0]` : `#FFFFFF`, cartes et surfaces.
- `ink[50]` : `#F7F8FA`, fond général.
- `ink[100]` : `#EEF1F5`, séparateurs et fonds discrets.
- `ink[200]` : `#DEE3EA`, bordures décoratives.
- `ink[400]` : `#8A929E`, bordure interactive minimale.
- `ink[500]` : `#5B6470`, texte secondaire.
- `ink[700]` : `#2A2F38`, texte principal secondaire.
- `ink[900]` : `#0E1116`, texte principal fort.

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
- Largeur : `w-60`, soit 240 px.
- Fond blanc.
- Bordure droite `border-ink-200`.
- Logo dans l’en-tête de la sidebar.
- Navigation principale : `APP_NAV`.
- Entrée active : fond `bg-brand-50`, texte `text-brand-700`.
- Chaque cible interactive a une hauteur minimale de 48 px.
- Une entrée `Modération` est ajoutée pour les profils `MODERATOR` et `ADMIN`.
- Le bloc inférieur contient `Déclarer une perte` et la signature `Ensemble, retrouvons ce qui compte.`

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

- Hauteur : 64 px.
- Position sticky en haut.
- Fond blanc translucide avec `backdrop-blur-sm`.
- Bordure inférieure `border-ink-200`.
- Recherche globale desktop : formulaire GET vers `/rechercher`, champ `q`, icône `Search`.
- Notifications : bouton icon-only vers `/app/notifications` avec `aria-label`.
- Profil : lien vers `/app/profil`.
- Déconnexion : action visible lorsque l’utilisateur est connecté.
- Sur mobile : bouton menu, titre `Mon espace` et menu dépliable.

La future recherche interactive devra conserver le même point d’entrée et ajouter un debounce de 250 à 300 ms. Le pays et le sélecteur de langue restent à ajouter.

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
- Les emojis servent actuellement de placeholders visuels. Les remplacer progressivement par des icônes Lucide ou des images réelles lorsque le stockage photo sera activé.

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
- Chaque transaction contient une icône ou placeholder, un libellé, une date et un montant.
- Les crédits sont en vert ; les débits sont en rouge.
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
- Une notification non lue est visuellement différenciée par `bg-brand-50/40` et `border-brand-200`.
- Le temps est rendu de façon relative : moins d’une heure, heures ou jours.
- Les données sont reçues via `AppNotification[]`.
- Le composant ne doit jamais exposer de données sensibles de vérification.

## 18. Bannière étiquettes

Fichier : `apps/web/src/components/app/dashboard/LiguitaTagsBanner.tsx`

- Message : les étiquettes Liguita protègent les objets contre la perte.
- fond vert très clair ;
- CTA vers l’offre ou la commande ;
- illustration remplacée plus tard par un SVG optimisé ;
- aucune photo utilisateur avant activation du stockage.

## 19. Navigation rapide

Fichier : `apps/web/src/components/app/dashboard/DashboardQuickNav.tsx`

Quatre raccourcis :

- Mon portefeuille — `/app/portefeuille`
- Mes annonces — `/app/annonces`
- Mes paiements — `/app/paiements`
- Mes récompenses — `/app/recompenses`

La grille utilise deux colonnes sur mobile et quatre colonnes à partir de `sm`. Chaque lien a une cible suffisamment grande et un libellé textuel.

## 20. Routes de l’espace connecté

| Route | Rôle | État |
|---|---|---|
| `/app` | Tableau de bord | Implémenté avec données mock |
| `/app/objets` | Mes objets | Fonctionnel |
| `/app/annonces` | Recherches sauvegardées | Implémenté |
| `/app/portefeuille` | Solde et historique court | Implémenté avec données mock |
| `/app/transactions` | Historique des transactions | Implémenté avec données mock |
| `/app/correspondances` | Correspondances | Fonctionnel |
| `/app/messages` | Messages | Fonctionnel |
| `/app/notifications` | Notifications | Fonctionnel |
| `/app/profil` | Profil | Fonctionnel |
| `/app/paiements` | Paiements | À finaliser |
| `/app/recompenses` | Récompenses | À finaliser |
| `/app/moderation` | Modération staff | Fonctionnel selon rôle |

Ne pas créer d’alias `/dashboard` sans décision de migration explicite. La surface officielle est `/app`.

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
- Les emojis décoratifs sont masqués avec `aria-hidden` lorsqu’ils ne portent pas d’information.
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

- [ ] Illustrations SVG finales.
- [ ] Photos d’objets.
- [ ] Badge de notifications non lus.
- [ ] Sélecteur pays/langue.
- [ ] Recherche globale avec debounce.
- [ ] Tests E2E du parcours OTP.

## 30. Priorités produit

1. Rechercher ou déclarer un objet.
2. Comprendre ses objets et leurs correspondances.
3. Vérifier une correspondance.
4. Suivre son portefeuille.
5. Comprendre ses transactions.
6. Lire les notifications importantes.

La prochaine itération doit remplacer les données mock par des actions server Supabase, en conservant la composition visuelle actuelle et les règles d’accessibilité.
