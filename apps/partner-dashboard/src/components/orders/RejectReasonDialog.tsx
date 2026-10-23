'use client';

// Reject asks why: one of the shared store reject reasons, sent as the
// cancel reason. Replaces the old reason-less window.confirm. Sits above the
// details panel (z-[70]) so it can be opened from there too.
import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { AlertTriangle } from 'lucide-react';
import { STORE_REJECT_REASONS } from '@/lib/storeRejectReasons';
import { trapTab } from './orderMeta';

interface Props {
  onConfirm: (reason: string) => void;
  onClose: () => void;
  orderNumber?: string;
  isSubmitting?: boolean;
  error?: string | null;
}

export function RejectReasonDialog({ onConfirm, onClose, orderNumber, isSubmitting = false, error }: Props) {
  const [reason, setReason] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);

  // Focus moves into the dialog and returns to whatever opened it on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    boxRef.current?.querySelector<HTMLInputElement>('input[type="radio"]')?.focus();
    return () => opener?.focus?.();
  }, []);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-title"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
          }
          trapTab(e, boxRef.current);
        }}
        className="w-full rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-3xl sm:p-6"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertTriangle size={18} aria-hidden />
          </span>
          <div>
            <h2 id="reject-title" className="text-lg font-semibold text-ink">
              Reject {orderNumber ? `#${orderNumber}` : 'this order'}?
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              It is cancelled for the customer and any payment is refunded. This cannot be undone.
            </p>
          </div>
        </div>

        {error && <p role="alert" className="mt-4 text-sm font-medium text-red-600">{error}</p>}
        <fieldset disabled={isSubmitting} className="mt-5">
          <legend className="mb-2 text-sm font-medium text-ink">Why are you rejecting it?</legend>
          <div className="flex flex-col gap-2">
            {STORE_REJECT_REASONS.map((option) => (
              <label
                key={option.code}
                className={clsx(
                  'flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent',
                  reason === option.code ? 'border-red-300 bg-red-50/60 text-ink' : 'border-slate-200 text-slate-700 hover:bg-slate-50',
                )}
              >
                <input
                  type="radio"
                  name="reject-reason"
                  value={option.code}
                  checked={reason === option.code}
                  onChange={() => setReason(option.code)}
                  className="h-4 w-4 accent-red-600 focus:outline-none"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-11 flex-1 rounded-full border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Keep order
          </button>
          <button
            type="button"
            disabled={!reason || isSubmitting}
            onClick={() => onConfirm(reason)}
            className="h-11 flex-1 rounded-full bg-red-600 text-sm font-semibold text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? 'Rejecting…' : 'Reject order'}
          </button>
        </div>
      </div>
    </div>
  );
}
