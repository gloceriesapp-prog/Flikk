// One real, currently-open dispatch offer (automated rider dispatch,
// explicit CLAUDE.md scope override) — a store within range just packed
// this order and it's not yet claimed by anyone. Accept hits the real
// atomic accept-race endpoint (api/dispatch.ts's acceptDispatchOffer);
// losing that race is a completely normal outcome, not an error, so this
// card shows an honest "someone else got it" state rather than pretending
// the tap failed.

import { useState } from 'react';
import { Location01Icon } from '@hugeicons/core-free-icons';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import type { DispatchOffer } from '../../../api/dispatch';

interface Props {
  offer: DispatchOffer;
  onAccept: (orderId: string) => Promise<{ ok: true } | { ok: false; alreadyTaken: boolean; message: string }>;
}

export function DispatchOfferCard({ offer, onAccept }: Props) {
  const [state, setState] = useState<'idle' | 'accepting' | 'taken'>('idle');

  async function handleAccept() {
    setState('accepting');
    const result = await onAccept(offer.orderId);
    if (!result.ok) {
      setState('taken');
      return;
    }
    // On success this card's own offer disappears from the list on the
    // next render (the store removes it from nearbyOffers) — no local
    // "accepted" state needed here.
  }

  if (state === 'taken') {
    return (
      <View className="items-center justify-center rounded-2xl border border-gray-100 bg-white px-4 py-3.5">
        <Text className="text-[13px] font-semibold text-ink/50">Someone else got there first</Text>
      </View>
    );
  }

  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm shadow-black/5">
      <View className="flex-1">
        <Text className="text-[14px] font-bold text-ink" numberOfLines={1}>
          {offer.storeName}
        </Text>
        <View className="mt-0.5 flex-row items-center gap-1">
          <AppIcon icon={Location01Icon} size={12} color={`${colors.ink}60`} />
          <Text className="text-[12px] text-ink/50">{offer.distanceKm} km away</Text>
        </View>
      </View>
      <Text className="text-[15px] font-extrabold text-ink">₹{offer.payout}</Text>
      <Pressable
        onPress={handleAccept}
        disabled={state === 'accepting'}
        className="items-center justify-center rounded-xl bg-lime-deep px-4 py-2.5"
        style={({ pressed }) => ({ opacity: pressed || state === 'accepting' ? 0.7 : 1 })}
      >
        {state === 'accepting' ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text className="text-[13px] font-bold text-white">Accept</Text>}
      </Pressable>
    </View>
  );
}
