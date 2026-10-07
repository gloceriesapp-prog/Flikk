// Admin identity for audited order writes (admin_order_actions, migration 109).
// Same allow-list check as requireStoreAdmin, but returns who is acting so the
// SECURITY DEFINER RPCs can record the admin's email next to every change.
import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/supabase/server';
import { isAllowedAdminEmail } from '@/lib/adminAccess';

export interface AdminActor {
  id: string;
  email: string;
}

export async function requireAdminActor(): Promise<{ actor: AdminActor; denied: null } | { actor: null; denied: NextResponse }> {
  const user = await requireAdminSession();
  if (!user || !user.email || !isAllowedAdminEmail(user.email)) {
    return { actor: null, denied: NextResponse.json({ error: 'Administrator access required.' }, { status: 401 }) };
  }
  return { actor: { id: user.id, email: user.email }, denied: null };
}

// Errcodes raised by the migration 109 admin RPCs (and the functions they call).
export function rpcErrorCode(err: unknown): string | undefined {
  return (err as { code?: string } | null)?.code;
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
