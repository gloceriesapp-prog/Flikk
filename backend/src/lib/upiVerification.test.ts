import { beforeEach, describe, expect, it, vi } from 'vitest';

// In-memory stand-in for one stores/riders row, including the migration-102
// trigger: changing any payout-destination column resets verification.
const DEST = ['payout_method', 'payout_upi_id', 'payout_bank_account_number', 'payout_bank_ifsc', 'payout_bank_name', 'payout_account_holder_name', 'payout_proof_path'];
const db = vi.hoisted(() => ({ row: {} as Record<string, unknown>, budgetWait: 0, updates: [] as Record<string, unknown>[] }));
vi.mock('../db/supabase.js', () => ({ supabase: {
  rpc: async () => ({ data: db.budgetWait, error: null }),
  from: () => {
    let patch: Record<string, unknown> | null = null;
    const filters: [string, unknown][] = [];
    const builder = {
      select: () => builder,
      update: (p: Record<string, unknown>) => { patch = p; return builder; },
      eq: (col: string, val: unknown) => { filters.push([col, val]); return builder; },
      maybeSingle: async () => {
        const matches = filters.every(([c, v]) => c === 'id' || c === 'user_id' || db.row[c] === v);
        if (!matches) return { data: null, error: null };
        if (patch) {
          db.updates.push(patch);
          const next = { ...db.row, ...patch };
          if (DEST.some((c) => next[c] !== db.row[c])) {
            Object.assign(next, { payout_details_status: 'unverified', payout_details_verified_at: null, payout_details_verified_by: null, payout_upi_verified_name: null });
          }
          db.row = next;
        }
        return { data: { ...db.row }, error: null };
      },
    };
    return builder;
  },
} }));
vi.mock('../customer-experience/authBudget.js', () => ({ authBucket: (k: string) => k }));

import { namesMatch, parseResponse, verifyUpiId, signCareConfig, type SignCareConfig, type UpiCheck } from './upiVerification.js';
import { writePayoutAccount } from './payoutAccount.js';

const config: SignCareConfig = { baseUrl: 'https://signcare.test', apiKey: 'k', clientId: 'c', timeoutMs: 50 };
const me = '11111111-1111-4111-8111-111111111111';
const save = (upiId: string, check: UpiCheck | (() => UpiCheck), cfg: SignCareConfig | null = config) =>
  writePayoutAccount('stores', 'id', 's1', { method: 'upi', upiId }, me, {
    config: cfg,
    verify: async () => (typeof check === 'function' ? check() : check),
  });

beforeEach(() => {
  db.budgetWait = 0;
  db.updates = [];
  db.row = { owner_name: 'Ramesh Shetty', payout_method: null, payout_upi_id: null, payout_details_status: 'unverified', payout_upi_verified_name: null };
});

describe('signCareConfig', () => {
  it('is off unless the switch and all three settings are present', () => {
    const full = { PAYOUT_UPI_AUTO_VERIFY: 'true', SIGNCARE_BASE_URL: 'https://x.test/', SIGNCARE_API_KEY: 'k', SIGNCARE_CLIENT_ID: 'c' };
    expect(signCareConfig(full)).toMatchObject({ baseUrl: 'https://x.test', timeoutMs: 8000 });
    expect(signCareConfig({ ...full, PAYOUT_UPI_AUTO_VERIFY: 'false' })).toBeNull();
    expect(signCareConfig({ ...full, SIGNCARE_API_KEY: '' })).toBeNull();
    expect(signCareConfig({ ...full, SIGNCARE_BASE_URL: undefined })).toBeNull();
  });
});

// Bodies below are real SignCare UAT responses (request ids shortened).
const FOUND = { data: { beneficiary_name: 'ASHOK TAK' }, messages: [], request_id: 'gl-1', success: true, statusCode: 100, message: 'Valid Authentication' };
const NOT_FOUND = { data: null, messages: [], request_id: 'gl-2', success: false, statusCode: 101, message: 'No Record Found' };
const UNAUTHORIZED = { success: false, error: 'Unauthorized', message: 'Missing or invalid X-API-KEY header.' };

describe('parseResponse', () => {
  it('reads SignCare found / not-found answers', () => {
    expect(parseResponse(200, FOUND)).toEqual({ outcome: 'valid', nameAtBank: 'ASHOK TAK' });
    expect(parseResponse(200, NOT_FOUND)).toEqual({ outcome: 'invalid' });
  });
  it('never verifies on an unclear answer', () => {
    expect(parseResponse(200, { ...FOUND, data: { beneficiary_name: '  ' } })).toEqual({ outcome: 'unavailable', reason: 'no_name' });
    expect(parseResponse(200, { ...FOUND, statusCode: 102 })).toEqual({ outcome: 'unavailable', reason: 'signcare_102' });
    expect(parseResponse(200, { ...NOT_FOUND, statusCode: 500 })).toEqual({ outcome: 'unavailable', reason: 'signcare_500' });
    expect(parseResponse(200, 'html').outcome).toBe('unavailable');
    expect(parseResponse(401, UNAUTHORIZED)).toEqual({ outcome: 'unavailable', reason: 'auth_401' });
    expect(parseResponse(429, {}).outcome).toBe('unavailable');
    expect(parseResponse(503, FOUND).outcome).toBe('unavailable');
  });
});

