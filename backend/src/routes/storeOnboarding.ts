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
import { toWebp } from '../utils/image.js';

export const storeOnboardingRouter = Router();

// Same bucket admin's own Add Store form uploads to (apps/admin/src/
// app/api/upload/route.ts's ALLOWED_BUCKETS) — one real Storage bucket for
// every storefront photo regardless of which surface uploaded it, not a
// second one. 'store-photos' (the old value here) was never actually
// created in Supabase — every onboarding photo upload was silently
// failing against a bucket that didn't exist.
const PHOTO_BUCKET = 'store-images';

// Submitting no longer writes a real `stores` row — it only marks the
// draft as "ready for review" (submitted_at). The real store row (and the
// role flip to store_owner) is created later, by admin's own approve
// action (apps/admin/src/app/api/approvals/stores/[userId]/route.ts) —
// per an explicit ask: a founder rejecting an application should never
// leave a half-real store sitting in the main `stores` table. Until
// approved, this applicant is still just a 'customer' role with a pending
// draft; nothing in the real product data model knows they applied except
// this one row.
storeOnboardingRouter.post('/store-application', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { storeName, category, district, addressLine, gstNumber, photoUrl, ownerName, shopLicenseNumber } = req.body as {
      storeName?: string;
      category?: string;
      district?: string;
      addressLine?: string;
      gstNumber?: string;
      photoUrl?: string;
      ownerName?: string;
      shopLicenseNumber?: string;
    };
    if (!storeName || !category || !district) {
      throw new AppError(400, 'MISSING_FIELDS', 'storeName, category and district are required.');
    }

    const { error } = await supabase.from('store_onboarding_drafts').upsert(
      {
        user_id: req.user!.id,
        store_name: storeName,
        category,
        district,
        address_line: addressLine || null,
        gst_number: gstNumber || null,
        photo_url: photoUrl || null,
        owner_name: ownerName || null,
        shop_establishment_number: shopLicenseNumber || null,
        // Clears out any reason from a previous rejection — a fresh
        // submission means a fresh review, not the old verdict still
        // hanging around next to it.
        rejection_reason: null,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    if (error) throw error;

    // Resubmitting after a rejection is a fresh review, not a continuation
    // of the old one — clear is_rejected so GET /auth/me stops reporting
    // the stale verdict the instant this new submission goes in.
    await supabase.from('users').update({ is_rejected: false }).eq('id', req.user!.id);

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
      .select('store_name, category, district, address_line, lat, lng, photo_url, gst_number, owner_name, shop_establishment_number, submitted_at')
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
    const { storeName, category, district, addressLine, lat, lng, photoUrl, gstNumber, ownerName, shopLicenseNumber } = req.body as {
      storeName?: string;
      category?: string;
      district?: string;
      addressLine?: string;
      lat?: number;
      lng?: number;
      photoUrl?: string;
      gstNumber?: string;
      ownerName?: string;
      shopLicenseNumber?: string;
    };

    // Partial upsert — only fields the caller actually sent overwrite the
    // existing row; a Step 2 PUT (photo/location/GST) must never blank out
    // Step 1's storeName/category/ownerName that a separate PUT already saved.
    const patch: Record<string, unknown> = { user_id: req.user!.id, updated_at: new Date().toISOString() };
    if (storeName !== undefined) patch.store_name = storeName;
    if (category !== undefined) patch.category = category;
    if (district !== undefined) patch.district = district;
    if (addressLine !== undefined) patch.address_line = addressLine;
    if (lat !== undefined) patch.lat = lat;
    if (lng !== undefined) patch.lng = lng;
    if (photoUrl !== undefined) patch.photo_url = photoUrl;
    if (gstNumber !== undefined) patch.gst_number = gstNumber;
    if (ownerName !== undefined) patch.owner_name = ownerName;
    if (shopLicenseNumber !== undefined) patch.shop_establishment_number = shopLicenseNumber;

    const { error } = await supabase.from('store_onboarding_drafts').upsert(patch, { onConflict: 'user_id' });
    if (error) throw error;

    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Storefront photo upload — base64 in, public Supabase Storage URL out.
// requireAuth only, same reasoning as above: the owner uploading their
// storefront photo during signup isn't role='store_owner' yet. Re-encoded
// to webp (utils/image.ts's toWebp) before it reaches Storage — same
// normalization the product-photo route and admin's own upload route do,
// so every storefront photo is webp regardless of source format.
storeOnboardingRouter.post('/store-photo', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { base64 } = req.body as { base64?: string };
    if (!base64) throw new AppError(400, 'MISSING_FIELDS', 'base64 is required.');

    const webpBuffer = await toWebp(Buffer.from(base64, 'base64'));
    const path = `${req.user!.id}/${randomUUID()}.webp`;
    const { error: uploadErr } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, webpBuffer, { contentType: 'image/webp' });
    if (uploadErr) throw new AppError(500, 'UPLOAD_FAILED', uploadErr.message);

    const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
    res.status(201).json({ url: data.publicUrl });
  } catch (err) {
    next(err);
  }
});
