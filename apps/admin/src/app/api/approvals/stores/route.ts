// Real store applications — two sources merged into one list (see
// lib/supabase/approvals.ts's own note): pending/rejected applicants only
// exist as a store_onboarding_drafts row (no real `stores` row until
// approved); approved ones are the real `stores` row created at that
// moment. Service-role read (admin has no login flow yet, same rationale
// as every other app/api/* route in this dashboard).
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import {
  APPROVED_STORE_SELECT,
  STORE_DRAFT_SELECT,
  mapApprovedStore,
  mapStoreDraft,
  type ApiApprovedStore,
  type ApiStoreDraft,
} from '@/lib/supabase/approvals';

export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  try {
    const [draftsRes, storesRes] = await Promise.all([
      supabaseAdmin
        .from('store_onboarding_drafts')
        .select(STORE_DRAFT_SELECT)
        .not('submitted_at', 'is', null)
        .order('submitted_at', { ascending: false }),
      // owner_user_id is null for stores a founder added directly via
      // admin's own Add Store form (no partner onboarding involved) —
      // those aren't applications waiting on anyone's decision, excluded
      // here rather than showing up as a row with no applicant.
      supabaseAdmin
        .from('stores')
        .select(APPROVED_STORE_SELECT)
        .not('owner_user_id', 'is', null)
        .order('created_at', { ascending: false }),
    ]);
    if (draftsRes.error) throw draftsRes.error;
    if (storesRes.error) throw storesRes.error;

    const approvedRows = storesRes.data as unknown as ApiApprovedStore[];
    const owners = new Set(approvedRows.map((row) => row.owner_user_id));
    const applications = [
      ...(draftsRes.data as unknown as ApiStoreDraft[]).map((row) => ({ ...mapStoreDraft(row), alreadyOwnsStore: owners.has(row.user_id) })),
      ...approvedRows.map(mapApprovedStore),
    ];

    return NextResponse.json(applications);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load store applications.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
