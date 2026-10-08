import { useDeliveryEstimateMinutes } from '../../api/deliverySettings';
import { useCopy } from '../../api/appConfig';
// Reached from CartBar's "View cart" tap (see components/CartBar/CartBar.tsx)
// or the bottom nav. Payment selection and order placement live in the
// cart footer; payment/useCartPayment owns the confirmed payment flow.
//
// Page bg is #F1F2F4 with white rounded cards stacked on it (items,
// BillDetailsCard) rather than one continuous white
// sheet — matches the reference. Items card: "N items" header + a dashed
// divider, then one CartItemRow per item.
//
// YouMayAlsoLikeRow ("You might also need these") is gone — per an
// explicit ask to strip every product-card dummy dataset out of the app;
// its product pool was entirely fabricated (a random pick across four
// per-tab mock lists). Re-add once a real recommendation feed exists.
//
// Rider tips stay hidden until collection and payout are supported.

import { useMemo, useState } from 'react';
import { ArrowLeft01Icon, Delete02Icon, MoreVerticalIcon, ShoppingBasket03Icon } from '@hugeicons/core-free-icons';
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { RupeePrice } from '../../components/RupeePrice';
import { StatusBar } from 'expo-status-bar';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { deleteAddress, fetchAddresses, setDefaultAddress } from '../../api/addresses';
import type { ApiAddress } from '../../api/addresses';
import { ApiError } from '../../api/client';
import { groupCartItemsByStore, selectCartTotalPrice, selectCartTotalQuantity, useCartStore } from '../../store/useCartStore';
import { useAuthStore } from '../../store/useAuthStore';
import { AddressSelectSheet } from './components/AddressSelectSheet';
import { CartItemRow } from './components/CartItemRow';
import { CartPaymentBar } from './components/CartPaymentBar';
import { useCartPayment } from './payment/useCartPayment';
import { CartCheckoutFooter } from './components/CartCheckoutFooter';
import { useCartAvailability } from './quote/useCartAvailability';
import { useCheckoutQuote } from './quote/useCheckoutQuote';
import { quotedCartItems, quoteHasPriceChanges } from './quote/quoteItems';
import { cartIdentity } from '../../store/cartIdentity';
// import { FreeDeliveryProgressCard } from './components/FreeDeliveryProgressCard';
import { ForgotToAddSection } from './components/ForgotToAddSection';
import { PromoCodeCard } from './components/PromoCodeCard';
import { BillDetailsCard } from './components/BillDetailsCard';
import { CancellationNoteCard } from './components/CancellationNoteCard';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Cart'>;

