import type { ReactNode } from 'react';
import { View } from 'react-native';
import { NavigationContext, NavigationRouteContext, type NavigationProp, type RouteProp } from '@react-navigation/native';
import { useSharedValue } from 'react-native-reanimated';
import { BottomNavBar } from '../../components/BottomNavBar/BottomNavBar';
import { useNearestStore } from '../../screens/home/useNearestStore';
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
  const hidden = useSharedValue(0);
  const { isServiceable } = useNearestStore();
  const showBar = isServiceable && (route.name === 'Home' || route.name === 'HomeCategory');
  return (
    <HomeNavigationProgressContext.Provider value={hidden}>
      <View className="flex-1">
        {children}
        <View pointerEvents={showBar ? 'box-none' : 'none'} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, display: showBar ? 'flex' : 'none' }}>
          <NavigationContext.Provider value={navigation}>
            <NavigationRouteContext.Provider value={route}>
              <BottomNavBar hidden={hidden} />
            </NavigationRouteContext.Provider>
          </NavigationContext.Provider>
        </View>
      </View>
    </HomeNavigationProgressContext.Provider>
  );
}
