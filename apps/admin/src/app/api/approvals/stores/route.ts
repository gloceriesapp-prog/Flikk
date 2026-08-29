// Real store applications — every store row joined to its owner's approval
// state, service-role read (admin has no login flow yet, same rationale as
// every other app/api/* route in this dashboard).
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapStoreApplication, type ApiStoreApplication } from '@/lib/supabase/approvals';

const SELECT =
  'owner_user_id, name, category, district, photo_url, gst_number, fssai_number, shop_establishment_number, pan_number, aadhaar_last4, bank_account_last4, turnover_exceeds_gst_threshold, drug_license_number, created_at, users!owner_user_id(phone, is_approved, is_rejected)';

export async function GET() {
  try {
    // owner_user_id is null for stores a founder added directly via admin's
    // own Add Store form (no partner onboarding involved) — those aren't
    // applications waiting on anyone's decision, so they're excluded here
    // rather than showing up as a permanently-pending row with no owner to
    // approve.
    const { data, error } = await supabaseAdmin
      .from('stores')
      .select(SELECT)
      .not('owner_user_id', 'is', null)
      .order('created_at', { ascending: false });
    if (error) throw error;

    return NextResponse.json((data as unknown as ApiStoreApplication[]).map(mapStoreApplication));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load store applications.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
