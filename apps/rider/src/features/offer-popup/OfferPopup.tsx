// Full-screen popup for a new nearby pickup, shown over whichever screen the
// rider is on (mounted beside IncomingOrderAlert in App.tsx). The store sets
// popupOfferId when the offers poll — or a dispatch push — brings a new offer
// while the app is open. Accept is the same atomic first-come-first-served
// accept as the Home list: one rider wins, everyone else sees "Someone else got
// there first" and the offer leaves their list. Closing it only hides the
// popup; the offer stays under "Pickups near you" while it is open.

import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import type { DispatchOffer } from '../../api/dispatch';
import { DispatchOfferCard } from '../../screens/home/components/DispatchOffer';
import { useRiderOrdersStore } from '../../store/useRiderOrdersStore';

export function OfferPopup() {
  const popupOfferId = useRiderOrdersStore((s) => s.popupOfferId);
  const listed = useRiderOrdersStore((s) => s.nearbyOffers.find((o) => o.orderId === s.popupOfferId) ?? null);
  // Keep the offer after a lost race removes it from the list, so the card can
  // show "Someone else got there first" (popupOfferId still points at it).
  const [kept, setKept] = useState<DispatchOffer | null>(null);
  if (listed && listed !== kept) setKept(listed);
  const offer = listed ?? (kept?.orderId === popupOfferId ? kept : null);
  const acceptOffer = useRiderOrdersStore((s) => s.acceptOffer);
  const close = useRiderOrdersStore((s) => s.closeOfferPopup);
  if (!offer) return null;
  return (
    <Modal visible transparent animationType="slide" statusBarTranslucent onRequestClose={close}>
      {/* Near-opaque: the same offer is also listed on Home, and at 60% its
          card read through as a second ACCEPT under this one. */}
      <View className="flex-1 justify-center bg-black/90 px-4">
        <DispatchOfferCard key={offer.orderId} offer={offer} onAccept={acceptOffer} onClose={close} />
        <Pressable accessibilityRole="button" onPress={close} hitSlop={12} className="mt-4 self-center px-6 py-2">
          <Text className="text-[15px] font-semibold text-white">Close</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
