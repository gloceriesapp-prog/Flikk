'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, X } from 'lucide-react';
import { fetchMyOrders, type PartnerOrder } from '@/lib/partnerApi';

// Accept-time SLA depends on the owner noticing a 'placed' order fast. There's
// no realtime channel wired into this web dashboard, so this polls on an
// interval, and fires when a NEW placed order appears since the last poll:
//   - a short WebAudio beep (synthesised, no audio asset to ship/licence)
//   - a browser Notification if the owner has granted permission
//   - an in-app toast, always
// It also lifts the live 'placed' count to the layout so the sidebar/header
// badge stays current without a second fetch.
const POLL_MS = 20_000;

// ponytail: synthesised beep, no asset. Swap for a real chime only if owners ask.
function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.42);
    osc.onended = () => ctx.close();
  } catch {
    // Autoplay policy may block audio before the owner interacts — non-fatal.
  }
}

interface Toast {
  id: string;
  orderNumber: string;
  count: number;
}

export function NewOrderAlert({ onCountChange }: { onCountChange?: (n: number) => void }) {
  const seenPlaced = useRef<Set<string> | null>(null); // null = not yet seeded
  const [toast, setToast] = useState<Toast | null>(null);

  const check = useCallback(async () => {
    let orders: PartnerOrder[];
    try {
      orders = await fetchMyOrders();
    } catch {
      return; // transient network error — try again next tick
    }
    const placed = orders.filter((o) => o.status === 'placed');
    onCountChange?.(placed.length);

    // First poll only seeds the baseline — existing orders don't alert.
    if (seenPlaced.current === null) {
      seenPlaced.current = new Set(placed.map((o) => o.id));
      return;
    }

    const fresh = placed.filter((o) => !seenPlaced.current!.has(o.id));
    seenPlaced.current = new Set(placed.map((o) => o.id));
    if (fresh.length === 0) return;

    beep();
    const newest = fresh[0];
    setToast({ id: newest.id, orderNumber: newest.order_number, count: fresh.length });

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(fresh.length === 1 ? 'New order' : `${fresh.length} new orders`, {
        body: fresh.length === 1 ? `${newest.order_number} is waiting to be packed.` : 'New orders are waiting to be packed.',
      });
    }
  }, [onCountChange]);

  useEffect(() => {
    // Ask once, quietly — no alert() nag; browser shows its own prompt.
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    check();
    const t = setInterval(check, POLL_MS);
    return () => clearInterval(t);
  }, [check]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[22rem] max-w-[calc(100vw-3rem)] animate-in fade-in slide-in-from-bottom-4">
      <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-2xl ring-1 ring-black/5">
        {/* Accent header strip — high-visibility so a new order can't be missed */}
        <div className="flex items-center gap-2.5 bg-amber-500 px-4 py-2.5 text-white">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
          </span>
          <p className="text-sm font-semibold">
            {toast.count === 1 ? 'New order received' : `${toast.count} new orders`}
          </p>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-auto -mr-1 rounded-full p-1 text-white/80 hover:bg-white/20 hover:text-white"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Bell size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-neutral-900">
              {toast.count === 1 ? toast.orderNumber : `${toast.count} orders`}
            </p>
            <p className="mt-0.5 text-sm text-neutral-500">Waiting to be packed.</p>
          </div>
          <Link
            href="/orders"
            onClick={() => setToast(null)}
            className="shrink-0 rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800"
          >
            View
          </Link>
        </div>
      </div>
    </div>
  );
}
