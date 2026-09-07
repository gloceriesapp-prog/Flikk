// Approve/deny a store owner. Manual for now (a founder decides every one
// by hand) — CLAUDE.md's own MVP scope, an automated approval algorithm is
// a later-scale problem, not built speculatively now.
//
// Approve is the ONLY moment a real `stores` row gets created — per an
// explicit ask, unapproved application data must never land in the main
// `stores` table. It reads the submitted draft (store_onboarding_drafts),
// inserts the real row from it, flips the applicant's role to
// 'store_owner' and is_approved to true, then deletes the draft — nothing
// left to resume into once the real thing exists. Also sends a push
// notification to the owner's registered device (users.expo_push_token,
// set by the partner app's own POST /auth/push-token) so a closed app
// still finds out, not just the partner app's in-app polling.
//
// Reject only flips is_rejected on the user row — the draft is left
// intact (not deleted), so a founder who changes their mind can still
// approve it later without the applicant having to redo the wizard.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendPushNotification } from '@/lib/pushNotification';

export async function PATCH(request: Request, ctx: RouteContext<'/api/approvals/stores/[userId]'>) {
  const { userId } = await ctx.params;

  try {
    const { approve } = (await request.json()) as { approve: boolean };

    if (!approve) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .update({ is_approved: false, is_rejected: true })
        .eq('id', userId)
        .eq('role', 'customer')
        .select('id')
        .single();
      if (error || !data) throw new Error('No pending store application for that id.');
      return NextResponse.json({ ok: true });
    }

    const { data: draft, error: draftError } = await supabaseAdmin
      .from('store_onboarding_drafts')
      .select('store_name, category, district, photo_url, gst_number, lat, lng')
      .eq('user_id', userId)
      .not('submitted_at', 'is', null)
      .single();
    if (draftError || !draft) throw new Error('No submitted application found for that id.');

    // Single-zone launch (CLAUDE.md) — the app never picks a zone, this is
    // the one active one.
    const { data: zone, error: zoneError } = await supabaseAdmin.from('zones').select('id').eq('is_active', true).single();
    if (zoneError || !zone) throw new Error('No active zone configured.');

    // lat/lng carried straight through from the draft — the owner already
    // pinned their exact store location during onboarding (LocationPinScreen),
    // this is the one moment that pin becomes the store's permanent,
    // queryable location (this file's own header note has the full context).
    const { error: storeError } = await supabaseAdmin.from('stores').insert({
      owner_user_id: userId,
      zone_id: zone.id,
      name: draft.store_name,
      category: draft.category,
      district: draft.district,
      gst_number: draft.gst_number,
      photo_url: draft.photo_url,
      lat: draft.lat,
      lng: draft.lng,
    });
    if (storeError) throw storeError;

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .update({ role: 'store_owner', is_approved: true, is_rejected: false })
      .eq('id', userId)
      .select('expo_push_token')
      .single();
    if (userError || !user) throw new Error('Could not approve this applicant.');

    await supabaseAdmin.from('store_onboarding_drafts').delete().eq('user_id', userId);

    await sendPushNotification(
      user.expo_push_token,
      "You're approved! 🎉",
      'Your store is live on Flikk — you can start receiving orders now.',
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update this application.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
