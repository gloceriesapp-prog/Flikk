// Server-side read/write for the app_content singleton (migration 100) —
// customer-facing legal links, support contacts, About text and UI copy.
// service_role client: the table has no client grants at all. Same
// "guaranteed singleton, no [id] sub-route" shape as delivery-settings.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdminSession } from '@/lib/supabase/server';
import { isAllowedAdminEmail } from '@/lib/adminAccess';
import { APP_CONTENT_SELECT, mapRowToAppContent, validateAppContentInput, type AppContentRow } from '@/lib/appContentValidation';

async function adminUser() {
  const user = await requireAdminSession();
  return user && isAllowedAdminEmail(user.email) ? user : null;
}

export async function GET() {
  if (!(await adminUser())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const { data, error } = await supabaseAdmin.from('app_content').select(APP_CONTENT_SELECT).eq('id', true).maybeSingle();
  if (error) return NextResponse.json({ error: 'Could not load app content.' }, { status: 500 });
  return NextResponse.json(mapRowToAppContent(data as AppContentRow | null));
}

export async function PUT(request: Request) {
  const user = await adminUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  let row;
  try {
    row = validateAppContentInput(await request.json());
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Invalid input.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('app_content')
    .upsert({ id: true, ...row, updated_at: new Date().toISOString(), updated_by: user.id })
    .select(APP_CONTENT_SELECT)
    .single();
  if (error) {
    console.error('App content save failed', { code: error.code });
    return NextResponse.json({ error: 'Could not save app content. Please try again.' }, { status: 500 });
  }
  return NextResponse.json(mapRowToAppContent(data as AppContentRow));
}
