import { isIP } from 'node:net';

export interface AuthClientConfig { secretKey?: string; forwardClientIp: boolean }

// Auth's forwarding feature accepts a new server secret key, not a legacy
// service_role JWT. Fail at startup rather than silently sharing one IP quota.
export function readAuthClientConfig(source: NodeJS.ProcessEnv = process.env): AuthClientConfig {
  const secretKey = source.SUPABASE_AUTH_SECRET_KEY?.trim() || undefined;
  const flag = source.SUPABASE_AUTH_FORWARD_CLIENT_IP;
  if (flag !== undefined && flag !== 'true' && flag !== 'false') throw new Error('SUPABASE_AUTH_FORWARD_CLIENT_IP must be true or false.');
  if (secretKey && !/^sb_secret_[A-Za-z0-9_-]+$/.test(secretKey)) throw new Error('SUPABASE_AUTH_SECRET_KEY must be a Supabase server secret key (sb_secret_).');
  const forwardClientIp = flag === 'true';
  if (forwardClientIp && !secretKey) throw new Error('SUPABASE_AUTH_SECRET_KEY is required for client IP forwarding.');
  return { secretKey, forwardClientIp };
}

// Only Express's proxy-aware resolved IP is accepted. Never consume caller
// supplied X-Forwarded-For here; TRUST_PROXY_HOPS defines that trust boundary.
export function validatedClientIp(value: unknown): string | undefined {
  return typeof value === 'string' && isIP(value) !== 0 ? value : undefined;
}
