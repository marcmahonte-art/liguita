'use server';

import { revalidatePath } from 'next/cache';

import {
  VERIFICATION_MAX_ATTEMPTS,
  findCategory,
  questionsFor,
  scoreVerification,
  type VerificationAnswer,
  type VerificationQuestion,
} from '@liguita/config';

import { createClient } from '../../lib/supabase/server';
import { tryCreateServiceClient } from '../../lib/supabase/service';

/** Réponse soumise par le client — identifiant **config** (`doc-name`), pas UUID. */
export interface SubmittedAnswer {
  readonly questionId: string;
  readonly value: string;
}

const EVIDENCE_MAX_BYTES = 5 * 1024 * 1024;
const EVIDENCE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const EVIDENCE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface VerificationQuestionView {
  readonly id: string;
  readonly promptFr: string;
  readonly answerKind: VerificationQuestion['answerKind'];
  readonly choices?: readonly string[];
  readonly isRequired: boolean;
  readonly weight: number;
}

export interface VerificationState {
  readonly matchId: string;
  readonly status: string;
  readonly score: number | null;
  readonly attemptCount: number;
  readonly attemptsRemaining: number;
  readonly locked: boolean;
  readonly questions: VerificationQuestionView[];
  readonly categoryLabel: string;
  readonly objectTitle: string;
  /** Vrai si l'utilisateur est le trouveur (peut renseigner les secrets). */
  readonly isFinder: boolean;
  /** Vrai si le trouveur a déjà déposé des réponses attendues. */
  readonly hasSecrets: boolean;
  readonly canSubmit: boolean;
  readonly outcome: 'APPROVED' | 'UNDER_REVIEW' | 'REJECTED' | null;
}

interface MatchRow {
  id: string;
  lost_item_id: string;
  found_item_id: string;
  status: string;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, appRole: 'USER' as const };

  const { data: profile } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .maybeSingle();

  return {
    supabase,
    user,
    appRole: (profile?.app_role as string | undefined) ?? 'USER',
  };
}

async function loadMatch(supabase: Awaited<ReturnType<typeof createClient>>, matchId: string) {
  const { data, error } = await supabase
    .from('matches')
    .select('id, lost_item_id, found_item_id, status')
    .eq('id', matchId)
    .maybeSingle();
  if (error) return { match: null, error: error.message };
  return { match: data as MatchRow | null, error: null };
}

async function loadCategoryCode(
  reader: NonNullable<ReturnType<typeof tryCreateServiceClient>>,
  match: MatchRow,
): Promise<{ categoryCode: string; side: 'lost' | 'found' } | null> {
  const [lost, found] = await Promise.all([
    reader
      .from('lost_items')
      .select('id, user_id, title, category_code')
      .eq('id', match.lost_item_id)
      .maybeSingle(),
    reader
      .from('found_items')
      .select('id, finder_id, title, category_code')
      .eq('id', match.found_item_id)
      .maybeSingle(),
  ]);
  if (lost.data) {
    return { categoryCode: lost.data.category_code, side: 'lost' };
  }
  if (found.data) {
    return { categoryCode: found.data.category_code, side: 'found' };
  }
  return null;
}

function questionsForCode(categoryCode: string): readonly VerificationQuestion[] {
  const category = findCategory(categoryCode);
  if (!category) return [];
  return questionsFor(category.id, category.parentId);
}

function toView(questions: readonly VerificationQuestion[]): VerificationQuestionView[] {
  return questions.map((q) => ({
    id: q.id,
    promptFr: q.promptFr,
    answerKind: q.answerKind,
    choices: q.choices,
    isRequired: q.isRequired,
    weight: q.weight,
  }));
}

/**
 * État de la vérification pour une correspondance.
 * Ne retourne jamais les réponses déjà soumises ni les secrets attendus.
 */
