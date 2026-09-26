'use client';

// Minimal toast — no dependency. A module-level pub/sub the `toast` helper
// pushes into and <Toaster/> (mounted once in the dashboard layout) renders.
// Kept in-house rather than pulling sonner/react-hot-toast: three variants,
// auto-dismiss, that's the whole requirement.

import { useEffect, useState } from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import clsx from 'clsx';

type ToastKind = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

let seq = 0;
const listeners = new Set<(items: ToastItem[]) => void>();
let items: ToastItem[] = [];

function emit() {
  for (const l of listeners) l(items);
}

function push(kind: ToastKind, message: string) {
  const id = ++seq;
  items = [...items, { id, kind, message }];
  emit();
  // Auto-dismiss after 3.5s — long enough to read a product name, short
  // enough not to stack up during a batch of edits.
  setTimeout(() => dismiss(id), 3500);
}

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

export const toast = {
  success: (message: string) => push('success', message),
  error: (message: string) => push('error', message),
  info: (message: string) => push('info', message),
};

const STYLES: Record<ToastKind, { icon: typeof CheckCircle2; ring: string; iconColor: string }> = {
  success: { icon: CheckCircle2, ring: 'border-emerald-200', iconColor: 'text-emerald-600' },
  error: { icon: XCircle, ring: 'border-red-200', iconColor: 'text-red-600' },
  info: { icon: Info, ring: 'border-neutral-200', iconColor: 'text-neutral-500' },
};

export function Toaster() {
  const [list, setList] = useState<ToastItem[]>([]);

  useEffect(() => {
    listeners.add(setList);
    return () => {
      listeners.delete(setList);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-80 flex-col gap-2.5">
      {list.map((t) => {
        const { icon: Icon, ring, iconColor } = STYLES[t.kind];
        return (
          <div
            key={t.id}
            role="status"
            className={clsx(
              'pointer-events-auto flex items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-lg',
              'animate-[toast-in_0.18s_ease-out]',
              ring,
            )}
          >
            <Icon size={18} className={clsx('mt-0.5 shrink-0', iconColor)} />
            <p className="flex-1 text-sm font-medium text-neutral-800">{t.message}</p>
            <button type="button" onClick={() => dismiss(t.id)} className="text-neutral-400 hover:text-neutral-600">
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
