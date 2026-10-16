// One-off check of the SignCare UPI verification setup from a developer
// machine: `pnpm upi:test yourname@okaxis` (reads backend/.env.local).
// Prints SignCare's raw HTTP status and body, then how lib/upiVerification.ts
// reads it, so the mapping can be confirmed against a real sandbox answer.
// Never prints the API key or client ID.
import { parseResponse, signCareConfig } from '../src/lib/upiVerification.js';

const upiId = process.argv[2]?.trim();
if (!upiId) {
  console.error('Usage: pnpm upi:test <upi-id>   e.g. pnpm upi:test yourname@okaxis');
  process.exit(1);
}

const config = signCareConfig();
if (!config) {
  console.error('Verification is off. Set PAYOUT_UPI_AUTO_VERIFY=true, SIGNCARE_BASE_URL, SIGNCARE_API_KEY and SIGNCARE_CLIENT_ID in backend/.env.local.');
  process.exit(1);
}

const url = `${config.baseUrl}/api/v1/upi/advance`;
console.log(`POST ${url}`);
try {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'x-api-key': config.apiKey, 'x-client-id': config.clientId },
    body: JSON.stringify({ upi_id: upiId }),
    signal: AbortSignal.timeout(config.timeoutMs),
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    // not JSON; printed as text below
  }
  console.log(`\nHTTP ${res.status}`);
  console.log(typeof body === 'string' ? body : JSON.stringify(body, null, 2));
  console.log('\nGloceries reads this as:', parseResponse(res.status, body));
} catch (err) {
  console.error('\nRequest failed:', (err as Error).name, (err as Error).message);
  process.exit(1);
}
