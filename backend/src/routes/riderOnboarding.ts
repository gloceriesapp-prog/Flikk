import { storePrivateDocument } from '../media/privateDocuments.js';
import { decodeImage, normalizeImage } from '../utils/image.js';
// Rider Onboarding (P1, rider app) — mirrors backend/src/routes/
// storeOnboarding.ts's own real pattern almost exactly: any authenticated
// session can apply (a brand-new phone is lazy-provisioned as 'customer'
// by requireAuth, same as every other app), and applying is what
// eventually earns role='rider' — but only at admin approval time
// (app/api/approvals/riders/[userId]'s own approve action), never before.
// Submitting here only ever writes to rider_onboarding_drafts; no real
// `riders` row exists until that approval.
//
// Deliberately its own router, not nested under riderRouter — riderRouter
// (routes/rider.ts) is gated requireRole('rider') + requireApproved for
// its entire mount, which a brand-new applicant can never satisfy yet.

import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';

export const riderOnboardingRouter = Router();

const DOCUMENTS_BUCKET = 'rider-documents';
const MIN_RIDER_AGE_YEARS = 18;

interface RiderOnboardingFields {
  fullName?: string;
  dateOfBirth?: string; // "YYYY-MM-DD"
  // Optional face photo for the rider's own Profile avatar — not a
  // verification field, so never checked in validateSubmission.
  profilePhotoUrl?: string;
  homeAddress?: string;
  aadhaarNumber?: string;
  aadhaarPhotoUrl?: string;
  dlNumber?: string;
  dlPhotoUrl?: string;
  vehicleType?: 'bicycle' | 'scooter' | 'motorcycle';
  vehicleNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
}

// Real calendar-age check, not a rough "365 days x 18" estimate — accounts
// for whether this year's birthday has actually happened yet.
function isAtLeastAge(dateOfBirth: string, minAge: number): boolean {
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return false;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear = now.getMonth() > dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age >= minAge;
}

function validateSubmission(input: RiderOnboardingFields): asserts input is Required<RiderOnboardingFields> {
  if (!input.fullName?.trim()) throw new AppError(400, 'MISSING_FIELDS', 'Full name is required.');
  if (!input.dateOfBirth) throw new AppError(400, 'MISSING_FIELDS', 'Date of birth is required.');
  if (!isAtLeastAge(input.dateOfBirth, MIN_RIDER_AGE_YEARS)) {
    throw new AppError(400, 'UNDERAGE', `You must be at least ${MIN_RIDER_AGE_YEARS} to ride for Gloceries.`);
  }
  if (!input.homeAddress?.trim()) throw new AppError(400, 'MISSING_FIELDS', 'Home address is required.');
  if (!input.aadhaarNumber?.trim()) throw new AppError(400, 'MISSING_FIELDS', 'Aadhaar number is required.');
  if (!input.aadhaarPhotoUrl) throw new AppError(400, 'MISSING_FIELDS', 'Aadhaar photo is required.');
  if (!input.dlNumber?.trim()) throw new AppError(400, 'MISSING_FIELDS', 'Driving licence number is required.');
  if (!input.dlPhotoUrl) throw new AppError(400, 'MISSING_FIELDS', 'Driving licence photo is required.');
  if (!input.vehicleType) throw new AppError(400, 'MISSING_FIELDS', 'Vehicle type is required.');
  // A bicycle has no registration plate — a scooter/motorcycle always
  // does, real requirement only for the motorized cases.
  if (input.vehicleType !== 'bicycle' && !input.vehicleNumber?.trim()) {
    throw new AppError(400, 'MISSING_FIELDS', 'Vehicle registration number is required for a motorized vehicle.');
  }
}

