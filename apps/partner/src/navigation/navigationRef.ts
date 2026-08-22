// A ref onto the NavigationContainer, usable from outside the component
// tree it wraps — needed because IncomingOrderAlert is mounted as a
// sibling of NavigationContainer in App.tsx (see that file's own note on
// why: a new-order interrupt has to appear over whichever tab is active,
// so it can't live inside AppNavigator's own screen tree), which means it
// has no navigation prop to call. This is the standard React Navigation
// pattern for exactly that case.

import { createNavigationContainerRef } from '@react-navigation/native';
import type { AppStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<AppStackParamList>();
