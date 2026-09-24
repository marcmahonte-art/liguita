import { createHmac } from 'node:crypto';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { AirtelMoneyProvider, TestPaymentProvider } from './index';

describe('TestPaymentProvider', () => {
  it('initialise un paiement test déterministe', async () => {
    const provider = new TestPaymentProvider('secret');
    const result = await provider.initiate({
      amount: 1800,
      currency: 'XAF',
      payerPhone: '+23566123456',
      reference: 'quote-1',
      idempotencyKey: 'idem-12345678',
      description: 'Test',
    });
    expect(result.providerReference).toBe('test_idem-12345678');
    expect(result.status).toBe('PAID');
  });

  it('refuse un montant invalide', async () => {
    const provider = new TestPaymentProvider('secret');
    await expect(
      provider.initiate({
        amount: 0,
        currency: 'XAF',
        payerPhone: '+23566123456',
        reference: 'quote-1',
        idempotencyKey: 'idem-12345678',
        description: 'Test',
      }),
    ).rejects.toThrow('Montant');
  });

  it('vérifie la signature du corps brut', () => {
    const provider = new TestPaymentProvider('secret');
    const body = JSON.stringify({ eventId: 'event-1', status: 'PAID' });
    const signature = createHmac('sha256', 'secret').update(body).digest('hex');
    expect(provider.verifyWebhook(body, { 'x-liguita-signature': signature })).toBe(true);
    expect(provider.verifyWebhook(body, { 'x-liguita-signature': 'invalid' })).toBe(false);
  });
});

function airtelResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function airtelProvider(): AirtelMoneyProvider {
  return new AirtelMoneyProvider({
    secret: 'callback-secret',
    baseUrl: 'https://openapi.airtel.td',
    clientId: 'client-id',
    clientSecret: 'client-secret',
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('AirtelMoneyProvider', () => {
  it('met en cache le token jusqu’à expires_in moins 60 secondes', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    let tokenCount = 0;
    let paymentCount = 0;
    const fetchMock = vi.fn((url: string | URL) => {
      if (String(url).endsWith('/auth/oauth2/token')) {
        tokenCount += 1;
        return Promise.resolve(
          airtelResponse({ access_token: `token-${tokenCount}`, expires_in: 120 }),
        );
      }
      paymentCount += 1;
      return Promise.resolve(
        airtelResponse({ transaction: { id: `tx-${paymentCount}`, status: 'TA' } }),
      );
    });
    vi.stubGlobal('fetch', fetchMock);
    const provider = airtelProvider();
    const input = {
      amount: 1200,
      currency: 'XAF',
      payerPhone: '+23566123456',
      reference: 'LG-PAY-00001',
      idempotencyKey: 'LG-TXN-00001',
      description: 'Test',
    };

    await provider.initiate(input);
    vi.advanceTimersByTime(59_000);
    await provider.initiate({ ...input, reference: 'LG-PAY-00002' });
    vi.advanceTimersByTime(1_000);
    await provider.initiate({ ...input, reference: 'LG-PAY-00003' });

    expect(tokenCount).toBe(2);
    expect(paymentCount).toBe(3);
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://openapi.airtel.td/auth/oauth2/token');
  });

  it('collecte avec payload, headers et MSISDN local', async () => {
    const fetchMock = vi.fn();
    fetchMock
      .mockResolvedValueOnce(airtelResponse({ access_token: 'token-1', expires_in: 3600 }))
      .mockResolvedValueOnce(airtelResponse({ transaction: { id: 'tx-1', status: 'TIP' } }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await airtelProvider().initiate({
      amount: 1200,
      currency: 'XAF',
      payerPhone: '+235 66 12 34 56',
      reference: 'LG-PAY-00001',
      idempotencyKey: 'LG-TXN-00001',
      description: 'Test',
    });

    expect(result).toEqual({ providerReference: 'tx-1', status: 'PENDING', airtelStatus: 'TIP' });
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://openapi.airtel.td/merchant/v1/payments/');
    const request = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(request.method).toBe('POST');
    expect(request.headers).toMatchObject({
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Country': 'TD',
      'X-Currency': 'XAF',
      Authorization: 'Bearer token-1',
    });
    expect(JSON.parse(String(request.body))).toEqual({
      reference: 'LG-PAY-00001',
      subscriber: { country: 'TD', currency: 'XAF', msisdn: '66123456' },
      transaction: { amount: 1200, country: 'TD', currency: 'XAF', id: 'LG-TXN-00001' },
    });
  });

  it('mappe les statuts Airtel', async () => {
    const fetchMock = vi.fn((url: string | URL) => {
      if (String(url).endsWith('/auth/oauth2/token')) {
        return Promise.resolve(airtelResponse({ access_token: 'token-1', expires_in: 3600 }));
      }
      return Promise.resolve(
        airtelResponse({ transaction: { status: currentStatus, message: 'reason' } }),
      );
    });
    let currentStatus: string = 'TS';
    vi.stubGlobal('fetch', fetchMock);
    for (const [airtelStatus, paymentStatus] of [
      ['TS', 'PAID'],
      ['TF', 'FAILED'],
      ['TE', 'CANCELLED'],
      ['TA', 'PENDING'],
      ['TIP', 'PENDING'],
    ] as const) {
      currentStatus = airtelStatus;
      const result = await airtelProvider().checkStatus('tx-1');
      expect(result.status).toBe(paymentStatus);
    }
  });

  it('vérifie le hash HMAC-SHA256 Base64 du callback', () => {
    const body = JSON.stringify({ transaction: { id: 'tx-1', status: 'TS' } });
    const hash = createHmac('sha256', 'callback-secret').update(body).digest('base64');
    const provider = airtelProvider();
    expect(provider.verifyWebhook(body, { hash })).toBe(true);
    expect(provider.verifyWebhook(body, { hash: 'invalid' })).toBe(false);
  });
});
