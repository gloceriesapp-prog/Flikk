import { Platform } from 'react-native';
import type { AppStackParamList } from '../types';

// Cart bar height (iOS 52, Android 62) + 8 above the safe area + 8 room.
export const STANDALONE_CART_CLEARANCE = Platform.OS === 'android' ? 78 : 68;

// Opt in shopping routes. New utility/address/checkout screens stay clear by default.
const BROWSE_SCREENS = new Set<keyof AppStackParamList>([
  'CategoryDetail', 'HomeContentCollection', 'HomeSectionCollection', 'BrandProducts',
  'AllBrands', 'Search', 'StoreDetail', 'Wishlist', 'BreakfastEssentials',
  'KitchenEssentials', 'FestivalCollection', 'SnacksAndDrinks', 'LocalPantryBrand',
  'FreshCategory', 'EverydayVegetables', 'FruitFavourites', 'HomeGrownProduce',
  'RegionalCategory', 'CoconutOilCollection',
]);
const SHOPPING_NAVIGATION = new Set<keyof AppStackParamList>(['Home', 'HomeCategory', 'Reorder', 'Categories', 'Store']);

export function usesFloatingCollectionCart(route: keyof AppStackParamList) {
  return route === 'CategoryDetail' || route === 'HomeContentCollection' || route === 'HomeSectionCollection' ||
    route === 'Search' || route === 'BrandProducts' || route === 'AllBrands';
}

export function showStandaloneCart(route: keyof AppStackParamList, shellNavigationVisible: boolean, quantity: number) {
  return quantity > 0 && !shellNavigationVisible && BROWSE_SCREENS.has(route);
}

export function canShowShoppingCart(route: string) {
  return BROWSE_SCREENS.has(route as keyof AppStackParamList) || SHOPPING_NAVIGATION.has(route as keyof AppStackParamList);
}
