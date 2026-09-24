# LIGUITA — Spécifications UI/UX du dashboard

Mise à jour : 25 septembre 2026
Surface officielle : espace connecté `/app`
Document de référence : code actuel du dépôt

## 1. Décisions produit

Liguita est une plateforme tchadienne de recherche, déclaration et restitution d’objets perdus ou trouvés.

Le MVP comprend :

- inscription et connexion par email + mot de passe ;
- déclaration d’un objet perdu ou trouvé ;
- recherche et correspondance ;
- vérification de propriété par questions privées ;
- devis et paiement Airtel Money ;
- espace personnel, notifications et messagerie.

Les photos d’objets sont reportées pour le MVP. Elles devront être ajoutées dans une itération ultérieure avec stockage privé, thumbnails, suppression des EXIF et règles RLS.

### Coordonnées privées

Chaque profil possède potentiellement :

- `email` : identifiant de connexion ;
- `whatsapp_number` : contact WhatsApp privé ;
- `airtel_number` : numéro utilisé pour le paiement Airtel ;
- `phone` : ancien champ technique conservé par compatibilité.

Les numéros ne doivent jamais apparaître dans une page publique, une liste d’objets, une correspondance publique, une notification ou un log.

La règle métier cible est la suivante :

- avant paiement, le propriétaire et le trouveur ne voient pas le numéro de l’autre ;
- après un paiement confirmé, les numéros peuvent être révélés uniquement dans la conversation sécurisée ;
- la révélation doit être vérifiée côté serveur par le statut `PAID` de la transaction liée ;
- WhatsApp et Airtel restent deux numéros distincts, même lorsqu’ils sont identiques.

Cette révélation post-paiement est une évolution de sécurité à terminer ; elle n’est pas encore considérée comme terminée tant qu’aucune règle serveur dédiée n’existe.

## 2. Stack technique réelle

- Next.js 15 avec App Router ;
- React 19 ;
- TypeScript strict ;
- Tailwind CSS 3 ;
- `lucide-react` ;
- composants maison dans `@liguita/ui` ;
- Supabase Cloud pour Auth, PostgreSQL, RLS et données métier ;
- package `@liguita/core` pour le matching et la tarification.

Le projet n’utilise pas shadcn/ui comme dépendance runtime. Les primitives disponibles sont notamment :

- `Button` ;
- `Card` ;
- `Badge` ;
- `Avatar` ;
- `Input` ;
- `Skeleton` ;
- `EmptyState` ;
- `Alert` ;
- `PriceQuoteCard`.

## 3. Authentification

### Utilisateur

L’authentification actuelle est :

- email + mot de passe via Supabase Auth ;
- `signInWithPassword` pour la connexion ;
- `signUpWithPassword` pour l’inscription ;
- profil chargé depuis `profiles` après obtention de la session.

La page `/otp` est conservée uniquement comme ancienne route de compatibilité et ne participe plus à l’authentification.

### Inscription

L’inscription collecte :

- nom complet ;
- email ;
- mot de passe d’au moins 8 caractères ;
- numéro WhatsApp ;
- numéro Airtel Money.

Les deux numéros sont enregistrés dans des colonnes dédiées et restent privés. Le champ historique `phone` reçoit la valeur Airtel pour préserver la compatibilité avec les flux existants.

### Session

- `AuthProvider` charge la session Supabase ;
- l’état de session est rafraîchi via `onAuthStateChange` ;
- le middleware protège `/app`, `/business` et `/admin` ;
- les clés Supabase ne doivent jamais être committées ;
- aucune clé de service ne doit être importée dans un composant client.

## 4. Design system

La source de vérité des tokens est :

```text
packages/ui/src/tokens.ts
```

Le preset Tailwind associé est :

```text
packages/ui/tailwind.preset.cjs
```

Les tests `tokens-parity.test.ts` vérifient la parité des tokens et des presets et certains contrastes. Ils ne garantissent pas automatiquement que chaque classe Tailwind utilisée dans les composants existe : les classes invalides doivent donc être corrigées et testées au cas par cas.

### Couleurs principales

- `brand[500]` : `#E50F1A`, principal rouge d’interface ;
- `brand[600]` : `#C70D17`, survol ;
- `brand[700]` : `#A30A12`, texte actif ;
- `brand[50]` : `#FDECEE`, fond rose ;
- `BRAND_BRIGHT` : `#FF3330`, décoratif sans texte blanc ;
- `LOGO_RED` : `#F10F15`, logo et images.

