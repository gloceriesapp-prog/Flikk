// Approve/deny a rider — same pattern as stores/[userId]/route.ts, see
// that file's own note on the push-notification behavior.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendPushNotification } from '@/lib/pushNotification';

export async function PATCH(request: Request, ctx: RouteContext<'/api/approvals/riders/[userId]'>) {
  const { userId } = await ctx.params;

  try {
    const { approve } = (await request.json()) as { approve: boolean };

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ is_approved: approve, is_rejected: !approve })
      .eq('id', userId)
      .eq('role', 'rider')
      .select('id, expo_push_token')
      .single();
    if (error || !data) throw new Error('No pending rider with that id.');

    if (approve) {
      await sendPushNotification(
        data.expo_push_token,
        "You're approved! 🎉",
        "You're all set to start taking deliveries on Flikk.",
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update this application.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
