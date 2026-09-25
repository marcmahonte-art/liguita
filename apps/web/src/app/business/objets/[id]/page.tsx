'use client';

import { ArrowLeft, MapPin, Package, QrCode } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { Alert, Badge, buttonClasses, Card, Skeleton } from '@liguita/ui';

import { ItemPhotoUploader } from '../../../../components/app/ItemPhotoUploader';
import {
  generateBusinessQr,
  getBusinessInventoryItem,
  type BusinessInventoryItem,
} from '../../../actions/business';

export default function BusinessObjectDetailPage() {
  const params = useParams<{ id: string }>();
  const [item, setItem] = useState<BusinessInventoryItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  useEffect(() => {
    void getBusinessInventoryItem(params.id).then((result) => {
      setItem(result.item);
      setQrCode(result.item?.qrCode ?? null);
      setError(result.error ?? null);
    });
  }, [params.id]);
  function generateQr() {
    startTransition(async () => {
      const result = await generateBusinessQr(params.id);
      if (result.error) setError(result.error);
      else setQrCode(result.qrCode ?? null);
    });
  }
  if (!item)
    return error ? (
      <Alert tone="danger" title={error} />
    ) : (
      <Skeleton variant="rect" className="h-96 w-full" />
    );
  return (
    <div className="space-y-6">
      <Link href="/business/objets" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
        <ArrowLeft size={16} /> Inventaire
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-caption font-bold text-brand-700">
            {item.publicRef ?? 'Objet Business'}
          </p>
          <h1 className="mt-1 font-display text-2xl font-extrabold text-ink-950">{item.title}</h1>
        </div>
        <Badge tone={item.status === 'RETURNED' ? 'found' : 'pending'}>{item.status}</Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="flex items-center gap-2 font-display font-bold text-ink-950">
            <Package size={17} /> Détails
          </h2>
          <dl className="mt-3 space-y-2 text-body-sm">
            <div>
              <dt className="text-caption text-ink-500">Catégorie</dt>
              <dd>{item.categoryCode}</dd>
            </div>
            <div>
              <dt className="text-caption text-ink-500">Lieu</dt>
              <dd>{item.placeLabel}</dd>
            </div>
            <div>
              <dt className="text-caption text-ink-500">Site</dt>
              <dd>{item.locationName ?? '—'}</dd>
            </div>
          </dl>
        </Card>
        <Card>
          <h2 className="flex items-center gap-2 font-display font-bold text-ink-950">
            <MapPin size={17} /> Localisation physique
          </h2>
          <p className="mt-3 text-body-sm text-ink-700">
            {item.building ?? 'Bâtiment non renseigné'} · Étage {item.floor ?? '—'}
            <br />
            Zone {item.storageZone ?? '—'} · Armoire {item.cabinet ?? '—'} · Casier{' '}
            {item.locker ?? '—'}
          </p>
          {item.internalNotes ? (
            <p className="mt-4 rounded-xl bg-ink-50 p-3 text-body-sm text-ink-700">
              Note interne : {item.internalNotes}
            </p>
          ) : null}
        </Card>
        <Card className="md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display font-bold text-ink-950">
              <QrCode size={17} /> QR de suivi
            </h2>
            <button
              type="button"
              onClick={generateQr}
              disabled={isPending}
              className={buttonClasses({ variant: 'outline', size: 'sm' })}
            >
              {qrCode ? 'Régénérer' : 'Générer'}
            </button>
          </div>
          {qrCode ? (
            <p className="mt-3 break-all rounded-lg bg-ink-50 p-3 font-mono text-caption">
              {qrCode}
            </p>
          ) : (
            <p className="mt-3 text-body-sm text-ink-600">
              Générez un identifiant non devinable pour le scan interne.
            </p>
          )}
        </Card>
      </div>

      <ItemPhotoUploader
        itemId={item.id}
        itemKind="FOUND"
        readOnly={!item.canManagePhotos}
      />
    </div>
  );
}
