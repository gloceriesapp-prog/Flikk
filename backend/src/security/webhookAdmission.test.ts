import { expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { webhookAdmission } from './webhookAdmission.js';
const good = 'A'.repeat(43) + '=';
it('rejects malformed signature/timestamp headers before parsing and admits only POST', () => {
  for (const [signature, timestamp] of [[undefined, '1700000000000'], [[], '1700000000000'], ['a'.repeat(64), '1700000000000'], ['é'.repeat(43) + '=', '1700000000000'], [good, undefined], [good, 'abc']]) {
    const next = vi.fn(); webhookAdmission({ method: 'POST', headers: { 'x-webhook-signature': signature, 'x-webhook-timestamp': timestamp } } as unknown as Request, {} as Response, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
  }
  const next = vi.fn(); webhookAdmission({ method: 'POST', headers: { 'x-webhook-signature': good, 'x-webhook-timestamp': '1700000000000' } } as unknown as Request, {} as Response, next);
  expect(next).toHaveBeenCalledWith();
});
