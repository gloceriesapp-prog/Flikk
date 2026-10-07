// GET /app-config — admin-editable customer copy and links (app_content
// singleton, migration 100; edited from admin's "App content" page). Public,
// read-only, cached. A missing row returns safe defaults; only a DB error
// is a 503, so the customer app falls back to its own shipped strings.
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

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

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

export const appConfigRouter = Router();

appConfigRouter.get('/', async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('app_content')
      .select('terms_url, privacy_url, refund_policy_url, support_phone, support_email, support_whatsapp, about_title, about_body, copy')
      .eq('id', true)
      .maybeSingle();
    if (error) throw new AppError(503, 'APP_CONFIG_UNAVAILABLE', 'App content is temporarily unavailable.');
    res.set('Cache-Control', 'public, max-age=60');
    res.json(toAppConfig(data as AppContentRow | null));
  } catch (err) {
    next(err);
  }
});
