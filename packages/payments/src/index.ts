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

function airtelStatus(status: string | undefined): PaymentStatusResult['status'] {
  switch (status) {
    case 'TS':
      return 'PAID';
    case 'TF':
      return 'FAILED';
    case 'TE':
      return 'CANCELLED';
    case 'TA':
    case 'TIP':
      return 'PENDING';
    default:
      return 'PENDING';
  }
}

function normalizeAirtelMsisdn(phone: string): string {
  const normalized = phone.replace(/[\s().-]/g, '').replace(/^\+?235/, '');
  if (!/^\d{8}$/.test(normalized)) throw new Error('Numéro Airtel Money invalide.');
  return normalized;
}

function headerValue(headers: Record<string, string>, name: string): string {
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase());
  return entry?.[1] ?? '';
}

export class AirtelMoneyProvider implements PaymentProvider {
  readonly code = 'AIRTEL' as const;
  readonly supportsRefund = true;
  private readonly secret: string;
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private accessToken = '';
  private tokenExpiresAt = 0;
  private tokenRequest: Promise<string> | null = null;

  constructor(config: {
    secret: string;
    endpoint?: string;
    baseUrl?: string;
    clientId: string;
    clientSecret: string;
    merchantCode?: string;
  }) {
    this.secret = config.secret;
    this.baseUrl = (config.baseUrl ?? config.endpoint ?? '').replace(/\/+$/, '');
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
  }

  private configuredUrl(path: string): string {
    if (!this.baseUrl || !this.clientId || !this.clientSecret) {
      throw new Error('Adaptateur Airtel Money non configuré.');
    }
    return `${this.baseUrl}${path}`;
  }

  private async requestToken(): Promise<string> {
    const response = await fetch(this.configuredUrl('/auth/oauth2/token'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials',
      }).toString(),
    });
    if (!response.ok) {
      throw new Error(`Airtel Money a refusé l'authentification (${response.status}).`);
    }
    const body = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!body.access_token || typeof body.expires_in !== 'number') {
      throw new Error('Réponse Airtel Money incomplète.');
    }
    this.accessToken = body.access_token;
    this.tokenExpiresAt = Date.now() + Math.max(0, body.expires_in - 60) * 1000;
    return this.accessToken;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiresAt > Date.now()) return this.accessToken;
    this.tokenRequest ??= this.requestToken().finally(() => {
      this.tokenRequest = null;
    });
    return this.tokenRequest;
  }

  private async authenticatedHeaders(): Promise<Record<string, string>> {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Country': 'TD',
      'X-Currency': 'XAF',
      Authorization: `Bearer ${await this.getAccessToken()}`,
    };
  }

  async initiate(input: PaymentInitiation): Promise<PaymentInitiationResult> {
    validatePaymentInput(input);
    const response = await fetch(this.configuredUrl('/merchant/v1/payments/'), {
      method: 'POST',
      headers: await this.authenticatedHeaders(),
      body: JSON.stringify({
        reference: input.reference,
        subscriber: {
          country: 'TD',
          currency: 'XAF',
          msisdn: normalizeAirtelMsisdn(input.payerPhone),
        },
        transaction: {
          amount: input.amount,
          country: 'TD',
          currency: 'XAF',
          id: input.idempotencyKey,
        },
      }),
    });
    if (!response.ok) throw new Error(`Airtel Money a refusé le paiement (${response.status}).`);
    const body = (await response.json()) as {
      transaction?: {
        id?: string;
        airtel_money_id?: string;
        status?: string;
      };
    };
    const providerReference = body.transaction?.id;
    if (!providerReference) throw new Error('Réponse Airtel Money incomplète.');
    return {
      providerReference,
      status: airtelStatus(body.transaction?.status),
      ...(body.transaction?.airtel_money_id
        ? { airtelMoneyId: body.transaction.airtel_money_id }
        : {}),
      ...(body.transaction?.status ? { airtelStatus: body.transaction.status } : {}),
    };
  }

  async checkStatus(providerReference: string): Promise<PaymentStatusResult> {
    const response = await fetch(
      this.configuredUrl(`/standard/v1/payments/${encodeURIComponent(providerReference)}`),
      { headers: await this.authenticatedHeaders() },
    );
    if (!response.ok) return { status: 'FAILED', failureReason: `HTTP ${response.status}` };
    const body = (await response.json()) as {
      transaction?: {
        status?: string;
        message?: string;
      };
    };
    const failureReason = body.transaction?.message;
    return {
      status: airtelStatus(body.transaction?.status),
      ...(failureReason ? { failureReason } : {}),
    };
  }

  async refund(input: {
    providerReference: string;
    amount: number;
    reason: string;
  }): Promise<RefundResult> {
    if (!input.providerReference || input.amount <= 0 || !input.reason) {
      throw new Error('Remboursement invalide.');
    }
    const response = await fetch(this.configuredUrl('/standard/v1/payments/refund'), {
      method: 'POST',
      headers: await this.authenticatedHeaders(),
      body: JSON.stringify({ transaction: { airtel_money_id: input.providerReference } }),
    });
    if (!response.ok)
      throw new Error(`Airtel Money a refusé le remboursement (${response.status}).`);
    const body = (await response.json()) as {
      transaction?: {
        id?: string;
        airtel_money_id?: string;
        status?: string;
      };
      refund_id?: string;
    };
    return {
      refundReference:
        body.transaction?.id ??
        body.transaction?.airtel_money_id ??
        body.refund_id ??
        input.providerReference,
    };
  }

  verifyWebhook(rawBody: string, headers: Record<string, string>): boolean {
    const hash = headerValue(headers, 'hash');
    if (!hash) return false;
    const expected = createHmac('sha256', this.secret).update(rawBody).digest('base64');
    return safeEqual(hash, expected);
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
