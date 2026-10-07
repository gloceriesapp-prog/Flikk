import { AboutGloceriesScreen } from '../screens/about/AboutGloceriesScreen';
import { useWarmPurchaseHistory } from '../screens/purchase/loading/useWarmPurchaseHistory';
import { AccountPrivacyScreen } from '../features/account-privacy/AccountPrivacyScreen';
import { NotificationsScreen } from '../features/notifications/NotificationsScreen';
import { SupportScreen } from '../features/customer-care/SupportScreen';
import { SupportTicketScreen } from '../features/customer-care/SupportTicketScreen';
import { RefundsScreen } from '../features/customer-care/RefundsScreen';
import { RefundDetailScreen } from '../features/customer-care/RefundDetailScreen';
import { CheckoutAttemptRecoveryScreen } from '../features/checkout-recovery/CheckoutAttemptRecoveryScreen';
import { PaymentRecoveryScreen } from '../features/checkout-recovery/PaymentRecoveryScreen';
import { useCheckoutRecovery } from '../features/checkout-recovery/useCheckoutRecovery';
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
import { BreakfastEssentialsScreen } from '../screens/home/groceries/breakfast-essentials/BreakfastEssentialsScreen';
import { KitchenEssentialsScreen } from '../screens/home/groceries/kitchen-essentials/KitchenEssentialsScreen';
import { FestivalCollectionScreen } from '../screens/home/festival/collections/FestivalCollectionScreen';
import { SnacksAndDrinksScreen } from '../screens/home/groceries/snacks-and-drinks/SnacksAndDrinksScreen';
import { LocalBrandScreen } from '../screens/home/groceries/local-brands/LocalBrandScreen';
import { FreshCategoryScreen } from '../screens/home/fresh/shop-fresh/FreshCategoryScreen';
import { EverydayVegetablesScreen } from '../screens/home/fresh/everyday-vegetables/EverydayVegetablesScreen';
import { FruitFavouritesScreen } from '../screens/home/fresh/fruit-favourites/FruitFavouritesScreen';
import { HomeGrownProduceScreen } from '../screens/home/fresh/home-grown-nearby/HomeGrownProduceScreen';
import { RegionalCategoryScreen } from '../screens/home/regional/shop-by-category/RegionalCategoryScreen';
import { CoconutOilScreen } from '../screens/home/regional/coconut-oil/CoconutOilScreen';
import { PaymentMethodScreen } from '../screens/payment-method/PaymentMethodScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { HomeCategoryScreen } from '../screens/home/category-page/HomeCategoryScreen';
import { HomeContentCollectionScreen } from '../screens/home/content/HomeContentCollectionScreen';
import { LocationPermissionScreen } from '../screens/location/LocationPermissionScreen';
import { LocationSearchScreen } from '../screens/location/LocationSearchScreen';
import { SelectLocationScreen } from '../screens/location/SelectLocationScreen';
import { PaymentProcessingScreen } from '../screens/payment-processing/PaymentProcessingScreen';
import { PaymentStatusScreen } from '../screens/payment-status/PaymentStatusScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { PurchaseScreen } from '../screens/purchase/PurchaseScreen';
import { ReceiptScreen } from '../screens/receipt/ReceiptScreen';
import { ReferralScreen } from '../screens/referral/ReferralScreen';
import { SearchScreen } from '../screens/search/SearchScreen';
import { StoreDetailScreen } from '../screens/store-detail/StoreDetailScreen';
import { StoreListScreen } from '../screens/store-list/StoreListScreen';
import { TrackOrderScreen } from '../screens/track-order/TrackOrderScreen';
import { OrderSummaryScreen } from '../screens/order-summary/OrderSummaryScreen';
import { WishlistScreen } from '../screens/wishlist/WishlistScreen';
import { useLocationStore } from '../store/useLocationStore';
import type { AppStackParamList } from './types';
import { HomeNavigationShell } from './home/HomeNavigationShell';

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppNavigator() {
  useCheckoutRecovery();
  useWarmPurchaseHistory();
  const hasLocation = useLocationStore((s) => s.location !== null);

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      layout={({ children, state, descriptors }) => {
        const route = state.routes[state.index];
        return <HomeNavigationShell route={route} navigation={descriptors[route.key].navigation}>{children}</HomeNavigationShell>;
      }}
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
      <Stack.Screen name="HomeContentCollection" component={HomeContentCollectionScreen} />
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
      <Stack.Screen name="HomeCategory" component={HomeCategoryScreen} />
      <Stack.Screen name="Categories" component={CategoriesScreen} options={{ animation: 'none' }} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="Store" component={StoreListScreen} options={{ animation: 'none' }} />
      <Stack.Screen name="Purchase" component={PurchaseScreen} options={{ animation: 'none' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen} />
      <Stack.Screen name="BreakfastEssentials" component={BreakfastEssentialsScreen} />
      <Stack.Screen name="KitchenEssentials" component={KitchenEssentialsScreen} />
      <Stack.Screen name="FestivalCollection" component={FestivalCollectionScreen} />
      <Stack.Screen name="SnacksAndDrinks" component={SnacksAndDrinksScreen} />
      <Stack.Screen name="LocalPantryBrand" component={LocalBrandScreen} />
      <Stack.Screen name="FreshCategory" component={FreshCategoryScreen} />
      <Stack.Screen name="EverydayVegetables" component={EverydayVegetablesScreen} />
      <Stack.Screen name="FruitFavourites" component={FruitFavouritesScreen} />
      <Stack.Screen name="HomeGrownProduce" component={HomeGrownProduceScreen} />
      <Stack.Screen name="RegionalCategory" component={RegionalCategoryScreen} />
      <Stack.Screen name="CoconutOilCollection" component={CoconutOilScreen} />
      <Stack.Screen name="StoreDetail" component={StoreDetailScreen} />
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="PaymentMethod" component={PaymentMethodScreen} />
      <Stack.Screen name="AddressList" component={AddressListScreen} />
      <Stack.Screen name="AddressForm" component={AddressFormScreen} />
      <Stack.Screen name="CheckoutAttemptRecovery" component={CheckoutAttemptRecoveryScreen} />
      <Stack.Screen name="PaymentRecovery" component={PaymentRecoveryScreen} />
      <Stack.Screen name="PaymentStatus" component={PaymentStatusScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="PaymentProcessing" component={PaymentProcessingScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="Receipt" component={ReceiptScreen} />
      <Stack.Screen name="TrackOrder" component={TrackOrderScreen} />
      <Stack.Screen name="OrderSummary" component={OrderSummaryScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
      <Stack.Screen name="AboutGloceries" component={AboutGloceriesScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="SupportTicket" component={SupportTicketScreen} />
      <Stack.Screen name="MyRefunds" component={RefundsScreen} />
      <Stack.Screen name="RefundDetail" component={RefundDetailScreen} />
      <Stack.Screen name="Wishlist" component={WishlistScreen} />
      <Stack.Screen name="Referral" component={ReferralScreen} />
      <Stack.Screen name="AccountPrivacy" component={AccountPrivacyScreen} />
    </Stack.Navigator>
  );
}
