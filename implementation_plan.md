# Sprint 1 (Auth) + Sprint 2 (Objets) — Plan d'implémentation

## Contexte

Le Sprint 0 est terminé : monorepo pnpm, design system (`@liguita/ui`), moteurs de tarification et correspondance (`@liguita/core`), constantes de référentiel (`@liguita/config`), app Next.js 15, migrations SQL de base (enums, référentiels, pricing_rules, RLS référentiels) et pages maquettes (home, design-system, déclaration perdu/trouvé en maquettes statiques).

L'objectif est maintenant de brancher Supabase Auth (téléphone +235, OTP SMS) et de connecter les formulaires de déclaration à la base de données avec persistance locale des brouillons.

---

## User Review Required

> [!IMPORTANT]
> **Projet Supabase requis.** Les variables `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` dans `.env.local` doivent pointer vers un projet Supabase existant (local via `supabase start` ou hébergé). Avez-vous déjà un projet Supabase configuré, ou faut-il le créer en local ?

> [!IMPORTANT]
> **Fournisseur SMS.** Supabase Auth envoie les OTP par SMS via un fournisseur tiers (Twilio, MessageBird, Vonage…). La config `.env.example` prévoit `SMS_PROVIDER_API_KEY`. Avez-vous déjà un fournisseur SMS configuré dans Supabase, ou voulez-vous d'abord développer en mode « console log » (l'OTP est visible dans les logs Supabase) ?

> [!WARNING]
> **Connexion par mot de passe (tâche 1.2 du plan v3).** Le plan technique prévoit aussi une connexion par mot de passe + réinitialisation. Voulez-vous l'inclure dans ce sprint ou rester sur téléphone + OTP uniquement pour le MVP ?

## Open Questions

1. **Supabase local ou hébergé ?** Si local, il faut Docker et `supabase start`. Si hébergé, il faut les clés API dans `.env.local`.
2. **Mot de passe ?** Le plan prévoit la tâche 1.2 (connexion par mot de passe). Inclure ou reporter ?
3. **Upload de photos (tâche 2.2 du Sprint 2) ?** Le plan prévoit l'envoi de photos avec URL signée et compression. Voulez-vous l'inclure dans ce sprint ou reporter au prochain incrément ? L'implémentation actuelle des formulaires n'a pas de champ photo.

---

## Proposed Changes

### Sprint 1 — Authentification

---

#### 1. Package `@liguita/db` — Migration `profiles`

##### [NEW] `packages/db/supabase/migrations/20260923000500_profiles.sql`

Migration SQL qui crée la table `profiles` conformément au schéma v3 §4.3 :

```sql
create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  phone           text not null,
  phone_verified  boolean not null default false,
  full_name       text,
  display_name    text,
  avatar_url      text,
  country_code    char(2) not null default 'TD',
  city_slug       text,
  locale          text not null default 'fr',
  app_role        app_role not null default 'USER',
  trust_score     int not null default 50 check (trust_score between 0 and 100),
  is_samaritan    boolean not null default false,
  is_blocked      boolean not null default false,
  blocked_reason  text,
  last_seen_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
```

Plus :
- **Trigger `on_auth_user_created`** : fonction PL/pgSQL qui insère automatiquement une ligne dans `profiles` à chaque inscription Supabase Auth
- **Trigger `set_updated_at`** : met à jour `updated_at` à chaque modification
- **Politiques RLS** conformes au plan v3 §4.5 :
  - `profile_select_self` : lecture de son propre profil (ou modérateur/admin)
  - `profile_update_self` : modification de son propre profil, sans pouvoir changer `app_role`

---

#### 2. Lib Supabase — Client navigateur et serveur

##### [NEW] `apps/web/src/lib/supabase/client.ts`

Client Supabase pour les composants client (`'use client'`). Utilise `createBrowserClient` de `@supabase/ssr` avec les variables d'environnement `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

##### [NEW] `apps/web/src/lib/supabase/server.ts`

Client Supabase côté serveur (Server Components, Route Handlers, Server Actions). Utilise `createServerClient` de `@supabase/ssr` avec les cookies Next.js.

##### [NEW] `apps/web/src/lib/supabase/middleware.ts`

Fonction utilitaire pour le middleware Next.js : rafraîchit la session à chaque requête.

---

#### 3. Middleware Next.js

##### [NEW] `apps/web/src/middleware.ts`

Middleware Next.js qui :
- Rafraîchit le token de session via `updateSession`
- Protège les routes `/app/*`, `/business/*`, `/admin/*` : redirige vers `/connexion` si pas de session
- Laisse passer librement les routes publiques (`/`, `/rechercher`, `/declarer/*`, `/connexion`, `/inscription`, `/otp`)

---

#### 4. Provider d'authentification

##### [NEW] `apps/web/src/lib/auth/auth-context.tsx`

