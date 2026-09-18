// Zone Requests tab's real data (zones/page.tsx) — "bring the app to my
// area" votes (customer app's area_upvotes table, backend/migrations/
// 032_area_upvotes.sql), grouped by their exact address_label since real
// votes are anonymous with no formal district/zone assigned yet — the raw
// text a customer's location resolved to is the only real grouping key
// available. Sorted by count, most-requested first.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { ZoneRequest } from '@/lib/types';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('area_upvotes')
      .select('address_label, created_at')
      .order('created_at', { ascending: true });
    if (error) throw error;

    const groups = new Map<string, ZoneRequest>();
    for (const row of data ?? []) {
      const existing = groups.get(row.address_label);
      if (existing) {
        existing.upvotes += 1;
      } else {
        groups.set(row.address_label, {
          id: row.address_label,
          placeName: row.address_label,
          district: '',
          upvotes: 1,
          firstRequestedAt: row.created_at,
        });
      }
    }

    const requests = [...groups.values()].sort((a, b) => b.upvotes - a.upvotes);
    return NextResponse.json(requests);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load area upvotes.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
