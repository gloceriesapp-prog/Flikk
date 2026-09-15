'use client';

// Same phone-OTP identity the partner mobile app uses (backend's own
// POST /auth/otp/request + /otp/verify) — a store owner logs into this
// dashboard with the exact same account as their app, not a separate
// web-only login. +91-fixed, India-only, same convention
// apps/partner/src/components/PhoneInput.tsx already establishes.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { requestOtp, verifyOtp } from '@/lib/authApi';
import { ApiError } from '@/lib/api';

type Step = 'phone' | 'otp';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fullPhone = `+91${phone}`;

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    if (phone.length !== 10 || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await requestOtp(fullPhone);
      setStep('otp');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send the code.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!code || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await verifyOtp(fullPhone, code);
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9] px-4">
      <div className="w-full max-w-sm rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
        <p className="text-2xl font-semibold text-neutral-900">Flikk Partner</p>
        <p className="mt-1 text-sm text-neutral-500">
          {step === 'phone' ? 'Sign in with your store owner phone number.' : `Enter the code sent to ${fullPhone}.`}
        </p>

        {step === 'phone' ? (
          <form onSubmit={handleRequestOtp} className="mt-6 flex flex-col gap-3">
            <div className="flex items-center rounded-xl border border-neutral-300 px-3.5 py-2.5">
              <span className="pr-2 text-sm font-medium text-neutral-500">+91</span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="98765 43210"
                className="w-full text-sm text-neutral-900 outline-none"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={phone.length !== 10 || isSubmitting}
              className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
            >
              {isSubmitting ? 'Sending…' : 'Send code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="mt-6 flex flex-col gap-3">
            <input
              type="text"
              inputMode="numeric"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="6-digit code"
              className="rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-900 outline-none"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={!code || isSubmitting}
              className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
            >
              {isSubmitting ? 'Verifying…' : 'Verify & sign in'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setCode('');
                setError(null);
              }}
              className="text-sm font-medium text-neutral-500"
            >
              Use a different number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
