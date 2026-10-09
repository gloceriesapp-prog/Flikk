import { resolveStoreAccess } from '../stores/access.js';
import { storePrivateDocument } from '../media/privateDocuments.js';
import { storePublicImage } from '../media/publicImages.js';
// Store Setup (partner app P1) — deliberately its own router, not part of
// partnerRouter. partnerRouter.use(requireAuth, requireRole('store_owner'),
// requireApproved) gates every route in it, but a person submitting their
// first store application doesn't have role='store_owner' yet (requireAuth
// lazy-provisions everyone as 'customer' — see middleware/auth.ts) and
// definitely isn't approved yet either. This route only needs requireAuth:
// any authenticated session can apply, and applying is what promotes the
// caller to store_owner in the first place.
import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { decodeImage, toWebp, normalizeImage } from '../utils/image.js';
import { isValidFssaiFormat, isValidPanFormat } from '../lib/documentValidation.js';
import { assertStoreCategory, DRUG_LICENSE_CATEGORIES, isStoreCategory, normalizeDrugLicense, storeCategoryOptions } from '../lib/storeCategories.js';

export const storeOnboardingRouter = Router();

// Onboarding/upload routes mount before the approved partner router; fence managers here too.
async function requirePrimaryStoreAccount(req: AuthedRequest, _res: import('express').Response, next: import('express').NextFunction) {
  try {
    if (req.user?.role === 'store_owner' && (await resolveStoreAccess(req.user.id))?.role === 'manager') throw new AppError(403, 'OWNER_REQUIRED', 'Only the primary owner can edit store documents or onboarding details.');
    next();
  } catch (error) { next(error); }
}


interface OnboardingFields {
  storeName?: string;
  category?: string;
  phone?: string;
  district?: string;
  addressLine?: string;
  manualAddress?: string;
  gstNumber?: string;
  photoUrl?: string;
  ownerName?: string;
  ownerEmail?: string;
  shopLicenseNumber?: string;
  fssaiNumber?: string;
  panNumber?: string;
  udyamNumber?: string;
  // Pharmacy only — required for that category (lib/storeCategories.ts).
  drugLicenseNumber?: string;
  openTime?: string;
  closeTime?: string;
}

// The category list the partner app/dashboard pickers show — the same set
// admin allows (lib/storeCategories.ts). requireAuth only: applicants
// (not yet store_owner) need it for the onboarding wizard.
storeOnboardingRouter.get('/store-categories', requireAuth, (_req, res) => {
  res.json(storeCategoryOptions());
});