riderOnboardingRouter.post('/application', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = req.body as RiderOnboardingFields;
    validateSubmission(body);
    if (!body.emergencyContactName?.trim() || !body.emergencyContactPhone?.trim() || !body.emergencyContactRelationship?.trim()) {
      throw new AppError(400, 'MISSING_FIELDS', 'Emergency contact name, phone, and relationship are required.');
    }

    const { error } = await supabase.from('rider_onboarding_drafts').upsert(
      {
        user_id: req.user!.id,
        full_name: body.fullName.trim(),
        date_of_birth: body.dateOfBirth,
        photo_url: body.profilePhotoUrl ?? null,
        home_address: body.homeAddress.trim(),
        aadhaar_number: body.aadhaarNumber.trim(),
        aadhaar_photo_url: body.aadhaarPhotoUrl,
        dl_number: body.dlNumber.trim(),
        dl_photo_url: body.dlPhotoUrl,
        vehicle_type: body.vehicleType,
        vehicle_number: body.vehicleNumber?.trim() || null,
        emergency_contact_name: body.emergencyContactName.trim(),
        emergency_contact_phone: body.emergencyContactPhone.trim(),
        emergency_contact_relationship: body.emergencyContactRelationship.trim(),
        // A resubmission is a fresh review, not a continuation of the old
        // one — same convention storeOnboarding.ts's own POST uses.
        rejection_reason: null,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    if (error) throw error;

    await supabase.from('users').update({ is_rejected: false }).eq('id', req.user!.id);

    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

riderOnboardingRouter.get('/draft', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rider_onboarding_drafts')
      .select(
        'full_name, date_of_birth, home_address, aadhaar_number, dl_number, vehicle_type, vehicle_number, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, submitted_at',
      )
      .eq('user_id', req.user!.id)
      .maybeSingle();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

riderOnboardingRouter.patch('/draft', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = req.body as RiderOnboardingFields;

    // Partial upsert — only fields the caller actually sent overwrite the
    // existing row, same "one step's PATCH never blanks an earlier step's
    // data" rule storeOnboarding.ts's own PATCH /store-draft follows.
    const patch: Record<string, unknown> = { user_id: req.user!.id, updated_at: new Date().toISOString() };
    if (body.fullName !== undefined) patch.full_name = body.fullName;
    if (body.dateOfBirth !== undefined) patch.date_of_birth = body.dateOfBirth;
    if (body.profilePhotoUrl !== undefined) patch.photo_url = body.profilePhotoUrl;
    if (body.homeAddress !== undefined) patch.home_address = body.homeAddress;
    if (body.aadhaarNumber !== undefined) patch.aadhaar_number = body.aadhaarNumber;
    if (body.aadhaarPhotoUrl !== undefined) patch.aadhaar_photo_url = body.aadhaarPhotoUrl;
    if (body.dlNumber !== undefined) patch.dl_number = body.dlNumber;
    if (body.dlPhotoUrl !== undefined) patch.dl_photo_url = body.dlPhotoUrl;
    if (body.vehicleType !== undefined) patch.vehicle_type = body.vehicleType;
    if (body.vehicleNumber !== undefined) patch.vehicle_number = body.vehicleNumber;
    if (body.emergencyContactName !== undefined) patch.emergency_contact_name = body.emergencyContactName;
    if (body.emergencyContactPhone !== undefined) patch.emergency_contact_phone = body.emergencyContactPhone;
    if (body.emergencyContactRelationship !== undefined) patch.emergency_contact_relationship = body.emergencyContactRelationship;

    const { error } = await supabase.from('rider_onboarding_drafts').upsert(patch, { onConflict: 'user_id' });
    if (error) throw error;

    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ID-document photo upload — base64 in, real object PATH out (not a public
// URL: rider-documents is a PRIVATE bucket, see migrations/
// 042_rider_onboarding.sql's own note on why Aadhaar/DL photos are never
// public like every other image bucket in this project). Admin's own
// approvals API signs a short-lived URL from this path on read.
riderOnboardingRouter.post('/document-photo', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { base64, kind } = req.body as { base64?: string; kind?: 'aadhaar' | 'dl' | 'profile' | 'payout-proof' };
    if (!base64) throw new AppError(400, 'MISSING_FIELDS', 'base64 is required.');
    if (kind !== 'aadhaar' && kind !== 'dl' && kind !== 'profile' && kind !== 'payout-proof') {
      throw new AppError(400, 'INVALID_KIND', 'kind must be "aadhaar", "dl", "profile" or "payout-proof".');
    }

    const document = await storePrivateDocument({ bucket: DOCUMENTS_BUCKET, ownerId: req.user!.id, kind, bytes: await normalizeImage(decodeImage(base64), 'jpeg') });
    res.status(201).json(document);
  } catch (err) {
    next(err);
  }
});
