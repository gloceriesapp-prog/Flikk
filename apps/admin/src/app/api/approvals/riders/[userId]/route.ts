// Approve/deny a rider applicant — same real pattern as
// approvals/stores/[userId]/route.ts, applied to rider_onboarding_drafts/
// riders (migrations/042_rider_onboarding.sql) now that rider onboarding
// is a real self-serve wizard instead of a manual DB edit.
//
// Approve is the ONLY moment a real `riders` row gets created — unapproved
// application data (Aadhaar, DL, home address, emergency contact) never
// lands in the main `riders` table until a founder actually reviews it.
// Flips the applicant's role to 'rider' and is_approved to true at the
// same moment, then deletes the draft.
//
// Reject flips is_rejected on the user row and writes a real reason onto
// the still-kept draft — the rider app's own AccountStatusScreen reads it
// via GET /auth/me. Draft itself is left intact (not deleted), so a
// founder who changes their mind can still approve it later, and the
// rider can edit + resubmit without redoing the whole wizard.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendPushNotification } from '@/lib/pushNotification';
import { createNotification } from '@/lib/notification';

const DEFAULT_REJECTION_REASON =
  "We couldn't verify your documents this time. Please double-check your details and photos, then resubmit your application.";

export async function PATCH(request: Request, ctx: RouteContext<'/api/approvals/riders/[userId]'>) {
  const { userId } = await ctx.params;

  try {
    const { approve, reason } = (await request.json()) as { approve: boolean; reason?: string };

    if (!approve) {
      const { data: user, error } = await supabaseAdmin
        .from('users')
        .update({ is_approved: false, is_rejected: true })
        .eq('id', userId)
        .select('id, expo_push_token')
        .single();
      if (error || !user) throw new Error('No pending rider application for that id.');

      const rejectionReason = reason?.trim() || DEFAULT_REJECTION_REASON;
      await supabaseAdmin.from('rider_onboarding_drafts').update({ rejection_reason: rejectionReason }).eq('user_id', userId);

      await sendPushNotification(user.expo_push_token, 'Your application needs another look', rejectionReason);
      void createNotification({ userId, title: 'Your application needs another look', body: rejectionReason, type: 'rejection' });

      return NextResponse.json({ ok: true });
    }

    const { data: draft, error: draftError } = await supabaseAdmin
      .from('rider_onboarding_drafts')
      .select(
        'full_name, date_of_birth, photo_url, home_address, aadhaar_number, aadhaar_photo_url, dl_number, dl_photo_url, vehicle_type, vehicle_number, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship',
      )
      .eq('user_id', userId)
      .not('submitted_at', 'is', null)
      .single();
    if (draftError || !draft) throw new Error('No submitted application found for that id.');

    const { data: applicant, error: applicantError } = await supabaseAdmin.from('users').select('phone').eq('id', userId).single();
    if (applicantError || !applicant) throw new Error('Applicant not found.');

    const { error: riderError } = await supabaseAdmin.from('riders').insert({
      user_id: userId,
      name: draft.full_name,
      phone: applicant.phone,
      date_of_birth: draft.date_of_birth,
      photo_url: draft.photo_url,
      home_address: draft.home_address,
      aadhaar_number: draft.aadhaar_number,
      aadhaar_photo_url: draft.aadhaar_photo_url,
      dl_number: draft.dl_number,
      dl_photo_url: draft.dl_photo_url,
      vehicle_type: draft.vehicle_type,
      vehicle_number: draft.vehicle_number,
      emergency_contact_name: draft.emergency_contact_name,
      emergency_contact_phone: draft.emergency_contact_phone,
      emergency_contact_relationship: draft.emergency_contact_relationship,
    });
    if (riderError) throw riderError;

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .update({ role: 'rider', is_approved: true, is_rejected: false })
      .eq('id', userId)
      .select('expo_push_token')
      .single();
    if (userError || !user) throw new Error('Could not approve this applicant.');

    await supabaseAdmin.from('rider_onboarding_drafts').delete().eq('user_id', userId);

    await sendPushNotification(user.expo_push_token, "You're approved! 🎉", "You're all set to start taking deliveries on Flikk.");
    void createNotification({ userId, title: "You're approved! 🎉", body: "You're all set to start taking deliveries on Flikk.", type: 'approval' });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update this application.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
