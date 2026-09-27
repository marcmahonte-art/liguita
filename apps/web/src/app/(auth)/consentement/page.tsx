'use client';

import { CheckCircle2, Loader2, PhoneCall, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { buttonClasses } from '@liguita/ui';

import { recordRegistrationConsents } from '../../actions/consents';
import { useAuth } from '../../../lib/auth/auth-context';

/**
 * Fiche de consentement — étape obligatoire juste après l'inscription.
 *
 * ⚠️ Pourquoi cette page est bloquante
 *
 * Le modèle de Liguita repose sur un paiement fait à Liguita, suivi de la
 * transmission du numéro du trouveur au chercheur. Sans le consentement du
 * trouveur, cette transmission serait illégale et le chercheur paierait sans
 * jamais pouvoir joindre la personne qui détient son objet. Le consentement
 * est donc recueilli avant toute utilisation, et non au moment du paiement —
 * parce qu'à ce moment-là le trouveur n'est plus devant l'écran.
 */
const CONSENT_POINTS = [
  {
    icon: ShieldCheck,
    title: 'Votre numéro reste caché jusqu’au paiement',
    body: 'Tant que le chercheur n’a pas réglé les frais de mise en relation, personne ne voit votre numéro. Il reste invisible sur la fiche de l’objet et dans les recherches.',
  },
  {
    icon: PhoneCall,
    title: 'Après paiement, il peut vous appeler',
    body: 'Une fois le paiement confirmé, Liguita transmet votre numéro au chercheur dont la propriété a été vérifiée, pour organiser la restitution. Vous êtes prévenu par notification au même instant.',
  },
] as const;

function ConsentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();

  const redirect = searchParams.get('redirect') ?? '/app';
  const target = redirect.startsWith('/') ? redirect : '/app';

  const [contactDisclosure, setContactDisclosure] = useState(false);
  const [terms, setTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/connexion?redirect=${encodeURIComponent(target)}`);
    }
  }, [authLoading, user, router, target]);

  const canSubmit = contactDisclosure && terms && !isSubmitting;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    const result = await recordRegistrationConsents({ contactDisclosure, terms });

    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error ?? 'Enregistrement impossible. Réessayez.');
      return;
    }

    router.push(target);
  }

  if (authLoading || !user) {
    return (
      <div className="rounded-3xl border border-ink-200 bg-white p-8 text-center shadow-card">
        <Loader2 size={24} className="mx-auto animate-spin text-ink-400" />
        <p className="mt-3 text-caption text-ink-600">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-ink-200 bg-white p-6 shadow-card sm:p-8">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 font-display text-caption font-bold text-brand-600">
        <ShieldCheck size={14} />
        Dernière étape
      </span>

      <h1 className="mt-3 font-display text-2xl font-extrabold text-ink-950">
        Votre accord pour la mise en relation
      </h1>
      <p className="mt-2 text-body text-ink-600">
        Bonjour {user.full_name || user.display_name || `+235 ${user.phone}`}, encore un instant.
        Ce que vous acceptez ici conditionne la façon dont Liguita protège vos coordonnées.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {CONSENT_POINTS.map((point) => (
          <div
            key={point.title}
            className="flex items-start gap-3 rounded-2xl border border-ink-200 bg-ink-50/60 p-4"
          >
            <point.icon size={22} className="mt-0.5 shrink-0 text-brand-600" />
            <div className="space-y-1">
              <p className="font-display text-body-sm font-bold text-ink-900">{point.title}</p>
              <p className="text-caption leading-relaxed text-ink-600">{point.body}</p>
            </div>
          </div>
        ))}

        <div className="space-y-3 border-t border-ink-100 pt-5">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={contactDisclosure}
              onChange={(event) => setContactDisclosure(event.target.checked)}
              className="mt-0.5 size-5 shrink-0 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
              required
            />
            <span className="text-caption leading-relaxed text-ink-800">
              <strong className="font-bold">
                J’accepte que mon numéro de téléphone soit transmis au chercheur
              </strong>{' '}
              dont la propriété de l’objet a été vérifiée, et seulement après confirmation de son
              paiement.{' '}
              <span className="text-ink-600">
                Je peux retirer cet accord à tout moment depuis mes paramètres ; les
                divulgations déjà effectuées ne sont pas rétroactives.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={terms}
              onChange={(event) => setTerms(event.target.checked)}
              className="mt-0.5 size-5 shrink-0 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
              required
            />
            <span className="text-caption leading-relaxed text-ink-800">
              <strong className="font-bold">
                J’accepte les conditions générales et la politique de confidentialité
              </strong>{' '}
              de Liguita, et je certifie l’exactitude des informations que je déclarerai.
            </span>
          </label>
        </div>

        {error && (
          <p role="alert" className="text-caption font-bold text-danger-500">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className={buttonClasses({
            variant: 'primary',
            block: true,
            size: 'lg',
            className: !canSubmit ? 'cursor-not-allowed opacity-50' : '',
          })}
        >
          {isSubmitting ? (
            <>
              <span>Enregistrement…</span>
              <Loader2 size={18} className="animate-spin" />
            </>
          ) : (
            <>
              <span>J’accepte et je continue</span>
              <CheckCircle2 size={18} />
            </>
          )}
        </button>

        <p className="text-center text-2xs leading-relaxed text-ink-500">
          Ces deux consentements sont nécessaires pour utiliser Liguita. Votre acceptation est
          horodatée et conservée comme preuve. Vous pouvez supprimer votre compte à tout moment
          depuis vos paramètres.
        </p>

        <p className="text-center text-2xs text-ink-400">
          <Link href="/confidentialite" className="underline hover:text-ink-700">
            Politique de confidentialité
          </Link>{' '}
          ·{' '}
          <Link href="/cgu" className="underline hover:text-ink-700">
            Conditions générales
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function ConsentPage() {
  return (
    <Suspense>
      <ConsentForm />
    </Suspense>
  );
}
