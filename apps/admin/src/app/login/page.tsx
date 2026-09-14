'use client';

// The only page this dashboard can reach without a session (middleware.ts
// enforces that everywhere else). Email-only — no password field, since
// this is a single-founder tool with no password to invent/store/rotate;
// submitting requests a Supabase magic link (app/api/auth/request-otp),
// gated server-side by ADMIN_ALLOWED_EMAILS so a stranger who finds this
// URL can't just request their own way in with their own inbox.

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const linkExpired = searchParams.get('error') === 'link_expired';

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setError(null);
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, redirectOrigin: window.location.origin }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Could not send the link.');
      setStatus('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the link.');
      setStatus('idle');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 shadow-sm">
        <p className="text-2xl font-medium text-ink">Flikk Admin</p>
        <p className="mt-1 text-sm text-muted">Founder sign-in — enter your email for a one-time link.</p>

        {linkExpired && (
          <p className="mt-4 rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
            That link expired or was already used. Request a new one below.
          </p>
        )}

        {status === 'sent' ? (
          <p className="mt-6 rounded-2xl bg-success/10 px-4 py-3 text-sm text-success">
            If that email is allowed in, a sign-in link is on its way — check your inbox.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@flikk.app"
              className="rounded-xl border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <button
              type="submit"
              disabled={status === 'sending'}
              className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
            >
              {status === 'sending' ? 'Sending…' : 'Send sign-in link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
