import * as database from '../db/supabase.js';
import { readAuthClientConfig, validatedClientIp } from './clientConfig.js';
import { AppError } from '../lib/errors.js';

const config = readAuthClientConfig();
export function authForRequest(clientIp: unknown) {
  if (!config.forwardClientIp) return database.supabaseAuth;
  const ip = validatedClientIp(clientIp);
  if (!ip) throw new AppError(503, 'AUTH_TEMPORARILY_UNAVAILABLE', 'Sign-in is temporarily unavailable. Please retry.');
  return database.createRequestAuthClient(config.secretKey!, ip);
}
