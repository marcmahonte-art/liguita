/**
 * Initiales d'un nom — module NEUTRE (ni client, ni serveur).
 *
 * ⚠️ Pourquoi ce fichier existe séparément de `Avatar.tsx`.
 *
 * `<Avatar />` a besoin d'un état pour basculer sur les initiales quand une photo ne
 * se charge pas, donc il passe par un composant client. Or tout ce qu'exporte un
 * module client devient une *référence client* : `initialsOf`, si elle vivait dans le
 * fichier du composant, ne serait plus appelable depuis un composant serveur — ce
 * qu'elle est pourtant (les avatars de listes, l'accueil du tableau de bord, les
 * e-mails). C'est le découpage décrit dans `Button.tsx`, appliqué au même problème.
 *
 * La règle d'affichage est ici, et nulle part ailleurs.
 */

/**
 * Initiales : au plus deux lettres, sur les deux premiers mots du nom.
 * Un nom tchadien courant (« Mahamat Abakar Ali ») donne « MA », pas « MAA ».
 */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0]?.charAt(0) ?? '';
  const second = words.length > 1 ? (words[1]?.charAt(0) ?? '') : '';
  return `${first}${second}`.toUpperCase() || '?';
}
