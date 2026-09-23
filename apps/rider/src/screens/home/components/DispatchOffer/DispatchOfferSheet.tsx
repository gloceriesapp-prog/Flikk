// Premium white iOS-style bottom sheet for a single dispatch offer — the
// takeover the rider sees when a new order lands. Slides up from the bottom,
// white rounded-top surface, grabber + close X, then the same offer content as
// the dark inline card (countdown ring, pickup→drop route, stat tiles, meta)
// but light-themed, capped by a coral ACCEPT CTA (coral is the only CTA color
// per CLAUDE.md) and a quiet DECLINE.
//
// Rendering is driven entirely by `offer` — pass one to open, null to close.
// The accept-race + countdown logic is shared with the dark card via
// useOfferDecision; this file owns only the sheet presentation.

import { CheckmarkCircle02Icon, Cancel01Icon, CreditCardIcon, PackageIcon } from '@hugeicons/core-free-icons';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../../../components/AppIcon';
import { colors } from '../../../../theme/tokens';
import type { AcceptDispatchOfferResult, DispatchOffer } from '../../../../api/dispatch';
import { OfferCountdownRing } from './OfferCountdownRing';
import { OfferRouteStops } from './OfferRouteStops';
import { OfferStatTiles } from './OfferStatTiles';
import { useOfferDecision } from './useOfferDecision';

const DECISION_WINDOW_S = 30;
// The ring track needs a dark tint to read on white (its default is a light
// tint tuned for the dark card).
const LIGHT_RING_TRACK = '#101C1014';
// Accept CTA green — solid, white text passes AA on it.
const ACCEPT_GREEN = '#00a63e';

interface Props {
  offer: DispatchOffer | null;
  onAccept: (orderId: string) => Promise<AcceptDispatchOfferResult>;
  onClose: () => void;
  // Optional decide-window override (seconds). The __DEV__ Test popup passes a
  // long one so the sheet can be inspected without the ring auto-dismissing it.
  windowSeconds?: number;
}

export function DispatchOfferSheet({ offer, onAccept, onClose, windowSeconds }: Props) {
  return (
    <Modal visible={offer != null} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(16,28,16,0.55)' }}>
        {/* Tap the dim backdrop to dismiss, same as every iOS sheet. */}
        <Pressable className="flex-1" onPress={onClose} />
        {offer ? <SheetContent offer={offer} onAccept={onAccept} onClose={onClose} windowSeconds={windowSeconds ?? DECISION_WINDOW_S} /> : null}
      </View>
    </Modal>
  );
}

function SheetContent({
  offer,
  onAccept,
  onClose,
  windowSeconds,
}: {
  offer: DispatchOffer;
  onAccept: (orderId: string) => Promise<AcceptDispatchOfferResult>;
  onClose: () => void;
  windowSeconds: number;
}) {
  const insets = useSafeAreaInsets();
  const { state, handleAccept, handleDecline } = useOfferDecision(offer.orderId, onAccept, onClose);

  // Floating card sheet — side gutters, but sitting on the bottom safe-area
  // with no extra gap (rests just above the home indicator).
  const sheet = 'mx-3 rounded-[32px] bg-white px-5 pt-3';
  const pad = { marginBottom: Math.max(insets.bottom, 8), paddingBottom: 20 };

  if (state === 'taken') {
    return (
      <View className={`${sheet} items-center gap-2`} style={pad}>
        <Grabber />
        <Text className="mt-4 text-[17px] font-semibold text-ink">Someone else got there first</Text>
        <Text className="text-[13px] font-medium text-ink/50">This order was just accepted by another rider.</Text>
        <Pressable onPress={onClose} className="mt-4 h-12 w-full items-center justify-center rounded-[12px]" style={{ backgroundColor: '#F1F2F4' }}>
          <Text className="text-[15px] font-semibold text-ink/70">Dismiss</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className={sheet} style={[{ shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: -6 } }, pad]}>
      <Grabber />

      {/* Close X, top-right, floating over the header. */}
      <Pressable
        onPress={handleDecline}
        hitSlop={10}
        className="absolute right-4 top-4 z-10 h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: '#F1F2F4' }}
      >
        <AppIcon icon={Cancel01Icon} size={20} color={colors.ink} />
      </Pressable>

      {/* Header: countdown ring + title + order number, centered. */}
      <View className="items-center gap-1.5 pt-2">
        <OfferCountdownRing windowSeconds={windowSeconds} onExpire={handleDecline} trackColor={LIGHT_RING_TRACK} />
        <Text className="mt-1 text-[19px] font-semibold text-ink">New Delivery Order</Text>
        <Text className="text-[12px] font-medium text-ink/50">Order ID: {offer.orderNumber}</Text>
      </View>

      {/* Route: pickup → drop, on a soft tinted panel. */}
      <View className="mt-5 rounded-2xl p-4" style={{ backgroundColor: '#F7F7FA' }}>
        <OfferRouteStops storeName={offer.storeName} pickupKm={offer.pickupKm} dropLabel={offer.dropLabel} dropKm={offer.storeToDropKm} tone="onLight" />
      </View>

      {/* Stat tiles */}
      <View className="mt-3">
        <OfferStatTiles totalKm={offer.totalKm} payout={offer.payout} tone="onLight" />
      </View>

      {/* Meta line: item count + payment mode. Flikk is prepaid/UPI only. */}
      <View className="mt-4 flex-row items-center justify-center gap-4">
        <View className="flex-row items-center gap-1.5">
          <AppIcon icon={PackageIcon} size={14} color="#101C1099" />
          <Text className="text-[13px] font-medium text-ink/70">
            {offer.itemCount} {offer.itemCount === 1 ? 'item' : 'items'}
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <AppIcon icon={CreditCardIcon} size={14} color="#101C1099" />
          <Text className="text-[13px] font-medium text-ink/70">Cashless payment</Text>
        </View>
      </View>

      {/* Accept — solid green CTA. #00a63e is dark enough for white text (AA). */}
      <View className="mt-5">
        <Pressable
          onPress={handleAccept}
          disabled={state === 'accepting'}
          className="h-[58px] flex-row items-center justify-center gap-2 rounded-full bg-[#00a63e]"
          
        >
          {state === 'accepting' ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text className="text-[17px] font-semibold text-white">Accept Order</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function Grabber() {
  return <View className="mb-1 h-1 w-10 self-center rounded-full" style={{ backgroundColor: '#101C1022' }} />;
}
