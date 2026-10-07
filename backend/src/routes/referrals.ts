// Referral/invite tracking only — no credit/discount on either side
// (migrations/022_referrals.sql's own note on why: that would be a
// loyalty/rewards mechanic, explicitly out of scope until MVP validates).
// Two things this supports: "here's your invite code/link to share," and
// "here's who you referred" — nothing about turning that into money.

import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';

export const referralsRouter = Router();

// 6 chars, uppercase alphanumeric minus visually-ambiguous ones (0/O, 1/I)
// — short enough to read aloud/type in from a friend's phone screen.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateCode(): string {
  const bytes = randomBytes(6);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

// GET /referrals/my-code — mints one the first time a customer opens the
// invite screen (migrations/022_referrals.sql's own note on why this
// isn't done at signup), returns the existing one on every call after.
referralsRouter.get('/my-code', requireAuth, requireRole('customer'), async (req: AuthedRequest, res, next) => {
  try {
    const { data: existing, error: fetchErr } = await supabase
      .from('referral_codes')
      .select('code')
      .eq('user_id', req.user!.id)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (existing) return res.json({ code: existing.code });

    // A handful of retries against the unique `code` constraint covers the
    // astronomically unlikely random collision without needing a
    // check-then-insert race window — same reasoning as any short-code
    // generator (Bitly-style) that doesn't pre-reserve a namespace.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCode();
      const { data: created, error: insertErr } = await supabase
        .from('referral_codes')
        .insert({ user_id: req.user!.id, code })
        .select('code')
        .single();
      if (!insertErr) return res.json({ code: created.code });
      if (insertErr.code !== '23505') throw insertErr;
    }
    throw new AppError(500, 'CODE_GENERATION_FAILED', 'Could not generate a referral code, please try again.');
  } catch (err) {
    next(err);
  }
});

// POST /referrals/redeem — a new customer enters a friend's code once
// (e.g. during onboarding). Purely bookkeeping: records who referred whom,
// never issues a discount/credit to either account.
referralsRouter.post('/redeem', requireAuth, requireRole('customer'), async (req: AuthedRequest, res, next) => {
  try {
    const { code } = (req.body ?? {}) as { code?: unknown };
    if (typeof code !== 'string' || !code.trim() || code.length > 32) throw new AppError(400, 'INVALID_REQUEST', 'Enter a valid invite code.');

    const { data: referralCode, error: codeErr } = await supabase
      .from('referral_codes')
      .select('id, user_id')
      .eq('code', code.trim().toUpperCase())
      .maybeSingle();
    if (codeErr) throw codeErr;
    if (!referralCode) throw new AppError(400, 'REFERRAL_CODE_NOT_FOUND', "This invite code doesn't exist.");
    if (referralCode.user_id === req.user!.id) {
      throw new AppError(400, 'SELF_REFERRAL', "You can't use your own invite code.");
    }

    const { error: insertErr } = await supabase
      .from('referral_signups')
      .insert({ referral_code_id: referralCode.id, referred_user_id: req.user!.id });
    if (insertErr) {
      // referral_signups.referred_user_id is unique (022_referrals.sql) —
      // an account can only ever have been referred once.
      if (insertErr.code === '23505') throw new AppError(409, 'ALREADY_REFERRED', "You've already used an invite code.");
      throw insertErr;
    }

    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /referrals/my-invites — "N friends joined with your code," the
// invite screen's own real count. Names, not full profiles — a referrer
// doesn't need a referred account's phone/address, just confirmation the
// invite landed.
referralsRouter.get('/my-invites', requireAuth, requireRole('customer'), async (req: AuthedRequest, res, next) => {
  try {
    const { data: referralCode, error: codeErr } = await supabase
      .from('referral_codes')
      .select('id')
      .eq('user_id', req.user!.id)
      .maybeSingle();
    if (codeErr) throw codeErr;
    if (!referralCode) return res.json([]);

    const { data: signups, error: signupsErr } = await supabase
      .from('referral_signups')
      .select('created_at, users!referred_user_id(name)')
      .eq('referral_code_id', referralCode.id)
      .order('created_at', { ascending: false });
    if (signupsErr) throw signupsErr;
    res.json(signups);
  } catch (err) {
    next(err);
  }
});
