'use client';

// App-wide toasts and confirm dialogs.
//
// toast.success('Saved') / toast.error('Could not save') / toast.info(...)
// can be called from any client code, no hook or context needed. They render
// in <Toaster />, mounted once in the root layout: a stack in the bottom-right
// that auto-dismisses after a few seconds (errors stay a little longer).
//
// confirmAction({ title, message, confirmLabel, tone }) replaces
// window.confirm with a styled dialog and resolves to true/false.

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import clsx from 'clsx';
import { AlertTriangle, CheckCircle2, AlertCircle, X } from '@/components/icons';

type ToastTone = 'success' | 'error' | 'info';
interface ToastItem { id: number; tone: ToastTone; title: string; description?: string }

let toasts: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); };

function dismiss(id: number) {
  toasts = toasts.filter((item) => item.id !== id);
  emit();
}

function push(tone: ToastTone, title: string, description?: string) {
  const id = nextId++;
  toasts = [...toasts.slice(-3), { id, tone, title, description }];
  emit();
  setTimeout(() => dismiss(id), tone === 'error' ? 6500 : 4000);
  return id;
}

export const toast = {
  success: (title: string, description?: string) => push('success', title, description),
  error: (title: string, description?: string) => push('error', title, description),
  info: (title: string, description?: string) => push('info', title, description),
  dismiss,
};

interface ConfirmRequest {
  title: string;
  message?: string;
  confirmLabel?: string;
  tone?: 'default' | 'danger';
  resolve: (ok: boolean) => void;
}

let confirmRequest: ConfirmRequest | null = null;
const confirmListeners = new Set<() => void>();
const subscribeConfirm = (listener: () => void) => { confirmListeners.add(listener); return () => confirmListeners.delete(listener); };

// A plain question works too: "Delete this FAQ?" becomes the title and any
// text after the first "?" the explanation underneath.
export function confirmAction(input: string | Omit<ConfirmRequest, 'resolve'>): Promise<boolean> {
  const options = typeof input === 'string' ? splitQuestion(input) : input;
  return new Promise((resolve) => {
    confirmRequest?.resolve(false);
    confirmRequest = { ...options, resolve };
    confirmListeners.forEach((listener) => listener());
  });
}

function splitQuestion(text: string): Omit<ConfirmRequest, 'resolve'> {
  const at = text.indexOf('?');
  const title = at === -1 ? text : text.slice(0, at + 1);
  const message = at === -1 ? undefined : text.slice(at + 1).trim() || undefined;
  return { title, message, tone: /^(delete|remove)\b/i.test(title) ? 'danger' : 'default', confirmLabel: /^(delete|remove)\b/i.test(title) ? 'Delete' : 'Confirm' };
}

function settleConfirm(ok: boolean) {
  const request = confirmRequest;
  confirmRequest = null;
  confirmListeners.forEach((listener) => listener());
  request?.resolve(ok);
}

const TONE = {
  success: { icon: CheckCircle2, ring: 'text-success bg-success-soft' },
  error: { icon: AlertCircle, ring: 'text-danger bg-danger-soft' },
  info: { icon: AlertTriangle, ring: 'text-brand bg-brand-soft' },
} as const;

function ConfirmDialog({ request }: { request: ConfirmRequest }) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') settleConfirm(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  const danger = request.tone === 'danger';
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={() => settleConfirm(false)} />
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"
        className="card relative w-full max-w-md animate-rise p-6 shadow-[var(--shadow-pop)]">
        <div className="flex gap-4">
          <span className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', danger ? 'bg-danger-soft text-danger' : 'bg-brand-soft text-brand')}>
            <AlertTriangle size={18} />
          </span>
          <div className="min-w-0">
            <h2 id="confirm-title" className="text-base font-semibold text-ink">{request.title}</h2>
            {request.message && <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{request.message}</p>}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => settleConfirm(false)}>Cancel</button>
          <button ref={confirmRef} type="button" className={clsx('btn', danger ? 'btn-danger' : 'btn-primary')} onClick={() => settleConfirm(true)}>
            {request.confirmLabel ?? 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Toaster() {
  const items = useSyncExternalStore(subscribe, () => toasts, () => toasts);
  const request = useSyncExternalStore(subscribeConfirm, () => confirmRequest, () => confirmRequest);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { Promise.resolve().then(() => setMounted(true)); }, []);
  if (!mounted) return null;
  return (
    <>
      <div aria-live="polite" className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[360px] max-w-[calc(100vw-2.5rem)] flex-col gap-2">
        {items.map((item) => {
          const { icon: Icon, ring } = TONE[item.tone];
          return (
            <div key={item.id} role={item.tone === 'error' ? 'alert' : 'status'}
              className="card pointer-events-auto flex animate-toast-in items-start gap-3 p-3.5 pr-2.5 shadow-[var(--shadow-pop)]">
              <span className={clsx('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full', ring)}>
                <Icon size={15} />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm font-semibold text-ink">{item.title}</p>
                {item.description && <p className="mt-0.5 text-[13px] leading-snug text-ink-soft">{item.description}</p>}
              </div>
              <button type="button" aria-label="Dismiss" onClick={() => dismiss(item.id)} className="icon-btn h-7 w-7 text-muted">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
      {request && <ConfirmDialog request={request} />}
    </>
  );
}
