// Helpers for audited order writes (admin_order_actions, migration 109).
// The acting admin's identity comes from requireAdmin() (lib/auth/requireAdmin.ts),
// whose `actor` the SECURITY DEFINER RPCs record next to every change.
import { NextResponse } from 'next/server';

// Errcodes raised by the migration 109 admin RPCs (and the functions they call).
export function rpcErrorCode(err: unknown): string | undefined {
  return (err as { code?: string } | null)?.code;
}

// Maps the migration 109 admin RPC errcodes to a response. Their messages are
// written for the admin (no internals), so they are shown as-is. Anything
// else is unexpected and returns null so the caller logs and 500s.
export function adminRpcErrorResponse(err: unknown): NextResponse | null {
  const code = rpcErrorCode(err);
  const message = (err as { message?: string } | null)?.message ?? 'The order changed. Refresh and try again.';
  if (code === 'P0404') return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  if (code === 'P0422') return NextResponse.json({ error: message }, { status: 400 });
  if (code === 'P0409') return NextResponse.json({ error: message }, { status: 409 });
  // enforce_rider_capacity (migration 113): rider at max_active_trips_per_rider.
  if (code === 'P0429') return NextResponse.json({ error: message }, { status: 409 });
  if (code === 'P1001') {
    return NextResponse.json({ error: message === 'Awaiting payment' ? 'This order is still waiting for online payment.' : 'That status change is not allowed for this order.' }, { status: 409 });
  }
  return null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

// Admin-entered reason: required, trimmed, at most 300 characters (the
// admin_order_actions.reason and cancel_customer_trip limits).
export function adminReason(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const reason = raw.trim();
  return reason.length >= 3 && reason.length <= 300 ? reason : null;
}
