// One customer's full account view — profile, real addresses, real order
// history. Service-role, same rationale as app/api/customers/route.ts's
// own note.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: Request, ctx: RouteContext<'/api/customers/[id]'>) {
  const { id } = await ctx.params;

  try {
    const [userRes, addressesRes, ordersRes] = await Promise.all([
      supabaseAdmin.from('users').select('id, name, phone, created_at').eq('id', id).eq('role', 'customer').maybeSingle(),
      supabaseAdmin.from('addresses').select('id, label, line1, landmark, is_default').eq('user_id', id),
      supabaseAdmin
        .from('orders')
        .select('id, status, total, placed_at, stores(name)')
        .eq('customer_id', id)
        .order('placed_at', { ascending: false })
        .limit(50),
    ]);
    if (userRes.error) throw userRes.error;
    if (!userRes.data) return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
    if (addressesRes.error) throw addressesRes.error;
    if (ordersRes.error) throw ordersRes.error;

    return NextResponse.json({
      id: userRes.data.id,
      name: userRes.data.name,
      phone: userRes.data.phone,
      createdAt: userRes.data.created_at,
      addresses: (addressesRes.data ?? []).map((a) => ({
        id: a.id,
        label: a.label,
        line1: a.line1,
        landmark: a.landmark,
        isDefault: a.is_default,
      })),
      orders: (ordersRes.data ?? []).map((o) => ({
        id: o.id,
        status: o.status,
        total: Number(o.total),
        placedAt: o.placed_at,
        storeName: (o.stores as unknown as { name: string } | null)?.name ?? 'Unknown store',
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load this customer.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
