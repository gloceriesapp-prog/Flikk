// Approve/deny a store owner — the only write path that flips
// users.is_approved/is_rejected for a store application. Manual for now
// (a founder decides every one by hand) — CLAUDE.md's own MVP scope, an
// automated approval algorithm is a later-scale problem, not built
// speculatively now. On approve, sends a push notification to the owner's
// registered device (users.expo_push_token, set by the partner app's own
// POST /auth/push-token) so a closed app still finds out, not just the
// partner app's in-app polling.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendPushNotification } from '@/lib/pushNotification';

export async function PATCH(request: Request, ctx: RouteContext<'/api/approvals/stores/[userId]'>) {
  const { userId } = await ctx.params;

  try {
    const { approve } = (await request.json()) as { approve: boolean };

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ is_approved: approve, is_rejected: !approve })
      .eq('id', userId)
      .eq('role', 'store_owner')
      .select('id, name, expo_push_token')
      .single();
    if (error || !data) throw new Error('No pending store owner with that id.');

    if (approve) {
      await sendPushNotification(
        data.expo_push_token,
        "You're approved! 🎉",
        'Your store is live on Flikk — you can start receiving orders now.',
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update this application.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
