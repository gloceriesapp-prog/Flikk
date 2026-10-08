// Partner and rider help contacts (migration 118: app_release_config
// support_phone / support_email / support_whatsapp). The backend serves them
// at GET /app-config/support/:app; the partner app's Help & support screen
// and the rider app's Profile/Home help buttons read that.
//
// PUT: save one app's contacts (body.app = 'partner' | 'rider').

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireStoreAdmin } from '@/features/store-management/adminGate';
import { validateSupportContactsInput } from '@/lib/appSettingsValidation';

export async function PUT(request: Request) {
  const unauthorized = await requireStoreAdmin();
  if (unauthorized) return unauthorized;
  let row;
  try {
    row = validateSupportContactsInput(await request.json());
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Check the support contacts.' }, { status: 400 });
  }
  try {
    const { data, error } = await supabaseAdmin.from('app_release_config')
      .update({ support_phone: row.support_phone, support_email: row.support_email, support_whatsapp: row.support_whatsapp, updated_at: new Date().toISOString() })
      .eq('app', row.app)
      .select('app, support_phone, support_email, support_whatsapp')
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Could not save the support contacts.' }, { status: 500 });
  }
}
