import type { ReactNode } from 'react';

import { cn } from '../lib/cn';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

interface ToneStyle {
  readonly container: string;
  readonly icon: string;
  readonly path: string;
}

const TONES: Record<AlertTone, ToneStyle> = {
  info: {
    container: 'bg-info-50 border-info-500/30',
    icon: 'text-info-700',
    path: 'M12 16v-4m0-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  },
  success: {
    container: 'bg-success-50 border-success-500/30',
    icon: 'text-success-700',
    path: 'm9 12.5 2.5 2.5L16 9.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  },
  warning: {
    container: 'bg-warning-50 border-warning-500/30',
    icon: 'text-warning-700',
    path: 'M12 9v4m0 4h.01M10.3 3.9 2.6 17A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  },
  danger: {
    container: 'bg-danger-50 border-danger-500/30',
    icon: 'text-danger-700',
    path: 'M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  },
};

export interface AlertProps {
  tone?: AlertTone;
  title: ReactNode;
  children?: ReactNode;
  /** Action de résolution proposée à l'utilisateur (bouton, lien). */
  action?: ReactNode;
  className?: string;
}

/**
 * Message d'alerte contextuel.
 *
 * ⚠️ Les tons `danger` et `warning` sont annoncés immédiatement au lecteur d'écran
 * (`role="alert"`), les tons `info` et `success` le sont poliment (`role="status"`).
 * Interrompre la lecture pour une simple confirmation rendrait l'interface épuisante.
 */
export function Alert({ tone = 'info', title, children, action, className }: AlertProps) {
  const style = TONES[tone];
  const urgent = tone === 'danger' || tone === 'warning';

  return (
    <div
      role={urgent ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-lg border p-4', style.container, className)}
    >
      <svg
        className={cn('mt-0.5 h-5 w-5 shrink-0', style.icon)}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d={style.path} />
      </svg>

      <div className="min-w-0 flex-1">
        <p className="text-body font-bold text-ink-900">{title}</p>
        {children ? <div className="mt-1 text-caption text-ink-700">{children}</div> : null}
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </div>
  );
}