export async function getVerificationState(matchId: string): Promise<{
  state: VerificationState | null;
  error?: string;
}> {
  const { supabase, user, appRole } = await requireUser();
  if (!user) return { state: null, error: 'Non connecté' };

  const { match, error: matchError } = await loadMatch(supabase, matchId);
  if (matchError) return { state: null, error: matchError };
  if (!match) return { state: null, error: 'Correspondance introuvable' };

  const reader = tryCreateServiceClient() ?? supabase;
  const categoryMeta = await loadCategoryCode(reader, match);
  if (!categoryMeta) return { state: null, error: 'Objet introuvable' };

  const questions = questionsForCode(categoryMeta.categoryCode);
  const category = findCategory(categoryMeta.categoryCode);
  const rootLabel =
    (category?.parentId ? findCategory(category.parentId)?.labelFr : category?.labelFr) ?? 'Objet';

  const { data: lost } = await reader
    .from('lost_items')
    .select('user_id, title')
    .eq('id', match.lost_item_id)
    .maybeSingle();
  const { data: found } = await reader
    .from('found_items')
    .select('finder_id, title')
    .eq('id', match.found_item_id)
    .maybeSingle();

  const isOwner = lost?.user_id === user.id;
  const isFinder = found?.finder_id === user.id;
  if (!isOwner && !isFinder && appRole !== 'MODERATOR' && appRole !== 'ADMIN') {
    return { state: null, error: 'Accès refusé' };
  }

  const { data: claim } = await supabase
    .from('claims')
    .select('id, status, score, attempt_count')
    .eq('match_id', matchId)
    .eq('claimant_id', user.id)
    .maybeSingle();

  const { data: secrets } = await reader
    .from('found_item_secrets')
    .select('answers')
    .eq('found_item_id', match.found_item_id)
    .maybeSingle();

  const attemptCount = claim?.attempt_count ?? 0;
  const locked = attemptCount >= VERIFICATION_MAX_ATTEMPTS;
  const status = claim?.status ?? 'NONE';

  return {
    state: {
      matchId,
      status,
      score: claim?.score ?? null,
      attemptCount,
      attemptsRemaining: Math.max(0, VERIFICATION_MAX_ATTEMPTS - attemptCount),
      locked,
      questions: toView(questions),
      categoryLabel: rootLabel,
      objectTitle: lost?.title ?? found?.title ?? 'Objet',
      isFinder,
      hasSecrets: Boolean(secrets?.answers && Object.keys(secrets.answers).length > 0),
      canSubmit: Boolean(isOwner) && !locked && status !== 'APPROVED',
      outcome:
        status === 'APPROVED' || status === 'UNDER_REVIEW' || status === 'REJECTED' ? status : null,
    },
  };
}

export interface SubmitResult {
  ok: boolean;
  outcome?: 'APPROVED' | 'UNDER_REVIEW' | 'REJECTED';
  score?: number;
  attemptCount?: number;
  attemptsRemaining?: number;
  locked?: boolean;
  error?: string;
}

/**
 * Soumet les réponses de vérification.
 *
 * Critères §7.5 :
 *  · barème serveur uniquement (jamais côté client) ;
 *  · 3 tentatives max, comptées côté serveur ;
 *  · un refus ne révèle jamais la bonne réponse ;
 *  · 3 refus → correspondance verrouillée + `fraud_cases`.
 */
