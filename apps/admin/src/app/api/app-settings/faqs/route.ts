// Create a customer FAQ entry (app_faqs, migration 112).
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { validateFaqInput } from '@/lib/appSettingsValidation';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export async function POST(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
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
