// Real store applications — two sources merged into one list (see
// lib/supabase/approvals.ts's own note): pending/rejected applicants only
// exist as a store_onboarding_drafts row (no real `stores` row until
// approved); approved ones are the real `stores` row created at that
// moment. Service-role read (admin has no login flow yet, same rationale
// as every other app/api/* route in this dashboard).
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  mapApprovedStore,
  mapStoreDraft,
  type ApiApprovedStore,
  type ApiStoreDraft,
} from '@/lib/supabase/approvals';

export async function GET() {
  try {
    const [draftsRes, storesRes] = await Promise.all([
      supabaseAdmin
        .from('store_onboarding_drafts')
        .select('user_id, store_name, category, district, photo_url, gst_number, submitted_at, users!user_id(phone, is_rejected)')
        .not('submitted_at', 'is', null)
        .order('submitted_at', { ascending: false }),
      // owner_user_id is null for stores a founder added directly via
      // admin's own Add Store form (no partner onboarding involved) —
      // those aren't applications waiting on anyone's decision, excluded
      // here rather than showing up as a row with no applicant.
      supabaseAdmin
        .from('stores')
        .select('owner_user_id, name, category, district, photo_url, gst_number, created_at, users!owner_user_id(phone)')
        .not('owner_user_id', 'is', null)
        .order('created_at', { ascending: false }),
    ]);
    if (draftsRes.error) throw draftsRes.error;
    if (storesRes.error) throw storesRes.error;

    const applications = [
      ...(draftsRes.data as unknown as ApiStoreDraft[]).map(mapStoreDraft),
      ...(storesRes.data as unknown as ApiApprovedStore[]).map(mapApprovedStore),
    ];

    return NextResponse.json(applications);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load store applications.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
