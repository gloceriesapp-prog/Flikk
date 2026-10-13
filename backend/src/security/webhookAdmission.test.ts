import { expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { webhookAdmission } from './webhookAdmission.js';

it('rejects missing, duplicate and malformed signatures before parsing', () => {
  for (const signature of [undefined, [], ['a'.repeat(64)], 'a'.repeat(63), 'z'.repeat(64), 'é'.repeat(64), 'A'.repeat(43) + '=']) {
    const next = vi.fn();
    webhookAdmission({ method: 'POST', headers: { 'x-razorpay-signature': signature } } as unknown as Request, {} as Response, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
  }
});
it('admits hex SHA-256 only on POST', () => {
  const headers = { 'x-razorpay-signature': 'a'.repeat(64) };
  const next = vi.fn();
  webhookAdmission({ method: 'POST', headers } as unknown as Request, {} as Response, next);
  expect(next).toHaveBeenCalledWith();
  const wrongMethod = vi.fn();
  webhookAdmission({ method: 'GET', headers } as unknown as Request, {} as Response, wrongMethod);
  expect(wrongMethod).toHaveBeenCalledWith(expect.objectContaining({ status: 405 }));
});