// Submitting no longer writes a real `stores` row — it only marks the
// draft as "ready for review" (submitted_at). The real store row (and the
// role flip to store_owner) is created later, by admin's own approve
// action (apps/admin/src/app/api/approvals/stores/[userId]/route.ts).
storeOnboardingRouter.post('/store-application', requireAuth, requirePrimaryStoreAccount, async (req: AuthedRequest, res, next) => {
  try {
    const {
      storeName,
      category,
      phone,
      district,
      addressLine,
      manualAddress,
      gstNumber,
      photoUrl,
      ownerName,
      ownerEmail,
      shopLicenseNumber,
      fssaiNumber,
      panNumber,
      udyamNumber,
      drugLicenseNumber,
      openTime,
      closeTime,
    } = req.body as OnboardingFields;
    if (!storeName || !category || !district) {
      throw new AppError(400, 'MISSING_FIELDS', 'storeName, category and district are required.');
    }
    // Same allowed set admin uses; a pharmacy must give its drug licence
    // (falls back to one already autosaved on the draft).
    let drugLicense = normalizeDrugLicense(drugLicenseNumber);
    if (!drugLicense && DRUG_LICENSE_CATEGORIES.includes(category)) {
      const { data: savedDraft } = await supabase.from('store_onboarding_drafts').select('drug_license_number').eq('user_id', req.user!.id).maybeSingle();
      drugLicense = normalizeDrugLicense(savedDraft?.drug_license_number);
    }
    assertStoreCategory(category, drugLicense);
    // One store per owner: approving a second application would create a
    // duplicate store (migration 110's trigger refuses it in the DB too).
    // An approved owner edits their store in Settings instead.
    const { count: ownedStores, error: ownedError } = await supabase
      .from('stores')
      .select('id', { count: 'exact', head: true })
      .eq('owner_user_id', req.user!.id);
    if (ownedError) throw ownedError;
    if ((ownedStores ?? 0) > 0) {
      throw new AppError(409, 'STORE_ALREADY_EXISTS', 'You already have a store on Gloceries. Update it from Store Settings instead.');
    }
    const { data: membership, error: membershipError } = await supabase.from('store_memberships').select('user_id').eq('user_id', req.user!.id).eq('is_active', true).maybeSingle();
    if (membershipError) throw membershipError;
    if (membership) throw new AppError(409, 'STORE_TEAM_MEMBER', 'You already manage a store. Ask the administrator before applying for a separate store.');
    // PAN is the one compulsory document at submit time — real per an
    // explicit ask (tax/payout compliance applies to every store
    // regardless of category). GST/Udyam/FSSAI/shop-license stay optional.
    if (!panNumber || !isValidPanFormat(panNumber)) {
      throw new AppError(400, 'INVALID_PAN_FORMAT', 'A valid PAN (e.g. ABCDE1234F) is required to submit your application.');
    }
    if (fssaiNumber && !isValidFssaiFormat(fssaiNumber)) {
      throw new AppError(400, 'INVALID_FSSAI_FORMAT', 'FSSAI license number must be exactly 14 digits.');
    }

    const { error } = await supabase.from('store_onboarding_drafts').upsert(
      {
        user_id: req.user!.id,
        store_name: storeName,
        category,
        phone: phone || null,
        district,
        address_line: addressLine || null,
        manual_address: manualAddress || null,
        gst_number: gstNumber || null,
        photo_url: photoUrl || null,
        owner_name: ownerName || null,
        shop_establishment_number: shopLicenseNumber || null,
        fssai_number: fssaiNumber || null,
        pan_number: panNumber.trim().toUpperCase(),
        udyam_number: udyamNumber || null,
        drug_license_number: drugLicense,
        open_time: openTime || null,
        close_time: closeTime || null,
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

    // Owner's own optional email — a real users.email column, a separate
    // table from the draft above, so this is its own update rather than
    // one more field in that same upsert.
    if (ownerEmail) {
      await supabase.from('users').update({ email: ownerEmail }).eq('id', req.user!.id);
    }

    // Resubmitting after a rejection is a fresh review, not a continuation
    // of the old one — clear is_rejected so GET /auth/me stops reporting
    // the stale verdict the instant this new submission goes in.
    await supabase.from('users').update({ is_rejected: false }).eq('id', req.user!.id);

    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Store Setup's own "resume where you left off" — every step PATCHes
// whatever fields it just collected, merged onto whatever's already
// saved; OnboardingIntroScreen's own "Get Started" tap GETs this to decide
// which real step to resume at instead of always restarting from a blank
// first step.
storeOnboardingRouter.get('/store-draft', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { data, error } = await supabase
      .from('store_onboarding_drafts')
      .select(
        'store_name, category, phone, district, address_line, manual_address, lat, lng, photo_url, gst_number, owner_name, shop_establishment_number, fssai_number, pan_number, udyam_number, drug_license_number, open_time, close_time, submitted_at',
      )
      .eq('user_id', req.user!.id)
      .maybeSingle();
    if (error) throw error;

    let ownerEmail: string | null = null;
    if (data) {
      const { data: user } = await supabase.from('users').select('email').eq('id', req.user!.id).single();
      ownerEmail = user?.email ?? null;
    }

    res.json(data ? { ...data, owner_email: ownerEmail } : null);
  } catch (err) {
    next(err);
  }
});

storeOnboardingRouter.patch('/store-draft', requireAuth, requirePrimaryStoreAccount, async (req: AuthedRequest, res, next) => {
  try {
    const {
      storeName,
      category,
      phone,
      district,
      addressLine,
      manualAddress,
      lat,
      lng,
      photoUrl,
      gstNumber,
      ownerName,
      ownerEmail,
      shopLicenseNumber,
      fssaiNumber,
      panNumber,
      udyamNumber,
      drugLicenseNumber,
      openTime,
      closeTime,
    } = req.body as OnboardingFields & { lat?: number; lng?: number };
    if (typeof category === 'string' && category && !isStoreCategory(category)) {
      assertStoreCategory(category, null);
    }

    // Same real format guard as final submit (POST /store-application) and
    // Store Settings' own PATCH /store — a Step-by-step autosave shouldn't
    // let an obviously malformed number sit in the draft either.
    if (typeof fssaiNumber === 'string' && fssaiNumber.trim() && !isValidFssaiFormat(fssaiNumber)) {
      throw new AppError(400, 'INVALID_FSSAI_FORMAT', 'FSSAI license number must be exactly 14 digits.');
    }
    if (typeof panNumber === 'string' && panNumber.trim() && !isValidPanFormat(panNumber)) {
      throw new AppError(400, 'INVALID_PAN_FORMAT', 'PAN must be in the format ABCDE1234F.');
    }

    // Partial upsert — only fields the caller actually sent overwrite the
    // existing row; one step's own PATCH must never blank out an earlier
    // step's already-saved fields.
    const patch: Record<string, unknown> = { user_id: req.user!.id, updated_at: new Date().toISOString() };
    if (storeName !== undefined) patch.store_name = storeName;
    if (category !== undefined) patch.category = category;
    if (phone !== undefined) patch.phone = phone;
    if (district !== undefined) patch.district = district;
    if (addressLine !== undefined) patch.address_line = addressLine;
    if (manualAddress !== undefined) patch.manual_address = manualAddress;
    if (lat !== undefined) patch.lat = lat;
    if (lng !== undefined) patch.lng = lng;
    if (photoUrl !== undefined) patch.photo_url = photoUrl;
    if (gstNumber !== undefined) patch.gst_number = gstNumber;
    if (ownerName !== undefined) patch.owner_name = ownerName;
    if (shopLicenseNumber !== undefined) patch.shop_establishment_number = shopLicenseNumber;
    if (fssaiNumber !== undefined) patch.fssai_number = fssaiNumber;
    if (panNumber !== undefined) patch.pan_number = typeof panNumber === 'string' ? panNumber.trim().toUpperCase() : panNumber;
    if (udyamNumber !== undefined) patch.udyam_number = udyamNumber;
    if (drugLicenseNumber !== undefined) patch.drug_license_number = normalizeDrugLicense(drugLicenseNumber);
    if (openTime !== undefined) patch.open_time = openTime;
    if (closeTime !== undefined) patch.close_time = closeTime;

    const { error } = await supabase.from('store_onboarding_drafts').upsert(patch, { onConflict: 'user_id' });
    if (error) throw error;

    if (ownerEmail !== undefined) {
      await supabase.from('users').update({ email: ownerEmail || null }).eq('id', req.user!.id);
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Public storefront photos go to R2; verification documents stay private.
// Still used by StoreSettingsScreen post-approval even though onboarding
// itself no longer collects a photo (StoreDraft's own note on why).
storeOnboardingRouter.post('/store-photo', requireAuth, requirePrimaryStoreAccount, async (req: AuthedRequest, res, next) => {
  try {
    const { base64 } = req.body as { base64?: string };
    if (!base64) throw new AppError(400, 'MISSING_FIELDS', 'base64 is required.');

    const webpBuffer = await toWebp(decodeImage(base64));
    const asset = await storePublicImage({ folder: 'stores', bytes: webpBuffer, scope: req.user!.id, uploadedBy: req.user!.id });
    res.status(201).json(asset);
  } catch (err) {
    next(err);
  }
});

// Verification attachments never enter the public image pipeline.
storeOnboardingRouter.post('/store-document-photo', requireAuth, requirePrimaryStoreAccount, async (req: AuthedRequest, res, next) => {
  try {
    const { base64, kind } = req.body as { base64?: string; kind?: string };
    if (!kind || !['pan', 'gst', 'fssai', 'shop-license', 'udyam', 'payout-proof'].includes(kind))
      throw new AppError(400, 'INVALID_DOCUMENT_KIND', 'Choose a supported verification document.');
    if (!base64) throw new AppError(400, 'MISSING_IMAGE', 'Choose a document photo.');
    const document = await storePrivateDocument({ bucket: 'store-documents', ownerId: req.user!.id, kind,
      bytes: await normalizeImage(decodeImage(base64), 'jpeg') });
    res.status(201).json(document);
  } catch (error) { next(error); }
});
