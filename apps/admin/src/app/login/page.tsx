'use client';

import { safeNextPath } from '@/lib/safeNext';

// The only page this dashboard can reach without a session (middleware.ts
// enforces that everywhere else). Two ways in:
//  - Username/password — the original flow (api/auth/login/route.ts's own
//    note on why: single founder, no inbox dependency). ADMIN_USERNAME/
//    ADMIN_LOGIN_EMAIL (server-only) are the real credentials this checks
//    against, not anything client-visible here.
//  - "Continue with Google" — real Supabase Auth OAuth
//    (supabase.auth.signInWithOAuth), added per an explicit ask. Only
//    lands a real session for one specific Google account —
//    app/auth/callback/route.ts checks the signed-in email against
//    isAllowedAdminEmail (lib/adminAccess.ts) right after the OAuth
//    exchange and signs anyone else back out immediately; middleware.ts
//    re-checks the same thing on every request after that, so this button
//    doesn't need its own client-side allowlist — a mismatched account
//    simply never ends up with a session middleware.ts will accept.

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get('next'));

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  // Seeded from ?error= — app/auth/callback/route.ts redirects back here
  // with one of these (wrong Google account, expired code, etc.) rather
  // than throwing client-side, since the whole OAuth round-trip happens
  // server-side between this page and Google.
  const [error, setError] = useState<string | null>(searchParams.get('error'));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Invalid username or password.');
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid username or password.');
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setIsGoogleSubmitting(true);
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    // A real error here only ever means Supabase couldn't even START the
    // OAuth redirect (misconfigured provider, network) — signInWithOAuth
    // navigates the whole page away to Google on success, so there's no
    // "it worked" branch to handle client-side.
    if (oauthError) {
      setError(oauthError.message);
      setIsGoogleSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 shadow-sm">
        <p className="text-2xl font-medium text-ink">Gloceries Admin</p>
        <p className="mt-1 text-sm text-muted">Founder sign-in.</p>

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isGoogleSubmitting || isSubmitting}
          className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-ink disabled:opacity-40"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.87 2.7-6.62Z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.9v2.33A9 9 0 0 0 9 18Z"
            />
            <path fill="#FBBC05" d="M3.95 10.7a5.4 5.4 0 0 1 0-3.4V4.97H.9a9 9 0 0 0 0 8.06l3.05-2.33Z" />
            <path
              fill="#EA4335"
              d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .9 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58Z"
            />
          </svg>
          {isGoogleSubmitting ? 'Redirecting…' : 'Continue with Google'}
        </button>

        <div className="mt-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
          <input
            type="text"
            required
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            className="rounded-xl border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
          />
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="rounded-xl border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
