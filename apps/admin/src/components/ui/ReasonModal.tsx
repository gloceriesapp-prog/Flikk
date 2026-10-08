'use client';

// One reason-capturing confirm dialog for the admin account controls
// (suspend rider, block customer, suspend store, reject application).
// Optional duration picker for time-boxed blocks. The parent does the actual
// write in onConfirm and throws on failure; the error is shown inline and the
// modal stays open.

import { useState } from 'react';
import { X } from 'lucide-react';

const FIELD_CLASS =
  'w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10';

export interface DurationOption {
  label: string;
  value: string;
}

export function ReasonModal({
  title,
  description,
  confirmLabel,
  initialReason = '',
  reasonRequired = true,
  durations,
  onClose,
  onConfirm,
}: {
  title: string;
  description?: string;
  confirmLabel: string;
  initialReason?: string;
  reasonRequired?: boolean;
  durations?: DurationOption[];
  onClose: () => void;
  onConfirm: (reason: string, duration: string | null) => Promise<void>;
}) {
  const [reason, setReason] = useState(initialReason);
  const [duration, setDuration] = useState<string | null>(durations?.[0]?.value ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = !submitting && (!reasonRequired || reason.trim().length >= 3) && reason.length <= 500;

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(reason.trim(), duration);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save. Try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={submitting ? undefined : onClose}>
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <h3 className="text-lg font-semibold text-ink">{title}</h3>
          <button type="button" onClick={onClose} disabled={submitting} className="text-muted hover:text-ink" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="flex flex-col gap-4 px-6 py-5">
          {description && <p className="text-sm text-ink-soft">{description}</p>}
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            Reason{reasonRequired ? '' : ' (optional)'}
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} className={FIELD_CLASS} rows={3} maxLength={500} autoFocus />
            {reasonRequired && reason.trim().length > 0 && reason.trim().length < 3 && (
              <span className="text-xs font-normal text-danger">At least 3 characters.</span>
            )}
          </label>
          {durations && (
            <label className="flex flex-col gap-1 text-sm font-medium text-ink">
              Duration
              <select value={duration ?? ''} onChange={(e) => setDuration(e.target.value)} className={FIELD_CLASS}>
                {durations.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <button type="button" onClick={onClose} disabled={submitting} className="rounded-full px-4 py-2 text-sm font-semibold text-ink-soft hover:text-ink">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!canSubmit}
            className="rounded-full bg-danger px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting ? 'Saving…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
