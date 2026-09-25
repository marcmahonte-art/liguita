'use client';

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  ImagePlus,
  Info,
  LogIn,
  Save,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { ACTIVE_CITIES, ITEM_TYPES, LEAF_CATEGORIES, NEIGHBORHOODS } from '@liguita/config';
import { buttonClasses, Combobox, Select, cn } from '@liguita/ui';

import { declareLostItem } from '../../../actions/declare-lost';
import { ItemPhotoUploader } from '../../../../components/app/ItemPhotoUploader';
import { useAuth } from '../../../../lib/auth/auth-context';
import { useDraft } from '../../../../lib/hooks/use-draft';

const STORAGE_KEY = 'liguita_draft_lost_item';

interface LostDraft {
  categoryId: string;
  itemTypeId: string;
  title: string;
  brand: string;
  color: string;
  description: string;
  citySlug: string;
  neighborhoodSlug: string;
  placeLabel: string;
  occurredDate: string;
  isPublic: boolean;
}

const INITIAL_FORM: LostDraft = {
  categoryId: '',
  itemTypeId: '',
  title: '',
  brand: '',
  color: '',
  description: '',
  citySlug: 'ndjamena',
  neighborhoodSlug: '',
  placeLabel: '',
  occurredDate: new Date().toISOString().split('T')[0] || '',
  isPublic: true,
};

