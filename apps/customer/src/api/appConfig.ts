// Admin-editable customer copy and links (GET /app-config, backed by the
// app_content singleton the admin "App content" page edits). Every field has
// a safe default so a cold cache or failed fetch never blanks the UI.
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from './client';
import { copyDefault } from '../../../../packages/home-content/copyKeys.js';

export interface AppConfig {
  legal: { termsUrl: string | null; privacyUrl: string | null; refundPolicyUrl: string | null };
  support: { phone: string | null; email: string | null; whatsapp: string | null };
  about: { title: string; body: string };
  // Free-form UI strings keyed by stable ids (e.g. 'home.mostBought.title').
  copy: Record<string, string>;
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  legal: { termsUrl: null, privacyUrl: null, refundPolicyUrl: null },
  support: { phone: null, email: null, whatsapp: null },
  about: { title: 'About Gloceries', body: '' },
  copy: {},
};

export async function fetchAppConfig(): Promise<AppConfig> {
  const data = await apiRequest<Partial<AppConfig>>('/app-config');
  return {
    legal: { ...DEFAULT_APP_CONFIG.legal, ...data.legal },
    support: { ...DEFAULT_APP_CONFIG.support, ...data.support },
    about: { ...DEFAULT_APP_CONFIG.about, ...data.about },
    copy: { ...data.copy },
  };
}

export function useAppConfig(): AppConfig {
  const { data = DEFAULT_APP_CONFIG } = useQuery({
    queryKey: ['app-config'],
    queryFn: fetchAppConfig,
    staleTime: 5 * 60_000,
  });
  return data;
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
