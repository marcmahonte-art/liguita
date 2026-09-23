import {
  CreditCard,
  FileText,
  Handshake,
  Search,
  ShieldCheck,
} from 'lucide-react';

const STEPS = [
  {
    number: '01',
    title: 'Déclarez',
    description: 'Décrivez ce que vous avez perdu ou trouvé en quelques clics.',
    icon: FileText,
  },
  {
    number: '02',
    title: 'Liguita cherche',
    description: 'Notre moteur analyse et croise les annonces en temps réel.',
    icon: Search,
  },
  {
    number: '03',
    title: 'Vérifiez',
    description: 'Confirmez votre propriété grâce à des questions précises et sécurisées.',
    icon: ShieldCheck,
  },
  {
    number: '04',
    title: 'Payez',
    description: 'Frais équitables (dès 300 FCFA) réglés par Airtel, Moov ou espèces.',
    icon: CreditCard,
  },
  {
    number: '05',
    title: 'Récupérez',
    description: 'Mise en relation directe avec le trouveur qui reçoit sa récompense.',
    icon: Handshake,
  },
];

export function HowItWorksSection() {
  return (
    <section className="bg-ink-50/50 py-16 sm:py-20">
      <div className="container-liguita">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-extrabold text-ink-950 sm:text-4xl">
            Comment ça marche ?
          </h2>
          <p className="mt-3 text-body-lg text-ink-600">
            Un processus clair, équitable et transparent en 5 étapes.
          </p>
        </div>

        {/* Grille des 5 étapes */}
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="relative flex flex-col items-center rounded-2xl border border-ink-200/80 bg-white p-6 text-center shadow-xs transition hover:border-brand-200 hover:shadow-card"
              >
                {/* Numéro badge */}
                <span className="inline-flex size-7 items-center justify-center rounded-full bg-brand-50 font-display text-caption font-bold text-brand-700">
                  {step.number}
                </span>

                {/* Icône */}
                <div className="mt-4 flex size-12 items-center justify-center rounded-xl bg-ink-50 text-ink-800">
                  <Icon size={24} />
                </div>

                {/* Titre & Description */}
                <h3 className="mt-4 font-display text-body-lg font-bold text-ink-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-caption text-ink-600">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
