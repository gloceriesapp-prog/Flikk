import { Platform } from 'react-native';

// Keep the floating cart and navigation aligned on each platform.
export const BOTTOM_NAV_HORIZONTAL_INSET = Platform.OS === 'android' ? 0 : 32;
