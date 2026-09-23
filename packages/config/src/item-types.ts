/**
 * Types d'objets.
 *
 * Le type d'objet est le **discriminant le plus fort** du moteur de correspondance :
 * il pèse 30 points sur 100, et deux déclarations du même type obtiennent la similarité
 * maximale (1,00) contre 0,60 seulement pour une simple catégorie commune.
 *
 * ⚠️ **Chaque catégorie terminale doit avoir au moins un type.** Ce n'est pas une
 * préférence de modélisation, c'est une contrainte arithmétique : sans `itemTypeId`,
 * le signal de type plafonne à 0,60 et le score maximal atteignable tombe à 88 sur 100,
 * sous le seuil de 90 qui déclenche le niveau « très probable ». Une déclaration sans type
 * ne pourrait donc **jamais** produire de notification prioritaire.
 * Le test `src/__tests__/referential.test.ts` vérifie cette couverture.
 */

export interface ItemTypeConfig {
  readonly id: string;
  readonly categoryId: string;
  readonly labelFr: string;
  readonly labelAr?: string;
  /**
   * Classe spécifique au type, si elle diffère de celle de la catégorie.
   * `null` = la classe de la catégorie s'applique.
   */
  readonly defaultClass: 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | null;
  /** Mots-clés d'aide à la recherche, non affichés. */
  readonly keywords: readonly string[];
  readonly sortOrder: number;
}

