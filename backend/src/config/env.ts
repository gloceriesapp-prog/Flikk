function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
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
  // Flikk's OWN RazorpayX current account number — the account a payout
  // UPI verification's penny-drop debits its ~₹1 from (routes/partner.ts's
  // POST /verify-upi). Optional, not required(): needs a real RazorpayX
  // current account, which needs the same account activation this
  // project's Razorpay ticket is already waiting on — the backend must
  // still boot and every other route must still work while that's
  // pending. /verify-upi itself throws a clear error if this is unset,
  // rather than the whole server refusing to start over one blocked
  // feature.
  razorpayxAccountNumber: process.env.RAZORPAYX_ACCOUNT_NUMBER,
};
