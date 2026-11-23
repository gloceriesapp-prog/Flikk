import { createContext, useCallback, useContext, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShoppingBag01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { AppImage } from '../../../components/AppImage';
import { getCartPreviewIds, selectCartTotalQuantity, useCartStore } from '../../../store/useCartStore';
import { colors } from '../../../theme/tokens';

// Header button drops the whole Home surface down to show what is in the
// cart above its rounded top, then settles back on its own.
const HOLD_MS = 2200;
const MOVE = { duration: 380, easing: Easing.out(Easing.cubic) };
const THUMB = 40;

const HomeRevealContext = createContext<() => void>(() => {});
export const useHomeReveal = () => useContext(HomeRevealContext);

function CartSummary() {
  const items = useCartStore(state => state.items);
  const recentItemIds = useCartStore(state => state.recentItemIds);
  const lastAddedItemId = useCartStore(state => state.lastAddedItemId);
  const count = useCartStore(selectCartTotalQuantity);
  const byId = new Map(items.map(item => [item.id, item]));
  const previews = getCartPreviewIds(items, recentItemIds, recentItemIds.length === 0 ? lastAddedItemId ?? undefined : undefined)
    .flatMap(id => byId.get(id)?.imageUrl ? [byId.get(id)!] : []);
  // ponytail: dummy product while the cart is empty, until a real add triggers this.
  const shown = count > 0 ? count : 1;
  const last = (lastAddedItemId && byId.get(lastAddedItemId)) || items[items.length - 1];
  return (
    <View className="flex-row items-center gap-3 px-5">
      <View className="flex-row">
        {previews.length > 0 ? previews.map((item, index) => (
          <View key={item.id} className="overflow-hidden rounded-xl border-2 border-white bg-[#F3F4F6]"
            style={{ width: THUMB, height: THUMB, marginLeft: index === 0 ? 0 : -10, zIndex: index + 1 }}>
            <AppImage recyclingKey={item.id} source={{ uri: item.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="contain" transition={0} accessible={false} />
          </View>
        )) : (
          <View className="items-center justify-center rounded-xl bg-[#EAF0FF]" style={{ width: THUMB, height: THUMB }}>
            <AppIcon icon={ShoppingBag01Icon} size={20} color={colors.primary} strokeWidth={2} />
          </View>
        )}
      </View>
      <View className="min-w-0 flex-shrink">
        <Text numberOfLines={1} className="text-[16px] font-bold leading-[20px] text-ink">
          {shown} {shown === 1 ? 'product' : 'products'} added to cart
        </Text>
        <Text numberOfLines={1} className="text-[13px] leading-[17px] text-ink/60">
          {last ? `${last.name} was added last` : 'Fresh Milk 500 ml was added last'}
        </Text>
      </View>
    </View>
  );
}

export function HomeRevealSurface({ children }: { children: ReactNode }) {
  const { top } = useSafeAreaInsets();
  const drop = top + 72;
  const progress = useSharedValue(0);
  const reveal = useCallback(() => {
    progress.set(withSequence(withTiming(1, MOVE), withDelay(HOLD_MS, withTiming(0, MOVE))));
  }, [progress]);
  const surfaceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: progress.get() * drop }],
    borderTopLeftRadius: progress.get() * 28,
    borderTopRightRadius: progress.get() * 28,
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ translateY: (1 - progress.get()) * -12 }],
  }));

  return (
    <HomeRevealContext.Provider value={reveal}>
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, top: top + 10, height: 52, alignItems: 'center', justifyContent: 'center' }, labelStyle]}>
          <CartSummary />
        </Animated.View>
        <Animated.View style={[{ flex: 1, overflow: 'hidden', backgroundColor: '#FFFFFF' }, surfaceStyle]}>
          {children}
        </Animated.View>
      </View>
    </HomeRevealContext.Provider>
  );
}
