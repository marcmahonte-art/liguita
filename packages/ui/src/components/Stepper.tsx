import { cn } from '../lib/cn';

export interface Step {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
}

export interface StepperProps {
  steps: readonly Step[];
  /** Index (base 0) de l'étape courante. */
  current: number;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

/**
 * Indicateur d'étapes d'un parcours déclaratif.
 *
 * ⚠️ Ne pas confondre avec un composant d'onglets : les étapes sont ordonnées et
 * non cliquables. Le retour en arrière se fait par un bouton dédié dans le parcours,
 * sinon l'utilisateur peut sauter une étape obligatoire.
 *
 * Le numéro et le libellé portent l'information ; la couleur ne fait que la renforcer —
 * les étapes franchies restent lisibles en niveaux de gris.
 */
export function Stepper({ steps, current, orientation = 'horizontal', className }: StepperProps) {
  const total = steps.length;
  const clamped = Math.min(Math.max(current, 0), Math.max(total - 1, 0));

  return (
    <nav aria-label="Progression du formulaire" className={className}>
      <ol
        className={cn(
          'flex',
          orientation === 'horizontal' ? 'flex-row items-start gap-2' : 'flex-col gap-4',
        )}
      >
        {steps.map((step, index) => {
          const done = index < clamped;
          const active = index === clamped;

          return (
            <li
              key={step.id}
              aria-current={active ? 'step' : undefined}
              className={cn(
                'flex',
                orientation === 'horizontal' ? 'min-w-0 flex-1 flex-col gap-2' : 'flex-row gap-3',
              )}
            >
              <div
                className={cn(
                  'flex items-center',
                  orientation === 'horizontal' ? 'w-full gap-2' : 'flex-col gap-2',
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                    'font-display text-caption font-bold tabular-nums',
                    done && 'bg-success-700 text-white',
                    active && 'bg-brand-500 text-white',
                    !done && !active && 'border border-ink-400 bg-white text-ink-500',
                  )}
                >
                  {done ? (
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path d="m5 12.5 4.5 4.5L19 7.5" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </span>

                {orientation === 'horizontal' && index < total - 1 ? (
                  <span
                    aria-hidden="true"
                    className={cn('h-0.5 flex-1 rounded-full', done ? 'bg-success-700' : 'bg-ink-200')}
                  />
                ) : null}
              </div>

              <div className={cn('min-w-0', orientation === 'horizontal' && 'pr-2')}>
                <p
                  className={cn(
                    'text-caption font-bold',
                    active ? 'text-ink-900' : done ? 'text-ink-700' : 'text-ink-500',
                  )}
                >
                  <span className="sr-only">
                    {done ? 'Étape terminée : ' : active ? 'Étape en cours : ' : 'Étape à venir : '}
                  </span>
                  {step.label}
                </p>
                {step.description ? (
                  <p className="mt-0.5 text-caption text-ink-500">{step.description}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
