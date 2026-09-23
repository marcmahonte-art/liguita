'use client';

import { useRef, type ClipboardEvent, type KeyboardEvent, type ReactNode } from 'react';

import { cn } from '../lib/cn';

export interface OTPInputProps {
  /** Nombre de chiffres attendus. 6 pour un code SMS standard. */
  length?: number;
  value: string;
  onValueChange: (value: string) => void;
  label?: string;
  hint?: ReactNode;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  containerClassName?: string;
}

/**
 * Saisie d'un code à usage unique reçu par SMS.
 *
 * Détails qui comptent réellement sur le terrain :
 *  · `inputMode="numeric"` ouvre le pavé numérique, pas le clavier complet ;
 *  · `autoComplete="one-time-code"` laisse iOS et Android proposer le code reçu ;
 *  · le collage d'un code à 6 chiffres répartit la valeur sur toutes les cases ;
 *  · la hauteur des cases dépasse 48 px, y compris pour les pouces les moins précis.
 *
 * ⚠️ Le composant ne valide rien : il transmet la chaîne saisie. La vérification du code
 * appartient au serveur, jamais au navigateur.
 */
export function OTPInput({
  length = 6,
  value,
  onValueChange,
  label,
  hint,
  error,
  disabled = false,
  autoFocus = false,
  containerClassName,
}: OTPInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const cellAt = (index: number) => value[index] ?? '';

  function write(index: number, digit: string) {
    const chars = Array.from({ length }, (_, position) => value[position] ?? ' ');
    chars[index] = digit;
    onValueChange(chars.join('').replace(/ +$/, ''));
  }

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1);
    write(index, digit || ' ');
    if (digit && index < length - 1) refs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace') {
      if (cellAt(index)) {
        write(index, ' ');
      } else if (index > 0) {
        event.preventDefault();
        write(index - 1, ' ');
        refs.current[index - 1]?.focus();
      }
      return;
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      refs.current[index - 1]?.focus();
      return;
    }

    if (event.key === 'ArrowRight' && index < length - 1) {
      event.preventDefault();
      refs.current[index + 1]?.focus();
    }
  }

  function handlePaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    const digits = event.clipboardData.getData('text').replace(/\D/g, '');
    if (!digits) return;

    event.preventDefault();
    const chars = Array.from({ length }, (_, position) => value[position] ?? ' ');
    for (let offset = 0; index + offset < length && offset < digits.length; offset += 1) {
      chars[index + offset] = digits[offset] ?? ' ';
    }
    onValueChange(chars.join('').replace(/ +$/, ''));

    const nextIndex = Math.min(index + digits.length, length - 1);
    refs.current[nextIndex]?.focus();
  }

  const hintId = hint ? 'otp-hint' : undefined;
  const errorId = error ? 'otp-error' : undefined;

  return (
    <div className={cn('flex flex-col gap-2', containerClassName)}>
      {label && <p className="text-caption font-bold text-ink-700">{label}</p>}

      <div
        role="group"
        aria-label={label ?? 'Code de vérification'}
        aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
        className="flex gap-2"
      >
        {Array.from({ length }, (_, index) => (
          <input
            key={index}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="text"
            value={cellAt(index)}
            disabled={disabled}
            autoFocus={autoFocus && index === 0}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            aria-label={`Chiffre ${index + 1} sur ${length}`}
            aria-invalid={error ? true : undefined}
            onChange={(event) => handleChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={(event) => handlePaste(index, event)}
            onFocus={(event) => event.currentTarget.select()}
            className={cn(
              'h-[56px] w-full min-w-0 rounded-lg border bg-white text-center',
              'font-display text-h3 tabular-nums text-ink-900',
              'focus:outline-none focus-visible:border-ink-900 focus-visible:shadow-focus',
              'disabled:bg-ink-50 disabled:text-ink-400',
              error ? 'border-danger-500' : 'border-ink-400',
            )}
          />
        ))}
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
