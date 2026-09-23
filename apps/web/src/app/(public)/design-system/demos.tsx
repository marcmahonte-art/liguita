'use client';

import { useState } from 'react';

import {
  Button,
  Combobox,
  Input,
  OTPInput,
  SearchInput,
  Select,
  Tabs,
  ToastProvider,
  useToast,
  type ComboboxOption,
} from '@liguita/ui';
import { NEIGHBORHOODS } from '@liguita/config';

/**
 * Composants interactifs du design system.
 *
 * Ce fichier est le seul de la vitrine à être marqué `'use client'` : il n'est chargé
 * que pour la section qui a réellement besoin d'état. Le reste de la page est rendu
 * côté serveur et n'expédie aucun JavaScript au navigateur.
 */

/* Les quartiers réels de N'Djamena servent de jeu de données : le filtre du composant
   ignore la casse et les accents (« gardole » trouve « Gardolé »), ce qui compte sur un
   clavier de téléphone. 22 entrées suffisent à démontrer le comportement sans alourdir
   la page ; le référentiel complet (73 types d'objets) est utilisé par les écrans réels. */
const NEIGHBORHOOD_OPTIONS: readonly ComboboxOption[] = NEIGHBORHOODS.map((neighborhood) => ({
  value: neighborhood.slug,
  label: neighborhood.name,
  description: `Arrondissement ${neighborhood.arrondissement}`,
}));

const CITY_OPTIONS = [
  { value: 'ndjamena', label: "N'Djamena" },
  { value: 'moundou', label: 'Moundou' },
  { value: 'abeche', label: 'Abéché' },
  { value: 'sarh', label: 'Sarh' },
];

export function InteractiveDemos() {
  return (
    <ToastProvider>
      <section aria-labelledby="interactif-titre" className="mt-16 border-t border-ink-200 pt-10">
        <h2 id="interactif-titre" className="font-display text-h2 font-bold">
          Composants interactifs
        </h2>
        <p className="mt-2 max-w-[70ch] text-body text-ink-500">
          Seule section de la page à expédier du JavaScript. Les libellés sont toujours
          visibles : un texte indicatif ne remplace jamais un libellé, car il disparaît
          dès la première frappe et n&apos;est pas lu de façon fiable par un lecteur
          d&apos;écran.
        </p>

        <FieldsDemo />
        <TabsDemo />
        <ToastDemo />
      </section>
    </ToastProvider>
  );
}

