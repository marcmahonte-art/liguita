'use client';

import { ChevronDown, LogOut, Settings, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { Avatar, buttonClasses, cn } from '@liguita/ui';

import { useAuth } from '../../lib/auth/auth-context';

/**
 * Menu utilisateur — en-tête public et barre supérieure de l'espace connecté.
 *
 * ⚠️ **Un seul composant pour les deux surfaces.** L'application avait deux menus de
 * compte, chacun avec sa propre fonction de résolution du nom : le premier affichait le
 * numéro de téléphone, le second l'email. Deux surfaces, deux règles, et l'utilisateur
 * voyait son identité changer en changeant de page. Les deux menus lisent désormais
 * `identity` du contexte — la même valeur, au même endroit, avec le même repli.
 *
 * Ce qui s'affiche : `[Avatar] Jean Dupont ▾`. Ni le numéro, ni l'email ne sont
 * l'information principale — ils appartiennent au menu déroulant, où l'on va les
 * chercher, et à la page « Mon profil », où l'on va les corriger.
 */
export interface AccountMenuProps {
  /** Cote auquel le panneau se despleie. L'en-tête public est à gauche, la barre applicative à droite. */
  align?: 'left' | 'right';
  /** Aspect du déclencheur : `outline` sur l'en-tête public, `ghost` dans l'espace connecté. */
  variant?: 'ghost' | 'outline';
  /** Taille de l'avatar du déclencheur. */
  avatarClassName?: string;
  /** Masque le nom sur les écrans étroits — il ne tient pas, et l'avatar suffit. */
  showNameClassName?: string;
  /** Gabarit du squelette de chargement, pour qu'il épouse la largeur du menu réel. */
  loadingClassName?: string;
  /** Ajustement du déclencheur, pour la hauteur propre à chaque coquille. */
  triggerClassName?: string;
}

export function AccountMenu({
  align = 'right',
  variant = 'ghost',
  avatarClassName = 'size-7 text-2xs',
  showNameClassName = 'hidden max-w-32 truncate md:inline',
  loadingClassName = 'h-9 w-24',
  triggerClassName,
}: AccountMenuProps) {
  const { identity, isLoading, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  /* Changer de page referme le menu : sans cela il survit au lien que l'on vient de
     suivre et flotte au-dessus de la nouvelle page. */
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  /* Clic extérieur et Échap referment le menu, sans empiler de calque invisible. */
  useEffect(() => {
    if (!isOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  if (isLoading) {
    return <div className={cn('animate-pulse rounded-lg bg-ink-100', loadingClassName)} aria-hidden="true" />;
  }

  if (!identity) return null;

  async function handleSignOut() {
    await signOut();
    router.push('/');
    router.refresh();
  }

  const name = identity.displayName;
  const sublabel = identity.email ?? identity.phone;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Ouvrir le menu du compte"
        className={cn(buttonClasses({ variant, size: 'sm' }), 'gap-2 !px-1.5', triggerClassName)}
      >
        <Avatar name={name} src={identity.avatarUrl} size="sm" className={avatarClassName} />
        <span className={cn('text-body font-bold text-ink-900', showNameClassName)}>{name}</span>
        <ChevronDown size={16} aria-hidden className="hidden text-ink-400 md:inline" />
      </button>

      {isOpen ? (
        <div
          role="menu"
          className={cn(
            'absolute top-[calc(100%+8px)] z-40 w-64 overflow-hidden rounded-xl border border-ink-200 bg-white p-1 shadow-200',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {/* Identité — le nom d'abord, l'email en second. */}
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <Avatar name={name} src={identity.avatarUrl} size="sm" />
            <div className="min-w-0">
              <p className="truncate font-display text-body font-bold text-ink-950">{name}</p>
              {sublabel ? (
                <p className="truncate text-caption text-ink-500">{sublabel}</p>
              ) : null}
            </div>
          </div>
          <div className="my-1 h-px bg-ink-100" aria-hidden />

          <Link
            href="/app/profil"
            role="menuitem"
            className="flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-body font-bold text-ink-800 transition-colors hover:bg-ink-50"
          >
            <User size={17} aria-hidden />
            Mon profil
          </Link>
          <Link
            href="/app/parametres"
            role="menuitem"
            className="flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-body font-bold text-ink-800 transition-colors hover:bg-ink-50"
          >
            <Settings size={17} aria-hidden />
            Paramètres
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => void handleSignOut()}
            className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 text-left text-body font-bold text-ink-800 transition-colors hover:bg-ink-50"
          >
            <LogOut size={17} aria-hidden />
            Se déconnecter
          </button>
        </div>
      ) : null}
    </div>
  );
}