export default function DeclareLostItemPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { value: formData, update, isSaved: isSavedLocally, clearDraft } =
    useDraft<LostDraft>(STORAGE_KEY, INITIAL_FORM);

  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoWarnings, setPhotoWarnings] = useState<string[]>([]);

  // Gate d'authentification
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/connexion?redirect=/declarer/perdu');
    }
  }, [authLoading, user, router]);

  const typeOptions = useMemo(() => {
    const source = formData.categoryId
      ? ITEM_TYPES.filter((t) => t.categoryId === formData.categoryId)
      : ITEM_TYPES;
    return source.map((t) => ({ value: t.id, label: t.labelFr }));
  }, [formData.categoryId]);

  const cityOptions = ACTIVE_CITIES.map((city) => ({ value: city.slug, label: city.name }));
  const neighborhoodOptions = NEIGHBORHOODS.filter(
    (n) => n.citySlug === formData.citySlug,
  ).map((n) => ({ value: n.slug, label: `${n.name} (${n.arrondissement}e arr.)` }));

  const canSubmit =
    formData.categoryId &&
    formData.itemTypeId &&
    formData.title.trim() &&
    formData.citySlug &&
    formData.placeLabel.trim() &&
    formData.occurredDate;

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;
    if (selectedPhotos.length + files.length > 4) {
      setPhotoError('Quatre photos maximum par objet.');
      return;
    }
    if (files.some((file) => file.size <= 0 || file.size > 5 * 1024 * 1024)) {
      setPhotoError('Chaque photo doit peser au maximum 5 Mo.');
      return;
    }
    if (
      files.some(
        (file) => !['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type),
      )
    ) {
      setPhotoError('Format de photo non autorisé.');
      return;
    }
    setPhotoError(null);
    setSelectedPhotos((current) => [...current, ...files]);
  }

  function removePhoto(index: number) {
    setSelectedPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const fd = new FormData();
    fd.set('categoryCode', formData.categoryId);
    fd.set('itemTypeCode', formData.itemTypeId);
    fd.set('title', formData.title.trim());
    fd.set('brand', formData.brand.trim());
    fd.set('color', formData.color.trim());
    fd.set('description', formData.description.trim());
    fd.set('citySlug', formData.citySlug);
    fd.set('neighborhoodSlug', formData.neighborhoodSlug);
    fd.set('placeLabel', formData.placeLabel.trim());
    fd.set('occurredAt', formData.occurredDate);
    fd.set('isPublic', String(formData.isPublic));
    for (const photo of selectedPhotos) {
      fd.append('photos', photo);
    }

    const result = await declareLostItem(fd);

    setIsSubmitting(false);

    if (!result.success) {
      setSubmitError(result.error ?? 'Une erreur est survenue.');
      return;
    }

    clearDraft();
    setPhotoWarnings(result.photoWarnings ?? []);
    setSelectedPhotos([]);
    setSubmittedId(result.id ?? null);
  }

  // Chargement de la session
  if (authLoading) {
    return (
      <div className="bg-ink-50/40 min-h-screen py-16">
        <div className="container-liguita max-w-2xl text-center text-ink-600">
          Chargement…
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-ink-50/40 min-h-screen py-16">
        <div className="container-liguita max-w-md text-center">
          <div className="rounded-3xl border border-ink-200 bg-white p-8 shadow-card">
            <LogIn size={36} className="mx-auto text-brand-600" />
            <h1 className="mt-4 font-display text-xl font-extrabold text-ink-950">
              Connexion requise
            </h1>
            <p className="mt-2 text-body text-ink-600">
              Connectez-vous pour déclarer un objet perdu. Vos coordonnées viennent de votre
              profil.
            </p>
            <Link
              href="/connexion?redirect=/declarer/perdu"
              className={buttonClasses({ variant: 'primary', block: true, className: 'mt-6' })}
            >
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (submittedId) {
    return (
      <div className="bg-ink-50/40 min-h-screen py-16">
        <div className="container-liguita max-w-xl text-center">
          <div className="rounded-3xl border border-ink-200 bg-white p-8 shadow-card sm:p-10">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={36} />
            </div>

            <h1 className="mt-6 font-display text-2xl font-extrabold text-ink-950 sm:text-3xl">
              Déclaration de perte enregistrée !
            </h1>

            <p className="mt-3 text-body text-ink-600">
              Votre avis de recherche pour <strong>« {formData.title} »</strong> est maintenant
              actif.
            </p>

             <p className="mt-2 text-caption text-ink-500">
               Référence : <code className="font-mono text-ink-800">{submittedId}</code>
             </p>

             {photoWarnings.length > 0 ? (
               <div role="alert" className="mt-4 rounded-2xl border border-warning-200 bg-warning-50 p-4 text-left text-caption text-warning-800">
                 <p className="font-bold">Certaines photos n’ont pas pu être ajoutées.</p>
                 <ul className="mt-2 list-disc pl-4">
                   {photoWarnings.map((warning) => <li key={warning}>{warning}</li>)}
                 </ul>
               </div>
             ) : null}

             <ItemPhotoUploader itemId={submittedId} itemKind="LOST" />

             <div className="mt-6 rounded-2xl border border-brand-100 bg-brand-50/70 p-4 text-left">
              <div className="flex gap-3">
                <Info size={20} className="mt-0.5 shrink-0 text-brand-600" />
                <div className="space-y-1 text-caption text-brand-900">
                  <p className="font-bold">Vous serez alerté par SMS</p>
                  <p>
                    Dès qu&apos;un objet similaire est signalé, vous recevrez une alerte au{' '}
                    {user.phone ? `+${user.phone}` : 'numéro de votre profil'}.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3">
              <Link
                href="/rechercher"
                className={buttonClasses({ variant: 'primary', block: true, size: 'lg' })}
              >
                Consulter les objets trouvés actuels
              </Link>
              <Link href="/" className={buttonClasses({ variant: 'outline', block: true })}>
                Retour à l&apos;accueil
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-ink-50/40 min-h-screen py-10 sm:py-14">
      <div className="container-liguita max-w-2xl">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 font-display text-caption font-bold text-brand-700">
              <HelpCircle size={14} />
              Déclaration de perte
            </span>
            <h1 className="mt-2 font-display text-2xl font-extrabold text-ink-950 sm:text-3xl">
              J&apos;ai perdu un objet
            </h1>
          </div>

          {isSavedLocally && (
            <span className="hidden items-center gap-1 rounded-full border border-ink-200 bg-white px-3 py-1 text-2xs font-medium text-ink-600 sm:inline-flex">
              <Save size={12} className="text-emerald-600" />
              Brouillon sauvegardé
            </span>
          )}
        </div>

        {/* Stepper (2 étapes) */}
        <div className="mt-6 flex items-center justify-between border-b border-ink-200/80 pb-4">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'flex size-7 items-center justify-center rounded-full font-display text-caption font-bold',
                step >= 1 ? 'bg-brand-500 text-white' : 'bg-ink-200 text-ink-600',
              )}
            >
              1
            </span>
            <span className="font-display text-caption font-bold text-ink-800">L&apos;objet</span>
          </div>
          <div className="mx-3 h-0.5 flex-1 bg-ink-200">
            <div className={cn('h-full bg-brand-500 transition-all', step >= 2 ? 'w-full' : 'w-0')} />
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'flex size-7 items-center justify-center rounded-full font-display text-caption font-bold',
                step >= 2 ? 'bg-brand-500 text-white' : 'bg-ink-200 text-ink-600',
              )}
            >
              2
            </span>
            <span className="font-display text-caption font-bold text-ink-800">
              Lieu &amp; Date
            </span>
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="mt-6 rounded-3xl border border-ink-200 bg-white p-6 shadow-card sm:p-8">
          {/* Étape 1 : Quoi */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="font-display text-xl font-bold text-ink-900">
                1. Décrivez l&apos;objet perdu
              </h2>

              <Select
                label="Catégorie d'objet"
                placeholder="Sélectionnez une catégorie…"
                required
                value={formData.categoryId}
                onChange={(event) => {
                  update('categoryId', event.target.value);
                  // Le type dépend de la catégorie : on le réinitialise pour éviter
                  // un type hors catégorie.
                  update('itemTypeId', '');
                }}
                options={LEAF_CATEGORIES.map((cat) => ({
                  value: cat.id,
                  label: cat.labelFr,
                }))}
              />

              <Combobox
                label="Type d'objet"
                placeholder="Rechercher le type…"
                emptyLabel="Aucun type pour cette catégorie"
                value={formData.itemTypeId || null}
                onValueChange={(value) => update('itemTypeId', value ?? '')}
                options={typeOptions}
                hint="Obligatoire : le type pondère 30 points du score de correspondance."
              />

              <div>
                <label className="mb-1.5 block text-body-sm font-bold text-ink-800">
                  Nom ou intitulé de l&apos;objet <span className="text-brand-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(event) => update('title', event.target.value)}
                  placeholder="Ex : Carte nationale d'identité, iPhone 13, Clé USB…"
                  className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-body text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-body-sm font-bold text-ink-800">
                    Marque ou fabricant (facultatif)
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(event) => update('brand', event.target.value)}
                    placeholder="Ex : Samsung, Apple, Toyota…"
                    className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-body text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-body-sm font-bold text-ink-800">
                    Couleur principale (facultatif)
                  </label>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(event) => update('color', event.target.value)}
                    placeholder="Ex : Noir, Rouge, Bleu…"
                    className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-body text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-body-sm font-bold text-ink-800">
                  Détails ou signes distinctifs (facultatif)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(event) => update('description', event.target.value)}
                  rows={3}
                  placeholder="Ex : Écran légèrement fissuré, porte-clés bleu avec inscription, etc."
                  className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-body text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="lost-photos" className="text-body-sm font-bold text-ink-800">
                    Photos de l&apos;objet <span className="font-normal text-ink-500">(facultatif)</span>
                  </label>
                  <span className="text-caption text-ink-500">{selectedPhotos.length}/4</span>
                </div>
                <label
                  htmlFor="lost-photos"
                  className={`mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-ink-300 bg-ink-50/50 px-4 py-4 text-body-sm font-semibold text-brand-700 transition hover:border-brand-400 hover:bg-brand-50`}
                >
                  <ImagePlus size={18} />
                  <span>Choisir jusqu&apos;à 4 photos</span>
                  <input
                    id="lost-photos"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    multiple
                    onChange={handlePhotoChange}
                    disabled={selectedPhotos.length >= 4}
                    className="sr-only"
                  />
                </label>
                <p className="mt-1.5 text-caption text-ink-500">
                  JPEG, PNG, WebP ou AVIF · 5 Mo maximum par photo
                </p>
                {selectedPhotos.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {selectedPhotos.map((photo, index) => (
                      <li key={`${photo.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-ink-50 px-3 py-2 text-caption text-ink-700">
                        <span className="truncate">{photo.name}</span>
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-ink-500 transition hover:bg-white hover:text-danger-700"
                          aria-label={`Retirer ${photo.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {photoError ? <p role="alert" className="mt-2 text-caption font-bold text-danger-700">{photoError}</p> : null}
              </div>

              <div className="flex justify-end border-t border-ink-100 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!formData.title.trim() || !formData.itemTypeId}
                  className={buttonClasses({
                    variant: 'primary',
                    size: 'lg',
                    className:
                      !formData.title.trim() || !formData.itemTypeId
                        ? 'cursor-not-allowed opacity-50'
                        : '',
                  })}
                >
                  <span>Continuer : Lieu et date</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Étape 2 : Où et Quand (soumission) */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="font-display text-xl font-bold text-ink-900">
                2. Où et quand avez-vous perdu l&apos;objet ?
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select
                  label="Ville"
                  required
                  value={formData.citySlug}
                  onChange={(event) => {
                    update('citySlug', event.target.value);
                    update('neighborhoodSlug', '');
                  }}
                  options={cityOptions}
                />

                <Select
                  label="Quartier"
                  placeholder="Sélectionnez le quartier…"
                  value={formData.neighborhoodSlug}
                  onChange={(event) => update('neighborhoodSlug', event.target.value)}
                  options={neighborhoodOptions}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-body-sm font-bold text-ink-800">
                  Lieu précis ou repère <span className="text-brand-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.placeLabel}
                  onChange={(event) => update('placeLabel', event.target.value)}
                  placeholder="Ex : Près du grand marché, arrêt de bus, restaurant…"
                  className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-body text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-body-sm font-bold text-ink-800">
                  Date approximative de la perte <span className="text-brand-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.occurredDate}
                  onChange={(event) => update('occurredDate', event.target.value)}
                  className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-body text-ink-900 focus:border-brand-500 focus:outline-none"
                  required
                />
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-brand-100 bg-brand-50/50 p-4 text-caption text-ink-700">
                <input
                  type="checkbox"
                  checked={formData.isPublic}
                  onChange={(event) => update('isPublic', event.target.checked)}
                  className="mt-0.5 size-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                />
                <span>
                  <strong className="block text-ink-900">Publier mon objet dans les recherches</strong>
                  Son titre, sa photo, son lieu approximatif et sa date seront visibles publiquement.
                  Votre nom et vos coordonnées resteront privés.
                </span>
              </label>

              <div className="flex items-start gap-3 rounded-2xl border border-ink-200 bg-ink-50 p-4 text-caption text-ink-700">
                <ShieldCheck size={20} className="mt-0.5 shrink-0 text-emerald-600" />
                <p>
                  Vos coordonnées ({user.display_name || user.full_name || user.phone}) viennent
                  de votre profil. Liguita surveille les objets trouvés et vous alerte par SMS
                  dès qu&apos;une correspondance est détectée.
                </p>
              </div>

              {submitError && (
                <p role="alert" className="text-caption font-bold text-danger-500">
                  {submitError}
                </p>
              )}

              <div className="flex items-center justify-between border-t border-ink-100 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className={buttonClasses({ variant: 'outline', size: 'md' })}
                >
                  <ArrowLeft size={18} />
                  <span>Retour</span>
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit || isSubmitting}
                  className={buttonClasses({
                    variant: 'primary',
                    size: 'lg',
                    className: !canSubmit || isSubmitting ? 'cursor-not-allowed opacity-50' : '',
                  })}
                >
                  <span>{isSubmitting ? 'Envoi…' : 'Publier ma déclaration'}</span>
                  <CheckCircle2 size={18} />
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