export function CartScreen({ navigation, route }: Props) {
  const customerId = useAuthStore(state => state.customerId);
  const emptyTitle = useCopy('cart.empty.title');
  const emptySubtitle = useCopy('cart.empty.subtitle');
  const estimatedMinutes = useDeliveryEstimateMinutes();
  const items = useCartStore((state) => state.items);
  const totalQuantity = useCartStore(selectCartTotalQuantity);
  const itemTotal = useCartStore(selectCartTotalPrice);
  // One group per store — the cart no longer forces every item into one
  // store (useCartStore's own header note); a cart spanning more than one
  // store renders as multiple "From {store}" mini-sections below instead
  // of a single flat list that silently implied they were all one order.
  // Memoized off `items` (already selected above, reference-stable) — see
  // groupCartItemsByStore's own note on why this can't be a plain zustand
  // selector.
  // ForgotToAddSection's own exclusion list — memoized off `items` for the
  // same reference-stability reason as storeGroups above.
  const cartItemIds = useMemo(() => items.map((item) => item.productId ?? item.id.split('::')[0]), [items]);
  const appliedPromo = useCartStore((state) => state.appliedPromo);
  const clearCart = useCartStore((state) => state.clear);

  // Dropdown menu under the header's "..." button — per an explicit ask,
  // replacing the OS Alert.alert confirmation that used to fire directly
  // on tapping the icon. The dropdown itself (a deliberate menu the
  // customer opens, then picks an option from) is the confirmation step
  // now; selecting "Clear cart" acts immediately, no second popup on top
  // of it.
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  function handleClearCart() {
    setIsMenuOpen(false);
    clearCart();
  }

  const [addressSheetVisible, setAddressSheetVisible] = useState(false);
  const [selectingAddressId, setSelectingAddressId] = useState<string | null>(null);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Real address-book check (api/addresses.ts) — not a guess: whether the
  // bottom bar can say "Checkout" at all depends on a saved address
  // actually existing. Refetches every time Cart mounts, same reasoning
  // as CheckoutScreen's own query — the address book can change between
  // visits (added, deleted) with no shared store to invalidate otherwise.
  //
  // enabled: !!accessToken — GET /addresses requires a real session
  // server-side. A guest can already add to cart and open this screen with
  // no token; firing this query anyway always 401s, and apiRequest's own
  // 401 handler (api/client.ts) responds by clearing auth state entirely
  // (accessToken/refreshToken/isGuest all reset), which instantly bounces
  // RootNavigator back to the login screen — the actual "error" a guest
  // saw tapping "View basket". Guarding it here means a guest simply sees
  // no saved address (same as someone with a real account and zero
  // addresses), not a forced logout.
  const accessToken = useAuthStore((state) => state.accessToken);
  const { data: addresses, isLoading: addressesLoading } = useQuery({
    queryKey: ['addresses', customerId],
    queryFn: fetchAddresses,
    enabled: !!accessToken,
  });
  // Last-used = the account's own default (or its first address if none
  // is marked default — same fallback CheckoutScreen's own selectedAddress
  // uses), shown directly on the footer instead of making every cart
  // visit tap through a picker for an address that hasn't changed.
  const selectedAddress = (addresses ?? []).find((a) => a.is_default) ?? addresses?.[0] ?? null;

  const availabilityQuery = useCartAvailability(selectedAddress?.id);
  const quoteQuery = useCheckoutQuote(selectedAddress?.id);
  const quote = quoteQuery.data;
  const minimumShortfall = quote?.minimumOrder?.shortfall ?? 0;
  const storeGroups = useMemo(() => {
    const pricedItems = quote ? quotedCartItems(items, quote) : [];
    return groupCartItemsByStore(items.map((item) => {
      const identity = cartIdentity(item);
      const priced = pricedItems.find((entry) => entry.productId === identity.productId
        && (!identity.variantId || entry.variantId === identity.variantId));
      // Keep persisted line IDs so existing quantity controls also work for
      // legacy carts that resolve to a default variant on the server.
      return priced ? { ...item, price: priced.price, originalPrice: priced.originalPrice, weight: priced.weight } : item;
    }));
  }, [items, quote]);
  const payment = useCartPayment({ navigation, selectedAddress, selectedPaymentMethod: route.params?.selectedPaymentMethod, upiVpa: route.params?.upiVpa,
    quote, onQuoteChanged: () => { void quoteQuery.refetch(); void availabilityQuery.refetch(); } });
  function choosePayment() {
    if (!accessToken) { useAuthStore.getState().exitGuestMode(); return; }
    payment.choosePayment();
  }

  async function handleSelectAddress(id: string) {
    setSelectingAddressId(id);
    try {
      await setDefaultAddress(id);
      await queryClient.invalidateQueries({ queryKey: ['addresses', customerId] });
      setAddressSheetVisible(false);

    } catch (err) {
      console.error('[CartScreen] failed to set default address', id, err);
      Alert.alert('Could not select this address', err instanceof ApiError ? err.message : 'Please try again.');
    } finally {
      setSelectingAddressId(null);
    }
  }

  async function handleDeleteAddress(id: string) {
    setDeletingAddressId(id);
    // Optimistic removal — the row disappears the instant you tap, not
    // after a round trip + refetch. Snapshot the prior list so a failed
    // delete can roll back to it instead of leaving the UI wrong.
    const previous = queryClient.getQueryData<ApiAddress[]>(['addresses', customerId]);
    queryClient.setQueryData<ApiAddress[]>(['addresses', customerId], (current) => (current ?? []).filter((a) => a.id !== id));
    try {
      await deleteAddress(id);
      await queryClient.invalidateQueries({ queryKey: ['addresses', customerId] });
    } catch (err) {
      queryClient.setQueryData(['addresses', customerId], previous);
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

  return (
    <View className="flex-1 bg-[#F2F2F7]">
      {/* App.tsx sets a global dark-icon StatusBar, but a screen further
          back in the stack (e.g. HomeScreen) can leave it set to "light" —
          expo-status-bar's style is a single global native call, not scoped
          per screen, so it doesn't reset itself on navigation. This local
          override guarantees dark (visible) icons on Cart's header
          regardless of what the previous screen left it as. */}
      <StatusBar style="dark" />

      <View className="bg-[#F2F2F7] pt-safe">
        <View className="flex-row items-center px-4 pb-2 pt-2">
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()} hitSlop={12} className="h-11 w-11 items-center justify-center rounded-full bg-white">
            <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
          </Pressable>
          <Text className="flex-1 text-center text-[18px] font-bold text-ink">Checkout</Text>
          {items.length > 0 ? (
            <Pressable accessibilityRole="button" accessibilityLabel="More options" onPress={() => setIsMenuOpen(true)} hitSlop={12} className="h-11 w-11 items-center justify-center rounded-full bg-white">
              <AppIcon icon={MoreVerticalIcon} size={22} color={colors.ink} />
            </Pressable>
          ) : (
            // Spacer matching the back button's width — keeps the title
            // genuinely centered in the row when there's no menu button.
            <View className="h-11 w-11" />
          )}
        </View>
      </View>

      {/* Dropdown menu, not an OS Alert — transparent Modal is this app's
          own established lightweight-overlay pattern (ProductDetailSheet.tsx),
          reused here for a much smaller anchored card instead of a full
          sheet. The backdrop Pressable closes it on an outside tap; the
          menu card itself sits just under the "..." button, right-aligned
          to match where that button actually is. */}
      <Modal
        visible={isMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsMenuOpen(false)}
      >
        <Pressable className="flex-1" onPress={() => setIsMenuOpen(false)}>
          <View className="items-end px-2 pt-safe" style={{ paddingTop: 112 }}>
            <View className="self-end overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg shadow-black/30">
              <Pressable
                onPress={handleClearCart}
                className="flex-row items-center gap-2.5 px-4 py-3.5 active:bg-gray-50"
              >
                <AppIcon icon={Delete02Icon} size={18} color={colors.danger} />
                <Text className="text-[14.5px] font-semibold text-danger">
                  Clear cart
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-1 px-10">
          <AppIcon icon={ShoppingBasket03Icon} size={40} color={`${colors.ink}`} />
          <Text className="text-center text-lg font-semibold text-ink">{emptyTitle}</Text>
          <Text className="text-center text-base text-ink/50">{emptySubtitle}</Text>
        </View>
      ) : (
        <>
          <ScrollView className="flex-1" contentContainerClassName="gap-3 px-4 pb-4 pt-4">
            {/* CartDeliveryInfoBar removed from here per an explicit ask —
                the same address/Change readout now lives in
                CartCheckoutFooter's own row right above "Proceed to Pay",
                which made showing it a second time up here redundant.
                CartDeliveryInfoBar.tsx itself is untouched, just no longer
                called from this screen. */}

            <View className="rounded-2xl bg-white px-4 py-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2.5">
                  <View>
                    <Text className="text-[17px] font-bold text-ink">Delivery in {estimatedMinutes} minutes</Text>
                    <Text className="text-[12.5px] text-ink/45 font-medium mt-1">
                      {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}
                      {storeGroups.length > 1 ? ` from ${storeGroups.length} stores` : ' in this order'}
                    </Text>
                  </View>
                </View>
              </View>
              <View className="my-3 h-px border-t border-dashed border-gray-200" />

              {storeGroups.map((group, groupIndex) => (
                <View key={group.storeId}>
                  {/* Only shown once there's more than one store to tell
                      apart — a single-store cart (still the common case)
                      looks exactly like it always did, no group header
                      inserted for no reason. */}
                  {storeGroups.length > 1 && (
                    <View className="mb-2 flex-row items-center justify-between">
                      <Text className="text-[14.5px] font-semibold text-ink tracking-tight" numberOfLines={1}>
                        From {group.storeName ?? 'this store'}
                      </Text>
                      {quote && <RupeePrice amount={quote.items.filter((line) => line.store_id === group.storeId)
                        .reduce((sum, line) => sum + line.unit_price_at_order * line.quantity, 0).toFixed(2)} size={13.5} color="#101C1080" />}
                    </View>
                  )}

                  {group.items.map((item, index) => (
                    <View key={item.id}>
                      <CartItemRow item={item} availability={availabilityQuery.data?.lines.find((line) => {
                        const identity = cartIdentity(item);
                        return line.product_id === identity.productId && line.variant_id === (identity.variantId ?? null);
                      })} />
                      {index < group.items.length - 1 && <View className="h-px bg-white" />}
                    </View>
                  ))}

                  {groupIndex < storeGroups.length - 1 && <View className="my-3 h-px border-t border-dashed border-gray-200" />}
                </View>
              ))}
            </View>

            {/* Hidden per an explicit ask — not deleted. <FreeDeliveryProgressCard itemTotal={itemTotal} /> */}
            <ForgotToAddSection cartItemIds={cartItemIds} />
            <PromoCodeCard itemTotal={quote?.bill.itemTotal ?? itemTotal} appliedPromo={appliedPromo} quotedDiscount={quote?.bill.discountAmount} />
            {quote && !quoteQuery.isError && availabilityQuery.data?.eligible && <BillDetailsCard quote={quote} itemCount={totalQuantity} />}
            {quote && !quoteQuery.isError && minimumShortfall > 0 && (
              <Text className="px-2 text-[13px] font-semibold text-[#B42318]">
                {`Minimum order is ₹${quote.minimumOrder!.value}. Add items worth ₹${minimumShortfall} more to place your order.`}
              </Text>
            )}
            {availabilityQuery.data?.issues.map((issue) => <Text key={issue.code} className="px-2 text-[13px] font-semibold text-[#B42318]">{issue.message}</Text>)}
            {availabilityQuery.isError && <Text className="px-2 text-[13px] text-[#B42318]">Could not check item availability. <Text onPress={() => { void availabilityQuery.refetch(); }} className="font-semibold">Retry</Text></Text>}
            {quote && quoteHasPriceChanges(items, quote) && (
              <Text className="px-2 text-[13px] text-[#996A16]">Some pack prices or sizes have changed. You’ll be asked to confirm before ordering.</Text>
            )}
            {(quoteQuery.isFetching || quoteQuery.isError || !quote) && (
              <View className="gap-2 rounded-2xl bg-white p-4">
                <Text className="text-[13px] text-ink/65">{!accessToken ? 'Sign in to get your final bill.'
                  : !selectedAddress ? 'Choose a delivery address to get your final bill.'
                  : quoteQuery.isError ? quoteQuery.error.message : 'Checking current prices and fees…'}</Text>
                {quoteQuery.isError && <Pressable onPress={() => { void quoteQuery.refetch(); }}><Text className="font-semibold text-[#155DFC]">Check again</Text></Pressable>}
              </View>
            )}
            <CancellationNoteCard />
          </ScrollView>

          <CartCheckoutFooter
            addressesLoading={addressesLoading}
            selectedAddress={selectedAddress}
            onAddAddress={() => navigation.navigate('LocationSearch', { intent: 'address-book' })}
            onChangeAddress={() => setAddressSheetVisible(true)}
            paymentBar={<CartPaymentBar method={payment.paymentMethod} apps={payment.upiApps} total={payment.grandTotal}
              busy={payment.isPlacingOrder} disabled={addressesLoading || !payment.methodsReady || !quote || minimumShortfall > 0 || quoteQuery.isFetching || quoteQuery.isError || !availabilityQuery.data?.eligible || availabilityQuery.isError}
              onChoose={choosePayment} onPlaceOrder={payment.placeOrder} />}
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
