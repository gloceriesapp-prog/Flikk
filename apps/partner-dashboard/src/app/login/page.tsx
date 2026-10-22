'use client';

// Same phone-OTP identity the partner mobile app uses (backend's own
// POST /auth/otp/request + /otp/verify) — a store owner logs into this
// dashboard with the exact same account as their app, not a separate
// web-only login.
//
// Dashboard sign-in requires an existing store_owner account. The OTP send
// and verify calls both enforce this on the server, including every resend.
// No separate preflight request is needed before sending the code.
//
// Phone OTP is the only sign-in method, so the page offers nothing else.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requestOtp, verifyOtp } from '@/lib/authApi';
import { clearTokens } from '@/lib/authStorage';
import { ApiError } from '@/lib/api';
import { OtpInput } from '@/components/login/OtpInput';

type Step = 'phone' | 'otp';

const PHONE_LENGTH = 10;
const CODE_LENGTH = 6;
const RESEND_SECONDS = 30;
const SITE_URL = 'https://www.gloceries.com';
const LOGIN_IMAGE_URL = 'https://images.gloceries.com/appsui/patner-dashboard-loginv3.png';
const BRAND_MARK_URL = 'https://images.gloceries.com/appsui/gloceries-main.png';

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

      // Keep the UI gate strict as well: a submitted application is not a role.
      if (result.role !== 'store_owner') {
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
    <main className="min-h-dvh text-[#1d2b22] antialiased lg:h-dvh lg:overflow-hidden">
      <div className="relative min-h-screen overflow-hidden bg-[#155dfc]">
        {/* Scene fills the frame; the card sits over its right side. */}
        {/* Whole image at its own aspect ratio, never cropped or zoomed. Any leftover
            space is the frame's blue, which matches the image's own background. */}
        <img
          src={LOGIN_IMAGE_URL}
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-0 hidden h-full w-full select-none object-contain object-left-bottom lg:block"
        />

        <div className="relative flex min-h-screen items-stretch justify-end p-3 sm:p-6 lg:p-2">
          <section className="flex w-full flex-col rounded-[28px] bg-white px-6 py-10 shadow-[0_20px_60px_-30px_rgba(16,48,28,0.45)] sm:px-12 lg:w-[48%] lg:max-w-[640px] xl:px-20">
            <div className="flex items-center justify-center gap-2.5">
              <BrandMark />
              <span className="text-[22px] font-semibold tracking-tight">gloceries Store</span>

            </div>

            <div className="mx-auto flex w-full max-w-[340px] flex-1 flex-col justify-center py-10">
              {step === 'phone' ? (
                <>
                  <h1 className="text-center text-[44px] font-medium leading-[1.05] tracking-tight sm:text-[52px]">
                    Partner

                    sign in
                  </h1>
                  <p className="mt-4 text-center text-sm text-black/50 font-medium">Use the mobile number registered with <br/> your Partner app.</p>

                  <form onSubmit={handleRequestOtp} className="mt-9 space-y-3" noValidate>
                    <label htmlFor="phone" className="sr-only">
                      Mobile number
                    </label>
                    <div
                      className={`flex h-[54px] items-center rounded-xl border bg-white pl-4 pr-4 shadow-[0_1px_2px_rgba(16,24,16,0.04)] transition-[border-color,box-shadow] duration-150  ${
                        phoneError ? 'border-red-400 focus-within:ring-red-100' : 'border-black/10 hover:border-black/20 focus-within:border-black/40 focus-within:ring-black/[0.04]'
                      }`}
                    >
                      <IndiaFlag />
                      <span className="pl-2 pr-3 text-[15px] font-semibold text-black/75">+91</span>
                      <span className="mr-3 h-5 w-px bg-black/10" aria-hidden="true" />
                      <input
                        id="phone"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        autoFocus
                        maxLength={PHONE_LENGTH}
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value.replace(/\D/g, '').slice(0, PHONE_LENGTH));
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
                        className="w-full bg-transparent text-[15px] font-medium tracking-[0.06em] text-[#1d2b22] outline-none placeholder:font-normal placeholder:tracking-normal placeholder:text-black/35"
                      />
                    </div>

                    {(phoneError ?? error) && (
                      <p id="phone-help" className="px-1 text-xs leading-5 text-red-600" role="alert">
                        {phoneError ?? error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={!phoneReady || isSubmitting}
                      className="flex h-[54px] w-full items-center justify-center rounded-xl bg-[#000000] text-[15px] font-semibold text-white transition-[background-color,transform,box-shadow] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
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
                  <h1 className="text-center text-[44px] font-medium leading-[1.05] tracking-tight sm:text-[52px]">
                    Verify

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
                      className="flex h-[52px] w-full items-center justify-center rounded-xl bg-[#000000] text-[15px] font-semibold text-white transition-colors hover:bg-[#0f4ad1] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSubmitting ? 'Verifying…' : 'Verify & sign in'}
                    </button>
                  </form>

                  <p className="mt-6 text-center text-sm text-black/50">
                    Didn&apos;t get the code?{' '}
                    {resendIn > 0 ? (
                      <span className="tabular-nums text-black/40">Resend in {resendIn}s</span>
                    ) : (
                      <button type="button" onClick={handleResend} disabled={isSubmitting} className="font-semibold text-[#000000] hover:underline disabled:opacity-50">
                        Resend OTP
                      </button>
                    )}
                  </p>
                </>
              )}

              <p className="mt-8 text-center text-xs leading-5 text-black/50">
                By continuing you agree to Gloceries&apos;{' '}
                <a href={`${SITE_URL}/terms`} target="_blank" rel="noreferrer" className="font-semibold text-[#000000] hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href={`${SITE_URL}/privacy`} target="_blank" rel="noreferrer" className="font-semibold text-[#000000] hover:underline">
                  Privacy Policy
                </a>
                .
              </p>
            </div>

            <p className="text-center text-sm text-black/60">
              New to Gloceries? <span className="font-semibold text-[#000000]">Apply on the Partner app</span>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

function BrandMark() {
  return <img src={BRAND_MARK_URL} alt="" width={30} height={30} className="h-[30px] w-[30px] rounded-[9px] object-contain" />;
}

// India flag for the +91 prefix — inline so it renders the same on every OS
// (Windows has no flag emoji).
function IndiaFlag() {
  return (
    <svg width="24" height="17" viewBox="0 0 24 17" aria-hidden="true" className="shrink-0 overflow-hidden rounded-[3px] ">
      <rect width="24" height="17" fill="#fff" />
      <rect width="24" height="5.67" fill="#FF9933" />
      <rect y="11.33" width="24" height="5.67" fill="#138808" />
      <circle cx="12" cy="8.5" r="2.2" fill="none" stroke="#000080" strokeWidth="0.6" />
      <circle cx="12" cy="8.5" r="0.5" fill="#000080" />
    </svg>
  );
}