Context React qui expose :
- `user` : profil de l'utilisateur connecté (depuis `profiles`) ou `null`
- `session` : session Supabase
- `isLoading` : état de chargement
- `signInWithPhone(phone)` : envoie l'OTP
- `verifyOtp(phone, token)` : vérifie l'OTP et crée la session
- `signOut()` : déconnexion

##### [MODIFY] `apps/web/src/app/layout.tsx`

Ajouter le `<AuthProvider>` autour du `{children}` dans le layout racine.

---

#### 5. Écrans d'authentification

##### [NEW] `apps/web/src/app/(auth)/connexion/page.tsx`

Page `/connexion` — Saisie du numéro de téléphone :
- Champ téléphone avec préfixe `+235` (fixe, non modifiable)
- Validation : 8 chiffres exactement (format tchadien)
- Bouton « Recevoir le code » → appelle `signInWithPhone`
- Redirige vers `/otp` avec le numéro en query param
- Lien vers `/inscription` si premier usage
- Design conforme au design system (pilule, 48px touch targets, couleurs tokens)

##### [NEW] `apps/web/src/app/(auth)/otp/page.tsx`

Page `/otp` — Saisie du code OTP :
- Utilise le composant `OTPInput` existant dans `@liguita/ui` (6 chiffres)
- Minuteur de renvoi (60 secondes)
- Bouton « Vérifier » → appelle `verifyOtp`
- En cas de succès : redirige vers `/` ou l'URL de retour
- En cas d'erreur : message d'erreur, possibilité de renvoyer le code
- Limitation à 5 tentatives affichée côté UI

##### [NEW] `apps/web/src/app/(auth)/layout.tsx`

Layout minimal pour les pages d'auth : logo centré, pas de header/footer marketing.

---

#### 6. Mise à jour du header

##### [MODIFY] `apps/web/src/components/public/SiteHeader.tsx`

- Si connecté : avatar + nom (ou initiale) + bouton « Mon espace »
- Si déconnecté : bouton « Connexion »
- Bouton de déconnexion dans le menu utilisateur

---

#### 7. Dépendances NPM

##### [MODIFY] `apps/web/package.json`

Ajouter :
```json
"@supabase/supabase-js": "^2.49.0",
"@supabase/ssr": "^0.5.0"
```

---

### Sprint 2 — Objets perdus et trouvés

---

#### 8. Migration `items` (lost_items + found_items)

##### [NEW] `packages/db/supabase/migrations/20260923000600_items.sql`

Tables conformes au plan v3 :

- **`lost_items`** : `id`, `user_id` → `profiles(id)`, `category_code`, `item_type_code`, `title`, `description`, `brand`, `color`, `city_slug`, `neighborhood_slug`, `place_label`, `occurred_at`, `status` (`lost_status`), `declared_value_xaf`, `created_at`, `updated_at`
- **`found_items`** : `id`, `finder_id` → `profiles(id)`, `category_code`, `item_type_code`, `title`, `description`, `brand`, `color`, `city_slug`, `neighborhood_slug`, `place_label`, `found_at`, `status` (`item_status`), `created_at`, `updated_at`
- **`item_photos`** : `id`, `item_id`, `item_kind` (`LOST`/`FOUND`), `url`, `thumbnail_url`, `blurhash`, `is_blurred`, `sort_order`, `created_at`
- **`item_status_history`** : `id`, `item_id`, `item_kind`, `old_status`, `new_status`, `changed_by`, `note`, `created_at`

**RLS** :
- Un utilisateur ne lit que ses propres objets perdus
- Les objets trouvés publiés sont lisibles par tous (vue publique future)
- Insertion : uniquement par l'utilisateur propriétaire
- Mise à jour : uniquement par l'utilisateur propriétaire (statut restreint)

---

#### 9. Server Actions — Déclarations

##### [NEW] `apps/web/src/app/actions/declare-lost.ts`

Server Action `declareLostItem(formData)` :
- Vérifie la session active
- Valide les champs (catégorie, titre, ville, date obligatoires)
- Insère dans `lost_items` avec `status = 'DECLARED'`
- Retourne l'ID de la déclaration

##### [NEW] `apps/web/src/app/actions/declare-found.ts`

Server Action `declareFoundItem(formData)` :
- Vérifie la session active
- Valide les champs (catégorie, titre, quartier obligatoires)
- Insère dans `found_items` avec `status = 'FOUND'`
- Retourne l'ID de la déclaration

---

#### 10. Refonte du formulaire « J'ai perdu »

##### [MODIFY] `apps/web/src/app/(public)/declarer/perdu/page.tsx`

