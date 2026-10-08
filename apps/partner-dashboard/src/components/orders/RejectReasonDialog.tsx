'use client';

// Reject asks why: one of the shared store reject reasons, sent as the
// cancel reason. Replaces the old reason-less window.confirm.
import { useState } from 'react';
import { STORE_REJECT_REASONS } from '@/lib/storeRejectReasons';

interface Props {
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

export function RejectReasonDialog({ onConfirm, onClose }: Props) {
  const [reason, setReason] = useState('');
  return (
    <div role="dialog" aria-modal="true" aria-label="Reject order" className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="text-base font-semibold text-neutral-900">Reject this order?</h2>
        <p className="mt-1 text-sm text-neutral-500">It is cancelled for the customer and any payment is refunded. This cannot be undone.</p>
        <fieldset className="mt-4 flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-neutral-700">Reason</legend>
          {STORE_REJECT_REASONS.map((option) => (
            <label key={option.code} className="flex items-center gap-2 text-sm text-neutral-800">
              <input type="radio" name="reject-reason" value={option.code} checked={reason === option.code} onChange={() => setReason(option.code)} />
              {option.label}
            </label>
          ))}
        </fieldset>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900">
            Keep order
          </button>
          <button
            type="button"
            disabled={!reason}
            onClick={() => onConfirm(reason)}
            className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Reject order
          </button>
        </div>
      </div>
    </div>
  );
}
