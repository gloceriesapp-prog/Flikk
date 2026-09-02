// Reached from CartBar's "View cart" tap (see components/CartBar/CartBar.tsx)
// or the bottom nav. "Checkout" navigates to screens/checkout/CheckoutScreen
// — the actual "place order" action lives there, not here; this screen is
// just the editable item list + fee breakdown.
//
// Page bg is #FAFAFA with four white rounded cards stacked on it (items,
// DeliveryTipCard, YouMayAlsoLikeRow, BillDetailsCard) rather than one
// continuous white sheet — matches the reference. Items card: "N items"
// header + a dashed divider, then one CartItemRow per item.
//
// Tip selection is lifted up here (not local to DeliveryTipCard) because
// BillDetailsCard's "Delivery Partner Tip" line and its own To Pay total
// both need to read it.

import { useState } from 'react';
import { ArrowLeft01Icon, MoreVerticalIcon, ShoppingBasket03Icon } from '@hugeicons/core-free-icons';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { deleteAddress, fetchAddresses, setDefaultAddress } from '../../api/addresses';
import { ApiError } from '../../api/client';
import { selectCartTotalPrice, selectCartTotalQuantity, useCartStore } from '../../store/useCartStore';
import { AddressSelectSheet } from './components/AddressSelectSheet';
import { CartItemRow } from './components/CartItemRow';
import { CartCheckoutFooter } from './components/CartCheckoutFooter';
import { CartDeliveryInfoBar } from './components/CartDeliveryInfoBar';
import { DeliverySchedulingCard, type DeliverySelection } from './components/DeliverySchedulingCard';
import { DeliveryTipCard, type TipSelection } from './components/DeliveryTipCard';
import { YouMayAlsoLikeRow } from './components/YouMayAlsoLikeRow';
import { BillDetailsCard } from './components/BillDetailsCard';
import { CancellationNoteCard } from './components/CancellationNoteCard';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Cart'>;

