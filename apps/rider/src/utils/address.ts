// Home-address helpers for the rider onboarding Personal step. The wizard
// collects the address as separate fields (house/street/city/district/
// state/pincode + optional landmark) — industry standard — but the backend
// stores one canonical string in rider_onboarding_drafts.home_address (and
// later riders.home_address), so these compose the parts into that one
// string and validate the pincode. Nothing else in the backend changes.

export interface AddressParts {
  houseNumber: string;
  street: string;
  landmark: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
}

// Indian PIN codes are exactly 6 digits and never start with 0.
export function isValidPincode(pincode: string): boolean {
  return /^[1-9][0-9]{5}$/.test(pincode);
}

// Every part except landmark is required; landmark folds in as "Near ..."
// only when present. Ordered house → street → landmark → city → district →
// state → pincode, the way an address is actually written/read.
export function composeAddress(p: AddressParts): string {
  const segments = [p.houseNumber.trim(), p.street.trim()];
  if (p.landmark.trim()) segments.push(`Near ${p.landmark.trim()}`);
  segments.push(p.city.trim(), p.district.trim());
  const head = segments.filter(Boolean).join(', ');
  return `${head}, ${p.state.trim()} - ${p.pincode.trim()}`;
}

// All required parts present + a valid pincode — the Personal step's own
// gate for the address portion.
export function isAddressComplete(p: AddressParts): boolean {
  return (
    p.houseNumber.trim().length > 0 &&
    p.street.trim().length > 0 &&
    p.city.trim().length > 0 &&
    p.district.trim().length > 0 &&
    p.state.trim().length > 0 &&
    isValidPincode(p.pincode)
  );
}
