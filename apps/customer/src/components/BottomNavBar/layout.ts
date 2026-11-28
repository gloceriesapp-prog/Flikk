import { Platform } from 'react-native';

// Keep the floating cart and navigation aligned on each platform.
// iOS 16 = the nav row's own edge inset (BottomNavBar ROW_INSET), so the cart
// bar is exactly as wide as the bar below it.
export const BOTTOM_NAV_HORIZONTAL_INSET = Platform.OS === 'android' ? 0 : 16;
