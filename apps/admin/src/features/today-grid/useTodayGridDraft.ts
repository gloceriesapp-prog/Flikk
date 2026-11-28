'use client';

// Page state for the Today grid admin: the working draft, server errors, and
// save draft / publish / restore / on-off — all through /api/today-grid.
import { useCallback, useEffect, useState } from 'react';
import { toast } from '@/components/ui/Toast';
import type { ConfigError, TodayGridConfig } from '@/lib/home/todayGrid';

export interface VersionSummary { id: number; createdAt: string; createdBy: string; note: string | null; restoredFrom: number | null; publishedAt: string | null; live: boolean; changes: number; diff: { path: string; from: unknown; to: unknown }[] }
interface Loaded { enabled: boolean; publishedVersionId: number | null; draft: { id: number; config: TodayGridConfig } | null; published: { id: number; config: TodayGridConfig } | null; defaults: TodayGridConfig; versions: VersionSummary[] }

async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

export function useTodayGridDraft() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [config, setConfig] = useState<TodayGridConfig | null>(null);
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<ConfigError[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { ok, json } = await call('/api/today-grid', 'GET');
    if (!ok) { setError(json.error ?? 'Could not load the Today grid.'); return; }
    setLoaded(json); setConfig(json.draft?.config ?? json.defaults); setDirty(false); setError(null);
  }, []);
  useEffect(() => { Promise.resolve().then(load); }, [load]);

  const update = (next: TodayGridConfig) => { setConfig(next); setDirty(true); };

  async function run(action: () => Promise<{ ok: boolean; json: Record<string, unknown> }>, done: string) {
    setBusy(true); setError(null);
    try {
      const { ok, json } = await action();
      if (!ok) { setErrors((json.errors as ConfigError[]) ?? []); setError(String(json.error ?? 'Something went wrong.')); return false; }
      setErrors([]); toast.success(json.unchanged ? 'No changes to save.' : done); await load(); return true;
    } finally { setBusy(false); }
  }
  const saveDraft = (note?: string) => run(() => call('/api/today-grid', 'PUT', { config, note }), 'Draft saved.');
  const publish = async () => {
    if (dirty && !(await saveDraft())) return;
    const latest = (await call('/api/today-grid', 'GET')).json as Loaded;
    if (latest.draft) await run(() => call('/api/today-grid/publish', 'POST', { versionId: latest.draft!.id }), 'Published — live on Home now.');
  };
  const restore = (versionId: number) => run(() => call('/api/today-grid/restore', 'POST', { versionId }), `Version ${versionId} restored as a new draft.`);
  const setEnabled = (enabled: boolean) => run(() => call('/api/today-grid/state', 'PATCH', { enabled }), enabled ? 'Grid shown on Home.' : 'Grid hidden on Home.');
  const errorFor = (prefix: string) => errors.filter((e) => e.path === prefix || e.path.startsWith(`${prefix}.`));

  return { loaded, config, update, dirty, errors, errorFor, error, busy, saveDraft, publish, restore, setEnabled, reload: load,
    draftIsLive: !!loaded?.draft && loaded.draft.id === loaded.publishedVersionId && !dirty };
}
