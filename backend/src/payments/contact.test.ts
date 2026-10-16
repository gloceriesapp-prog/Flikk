import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ from: vi.fn(), auth: vi.fn(), upsert: vi.fn() }));
vi.mock('../db/supabase.js', () => ({ supabase: { from: m.from, auth: { admin: { getUserById: m.auth } } } }));
import { getPaymentContact, savePaymentContact, normalizePaymentEmail, readPaymentEmail } from './contact.js';
beforeEach(() => {
  vi.resetAllMocks(); m.auth.mockResolvedValue({ data: { user: { email: 'login+919999999999@gloceries.com' } }, error: null });
  m.upsert.mockResolvedValue({ error: null });
  const q = { select: vi.fn(() => q), eq: vi.fn(() => q), maybeSingle: vi.fn(async () => ({ data: null, error: null })), upsert: m.upsert };
  m.from.mockReturnValue(q);
});
it('rejects synthetic identity email, invalid addresses and oversized input', () => {
  for (const value of [null, '', 'bad', 'a@b', 'login+919999999999@gloceries.com', `${'a'.repeat(255)}@example.com`]) expect(normalizePaymentEmail(value)).toBeNull();
  expect(normalizePaymentEmail(' CUSTOMER@Example.com ')).toBe('customer@example.com');
});
it('never uses the generated phone-login email as receipt contact', async () => {
  expect(await readPaymentEmail('customer')).toBeNull();
  m.auth.mockResolvedValue({ data: { user: { email: 'real@example.com' } }, error: null });
  expect(await readPaymentEmail('customer')).toBe('real@example.com');
});
it('serves a private contact response scoped to the current customer', async () => {
  const res = { setHeader: vi.fn(), json: vi.fn() }; const next = vi.fn();
  await getPaymentContact({ user: { id: 'customer' } } as never, res as never, next);
  expect(next).not.toHaveBeenCalled(); expect(res.json).toHaveBeenCalledWith({ email: null, required: true });
  expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
});
it('saves only the authenticated customer email, never caller-supplied ownership', async () => {
  const res = { setHeader: vi.fn(), json: vi.fn() }; const next = vi.fn();
  await savePaymentContact({ user: { id: 'customer' }, body: { email: ' REAL@Example.com ' } } as never, res as never, next);
  expect(next).not.toHaveBeenCalled(); expect(m.upsert).toHaveBeenCalledWith({ user_id: 'customer', email: 'real@example.com' }, { onConflict: 'user_id' });
  await savePaymentContact({ user: { id: 'customer' }, body: { email: 'real@example.com', user_id: 'other' } } as never, res as never, next);
  expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_PAYMENT_EMAIL' })); expect(m.upsert).toHaveBeenCalledTimes(1);
});
