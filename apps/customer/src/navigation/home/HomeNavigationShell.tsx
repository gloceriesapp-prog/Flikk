import { useState, type ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { NavigationContext, NavigationRouteContext, type NavigationProp, type RouteProp } from '@react-navigation/native';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CartBar } from '../../components/CartBar/CartBar';
import { useCartStore, selectCartTotalQuantity } from '../../store/useCartStore';
import { showStandaloneCart, STANDALONE_CART_CLEARANCE, usesFloatingCollectionCart } from './cartBarVisibility';
import { BottomNavBar } from '../../components/BottomNavBar/BottomNavBar';
import { ActiveOrderBar } from '../../features/active-order-tracker';
import { DeliveryRatingPrompt } from '../../features/order-rating/DeliveryRatingPrompt';
import { useNearestStore } from '../../screens/home/useNearestStore';
import { useHomeLocationRefresh } from '../../location/useHomeLocationRefresh';
import type { AppStackParamList } from '../types';

import { HomeNavigationProgressContext } from './HomeNavigationProgressContext';
import { AppTopHeader } from '../../screens/home/top-header/AppTopHeader';
import { TopHeaderScrollContext } from '../../screens/home/top-header/topHeaderScroll';
import { HomeRevealSurface } from '../../screens/home/components/HomeReveal';

interface Props {
  children: ReactNode;
  route: RouteProp<AppStackParamList>;
  navigation: NavigationProp<AppStackParamList>;
}

// The bar lives outside native-stack's moving screen surface. Its instance,
// cart and scroll progress survive pushes/pops between Home and categories.
export function HomeNavigationShell({ children, route, navigation }: Props) {
  useHomeLocationRefresh(route.name === 'Home' || route.name === 'HomeCategory');
  const hidden = useSharedValue(0);
  const insets = useSafeAreaInsets();
  const cartQuantity = useCartStore(selectCartTotalQuantity);
  const [activeOrderHeight, setActiveOrderHeight] = useState(0);
  const [navigationBarHeight, setNavigationBarHeight] = useState(Platform.OS === 'android' ? 74 : 66);
  const { isServiceable } = useNearestStore();
  const showBar = isServiceable && (route.name === 'Home' || route.name === 'HomeCategory');
  // Home and Store share one header instance, so a tab switch keeps it.
  const showTopHeader = isServiceable && (route.name === 'Home' || route.name === 'Store');
  const headerScroll = useSharedValue(0);
  const showCart = showStandaloneCart(route.name, showBar, cartQuantity);
  const reserveCartSpace = showCart && !usesFloatingCollectionCart(route.name);
  const canPromptForRating = route.name === 'Home' || route.name === 'HomeCategory' ||
    route.name === 'Purchase' || route.name === 'Reorder' || route.name === 'Categories' || route.name === 'Store';
  return (
    <HomeNavigationProgressContext.Provider value={hidden}>
    <TopHeaderScrollContext.Provider value={headerScroll}>
      <View className="flex-1">
        <HomeRevealSurface>
        {showTopHeader && (
          <NavigationContext.Provider value={navigation}>
            <NavigationRouteContext.Provider value={route}>
              <AppTopHeader />
            </NavigationRouteContext.Provider>
          </NavigationContext.Provider>
        )}
        {/* The space reserved under the content for the floating cart must be
            painted: unpainted, the root window colour (the blue splash colour)
            showed as a full-width blue strip behind the Cart pill. */}
        <View style={{ flex: 1, backgroundColor: '#FFFFFF', paddingBottom: reserveCartSpace ? insets.bottom + STANDALONE_CART_CLEARANCE : 0 }}>{children}</View>
        </HomeRevealSurface>
        {showCart && (
          <NavigationContext.Provider value={navigation}>
            <NavigationRouteContext.Provider value={route}>
              <View pointerEvents="box-none" style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 8, alignItems: 'center', zIndex: 20 }}>
                <CartBar />
              </View>
            </NavigationRouteContext.Provider>
          </NavigationContext.Provider>
        )}
        <DeliveryRatingPrompt enabled={canPromptForRating} />
        <View pointerEvents={showBar ? 'box-none' : 'none'} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, display: showBar ? 'flex' : 'none' }}>
          <NavigationContext.Provider value={navigation}>
            <NavigationRouteContext.Provider value={route}>
              <BottomNavBar hidden={hidden} onBarHeightChange={setNavigationBarHeight} cartBottomOffset={activeOrderHeight > 0 ? activeOrderHeight + 8 : 0} />
              {/* Floats just above the nav bar; self-hides when there's no
                  active order. Only mounted on surfaces where the bar shows
                  so its background poll doesn't run off-surface. */}
              {showBar && <ActiveOrderBar navigationBarHeight={navigationBarHeight} onHeightChange={setActiveOrderHeight} />}
            </NavigationRouteContext.Provider>
          </NavigationContext.Provider>
        </View>
      </View>
    </TopHeaderScrollContext.Provider>
    </HomeNavigationProgressContext.Provider>
  );
}
