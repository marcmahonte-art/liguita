/**
 * Identité utilisateur — source unique de vérité.
 *
 * ⚠️ **Un seul module pour tout le produit.**
 *
 * L'en-tête, le menu utilisateur, la page « Mon profil », le tableau de bord, les
 * annonces, les conversations et la console d'administration affichent tous le même
 * nom parce qu'ils appellent tous cette fonction. Dupliquer cette logique — comme le
 * faisait l'application avant cette refonte, avec deux `displayNameOf()` divergentes —
 * garantit qu'un écran finira par afficher autre chose que les autres.
 *
 * Ce module est **pur** : aucune dépendance à React, à Supabase ou au navigateur. Il
 * tourne au rendu serveur comme au rendu client, et se teste directement.
 */

import { findCountry } from '@liguita/config';
import { initialsOf as initials } from '@liguita/ui';

/** Méthodes de connexion, alignées sur l'énumération `auth_provider` en base. */
export const AUTH_PROVIDERS = ['EMAIL', 'GOOGLE', 'PHONE'] as const;

export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

/**
 * Libellés affichés à l'utilisateur.
 *
 * On ne montre jamais « OAuth », « provider » ni « identity_id » : la méthode de
 * connexion est une information technique, elle se dit en mots.
 */
const AUTH_PROVIDER_LABELS: Record<AuthProvider, string> = {
  EMAIL: 'Email et mot de passe',
  GOOGLE: 'Google',
  PHONE: 'Téléphone',
};

export function authProviderLabel(provider: AuthProvider): string {
  return AUTH_PROVIDER_LABELS[provider];
}

/**
 * Forme minimale d'un profil, telle qu'elle existe en base ou dans le contexte
 * d'authentification. Tous les champs sont optionnels : la fonction doit savoir
 * répondre même pour une ligne à moitié remplie.
 */
export interface IdentitySource {
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  email?: string | null;
  phone?: string | null;
  country_code?: string | null;
  avatar_url?: string | null;
  auth_provider?: string | null;
}

export interface Identity {
  /** Prénom, ou `null` si l'utilisateur ne l'a jamais renseigné. */
  readonly firstName: string | null;
  /** Nom, ou `null`. */
  readonly lastName: string | null;
  /** Nom complet reconstitué. */
  readonly fullName: string | null;
  /** Nom à afficher — jamais vide, jamais un numéro de téléphone en priorité. */
  readonly displayName: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly avatarUrl: string | null;
  readonly authProvider: AuthProvider;
  /** Initiales, pour l'avatar sans photo. */
  readonly initials: string;
  /** Vrai si l'affichage repose sur un vrai nom, pas sur un repli technique. */
  readonly hasRealName: boolean;
}

/** Dernier filet avant d'afficher une mention neutre. */
const NEUTRAL_LABEL = 'Membre Liguita';

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

/**
 * Initiales de l'identité, pour l'avatar sans photo.
 *
 * ⚠️ Le découpage — au plus deux lettres, sur les deux premiers mots — appartient à
 * `@liguita/ui`, parce que c'est lui qui décide des initiales affichées dans
 * `<Avatar />`. Le recalculer ici créerait deux règles qui peuvent diverger : le même
 * « Jean Dupont » donnerait « JD » dans le menu et autre chose sur la page profil.
 * On choisit donc le premier candidat qui existe et on délègue.
 */
function initialsOf(...candidates: Array<string | null>): string {
  for (const candidate of candidates) {
    const value = clean(candidate);
    if (value === null) continue;
    return initials(value);
  }
  return '?';
}

export function toAuthProvider(value: string | null | undefined): AuthProvider {
  const normalized = value?.trim().toUpperCase() as AuthProvider | undefined;
  return normalized && AUTH_PROVIDERS.includes(normalized) ? normalized : 'EMAIL';
}

