/**
 * Questions de vérification de propriété.
 *
 * Le principe : la fiche publique d'un objet trouvé n'affiche **jamais** de quoi
 * l'identifier précisément (ni photo nette d'un document, ni numéro, ni signe distinctif).
 * La preuve de propriété se fait donc par des questions dont seules deux personnes
 * connaissent la réponse : le propriétaire, et celui qui a l'objet en main.
 *
 * ⚠️ Deux règles non négociables :
 *  · **Jamais de question dont la réponse est publique.** « Quelle est la couleur ? » ne
 *    vaut rien si la couleur est déjà affichée sur la fiche.
 *  · **Jamais de donnée secrète d'authentification.** On demande le *premier chiffre* du
 *    code de déverrouillage, jamais le code entier ; jamais de mot de passe, jamais de
 *    numéro de carte bancaire. Une vérification ne doit pas créer de risque supplémentaire.
 *
 * Référence : docs/Liguita_Plan_Implementation_v3.md §11.6
 */

export type VerificationAnswerKind = 'text' | 'number' | 'date' | 'choice';

export interface VerificationQuestion {
  readonly id: string;
  /** Catégorie racine à laquelle la question s'applique. */
  readonly categoryId: string;
  readonly promptFr: string;
  readonly answerKind: VerificationAnswerKind;
  /** Propositions, pour `answerKind: 'choice'`. */
  readonly choices?: readonly string[];
  /** Poids dans le score de vérification. Les questions discriminantes pèsent plus lourd. */
  readonly weight: number;
  /** Faux pour les questions dont la réponse est difficile à exiger (facultatives). */
  readonly isRequired: boolean;
}

export const VERIFICATION_QUESTIONS: readonly VerificationQuestion[] = [
  /* ---------- Documents & cartes ---------- */
  { id: 'doc-name', categoryId: 'documents', promptFr: 'Quel est le nom complet inscrit sur le document ?', answerKind: 'text', weight: 3, isRequired: true },
  { id: 'doc-birthdate', categoryId: 'documents', promptFr: 'Quelle est la date de naissance figurant sur le document ?', answerKind: 'date', weight: 3, isRequired: true },
  { id: 'doc-number-tail', categoryId: 'documents', promptFr: 'Quels sont les quatre derniers caractères du numéro du document ?', answerKind: 'text', weight: 4, isRequired: true },
  { id: 'doc-issued-by', categoryId: 'documents', promptFr: 'Par quel service ou dans quelle ville le document a-t-il été délivré ?', answerKind: 'text', weight: 2, isRequired: false },
  { id: 'doc-kept-with', categoryId: 'documents', promptFr: 'Y avait-il d’autres papiers rangés avec ce document ? Lesquels ?', answerKind: 'text', weight: 1, isRequired: false },

  /* ---------- Effets personnels ---------- */
  { id: 'pers-contents', categoryId: 'personal', promptFr: 'Décrivez le contenu qui se trouvait à l’intérieur.', answerKind: 'text', weight: 4, isRequired: true },
  { id: 'pers-mark', categoryId: 'personal', promptFr: 'Y a-t-il un signe distinctif visible (rayure, tache, autocollant, réparation) ?', answerKind: 'text', weight: 3, isRequired: true },
  { id: 'pers-brand', categoryId: 'personal', promptFr: 'Quelle marque ou inscription est visible sur l’objet ?', answerKind: 'text', weight: 2, isRequired: false },
  { id: 'pers-color', categoryId: 'personal', promptFr: 'Quelle est la couleur dominante de l’objet ?', answerKind: 'text', weight: 2, isRequired: true },
  { id: 'pers-count', categoryId: 'personal', promptFr: 'Combien d’éléments compose l’objet (compartiments, clés, pièces) ?', answerKind: 'number', weight: 2, isRequired: false },

  /* ---------- Électronique ---------- */
  { id: 'elec-model', categoryId: 'electronics', promptFr: 'Quelle est la marque et le modèle exact ?', answerKind: 'text', weight: 3, isRequired: true },
  { id: 'elec-lock-first', categoryId: 'electronics', promptFr: 'Quel est le premier chiffre du code de déverrouillage ?', answerKind: 'number', weight: 3, isRequired: false },
  { id: 'elec-wallpaper', categoryId: 'electronics', promptFr: 'Décrivez le fond d’écran ou la coque de protection.', answerKind: 'text', weight: 3, isRequired: true },
  { id: 'elec-damage', categoryId: 'electronics', promptFr: 'L’appareil porte-t-il une éraflure, un impact ou une réparation visible ?', answerKind: 'text', weight: 2, isRequired: false },
  { id: 'elec-operator', categoryId: 'electronics', promptFr: 'Quel opérateur utilisez-vous sur cet appareil ?', answerKind: 'choice', choices: ['Airtel', 'Moov', 'Tigo', 'Autre', 'Aucun'], weight: 2, isRequired: false },

  /* ---------- Objets de valeur ---------- */
  { id: 'val-model', categoryId: 'valuables', promptFr: 'Quelle est la marque et le modèle exact ?', answerKind: 'text', weight: 3, isRequired: true },
  { id: 'val-serial', categoryId: 'valuables', promptFr: 'Quel est le numéro de série ou l’IMEI ?', answerKind: 'text', weight: 4, isRequired: true },
  { id: 'val-engraving', categoryId: 'valuables', promptFr: 'Y a-t-il une gravure, une inscription ou un prénom ?', answerKind: 'text', weight: 3, isRequired: false },
  { id: 'val-case', categoryId: 'valuables', promptFr: 'Dans quel étui, écrin ou housse l’objet était-il rangé ?', answerKind: 'text', weight: 2, isRequired: false },
  { id: 'val-price', categoryId: 'valuables', promptFr: 'Quel était le prix d’achat approximatif ?', answerKind: 'number', weight: 1, isRequired: false },

  /* ---------- Cas spéciaux ---------- */
  { id: 'spec-vehicle', categoryId: 'special', promptFr: 'Quelle est la marque, le modèle et l’année du véhicule ?', answerKind: 'text', weight: 3, isRequired: false },
  { id: 'spec-plate', categoryId: 'special', promptFr: 'Quels sont les derniers caractères de l’immatriculation ?', answerKind: 'text', weight: 4, isRequired: false },
  { id: 'spec-chassis', categoryId: 'special', promptFr: 'Quel est le numéro de châssis ou de série ?', answerKind: 'text', weight: 4, isRequired: false },
  { id: 'spec-lot-contents', categoryId: 'special', promptFr: 'Décrivez précisément le contenu du lot.', answerKind: 'text', weight: 3, isRequired: true },
  { id: 'spec-lot-count', categoryId: 'special', promptFr: 'Combien de pièces ou de colis composent le lot ?', answerKind: 'number', weight: 2, isRequired: true },

  /* ---------- Divers ---------- */
  { id: 'other-description', categoryId: 'other', promptFr: 'Décrivez précisément l’objet et sa matière.', answerKind: 'text', weight: 4, isRequired: true },
  { id: 'other-mark', categoryId: 'other', promptFr: 'Porte-t-il une inscription, un nom ou une marque ?', answerKind: 'text', weight: 3, isRequired: false },
  { id: 'other-color', categoryId: 'other', promptFr: 'Quelle est sa couleur ?', answerKind: 'text', weight: 2, isRequired: true },
  { id: 'other-container', categoryId: 'other', promptFr: 'Dans quoi ou avec quoi était-il rangé ?', answerKind: 'text', weight: 2, isRequired: false },
] as const;

