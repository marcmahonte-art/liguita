export type PaymentProviderCode = 'CASH' | 'AIRTEL' | 'MOOV';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';

/**
 * Nature de l'encaissement.
 *
 * ⚠️ Distinction structurante du modèle Liguita : le chercheur ne paie jamais
 * le trouveur directement. Il règle les frais de mise en relation **à Liguita**,
 * qui devient débitrice de la récompense et la verse ensuite au trouveur sur
 * demande de retrait. Un encaissement « marchand » (de type `COLLECTION`) est
 * donc la règle ; le type `PAYOUT` n'existe que pour honorer les retraits.
 */
export type PaymentFlow = 'COLLECTION' | 'PAYOUT';

export interface PaymentInitiation {
  amount: number;
  currency: string;
  /**
   * Numéro débité. Pour un `COLLECTION` c'est le numéro du **payeur**
   * (le chercheur) ; pour un `PAYOUT` c'est le numéro du **bénéficiaire**
   * (le trouveur qui demande son retrait).
   */
  payerPhone: string;
  reference: string;
  idempotencyKey: string;
  description: string;
  /**
   * Nature du mouvement. Défaut `COLLECTION` : ne pas casser les appels
   * existants qui ne le précisent pas.
   */
  flow?: PaymentFlow;
  /**
   * Numéro marchand encaissant les fonds (mode `COLLECTION` uniquement).
   * Renseigné par la variable d'environnement du même nom côté adaptateur ;
   * exposé ici pour permettre un overriding par transaction (tests, multi-comptes).
   */
  merchantPhone?: string;
}

export interface PaymentInitiationResult {
  providerReference: string;
  status: PaymentStatus;
  redirectUrl?: string;
  airtelMoneyId?: string;
  airtelStatus?: string;
}

export interface PaymentStatusResult {
  status: PaymentStatus;
  airtelStatus?: string;
  airtelResponseCode?: string;
  failureReason?: string;
  paidAt?: Date;
}

export interface RefundResult {
  refundReference: string;
}

export interface PaymentProvider {
  readonly code: PaymentProviderCode;
  readonly supportsRefund: boolean;
  /**
   * Le fournisseur sait-il encaisser sur un compte marchand (et pas seulement
   * débiter le téléphone de l'appelant) ? Détermine si le numéro Liguita peut
   * être utilisé comme destinataire des fonds.
   */
  readonly supportsMerchantCollection?: boolean;
  initiate(input: PaymentInitiation): Promise<PaymentInitiationResult>;
  checkStatus(providerReference: string): Promise<PaymentStatusResult>;
  refund?(input: {
    providerReference: string;
    amount: number;
    reason: string;
  }): Promise<RefundResult>;
  verifyWebhook(rawBody: string, headers: Record<string, string>): boolean;
}

export function validatePaymentInput(input: PaymentInitiation): void {
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
    throw new Error('Montant de paiement invalide.');
  }
  if (!/^[A-Z]{3}$/.test(input.currency)) throw new Error('Devise de paiement invalide.');
  if (!/^\+?[0-9]{8,15}$/.test(input.payerPhone.replace(/[\s().-]/g, ''))) {
    throw new Error('Numéro de téléphone invalide.');
  }
  if (!input.reference || !input.idempotencyKey || !input.description) {
    throw new Error('Référence de paiement manquante.');
  }
  if (input.flow !== undefined && input.flow !== 'COLLECTION' && input.flow !== 'PAYOUT') {
    throw new Error('Nature de paiement invalide.');
  }
  if (input.merchantPhone && !/^\+?[0-9]{8,15}$/.test(input.merchantPhone.replace(/[\s().-]/g, ''))) {
    throw new Error('Numéro marchand invalide.');
  }
}
