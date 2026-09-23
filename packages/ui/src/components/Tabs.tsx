'use client';

import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';

import { cn } from '../lib/cn';

export interface TabItem {
  readonly id: string;
  readonly label: string;
  readonly content: ReactNode;
  /** Compteur ou badge accolé au libellé (« 12 résultats »). */
  readonly badge?: ReactNode;
}

export interface TabsProps {
  tabs: readonly TabItem[];
  /** Onglet actif au premier rendu. Par défaut, le premier. */
  defaultTabId?: string;
  className?: string;
}

/**
 * Onglets.
 *
 * Implémentation conforme au motif ARIA « tabs » : un seul onglet est dans l'ordre de
 * tabulation (`tabIndex` mobile), les flèches déplacent le focus et l'activation.
 * Les panneaux inactifs ne sont pas montés — un onglet masqué ne doit pas continuer
 * à charger des données ni à exposer des champs de formulaire.
 */
export function Tabs({ tabs, defaultTabId, className }: TabsProps) {
  const baseId = useId();
  const [activeId, setActiveId] = useState(defaultTabId ?? tabs[0]?.id ?? '');
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  if (!active) return null;

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = tabs.findIndex((tab) => tab.id === active?.id);
    if (index < 0) return;

    let nextIndex: number;
    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (index + 1) % tabs.length;
        break;
      case 'ArrowLeft':
        nextIndex = (index - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const next = tabs[nextIndex];
    if (!next) return;

    setActiveId(next.id);
    document.getElementById(`${baseId}-tab-${next.id}`)?.focus();
  }

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label="Sections"
        onKeyDown={handleKeyDown}
        className="flex gap-1 overflow-x-auto border-b border-ink-200"
      >
        {tabs.map((tab) => {
          const selected = tab.id === active.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveId(tab.id)}
              className={cn(
                'inline-flex min-h-[48px] shrink-0 items-center gap-2 whitespace-nowrap px-4',
                'font-display text-body font-bold',
                'border-b-2 -mb-px transition-colors duration-150',
                'focus-visible:outline-none focus-visible:shadow-focus',
                selected
                  ? 'border-brand-500 text-ink-900'
                  : 'border-transparent text-ink-500 hover:text-ink-900',
              )}
            >
              {tab.label}
              {tab.badge}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel-${active.id}`}
        aria-labelledby={`${baseId}-tab-${active.id}`}
        tabIndex={0}
        className="pt-6 focus-visible:outline-none"
      >
        {active.content}
      </div>
    </div>
  );
}