export function questionsForCategory(categoryId: string): readonly VerificationQuestion[] {
  return VERIFICATION_QUESTIONS.filter((question) => question.categoryId === categoryId);
}

/**
 * Résout la catégorie racine d'une sous-catégorie, afin de retrouver ses questions.
 * Retourne l'identifiant tel quel s'il désigne déjà une catégorie racine.
 */
export function questionsFor(categoryId: string, parentId: string | null): readonly VerificationQuestion[] {
  const direct = questionsForCategory(categoryId);
  if (direct.length > 0) return direct;
  return parentId ? questionsForCategory(parentId) : [];
}

/** Une réponse apportée par l'utilisateur. */
export interface VerificationAnswer {
  readonly questionId: string;
  readonly value: string;
}

export interface VerificationOutcome {
  /** Score obtenu, entre 0 et 1. */
  readonly score: number;
  /** Vrai si le seuil de restitution automatique est atteint. */
  readonly isSufficient: boolean;
  readonly matchedQuestionIds: readonly string[];
  readonly missingRequiredIds: readonly string[];
}

/** Seuil au-delà duquel la propriété est considérée comme établie. */
export const VERIFICATION_THRESHOLD = 0.7;

/**
 * Note une série de réponses.
 *
 * ⚠️ La comparaison est volontairement **normalisée** (casse et accents ignorés) : refuser
 * une bonne réponse parce que l'utilisateur a écrit « Mahamat » au lieu de « MAHAMAT »
 * serait une source de blocage absurde. En revanche, aucune tolérance sur les fautes de
 * frappe : une réponse fausse ne doit pas passer par approximation, sinon la vérification
 * ne protège plus rien. Le rapprochement flou est réservé à un examen manuel par un
 * modérateur.
 */
export function scoreVerification(
  questions: readonly VerificationQuestion[],
  answers: readonly VerificationAnswer[],
  expected: Readonly<Record<string, string>>,
): VerificationOutcome {
  const normalizeValue = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

  const byId = new Map(answers.map((answer) => [answer.questionId, answer.value]));
  const matchedQuestionIds: string[] = [];
  const missingRequiredIds: string[] = [];

  let earned = 0;
  let total = 0;

  for (const question of questions) {
    total += question.weight;

    const given = byId.get(question.id);
    const reference = expected[question.id];

    if (!given || !reference) {
      if (question.isRequired) missingRequiredIds.push(question.id);
      continue;
    }

    if (normalizeValue(given) === normalizeValue(reference)) {
      earned += question.weight;
      matchedQuestionIds.push(question.id);
    } else if (question.isRequired) {
      missingRequiredIds.push(question.id);
    }
  }

  const score = total === 0 ? 0 : earned / total;

  return {
    score,
    isSufficient: score >= VERIFICATION_THRESHOLD && missingRequiredIds.length === 0,
    matchedQuestionIds,
    missingRequiredIds,
  };
}
