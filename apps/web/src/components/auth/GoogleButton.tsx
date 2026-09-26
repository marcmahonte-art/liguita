'use client';

import { buttonClasses, cn } from '@liguita/ui';

/**
 * Bouton « Continuer avec Google ».
 *
 * L'icône est le « G » officiel de Google en SVG inline : ce dessin n'est pas
 * reproductible de mémoire, et une approximation approximative saute aux yeux. Aucune
 * police, aucun script externe — un bouton de connexion ne charge rien de tiers.
 */
function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" className={cn('size-[18px] shrink-0', className)}>
      <path
        fill="#4285F4"
        d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.797 2.715v2.258h2.909c1.703-1.567 2.684-3.878 2.684-6.613Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.181l-2.909-2.258c-.806.54-1.836.859-3.047.859-2.344 0-4.328-1.585-5.037-3.714H.956v2.332A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.963 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.281-1.706V4.962H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.038l3.007-2.332Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.322 0 2.508.454 3.441 1.346l2.581-2.581C13.463.892 11.426 0 9 0A9 9 0 0 0 .956 4.962l3.007 2.332C4.672 5.165 6.656 3.58 9 3.58Z"
      />
    </svg>
  );
}

export interface GoogleButtonProps {
  onClick: () => void;
  disabled?: boolean;
  /** Libellé visible. « Continuer avec Google » plutôt que « Se connecter avec… ». */
  label?: string;
}

/**
 * ⚠️ Le libellé dit « Continuer », pas « Se connecter » : le même bouton sert à
 * l'inscription et à la connexion, et l'utilisateur ne sait pas encore s'il a déjà un
 * compte. Demander « Vous avez déjà un compte ? » avant d'avoir laissé Google répondre
 * serait une question dont la réponse ne l'intéresse pas.
 */
export function GoogleButton({
  onClick,
  disabled = false,
  label = 'Continuer avec Google',
}: GoogleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        buttonClasses({ variant: 'outline', block: true, size: 'lg' }),
        'gap-3 !rounded-xl bg-white',
        disabled ? 'cursor-not-allowed opacity-50' : '',
      )}
    >
      <GoogleMark />
      <span>{label}</span>
    </button>
  );
}

/** Séparateur « ou » entre deux méthodes d'inscription. */
export function AuthDivider({ label = 'ou' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3" role="separator">
      <span className="h-px flex-1 bg-ink-200" />
      <span className="text-caption font-bold text-ink-500">{label}</span>
      <span className="h-px flex-1 bg-ink-200" />
    </div>
  );
}
