// Real rider applications — every users row with role='rider', service-role
// read (admin has no login flow yet, same rationale as every other
// app/api/* route in this dashboard).
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapRiderApplication, type ApiRiderApplication } from '@/lib/supabase/approvals';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, name, phone, is_approved, is_rejected, created_at')
      .eq('role', 'rider')
      .order('created_at', { ascending: false });
    if (error) throw error;

    return NextResponse.json((data as ApiRiderApplication[]).map(mapRiderApplication));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load rider applications.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
