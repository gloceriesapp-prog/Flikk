// Cross-app live sync for the whole dashboard — per specs/05-platform/
// realtime.md ("Admin dashboard... Subscribe to the full orders table...
// Admin's full-table subscription must be paginated/filtered server-side,
// not pulling the entire orders table into the browser"). This route is
// that server side: it opens ONE Supabase Realtime channel here (service
// role, Node runtime, never shipped to the browser — same rule as every
// other supabaseAdmin usage in this app) and relays each change as a tiny
// Server-Sent Event. The browser never sees the service-role key or the
// raw table, only "something changed, go refetch" — every table listed
// below is one the customer, partner, or rider app writes to directly, so
// a change on any of them is what "sync with customer/partner/rider apps"
// actually means: they already share one Postgres database (CLAUDE.md
// architecture), this just tells the dashboard when to re-read it.
//
// store_onboarding_drafts/rider_onboarding_drafts/users are here
// specifically so the Sidebar's own pending-approvals badge (and the
// Approvals page itself) refresh the instant a NEW application comes in — a
// fresh application (store OR rider) only ever writes to its own
// onboarding-draft table (no real `stores`/`riders` row exists until a
// founder approves), so neither would have triggered a refresh under the
// old orders/stores/riders-only subscription. These tables must also be in
// the supabase_realtime publication (migrations/043) or postgres_changes
// never fires for them.
//
// SSE over a raw WebSocket here — one-directional (server -> browser) is
// all this needs, and Route Handlers can stream a SSE response with a
// plain ReadableStream on the Node runtime with no extra library.

import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const encoder = new TextEncoder();

  let heartbeat: ReturnType<typeof setInterval>;
  let channel: ReturnType<typeof supabaseAdmin.channel>;

  const stream = new ReadableStream({
    start(controller) {
      function send(event: string) {
        controller.enqueue(encoder.encode(`data: ${event}\n\n`));
      }

      // Unique per connection — every open browser tab/reconnect calls
      // this route again, and the underlying realtime client rejects a
      // second `.on()` registration against an already-`subscribe()`d
      // channel of the same name ("cannot add postgres_changes callbacks
      // ... after subscribe()"), which a fixed name hit immediately with
      // more than one tab open.
      channel = supabaseAdmin
        .channel(`admin-overview-sync-${crypto.randomUUID()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => send('orders'))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'stores' }, () => send('stores'))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'riders' }, () => send('riders'))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'store_onboarding_drafts' }, () => send('applications'))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rider_onboarding_drafts' }, () => send('applications'))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => send('applications'))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, () => send('reviews'))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'home_content' }, () => send('home-content'))
        .subscribe();

      // Keeps intermediary proxies/load balancers from closing an
      // apparently-idle connection — a comment line, not a `data:` event,
      // so the client's EventSource never fires onmessage for it.
      heartbeat = setInterval(() => controller.enqueue(encoder.encode(': ping\n\n')), 20000);
    },
    // Called when the browser disconnects (tab closed/navigated away) —
    // without this, the channel subscription and heartbeat interval would
    // leak for the life of the server process.
    cancel() {
      clearInterval(heartbeat);
      void supabaseAdmin.removeChannel(channel);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
