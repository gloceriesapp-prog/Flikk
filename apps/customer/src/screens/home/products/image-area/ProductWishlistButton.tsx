import { Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useWishlistStore } from '../../../../store/useWishlistStore';
import type { Product } from '../types';

export function ProductWishlistButton({ product }: { product: Product }) {
  const saved = useWishlistStore(state => state.isWishlisted(product.id));
  const toggle = useWishlistStore(state => state.toggle);
  return <Pressable accessibilityRole="button" accessibilityLabel={`${saved ? 'Remove' : 'Save'} ${product.name} ${saved ? 'from' : 'to'} wishlist`}
    accessibilityState={{ selected: saved }} onPress={event => { event.stopPropagation(); toggle(product); }}
    style={{ position: 'absolute', left: -2, bottom: -2, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
    <Svg width={25} height={25} viewBox="0 0 24 24" accessible={false}>
      <Path d="M20.8 4.6c-2.1-2.1-5.4-2.1-7.5 0L12 5.9l-1.3-1.3a5.3 5.3 0 0 0-7.5 7.5L12 21l8.8-8.9a5.3 5.3 0 0 0 0-7.5Z"
        fill={saved ? '#737B84' : 'none'} stroke="#737B84" strokeWidth={1.7} strokeLinejoin="round" />
    </Svg>
  </Pressable>;
}