export function CartScreen({ navigation }: Props) {
  const items = useCartStore((state) => state.items);
  const totalQuantity = useCartStore(selectCartTotalQuantity);
  const itemTotal = useCartStore(selectCartTotalPrice);
  const clearCart = useCartStore((state) => state.clear);

  function handleClearCart() {
    Alert.alert('Clear your cart?', 'Every item you\'ve added will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear cart', style: 'destructive', onPress: clearCart },
    ]);
  }

  const [tip, setTip] = useState<TipSelection>(null);
  const [delivery, setDelivery] = useState<DeliverySelection>({ mode: 'now' });
  const [addressSheetVisible, setAddressSheetVisible] = useState(false);
  const [selectingAddressId, setSelectingAddressId] = useState<string | null>(null);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Real address-book check (api/addresses.ts) — not a guess: whether the
  // bottom bar can say "Checkout" at all depends on a saved address
  // actually existing. Refetches every time Cart mounts, same reasoning
  // as CheckoutScreen's own query — the address book can change between
  // visits (added, deleted) with no shared store to invalidate otherwise.
  const { data: addresses, isLoading: addressesLoading } = useQuery({ queryKey: ['addresses'], queryFn: fetchAddresses });
  // Last-used = the account's own default (or its first address if none
  // is marked default — same fallback CheckoutScreen's own selectedAddress
  // uses), shown directly on the footer instead of making every cart
  // visit tap through a picker for an address that hasn't changed.
  const selectedAddress = (addresses ?? []).find((a) => a.is_default) ?? addresses?.[0] ?? null;

  async function handleSelectAddress(id: string) {
    setSelectingAddressId(id);
    try {
      await setDefaultAddress(id);
      await queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setAddressSheetVisible(false);
      navigation.navigate('Checkout');
    } catch (err) {
      console.error('[CartScreen] failed to set default address', id, err);
      Alert.alert('Could not select this address', err instanceof ApiError ? err.message : 'Please try again.');
    } finally {
      setSelectingAddressId(null);
    }
  }

  async function handleDeleteAddress(id: string) {
    setDeletingAddressId(id);
    try {
      await deleteAddress(id);
      await queryClient.invalidateQueries({ queryKey: ['addresses'] });
    } catch (err) {
      // Surfaced, not swallowed — a silent catch here looks identical to
      // "the tap did nothing" from the outside, which is exactly the bug
      // report this was written in response to. Logged too, since
      // ApiError.message alone (e.g. a generic 500) isn't always enough
      // to tell what actually failed server-side.
      console.error('[CartScreen] failed to delete address', id, err);
      Alert.alert('Could not remove this address', err instanceof ApiError ? err.message : 'Please try again.');
    } finally {
      setDeletingAddressId(null);
    }
  }

  const originalItemTotal = items.some((item) => item.originalPrice)
    ? items.reduce((sum, item) => sum + (item.originalPrice ?? item.price) * item.quantity, 0)
    : null;
  // TEMP: dummy fallback so the "Saved ₹X (Y% off)" header UI is visible
  // without a real discounted item in the cart — remove once real
  // discounted products exist to test against.
  const savings = originalItemTotal !== null ? originalItemTotal - itemTotal : 42;
  const savingsPercent = originalItemTotal ? Math.round((savings / originalItemTotal) * 100) : 18;

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      {/* App.tsx sets a global dark-icon StatusBar, but a screen further
          back in the stack (e.g. HomeScreen) can leave it set to "light" —
          expo-status-bar's style is a single global native call, not scoped
          per screen, so it doesn't reset itself on navigation. This local
          override guarantees dark (visible) icons on Cart's white header
          regardless of what the previous screen left it as. */}
      <StatusBar style="dark" />

      <View className="bg-white pt-safe">
        <View className="flex-row items-center px-2 pb-2 pt-2">
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} className="h-11 w-11 items-center justify-center">
            <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
          </Pressable>
          <View className="flex-1 pl-1">
            <Text className="text-[17px] font-medium text-ink">Your Cart</Text>
            {items.length > 0 ? (
              savings > 0 ? (
                <Text className="text-[12.5px] font-semibold text-success">
                  Saved ₹{savings.toFixed(0)} ({savingsPercent}% off)
                </Text>
              ) : (
                <Text className="text-[12.5px] font-medium text-ink/45">
                  {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'} ready to go
                </Text>
              )
            ) : null}
          </View>
          {items.length > 0 ? (
            <Pressable onPress={handleClearCart} hitSlop={12} className="h-11 w-11 items-center justify-center">
              <AppIcon icon={MoreVerticalIcon} size={22} color={colors.ink} />
            </Pressable>
          ) : (
            // Spacer matching the back button's width — keeps the title
            // genuinely centered in the row when there's no menu button.
            <View className="h-11 w-11" />
          )}
        </View>
      </View>

      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-1 px-10">
          <AppIcon icon={ShoppingBasket03Icon} size={40} color={`${colors.ink}`} />
          <Text className="text-center text-lg font-semibold text-ink">Your cart is empty</Text>
          <Text className="text-center text-base text-ink/50">Add something from a store to see it here.</Text>
        </View>
      ) : (
        <>
          <ScrollView className="flex-1" contentContainerClassName="gap-3 px-4 pb-40 pt-4">
            {selectedAddress ? <CartDeliveryInfoBar address={selectedAddress} onPress={() => setAddressSheetVisible(true)} /> : null}

            <View className="rounded-2xl bg-white px-4 py-4">
              <Text className="text-sm font-medium text-ink/60">
                {totalQuantity} {totalQuantity === 1 ? 'item ready to go' : 'items ready to go'}
              </Text>
              <View className="my-3 h-px border-t border-dashed border-mist" />

              {items.map((item, index) => (
                <View key={item.id}>
                  <CartItemRow item={item} />
                  {index < items.length - 1 && <View className="h-px bg-white" />}
                </View>
              ))}
            </View>

            <DeliverySchedulingCard selection={delivery} onChange={setDelivery} />
            <DeliveryTipCard selectedTip={tip} onSelectTip={setTip} />
            <YouMayAlsoLikeRow />
            <BillDetailsCard
              itemTotal={itemTotal}
              originalItemTotal={originalItemTotal}
              itemCount={totalQuantity}
              tip={tip}
              onAddTip={() => setTip(20)}
            />
            <CancellationNoteCard />
          </ScrollView>

          <CartCheckoutFooter
            addressesLoading={addressesLoading}
            selectedAddress={selectedAddress}
            onAddAddress={() => navigation.navigate('LocationSearch', { intent: 'address-book' })}
            onProceedToPay={() => navigation.navigate('Checkout')}
          />

          <AddressSelectSheet
            visible={addressSheetVisible}
            addresses={addresses ?? []}
            selectingId={selectingAddressId}
            deletingId={deletingAddressId}
            onClose={() => setAddressSheetVisible(false)}
            onSelect={handleSelectAddress}
            onDelete={handleDeleteAddress}
            onAddNew={() => {
              setAddressSheetVisible(false);
              navigation.navigate('LocationSearch', { intent: 'address-book' });
            }}
          />
        </>
      )}
    </View>
  );
}
