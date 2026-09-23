import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { TestPaymentProvider } from './index';

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
