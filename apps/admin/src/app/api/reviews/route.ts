// Reviews — real customer feedback (public.reviews, backend/migrations/
// 020_reviews.sql), previously only ever surfaced as one aggregate number
// (stores.rating) on the Performing Store table. This is the first place a
// founder can actually read what a review says, per store, to spot a real
// problem or an abusive/spam entry — not just watch the number move.
//
// Service-role read — reviews' own RLS only lets a customer read their own
// review or a store owner read their own store's reviews (020_reviews.sql),
// neither of which is a real admin session, same "no admin login yet" gap
// every other admin route works around.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';

interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  store_id: string;
  stores: { name: string } | null;
  users: { name: string | null; phone: string } | null;
}

export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  try {
    const { data, error } = await supabaseAdmin
      .from('reviews')
      .select('id, rating, comment, created_at, store_id, stores(name), users!customer_id(name, phone)')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;

    const reviews = ((data ?? []) as unknown as ReviewRow[]).map((row) => ({
      id: row.id,
      rating: row.rating,
      comment: row.comment,
      createdAt: row.created_at,
      storeId: row.store_id,
      storeName: row.stores?.name ?? 'Unknown store',
      customerName: row.users?.name ?? row.users?.phone ?? 'Unknown customer',
    }));

    return NextResponse.json(reviews);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load reviews.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
