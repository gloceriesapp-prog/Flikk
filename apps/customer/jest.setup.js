/* global jest */
// Native-module mocks for the smoke/auth tests — no device, no network.
jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    __store: store,
    getItemAsync: jest.fn(async key => (store.has(key) ? store.get(key) : null)),
    setItemAsync: jest.fn(async (key, value) => { store.set(key, value); }),
    deleteItemAsync: jest.fn(async key => { store.delete(key); }),
  };
});
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@sentry/react-native', () => ({ init: jest.fn(), wrap: c => c, captureException: jest.fn(), captureMessage: jest.fn(), reactNavigationIntegration: () => ({ name: 'ReactNavigation', setupOnce: jest.fn(), registerNavigationContainer: jest.fn() }) }));
jest.mock('react-native-cashfree-pg-sdk', () => ({
  CFPaymentGatewayService: { setCallback: jest.fn(), removeCallback: jest.fn(), doWebPayment: jest.fn(), doPayment: jest.fn() },
}));
jest.mock('cashfree-pg-api-contract', () => ({
  CFEnvironment: { PRODUCTION: 'PRODUCTION', SANDBOX: 'SANDBOX' },
  CFSession: function CFSession(id, orderID, environment) { this.payment_session_id = id; this.orderID = orderID; this.environment = environment; },
}));
jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  const Stub = props => require('react').createElement(View, props);
  return { __esModule: true, default: Stub, Marker: Stub, Polyline: Stub, PROVIDER_GOOGLE: 'google', PROVIDER_DEFAULT: null };
});
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'denied' })),
  getForegroundPermissionsAsync: jest.fn(async () => ({ status: 'denied' })),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(async () => []),
  Accuracy: { Balanced: 3, High: 4 },
}));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ status: 'undetermined' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'denied' })),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3 },
}));
jest.mock('react-native-keyboard-controller', () => require('react-native-keyboard-controller/jest'));
jest.mock('expo-font', () => ({ useFonts: () => [true, null], loadAsync: jest.fn(async () => {}), isLoaded: () => true }));
global.fetch = jest.fn(async () => ({ ok: false, status: 503, json: async () => ({}), text: async () => '' }));
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
