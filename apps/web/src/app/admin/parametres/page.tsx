'use client';

import { CheckCircle2, Copy, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Alert, Badge, Card, Skeleton } from '@liguita/ui';

import { getIntegrationState, type IntegrationState } from '../../actions/admin-integrations';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { useAuth } from '../../../lib/auth/auth-context';

/**
 * Paramètres — l'état réel des intégrations de paiement.
 *
 * ⚠️ **Cette page existe parce qu'une variable manquante ne se voit pas.**
 * Le versement automatique dépend de `AIRTEL_TD_MERCHANT_PIN` : sans elle,
 * l'administrateur clique « Valider et verser », la demande passe en
 * `MANUAL_REVIEW`, et rien n'indique pourquoi. Constater l'état ici évite de
 * chercher la cause dans les journaux serveur.
 *
 * ⚠️ Aucun secret n'est jamais renvoyé ni affiché : uniquement « configuré » ou
 * « absent », et le nom exact de la variable à renseigner.
 */
export default function AdminParametresPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<IntegrationState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    void getIntegrationState().then((result) => {
      setState(result.state ?? null);
      setError(result.error ?? null);
    });
  }, [authLoading, user]);

  if (authLoading || (!state && !error)) return <Skeleton variant="rect" className="h-96 w-full" />;
  if (error && !state) return <Alert tone="danger" title={error} />;

  const webhookBase =
    typeof window !== 'undefined' ? window.location.origin : 'https://liguita-beta.vercel.app';

  function copy(value: string) {
    void navigator.clipboard?.writeText(value).then(() => {
      setCopied(value);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        overline="Organisation"
        title="Paramètres"
        description="État des intégrations de paiement et adresses de notification."
      />

      {!state?.collectionReady ? (
        <Alert tone="warning" title="Encaissement indisponible">
          Un chercheur qui tente de payer sera refusé avec un message explicite. Renseignez les
          variables manquantes ci-dessous, puis redéployez.
        </Alert>
      ) : null}

      {state?.collectionReady && !state.payoutReady ? (
        <Alert tone="info" title="Versements manuels">
          Les encaissements fonctionnent, mais le versement automatique aux trouveurs est désarmé.
          Vous pouvez valider les retraits puis les marquer payés manuellement.
        </Alert>
      ) : null}

      <Card>
        <h2 className="font-display text-h3 text-ink-900">Airtel Money</h2>
        <p className="mt-1 text-body-sm text-ink-500">
          Environnement actif : <strong>{state?.airtelEnvironment}</strong>
        </p>
        <div className="mt-4 space-y-2">
          <IntegrationRow
            label="Identifiants d’API (client id et secret)"
            envName="AIRTEL_TD_UAT_CLIENT_ID / AIRTEL_TD_UAT_CLIENT_SECRET"
            ok={state?.airtelCredentials ?? false}
            requiredFor="Encaissement et versement"
          />
          <IntegrationRow
            label="Clé HMAC de signature des notifications"
            envName="AIRTEL_TD_HMAC_PRIVATE_KEY"
            ok={state?.airtelHmac ?? false}
            requiredFor="Encaissement et versement"
          />
          <IntegrationRow
            label="Numéro marchand Liguita"
            envName="AIRTEL_TD_MERCHANT_MSISDN"
            ok={state?.airtelMerchantMsisdn ?? false}
            requiredFor="Encaissement"
          />
          <IntegrationRow
            label="PIN marchand de versement"
            envName="AIRTEL_TD_MERCHANT_PIN"
            ok={state?.airtelMerchantPin ?? false}
            requiredFor="Versement automatique"
          />
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-h3 text-ink-900">Autres opérateurs</h2>
        <div className="mt-4 space-y-2">
          <IntegrationRow
            label="Moov Money"
            envName="MOOV_API_BASE_URL / MOOV_MERCHANT_ID / MOOV_API_KEY"
            ok={state?.moovConfigured ?? false}
            requiredFor="Encaissement alternatif"
            optional
          />
          <IntegrationRow
            label="Secret de notification générique"
            envName="PAYMENT_WEBHOOK_SECRET"
            ok={state?.webhookSecret ?? false}
            requiredFor="Paiements de test (CASH)"
            optional
          />
          <IntegrationRow
            label="Secret des tâches planifiées"
            envName="CRON_SECRET"
            ok={state?.cronSecret ?? false}
            requiredFor="Rapprochement automatique"
          />
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-h3 text-ink-900">Adresses de notification</h2>
        <p className="mt-1 text-body-sm text-ink-500">
          À déclarer dans le portail marchand Airtel. Les deux flux sont séparés — un encaissement
          et un versement ne se confondent jamais.
        </p>
        <div className="mt-4 space-y-3">
          <WebhookRow
            label="Encaissement — un chercheur paie Liguita"
            value={`${webhookBase}/api/airtel/callback`}
            onCopy={copy}
            copied={copied}
          />
          <WebhookRow
            label="Versement — Liguita paie un trouveur"
            value={`${webhookBase}/api/airtel/payout-callback`}
            onCopy={copy}
            copied={copied}
          />
        </div>
      </Card>
    </div>
  );
}

function IntegrationRow({
  label,
  envName,
  ok,
  requiredFor,
  optional = false,
}: {
  label: string;
  envName: string;
  ok: boolean;
  requiredFor: string;
  optional?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-ink-50 p-3">
      <div className="min-w-0">
        <p className="font-display text-body-sm font-bold text-ink-900">{label}</p>
        <code className="text-2xs text-ink-500">{envName}</code>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-2xs text-ink-500">{requiredFor}</span>
        {ok ? (
          <Badge tone="found">
            <CheckCircle2 size={12} aria-hidden />
            Configuré
          </Badge>
        ) : (
          <Badge tone={optional ? 'neutral' : 'urgent'}>
            <XCircle size={12} aria-hidden />
            {optional ? 'Non configuré' : 'Manquant'}
          </Badge>
        )}
      </div>
    </div>
  );
}

function WebhookRow({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  onCopy: (value: string) => void;
  copied: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ink-200 p-3">
      <div className="min-w-0">
        <p className="font-display text-body-sm font-bold text-ink-900">{label}</p>
        <code className="break-all text-2xs text-ink-500">{value}</code>
      </div>
      <button
        type="button"
        onClick={() => onCopy(value)}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink-300 px-3 font-display text-caption font-bold text-ink-700 hover:bg-ink-50"
      >
        <Copy size={14} aria-hidden />
        {copied === value ? 'Copié' : 'Copier'}
      </button>
    </div>
  );
}