Le rouge vif décoratif ne doit pas porter seul un texte. Les boutons et liens utilisent `brand[500]`.

### Neutres

- `ink[0]` : `#FFFFFF` ;
- `ink[50]` : `#F7F8FA` ;
- `ink[100]` : `#EEF1F5` ;
- `ink[200]` : `#DEE3EA` ;
- `ink[400]` : `#8A929E` ;
- `ink[500]` : `#5B6470` ;
- `ink[700]` : `#2A2F38` ;
- `ink[900]` : `#0E1116` ;
- `ink[950]` : `#0E1116`, alias utilisé pour les titres de widgets.

### Sémantique

- succès : `success[50]`, `success[500]`, `success[700]` ;
- attente : `warning[50]`, `warning[500]`, `warning[700]` ;
- information : `info[50]`, `info[500]`, `info[700]` ;
- erreur : `danger[50]`, `danger[500]`, `danger[700]`.

Le vert correspond aux objets trouvés et succès. Le violet est réservé au matching. Le rouge est réservé aux actions, pertes et alertes importantes.

### Typographie

- titres et navigation : Plus Jakarta Sans ;
- corps, tableaux et montants : Inter ;
- montants : chiffres tabulaires ;
- format utilisateur : `1 200 FCFA` avec espace insécable.

### Rayons et ombres

Les valeurs réelles des classes utilisées doivent être documentées avec leur classe Tailwind :

- cartesdashboard : `rounded-2xl`, actuellement 24 px via le preset ;
- champs : `rounded-xl`, 12 px ;
- boutons : `rounded-full` ;
- ombres : `shadow-xs` ou `shadow-100` selon le composant.

La documentation historique qui annonçait des cartes de 16 px ne correspond pas aux classes actuellement utilisées. Toute évolution de rayon doit modifier le token, le preset et le test de parité ensemble.

## 5. Shell `/app`

Fichier principal :

```text
apps/web/src/app/app/layout.tsx
```

Structure actuelle :

- sidebar desktop sticky ;
- top bar sticky ;
- contenu principal centré dans `max-w-5xl` ;
- padding horizontal `px-4`, puis `sm:px-6` et `lg:px-8` ;
- padding inférieur pour la navigation mobile ;
- metadata sans indexation.

## 6. Sidebar desktop

Fichier :

```text
apps/web/src/components/app/AppSidebar.tsx
```

Caractéristiques actuelles :

- visible à partir de `lg` ;
- largeur `w-60`, soit 240 px ;
- fond blanc ;
- bordure `border-ink-200` ;
- logo dans l’en-tête ;
- navigation rendue depuis `APP_NAV` ;
- entrée active avec fond rose et texte `brand-700` ;
- hauteur de navigation visée : 48 px ;
- lien `Déclarer une perte` ;
- signature `Ensemble, retrouvons ce qui compte.` ;
- lien de modération réservé aux rôles staff.

Ordre officiel :

1. `/app` — Tableau de bord ;
2. `/rechercher` — Rechercher un objet ;
3. `/app/objets` — Mes objets ;
4. `/app/annonces` — Mes annonces ;
5. `/app/portefeuille` — Mon portefeuille ;
6. `/app/transactions` — Mes transactions ;
7. `/app/notifications` — Notifications ;
8. `/app/profil` — Mon profil ;
9. `/help` — Aide & support.

La navigation ne doit pas être recopiée dans un composant supplémentaire.

## 7. Top bar et navigation mobile

### Top bar

Fichier :

```text
apps/web/src/components/app/AppTopBar.tsx
```

Caractéristiques actuelles :

- hauteur interne `64px` ;
- sticky ;
- fond blanc translucide ;
- bordure inférieure ;
- recherche desktop sous forme de formulaire GET vers `/rechercher` ;
- champ de recherche nommé `q` ;
- bouton notifications ;
- lien profil ;
- déconnexion lorsque l’utilisateur est connecté ;
- menu mobile avec `aria-expanded`.

La recherche future pourra être interactive, mais doit conserver la route `/rechercher` et le paramètre `q`.

### Navigation mobile

Fichier :

```text
apps/web/src/components/app/AppBottomNav.tsx
```

- cinq entrées maximum ;
- visible sous `lg` ;
- barre fixe ;
- cible de 56 px ;
- icônes Lucide ;
- `aria-current="page"` sur l’entrée active ;
- padding inférieur du contenu principal.

## 8. Composition du dashboard

Fichier :

```text
apps/web/src/app/app/page.tsx
```

Ordre des sections :

