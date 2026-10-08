// App settings (migration 112): per-app release gate (app_release_config:
// minimum/latest version, store links, force update, maintenance) and the
// customer FAQ list (app_faqs). The backend serves both publicly at
// GET /app-config and GET /app-config/release/:app. Service-role client.
//
// GET: every app's release row + every FAQ (including hidden ones).
// PUT: save one app's release row (body.app picks it).

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdminSession } from '@/lib/supabase/server';
import { validateReleaseInput } from '@/lib/appSettingsValidation';

const RELEASE_SELECT = 'app, min_supported_version, latest_version, ios_store_url, android_store_url, force_update, maintenance_enabled, maintenance_message, updated_at';
const FAQ_SELECT = 'id, question, answer, sort_order, is_active, updated_at';

export async function GET() {
  if (!(await requireAdminSession())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  try {
    const [releases, faqs] = await Promise.all([
      supabaseAdmin.from('app_release_config').select(RELEASE_SELECT).order('app'),
      supabaseAdmin.from('app_faqs').select(FAQ_SELECT).order('sort_order').order('created_at'),
    ]);
    if (releases.error) throw releases.error;
    if (faqs.error) throw faqs.error;
    return NextResponse.json({ releases: releases.data ?? [], faqs: faqs.data ?? [] });
  } catch {
    return NextResponse.json({ error: 'Could not load app settings.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  let row;
  try {
    row = validateReleaseInput(await request.json());
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Check the release settings.' }, { status: 400 });
  }
  try {
    const { data, error } = await supabaseAdmin.from('app_release_config')
      .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'app' })
      .select(RELEASE_SELECT).single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Could not save the release settings.' }, { status: 500 });
  }
}
