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
// Reject flips is_rejected on the user row and writes a real reason onto
// the still-kept draft (store_onboarding_drafts.rejection_reason) — the
// partner app's own WaitingApprovalScreen reads it via GET /auth/me so
// the owner sees why, not just a status flip with no explanation. Draft
// itself is left intact (not deleted), so a founder who changes their
// mind can still approve it later, and the owner can edit + resubmit
// without redoing the whole wizard from scratch.
//
// No `.eq('role', 'customer')` filter on the reject query anymore — that
// was the actual bug behind "reject button does nothing": a store owner
// who was already approved once and later submits a fresh application
// (edits their store, resubmits) has role='store_owner' by then, so that
// filter matched zero rows and silently 400'd. Rejecting only needs the
// applicant to exist, regardless of what role they currently hold.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { sendPushNotification } from '@/lib/pushNotification';
import { STORE_CATEGORIES } from '@/lib/store-options';


export async function PATCH(request: Request, ctx: RouteContext<'/api/approvals/stores/[userId]'>) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const { userId } = await ctx.params;
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(userId)) return NextResponse.json({ error: 'Invalid applicant.' }, { status: 400 });

  try {
    const { approve, reason, zoneId } = (await request.json()) as { approve: boolean; reason?: string; zoneId?: string };

    if (!approve) {
      // The applicant sees this reason in their app — a reject without one
      // left them guessing (the detail page used to send none at all).
      const trimmed = typeof reason === 'string' ? reason.trim() : '';
      if (trimmed.length < 3 || trimmed.length > 500) {
        return NextResponse.json({ error: 'Give a rejection reason (3–500 characters).' }, { status: 400 });
      }
      const { data: user, error } = await supabaseAdmin
        .from('users')
        .update({ is_approved: false, is_rejected: true })
        .eq('id', userId)
        .select('id, expo_push_token')
        .single();
      if (error || !user) throw new Error('No pending store application for that id.');

      const rejectionReason = trimmed;
      await supabaseAdmin
        .from('store_onboarding_drafts')
        .update({ rejection_reason: rejectionReason })
        .eq('user_id', userId);

      await sendPushNotification(
        user.expo_push_token,
        'Your application needs another look',
        rejectionReason,
      );

      return NextResponse.json({ ok: true });
    }

    const { data: draft, error: draftError } = await supabaseAdmin
      .from('store_onboarding_drafts')
      .select(
        'store_name, category, district, address_line, manual_address, photo_url, gst_number, lat, lng, owner_name, shop_establishment_number, fssai_number, pan_number, phone, udyam_number, drug_license_number, open_time, close_time',
      )
      .eq('user_id', userId)
      .not('submitted_at', 'is', null)
      .single();
    if (draftError || !draft) throw new Error('No submitted application found for that id.');

    // Same category rules as the backend (lib/storeCategories.ts): only the
    // admin category list, and a pharmacy only with a drug licence.
    if (!STORE_CATEGORIES.some((c) => c === draft.category)) {
      return NextResponse.json({ error: `“${draft.category}” is not a store category Gloceries allows. Reject so the applicant picks one from the list.` }, { status: 400 });
    }
    if (draft.category === 'Pharmacy' && !draft.drug_license_number?.trim()) {
      return NextResponse.json({ error: 'A pharmacy needs a drug licence number. Reject so the applicant adds it.' }, { status: 400 });
    }

    // One store per owner: an approved owner who reapplies must not get a
    // second store (the migration 110 trigger enforces the same in the DB).
    const { count: ownedStores, error: ownedError } = await supabaseAdmin
      .from('stores')
      .select('id', { count: 'exact', head: true })
      .eq('owner_user_id', userId);
    if (ownedError) throw ownedError;
    if ((ownedStores ?? 0) > 0) {
      return NextResponse.json(
        { error: 'This applicant already owns a store. Reject this re-application or edit the existing store instead.' },
        { status: 409 },
      );
    }

    // Zones have no geometry, so the store's zone is: the one the founder
    // picked (when several are active), else the only active zone.
    const { data: activeZones, error: zoneError } = await supabaseAdmin.from('zones').select('id').eq('is_active', true);
    if (zoneError) throw zoneError;
    const zone = zoneId ? activeZones?.find((z) => z.id === zoneId) : activeZones?.length === 1 ? activeZones[0] : undefined;
    if (!activeZones?.length) throw new Error('No active zone configured. Activate a zone first.');
    if (!zone) {
      return NextResponse.json(
        { error: zoneId ? 'Pick an active zone.' : 'Several zones are active — open the application and choose its zone.' },
        { status: 400 },
      );
    }

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
      address_line: draft.address_line,
      gst_number: draft.gst_number,
      photo_url: draft.photo_url,
      lat: draft.lat,
      lng: draft.lng,
      owner_name: draft.owner_name,
      shop_establishment_number: draft.shop_establishment_number,
      manual_address: draft.manual_address,
      fssai_number: draft.fssai_number,
      pan_number: draft.pan_number,
      phone: draft.phone,
      udyam_number: draft.udyam_number,
      drug_license_number: draft.drug_license_number,
      open_time: draft.open_time,
      close_time: draft.close_time,
    });
    if (storeError?.code === 'P0409' && storeError.message === 'STORE_ALREADY_OWNED') {
      return NextResponse.json({ error: 'This applicant already owns a store.' }, { status: 409 });
    }
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
      'Your store is live on Gloceries — you can start receiving orders now.',
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update this application.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
