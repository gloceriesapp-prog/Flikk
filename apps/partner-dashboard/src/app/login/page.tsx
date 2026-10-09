'use client';

// Same phone-OTP identity the partner mobile app uses (backend's own
// POST /auth/otp/request + /otp/verify) — a store owner logs into this
// dashboard with the exact same account as their app, not a separate
// web-only login.
//
// Real gate, not cosmetic: this dashboard only exists for a store that
// already applied through the partner mobile app. Before ever sending an
// OTP, the phone is checked against POST /auth/otp/partner-check
// (backend's own note has the full reasoning) — a phone that's never
// touched the partner app gets a clear, honest error right away instead of
// a real SMS it didn't need, or a confusing "pending approval" screen for
// an account that was never a partner applicant in the first place.
// verifyOtp's own role/application_submitted check below is a second,
// defense-in-depth pass against the same rule for the (rare) case where
// the phone's status changed in the few seconds between the two calls.
//
// Google/email sign-in are UI only for now, per an explicit ask — real
// phone OTP is the only path that actually authenticates today.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { checkPartnerPhone, requestOtp, verifyOtp } from '@/lib/authApi';
import { setTokens } from '@/lib/authStorage';
import { ApiError } from '@/lib/api';
import { canStartPartnerSession } from '@/lib/partnerAccess';
import { CheckCircle2, LayoutGrid, Package, Wallet } from 'lucide-react';

type Step = 'phone' | 'otp';

