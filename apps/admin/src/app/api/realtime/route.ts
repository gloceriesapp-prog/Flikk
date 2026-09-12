// Cross-app live sync for the Overview page — per specs/05-platform/
// realtime.md ("Admin dashboard... Subscribe to the full orders table...
// Admin's full-table subscription must be paginated/filtered server-side,
// not pulling the entire orders table into the browser"). This route is
// that server side: it opens ONE Supabase Realtime channel here (service
// role, Node runtime, never shipped to the browser — same rule as every
// other supabaseAdmin usage in this app) and relays each change as a tiny
// Server-Sent Event. The browser never sees the service-role key or the
// raw table, only "something changed, go refetch" — orders/stores/riders
// are the three tables customer, partner, and rider apps write to, so a
// change on any of them is what "sync with customer/partner/rider apps"
// actually means: they already share one Postgres database (CLAUDE.md
// architecture), this just tells the dashboard when to re-read it.
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
