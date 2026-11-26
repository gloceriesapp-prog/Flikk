// Delivered order: a short thank-you at the end of the page, and Reorder
// items pinned at the bottom. Reorder puts this order's own lines back in
// the cart at today's prices and stock (store/reorderOrder.ts), then opens
// the cart.
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchReorderItems, type ApiOrderItem } from '../../../api/orders';
import { fetchPublicCatalogue } from '../../../api/catalogue';
import { useTrackingPreview } from '../state/trackingPreview';
import { cartConflict } from '../../../store/preorder';
import { reorderLines } from '../../../store/reorderOrder';
import { useCartStore } from '../../../store/useCartStore';
import { actionColors } from '../../../theme/tokens';

export function ThanksNote() {
  return (
    <View className="mt-4 items-center gap-1 px-4">
      <Text className="text-center text-[15px] font-semibold text-ink/75">Thanks for shopping with Gloceries!</Text>
      <Text className="text-center text-[13.5px] font-medium text-ink/50">We’re here whenever you need us again.</Text>
    </View>
  );
}

export function DeliveredFooter({ items, onDone }: { items: ApiOrderItem[]; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  // The dev preview is signed out: it reorders from the public catalogue.
  const preview = useTrackingPreview();

  async function reorder() {
    if (busy) return;
    setBusy(true);
    try {
      // Today's catalogue for the customer's recent items, already limited
      // to shops that deliver to the current location.
      // ponytail: covers the last 40 ordered products (the endpoint's limit);
      // an older order's items beyond that show as unavailable. Add a
      // per-order endpoint if reordering old orders matters.
      const { lines, skipped } = reorderLines(items, await (preview ? fetchPublicCatalogue() : fetchReorderItems()));
      if (!lines.length) {
        Alert.alert('Items unavailable', 'None of these items can be ordered right now. They may be out of stock or not delivered to your location.');
        return;
      }
      const fill = (replace: boolean) => {
        if (replace) useCartStore.getState().clear();
        for (const line of lines) useCartStore.getState().addItem(line.product, undefined, line.quantity);
        onDone();
        if (skipped) Alert.alert('Some items were left out', `${skipped} item${skipped === 1 ? ' isn’t' : 's aren’t'} available right now, so ${skipped === 1 ? 'it wasn’t' : 'they weren’t'} added to your cart.`);
      };
      const conflict = cartConflict(useCartStore.getState().items, lines[0]!.product);
      if (!conflict) return fill(false);
      Alert.alert('Start a new cart?', `${conflict} Replace your cart with these items?`, [
        { text: 'Keep cart', style: 'cancel' },
        { text: 'Replace', style: 'destructive', onPress: () => fill(true) },
      ]);
    } catch {
      Alert.alert('Couldn’t reorder', 'Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="border-t border-[#E6E8EC] bg-white px-5 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
      <Pressable onPress={() => void reorder()} disabled={busy} accessibilityRole="button" accessibilityLabel="Reorder items"
        accessibilityState={{ busy }} className="h-[52px] w-full items-center justify-center rounded-2xl active:opacity-85"
        style={{ backgroundColor: actionColors.fill }}>
        {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-[16px] font-bold text-white">Reorder items</Text>}
      </Pressable>
    </View>
  );
}
