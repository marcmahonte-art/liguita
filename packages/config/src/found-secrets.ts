/**
 * Secrets de vérification — côté trouveur.
 *
 * ⚠️ Pourquoi ce module existe
 *
 * Le moteur de vérification (`submitVerificationAnswers`) lit la table
 * `found_item_secrets` pour comparer les réponses du chercheur à celles du
 * trouveur. Tant que cette table est vide, **aucune réclamation ne peut être
 * auto-approuvée** : le score vaut 0 et la demande part systématiquement en
 * revue manuelle. Or la table était restée vide en production, parce que le
 * seul point d'entrée existant (`saveFoundSecrets`) exigeait qu'une
 * correspondance existe déjà — autrement dit, le trouveur n'était jamais
 * invité à déposer ses réponses au moment où il avait l'objet sous les yeux.
 *
 * Le dépôt des secrets devient donc **obligatoire à la déclaration**.
 *
 * ⚠️ Deux règles non négociables (cf. `verification-questions.ts`) :
 *  · jamais de question dont la réponse est publique sur la fiche ;
 *  · jamais de donnée secrète d'authentification (code entier, mot de passe).
 */

import { findCategory } from './categories';
import { questionsFor, type VerificationQuestion } from './verification-questions';

/**
 * Nombre minimal de questions auxquelles le trouveur doit répondre pour que sa
 * déclaration soit acceptée.
 *
 * Fixé à 2 et non au nombre de questions obligatoires : certaines catégories
 * n'ont aucune question marquée `isRequired` (`vehicle` par exemple, dont
 * `spec-vehicle` et `spec-plate` sont facultatives). Exiger « toutes les
 * obligatoires » ferait échouer ces catégories, exiger « au moins une »
 * autoriserait des secrets trop pauvres pour scorer.
 */
export const FOUND_SECRETS_MIN_ANSWERS = 2;

/**
 * Questions posées au trouveur pour un code catégorie.
 *
 * Le code provient du formulaire (`category_code`), c'est-à-dire d'une
 * **sous-catégorie** — la seule que l'utilisateur choisit. `questionsFor`
 * aiguille sur `categoryId` puis retombe sur `parentId` : une sous-catégorie
 * peut donc avoir ses propres questions (`keys` → `pers-count`, `pers-mark`)
 * ou hériter de celles de sa racine.
 */
export function secretsQuestionsForCategory(categoryCode: string): readonly VerificationQuestion[] {
  const category = findCategory(categoryCode);
  if (!category) return [];
  return questionsFor(category.id, category.parentId);
}

export interface FoundSecretValidation {
  readonly ok: boolean;
  /** Codes de questions effectivement renseignées (valeurs non vides). */
  readonly answered: readonly string[];
  readonly missing: readonly string[];
  readonly error?: string;
}

/**
 * Valide les réponses secrètes saisies par le trouveur.
 *
 * Purement synchrone et sans I/O : utilisable indifféremment dans le
 * formulaire (pour activer le bouton) et dans la Server Action (pour la garde
 * serveur). Le serveur ne doit jamais faire confiance au bouton.
 */
export function validateFoundSecrets(
  categoryCode: string,
  answers: Readonly<Record<string, string>>,
): FoundSecretValidation {
  const questions = secretsQuestionsForCategory(categoryCode).filter((q) => q.isRequired);
  const cleaned = Object.fromEntries(
    Object.entries(answers)
      .map(([key, value]) => [key, String(value ?? '').trim()] as const)
      .filter(([, value]) => value.length > 0),
  );
  const answered = Object.keys(cleaned);

  const missing = questions.filter((q) => !cleaned[q.id]).map((q) => q.id);

  if (answered.length < FOUND_SECRETS_MIN_ANSWERS) {
    return {
      ok: false,
      answered,
      missing,
      error:
        `Renseignez au moins ${FOUND_SECRETS_MIN_ANSWERS} réponses de vérification. ` +
        'Sans elles, le propriétaire ne peut pas prouver sa propriété automatiquement ' +
        'et votre déclaration est mise en attente.',
    };
  }

  if (missing.length > 0) {
    const labels = questions
      .filter((q) => missing.includes(q.id))
      .map((q) => q.promptFr)
      .join(' · ');
    return {
      ok: false,
      answered,
      missing,
      error: `Ces questions obligatoires restent sans réponse : ${labels}`,
    };
  }

  return { ok: true, answered, missing: [] };
}

/**
 * Le trouveur a-t-il assez de réponses pour que la vérification automatique
 * fonctionne ? Utilisé par la fiche de correspondance pour signaler au
 * trouveur qu'il doit compléter.
 */
export function hasUsableSecrets(answers: Record<string, string> | null | undefined): boolean {
  if (!answers) return false;
  const filled = Object.values(answers).filter((value) => String(value ?? '').trim().length > 0);
  return filled.length >= FOUND_SECRETS_MIN_ANSWERS;
}
