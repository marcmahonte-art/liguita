import Link from 'next/link';

import { buttonClasses } from '@liguita/ui';

export function ComingSoon({
  title,
  description,
  backHref = '/',
}: {
  title: string;
  description: string;
  backHref?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-5 py-10 text-center">
      <h1 className="font-display text-2xl font-extrabold text-ink-950 sm:text-3xl">{title}</h1>
      <p className="text-body text-ink-600">{description}</p>
      <Link href={backHref} className={buttonClasses({ variant: 'primary' })}>
        Retour
      </Link>
    </div>
  );
}
