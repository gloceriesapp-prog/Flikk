// App-wide navigation handle for code outside React components (notification
// taps). Same pattern as apps/partner/src/navigation/navigationRef.ts.
import { createNavigationContainerRef } from '@react-navigation/native';
import type { AppStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<AppStackParamList>();