Évolutions par rapport à la maquette existante :
- **Suppression de l'étape 3 « Contact »** : les coordonnées viennent du profil utilisateur connecté
- **Ajout d'un gate d'authentification** : si non connecté, redirige vers `/connexion?redirect=/declarer/perdu`
- **Persistance du brouillon dans `localStorage`** : déjà en place, on conserve le mécanisme existant
- **Soumission via Server Action** `declareLostItem` au lieu du `handleSubmit` factice
- **Ajout du champ `itemTypeId`** via le `Combobox` existant : le type d'objet est **obligatoire** (cf. `types/index.ts` l. 76)
- **Ville et quartier** : utilisation des données `@liguita/config` avec le composant `Select` du design system
- **État de confirmation** : affiche l'ID de la déclaration et un lien vers le tableau de bord

##### [NEW] `apps/web/src/lib/hooks/use-draft.ts`

Hook `useDraft<T>(key, initial)` réutilisable :
- Restaure depuis `localStorage` au montage
- Sauvegarde automatiquement à chaque modification (debounce 500ms)
- Expose `clearDraft()` après soumission
- Gère gracieusement les erreurs `localStorage` (mode privé, quota, SSR)

---

#### 11. Refonte du formulaire « J'ai trouvé »

##### [MODIFY] `apps/web/src/app/(public)/declarer/trouve/page.tsx`

Évolutions :
- **Gate d'authentification** : idem
- **Persistance du brouillon** via le hook `useDraft`
- **Soumission via Server Action** `declareFoundItem`
- **Ajout des champs** `itemTypeId`, `brand`, `color`, `description` (optionnels mais importants pour le matching)
- **Date de découverte** : ajout d'un champ date

---

#### 12. Types générés Supabase

##### [NEW] `packages/db/src/database.types.ts`

Types TypeScript générés via `supabase gen types typescript` pour le typage fort des requêtes Supabase côté client et serveur.

---

## Résumé des fichiers

| Statut | Fichier | Rôle |
|--------|---------|------|
| [NEW] | `packages/db/supabase/migrations/20260923000500_profiles.sql` | Table profiles + trigger + RLS |
| [NEW] | `packages/db/supabase/migrations/20260923000600_items.sql` | Tables lost_items, found_items, item_photos, status_history + RLS |
| [NEW] | `apps/web/src/lib/supabase/client.ts` | Client Supabase navigateur |
| [NEW] | `apps/web/src/lib/supabase/server.ts` | Client Supabase serveur |
| [NEW] | `apps/web/src/lib/supabase/middleware.ts` | Utilitaire middleware session |
| [NEW] | `apps/web/src/middleware.ts` | Middleware Next.js (session + gardes) |
| [NEW] | `apps/web/src/lib/auth/auth-context.tsx` | Context React d'auth |
| [NEW] | `apps/web/src/app/(auth)/layout.tsx` | Layout pages d'auth |
| [NEW] | `apps/web/src/app/(auth)/connexion/page.tsx` | Page connexion téléphone |
| [NEW] | `apps/web/src/app/(auth)/otp/page.tsx` | Page saisie OTP |
| [NEW] | `apps/web/src/app/actions/declare-lost.ts` | Server Action déclaration perte |
| [NEW] | `apps/web/src/app/actions/declare-found.ts` | Server Action déclaration trouvaille |
| [NEW] | `apps/web/src/lib/hooks/use-draft.ts` | Hook brouillon localStorage |
| [MODIFY] | `apps/web/src/app/layout.tsx` | Ajout AuthProvider |
| [MODIFY] | `apps/web/src/app/(public)/declarer/perdu/page.tsx` | Connexion Supabase + Server Action |
| [MODIFY] | `apps/web/src/app/(public)/declarer/trouve/page.tsx` | Connexion Supabase + brouillon + Server Action |
| [MODIFY] | `apps/web/src/components/public/SiteHeader.tsx` | Avatar/connexion conditionnels |
| [MODIFY] | `apps/web/package.json` | Dépendances Supabase |

---

## Verification Plan

### Automated Tests
- `pnpm typecheck` — vérification TypeScript stricte
- `pnpm test` — tests existants (pricing, matching) ne régressent pas
- `pnpm build` — build de production sans erreur

### Manual Verification
- **Inscription** : saisir un numéro +235, recevoir un OTP (ou le lire dans les logs), le valider → profil créé dans `profiles`
- **Connexion** : se déconnecter, se reconnecter avec le même numéro
- **Brouillon perdu** : remplir partiellement le formulaire, fermer l'onglet, rouvrir → le brouillon est restauré
- **Brouillon trouvé** : idem pour « J'ai trouvé »
- **Soumission** : soumettre une déclaration → vérifier en base que la ligne existe dans `lost_items` ou `found_items`
- **Protection des routes** : accéder à `/declarer/perdu` sans session → redirigé vers `/connexion`
- **RLS** : un utilisateur A ne peut pas lire les objets perdus de B (vérifiable via Supabase Studio)