export async function submitVerificationAnswers(
  matchId: string,
  submitted: readonly SubmittedAnswer[],
): Promise<SubmitResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: 'Non connecté' };

  const { match, error: matchError } = await loadMatch(supabase, matchId);
  if (matchError) return { ok: false, error: matchError };
  if (!match) return { ok: false, error: 'Correspondance introuvable' };

  const service = tryCreateServiceClient();
  if (!service) return { ok: false, error: 'Service indisponible' };

  const { data: lost } = await service
    .from('lost_items')
    .select('user_id, category_code')
    .eq('id', match.lost_item_id)
    .maybeSingle();
  if (!lost || lost.user_id !== user.id) {
    return { ok: false, error: 'Seul le propriétaire de la perte peut répondre.' };
  }

  const { data: existingClaim } = await service
    .from('claims')
    .select('id, status, attempt_count')
    .eq('match_id', matchId)
    .eq('claimant_id', user.id)
    .maybeSingle();

  const attemptCount = existingClaim?.attempt_count ?? 0;
  if (existingClaim?.status === 'APPROVED') {
    return { ok: false, error: 'Cette vérification est déjà approuvée.' };
  }
  if (attemptCount >= VERIFICATION_MAX_ATTEMPTS) {
    return {
      ok: false,
      locked: true,
      attemptCount,
      attemptsRemaining: 0,
      error: 'Correspondance verrouillée après 3 tentatives.',
    };
  }

  const questions = questionsForCode(lost.category_code);
  if (questions.length === 0) {
    return { ok: false, error: 'Aucune question de vérification pour cette catégorie.' };
  }

  const byId = new Map(submitted.map((a) => [a.questionId, a.value.trim()]));
  const missingRequired = questions.filter((q) => q.isRequired && !byId.get(q.id));
  if (missingRequired.length > 0) {
    return { ok: false, error: 'Toutes les questions obligatoires doivent être renseignées.' };
  }

  const answers: VerificationAnswer[] = questions
    .filter((q) => byId.get(q.id))
    .map((q) => ({ questionId: q.id, value: byId.get(q.id)! }));

  // Secrets du trouveur : strictement serveur, jamais renvoyés au client.
  const { data: secretsRow } = await service
    .from('found_item_secrets')
    .select('answers')
    .eq('found_item_id', match.found_item_id)
    .maybeSingle();
  const expected = (secretsRow?.answers ?? {}) as Record<string, string>;

  let scorePercent = 0;
  let decision: 'APPROVED' | 'UNDER_REVIEW' | 'REJECTED';
  const hasSecrets = Object.keys(expected).length > 0;

  if (!hasSecrets) {
    decision = 'UNDER_REVIEW';
    scorePercent = 0;
  } else {
    const outcome = scoreVerification(questions, answers, expected);
    scorePercent = Math.round(outcome.score * 100);
    decision = outcome.isSufficient
      ? 'APPROVED'
      : outcome.score >= 0.5
        ? 'UNDER_REVIEW'
        : 'REJECTED';
  }

  const claimStatus =
    decision === 'APPROVED'
      ? 'APPROVED'
      : decision === 'UNDER_REVIEW'
        ? 'UNDER_REVIEW'
        : 'REJECTED';
  const { data: decisionRow, error: decisionError } = await service.rpc(
    'apply_verification_decision',
    {
      p_match_id: matchId,
      p_claimant_id: user.id,
      p_status: claimStatus,
      p_score: scorePercent,
      p_increment_attempt: decision === 'REJECTED',
    },
  );
  if (decisionError || !decisionRow?.[0]) {
    return { ok: false, error: decisionError?.message ?? 'Enregistrement impossible.' };
  }

  const applied = decisionRow[0] as {
    claim_id: string;
    attempt_count: number;
    locked: boolean;
    attempt_incremented: boolean;
  };
  const claimId = applied.claim_id;
  const attemptsUsed = applied.attempt_count;
  if (applied.locked && !applied.attempt_incremented) {
    return {
      ok: false,
      locked: true,
      attemptCount: attemptsUsed,
      attemptsRemaining: 0,
      error: 'Correspondance verrouillée après 3 tentatives.',
    };
  }

  await service.from('verification_answers').delete().eq('claim_id', claimId);

  const { data: dbQuestions } = await service
    .from('verification_questions')
    .select('id, code, weight')
    .in(
      'code',
      questions.map((q) => q.id),
    );

  const idByCode = new Map((dbQuestions ?? []).map((row) => [row.code, row.id as string]));
  const answerRows = answers
    .map((a) => {
      const questionId = idByCode.get(a.questionId);
      if (!questionId) return null;
      const question = questions.find((q) => q.id === a.questionId);
      const reference = expected[a.questionId];
      const isCorrect =
        hasSecrets && reference !== undefined ? normalize(reference) === normalize(a.value) : null;
      return {
        claim_id: claimId!,
        question_id: questionId,
        answer: a.value,
        is_correct: isCorrect,
        points_awarded: isCorrect && question ? question.weight : 0,
      };
    })
    .filter(Boolean) as Array<{
    claim_id: string;
    question_id: string;
    answer: string;
    is_correct: boolean | null;
    points_awarded: number;
  }>;

  if (answerRows.length > 0) {
    const { error: answersError } = await service.from('verification_answers').insert(answerRows);
    if (answersError) return { ok: false, error: answersError.message };
  }

  // Effets de bord métier
  if (decision === 'APPROVED') {
    await service.from('matches').update({ status: 'CLAIMED' }).eq('id', matchId);
    await service
      .from('lost_items')
      .update({ status: 'VERIFYING' })
      .eq('id', match.lost_item_id)
      .in('status', ['MATCH_FOUND', 'DECLARED', 'SEARCHING']);
    await notify(
      service,
      lost.user_id,
      'VERIFICATION_APPROVED',
      'Vérification approuvée',
      'Vos réponses confirment la propriété. Vous pouvez passer au devis.',
    );
  } else if (decision === 'REJECTED') {
    const lockedNow = attemptsUsed >= VERIFICATION_MAX_ATTEMPTS;
    if (lockedNow) {
      await service.from('matches').update({ status: 'REJECTED' }).eq('id', matchId);
      await service.from('fraud_cases').insert({
        subject_user_id: user.id,
        kind: 'FAKE_OWNER',
        signals: {
          match_id: matchId,
          claim_id: claimId,
          attempt_count: attemptsUsed,
          score: scorePercent,
        },
        risk_score: 100,
        status: 'OPEN',
      });
      await notify(
        service,
        user.id,
        'VERIFICATION_LOCKED',
        'Correspondance verrouillée',
        '3 tentatives de vérification ont échoué. Une enquête anti-fraude a été ouverte.',
      );
    } else {
      await notify(
        service,
        user.id,
        'VERIFICATION_REJECTED',
        'Réponses non validées',
        `Tentative ${attemptsUsed} sur ${VERIFICATION_MAX_ATTEMPTS}. La bonne réponse n'est jamais révélée.`,
      );
    }
  } else {
    await notify(
      service,
      user.id,
      'VERIFICATION_REVIEW',
      'Vérification en cours',
      'Le trouveur ou un modérateur va examiner vos réponses.',
    );
  }

  revalidatePath(`/app/correspondances/${matchId}`);
  revalidatePath(`/app/correspondances/${matchId}/verification`);

  const attemptsRemaining = Math.max(0, VERIFICATION_MAX_ATTEMPTS - attemptsUsed);
  return {
    ok: true,
    outcome: decision,
    score: scorePercent,
    attemptCount: attemptsUsed,
    attemptsRemaining,
    locked: attemptsUsed >= VERIFICATION_MAX_ATTEMPTS,
  };
}

