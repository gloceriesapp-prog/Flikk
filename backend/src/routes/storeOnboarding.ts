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

    res.status(201).json({ ok: true });
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
