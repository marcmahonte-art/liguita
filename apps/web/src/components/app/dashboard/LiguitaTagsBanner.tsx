export function LiguitaTagsBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-5 shadow-xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-body-lg font-extrabold text-ink-950">
            🏷️ Étiquettes Liguita
          </p>
          <p className="mt-1 text-body-sm text-ink-600">
            Protégez vos objets avec nos QR codes anti-perte.
          </p>
        </div>
        <a
          href="mailto:contact@liguita.com?subject=Commande étiquettes"
          id="etiquettes-cta"
          className="inline-flex items-center gap-2 rounded-xl bg-ink-950 px-4 py-2.5 text-body-sm font-bold text-white transition hover:bg-ink-800"
        >
          Commander →
        </a>
      </div>
    </div>
  );
}
