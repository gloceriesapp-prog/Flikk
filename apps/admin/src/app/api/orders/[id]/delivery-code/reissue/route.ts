// Reissue a delivery code — admin_reissue_delivery_code (migration 109), which
// runs the same reissue_delivery_code SQL function as backend
// POST /admin/orders/:id/delivery-code/reissue (fresh 4-digit code for the
// order's trip/order scope, 2-hour expiry, wrong attempts reset, a
// delivery_code_resets row) and records the admin action. The code is never
// returned: only the customer reads it, in their own app.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { adminRpcErrorResponse, isUuid } from '@/lib/orders/adminActor';

export async function POST(_request: Request, ctx: RouteContext<'/api/orders/[id]/delivery-code/reissue'>) {
  const { actor, denied } = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });

  try {
    // p_actor must be the admin's users row (reissue_delivery_code checks role='admin').
    const { data, error } = await supabaseAdmin.rpc('admin_reissue_delivery_code', { p_order: id, p_actor: actor.id, p_admin_email: actor.email });
    if (error) {
      const mapped = adminRpcErrorResponse(error);
      if (mapped) return mapped;
      throw error;
    }
    const result = data as { expires_at: string; attempts: number };
    return NextResponse.json({ reissued: true, expiresAt: result.expires_at });
  } catch (err) {
    console.error('Delivery code reissue failed', { code: (err as { code?: string } | null)?.code });
    return NextResponse.json({ error: 'A new code can only be issued for an active delivery.' }, { status: 409 });
  }
}
