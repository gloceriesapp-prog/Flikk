// What a tap on a grid card does, by its server-given target:
//   categories/popular/offers/bulk/brands/party -> the card's live products
//   usuals -> add them all to the cart, with a short confirmation
//   tab -> Fresh tab, Pre-order screen or Udupi mode
import { useRef } from 'react';
import { Alert, Platform, ToastAndroid } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../../navigation/types';
import { useHomeTabs } from '../data/useHomeTabs';
import { useHomeModeStore } from '../mode-switch/useHomeModeStore';
import { addAllToCart } from './addAllToCart';
import { fetchCardProducts, type GridCard } from './api';

function notify(message: string) {
  if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.SHORT);
  else Alert.alert(message);
}

export function useCardTap(onAdded?: (card: GridCard, count: number) => void) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const tabs = useHomeTabs();
  const setMode = useHomeModeStore((s) => s.setMode);
  const busy = useRef(false);

  return async (card: GridCard) => {
    const target = card.target;
    if (target.type === 'tab') {
      if (target.id === 'preorder') return navigation.navigate('PreOrder');
      if (target.id === 'udupi') return setMode('udupi');
      const fresh = tabs.data.find((tab) => tab.name.trim().toLowerCase() === 'fresh');
      if (fresh) return navigation.navigate('HomeCategory', { tabId: fresh.id });
    }
    if (busy.current) return;
    busy.current = true;
    try {
      const products = await fetchCardProducts(card.id);
      if (target.type === 'usuals') {
        const added = addAllToCart(products);
        notify(added ? `Added ${added} ${added === 1 ? 'item' : 'items'}` : 'Your usuals are already in the cart');
        if (added) onAdded?.(card, added);
        return;
      }
      if (!products.length) { notify('These items just sold out. Try again soon.'); return; }
      navigation.navigate('HomeSectionCollection', { title: card.title, products, showDiscountBadge: target.type === 'offers' });
    } catch {
      notify('Could not open this right now. Please try again.');
    } finally {
      busy.current = false;
    }
  };
}
