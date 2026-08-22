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
};
