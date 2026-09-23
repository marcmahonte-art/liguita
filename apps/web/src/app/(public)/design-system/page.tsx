import type { ReactNode } from 'react';

import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  ClassBadge,
  DataTable,
  EmptyState,
  Money,
  PriceQuoteCard,
  Skeleton,
  SkeletonText,
  Stepper,
  type Column,
} from '@liguita/ui';
import {
  BORDER_DECORATIVE,
  BORDER_INTERACTIVE,
  LOGO_RED,
  borderRadius,
  boxShadow,
  brand,
  breakpoints,
  contrastRatio,
  danger,
  fontSize,
  formatRatio,
  info,
  ink,
  spacing,
  success,
  warning,
} from '@liguita/ui';
import { CLASS_ORDER, PRICING_RULE_V1, computeFee, type PricingClass } from '@liguita/core/pricing';
import { LEAF_CATEGORIES, type CategoryConfig } from '@liguita/config';

import { InteractiveDemos } from './demos';

export const metadata = {
  title: 'Design system',
  description: 'Jetons, contrastes mesurés et composants du design system Liguita.',
};

/**
 * Vitrine du design system.
 *
 * Cette page est exigée par la Definition of Done du Sprint 0 :
 * « `/design-system` affiche les tokens ».
 *
 * ⚠️ Les ratios de contraste ne sont PAS recopiés à la main. Ils sont calculés au rendu
 * par `contrastRatio` sur les jetons réellement importés. Une documentation qui recopie
 * des valeurs mesurées dérive dès la première modification de palette ; ici, changer
 * `tokens.ts` change la page, et le test de parité fait échouer la CI si la valeur n'est
 * plus conforme.
 *
 * La page est rendue côté serveur : elle n'expédie aucun JavaScript, sauf pour les
 * composants réellement interactifs (section « Composants interactifs »).
 */
export default function DesignSystemPage() {
  return (
    <div className="container-liguita py-12">
      <header className="max-w-[70ch]">
        <p className="font-display text-overline font-bold uppercase text-brand-700">
          Référence visuelle
        </p>
        <h1 className="mt-3 font-display text-h1 font-extrabold">Design system Liguita</h1>
        <p className="mt-4 text-body-lg text-ink-500">
          Jetons, échelle typographique, contrastes mesurés et composants. Tout ce qui suit
          provient de <code className="font-mono text-caption">@liguita/ui</code> : cette
          page ne redéfinit aucune valeur, elle les montre.
        </p>
      </header>

      <ColorSection />
      <ContrastSection />
      <TypographySection />
      <LayoutSection />
      <StaticComponentsSection />
      <InteractiveDemos />
      <PricingSection />
    </div>
  );
}

/* ========================================================================== */
/* Section — Couleur                                                          */
/* ========================================================================== */

function ColorSection() {
  return (
    <Section
      id="couleur"
      title="Couleur"
      intro={
        <>
          La rampe de marque est construite autour de <code className="font-mono text-caption">brand.500</code>,
          retenu comme rouge d&apos;interface parce qu&apos;il atteint 4,76:1 sur blanc. Le rouge
          réel du logo ({LOGO_RED}) n&apos;atteint que 4,36:1 : il reste réservé à l&apos;image de
          marque et ne porte jamais de texte.
        </>
      }
    >
      <h3 className="mt-8 font-display text-h3 font-bold">Marque</h3>
      <SwatchRow scale={brand} />

      <h3 className="mt-8 font-display text-h3 font-bold">Neutres</h3>
      <SwatchRow scale={ink} />

      <h3 className="mt-8 font-display text-h3 font-bold">Sémantique</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SemanticSwatch name="success" scale={success} />
        <SemanticSwatch name="warning" scale={warning} />
        <SemanticSwatch name="danger" scale={danger} />
        <SemanticSwatch name="info" scale={info} />
      </div>
    </Section>
  );
}