function FieldsDemo() {
  const [neighborhood, setNeighborhood] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [search, setSearch] = useState('');

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-2">
      <div className="space-y-6">
        <h3 className="font-display text-h3 font-bold">Champs de saisie</h3>

        <Input label="Nom de l'objet" placeholder="Téléphone, sac, clés…" hint="Décrivez l'objet en quelques mots." />

        <Input
          label="Valeur estimée"
          inputMode="numeric"
          placeholder="120 000"
          suffix="FCFA"
          hint="Sert à calculer la classe tarifaire. Restez approximatif."
        />

        <Input
          label="Numéro de téléphone"
          type="tel"
          inputMode="tel"
          defaultValue="+235 66"
          error="Ce numéro ne comporte pas assez de chiffres."
        />

        <Input label="Champ désactivé" defaultValue="Non modifiable" disabled />

        <Select
          label="Ville"
          options={CITY_OPTIONS}
          placeholder="Choisir une ville"
          hint="Seules les villes actives sont proposées."
        />

        <Combobox
          label="Quartier"
          options={NEIGHBORHOOD_OPTIONS}
          value={neighborhood}
          onValueChange={setNeighborhood}
          placeholder="Rechercher un quartier"
          emptyLabel="Aucun quartier ne correspond"
          hint="Essayez « gardole » sans accent : le filtre les ignore."
        />
      </div>

      <div className="space-y-6">
        <h3 className="font-display text-h3 font-bold">Recherche et code SMS</h3>

        <div>
          {/* `SearchInput` ne porte pas de libellé : c'est un champ de recherche, dont
              l'intention est portée par le contexte. On lui rattache donc un libellé
              visible explicite plutôt que de compter sur le texte indicatif. */}
          <label
            htmlFor="demo-recherche"
            className="block font-display text-body font-bold text-ink-900"
          >
            Rechercher une annonce
          </label>
          <SearchInput
            id="demo-recherche"
            className="mt-2"
            placeholder="Écran, carte d'identité…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <p className="mt-2 text-caption text-ink-500">
            {search
              ? `Filtre appliqué : « ${search} »`
              : 'Le filtre ignore la casse et les accents.'}
          </p>
        </div>

        <OTPInput
          value={code}
          onValueChange={setCode}
          label="Code de vérification"
          hint="Six chiffres reçus par SMS. Le collage du code entier est pris en charge."
        />

        <p className="text-caption text-ink-500">
          Le composant ne valide rien : il transmet la chaîne saisie. La vérification du
          code appartient au serveur, jamais au navigateur.
        </p>

        <h3 className="pt-2 font-display text-h3 font-bold">Cibles tactiles</h3>
        <p className="text-body text-ink-500">
          Toutes les cibles font au moins 48 px de haut, y compris les boutons « sm » et
          les cases du code SMS. C&apos;est une exigence d&apos;accessibilité, pas une
          préférence esthétique : à N&apos;Djamena, l&apos;usage se fait à une main, en
          marchant.
        </p>
      </div>
    </div>
  );
}

function TabsDemo() {
  return (
    <div className="mt-10">
      <h3 className="font-display text-h3 font-bold">Onglets</h3>
      <p className="mt-1 text-caption text-ink-500">
        Motif ARIA « tabs » : un seul onglet est dans l&apos;ordre de tabulation, les
        flèches déplacent le focus. Les panneaux inactifs ne sont pas montés — un onglet
        masqué ne doit ni charger de données ni exposer de champs de formulaire.
      </p>

      <div className="mt-4">
        <Tabs
          tabs={[
            {
              id: 'perdus',
              label: 'Objets perdus',
              badge: '3',
              content: (
                <p className="text-body text-ink-500">
                  Les déclarations de perte, visibles par les personnes du même quartier.
                </p>
              ),
            },
            {
              id: 'trouves',
              label: 'Objets trouvés',
              badge: '1',
              content: (
                <p className="text-body text-ink-500">
                  Les objets ramassés, en attente d&apos;un propriétaire.
                </p>
              ),
            },
            {
              id: 'restitues',
              label: 'Restitués',
              content: (
                <p className="text-body text-ink-500">
                  L&apos;historique des restitutions confirmées par les deux parties.
                </p>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

function ToastDemo() {
  const toast = useToast();

  return (
    <div className="mt-10">
      <h3 className="font-display text-h3 font-bold">Notifications</h3>
      <p className="mt-1 text-caption text-ink-500">
        Les tons <code className="font-mono">danger</code> et{' '}
        <code className="font-mono">warning</code> sont annoncés immédiatement au lecteur
        d&apos;écran, les autres poliment. Interrompre la lecture pour une simple
        confirmation rendrait l&apos;interface épuisante.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() => toast.show({ title: 'Annonce enregistrée', tone: 'info' })}
        >
          Information
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toast.show({
              title: 'Annonce publiée',
              description: 'Visible par les personnes de votre quartier.',
              tone: 'success',
            })
          }
        >
          Succès
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toast.show({
              title: 'Référentiel incomplet',
              description: 'Ce quartier sera ajouté après validation locale.',
              tone: 'warning',
            })
          }
        >
          Avertissement
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toast.show({
              title: 'Paiement refusé',
              description: "Aucun montant n'a été débité.",
              tone: 'danger',
              duration: 0,
            })
          }
        >
          Erreur persistante
        </Button>
      </div>
    </div>
  );
}
