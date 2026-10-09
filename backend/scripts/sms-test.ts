// Sends one real login-OTP SMS through MSG91 using backend/.env.local, without
// Supabase. Proves the auth key, DLT template, sender and IP whitelist work
// before wiring the Supabase Send SMS hook.
//
//   pnpm sms:test 9876543210
//
// The login flow itself cannot use this machine's MSG91 keys: Supabase sends
// the SMS from its own servers and can only call a public HTTPS hook URL
// (see ENVIRONMENTS.md -> "Testing login OTP SMS").
import { randomInt } from 'node:crypto';
import { msg91Config, msg91Mobile, sendOtpSms, SmsDeliveryError } from '../src/lib/msg91.js';

const phone = process.argv[2];
const config = msg91Config();
const missing = [!config.authKey && 'MSG91_AUTH_KEY', !config.templateId && 'MSG91_OTP_TEMPLATE_ID'].filter(Boolean);
if (missing.length) {
  const similar = Object.keys(process.env).filter((name) => /MSG91|SMS|OTP/i.test(name) && !missing.includes(name) && process.env[name]?.trim());
  console.error(`Missing or empty in backend/.env.local: ${missing.join(', ')}.`);
  if (similar.length) console.error(`Found these related names instead: ${similar.join(', ')}. Rename them to the names above.`);
  process.exit(1);
}
if (!phone) { console.error('Usage: pnpm sms:test <10-digit mobile number>'); process.exit(1); }

let mobile: string;
try { mobile = msg91Mobile(phone); } catch (error) { console.error((error as Error).message); process.exit(1); }
const otp = String(randomInt(0, 1_000_000)).padStart(6, '0');
try {
  const requestId = await sendOtpSms(mobile, otp, config);
  console.log(`MSG91 accepted the SMS to +${mobile} (request_id ${requestId || 'none'}).`);
  console.log(`The SMS should show the code ${otp}. If it arrives, MSG91 + DLT are set up correctly.`);
  console.log('If it never arrives, check MSG91 -> Reports -> OTP for this request_id (DLT or operator failure).');
} catch (error) {
  console.error(error instanceof SmsDeliveryError ? error.message : 'Unexpected error sending the SMS.');
  console.error('HTTP 401 / "IP not whitelisted": MSG91 -> Auth key -> turn off IP security (or whitelist your IP).');
  console.error('"Invalid template" / "template not found": MSG91_OTP_TEMPLATE_ID must be the MSG91 OTP template ID, not the DLT template ID.');
  process.exit(1);
}
