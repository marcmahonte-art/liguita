'use client';

import { ArrowLeft, Camera, CreditCard, FileCheck2, Info, LoaderCircle, Lock, Send } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { VerificationEvidenceUploader } from '../../../../../components/app/VerificationEvidenceUploader';
import { Alert, buttonClasses, cn, Input, Select, Skeleton } from '@liguita/ui';

import {
  getVerificationState,
  saveFoundSecrets,
  submitVerificationAnswers,
  uploadClaimantIdCard,
  type VerificationQuestionView,
  type VerificationState,
} from '../../../../actions/verification';
import { useAuth } from '../../../../../lib/auth/auth-context';

const INPUT_TYPE: Record<string, 'text' | 'date' | 'number'> = {
  text: 'text',
  date: 'date',
  number: 'number',
};

function QuestionField({
  question,
  value,
  onChange,
  disabled,
}: {
  question: VerificationQuestionView;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const label = `${question.promptFr}${question.isRequired ? ' *' : ''}`;

  if (question.answerKind === 'choice' && question.choices) {
    return (
      <Select
        label={label}
        options={question.choices.map((c) => ({ value: c, label: c }))}
        placeholder="Choisir…"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        required={question.isRequired}
      />
    );
  }

  return (
    <Input
      label={label}
      type={INPUT_TYPE[question.answerKind] ?? 'text'}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      required={question.isRequired}
      autoComplete="off"
      inputMode={question.answerKind === 'number' ? 'numeric' : undefined}
    />
  );
}

export default function VerificationPage() {
  const params = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const matchId = params.id;

  const [state, setState] = useState<VerificationState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [idCardPath, setIdCardPath] = useState<string | null>(null);
  const [idCardPreview, setIdCardPreview] = useState<string | null>(null);
  const [isUploadingId, setIsUploadingId] = useState(false);
  const [idCardError, setIdCardError] = useState<string | null>(null);

  const [result, setResult] = useState<{
    outcome?: 'APPROVED' | 'UNDER_REVIEW' | 'REJECTED';
    message: string;
    tone: 'success' | 'warning' | 'danger' | 'info';
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (authLoading || !user || !matchId) return;
    let cancelled = false;

    getVerificationState(matchId).then((res) => {
      if (cancelled) return;
      if (res.error || !res.state) setError(res.error ?? 'Inaccessible');
      else setState(res.state);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, matchId]);

  async function handleIdCardFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setIdCardError(null);
    setIsUploadingId(true);
    const formData = new FormData();
    formData.set('matchId', matchId);
    formData.set('idCard', file);
    if (idCardPath) {
      formData.set('previousPath', idCardPath);
    }
    const res = await uploadClaimantIdCard(formData);
    setIsUploadingId(false);
    if (!res.ok) {
      setIdCardError(res.error ?? 'Échec du téléversement de la pièce d’identité.');
      return;
    }
    setIdCardPath(res.path ?? null);
    setIdCardPreview(res.signedUrl ?? URL.createObjectURL(file));
  }

  function handleSubmit() {
    if (!state) return;

    if (!idCardPath) {
      setError('Veuillez ajouter une photo lisible de votre pièce d’identité (CNI, Passeport ou Permis) pour sécuriser votre demande.');
      return;
    }

    const missing = state.questions.filter((q) => q.isRequired && !answers[q.id]?.trim());
    if (missing.length > 0) {
      setError('Veuillez répondre à toutes les questions obligatoires.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const payload = state.questions
        .filter((q) => answers[q.id]?.trim())
        .map((q) => ({ questionId: q.id, value: (answers[q.id] ?? '').trim() }));
      const res = await submitVerificationAnswers(matchId, payload, idCardPath);
      if (!res.ok) {
        setError(res.error ?? 'Échec de la soumission.');
        return;
      }
      if (res.outcome === 'APPROVED') {
        setResult({
          outcome: 'APPROVED',
          tone: 'success',
          message: 'Vérification et identité validées avec succès ! Vous pouvez maintenant passer au règlement sécurisé.',
        });
      } else if (res.outcome === 'UNDER_REVIEW') {
        setResult({
          outcome: 'UNDER_REVIEW',
          tone: 'info',
          message: 'Réponses enregistrées. Un modérateur va les examiner.',
        });
      } else {
        const remaining = res.attemptsRemaining ?? 0;
        setResult({
          outcome: 'REJECTED',
          tone: remaining > 0 ? 'warning' : 'danger',
          message:
            remaining > 0
              ? `Réponses non validées. Tentative ${res.attemptCount} sur 3 — il en reste ${remaining}. La bonne réponse n'est jamais révélée.`
              : '3 tentatives échouées. La correspondance est verrouillée et un dossier anti-fraude a été ouvert.',
        });
      }
      const refresh = await getVerificationState(matchId);
      if (refresh.state) setState(refresh.state);
    });
  }

  function handleSaveSecrets() {
    startTransition(async () => {
      const res = await saveFoundSecrets(matchId, secrets);
      if (!res.ok) setError(res.error ?? 'Enregistrement impossible.');
      else {
        setError(null);
        setResult({
          tone: 'success',
          message: 'Réponses attendues enregistrées. Elles serviront au barème automatique.',
        });
        const refresh = await getVerificationState(matchId);
        if (refresh.state) setState(refresh.state);
      }
    });
  }

  if (isLoading || authLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton variant="rect" className="h-8 w-48" />
        <Skeleton variant="rect" className="h-64 w-full" />
      </div>
    );
  }

  if (!state) {
    return (
      <div className="space-y-4">
        <Link
          href={`/app/correspondances/${matchId}`}
          className={buttonClasses({ variant: 'ghost', size: 'sm' })}
        >
          <ArrowLeft size={16} /> Retour
        </Link>
        <Alert tone="danger" title={error ?? 'Erreur'} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/app/correspondances/${matchId}`}
        className={buttonClasses({ variant: 'ghost', size: 'sm' })}
      >
        <ArrowLeft size={16} /> Correspondance
      </Link>

      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink-950 sm:text-3xl">
          Vérification de propriété
        </h1>
        <p className="mt-1 text-body text-ink-600">
          Pour vous mettre en relation avec la personne qui a trouvé cet objet ({state.objectTitle}
          ), répondez à quelques questions sur sa catégorie « {state.categoryLabel} ». Ces réponses
          ne sont pas publiques.
        </p>
      </div>

      {result ? (
        <Alert tone={result.tone} title={result.message}>
          {result.outcome === 'APPROVED' ? (
            <Link
              href={`/app/correspondances/${matchId}/paiement`}
              className={buttonClasses({ variant: 'primary', size: 'sm' })}
            >
              Continuer vers le paiement
            </Link>
          ) : null}
        </Alert>
      ) : null}

      {state.status === 'UNDER_REVIEW' && result?.outcome === 'UNDER_REVIEW' && !state.isFinder ? (
        <section className="space-y-3 rounded-2xl border border-info-500/30 bg-info-50/50 p-5">
          <h2 className="font-display text-body-lg font-bold text-ink-950">
            Preuves photo privées
          </h2>
          <p className="text-body-sm text-ink-600">
            facultatives, elles sont conservées dans un espace séparé et reserveées à la revue de
            votre correspondance.
          </p>
          {state.questions
            .filter((question) => answers[question.id]?.trim())
            .map((question) => (
              <VerificationEvidenceUploader
                key={question.id}
                matchId={matchId}
                questionId={question.id}
                questionLabel={question.promptFr}
              />
            ))}
        </section>
      ) : null}

      {error && !result ? <Alert tone="danger" title={error} /> : null}
      {state.questions.length === 0 && !state.isFinder ? (
        <Alert tone="warning" title="Questions indisponibles pour cette catégorie" />
      ) : null}

      {state.locked ? (
        <Alert tone="danger" title="Correspondance verrouillée">
          <p>
            3 tentatives ont échoué. Une enquête anti-fraude a été ouverte. Contactez le support si
            vous pensez qu'il s'agit d'une erreur.
          </p>
        </Alert>
      ) : null}

      {state.status === 'APPROVED' ? <Alert tone="success" title="Propriété approuvée" /> : null}

      {state.status === 'UNDER_REVIEW' && !state.isFinder ? (
        <Alert tone="info" title="Vérification en cours">
           Vos réponses sont en attente de revue par un modérateur.
        </Alert>
      ) : null}

      {/* Barème / tentatives */}
      {!state.locked && state.status !== 'APPROVED' && !state.isFinder ? (
        <div className="rounded-xl border border-ink-200 bg-white p-4 text-caption text-ink-600">
          <p className="font-bold text-ink-800">
            {state.attemptsRemaining} tentative{state.attemptsRemaining > 1 ? 's' : ''} restante
            {state.attemptsRemaining > 1 ? 's' : ''} sur 3
          </p>
          <p className="mt-1 flex gap-1.5">
            <Info size={14} className="mt-0.5 shrink-0 text-info-700" aria-hidden />
            <span>
              Score ≥ 80 : approbation · 50–79 : revue manuelle · &lt; 50 : refus. Toute tentative
              frauduleuse est signalée. 3 refus verrouillent la correspondance.
            </span>
          </p>
        </div>
      ) : null}

      {/* Côté trouveur : renseigner les réponses attendues */}
      {state.isFinder && !state.hasSecrets && state.questions.length > 0 ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
          <h2 className="font-display text-body-lg font-bold text-ink-950">
            Réponses attendues (trouveur)
          </h2>
          <p className="mt-1 text-body-sm text-ink-600">
            Vous avez l'objet en main : indiquez ce qu'un vrai propriétaire doit savoir. Ces valeurs
            servent au barème automatique et ne sont jamais affichées au demandeur.
          </p>
          <div className="mt-4 space-y-4">
            {state.questions.map((q) => (
              <QuestionField
                key={q.id}
                question={q}
                value={secrets[q.id] ?? ''}
                onChange={(v) => setSecrets((s) => ({ ...s, [q.id]: v }))}
              />
            ))}
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={handleSaveSecrets}
            className={`mt-4 ${buttonClasses({ variant: 'primary' })}`}
          >
            Enregistrer les réponses attendues
          </button>
        </section>
      ) : null}

      {state.isFinder && state.hasSecrets ? (
        <Alert tone="success" title="Réponses attendues déjà enregistrées" />
      ) : null}

      {/* Formulaire propriétaire */}
      {!state.isFinder &&
      !state.locked &&
      state.status !== 'APPROVED' &&
      state.status !== 'UNDER_REVIEW' &&
      state.questions.length > 0 ? (
        <section className="space-y-4 rounded-2xl border border-ink-200 bg-white p-5 sm:p-6">
          <div className="flex items-start gap-2 text-body-sm text-ink-600">
            <Lock size={16} className="mt-0.5 shrink-0" aria-hidden />
            <p>
              Vos réponses ne sont jamais renvoyées après soumission, ni au trouveur hors revue, ni
              dans les journaux.
            </p>
          </div>

          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            {/* Section pièce d'identité demandeur */}
            <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4">
              <div className="flex items-center gap-2">
                <CreditCard size={20} className="text-brand-700" />
                <h3 className="font-display text-body font-bold text-ink-950">
                  Votre pièce d’identité (CNI / Passeport / Permis) *
                </h3>
              </div>
              <p className="mt-1 text-caption text-ink-600">
                Pour prévenir toute usurpation et sécuriser la restitution, veuillez joindre une photo lisible de votre pièce d’identité. Ces informations permettent de vous identifier en cas de litige et restent strictement confidentielles.
              </p>

              {idCardPreview ? (
                <div className="mt-3 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-md border border-ink-200 bg-white">
                    <img src={idCardPreview} alt="Aperçu de la pièce d'identité" className="size-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-caption font-bold text-emerald-800 flex items-center gap-1">
                      <FileCheck2 size={15} /> Pièce d'identité jointe
                    </p>
                    <label className="mt-1 inline-block cursor-pointer text-2xs font-semibold text-brand-700 hover:underline">
                      Changer la photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleIdCardFile}
                        disabled={isUploadingId || isPending}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="mt-3">
                  <label
                    className={cn(
                      buttonClasses({ variant: 'outline', size: 'sm' }),
                      'cursor-pointer gap-2',
                      isUploadingId && 'opacity-60 pointer-events-none',
                    )}
                  >
                    {isUploadingId ? <LoaderCircle size={16} className="animate-spin" /> : <Camera size={16} />}
                    {isUploadingId ? 'Téléversement en cours…' : 'Prendre en photo ou choisir un fichier'}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleIdCardFile}
                      disabled={isUploadingId || isPending}
                      className="sr-only"
                    />
                  </label>
                </div>
              )}

              {idCardError ? (
                <p role="alert" className="mt-2 text-caption text-danger-700">
                  {idCardError}
                </p>
              ) : null}
            </div>

            {state.questions.map((q, index) => (
              <div key={q.id}>
                <p className="mb-2 text-caption font-bold text-ink-500">Question {index + 1}</p>
                <QuestionField
                  question={q}
                  value={answers[q.id] ?? ''}
                  onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
                  disabled={isPending}
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={isPending || isUploadingId}
              className={buttonClasses({ variant: 'primary', block: true })}
            >
              <Send size={16} /> Envoyer ma pièce d'identité et mes réponses
            </button>
          </form>
        </section>
      ) : null}

      {/* Lien paiement après approbation */}
      {state.status === 'APPROVED' ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 text-center">
          <p className="font-display text-h3 font-bold text-emerald-900">
            Vérification de propriété approuvée
          </p>
          <p className="mt-1 text-body-sm text-emerald-700">
            Votre identité et vos réponses ont été enregistrées avec succès. Vous pouvez maintenant procéder au règlement sécurisé (mise sous séquestre de la récompense).
          </p>
          <div className="mt-4">
            <Link
              href={`/app/correspondances/${matchId}/paiement`}
              className={buttonClasses({ variant: 'primary', size: 'lg' })}
            >
              Payer et mettre en relation →
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
