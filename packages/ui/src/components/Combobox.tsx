'use client';

import { normalize } from '@liguita/core/matching';
import { useId, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';

import { cn } from '../lib/cn';

export interface ComboboxOption {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
}

export interface ComboboxProps {
  label?: string;
  hint?: ReactNode;
  error?: string;
  options: readonly ComboboxOption[];
  value: string | null;
  onValueChange: (value: string | null) => void;
  /** Texte affiché quand aucune valeur n'est sélectionnée. */
  placeholder?: string;
  /** Texte affiché quand le filtre ne retourne rien. */
  emptyLabel?: string;
  disabled?: boolean;
  containerClassName?: string;
}

/**
 * Liste déroulante avec recherche.
 *
 * Utilisée pour le choix du type d'objet et du lieu : ces référentiels comptent
 * plusieurs centaines d'entrées et un `<select>` natif y devient impraticable sur mobile.
 *
 * Le filtre ignore la casse et les accents (`normalize` du moteur de correspondance) :
 * « ecran » trouve « Écran », ce qui compte sur un clavier de téléphone.
 *
 * Motif ARIA « combobox » : le focus reste dans le champ de saisie, l'option survolée
 * est annoncée via `aria-activedescendant`.
 */
export function Combobox({
  label,
  hint,
  error,
  options,
  value,
  onValueChange,
  placeholder = 'Rechercher…',
  emptyLabel = 'Aucun résultat',
  disabled = false,
  containerClassName,
}: ComboboxProps) {
  const baseId = useId();
  const listId = `${baseId}-list`;
  const hintId = hint ? `${baseId}-hint` : undefined;
  const errorId = error ? `${baseId}-error` : undefined;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const needle = normalize(query);
    if (!needle) return options;
    return options.filter((option) => normalize(option.label).includes(needle));
  }, [options, query]);

  function commit(index: number) {
    const option = filtered[index];
    if (!option) return;
    onValueChange(option.value);
    setOpen(false);
    setQuery('');
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(0);
        return;
      }
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      const count = filtered.length;
      if (count === 0) return;
      setActiveIndex((current) => (current + delta + count) % count);
      return;
    }

    if (event.key === 'Enter') {
      if (!open) return;
      event.preventDefault();
      commit(activeIndex);
      return;
    }

    if (event.key === 'Escape') {
      setOpen(false);
      setQuery('');
      return;
    }

    if (event.key === 'Tab') {
      setOpen(false);
      setQuery('');
    }
  }

  const activeOption = filtered[activeIndex];

  return (
    <div className={cn('flex flex-col gap-2', containerClassName)}>
      {label && (
        <label htmlFor={baseId} className="text-caption font-bold text-ink-700">
          {label}
        </label>
      )}

      <div
        className="relative"
        onBlur={(event) => {
          // Fermeture uniquement si le focus quitte réellement le composant :
          // sans ce test, cliquer une option refermerait la liste avant le clic.
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setOpen(false);
            setQuery('');
          }
        }}
      >
        <input
          id={baseId}
          type="text"
          role="combobox"
          autoComplete="off"
          disabled={disabled}
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && activeOption ? `${baseId}-opt-${activeOption.value}` : undefined
          }
          aria-invalid={error ? true : undefined}
          aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
          value={open ? query : (selected?.label ?? '')}
          placeholder={open ? placeholder : (selected?.label ?? placeholder)}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className={cn(
            'h-[52px] w-full rounded-lg border bg-white px-4 pr-11',
            'font-body text-body text-ink-900 placeholder:text-ink-400',
            'focus:outline-none focus-visible:border-ink-900 focus-visible:shadow-focus',
            'disabled:bg-ink-50 disabled:text-ink-400',
            error ? 'border-danger-500 focus-visible:shadow-focus-danger' : 'border-ink-400',
          )}
        />

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
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>

        {open && (
          <ul
            id={listId}
            role="listbox"
            className={cn(
              'absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-xl',
              'border border-ink-200 bg-white py-1 shadow-300',
            )}
          >
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-caption text-ink-500">{emptyLabel}</li>
            ) : (
              filtered.map((option, index) => {
                const isActive = index === activeIndex;
                const isSelected = option.value === value;

                return (
                  <li
                    key={option.value}
                    id={`${baseId}-opt-${option.value}`}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => commit(index)}
                    className={cn(
                      'flex min-h-[48px] cursor-pointer flex-col justify-center px-4 py-2',
                      isActive && 'bg-ink-100',
                      isSelected && 'font-bold',
                    )}
                  >
                    <span className="text-body text-ink-900">{option.label}</span>
                    {option.description ? (
                      <span className="text-caption text-ink-500">{option.description}</span>
                    ) : null}
                  </li>
                );
              })
            )}
          </ul>
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
}
