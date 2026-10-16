// A provider intent is a payment instruction, not a URL we construct or rewrite.
// Validate its authority and amount before handing the exact bytes to Android.
export function isValidUpiIntentUrl(value: unknown, amountPaise: number): value is string {
  if (typeof value !== 'string' || value.length > 8192 || /\s/.test(value)
    || [...value].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== 'upi:' || url.hostname !== 'pay' || (url.pathname !== '' && url.pathname !== '/') || url.username || url.password || url.port || url.hash) return false;
    for (const key of ['pa', 'tr', 'am', 'cu']) if (url.searchParams.getAll(key).length !== 1) return false;
    const amount = url.searchParams.get('am')!;
    if (!/^\d+(?:\.\d{1,2})?$/.test(amount)) return false;
    return Boolean(url.searchParams.get('pa')?.trim() && url.searchParams.get('tr')?.trim())
      && url.searchParams.get('cu') === 'INR' && Math.round(Number(amount) * 100) === amountPaise;
  } catch { return false; }
}