export interface EvidenceUploadResult {
  ok: boolean;
  signedUrl?: string;
  error?: string;
}

export async function uploadVerificationEvidence(
  formData: FormData,
): Promise<EvidenceUploadResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: 'Non connecté' };

  const matchId = String(formData.get('matchId') ?? '').trim();
  const questionCode = String(formData.get('questionCode') ?? '').trim();
  const fileValue = formData.get('evidence');
  const file = fileValue instanceof File ? fileValue : null;
  if (!UUID_PATTERN.test(matchId) || !questionCode || !file) {
    return { ok: false, error: 'Preuve invalide.' };
  }
  if (!EVIDENCE_TYPES.has(file.type) || file.size <= 0 || file.size > EVIDENCE_MAX_BYTES) {
    return { ok: false, error: 'Photo invalide ou supérieure à 5 Mo.' };
  }

  const service = tryCreateServiceClient();
  if (!service) return { ok: false, error: 'Service indisponible.' };

  const { data: match } = await service
    .from('matches')
    .select('lost_item_id')
    .eq('id', matchId)
    .maybeSingle();
  if (!match) return { ok: false, error: 'Correspondance introuvable.' };

  const { data: lost } = await service
    .from('lost_items')
    .select('user_id')
    .eq('id', match.lost_item_id)
    .maybeSingle();
  if (!lost || lost.user_id !== user.id) {
    return { ok: false, error: 'Seul le propriétaire peut ajouter une preuve.' };
  }

  const { data: claim } = await service
    .from('claims')
    .select('id, status')
    .eq('match_id', matchId)
    .eq('claimant_id', user.id)
    .maybeSingle();
  if (!claim || claim.status !== 'UNDER_REVIEW') {
    return { ok: false, error: 'La preuve peut être ajoutée uniquement après une revue.' };
  }

  const { data: question } = await service
    .from('verification_questions')
    .select('id')
    .eq('code', questionCode)
    .maybeSingle();
  if (!question) return { ok: false, error: 'Question invalide.' };

  const { data: answer } = await service
    .from('verification_answers')
    .select('id, answer_photo')
    .eq('claim_id', claim.id)
    .eq('question_id', question.id)
    .maybeSingle();
  if (!answer) return { ok: false, error: 'Réponse introuvable.' };

  const path = `VERIFICATION/${answer.id}/${crypto.randomUUID()}.${EVIDENCE_EXTENSIONS[file.type]}`;
  const { error: uploadError } = await supabase.storage
    .from('verification-evidence')
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { error: updateError } = await service
    .from('verification_answers')
    .update({ answer_photo: path })
    .eq('id', answer.id);
  if (updateError) {
    await service.storage.from('verification-evidence').remove([path]);
    return { ok: false, error: updateError.message };
  }

  if (answer.answer_photo) {
    await service.storage.from('verification-evidence').remove([answer.answer_photo]);
  }

  const { data: signed } = await service.storage
    .from('verification-evidence')
    .createSignedUrl(path, 60);
  return { ok: true, signedUrl: signed?.signedUrl };
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

