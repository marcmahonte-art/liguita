/**
 * Statuts d'un objet déclaré — source unique.
 *
 * ⚠️ **Pourquoi ce fichier existe.** Les mêmes statuts étaient traduits dans trois
 * endroits (`/app/objets`, `/app/objets/[kind]/[id]`, et le tableau de bord), avec trois
 * tables parfois différentes. Le jour où un libellé change, deux pages sur trois
 * affichaient l'ancien mot et l'utilisateur se retrouvait avec deux vocabulaires
 * contradictoires pour un même état. Une seule table, trois consommateurs.
 *
 * Les clés correspondent aux énumérations réelles du schéma :
 * `lost_status` (DECLARED → EXPIRED) et `item_status` (FOUND → ARCHIVED). Le vocabulaire
 * de l'interface est donc bien celui de la base, pas un vocabulaire parallèle.
 */

import type { BadgeTone } from '@liguita/ui';

import type { Tone } from './icons';

export const ITEM_STATUS_LABELS: Record<string, string> = {
  /* lost_status */
  DECLARED: 'Déclaré',
  SEARCHING: 'Recherche en cours',
  MATCH_FOUND: 'Correspondance trouvée',
  VERIFYING: 'Vérification',
  PAID: 'Payé',
  RETURNED: 'Restitué',
  CLOSED: 'Clôturé',
  EXPIRED: 'Expiré',
  /* item_status */
  FOUND: 'Trouvé',
  IN_INVENTORY: 'En inventaire',
  MATCH_POSSIBLE: 'Correspondance possible',
  OWNER_IDENTIFIED: 'Propriétaire identifié',
  RETURN_IN_PROGRESS: 'Restitution en cours',
  ARCHIVED: 'Archivé',
};

/**
 * Tonalité par statut.
 *
 * La couleur ne porte jamais seule l'information : chaque pastille est accompagnée de
 * son libellé textuel.
 */
export const ITEM_STATUS_TONES: Record<string, Tone> = {
  DECLARED: 'info',
  SEARCHING: 'info',
  MATCH_FOUND: 'match',
  VERIFYING: 'pending',
  PAID: 'found',
  RETURNED: 'found',
  CLOSED: 'neutral',
  EXPIRED: 'neutral',
  FOUND: 'found',
  IN_INVENTORY: 'info',
  MATCH_POSSIBLE: 'match',
  OWNER_IDENTIFIED: 'found',
  RETURN_IN_PROGRESS: 'pending',
  ARCHIVED: 'neutral',
};

/** Libellé d'un statut, avec repli sur la valeur brute plutôt que sur une page vide. */
export function statusLabel(status: string): string {
  return ITEM_STATUS_LABELS[status] ?? status;
}

/** Tonalité d'un statut, avec repli neutre. */
export function statusTone(status: string): Tone {
  return ITEM_STATUS_TONES[status] ?? 'neutral';
}

/**
 * Variante « texte seul » des tons.
 *
 * `TONES` associe un fond très clair à une couleur de texte : c'est le bon format pour
 * une pastille, pas pour un mot inséré dans une ligne de métadonnées. Réutiliser `TONES`
 * à cet endroit produirait des aplats — un bloc bleu plein au milieu d'un texte gris —
 * qui pèsent plus lourd que l'information qu'ils portent.
 */
const TONE_TEXT_CLASSES: Record<Tone, string> = {
  lost: 'text-brand-700',
  found: 'text-success-700',
  pending: 'text-warning-700',
  info: 'text-info-700',
  match: 'text-info-700',
  neutral: 'text-ink-500',
};

export function statusTextTone(status: string): string {
  return TONE_TEXT_CLASSES[statusTone(status)];
}

/**
 * Équivalent pour le composant `Badge`, dont la palette est plus étroite que
 * `TONES` : pas de `info` ni de `match`. L'information reste portée par le libellé ;
 * la teinte ne fait qu'accélérer la lecture.
 */
const ITEM_STATUS_BADGE_TONES: Record<string, BadgeTone> = {
  DECLARED: 'outline',
  SEARCHING: 'outline',
  IN_INVENTORY: 'outline',
  MATCH_FOUND: 'dark',
  MATCH_POSSIBLE: 'dark',
  VERIFYING: 'pending',
  RETURN_IN_PROGRESS: 'pending',
  RETURNED: 'found',
  PAID: 'found',
  FOUND: 'found',
  OWNER_IDENTIFIED: 'found',
  CLOSED: 'neutral',
  EXPIRED: 'neutral',
  ARCHIVED: 'neutral',
};

export function statusBadgeTone(status: string): BadgeTone {
  return ITEM_STATUS_BADGE_TONES[status] ?? 'neutral';
}

/**
 * Une perte est « active » tant qu'elle cherche encore son propriétaire.
 *
 * `PAID`, `RETURNED`, `CLOSED` et `EXPIRED` en sont sortis : ces objets n'attendent plus
 * rien de la part de leur propriétaire et n'ont donc rien à faire dans une section
 * intitulée « Annonces actives ».
 */
export const ACTIVE_LOST_STATUSES: readonly string[] = [
  'DECLARED',
  'SEARCHING',
  'MATCH_FOUND',
  'VERIFYING',
];

export function isActiveLostStatus(status: string): boolean {
  return ACTIVE_LOST_STATUSES.includes(status);
}