1. `HeroBanner` ;
2. `WalletWidget` ;
3. `StatsWidget` ;
4. `RecentActivities` ;
5. `RecentTransactions` ;
6. `NotificationsWidget` ;
7. `LiguitaTagsBanner` ;
8. `DashboardQuickNav`.

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

Sous `lg`, les sections passent en une colonne.

## 9. Contrats des widgets

### Hero

- nom issu du profil ;
- CTA recherche ;
- CTA déclaration d’objet trouvé ;
- gradient rose léger ;
- illustration décorative à remplacer par un SVG final.

### Portefeuille

- `Wallet` reçu par props ;
- montant total ;
- bouton Eye/EyeOff ;
- lien vers `/app/transactions` ;
- montants en attente et disponibles ;
- données actuellement mockées.

### Statistiques

Quatre statistiques :

- objets trouvés ;
- objets perdus ;
- mises en relation ;
- note.

Les données sont fournies par props, jamais écrites directement dans le composant.

### Activités

- quatre éléments ;
- badge de type et statut ;
- icône Lucide par catégorie ;
- titre, localisation et date ;
- état vide ;
- lien vers `/app/objets`.

### Transactions

- cinq éléments sur le dashboard ;
- icône Lucide ;
- libellé et date ;
- montant signé ;
- format `fr-FR` avec `FCFA` ;
- page complète `/app/transactions`.

La couleur de transaction doit refléter sa nature métier, pas seulement son signe comptable.

### Notifications

- quatre éléments ;
- état lu/non lu visible textuellement ;
- temps relatif ;
- lien vers `/app/notifications` ;
- aucun secret de vérification dans le contenu.

### Bannière étiquettes

- fond vert clair ;
- message de protection contre la perte ;
- CTA de commande ;
- aucune photo avant activation du stockage.

### Navigation rapide

Quatre liens :

- `/app/portefeuille` ;
- `/app/annonces` ;
- `/app/paiements` ;
- `/app/recompenses`.

Les deux dernières routes restent à finaliser.

## 10. Routes officielles

| Route | Rôle | État actuel |
|---|---|---|
| `/app` | Dashboard | Implémenté, données mock |
| `/app/objets` | Mes objets | Placeholder |
| `/app/annonces` | Recherches sauvegardées | Implémenté |
| `/app/portefeuille` | Portefeuille | Implémenté, données mock |
| `/app/transactions` | Transactions | Implémenté, données mock |
| `/app/correspondances` | Correspondances | Fonctionnel |
| `/app/correspondances/[id]` | Détail correspondance | Fonctionnel |
| `/app/correspondances/[id]/verification` | Vérification de propriété | Fonctionnel |
| `/app/correspondances/[id]/paiement` | Devis et paiement | Fonctionnel, Airtel sans credential actuellement |
| `/app/messages` | Messagerie | Fonctionnel |
| `/app/notifications` | Notifications | Fonctionnel |
| `/app/profil` | Profil privé | Fonctionnel |
| `/app/perdus` | Mes pertes | Placeholder |
| `/app/trouves` | Mes objets trouvés | Placeholder |
| `/app/alertes` | Alertes | Placeholder |
| `/app/avis` | Recherches sauvegardées | Fonctionnel, pas des avis de notation |
| `/app/securite` | Sécurité | Placeholder |
| `/app/paiements` | Paiements | Placeholder |
| `/app/recompenses` | Récompenses | Placeholder |
| `/app/moderation` | Modération | Fonctionnel selon rôle |

`/dashboard` n’est pas une route officielle et ne doit pas être créée comme alias.

## 11. Vérification de propriété

La page officielle est :

```text
/app/correspondances/[id]/verification
```

Elle doit :

- afficher le vrai nom de l’objet ;
- afficher la catégorie utilisée pour générer les questions ;
- ne jamais afficher les réponses attendues du trouveur au propriétaire ;
- ne jamais renvoyer les réponses du propriétaire après soumission au client ;
- compter les tentatives côté serveur ;
- afficher le nombre de tentatives restantes ;
- ne jamais révéler la bonne réponse après un refus ;
- créer un dossier fraud case après trois refus ;
- proposer un accès au devis/paiement après approbation.

Les catégories doivent utiliser les questions de `packages/config/src/verification-questions.ts`. Une catégorie inconnue doit produire un état d’erreur clair plutôt qu’un bouton de soumission inutilisable.

## 12. Paiement Airtel

La page de paiement est :

```text
/app/correspondances/[id]/paiement
```

Le flux comprend :

