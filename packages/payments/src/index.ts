import { createHmac, timingSafeEqual } from 'node:crypto';

export * from './types';

import {
  validatePaymentInput,
  type PaymentInitiation,
  type PaymentInitiationResult,
  type PaymentProvider,
  type PaymentStatusResult,
  type RefundResult,
} from './types';

function sign(rawBody: string, secret: string): string {
  return createHmac('sha256', secret).update(rawBody).digest('hex');
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export class TestPaymentProvider implements PaymentProvider {
  readonly code = 'CASH' as const;
  readonly supportsRefund = true;
  private readonly secret: string;

  constructor(secret: string) {
    if (!secret) throw new Error('Secret de paiement manquant.');
    this.secret = secret;
  }

  async initiate(input: PaymentInitiation): Promise<PaymentInitiationResult> {
    validatePaymentInput(input);
    return {
      providerReference: `test_${input.idempotencyKey}`,
      status: 'PAID',
    };
  }

  async checkStatus(providerReference: string): Promise<PaymentStatusResult> {
    return { status: providerReference.startsWith('test_') ? 'PAID' : 'FAILED' };
  }

  async refund(input: {
    providerReference: string;
    amount: number;
    reason: string;
  }): Promise<RefundResult> {
    if (!input.providerReference || input.amount <= 0 || !input.reason)
      throw new Error('Remboursement invalide.');
    return { refundReference: `refund_${input.providerReference}` };
  }

  verifyWebhook(rawBody: string, headers: Record<string, string>): boolean {
    const signature = headers['x-liguita-signature'] ?? '';
    return Boolean(signature) && safeEqual(signature, sign(rawBody, this.secret));
  }
}

export class AirtelMoneyProvider implements PaymentProvider {
  readonly code = 'AIRTEL' as const;
  readonly supportsRefund = false;
  private readonly secret: string;
  private readonly endpoint: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly merchantCode: string;

  constructor(config: {
    secret: string;
    endpoint: string;
    clientId: string;
    clientSecret: string;
    merchantCode: string;
  }) {
    this.secret = config.secret;
    this.endpoint = config.endpoint;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.merchantCode = config.merchantCode;
  }

  async initiate(input: PaymentInitiation): Promise<PaymentInitiationResult> {
    validatePaymentInput(input);
    if (!this.endpoint || !this.clientId || !this.clientSecret || !this.merchantCode) {
      throw new Error('Adaptateur Airtel Money non configuré.');
    }
    const response = await fetch(`${this.endpoint.replace(/\/$/, '')}/payments`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
      },
      body: JSON.stringify({
        amount: input.amount,
        currency: input.currency,
        phone: input.payerPhone,
        reference: input.reference,
        idempotencyKey: input.idempotencyKey,
        merchantCode: this.merchantCode,
        description: input.description,
      }),
    });
    if (!response.ok) throw new Error(`Airtel Money a refusé le paiement (${response.status}).`);
    const body = (await response.json()) as {
      reference?: string;
      status?: string;
      redirectUrl?: string;
    };
    if (!body.reference) throw new Error('Réponse Airtel Money incomplète.');
    return {
      providerReference: body.reference,
      status: body.status === 'PAID' ? 'PAID' : 'PENDING',
      redirectUrl: body.redirectUrl,
    };
  }

  async checkStatus(providerReference: string): Promise<PaymentStatusResult> {
    if (!this.endpoint) throw new Error('Adaptateur Airtel Money non configuré.');
    const response = await fetch(
      `${this.endpoint.replace(/\/$/, '')}/payments/${encodeURIComponent(providerReference)}`,
    );
    if (!response.ok) return { status: 'FAILED', failureReason: `HTTP ${response.status}` };
    const body = (await response.json()) as {
      status?: string;
      failureReason?: string;
      paidAt?: string;
    };
    return {
      status:
        body.status === 'PAID'
          ? 'PAID'
          : body.status === 'FAILED'
            ? 'FAILED'
            : body.status === 'CANCELLED'
              ? 'CANCELLED'
              : 'PENDING',
      failureReason: body.failureReason,
      paidAt: body.paidAt ? new Date(body.paidAt) : undefined,
    };
  }

  verifyWebhook(rawBody: string, headers: Record<string, string>): boolean {
    const signature = headers['x-airtel-signature'] ?? '';
    return Boolean(signature) && safeEqual(signature, sign(rawBody, this.secret));
  }
}

export class MoovMoneyProvider implements PaymentProvider {
  readonly code = 'MOOV' as const;
  readonly supportsRefund = false;
  private readonly secret: string;
  private readonly endpoint: string;
  private readonly merchantId: string;
  private readonly apiKey: string;

  constructor(config: { secret: string; endpoint: string; merchantId: string; apiKey: string }) {
    this.secret = config.secret;
    this.endpoint = config.endpoint;
    this.merchantId = config.merchantId;
    this.apiKey = config.apiKey;
  }

  async initiate(input: PaymentInitiation): Promise<PaymentInitiationResult> {
    validatePaymentInput(input);
    if (!this.endpoint || !this.merchantId || !this.apiKey)
      throw new Error('Adaptateur Moov Money non configuré.');
    const response = await fetch(`${this.endpoint.replace(/\/$/, '')}/payments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': this.apiKey },
      body: JSON.stringify({
        amount: input.amount,
        currency: input.currency,
        phone: input.payerPhone,
        reference: input.reference,
        idempotencyKey: input.idempotencyKey,
        merchantId: this.merchantId,
        description: input.description,
      }),
    });
    if (!response.ok) throw new Error(`Moov Money a refusé le paiement (${response.status}).`);
    const body = (await response.json()) as {
      reference?: string;
      status?: string;
      redirectUrl?: string;
    };
    if (!body.reference) throw new Error('Réponse Moov Money incomplète.');
    return {
      providerReference: body.reference,
      status: body.status === 'PAID' ? 'PAID' : 'PENDING',
      redirectUrl: body.redirectUrl,
    };
  }

  async checkStatus(providerReference: string): Promise<PaymentStatusResult> {
    if (!this.endpoint) throw new Error('Adaptateur Moov Money non configuré.');
    const response = await fetch(
      `${this.endpoint.replace(/\/$/, '')}/payments/${encodeURIComponent(providerReference)}`,
    );
    if (!response.ok) return { status: 'FAILED', failureReason: `HTTP ${response.status}` };
    const body = (await response.json()) as {
      status?: string;
      failureReason?: string;
      paidAt?: string;
    };
    return {
      status:
        body.status === 'PAID'
          ? 'PAID'
          : body.status === 'FAILED'
            ? 'FAILED'
            : body.status === 'CANCELLED'
              ? 'CANCELLED'
              : 'PENDING',
      failureReason: body.failureReason,
      paidAt: body.paidAt ? new Date(body.paidAt) : undefined,
    };
  }

  verifyWebhook(rawBody: string, headers: Record<string, string>): boolean {
    const signature = headers['x-moov-signature'] ?? '';
    return Boolean(signature) && safeEqual(signature, sign(rawBody, this.secret));
  }
}
