/**
 * Consentements — constantes partagées.
 *
 * ⚠️ Pourquoi ce module existe séparément
 *
 * Les Server Actions (`'use server'`) n'autorisent l'export que de fonctions
 * asynchrones : une constante exportée depuis un tel fichier casse le build
 * Next.js. Or la version du texte de consentement doit être connue des deux
 * côtés — formulaire et serveur — d'où ce module neutre.
 */

/**
 * Version courante des textes de consentement.
 *
 * ⚠️ Toute modification du texte affiché à l'utilisateur **doit** incrémenter
 * cette valeur. Les consentements sont horodatés par version : conserver la
 * même version en changeant le texte rendrait la preuve inopposable.
 *
 * Doit rester alignée sur `registration_consent_state()` côté SQL
 * (migration `20260923003500_contact_disclosure.sql`), qui compare la version
 * enregistrée à `'2026-09-v1'`.
 */
export const CONSENT_VERSION = '2026-09-v1';

/** Nature d'un consentement, alignée sur l'enum SQL `consent_kind`. */
export const CONSENT_KINDS = ['CONTACT_DISCLOSURE', 'TERMS', 'PRIVACY'] as const;

export type ConsentKind = (typeof CONSENT_KINDS)[number];
