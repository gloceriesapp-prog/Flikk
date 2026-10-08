// GET /app-config — admin-editable customer copy and links (app_content
// singleton, migration 100; edited from admin's "App content" page), plus
// the customer FAQ and the requesting app's release gate (migration 112;
// edited from admin's "App settings" page). Public, read-only, cached. A
// missing row returns safe defaults; only an app_content DB error is a 503,
// so the customer app falls back to its own shipped strings. FAQ/release
// read errors degrade to "no FAQ" / "no gate" rather than blocking apps.
//
// GET /app-config/release/:app — the release gate alone, for the partner and
// rider apps (callable before sign-in: a forced update or maintenance must
// reach a signed-out app too).
//
// GET /app-config/support/:app — the partner or rider app's help contacts
// (app_release_config.support_* per app, migration 118; edited on admin's
// "App settings" page). A field the admin left blank for that app falls back
// to the general support contact (app_content). Nothing configured: nulls,
// and the apps hide that contact instead of showing a placeholder.
import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';

export interface AppContentRow {
  terms_url?: string | null;
  privacy_url?: string | null;
  refund_policy_url?: string | null;
  support_phone?: string | null;
  support_email?: string | null;
  support_whatsapp?: string | null;
  about_title?: string | null;
  about_body?: string | null;
  copy?: unknown;
}

export interface AppReleaseRow {
  app?: string;
  min_supported_version?: string | null;
  latest_version?: string | null;
  ios_store_url?: string | null;
  android_store_url?: string | null;
  force_update?: boolean | null;
  maintenance_enabled?: boolean | null;
  maintenance_message?: string | null;
}

export interface AppFaqRow { id: string; question: string; answer: string }

export const RELEASE_APPS = ['customer', 'partner', 'rider'] as const;
export type ReleaseApp = typeof RELEASE_APPS[number];

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
const VERSION = /^\d{1,4}(\.\d{1,4}){0,3}$/;
const version = (value: unknown) => (typeof value === 'string' && VERSION.test(value) ? value : '0.0.0');
const https = (value: unknown) => { const t = text(value); return t && /^https:\/\//i.test(t) ? t : null; };

export function toAppConfig(row: AppContentRow | null) {
  const copy: Record<string, string> = {};
  if (row?.copy && typeof row.copy === 'object' && !Array.isArray(row.copy)) {
    for (const [key, value] of Object.entries(row.copy)) if (typeof value === 'string') copy[key] = value;
  }
  return {
    legal: { termsUrl: text(row?.terms_url), privacyUrl: text(row?.privacy_url), refundPolicyUrl: text(row?.refund_policy_url) },
    support: { phone: text(row?.support_phone), email: text(row?.support_email), whatsapp: text(row?.support_whatsapp) },
    about: { title: text(row?.about_title) ?? 'About Gloceries', body: typeof row?.about_body === 'string' ? row.about_body : '' },
    copy,
  };
}

// No row means nothing is gated: every version is supported, no maintenance.
export function toRelease(row: AppReleaseRow | null) {
  return {
    minSupportedVersion: version(row?.min_supported_version),
    latestVersion: version(row?.latest_version),
    iosStoreUrl: https(row?.ios_store_url),
    androidStoreUrl: https(row?.android_store_url),
    forceUpdate: row?.force_update === true,
    maintenance: { enabled: row?.maintenance_enabled === true, message: text(row?.maintenance_message) },
  };
}

export function toFaqs(rows: AppFaqRow[] | null) {
  return (rows ?? [])
    .filter((row) => text(row.question) && text(row.answer))
    .map((row) => ({ id: row.id, question: row.question.trim(), answer: row.answer.trim() }));
}

export interface SupportContactRow {
  support_phone?: string | null;
  support_email?: string | null;
  support_whatsapp?: string | null;
}

// Per-app contact first, then the general (customer) contact.
export function toSupportContacts(appRow: SupportContactRow | null, generalRow: SupportContactRow | null) {
  const pick = (key: keyof SupportContactRow) => text(appRow?.[key]) ?? text(generalRow?.[key]);
  return { phone: pick('support_phone'), email: pick('support_email'), whatsapp: pick('support_whatsapp') };
}

const RELEASE_SELECT = 'app, min_supported_version, latest_version, ios_store_url, android_store_url, force_update, maintenance_enabled, maintenance_message';

async function readRelease(app: ReleaseApp) {
  const { data, error } = await supabase.from('app_release_config').select(RELEASE_SELECT).eq('app', app).maybeSingle();
  return toRelease(error ? null : (data as AppReleaseRow | null));
}

export const appConfigRouter = Router();

appConfigRouter.get('/release/:app', async (req, res, next) => {
  try {
    const app = req.params.app as ReleaseApp;
    if (!RELEASE_APPS.includes(app)) throw new AppError(404, 'UNKNOWN_APP', 'Unknown app.');
    res.set('Cache-Control', 'public, max-age=30');
    res.json(await readRelease(app));
  } catch (err) {
    next(err);
  }
});

appConfigRouter.get('/support/:app', async (req, res, next) => {
  try {
    const app = req.params.app;
    if (app !== 'partner' && app !== 'rider') throw new AppError(404, 'UNKNOWN_APP', 'Unknown app.');
    const [appRow, general] = await Promise.all([
      supabase.from('app_release_config').select('support_phone, support_email, support_whatsapp').eq('app', app).maybeSingle(),
      supabase.from('app_content').select('support_phone, support_email, support_whatsapp').eq('id', true).maybeSingle(),
    ]);
    if (appRow.error && general.error) throw new AppError(503, 'APP_CONFIG_UNAVAILABLE', 'Support contacts are temporarily unavailable.');
    res.set('Cache-Control', 'public, max-age=60');
    res.json(toSupportContacts(
      appRow.error ? null : (appRow.data as SupportContactRow | null),
      general.error ? null : (general.data as SupportContactRow | null),
    ));
  } catch (err) {
    next(err);
  }
});

appConfigRouter.get('/', async (req, res, next) => {
  try {
    const app: ReleaseApp = RELEASE_APPS.includes(req.query.app as ReleaseApp) ? req.query.app as ReleaseApp : 'customer';
    const [content, release, faqs] = await Promise.all([
      supabase
        .from('app_content')
        .select('terms_url, privacy_url, refund_policy_url, support_phone, support_email, support_whatsapp, about_title, about_body, copy')
        .eq('id', true)
        .maybeSingle(),
      readRelease(app),
      supabase.from('app_faqs').select('id, question, answer').eq('is_active', true)
        .order('sort_order').order('created_at').limit(100),
    ]);
    if (content.error) throw new AppError(503, 'APP_CONFIG_UNAVAILABLE', 'App content is temporarily unavailable.');
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ ...toAppConfig(content.data as AppContentRow | null), release, faqs: toFaqs(faqs.error ? null : faqs.data as AppFaqRow[]) });
  } catch (err) {
    next(err);
  }
});
