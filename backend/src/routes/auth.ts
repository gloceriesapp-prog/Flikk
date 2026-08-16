// Shared across all 4 apps. Source: specs/00-foundation/auth-and-roles.md
import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';

export const authRouter = Router();

authRouter.post('/otp/request', async (req, res, next) => {
  try {
    const { phone } = req.body as { phone?: string };
    if (!phone) throw new AppError(400, 'INVALID_PHONE', 'phone is required.');
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) throw new AppError(400, 'OTP_SEND_FAILED', error.message);
    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/otp/verify', async (req, res, next) => {
  try {
    const { phone, code } = req.body as { phone?: string; code?: string };
    if (!phone || !code) throw new AppError(400, 'INVALID_OTP', 'phone and code are required.');
    const { data, error } = await supabase.auth.verifyOtp({ phone, token: code, type: 'sms' });
    if (error || !data.session) throw new AppError(401, 'OTP_INVALID', 'Invalid or expired code.');
    res.status(200).json({ access_token: data.session.access_token });
  } catch (err) {
    next(err);
  }
});
