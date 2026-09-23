import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';

import { cn } from '../lib/cn';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  /** Texte d'aide affiché sous le champ. */
  hint?: ReactNode;
  /** Message d'erreur. Sa présence bascule le champ en état d'erreur. */
  error?: string;
  /** Élément affiché à droite du champ (suffixe « FCFA », icône…). */
  suffix?: ReactNode;
  containerClassName?: string;
}

/**
 * Champ de saisie Liguita.
 *
 * Le libellé est TOUJOURS visible : un placeholder ne remplace jamais un libellé, car il
 * disparaît dès la première frappe et n'est pas lu de façon fiable par les lecteurs d'écran.
 *
 * La cible tactile fait 52 px de haut, au-delà du minimum de 48 px.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, suffix, className, containerClassName, id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-2', containerClassName)}>
      {label && (
        <label htmlFor={inputId} className="text-caption font-bold text-ink-700">
          {label}
        </label>
      )}

      <div className="flex items-center gap-0">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'h-[52px] w-full rounded-lg border bg-white px-4 font-body text-body text-ink-900',
            'placeholder:text-ink-400',
            'focus:outline-none focus-visible:border-ink-900 focus-visible:shadow-focus',
            'disabled:bg-ink-50 disabled:text-ink-400',
            error
              ? 'border-danger-500 focus-visible:shadow-focus-danger'
              : 'border-ink-400',
            suffix && 'rounded-r-none',
            className,
          )}
          {...props}
        />

        {suffix && (
          <span
            aria-hidden="true"
            className="flex h-[52px] shrink-0 items-center rounded-r-lg border border-l-0 border-ink-200 bg-ink-50 px-3.5 font-body text-caption font-bold text-ink-700"
          >
            {suffix}
          </span>
        )}
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

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'md' | 'lg';
  containerClassName?: string;
}

/**
 * Champ de recherche principal.
 *
 * `enterKeyHint="search"` fait apparaître la touche « Rechercher » du clavier mobile :
 * un détail qui accélère réellement la recherche sur téléphone.
 */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { size = 'md', className, containerClassName, ...props },
  ref,
) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-full border border-ink-400 bg-white px-4',
        size === 'lg' ? 'h-16' : 'h-[52px]',
        'focus-within:border-ink-900 focus-within:shadow-focus',
        containerClassName,
      )}
    >
      <svg
        className="h-5 w-5 shrink-0 text-ink-500"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
      </svg>

      <input
        ref={ref}
        type="search"
        enterKeyHint="search"
        className={cn(
          'min-w-0 flex-1 border-none bg-transparent font-body text-ink-900 outline-none',
          'placeholder:text-ink-400',
          size === 'lg' ? 'text-body-lg' : 'text-body',
          className,
        )}
        {...props}
      />
    </div>
  );
});
