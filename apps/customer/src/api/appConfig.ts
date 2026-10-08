// Admin-editable customer copy and links (GET /app-config, backed by the
// app_content singleton the admin "App content" page edits), the FAQ and the
// release gate (migration 112, admin "App settings" page). Every field has a
// safe default so a cold cache or failed fetch never blanks the UI or
// blocks the app.
import { useQuery } from '@tanstack/react-query';
import { parseRelease, type AppRelease } from '@gloceries/shared';
import { apiRequest } from './client';
import { copyDefault } from '../../../../packages/home-content/copyKeys.js';

export interface FaqEntry { id: string; question: string; answer: string }

export interface AppConfig {
  legal: { termsUrl: string | null; privacyUrl: string | null; refundPolicyUrl: string | null };
  support: { phone: string | null; email: string | null; whatsapp: string | null };
  about: { title: string; body: string };
  // Free-form UI strings keyed by stable ids (e.g. 'home.mostBought.title').
  copy: Record<string, string>;
  faqs: FaqEntry[];
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  legal: { termsUrl: null, privacyUrl: null, refundPolicyUrl: null },
  support: { phone: null, email: null, whatsapp: null },
  about: { title: 'About Gloceries', body: '' },
  copy: {},
  faqs: [],
};

export function mapFaqs(value: unknown): FaqEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter((f): f is FaqEntry => !!f && typeof f.id === 'string' && typeof f.question === 'string' && typeof f.answer === 'string'
    && f.question.trim() !== '' && f.answer.trim() !== '');
}

export async function fetchAppConfig(): Promise<AppConfig> {
  const data = await apiRequest<Partial<AppConfig>>('/app-config?app=customer', { auth: false });
  return {
    legal: { ...DEFAULT_APP_CONFIG.legal, ...data.legal },
    support: { ...DEFAULT_APP_CONFIG.support, ...data.support },
    about: { ...DEFAULT_APP_CONFIG.about, ...data.about },
    copy: { ...data.copy },
    faqs: mapFaqs(data.faqs),
  };
}

export function useAppConfigQuery() {
  return useQuery({
    queryKey: ['app-config'],
    queryFn: fetchAppConfig,
    staleTime: 5 * 60_000,
  });
}

export function useAppConfig(): AppConfig {
  const { data = DEFAULT_APP_CONFIG } = useAppConfigQuery();
  return data;
}

// The customer release gate alone, polled every minute so maintenance and
// forced updates reach an open app. null (no gate) until it loads or when
// the call fails — the app is never blocked by a network error.
export function useAppRelease(): AppRelease | null {
  const { data } = useQuery({
    queryKey: ['app-release', 'customer'],
    queryFn: async () => parseRelease(await apiRequest<unknown>('/app-config/release/customer', { auth: false })),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  return data ?? null;
}

// Admin text wins, then the registry default (packages/home-content/
// copyKeys.js — the same list the admin "App content" page shows), then the
// caller's fallback for keys not registered yet.
export function resolveCopy(copy: Record<string, string>, key: string, fallback = ''): string {
  return copy[key]?.trim() || copyDefault(key) || fallback;
}

export function useCopy(key: string, fallback?: string): string {
  return resolveCopy(useAppConfig().copy, key, fallback);
}

// For components that resolve several keys (e.g. a list of sections).
export function useCopyText(): (key: string, fallback?: string) => string {
  const { copy } = useAppConfig();
  return (key, fallback) => resolveCopy(copy, key, fallback);
}

// Admin artwork override (registry kind 'image'): an https URL, else the
// app's built-in artwork.
export function useCopyImage(key: string, builtIn: string): string {
  const value = useCopy(key);
  return /^https:\/\/\S+$/.test(value) ? value : builtIn;
}
