// What a tap on a grid card opens, by its target:
//   tab fresh / udupi        -> the existing Fresh page / Udupi mode
//   tab preorder, preorder-list -> Pre-order
//   brands                   -> All brands
//   add-usuals               -> add them to the cart (Buy again when the
//                               card's products can't be loaded)
//   everything else          -> the card's own page (TodayCardScreen):
//                               same look as the Fresh page, its products
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
    const openPage = () => navigation.navigate('TodayCard', {
      card: { id: card.id, title: card.title, bannerUrl: card.bannerUrl ?? null, categories: card.categories ?? [], target },
    });
    if ((target.type === 'tab' && target.id === 'preorder') || (target.type === 'action' && target.id === 'preorder-list')) return navigation.navigate('PreOrder');
    if (target.type === 'tab') {
      if (target.id === 'udupi') return setMode('udupi');
      const fresh = tabs.data.find((tab) => tab.name.trim().toLowerCase() === 'fresh');
      return fresh ? navigation.navigate('HomeCategory', { tabId: fresh.id }) : openPage();
    }
    if (target.type === 'brands') return navigation.navigate('AllBrands');
    if (target.type !== 'action' || target.id !== 'add-usuals') return openPage();
    if (busy.current) return;
    busy.current = true;
    try {
      const added = addAllToCart(await fetchCardProducts(card.id));
      notify(added ? `Added ${added} ${added === 1 ? 'item' : 'items'}` : 'Your usuals are already in the cart');
      if (added) onAdded?.(card, added);
    } catch {
      navigation.navigate('Reorder');
    } finally {
      busy.current = false;
    }
  };
}
