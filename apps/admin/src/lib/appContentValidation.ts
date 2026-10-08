// app_content singleton (backend/migrations/100_app_content.sql) — shared
// shape + server-side validation mirroring the DB CHECKs, so a bad save is a
// readable 400 instead of a raw constraint violation. The customer app reads
// this through the backend's GET /app-config.

import { COPY_KEYS } from '../../../../packages/home-content/copyKeys.js';

export interface AppContent {
  termsUrl: string | null;
  privacyUrl: string | null;
  refundPolicyUrl: string | null;
  supportPhone: string | null;
  supportEmail: string | null;
  supportWhatsapp: string | null;
  aboutTitle: string;
  aboutBody: string;
  copy: Record<string, string>;
  updatedAt: string | null;
}

export interface AppContentRow {
  terms_url: string | null;
  privacy_url: string | null;
  refund_policy_url: string | null;
  support_phone: string | null;
  support_email: string | null;
  support_whatsapp: string | null;
  about_title: string;
  about_body: string;
  copy: Record<string, unknown> | null;
  updated_at: string | null;
}

export const APP_CONTENT_SELECT =
  'terms_url, privacy_url, refund_policy_url, support_phone, support_email, support_whatsapp, about_title, about_body, copy, updated_at';

export const COPY_KEY_PATTERN = /^[a-z0-9]+(\.[a-zA-Z0-9]+)+$/;
export const COPY_VALUE_MAX = 500;
export const COPY_MAX_KEYS = 300;

// Every key the customer app reads, with its shipped default — the single
// registry in packages/home-content/copyKeys.js (customer useCopy reads the
// same file). The editor lists all of them; an empty value = app default.
export const REGISTERED_COPY_KEYS: { key: string; hint: string; defaultValue: string; image: boolean }[] =
  Object.entries(COPY_KEYS).map(([key, info]) => ({ key, hint: info.hint, defaultValue: info.default, image: info.kind === 'image' }));

const HTTPS_URL = /^https:\/\/\S+$/;
const PHONE = /^\+[1-9][0-9]{7,14}$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function mapRowToAppContent(row: AppContentRow | null): AppContent {
  const copy: Record<string, string> = {};
  for (const [key, value] of Object.entries(row?.copy ?? {})) if (typeof value === 'string') copy[key] = value;
  return {
    termsUrl: row?.terms_url ?? null,
    privacyUrl: row?.privacy_url ?? null,
    refundPolicyUrl: row?.refund_policy_url ?? null,
    supportPhone: row?.support_phone ?? null,
    supportEmail: row?.support_email ?? null,
    supportWhatsapp: row?.support_whatsapp ?? null,
    aboutTitle: row?.about_title ?? 'About Gloceries',
    aboutBody: row?.about_body ?? '',
    copy,
    updatedAt: row?.updated_at ?? null,
  };
}

function optional(value: unknown, label: string, pattern: RegExp, max: number, hint: string): string | null {
  if (value == null) return null;
  if (typeof value !== 'string') throw new Error(`${label} must be text.`);
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > max || !pattern.test(trimmed)) throw new Error(`${label} ${hint}`);
  return trimmed;
}

// Throws a plain Error with a founder-readable message on bad input.
export function validateAppContentInput(body: unknown) {
  if (!body || typeof body !== 'object') throw new Error('Invalid request body.');
  const input = body as Record<string, unknown>;

  const aboutTitle = typeof input.aboutTitle === 'string' ? input.aboutTitle.trim() : '';
  if (aboutTitle.length < 1 || aboutTitle.length > 120) throw new Error('About title is required (max 120 characters).');
  const aboutBody = typeof input.aboutBody === 'string' ? input.aboutBody : '';
  if (aboutBody.length > 10000) throw new Error('About text must be 10,000 characters or fewer.');

  if (!input.copy || typeof input.copy !== 'object' || Array.isArray(input.copy)) throw new Error('UI copy must be a key/value list.');
  const entries = Object.entries(input.copy as Record<string, unknown>);
  if (entries.length > COPY_MAX_KEYS) throw new Error(`At most ${COPY_MAX_KEYS} UI copy keys.`);
  const copy: Record<string, string> = {};
  for (const [key, value] of entries) {
    if (!COPY_KEY_PATTERN.test(key)) throw new Error(`"${key}" is not a valid key — use dotted names like home.search.placeholder.`);
    if (typeof value !== 'string') throw new Error(`Value for "${key}" must be text.`);
    if (value.length > COPY_VALUE_MAX) throw new Error(`Value for "${key}" must be ${COPY_VALUE_MAX} characters or fewer.`);
    if (COPY_KEYS[key]?.kind === 'image' && value.trim() && !HTTPS_URL.test(value.trim())) throw new Error(`"${key}" must be an https:// image link.`);
    copy[key] = COPY_KEYS[key]?.kind === 'image' ? value.trim() : value;
  }
  if (new TextEncoder().encode(JSON.stringify(copy)).length >= 60000) throw new Error('UI copy is too large.');

  return {
    terms_url: optional(input.termsUrl, 'Terms link', HTTPS_URL, 2048, 'must be an https:// link.'),
    privacy_url: optional(input.privacyUrl, 'Privacy link', HTTPS_URL, 2048, 'must be an https:// link.'),
    refund_policy_url: optional(input.refundPolicyUrl, 'Refund policy link', HTTPS_URL, 2048, 'must be an https:// link.'),
    support_phone: optional(input.supportPhone, 'Support phone', PHONE, 16, 'must be in +91XXXXXXXXXX format.'),
    support_email: optional(input.supportEmail, 'Support email', EMAIL, 254, 'must be a valid email address.'),
    support_whatsapp: optional(input.supportWhatsapp, 'WhatsApp number', PHONE, 16, 'must be in +91XXXXXXXXXX format.'),
    about_title: aboutTitle,
    about_body: aboutBody,
    copy,
  };
}
