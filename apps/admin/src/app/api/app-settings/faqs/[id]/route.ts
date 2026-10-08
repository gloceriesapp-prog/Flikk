// Edit or delete one customer FAQ entry (app_faqs, migration 112).
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdminSession } from '@/lib/supabase/server';
import { validateFaqInput } from '@/lib/appSettingsValidation';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, ctx: RouteContext<'/api/app-settings/faqs/[id]'>) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const { id } = await ctx.params;
  if (!UUID.test(id)) return NextResponse.json({ error: 'Invalid FAQ.' }, { status: 400 });
  let row;
  try {
    row = validateFaqInput(await request.json());
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Check the FAQ.' }, { status: 400 });
  }
  try {
    const { data, error } = await supabaseAdmin.from('app_faqs').update({ ...row, updated_at: new Date().toISOString() })
      .eq('id', id).select('id, question, answer, sort_order, is_active, updated_at').maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'FAQ not found.' }, { status: 404 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Could not save the FAQ.' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, ctx: RouteContext<'/api/app-settings/faqs/[id]'>) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const { id } = await ctx.params;
  if (!UUID.test(id)) return NextResponse.json({ error: 'Invalid FAQ.' }, { status: 400 });
  try {
    const { error } = await supabaseAdmin.from('app_faqs').delete().eq('id', id);
    if (error) throw error;
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Could not delete the FAQ.' }, { status: 500 });
  }
}