const FEATURES = [
  { icon: Package, label: 'Manage your live order queue from a bigger screen' },
  { icon: LayoutGrid, label: 'Keep your catalog and stock in sync with the app' },
  { icon: Wallet, label: 'Track weekly payouts and settlement history' },
];

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fullPhone = `+91${phone}`;
  const busy = useRef(false);
  const mounted = useRef(true);
  const resendAt = useRef(0);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    mounted.current = true;
    const timer = setInterval(() => setSecondsLeft(Math.max(0, Math.ceil((resendAt.current - Date.now()) / 1000))), 500);
    return () => { mounted.current = false; clearInterval(timer); };
  }, []);

  function startCooldown() {
    resendAt.current = Date.now() + 60_000;
    setSecondsLeft(60);
  }

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(phone) || busy.current) return;
    busy.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      await checkPartnerPhone(fullPhone);
      await requestOtp(fullPhone);
      if (!mounted.current) return;
      startCooldown();
      setStep('otp');
    } catch (err) {
      if (mounted.current) setError(err instanceof ApiError ? err.message : 'Could not send the code.');
    } finally {
      busy.current = false;
      if (mounted.current) setIsSubmitting(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code) || busy.current) return;
    busy.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await verifyOtp(fullPhone, code);
      if (!mounted.current) return;

      // Defense-in-depth re-check of the same rule checkPartnerPhone
      // already enforced above — see this file's own header note on why
      // both passes exist.
      if (!canStartPartnerSession(result)) {
        setError("This number isn't registered on the Gloceries Partner app yet. Apply with your store there first.");
        return;
      }

      setTokens(result.access_token, result.refresh_token);
      if (!result.has_store || !result.is_approved) {
        router.replace('/pending-approval');
        return;
      }
      router.replace('/');
    } catch (err) {
      if (mounted.current) setError(err instanceof ApiError ? err.message : 'Invalid or expired code.');
    } finally {
      busy.current = false;
      if (mounted.current) setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (busy.current || Date.now() < resendAt.current) return;
    busy.current = true;
    setIsSubmitting(true);
    setCode('');
    setError(null);
    startCooldown();
    try {
      await requestOtp(fullPhone);
    } catch (err) {
      if (mounted.current) setError(err instanceof ApiError ? err.message : 'Could not resend the code.');
    } finally {
      busy.current = false;
      if (mounted.current) setIsSubmitting(false);
    }
  }

  return (
    <section className="min-h-screen bg-white p-3 text-black antialiased">
      <div className="grid min-h-[calc(100vh-1.5rem)] gap-6 lg:grid-cols-[0.94fr_1.06fr]">
        {/* Left: sign-in form */}
        <div className="flex min-h-[760px] items-center justify-center rounded-md border border-black/10 bg-white px-6 py-12 lg:min-h-0 lg:px-14 lg:py-20 xl:px-20">
          <div className="mx-auto w-full max-w-[420px]">
            <h1 className="text-3xl font-medium tracking-tight text-black sm:text-4xl">Gloceries Partner</h1>
            <p className="mt-2 text-sm text-black/50">
              {step === 'phone'
                ? 'Sign in with the phone number used on your Partner app.'
                : `Enter the code sent to ${fullPhone}.`}
            </p>

            {step === 'phone' ? (
              <>
                {/* UI only — no real Google/email auth wired up yet, per an
                    explicit ask to keep this to visual scaffolding for now. */}
                <div className="mt-8 grid gap-3 sm:grid-cols-2 sm:gap-4">
                  <button
                    type="button"
                    disabled
                    className="flex h-11 w-full min-w-0 cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-black/15 bg-white px-4 text-sm font-medium text-black/40"
                  >
                    <GoogleIcon />
                    <span className="whitespace-nowrap">Continue with Google</span>
                  </button>
                  <button
                    type="button"
                    disabled
                    className="flex h-11 w-full min-w-0 cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-black/15 bg-white px-4 text-sm font-medium text-black/40"
                  >
                    <span className="whitespace-nowrap">Continue with email</span>
                  </button>
                </div>

                <div className="my-6 flex items-center gap-4 text-xs font-medium text-black/40">
                  <div className="h-px flex-1 bg-black/10" />
                  or
                  <div className="h-px flex-1 bg-black/10" />
                </div>

                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-semibold text-black/60">Phone number</label>
                    <div className="flex h-11 items-center rounded-lg border border-black/15 bg-white px-3.5 focus-within:border-black/40">
                      <span className="pr-2 text-sm text-black/50">+91</span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        required
                        disabled={isSubmitting}
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value.replace(/\D/g, ''));
                          setError(null);
                        }}
                        placeholder="98765 43210"
                        className="w-full bg-transparent text-sm text-black outline-none placeholder:text-black/30"
                      />
                    </div>
                  </div>

                  {error && <p className="text-xs leading-5 text-red-600">{error}</p>}

                  <button
                    type="submit"
                    disabled={!/^[6-9]\d{9}$/.test(phone) || isSubmitting}
                    className="mt-2 flex h-11 w-full items-center justify-center rounded-lg border border-black/40 bg-black text-sm font-medium text-white transition-colors hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isSubmitting ? 'Checking…' : 'Continue'}
                  </button>
                </form>

                <p className="mt-8 text-xs leading-5 text-black/40">
                  New to Gloceries? Apply with your store on the Gloceries Partner app first — this dashboard unlocks
                  once that application is submitted.
                </p>
              </>
            ) : (
              <form onSubmit={handleVerifyOtp} className="mt-8 space-y-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-semibold text-black/60">6-digit code</label>
                  <div className="flex h-11 items-center rounded-lg border border-black/15 bg-white px-3.5 focus-within:border-black/40">
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={code}
                      maxLength={6}
                      autoComplete="one-time-code"
                      disabled={isSubmitting}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="w-full bg-transparent text-sm text-black outline-none placeholder:text-black/30"
                    />
                  </div>
                </div>

                {error && <p className="text-xs leading-5 text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={code.length !== 6 || isSubmitting}
                  className="flex h-11 w-full items-center justify-center rounded-lg border border-black/40 bg-black text-sm font-medium text-white transition-colors hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isSubmitting ? 'Verifying…' : 'Verify & sign in'}
                </button>
                <button type="button" onClick={handleResend} disabled={secondsLeft > 0 || isSubmitting}
                  className="w-full text-center text-sm font-medium text-black/50 disabled:opacity-50">
                  {secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : 'Resend code'}
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    setStep('phone');
                    setCode('');
                    setError(null);
                  }}
                  className="w-full text-center text-sm font-medium text-black/50"
                >
                  Use a different number
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right: brand panel — same dark navy-to-blue gradient language as
            the marketing site's hero, scaled down. */}
        <div className="relative hidden min-h-[720px] flex-col overflow-hidden rounded-md bg-[linear-gradient(180deg,#060B18_0%,#0B1743_55%,#123A8C_100%)] p-10 text-white lg:flex lg:min-h-0 lg:p-16">
          <div className="pointer-events-none absolute -top-20 -right-24 h-[360px] w-[360px] rounded-full bg-[#3B6BFF] opacity-25 blur-[110px]" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-[320px] w-[320px] rounded-full bg-[#A8D93A] opacity-[0.15] blur-[120px]" />
          {/* Vertical hairline texture, same cue as the reference layout's
              striped backdrop. */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.7) 0px, rgba(255,255,255,0.7) 1px, transparent 1px, transparent 34px)',
            }}
          />

          <div className="relative z-10 h-full w-full">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-sm font-bold">
                G
              </span>
              <div>
                <div className="text-sm font-semibold leading-tight text-white">Gloceries for Business</div>
                <div className="mt-0.5 text-xs text-white/50">Partner dashboard</div>
              </div>
            </div>

            <h2 className="mt-8 max-w-[420px] text-2xl font-light leading-tight tracking-[-0.02em] text-white/90 sm:text-3xl lg:text-[34px]">
              Your store, <span className="font-medium text-[#A8D93A]">from the counter to the cloud.</span>
            </h2>
            <p className="mt-5 max-w-[380px] text-sm leading-6 text-white/50">
              The Partner dashboard mirrors your Gloceries Partner app — same store, same orders, same account.
            </p>

            <ul className="mt-10 flex max-w-[380px] flex-col gap-4">
              {FEATURES.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-start gap-3 text-sm text-white/75">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10">
                    <Icon className="h-3.5 w-3.5 text-[#A8D93A]" />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative z-10 mt-auto flex items-center gap-2 text-xs font-medium text-white/40">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#A8D93A]" />
            Same account, same data — always in sync with your Partner app.
          </div>
        </div>
      </div>
    </section>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
        fill="#EB4335"
      />
    </svg>
  );
}
