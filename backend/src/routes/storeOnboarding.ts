// Store Setup (partner app P1) — deliberately its own router, not part of
// partnerRouter. partnerRouter.use(requireAuth, requireRole('store_owner'),
// requireApproved) gates every route in it, but a person submitting their
// first store application doesn't have role='store_owner' yet (requireAuth
// lazy-provisions everyone as 'customer' — see middleware/auth.ts) and
// definitely isn't approved yet either. This route only needs requireAuth:
// any authenticated session can apply, and applying is what promotes the
// caller to store_owner in the first place.
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';

export const storeOnboardingRouter = Router();

const PHOTO_BUCKET = 'store-photos';

storeOnboardingRouter.post('/store-application', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { storeName, category, district, gstNumber, photoUrl } = req.body as {
      storeName?: string;
      category?: string;
      district?: string;
      gstNumber?: string;
      photoUrl?: string;
    };
    if (!storeName || !category || !district) {
      throw new AppError(400, 'MISSING_FIELDS', 'storeName, category and district are required.');
    }

    // Single-zone launch (CLAUDE.md) — the app never picks a zone, this is
    // the one active one.
    const { data: zone, error: zoneErr } = await supabase.from('zones').select('id').eq('is_active', true).single();
    if (zoneErr || !zone) throw new AppError(500, 'NO_ACTIVE_ZONE', 'No active zone configured.');

    const { error: roleErr } = await supabase.from('users').update({ role: 'store_owner' }).eq('id', req.user!.id);
    if (roleErr) throw roleErr;

    const { error: storeErr } = await supabase.from('stores').insert({
      owner_user_id: req.user!.id,
      zone_id: zone.id,
      name: storeName,
      category,
      district,
      gst_number: gstNumber || null,
      photo_url: photoUrl || null,
    });
    if (storeErr) throw storeErr;

    // Draft's only purpose was surviving an app close mid-wizard — a real
    // store row now exists, so there's nothing left to resume into.
    await supabase.from('store_onboarding_drafts').delete().eq('user_id', req.user!.id);

    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Store Setup's own "resume where you left off" — every step (StoreSetup/
// StoreDetails screens) PUTs whatever fields it just collected, merged
// onto whatever's already saved; RootNavigator's own AuthNavigator drops a
// returning has_store:false session at StoreSetupScreen, which GETs this
// on mount to decide which step to actually resume at instead of always
// restarting from a blank Step 1. requireAuth only, same reasoning as
// /store-application: this exists specifically for someone who hasn't
// finished becoming a store_owner yet.
storeOnboardingRouter.get('/store-draft', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { data, error } = await supabase
      .from('store_onboarding_drafts')
      .select('store_name, category, district, lat, lng, photo_url, gst_number')
      .eq('user_id', req.user!.id)
      .maybeSingle();
    if (error) throw error;

    res.json(data ?? null);
  } catch (err) {
    next(err);
  }
});

storeOnboardingRouter.patch('/store-draft', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { storeName, category, district, lat, lng, photoUrl, gstNumber } = req.body as {
      storeName?: string;
      category?: string;
      district?: string;
      lat?: number;
      lng?: number;
      photoUrl?: string;
      gstNumber?: string;
    };

    // Partial upsert — only fields the caller actually sent overwrite the
    // existing row; a Step 2 PUT (photo/location/GST) must never blank out
    // Step 1's storeName/category that a separate PUT already saved.
    const patch: Record<string, unknown> = { user_id: req.user!.id, updated_at: new Date().toISOString() };
    if (storeName !== undefined) patch.store_name = storeName;
    if (category !== undefined) patch.category = category;
    if (district !== undefined) patch.district = district;
    if (lat !== undefined) patch.lat = lat;
    if (lng !== undefined) patch.lng = lng;
    if (photoUrl !== undefined) patch.photo_url = photoUrl;
    if (gstNumber !== undefined) patch.gst_number = gstNumber;

    const { error } = await supabase.from('store_onboarding_drafts').upsert(patch, { onConflict: 'user_id' });
    if (error) throw error;

    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Storefront photo upload — base64 in, public Supabase Storage URL out.
// requireAuth only, same reasoning as above: the owner uploading their
// storefront photo during signup isn't role='store_owner' yet.
storeOnboardingRouter.post('/store-photo', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { base64, contentType } = req.body as { base64?: string; contentType?: string };
    if (!base64 || !contentType) throw new AppError(400, 'MISSING_FIELDS', 'base64 and contentType are required.');

    const extension = contentType.split('/')[1] ?? 'jpg';
    const path = `${req.user!.id}/${randomUUID()}.${extension}`;
    const { error: uploadErr } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, Buffer.from(base64, 'base64'), { contentType });
    if (uploadErr) throw new AppError(500, 'UPLOAD_FAILED', uploadErr.message);

    const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
    res.status(201).json({ url: data.publicUrl });
  } catch (err) {
    next(err);
  }
});
