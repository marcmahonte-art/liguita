'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { cn } from '../lib/cn';

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

export interface ToastOptions {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Durée d'affichage en millisecondes. `0` = reste jusqu'à fermeture manuelle. */
  duration?: number;
}

interface ToastRecord extends ToastOptions {
  readonly id: number;
}

interface ToastContextValue {
  show: (options: ToastOptions) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Accès au gestionnaire de notifications. Lève une erreur hors `<ToastProvider>`. */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast doit être appelé dans un <ToastProvider>.');
  return context;
}

const TONE_CLASSES: Record<ToastTone, string> = {
  info: 'border-ink-200 bg-white',
  success: 'border-success-500/40 bg-success-50',
  warning: 'border-warning-500/40 bg-warning-50',
  danger: 'border-danger-500/40 bg-danger-50',
};

const ACCENT_CLASSES: Record<ToastTone, string> = {
  info: 'bg-info-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
};

/**
 * Fournisseur de notifications transitoires.
 *
 * ⚠️ Règle d'accessibilité : la zone est `aria-live="polite"`. Une confirmation ne doit
 * jamais interrompre la lecture en cours — seules les erreurs bloquantes méritent
 * `role="alert"`, et celles-là s'affichent en ligne dans le formulaire, pas en notification.
 *
 * Sur mobile, les notifications s'empilent en bas de l'écran, au-dessus de la zone du
 * pouce ; sur grand écran, elles se placent en bas à droite.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<readonly ToastRecord[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback((options: ToastOptions) => {
    counter.current += 1;
    setToasts((list) => [...list, { ...options, id: counter.current }]);
  }, []);

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        aria-live="polite"
        className={cn(
          'pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col gap-2',
          'sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[380px]',
        )}
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastRecord;
  onDismiss: (id: number) => void;
}) {
  const { id, tone = 'info', duration = 5000 } = toast;

  useEffect(() => {
    if (duration <= 0) return;
    const timer = window.setTimeout(() => onDismiss(id), duration);
    return () => window.clearTimeout(timer);
  }, [duration, id, onDismiss]);

  return (
    <div
      className={cn(
        'pointer-events-auto flex items-start gap-3 overflow-hidden rounded-xl border p-4 shadow-300',
        TONE_CLASSES[tone],
      )}
    >
      <span aria-hidden="true" className={cn('mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full', ACCENT_CLASSES[tone])} />

      <div className="min-w-0 flex-1">
        <p className="text-body font-bold text-ink-900">{toast.title}</p>
        {toast.description ? (
          <p className="mt-0.5 text-caption text-ink-700">{toast.description}</p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => onDismiss(id)}
        aria-label="Fermer la notification"
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          'text-ink-500 hover:bg-ink-100 hover:text-ink-900',
          'focus-visible:outline-none focus-visible:shadow-focus',
        )}
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}
