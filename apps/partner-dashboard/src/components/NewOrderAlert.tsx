'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DEMO_DATA_ENABLED } from '@/lib/demoMode';
import { acceptPartnerOrder, updateOrderStatus, fetchOrderQueue, fetchOrderQueueVersion, type PartnerOrder } from '@/lib/partnerApi';
import { useLiveData } from '@/lib/useLiveData';
import { FloatingOrderAttention } from '@/components/home/FloatingOrderAttention';
import { RejectReasonDialog } from '@/components/orders/RejectReasonDialog';
import { createQueueReader } from '@/features/order-alerts/queueReader';
import { useOrderAlertSound } from '@/features/order-alerts/useOrderAlertSound';
import { toast } from '@/components/ui/Toast';

// Shared active-queue reader for the persistent attention card and shell badges.
// useLiveData pauses polling while hidden. Only newly seen, unaccepted orders
// trigger browser notifications; sound cues use authoritative acceptance timing.
const POLL_MS = 5_000;

export function NewOrderAlert({ onCountChange }: { onCountChange?: (n: number) => void }) {
  const [readQueue] = useState(() => DEMO_DATA_ENABLED ? fetchOrderQueue : createQueueReader(fetchOrderQueueVersion, fetchOrderQueue));
  const { data: orders, error, refetch } = useLiveData(readQueue, POLL_MS);
  const seenPlaced = useRef<Set<string> | null>(null);
  const busy = useRef(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [rejectingOrder, setRejectingOrder] = useState<PartnerOrder | null>(null);
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!orders) return;
    const placed = orders.filter(order => order.status === 'placed' && !order.accepted_at && !acceptedIds.has(order.id));
    onCountChange?.(placed.length);
    const fresh = seenPlaced.current === null ? [] : placed.filter(order => !seenPlaced.current!.has(order.id));
    seenPlaced.current = new Set(placed.map(order => order.id));
    if (!fresh.length || DEMO_DATA_ENABLED) return;
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(fresh.length === 1 ? 'New order' : `${fresh.length} new orders`, {
        body: fresh.length === 1 ? `${fresh[0].order_number} is waiting to be accepted.` : 'New orders are waiting to be accepted.',
      });
    }
  }, [orders, acceptedIds, onCountChange]);

  useEffect(() => {
    if (!DEMO_DATA_ENABLED && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    const refresh = () => { void refetch(); };
    window.addEventListener('gloceries:orders-updated', refresh);
    return () => window.removeEventListener('gloceries:orders-updated', refresh);
  }, [refetch]);

  const accept = useCallback(async (order: PartnerOrder) => {
    if (busy.current) return;
    busy.current = true;
    setAcceptingId(order.id);
    try {
      if (!DEMO_DATA_ENABLED) await acceptPartnerOrder(order.id);
      setAcceptedIds(previous => new Set([...previous, order.id]));
      window.dispatchEvent(new Event('gloceries:orders-updated'));
      toast.success(`Order #${order.order_number} accepted. Start preparing.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not accept order. Please try again.');
    } finally {
      busy.current = false;
      setAcceptingId(null);
    }
  }, []);

  const reject = async (reason: string) => {
    if (!rejectingOrder || busy.current) return;
    busy.current = true;
    setAcceptingId(rejectingOrder.id);
    setRejectError(null);
    try {
      if (!DEMO_DATA_ENABLED) await updateOrderStatus(rejectingOrder.id, 'cancelled', reason);
      setAcceptedIds(previous => new Set([...previous, rejectingOrder.id]));
      setRejectingOrder(null);
      window.dispatchEvent(new Event('gloceries:orders-updated'));
      toast.success(`Order #${rejectingOrder.order_number} rejected.`);
    } catch (err) {
      setRejectError(err instanceof Error ? err.message : 'Could not reject order. Please try again.');
    } finally {
      busy.current = false;
      setAcceptingId(null);
    }
  };

  const waiting = (orders ?? []).filter(order => order.status === 'placed' && !order.accepted_at && !acceptedIds.has(order.id));
  const { soundBlocked } = useOrderAlertSound(waiting);
  return <>
    <FloatingOrderAttention orders={waiting} soundBlocked={soundBlocked} acceptingId={acceptingId} onAccept={accept} onReject={order => { setRejectError(null); setRejectingOrder(order); }} error={error !== undefined} onRetry={() => void refetch()} />
    {rejectingOrder && <RejectReasonDialog orderNumber={rejectingOrder.order_number} onClose={() => { if (!busy.current) setRejectingOrder(null); }} onConfirm={reason => void reject(reason)} isSubmitting={acceptingId !== null} error={rejectError} />}
  </>;
}
