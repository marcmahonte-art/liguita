'use client';

import {
  Award,
  CheckCircle2,
  Gift,
  ImagePlus,
  LogIn,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { ACTIVE_CITIES, ITEM_TYPES, LEAF_CATEGORIES, NEIGHBORHOODS } from '@liguita/config';
import { buttonClasses, Combobox, Select } from '@liguita/ui';

import { declareFoundItem } from '../../../actions/declare-found';
import { ItemPhotoUploader } from '../../../../components/app/ItemPhotoUploader';
import { useAuth } from '../../../../lib/auth/auth-context';
import { useDraft } from '../../../../lib/hooks/use-draft';

const STORAGE_KEY = 'liguita_draft_found_item';

interface FoundDraft {
  categoryId: string;
  itemTypeId: string;
  title: string;
  brand: string;
  color: string;
  description: string;
  citySlug: string;
  neighborhoodSlug: string;
  placeLabel: string;
  foundDate: string;
}

const INITIAL_FORM: FoundDraft = {
  categoryId: '',
  itemTypeId: '',
  title: '',
  brand: '',
  color: '',
  description: '',
  citySlug: 'ndjamena',
  neighborhoodSlug: '',
  placeLabel: '',
  foundDate: new Date().toISOString().split('T')[0] || '',
};

export default function DeclareFoundItemPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const {
    value: formData,
    update,
    isSaved: isSavedLocally,
    clearDraft,
  } = useDraft<FoundDraft>(STORAGE_KEY, INITIAL_FORM);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoWarnings, setPhotoWarnings] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/connexion?redirect=/declarer/trouve');
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
    formData.foundDate;

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
    fd.set('foundAt', formData.foundDate);
    for (const photo of selectedPhotos) {
      fd.append('photos', photo);
    }

    const result = await declareFoundItem(fd);

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

  if (authLoading) {
    return (
      <div className="bg-ink-50/40 min-h-screen py-16">
        <div className="container-liguita max-w-2xl text-center text-ink-600">Chargement…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-ink-50/40 min-h-screen py-16">
        <div className="container-liguita max-w-md text-center">
          <div className="rounded-3xl border border-ink-200 bg-white p-8 shadow-card">
            <LogIn size={36} className="mx-auto text-emerald-600" />
            <h1 className="mt-4 font-display text-xl font-extrabold text-ink-950">
              Connexion requise
            </h1>
            <p className="mt-2 text-body text-ink-600">
              Connectez-vous pour signaler un objet trouvé et enregistrer votre récompense.
            </p>
            <Link
              href="/connexion?redirect=/declarer/trouve"
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
              <Gift size={36} />
            </div>

            <h1 className="mt-6 font-display text-2xl font-extrabold text-ink-950 sm:text-3xl">
              Merci pour votre geste civique !
            </h1>

            <p className="mt-3 text-body text-ink-600">
              Votre signalement pour <strong>« {formData.title} »</strong> est maintenant en
              ligne.
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

             <ItemPhotoUploader itemId={submittedId} itemKind="FOUND" />

             <div className="mt-6 border border-emerald-200 bg-emerald-50/80 p-4 text-left rounded-2xl">
              <div className="flex gap-3">
                <Award size={22} className="mt-0.5 shrink-0 text-emerald-700" />
                <div className="space-y-1 text-caption text-emerald-950">
                  <p className="font-bold">Votre récompense de trouveur est réservée</p>
                  <p>
                    Lors de la mise en relation avec le propriétaire vérifié, une récompense
                    vous sera versée sur votre numéro Airtel Money / Moov Money.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3">
              <Link
                href="/rechercher"
                className={buttonClasses({ variant: 'primary', block: true, size: 'lg' })}
              >
                Voir les objets signalés
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
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 font-display text-caption font-bold text-emerald-700">
              <Sparkles size={14} />
              Geste civique &amp; Récompense
            </span>
            <h1 className="mt-2 font-display text-2xl font-extrabold text-ink-950 sm:text-3xl">
              J&apos;ai trouvé un objet
            </h1>
          </div>

          {isSavedLocally && (
            <span className="hidden items-center gap-1 rounded-full border border-ink-200 bg-white px-3 py-1 text-2xs font-medium text-ink-600 sm:inline-flex">
              <Save size={12} className="text-emerald-600" />
              Brouillon sauvegardé
            </span>
          )}
        </div>

        {/* Encadré d'encouragement trouveur */}
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/80 p-4">
          <Award size={22} className="mt-0.5 shrink-0 text-emerald-700" />
          <p className="text-relaxed text-caption leading-relaxed text-emerald-900">
            <strong>Gagnez une récompense garantie :</strong> En publiant un objet trouvé sur
            Liguita, vous permettez à son propriétaire de le retrouver en toute sécurité.
            Lors de la restitution, vous recevrez une récompense versée sur votre compte
            Mobile Money.
          </p>
        </div>

        {/* Formulaire */}
        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-6 rounded-3xl border border-ink-200 bg-white p-6 shadow-card sm:p-8"
        >
          {/* Section 1 : L'objet */}
          <div className="space-y-4">
            <h2 className="border-b border-ink-100 pb-2 font-display text-lg font-bold text-ink-900">
              1. L&apos;objet trouvé
            </h2>

            <Select
              label="Catégorie"
              placeholder="Sélectionnez la catégorie…"
              required
              value={formData.categoryId}
              onChange={(event) => {
                update('categoryId', event.target.value);
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
              hint="Obligatoire : indispensable pour le score de correspondance."
            />

            <div>
              <label className="mb-1.5 block text-body-sm font-bold text-ink-800">
                Qu&apos;avez-vous trouvé exactement ? <span className="text-brand-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(event) => update('title', event.target.value)}
                placeholder="Ex : Trousseau de 4 clés, Carte d'électeur, Sac à dos noir…"
                className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-body text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
                required
              />
              <p className="mt-1 text-2xs text-ink-500">
                Ne donnez pas tous les détails secrets : le propriétaire devra prouver qu&apos;il
                en est bien le possesseur.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-body-sm font-bold text-ink-800">
                  Marque (facultatif)
                </label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(event) => update('brand', event.target.value)}
                  placeholder="Ex : Samsung, Adidas…"
                  className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-body text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-body-sm font-bold text-ink-800">
                  Couleur (facultatif)
                </label>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(event) => update('color', event.target.value)}
                  placeholder="Ex : Noir, Rouge…"
                  className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-body text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-body-sm font-bold text-ink-800">
                Description (facultatif)
              </label>
              <textarea
                value={formData.description}
                onChange={(event) => update('description', event.target.value)}
                rows={3}
                placeholder="Ex : Trousseau avec porte-clés rouge, une clé de moto et deux clés de maison."
                className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-body text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="found-photos" className="text-body-sm font-bold text-ink-800">
                  Photos de l&apos;objet <span className="font-normal text-ink-500">(facultatif)</span>
                </label>
                <span className="text-caption text-ink-500">{selectedPhotos.length}/4</span>
              </div>
              <label
                htmlFor="found-photos"
                className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-ink-300 bg-ink-50/50 px-4 py-4 text-body-sm font-semibold text-brand-700 transition hover:border-brand-400 hover:bg-brand-50"
              >
                <ImagePlus size={18} />
                <span>Choisir jusqu&apos;à 4 photos</span>
                <input
                  id="found-photos"
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
          </div>

          {/* Section 2 : Le lieu et la date */}
          <div className="space-y-4 pt-2">
            <h2 className="border-b border-ink-100 pb-2 font-display text-lg font-bold text-ink-900">
              2. Lieu et date de la découverte
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
                Repère ou précision (facultatif)
              </label>
              <input
                type="text"
                value={formData.placeLabel}
                onChange={(event) => update('placeLabel', event.target.value)}
                placeholder="Ex : Près de la station, carrefour…"
                className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-body text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-body-sm font-bold text-ink-800">
                Date de découverte <span className="text-brand-500">*</span>
              </label>
              <input
                type="date"
                value={formData.foundDate}
                onChange={(event) => update('foundDate', event.target.value)}
                className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-body text-ink-900 focus:border-brand-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Section 3 : Profil (coordonnées issues du compte) */}
          <div className="space-y-4 pt-2">
            <h2 className="border-b border-ink-100 pb-2 font-display text-lg font-bold text-ink-900">
              3. Mise en relation
            </h2>
            <p className="text-caption text-ink-600">
              Vos coordonnées ({user.display_name || user.full_name || user.phone ? `+${user.phone}` : 'profil'}) sont
              déjà enregistrées. Elles ne seront partagées qu&apos;avec le propriétaire
              vérifié, après validation de sa preuve de propriété.
            </p>
          </div>

          {submitError && (
            <p role="alert" className="text-caption font-bold text-danger-500">
              {submitError}
            </p>
          )}

          <div className="border-t border-ink-100 pt-4">
            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className={buttonClasses({
                variant: 'primary',
                block: true,
                size: 'lg',
                className: !canSubmit || isSubmitting ? 'cursor-not-allowed opacity-50' : '',
              })}
            >
              <span>
                {isSubmitting
                  ? 'Envoi…'
                  : "Publier l'objet trouvé et enregistrer ma récompense"}
              </span>
              <CheckCircle2 size={18} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