describe('verifyUpiId', () => {
  it('posts the UPI ID with consent and both credentials, server-side', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(FOUND), { status: 200 }));
    expect(await verifyUpiId('ashok@upi', config, fetchImpl)).toEqual({ outcome: 'valid', nameAtBank: 'ASHOK TAK' });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://signcare.test/api/v1/upi/verification');
    expect(init.headers).toMatchObject({ 'X-API-KEY': 'k', 'X-API-APP-ID': 'c' });
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({ consent: 'Y', customer_upi_id: 'ashok@upi' });
    expect(body.consent_text).toMatch(/consent/);
    expect(body.request_id).toMatch(/^gl-/);
  });
  it('gives up after the timeout and on network errors', async () => {
    const hang: typeof fetch = (_u, init) => new Promise((_, reject) => init?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
    expect(await verifyUpiId('a@b', config, hang)).toEqual({ outcome: 'unavailable', reason: 'timeout' });
    expect(await verifyUpiId('a@b', config, async () => { throw new TypeError('fetch failed'); })).toEqual({ outcome: 'unavailable', reason: 'network_error' });
  });
});

describe('namesMatch', () => {
  it('accepts the usual bank spellings of the same person', () => {
    expect(namesMatch('RAMESH SHETTY', 'Ramesh Shetty')).toBe(true);
    expect(namesMatch('SHETTY RAMESH', 'Ramesh Shetty')).toBe(true);
    expect(namesMatch('MR. RAMESH K SHETTY', 'Ramesh Shetty')).toBe(true);
    expect(namesMatch('R SHETTY', 'Ramesh Shetty')).toBe(true);
    expect(namesMatch('RAMESH', 'Ramesh Kumar Shetty')).toBe(true);
  });
  it('rejects different people and initials-only matches', () => {
    expect(namesMatch('SURESH SHETTY', 'Ramesh Shetty')).toBe(false);
    expect(namesMatch('RAMESH NAYAK', 'Ramesh Shetty')).toBe(false);
    expect(namesMatch('R S', 'Ramesh Shetty')).toBe(false);
    expect(namesMatch('ANITA RAO', null)).toBe(false);
  });
});

describe('writePayoutAccount with UPI verification', () => {
  it('verifies automatically when the bank name matches the owner', async () => {
    const result = await save('ramesh@okaxis', { outcome: 'valid', nameAtBank: 'RAMESH K SHETTY' });
    expect(result).toMatchObject({ status: 'verified', verifiedName: 'RAMESH K SHETTY', verification: { outcome: 'verified', nameAtBank: 'RAMESH K SHETTY' } });
    expect(db.row).toMatchObject({ payout_upi_id: 'ramesh@okaxis', payout_details_status: 'verified', payout_details_verified_by: null });
  });
  it('saves unverified with the bank name for review when names differ', async () => {
    const result = await save('anita@okaxis', { outcome: 'valid', nameAtBank: 'ANITA RAO' });
    expect(result).toMatchObject({ status: 'unverified', verifiedName: 'ANITA RAO', verification: { outcome: 'name_mismatch' } });
  });
  it('refuses a UPI ID that does not exist and saves nothing', async () => {
    await expect(save('nobody@okaxis', { outcome: 'invalid' })).rejects.toMatchObject({ status: 400, code: 'UPI_NOT_FOUND' });
    expect(db.updates).toHaveLength(0);
  });
  it('still saves when the check is unavailable or the daily limit is reached', async () => {
    expect((await save('ramesh@okaxis', { outcome: 'unavailable', reason: 'timeout' })).verification).toEqual({ outcome: 'unavailable' });
    db.budgetWait = 3600;
    const verify = vi.fn();
    const result = await writePayoutAccount('stores', 'id', 's1', { method: 'upi', upiId: 'other@okaxis' }, me, { config, verify });
    expect(verify).not.toHaveBeenCalled();
    expect(result).toMatchObject({ upiId: 'other@okaxis', status: 'unverified', verification: { outcome: 'unavailable' } });
  });
  it('does not pay for a second check of an already-verified UPI ID', async () => {
    await save('ramesh@okaxis', { outcome: 'valid', nameAtBank: 'RAMESH SHETTY' });
    const result = await save('ramesh@okaxis', () => { throw new Error('should not be called'); });
    expect(result.verification).toEqual({ outcome: 'already_verified' });
  });
  it('re-saving the same verified ID keeps it verified; a different ID resets it', async () => {
    await save('ramesh@okaxis', { outcome: 'valid', nameAtBank: 'RAMESH SHETTY' });
    expect((await save('ramesh@okaxis', { outcome: 'invalid' })).status).toBe('verified');
    expect((await save('new@okaxis', { outcome: 'unavailable', reason: 'timeout' })).status).toBe('unverified');
  });
  it('is a plain manual save when auto-verification is off', async () => {
    const verify = vi.fn();
    const result = await writePayoutAccount('stores', 'id', 's1', { method: 'upi', upiId: 'ramesh@okaxis' }, me, { config: null, verify });
    expect(verify).not.toHaveBeenCalled();
    expect(result).toMatchObject({ status: 'unverified', verification: { outcome: 'skipped' } });
  });
});
