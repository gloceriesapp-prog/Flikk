import { useState, type ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { NavigationContext, NavigationRouteContext, type NavigationProp, type RouteProp } from '@react-navigation/native';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CartBar } from '../../components/CartBar/CartBar';
import { useCartStore, selectCartTotalQuantity } from '../../store/useCartStore';
import { showStandaloneCart } from './cartBarVisibility';
import { BottomNavBar } from '../../components/BottomNavBar/BottomNavBar';
import { ActiveOrderBar } from '../../features/active-order-tracker';
import { useNearestStore } from '../../screens/home/useNearestStore';
import { useHomeLocationRefresh } from '../../location/useHomeLocationRefresh';
import type { AppStackParamList } from '../types';

import { HomeNavigationProgressContext } from './HomeNavigationProgressContext';

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
  const showCart = showStandaloneCart(route.name, showBar, cartQuantity);
  return (
    <HomeNavigationProgressContext.Provider value={hidden}>
      <View className="flex-1">
        <View style={{ flex: 1, paddingBottom: showCart ? insets.bottom + 68 : 0 }}>{children}</View>
        {showCart && (
          <NavigationContext.Provider value={navigation}>
            <NavigationRouteContext.Provider value={route}>
              <View pointerEvents="box-none" style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 8, alignItems: 'center', zIndex: 20 }}>
                <CartBar />
              </View>
            </NavigationRouteContext.Provider>
          </NavigationContext.Provider>
        )}
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
    </HomeNavigationProgressContext.Provider>
  );
}
