function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

// Razorpay uses the same API host for test and live accounts. Keep the key
// prefix and explicit environment consistent so a typo cannot charge live.
const razorpayKeyId = process.env.RAZORPAY_KEY_ID?.trim() || undefined;
const razorpayEnv = process.env.RAZORPAY_ENV?.trim().toLowerCase()
  || (razorpayKeyId?.startsWith('rzp_live_') ? 'live' : 'test');
if (razorpayEnv !== 'test' && razorpayEnv !== 'live') {
  throw new Error('RAZORPAY_ENV must be test or live.');
}
if (razorpayKeyId && !razorpayKeyId.startsWith(`rzp_${razorpayEnv}_`)) {
  throw new Error('RAZORPAY_KEY_ID must match RAZORPAY_ENV (rzp_test_ or rzp_live_).');
}

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

// A laptop backend (NODE_ENV is not 'production'; the Docker image sets it) must
// not read or write the live database by accident: test orders and riders would
// land next to real customers. Point local dev at local Supabase or flikk-staging,
// or set ALLOW_PRODUCTION_DATABASE=true for a deliberate, read-mostly session.
const PRODUCTION_SUPABASE_REF = 'bjlknohjdnemxwwoxcsv';
if (process.env.NODE_ENV !== 'production' && process.env.SUPABASE_URL?.includes(PRODUCTION_SUPABASE_REF)
  && process.env.ALLOW_PRODUCTION_DATABASE !== 'true') {
  throw new Error('SUPABASE_URL points at the PRODUCTION project from a non-production backend. Use local Supabase or flikk-staging (see ENVIRONMENTS.md), or set ALLOW_PRODUCTION_DATABASE=true on purpose.');
}

const geocodingKey = process.env.GOOGLE_GEOCODING_API_KEY?.trim() || undefined;
const routeKey = process.env.GOOGLE_GEOCODING_ROUTE_KEY?.trim() || undefined;
const legacyRouteKey = process.env.GOOGLE_ROUTES_API_KEY?.trim() || undefined;
if (routeKey && legacyRouteKey && routeKey !== legacyRouteKey) {
  throw new Error('GOOGLE_GEOCODING_ROUTE_KEY and GOOGLE_ROUTES_API_KEY disagree. Configure one routing key.');
}
// An explicitly empty new route variable disables routing until its own key
// is supplied. Only older configurations retain the shared server-key fallback.
const effectiveRouteKey = routeKey || legacyRouteKey
  || (process.env.GOOGLE_GEOCODING_ROUTE_KEY === undefined && !process.env.GOOGLE_GEOCODING_MAP_KEY?.trim()
    ? geocodingKey : undefined);

export const env = {
  port,
  // Production cannot silently fall back to stateless remote verification
  // when the session-revocation RPC is absent or a JWT has no session ID.
  forceRemoteAuth: process.env.AUTH_FORCE_REMOTE_VERIFICATION === 'true',
  requireSessionContext: process.env.AUTH_REQUIRE_SESSION_CONTEXT === 'true' || process.env.NODE_ENV === 'production',
  supabaseUrl: required('SUPABASE_URL'),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  // Missing credentials leave the backend COD-only. Checkout, reconciliation
  // and refunds share the same account; the webhook secret is separate from
  // the API key secret and must never fall back to it.
  razorpayKeyId,
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET?.trim() || undefined,
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || undefined,
  razorpayEnv: razorpayEnv as 'test' | 'live',
  codDisabled: process.env.COD_DISABLED === 'true',
  onlinePaymentsDisabled: process.env.ONLINE_PAYMENTS_DISABLED === 'true',
  publicApiUrl: process.env.PUBLIC_API_URL?.replace(/\/+$/, '') || undefined,
  // Optional: only routes/location.ts /search uses it, and answers 503
  // LOCATION_PROVIDER_UNAVAILABLE without it. The worker never needs it.
  mapplsAccessToken: process.env.MAPPLS_ACCESS_TOKEN || undefined,
  // Optional, not required() — routes/location.ts's /reverse-geocode
  // degrades to { addressLabel: null } (client falls back to the free
  // on-device geocoder) rather than the whole backend refusing to boot
  // over one enhancement-only key.
  googleGeocodingApiKey: geocodingKey,
  // Server REST credentials only; never use the Android/iOS Maps SDK key.
  // Existing deployments can retain a shared server key while rotating each
  // API independently. Each effective key needs its corresponding API enabled.
  googleRoutesApiKey: effectiveRouteKey,
  googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY?.trim() || process.env.GOOGLE_GEOCODING_API_KEY?.trim() || undefined,
  // Optional, not required(): KYC document envelope encryption key (base64, 32
  // bytes) and KEK id. Only needed when a sensitive KYC upload happens —
  // storePrivateDocument fails closed if a KYC kind is uploaded without this
  // configured. Same value in backend (Railway) and admin (Vercel).
  docEncryptionKey: process.env.DOC_ENCRYPTION_KEY || undefined,
  docEncryptionKekId: process.env.DOC_ENCRYPTION_KEK_ID || 'v1',
  // apps/partner-dashboard (and any future web surface) calls this backend
  // directly from browser JS, unlike admin which only talks to Supabase/its
  // own Next API routes — the only client that actually needs CORS.
  // Comma-separated allowlist; defaults to the dashboard's local dev port.
  webDashboardOrigins: (process.env.WEB_DASHBOARD_ORIGINS ?? 'http://localhost:3000,http://localhost:3001,http://localhost:3002')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};

export const paymentsConfigured = Boolean(env.razorpayKeyId && env.razorpayKeySecret && env.razorpayWebhookSecret);