function SwatchRow({ scale }: { scale: Record<string, string> }) {
  const entries = Object.entries(scale);
  return (
    <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5 lg:grid-cols-10">
      {entries.map(([step, hex]) => (
        <li key={step}>
          <div
            className="h-16 rounded-lg border border-ink-200"
            style={{ backgroundColor: hex }}
            aria-hidden
          />
          <p className="mt-2 font-display text-caption font-bold">{step}</p>
          <p className="font-mono text-caption text-ink-500">{hex.toUpperCase()}</p>
        </li>
      ))}
    </ul>
  );
}

function SemanticSwatch({ name, scale }: { name: string; scale: Record<string, string> }) {
  return (
    <Card variant="flat" padding="compact">
      <p className="font-display text-body font-bold capitalize">{name}</p>
      <ul className="mt-3 space-y-2">
        {Object.entries(scale).map(([step, hex]) => (
          <li key={step} className="flex items-center gap-3">
            <span
              className="size-6 shrink-0 rounded-md border border-ink-200"
              style={{ backgroundColor: hex }}
              aria-hidden
            />
            <span className="font-mono text-caption text-ink-500">
              {step} · {hex.toUpperCase()}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ========================================================================== */
/* Section — Contrastes mesurés                                               */
/* ========================================================================== */

type ContrastKind = 'text' | 'large-text' | 'ui' | 'decorative';

interface ContrastCase {
  readonly label: string;
  readonly fg: string;
  readonly bg: string;
  readonly kind: ContrastKind;
  readonly note: string;
}

const TEXT = 4.5;
const LARGE = 3;
const UI = 3;

/**
 * Couples de couleurs réellement utilisés dans l'interface.
 *
 * Les cas « à ne pas faire » sont présents volontairement : une table de contrastes qui
 * ne liste que les cas conformes ne dit rien de ce qui est interdit.
 */
const CONTRAST_CASES: readonly ContrastCase[] = [
  { label: 'Texte principal', fg: ink[900], bg: ink[0], kind: 'text', note: 'Corps de texte et titres' },
  { label: 'Texte secondaire', fg: ink[500], bg: ink[0], kind: 'text', note: 'Descriptions, aides' },
  { label: 'Placeholder', fg: ink[500], bg: ink[0], kind: 'text', note: 'Texte indicatif de champ' },
  { label: 'Blanc sur marque', fg: ink[0], bg: brand[500], kind: 'text', note: 'Bouton principal' },
  { label: 'Marque 700 sur marque 50', fg: brand[700], bg: brand[50], kind: 'text', note: 'Badge « Perdu »' },
  { label: 'Succès 700 sur succès 50', fg: success[700], bg: success[50], kind: 'text', note: 'Badge « Trouvé »' },
  { label: 'Alerte 700 sur alerte 50', fg: warning[700], bg: warning[50], kind: 'text', note: 'Badge « En attente »' },
  { label: 'Danger 700 sur danger 50', fg: danger[700], bg: danger[50], kind: 'text', note: 'Message d\u2019erreur' },
  { label: 'Info 700 sur info 50', fg: info[700], bg: info[50], kind: 'text', note: 'Message d\u2019information' },
  { label: 'Bordure de composant', fg: BORDER_INTERACTIVE, bg: ink[0], kind: 'ui', note: 'Champ, bouton secondaire' },
  { label: 'Titre large', fg: brand[500], bg: ink[0], kind: 'large-text', note: 'Chiffres du tableau de bord' },
  { label: 'Bordure décorative', fg: BORDER_DECORATIVE, bg: ink[0], kind: 'decorative', note: 'Séparateur, contour de carte' },
  { label: 'Texte désactivé', fg: ink[400], bg: ink[0], kind: 'decorative', note: 'Exempté (SC 1.4.3)' },
  { label: 'Rouge brut du logo', fg: LOGO_RED, bg: ink[0], kind: 'text', note: 'Interdit au texte et aux boutons' },
  { label: 'Ink 300 en bordure', fg: ink[300], bg: ink[0], kind: 'ui', note: 'Interdit : insuffisant' },
];

function ContrastSection() {
  return (
    <Section
      id="contraste"
      title="Contrastes mesurés"
      intro={
        <>
          Ratios calculés au rendu selon la formule de luminance relative de WCAG 2.2.
          Seuils : {TEXT}:1 pour le texte (SC 1.4.3), {UI}:1 pour les composants
          d&apos;interface (SC 1.4.11). Les composants inactifs en sont exemptés.
        </>
      }
    >
      <div className="table-scroll mt-6">
        <table className="w-full border-collapse text-body">
          <caption className="sr-only">
            Ratios de contraste mesurés entre les couleurs du design system
          </caption>
          <thead>
            <tr className="border-b border-ink-200 text-left">
              <th scope="col" className="py-3 pr-4 font-display text-caption font-bold uppercase text-ink-500">
                Usage
              </th>
              <th scope="col" className="py-3 pr-4 font-display text-caption font-bold uppercase text-ink-500">
                Aperçu
              </th>
              <th scope="col" className="py-3 pr-4 font-display text-caption font-bold uppercase text-ink-500">
                Ratio
              </th>
              <th scope="col" className="py-3 pr-4 font-display text-caption font-bold uppercase text-ink-500">
                Seuil
              </th>
              <th scope="col" className="py-3 font-display text-caption font-bold uppercase text-ink-500">
                Verdict
              </th>
            </tr>
          </thead>
          <tbody>
            {CONTRAST_CASES.map((item) => {
              const ratio = contrastRatio(item.fg, item.bg);
              const threshold =
                item.kind === 'text' ? TEXT : item.kind === 'large-text' ? LARGE : item.kind === 'ui' ? UI : null;
              const passes = threshold === null ? true : ratio >= threshold;
              return (
                <tr key={item.label} className="border-b border-ink-100 align-middle">
                  <th scope="row" className="py-3 pr-4 text-left font-normal">
                    <span className="font-bold">{item.label}</span>
                    <span className="block text-caption text-ink-500">{item.note}</span>
                  </th>
                  <td className="py-3 pr-4">
                    <span
                      className="inline-flex h-9 min-w-[72px] items-center justify-center rounded-lg border border-ink-200 px-3 text-caption font-bold"
                      style={{ color: item.fg, backgroundColor: item.bg }}
                    >
                      Aa 1 200
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-mono tabular text-caption">{formatRatio(ratio)}</td>
                  <td className="py-3 pr-4 font-mono text-caption text-ink-500">
                    {threshold === null ? '—' : `${threshold}:1`}
                  </td>
                  <td className="py-3">
                    <Badge tone={passes ? 'found' : 'lost'} dot>
                      {passes ? (threshold === null ? 'Exempté' : 'Conforme') : 'Non conforme'}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

/* ========================================================================== */
/* Section — Typographie                                                      */
/* ========================================================================== */

function TypographySection() {
  const samples = Object.entries(fontSize);
  return (
    <Section
      id="typographie"
      title="Typographie"
      intro={
        <>
          Échelle fluide en <code className="font-mono text-caption">clamp()</code> : les
          bornes basses viennent de la maquette mobile, les hautes des planches desktop.
          Aucune media query typographique, donc aucune taille intermédiaire cassée.
        </>
      }
    >
      <ul className="mt-6 divide-y divide-ink-100 border-y border-ink-200">
        {samples.map(([name, value]) => (
          <li key={name} className="grid gap-2 py-4 md:grid-cols-[180px_1fr] md:items-baseline">
            <div>
              <p className="font-display text-caption font-bold">{name}</p>
              <p className="font-mono text-caption text-ink-500">{value}</p>
            </div>
            <p
              className={name.startsWith('money') || name === 'display' || name.startsWith('h') ? 'font-display' : 'font-body'}
              style={{ fontSize: value }}
            >
              Objet retrouvé à N&apos;Djamena
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card variant="flat" padding="compact">
          <p className="font-display text-caption font-bold uppercase text-ink-500">Plus Jakarta Sans</p>
          <p className="mt-2 font-display text-h2 font-extrabold">Titres et boutons</p>
          <p className="mt-1 text-caption text-ink-500">
            27 Ko, police variable de 400 à 800. Servie localement.
          </p>
        </Card>
        <Card variant="flat" padding="compact">
          <p className="font-display text-caption font-bold uppercase text-ink-500">Inter</p>
          <p className="mt-2 font-body text-h2">Texte courant</p>
          <p className="mt-1 text-caption text-ink-500">
            47 Ko, police variable de 400 à 700. Servie localement.
          </p>
        </Card>
      </div>
    </Section>
  );
}

/* ========================================================================== */
/* Section — Mise en page                                                     */
/* ========================================================================== */

function LayoutSection() {
  return (
    <Section id="mise-en-page" title="Espacement, rayons et ombres">
      <h3 className="mt-8 font-display text-h3 font-bold">Espacement (base 4 px)</h3>
      <ul className="mt-4 space-y-2">
        {Object.entries(spacing).map(([step, value]) => (
          <li key={step} className="flex items-center gap-4">
            <span className="w-12 font-mono text-caption text-ink-500">{step}</span>
            <span className="h-3 rounded-sm bg-brand-200" style={{ width: value }} aria-hidden />
            <span className="font-mono text-caption text-ink-500">{value}</span>
          </li>
        ))}
      </ul>

      <h3 className="mt-8 font-display text-h3 font-bold">Rayons</h3>
      <ul className="mt-4 flex flex-wrap gap-4">
        {Object.entries(borderRadius).map(([name, value]) => (
          <li key={name} className="text-center">
            <span
              className="block size-16 border-2 border-ink-400 bg-ink-50"
              style={{ borderRadius: value }}
              aria-hidden
            />
            <span className="mt-2 block font-mono text-caption text-ink-500">{name}</span>
          </li>
        ))}
      </ul>

      <h3 className="mt-8 font-display text-h3 font-bold">Ombres</h3>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(boxShadow).map(([name, value]) => (
          <li key={name}>
            <span className="block h-20 rounded-xl bg-white" style={{ boxShadow: value }} aria-hidden />
            <span className="mt-2 block font-mono text-caption text-ink-500">{name}</span>
          </li>
        ))}
      </ul>

      <h3 className="mt-8 font-display text-h3 font-bold">Points de rupture</h3>
      <ul className="mt-4 flex flex-wrap gap-3">
        {Object.entries(breakpoints).map(([name, value]) => (
          <li key={name}>
            <Badge tone="outline">
              {name} · {value}
            </Badge>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* ========================================================================== */
/* Section — Composants statiques                                             */
/* ========================================================================== */

function StaticComponentsSection() {
  return (
    <Section id="composants" title="Composants">
      <h3 className="mt-8 font-display text-h3 font-bold">Boutons</h3>
      <p className="mt-1 text-caption text-ink-500">
        Hauteur minimale de 48 px pour toutes les tailles, y compris « sm ». C&apos;est une
        exigence d&apos;accessibilité tactile, pas une préférence esthétique.
      </p>
      <div className="mt-4 space-y-4">
        {(['sm', 'md', 'lg'] as const).map((size) => (
          <div key={size} className="flex flex-wrap items-center gap-3">
            <span className="w-8 font-mono text-caption text-ink-500">{size}</span>
            <Button size={size} variant="primary">
              Publier une annonce
            </Button>
            <Button size={size} variant="secondary">
              Secondaire
            </Button>
            <Button size={size} variant="outline">
              Contour
            </Button>
            <Button size={size} variant="ghost">
              Discret
            </Button>
            <Button size={size} variant="danger">
              Signaler
            </Button>
            <Button size={size} variant="success">
              Confirmer
            </Button>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <span className="w-8 font-mono text-caption text-ink-500">—</span>
          <Button variant="primary" disabled>
            Désactivé
          </Button>
          <Button variant="outline" disabled>
            Désactivé
          </Button>
          <Button variant="primary" block className="max-w-[280px]">
            Pleine largeur
          </Button>
        </div>
      </div>

      <h3 className="mt-10 font-display text-h3 font-bold">Badges</h3>
      <div className="mt-4 flex flex-wrap gap-3">
        <Badge tone="lost" dot>
          Perdu
        </Badge>
        <Badge tone="found" dot>
          Trouvé
        </Badge>
        <Badge tone="pending" dot>
          En attente
        </Badge>
        <Badge tone="neutral">Brouillon</Badge>
        <Badge tone="dark">Restitué</Badge>
        <Badge tone="outline">Filtre actif</Badge>
        <Badge tone="urgent">Urgent</Badge>
      </div>

      <h3 className="mt-10 font-display text-h3 font-bold">Classes tarifaires</h3>
      <div className="mt-4 flex flex-wrap gap-3">
        {CLASS_ORDER.map((pricingClass) => (
          <ClassBadge key={pricingClass} pricingClass={pricingClass} />
        ))}
      </div>

      <h3 className="mt-10 font-display text-h3 font-bold">Alertes</h3>
      <div className="mt-4 space-y-3">
        <Alert tone="info" title="Vérifiez le numéro de série">
          Le numéro figure sous la batterie sur la plupart des téléphones.
        </Alert>
        <Alert tone="success" title="Annonce publiée">
          Elle est visible par les personnes de votre quartier.
        </Alert>
        <Alert tone="warning" title="Référentiel à valider">
          Les 22 quartiers de N&apos;Djamena n&apos;ont pas encore été confrontés à un
          habitant de la ville.
        </Alert>
        <Alert tone="danger" title="Paiement refusé">
          Aucun montant n&apos;a été débité. Vous pouvez réessayer.
        </Alert>
      </div>

      <h3 className="mt-10 font-display text-h3 font-bold">Cartes</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Card variant="flat">
          <CardHeader title="Plate" tag="Défaut" />
          <p className="mt-3 text-body text-ink-500">Contour seul, sans élévation.</p>
        </Card>
        <Card variant="elevated">
          <CardHeader title="Surélevée" tag="Focus" />
          <p className="mt-3 text-body text-ink-500">Pour l&apos;élément central d&apos;un écran.</p>
        </Card>
        <Card variant="interactive">
          <CardHeader title="Interactive" tag="Cliquable" />
          <p className="mt-3 text-body text-ink-500">Réservée aux cartes réellement cliquables.</p>
        </Card>
      </div>

      <h3 className="mt-10 font-display text-h3 font-bold">Montants</h3>
      <p className="mt-1 text-caption text-ink-500">
        Chiffres à largeur fixe (<code className="font-mono">tabular-nums</code>) : sans cela,
        les colonnes de montants dansent d&apos;une ligne à l&apos;autre. Toujours suffixés
        « FCFA », jamais « XAF ».
      </p>
      <div className="mt-4 flex flex-wrap items-baseline gap-6">
        <Money amount={300} size="sm" />
        <Money amount={1200} size="md" />
        <Money amount={3000} size="lg" />
        <Money amount={25000} size="xl" />
        <Money amount={5000} size="md" signed />
      </div>

      <h3 className="mt-10 font-display text-h3 font-bold">Étapes</h3>
      <div className="mt-4">
        <Stepper
          current={1}
          steps={[
            { id: 'objet', label: "L'objet", description: 'Catégorie et description' },
            { id: 'lieu', label: 'Le lieu', description: 'Quartier et repère' },
            { id: 'contact', label: 'Le contact', description: 'Téléphone à joindre' },
            { id: 'paiement', label: 'Le paiement', description: 'Frais de mise en relation' },
          ]}
        />
      </div>

      <h3 className="mt-10 font-display text-h3 font-bold">Avatars</h3>
      <div className="mt-4 flex items-center gap-4">
        <Avatar name="Mariam Abdelkerim" size="sm" />
        <Avatar name="Mariam Abdelkerim" size="md" />
        <Avatar name="Mariam Abdelkerim" size="lg" />
        <Avatar name="Youssouf" size="md" />
      </div>
      <p className="mt-2 text-caption text-ink-500">
        La couleur de fond est dérivée du nom par hachage : le même nom donne toujours la
        même couleur, sans stockage ni tirage aléatoire au rendu.
      </p>

      <h3 className="mt-10 font-display text-h3 font-bold">Chargement</h3>
      <p className="mt-1 text-caption text-ink-500">
        Une ossature reproduit la forme du contenu attendu, jamais un rectangle générique :
        c&apos;est ce qui évite le saut de mise en page à l&apos;arrivée des données.
      </p>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <Skeleton variant="text" className="h-6 w-2/3" />
          <SkeletonText lines={3} />
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton variant="circle" />
            <Skeleton variant="text" className="w-1/2" />
          </div>
          <Skeleton variant="rect" className="h-32 w-full" />
        </div>
      </div>

      <h3 className="mt-10 font-display text-h3 font-bold">État vide</h3>
      <div className="mt-4">
        <EmptyState
          title="Aucune annonce dans ce quartier"
          description="Élargissez la recherche à toute la ville : les annonces sont peu nombreuses au démarrage."
          action={<Button variant="outline">Élargir à N&apos;Djamena</Button>}
        />
      </div>

      <h3 className="mt-10 font-display text-h3 font-bold">Tableau</h3>
      <div className="mt-4">
        <DataTable
          caption="Exemples de déclarations"
          columns={SAMPLE_COLUMNS}
          rows={SAMPLE_ROWS}
          getRowKey={(row) => row.id}
        />
      </div>
    </Section>
  );
}

interface SampleRow {
  readonly id: string;
  readonly object: string;
  readonly place: string;
  readonly status: string;
  readonly reward: number;
}

const SAMPLE_COLUMNS: readonly Column<SampleRow>[] = [
  { key: 'object', header: 'Objet', render: (row) => row.object },
  { key: 'place', header: 'Lieu', render: (row) => row.place, hideOnMobile: true },
  { key: 'status', header: 'Statut', render: (row) => <Badge tone="pending">{row.status}</Badge> },
  {
    key: 'reward',
    header: 'Récompense',
    align: 'right',
    render: (row) => <Money amount={row.reward} size="sm" />,
  },
];

const SAMPLE_ROWS: readonly SampleRow[] = [
  { id: '1', object: 'Téléphone Tecno Spark', place: 'Marché central', status: 'En attente', reward: 400 },
  { id: '2', object: "Carte d'identité", place: 'Quartier Moursal', status: 'En attente', reward: 100 },
  { id: '3', object: 'Sac à main noir', place: 'Avenue Charles de Gaulle', status: 'Restitué', reward: 250 },
];

/* ========================================================================== */
/* Section — Tarification                                                     */
/* ========================================================================== */

/**
 * Exemples de tarification calculés à la volée.
 *
 * On sélectionne la première catégorie feuille de chaque classe dans le référentiel réel,
 * plutôt que d'écrire des identifiants à la main : si une catégorie est renommée ou
 * retirée, la page continue de fonctionner au lieu de lever une erreur au build.
 */
function buildPricingExamples() {
  const byClass = new Map<PricingClass, CategoryConfig>();
  for (const category of LEAF_CATEGORIES) {
    if (!byClass.has(category.defaultClass)) byClass.set(category.defaultClass, category);
  }

  return CLASS_ORDER.flatMap((pricingClass) => {
    const category = byClass.get(pricingClass);
    if (!category) return [];

    /* La classe C5 se calcule sur la valeur déclarée : on déclare 500 000 FCFA, ce qui
       donne 5 000 FCFA de frais — le plancher de la grille. */
    const declaredValueXaf = pricingClass === 'C5' ? 500_000 : null;

    try {
      const quote = computeFee({
        rule: PRICING_RULE_V1,
        category: { id: category.id, defaultClass: category.defaultClass, maxValueXaf: category.maxValueXaf },
        declaredValueXaf,
      });
      return [{ category, quote }];
    } catch {
      return [];
    }
  });
}

function PricingSection() {
  const examples = buildPricingExamples();
  const detailed = examples.find((entry) => entry.quote.pricingClass === 'C3') ?? examples[0];

  return (
    <Section
      id="tarification"
      title="Tarification"
      intro={
        <>
          Grille {PRICING_RULE_V1.id}, version {PRICING_RULE_V1.version}, pays{' '}
          {PRICING_RULE_V1.countryCode}. TVA de {Math.round(PRICING_RULE_V1.vatRate * 100)} %
          extraite de la commission, qui est affichée hors taxes. Les montants ci-dessous
          sont calculés par le moteur au rendu de la page.
        </>
      }
    >
      <div className="table-scroll mt-6">
        <table className="w-full border-collapse text-body">
          <caption className="sr-only">Frais de base et récompense par classe tarifaire</caption>
          <thead>
            <tr className="border-b border-ink-200 text-left">
              <th scope="col" className="py-3 pr-4 font-display text-caption font-bold uppercase text-ink-500">
                Classe
              </th>
              <th scope="col" className="py-3 pr-4 font-display text-caption font-bold uppercase text-ink-500">
                Catégorie d&apos;exemple
              </th>
              <th scope="col" className="py-3 pr-4 text-right font-display text-caption font-bold uppercase text-ink-500">
                Frais de base
              </th>
              <th scope="col" className="py-3 pr-4 text-right font-display text-caption font-bold uppercase text-ink-500">
                Récompense
              </th>
              <th scope="col" className="py-3 text-right font-display text-caption font-bold uppercase text-ink-500">
                Commission
              </th>
            </tr>
          </thead>
          <tbody>
            {examples.map(({ category, quote }) => (
              <tr key={quote.pricingClass} className="border-b border-ink-100">
                <th scope="row" className="py-3 pr-4 text-left">
                  <ClassBadge pricingClass={quote.pricingClass} />
                </th>
                <td className="py-3 pr-4">{category.labelFr}</td>
                <td className="py-3 pr-4 text-right tabular">
                  <Money amount={quote.baseFee} size="sm" />
                </td>
                <td className="py-3 pr-4 text-right tabular">
                  <Money amount={quote.rewardAmount} size="sm" />
                </td>
                <td className="py-3 text-right tabular">
                  <Money amount={quote.liguitaCommission} size="sm" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detailed ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <PriceQuoteCard quote={detailed.quote} />
          <div className="text-body text-ink-500">
            <h3 className="font-display text-h3 font-bold text-ink-900">Règles affichées</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                Le détail est toujours visible <strong>avant</strong> le paiement : aucun
                frais caché, aucune surprise au moment du règlement.
              </li>
              <li>
                Le montant reversé au trouveur est affiché en clair. C&apos;est ce qui
                motive la communauté à déclarer les objets trouvés, et donc ce qui fait
                fonctionner la plateforme.
              </li>
              <li>
                Un devis est figé : il porte la version de grille appliquée et ne change
                plus, même si la grille évolue ensuite.
              </li>
              <li>
                Le composant reçoit un décompte déjà calculé et ne recalcule rien lui-même.
                Une seule source de vérité pour les montants : le moteur.
              </li>
            </ul>
          </div>
        </div>
      ) : null}
    </Section>
  );
}

/* ========================================================================== */
/* Gabarit de section                                                         */
/* ========================================================================== */

function Section({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-titre`} className="mt-16 border-t border-ink-200 pt-10">
      <h2 id={`${id}-titre`} className="font-display text-h2 font-bold">
        {title}
      </h2>
      {intro ? <p className="mt-2 max-w-[70ch] text-body text-ink-500">{intro}</p> : null}
      {children}
    </section>
  );
}