/**
 * Résout l'identité affichable d'un profil.
 *
 * ⚠️ **Ordre de repli, et il est volontaire :**
 *   1. le nom saisi (prénom + nom) ;
 *   2. le prénom seul ;
 *   3. l'email ;
 *   4. le numéro de téléphone, en tout dernier.
 *
 * Le téléphone arrive en dernier parce que c'est une donnée de contact, pas une
 * identité : afficher « +235 66 12 34 56 » là où l'application peut afficher
 * « Jean Dupont » est ce que cette refonte corrige.
 */
export function resolveIdentity(source: IdentitySource | null | undefined): Identity {
  const email = clean(source?.email);

  /* Le nom peut être réparti sur deux colonnes, ou seulement dans `full_name`, ou
     seulement dans `display_name` (comptes antérieurs à la refonte). On tente les
     trois, dans cet ordre. */
  let firstName = clean(source?.first_name);
  let lastName = clean(source?.last_name);

  if (firstName === null || lastName === null) {
    /* `full_name` est la source la plus fiable : elle est renseignée à l'inscription
       et par Google. On le découpe seulement s'il contient au moins deux mots —
       sinon ce n'est qu'un prénom, et le traiter comme un nom complet donnerait un
       doublon « Jean Jean ». */
    const fullName = clean(source?.full_name) ?? clean(source?.display_name);
    if (fullName !== null) {
      const [first, ...rest] = fullName.split(/\s+/).filter(Boolean);
      firstName ??= first ?? null;
      if (lastName === null && rest.length > 0) {
        lastName = rest.join(' ');
      }
    }
  }

  const composed = clean([firstName, lastName].filter(Boolean).join(' '));
  const fullName = composed ?? clean(source?.full_name) ?? clean(source?.display_name);

  /* Le nom affiché ne peut pas être vide : `display_name` est utilisé comme
     `title`, comme `alt` d'image et comme nom accessible. */
  const displayName = fullName ?? firstName ?? email ?? clean(source?.phone) ?? NEUTRAL_LABEL;

  return {
    firstName,
    lastName,
    fullName,
    displayName,
    email,
    phone: clean(source?.phone),
    avatarUrl: clean(source?.avatar_url),
    authProvider: toAuthProvider(source?.auth_provider),
    initials: initialsOf(fullName, firstName, email, source?.phone ?? null),
    hasRealName: fullName !== null || firstName !== null,
  };
}

/**
 * Nom affichable d'un **tiers**.
 *
 * Volontairement plus strict que `resolveIdentity` : pas de repli sur l'email ni sur le
 * numéro. Un correspondant — propriétaire d'un objet, personne avec qui l'on échange —
 * n'a rien à recevoir des coordonnées d'un autre membre, et l'affichage d'un numéro en
 * guise de nom est exactement le défaut que la refonte corrige.
 *
 * `null` signifie « aucun nom connu » : l'appelant affiche alors une formule neutre.
 */
export function publicNameOf(source: IdentitySource | null | undefined): string | null {
  const identity = resolveIdentity(source);
  return identity.fullName ?? identity.firstName;
}

/**
 * Numéro de téléphone lisible.
 *
 * Les numéros tchadiens sont stockés sans indicatif (`661234567`), comme ceux que
 * fournit Supabase. On n'ajoute donc l'indicatif du pays que lorsqu'il manque — et un
 * numéro déjà international n'est jamais réécrit.
 *
 * ⚠️ `countrySlug` est un code ISO (`TD`), pas un indicatif : on passe par le
 * référentiel pour obtenir le vrai préfixe. Écrire `+TD` devant un numéro serait
 * inatteignable.
 */
export function formatPhone(
  phone: string | null | undefined,
  countryCode = 'TD',
): string | null {
  const value = clean(phone);
  if (value === null) return null;
  if (value.startsWith('+')) return value;
  if (value.startsWith('00')) return `+${value.slice(2)}`;

  const country = findCountry(countryCode.trim().toUpperCase());
  if (!country) return `+${value}`;
  /* Regroupement par trois chiffres à partir de l'indicatif : lisible d'un coup d'œil,
     et c'est ainsi que le numéro est écrit au Tchad. */
  const grouped = value.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
  return `${country.phonePrefix} ${grouped}`;
}
