'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Alert, buttonClasses } from '@liguita/ui';

import { acceptBusinessInvitation } from '../../actions/business';

export default function InvitationPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [isPending, startTransition] = useTransition();

  function accept() {
    startTransition(async () => {
      const result = await acceptBusinessInvitation(params.token);
      if (result.error) setError(result.error);
      else setAccepted(true);
    });
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 py-12 text-center">
      {accepted ? (
        <>
          <CheckCircle2 className="mx-auto text-success-700" size={48} />
          <h1 className="font-display text-2xl font-extrabold text-ink-950">Invitation acceptée</h1>
          <p className="text-body text-ink-600">Votre espace Business est prêt.</p>
          <button
            type="button"
            onClick={() => router.push('/business')}
            className={buttonClasses({ variant: 'primary' })}
          >
            Ouvrir Business
          </button>
        </>
      ) : (
        <>
          <XCircle className="mx-auto text-warning-600" size={48} />
          <h1 className="font-display text-2xl font-extrabold text-ink-950">
            Invitation à une organisation
          </h1>
          <p className="text-body text-ink-600">
            Acceptez cette invitation pour rejoindre l’équipe.
          </p>
          {error ? <Alert tone="danger" title={error} /> : null}
          <button
            type="button"
            disabled={isPending}
            onClick={accept}
            className={buttonClasses({ variant: 'primary' })}
          >
            Accepter l’invitation
          </button>
        </>
      )}
    </div>
  );
}
