import { createHash } from 'node:crypto';
import { supabase } from '../db/supabase.js';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import type { Role } from '../lib/orderStateMachine.js';
import { BoundedCache } from './boundedCache.js';

interface Identity { id: string; sessionId: string | null; expires: number }
interface Context { id: string; role: Role; isApproved: boolean; sessionExpiresAt?: number | null }
interface AuthRow { user_id: string; role: string | null; is_approved: boolean | null; session_valid: boolean; phone: string | null; session_expires_at: string | null }
const identities = new BoundedCache<Identity>();
const contexts = new BoundedCache<Context>();
let schemaRetryAt = 0;
// Jitter cache expiry without extending the maximum revocation window.
const cacheTtl = () => 20_000 + Math.floor(Math.random() * 10_000);
const denied = () => new AppError(401, 'UNAUTHENTICATED', 'Invalid or expired session.');
const unavailable = () => new AppError(503, 'AUTH_UNAVAILABLE', 'Authentication is temporarily unavailable. Please retry.');
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function validateClaims(claims: Record<string, unknown>): Identity {
  const now = Date.now() / 1000;
  if (!uuid(claims.sub) || claims.iss !== `${env.supabaseUrl.replace(/\/$/, '')}/auth/v1` ||
    !(claims.aud === 'authenticated' || (Array.isArray(claims.aud) && claims.aud.includes('authenticated'))) ||
    claims.role !== 'authenticated' || typeof claims.exp !== 'number' || !Number.isFinite(claims.exp) || claims.exp <= now ||
    (claims.nbf !== undefined && (typeof claims.nbf !== 'number' || claims.nbf > now)) ||
    (claims.session_id !== undefined && !uuid(claims.session_id))) throw denied();
  return { id: claims.sub, sessionId: uuid(claims.session_id) ? claims.session_id : null, expires: claims.exp * 1000 };
}
// Also bound direct verification work: write requests must not bypass the
// cache miss limits and build an unbounded queue at the Auth server.
let activeVerifications = 0;
async function verificationWork<T>(work: () => Promise<T>): Promise<T> {
  if (activeVerifications >= 128) throw new AppError(503, 'AUTH_BUSY', 'Authentication is busy. Please retry.');
  activeVerifications += 1;
  try { return await work(); } finally { activeVerifications -= 1; }
}
async function remoteUser(token: string) {
  const { data, error } = await verificationWork(() => supabase.auth.getUser(token));
  if (error || !data.user) {
    if (error && (!error.status || error.status >= 500)) throw unavailable();
    throw denied();
  }
  return data.user;
}
async function verify(token: string): Promise<Identity> {
  const { data, error } = await verificationWork(() => supabase.auth.getClaims(token));
  if (error || !data) {
    if (error && (!error.status || error.status >= 500)) throw unavailable();
    throw denied();
  }
  return validateClaims(data.claims as unknown as Record<string, unknown>);
}
export function invalidateAllAuthContexts() { contexts.invalidate(() => true); }
export function invalidateAuthUser(id: string) { contexts.invalidate(key => key.startsWith(`${id}:`)); }
async function legacyContext(token: string, identity: Identity, fresh: boolean): Promise<Context> {
  // Compatibility during deployment or for old JWTs lacking session_id.
  // Never claim local session revocation checking without migrations 069/071.
  if (env.requireSessionContext) throw unavailable();
  const user = await remoteUser(token);
  if (user.id !== identity.id) throw denied();
  const context = await contexts.get(`${identity.id}:legacy`, cacheTtl(), async () => {
    const { data, error } = await supabase.from('users').select('id,role,is_approved').eq('id', user.id).maybeSingle();
    if (error) throw unavailable();
    if (data) return checkedContext(data.id, data.role, data.is_approved);
    await provision(user.id, user.phone ?? null);
    const { data: created, error: loadError } = await supabase.from('users').select('id,role,is_approved').eq('id', user.id).single();
    if (loadError || !created) throw unavailable();
    return checkedContext(created.id, created.role, created.is_approved);
  }, fresh);
  if (identity.expires <= Date.now()) throw denied();
  return context;
}
function checkedContext(id: string, role: unknown, approved: unknown): Context {
  if (!['customer', 'store_owner', 'rider', 'admin'].includes(String(role))) throw denied();
  return { id, role: role as Role, isApproved: approved === true };
}
async function provision(id: string, phone: string | null) {
  // Do not overwrite a role chosen by a concurrent onboarding request.
  const { error } = await supabase.from('users').upsert({ id, phone, role: 'customer' }, { onConflict: 'id', ignoreDuplicates: true });
  if (error) throw unavailable();
}
export async function authenticate(token: string, mutation: boolean): Promise<Context> {
  if (token.length > 8192) throw denied();
  const key = createHash('sha256').update(token).digest('hex');
  const identity = await identities.get(key, cacheTtl(), () => verify(token));
  if (identity.expires <= Date.now()) { identities.invalidate(k => k === key); throw denied(); }
  const contextKey = `${identity.id}:${identity.sessionId ?? 'legacy'}`;
  const fresh = mutation || env.forceRemoteAuth || contexts.peek(contextKey)?.role === 'admin';
  // Financial/account writes also re-check Auth directly, covering emergency
  // signing-key revocation during the SDK's JWKS cache window.
  if (!identity.sessionId || Date.now() < schemaRetryAt) return legacyContext(token, identity, fresh);
  if (fresh && (await remoteUser(token)).id !== identity.id) throw denied();
  try {
    const context = await contexts.get(contextKey, cacheTtl(), async () => {
      const load = async () => {
        const { data, error } = await supabase.rpc('request_auth_context_v2', { p_user_id: identity.id, p_session_id: identity.sessionId });
        if (error) {
          if (['PGRST202', '42883'].includes(error.code)) {
            schemaRetryAt = Date.now() + 300_000;
            logger.warn('Auth session lookup unavailable; apply migrations 069 and 071. Production access remains blocked.');
            throw new AppError(503, 'AUTH_SCHEMA_PENDING', 'Authentication setup pending.');
          }
          throw unavailable();
        }
        return (data as AuthRow[] | null)?.[0];
      };
      let row = await load();
      if (!row?.session_valid || row.user_id !== identity.id) throw denied();
      if (row.role === null) { await provision(identity.id, row.phone); row = await load(); }
      if (!row?.session_valid || row.user_id !== identity.id) throw denied();
      const expires = row.session_expires_at == null ? null : Date.parse(row.session_expires_at);
      if (expires !== null && !Number.isFinite(expires)) throw unavailable();
      return { ...checkedContext(row.user_id, row.role, row.is_approved), sessionExpiresAt: expires };
    }, fresh);
    if (context.sessionExpiresAt != null && context.sessionExpiresAt <= Date.now()) {
      contexts.invalidate(key => key === contextKey);
      throw denied();
    }
    if (context.role === 'admin' && !fresh && (await remoteUser(token)).id !== identity.id) throw denied();
    if (identity.expires <= Date.now() || (context.sessionExpiresAt != null && context.sessionExpiresAt <= Date.now())) throw denied();
    return context;
  } catch (error) {
    if (error instanceof AppError && error.code === 'AUTH_SCHEMA_PENDING') return legacyContext(token, identity, fresh);
    throw error;
  }
}
