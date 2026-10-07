function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

export const env = {
  port,
  // Production cannot silently fall back to stateless remote verification
  // when the session-revocation RPC is absent or a JWT has no session ID.
  forceRemoteAuth: process.env.AUTH_FORCE_REMOTE_VERIFICATION === 'true',
  requireSessionContext: process.env.AUTH_REQUIRE_SESSION_CONTEXT === 'true' || process.env.NODE_ENV === 'production',
  supabaseUrl: required('SUPABASE_URL'),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  // Optional, not required(): the backend boots COD-only until Cashfree is
  // live. App id + secret together turn online payment on; without them
  // payments/cashfreeClient.ts's requirePaymentsConfigured answers 503
  // PAYMENTS_NOT_CONFIGURED. CASHFREE_CLIENT_ID/CLIENT_SECRET are accepted
  // aliases (Cashfree's dashboard calls the same values "client id/secret").
  cashfreeAppId: process.env.CASHFREE_APP_ID || process.env.CASHFREE_CLIENT_ID || undefined,
  cashfreeSecretKey: process.env.CASHFREE_SECRET_KEY || process.env.CASHFREE_CLIENT_SECRET || undefined,
  cashfreeEnv: (process.env.CASHFREE_ENV === 'production' ? 'production' : 'sandbox') as 'production' | 'sandbox',
  // Cashfree signs PG webhooks with the PG secret key; override only if
  // Cashfree issues a separate one.
  cashfreeWebhookSecret: process.env.CASHFREE_WEBHOOK_SECRET || process.env.CASHFREE_SECRET_KEY || process.env.CASHFREE_CLIENT_SECRET || undefined,
  // Secure ID (verification suite) credentials for UPI ID name lookup.
  // Absent: POST /payments/upi/validate is format-only (name: null).
  cashfreeVerificationClientId: process.env.CASHFREE_VERIFICATION_CLIENT_ID || undefined,
  cashfreeVerificationSecret: process.env.CASHFREE_VERIFICATION_SECRET || undefined,
  // Public base URL of this API, used as Cashfree order_meta.notify_url.
  // Absent: rely on the webhook endpoint configured in the Cashfree dashboard.
  publicApiUrl: process.env.PUBLIC_API_URL?.replace(/\/+$/, '') || undefined,
  mapplsAccessToken: required('MAPPLS_ACCESS_TOKEN'),
  // Optional, not required() — routes/location.ts's /reverse-geocode
  // degrades to { addressLabel: null } (client falls back to the free
  // on-device geocoder) rather than the whole backend refusing to boot
  // over one enhancement-only key.
  googleGeocodingApiKey: process.env.GOOGLE_GEOCODING_API_KEY,
  // apps/partner-dashboard (and any future web surface) calls this backend
  // directly from browser JS, unlike admin which only talks to Supabase/its
  // own Next API routes — the only client that actually needs CORS.
  // Comma-separated allowlist; defaults to the dashboard's local dev port.
  webDashboardOrigins: (process.env.WEB_DASHBOARD_ORIGINS ?? 'http://localhost:3000,http://localhost:3001,http://localhost:3002')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};

export const paymentsConfigured = Boolean(env.cashfreeAppId && env.cashfreeSecretKey && env.cashfreeWebhookSecret);
