// Customer search — real, service-role (users/orders have no public RLS
// read policy admin can use, same rationale as every other admin route
// here). Previously there was no admin page at all for a customer
// account: no way to look someone up for a support/dispute conversation
// without querying the DB by hand.
//
// order count + total spend are real aggregates (delivered orders only,
// same "cancelled/pending don't count as earned" rule app/api/overview's
// own topStores uses), not stored columns — computed here per matching
// customer so the list stays honest as new orders land.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { activeBlock, sanitizeCustomerSearch, type CustomerBlockRow } from '@/lib/customerBlocks';

interface UserRow {
  id: string;
  name: string | null;
  phone: string;
  created_at: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = sanitizeCustomerSearch(searchParams.get('q') ?? '');

    let query = supabaseAdmin.from('users').select('id, name, phone, created_at').eq('role', 'customer').order('created_at', { ascending: false });
    if (q) query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);

    const { data: users, error } = await query.limit(50);
    if (error) throw error;

    const userIds = (users ?? []).map((u) => u.id);
    const { data: orders, error: ordersErr } = userIds.length
      ? await supabaseAdmin.from('orders').select('customer_id, total, status').in('customer_id', userIds)
      : { data: [], error: null };
    if (ordersErr) throw ordersErr;

    const { data: blocks, error: blocksErr } = userIds.length
      ? await supabaseAdmin
          .from('customer_blocks')
          .select('user_id, reason, blocked_at, blocked_until, unblocked_at')
          .in('user_id', userIds)
          .is('unblocked_at', null)
      : { data: [], error: null };
    if (blocksErr) throw blocksErr;
    const blockByCustomer = new Map<string, CustomerBlockRow>();
    for (const row of (blocks ?? []) as CustomerBlockRow[]) blockByCustomer.set(row.user_id, row);

    const statsByCustomer = new Map<string, { orderCount: number; totalSpend: number }>();
    for (const order of orders ?? []) {
      const entry = statsByCustomer.get(order.customer_id) ?? { orderCount: 0, totalSpend: 0 };
      entry.orderCount += 1;
      if (order.status === 'delivered') entry.totalSpend += Number(order.total);
      statsByCustomer.set(order.customer_id, entry);
    }

    const customers = ((users ?? []) as UserRow[]).map((u) => ({
      id: u.id,
      name: u.name,
      phone: u.phone,
      createdAt: u.created_at,
      orderCount: statsByCustomer.get(u.id)?.orderCount ?? 0,
      totalSpend: statsByCustomer.get(u.id)?.totalSpend ?? 0,
      block: activeBlock(blockByCustomer.get(u.id)),
    }));

    return NextResponse.json(customers);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load customers.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
