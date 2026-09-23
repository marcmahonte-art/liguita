import type { ReactNode } from 'react';

import { cn } from '../lib/cn';

export function Table({
  children,
  className,
  caption,
}: {
  children: ReactNode;
  className?: string;
  /** Décrit le tableau pour les lecteurs d'écran. Visuellement masqué. */
  caption?: string;
}) {
  return (
    <div className={cn('w-full overflow-x-auto rounded-xl border border-ink-200', className)}>
      <table className="w-full border-collapse text-left">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="bg-ink-50">{children}</thead>;
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-ink-100">{children}</tbody>;
}

export function TR({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <tr
      className={cn(onClick && 'cursor-pointer hover:bg-ink-50', className)}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

export function TH({
  children,
  align = 'left',
  className,
}: {
  children: ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        'whitespace-nowrap px-4 py-3 text-overline uppercase text-ink-500',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TD({
  children,
  align = 'left',
  className,
}: {
  children: ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}) {
  return (
    <td
      className={cn(
        'px-4 py-3 text-body text-ink-900',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </td>
  );
}

export interface Column<T> {
  readonly key: string;
  readonly header: ReactNode;
  readonly render: (row: T) => ReactNode;
  readonly align?: 'left' | 'right' | 'center';
  /** Masque la colonne sous 768 px : sur mobile, une colonne de trop rend le tableau illisible. */
  readonly hideOnMobile?: boolean;
}

export interface DataTableProps<T> {
  columns: readonly Column<T>[];
  rows: readonly T[];
  getRowKey: (row: T) => string;
  caption?: string;
  empty?: ReactNode;
  className?: string;
}

/**
 * Tableau de données.
 *
 * ⚠️ Défilement horizontal plutôt que réduction des colonnes : les montants doivent
 * rester lisibles en entier, jamais tronqués. Sur mobile, les colonnes secondaires
 * sont retirées via `hideOnMobile`, l'information essentielle restant toujours visible.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  caption,
  empty,
  className,
}: DataTableProps<T>) {
  if (rows.length === 0 && empty) return <>{empty}</>;

  return (
    <Table caption={caption} className={className}>
      <THead>
        <tr>
          {columns.map((column) => (
            <TH
              key={column.key}
              align={column.align}
              className={column.hideOnMobile ? 'hidden md:table-cell' : undefined}
            >
              {column.header}
            </TH>
          ))}
        </tr>
      </THead>
      <TBody>
        {rows.map((row) => (
          <TR key={getRowKey(row)}>
            {columns.map((column) => (
              <TD
                key={column.key}
                align={column.align}
                className={column.hideOnMobile ? 'hidden md:table-cell' : undefined}
              >
                {column.render(row)}
              </TD>
            ))}
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
