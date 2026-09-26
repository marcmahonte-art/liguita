/**
 * Redirection post-connexion.
 *
 * ⚠️ Le paramètre `?redirect=` vient de l'URL : c'est une entrée utilisateur, pas une
 * valeur de confiance. Une validation par `startsWith('/')` suffit à laisser passer
 * `//evil.example`, que le navigateur lit comme une URL absolue — c'est-à-dire une
 * redirection ouverte, en plein sur le domaine de connexion d'un site de restitution
 * d'objets perdus.
 *
 * On n'accepte donc que des chemins **internes** : une barre oblique unique, aucun
 * caractère que le navigateur réinterprète, et une longueur bornée.
 */

/** Destinations vers lesquelles on accepte de renvoyer l'utilisateur. */
const DEFAULT_DESTINATION = '/app';

/** 2 Ko : largement au-delà d'un chemin réel, bien en deçà d'un vecteur d'abus. */
const MAX_LENGTH = 2048;

/**
 * Caractères à proscrire, en plus de la vérification de tête.
 *
 * Le navigateur normalise avant d'analyser : il convertit les antislashs en barres
 * obliques et **retire les tabulations et sauts de ligne**, où qu'ils soient. Un chemin
 * comme `/\t/evil.example` devient donc `//evil.example` sous ses yeux — il suffit
 * d'accepter la tabulation pour rouvrir la redirection ouverte que le test de tête
 * semble refermer.
 *
 * Un espace brut est refusé pour la même raison de prudence : une URL doit être encodée.
 */
const FORBIDDEN_CHARACTERS = /[\s\\]/;

export function safeRedirectPath(
  value: string | null | undefined,
  fallback = DEFAULT_DESTINATION,
): string {
  if (typeof value !== 'string') return fallback;
  const candidate = value.trim();
  if (candidate === '' || candidate.length > MAX_LENGTH) return fallback;
  if (FORBIDDEN_CHARACTERS.test(candidate)) return fallback;
  /* Une seule barre oblique initiale : `//hôte` est interprété comme une URL absolue. */
  if (!candidate.startsWith('/') || candidate.startsWith('//')) return fallback;
  if (/^\/+[a-z][a-z0-9+.-]*:/i.test(candidate)) return fallback;
  return candidate;
}
