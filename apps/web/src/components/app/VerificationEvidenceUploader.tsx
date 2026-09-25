'use client';

import { FileCheck2, LoaderCircle } from 'lucide-react';
import { useState } from 'react';

import { uploadVerificationEvidence } from '../../app/actions/verification';

export function VerificationEvidenceUploader({
  matchId,
  questionId,
  questionLabel,
}: {
  matchId: string;
  questionId: string;
  questionLabel: string;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(null);
    setIsUploading(true);
    const formData = new FormData();
    formData.set('matchId', matchId);
    formData.set('questionCode', questionId);
    formData.set('evidence', file);
    const result = await uploadVerificationEvidence(formData);
    setIsUploading(false);
    if (!result.ok) {
      setError(result.error ?? 'La preuve n’a pas pu être ajoutée.');
      return;
    }
    setUploaded(true);
  }

  return (
    <div className="rounded-xl border border-dashed border-ink-300 bg-ink-50/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-caption font-semibold text-ink-700">
          Preuve photo facultative · {questionLabel}
        </p>
        {uploaded ? (
          <span className="inline-flex items-center gap-1 text-caption font-bold text-emerald-700">
            <FileCheck2 size={14} /> Ajoutée
          </span>
        ) : null}
      </div>
      <label
        className={`mt-3 inline-flex cursor-pointer items-center gap-2 text-caption font-bold text-brand-700 ${isUploading ? 'opacity-50' : ''}`}
      >
        {isUploading ? <LoaderCircle size={14} className="animate-spin" /> : null}
        {isUploading ? 'Téléversement…' : 'Ajouter une photo'}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={handleFile}
          disabled={isUploading}
          className="sr-only"
        />
      </label>
      {error ? (
        <p role="alert" className="mt-2 text-caption text-danger-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
