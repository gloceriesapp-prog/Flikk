import type { RequestHandler } from 'express';
import { supabase } from '../db/supabase.js';
import { authBucket } from '../customer-experience/authBudget.js';
import { AppError } from '../lib/errors.js';
import type { AuthedRequest } from '../middleware/auth.js';
// Durable account quota is shared by replicas and charged before body parsing.
export const uploadBudget: RequestHandler = async (req: AuthedRequest, res, next) => {
  try {
    if (!req.user) throw new AppError(401, 'UNAUTHENTICATED', 'Sign in to upload a photo.');
    const { data, error } = await supabase.rpc('claim_auth_budget', {p_buckets:[{key:authBucket('upload:account',req.user.id),limit:6}]});
    if (error || !Number.isSafeInteger(data) || data < 0) throw new AppError(503,'UPLOAD_UNAVAILABLE','Photo upload is temporarily unavailable.');
    if (data > 0) {res.set('Retry-After',String(data));throw new AppError(429,'UPLOAD_RATE_LIMITED','Please wait before uploading another photo.');}
    next();
  } catch(error) {next(error);}
};
