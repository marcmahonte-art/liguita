'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const DEBOUNCE_MS = 500;

/**
 * Persiste un brouillon de formulaire dans `localStorage`.
 *
 * · restaure la valeur sauvegardée au montage (une seule fois) ;
 * · sauvegarde à chaque modification, avec un debounce de 500 ms ;
 * · `clearDraft()` supprime l'entrée après une soumission réussie ;
 * · les erreurs `localStorage` (mode privé, quota, SSR) sont absorbées : un brouillon
 *   est un confort, jamais une condition de réussite.
 */
export function useDraft<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [isRestored, setIsRestored] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSave = useRef(true);

  // Restauration au montage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as T;
        setValue(parsed);
        setIsSaved(true);
      }
    } catch {
      // localStorage indisponible ou JSON corrompu : on repart du modèle initial.
    }
    setIsRestored(true);
  }, [key]);

  // Sauvegarde debouncée
  useEffect(() => {
    if (!isRestored) return;
    // Premier effet après restauration : ne pas réécrire immédiatement.
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
        setIsSaved(true);
      } catch {
        // Quota dépassé ou mode privé : on ignore.
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, key, isRestored]);

  const update = useCallback(<K extends keyof T>(field: K, fieldValue: T[K]) => {
    setValue((current) => ({ ...current, [field]: fieldValue }));
  }, []);

  const setValueAndMark = useCallback((next: T) => {
    setValue(next);
  }, []);

  const clearDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore.
    }
    setIsSaved(false);
  }, [key]);

  return {
    value,
    setValue: setValueAndMark,
    update,
    isSaved,
    clearDraft,
    isRestored,
  };
}