1. citation serveur ;
2. expiration du devis ;
3. idempotence de transaction ;
4. appel Airtel Money ;
5. callback signé ;
6. enquiry de réconciliation ;
7. transition interne de paiement ;
8. réservation de la récompense et écritures comptables.

Les statuts Airtel bruts sont conservés dans `airtel_status` : `TF`, `TS`, `TA`, `TIP`, `TE`. Ils ne doivent pas être confondus avec le statut interne Liguita.

Les Credentials Airtel UAT ne sont pas versionnés. Le passage en UAT nécessite une configuration externe contrôlée.

## 13. Données mockées et données réelles

Données encore mockées :

- `MOCK_ITEMS` ;
- `MOCK_STATS` ;
- `MOCK_NOTIFICATIONS` ;
- `MOCK_TRANSACTIONS` ;
- `buildWallet`.

Actions server à créer pour brancher le dashboard :

- `getDashboardStats` ;
- `getWalletSummary` ;
- `getRecentActivities` ;
- `getRecentTransactions` ;
- `getRecentNotifications`.

Règles :

- le client ne soumet jamais le montant final ;
- les actions vérifient la session et les règles RLS ;
- le service_role est réservé aux opérations serveur justifiées ;
- aucune donnée sensible n’est envoyée au client ;
- les états loading, empty, error et success sont obligatoires.

## 14. Accessibilité et limites connues

Exigences :

- `Link` pour la navigation ;
- `button` pour les actions ;
- `aria-label` sur les boutons icon-only ;
- `aria-current` sur la navigation active ;
- `aria-expanded` sur les menus ;
- focus visible ;
- contraste WCAG AA ;
- aucune information portée par la couleur seule ;
- cibles tactiles idéalement 48 px.

Limites actuellement à corriger :

- WalletWidget utilise un bouton `size-8` pour masquer le solde ;
- certaines icônes de top bar utilisent `size-11` ;
- certaines classes utilitaires comme `text-ink-600`, `text-ink-800`, `text-warning-600` peuvent ne pas exister dans le preset ;
- les tests de parité ne détectent pas automatiquement toutes les classes utilisées dans les composants ;
- certaines routes sont des placeholders et ne doivent pas être annoncées comme fonctionnelles.

## 15. Photos et médias

Les photos d’objets sont reportées.

Avant activation :

- aucun composant ne doit afficher d’URL de photo privée ;
- aucun EXIF ne doit être exposé ;
- les images publiques doivent passer par une vue ou un stockage contrôlé ;
- les documents sensibles doivent être floutés ;
- les URLs signées doivent avoir une durée courte ;
- `next/image` doit être utilisé dès que le stockage est actif.

## 16. Checklist MVP

### Auth

- [x] Email + mot de passe ;
- [x] Supabase session ;
- [x] Profil chargé après connexion ;
- [x] WhatsApp et Airtel collectés à l’inscription ;
- [ ] Révélation des coordonnées après paiement ;
- [ ] Vérification indépendante du numéro Airtel.

### Dashboard

- [x] Shell ;
- [x] Hero ;
- [x] Wallet ;
- [x] Statistiques ;
- [x] Activités ;
- [x] Transactions ;
- [x] Notifications ;
- [x] Bannière étiquettes ;
- [x] Raccourcis.

### Paiement

- [x] Citation serveur ;
- [x] Idempotence DB ;
- [x] Airtel OAuth2 et payload documenté ;
- [x] Callback HMAC ;
- [x] États Airtel séparés des états internes ;
- [x] Job d’enquiry persistant ;
- [ ] Test UAT réel ;
- [ ] Cache OAuth partagé entre instances ;
- [ ] Scheduler 60 secondes compatible.

### Données

- [ ] Statistiques Supabase ;
- [ ] Wallet Supabase ;
- [ ] Transactions Supabase ;
- [ ] Activités Supabase ;
- [ ] Notifications Supabase.

### Suite MVP

- [ ] Tests E2E de l’inscription ;
- [ ] Tests E2E de la correspondance ;
- [ ] Tests E2E du paiement Airtel UAT ;
- [ ] Photos privées ;
- [ ] Révélation post-paiement des coordonnées.

## 17. Priorité produit

1. Rechercher ou déclarer un objet ;
2. Comprendre ses objets et ses correspondances ;
3. Vérifier la propriété ;
4. Payer les frais de mise en relation ;
5. Consulter le portefeuille et les transactions ;
6. Lire les notifications importantes.

La prochaine itération doit remplacer les mocks par des actions server Supabase et valider le parcours complet avec un compte de test.
