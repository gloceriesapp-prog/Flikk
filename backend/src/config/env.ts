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
  razorpayKeyId: required('RAZORPAY_KEY_ID'),
  razorpayKeySecret: required('RAZORPAY_KEY_SECRET'),
  razorpayWebhookSecret: required('RAZORPAY_WEBHOOK_SECRET'),
  mapplsAccessToken: required('MAPPLS_ACCESS_TOKEN'),
  // Optional, not required() — routes/location.ts's /reverse-geocode
  // degrades to { addressLabel: null } (client falls back to the free
  // on-device geocoder) rather than the whole backend refusing to boot
  // over one enhancement-only key.
  googleGeocodingApiKey: process.env.GOOGLE_GEOCODING_API_KEY,
  // Gloceries's OWN RazorpayX current account number — the account a payout
  // UPI verification's penny-drop debits its ~₹1 from (routes/partner.ts's
  // POST /verify-upi). Optional, not required(): needs a real RazorpayX
  // current account, which needs the same account activation this
  // project's Razorpay ticket is already waiting on — the backend must
  // still boot and every other route must still work while that's
  // pending. /verify-upi itself throws a clear error if this is unset,
  // rather than the whole server refusing to start over one blocked
  // feature.
  razorpayxAccountNumber: process.env.RAZORPAYX_ACCOUNT_NUMBER,
  // Cashfree Payment Gateway (migration from Razorpay in progress). Optional
  // so the backend still boots without it; the Cashfree webhook answers 503
  // until the secret is set. The PG client secret also signs PG webhooks.
  cashfreeClientId: process.env.CASHFREE_CLIENT_ID,
  cashfreeClientSecret: process.env.CASHFREE_CLIENT_SECRET,
  cashfreeEnv: process.env.CASHFREE_ENV === 'production' ? 'production' : 'sandbox',
  // apps/partner-dashboard (and any future web surface) calls this backend
  // directly from browser JS, unlike admin which only talks to Supabase/its
  // own Next API routes — the only client that actually needs CORS.
  // Comma-separated allowlist; defaults to the dashboard's local dev port.
  webDashboardOrigins: (process.env.WEB_DASHBOARD_ORIGINS ?? 'http://localhost:3000,http://localhost:3001,http://localhost:3002')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};