async function notify(
  service: NonNullable<ReturnType<typeof tryCreateServiceClient>>,
  userId: string,
  kind: string,
  title: string,
  body: string,
) {
  await service.from('notifications').insert({
    user_id: userId,
    kind,
    channel: 'WEB',
    title,
    body,
    sent_at: null,
  });
}

/** Le trouveur dépose les réponses attendues (barème automatique). */
export async function saveFoundSecrets(
  matchId: string,
  secrets: Record<string, string>,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: 'Non connecté' };

  const { match } = await loadMatch(supabase, matchId);
  if (!match) return { ok: false, error: 'Correspondance introuvable' };

  const service = tryCreateServiceClient();
  if (!service) return { ok: false, error: 'Service indisponible' };

  const { data: found } = await service
    .from('found_items')
    .select('finder_id')
    .eq('id', match.found_item_id)
    .maybeSingle();
  if (!found || found.finder_id !== user.id) {
    return { ok: false, error: 'Seul le trouveur peut renseigner ces réponses.' };
  }

  const cleaned: Record<string, string> = {};
  for (const [key, value] of Object.entries(secrets)) {
    const trimmed = value.trim();
    if (trimmed) cleaned[key] = trimmed;
  }

  const { error } = await service
    .from('found_item_secrets')
    .upsert(
      { found_item_id: match.found_item_id, answers: cleaned },
      { onConflict: 'found_item_id' },
    );
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/app/correspondances/${matchId}`);
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Revue manuelle (Sprint 5.6)                                                 */
/* -------------------------------------------------------------------------- */

export interface ClaimReviewItem {
  id: string;
  matchId: string;
  claimantId: string;
  status: string;
  score: number;
  attemptCount: number;
  createdAt: string;
  lostTitle: string | null;
  foundTitle: string | null;
  answers: Array<{
    questionCode: string;
    prompt: string;
    answer: string;
    isCorrect: boolean | null;
  }>;
}

export async function listClaimsForReview(): Promise<{
  items: ClaimReviewItem[];
  error?: string;
}> {
  const { user, appRole } = await requireUser();
  if (!user) return { items: [], error: 'Non connecté' };
  if (appRole !== 'MODERATOR' && appRole !== 'ADMIN') {
    return { items: [], error: 'Accès réservé aux modérateurs' };
  }

  const service = tryCreateServiceClient();
  if (!service) return { items: [], error: 'Service indisponible' };

  const { data: claims, error } = await service
    .from('claims')
    .select('id, match_id, claimant_id, status, score, attempt_count, created_at')
    .in('status', ['UNDER_REVIEW', 'REJECTED', 'APPROVED'])
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return { items: [], error: error.message };

  const items: ClaimReviewItem[] = [];
  for (const claim of claims ?? []) {
    const { data: match } = await service
      .from('matches')
      .select('id, lost_item_id, found_item_id')
      .eq('id', claim.match_id)
      .maybeSingle();
    if (!match) continue;

    const [{ data: lost }, { data: found }, { data: answers }] = await Promise.all([
      service.from('lost_items').select('title').eq('id', match.lost_item_id).maybeSingle(),
      service.from('found_items').select('title').eq('id', match.found_item_id).maybeSingle(),
      service
        .from('verification_answers')
        .select('answer, is_correct, question_id')
        .eq('claim_id', claim.id),
    ]);

    const questionIds = (answers ?? []).map((a) => a.question_id);
    const { data: questions } = questionIds.length
      ? await service
          .from('verification_questions')
          .select('id, code, prompt_fr')
          .in('id', questionIds)
      : { data: [] as Array<{ id: string; code: string; prompt_fr: string }> };
    const qById = new Map((questions ?? []).map((q) => [q.id, q]));

    items.push({
      id: claim.id,
      matchId: claim.match_id,
      claimantId: claim.claimant_id,
      status: claim.status,
      score: claim.score,
      attemptCount: claim.attempt_count,
      createdAt: claim.created_at,
      lostTitle: lost?.title ?? null,
      foundTitle: found?.title ?? null,
      answers: (answers ?? []).map((a) => {
        const q = qById.get(a.question_id);
        return {
          questionCode: q?.code ?? '',
          prompt: q?.prompt_fr ?? 'Question',
          answer: a.answer ?? '',
          isCorrect: a.is_correct,
        };
      }),
    });
  }

  return { items };
}

/** Décision d'un modérateur sur une demande en revue. */
export async function reviewClaim(
  claimId: string,
  decision: 'APPROVED' | 'REJECTED',
  reason?: string,
): Promise<{ ok: boolean; error?: string }> {
  const { user, appRole } = await requireUser();
  if (!user) return { ok: false, error: 'Non connecté' };
  if (appRole !== 'MODERATOR' && appRole !== 'ADMIN') {
    return { ok: false, error: 'Accès réservé aux modérateurs' };
  }

  const service = tryCreateServiceClient();
  if (!service) return { ok: false, error: 'Service indisponible' };

  const { data: claim } = await service
    .from('claims')
    .select('id, match_id, claimant_id, status, attempt_count, score')
    .eq('id', claimId)
    .maybeSingle();
  if (!claim) return { ok: false, error: 'Demande introuvable' };
  if (claim.status !== 'UNDER_REVIEW' && claim.status !== 'REJECTED') {
    return { ok: false, error: "Cette demande n'est pas en revue." };
  }

  if (decision === 'APPROVED') {
    const { error } = await service
      .from('claims')
      .update({
        status: 'APPROVED',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: null,
      })
      .eq('id', claimId);
    if (error) return { ok: false, error: error.message };

    const { data: match } = await service
      .from('matches')
      .select('lost_item_id')
      .eq('id', claim.match_id)
      .maybeSingle();
    if (match) {
      await service.from('matches').update({ status: 'CLAIMED' }).eq('id', claim.match_id);
      await service
        .from('lost_items')
        .update({ status: 'VERIFYING' })
        .eq('id', match.lost_item_id)
        .in('status', ['MATCH_FOUND', 'DECLARED', 'SEARCHING']);
    }
    await notify(
      service,
      claim.claimant_id,
      'VERIFICATION_APPROVED',
      'Vérification approuvée',
      'Un modérateur a confirmé votre propriété.',
    );
  } else {
    const attempts = claim.attempt_count + 1;
    const locked = attempts >= VERIFICATION_MAX_ATTEMPTS;
    const { error } = await service
      .from('claims')
      .update({
        status: 'REJECTED',
        attempt_count: attempts,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason?.slice(0, 500) ?? null,
      })
      .eq('id', claimId);
    if (error) return { ok: false, error: error.message };

    if (locked) {
      await service.from('matches').update({ status: 'REJECTED' }).eq('id', claim.match_id);
      await service.from('fraud_cases').insert({
        subject_user_id: claim.claimant_id,
        kind: 'FAKE_OWNER',
        signals: { claim_id: claimId, match_id: claim.match_id, attempt_count: attempts },
        risk_score: 100,
        status: 'OPEN',
      });
      await notify(
        service,
        claim.claimant_id,
        'VERIFICATION_LOCKED',
        'Correspondance verrouillée',
        '3 tentatives ont échoué. Un dossier anti-fraude a été ouvert.',
      );
    } else {
      await notify(
        service,
        claim.claimant_id,
        'VERIFICATION_REJECTED',
        'Réponses non validées',
        `Tentative ${attempts} sur ${VERIFICATION_MAX_ATTEMPTS}.`,
      );
    }
  }

  revalidatePath('/app/moderation');
  revalidatePath(`/app/correspondances/${claim.match_id}`);
  return { ok: true };
}
