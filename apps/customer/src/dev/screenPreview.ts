// Development-only screen preview, for designing a screen without walking
// the whole flow to it. Start Metro with EXPO_PUBLIC_PREVIEW_SCREEN=OrderPlaced
// and the app opens on that screen with the sample data below. Ignored in
// release builds (__DEV__ is false there), so it can never reach customers.
import type { AppStackParamList } from '../navigation/types';

export const PREVIEW_SCREEN = __DEV__ ? process.env.EXPO_PUBLIC_PREVIEW_SCREEN : undefined;

export const isPreviewing = (screen: keyof AppStackParamList) => PREVIEW_SCREEN === screen;

// A paid online order: the screen's main case. No estimate of its own, so
// the screen shows the app's live delivery estimate, as Home does.
export const ORDER_PLACED_PREVIEW: AppStackParamList['OrderPlaced'] = {
  orderId: 'preview-order',
  orderNumber: 'GL-24817',
  amount: 245,
  paymentMethodLabel: 'UPI',
  paid: true,
};
