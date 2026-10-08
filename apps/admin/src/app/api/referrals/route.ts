// Referrals, read-only (referral_codes / referral_signups, migration 022).
// The referral system only tracks who invited whom: there is no reward or
// credit ledger anywhere (022's note: rewards are out of scope for now), so
// this lists invites and whether the invited customer went on to order.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';

interface Person {
  id: string;
  name: string | null;
  phone: string;
}

export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  try {
    const [signupsRes, codesRes] = await Promise.all([
      supabaseAdmin
        .from('referral_signups')
        .select('id, created_at, referred:users!referred_user_id(id, name, phone), referral_codes(code, referrer:users!user_id(id, name, phone))')
        .order('created_at', { ascending: false })
        .limit(200),
      supabaseAdmin.from('referral_codes').select('id', { count: 'exact', head: true }),
    ]);
    if (signupsRes.error) throw signupsRes.error;
    if (codesRes.error) throw codesRes.error;

    const rows = (signupsRes.data ?? []).map((s) => {
      const code = s.referral_codes as unknown as { code: string; referrer: Person | null } | null;
      return { id: s.id, createdAt: s.created_at, code: code?.code ?? '', referrer: code?.referrer ?? null, referred: s.referred as unknown as Person | null };
    });
    const referredIds = rows.map((r) => r.referred?.id).filter((id): id is string => !!id);
    const { data: delivered, error: deliveredError } = referredIds.length
      ? await supabaseAdmin.from('orders').select('customer_id').eq('status', 'delivered').in('customer_id', referredIds)
      : { data: [], error: null };
    if (deliveredError) throw deliveredError;
    const ordered = new Set((delivered ?? []).map((o) => o.customer_id as string));

    const byReferrer = new Map<string, { referrer: Person; invites: number; ordered: number }>();
    for (const r of rows) {
      if (!r.referrer) continue;
      const entry = byReferrer.get(r.referrer.id) ?? { referrer: r.referrer, invites: 0, ordered: 0 };
      entry.invites += 1;
      if (r.referred && ordered.has(r.referred.id)) entry.ordered += 1;
      byReferrer.set(r.referrer.id, entry);
    }

    return NextResponse.json({
      codesIssued: codesRes.count ?? 0,
      signups: rows.map((r) => ({ ...r, hasDeliveredOrder: !!r.referred && ordered.has(r.referred.id) })),
      topReferrers: [...byReferrer.values()].sort((a, b) => b.invites - a.invites).slice(0, 10),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load referrals.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
