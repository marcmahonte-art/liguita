export type PaymentProviderCode = 'CASH' | 'AIRTEL' | 'MOOV';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';

export interface PaymentInitiation {
  amount: number;
  currency: string;
  payerPhone: string;
  reference: string;
  idempotencyKey: string;
  description: string;
}

export interface PaymentInitiationResult {
  providerReference: string;
  status: PaymentStatus;
  redirectUrl?: string;
}

export interface PaymentStatusResult {
  status: PaymentStatus;
  failureReason?: string;
  paidAt?: Date;
}

export interface RefundResult {
  refundReference: string;
}

export interface PaymentProvider {
  readonly code: PaymentProviderCode;
  readonly supportsRefund: boolean;
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
}
