'use client';

// The admin dashboard's single sign-in surface and the only page reachable
// without a session (middleware.ts enforces that everywhere else). There is
// no Google/password step anymore: opening the admin lands here, a 6-digit
// code is emailed to ADMIN_OTP_EMAIL (api/auth/otp/send) on mount, and
// entering it (api/auth/otp/verify) sets the signed admin-session cookie and
// drops you into the dashboard.

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { safeNextPath } from '@/lib/safeNext';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get('next'));
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const autoSent = useRef(false);

  async function sendCode() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/otp/send', { method: 'POST' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not send the code.');
      setSentTo(body.sentTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the code.');
    } finally {
      setBusy(false);
    }
  }

  // One automatic send per visit (ref guard survives StrictMode re-runs).
  useEffect(() => {
    if (autoSent.current) return;
    autoSent.current = true;
    Promise.resolve().then(sendCode);
  }, []);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'That code is incorrect.');
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code is incorrect.');
      setCode('');
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar px-4 [background-image:radial-gradient(60rem_40rem_at_50%_-10%,rgb(22_80_255/0.28),transparent)]">
      <div className="card w-full max-w-sm animate-rise p-8 shadow-[var(--shadow-pop)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand-mark.png" alt="" className="mb-5 h-11 w-11 rounded-xl" />
        <h1 className="text-xl font-semibold tracking-tight text-ink">Sign in to Gloceries Admin</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          {sentTo ? (
            <>
              We emailed a 6-digit sign-in code to <span className="font-medium text-ink">{sentTo}</span>. It expires in 10 minutes.
            </>
          ) : (
            busy ? 'Sending your sign-in code…' : 'Request a sign-in code to continue.'
          )}
        </p>

        {error && <p role="alert" className="mt-4 rounded-[10px] bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

        <form onSubmit={verify} className="mt-6 flex flex-col gap-3">
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            className="rounded-[10px] border border-border bg-card px-3.5 py-3 text-center text-xl font-semibold tracking-[0.5em] text-ink"
          />
          <button type="submit" disabled={busy || !sentTo || code.length !== 6} className="btn btn-primary py-2.5">
            {busy ? 'Please wait…' : 'Verify'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-muted">
          Didn&apos;t get it?{' '}
          <button type="button" onClick={sendCode} disabled={busy} className="font-semibold text-brand hover:underline disabled:opacity-40">
            Resend code
          </button>
        </div>
      </div>
    </div>
  );
}
