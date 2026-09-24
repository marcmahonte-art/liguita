import { Tag } from 'lucide-react';

/**
 * Bannière des étiquettes Liguita.
 *
 * Fond vert très clair et non rose : les étiquettes sont un produit de PROTECTION, et
 * le vert signale l'issue favorable dans toute l'interface. Le rose aurait fait lire
 * cette bannière comme une alerte.
 *
 * Le CTA reste un lien `mailto:` tant que la commande n'est pas branchée. C'est explicite
 * et fonctionnel — mieux qu'un bouton qui ne mènerait nulle part, ou vers une page vide.
 */
export function LiguitaTagsBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-success-50 bg-gradient-to-br from-success-50 to-white p-5 shadow-xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-success-700"
            aria-hidden
          >
            <Tag size={18} />
          </span>
          <div>
            <p className="font-display text-body-lg font-extrabold text-ink-950">
              Étiquettes Liguita
            </p>
            <p className="mt-1 text-body-sm text-ink-600">
              Protégez vos objets avec nos QR codes anti-perte.
            </p>
          </div>
        </div>
        <a
          href="mailto:contact@liguita.com?subject=Commande étiquettes"
          id="etiquettes-cta"
          className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full bg-ink-950 px-4 text-body-sm font-bold text-white transition hover:bg-ink-800"
        >
          Commander
        </a>
      </div>
    </div>
  );
}
