// Retired Server-Sent Events endpoint. The dashboard now polls (see
// src/lib/realtime/useAdminRealtime.ts): on Vercel every open stream here kept
// a Function instance alive for as long as an admin tab was open, which used
// up the Hobby plan's Fluid Provisioned Memory and paused deployments.
//
// Admin tabs still running the old client keep an EventSource on this URL.
// 204 No Content is the one response that tells EventSource to stop
// reconnecting, so they go quiet instead of retrying every few seconds.

import { requireAdmin } from '@/lib/auth/requireAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  return new Response(null, { status: 204 });
}
