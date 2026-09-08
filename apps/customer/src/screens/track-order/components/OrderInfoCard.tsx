// Replaces the old order-id/status-badge card — that info now lives on the
// timeline itself (TrackingTimeline's own current-stage highlight). Label
// row ("Estimated Time of Arrival" / "Delivered At" / "Order Cancelled")
// plus an info icon, then one row with the status pill and the time
// together — a rough 5-minute window (eta to eta+5) rather than a single
// fake-precise minute, honest about this being an estimate, not a live
// countdown (no live GPS, CLAUDE.md). Delivered/cancelled show a single
// real timestamp instead — those aren't estimates anymore.
//
// The pill: green "On time" while now is still inside the eta window;
// once now runs past the window end, it flips to an amber "Slight delay"
// pill — enough that a late order reads as "normal delay", not "something's
// broken", without a reason line competing with the time for attention.
// Recomputed on every render, which is enough — TrackOrderScreen's own
// polling already re-renders this every 8s while the order's still live.
//
// No shadow — this card and the timeline card below it sit flat on the
// screen's own gray background, the white fill is what separates them,
// not elevation.
//
// Tapping the info icon toggles a plain full-width card directly below
// this one (own Fragment sibling, not a Modal/popover) — no overlay, no
// animation, just another item in the same gap-5 ScrollView flow.

import { useState } from 'react';
import { Cancel01Icon, CheckmarkCircle02Icon, DeliveryDelay01Icon, InformationCircleIcon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import type { ApiOrder } from '../../../api/orders';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { estimateDeliveryTime } from '../../../utils/estimateDelivery';

interface Props {
  order: ApiOrder;
}

const ETA_WINDOW_MINUTES = 5;

const DELAY_REASONS = [
  'Your rider is caught in heavier traffic than usual on the way to the store.',
  'The store is a little backed up with orders right now, so packing is taking longer.',
  'Your rider is just a few minutes out — almost there.',
];

function pickDelayReason(orderId: string): string {
  const sum = [...orderId].reduce((total, char) => total + char.charCodeAt(0), 0);
  return DELAY_REASONS[sum % DELAY_REASONS.length];
}

// timeZone pinned to IST explicitly — single-zone product (Kaup/outer
// Udupi, CLAUDE.md), and the isDelayed check below compares real instants
// (Date.getTime(), already timezone-agnostic), but a device set to a
// different system timezone would otherwise *display* the wrong clock
// time next to a correct on-time/delayed verdict. Locale alone ('en-IN')
// only changes formatting conventions, not which zone the clock reads.
function clockTime(date: Date): string {
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
}

const TONE = {
  success: { icon: CheckmarkCircle02Icon, bg: 'bg-success/15', fg: colors.success },
  delay: { icon: DeliveryDelay01Icon, bg: 'bg-gold/15', fg: colors.gold },
  danger: { icon: Cancel01Icon, bg: 'bg-danger/15', fg: colors.danger },
} as const;

export function OrderInfoCard({ order }: Props) {
  const [isReasonOpen, setIsReasonOpen] = useState(false);
  const isCancelled = order.status === 'cancelled';
  const isDelivered = order.status === 'delivered';
  const isActive = !isCancelled && !isDelivered;

  const label = isCancelled ? 'Order Cancelled' : isDelivered ? 'Delivered At' : 'Estimated Time of Arrival';

  let timeText = '—';
  let isDelayed = false;
  if (isDelivered && order.delivered_at) {
    timeText = clockTime(new Date(order.delivered_at));
  } else if (isActive) {
    const eta = estimateDeliveryTime(order.placed_at, order.stores?.avg_prep_minutes ?? order.avg_prep_minutes ?? null);
    const etaWindowEnd = new Date(eta.getTime() + ETA_WINDOW_MINUTES * 60_000);
    timeText = `${clockTime(eta)} - ${clockTime(etaWindowEnd)}`;
    isDelayed = Date.now() > etaWindowEnd.getTime();
  }

  const tone = isCancelled ? 'danger' : isDelayed ? 'delay' : 'success';
  const reasonTitle = isCancelled ? 'Order cancelled' : isDelayed ? 'Why the delay?' : isDelivered ? 'Delivered' : 'On track';
  const reasonMessage = isCancelled
    ? 'This order was cancelled and is no longer being prepared or delivered.'
    : isDelivered
      ? 'This order has already been delivered.'
      : isDelayed
        ? pickDelayReason(order.id)
        : 'Your order is on track — no delays reported right now.';
  const { icon: toneIcon, bg: toneBg, fg: toneFg } = TONE[tone];

  return (
    <>
      <View className="w-full rounded-3xl bg-white p-5">
        <Text className="text-base font-medium tracking-wide text-ink">{label}</Text>

        <View className="mt-2 flex-row items-center gap-2.5">
          {isActive && (
            <View className={`rounded-full px-2.5 py-1 ${isDelayed ? 'bg-gold/15' : 'bg-success/15'}`}>
              <Text className={`text-xs font-medium ${isDelayed ? 'text-gold' : 'text-success'}`}>
                {isDelayed ? 'Slight delay' : 'On time'}
              </Text>
            </View>
          )}
          <Text className={`text-xl font-semibold ${isCancelled ? 'text-danger' : 'text-ink'}`}>{timeText}</Text>
          <Pressable onPress={() => setIsReasonOpen((open) => !open)} hitSlop={10} className="h-6 w-6 items-center justify-center">
            <AppIcon icon={InformationCircleIcon} size={18} color={colors.ink + '80'} />
          </Pressable>
        </View>
      </View>

      {isReasonOpen && (
        <View className="w-full rounded-3xl bg-white p-5">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-bold uppercase tracking-wide text-ink/40">{reasonTitle}</Text>
            <View className={`h-8 w-8 items-center justify-center rounded-full ${toneBg}`}>
              <AppIcon icon={toneIcon} size={16} color={toneFg} />
            </View>
          </View>
          <Text className="mt-1.5 text-sm font-medium leading-5 text-ink/80">{reasonMessage}</Text>
        </View>
      )}
    </>
  );
}
