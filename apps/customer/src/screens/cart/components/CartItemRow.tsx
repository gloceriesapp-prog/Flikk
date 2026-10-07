import {
  Add01Icon,
  Bookmark02Icon,
  MinusSignIcon,
} from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { RupeePrice } from '../../../components/RupeePrice';

import { AppImage as Image } from '../../../components/AppImage';
import { AppIcon } from '../../../components/AppIcon';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import {
  useCartStore,
  type CartItem,
} from '../../../store/useCartStore';
import { useWishlistStore } from '../../../store/useWishlistStore';
import type { CartAvailability } from '../../../api/checkout';
import { cartIdentity } from '../../../store/cartIdentity';
import type { Product } from '../../home/products/types';

const STEPPER_TINT = '#155DFC';
const BLUE = '#155DFC';

function cartItemToProduct(item: CartItem): Product {
  return {
    id: cartIdentity(item).productId,
    name: item.name,
    localName: '',
    weight: item.weight,
    price: item.price,
    originalPrice: item.originalPrice,
    rating: 0,
    ratingCount: '',
    imageSeed: item.id,
    imageUrl: item.imageUrl,
    storeId: item.storeId,
    storeName: item.storeName,
  };
}

interface Props {
  item: CartItem;
  availability?: CartAvailability['lines'][number];
}

export function CartItemRow({ item, availability }: Props) {
  const removeItem = useCartStore((state) => state.removeItem);
  const unavailable = availability != null && !availability.eligible;
  const productId = cartIdentity(item).productId;
  const requestedQuantity = useCartStore((state) => state.items.reduce((sum, line) =>
    cartIdentity(line).productId === productId ? sum + line.quantity : sum, 0));
  const cannotIncrease = unavailable || (availability?.availableQuantity != null && requestedQuantity >= availability.availableQuantity);
  const incrementItem = useCartStore(
    (state) => state.incrementItem,
  );

  const decrementItem = useCartStore(
    (state) => state.decrementItem,
  );

  const isSaved = useWishlistStore(
    (state) => state.isWishlisted(cartIdentity(item).productId),
  );

  const toggleWishlist = useWishlistStore(
    (state) => state.toggle,
  );

  const lineTotal =
    item.price * item.quantity;

  const hasDiscount =
    item.originalPrice != null &&
    item.originalPrice > item.price;

  const originalLineTotal = hasDiscount
    ? item.originalPrice! * item.quantity
    : null;

  return (
    <View className="flex-row items-start gap-3 py-3.5">

      {/* IMAGE */}
      <View
        className={`
    relative
    h-[68px]
    w-[68px]
    overflow-hidden
    rounded-2xl
    border
    border-gray-100
    ${item.imageUrl
            ? 'bg-[#F3F4F6]'
            : 'bg-white'
          }
  `}
      >
        <Image
          source={{
            uri: item.imageUrl || PLACEHOLDER_IMAGE_URI,
          }}
          className={
            item.imageUrl
              ? 'h-full w-full p-2'
              : 'h-full w-full'
          }
          resizeMode={
            item.imageUrl ? 'contain' : 'cover'
          }
        />
      </View>


      {/* PRODUCT INFO */}
      <View className="min-w-0 flex-1 gap-1 pr-1">

        {!unavailable && availability?.availableQuantity != null && availability.availableQuantity <= 10 && (
          <Text className="mb-1 self-start rounded-md bg-[#FFF7E6] px-2 py-1 text-[11px] font-semibold text-[#946B14]">Only {availability.availableQuantity} left</Text>
        )}
        {unavailable && (
          <View className="mb-1 gap-1.5">
            <Text className="self-start rounded-md bg-[#FFF0EE] px-2 py-1 text-[11px] font-bold text-[#B42318]">{availability.message ?? 'Unavailable'}</Text>
            <Pressable onPress={() => removeItem(item.id)} accessibilityRole="button"><Text className="text-[12px] font-semibold text-[#155DFC]">Remove item</Text></Pressable>
          </View>
        )}
        <Text
          numberOfLines={2}
          className="
            text-[14.5px]
            font-semibold
            leading-[19px]
            text-ink
          "
        >
          {item.name}
        </Text>

        <Text
          className="
            text-[14px]
            font-semibold
            text-ink/50
          "
        >
          {item.weight}
        </Text>

        {/* SAVE FOR LATER */}
        <Pressable
          onPress={() =>
            toggleWishlist(
              cartItemToProduct(item),
            )
          }
          hitSlop={8}
          className="
            mt-0.5
            flex-row
            items-center
            gap-1
            self-start
            active:opacity-60
          "
        >
          <AppIcon
            icon={Bookmark02Icon}
            size={13}
            color={
              isSaved
                ? STEPPER_TINT
                : '#155DFC99'
            }
            fill={
              isSaved
                ? STEPPER_TINT
                : 'transparent'
            }
          />

          <Text className="text-[12px] font-semibold text-[#155DFC]">
            {isSaved
              ? 'Saved for later'
              : 'Save for later'}
          </Text>
        </Pressable>
      </View>


      {/* RIGHT SIDE */}
      <View className="items-end gap-2">

        {/* QUANTITY STEPPER */}
        <View
          className="
    flex-row
    items-center
    rounded-xl
    border
    border-gray-200
    bg-white
    px-1
    py-0.5
    shadow-sm
  "
          style={{
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.06,
            shadowRadius: 3,
            elevation: 2,
          }}
        >
          {/* MINUS */}
          <Pressable accessibilityRole="button" accessibilityLabel={`Decrease quantity of ${item.name}`}
            onPress={() => decrementItem(item.id)}
            hitSlop={12}
            className="
      h-7
      w-7
      items-center
      justify-center
      rounded-lg
      active:bg-gray-100
    "
          >
            <AppIcon
              icon={MinusSignIcon}
              size={14}
              color="#155DFC"
            />
          </Pressable>

          {/* QUANTITY */}
          <Text
            className="
      min-w-[26px]
      text-center
      text-[13px]
      font-bold
      text-[#155DFC]
    "
          >
            {item.quantity}
          </Text>

          {/* PLUS */}
          <Pressable accessibilityRole="button" accessibilityLabel={`Increase quantity of ${item.name}`}
            disabled={cannotIncrease}
            accessibilityState={{
              disabled: cannotIncrease,
            }}
            onPress={() => incrementItem(item.id)}
            hitSlop={12}
            className="
      h-7
      w-7
      items-center
      justify-center
      rounded-lg
      active:bg-gray-100
    "
            style={{
              opacity: cannotIncrease ? 0.35 : 1,
            }}
          >
            <AppIcon
              icon={Add01Icon}
              size={14}
              color="#155DFC"
            />
          </Pressable>
        </View>


        {/* PRICE */}
        <View className="items-end">

          {/* CURRENT PRICE */}
          <RupeePrice amount={lineTotal} size={17} />

          {/* MRP */}
          {originalLineTotal != null && (
            <View className="mt-0.5 flex-row items-center gap-1">
              <Text className="text-[11px] font-semibold text-ink/40">
                MRP
              </Text>

              <RupeePrice amount={originalLineTotal} size={12} strike color="#101C1066" />
            </View>
          )}
        </View>

      </View>
    </View>
  );
}
