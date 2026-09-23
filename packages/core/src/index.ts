/**
 * @liguita/core — logique métier pure.
 *
 * Ce paquet ne fait AUCUN appel réseau et AUCUNE requête base de données.
 * Il reçoit des données et retourne un résultat. C'est ce qui le rend testable en
 * millisecondes et réutilisable par le web, les workers, le bot WhatsApp et l'admin.
 *
 * Contenu :
 *  · `pricing`  — calcul des frais de mise en relation (plan v3 §5)
 *  · `matching` — score de correspondance entre objets perdus et trouvés (plan v3 §6)
 */

export * from './pricing';
export * from './matching';
