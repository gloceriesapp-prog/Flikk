import { createClient } from '@supabase/supabase-js';
import { Agent, fetch as undiciFetch } from 'undici';
import { env } from '../config/env.js';
import { measureDatabaseFetch } from '../observability/database.js';

// Explicit HTTP agent, not Node's ambient global fetch — the recurring
// "requests start failing for no reason after the backend's been running
// a while" bug this fixes. Node's built-in fetch (undici under the hood)
// keeps HTTP/1.1 connections alive indefinitely by default; over a
// long-running dev process, an idle keep-alive socket to Supabase's REST
// endpoint can get silently dropped by the network (Wi-Fi reconnects,
// NAT/router idle timeouts, sleep/wake) without either side noticing —
// the next request reuses that dead socket, fails with an opaque error,
// and every request after it does too, until the process restarts and a
// fresh socket gets opened. This hit /auth/me repeatedly today, always
// "fixed" by a restart — a real symptom of exactly this class of bug.
//
// keepAliveTimeout well under typical idle-drop windows (most routers/
// NATs cut idle connections well past 60s, often minutes) means this
// agent proactively recycles a connection before it can go stale and get
// silently reused, instead of trusting it indefinitely.
//
// connections: 60 — undici's Agent defaults to only 10 concurrent sockets
// PER ORIGIN when this isn't set, and this one Agent is shared by both
// `supabase` and `supabaseAuth` below, i.e. every outbound call this
// entire process ever makes to Supabase's REST API shared a single
// 10-connection ceiling — an artificial, self-imposed cap that has no
// reason to be that low (Supabase's own PgBouncer layer behind PostgREST
// handles far more than 10 concurrent requests fine). Raising it removes
// a real ceiling regardless of what any one load test shows.
//
// Honest caveat from actually load-testing this (autocannon, 500-1000
// concurrent requests against an uncached route, before vs. after this
// change): throughput does plateau/reverse and p99 does balloon toward
// ~3s past a few hundred concurrent — but a controlled A/B at the same
// concurrency (10 vs. 60, 3 runs each) showed run-to-run variance from
// this dev machine's network path to Supabase (ap-northeast-2) large
// enough to swamp any signal from the pool size change alone. Keep this
// at 60 (a real fix, no reason to revert it), but don't read this comment
// as "load-tested and proven to fix the degradation" — the degradation's
// dominant cause under this specific test setup was never conclusively
// isolated to the old 10-connection default.
const agent = new Agent({
  keepAliveTimeout: 4_000,
  keepAliveMaxTimeout: 10_000,
  connections: 60,
});

const fetchWithAgent: typeof fetch = measureDatabaseFetch((input, init) => undiciFetch(input as never, { ...init, dispatcher: agent } as never) as never);

// Service-role client: bypasses RLS. Backend-only, never shipped to any app.
// Role-scoping is enforced in application code (see middleware/auth.ts) since
// every request here already carries a verified role.
export const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { persistSession: false },
  global: { fetch: fetchWithAgent },
});

// Separate client, auth flows only (signInWithOtp/verifyOtp in routes/auth.ts).
// Real root cause of "Could not provision user record.": supabase-js's
// SupabaseClient swaps its internal REST Authorization header to the
// signed-in user's own access token the moment auth.verifyOtp() succeeds on
// a client (even with persistSession: false — that flag only skips writing
// to storage, it doesn't stop the in-memory header swap). Since `supabase`
// above is one process-wide singleton, a single real OTP verify permanently
// downgraded every later `.from()` call on it from service_role to that
// user's own authenticated role — which has no INSERT policy on `users` —
// for the rest of the process's life. Isolating the two GoTrue calls onto
// their own client instance keeps that mutation from ever touching the
// client the rest of the app relies on staying service_role.
export const supabaseAuth = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { persistSession: false },
  global: { fetch: fetchWithAgent },
});

// Called only after requests and jobs finish during process shutdown.
export async function closeDatabaseConnections(): Promise<void> {
  await supabase.removeAllChannels();
  await agent.close();
}