export const ITEM_TYPES: readonly ItemTypeConfig[] = [
  /* ---------- Documents & cartes ---------- */
  { id: 'cni-biometric', categoryId: 'id-card', labelFr: 'Carte d’identité biométrique', defaultClass: null, keywords: ['cni', 'biometrique', 'ceama'], sortOrder: 10 },
  { id: 'cni-paper', categoryId: 'id-card', labelFr: 'Carte d’identité ancienne (cartonnée)', defaultClass: null, keywords: ['cni', 'cartonnee', 'ancienne'], sortOrder: 20 },
  { id: 'passport-ordinary', categoryId: 'passport', labelFr: 'Passeport ordinaire', defaultClass: null, keywords: ['passeport'], sortOrder: 10 },
  { id: 'passport-service', categoryId: 'passport', labelFr: 'Passeport de service ou diplomatique', defaultClass: null, keywords: ['passeport', 'diplomatique', 'service'], sortOrder: 20 },
  { id: 'license-heavy', categoryId: 'driver-license', labelFr: 'Permis poids lourd (C, D, E)', defaultClass: null, keywords: ['permis', 'poids lourd'], sortOrder: 10 },
  { id: 'license-light', categoryId: 'driver-license', labelFr: 'Permis léger (A, B)', defaultClass: null, keywords: ['permis', 'voiture', 'moto'], sortOrder: 20 },
  { id: 'diploma-certificate', categoryId: 'diploma', labelFr: 'Attestation ou certificat', defaultClass: null, keywords: ['attestation', 'certificat'], sortOrder: 10 },
  { id: 'diploma-degree', categoryId: 'diploma', labelFr: 'Diplôme universitaire', defaultClass: null, keywords: ['diplome', 'licence', 'master'], sortOrder: 20 },
  { id: 'diploma-transcript', categoryId: 'diploma', labelFr: 'Relevé de notes', defaultClass: null, keywords: ['releve', 'notes', 'bulletin'], sortOrder: 30 },
  { id: 'student-card-school', categoryId: 'student-card', labelFr: 'Carte scolaire', defaultClass: null, keywords: ['scolaire', 'eleve'], sortOrder: 10 },
  { id: 'student-card-university', categoryId: 'student-card', labelFr: 'Carte universitaire', defaultClass: null, keywords: ['universitaire', 'etudiant'], sortOrder: 20 },
  { id: 'health-book-child', categoryId: 'health-book', labelFr: 'Carnet de santé enfant', defaultClass: null, keywords: ['carnet', 'enfant', 'vaccination'], sortOrder: 10 },
  { id: 'health-book-adult', categoryId: 'health-book', labelFr: 'Carnet de santé adulte', defaultClass: null, keywords: ['carnet', 'adulte', 'medical'], sortOrder: 20 },

  /* ---------- Effets personnels ---------- */
  { id: 'wallet-fabric', categoryId: 'wallet', labelFr: 'Portefeuille en tissu', defaultClass: null, keywords: ['portefeuille', 'tissu'], sortOrder: 10 },
  { id: 'wallet-leather', categoryId: 'wallet', labelFr: 'Portefeuille en cuir', defaultClass: null, keywords: ['portefeuille', 'cuir'], sortOrder: 20 },
  { id: 'wallet-pouch', categoryId: 'wallet', labelFr: 'Bourse ou pochette', defaultClass: null, keywords: ['bourse', 'pochette'], sortOrder: 30 },
  { id: 'bag-backpack', categoryId: 'bag', labelFr: 'Sac à dos', defaultClass: null, keywords: ['sac a dos', 'cartable'], sortOrder: 10 },
  { id: 'bag-briefcase', categoryId: 'bag', labelFr: 'Serviette ou porte-documents', defaultClass: null, keywords: ['serviette', 'porte documents'], sortOrder: 20 },
  { id: 'bag-handbag', categoryId: 'bag', labelFr: 'Sac à main', defaultClass: null, keywords: ['sac a main'], sortOrder: 30 },
  { id: 'bag-plastic', categoryId: 'bag', labelFr: 'Sac en plastique ou sachet', defaultClass: null, keywords: ['sachet', 'plastique'], sortOrder: 40 },
  { id: 'bag-sport', categoryId: 'bag', labelFr: 'Sac de sport ou de voyage', defaultClass: null, keywords: ['sport', 'voyage'], sortOrder: 50 },
  { id: 'keys-bunch', categoryId: 'keys', labelFr: 'Trousseau de clés', defaultClass: null, keywords: ['trousseau', 'cles'], sortOrder: 10 },
  { id: 'keys-car', categoryId: 'keys', labelFr: 'Clé de véhicule', defaultClass: null, keywords: ['cle', 'voiture', 'moto'], sortOrder: 20 },
  { id: 'keys-house', categoryId: 'keys', labelFr: 'Clé de maison ou de porte', defaultClass: null, keywords: ['cle', 'maison', 'porte'], sortOrder: 30 },
  { id: 'glasses-eyeglasses', categoryId: 'glasses', labelFr: 'Lunettes de vue', defaultClass: null, keywords: ['lunettes', 'vue'], sortOrder: 10 },
  { id: 'glasses-sunglasses', categoryId: 'glasses', labelFr: 'Lunettes de soleil', defaultClass: null, keywords: ['lunettes', 'soleil'], sortOrder: 20 },
  { id: 'clothes-dress', categoryId: 'clothes', labelFr: 'Robe ou ensemble', defaultClass: null, keywords: ['robe', 'ensemble', 'boubou'], sortOrder: 10 },
  { id: 'clothes-jacket', categoryId: 'clothes', labelFr: 'Veste ou manteau', defaultClass: null, keywords: ['veste', 'manteau'], sortOrder: 20 },
  { id: 'clothes-shirt', categoryId: 'clothes', labelFr: 'Chemise ou t-shirt', defaultClass: null, keywords: ['chemise', 'tshirt', 'polo'], sortOrder: 30 },
  { id: 'clothes-shoes', categoryId: 'clothes', labelFr: 'Chaussures', defaultClass: null, keywords: ['chaussures', 'sandales'], sortOrder: 40 },
  { id: 'clothes-trousers', categoryId: 'clothes', labelFr: 'Pantalon', defaultClass: null, keywords: ['pantalon', 'jean'], sortOrder: 50 },
  { id: 'clothes-veil', categoryId: 'clothes', labelFr: 'Voile ou foulard', defaultClass: null, keywords: ['voile', 'foulard', 'hijab'], sortOrder: 60 },
  { id: 'books-holy', categoryId: 'books', labelFr: 'Livre saint (Coran, Bible)', defaultClass: null, keywords: ['coran', 'bible', 'livre saint'], sortOrder: 10 },
  { id: 'books-notebook', categoryId: 'books', labelFr: 'Cahier ou carnet', defaultClass: null, keywords: ['cahier', 'carnet'], sortOrder: 20 },
  { id: 'books-textbook', categoryId: 'books', labelFr: 'Manuel scolaire', defaultClass: null, keywords: ['manuel', 'scolaire', 'livre'], sortOrder: 30 },
  { id: 'fashion-bracelet', categoryId: 'fashion-jewelry', labelFr: 'Bracelet', defaultClass: null, keywords: ['bracelet'], sortOrder: 10 },
  { id: 'fashion-necklace', categoryId: 'fashion-jewelry', labelFr: 'Collier', defaultClass: null, keywords: ['collier'], sortOrder: 20 },
  { id: 'fashion-ring', categoryId: 'fashion-jewelry', labelFr: 'Bague ou boucles d’oreilles', defaultClass: null, keywords: ['bague', 'boucles'], sortOrder: 30 },

  /* ---------- Électronique ---------- */
  { id: 'phone-feature', categoryId: 'phone', labelFr: 'Téléphone à touches', defaultClass: null, keywords: ['touches', 'basique', 'tecno', 'itel'], sortOrder: 10 },
  { id: 'phone-smartphone', categoryId: 'phone', labelFr: 'Smartphone', defaultClass: null, keywords: ['smartphone', 'android', 'tactile'], sortOrder: 20 },
  { id: 'tablet-android', categoryId: 'tablet', labelFr: 'Tablette Android', defaultClass: null, keywords: ['tablette', 'android'], sortOrder: 10 },
  { id: 'tablet-ipad', categoryId: 'tablet', labelFr: 'iPad', defaultClass: null, keywords: ['ipad', 'apple'], sortOrder: 20 },
  { id: 'laptop-macbook', categoryId: 'laptop', labelFr: 'MacBook', defaultClass: null, keywords: ['macbook', 'apple'], sortOrder: 10 },
  { id: 'laptop-windows', categoryId: 'laptop', labelFr: 'Ordinateur Windows', defaultClass: null, keywords: ['ordinateur', 'windows', 'hp', 'dell', 'lenovo'], sortOrder: 20 },
  { id: 'headphones-earbuds', categoryId: 'headphones', labelFr: 'Écouteurs sans fil', defaultClass: null, keywords: ['ecouteurs', 'bluetooth', 'airpods'], sortOrder: 10 },
  { id: 'headphones-over-ear', categoryId: 'headphones', labelFr: 'Casque audio', defaultClass: null, keywords: ['casque', 'audio'], sortOrder: 20 },
  { id: 'smartwatch-apple', categoryId: 'smartwatch', labelFr: 'Apple Watch', defaultClass: null, keywords: ['apple watch'], sortOrder: 10 },
  { id: 'smartwatch-android', categoryId: 'smartwatch', labelFr: 'Montre connectée Android', defaultClass: null, keywords: ['montre', 'connectee'], sortOrder: 20 },
  { id: 'camera-compact', categoryId: 'camera', labelFr: 'Appareil photo compact', defaultClass: null, keywords: ['appareil photo', 'compact'], sortOrder: 10 },
  { id: 'camera-reflex', categoryId: 'camera', labelFr: 'Appareil photo reflex', defaultClass: null, keywords: ['reflex', 'canon', 'nikon'], sortOrder: 20 },
  { id: 'bicycle-child', categoryId: 'bicycle', labelFr: 'Vélo d’enfant', defaultClass: null, keywords: ['velo', 'enfant'], sortOrder: 10 },
  { id: 'bicycle-city', categoryId: 'bicycle', labelFr: 'Vélo de ville', defaultClass: null, keywords: ['velo', 'ville'], sortOrder: 20 },
  { id: 'bicycle-mountain', categoryId: 'bicycle', labelFr: 'Vélo tout-terrain', defaultClass: null, keywords: ['velo', 'vtt'], sortOrder: 30 },

  /* ---------- Objets de valeur ---------- */
  { id: 'phone-iphone', categoryId: 'smartphone-premium', labelFr: 'iPhone', defaultClass: null, keywords: ['iphone', 'apple'], sortOrder: 10 },
  { id: 'phone-premium-android', categoryId: 'smartphone-premium', labelFr: 'Smartphone Android haut de gamme', defaultClass: null, keywords: ['samsung', 'galaxy', 'tecno camon', 'premium'], sortOrder: 20 },
  { id: 'jewelry-gold', categoryId: 'precious-jewelry', labelFr: 'Bijou en or', defaultClass: null, keywords: ['or', 'gold'], sortOrder: 10 },
  { id: 'jewelry-silver', categoryId: 'precious-jewelry', labelFr: 'Bijou en argent', defaultClass: null, keywords: ['argent', 'silver'], sortOrder: 20 },
  { id: 'jewelry-stone', categoryId: 'precious-jewelry', labelFr: 'Bijou avec pierre', defaultClass: null, keywords: ['pierre', 'diamant', 'perle'], sortOrder: 30 },
  { id: 'bag-designer', categoryId: 'designer-bag', labelFr: 'Sac de marque', defaultClass: null, keywords: ['marque', 'luxe'], sortOrder: 10 },
  { id: 'pro-instrument', categoryId: 'pro-equipment', labelFr: 'Instrument professionnel', defaultClass: null, keywords: ['instrument', 'professionnel'], sortOrder: 10 },
  { id: 'pro-machine', categoryId: 'pro-equipment', labelFr: 'Machine ou moteur', defaultClass: null, keywords: ['machine', 'moteur', 'groupe electrogene'], sortOrder: 20 },
  { id: 'pro-tool', categoryId: 'pro-equipment', labelFr: 'Outillage', defaultClass: null, keywords: ['outil', 'outillage'], sortOrder: 30 },
  { id: 'instrument-guitar', categoryId: 'instrument', labelFr: 'Guitare', defaultClass: null, keywords: ['guitare'], sortOrder: 10 },
  { id: 'instrument-percussion', categoryId: 'instrument', labelFr: 'Instrument à percussion', defaultClass: null, keywords: ['tam-tam', 'djembé', 'percussion'], sortOrder: 20 },
  { id: 'instrument-wind', categoryId: 'instrument', labelFr: 'Instrument à vent', defaultClass: null, keywords: ['flute', 'trompette', 'vent'], sortOrder: 30 },

  /* ---------- Cas spéciaux ---------- */
  { id: 'vehicle-car', categoryId: 'vehicle', labelFr: 'Voiture', defaultClass: null, keywords: ['voiture', 'automobile'], sortOrder: 10 },
  { id: 'vehicle-motorcycle', categoryId: 'vehicle', labelFr: 'Moto ou scooter', defaultClass: null, keywords: ['moto', 'scooter'], sortOrder: 20 },
  { id: 'vehicle-tricycle', categoryId: 'vehicle', labelFr: 'Tricycle ou pousse-pousse', defaultClass: null, keywords: ['tricycle', 'pousse pousse', 'keke'], sortOrder: 30 },
  { id: 'vehicle-truck', categoryId: 'vehicle', labelFr: 'Camion ou camionnette', defaultClass: null, keywords: ['camion', 'camionnette'], sortOrder: 40 },
  { id: 'lot-equipment', categoryId: 'business-lot', labelFr: 'Lot de matériel', defaultClass: null, keywords: ['materiel', 'lot'], sortOrder: 10 },
  { id: 'lot-freight', categoryId: 'business-lot', labelFr: 'Colis ou fret', defaultClass: null, keywords: ['colis', 'fret'], sortOrder: 20 },
  { id: 'lot-merchandise', categoryId: 'business-lot', labelFr: 'Lot de marchandises', defaultClass: null, keywords: ['marchandises', 'stock'], sortOrder: 30 },

  /* ---------- Divers ---------- */
  { id: 'other-unknown', categoryId: 'other-item', labelFr: 'Objet non identifié', defaultClass: null, keywords: [], sortOrder: 10 },
] as const;

export function findItemType(id: string): ItemTypeConfig | undefined {
  return ITEM_TYPES.find((itemType) => itemType.id === id);
}

export function itemTypesOf(categoryId: string): readonly ItemTypeConfig[] {
  return ITEM_TYPES.filter((itemType) => itemType.categoryId === categoryId);
}
