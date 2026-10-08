// Create a customer FAQ entry (app_faqs, migration 112).
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdminSession } from '@/lib/supabase/server';
import { validateFaqInput } from '@/lib/appSettingsValidation';

export async function POST(request: Request) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  let row;
  try {
    row = validateFaqInput(await request.json());
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Check the FAQ.' }, { status: 400 });
  }
  try {
    const { data, error } = await supabaseAdmin.from('app_faqs').insert(row)
      .select('id, question, answer, sort_order, is_active, updated_at').single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Could not save the FAQ.' }, { status: 500 });
  }
}
