// "Today on Gloceries" config. Every save is a new DRAFT version (who, when,
// diff); the live grid runs only the PUBLISHED version (publish/route.ts).
// Validation is the shared engine's validateConfig — the same rules the
// backend applies — and is always re-run here: the client is never trusted.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { configDiff, DEFAULT_CONFIG, readConfig, stampEditedItems, validateConfig } from '@/lib/home/todayGrid';
import { failed, latestVersion, VERSION_COLUMNS, type VersionRow } from './shared';

export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const [state, versions] = await Promise.all([
    supabaseAdmin.from('today_grid_state').select('enabled, published_version_id, updated_at, updated_by').eq('id', 1).maybeSingle(),
    supabaseAdmin.from('today_grid_versions').select(VERSION_COLUMNS).order('id', { ascending: false }).limit(30),
  ]);
  if (state.error) return failed('load the Today grid', state.error);
  if (versions.error) return failed('load the Today grid', versions.error);
  const rows = (versions.data ?? []) as VersionRow[];
  const publishedId = state.data?.published_version_id ?? null;
  const draft = rows[0] ?? null;
  const published = rows.find((row) => row.id === publishedId) ?? null;
  return NextResponse.json({
    enabled: state.data?.enabled !== false,
    publishedVersionId: publishedId,
    draft: draft ? { id: draft.id, config: readConfig(draft.config), createdAt: draft.created_at, createdBy: draft.created_by } : null,
    published: published ? { id: published.id, config: readConfig(published.config) } : null,
    defaults: DEFAULT_CONFIG,
    versions: rows.map((row) => ({ id: row.id, createdAt: row.created_at, createdBy: row.created_by, note: row.note, restoredFrom: row.restored_from,
      publishedAt: row.published_at, live: row.id === publishedId, changes: Array.isArray(row.diff) ? row.diff.length : 0, diff: row.diff })),
  });
}

// Save a draft: { config, note? }.
export async function PUT(request: Request) {
  const { actor, denied } = await requireAdmin();
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as { config?: unknown; note?: unknown } | null;
  if (!body || typeof body.config !== 'object' || body.config === null) return NextResponse.json({ error: 'Send the grid settings.' }, { status: 400 });
  const { config, errors } = validateConfig(body.config);
  if (errors.length) return NextResponse.json({ error: 'Fix the highlighted settings before saving.', errors }, { status: 422 });
  const latest = await latestVersion();
  if (latest.error) return failed('save the draft', latest.error);
  const before = latest.data ? readConfig(latest.data.config) : DEFAULT_CONFIG;
  const now = new Date().toISOString();
  const stamped = stampEditedItems(before, config, actor.email, now);
  const diff = configDiff(before, stamped).filter((entry) => !/\.updated(At|By)$/.test(entry.path));
  if (latest.data && !diff.length) return NextResponse.json({ unchanged: true, versionId: latest.data.id });
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 200) || null : null;
  const { data, error } = await supabaseAdmin.from('today_grid_versions')
    .insert({ config: stamped, created_by: actor.email, diff, note }).select('id').single();
  if (error) return failed('save the draft', error);
  return NextResponse.json({ versionId: data.id, changes: diff.length });
}
