// Shared "resolve a real addresses.id for this checkout" logic — extracted
// out of POST /orders (routes/orders.ts) so POST /trips (routes/trips.ts)
// doesn't duplicate the same ownership check / inline-address-save flow.
// Either a real addresses.id from a previous order (ownership re-checked
// here, never trusted at face value — ownedAddress's own note explains
// why), or an inline address to save-and-use for a customer with no
// address-book screen yet.

import { supabase } from '../db/supabase.js';
import { AppError } from './errors.js';

export interface AddressInput {
  address_id?: string;
  address?: { label?: string; line1: string; landmark?: string; recipient_name: string };
}

export async function resolveAddressId(customerId: string, input: AddressInput): Promise<string> {
  if (input.address_id) {
    // A client-supplied address_id is never trusted at face value — an
    // order paid for by one account but silently delivered to a different
    // account's saved address (a real IDOR: pass any UUID, see if it's
    // accepted) is exactly the kind of "bypass" this whole flow needs to
    // be provably closed against.
    const { data: ownedAddress, error: ownedAddressErr } = await supabase
      .from('addresses')
      .select('id')
      .eq('id', input.address_id)
      .eq('user_id', customerId)
      .single();
    if (ownedAddressErr || !ownedAddress) throw new AppError(403, 'FORBIDDEN', 'Not your delivery address.');
    return ownedAddress.id;
  }

  if (!input.address?.line1 || !input.address?.recipient_name?.trim()) {
    throw new AppError(400, 'MISSING_RECIPIENT_NAME', 'recipient_name is required.');
  }

  // Single zone at launch (CLAUDE.md) — same "no zone-picker exists, fall
  // back to whichever zone is active" resolution GET /stores already uses.
  const { data: zone, error: zoneError } = await supabase.from('zones').select('id').eq('is_active', true).limit(1).single();
  if (zoneError || !zone) throw new AppError(500, 'NO_ACTIVE_ZONE', 'No active zone configured.');

  const { data: address, error: addressError } = await supabase
    .from('addresses')
    .insert({
      user_id: customerId,
      label: input.address.label?.trim() || 'Delivery address',
      line1: input.address.line1.trim(),
      landmark: input.address.landmark?.trim() || null,
      recipient_name: input.address.recipient_name.trim(),
      zone_id: zone.id,
    })
    .select('id')
    .single();
  if (addressError || !address) throw new AppError(500, 'ADDRESS_CREATE_FAILED', 'Could not save delivery address.');
  return address.id;
}
