// Authenticated stack. Bottom-tab structure (Home/Orders/Profile per
// specs/01-customer-app/README.md) lands when those screens are built.
//
// Entry point depends on whether a delivery location is already saved
// (useLocationStore, hydrated by RootNavigator before this ever mounts):
// no location -> LocationPermission flow first; location already set ->
// straight to Home. This is what stops a returning user from being asked
// for their location on every single app open.

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AddressFormScreen } from '../screens/address/AddressFormScreen';
import { AddressListScreen } from '../screens/address/AddressListScreen';
import { CartScreen } from '../screens/cart/CartScreen';
import { CategoriesScreen } from '../screens/categories/CategoriesScreen';
import { CategoryDetailScreen } from '../screens/category-detail/CategoryDetailScreen';
import { CheckoutScreen } from '../screens/checkout/CheckoutScreen';
import { ComingSoonScreen } from '../screens/coming-soon/ComingSoonScreen';
import { ErrorScreen } from '../screens/error/ErrorScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { LocationPermissionScreen } from '../screens/location/LocationPermissionScreen';
import { LocationSearchScreen } from '../screens/location/LocationSearchScreen';
import { SelectLocationScreen } from '../screens/location/SelectLocationScreen';
import { PaymentStatusScreen } from '../screens/payment-status/PaymentStatusScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { PurchaseScreen } from '../screens/purchase/PurchaseScreen';
import { ReceiptScreen } from '../screens/receipt/ReceiptScreen';
import { ReferralScreen } from '../screens/referral/ReferralScreen';
import { SearchScreen } from '../screens/search/SearchScreen';
import { StoreDetailScreen } from '../screens/store-detail/StoreDetailScreen';
import { StoreListScreen } from '../screens/store-list/StoreListScreen';
import { ShoppingListScreen } from '../screens/shopping-list/ShoppingListScreen';
import { TrackOrderScreen } from '../screens/track-order/TrackOrderScreen';
import { UnavailableZoneScreen } from '../screens/home/unavailable-zone/UnavailableZoneScreen';
import { WishlistScreen } from '../screens/wishlist/WishlistScreen';
import { useLocationStore } from '../store/useLocationStore';
import type { AppStackParamList } from './types';

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppNavigator() {
  const hasLocation = useLocationStore((s) => s.location !== null);

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      // Real entry logic: no saved location -> LocationPermission flow
      // first; location already set -> straight to Home. Home.tsx's own
      // isServiceable check branches to UnavailableZoneScreen inline from
      // there (not a separate route to land on), and ErrorBoundary (App.tsx)
      // wraps this whole navigator, catching an uncaught render error from
      // ANY screen and swapping in ErrorFallback regardless of which
      // route was showing — not just this one.
      initialRouteName={hasLocation ? 'Home' : 'LocationPermission'}
    >
      <Stack.Screen name="LocationPermission" component={LocationPermissionScreen} />
      <Stack.Screen name="SelectLocation" component={SelectLocationScreen} />
      <Stack.Screen name="LocationSearch" component={LocationSearchScreen} />
      {/* animation: 'none' on these four — they're the bottom nav's own tabs
          (Home/Purchase/Categories/Store), each rendering its own
          <BottomNavBar/> at the identical screen position/style. Left on
          native-stack's default slide, switching tabs looked (and the pill
          itself visibly slid) like drilling into a detail screen — a tab
          switch should feel instant, with the nav bar reading as fixed
          chrome, not part of what's animating. Real drill-down screens
          (StoreDetail, Checkout, etc. below) keep the default slide — that
          motion is correct there, it's specifically these four siblings
          where it read as wrong. */}
      <Stack.Screen name="Home" component={HomeScreen} options={{ animation: 'none' }} />
      <Stack.Screen name="Categories" component={CategoriesScreen} options={{ animation: 'none' }} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="Store" component={StoreListScreen} options={{ animation: 'none' }} />
      <Stack.Screen name="Purchase" component={PurchaseScreen} options={{ animation: 'none' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen} />
      <Stack.Screen name="StoreDetail" component={StoreDetailScreen} />
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="AddressList" component={AddressListScreen} />
      <Stack.Screen name="AddressForm" component={AddressFormScreen} />
      <Stack.Screen name="PaymentStatus" component={PaymentStatusScreen} />
      <Stack.Screen name="Receipt" component={ReceiptScreen} />
      <Stack.Screen name="TrackOrder" component={TrackOrderScreen} />
      <Stack.Screen name="Wishlist" component={WishlistScreen} />
      <Stack.Screen name="ShoppingList" component={ShoppingListScreen} />
      <Stack.Screen name="Referral" component={ReferralScreen} />
      <Stack.Screen name="ComingSoon" component={ComingSoonScreen} />
      <Stack.Screen name="UnavailableZone" component={UnavailableZoneScreen} />
      <Stack.Screen name="ErrorPage" component={ErrorScreen} />
    </Stack.Navigator>
  );
}
