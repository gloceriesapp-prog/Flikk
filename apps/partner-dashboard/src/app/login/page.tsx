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
// Phone OTP is the only sign-in method, so the page offers nothing else.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { checkPartnerPhone, requestOtp, verifyOtp } from '@/lib/authApi';
import { clearTokens } from '@/lib/authStorage';
import { ApiError } from '@/lib/api';
import { OtpInput } from '@/components/login/OtpInput';
import { StoreIllustration } from '@/components/login/StoreIllustration';

type Step = 'phone' | 'otp';

const PHONE_LENGTH = 10;
const CODE_LENGTH = 6;
const RESEND_SECONDS = 30;
const SITE_URL = 'https://www.gloceries.com';

// Indian mobile numbers are 10 digits starting 6-9. Pasted numbers often
// carry +91, a leading 0, spaces or dashes; keep the last 10 digits.
function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return digits.length > PHONE_LENGTH ? digits.slice(-PHONE_LENGTH) : digits;
}

function phoneProblem(phone: string): string | null {
  if (phone.length < PHONE_LENGTH) return null;
  return /^[6-9]/.test(phone) ? null : 'Enter a valid 10-digit mobile number.';
}

function formatPhone(phone: string): string {
  return phone.length > 5 ? `${phone.slice(0, 5)} ${phone.slice(5)}` : phone;
}

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const lastAutoSubmitted = useRef<string | null>(null);

  const fullPhone = `+91${phone}`;
  const phoneError = phoneProblem(phone);
  const phoneReady = phone.length === PHONE_LENGTH && !phoneError;

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!phoneReady || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await checkPartnerPhone(fullPhone);
      await requestOtp(fullPhone);
      setCode('');
      lastAutoSubmitted.current = null;
      setResendIn(RESEND_SECONDS);
      setStep('otp');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send the code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (resendIn > 0 || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await requestOtp(fullPhone);
      setCode('');
      lastAutoSubmitted.current = null;
      setResendIn(RESEND_SECONDS);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not resend the code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function verify(submittedCode: string) {
    if (submittedCode.length !== CODE_LENGTH || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await verifyOtp(fullPhone, submittedCode);

      // Defense-in-depth re-check of the same rule checkPartnerPhone
      // already enforced above — see this file's own header note on why
      // both passes exist.
      if (result.role !== 'store_owner' && !result.application_submitted) {
        clearTokens();
        setError("This number isn't registered on the Gloceries Partner app yet. Apply with your store there first.");
        return;
      }

      if (!result.has_store || !result.is_approved) {
        router.replace('/pending-approval');
        return;
      }
      router.replace('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invalid or expired code.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCodeChange(next: string) {
    setCode(next);
    setError(null);
    // Submit as soon as the sixth digit lands, once per distinct code, so a
    // wrong code isn't retried in a loop and an edited code still submits.
    if (next.length === CODE_LENGTH && lastAutoSubmitted.current !== next) {
      lastAutoSubmitted.current = next;
      void verify(next);
    }
  }

  function backToPhone() {
    setStep('phone');
    setCode('');
    setError(null);
    lastAutoSubmitted.current = null;
  }

  return (
    <main className="min-h-screen bg-[#1c2a22] p-2 text-[#1d2b22] antialiased sm:p-3">
      <div className="relative min-h-[calc(100vh-1rem)] overflow-hidden rounded-[28px] bg-[#dff5c2] sm:min-h-[calc(100vh-1.5rem)]">
        {/* Scene fills the frame; the card sits over its right side. */}
        <StoreIllustration className="absolute inset-0 hidden h-full w-full lg:block" />

        <div className="relative flex min-h-[calc(100vh-1rem)] items-stretch justify-end p-3 sm:min-h-[calc(100vh-1.5rem)] sm:p-6 lg:p-5">
          <section className="flex w-full flex-col rounded-[28px] bg-white px-6 py-10 shadow-[0_20px_60px_-30px_rgba(16,48,28,0.45)] sm:px-12 lg:w-[48%] lg:max-w-[640px] xl:px-20">
            <div className="flex items-center justify-center gap-2.5">
              <BrandMark />
              <span className="text-[22px] font-semibold tracking-tight">gloceries</span>
              <span className="rounded-full bg-[#eef8de] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#5c8f2a]">
                Partner
              </span>
            </div>

            <div className="mx-auto flex w-full max-w-[340px] flex-1 flex-col justify-center py-10">
              {step === 'phone' ? (
                <>
                  <h1 className="text-center font-[family-name:var(--font-ibm-plex)] text-[44px] font-medium leading-[1.05] tracking-tight sm:text-[52px]">
                    Partner
                    <br />
                    sign in
                  </h1>
                  <p className="mt-4 text-center text-sm text-black/50">Use the mobile number registered on your Partner app.</p>

                  <form onSubmit={handleRequestOtp} className="mt-9 space-y-4" noValidate>
                    <label htmlFor="phone" className="sr-only">
                      Mobile number
                    </label>
                    <div
                      className={`flex h-[52px] items-center rounded-full border bg-white pl-5 pr-4 transition-shadow focus-within:ring-4 ${
                        phoneError ? 'border-red-400 focus-within:ring-red-100' : 'border-black/10 focus-within:border-[#8cc152] focus-within:ring-[#a8d93a]/25'
                      }`}
                    >
                      <span className="pr-3 text-sm font-medium text-black/60">+91</span>
                      <span className="mr-3 h-5 w-px bg-black/10" aria-hidden="true" />
                      <input
                        id="phone"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        autoFocus
                        value={formatPhone(phone)}
                        onChange={(e) => {
                          setPhone(normalisePhone(e.target.value));
                          setError(null);
                        }}
                        onPaste={(e) => {
                          e.preventDefault();
                          setPhone(normalisePhone(e.clipboardData.getData('text')));
                          setError(null);
                        }}
                        placeholder="Mobile number"
                        aria-invalid={Boolean(phoneError) || undefined}
                        aria-describedby="phone-help"
                        className="w-full bg-transparent text-[15px] tracking-wide outline-none placeholder:tracking-normal placeholder:text-black/35"
                      />
                      <span className="shrink-0 text-xs tabular-nums text-black/30">
                        {phone.length}/{PHONE_LENGTH}
                      </span>
                    </div>

                    <p id="phone-help" className="min-h-5 px-5 text-xs leading-5 text-red-600" role="alert">
                      {phoneError ?? error ?? ''}
                    </p>

                    <button
                      type="submit"
                      disabled={!phoneReady || isSubmitting}
                      className="flex h-[52px] w-full items-center justify-center rounded-full bg-[#155dfc] text-[15px] font-semibold text-white transition-colors hover:bg-[#0f4ad1] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSubmitting ? 'Sending code…' : 'Send OTP'}
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={backToPhone}
                    className="mb-6 inline-flex items-center gap-1.5 self-start text-sm font-medium text-black/50 hover:text-black"
                  >
                    <ArrowLeft className="h-4 w-4" /> Change number
                  </button>
                  <h1 className="text-center font-[family-name:var(--font-ibm-plex)] text-[44px] font-medium leading-[1.05] tracking-tight sm:text-[52px]">
                    Verify
                    <br />
                    OTP
                  </h1>
                  <p className="mt-4 text-center text-sm text-black/50">
                    Enter the 6-digit code sent to <span className="font-semibold text-black/80">+91 {formatPhone(phone)}</span>
                  </p>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void verify(code);
                    }}
                    className="mt-9 space-y-4"
                  >
                    <OtpInput value={code} onChange={handleCodeChange} disabled={isSubmitting} invalid={Boolean(error)} autoFocus />

                    <p className="min-h-5 text-center text-xs leading-5 text-red-600" role="alert">
                      {error ?? ''}
                    </p>

                    <button
                      type="submit"
                      disabled={code.length !== CODE_LENGTH || isSubmitting}
                      className="flex h-[52px] w-full items-center justify-center rounded-full bg-[#155dfc] text-[15px] font-semibold text-white transition-colors hover:bg-[#0f4ad1] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSubmitting ? 'Verifying…' : 'Verify & sign in'}
                    </button>
                  </form>

                  <p className="mt-6 text-center text-sm text-black/50">
                    Didn&apos;t get the code?{' '}
                    {resendIn > 0 ? (
                      <span className="tabular-nums text-black/40">Resend in {resendIn}s</span>
                    ) : (
                      <button type="button" onClick={handleResend} disabled={isSubmitting} className="font-semibold text-[#5c8f2a] hover:underline disabled:opacity-50">
                        Resend OTP
                      </button>
                    )}
                  </p>
                </>
              )}

              <p className="mt-8 text-center text-xs leading-5 text-black/50">
                By continuing you agree to Gloceries&apos;{' '}
                <a href={`${SITE_URL}/terms`} target="_blank" rel="noreferrer" className="font-semibold text-[#5c8f2a] hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href={`${SITE_URL}/privacy`} target="_blank" rel="noreferrer" className="font-semibold text-[#5c8f2a] hover:underline">
                  Privacy Policy
                </a>
                .
              </p>
            </div>

            <p className="text-center text-sm text-black/60">
              New to Gloceries? <span className="font-semibold text-[#5c8f2a]">Apply on the Partner app</span>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

// The Gloceries cart-"G" mark, simplified for small sizes.
function BrandMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#a3d65c" />
      <path d="M7 8.5h3.2l1 3.6" stroke="#1d2b22" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path
        d="M22.6 13.2a6.4 6.4 0 1 0 .4 4.2h-5.2"
        stroke="#1d2b22"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="12.5" cy="25" r="1.8" fill="#1d2b22" />
      <circle cx="21" cy="25" r="1.8" fill="#1d2b22" />
    </svg>
  );
}
