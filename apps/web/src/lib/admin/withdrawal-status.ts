/**
 * Libellés des statuts de retrait.
 *
 * ⚠️ **Une seule table, pour la même raison que `wallet-labels.ts` :** la page du
 * trouveur (`/app/portefeuille`) et la console d'administration affichent les mêmes
 * lignes de `withdrawals`. Deux tables de correspondance voudraient dire deux
 * traductions à tenir à jour, donc une seule à jour — et un trouveur lisant
 * « EN COURS » là où l'administrateur lit « Soumis » ne sait plus où en est son
 * argent.
 *
 * ⚠️ **Accessibilité :** la couleur ne porte jamais seule l'information. Chaque
 * statut porte un libellé explicite et une tonalité ; la tonalité renforce, elle
 * ne remplace pas.
 */
import type { BadgeTone } from '@liguita/ui';

export interface WithdrawalStatusMeta {
  label: string;
  tone: BadgeTone;
  /** Ce que le statut signifie concrètement, pour le trouveur. */
  explanation: string;
}

export const WITHDRAWAL_STATUS: Record<string, WithdrawalStatusMeta> = {
  REQUESTED: {
    label: 'En attente',
    tone: 'pending',
    explanation: 'Votre demande est enregistrée. Liguita la traite sous 24 h ouvrées.',
  },
  MANUAL_REVIEW: {
    label: 'Vérification manuelle',
    tone: 'pending',
    explanation:
      'Votre demande demande une vérification supplémentaire. Aucun argent n’est perdu.',
  },
  SUBMITTED: {
    label: 'Envoyé à Airtel',
    tone: 'pending',
    explanation: 'Le versement a été transmis à Airtel Money. Il arrive sous peu.',
  },
  PENDING: {
    label: 'En cours',
    tone: 'pending',
    explanation: 'Airtel Money traite le versement. Cela prend quelques minutes.',
  },
  PAID: {
    label: 'Payé',
    tone: 'found',
    explanation: 'Le montant a été versé sur votre compte Airtel Money.',
  },
  FAILED: {
    label: 'Échec — recrédité',
    tone: 'urgent',
    explanation:
      'Le versement a échoué et le montant a été recrédité sur votre solde Liguita.',
  },
  RELEASED: {
    label: 'Refusé — recrédité',
    tone: 'urgent',
    explanation: 'La demande a été refusée et le montant a été recrédité sur votre solde.',
  },
  CANCELLED: {
    label: 'Annulé',
    tone: 'neutral',
    explanation: 'La demande a été annulée.',
  },
};

/** Métadonnées d'un statut, avec repli explicite sur la clé brute. */
export function withdrawalStatusMeta(status: string): WithdrawalStatusMeta {
  return (
    WITHDRAWAL_STATUS[status] ?? {
      label: status,
      tone: 'neutral',
      explanation: 'Statut inconnu.',
    }
  );
}

/** Un statut qui n'attend plus d'action de la part de Liguita. */
export function isWithdrawalClosed(status: string): boolean {
  return ['PAID', 'FAILED', 'RELEASED', 'CANCELLED'].includes(status);
}

/**
 * Libellés des types d'écriture du registre.
 *
 * `REWARD` et `REWARD_RELEASE` sont définis dans `wallet-labels.ts` (côté trouveur) ;
 * on n'ajoute ici que ce que la console voit en plus, pour ne pas créer un second
 * libellé pour la même clé.
 */
export const WALLET_ENTRY_STATUS_LABELS: Record<string, string> = {
  RESERVED: 'Réservé',
  AVAILABLE: 'Disponible',
  HELD: 'Bloqué (retrait en cours)',
  RELEASED: 'Libéré',
  REVERSED: 'Annulé — recrédité',
};
