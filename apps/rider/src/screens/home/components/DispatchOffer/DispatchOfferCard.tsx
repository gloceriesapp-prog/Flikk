// One real, currently-open dispatch offer (automated rider dispatch,
// explicit CLAUDE.md scope override) — a store within range just packed
// this order and it's not yet claimed. Dark "new order" card matching the
// rider offer mock: decision-timer ring, pickup→drop route, stat tiles,
// a static route preview, and Accept / Decline.
//
// Accept hits the real atomic accept-race endpoint (api/dispatch.ts's
// acceptDispatchOffer); losing that race is a normal outcome, not an error,
// so the card shows an honest "someone else got it" state. This inline card
// is poll-authoritative: the offer stays acceptable as long as the server
// returns it, so the countdown ring is decorative urgency only — when it
// hits 0 the card STAYS and Accept stays live. Only an explicit rider
// Decline (or the offer dropping out of the next dispatch poll) removes it;
// declining isn't a server action.

import { CheckmarkCircle02Icon, CreditCardIcon, PackageIcon } from '@hugeicons/core-free-icons';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../../components/AppIcon';
import { formatCash } from '../../../../components/CollectCashBanner';
import { colors } from '../../../../theme/tokens';
import type { AcceptDispatchOfferResult, DispatchOffer } from '../../../../api/dispatch';
import { OfferCountdownRing } from './OfferCountdownRing';
import { OfferRouteStops } from './OfferRouteStops';
import { OfferStatTiles } from './OfferStatTiles';
import { OfferRoutePreview } from './OfferRoutePreview';
import { useOfferDecision } from './useOfferDecision';

// Decide-window length in seconds — the arc denominator. The offer's own
// windowSeconds (admin's dispatch_step_seconds) wins; 45s is the fallback, so
// the ring's full arc lines up with the true server window; the ring counts down to offer.expiresAt
// (the real per-offer deadline) when present. The __DEV__ Test popup passes a
// long override so the UI can be inspected without auto-dismissing.
const DECISION_WINDOW_S = 45;

interface Props {
  offer: DispatchOffer;
  onAccept: (orderId: string) => Promise<AcceptDispatchOfferResult>;
  // Optional: fired once the card is done — decline, timer expiry, or a won
  // accept. In the inline "Pickups near you" list nothing passes it (the store
  // drops the offer on the next poll); a full-screen presenter passes it to
  // close itself.
  onClose?: () => void;
  // Optional decide-window override (seconds). Defaults to DECISION_WINDOW_S;
  // the __DEV__ Test popup passes a long one so the UI can be inspected
  // without the ring auto-dismissing it.
  windowSeconds?: number;
}

export function DispatchOfferCard({ offer, onAccept, onClose, windowSeconds = offer.windowSeconds ?? DECISION_WINDOW_S }: Props) {
  const { state, handleAccept, handleDecline } = useOfferDecision(offer.orderId, onAccept, onClose);
  const hasRoute = offer.storeCoords != null && offer.dropCoords != null;

  if (state === 'declined') return null;

  if (state === 'taken') {
    return (
      <View className="items-center justify-center rounded-3xl border border-gray-100 bg-white px-4 py-4">
        <Text className="text-[13px] font-semibold text-ink/50">Someone else got there first</Text>
      </View>
    );
  }

  return (
    <View className="gap-4 rounded-3xl p-5" style={{ backgroundColor: colors.ink }}>
      {/* Header: countdown ring + "New Delivery Order" + order number.
          Ring expiry is a no-op here: this list is poll-authoritative, so a
          past deadline must NOT decline/hide the card — the ring just stops
          at 0 and Accept stays live. (The __DEV__ sheet, a modal, passes
          handleDecline to auto-dismiss instead.) */}
      <View className="items-center gap-1.5">
        <OfferCountdownRing windowSeconds={windowSeconds} expiresAt={offer.expiresAt} onExpire={() => {}} />
        <Text className="text-[17px] font-extrabold text-white">New Delivery Order</Text>
        <Text className="text-[12px] font-medium text-white/40">{offer.orderNumber}</Text>
      </View>

      {/* Route: pickup → drop */}
      <View className="rounded-2xl p-4" style={{ backgroundColor: '#FFFFFF0D' }}>
        <OfferRouteStops
          storeName={offer.storeName}
          pickupKm={offer.pickupKm}
          dropLabel={offer.dropLabel}
          dropKm={offer.storeToDropKm}
        />
      </View>

      {/* Stat tiles */}
      <OfferStatTiles totalKm={offer.totalKm} payout={offer.payout} />

      {/* Meta line: item count + payment mode, from the order's real
          payment_method. Cash on delivery shows the amount to collect. */}
      <View className="flex-row items-center justify-center gap-4">
        <View className="flex-row items-center gap-1.5">
          <AppIcon icon={PackageIcon} size={14} color="#FFFFFF99" />
          <Text className="text-[13px] font-medium text-white/70">
            {offer.itemCount} {offer.itemCount === 1 ? 'item' : 'items'}
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <AppIcon icon={CreditCardIcon} size={14} color="#FFFFFF99" />
          <Text className={`text-[13px] font-medium ${offer.paymentMethod === 'cod' ? 'text-[#fe9a00]' : 'text-white/70'}`}>
            {offer.paymentMethod === 'cod' ? `Collect ₹${formatCash(offer.cashToCollect)} cash` : 'Paid online'}
          </Text>
        </View>
      </View>

      {/* Route preview — only when both ends have real coords. */}
      {hasRoute ? <OfferRoutePreview storeCoords={offer.storeCoords!} dropCoords={offer.dropCoords!} /> : null}

      {/* Accept / Decline */}
      <View className="gap-2.5">
        <Pressable
          onPress={handleAccept}
          disabled={state === 'accepting'}
          className="h-14 flex-row items-center justify-center gap-2 rounded-full"
          style={({ pressed }) => ({ backgroundColor: colors.lime, opacity: pressed || state === 'accepting' ? 0.7 : 1 })}
        >
          {state === 'accepting' ? (
            <ActivityIndicator size="small" color={colors.ink} />
          ) : (
            <>
              <AppIcon icon={CheckmarkCircle02Icon} size={18} color={colors.ink} />
              <Text className="text-[16px] font-extrabold text-ink">ACCEPT</Text>
            </>
          )}
        </Pressable>
        <Pressable
          onPress={handleDecline}
          disabled={state === 'accepting'}
          className="h-12 items-center justify-center rounded-full border"
          style={{ borderColor: '#FFFFFF33' }}
        >
          <Text className="text-[15px] font-bold text-white/80">DECLINE</Text>
        </Pressable>
      </View>
    </View>
  );
}
