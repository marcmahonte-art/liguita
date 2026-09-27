/**
 * Libellés des écritures du portefeuille.
 *
 * ⚠️ **Une seule source, volontairement.**
 *
 * Le tableau de bord et la page « Récompenses » lisent les mêmes lignes de
 * `wallet_entries`. Elles avaient chacune leur propre table de correspondance, avec des
 * libellés différents pour la même écriture : deux tables, c'est deux traductions à
 * tenir à jour, donc une seule à jour. Elles divergeaient déjà — l'une écrivait
 * « Recompense objet trouvé », l'autre « Récompense reçue » pour la clé `REWARD`.
 *
 * Les accents ne sont pas un détail : ces chaînes sont affichées telles quelles, et
 * « Recompense » sans accent se lit comme une faute sur un écran de paiement.
 *
 * Le repli renvoie la clé brute. Toute écriture créée par l'application figure dans la
 * table ci-dessus ; une clé inconnue signale un `source_type` ajouté en base sans
 * libellé, et la montrer telle quelle est plus utile à diagnostiquer qu'un libellé
 * générique qui la masquerait.
 */
export const WALLET_SOURCE_LABELS: Record<string, string> = {
  REWARD: 'Récompense objet trouvé',
  REWARD_RELEASE: 'Récompense disponible',
  WITHDRAWAL: 'Retrait Airtel Money',
};

/** Libellé lisible d'une écriture, quel que soit l'appelant. */
export function walletSourceLabel(sourceType: string): string {
  return WALLET_SOURCE_LABELS[sourceType] ?? sourceType;
}
