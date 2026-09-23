import { forwardRef, useId, type ReactNode, type SelectHTMLAttributes } from 'react';

import { cn } from '../lib/cn';

export interface SelectOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  hint?: ReactNode;
  /** Message d'erreur. Sa présence bascule le champ en état d'erreur. */
  error?: string;
  options: readonly SelectOption[];
  /** Option vide affichée en tête : « Choisir une catégorie ». */
  placeholder?: string;
  /** Classe appliquée au conteneur, pas au `<select>`. */
  containerClassName?: string;
}

/**
 * Liste déroulante.
 *
 * Repose sur un `<select>` natif plutôt que sur une liste reconstruite : sur un
 * téléphone d'entrée de gamme à N'Djamena, le sélecteur natif est plus rapide, plus
 * fiable hors ligne et n'a aucun coût en JavaScript.
 *
 * La flèche est décorative (`aria-hidden`) : le rôle et l'état sont portés par le
 * `<select>` lui-même, pas par l'icône.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, options, placeholder, className, containerClassName, id, ...props },
  ref,
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const hintId = hint ? `${selectId}-hint` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-2', containerClassName)}>
      {label && (
        <label htmlFor={selectId} className="text-caption font-bold text-ink-700">
          {label}
        </label>
      )}

      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'h-[52px] w-full appearance-none rounded-lg border bg-white pl-4 pr-11',
            'font-body text-body text-ink-900',
            'focus:outline-none focus-visible:border-ink-900 focus-visible:shadow-focus',
            'disabled:bg-ink-50 disabled:text-ink-400',
            error ? 'border-danger-500 focus-visible:shadow-focus-danger' : 'border-ink-400',
            props.value === '' && 'text-ink-400',
            className,
          )}
          {...props}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>

        <svg
          className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-caption font-bold text-danger-500">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="text-caption text-ink-500">
          {hint}
        </p>
      )}
    </div>
  );
});
