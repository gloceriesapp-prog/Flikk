// Restore an older version: it becomes a NEW draft (history is never
// rewritten). Publish it to make it live.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { configDiff, readConfig, validateConfig } from '@/lib/home/todayGrid';
import { failed, latestVersion, versionById, versionId } from '../shared';

export async function POST(request: Request) {
  const { actor, denied } = await requireAdmin();
  if (denied) return denied;
  const id = versionId(((await request.json().catch(() => null)) as { versionId?: unknown } | null)?.versionId);
  if (!id) return NextResponse.json({ error: 'Choose a version to restore.' }, { status: 400 });
  const [source, latest] = await Promise.all([versionById(id), latestVersion()]);
  if (source.error || latest.error) return failed('restore', source.error ?? latest.error);
  if (!source.data) return NextResponse.json({ error: 'That version no longer exists.' }, { status: 404 });
  const { config, errors } = validateConfig(source.data.config);
  if (errors.length) return NextResponse.json({ error: 'That version no longer passes validation (cards or rules changed since).', errors }, { status: 422 });
  const diff = configDiff(latest.data ? readConfig(latest.data.config) : config, config);
  const { data, error } = await supabaseAdmin.from('today_grid_versions')
    .insert({ config, created_by: actor.email, diff, note: `Restored from version ${id}`, restored_from: id }).select('id').single();
  if (error) return failed('restore', error);
  return NextResponse.json({ versionId: data.id, restoredFrom: id });
}
