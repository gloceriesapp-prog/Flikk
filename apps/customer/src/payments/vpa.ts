// UPI ID (VPA) entry: live format check, then server verification
// (POST /payments/upi/validate). Only a `verified` VPA can be paid; any edit
// drops back to `editing`, so a verified name can never describe a different ID.
import * as SecureStore from 'expo-secure-store';

// NPCI handle shape: name@psp. Server re-checks; this only gates the button.
const VPA_PATTERN = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,63}$/;

export function normalizeVpa(input: string): string {
  return input.trim().toLowerCase();
}

export function isVpaFormatValid(input: string): boolean {
  return VPA_PATTERN.test(normalizeVpa(input));
}

export type VpaState =
  | { status: 'editing'; vpa: string }
  | { status: 'verifying'; vpa: string }
  | { status: 'verified'; vpa: string; name: string | null }
  | { status: 'invalid'; vpa: string; error: string };

export type VpaEvent =
  | { type: 'edit'; vpa: string }
  | { type: 'verify' }
  | { type: 'result'; vpa: string; valid: boolean; name: string | null }
  | { type: 'error'; vpa: string; message: string };

export const initialVpaState = (vpa = ''): VpaState => ({ status: 'editing', vpa });

export function vpaReducer(state: VpaState, event: VpaEvent): VpaState {
  switch (event.type) {
    case 'edit':
      return { status: 'editing', vpa: event.vpa };
    case 'verify':
      if (state.status === 'verifying') return state;
      if (!isVpaFormatValid(state.vpa)) return { status: 'invalid', vpa: state.vpa, error: 'Enter a valid UPI ID, like name@bank.' };
      return { status: 'verifying', vpa: normalizeVpa(state.vpa) };
    case 'result':
    case 'error':
      // A late response for an ID the customer has since edited is ignored.
      if (state.status !== 'verifying' || state.vpa !== event.vpa) return state;
      if (event.type === 'error') return { status: 'invalid', vpa: state.vpa, error: event.message };
      return event.valid
        ? { status: 'verified', vpa: state.vpa, name: event.name }
        : { status: 'invalid', vpa: state.vpa, error: 'This UPI ID could not be verified. Check it and try again.' };
  }
}

export const canPayWithVpa = (state: VpaState): state is Extract<VpaState, { status: 'verified' }> => state.status === 'verified';

// Opt-in, device-only memory of the customer's UPI ID. Never sent anywhere
// except the validate/collect calls. Scoped to the account that saved it, so
// another login on the same device never sees it.
const REMEMBERED_VPA_KEY = 'gloceries.remembered_upi_id';

export async function loadRememberedVpa(customerId: string | null): Promise<string | null> {
  if (!customerId) return null;
  try {
    const saved = JSON.parse((await SecureStore.getItemAsync(REMEMBERED_VPA_KEY)) ?? 'null') as { customerId: string; vpa: string } | null;
    return saved?.customerId === customerId && isVpaFormatValid(saved.vpa) ? saved.vpa : null;
  } catch {
    return null;
  }
}

export async function saveRememberedVpa(customerId: string | null, vpa: string | null): Promise<void> {
  try {
    if (customerId && vpa) await SecureStore.setItemAsync(REMEMBERED_VPA_KEY, JSON.stringify({ customerId, vpa }));
    else await SecureStore.deleteItemAsync(REMEMBERED_VPA_KEY);
  } catch { /* best effort: remembering is a convenience only */ }
}
