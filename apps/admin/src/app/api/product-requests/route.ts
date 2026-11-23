// "Didn't find an item?" requests from the customer Store list
// (product_requests, migration 20261120090000). Newest first, capped.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export interface ProductRequest {
  id: string;
  message: string;
  city: string | null;
  storeName: string | null;
  status: 'new' | 'done';
  createdAt: string;
}

export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  try {
    const { data, error } = await supabaseAdmin
      .from('product_requests')
      .select('id, message, city, store_name, status, created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    const requests: ProductRequest[] = (data ?? []).map((row) => ({
      id: row.id, message: row.message, city: row.city, storeName: row.store_name, status: row.status, createdAt: row.created_at,
    }));
    return NextResponse.json(requests);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load product requests.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
