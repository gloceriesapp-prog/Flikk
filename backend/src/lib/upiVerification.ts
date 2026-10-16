// UPI ID verification through SignCare (POST /api/v1/upi/verification, which
// returns the account holder's name for a UPI ID). Used when a store owner or
// rider saves a UPI payout ID (lib/payoutAccount.ts):
//
//   valid + name matches the owner/rider  -> saved as verified automatically
//   valid + name differs                  -> saved unverified, the bank's name
//                                            is shown to the founder in admin
//   UPI ID does not exist                 -> refused, nothing saved
//   SignCare down / timeout / unclear     -> saved unverified, manual check
//
// A provider outage never blocks a partner from saving payout details, and an
// unclear answer is never treated as verified.
//
// Off unless PAYOUT_UPI_AUTO_VERIFY=true and SIGNCARE_BASE_URL,
// SIGNCARE_API_KEY and SIGNCARE_CLIENT_ID (sent as X-API-APP-ID) are set. The
// keys are server-only: never ship them in an app.
//
// Request/response format from SignCare's own OpenAPI spec
// (<base>/swagger/v1/swagger.json) and confirmed against the UAT sandbox
// (https://uat-ext.signcare.io): HTTP is 200 for both outcomes; the body's
// success/statusCode carry the result (100 = found, 101 = "No Record Found").
// (/api/v1/upi/advance is a different API: it looks a UPI ID up from a mobile
// number.)

import { randomUUID } from 'node:crypto';

export type UpiCheck =
  | { outcome: 'valid'; nameAtBank: string }
  | { outcome: 'invalid' }
  | { outcome: 'unavailable'; reason: string };

export interface SignCareConfig {
  baseUrl: string;
  apiKey: string;
  clientId: string;
  timeoutMs: number;
}

const DEFAULT_TIMEOUT_MS = 8_000;

export function signCareConfig(env: NodeJS.ProcessEnv = process.env): SignCareConfig | null {
  if (env.PAYOUT_UPI_AUTO_VERIFY !== 'true') return null;
  const baseUrl = env.SIGNCARE_BASE_URL?.trim().replace(/\/+$/, '');
  const apiKey = env.SIGNCARE_API_KEY?.trim();
  const clientId = env.SIGNCARE_CLIENT_ID?.trim();
  if (!baseUrl || !apiKey || !clientId) return null;
  const timeout = Number(env.SIGNCARE_TIMEOUT_MS);
  return { baseUrl, apiKey, clientId, timeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_TIMEOUT_MS };
}

// SignCare requires the end user's consent and its own default consent
// statement, sent verbatim (their spelling). The apps show the user a matching
// notice before saving.
const CONSENT_TEXT = 'I hear by declare my consent agreement for fetching my information via SignCare API';

export function buildRequest(config: SignCareConfig, upiId: string, requestId: string = `gl-${randomUUID()}`): { url: string; init: RequestInit } {
  return {
    url: `${config.baseUrl}/api/v1/upi/verification`,
    init: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-API-KEY': config.apiKey,
        'X-API-APP-ID': config.clientId,
      },
      body: JSON.stringify({ consent: 'Y', consent_text: CONSENT_TEXT, request_id: requestId, customer_upi_id: upiId }),
    },
  };
}

const FOUND = 100;
const NOT_FOUND = 101;

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Maps SignCare's answer to a UpiCheck. Anything it can't read confidently is 'unavailable'. */
export function parseResponse(status: number, body: unknown): UpiCheck {
  if (status === 401 || status === 403) return { outcome: 'unavailable', reason: `auth_${status}` };
  if (status === 429) return { outcome: 'unavailable', reason: 'rate_limited' };
  if (status >= 500) return { outcome: 'unavailable', reason: `provider_${status}` };
  if (!isObject(body)) return { outcome: 'unavailable', reason: 'unreadable_body' };

  const code = typeof body.statusCode === 'number' ? body.statusCode : null;
  if (body.success === true && code === FOUND) {
    const name = isObject(body.data) && typeof body.data.beneficiary_name === 'string' ? body.data.beneficiary_name.trim() : '';
    // "Found" without a name is not enough to verify anyone.
    return name ? { outcome: 'valid', nameAtBank: name } : { outcome: 'unavailable', reason: 'no_name' };
  }
  if (body.success === false && code === NOT_FOUND) return { outcome: 'invalid' };
  return { outcome: 'unavailable', reason: `signcare_${code ?? status}` };
}

export async function verifyUpiId(upiId: string, config: SignCareConfig, fetchImpl: typeof fetch = fetch): Promise<UpiCheck> {
  const { url, init } = buildRequest(config, upiId);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const res = await fetchImpl(url, { ...init, signal: controller.signal });
    const body: unknown = await res.json().catch(() => null);
    return parseResponse(res.status, body);
  } catch (err) {
    return { outcome: 'unavailable', reason: (err as Error)?.name === 'AbortError' ? 'timeout' : 'network_error' };
  } finally {
    clearTimeout(timer);
  }
}

// --- Name matching ---------------------------------------------------------
// Bank names come as "RAMESH K SHETTY", "SHETTY RAMESH", "Mr. Ramesh Shetty".
// A match needs every word of the shorter name to appear in the longer one,
// either whole or as an initial, and at least one shared whole word of 3+
// letters, so an initial alone ("R") never matches anyone.

const TITLES = new Set(['MR', 'MRS', 'MS', 'MISS', 'DR', 'SHRI', 'SRI', 'SMT', 'KUMARI', 'KUM', 'M/S', 'MESSRS']);

export function nameTokens(name: string): string[] {
  return name
    .toUpperCase()
    .replace(/[^A-Z\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !TITLES.has(t));
}

export function namesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (ta.length === 0 || tb.length === 0) return false;
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  const used = new Set<number>();
  let wholeWord = false;
  for (const token of short) {
    let idx = long.findIndex((t, i) => !used.has(i) && t === token);
    if (idx >= 0) {
      if (token.length >= 3) wholeWord = true;
    } else {
      idx = long.findIndex((t, i) => !used.has(i) && (token.length === 1 ? t.startsWith(token) : t.length === 1 && token.startsWith(t)));
    }
    if (idx < 0) return false;
    used.add(idx);
  }
  return wholeWord;
}
