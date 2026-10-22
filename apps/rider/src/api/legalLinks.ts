// Pure parsing for the Profile menu's privacy policy and terms links (no React
// Native imports, so legal.selfcheck.ts runs under plain Node). The URLs come
// from admin "App settings" (app_content, GET /app-config); the fallbacks are
// the published pages, so the links still open when the API is unreachable.
export interface LegalLinks { privacyUrl: string; termsUrl: string }

export const FALLBACK_LEGAL_LINKS: LegalLinks = {
  privacyUrl: 'https://gloceries.com/privacy',
  termsUrl: 'https://gloceries.com/terms',
};

const httpsUrl = (value: unknown, fallback: string) =>
  typeof value === 'string' && /^https:\/\/\S+$/.test(value.trim()) ? value.trim() : fallback;

export function parseLegalLinks(body: unknown): LegalLinks {
  const legal = (body as { legal?: { privacyUrl?: unknown; termsUrl?: unknown } } | null)?.legal;
  return {
    privacyUrl: httpsUrl(legal?.privacyUrl, FALLBACK_LEGAL_LINKS.privacyUrl),
    termsUrl: httpsUrl(legal?.termsUrl, FALLBACK_LEGAL_LINKS.termsUrl),
  };
}
