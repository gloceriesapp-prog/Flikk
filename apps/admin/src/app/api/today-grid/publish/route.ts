// Publish a saved version: the live grid switches to it on the next request
// (the backend reads the published version per request — nothing to flush).
// The stored config is validated again before it can go live.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { validateConfig } from '@/lib/home/todayGrid';
import { failed, versionById, versionId } from '../shared';

export async function POST(request: Request) {
  const { actor, denied } = await requireAdmin();
  if (denied) return denied;
  const id = versionId(((await request.json().catch(() => null)) as { versionId?: unknown } | null)?.versionId);
  if (!id) return NextResponse.json({ error: 'Choose a version to publish.' }, { status: 400 });
  const version = await versionById(id);
  if (version.error) return failed('publish', version.error);
  if (!version.data) return NextResponse.json({ error: 'That version no longer exists.' }, { status: 404 });
  const { errors } = validateConfig(version.data.config);
  if (errors.length) return NextResponse.json({ error: 'This version has invalid settings and cannot go live.', errors }, { status: 422 });
  const { error } = await supabaseAdmin.rpc('publish_today_grid', { p_version: id, p_admin_email: actor.email });
  if (error) return failed('publish', error);
  return NextResponse.json({ publishedVersionId: id });
}
